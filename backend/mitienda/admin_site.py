"""The admin site class used by the project.

``django_otp.admin.OTPAdminSite`` only asks whether *a* device verified the
user. ``Device.from_persistent_id`` does not filter by ``confirmed`` and
``TOTPDevice.verify_token`` verifies the token arithmetic regardless of that
flag, so an unconfirmed device logs into the admin successfully.

The API gate in ``users.authentication`` only trusts confirmed devices, and the
admin is the more privileged surface, so it must not be the weaker one.
"""

from django_otp.admin import OTPAdminSite


class ConfirmedDeviceAdminSite(OTPAdminSite):
    """``OTPAdminSite`` that also requires the verifying device to be confirmed."""

    def has_permission(self, request):
        if not super().has_permission(request):
            return False
        device = getattr(request.user, 'otp_device', None)
        return device is not None and device.confirmed
