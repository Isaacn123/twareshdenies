from django.contrib.auth import get_user_model
from rest_framework import permissions, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Role, UserProfile
from .serializers import RoleSerializer, UserSerializer

User = get_user_model()


def user_permissions(user):
    if not user or not user.is_authenticated:
        return {}
    if user.is_superuser:
        return {
            'can_manage_users': True,
            'can_manage_content': True,
            'can_view_submissions': True,
            'can_manage_investors': True,
            'role': 'Super Admin',
        }
    profile = getattr(user, 'profile', None)
    if not profile:
        return {
            'can_manage_users': False,
            'can_manage_content': user.is_staff,
            'can_view_submissions': user.is_staff,
            'role': 'Staff',
        }
    role = profile.role
    return {
        'can_manage_users': role.can_manage_users,
        'can_manage_content': role.can_manage_content,
        'can_view_submissions': role.can_view_submissions,
        'can_manage_investors': getattr(role, 'can_manage_investors', False),
        'role': role.name,
    }


class CanManageUsers(permissions.BasePermission):
    def has_permission(self, request, view):
        perms = user_permissions(request.user)
        return perms.get('can_manage_users', False)


class CanManageContent(permissions.BasePermission):
    def has_permission(self, request, view):
        perms = user_permissions(request.user)
        return perms.get('can_manage_content', False) or request.user.is_superuser


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        return Response({'ok': True, 'message': 'Logged out successfully.'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    user = request.user
    perms = user_permissions(user)
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'full_name': user.get_full_name() or user.username,
        'is_staff': user.is_staff,
        'permissions': perms,
    })


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [CanManageUsers]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('profile__role').all()
    serializer_class = UserSerializer
    permission_classes = [CanManageUsers]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])
