from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APIRequestFactory

from users.models import UserProfile
from users.permissions import IsAdmin, IsBodega, IsDespacho, IsStaffRole


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


def _role_user(username, role):
    user = User.objects.create_user(username=username, password='testpass123')
    UserProfile.objects.create(user=user, role=role)
    return user


class StaffRoleBackfillMigrationTests(TransactionTestCase):
    """users 0002 must promote existing is_staff users to role=admin.

    TransactionTestCase: reversing/applying migrations needs schema changes
    outside a test transaction on SQLite.
    """

    migrate_from = [('users', '0001_initial')]
    migrate_to = [('users', '0002_role_backfill')]

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        self.executor.migrate(self.migrate_from)
        self.old_apps = self.executor.loader.project_state(self.migrate_from).apps

    def tearDown(self):
        self.executor.loader.build_graph()
        self.executor.migrate(self.migrate_to)
        super().tearDown()

    def test_backfill_promotes_is_staff_users(self):
        User = self.old_apps.get_model('auth', 'User')
        LegacyProfile = self.old_apps.get_model('users', 'UserProfile')
        staff = User.objects.create_user(
            username='oldstaff', password='testpass123', is_staff=True
        )
        regular = User.objects.create_user(username='oldregular', password='testpass123')
        LegacyProfile.objects.create(user=staff)
        LegacyProfile.objects.create(user=regular)

        self.executor.loader.build_graph()
        self.executor.migrate(self.migrate_to)

        self.assertEqual(
            UserProfile.objects.get(user__username='oldstaff').role, 'admin'
        )
        self.assertEqual(
            UserProfile.objects.get(user__username='oldregular').role, 'customer'
        )


