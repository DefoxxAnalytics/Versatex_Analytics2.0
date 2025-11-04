import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { ProcurementRecord } from '@/lib/csvParser';
import { applyFilters } from '@/lib/analytics';
import type { Filters } from './useFilters';
import { saveProcurementData, loadProcurementData, clearProcurementData } from '@/lib/storage';

const QUERY_KEY = ['procurementData'];

/**
 * Hook to access procurement data from global state
 * Returns RAW UNFILTERED data - use this for:
 * - Populating filter options (categories, suppliers, locations, years)
 * - Upload page statistics
 * - Any component that needs to see all data
 * 
 * For filtered data, use useFilteredProcurementData() instead.
 */
export function useProcurementData() {
  return useQuery<ProcurementRecord[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      try {
        return await loadProcurementData();
      } catch (error) {
        console.error('Failed to load data from IndexedDB:', error);
        return [];
      }
    },
    staleTime: Infinity, // Data never becomes stale
    cacheTime: Infinity, // Data never gets garbage collected
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Hook to access FILTERED procurement data
 * Automatically applies active filters from the filter pane
 * 
 * Uses TanStack Query for efficient caching - filtered data is computed once
 * and shared across all components. Cache is invalidated when filters or
 * raw data change.
 * 
 * Use this hook in analysis pages that should respect filter selections:
 * - Overview page
 * - Categories page
 * - Suppliers page
 * - Pareto Analysis page
 * - etc.
 * 
 * Do NOT use this in:
 * - FilterPane (needs raw data to show all options)
 * - Upload page (needs raw data count)
 * 
 * @returns Filtered procurement records based on active filters
 */
export function useFilteredProcurementData() {
  const queryClient = useQueryClient();
  const { data: rawData = [], isLoading: rawLoading, isError: rawError } = useProcurementData();
  
  // Set up event listener to invalidate query when filters change
  useEffect(() => {
    const handleFilterUpdate = () => {
      // Invalidate the filtered data query to trigger re-computation
      queryClient.invalidateQueries(['filteredProcurementData']);
    };
    
    window.addEventListener('filtersUpdated', handleFilterUpdate);
    
    return () => {
      window.removeEventListener('filtersUpdated', handleFilterUpdate);
    };
  }, [queryClient]);
  
  // Use TanStack Query to cache filtered data
  const { data: filteredData = [], isLoading: filterLoading, isError: filterError } = useQuery({
    queryKey: ['filteredProcurementData', rawData.length],
    queryFn: () => {
      // Read filters from localStorage
      try {
        const stored = localStorage.getItem('procurement_filters');
        if (!stored || !rawData || rawData.length === 0) {
          return rawData;
        }
        
        const filters = JSON.parse(stored) as Filters;
        return applyFilters(rawData, filters);
      } catch (error) {
        console.error('Failed to apply filters:', error);
        return rawData;
      }
    },
    staleTime: Infinity, // Data only becomes stale when explicitly invalidated
    cacheTime: Infinity, // Keep in cache indefinitely
    enabled: !rawLoading && !rawError, // Only run when raw data is ready
  });

  return {
    data: filteredData,
    isLoading: rawLoading || filterLoading,
    isError: rawError || filterError,
  };
}

/**
 * Hook to upload new procurement data
 * Replaces existing data and persists to localStorage
 */
export function useUploadData() {
  const queryClient = useQueryClient();

  return useMutation<ProcurementRecord[], Error, ProcurementRecord[]>({
    mutationFn: async (data: ProcurementRecord[]) => {
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid data format');
      }

      // Persist to IndexedDB (supports large datasets)
      await saveProcurementData(data);
      return data;
    },
    onSuccess: (data) => {
      // Update the query cache
      queryClient.setQueryData(QUERY_KEY, data);
      // Invalidate all queries to force re-fetch
      queryClient.invalidateQueries(QUERY_KEY);
      queryClient.invalidateQueries(['filteredProcurementData']);
    },
  });
}

/**
 * Hook to clear all procurement data
 */
export function useClearData() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await clearProcurementData();
    },
    onSuccess: () => {
      // Clear the query cache
      queryClient.setQueryData(QUERY_KEY, []);
    },
  });
}

/**
 * Hook to get summary statistics from procurement data
 */
export function useProcurementStats() {
  const { data = [] } = useProcurementData();

  const totalSpend = data.reduce((sum, record) => sum + record.amount, 0);
  const uniqueSuppliers = new Set(data.map(r => r.supplier)).size;
  const uniqueCategories = new Set(data.map(r => r.category)).size;
  const recordCount = data.length;

  return {
    totalSpend,
    uniqueSuppliers,
    uniqueCategories,
    recordCount,
  };
}
