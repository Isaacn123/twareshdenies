from django.conf import settings
from django.http import FileResponse, Http404
from django.shortcuts import redirect
from django.views.decorators.cache import never_cache

DASHBOARD_ROUTES = {
    'login': 'login.html',
    'app': 'app.html',
}


def _serve_static_app(request, folder, path='index.html'):
    root = (settings.BASE_DIR / folder).resolve()
    if not path or path == '/':
        path = 'index.html'
    target = (root / path).resolve()
    if not str(target).startswith(str(root)):
        raise Http404('Invalid path')
    if target.is_dir():
        target = target / 'index.html'
    if not target.exists():
        raise Http404('File not found')
    content_type = 'text/html'
    if path.endswith('.css'):
        content_type = 'text/css'
    elif path.endswith('.js'):
        content_type = 'application/javascript'
    return FileResponse(open(target, 'rb'), content_type=content_type)


@never_cache
def serve_portal_assets(request, path=''):
    return _serve_static_app(request, 'shared-portal', path)


@never_cache
def serve_dashboard(request, path=''):
    path = (path or '').strip('/')
    if path in ('', 'index.html'):
        return redirect('/dashboard/login', permanent=False)
    if path in DASHBOARD_ROUTES:
        path = DASHBOARD_ROUTES[path]
    return _serve_static_app(request, 'dashboard', path)


@never_cache
def serve_investor(request, path='index.html'):
    return _serve_static_app(request, 'investor', path)
