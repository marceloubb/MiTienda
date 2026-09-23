"""Request middleware for the MiTienda project."""

from django.conf import settings
from django.http import HttpResponseForbidden


class AdminIPAllowlistMiddleware:
    """Return 403 for admin requests from IPs outside ADMIN_ALLOWED_IPS (H11).

    When ADMIN_ALLOWED_IPS is unset (the dev default), admin access is
    unrestricted. The allowlist applies only to the env-driven admin URL
    (``settings.ADMIN_URL``); the admin path is never hard-coded here.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if self._is_admin_request(request.path) and not self._client_ip_allowed(request):
            return HttpResponseForbidden('Admin access denied: IP not allowlisted.')
        return self.get_response(request)

    def _is_admin_request(self, path):
        admin_url = '/' + getattr(settings, 'ADMIN_URL', 'admin/').lstrip('/')
        return path.startswith(admin_url)

    def _client_ip_allowed(self, request):
        allowed = getattr(settings, 'ADMIN_ALLOWED_IPS', None)
        if not allowed:
            return True
        allowed_ips = {ip.strip() for ip in allowed.split(',') if ip.strip()}
        return request.META.get('REMOTE_ADDR') in allowed_ips