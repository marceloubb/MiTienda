"""IP-scoped rate limiting for the API.

DRF's ScopedRateThrottle keys authenticated requests by request.user.pk.
With cookie authentication, a successful register/login sets the auth cookie,
so the next request authenticates as the just-created user and the throttle
key changes per request — the anti-abuse limit never accumulates (a script
that keeps the per-account cookies can bypass register: 5/hour entirely).

These scoped views rate-limit the endpoint by client IP, exactly like the
pre-cookie behavior, so the limit is shared across every identity.
"""

from rest_framework.throttling import ScopedRateThrottle


class IpScopedRateThrottle(ScopedRateThrottle):
    """ScopedRateThrottle that always keys on the client IP, never on user pk."""

    def get_cache_key(self, request, view):
        if not getattr(view, self.scope_attr, None):
            return None
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }