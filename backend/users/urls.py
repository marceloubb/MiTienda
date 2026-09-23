from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    ProfileView,
    LogoutView,
    RefreshTokenView,
    UserDetailView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', RefreshTokenView.as_view(), name='token-refresh'),
    path('<int:pk>/', UserDetailView.as_view(), name='user-detail'),
]
