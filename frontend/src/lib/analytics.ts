import type { ProcurementRecord } from '../hooks/useProcurementData';
import type { Filters } from '../hooks/useFilters';

/**
 * Analytics utilities for procurement data
 * 
 * Provides functions for calculating statistics, aggregations, and insights
 * from procurement records. All functions are pure and side-effect free.
 * 
 * Security: All inputs are validated, no eval() or unsafe operations
 * Performance: Optimized for large datasets with efficient algorithms
 */

/**
 * Calculate total spend across all records
 * 
 * @param data - Array of procurement records
 * @returns Total spend amount
 * 
 * @example
 * ```ts
 * const total = calculateTotalSpend(records);
 * console.log(`Total: $${total.toLocaleString()}`);
 * ```
 */
export function calculateTotalSpend(data: ProcurementRecord[]): number {
  if (!data || data.length === 0) return 0;
  
  return data.reduce((sum, record) => {
    // Validate amount is a number
    const amount = typeof record.amount === 'number' ? record.amount : 0;
    return sum + amount;
  }, 0);
}

/**
 * Count unique suppliers in the dataset
 * 
 * @param data - Array of procurement records
 * @returns Number of unique suppliers
 */
export function calculateSupplierCount(data: ProcurementRecord[]): number {
  if (!data || data.length === 0) return 0;
  
  const uniqueSuppliers = new Set(
    data.map(record => record.supplier?.trim()).filter(Boolean)
  );
  
  return uniqueSuppliers.size;
}

/**
 * Count unique categories in the dataset
 * 
 * @param data - Array of procurement records
 * @returns Number of unique categories
 */
export function calculateCategoryCount(data: ProcurementRecord[]): number {
  if (!data || data.length === 0) return 0;
  
  const uniqueCategories = new Set(
    data.map(record => record.category?.trim()).filter(Boolean)
  );
  
  return uniqueCategories.size;
}

/**
 * Calculate average transaction amount
 * 
 * @param data - Array of procurement records
 * @returns Average amount, rounded to 2 decimal places
 */
export function calculateAverageTransaction(data: ProcurementRecord[]): number {
  if (!data || data.length === 0) return 0;
  
  const total = calculateTotalSpend(data);
  const average = total / data.length;
  
  // Round to 2 decimal places
  return Math.round(average * 100) / 100;
}

/**
 * Supplier spend summary
 */
export interface SupplierSummary {
  supplier: string;
  totalSpend: number;
  transactionCount: number;
}

/**
 * Get top suppliers by total spend
 * 
 * @param data - Array of procurement records
 * @param limit - Maximum number of suppliers to return
 * @returns Array of supplier summaries, sorted by spend descending
 */
export function getTopSuppliers(
  data: ProcurementRecord[],
  limit: number = 10
): SupplierSummary[] {
  if (!data || data.length === 0) return [];
  
  // Group by supplier
  const supplierMap = new Map<string, { totalSpend: number; count: number }>();
  
  data.forEach(record => {
    const supplier = record.supplier?.trim();
    if (!supplier) return;
    
    const current = supplierMap.get(supplier) || { totalSpend: 0, count: 0 };
    supplierMap.set(supplier, {
      totalSpend: current.totalSpend + (record.amount || 0),
      count: current.count + 1,
    });
  });
  
  // Convert to array and sort
  const suppliers: SupplierSummary[] = Array.from(supplierMap.entries()).map(
    ([supplier, data]) => ({
      supplier,
      totalSpend: data.totalSpend,
      transactionCount: data.count,
    })
  );
  
  return suppliers
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, limit);
}

/**
 * Category spend summary
 */
export interface CategorySummary {
  category: string;
  totalSpend: number;
  transactionCount: number;
  percentage: number;
}

/**
 * Get spend grouped by category
 * 
 * @param data - Array of procurement records
 * @returns Array of category summaries with percentages
 */
export function getSpendByCategory(data: ProcurementRecord[]): CategorySummary[] {
  if (!data || data.length === 0) return [];
  
  const totalSpend = calculateTotalSpend(data);
  if (totalSpend === 0) return [];
  
  // Group by category
  const categoryMap = new Map<string, { totalSpend: number; count: number }>();
  
  data.forEach(record => {
    const category = record.category?.trim();
    if (!category) return;
    
    const current = categoryMap.get(category) || { totalSpend: 0, count: 0 };
    categoryMap.set(category, {
      totalSpend: current.totalSpend + (record.amount || 0),
      count: current.count + 1,
    });
  });
  
  // Convert to array with percentages
  const categories: CategorySummary[] = Array.from(categoryMap.entries()).map(
    ([category, data]) => ({
      category,
      totalSpend: data.totalSpend,
      transactionCount: data.count,
      percentage: Math.round((data.totalSpend / totalSpend) * 10000) / 100,
    })
  );
  
  return categories.sort((a, b) => b.totalSpend - a.totalSpend);
}

/**
 * Get the largest single transaction
 * 
 * @param data - Array of procurement records
 * @returns The record with the highest amount, or null if empty
 */
export function getLargestTransaction(
  data: ProcurementRecord[]
): ProcurementRecord | null {
  if (!data || data.length === 0) return null;
  
  return data.reduce((largest, current) => {
    return (current.amount || 0) > (largest.amount || 0) ? current : largest;
  });
}

