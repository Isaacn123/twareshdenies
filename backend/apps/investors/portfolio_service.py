from decimal import Decimal
from collections import defaultdict

from django.utils import timezone

ALLOCATION_COLORS = {
    'BTC': '#f59e0b',
    'ETH': '#3b82f6',
    'SOL': '#9945ff',
    'AAPL': '#111827',
    'MSFT': '#2563eb',
    'XAU': '#f97316',
    'UST': '#64748b',
    'VNQ': '#8b5cf6',
    'USD': '#64748b',
}
CATEGORY_COLORS = {
    'crypto': '#f59e0b',
    'stocks': '#3b82f6',
    'bonds': '#64748b',
    'commodities': '#f97316',
    'real_estate': '#8b5cf6',
    'cash': '#94a3b8',
}
FALLBACK_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#64748b', '#ec4899', '#14b8a6']

BINANCE_SYMBOL_MAP = {
    'BTC': 'btcusdt',
    'ETH': 'ethusdt',
    'SOL': 'solusdt',
    'BNB': 'bnbusdt',
    'XRP': 'xrpusdt',
    'ADA': 'adausdt',
    'DOGE': 'dogeusdt',
    'DOT': 'dotusdt',
    'AVAX': 'avaxusdt',
    'MATIC': 'maticusdt',
    'LINK': 'linkusdt',
    'LTC': 'ltcusdt',
}


def _dec(value, default=Decimal('0')):
    if value is None or value == '':
        return default
    try:
        return Decimal(str(value))
    except Exception:
        return default


def _money(amount):
    amount = _dec(amount)
    sign = '-' if amount < 0 else ''
    return f'{sign}${abs(amount):,.0f}'


def _signed_money(amount):
    amount = _dec(amount)
    if amount == 0:
        return '$0'
    prefix = '+' if amount > 0 else '-'
    return f'{prefix}${abs(amount):,.0f}'


def _pct(value, signed=False):
    value = _dec(value)
    if value == 0:
        return '0%'
    prefix = '+' if signed and value > 0 else ('-' if signed and value < 0 else '')
    return f'{prefix}{abs(value):.2f}%'


def _change_block(current, previous):
    current = _dec(current)
    previous = _dec(previous)
    delta = current - previous
    pct = (delta / previous * Decimal('100')) if previous else Decimal('0')
    return _signed_money(delta), _pct(pct, signed=True)


def _holding_color(holding, index=0):
    symbol = (holding.symbol or '').upper()
    if symbol in ALLOCATION_COLORS:
        return ALLOCATION_COLORS[symbol]
    if holding.category in CATEGORY_COLORS:
        return CATEGORY_COLORS[holding.category]
    return FALLBACK_COLORS[index % len(FALLBACK_COLORS)]


def _allocation_label(holding):
    symbol = (holding.symbol or '').strip()
    if symbol:
        return f'{holding.name} ({symbol})'
    return holding.name


def _format_market_price(holding):
    if holding.price is not None and _dec(holding.price) > 0:
        price = _dec(holding.price)
        if price >= Decimal('1000'):
            return f'${price:,.2f}'
        return f'${price:,.2f}'
    value = _dec(holding.value)
    if value >= Decimal('1000'):
        return f'${value:,.0f}'
    return f'${value:,.2f}'


def _holding_market_label(holding):
    symbol = (holding.symbol or '').strip().upper()
    name = (holding.name or symbol or 'Asset').strip()
    if symbol and symbol not in name.upper():
        return f'{name} ({symbol})'
    return name


def _binance_symbol_for_holding(holding):
    symbol = (holding.symbol or '').strip().upper()
    if holding.category == 'crypto' and symbol in BINANCE_SYMBOL_MAP:
        return BINANCE_SYMBOL_MAP[symbol]
    return ''


