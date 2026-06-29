SOCIAL_PLATFORMS = [
    {'key': 'linkedin', 'label': 'LinkedIn'},
    {'key': 'twitter', 'label': 'X (Twitter)'},
    {'key': 'instagram', 'label': 'Instagram'},
    {'key': 'facebook', 'label': 'Facebook'},
    {'key': 'youtube', 'label': 'YouTube'},
    {'key': 'tiktok', 'label': 'TikTok'},
    {'key': 'telegram', 'label': 'Telegram'},
    {'key': 'github', 'label': 'GitHub'},
]


def build_default_socials(contact=None, saved=None):
    contact = contact or {}
    saved_map = {item['key']: item for item in (saved or []) if item.get('key')}

    legacy = {
        'linkedin': contact.get('linkedin', ''),
        'twitter': contact.get('twitter', ''),
    }

    socials = []
    for platform in SOCIAL_PLATFORMS:
        key = platform['key']
        existing = saved_map.get(key, {})
        url = existing.get('url') or legacy.get(key, '')
        enabled = existing.get('enabled', bool(url))
        show_in_contact = existing.get('show_in_contact', key == 'linkedin')
        socials.append({
            'key': key,
            'label': platform['label'],
            'url': url,
            'enabled': enabled,
            'show_in_contact': show_in_contact,
        })
    return socials
