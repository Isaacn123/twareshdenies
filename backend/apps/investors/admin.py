from django.contrib import admin

from .models import (
    InvestorActivity,
    InvestorAlert,
    InvestorCurrencySetting,
    InvestorDocument,
    InvestorHolding,
    InvestorMarketItem,
    InvestorMessage,
    InvestorOtcTrade,
    InvestorProfile,
    InvestorSmartIdea,
    PortfolioSnapshot,
)


class InvestorHoldingInline(admin.TabularInline):
    model = InvestorHolding
    extra = 0


class PortfolioSnapshotInline(admin.TabularInline):
    model = PortfolioSnapshot
    extra = 0


@admin.register(InvestorProfile)
class InvestorProfileAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'investor_type', 'portal_enabled', 'total_invested', 'updated_at']
    inlines = [InvestorHoldingInline, PortfolioSnapshotInline]


admin.site.register(InvestorDocument)
admin.site.register(InvestorMessage)
admin.site.register(InvestorActivity)
admin.site.register(InvestorMarketItem)
admin.site.register(InvestorAlert)
admin.site.register(InvestorOtcTrade)
admin.site.register(InvestorSmartIdea)
admin.site.register(InvestorCurrencySetting)
