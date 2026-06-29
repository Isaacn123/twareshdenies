from rest_framework import serializers
from .models import ContactSubmission, Message, Notification, Section, SiteSettings


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = ['site_name', 'seo', 'brand', 'contact', 'hero', 'stats', 'insights', 'portrait', 'navigation', 'socials', 'updated_at']


class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = [
            'id', 'slug', 'page_key', 'title', 'section_type', 'content', 'html_content',
            'sort_order', 'is_published', 'created_at', 'updated_at',
        ]


class PublicSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = ['slug', 'page_key', 'title', 'section_type', 'content', 'html_content', 'sort_order']


class ContactSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactSubmission
        fields = ['id', 'name', 'email', 'phone', 'investor_profile', 'interest', 'message', 'is_read', 'created_at']
        read_only_fields = ['id', 'is_read', 'created_at']


class ContactCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactSubmission
        fields = ['name', 'email', 'phone', 'investor_profile', 'interest', 'message']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'link', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_name', 'recipient', 'subject', 'body', 'is_read', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at']

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.username
