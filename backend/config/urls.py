from django.contrib import admin
from django.urls import include, path, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView

from config.dashboard_views import serve_dashboard, serve_investor, serve_portal_assets

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.cms.urls')),
    path('api/', include('apps.investors.urls')),
    path('api/auth/', include('apps.accounts.urls')),
    path('dashboard/', RedirectView.as_view(url='/dashboard/index.html', permanent=False)),
    re_path(r'^dashboard/(?P<path>.*)$', serve_dashboard, name='dashboard'),
    path('investor/', RedirectView.as_view(url='/investor/index.html', permanent=False)),
    re_path(r'^portal-assets/(?P<path>.*)$', serve_portal_assets, name='portal-assets'),
    re_path(r'^investor/(?P<path>.*)$', serve_investor, name='investor-portal'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