class RoleModelSyncTests(TestCase):
    """role is exclusive and is_staff mirrors role == 'admin' at save time."""

    def test_default_role_on_new_user_via_register(self):
        response = APIClient().post('/api/users/register/', {
            'username': 'newbie',
            'email': 'newbie@example.com',
            'password': 'longpass123',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['user']['role'], 'customer')
        self.assertFalse(response.data['user']['is_staff'])
        profile = UserProfile.objects.get(user__username='newbie')
        self.assertEqual(profile.role, 'customer')
        self.assertFalse(profile.user.is_staff)

    def test_profile_save_with_admin_role_sets_is_staff(self):
        user = User.objects.create_user(username='promoted', password='testpass123')
        UserProfile.objects.create(user=user, role='admin')

        user.refresh_from_db()
        self.assertTrue(user.is_staff)

    def test_role_change_from_admin_to_bodega_unsets_is_staff(self):
        user = _role_user('demoted', 'admin')
        self.assertTrue(user.is_staff)
        profile = user.profile
        profile.role = 'bodega'
        profile.save()

        user.refresh_from_db()
        self.assertFalse(user.is_staff)


class RolePermissionTests(TestCase):
    """DRF permission matrix against user.profile.role."""

    def _request_for(self, user):
        request = APIRequestFactory().get('/')
        request.user = user
        return request

    def test_admin_allowed_on_is_admin(self):
        self.assertTrue(IsAdmin().has_permission(self._request_for(_role_user('a', 'admin')), None))

    def test_bodega_denied_on_is_admin(self):
        self.assertFalse(IsAdmin().has_permission(self._request_for(_role_user('b1', 'bodega')), None))

    def test_bodega_and_despacho_allowed_on_their_own_classes(self):
        self.assertTrue(IsBodega().has_permission(self._request_for(_role_user('b2', 'bodega')), None))
        self.assertTrue(IsDespacho().has_permission(self._request_for(_role_user('d1', 'despacho')), None))

    def test_is_staff_role_includes_all_staff_roles(self):
        for role in ('admin', 'bodega', 'despacho'):
            self.assertTrue(
                IsStaffRole().has_permission(self._request_for(_role_user(role, role)), None)
            )

    def test_customer_denied_on_is_staff_role(self):
        self.assertFalse(
            IsStaffRole().has_permission(self._request_for(_role_user('c1', 'customer')), None)
        )

    def test_admin_endpoint_allows_admin_and_denies_bodega(self):
        admin = _role_user('admin1', 'admin')
        client = APIClient()
        client.force_authenticate(user=admin)

        staff = _role_user('staff1', 'bodega')
        self.assertEqual(client.get(f'/api/users/{staff.id}/').status_code, 200)
        self.assertEqual(client.post('/api/staff/users/', {
            'username': 'x', 'email': 'x@example.com', 'password': 'longpass123', 'role': 'bodega',
        }, format='json').status_code, 201)

        bodega_client = APIClient()
        bodega_client.force_authenticate(user=staff)
        self.assertEqual(bodega_client.get(f'/api/users/{admin.id}/').status_code, 403)
        self.assertEqual(bodega_client.post('/api/staff/users/', {
            'username': 'y', 'email': 'y@example.com', 'password': 'longpass123', 'role': 'bodega',
        }, format='json').status_code, 403)


class UserDetailRoleTests(TestCase):
    """GET/PATCH /api/users/{id}/ exposes and updates role (admin-guarded)."""

    def setUp(self):
        self.admin = _role_user('boss', 'admin')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_get_exposes_role_and_is_staff(self):
        target = _role_user('target', 'bodega')
        response = self.client.get(f'/api/users/{target.id}/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['role'], 'bodega')
        self.assertFalse(response.data['is_staff'])

    def test_patch_role_admin_sets_is_staff_true(self):
        target = _role_user('promotee', 'customer')
        response = self.client.patch(f'/api/users/{target.id}/', {'role': 'admin'}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['is_staff'])
        target.refresh_from_db()
        self.assertTrue(target.is_staff)

    def test_patch_role_bodega_unsets_is_staff(self):
        target = _role_user('demotee', 'admin')
        response = self.client.patch(f'/api/users/{target.id}/', {'role': 'bodega'}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['is_staff'])
        target.refresh_from_db()
        self.assertFalse(target.is_staff)

    def test_patch_invalid_role_rejected(self):
        target = _role_user('victim', 'customer')
        response = self.client.patch(f'/api/users/{target.id}/', {'role': 'manager'}, format='json')

        self.assertEqual(response.status_code, 400)

    def test_non_admin_get_denied(self):
        customer = _role_user('nosy', 'customer')
        client = APIClient()
        client.force_authenticate(user=customer)

        self.assertEqual(client.get(f'/api/users/{self.admin.id}/').status_code, 403)


class StaffUserCreationTests(TestCase):
    """POST /api/staff/users/ is admin-only and role-restricted."""

    def setUp(self):
        self.admin = _role_user('creator', 'admin')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def _data(self, **overrides):
        data = {
            'username': 'newstaff',
            'email': 'newstaff@example.com',
            'password': 'longpass123',
            'role': 'bodega',
        }
        data.update(overrides)
        return data

    def test_admin_creates_bodega_user(self):
        response = self.client.post('/api/staff/users/', self._data(), format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['role'], 'bodega')
        self.assertFalse(response.data['is_staff'])
        user = User.objects.get(username='newstaff')
        self.assertFalse(user.is_staff)
        self.assertEqual(user.profile.role, 'bodega')

    def test_admin_creates_admin_user(self):
        response = self.client.post('/api/staff/users/', self._data(role='admin'), format='json')

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.get(username='newstaff').is_staff)
        self.assertEqual(response.data['role'], 'admin')

    def test_non_admin_rejected(self):
        bodega = _role_user('worker', 'bodega')
        client = APIClient()
        client.force_authenticate(user=bodega)

        response = client.post('/api/staff/users/', self._data(), format='json')
        self.assertEqual(response.status_code, 403)

    def test_duplicate_username_rejected(self):
        self.client.post('/api/staff/users/', self._data(), format='json')
        response = self.client.post(
            '/api/staff/users/', self._data(username='newstaff'), format='json'
        )

        self.assertEqual(response.status_code, 400)

    def test_short_password_rejected(self):
        response = self.client.post('/api/staff/users/', self._data(password='short'), format='json')

        self.assertEqual(response.status_code, 400)

    def test_bad_role_rejected(self):
        response = self.client.post('/api/staff/users/', self._data(role='manager'), format='json')

        self.assertEqual(response.status_code, 400)

    def test_customer_role_rejected(self):
        response = self.client.post('/api/staff/users/', self._data(role='customer'), format='json')

        self.assertEqual(response.status_code, 400)


class StaffDriftSignalTests(TestCase):
    """User post_save keeps role consistent with the is_staff flag."""

    def test_is_staff_true_promotes_role_to_admin(self):
        user = _role_user('secretary', 'customer')
        user.is_staff = True
        user.save()

        user.profile.refresh_from_db()
        self.assertEqual(user.profile.role, 'admin')

    def test_is_staff_false_demotes_admin_role(self):
        user = _role_user('fired', 'admin')
        user.is_staff = False
        user.save()

        user.profile.refresh_from_db()
        self.assertEqual(user.profile.role, 'customer')

    def test_bodega_role_preserved_on_user_save(self):
        user = _role_user('stable', 'bodega')
        user.first_name = 'Changed'
        user.save()

        user.profile.refresh_from_db()
        self.assertEqual(user.profile.role, 'bodega')


class PasswordPolicyRegisterTests(TestCase):
    """H2 - register enforces AUTH_PASSWORD_VALIDATORS before creating."""

    def _register(self, **overrides):
        data = {
            'username': 'policyuser',
            'email': 'policy@example.com',
            'password': 'Tr0ub4dor&3',
        }
        data.update(overrides)
        return APIClient().post('/api/users/register/', data, format='json')

    def test_weak_password_rejected_no_account_created(self):
        response = self._register(
            username='weakling', email='weak@example.com', password='password'
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.data)
        self.assertFalse(User.objects.filter(username='weakling').exists())

    def test_numeric_password_rejected(self):
        response = self._register(
            username='numbers1', email='number@example.com', password='12345678'
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username='numbers1').exists())

    def test_password_similar_to_username_rejected(self):
        response = self._register(
            username='peppermint', email='pep@example.com', password='peppermint1'
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username='peppermint').exists())

    def test_strong_password_accepted(self):
        response = self._register(
            username='stronguser', email='strong@example.com', password='Tr0ub4dor&3'
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(username='stronguser').exists())


