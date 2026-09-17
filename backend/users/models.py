from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    ROLE_CUSTOMER = 'customer'
    ROLE_ADMIN = 'admin'
    ROLE_BODEGA = 'bodega'
    ROLE_DESPACHO = 'despacho'

    ROLE_CHOICES = [
        (ROLE_CUSTOMER, 'Cliente'),
        (ROLE_ADMIN, 'Administrador'),
        (ROLE_BODEGA, 'Bodega'),
        (ROLE_DESPACHO, 'Despacho'),
    ]
    # Staff user creation may not assign the customer role.
    STAFF_ROLE_CHOICES = [
        (ROLE_ADMIN, 'Administrador'),
        (ROLE_BODEGA, 'Bodega'),
        (ROLE_DESPACHO, 'Despacho'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile', verbose_name='Usuario')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_CUSTOMER, verbose_name='Rol')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Teléfono')
    address = models.TextField(blank=True, verbose_name='Dirección')
    city = models.CharField(max_length=100, blank=True, verbose_name='Ciudad')
    postal_code = models.CharField(max_length=20, blank=True, verbose_name='Código postal')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')

    class Meta:
        verbose_name = 'Perfil de usuario'
        verbose_name_plural = 'Perfiles de usuarios'

    def save(self, *args, **kwargs):
        # Single choke point: is_staff mirrors role == 'admin' at save time.
        # The User post_save signal closes the Django-admin is_staff path.
        new_staff = self.role == self.ROLE_ADMIN
        if self.user_id and self.user.is_staff != new_staff:
            self.user.is_staff = new_staff
            self.user.save(update_fields=['is_staff'])
        super().save(*args, **kwargs)

    def __str__(self):
        return f'Perfil de {self.user.username}'
