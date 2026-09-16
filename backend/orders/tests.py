from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from orders.models import Cart, CartItem, Order
from products.models import Category, Product


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