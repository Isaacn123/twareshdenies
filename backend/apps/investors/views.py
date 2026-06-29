from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.views import CanManageContent, user_permissions

from .models import InvestorActivity, InvestorDocument, InvestorMessage, InvestorProfile
from .serializers import (
    InvestorActivitySerializer,
    InvestorDocumentSerializer,
    InvestorMessageSerializer,
    InvestorProfileSerializer,
    InvestorRegisterSerializer,
)


class CanManageInvestors(permissions.BasePermission):
    def has_permission(self, request, view):
        perms = user_permissions(request.user)
        return perms.get('can_manage_investors', False) or request.user.is_superuser


class IsInvestorUser(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        profile = getattr(request.user, 'profile', None)
        return profile and profile.role.slug == 'investor'


def log_activity(investor, action, detail='', request=None):
    InvestorActivity.objects.create(
        investor=investor,
        action=action,
        detail=detail,
        ip_address=request.META.get('REMOTE_ADDR') if request else None,
    )


def get_investor_profile(user):
    return getattr(user, 'investor_profile', None)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def investor_register(request):
    serializer = InvestorRegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    investor = serializer.save()
    log_activity(investor, 'self_registered', 'Pending advisor approval', request)

    from apps.cms.models import Notification
    from django.contrib.auth import get_user_model
    staff_users = get_user_model().objects.filter(is_staff=True, is_active=True)
    for user in staff_users:
        Notification.objects.create(
            user=user,
            title='New investor registration',
            message=f'{investor.full_name} ({investor.user.email}) registered and awaits portal approval.',
            link='/dashboard/app',
        )

    return Response({
        'ok': True,
        'message': (
            'Registration received. Your advisor will review your application and activate '
            'your portal access. You will be able to sign in once approved.'
        ),
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsInvestorUser])
def investor_me(request):
    profile = get_investor_profile(request.user)
    if not profile or not profile.portal_enabled:
        return Response({'error': 'Investor portal access disabled.'}, status=status.HTTP_403_FORBIDDEN)
    log_activity(profile, 'portal_view', 'Dashboard overview', request)
    return Response({
        'full_name': profile.full_name,
        'email': request.user.email,
        'investor_type': profile.investor_type,
        'portfolio': profile.portfolio,
    })


@api_view(['GET'])
@permission_classes([IsInvestorUser])
def investor_documents(request):
    profile = get_investor_profile(request.user)
    if not profile or not profile.portal_enabled:
        return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    docs = profile.documents.filter(is_visible=True)
    log_activity(profile, 'view_documents', f'{docs.count()} documents', request)
    return Response(InvestorDocumentSerializer(docs, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsInvestorUser])
def investor_messages(request):
    profile = get_investor_profile(request.user)
    if not profile or not profile.portal_enabled:
        return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    if request.method == 'GET':
        msgs = profile.messages.all()[:50]
        return Response(InvestorMessageSerializer(msgs, many=True).data)
    msg = InvestorMessage.objects.create(
        investor=profile,
        sender=request.user,
        subject=request.data.get('subject', 'Investor enquiry'),
        body=request.data.get('body', ''),
        is_from_admin=False,
    )
    log_activity(profile, 'sent_message', msg.subject, request)
    return Response(InvestorMessageSerializer(msg).data, status=status.HTTP_201_CREATED)


class AdminInvestorViewSet(viewsets.ModelViewSet):
    queryset = InvestorProfile.objects.select_related('user').prefetch_related('documents', 'activities').all()
    serializer_class = InvestorProfileSerializer
    permission_classes = [CanManageInvestors]

    def perform_create(self, serializer):
        investor = serializer.save(managed_by=self.request.user)
        log_activity(investor, 'account_created', f'Created by {self.request.user.username}', self.request)

    @action(detail=True, methods=['get'])
    def activity(self, request, pk=None):
        investor = self.get_object()
        activities = investor.activities.all()[:100]
        return Response(InvestorActivitySerializer(activities, many=True).data)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        investor = self.get_object()
        msg = InvestorMessage.objects.create(
            investor=investor,
            sender=request.user,
            subject=request.data.get('subject', 'Message from your advisor'),
            body=request.data.get('body', ''),
            is_from_admin=True,
        )
        log_activity(investor, 'admin_message', msg.subject, request)
        return Response(InvestorMessageSerializer(msg).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def toggle_portal(self, request, pk=None):
        investor = self.get_object()
        investor.portal_enabled = not investor.portal_enabled
        investor.save(update_fields=['portal_enabled', 'updated_at'])
        log_activity(investor, 'portal_toggled', f'Enabled={investor.portal_enabled}', request)
        return Response(InvestorProfileSerializer(investor).data)


class AdminInvestorDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = InvestorDocumentSerializer
    permission_classes = [CanManageInvestors]

    def get_queryset(self):
        return InvestorDocument.objects.filter(investor_id=self.kwargs['investor_pk'])

    def perform_create(self, serializer):
        investor = InvestorProfile.objects.get(pk=self.kwargs['investor_pk'])
        doc = serializer.save(investor=investor, uploaded_by=self.request.user)
        log_activity(investor, 'document_added', doc.title, self.request)


@api_view(['GET', 'POST'])
@permission_classes([CanManageInvestors])
def admin_investor_documents(request, investor_pk):
    investor = InvestorProfile.objects.get(pk=investor_pk)
    if request.method == 'GET':
        return Response(InvestorDocumentSerializer(investor.documents.all(), many=True).data)
    serializer = InvestorDocumentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    doc = serializer.save(investor=investor, uploaded_by=request.user)
    log_activity(investor, 'document_added', doc.title, request)
    return Response(InvestorDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([CanManageInvestors])
def admin_investor_document_detail(request, investor_pk, pk):
    doc = InvestorDocument.objects.get(pk=pk, investor_id=investor_pk)
    if request.method == 'GET':
        return Response(InvestorDocumentSerializer(doc).data)
    if request.method == 'DELETE':
        log_activity(doc.investor, 'document_removed', doc.title, request)
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = InvestorDocumentSerializer(doc, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
