from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile


def _validate_password_with_user(attrs):
    """Enforce AUTH_PASSWORD_VALIDATORS against a tentative User instance.

    Cross-field validation via validate(): the attribute similarity validator
    needs username/email, which are only known once all fields are collected.
    """
    password = attrs.get('password')
    if not password:
        return attrs
    user = User(
        username=attrs.get('username', ''),
        email=attrs.get('email', ''),
        first_name=attrs.get('first_name', ''),
        last_name=attrs.get('last_name', ''),
    )
    try:
        validate_password(password, user=user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({'password': list(exc.messages)})
    return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['phone', 'address', 'city', 'postal_code']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    role = serializers.CharField(source='profile.role', read_only=True)
    is_staff = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'role', 'profile']


class UserRoleUpdateSerializer(serializers.Serializer):
    """Admin-only role change for GET/PATCH /api/users/{id}/."""

    role = serializers.ChoiceField(choices=UserProfile.ROLE_CHOICES)

    def update(self, user, validated_data):
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = validated_data['role']
        profile.save()
        return user


class StaffUserSerializer(serializers.Serializer):
    """Admin-only staff-user creation; role is restricted to staff roles."""

    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=UserProfile.STAFF_ROLE_CHOICES)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("El nombre de usuario ya existe.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("El email ya está registrado.")
        return value

    def validate(self, attrs):
        return _validate_password_with_user(attrs)

    def create(self, validated_data):
        role = validated_data.pop('role')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            is_staff=(role == UserProfile.ROLE_ADMIN),
        )
        UserProfile.objects.create(user=user, role=role)
        return user


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("El nombre de usuario ya existe.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("El email ya está registrado.")
        return value

    def validate(self, attrs):
        return _validate_password_with_user(attrs)

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        UserProfile.objects.create(user=user)
        return user


class UpdateProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    postal_code = serializers.CharField(required=False, allow_blank=True)

    def save(self, user):
        data = self.validated_data
        # Update User fields
        for field in ('first_name', 'last_name', 'email'):
            if field in data:
                setattr(user, field, data[field])
        user.save()
        # Update Profile fields
        profile, _ = UserProfile.objects.get_or_create(user=user)
        for field in ('phone', 'address', 'city', 'postal_code'):
            if field in data:
                setattr(profile, field, data[field])
        profile.save()
        return user

    def validate_email(self, value):
        # H6: empty emails stay repeatable; non-empty ones must be unique,
        # excluding the requesting user's own email via the request context.
        if not value:
            return value
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request is not None else None
        taken = User.objects.filter(email=value)
        if user is not None and user.is_authenticated:
            taken = taken.exclude(pk=user.pk)
        if taken.exists():
            raise serializers.ValidationError("El email ya está registrado.")
        return value
