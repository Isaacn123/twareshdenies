from decimal import Decimal, InvalidOperation

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from .models import (
    InvestorActivity,
    InvestorAlert,
    InvestorCurrencySetting,
    InvestorDocument,
    InvestorHolding,
    InvestorKyc,
    InvestorMarketItem,
    InvestorMessage,
    InvestorOtcTrade,
    InvestorProfile,
    InvestorSmartIdea,
)
from .kyc_service import build_kyc_payload, get_or_create_kyc
from .portfolio_service import build_portfolio_payload, save_portfolio_snapshot

User = get_user_model()


def _parse_money(value):
    if value is None or value == '':
        return Decimal('0')
    if isinstance(value, (int, float, Decimal)):
        return Decimal(str(value))
    cleaned = str(value).replace('$', '').replace(',', '').replace('+', '').strip()
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return Decimal('0')


class InvestorDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvestorDocument
        fields = ['id', 'title', 'doc_type', 'description', 'file_url', 'is_visible', 'created_at']
        read_only_fields = ['id', 'created_at']


class InvestorMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = InvestorMessage
        fields = ['id', 'subject', 'body', 'sender_name', 'is_from_admin', 'is_read', 'created_at']
        read_only_fields = ['id', 'sender_name', 'is_from_admin', 'created_at']

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.username


class InvestorActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = InvestorActivity
        fields = ['id', 'action', 'detail', 'ip_address', 'created_at']


class InvestorHoldingSerializer(serializers.ModelSerializer):
    holdings = serializers.CharField(source='holdings_text', required=False, allow_blank=True)

    class Meta:
        model = InvestorHolding
        fields = [
            'id', 'category', 'name', 'symbol', 'holdings', 'holdings_text',
            'quantity', 'value', 'price', 'change_24h', 'is_flex', 'sort_order',
        ]
        read_only_fields = ['id']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['holdings'] = instance.holdings_text
        return data


class InvestorMarketItemSerializer(serializers.ModelSerializer):
    value = serializers.CharField(source='value_display', required=False, allow_blank=True)
    change = serializers.DecimalField(source='change_pct', max_digits=8, decimal_places=2, required=False)

    class Meta:
        model = InvestorMarketItem
        fields = ['id', 'name', 'value', 'change', 'binance_symbol', 'sort_order']
        read_only_fields = ['id']


class InvestorAlertSerializer(serializers.ModelSerializer):
    date = serializers.CharField(source='alert_date')
    type = serializers.CharField(source='alert_type')

    class Meta:
        model = InvestorAlert
        fields = ['id', 'title', 'date', 'type', 'sort_order']
        read_only_fields = ['id']


class InvestorOtcTradeSerializer(serializers.ModelSerializer):
    amount = serializers.CharField(source='amount_display')

    class Meta:
        model = InvestorOtcTrade
        fields = ['id', 'title', 'side', 'amount', 'settlement', 'sort_order']
        read_only_fields = ['id']


class InvestorSmartIdeaSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvestorSmartIdea
        fields = ['id', 'title', 'category', 'min_investment', 'description', 'sort_order']
        read_only_fields = ['id']


class InvestorCurrencySettingSerializer(serializers.ModelSerializer):
    from_cur = serializers.CharField(source='from_currency', required=False)
    to_cur = serializers.CharField(source='to_currency', required=False)
    rate = serializers.CharField(source='rate_label', required=False, allow_blank=True)

    class Meta:
        model = InvestorCurrencySetting
        fields = ['from_cur', 'to_cur', 'rate', 'from_amount', 'to_amount']

    def to_representation(self, instance):
        return {
            'from': instance.from_currency,
            'to': instance.to_currency,
            'rate': instance.rate_label,
            'from_amount': float(instance.from_amount) if instance.from_amount is not None else None,
            'to_amount': float(instance.to_amount) if instance.to_amount is not None else None,
        }


class InvestorRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    full_name = serializers.CharField(max_length=120)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=40)
    investor_type = serializers.ChoiceField(choices=InvestorProfile.INVESTOR_TYPES, default='hnwi')

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('This email is already registered.')
        return value

    def create(self, validated_data):
        from apps.accounts.models import Role, UserProfile

        password = validated_data.pop('password')
        username = validated_data.pop('username')
        email = validated_data.pop('email')
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_staff=False,
            is_superuser=False,
        )
        investor_role, _ = Role.objects.get_or_create(
            slug='investor',
            defaults={
                'name': 'Investor',
                'description': 'Investor portal access only.',
                'can_manage_users': False,
                'can_manage_content': False,
                'can_view_submissions': False,
                'can_manage_investors': False,
            },
        )
        UserProfile.objects.create(user=user, role=investor_role)
        return InvestorProfile.objects.create(
            user=user,
            portal_enabled=False,
            admin_notes='Self-registration — pending advisor approval.',
            **validated_data,
        )


def sync_portfolio_data(profile, data):
    if not isinstance(data, dict):
        return profile

    if 'total_invested' in data:
        profile.total_invested = _parse_money(data.get('total_invested'))
        profile.save(update_fields=['total_invested', 'updated_at'])

    holdings_payload = data.get('holdings')
    if holdings_payload is None and data.get('assets'):
        holdings_payload = []
        for category, rows in (data.get('assets') or {}).items():
            for row in rows or []:
                holdings_payload.append({**row, 'category': category})

    if holdings_payload is not None:
        profile.holdings.all().delete()
        for i, row in enumerate(holdings_payload):
            InvestorHolding.objects.create(
                investor=profile,
                category=row.get('category') or 'crypto',
                name=row.get('name') or row.get('symbol') or 'Asset',
                symbol=row.get('symbol', ''),
                holdings_text=row.get('holdings') or row.get('holdings_text', ''),
                quantity=row.get('quantity'),
                value=_parse_money(row.get('value')),
                price=row.get('price'),
                change_24h=row.get('change_24h'),
                is_flex=bool(row.get('is_flex')) or row.get('category') == 'cash',
                sort_order=row.get('sort_order', i),
            )

    market_rows = data.get('market_snapshot')
    if market_rows is not None:
        profile.market_items.all().delete()
        for i, row in enumerate(market_rows):
            InvestorMarketItem.objects.create(
                investor=profile,
                name=row.get('name', ''),
                value_display=row.get('value', ''),
                change_pct=row.get('change', 0) or 0,
                binance_symbol=(row.get('binance_symbol') or '').lower().strip(),
                sort_order=i,
            )

    alert_rows = data.get('alerts')
    if alert_rows is not None:
        profile.alerts.all().delete()
        for i, row in enumerate(alert_rows):
            InvestorAlert.objects.create(
                investor=profile,
                title=row.get('title', ''),
                alert_date=row.get('date', ''),
                alert_type=row.get('type', 'info'),
                sort_order=i,
            )

    otc_rows = data.get('otc_trades')
    if otc_rows is not None:
        profile.otc_trades.all().delete()
        for i, row in enumerate(otc_rows):
            InvestorOtcTrade.objects.create(
                investor=profile,
                title=row.get('title', ''),
                side=row.get('side', ''),
                amount_display=row.get('amount', ''),
                settlement=row.get('settlement', ''),
                sort_order=i,
            )

    idea_rows = data.get('smart_ideas')
    if idea_rows is not None:
        profile.smart_ideas.all().delete()
        for i, row in enumerate(idea_rows):
            InvestorSmartIdea.objects.create(
                investor=profile,
                title=row.get('title', ''),
                category=row.get('category', ''),
                min_investment=row.get('min_investment', ''),
                description=row.get('description', ''),
                sort_order=i,
            )

    currency = data.get('currency')
    if currency is not None:
        InvestorCurrencySetting.objects.update_or_create(
            investor=profile,
            defaults={
                'from_currency': currency.get('from') or 'USD',
                'to_currency': currency.get('to') or 'UGX',
                'rate_label': currency.get('rate', ''),
                'from_amount': currency.get('from_amount'),
                'to_amount': currency.get('to_amount'),
            },
        )

    if data.get('save_snapshot', True):
        save_portfolio_snapshot(profile)

    return profile


class InvestorProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    username_input = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(source='user.email')
    is_active = serializers.BooleanField(source='user.is_active')
    password = serializers.CharField(write_only=True, required=False)
    documents = InvestorDocumentSerializer(many=True, read_only=True)
    recent_activity = InvestorActivitySerializer(source='activities', many=True, read_only=True)
    portfolio = serializers.SerializerMethodField()
    portfolio_data = serializers.JSONField(write_only=True, required=False)
    holdings = serializers.SerializerMethodField()
    market_snapshot = serializers.SerializerMethodField()
    alerts = serializers.SerializerMethodField()
    otc_trades = serializers.SerializerMethodField()
    smart_ideas = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()
    kyc = serializers.SerializerMethodField()
    kyc_status = serializers.SerializerMethodField()

    class Meta:
        model = InvestorProfile
        fields = [
            'id', 'username', 'username_input', 'email', 'password', 'full_name', 'phone', 'investor_type',
            'portal_enabled', 'total_invested', 'portfolio', 'portfolio_data', 'holdings', 'market_snapshot',
            'alerts', 'otc_trades', 'smart_ideas', 'currency', 'kyc', 'kyc_status', 'admin_notes', 'is_active',
            'documents', 'recent_activity', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'portfolio']

    def get_portfolio(self, obj):
        return build_portfolio_payload(obj)

    def get_holdings(self, obj):
        return InvestorHoldingSerializer(obj.holdings.all(), many=True).data

    def get_market_snapshot(self, obj):
        return InvestorMarketItemSerializer(obj.market_items.all(), many=True).data

    def get_alerts(self, obj):
        return InvestorAlertSerializer(obj.alerts.all(), many=True).data

    def get_otc_trades(self, obj):
        return InvestorOtcTradeSerializer(obj.otc_trades.all(), many=True).data

    def get_smart_ideas(self, obj):
        return InvestorSmartIdeaSerializer(obj.smart_ideas.all(), many=True).data

    def get_currency(self, obj):
        setting = getattr(obj, 'currency_setting', None)
        if not setting:
            return {}
        return InvestorCurrencySettingSerializer(setting).data

    def get_kyc(self, obj):
        kyc = getattr(obj, 'kyc', None)
        if not kyc:
            kyc = get_or_create_kyc(obj)
        return build_kyc_payload(kyc)

    def get_kyc_status(self, obj):
        kyc = getattr(obj, 'kyc', None)
        if not kyc:
            return 'not_started'
        return kyc.status

    def create(self, validated_data):
        user_data = validated_data.pop('user', {})
        password = validated_data.pop('password', None)
        portfolio_data = validated_data.pop('portfolio_data', None)
        email = user_data.get('email', '')
        username = validated_data.pop('username_input', None) or self.initial_data.get('username')
        if not username:
            raise serializers.ValidationError({'username': 'Username is required'})
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password or 'ChangeMe123!',
            is_staff=False,
            is_superuser=False,
        )
        from apps.accounts.models import Role, UserProfile
        investor_role, _ = Role.objects.get_or_create(
            slug='investor',
            defaults={
                'name': 'Investor',
                'description': 'Investor portal access only.',
                'can_manage_users': False,
                'can_manage_content': False,
                'can_view_submissions': False,
                'can_manage_investors': False,
            },
        )
        UserProfile.objects.create(user=user, role=investor_role)
        with transaction.atomic():
            investor = InvestorProfile.objects.create(user=user, **validated_data)
            if portfolio_data:
                sync_portfolio_data(investor, portfolio_data)
        return investor

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        password = validated_data.pop('password', None)
        portfolio_data = validated_data.pop('portfolio_data', None)
        legacy_portfolio = self.initial_data.get('portfolio')
        if 'email' in user_data:
            instance.user.email = user_data['email']
        if 'is_active' in user_data:
            instance.user.is_active = user_data['is_active']
        if password:
            instance.user.set_password(password)
        instance.user.save()
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        with transaction.atomic():
            instance.save()
            payload = portfolio_data or legacy_portfolio
            if payload is not None:
                sync_portfolio_data(instance, payload)
        return instance
