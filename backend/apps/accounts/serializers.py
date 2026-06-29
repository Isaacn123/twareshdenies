from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Role, UserProfile

User = get_user_model()


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = [
            'id', 'slug', 'name', 'description',
            'can_manage_users', 'can_manage_content', 'can_view_submissions', 'can_manage_investors',
        ]


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    role_id = serializers.IntegerField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'is_active', 'is_staff', 'role', 'role_id', 'password', 'date_joined',
        ]
        read_only_fields = ['id', 'date_joined']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_role(self, obj):
        profile = getattr(obj, 'profile', None)
        if not profile:
            return None
        return RoleSerializer(profile.role).data

    def create(self, validated_data):
        role_id = validated_data.pop('role_id', None)
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        if role_id:
            UserProfile.objects.create(user=user, role_id=role_id)
        return user

    def update(self, instance, validated_data):
        role_id = validated_data.pop('role_id', None)
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        if role_id is not None:
            UserProfile.objects.update_or_create(user=instance, defaults={'role_id': role_id})
        return instance
