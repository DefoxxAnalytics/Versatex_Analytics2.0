import * as XLSX from 'xlsx';
import { ProcurementRecord, validateProcurementData } from './csvParser';

const REQUIRED_COLUMNS = ['Supplier', 'Category', 'Subcategory', 'Amount', 'Date', 'Location'];

export async function parseExcel(file: File): Promise<ProcurementRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error('Failed to read file');
        }

        // Read the workbook
        const workbook = XLSX.read(data, { type: 'array' });

        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('No sheets found in Excel file');
        }

        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length === 0) {
          resolve([]);
          return;
        }

        // Extract headers and validate
        const headers = jsonData[0] as string[];
        const missingColumns = REQUIRED_COLUMNS.filter(
          (col) => !headers.includes(col)
        );

        if (missingColumns.length > 0) {
          throw new Error(
            `Missing required columns: ${missingColumns.join(', ')}`
          );
        }

        // Get column indices
        const supplierIndex = headers.indexOf('Supplier');
        const categoryIndex = headers.indexOf('Category');
        const subcategoryIndex = headers.indexOf('Subcategory');
        const amountIndex = headers.indexOf('Amount');
        const dateIndex = headers.indexOf('Date');
        const locationIndex = headers.indexOf('Location');
        const yearIndex = headers.indexOf('Year'); // Optional column
        const spendBandIndex = headers.indexOf('SpendBand'); // Optional column

        // Process data rows
        const records: ProcurementRecord[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];

          // Skip empty rows
          if (!row || row.length === 0 || row.every(cell => cell === null || cell === undefined || cell === '')) {
            continue;
          }

          const record: ProcurementRecord = {
            supplier: String(row[supplierIndex] || '').trim(),
            category: String(row[categoryIndex] || '').trim(),
            subcategory: String(row[subcategoryIndex] || 'Unspecified').trim() || 'Unspecified',
            amount: parseFloat(String(row[amountIndex])) || 0,
            date: formatExcelDate(row[dateIndex]),
            location: String(row[locationIndex] || 'Unknown').trim() || 'Unknown',
          };
          
          // Add year if it exists in the dataset
          if (yearIndex !== -1 && row[yearIndex]) {
            const yearValue = parseInt(String(row[yearIndex]));
            if (!isNaN(yearValue)) {
              record.year = yearValue;
            }
          }
          
          // Add spendBand if it exists in the dataset
          if (spendBandIndex !== -1 && row[spendBandIndex]) {
            record.spendBand = String(row[spendBandIndex]).trim();
          }

          validateProcurementData(record);
          records.push(record);
        }

        resolve(records);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Convert Excel date (number or string) to YYYY-MM-DD format
 */
function formatExcelDate(value: any): string {
  if (!value) {
    return '';
  }

  // If it's already a string in the correct format, return it
  if (typeof value === 'string') {
    return value.trim();
  }

  // If it's a number, it's an Excel date serial number
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const year = date.y;
      const month = String(date.m).padStart(2, '0');
      const day = String(date.d).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // Try to parse as a Date object
  const dateObj = new Date(value);
  if (!isNaN(dateObj.getTime())) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return String(value);
}
