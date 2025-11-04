import Papa from 'papaparse';

export interface ProcurementRecord {
  supplier: string;
  category: string;
  subcategory: string;
  amount: number;
  date: string;
  location: string;
  year?: number; // Optional: Use if dataset has Year column, otherwise extract from date
  spendBand?: string; // Optional: Use if dataset has SpendBand column (e.g., "25K - 50K")
}

const REQUIRED_COLUMNS = ['Supplier', 'Category', 'Subcategory', 'Amount', 'Date', 'Location'];

export async function parseCSV(file: File): Promise<ProcurementRecord[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          // Validate columns - trim and remove BOM from headers
          const headers = (results.meta.fields || []).map(h => h.replace(/^\uFEFF/, '').trim());
          const missingColumns = REQUIRED_COLUMNS.filter(
            (col) => !headers.includes(col.trim())
          );

          if (missingColumns.length > 0) {
            throw new Error(
              `Missing required columns: ${missingColumns.join(', ')}`
            );
          }

          // Transform and validate data
          const records: ProcurementRecord[] = results.data.map((row: any) => {
            const record: ProcurementRecord = {
              supplier: row.Supplier?.trim() || '',
              category: row.Category?.trim() || '',
              subcategory: row.Subcategory?.trim() || 'Unspecified',
              amount: parseFloat(row.Amount) || 0,
              date: row.Date?.trim() || '',
              location: row.Location?.trim() || 'Unknown',
            };
            
            // Add year if it exists in the dataset
            if (row.Year) {
              const yearValue = parseInt(row.Year);
              if (!isNaN(yearValue)) {
                record.year = yearValue;
              }
            }
            
            // Add spendBand if it exists in the dataset
            if (row.SpendBand) {
              record.spendBand = row.SpendBand.trim();
            }

            validateProcurementData(record);
            return record;
          });

          resolve(records);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      },
    });
  });
}

export function validateProcurementData(data: ProcurementRecord): void {
  if (!data.supplier || data.supplier.trim() === '') {
    throw new Error('Supplier is required');
  }

  if (!data.category || data.category.trim() === '') {
    throw new Error('Category is required');
  }

  // Subcategory and location are optional - use defaults if empty
  // Validation happens in the parser where we set defaults

  if (typeof data.amount !== 'number' || isNaN(data.amount)) {
    throw new Error('Amount must be a valid number');
  }

  if (data.amount < 0) {
    throw new Error('Amount must be positive');
  }

  if (!data.date || data.date.trim() === '') {
    throw new Error('Date is required');
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(data.date)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }

  // Validate that it's a real date
  const parsedDate = new Date(data.date);
  if (isNaN(parsedDate.getTime())) {
    throw new Error('Invalid date format');
  }
}
