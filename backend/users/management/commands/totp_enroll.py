"""Bootstrap TOTP enrollment from the terminal.

The admin site requires a verified OTP device, and the API enrollment endpoint
requires an existing admin profile. A user created with ``createsuperuser`` has
neither, so this command is the only way in on a fresh database.
"""

import base64

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django_otp.plugins.otp_totp.models import TOTPDevice

from users.models import UserProfile


class Command(BaseCommand):
    help = (
        'Enroll a user in TOTP for admin access. Prints the provisioning URI '
        'and, with --code, confirms the device.'
    )

    def add_arguments(self, parser):
        parser.add_argument('username', help='Username to enroll.')
        parser.add_argument(
            '--code',
            default=None,
            help='Six digit code from the authenticator app. Confirms the device.',
        )
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Discard any existing device and enroll a new one.',
        )

    def handle(self, *args, **options):
        User = get_user_model()
        username = options['username']

        try:
            user = User.objects.get(**{User.USERNAME_FIELD: username})
        except User.DoesNotExist:
            raise CommandError(f'No user named {username!r}.')

        # The API 2FA endpoints require an admin profile, so bootstrap it here
        # for the very first account. Saving the profile also mirrors is_staff.
        profile, _ = UserProfile.objects.get_or_create(user=user)
        if profile.role != UserProfile.ROLE_ADMIN:
            profile.role = UserProfile.ROLE_ADMIN
            profile.save()

        confirmed = TOTPDevice.objects.filter(user=user, confirmed=True).first()
        if confirmed is not None and not options['reset']:
            raise CommandError(
                f'{username} already has a confirmed device. '
                'Re-run with --reset to enroll a new one.'
            )

        if options['reset']:
            TOTPDevice.objects.filter(user=user).delete()
            device = None
        else:
            # Reuse the pending device from a previous run: the operator has
            # already scanned its secret, so creating a new one would make the
            # code they read from the app invalid.
            device = (
                TOTPDevice.objects.filter(user=user, confirmed=False)
                .order_by('-id')
                .first()
            )

        if device is None:
            device = TOTPDevice.objects.create(
                user=user, name='admin', confirmed=False
            )

        if options['code']:
            if not device.verify_token(options['code'].strip()):
                raise CommandError(
                    'Invalid code. The device is still unconfirmed.'
                )
            device.confirmed = True
            device.save()
            self.stdout.write(
                self.style.SUCCESS(f'Confirmed TOTP for {username}.')
            )
            return

        # device.key is hex; an authenticator app needs the base32 form.
        secret = base64.b32encode(device.bin_key).decode('ascii')
        self.stdout.write(f'Provisioning URI: {device.config_url}')
        self.stdout.write(f'Secret (base32): {secret}')
        self.stdout.write(
            'Add it to your authenticator, then confirm with:\n'
            f'  python manage.py totp_enroll {username} --code <6 digits>'
        )
