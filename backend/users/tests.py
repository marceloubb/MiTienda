from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from users.models import UserProfile


class ProfileUpdateTests(TestCase):
    """PUT /api/users/profile/ is validated by a serializer."""

    def setUp(self):
        self.user = User.objects.create_user(username='profiler', password='testpass123')
        UserProfile.objects.create(user=self.user, phone='555-1234')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _get_profile(self):
        return UserProfile.objects.get(user=self.user)

    def test_update_fields_with_valid_data(self):
        response = self.client.put('/api/users/profile/', {
            'first_name': 'New',
            'email': 'new@example.com',
            'phone': '555-9999',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'New')
        self.assertEqual(self.user.email, 'new@example.com')
        self.assertEqual(self._get_profile().phone, '555-9999')

    def test_empty_string_clears_field(self):
        response = self.client.put('/api/users/profile/', {'phone': ''}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._get_profile().phone, '')

    def test_invalid_email_rejected(self):
        response = self.client.put('/api/users/profile/', {
            'email': 'not-an-email',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, '')


class LogoutTests(TestCase):
    """POST /api/users/logout/ deletes the token and is idempotent."""

    def test_logout_with_token_deletes_it(self):
        user = User.objects.create_user(username='logout-user', password='testpass123')
        token = Token.objects.create(user=user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = client.post('/api/users/logout/')

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Token.objects.filter(user=user).exists())

    def test_logout_without_token_is_idempotent(self):
        user = User.objects.create_user(username='logout-user2', password='testpass123')
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post('/api/users/logout/')

        self.assertEqual(response.status_code, 200)