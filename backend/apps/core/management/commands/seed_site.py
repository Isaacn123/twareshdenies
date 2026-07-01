import json
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.accounts.models import Role, UserProfile
from apps.cms.models import Section, SiteSettings
from apps.cms.navigation_defaults import DEFAULT_NAVIGATION
from apps.cms.section_defaults import SECTION_CONTENT
from apps.cms.social_defaults import build_default_socials

PAGE_SECTIONS = [
    ('hero', 'hero', 'Hero', 'hero'),
    ('ticker', 'ticker', 'Live Crypto Ticker', 'ticker'),
    ('strip', 'strip', 'Brand Strip', 'strip'),
    ('about', 'about', 'About', 'about'),
    ('record', 'record', 'Track Record', 'stats'),
    ('philosophy', 'philosophy', 'Investment Philosophy', 'philosophy'),
    ('services', 'services', 'Services', 'services'),
    ('why', 'why', 'Why Choose Us', 'why'),
    ('risk', 'risk', 'Risk Management', 'risk'),
    ('markets', 'markets', 'Markets & Research', 'markets'),
    ('clients', 'clients', 'Who We Serve', 'clients'),
    ('institutional', 'institutional', 'Institutional Engagement', 'institutional'),
    ('calculator', 'calculator', 'Investment Calculator', 'calculator'),
    ('insights', 'insights', 'Insights & Commentary', 'insights'),
    ('process', 'process', 'Client Onboarding', 'process'),
    ('investor-portal', 'investor-portal', 'Investor Portal CTA', 'custom'),
    ('contact', 'contact', 'Contact', 'contact'),
]

ROLES = [
    ('super-admin', 'Super Admin', 'Full platform access.', True, True, True, True),
    ('content-manager', 'Content Manager', 'Manage public site content.', False, True, True, False),
    ('viewer', 'Viewer', 'Read-only dashboard access.', False, False, True, False),
    ('investor', 'Investor', 'Investor portal access only.', False, False, False, False),
]


