from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import UserProfile

# Recursion guard: defensive only. Role drift is written with a queryset
# update, which never fires save signals, so the handler cannot re-enter.
_updating_role = False


@receiver(post_save, sender=User)
def sync_role_from_staff_status(sender, instance, **kwargs):
    """Keep UserProfile.role consistent with the User.is_staff flag.

    Closes the Django-admin is_staff checkbox path: toggling the flag must
    not leave the profile role desynced. Non-admin roles (bodega/despacho)
    are intentionally never rewritten when is_staff is False.
    """
    global _updating_role
    if _updating_role:
        return

    profile = UserProfile.objects.filter(user=instance).first()
    if profile is None:
        return

    if instance.is_staff and profile.role != UserProfile.ROLE_ADMIN:
        new_role = UserProfile.ROLE_ADMIN
    elif not instance.is_staff and profile.role == UserProfile.ROLE_ADMIN:
        new_role = UserProfile.ROLE_CUSTOMER
    else:
        return

    _updating_role = True
    try:
        UserProfile.objects.filter(pk=profile.pk).update(role=new_role)
    finally:
        _updating_role = False