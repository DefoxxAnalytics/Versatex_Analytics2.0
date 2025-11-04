/**
 * Custom hooks for analytics data from Django API
 */
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI, procurementAPI } from '@/lib/api';

/**
 * Get overview statistics
 */
export function useOverviewStats() {
  return useQuery({
    queryKey: ['overview'],
    queryFn: async () => {
      const response = await analyticsAPI.getOverview();
      return response.data;
    },
  });
}

/**
 * Get spend by category
 */
export function useSpendByCategory() {
  return useQuery({
    queryKey: ['spend-by-category'],
    queryFn: async () => {
      const response = await analyticsAPI.getSpendByCategory();
      return response.data;
    },
  });
}

/**
 * Get spend by supplier
 */
export function useSpendBySupplier() {
  return useQuery({
    queryKey: ['spend-by-supplier'],
    queryFn: async () => {
      const response = await analyticsAPI.getSpendBySupplier();
      return response.data;
    },
  });
}

/**
 * Get monthly trend
 */
export function useMonthlyTrend(months: number = 12) {
  return useQuery({
    queryKey: ['monthly-trend', months],
    queryFn: async () => {
      const response = await analyticsAPI.getMonthlyTrend(months);
      return response.data;
    },
  });
}

/**
 * Get Pareto analysis
 */
export function useParetoAnalysis() {
  return useQuery({
    queryKey: ['pareto'],
    queryFn: async () => {
      const response = await analyticsAPI.getParetoAnalysis();
      return response.data;
    },
  });
}

/**
 * Get tail spend analysis
 */
export function useTailSpend(threshold: number = 20) {
  return useQuery({
    queryKey: ['tail-spend', threshold],
    queryFn: async () => {
      const response = await analyticsAPI.getTailSpend(threshold);
      return response.data;
    },
  });
}

/**
 * Get spend stratification
 */
export function useStratification() {
  return useQuery({
    queryKey: ['stratification'],
    queryFn: async () => {
      const response = await analyticsAPI.getStratification();
      return response.data;
    },
  });
}

/**
 * Get seasonality analysis
 */
export function useSeasonality() {
  return useQuery({
    queryKey: ['seasonality'],
    queryFn: async () => {
      const response = await analyticsAPI.getSeasonality();
      return response.data;
    },
  });
}

/**
 * Get year over year comparison
 */
export function useYearOverYear() {
  return useQuery({
    queryKey: ['year-over-year'],
    queryFn: async () => {
      const response = await analyticsAPI.getYearOverYear();
      return response.data;
    },
  });
}

/**
 * Get consolidation opportunities
 */
export function useConsolidation() {
  return useQuery({
    queryKey: ['consolidation'],
    queryFn: async () => {
      const response = await analyticsAPI.getConsolidation();
      return response.data;
    },
  });
}

/**
 * Get all transactions
 */
export function useTransactions(params?: any) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: async () => {
      const response = await procurementAPI.getTransactions(params);
      return response.data;
    },
  });
}

/**
 * Get all suppliers
 */
export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await procurementAPI.getSuppliers();
      return response.data;
    },
  });
}

/**
 * Get all categories
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await procurementAPI.getCategories();
      return response.data;
    },
  });
}
