# Generated for the admin-inventory-roles change: exclusive role field + backfill.

from django.db import migrations, models


def backfill_admin_roles(apps, schema_editor):
    """Existing is_staff users become admin; everyone else stays customer."""
    User = apps.get_model('auth', 'User')
    UserProfile = apps.get_model('users', 'UserProfile')
    UserProfile.objects.filter(user__is_staff=True).update(role='admin')


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='role',
            field=models.CharField(
                choices=[
                    ('customer', 'Cliente'),
                    ('admin', 'Administrador'),
                    ('bodega', 'Bodega'),
                    ('despacho', 'Despacho'),
                ],
                default='customer',
                max_length=20,
                verbose_name='Rol',
            ),
        ),
        migrations.RunPython(backfill_admin_roles, migrations.RunPython.noop),
    ]