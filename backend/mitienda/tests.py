import importlib
import os
from unittest import mock

from django.core.exceptions import ImproperlyConfigured
from django.test import TestCase

PLACEHOLDER_SECRET_KEY = 'django-insecure-ls#+os#hiq*hqg6a9c*yzapi452p*_o$q3k6@%oady%0yxcmxz'


class SettingsGuardTests(TestCase):
    """The ImproperlyConfigured guard fires only in production with the placeholder key."""

    def _reload_settings(self, debug, secret_key):
        with mock.patch.dict(
            os.environ,
            {'DJANGO_DEBUG': debug, 'DJANGO_SECRET_KEY': secret_key},
        ):
            import mitienda.settings
            importlib.reload(mitienda.settings)

    def test_production_with_placeholder_key_raises(self):
        with self.assertRaises(ImproperlyConfigured):
            self._reload_settings('False', PLACEHOLDER_SECRET_KEY)

    def test_production_with_real_key_proceeds(self):
        try:
            self._reload_settings('False', 'a-real-secret-key-value')
        except ImproperlyConfigured:
            self.fail('Guard raised ImproperlyConfigured with a real SECRET_KEY')

    def test_debug_mode_with_placeholder_key_proceeds(self):
        try:
            self._reload_settings('True', PLACEHOLDER_SECRET_KEY)
        except ImproperlyConfigured:
            self.fail('Guard raised ImproperlyConfigured in DEBUG mode')

    def test_debug_unset_defaults_false_with_placeholder_key_raises(self):
        # Spec: DJANGO_DEBUG unset -> DEBUG defaults False; placeholder key -> guard fires.
        with mock.patch.dict(os.environ, {}, clear=False), \
                mock.patch('dotenv.load_dotenv'):
            os.environ.pop('DJANGO_DEBUG', None)
            os.environ.pop('DJANGO_SECRET_KEY', None)
            with self.assertRaises(ImproperlyConfigured):
                import mitienda.settings
                importlib.reload(mitienda.settings)

    def test_debug_unset_with_real_key_proceeds_with_debug_false(self):
        with mock.patch.dict(
            os.environ, {'DJANGO_SECRET_KEY': 'a-real-secret-key-value'}, clear=False
        ), mock.patch('dotenv.load_dotenv'):
            os.environ.pop('DJANGO_DEBUG', None)
            try:
                import mitienda.settings
                importlib.reload(mitienda.settings)
            except ImproperlyConfigured:
                self.fail('Guard raised ImproperlyConfigured with a real SECRET_KEY')
            self.assertFalse(mitienda.settings.DEBUG)

    def tearDown(self):
        # Restore the settings module to a healthy state after reloads.
        import mitienda.settings
        importlib.reload(mitienda.settings)
        super().tearDown()


class SecureModeTests(TestCase):
    """The env-gated secure block is off by default and activates with DJANGO_SECURE_MODE."""

    def _reload_settings(self, env):
        with mock.patch.dict(os.environ, env, clear=False):
            import mitienda.settings
            importlib.reload(mitienda.settings)

    def test_secure_mode_on_sets_secure_block(self):
        self._reload_settings({'DJANGO_SECURE_MODE': 'True'})
        import mitienda.settings
        self.assertTrue(mitienda.settings.SESSION_COOKIE_SECURE)
        self.assertTrue(mitienda.settings.CSRF_COOKIE_SECURE)
        self.assertTrue(mitienda.settings.SECURE_SSL_REDIRECT)
        self.assertEqual(mitienda.settings.SECURE_HSTS_SECONDS, 31536000)
        self.assertEqual(
            mitienda.settings.SECURE_PROXY_SSL_HEADER,
            ('HTTP_X_FORWARDED_PROTO', 'https'),
        )

    def test_secure_mode_on_honors_hsts_override(self):
        self._reload_settings({
            'DJANGO_SECURE_MODE': 'True',
            'DJANGO_HSTS_SECONDS': '7776000',
        })
        import mitienda.settings
        self.assertEqual(mitienda.settings.SECURE_HSTS_SECONDS, 7776000)

    def test_secure_mode_off_by_default(self):
        import mitienda.settings
        self.assertFalse(hasattr(mitienda.settings, 'SESSION_COOKIE_SECURE'))
        self.assertFalse(hasattr(mitienda.settings, 'CSRF_COOKIE_SECURE'))
        self.assertFalse(hasattr(mitienda.settings, 'SECURE_SSL_REDIRECT'))
        self.assertFalse(hasattr(mitienda.settings, 'SECURE_HSTS_SECONDS'))
        self.assertFalse(hasattr(mitienda.settings, 'SECURE_PROXY_SSL_HEADER'))

    def test_cors_credentials_disabled(self):
        from django.conf import settings
        self.assertFalse(settings.CORS_ALLOW_CREDENTIALS)

    def tearDown(self):
        # Restore the settings module to a healthy state after reloads.
        import mitienda.settings
        importlib.reload(mitienda.settings)
        super().tearDown()