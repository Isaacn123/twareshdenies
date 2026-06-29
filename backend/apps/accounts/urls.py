from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView

from .views import LogoutView, RoleViewSet, UserViewSet, me

router = DefaultRouter()
router.register('users', UserViewSet, basename='users')
router.register('roles', RoleViewSet, basename='roles')

urlpatterns = [
    path('login/', TokenObtainPairView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', me, name='auth-me'),
    path('', include(router.urls)),
]
