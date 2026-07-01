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
    total_invested = models.DecimalField(max_digits=14, decimal_places=2, default=0)
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


class InvestorHolding(models.Model):
    CATEGORY_CHOICES = [
        ('crypto', 'Crypto'),
        ('stocks', 'Stocks'),
        ('bonds', 'Bonds'),
        ('commodities', 'Commodities'),
        ('real_estate', 'Real Estate'),
        ('cash', 'Cash'),
    ]

    investor = models.ForeignKey(InvestorProfile, on_delete=models.CASCADE, related_name='holdings')
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='crypto')
    name = models.CharField(max_length=120)
    symbol = models.CharField(max_length=20, blank=True)
    holdings_text = models.CharField(max_length=80, blank=True)
    quantity = models.DecimalField(max_digits=18, decimal_places=8, null=True, blank=True)
    value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    price = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    change_24h = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    is_flex = models.BooleanField(default=False, help_text='Counts toward available flex funds')
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'id']


class PortfolioSnapshot(models.Model):
    investor = models.ForeignKey(InvestorProfile, on_delete=models.CASCADE, related_name='snapshots')
    as_of_date = models.DateField()
    net_worth = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_invested = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_returns = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    flex_funds = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-as_of_date', '-id']
        unique_together = [['investor', 'as_of_date']]


class InvestorMarketItem(models.Model):
    investor = models.ForeignKey(InvestorProfile, on_delete=models.CASCADE, related_name='market_items')
    name = models.CharField(max_length=80)
    value_display = models.CharField(max_length=40, blank=True)
    change_pct = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    binance_symbol = models.CharField(
        max_length=20,
        blank=True,
        help_text='Optional Binance pair for live prices, e.g. btcusdt',
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']


class InvestorAlert(models.Model):
    investor = models.ForeignKey(InvestorProfile, on_delete=models.CASCADE, related_name='alerts')
    title = models.CharField(max_length=200)
    alert_date = models.CharField(max_length=40, blank=True)
    alert_type = models.CharField(max_length=30, default='info')
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']


class InvestorOtcTrade(models.Model):
    investor = models.ForeignKey(InvestorProfile, on_delete=models.CASCADE, related_name='otc_trades')
    title = models.CharField(max_length=200)
    side = models.CharField(max_length=20, blank=True)
    amount_display = models.CharField(max_length=40, blank=True)
    settlement = models.CharField(max_length=40, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']


class InvestorSmartIdea(models.Model):
    investor = models.ForeignKey(InvestorProfile, on_delete=models.CASCADE, related_name='smart_ideas')
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=60, blank=True)
    min_investment = models.CharField(max_length=40, blank=True)
    description = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']


class InvestorCurrencySetting(models.Model):
    investor = models.OneToOneField(InvestorProfile, on_delete=models.CASCADE, related_name='currency_setting')
    from_currency = models.CharField(max_length=10, default='USD')
    to_currency = models.CharField(max_length=10, default='UGX')
    rate_label = models.CharField(max_length=80, blank=True)
    from_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    to_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)


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


def kyc_document_upload_path(instance, filename):
    safe_name = filename.replace('..', '').split('/')[-1]
    return f'kyc/{instance.kyc.investor_id}/{instance.doc_type}_{safe_name}'


class InvestorKyc(models.Model):
    STATUS_CHOICES = [
        ('not_started', 'Not started'),
        ('in_progress', 'In progress'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    ID_TYPE_CHOICES = [
        ('national_id', 'National ID'),
        ('passport', 'Passport'),
        ('drivers_license', "Driver's license"),
    ]

    investor = models.OneToOneField(InvestorProfile, on_delete=models.CASCADE, related_name='kyc')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    date_of_birth = models.DateField(null=True, blank=True)
    nationality = models.CharField(max_length=80, blank=True)
    country_of_residence = models.CharField(max_length=80, blank=True)
    address_line1 = models.CharField(max_length=200, blank=True)
    address_line2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=80, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    id_type = models.CharField(max_length=30, choices=ID_TYPE_CHOICES, blank=True)
    id_number = models.CharField(max_length=80, blank=True)
    occupation = models.CharField(max_length=120, blank=True)
    source_of_funds = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='kyc_reviews'
    )
    rejection_reason = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Investor KYC'
        verbose_name_plural = 'Investor KYC records'

    def __str__(self):
        return f'KYC — {self.investor.full_name} ({self.status})'


class InvestorKycDocument(models.Model):
    DOC_TYPE_CHOICES = [
        ('id_front', 'Government ID (front)'),
        ('id_back', 'Government ID (back)'),
        ('proof_of_address', 'Proof of address'),
        ('selfie', 'Selfie with ID'),
    ]

    kyc = models.ForeignKey(InvestorKyc, on_delete=models.CASCADE, related_name='documents')
    doc_type = models.CharField(max_length=30, choices=DOC_TYPE_CHOICES)
    file = models.FileField(upload_to=kyc_document_upload_path)
    original_name = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['doc_type']
        unique_together = [['kyc', 'doc_type']]

