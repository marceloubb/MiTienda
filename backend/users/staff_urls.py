from django.urls import path

from .views import StaffUserView

urlpatterns = [
    path('users/', StaffUserView.as_view(), name='staff-user'),
]