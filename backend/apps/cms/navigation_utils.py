def is_nav_item_visible(item):
    if not isinstance(item, dict):
        return True
    visible = item.get('visible', True)
    if visible is False:
        return False
    if visible in (0, '0', 'false', 'False'):
        return False
    return True


def public_navigation(navigation):
    """Return navigation with hidden items removed for the public site."""
    if not navigation:
        return {}

    result = dict(navigation)
    result['header'] = [
        item for item in result.get('header', []) if is_nav_item_visible(item)
    ]

    footer_columns = []
    for col in result.get('footer_columns', []):
        if not isinstance(col, dict):
            continue
        if not is_nav_item_visible(col):
            continue
        links = [link for link in col.get('links', []) if is_nav_item_visible(link)]
        if not links:
            continue
        footer_columns.append({**col, 'links': links})
    result['footer_columns'] = footer_columns
    return result
