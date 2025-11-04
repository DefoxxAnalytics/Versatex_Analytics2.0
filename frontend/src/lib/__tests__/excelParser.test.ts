import { describe, it, expect } from 'vitest';
import { parseExcel } from '../excelParser';
import * as XLSX from 'xlsx';

describe('Excel Parser', () => {
  describe('parseExcel', () => {
    it('should parse a valid Excel file with procurement data', async () => {
      // Create a mock Excel file
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['Supplier', 'Category', 'Amount', 'Date'],
        ['Acme Corp', 'Office Supplies', 1500.50, '2024-01-15'],
        ['Tech Solutions', 'IT Services', 5000.00, '2024-01-20'],
        ['Office Depot', 'Office Supplies', 750.25, '2024-01-22'],
      ]);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const file = new File([excelBuffer], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const result = await parseExcel(file);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        supplier: 'Acme Corp',
        category: 'Office Supplies',
        amount: 1500.50,
        date: '2024-01-15',
      });
    });

    it('should handle empty Excel files', async () => {
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['Supplier', 'Category', 'Amount', 'Date'],
      ]);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const file = new File([excelBuffer], 'empty.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const result = await parseExcel(file);

      expect(result).toHaveLength(0);
    });

    it('should throw error for missing required columns', async () => {
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['Supplier', 'Category'], // Missing Amount and Date
        ['Test Corp', 'Services'],
      ]);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const file = new File([excelBuffer], 'invalid.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await expect(parseExcel(file)).rejects.toThrow('Missing required columns');
    });

    it('should handle numeric dates from Excel', async () => {
      // Excel stores dates as numbers (days since 1900-01-01)
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['Supplier', 'Category', 'Amount', 'Date'],
        ['Test Corp', 'Services', 1000, 45292], // Excel date number for 2024-01-01
      ]);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const file = new File([excelBuffer], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const result = await parseExcel(file);

      expect(result).toHaveLength(1);
      expect(result[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should read from the first sheet by default', async () => {
      const worksheet1 = XLSX.utils.aoa_to_sheet([
        ['Supplier', 'Category', 'Amount', 'Date'],
        ['First Sheet Corp', 'Services', 1000, '2024-01-01'],
      ]);

      const worksheet2 = XLSX.utils.aoa_to_sheet([
        ['Supplier', 'Category', 'Amount', 'Date'],
        ['Second Sheet Corp', 'Products', 2000, '2024-01-02'],
      ]);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet1, 'Sheet1');
      XLSX.utils.book_append_sheet(workbook, worksheet2, 'Sheet2');

      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const file = new File([excelBuffer], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const result = await parseExcel(file);

      expect(result).toHaveLength(1);
      expect(result[0].supplier).toBe('First Sheet Corp');
    });
  });
});
