"""DRF TokenAuthentication subclass enforcing a configurable expiry (H3).

Replaces ``rest_framework.authentication.TokenAuthentication`` in
``DEFAULT_AUTHENTICATION_CLASSES`` so every token-verified request is checked
against ``DJANGO_TOKEN_TTL_HOURS`` using the token's ``created`` timestamp.

The token can be presented two ways, tried in order:

1. ``Authorization: Token <key>`` header — unchanged behavior for non-browser
   clients (curl, tests, scripts).
2. The httpOnly cookie named by ``settings.TOKEN_COOKIE_NAME`` (default
   ``auth_token``) that the backend sets on login/register/refresh. Browsers
   send it automatically on same-site fetch requests, so the SPA never needs
   to read the token string out of JS.
"""

from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import AuthenticationFailed


class ExpiringTokenAuthentication(TokenAuthentication):
    """Reject DRF tokens older than ``DJANGO_TOKEN_TTL_HOURS`` (default 24).

    When ``DJANGO_2FA_ENFORCED`` is on, requests from users with a confirmed
    TOTP device must also carry a valid code in the ``X-TOTP`` header (H10).
    """

    def authenticate(self, request):
        # 1) Header first: token presented in the Authorization header keeps
        #    its exact current behavior (an invalid header raises here).
        result = super().authenticate(request)
        if result is not None:
            return self._validate_expiry_and_2fa(request, result[0], result[1])

        # 2) No Authorization header: fall back to the httpOnly session cookie.
        cookie_name = getattr(settings, 'TOKEN_COOKIE_NAME', 'auth_token')
        token_key = request.COOKIES.get(cookie_name)
        if not token_key:
            # No cookie either: stay silent so other authenticators
            # (e.g. SessionAuthentication) can still resolve the request.
            return None
        try:
            token = Token.objects.get(key=token_key)
        except Token.DoesNotExist:
            raise AuthenticationFailed('Invalid token.')
        return self._validate_expiry_and_2fa(request, token.user, token)

    def _validate_expiry_and_2fa(self, request, user, token):
        """Shared expiry + 2FA validation for header and cookie tokens."""
        ttl_hours = getattr(settings, 'DJANGO_TOKEN_TTL_HOURS', 24)
        if timezone.now() - token.created > timedelta(hours=ttl_hours):
            raise AuthenticationFailed('Token expirado')
        if getattr(settings, 'DJANGO_2FA_ENFORCED', False):
            # Imported lazily so the module loads even before django_otp apps
            # are enabled, and only when the gate is actually on.
            from django_otp.plugins.otp_totp.models import TOTPDevice

            if TOTPDevice.objects.filter(user=user, confirmed=True).exists():
                code = request.headers.get('X-TOTP')
                device = TOTPDevice.objects.filter(user=user, confirmed=True).first()
                if not code or not device.verify_token(code):
                    raise AuthenticationFailed({
                        'detail': 'Código TOTP requerido',
                        'code': 'totp_required',
                    })
        return user, token