/**
 * Supplier frequency summary
 */
export interface SupplierFrequency {
  supplier: string;
  count: number;
}

/**
 * Get the most frequent supplier (by transaction count)
 * 
 * @param data - Array of procurement records
 * @returns Supplier with most transactions, or null if empty
 */
export function getMostFrequentSupplier(
  data: ProcurementRecord[]
): SupplierFrequency | null {
  if (!data || data.length === 0) return null;
  
  // Count transactions per supplier
  const supplierCounts = new Map<string, number>();
  
  data.forEach(record => {
    const supplier = record.supplier?.trim();
    if (!supplier) return;
    
    supplierCounts.set(supplier, (supplierCounts.get(supplier) || 0) + 1);
  });
  
  if (supplierCounts.size === 0) return null;
  
  // Find supplier with max count
  let maxSupplier: string | null = null;
  let maxCount = 0;
  
  supplierCounts.forEach((count, supplier) => {
    if (count > maxCount) {
      maxCount = count;
      maxSupplier = supplier;
    }
  });
  
  return maxSupplier ? { supplier: maxSupplier, count: maxCount } : null;
}

/**
 * Get the category with highest total spend
 * 
 * @param data - Array of procurement records
 * @returns Category summary with highest spend, or null if empty
 */
export function getHighestSpendingCategory(
  data: ProcurementRecord[]
): CategorySummary | null {
  const categories = getSpendByCategory(data);
  return categories.length > 0 ? categories[0] : null;
}

/**
 * Apply filters to procurement data
 * 
 * Filters data based on date range, categories, suppliers, and amount range.
 * All filters are applied with AND logic (all conditions must match).
 * 
 * @param data - Array of procurement records to filter
 * @param filters - Filter criteria to apply
 * @returns Filtered array of procurement records
 * 
 * Security:
 * - All inputs are validated
 * - No XSS vulnerabilities (React handles escaping)
 * - Safe string comparisons (case-sensitive)
 * 
 * Performance:
 * - Single pass through data (O(n))
 * - Early returns for empty data
 * - Efficient Set lookups for categories/suppliers
 * 
 * @example
 * ```ts
 * const filters = {
 *   dateRange: { start: '2024-01-01', end: '2024-12-31' },
 *   categories: ['IT Equipment'],
 *   suppliers: [],
 *   amountRange: { min: 1000, max: null }
 * };
 * const filtered = applyFilters(data, filters);
 * ```
 */
export function applyFilters(
  data: ProcurementRecord[],
  filters: Filters
): ProcurementRecord[] {
  // Validate inputs
  if (!data || data.length === 0) return [];
  if (!filters) return data;

  // Return all data if no filters are active
  const hasDateFilter = filters.dateRange.start !== null || filters.dateRange.end !== null;
  const hasCategoryFilter = filters.categories.length > 0;
  const hasSubcategoryFilter = filters.subcategories.length > 0;
  const hasSupplierFilter = filters.suppliers.length > 0;
  const hasLocationFilter = filters.locations.length > 0;
  const hasYearFilter = filters.years.length > 0;
  const hasAmountFilter = filters.amountRange.min !== null || filters.amountRange.max !== null;

  if (!hasDateFilter && !hasCategoryFilter && !hasSubcategoryFilter && !hasSupplierFilter && !hasLocationFilter && !hasYearFilter && !hasAmountFilter) {
    return data;
  }

  // Convert arrays to Sets for O(1) lookups
  const categorySet = new Set(filters.categories);
  const subcategorySet = new Set(filters.subcategories);
  const supplierSet = new Set(filters.suppliers);
  const locationSet = new Set(filters.locations);
  const yearSet = new Set(filters.years);

  // Filter data with a single pass
  return data.filter(record => {
    // Date range filter
    if (hasDateFilter) {
      const recordDate = record.date;
      
      if (filters.dateRange.start && recordDate < filters.dateRange.start) {
        return false;
      }
      
      if (filters.dateRange.end && recordDate > filters.dateRange.end) {
        return false;
      }
    }

    // Category filter
    if (hasCategoryFilter && !categorySet.has(record.category)) {
      return false;
    }

    // Subcategory filter
    if (hasSubcategoryFilter && !subcategorySet.has(record.subcategory)) {
      return false;
    }

    // Supplier filter
    if (hasSupplierFilter && !supplierSet.has(record.supplier)) {
      return false;
    }

    // Location filter
    if (hasLocationFilter && !locationSet.has(record.location)) {
      return false;
    }

    // Year filter - use year field if available, otherwise extract from date
    if (hasYearFilter) {
      const recordYear = record.year?.toString() || new Date(record.date).getFullYear().toString();
      if (!yearSet.has(recordYear)) {
        return false;
      }
    }

    // Amount range filter
    if (hasAmountFilter) {
      const amount = record.amount;
      
      if (filters.amountRange.min !== null && amount < filters.amountRange.min) {
        return false;
      }
      
      if (filters.amountRange.max !== null && amount > filters.amountRange.max) {
        return false;
      }
    }

    // All filters passed
    return true;
  });
}
