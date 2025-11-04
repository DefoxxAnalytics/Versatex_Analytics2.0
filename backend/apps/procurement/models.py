"""
Procurement data models
"""
from django.db import models
from django.contrib.auth.models import User
from apps.authentication.models import Organization


class Supplier(models.Model):
    """
    Supplier model - organization-scoped
    """
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='suppliers'
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        unique_together = ['organization', 'name']
        indexes = [
            models.Index(fields=['organization', 'name']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.organization.name})"


class Category(models.Model):
    """
    Category model - organization-scoped
    """
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='categories'
    )
    name = models.CharField(max_length=255)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='subcategories'
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Categories'
        unique_together = ['organization', 'name']
        indexes = [
            models.Index(fields=['organization', 'name']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.organization.name})"


class Transaction(models.Model):
    """
    Procurement transaction model - organization-scoped
    """
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_transactions'
    )
    
    # Core fields
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name='transactions'
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='transactions'
    )
    
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    date = models.DateField()
    description = models.TextField(blank=True)
    
    # Optional fields
    subcategory = models.CharField(max_length=255, blank=True)
    location = models.CharField(max_length=255, blank=True)
    fiscal_year = models.IntegerField(null=True, blank=True)
    spend_band = models.CharField(max_length=50, blank=True)
    payment_method = models.CharField(max_length=100, blank=True)
    invoice_number = models.CharField(max_length=100, blank=True)
    
    # Metadata
    upload_batch = models.CharField(max_length=100, blank=True)  # For tracking uploads
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['organization', '-date']),
            models.Index(fields=['organization', 'supplier']),
            models.Index(fields=['organization', 'category']),
            models.Index(fields=['organization', 'fiscal_year']),
            models.Index(fields=['upload_batch']),
        ]
    
    def __str__(self):
        return f"{self.supplier.name} - {self.amount} on {self.date}"


class DataUpload(models.Model):
    """
    Track data upload history
    """
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='data_uploads'
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='data_uploads'
    )
    
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField()  # in bytes
    batch_id = models.CharField(max_length=100, unique=True)
    
    # Statistics
    total_rows = models.IntegerField(default=0)
    successful_rows = models.IntegerField(default=0)
    failed_rows = models.IntegerField(default=0)
    duplicate_rows = models.IntegerField(default=0)
    
    # Status
    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('partial', 'Partially Completed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    error_log = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', '-created_at']),
            models.Index(fields=['batch_id']),
        ]
    
    def __str__(self):
        return f"{self.file_name} - {self.status} ({self.organization.name})"
