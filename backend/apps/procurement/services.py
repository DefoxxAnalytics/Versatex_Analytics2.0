"""
Business logic for procurement data processing
"""
import pandas as pd
import uuid
from datetime import datetime
from django.db import transaction
from django.utils import timezone
from .models import Supplier, Category, Transaction, DataUpload


class CSVProcessor:
    """
    Process CSV files and import procurement data
    """
    
    REQUIRED_COLUMNS = ['supplier', 'category', 'amount', 'date']
    OPTIONAL_COLUMNS = [
        'description', 'subcategory', 'location', 'fiscal_year',
        'spend_band', 'payment_method', 'invoice_number'
    ]
    
    def __init__(self, organization, user, file, skip_duplicates=True):
        self.organization = organization
        self.user = user
        self.file = file
        self.skip_duplicates = skip_duplicates
        self.batch_id = str(uuid.uuid4())
        self.errors = []
        self.stats = {
            'total': 0,
            'successful': 0,
            'failed': 0,
            'duplicates': 0
        }
    
    def process(self):
        """
        Main processing method
        Returns: DataUpload instance
        """
        # Create upload record
        upload = DataUpload.objects.create(
            organization=self.organization,
            uploaded_by=self.user,
            file_name=self.file.name,
            file_size=self.file.size,
            batch_id=self.batch_id,
            status='processing'
        )
        
        try:
            # Read CSV
            df = pd.read_csv(self.file)
            self.stats['total'] = len(df)
            
            # Validate columns
            self._validate_columns(df)
            
            # Process rows
            self._process_rows(df)
            
            # Update upload record
            upload.total_rows = self.stats['total']
            upload.successful_rows = self.stats['successful']
            upload.failed_rows = self.stats['failed']
            upload.duplicate_rows = self.stats['duplicates']
            upload.error_log = self.errors
            upload.completed_at = timezone.now()
            
            if self.stats['failed'] == 0:
                upload.status = 'completed'
            elif self.stats['successful'] > 0:
                upload.status = 'partial'
            else:
                upload.status = 'failed'
            
            upload.save()
            
        except Exception as e:
            upload.status = 'failed'
            upload.error_log = [{'error': str(e)}]
            upload.completed_at = timezone.now()
            upload.save()
            raise
        
        return upload
    
    def _validate_columns(self, df):
        """Validate required columns exist"""
        missing = [col for col in self.REQUIRED_COLUMNS if col not in df.columns]
        if missing:
            raise ValueError(f"Missing required columns: {', '.join(missing)}")
    
    def _process_rows(self, df):
        """Process each row in the dataframe"""
        for index, row in df.iterrows():
            try:
                self._process_row(row, index)
                self.stats['successful'] += 1
            except Exception as e:
                self.stats['failed'] += 1
                self.errors.append({
                    'row': index + 2,  # +2 for header and 0-indexing
                    'error': str(e),
                    'data': row.to_dict()
                })
    
    @transaction.atomic
    def _process_row(self, row, index):
        """Process a single row"""
        # Get or create supplier
        supplier, _ = Supplier.objects.get_or_create(
            organization=self.organization,
            name=str(row['supplier']).strip(),
            defaults={'is_active': True}
        )
        
        # Get or create category
        category, _ = Category.objects.get_or_create(
            organization=self.organization,
            name=str(row['category']).strip(),
            defaults={'is_active': True}
        )
        
        # Parse date
        date = pd.to_datetime(row['date']).date()
        
        # Parse amount
        amount = float(str(row['amount']).replace(',', '').replace('$', ''))
        
        # Check for duplicates
        if self.skip_duplicates:
            exists = Transaction.objects.filter(
                organization=self.organization,
                supplier=supplier,
                category=category,
                amount=amount,
                date=date
            ).exists()
            
            if exists:
                self.stats['duplicates'] += 1
                return
        
        # Create transaction
        transaction_data = {
            'organization': self.organization,
            'uploaded_by': self.user,
            'supplier': supplier,
            'category': category,
            'amount': amount,
            'date': date,
            'upload_batch': self.batch_id
        }
        
        # Add optional fields
        for col in self.OPTIONAL_COLUMNS:
            if col in row and pd.notna(row[col]):
                transaction_data[col] = str(row[col]).strip()
        
        Transaction.objects.create(**transaction_data)


def get_duplicate_transactions(organization, days=30):
    """
    Find potential duplicate transactions
    """
    from django.db.models import Count
    from datetime import timedelta
    
    cutoff_date = timezone.now().date() - timedelta(days=days)
    
    duplicates = Transaction.objects.filter(
        organization=organization,
        date__gte=cutoff_date
    ).values(
        'supplier', 'category', 'amount', 'date'
    ).annotate(
        count=Count('id')
    ).filter(count__gt=1)
    
    return duplicates


def bulk_delete_transactions(organization, transaction_ids):
    """
    Bulk delete transactions for an organization
    """
    return Transaction.objects.filter(
        organization=organization,
        id__in=transaction_ids
    ).delete()


def export_transactions_to_csv(organization, filters=None):
    """
    Export transactions to CSV format
    """
    queryset = Transaction.objects.filter(organization=organization)
    
    if filters:
        if 'start_date' in filters:
            queryset = queryset.filter(date__gte=filters['start_date'])
        if 'end_date' in filters:
            queryset = queryset.filter(date__lte=filters['end_date'])
        if 'supplier' in filters:
            queryset = queryset.filter(supplier_id=filters['supplier'])
        if 'category' in filters:
            queryset = queryset.filter(category_id=filters['category'])
    
    # Convert to dataframe
    data = queryset.values(
        'supplier__name', 'category__name', 'amount', 'date',
        'description', 'subcategory', 'location', 'fiscal_year',
        'spend_band', 'payment_method', 'invoice_number'
    )
    
    df = pd.DataFrame(data)
    
    # Rename columns
    df.columns = [
        'Supplier', 'Category', 'Amount', 'Date',
        'Description', 'Subcategory', 'Location', 'Fiscal Year',
        'Spend Band', 'Payment Method', 'Invoice Number'
    ]
    
    return df