class Command(BaseCommand):
    help = 'Seed site settings, page sections, roles, and admin user'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='admin')
        parser.add_argument('--password', default='admin123')
        parser.add_argument('--email', default='admin@twareshdenis.com')

    def handle(self, *args, **options):
        data_path = Path(__file__).resolve().parents[4] / 'data' / 'site.json'
        payload = {}
        if data_path.exists():
            payload = json.loads(data_path.read_text())

        settings_obj, _ = SiteSettings.objects.get_or_create(pk=1)
        settings_obj.site_name = payload.get('brand', {}).get('name', 'Twaresh Denis')
        settings_obj.seo = payload.get('seo', {})
        settings_obj.brand = payload.get('brand', {})
        settings_obj.contact = payload.get('contact', {})
        settings_obj.hero = payload.get('hero', {})
        settings_obj.stats = payload.get('stats', {})
        settings_obj.insights = payload.get('insights', [])
        settings_obj.portrait = payload.get('portrait', '/assets/twaresh-photo.jpg')
        settings_obj.navigation = payload.get('navigation', DEFAULT_NAVIGATION)
        settings_obj.socials = build_default_socials(
            settings_obj.contact,
            payload.get('socials'),
        )
        settings_obj.save()

        for index, (slug, page_key, title, section_type) in enumerate(PAGE_SECTIONS):
            Section.objects.update_or_create(
                slug=slug,
                defaults={
                    'page_key': page_key,
                    'title': title,
                    'section_type': section_type,
                    'content': SECTION_CONTENT.get(page_key, {}),
                    'sort_order': index,
                    'is_published': True,
                },
            )

        admin_role = None
        for slug, name, description, manage_users, manage_content, view_submissions, manage_investors in ROLES:
            role, _ = Role.objects.update_or_create(
                slug=slug,
                defaults={
                    'name': name,
                    'description': description,
                    'can_manage_users': manage_users,
                    'can_manage_content': manage_content,
                    'can_view_submissions': view_submissions,
                    'can_manage_investors': manage_investors,
                },
            )
            if slug == 'super-admin':
                admin_role = role

        User = get_user_model()
        user, created = User.objects.get_or_create(username=options['username'], defaults={
            'email': options['email'],
            'is_staff': True,
            'is_superuser': True,
        })
        if created:
            user.set_password(options['password'])
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created admin user: {options["username"]}'))
        if admin_role:
            UserProfile.objects.update_or_create(user=user, defaults={'role': admin_role})

        from apps.investors.models import InvestorProfile
        demo_user, demo_created = User.objects.get_or_create(
            username='investor1',
            defaults={'email': 'investor@example.com', 'is_staff': False, 'is_superuser': False},
        )
        if demo_created:
            demo_user.set_password('investor123')
            demo_user.save()
        investor_role = Role.objects.get(slug='investor')
        UserProfile.objects.update_or_create(user=demo_user, defaults={'role': investor_role})
        from apps.investors.serializers import sync_portfolio_data

        demo_portfolio = {
            'total_invested': 2150000,
            'assets': {
                'crypto': [
                    {'name': 'Bitcoin', 'symbol': 'BTC', 'price': 67200, 'change_24h': 2.4, 'holdings': '12.5 BTC', 'value': 840000},
                    {'name': 'Ethereum', 'symbol': 'ETH', 'price': 3480, 'change_24h': 1.8, 'holdings': '85 ETH', 'value': 295800},
                    {'name': 'Solana', 'symbol': 'SOL', 'price': 142, 'change_24h': -0.6, 'holdings': '1,200 SOL', 'value': 170400},
                ],
                'stocks': [
                    {'name': 'Apple Inc.', 'symbol': 'AAPL', 'price': 192, 'change_24h': 0.8, 'holdings': '500 shares', 'value': 96000},
                    {'name': 'Microsoft', 'symbol': 'MSFT', 'price': 415, 'change_24h': 1.2, 'holdings': '200 shares', 'value': 83000},
                ],
                'commodities': [
                    {'name': 'Gold', 'symbol': 'XAU', 'price': 2340, 'change_24h': 0.5, 'holdings': '45 oz', 'value': 105300},
                ],
                'bonds': [
                    {'name': 'US Treasury 10Y', 'symbol': 'UST', 'price': 98.5, 'change_24h': 0.1, 'holdings': '$420K face', 'value': 413700},
                ],
                'real_estate': [
                    {'name': 'REIT Fund', 'symbol': 'VNQ', 'price': 88, 'change_24h': 0.3, 'holdings': '3,200 units', 'value': 281600},
                ],
                'cash': [
                    {'name': 'USD Cash', 'symbol': 'USD', 'price': 1, 'change_24h': 0, 'holdings': 'Liquid', 'value': 154000, 'is_flex': True},
                ],
            },
            'otc_trades': [
                {'title': 'Large Cap Equity Block', 'settlement': 'May 18', 'amount': '$450,000', 'side': 'Buy'},
                {'title': 'Private Credit Opportunity', 'settlement': 'May 22', 'amount': '$200,000', 'side': 'Buy'},
                {'title': 'Real Estate Fund', 'settlement': 'May 15', 'amount': '$120,000', 'side': 'Sell'},
            ],
            'market_snapshot': [
                {'name': 'S&P 500', 'value': '5,284', 'change': 0.42},
                {'name': 'NASDAQ 100', 'value': '18,642', 'change': 0.68},
                {'name': 'Gold', 'value': '$2,340', 'change': 0.51},
                {'name': 'WTI Crude Oil', 'value': '$78.20', 'change': -0.32},
            ],
            'smart_ideas': [
                {'title': 'AI & Tech Leaders', 'category': 'Equity', 'description': 'Curated basket of high-conviction AI infrastructure and platform leaders.', 'min_investment': '$50,000'},
                {'title': 'Digital Asset Yield', 'category': 'Crypto', 'description': 'Institutional-grade staking and structured yield on core digital assets.', 'min_investment': '$25,000'},
                {'title': 'Emerging Markets Debt', 'category': 'Fixed Income', 'description': 'Selective EM sovereign and corporate debt with hedged currency exposure.', 'min_investment': '$75,000'},
                {'title': 'Prime Commercial RE', 'category': 'Real Estate', 'description': 'Income-focused exposure to prime logistics and data-centre real estate.', 'min_investment': '$100,000'},
            ],
            'alerts': [
                {'title': 'Portfolio review scheduled — May 28', 'date': 'Today', 'type': 'info'},
                {'title': 'BTC allocation above target band', 'date': 'May 26', 'type': 'warning'},
            ],
            'currency': {'from': 'USD', 'to': 'UGX', 'from_amount': 1000, 'to_amount': 3662000, 'rate': '1 USD = 3,662 UGX'},
            'save_snapshot': True,
        }

        profile, _ = InvestorProfile.objects.update_or_create(
            user=demo_user,
            defaults={
                'full_name': 'Faisal Khan',
                'phone': '+256700000001',
                'investor_type': 'hnwi',
                'portal_enabled': True,
                'total_invested': 2150000,
                'admin_notes': 'Demo account for investor portal testing.',
            },
        )
        sync_portfolio_data(profile, demo_portfolio)

        from apps.investors.models import PortfolioSnapshot
        from datetime import date
        from decimal import Decimal

        month_values = [2700000, 2720000, 2750000, 2780000, 2810000, 2850750]
        today = date.today()
        for offset, value in enumerate(reversed(month_values)):
            month_index = len(month_values) - 1 - offset
            snapshot_date = date(today.year, max(1, today.month - month_index), 1)
            invested = Decimal('2150000')
            PortfolioSnapshot.objects.update_or_create(
                investor=profile,
                as_of_date=snapshot_date,
                defaults={
                    'net_worth': Decimal(str(value)),
                    'total_invested': invested,
                    'total_returns': Decimal(str(value)) - invested,
                    'flex_funds': Decimal('154000'),
                },
            )

        self.stdout.write(self.style.SUCCESS('Site data seeded successfully.'))
