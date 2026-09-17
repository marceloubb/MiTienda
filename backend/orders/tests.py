from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from orders.models import Cart, CartItem, Order, OrderItem
from products.models import Category, Product
from users.models import UserProfile


class OrderHardeningTests(TestCase):
    """Lockdown of generic order/cart CRUD and atomic checkout."""

    def setUp(self):
        self.user = User.objects.create_user(username='buyer', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.category = Category.objects.create(name='Test Category')

        self.product_a = Product.objects.create(
            name='Product A',
            description='Description',
            price=Decimal('10.00'),
            category=self.category,
            stock=10,
        )
        self.product_b = Product.objects.create(
            name='Product B',
            description='Description',
            price=Decimal('5.00'),
            category=self.category,
            stock=10,
        )

        self.client.post('/api/cart/add_item/', {
            'product_id': self.product_a.id,
            'quantity': 2,
        }, format='json')
        self.client.post('/api/cart/add_item/', {
            'product_id': self.product_b.id,
            'quantity': 3,
        }, format='json')

    def _shipping_data(self):
        return {
            'shipping_name': 'Test User',
            'shipping_address': '123 Test St',
            'shipping_city': 'Test City',
            'shipping_postal_code': '12345',
            'shipping_phone': '555-1234',
            'payment_method': 'card',
        }

    def _create_order(self):
        response = self.client.post(
            '/api/orders/create_from_cart/', self._shipping_data(), format='json'
        )
        self.assertEqual(response.status_code, 201)
        return Order.objects.get(user=self.user)

    def test_generic_crud_rejected_on_orders(self):
        order = self._create_order()
        url = f'/api/orders/{order.id}/'

        for method in (self.client.put, self.client.patch, self.client.delete):
            response = method(url, format='json')
            self.assertEqual(response.status_code, 405)

    def test_bare_post_to_orders_rejected(self):
        response = self.client.post('/api/orders/', self._shipping_data(), format='json')
        self.assertEqual(response.status_code, 405)

    def test_generic_crud_rejected_on_cart(self):
        cart = Cart.objects.get(user=self.user)
        url = f'/api/cart/{cart.id}/'

        for method in (self.client.put, self.client.patch, self.client.delete):
            response = method(url, format='json')
            self.assertEqual(response.status_code, 405)

        for method in (self.client.put, self.client.patch, self.client.delete):
            response = method('/api/cart/', format='json')
            self.assertEqual(response.status_code, 405)

    def test_create_from_cart_succeeds_atomically(self):
        response = self.client.post(
            '/api/orders/create_from_cart/', self._shipping_data(), format='json'
        )

        self.assertEqual(response.status_code, 201)
        order = Order.objects.get(user=self.user)
        self.assertEqual(order.items.count(), 2)

        self.product_a.refresh_from_db()
        self.product_b.refresh_from_db()
        self.assertEqual(self.product_a.stock, 8)
        self.assertEqual(self.product_b.stock, 7)

        cart = Cart.objects.get(user=self.user)
        self.assertEqual(cart.items.count(), 0)

    def test_insufficient_stock_rolls_back(self):
        product = Product.objects.create(
            name='Low Stock',
            description='Description',
            price=Decimal('20.00'),
            category=self.category,
            stock=2,
        )
        user = User.objects.create_user(username='rollback-user', password='testpass123')
        client = APIClient()
        client.force_authenticate(user=user)
        cart = Cart.objects.create(user=user)
        CartItem.objects.create(cart=cart, product=product, quantity=5)

        response = client.post(
            '/api/orders/create_from_cart/', self._shipping_data(), format='json'
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.filter(user=user).count(), 0)
        product.refresh_from_db()
        self.assertEqual(product.stock, 2)
        self.assertEqual(cart.items.count(), 1)

    def test_total_recomputed_from_cart(self):
        order = self._create_order()

        # $10.00 x 2 + $5.00 x 3 = $35.00
        self.assertEqual(order.total, Decimal('35.00'))


class CartItemUpdateTests(TestCase):
    """Validation of cart item quantity updates."""

    def setUp(self):
        self.user = User.objects.create_user(username='buyer2', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.category = Category.objects.create(name='Test Category')
        self.product = Product.objects.create(
            name='Test Product',
            description='Description',
            price=Decimal('10.00'),
            category=self.category,
            stock=10,
        )

        self.client.post('/api/cart/add_item/', {
            'product_id': self.product.id,
            'quantity': 2,
        }, format='json')
        cart = Cart.objects.get(user=self.user)
        self.cart_item = cart.items.get(product=self.product)

    def test_valid_quantity_update(self):
        response = self.client.post('/api/cart/update_item/', {
            'product_id': self.product.id,
            'quantity': 4,
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.cart_item.refresh_from_db()
        self.assertEqual(self.cart_item.quantity, 4)

    def test_quantity_below_minimum_rejected(self):
        response = self.client.post('/api/cart/update_item/', {
            'product_id': self.product.id,
            'quantity': 0,
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.cart_item.refresh_from_db()
        self.assertEqual(self.cart_item.quantity, 2)

    def test_non_numeric_quantity_rejected(self):
        response = self.client.post('/api/cart/update_item/', {
            'product_id': self.product.id,
            'quantity': 'abc',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.cart_item.refresh_from_db()
        self.assertEqual(self.cart_item.quantity, 2)

    def test_quantity_above_stock_rejected(self):
        self.product.stock = 3
        self.product.save()

        response = self.client.post('/api/cart/update_item/', {
            'product_id': self.product.id,
            'quantity': 5,
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.cart_item.refresh_from_db()
        self.assertEqual(self.cart_item.quantity, 2)


def _role_user(username, role):
    user = User.objects.create_user(username=username, password='testpass123')
    UserProfile.objects.create(user=user, role=role)
    return user


class StaffOrderTestBase(TestCase):

    def setUp(self):
        self.buyer = User.objects.create_user(username='buyer-staff', password='testpass123')
        self.customer = _role_user('customer-staff', 'customer')
        self.admin = _role_user('admin-staff', 'admin')
        self.bodega = _role_user('bodega-staff', 'bodega')
        self.despacho = _role_user('despacho-staff', 'despacho')

        self.category = Category.objects.create(name='Test Category')
        self.product_a = Product.objects.create(
            name='Product A',
            description='Description',
            price=Decimal('10.00'),
            category=self.category,
            stock=10,
        )
        self.product_b = Product.objects.create(
            name='Product B',
            description='Description',
            price=Decimal('5.00'),
            category=self.category,
            stock=10,
        )

    def _order(self, status='pending', items=None):
        items = items or [(self.product_a, 2), (self.product_b, 1)]
        order = Order.objects.create(
            user=self.buyer,
            total=Decimal('25.00'),
            status=status,
            shipping_name='Test User',
            shipping_address='123 Test St',
            shipping_city='Test City',
            shipping_postal_code='12345',
            shipping_phone='555-1234',
            payment_method='card',
        )
        for product, qty in items:
            OrderItem.objects.create(
                order=order, product=product, quantity=qty, price=product.price
            )
        return order

    def _client(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def _stock(self, product):
        product.refresh_from_db()
        return product.stock


class StaffOrderAdvanceTests(StaffOrderTestBase):
    """Transition matrix: role x from-status x optional target -> status or 403."""

    def _advance(self, user, order, **data):
        return self._client(user).post(
            f'/api/staff/orders/{order.id}/advance/', data, format='json'
        )

    def test_bodega_advances_pending_to_processing(self):
        order = self._order(status='pending')

        response = self._advance(self.bodega, order)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'processing')
        order.refresh_from_db()
        self.assertEqual(order.status, 'processing')

    def test_bodega_advances_processing_to_ready(self):
        order = self._order(status='processing')

        response = self._advance(self.bodega, order)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'ready')
        self.assertEqual(response.data['customer'], 'buyer-staff')
        order.refresh_from_db()
        self.assertEqual(order.status, 'ready')

    def test_bodega_cannot_advance_ready_to_shipped(self):
        order = self._order(status='ready')

        response = self._advance(self.bodega, order)

        self.assertEqual(response.status_code, 403)
        order.refresh_from_db()
        self.assertEqual(order.status, 'ready')

    def test_bodega_cannot_skip_a_state(self):
        order = self._order(status='pending')

        response = self._advance(self.bodega, order, to_status='ready')

        self.assertEqual(response.status_code, 403)
        order.refresh_from_db()
        self.assertEqual(order.status, 'pending')

    def test_despacho_advances_ready_to_shipped(self):
        order = self._order(status='ready')

        response = self._advance(self.despacho, order)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'shipped')
        order.refresh_from_db()
        self.assertEqual(order.status, 'shipped')

    def test_despacho_advances_shipped_to_delivered(self):
        order = self._order(status='shipped')

        response = self._advance(self.despacho, order)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'delivered')
        order.refresh_from_db()
        self.assertEqual(order.status, 'delivered')

    def test_despacho_cannot_advance_pending(self):
        order = self._order(status='pending')

        response = self._advance(self.despacho, order)

        self.assertEqual(response.status_code, 403)
        order.refresh_from_db()
        self.assertEqual(order.status, 'pending')

    def test_admin_advances_pending_to_processing(self):
        order = self._order(status='pending')

        response = self._advance(self.admin, order)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'processing')
        order.refresh_from_db()
        self.assertEqual(order.status, 'processing')

    def test_admin_advances_ready_to_shipped(self):
        order = self._order(status='ready')

        response = self._advance(self.admin, order)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'shipped')
        order.refresh_from_db()
        self.assertEqual(order.status, 'shipped')

    def test_admin_cannot_advance_delivered(self):
        order = self._order(status='delivered')

        response = self._advance(self.admin, order)

        self.assertEqual(response.status_code, 403)

    def test_customer_cannot_advance(self):
        order = self._order(status='pending')

        response = self._advance(self.customer, order)

        self.assertEqual(response.status_code, 403)
        order.refresh_from_db()
        self.assertEqual(order.status, 'pending')

    def test_advance_missing_order_returns_404(self):
        response = self._client(self.admin).post('/api/staff/orders/9999/advance/')

        self.assertEqual(response.status_code, 404)

    def test_staff_list_shows_all_orders(self):
        first = self._order(status='pending')
        second = self._order(status='processing')

        response = self._client(self.admin).get('/api/staff/orders/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual({item['id'] for item in response.data}, {first.id, second.id})

    def test_customer_cannot_list_staff_orders(self):
        self._order(status='pending')

        response = self._client(self.customer).get('/api/staff/orders/')

        self.assertEqual(response.status_code, 403)


class AdminCancelTests(StaffOrderTestBase):
    """Admin-only atomic cancel with stock restore via F()."""

    def setUp(self):
        super().setUp()
        self.client = self._client(self.admin)

    def _cancel(self, order):
        return self.client.post(f'/api/staff/orders/{order.id}/cancel/')

    def test_admin_cancels_pending_restores_stock(self):
        order = self._order(status='pending')

        response = self._cancel(order)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'cancelled')
        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')
        self.assertEqual(self._stock(self.product_a), 12)
        self.assertEqual(self._stock(self.product_b), 11)

    def test_admin_cancels_shipped_restores_stock(self):
        order = self._order(status='shipped')

        response = self._cancel(order)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'cancelled')
        self.assertEqual(self._stock(self.product_a), 12)
        self.assertEqual(self._stock(self.product_b), 11)

    def test_non_admin_cancel_denied(self):
        order = self._order(status='processing')

        response = self._client(self.bodega).post(f'/api/staff/orders/{order.id}/cancel/')

        self.assertEqual(response.status_code, 403)
        order.refresh_from_db()
        self.assertEqual(order.status, 'processing')

    def test_cannot_cancel_delivered_order(self):
        order = self._order(status='delivered')

        response = self._cancel(order)

        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.status, 'delivered')

    def test_cannot_cancel_cancelled_order(self):
        order = self._order(status='cancelled')

        response = self._cancel(order)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(self._stock(self.product_a), 10)

    def test_cancel_missing_order_returns_404(self):
        response = self.client.post('/api/staff/orders/9999/cancel/')

        self.assertEqual(response.status_code, 404)

    def test_cancel_restores_all_stock_atomically(self):
        order = self._order(status='pending', items=[(self.product_a, 2), (self.product_b, 3)])

        response = self._cancel(order)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._stock(self.product_a), 12)
        self.assertEqual(self._stock(self.product_b), 13)

    def test_cancel_restores_to_pre_checkout_levels(self):
        cart = Cart.objects.create(user=self.buyer)
        CartItem.objects.create(cart=cart, product=self.product_a, quantity=2)
        CartItem.objects.create(cart=cart, product=self.product_b, quantity=3)
        checkout = self._client(self.buyer).post(
            '/api/orders/create_from_cart/', {
                'shipping_name': 'Test User',
                'shipping_address': '123 Test St',
                'shipping_city': 'Test City',
                'shipping_postal_code': '12345',
                'shipping_phone': '555-1234',
                'payment_method': 'card',
            }, format='json'
        )
        self.assertEqual(checkout.status_code, 201)
        order = Order.objects.get(user=self.buyer)
        self.assertEqual(self._stock(self.product_a), 8)
        self.assertEqual(self._stock(self.product_b), 7)

        response = self._cancel(order)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._stock(self.product_a), 10)
        self.assertEqual(self._stock(self.product_b), 10)

    def test_cancel_does_not_affect_other_orders(self):
        order_one = self._order(status='pending', items=[(self.product_a, 2)])
        order_two = self._order(status='pending', items=[(self.product_a, 1)])
        # Simulate checkout decrement for both orders.
        self.product_a.stock = 7
        self.product_a.save()

        response = self._cancel(order_one)

        self.assertEqual(response.status_code, 200)
        # Only order_one's quantity is restored: 7 + 2.
        self.assertEqual(self._stock(self.product_a), 9)
        order_two.refresh_from_db()
        self.assertEqual(order_two.status, 'pending')
        self.assertEqual(order_two.items.get(product=self.product_a).quantity, 1)

    def test_cancel_forced_mid_failure_restores_nothing(self):
        order = self._order(status='processing')
        items = list(order.items.all())
        first_item = items[0]

        def flaky_restore(ordr):
            # Restore the first product, then fail before the second.
            first_product = Product.objects.get(pk=first_item.product_id)
            first_product.stock += first_item.quantity
            first_product.save()
            raise RuntimeError('forced mid-failure')

        with patch('orders.views._restore_order_stock', side_effect=flaky_restore):
            with self.assertRaises(RuntimeError):
                self.client.post(f'/api/staff/orders/{order.id}/cancel/')

        # The whole transaction rolled back: no partial restore, status intact.
        self.assertEqual(self._stock(self.product_a), 10)
        self.assertEqual(self._stock(self.product_b), 10)
        order.refresh_from_db()
        self.assertEqual(order.status, 'processing')


class DiscrepancyFlowTests(StaffOrderTestBase):
    """Discrepancy flag/resolve flow: lateral block, admin-only resolution."""

    def _advance(self, user, order, **data):
        return self._client(user).post(
            f'/api/staff/orders/{order.id}/advance/', data, format='json'
        )

    def _flag(self, user, order, reason='missing'):
        return self._client(user).post(
            f'/api/staff/orders/{order.id}/discrepancy/', {'reason': reason},
            format='json'
        )

    def _resolve(self, user, order):
        return self._client(user).post(
            f'/api/staff/orders/{order.id}/resolve-discrepancy/'
        )

    def test_bodega_flags_processing_order_as_damaged(self):
        order = self._order(status='processing')

        response = self._flag(self.bodega, order, reason='damaged')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'discrepancy')
        self.assertEqual(response.data['discrepancy_reason'], 'damaged')
        order.refresh_from_db()
        self.assertEqual(order.status, 'discrepancy')
        self.assertEqual(order.pre_discrepancy_status, 'processing')
        self.assertEqual(order.discrepancy_reason, 'damaged')

    def test_bodega_flags_pending_order_as_missing(self):
        order = self._order(status='pending')

        response = self._flag(self.bodega, order, reason='missing')

        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, 'discrepancy')
        self.assertEqual(order.pre_discrepancy_status, 'pending')
        self.assertEqual(order.discrepancy_reason, 'missing')

    def test_admin_can_flag_order_as_discrepancy(self):
        order = self._order(status='ready')

        response = self._flag(self.admin, order, reason='damaged')

        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, 'discrepancy')
        self.assertEqual(order.pre_discrepancy_status, 'ready')

    def test_despacho_cannot_flag_discrepancy(self):
        order = self._order(status='ready')

        response = self._flag(self.despacho, order)

        self.assertEqual(response.status_code, 403)
        order.refresh_from_db()
        self.assertEqual(order.status, 'ready')

    def test_customer_cannot_flag_discrepancy(self):
        order = self._order(status='pending')

        response = self._flag(self.customer, order)

        self.assertEqual(response.status_code, 403)

    def test_flag_rejects_bad_reason(self):
        order = self._order(status='pending')

        response = self._flag(self.bodega, order, reason='broken')

        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.status, 'pending')

    def test_flag_rejects_discrepancy_order(self):
        order = self._order(status='discrepancy')

        response = self._flag(self.bodega, order)

        self.assertEqual(response.status_code, 403)
        order.refresh_from_db()
        self.assertEqual(order.status, 'discrepancy')

    def test_flag_from_shipped_rejected(self):
        order = self._order(status='shipped')

        response = self._flag(self.bodega, order)

        self.assertEqual(response.status_code, 403)
        order.refresh_from_db()
        self.assertEqual(order.status, 'shipped')

    def test_flag_missing_order_returns_404(self):
        response = self._client(self.bodega).post(
            '/api/staff/orders/9999/discrepancy/', {'reason': 'missing'},
            format='json'
        )

        self.assertEqual(response.status_code, 404)

    def test_bodega_cannot_advance_discrepancy_order(self):
        order = self._order(status='discrepancy')

        response = self._advance(self.bodega, order)

        self.assertEqual(response.status_code, 403)
        order.refresh_from_db()
        self.assertEqual(order.status, 'discrepancy')

    def test_despacho_cannot_advance_discrepancy_order(self):
        order = self._order(status='discrepancy')

        response = self._advance(self.despacho, order)

        self.assertEqual(response.status_code, 403)

    def test_admin_cannot_advance_discrepancy_order(self):
        order = self._order(status='discrepancy')

        response = self._advance(self.admin, order)

        self.assertEqual(response.status_code, 403)

    def test_full_cycle_pending_flag_block_resolve_resume(self):
        order = self._order(status='pending')

        flag = self._flag(self.bodega, order, reason='missing')
        self.assertEqual(flag.status_code, 200)

        blocked = self._advance(self.bodega, order)
        self.assertEqual(blocked.status_code, 403)

        resolved = self._resolve(self.admin, order)
        self.assertEqual(resolved.status_code, 200)
        self.assertEqual(resolved.data['status'], 'pending')
        order.refresh_from_db()
        self.assertEqual(order.status, 'pending')
        self.assertIsNone(order.pre_discrepancy_status)
        self.assertEqual(order.discrepancy_reason, '')

        resumed = self._advance(self.bodega, order)
        self.assertEqual(resumed.status_code, 200)
        self.assertEqual(resumed.data['status'], 'processing')

    def test_full_cycle_processing_flag_block_resolve_resume(self):
        order = self._order(status='processing')

        flag = self._flag(self.admin, order, reason='damaged')
        self.assertEqual(flag.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.pre_discrepancy_status, 'processing')

        blocked = self._advance(self.bodega, order)
        self.assertEqual(blocked.status_code, 403)

        resolved = self._resolve(self.admin, order)
        self.assertEqual(resolved.status_code, 200)
        self.assertEqual(resolved.data['status'], 'processing')

        resumed = self._advance(self.bodega, order)
        self.assertEqual(resumed.status_code, 200)
        self.assertEqual(resumed.data['status'], 'ready')

    def test_non_admin_cannot_resolve(self):
        order = self._order(status='discrepancy')

        response = self._resolve(self.bodega, order)

        self.assertEqual(response.status_code, 403)
        order.refresh_from_db()
        self.assertEqual(order.status, 'discrepancy')

    def test_resolve_on_non_discrepancy_returns_400(self):
        order = self._order(status='processing')

        response = self._resolve(self.admin, order)

        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.status, 'processing')

    def test_resolve_missing_order_returns_404(self):
        response = self._client(self.admin).post(
            '/api/staff/orders/9999/resolve-discrepancy/'
        )

        self.assertEqual(response.status_code, 404)

    def test_admin_cancels_discrepancy_order_restores_stock(self):
        order = self._order(status='discrepancy')

        response = self._client(self.admin).post(
            f'/api/staff/orders/{order.id}/cancel/'
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'cancelled')
        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')
        self.assertEqual(self._stock(self.product_a), 12)
        self.assertEqual(self._stock(self.product_b), 11)

    def test_admin_list_shows_discrepancy_reason(self):
        flagged = self._order(status='pending')
        self._flag(self.bodega, flagged, reason='damaged')
        normal = self._order(status='ready')

        response = self._client(self.admin).get('/api/staff/orders/')

        self.assertEqual(response.status_code, 200)
        flagged_data = next(o for o in response.data if o['id'] == flagged.id)
        normal_data = next(o for o in response.data if o['id'] == normal.id)
        self.assertEqual(flagged_data['status'], 'discrepancy')
        self.assertEqual(flagged_data['discrepancy_reason'], 'damaged')
        self.assertEqual(normal_data['discrepancy_reason'], '')