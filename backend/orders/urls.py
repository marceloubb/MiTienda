from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CartViewSet, OrderViewSet, StaffOrderViewSet

router = DefaultRouter()
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'orders', OrderViewSet, basename='orders')

staff_router = DefaultRouter()
staff_router.register(r'orders', StaffOrderViewSet, basename='staff-orders')

urlpatterns = [
    path('', include(router.urls)),
]