def resolve_market_snapshot(market_items, holdings):
    """Use admin market rows when present; otherwise derive from holdings."""
    items = list(market_items)
    if items:
        return [
            {
                'name': item.name,
                'value': item.value_display,
                'change': float(item.change_pct),
                'binance_symbol': item.binance_symbol,
                'source': 'admin',
            }
            for item in items
        ]

    rows = []
    for holding in sorted(holdings, key=lambda h: _dec(h.value), reverse=True):
        if _dec(holding.value) <= 0 and (holding.price is None or _dec(holding.price) <= 0):
            continue
        rows.append({
            'name': _holding_market_label(holding),
            'value': _format_market_price(holding),
            'change': float(holding.change_24h or 0),
            'binance_symbol': _binance_symbol_for_holding(holding),
            'source': 'holdings',
        })
    return rows[:12]


def compute_holdings_metrics(holdings, net_worth):
    net_worth = _dec(net_worth)
    rows = []
    for i, holding in enumerate(holdings):
        value = _dec(holding.value)
        allocation = float((value / net_worth * Decimal('100')) if net_worth else Decimal('0'))
        rows.append({
            'id': holding.id,
            'name': holding.name,
            'symbol': holding.symbol,
            'category': holding.category,
            'price': float(holding.price) if holding.price is not None else None,
            'change_24h': float(holding.change_24h) if holding.change_24h is not None else None,
            'holdings': holding.holdings_text,
            'value': float(value),
            'allocation': round(allocation, 1),
            'is_flex': holding.is_flex,
            'sort_order': holding.sort_order,
        })
    return rows


def compute_allocation_slices(holdings, net_worth):
    net_worth = _dec(net_worth)
    if not net_worth:
        return [], '', ''

    sorted_holdings = sorted(holdings, key=lambda h: _dec(h.value), reverse=True)
    slices = []
    for i, holding in enumerate(sorted_holdings):
        value = _dec(holding.value)
        if value <= 0:
            continue
        pct = float(value / net_worth * Decimal('100'))
        slices.append({
            'name': _allocation_label(holding),
            'pct': round(pct, 1),
            'color': _holding_color(holding, i),
        })

    top = slices[0] if slices else None
    center_label = top['name'] if top else 'Allocation'
    if net_worth >= Decimal('1000000'):
        center_value = f'{net_worth / Decimal("1000000"):.2f}M'
    elif net_worth >= Decimal('1000'):
        center_value = f'{net_worth / Decimal("1000"):.0f}K'
    else:
        center_value = _money(net_worth).lstrip('$')
    return slices, center_value, center_label


def compute_flex_funds(holdings):
    flex = Decimal('0')
    for holding in holdings:
        if holding.category == 'cash' or holding.is_flex:
            flex += _dec(holding.value)
    return flex


def compute_ytd_pct(snapshots, net_worth):
    year = timezone.localdate().year
    first = next((s for s in snapshots if s.as_of_date.year == year), None)
    if not first or not _dec(first.net_worth):
        invested = _dec(getattr(first, 'total_invested', 0)) if first else Decimal('0')
        if invested:
            return _pct((_dec(net_worth) - invested) / invested * Decimal('100'), signed=True)
        return '—'
    start = _dec(first.net_worth)
    return _pct((_dec(net_worth) - start) / start * Decimal('100'), signed=True)


