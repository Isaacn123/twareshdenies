from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import InvestorActivity, InvestorDocument, InvestorMessage, InvestorProfile

User = get_user_model()


class InvestorDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvestorDocument
        fields = ['id', 'title', 'doc_type', 'description', 'file_url', 'is_visible', 'created_at']
        read_only_fields = ['id', 'created_at']


class InvestorMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = InvestorMessage
        fields = ['id', 'subject', 'body', 'sender_name', 'is_from_admin', 'is_read', 'created_at']
        read_only_fields = ['id', 'sender_name', 'is_from_admin', 'created_at']

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.username


class InvestorActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = InvestorActivity
        fields = ['id', 'action', 'detail', 'ip_address', 'created_at']


class InvestorRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    full_name = serializers.CharField(max_length=120)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=40)
    investor_type = serializers.ChoiceField(choices=InvestorProfile.INVESTOR_TYPES, default='hnwi')

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('This email is already registered.')
        return value

    def create(self, validated_data):
        from apps.accounts.models import Role, UserProfile

        password = validated_data.pop('password')
        username = validated_data.pop('username')
        email = validated_data.pop('email')
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_staff=False,
            is_superuser=False,
        )
        investor_role, _ = Role.objects.get_or_create(
            slug='investor',
            defaults={
                'name': 'Investor',
                'description': 'Investor portal access only.',
                'can_manage_users': False,
                'can_manage_content': False,
                'can_view_submissions': False,
                'can_manage_investors': False,
            },
        )
        UserProfile.objects.create(user=user, role=investor_role)
        return InvestorProfile.objects.create(
            user=user,
            portal_enabled=False,
            admin_notes='Self-registration — pending advisor approval.',
            **validated_data,
        )


class InvestorProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    username_input = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(source='user.email')
    is_active = serializers.BooleanField(source='user.is_active')
    password = serializers.CharField(write_only=True, required=False)
    documents = InvestorDocumentSerializer(many=True, read_only=True)
    recent_activity = InvestorActivitySerializer(source='activities', many=True, read_only=True)

    class Meta:
        model = InvestorProfile
        fields = [
            'id', 'username', 'username_input', 'email', 'password', 'full_name', 'phone', 'investor_type',
            'portal_enabled', 'portfolio', 'admin_notes', 'is_active', 'documents',
            'recent_activity', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        user_data = validated_data.pop('user', {})
        password = validated_data.pop('password', None)
        email = user_data.get('email', '')
        username = validated_data.pop('username_input', None) or self.initial_data.get('username')
        if not username:
            raise serializers.ValidationError({'username': 'Username is required'})
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password or 'ChangeMe123!',
            is_staff=False,
            is_superuser=False,
        )
        from apps.accounts.models import Role, UserProfile
        investor_role, _ = Role.objects.get_or_create(
            slug='investor',
            defaults={
                'name': 'Investor',
                'description': 'Investor portal access only.',
                'can_manage_users': False,
                'can_manage_content': False,
                'can_view_submissions': False,
                'can_manage_investors': False,
            },
        )
        UserProfile.objects.create(user=user, role=investor_role)
        return InvestorProfile.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        password = validated_data.pop('password', None)
        if 'email' in user_data:
            instance.user.email = user_data['email']
        if 'is_active' in user_data:
            instance.user.is_active = user_data['is_active']
        if password:
            instance.user.set_password(password)
        instance.user.save()
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
