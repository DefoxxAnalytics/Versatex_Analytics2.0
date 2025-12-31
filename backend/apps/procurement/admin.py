"""
Django admin configuration for procurement with CSV upload functionality
"""
from django.contrib import admin
from django.urls import path
from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.utils.html import format_html

from .models import Supplier, Category, Transaction, DataUpload
from .forms import CSVUploadForm
from .services import CSVProcessor
from apps.authentication.utils import log_action


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'code', 'is_active', 'created_at']
    list_filter = ['is_active', 'organization', 'created_at']
    search_fields = ['name', 'code', 'contact_email']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, 'profile'):
            return qs.filter(organization=request.user.profile.organization)
        return qs.none()


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'parent', 'is_active', 'created_at']
    list_filter = ['is_active', 'organization', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, 'profile'):
            return qs.filter(organization=request.user.profile.organization)
        return qs.none()


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['date', 'supplier', 'category', 'amount', 'organization', 'uploaded_by']
    list_filter = ['organization', 'date', 'fiscal_year', 'supplier', 'category']
    search_fields = ['description', 'invoice_number', 'supplier__name', 'category__name']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'date'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, 'profile'):
            return qs.filter(organization=request.user.profile.organization)
        return qs.none()


@admin.register(DataUpload)
class DataUploadAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'organization', 'uploaded_by', 'status_badge', 'successful_rows', 'failed_rows', 'duplicate_rows', 'created_at']
    list_filter = ['status', 'organization', 'created_at']
    search_fields = ['file_name', 'batch_id']
    readonly_fields = ['file_name', 'file_size', 'batch_id', 'total_rows', 'successful_rows',
                       'failed_rows', 'duplicate_rows', 'status', 'error_log', 'uploaded_by',
                       'organization', 'created_at', 'completed_at']
    ordering = ['-created_at']
    change_list_template = 'admin/procurement/dataupload/change_list.html'

    def status_badge(self, obj):
        """Display status with color-coded badge"""
        colors = {
            'processing': '#f59e0b',  # amber
            'completed': '#10b981',   # green
            'failed': '#ef4444',      # red
            'partial': '#6366f1',     # indigo
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 4px; font-size: 11px; font-weight: 600;">{}</span>',
            color, obj.status.upper()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                'upload-csv/',
                self.admin_site.admin_view(self.upload_csv_view),
                name='procurement_dataupload_upload_csv'
            ),
        ]
        return custom_urls + urls

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, 'profile'):
            return qs.filter(organization=request.user.profile.organization)
        return qs.none()

    def has_add_permission(self, request):
        """Disable the default add - use the upload CSV view instead"""
        return False

    def has_change_permission(self, request, obj=None):
        """Uploads are read-only"""
        return False

    def has_delete_permission(self, request, obj=None):
        """Allow superusers to delete uploads"""
        return request.user.is_superuser

    @method_decorator(staff_member_required)
    def upload_csv_view(self, request):
        """Custom view for CSV upload"""
        # Check permission - only admin/manager roles or superuser
        if not request.user.is_superuser:
            if not hasattr(request.user, 'profile'):
                messages.error(request, 'You do not have a user profile. Contact an administrator.')
                return redirect('..')
            if request.user.profile.role not in ['admin', 'manager']:
                messages.error(request, 'Only Admins and Managers can upload data.')
                return redirect('..')

        if request.method == 'POST':
            form = CSVUploadForm(request.POST, request.FILES, user=request.user)
            if form.is_valid():
                try:
                    organization = form.get_organization()
                    if not organization:
                        messages.error(request, 'Could not determine target organization.')
                        return redirect('.')

                    # Check if super admin is doing multi-org upload
                    is_super_admin = request.user.is_superuser

                    processor = CSVProcessor(
                        organization=organization,
                        user=request.user,
                        file=form.cleaned_data['file'],
                        skip_duplicates=form.cleaned_data.get('skip_duplicates', True),
                        allow_multi_org=is_super_admin
                    )

                    upload = processor.process()

                    # Build audit details
                    audit_details = {
                        'file_name': upload.file_name,
                        'successful': upload.successful_rows,
                        'failed': upload.failed_rows,
                        'duplicates': upload.duplicate_rows
                    }

                    # Include affected organizations for super admin multi-org uploads
                    if is_super_admin and len(processor.orgs_affected) > 0:
                        audit_details['organizations_affected'] = list(processor.orgs_affected)

                    log_action(
                        user=request.user,
                        action='upload',
                        resource='transactions',
                        resource_id=upload.batch_id,
                        details=audit_details,
                        request=request
                    )

                    # Success message with details
                    if upload.status == 'completed':
                        messages.success(
                            request,
                            f'Successfully uploaded {upload.successful_rows} transactions from "{upload.file_name}".'
                        )
                    elif upload.status == 'partial':
                        messages.warning(
                            request,
                            f'Uploaded {upload.successful_rows} transactions, '
                            f'{upload.failed_rows} failed, {upload.duplicate_rows} duplicates skipped.'
                        )
                    else:
                        messages.error(
                            request,
                            f'Upload failed. {upload.failed_rows} rows had errors.'
                        )

                    return redirect('..')

                except ValueError as e:
                    messages.error(request, f'Upload error: {str(e)}')
                except Exception as e:
                    messages.error(request, f'Unexpected error: {str(e)}')
        else:
            form = CSVUploadForm(user=request.user)

        context = {
            **self.admin_site.each_context(request),
            'title': 'Upload CSV Data',
            'form': form,
            'opts': self.model._meta,
            'has_view_permission': self.has_view_permission(request),
        }

        return render(request, 'admin/procurement/dataupload/upload_csv.html', context)
