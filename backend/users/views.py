from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
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
    StaffUserListSerializer,
)
from .models import UserProfile
from .permissions import IsAdmin, STAFF_ROLES


def _set_token_cookie(response, token):
    """Store the auth token in the httpOnly SameSite=Lax session cookie.

    The SPA is served from http://localhost:3000 and calls the API at
    http://localhost:8000: that is cross-origin but SAME-SITE, because the
    port does not change the site. SameSite=Lax cookies are therefore sent on
    those fetches, and Lax blocks cross-site POSTs, which is the CSRF defense
    for this design. The token stays out of localStorage, so an XSS can never
    read it; the cookie is only usable by the browser on same-site requests.
    """
    response.set_cookie(
        settings.TOKEN_COOKIE_NAME,
        token.key,
        max_age=settings.TOKEN_COOKIE_AGE,
        httponly=True,
        samesite=settings.TOKEN_COOKIE_SAMESITE,
        secure=settings.TOKEN_COOKIE_SECURE,
        path='/',
    )
    return response


def _delete_token_cookie(response):
    """Clear the session cookie on the response (logout).

    delete_cookie() only needs name/path (the browser matches cookies by
    name+domain+path); it does not accept `secure` — the Secure/HttpOnly
    flags are set at creation time and are not part of the cookie identity.
    """
    response.delete_cookie(
        settings.TOKEN_COOKIE_NAME,
        path='/',
        samesite=settings.TOKEN_COOKIE_SAMESITE,
    )
    return response


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'register'

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # H3: a brand-new account gets a brand-new token (never get_or_create).
        token = Token.objects.create(user=user)
        response = Response({
            'user': UserSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_201_CREATED)
        return _set_token_cookie(response, token)


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
            response = Response({
                'user': UserSerializer(user).data,
                'token': token.key
            })
            return _set_token_cookie(response, token)
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
        response = Response(
            {'message': 'Sesión cerrada'}, status=status.HTTP_200_OK
        )
        # Clear the httpOnly session cookie so the browser forgets the token.
        return _delete_token_cookie(response)


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
        response = Response({'token': token.key})
        return _set_token_cookie(response, token)


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


class StaffUserView(APIView):
    """Admin-only staff-user list and creation at /api/staff/users/."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        users = User.objects.filter(profile__role__in=STAFF_ROLES).order_by('id')
        serializer = StaffUserListSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = StaffUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
