from django.contrib import admin
from .models import InvestorActivity, InvestorDocument, InvestorMessage, InvestorProfile

admin.site.register(InvestorProfile)
admin.site.register(InvestorDocument)
admin.site.register(InvestorMessage)
admin.site.register(InvestorActivity)
