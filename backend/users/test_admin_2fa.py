"""Regression tests for the Django admin 2FA gate.

The DRF gate in ``users.authentication`` only covers API requests. The admin
site is the more privileged surface, so ``mitienda.urls`` swaps the site class
for ``OTPAdminSite`` and ``mitienda.settings`` installs ``OTPMiddleware``.
These tests pin that swap: a password alone must never reach ``/admin/``.

``totp_enroll`` is the bootstrap path for a fresh database, where the API
enrollment endpoint cannot be used because it requires an admin profile that
does not exist yet.
"""

from io import StringIO

from django.contrib import admin
from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from django.urls import reverse
from django_otp.admin import OTPAdminSite
from django_otp.plugins.otp_totp.models import TOTPDevice

from users.models import UserProfile
from users.tests import _current_totp_code, _role_user

PASSWORD = 'testpass123'

# Rendering the admin login template resolves {% static %}, and the production
# storage is a manifest backend that only has entries after collectstatic.
PLAIN_STATICFILES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    },
}


@override_settings(STORAGES=PLAIN_STATICFILES)
class AdminSiteOTPGateTests(TestCase):
    """A password alone must never grant access to the Django admin."""

    def setUp(self):
        self.admin = _role_user('siteadmin', 'admin')

    def _device(self, confirmed=True):
        return TOTPDevice.objects.create(
            user=self.admin, name='admin', confirmed=confirmed
        )

    def _login(self, **extra):
        payload = {'username': 'siteadmin', 'password': PASSWORD}
        payload.update(extra)
        return self.client.post(reverse('admin:login'), payload)

    def _assert_denied(self):
        self.assertNotIn('_auth_user_id', self.client.session)
        self.assertEqual(self.client.get(reverse('admin:index')).status_code, 302)

    def test_admin_site_is_otp_aware(self):
        self.assertIsInstance(admin.site, OTPAdminSite)

    def test_password_alone_does_not_reach_admin(self):
        self._device()

        response = self._login()

        self.assertEqual(response.status_code, 200)
        self._assert_denied()

    def test_wrong_token_does_not_reach_admin(self):
        device = self._device()

        response = self._login(
            otp_device=device.persistent_id, otp_token='000000'
        )

        self.assertEqual(response.status_code, 200)
        self._assert_denied()

    def test_valid_token_reaches_admin(self):
        device = self._device()

        response = self._login(
            otp_device=device.persistent_id,
            otp_token=_current_totp_code(device),
        )

        self.assertEqual(response.status_code, 302)
        self.assertIn('_auth_user_id', self.client.session)
        self.assertEqual(
            self.client.get(reverse('admin:index')).status_code, 200
        )

    def test_staff_without_device_cannot_reach_admin(self):
        response = self._login(otp_token='000000')

        self.assertEqual(response.status_code, 200)
        self._assert_denied()

    def test_unconfirmed_device_cannot_reach_admin(self):
        # django-otp verifies the token arithmetic for an unconfirmed device,
        # so the password plus a valid code does authenticate the first factor.
        # What must not happen is admin access: ConfirmedDeviceAdminSite
        # requires the verifying device to be confirmed, matching the API gate.
        device = self._device(confirmed=False)

        self._login(
            otp_device=device.persistent_id,
            otp_token=_current_totp_code(device),
        )

        index = self.client.get(reverse('admin:index'))
        self.assertEqual(index.status_code, 302)
        self.assertTrue(index['Location'].startswith(reverse('admin:login')))


class TotpEnrollCommandTests(TestCase):
    """The bootstrap command that makes a fresh database reachable."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='bootstrap', password=PASSWORD
        )

    def _run(self, *args):
        out = StringIO()
        call_command('totp_enroll', *args, stdout=out)
        return out.getvalue()

    def test_enroll_creates_unconfirmed_device_and_prints_uri(self):
        output = self._run('bootstrap')

        device = TOTPDevice.objects.get(user=self.user)
        self.assertFalse(device.confirmed)
        self.assertIn('Provisioning URI', output)
        self.assertIn('otpauth://totp/', output)

    def test_enroll_promotes_plain_user_to_admin(self):
        self._run('bootstrap')

        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(profile.role, UserProfile.ROLE_ADMIN)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_staff)

    def test_code_confirms_the_device_already_enrolled(self):
        self._run('bootstrap')
        device = TOTPDevice.objects.get(user=self.user)

        output = self._run('bootstrap', '--code', _current_totp_code(device))

        self.assertEqual(TOTPDevice.objects.filter(user=self.user).count(), 1)
        device.refresh_from_db()
        self.assertTrue(device.confirmed)
        self.assertIn('Confirmed TOTP', output)

    def test_reset_replaces_the_existing_device(self):
        first = TOTPDevice.objects.create(
            user=self.user, name='admin', confirmed=True
        )

        self._run('bootstrap', '--reset')

        devices = TOTPDevice.objects.filter(user=self.user)
        self.assertEqual(devices.count(), 1)
        self.assertNotEqual(devices.first().pk, first.pk)
        self.assertFalse(devices.first().confirmed)

    def test_refuses_when_confirmed_device_exists_without_reset(self):
        TOTPDevice.objects.create(user=self.user, name='admin', confirmed=True)

        with self.assertRaises(CommandError):
            self._run('bootstrap')
