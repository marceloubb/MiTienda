from django.conf import settings
from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from orders.urls import staff_router
from mitienda.admin_site import ConfirmedDeviceAdminSite


# The DRF 2FA gate only covers API requests (users.authentication). The Django
# admin is the more privileged surface, so it needs the same requirement: swap
# the site class so admin access also demands a verified OTP device.
# django-otp documents exactly this assignment. The instance keeps the name
# 'admin' assigned by AdminSite.__init__, so URL namespaces and templates are
# unchanged. Users without a confirmed device are denied; enroll one with
# `python manage.py totp_enroll <username>`.
admin.site.__class__ = ConfirmedDeviceAdminSite


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    return Response({
        'message': 'API de MiTienda',
        'endpoints': {
            'products': '/api/products/',
            'categories': '/api/categories/',
            'cart': '/api/cart/',
            'orders': '/api/orders/',
            'users': {
                'register': '/api/users/register/',
                'login': '/api/users/login/',
                'profile': '/api/users/profile/',
                'logout': '/api/users/logout/',
            }
        }
    })


urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path('api/', api_root, name='api-root'),
    path('api/', include('products.urls')),
    path('api/', include('orders.urls')),
    path('api/users/', include('users.urls')),
    path('api/staff/', include('users.staff_urls')),
    path('api/staff/', include(staff_router.urls)),
]
