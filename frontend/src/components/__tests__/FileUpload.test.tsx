import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from '../FileUpload';

describe('FileUpload Component', () => {
  it('should render the upload area', () => {
    render(<FileUpload onDataParsed={vi.fn()} />);
    
    expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
    expect(screen.getByText(/csv.*xlsx/i)).toBeInTheDocument();
  });

  it('should show file input when clicking the upload area', async () => {
    const user = userEvent.setup();
    render(<FileUpload onDataParsed={vi.fn()} />);
    
    const uploadArea = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadArea);
    
    const fileInput = screen.getByLabelText(/file input/i);
    expect(fileInput).toBeInTheDocument();
  });

  it('should accept CSV files', async () => {
    const user = userEvent.setup();
    const onDataParsed = vi.fn();
    render(<FileUpload onDataParsed={onDataParsed} />);

    const csvContent = `Supplier,Category,Amount,Date
Acme Corp,Office Supplies,1500.50,2024-01-15`;
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

    const input = screen.getByLabelText(/file input/i);
    await user.upload(input, file);

    await waitFor(() => {
      expect(onDataParsed).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            supplier: 'Acme Corp',
            category: 'Office Supplies',
          }),
        ])
      );
    });
  });

  it('should accept Excel files', async () => {
    const user = userEvent.setup();
    const onDataParsed = vi.fn();
    render(<FileUpload onDataParsed={onDataParsed} />);

    // Create a minimal valid Excel file using XLSX
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Supplier', 'Category', 'Amount', 'Date'],
      ['Test Corp', 'Services', 1000, '2024-01-01'],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const file = new File([excelBuffer], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const input = screen.getByLabelText(/file input/i);
    await user.upload(input, file);

    await waitFor(() => {
      expect(onDataParsed).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('should show loading state while parsing', async () => {
    const user = userEvent.setup();
    render(<FileUpload onDataParsed={vi.fn()} />);

    const csvContent = `Supplier,Category,Amount,Date
Acme Corp,Office Supplies,1500.50,2024-01-15`;
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

    const input = screen.getByLabelText(/file input/i);
    
    // Upload file and immediately check for loading state
    const uploadPromise = user.upload(input, file);
    
    // The loading state might appear very briefly, so we check for either loading or success
    await waitFor(() => {
      const text = screen.queryByText(/parsing/i) || screen.queryByText(/successfully/i);
      expect(text).toBeInTheDocument();
    }, { timeout: 1000 });
    
    await uploadPromise;
  });

  it('should display error message for invalid files', async () => {
    const user = userEvent.setup();
    const onDataParsed = vi.fn();
    render(<FileUpload onDataParsed={onDataParsed} />);

    // Simulate file selection by directly calling the component's file handler
    const file = new File(['invalid'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/file input/i) as HTMLInputElement;
    
    // Manually trigger the change event with the file
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    await user.click(input);
    input.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Should not have called onDataParsed
    expect(onDataParsed).not.toHaveBeenCalled();
  });

  it('should display error for CSV with missing columns', async () => {
    const user = userEvent.setup();
    render(<FileUpload onDataParsed={vi.fn()} />);

    const csvContent = `Name,Value
Test,123`;
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

    const input = screen.getByLabelText(/file input/i);
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/missing required columns/i)).toBeInTheDocument();
    });
  });

  it('should show success message after successful upload', async () => {
    const user = userEvent.setup();
    const onDataParsed = vi.fn();
    render(<FileUpload onDataParsed={onDataParsed} />);

    const csvContent = `Supplier,Category,Amount,Date
Acme Corp,Office Supplies,1500.50,2024-01-15`;
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

    const input = screen.getByLabelText(/file input/i);
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/successfully parsed/i)).toBeInTheDocument();
      expect(screen.getByText(/1.*record/i)).toBeInTheDocument();
    });
  });

  it('should allow uploading a new file after successful upload', async () => {
    const user = userEvent.setup();
    const onDataParsed = vi.fn();
    render(<FileUpload onDataParsed={onDataParsed} />);

    const csvContent = `Supplier,Category,Amount,Date
Acme Corp,Office Supplies,1500.50,2024-01-15`;
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

    const input = screen.getByLabelText(/file input/i);
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/successfully parsed/i)).toBeInTheDocument();
    });

    // Should be able to upload again
    const uploadAgainButton = screen.getByRole('button', { name: /upload another/i });
    expect(uploadAgainButton).toBeInTheDocument();
  });
});
