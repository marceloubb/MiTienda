from django.conf import settings
from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from orders.urls import staff_router


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
