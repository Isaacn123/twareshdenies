from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('admin/investors', views.AdminInvestorViewSet, basename='admin-investors')

urlpatterns = [
    path('investor/register/', views.investor_register, name='investor-register'),
    path('investor/me/', views.investor_me, name='investor-me'),
    path('investor/documents/', views.investor_documents, name='investor-documents'),
    path('investor/messages/', views.investor_messages, name='investor-messages'),
    path('admin/investors/<int:investor_pk>/documents/', views.admin_investor_documents, name='admin-investor-documents'),
    path('admin/investors/<int:investor_pk>/documents/<int:pk>/', views.admin_investor_document_detail, name='admin-investor-document-detail'),
    path('', include(router.urls)),
]
