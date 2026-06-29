from django.db import models


class SiteSettings(models.Model):
    site_name = models.CharField(max_length=120, default='Twaresh Denis')
    seo = models.JSONField(default=dict, blank=True)
    brand = models.JSONField(default=dict, blank=True)
    contact = models.JSONField(default=dict, blank=True)
    hero = models.JSONField(default=dict, blank=True)
    stats = models.JSONField(default=dict, blank=True)
    insights = models.JSONField(default=list, blank=True)
    portrait = models.CharField(max_length=255, default='/assets/twaresh-photo.jpg')
    navigation = models.JSONField(default=dict, blank=True)
    socials = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Site settings'

    def __str__(self):
        return self.site_name


class Section(models.Model):
    SECTION_TYPES = [
        ('hero', 'Hero'),
        ('ticker', 'Live Ticker'),
        ('strip', 'Brand Strip'),
        ('about', 'About'),
        ('stats', 'Track Record / Stats'),
        ('philosophy', 'Philosophy'),
        ('services', 'Services'),
        ('why', 'Why Choose Us'),
        ('risk', 'Risk Management'),
        ('markets', 'Markets'),
        ('clients', 'Clients'),
        ('institutional', 'Institutional'),
        ('calculator', 'Calculator'),
        ('insights', 'Insights'),
        ('process', 'Process'),
        ('contact', 'Contact'),
        ('custom', 'Custom content'),
        ('html', 'Raw HTML'),
    ]

    slug = models.SlugField(max_length=80, unique=True)
    page_key = models.SlugField(
        max_length=80,
        blank=True,
        help_text='Matches data-section on the public frontend HTML',
    )
    title = models.CharField(max_length=200)
    section_type = models.CharField(max_length=30, choices=SECTION_TYPES, default='custom')
    content = models.JSONField(default=dict, blank=True)
    html_content = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['page_key'],
                condition=~models.Q(page_key=''),
                name='unique_nonempty_page_key',
            ),
        ]

    def __str__(self):
        return self.title


class ContactSubmission(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True)
    investor_profile = models.CharField(max_length=80)
    interest = models.CharField(max_length=80, blank=True)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} — {self.email}'


class Notification(models.Model):
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Message(models.Model):
    sender = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='received_messages')
    subject = models.CharField(max_length=200)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.subject
