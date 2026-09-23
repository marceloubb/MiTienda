from rest_framework import serializers
from .models import Cart, CartItem, Order, OrderItem
from products.models import Product
from products.serializers import ProductListSerializer


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_id', 'quantity', 'subtotal', 'created_at']


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.ReadOnlyField()
    total_items = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total', 'total_items', 'created_at', 'updated_at']


class AddToCartSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(default=1, min_value=1)


def _check_stock(product_id, quantity):
    """Fetch active product and raise ValidationError when stock is insufficient."""
    try:
        product = Product.objects.get(id=product_id, is_active=True)
    except Product.DoesNotExist:
        raise serializers.ValidationError("Producto no disponible")
    if product.stock < quantity:
        raise serializers.ValidationError("Stock insuficiente")
    return product


class UpdateCartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        # Always check stock: attrs['product_id'] is the DRF-coerced int, so a
        # numeric-string product_id can no longer bypass the check.
        _check_stock(attrs['product_id'], attrs['quantity'])
        return attrs


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'quantity', 'price', 'subtotal']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.ReadOnlyField()

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'status_display', 'total',
            'shipping_name', 'shipping_address', 'shipping_city',
            'shipping_postal_code', 'shipping_phone',
            'payment_method', 'notes', 'items',
            'created_at', 'updated_at'
        ]


class StaffOrderSerializer(OrderSerializer):
    """Staff view of an order: customer username plus all status values."""

    customer = serializers.CharField(source='user.username', read_only=True)

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + ['customer', 'discrepancy_reason']


class CreateOrderSerializer(serializers.Serializer):
    shipping_name = serializers.CharField(max_length=200)
    shipping_address = serializers.CharField()
    shipping_city = serializers.CharField(max_length=100)
    shipping_postal_code = serializers.CharField(max_length=20)
    shipping_phone = serializers.CharField(max_length=20)
    payment_method = serializers.CharField(max_length=50)
    notes = serializers.CharField(required=False, allow_blank=True)
