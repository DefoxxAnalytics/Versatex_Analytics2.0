import { describe, it, expect } from 'vitest';
import { parseCSV, validateProcurementData } from '../csvParser';

describe('CSV Parser', () => {
  describe('parseCSV', () => {
    it('should parse a valid CSV file with procurement data', async () => {
      const csvContent = `Supplier,Category,Amount,Date
Acme Corp,Office Supplies,1500.50,2024-01-15
Tech Solutions,IT Services,5000.00,2024-01-20
Office Depot,Office Supplies,750.25,2024-01-22`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const result = await parseCSV(file);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        supplier: 'Acme Corp',
        category: 'Office Supplies',
        amount: 1500.50,
        date: '2024-01-15',
      });
    });

    it('should handle empty CSV files', async () => {
      const csvContent = 'Supplier,Category,Amount,Date';
      const file = new File([csvContent], 'empty.csv', { type: 'text/csv' });
      const result = await parseCSV(file);

      expect(result).toHaveLength(0);
    });

    it('should throw error for invalid CSV structure', async () => {
      const csvContent = 'Invalid,Data\nNo,Headers';
      const file = new File([csvContent], 'invalid.csv', { type: 'text/csv' });

      await expect(parseCSV(file)).rejects.toThrow('Missing required columns');
    });

    it('should convert amount strings to numbers', async () => {
      const csvContent = `Supplier,Category,Amount,Date
Test Supplier,Test Category,2500.75,2024-01-01`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const result = await parseCSV(file);

      expect(typeof result[0].amount).toBe('number');
      expect(result[0].amount).toBe(2500.75);
    });
  });

  describe('validateProcurementData', () => {
    it('should validate correct procurement data', () => {
      const data = {
        supplier: 'Test Corp',
        category: 'Services',
        amount: 1000,
        date: '2024-01-01',
      };

      expect(() => validateProcurementData(data)).not.toThrow();
    });

    it('should throw error for missing supplier', () => {
      const data = {
        supplier: '',
        category: 'Services',
        amount: 1000,
        date: '2024-01-01',
      };

      expect(() => validateProcurementData(data)).toThrow('Supplier is required');
    });

    it('should throw error for invalid amount', () => {
      const data = {
        supplier: 'Test Corp',
        category: 'Services',
        amount: -100,
        date: '2024-01-01',
      };

      expect(() => validateProcurementData(data)).toThrow('Amount must be positive');
    });

    it('should throw error for invalid date format', () => {
      const data = {
        supplier: 'Test Corp',
        category: 'Services',
        amount: 1000,
        date: 'invalid-date',
      };

      expect(() => validateProcurementData(data)).toThrow('Invalid date format');
    });
  });
});
