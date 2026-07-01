import os

from django.http import FileResponse, Http404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, parser_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.accounts.views import user_permissions

from .kyc_service import (
    apply_kyc_draft,
    build_kyc_payload,
    get_or_create_kyc,
    kyc_can_edit,
    review_kyc,
    submit_kyc,
)
from .models import (
    InvestorActivity,
    InvestorDocument,
    InvestorKycDocument,
    InvestorMessage,
    InvestorProfile,
)
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


def _require_portal(profile):
    if not profile or not profile.portal_enabled:
        return Response({'error': 'Investor portal access disabled.'}, status=status.HTTP_403_FORBIDDEN)
    return None


def _notify_staff_kyc_submitted(investor):
    from apps.cms.models import Notification
    from django.contrib.auth import get_user_model

    staff_users = get_user_model().objects.filter(is_staff=True, is_active=True)
    for user in staff_users:
        Notification.objects.create(
            user=user,
            title='KYC submitted for review',
            message=f'{investor.full_name} submitted KYC verification documents.',
            link='/dashboard/app',
        )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def investor_register(request):
    serializer = InvestorRegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    investor = serializer.save()
    get_or_create_kyc(investor)
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
    denied = _require_portal(profile)
    if denied:
        return denied
    profile = InvestorProfile.objects.select_related('currency_setting', 'kyc').prefetch_related(
        'holdings', 'snapshots', 'market_items', 'alerts', 'otc_trades', 'smart_ideas', 'kyc__documents'
    ).get(pk=profile.pk)
    from .portfolio_service import build_portfolio_payload
    kyc = get_or_create_kyc(profile)
    log_activity(profile, 'portal_view', 'Dashboard overview', request)
    return Response({
        'full_name': profile.full_name,
        'email': request.user.email,
        'investor_type': profile.investor_type,
        'portfolio': build_portfolio_payload(profile),
        'kyc': build_kyc_payload(kyc),
    })


@api_view(['GET', 'PATCH'])
@permission_classes([IsInvestorUser])
def investor_kyc(request):
    profile = get_investor_profile(request.user)
    denied = _require_portal(profile)
    if denied:
        return denied
    kyc = get_or_create_kyc(profile)

    if request.method == 'GET':
        return Response(build_kyc_payload(kyc))

    if not kyc_can_edit(kyc):
        return Response({'error': 'KYC cannot be edited in its current status.'}, status=status.HTTP_403_FORBIDDEN)

    apply_kyc_draft(kyc, request.data)
    log_activity(profile, 'kyc_updated', 'KYC draft saved', request)
    return Response(build_kyc_payload(kyc))


@api_view(['POST'])
@permission_classes([IsInvestorUser])
def investor_kyc_submit(request):
    profile = get_investor_profile(request.user)
    denied = _require_portal(profile)
    if denied:
        return denied
    kyc = get_or_create_kyc(profile)

    if not kyc_can_edit(kyc):
        return Response({'error': 'KYC cannot be submitted in its current status.'}, status=status.HTTP_403_FORBIDDEN)

    apply_kyc_draft(kyc, request.data)
    try:
        submit_kyc(kyc)
    except ValueError as exc:
        return Response({'error': str(exc), 'kyc': build_kyc_payload(kyc)}, status=status.HTTP_400_BAD_REQUEST)

    log_activity(profile, 'kyc_submitted', 'KYC submitted for review', request)
    _notify_staff_kyc_submitted(profile)
    return Response({
        'ok': True,
        'message': 'Your KYC has been submitted. Our compliance team will review it shortly.',
        'kyc': build_kyc_payload(kyc),
    })


