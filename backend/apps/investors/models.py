from django.db import models


class InvestorProfile(models.Model):
    INVESTOR_TYPES = [
        ('hnwi', 'High-Net-Worth Individual'),
        ('entrepreneur', 'Entrepreneur'),
        ('executive', 'Corporate Executive'),
        ('family_office', 'Family Office'),
        ('institutional', 'Institutional Investor'),
        ('other', 'Other'),
    ]

    user = models.OneToOneField('auth.User', on_delete=models.CASCADE, related_name='investor_profile')
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=40, blank=True)
    investor_type = models.CharField(max_length=40, choices=INVESTOR_TYPES, default='hnwi')
    portal_enabled = models.BooleanField(default=True)
    portfolio = models.JSONField(default=dict, blank=True)
    admin_notes = models.TextField(blank=True)
    managed_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_investors'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['full_name']

    def __str__(self):
        return self.full_name


class InvestorDocument(models.Model):
    DOC_TYPES = [
        ('report', 'Performance Report'),
        ('statement', 'Account Statement'),
        ('memo', 'Strategy Memo'),
        ('other', 'Other'),
    ]

    investor = models.ForeignKey(InvestorProfile, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=200)
    doc_type = models.CharField(max_length=30, choices=DOC_TYPES, default='report')
    description = models.TextField(blank=True)
    file_url = models.CharField(max_length=500, blank=True)
    is_visible = models.BooleanField(default=True)
    uploaded_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class InvestorMessage(models.Model):
    investor = models.ForeignKey(InvestorProfile, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey('auth.User', on_delete=models.CASCADE)
    subject = models.CharField(max_length=200)
    body = models.TextField()
    is_from_admin = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class InvestorActivity(models.Model):
    investor = models.ForeignKey(InvestorProfile, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=80)
    detail = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Investor activities'
