from django.utils import timezone

from .models import InvestorKyc, InvestorKycDocument, InvestorProfile

REQUIRED_DOC_TYPES = ['id_front', 'id_back', 'proof_of_address', 'selfie']

REQUIRED_FIELDS = [
    'date_of_birth',
    'nationality',
    'country_of_residence',
    'address_line1',
    'city',
    'id_type',
    'id_number',
    'occupation',
    'source_of_funds',
]


def get_or_create_kyc(profile):
    kyc, _ = InvestorKyc.objects.get_or_create(investor=profile)
    return kyc


def kyc_can_edit(kyc):
    return kyc.status in ('not_started', 'in_progress', 'rejected')


def kyc_missing_fields(kyc):
    missing = []
    for field in REQUIRED_FIELDS:
        if not getattr(kyc, field, None):
            missing.append(field)
    uploaded = set(kyc.documents.values_list('doc_type', flat=True))
    for doc_type in REQUIRED_DOC_TYPES:
        if doc_type not in uploaded:
            missing.append(doc_type)
    return missing


def kyc_document_payload(doc):
    return {
        'id': doc.id,
        'doc_type': doc.doc_type,
        'doc_type_label': doc.get_doc_type_display(),
        'original_name': doc.original_name,
        'uploaded_at': doc.uploaded_at.isoformat(),
        'has_file': bool(doc.file),
    }


def build_kyc_payload(kyc):
    docs = {doc.doc_type: kyc_document_payload(doc) for doc in kyc.documents.all()}
    return {
        'status': kyc.status,
        'status_label': kyc.get_status_display(),
        'can_edit': kyc_can_edit(kyc),
        'date_of_birth': kyc.date_of_birth.isoformat() if kyc.date_of_birth else '',
        'nationality': kyc.nationality,
        'country_of_residence': kyc.country_of_residence,
        'address_line1': kyc.address_line1,
        'address_line2': kyc.address_line2,
        'city': kyc.city,
        'postal_code': kyc.postal_code,
        'id_type': kyc.id_type,
        'id_number': kyc.id_number,
        'occupation': kyc.occupation,
        'source_of_funds': kyc.source_of_funds,
        'submitted_at': kyc.submitted_at.isoformat() if kyc.submitted_at else None,
        'reviewed_at': kyc.reviewed_at.isoformat() if kyc.reviewed_at else None,
        'rejection_reason': kyc.rejection_reason,
        'documents': docs,
        'required_documents': REQUIRED_DOC_TYPES,
        'missing_fields': kyc_missing_fields(kyc),
        'progress_pct': _kyc_progress(kyc),
    }


def _kyc_progress(kyc):
    total = len(REQUIRED_FIELDS) + len(REQUIRED_DOC_TYPES)
    missing = len(kyc_missing_fields(kyc))
    if total == 0:
        return 100
    return max(0, min(100, round((total - missing) / total * 100)))


def apply_kyc_draft(kyc, data):
    if not kyc_can_edit(kyc):
        return kyc
    field_map = [
        'nationality', 'country_of_residence', 'address_line1', 'address_line2',
        'city', 'postal_code', 'id_type', 'id_number', 'occupation', 'source_of_funds',
    ]
    for field in field_map:
        if field in data:
            setattr(kyc, field, data.get(field) or '')
    if 'date_of_birth' in data:
        kyc.date_of_birth = data.get('date_of_birth') or None
    if kyc.status == 'not_started':
        kyc.status = 'in_progress'
    kyc.save()
    return kyc


def submit_kyc(kyc):
    missing = kyc_missing_fields(kyc)
    if missing:
        raise ValueError(f'Missing required KYC information: {", ".join(missing)}')
    kyc.status = 'under_review'
    kyc.submitted_at = timezone.now()
    kyc.rejection_reason = ''
    kyc.save(update_fields=['status', 'submitted_at', 'rejection_reason', 'updated_at'])
    return kyc


def review_kyc(kyc, *, status, reviewer, rejection_reason='', admin_notes=''):
    if status not in ('approved', 'rejected', 'under_review'):
        raise ValueError('Invalid review status')
    kyc.status = status
    kyc.reviewed_at = timezone.now()
    kyc.reviewed_by = reviewer
    if status == 'rejected':
        kyc.rejection_reason = rejection_reason
    elif status == 'approved':
        kyc.rejection_reason = ''
    if admin_notes:
        kyc.admin_notes = admin_notes
    kyc.save()
    return kyc
