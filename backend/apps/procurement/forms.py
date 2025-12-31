"""
Forms for procurement data management in Django Admin
"""
from django import forms
from apps.authentication.models import Organization


class CSVUploadForm(forms.Form):
    """
    Form for CSV file upload in Django Admin.
    Supports organization selection for super admins.
    """
    file = forms.FileField(
        label='CSV File',
        help_text='Required columns: supplier, category, amount, date. Optional: description, subcategory, location, fiscal_year, spend_band, payment_method, invoice_number'
    )

    organization = forms.ModelChoiceField(
        queryset=Organization.objects.filter(is_active=True),
        required=False,
        empty_label='Use my organization (default)',
        help_text='Super admins can select any organization. Leave empty to use your assigned organization.'
    )

    skip_duplicates = forms.BooleanField(
        initial=True,
        required=False,
        label='Skip duplicate records',
        help_text='If checked, duplicate transactions (same supplier, category, amount, date, invoice) will be skipped instead of causing an error.'
    )

    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = user

        # Only show organization selector for superusers
        if user and not user.is_superuser:
            self.fields['organization'].widget = forms.HiddenInput()
            self.fields['organization'].required = False

    def clean_file(self):
        """Validate the uploaded file"""
        file = self.cleaned_data.get('file')

        if file:
            # Check file extension
            if not file.name.lower().endswith('.csv'):
                raise forms.ValidationError('File must have .csv extension')

            # Check file size (50MB max)
            if file.size > 50 * 1024 * 1024:
                raise forms.ValidationError('File size must be less than 50MB')

        return file

    def get_organization(self):
        """Get the target organization for the upload"""
        selected_org = self.cleaned_data.get('organization')

        if selected_org:
            return selected_org

        # Fall back to user's organization
        if self.user and hasattr(self.user, 'profile'):
            return self.user.profile.organization

        return None
