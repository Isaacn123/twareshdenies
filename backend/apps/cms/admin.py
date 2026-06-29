from django.contrib import admin
from .models import ContactSubmission, Message, Notification, Section, SiteSettings

admin.site.register(SiteSettings)
admin.site.register(Section)
admin.site.register(ContactSubmission)
admin.site.register(Notification)
admin.site.register(Message)