@api_view(['POST'])
@permission_classes([IsInvestorUser])
@parser_classes([MultiPartParser, FormParser])
def investor_kyc_upload(request):
    profile = get_investor_profile(request.user)
    denied = _require_portal(profile)
    if denied:
        return denied
    kyc = get_or_create_kyc(profile)

    if not kyc_can_edit(kyc):
        return Response({'error': 'Documents cannot be uploaded in the current KYC status.'}, status=status.HTTP_403_FORBIDDEN)

    doc_type = request.data.get('doc_type')
    upload = request.FILES.get('file')
    valid_types = {choice[0] for choice in InvestorKycDocument.DOC_TYPE_CHOICES}
    if doc_type not in valid_types:
        return Response({'error': 'Invalid document type.'}, status=status.HTTP_400_BAD_REQUEST)
    if not upload:
        return Response({'error': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)
    if upload.size > 10 * 1024 * 1024:
        return Response({'error': 'File must be 10 MB or smaller.'}, status=status.HTTP_400_BAD_REQUEST)

    allowed_ext = {'.jpg', '.jpeg', '.png', '.pdf', '.webp'}
    ext = os.path.splitext(upload.name)[1].lower()
    if ext not in allowed_ext:
        return Response({'error': 'Allowed formats: JPG, PNG, PDF, WEBP.'}, status=status.HTTP_400_BAD_REQUEST)

    doc, _created = InvestorKycDocument.objects.update_or_create(
        kyc=kyc,
        doc_type=doc_type,
        defaults={'file': upload, 'original_name': upload.name},
    )
    if kyc.status == 'not_started':
        kyc.status = 'in_progress'
        kyc.save(update_fields=['status', 'updated_at'])

    log_activity(profile, 'kyc_document_uploaded', doc.get_doc_type_display(), request)
    return Response(build_kyc_payload(kyc))


@api_view(['GET'])
@permission_classes([IsInvestorUser])
def investor_kyc_document(request, doc_id):
    profile = get_investor_profile(request.user)
    denied = _require_portal(profile)
    if denied:
        return denied
    kyc = get_or_create_kyc(profile)
    doc = InvestorKycDocument.objects.filter(kyc=kyc, pk=doc_id).first()
    if not doc or not doc.file:
        raise Http404('Document not found')
    return FileResponse(doc.file.open('rb'), as_attachment=False, filename=doc.original_name or doc.file.name)


@api_view(['GET'])
@permission_classes([IsInvestorUser])
def investor_documents(request):
    profile = get_investor_profile(request.user)
    denied = _require_portal(profile)
    if denied:
        return denied
    docs = profile.documents.filter(is_visible=True)
    log_activity(profile, 'view_documents', f'{docs.count()} documents', request)
    return Response(InvestorDocumentSerializer(docs, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsInvestorUser])
def investor_messages(request):
    profile = get_investor_profile(request.user)
    denied = _require_portal(profile)
    if denied:
        return denied
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
    queryset = InvestorProfile.objects.select_related('user', 'currency_setting', 'kyc').prefetch_related(
        'documents', 'activities', 'holdings', 'snapshots', 'market_items', 'alerts', 'otc_trades',
        'smart_ideas', 'kyc__documents',
    ).all()
    serializer_class = InvestorProfileSerializer
    permission_classes = [CanManageInvestors]

    def perform_create(self, serializer):
        investor = serializer.save(managed_by=self.request.user)
        get_or_create_kyc(investor)
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

    @action(detail=True, methods=['post'])
    def review_kyc(self, request, pk=None):
        investor = self.get_object()
        kyc = get_or_create_kyc(investor)
        new_status = request.data.get('status')
        try:
            review_kyc(
                kyc,
                status=new_status,
                reviewer=request.user,
                rejection_reason=request.data.get('rejection_reason', ''),
                admin_notes=request.data.get('admin_notes', kyc.admin_notes),
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        log_activity(investor, 'kyc_reviewed', f'Status set to {new_status}', request)
        return Response(InvestorProfileSerializer(investor).data)

    @action(detail=True, methods=['get'], url_path='kyc/documents/(?P<doc_id>[^/.]+)')
    def kyc_document(self, request, pk=None, doc_id=None):
        investor = self.get_object()
        kyc = get_or_create_kyc(investor)
        doc = InvestorKycDocument.objects.filter(kyc=kyc, pk=doc_id).first()
        if not doc or not doc.file:
            raise Http404('Document not found')
        return FileResponse(doc.file.open('rb'), as_attachment=False, filename=doc.original_name or doc.file.name)


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
