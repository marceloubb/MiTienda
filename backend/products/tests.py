from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from products.models import Category, Product


class StaffOrReadOnlyTests(TestCase):
    """Writes to products and categories require a staff user."""

    def setUp(self):
        self.category = Category.objects.create(name='Test Category')

    def _product_data(self):
        return {
            'name': 'Test Product',
            'description': 'Description',
            'price': '10.00',
            'category': self.category.id,
            'stock': 5,
        }

    def test_non_staff_product_write_rejected(self):
        user = User.objects.create_user(username='regular', password='testpass123')
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post('/api/products/', self._product_data(), format='json')
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_product_write_rejected(self):
        client = APIClient()

        response = client.post('/api/products/', self._product_data(), format='json')
        self.assertEqual(response.status_code, 403)

    def test_staff_product_write_succeeds(self):
        staff = User.objects.create_user(
            username='staff-user', password='testpass123', is_staff=True
        )
        client = APIClient()
        client.force_authenticate(user=staff)

        response = client.post('/api/products/', self._product_data(), format='json')
        self.assertEqual(response.status_code, 201)

    def test_unauthenticated_read_allowed(self):
        Product.objects.create(
            name='Visible Product',
            description='Description',
            price='9.99',
            category=self.category,
            stock=1,
        )
        client = APIClient()

        response = client.get('/api/products/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_non_staff_category_write_rejected(self):
        user = User.objects.create_user(username='regular', password='testpass123')
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post('/api/categories/', {'name': 'New Category'}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_staff_category_write_succeeds(self):
        staff = User.objects.create_user(
            username='staff-user', password='testpass123', is_staff=True
        )
        client = APIClient()
        client.force_authenticate(user=staff)

        response = client.post('/api/categories/', {'name': 'New Category'}, format='json')
        self.assertEqual(response.status_code, 201)