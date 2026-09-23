import importlib
import os
from unittest import mock

from django.core.exceptions import ImproperlyConfigured
from django.test import Client, TestCase, override_settings
from django.urls import clear_url_caches

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

    def test_cors_credentials_enabled_with_explicit_origins(self):
        # The cookie auth design requires credentials AND an explicit origin
        # allowlist: a wildcard CORS origin would let any site send the
        # SameSite=Lax cookie-bearing requests cross-origin.
        from django.conf import settings
        self.assertTrue(settings.CORS_ALLOW_CREDENTIALS)
        self.assertNotIn('*', settings.CORS_ALLOWED_ORIGINS)
        self.assertIn('http://localhost:3000', settings.CORS_ALLOWED_ORIGINS)

    def tearDown(self):
        # Restore the settings module to a healthy state after reloads.
        import mitienda.settings
        importlib.reload(mitienda.settings)
        super().tearDown()


class AdminAccessControlTests(TestCase):
    """DJANGO_ADMIN_URL drives the admin path; AdminIPAllowlistMiddleware gates it."""

    def _reload_settings(self, env):
        with mock.patch.dict(os.environ, env, clear=False):
            import mitienda.settings
            importlib.reload(mitienda.settings)

    def _reload_urls(self):
        import mitienda.urls
        importlib.reload(mitienda.urls)
        clear_url_caches()

    def test_default_admin_url(self):
        # DJANGO_ADMIN_URL unset -> admin served at /admin/.
        import mitienda.settings
        self.assertEqual(mitienda.settings.ADMIN_URL, 'admin/')
        response = self.client.get('/admin/login/')
        self.assertEqual(response.status_code, 200)

    def test_custom_admin_url_setting(self):
        # DJANGO_ADMIN_URL=backoffice/ -> settings.ADMIN_URL derives backoffice/.
        self._reload_settings({'DJANGO_ADMIN_URL': 'backoffice/'})
        import mitienda.settings
        self.assertEqual(mitienda.settings.ADMIN_URL, 'backoffice/')

    @override_settings(ADMIN_URL='backoffice/')
    def test_custom_admin_url_routes_admin(self):
        # settings.ADMIN_URL=backoffice/ -> admin responds at /backoffice/, not /admin/.
        self._reload_urls()
        response = self.client.get('/backoffice/login/')
        self.assertEqual(response.status_code, 200)
        response = self.client.get('/admin/login/')
        self.assertEqual(response.status_code, 404)

    @override_settings(ADMIN_ALLOWED_IPS='203.0.113.5')
    def test_allowlisted_ip_allowed(self):
        client = Client(REMOTE_ADDR='203.0.113.5')
        response = client.get('/admin/login/')
        self.assertEqual(response.status_code, 200)

    @override_settings(ADMIN_ALLOWED_IPS='203.0.113.5')
    def test_unlisted_ip_denied(self):
        response = self.client.get('/admin/login/')
        self.assertEqual(response.status_code, 403)

    def test_allowlist_unset_permits_access(self):
        response = self.client.get('/admin/login/')
        self.assertEqual(response.status_code, 200)

    def tearDown(self):
        # Restore the settings module and URL config to their default state.
        import mitienda.settings
        importlib.reload(mitienda.settings)
        self._reload_urls()
        super().tearDown()


class DatabaseSettingsTests(TestCase):
    """DATABASE_URL selects the psycopg Postgres backend; SQLite stays the dev default."""

    def _reload_settings(self, env):
        with mock.patch('dotenv.load_dotenv'), mock.patch.dict(os.environ, env, clear=False):
            import mitienda.settings
            importlib.reload(mitienda.settings)

    def test_postgres_url_selects_postgresql_backend(self):
        self._reload_settings({
            'DATABASE_URL': 'postgres://mitienda:secret@db.example.com:5432/mitienda',
        })
        import mitienda.settings
        db = mitienda.settings.DATABASES['default']
        self.assertEqual(db['ENGINE'], 'django.db.backends.postgresql')
        self.assertEqual(db['NAME'], 'mitienda')
        self.assertEqual(db['USER'], 'mitienda')
        self.assertEqual(db['PASSWORD'], 'secret')
        self.assertEqual(db['HOST'], 'db.example.com')
        self.assertEqual(db['PORT'], 5432)

    def test_non_postgres_url_keeps_sqlite_dev_default(self):
        self._reload_settings({'DATABASE_URL': 'sqlite:///dev.db'})
        import mitienda.settings
        db = mitienda.settings.DATABASES['default']
        self.assertEqual(db['ENGINE'], 'django.db.backends.sqlite3')
        self.assertTrue(str(db['NAME']).endswith('db.sqlite3'))

    def test_unset_url_keeps_sqlite_dev_default(self):
        with mock.patch('dotenv.load_dotenv'), mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop('DATABASE_URL', None)
            import mitienda.settings
            importlib.reload(mitienda.settings)
        import mitienda.settings
        db = mitienda.settings.DATABASES['default']
        self.assertEqual(db['ENGINE'], 'django.db.backends.sqlite3')
        self.assertTrue(str(db['NAME']).endswith('db.sqlite3'))

    def tearDown(self):
        # Restore the settings module to a healthy state (SQLite dev default).
        import mitienda.settings
        importlib.reload(mitienda.settings)
        super().tearDown()