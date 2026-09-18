"""DRF TokenAuthentication subclass enforcing a configurable expiry (H3).

Replaces ``rest_framework.authentication.TokenAuthentication`` in
``DEFAULT_AUTHENTICATION_CLASSES`` so every token-verified request is checked
against ``DJANGO_TOKEN_TTL_HOURS`` using the token's ``created`` timestamp.
"""

from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed


class ExpiringTokenAuthentication(TokenAuthentication):
    """Reject DRF tokens older than ``DJANGO_TOKEN_TTL_HOURS`` (default 24).

    When ``DJANGO_2FA_ENFORCED`` is on, requests from users with a confirmed
    TOTP device must also carry a valid code in the ``X-TOTP`` header (H10).
    """

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            # No Authorization header: stay silent so other authenticators
            # (e.g. SessionAuthentication) can still resolve the request.
            return None
        user, token = result
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