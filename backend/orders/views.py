from django.db import transaction
from django.db.models import F, Sum
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Cart, CartItem, Order, OrderItem
from products.models import Product
from .serializers import (
    CartSerializer, CartItemSerializer, AddToCartSerializer,
    OrderSerializer, CreateOrderSerializer, OrderItemSerializer,
    StaffOrderSerializer, UpdateCartItemSerializer,
)
from users.permissions import IsAdmin, IsBodega, IsStaffRole, get_user_role


# Transition matrix per role: the single next status for each from-status.
ADVANCE_MATRIX = {
    'bodega': {
        'pending': 'processing',
        'processing': 'ready',
    },
    'despacho': {
        'ready': 'shipped',
        'shipped': 'delivered',
    },
    'admin': {
        'pending': 'processing',
        'processing': 'ready',
        'ready': 'shipped',
        'shipped': 'delivered',
    },
}


def _restore_order_stock(order):
    """Restore product stock for every order item using F() expressions."""
    for item in order.items.select_for_update():
        Product.objects.filter(pk=item.product_id).update(
            stock=F('stock') + item.quantity
        )


class CartViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user)

    def get_object(self):
        cart, created = Cart.objects.get_or_create(user=self.request.user)
        return cart

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        cart = self.get_object()
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data['product_id']
        quantity = serializer.validated_data['quantity']

        product = get_object_or_404(Product, id=product_id, is_active=True)

        if product.stock < quantity:
            return Response(
                {'error': 'Stock insuficiente'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity}
        )

        if not created:
            cart_item.quantity += quantity
            cart_item.save()

        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        cart = self.get_object()
        product_id = request.data.get('product_id')

        if not product_id:
            return Response(
                {'error': 'Se requiere product_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        CartItem.objects.filter(cart=cart, product_id=product_id).delete()
        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def update_item(self, request):
        cart = self.get_object()
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data['product_id']
        quantity = serializer.validated_data['quantity']

        cart_item = get_object_or_404(CartItem, cart=cart, product_id=product_id)
        cart_item.quantity = quantity
        cart_item.save()

        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def clear(self, request):
        cart = self.get_object()
        cart.items.all().delete()
        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def create_from_cart(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            with transaction.atomic():
                cart = Cart.objects.select_for_update().get(user=request.user)

                if not cart.items.exists():
                    return Response(
                        {'error': 'El carrito está vacío'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Re-check stock inside the transaction (locks product rows)
                for cart_item in cart.items.select_for_update():
                    product = (
                        Product.objects
                        .filter(id=cart_item.product_id, is_active=True)
                        .select_for_update()
                        .first()
                    )
                    if product is None or product.stock < cart_item.quantity:
                        return Response(
                            {'error': 'Stock insuficiente'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                # Recompute total from cart items at checkout time
                total = cart.items.annotate(
                    line_total=F('quantity') * F('product__price')
                ).aggregate(total=Sum('line_total'))['total']

                # Crear pedido
                order = Order.objects.create(
                    user=request.user,
                    total=total,
                    shipping_name=data['shipping_name'],
                    shipping_address=data['shipping_address'],
                    shipping_city=data['shipping_city'],
                    shipping_postal_code=data['shipping_postal_code'],
                    shipping_phone=data['shipping_phone'],
                    payment_method=data['payment_method'],
                    notes=data.get('notes', '')
                )

                # Crear items del pedido
                for cart_item in cart.items.all():
                    OrderItem.objects.create(
                        order=order,
                        product=cart_item.product,
                        quantity=cart_item.quantity,
                        price=cart_item.product.price
                    )
                    # Reducir stock
                    product = cart_item.product
                    product.stock -= cart_item.quantity
                    product.save()

                # Limpiar carrito
                cart.items.all().delete()

                return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
        except Cart.DoesNotExist:
            return Response(
                {'error': 'El carrito está vacío'},
                status=status.HTTP_404_NOT_FOUND
            )


class StaffOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """Staff view of all orders with role-scoped advance and admin cancel."""

    serializer_class = StaffOrderSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]

    def get_queryset(self):
        return Order.objects.all()

    @action(detail=True, methods=['post'])
    def advance(self, request, pk=None):
        """Advance an order one step along the role's transition matrix.

        Accepts an optional `to_status` target: when provided it must be the
        next reachable state for the role, otherwise 403 (skip/overreach).
        """
        get_object_or_404(Order, pk=pk)
        transitions = ADVANCE_MATRIX.get(get_user_role(request.user), {})
        requested = request.data.get('to_status')

        with transaction.atomic():
            order = get_object_or_404(Order.objects.select_for_update(), pk=pk)
            if order.status == 'discrepancy':
                return Response(
                    {'error': 'Un pedido con discrepancia no puede avanzar.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            target = transitions.get(order.status)
            if target is None or (requested is not None and requested != target):
                return Response(
                    {'error': 'Transición no permitida para este rol y estado.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            order.status = target
            order.save(update_fields=['status', 'updated_at'])
        return Response(StaffOrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def discrepancy(self, request, pk=None):
        """Bodega/admin flag: mark an order with a reason and block flow.

        Only pending, processing, and ready orders can be flagged; the
        current status is stored so admin resolution can return to it.
        """
        if not (IsAdmin().has_permission(request, self)
                or IsBodega().has_permission(request, self)):
            return Response(
                {'error': 'Requiere rol de administrador o bodega.'},
                status=status.HTTP_403_FORBIDDEN
            )
        get_object_or_404(Order, pk=pk)

        with transaction.atomic():
            order = get_object_or_404(Order.objects.select_for_update(), pk=pk)
            if order.status == 'discrepancy':
                return Response(
                    {'error': 'El pedido ya está marcado como discrepancia.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if order.status not in ('pending', 'processing', 'ready'):
                return Response(
                    {'error': 'Solo se puede marcar discrepancia en pedidos pendientes, en proceso o listos.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            reason = request.data.get('reason')
            if reason not in ('missing', 'damaged'):
                return Response(
                    {'error': 'Razón inválida. Debe ser missing o damaged.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            order.pre_discrepancy_status = order.status
            order.discrepancy_reason = reason
            order.status = 'discrepancy'
            order.save(update_fields=[
                'pre_discrepancy_status', 'discrepancy_reason',
                'status', 'updated_at',
            ])
        return Response(StaffOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='resolve-discrepancy')
    def resolve_discrepancy(self, request, pk=None):
        """Admin-only: return a discrepancy order to its prior status."""
        if not IsAdmin().has_permission(request, self):
            return Response(
                {'error': IsAdmin.message},
                status=status.HTTP_403_FORBIDDEN
            )
        get_object_or_404(Order, pk=pk)

        with transaction.atomic():
            order = get_object_or_404(Order.objects.select_for_update(), pk=pk)
            if order.status != 'discrepancy':
                return Response(
                    {'error': 'Solo se puede resolver un pedido con discrepancia.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            order.status = order.pre_discrepancy_status or 'pending'
            order.pre_discrepancy_status = None
            order.discrepancy_reason = ''
            order.save(update_fields=[
                'status', 'pre_discrepancy_status',
                'discrepancy_reason', 'updated_at',
            ])
        return Response(StaffOrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Admin-only cancel: atomically restore stock and mark cancelled."""
        if not IsAdmin().has_permission(request, self):
            return Response(
                {'error': IsAdmin.message},
                status=status.HTTP_403_FORBIDDEN
            )
        get_object_or_404(Order, pk=pk)

        with transaction.atomic():
            order = get_object_or_404(Order.objects.select_for_update(), pk=pk)
            if order.status in ('delivered', 'cancelled'):
                return Response(
                    {'error': 'No se puede cancelar un pedido entregado o ya cancelado.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            _restore_order_stock(order)
            order.status = 'cancelled'
            order.save(update_fields=['status', 'updated_at'])
        return Response(StaffOrderSerializer(order).data)
