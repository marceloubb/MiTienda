from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django_otp.plugins.otp_totp.models import TOTPDevice
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    UserProfileSerializer,
    UpdateProfileSerializer,
    UserRoleUpdateSerializer,
    StaffUserSerializer,
)
from .models import UserProfile
from .permissions import IsAdmin


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'register'

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # H3: a brand-new account gets a brand-new token (never get_or_create).
        token = Token.objects.create(user=user)
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'login'

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(username=username, password=password)

        if user:
            # H3: single-session rotation - replace every previous token so
            # replayed tokens die immediately on login.
            Token.objects.filter(user=user).delete()
            token = Token.objects.create(user=user)
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key
            })
        return Response(
            {'error': 'Credenciales inválidas'},
            status=status.HTTP_401_UNAUTHORIZED
        )


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UpdateProfileSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(UserSerializer(request.user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # H3: scoped logout - only the presented token is deleted.
        if request.auth is not None:
            request.auth.delete()
        return Response({'message': 'Sesión cerrada'}, status=status.HTTP_200_OK)


class RefreshTokenView(APIView):
    """POST /api/users/token/refresh/ rotates the presented token (H3)."""

    permission_classes = [IsAuthenticated]
    throttle_scope = 'token_refresh'

    def post(self, request):
        if request.auth is None:
            return Response(
                {'error': 'Token requerido'}, status=status.HTTP_400_BAD_REQUEST
            )
        request.auth.delete()
        token = Token.objects.create(user=request.user)
        return Response({'token': token.key})


class TwoFAEnrollView(APIView):
    """POST /api/users/2fa/enroll/ (admin-only) starts TOTP enrollment (H10).

    Rejects when a confirmed device already exists; stale unconfirmed
    attempts are deleted so each enrollment starts fresh.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        user = request.user
        if TOTPDevice.objects.filter(user=user, confirmed=True).exists():
            return Response(
                {'error': 'Ya existe un dispositivo 2FA confirmado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        TOTPDevice.objects.filter(user=user, confirmed=False).delete()
        device = TOTPDevice.objects.create(
            user=user, name='default', confirmed=False
        )
        return Response({
            'device_id': device.pk,
            'secret': device.key,
            'provisioning_uri': device.config_url,
        }, status=status.HTTP_201_CREATED)


class TwoFAConfirmView(APIView):
    """POST /api/users/2fa/confirm/ activates a device after a valid code."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        device = get_object_or_404(
            TOTPDevice, pk=request.data.get('device_id'), user=request.user
        )
        if device.confirmed:
            return Response(
                {'error': 'El dispositivo ya está confirmado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        code = request.data.get('code')
        if not code or not device.verify_token(code):
            return Response(
                {'error': 'Código TOTP inválido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        device.confirmed = True
        device.save(update_fields=['confirmed'])
        return Response({'confirmed': True})


class UserDetailView(APIView):
    """Admin-only user detail and role update at /api/users/{id}/."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        return Response(UserSerializer(user).data)

    def patch(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        serializer = UserRoleUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.update(user, serializer.validated_data)
        user.refresh_from_db()
        return Response(UserSerializer(user).data)


class StaffUserCreateView(APIView):
    """Admin-only staff-user creation at /api/staff/users/."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = StaffUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
