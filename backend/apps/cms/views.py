from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.views import CanManageContent, user_permissions

from .models import ContactSubmission, Message, Notification, Section, SiteSettings
from .serializers import (
    ContactCreateSerializer,
    ContactSubmissionSerializer,
    MessageSerializer,
    NotificationSerializer,
    PublicSectionSerializer,
    SectionSerializer,
    SiteSettingsSerializer,
)
from .social_defaults import build_default_socials
from .navigation_utils import public_navigation


def get_site_settings():
    settings_obj, _ = SiteSettings.objects.get_or_create(pk=1)
    return settings_obj


class IsStaffUser(CanManageContent):
    pass


def settings_payload(settings_obj):
    data = SiteSettingsSerializer(settings_obj).data
    try:
        saved = settings_obj.socials
    except Exception:
        saved = []
    data['socials'] = build_default_socials(settings_obj.contact, saved or [])
    return data


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def public_site(request):
    settings_obj = get_site_settings()
    mapped_sections = Section.objects.exclude(page_key='').exclude(page_key__isnull=True)
    visibility = {section.page_key: section.is_published for section in mapped_sections}
    published_sections = Section.objects.filter(is_published=True)

    data = settings_payload(settings_obj)
    data['navigation'] = public_navigation(data.get('navigation'))
    data['visibility'] = visibility
    data['section_content'] = {
        s.page_key: s.content for s in Section.objects.exclude(page_key='').exclude(page_key__isnull=True)
    }
    data['sections'] = PublicSectionSerializer(published_sections, many=True).data
    return Response(data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def contact_create(request):
    serializer = ContactCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    submission = serializer.save()
    from django.contrib.auth import get_user_model
    staff_users = get_user_model().objects.filter(is_staff=True, is_active=True)
    for user in staff_users:
        Notification.objects.create(
            user=user,
            title='New contact enquiry',
            message=f'{submission.name} submitted an investment review request.',
            link='/dashboard/app',
        )
    return Response({
        'ok': True,
        'message': 'Thank you. Your enquiry has been received — expect a confidential response within one business day.',
    }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsStaffUser])
def admin_settings(request):
    settings_obj = get_site_settings()
    if request.method == 'GET':
        return Response(settings_payload(settings_obj))
    serializer = SiteSettingsSerializer(settings_obj, data=request.data, partial=(request.method == 'PATCH'))
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(settings_payload(settings_obj))


class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = [IsStaffUser]
    lookup_field = 'slug'

    @action(detail=True, methods=['post'], url_path='toggle-visibility')
    def toggle_visibility(self, request, slug=None):
        section = self.get_object()
        section.is_published = not section.is_published
        section.save(update_fields=['is_published', 'updated_at'])
        return Response(SectionSerializer(section).data)

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        order = request.data.get('order', [])
        for index, slug in enumerate(order):
            Section.objects.filter(slug=slug).update(sort_order=index)
        return Response({'ok': True})


class ContactSubmissionViewSet(viewsets.ModelViewSet):
    queryset = ContactSubmission.objects.all()
    serializer_class = ContactSubmissionSerializer
    permission_classes = [IsStaffUser]
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        submission = self.get_object()
        submission.is_read = True
        submission.save(update_fields=['is_read'])
        return Response(self.get_serializer(submission).data)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        note = self.get_object()
        note.is_read = True
        note.save(update_fields=['is_read'])
        return Response(self.get_serializer(note).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({'ok': True})


class MessageViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        return Message.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        msg = self.get_object()
        msg.is_read = True
        msg.save(update_fields=['is_read'])
        return Response(self.get_serializer(msg).data)
