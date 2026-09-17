from rest_framework.permissions import BasePermission

from .models import UserProfile

STAFF_ROLES = {
    UserProfile.ROLE_ADMIN,
    UserProfile.ROLE_BODEGA,
    UserProfile.ROLE_DESPACHO,
}


def get_user_role(user):
    """Return the profile role for a user, or None when no profile exists."""
    try:
        return user.profile.role
    except AttributeError:
        return None


class IsAdmin(BasePermission):
    """Only users with role='admin' are allowed."""

    message = 'Requiere rol de administrador.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and get_user_role(user) == UserProfile.ROLE_ADMIN
        )


class IsBodega(BasePermission):
    """Only users with role='bodega' are allowed."""

    message = 'Requiere rol de bodega.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and get_user_role(user) == UserProfile.ROLE_BODEGA
        )


class IsDespacho(BasePermission):
    """Only users with role='despacho' are allowed."""

    message = 'Requiere rol de despacho.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and get_user_role(user) == UserProfile.ROLE_DESPACHO
        )


class IsStaffRole(BasePermission):
    """Admin, bodega, and despacho are staff roles."""

    message = 'Requiere un rol de staff (admin, bodega o despacho).'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and get_user_role(user) in STAFF_ROLES
        )