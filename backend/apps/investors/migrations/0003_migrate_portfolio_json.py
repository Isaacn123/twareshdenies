from datetime import date
from decimal import Decimal, InvalidOperation

from django.db import migrations


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


def migrate_portfolio_json(apps, schema_editor):
    InvestorProfile = apps.get_model('investors', 'InvestorProfile')
    InvestorHolding = apps.get_model('investors', 'InvestorHolding')
    InvestorMarketItem = apps.get_model('investors', 'InvestorMarketItem')
    InvestorAlert = apps.get_model('investors', 'InvestorAlert')
    InvestorOtcTrade = apps.get_model('investors', 'InvestorOtcTrade')
    InvestorSmartIdea = apps.get_model('investors', 'InvestorSmartIdea')
    InvestorCurrencySetting = apps.get_model('investors', 'InvestorCurrencySetting')
    PortfolioSnapshot = apps.get_model('investors', 'PortfolioSnapshot')

    for profile in InvestorProfile.objects.all():
        data = getattr(profile, 'portfolio', None) or {}
        if not isinstance(data, dict) or not data:
            continue

        profile.total_invested = _parse_money(data.get('total_invested'))
        profile.save(update_fields=['total_invested'])

        sort_order = 0
        for category, rows in (data.get('assets') or {}).items():
            cat = category if category in {'crypto', 'stocks', 'bonds', 'commodities', 'real_estate', 'cash'} else 'crypto'
            for row in rows or []:
                InvestorHolding.objects.create(
                    investor=profile,
                    category=cat,
                    name=row.get('name') or row.get('symbol') or 'Asset',
                    symbol=row.get('symbol', ''),
                    holdings_text=row.get('holdings', ''),
                    value=_parse_money(row.get('value')),
                    price=row.get('price'),
                    change_24h=row.get('change_24h'),
                    is_flex=category == 'cash',
                    sort_order=sort_order,
                )
                sort_order += 1

        for i, row in enumerate(data.get('market_snapshot') or []):
            InvestorMarketItem.objects.create(
                investor=profile,
                name=row.get('name', ''),
                value_display=row.get('value', ''),
                change_pct=row.get('change', 0) or 0,
                sort_order=i,
            )

        for i, row in enumerate(data.get('alerts') or []):
            InvestorAlert.objects.create(
                investor=profile,
                title=row.get('title', ''),
                alert_date=row.get('date', ''),
                alert_type=row.get('type', 'info'),
                sort_order=i,
            )

        for i, row in enumerate(data.get('otc_trades') or []):
            InvestorOtcTrade.objects.create(
                investor=profile,
                title=row.get('title', ''),
                side=row.get('side', ''),
                amount_display=row.get('amount', ''),
                settlement=row.get('settlement', ''),
                sort_order=i,
            )

        for i, row in enumerate(data.get('smart_ideas') or []):
            InvestorSmartIdea.objects.create(
                investor=profile,
                title=row.get('title', ''),
                category=row.get('category', ''),
                min_investment=row.get('min_investment', ''),
                description=row.get('description', ''),
                sort_order=i,
            )

        currency = data.get('currency') or {}
        if currency:
            InvestorCurrencySetting.objects.create(
                investor=profile,
                from_currency=currency.get('from') or 'USD',
                to_currency=currency.get('to') or 'UGX',
                rate_label=currency.get('rate', ''),
                from_amount=currency.get('from_amount'),
                to_amount=currency.get('to_amount'),
            )

        spark = (data.get('sparklines') or {}).get('net_worth') or []
        perf_values = (data.get('performance') or {}).get('values') or []
        perf_labels = (data.get('performance') or {}).get('labels') or []
        series = spark or perf_values
        label_series = perf_labels or [f'M{i + 1}' for i in range(len(series))]

        net_worth = sum(_parse_money(h.value) for h in InvestorHolding.objects.filter(investor=profile))
        total_returns = net_worth - profile.total_invested
        flex = sum(
            _parse_money(h.value)
            for h in InvestorHolding.objects.filter(investor=profile, category='cash')
        )

        if series:
            today = date.today()
            for offset, value in enumerate(reversed(series[-6:])):
                month_index = len(series[-6:]) - 1 - offset
                snapshot_date = date(today.year, max(1, today.month - month_index), 1)
                invested = profile.total_invested
                returns = _parse_money(value) - invested
                PortfolioSnapshot.objects.update_or_create(
                    investor=profile,
                    as_of_date=snapshot_date,
                    defaults={
                        'net_worth': _parse_money(value),
                        'total_invested': invested,
                        'total_returns': returns,
                        'flex_funds': flex,
                    },
                )
        else:
            PortfolioSnapshot.objects.update_or_create(
                investor=profile,
                as_of_date=date.today(),
                defaults={
                    'net_worth': net_worth,
                    'total_invested': profile.total_invested,
                    'total_returns': total_returns,
                    'flex_funds': flex,
                },
            )


class Migration(migrations.Migration):

    dependencies = [
        ('investors', '0002_portfolio_tables'),
    ]

    operations = [
        migrations.RunPython(migrate_portfolio_json, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='investorprofile',
            name='portfolio',
        ),
    ]
