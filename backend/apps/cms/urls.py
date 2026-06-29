from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('admin/sections', views.SectionViewSet, basename='sections')
router.register('admin/submissions', views.ContactSubmissionViewSet, basename='submissions')
router.register('admin/notifications', views.NotificationViewSet, basename='notifications')
router.register('admin/messages', views.MessageViewSet, basename='messages')

urlpatterns = [
    path('site/', views.public_site, name='public-site'),
    path('contact/', views.contact_create, name='contact-create'),
    path('admin/settings/', views.admin_settings, name='admin-settings'),
    path('', include(router.urls)),
]
