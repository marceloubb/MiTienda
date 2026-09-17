from django.urls import path

from .views import StaffUserCreateView

urlpatterns = [
    path('users/', StaffUserCreateView.as_view(), name='staff-user-create'),
]