class PasswordPolicyStaffCreateTests(TestCase):
    """H2 - staff-create enforces AUTH_PASSWORD_VALIDATORS."""

    def setUp(self):
        self.admin = _role_user('boss2', 'admin')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_weak_password_rejected_no_user_created(self):
        response = self.client.post('/api/staff/users/', {
            'username': 'newweak', 'email': 'weak@example.com',
            'password': '12345678', 'role': 'bodega',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.data)
        self.assertFalse(User.objects.filter(username='newweak').exists())

    def test_valid_password_succeeds(self):
        response = self.client.post('/api/staff/users/', {
            'username': 'newstrong', 'email': 'strong@example.com',
            'password': 'Tr0ub4dor&3', 'role': 'bodega',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(username='newstrong').exists())


class RegisterThrottleTests(TestCase):
    """H4 - register throttled at 5/hour per client IP."""

    def setUp(self):
        self.client = APIClient()
        # DRF binds the default cache at import time; clear the same object
        # so throttle counters never leak across tests within this process.
        cache.clear()
        self.addCleanup(cache.clear)

    def test_sixth_register_within_hour_returns_429(self):
        for i in range(5):
            response = self.client.post('/api/users/register/', {
                'username': f'reg{i}', 'email': f'reg{i}@example.com',
                'password': 'Tr0ub4dor&3',
            }, format='json')
            self.assertEqual(response.status_code, 201)

        response = self.client.post('/api/users/register/', {
            'username': 'reg5', 'email': 'reg5@example.com',
            'password': 'Tr0ub4dor&3',
        }, format='json')

        self.assertEqual(response.status_code, 429)

    def test_invalid_register_payloads_still_consume_budget(self):
        for i in range(5):
            response = self.client.post('/api/users/register/', {
                'username': f'bad{i}', 'email': 'malformed-email', 'password': 'x',
            }, format='json')
            self.assertEqual(response.status_code, 400)

        response = self.client.post('/api/users/register/', {
            'username': 'bad5', 'email': 'bad5@example.com',
            'password': 'Tr0ub4dor&3',
        }, format='json')

        self.assertEqual(response.status_code, 429)


class LoginThrottleTests(TestCase):
    """H4 - login throttled at 10/min; invalid attempts consume the budget."""

    def setUp(self):
        self.user = User.objects.create_user(username='loginuser', password='correctpass')
        self.client = APIClient()
        cache.clear()
        self.addCleanup(cache.clear)

    def test_within_limits_login_succeeds(self):
        response = self.client.post('/api/users/login/', {
            'username': 'loginuser', 'password': 'correctpass',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertIn('token', response.data)

    def test_eleventh_login_within_minute_returns_429(self):
        for i in range(10):
            response = self.client.post('/api/users/login/', {
                'username': 'loginuser', 'password': 'wrongpass',
            }, format='json')
            self.assertEqual(response.status_code, 401)

        response = self.client.post('/api/users/login/', {
            'username': 'loginuser', 'password': 'correctpass',
        }, format='json')

        self.assertEqual(response.status_code, 429)