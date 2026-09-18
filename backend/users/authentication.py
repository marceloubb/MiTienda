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
    """Reject DRF tokens older than ``DJANGO_TOKEN_TTL_HOURS`` (default 24)."""

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
        return user, token