def build_portfolio_payload(profile):
    holdings = list(profile.holdings.all())
    snapshots = list(profile.snapshots.all()[:24])
    total_invested = _dec(profile.total_invested)
    net_worth = sum(_dec(h.value) for h in holdings)
    total_returns = net_worth - total_invested
    flex_funds = compute_flex_funds(holdings)

    categories = {h.category for h in holdings if _dec(h.value) > 0}
    holding_rows = compute_holdings_metrics(holdings, net_worth)
    allocation, allocation_center, allocation_center_label = compute_allocation_slices(holdings, net_worth)

    prev = snapshots[1] if len(snapshots) > 1 else None
    latest = snapshots[0] if snapshots else None
    if prev:
        nw_change, nw_change_pct = _change_block(net_worth, prev.net_worth)
        inv_change, inv_change_pct = _change_block(total_invested, prev.total_invested)
        ret_change, ret_change_pct = _change_block(total_returns, prev.total_returns)
    else:
        nw_change = nw_change_pct = inv_change = inv_change_pct = ret_change = ret_change_pct = ''

    perf_snapshots = list(reversed(snapshots[:6])) or ([latest] if latest else [])
    perf_labels = [s.as_of_date.strftime('%b') for s in perf_snapshots]
    perf_values = [float(_dec(s.total_returns)) for s in perf_snapshots]
    spark_values = [float(_dec(s.net_worth)) for s in perf_snapshots]

    assets = defaultdict(list)
    for row in holding_rows:
        assets[row['category']].append({
            'name': row['name'],
            'symbol': row['symbol'],
            'price': row['price'],
            'change_24h': row['change_24h'],
            'holdings': row['holdings'],
            'value': row['value'],
            'allocation': row['allocation'],
        })

    currency = getattr(profile, 'currency_setting', None)
    market_items = list(profile.market_items.all())
    alerts = profile.alerts.all()
    otc_trades = profile.otc_trades.all()
    smart_ideas = profile.smart_ideas.all()

    ytd_pct = compute_ytd_pct(snapshots, net_worth)

    return {
        'net_worth': _money(net_worth),
        'net_worth_change': nw_change,
        'net_worth_change_pct': nw_change_pct,
        'total_invested': _money(total_invested),
        'total_invested_change': inv_change,
        'total_invested_change_pct': inv_change_pct,
        'total_returns': _money(total_returns),
        'total_returns_change': ret_change,
        'total_returns_change_pct': ret_change_pct,
        'flex_funds': _money(flex_funds),
        'available_funds': _money(flex_funds),
        'investments_count': len([h for h in holdings if _dec(h.value) > 0]),
        'asset_classes': len(categories),
        'aum': _money(net_worth),
        'ytd_return': ytd_pct,
        'allocation_center': allocation_center,
        'allocation_center_label': allocation_center_label,
        'allocation': allocation,
        'performance': {
            'total_returns': _money(total_returns),
            'ytd_pct': ytd_pct,
            'labels': perf_labels,
            'values': perf_values,
        },
        'sparklines': {'net_worth': spark_values},
        'assets': dict(assets),
        'market_snapshot': resolve_market_snapshot(market_items, holdings),
        'alerts': [
            {'title': alert.title, 'date': alert.alert_date, 'type': alert.alert_type}
            for alert in alerts
        ],
        'otc_trades': [
            {
                'title': trade.title,
                'side': trade.side,
                'amount': trade.amount_display,
                'settlement': trade.settlement,
            }
            for trade in otc_trades
        ],
        'smart_ideas': [
            {
                'title': idea.title,
                'category': idea.category,
                'min_investment': idea.min_investment,
                'description': idea.description,
            }
            for idea in smart_ideas
        ],
        'currency': {
            'from': currency.from_currency if currency else 'USD',
            'to': currency.to_currency if currency else 'UGX',
            'from_amount': float(currency.from_amount) if currency and currency.from_amount is not None else 1000,
            'to_amount': float(currency.to_amount) if currency and currency.to_amount is not None else 0,
            'rate': currency.rate_label if currency else '',
        },
        'summary': {
            'net_worth': float(net_worth),
            'total_invested': float(total_invested),
            'total_returns': float(total_returns),
            'flex_funds': float(flex_funds),
        },
    }


def save_portfolio_snapshot(profile, as_of_date=None):
    from .models import PortfolioSnapshot

    as_of_date = as_of_date or timezone.localdate()
    holdings = list(profile.holdings.all())
    total_invested = _dec(profile.total_invested)
    net_worth = sum(_dec(h.value) for h in holdings)
    total_returns = net_worth - total_invested
    flex_funds = compute_flex_funds(holdings)

    PortfolioSnapshot.objects.update_or_create(
        investor=profile,
        as_of_date=as_of_date,
        defaults={
            'net_worth': net_worth,
            'total_invested': total_invested,
            'total_returns': total_returns,
            'flex_funds': flex_funds,
        },
    )
