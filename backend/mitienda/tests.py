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

    def tearDown(self):
        # Restore the settings module to a healthy state after reloads.
        import mitienda.settings
        importlib.reload(mitienda.settings)
        super().tearDown()