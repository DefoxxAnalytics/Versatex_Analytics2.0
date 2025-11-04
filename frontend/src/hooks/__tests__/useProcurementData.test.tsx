import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProcurementData, useUploadData, useClearData } from '../useProcurementData';
import type { ProcurementRecord } from '@/lib/csvParser';

// Create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useProcurementData', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should return empty array initially', async () => {
    const { result } = renderHook(() => useProcurementData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should load data from localStorage if available', async () => {
    const mockData: ProcurementRecord[] = [
      {
        supplier: 'Test Corp',
        category: 'Services',
        subcategory: 'Consulting',
        amount: 1000,
        date: '2024-01-01',
        location: 'NY',
      },
    ];

    localStorage.setItem('procurementData', JSON.stringify(mockData));

    const { result } = renderHook(() => useProcurementData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });
  });

  it('should persist data across hook re-renders', async () => {
    const mockData: ProcurementRecord[] = [
      {
        supplier: 'Test Corp',
        category: 'Services',
        subcategory: 'Consulting',
        amount: 1000,
        date: '2024-01-01',
        location: 'NY',
      },
    ];

    localStorage.setItem('procurementData', JSON.stringify(mockData));

    const { result, rerender } = renderHook(() => useProcurementData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    // Re-render the hook
    rerender();

    // Data should still be available
    expect(result.current.data).toEqual(mockData);
  });
});

describe('useUploadData', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should upload and persist data', async () => {
    const wrapper = createWrapper();
    const { result: uploadResult } = renderHook(() => useUploadData(), { wrapper });
    const { result: dataResult } = renderHook(() => useProcurementData(), { wrapper });

    const newData: ProcurementRecord[] = [
      {
        supplier: 'New Corp',
        category: 'Products',
        subcategory: 'Hardware',
        amount: 2000,
        date: '2024-01-15',
        location: 'CA',
      },
    ];

    // Upload data
    uploadResult.current.mutate(newData);

    await waitFor(() => {
      expect(uploadResult.current.isSuccess).toBe(true);
    });

    // Verify data is persisted
    await waitFor(() => {
      expect(dataResult.current.data).toEqual(newData);
    });

    // Verify localStorage
    const stored = localStorage.getItem('procurementData');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toEqual(newData);
  });

  it('should handle upload errors gracefully', async () => {
    const { result } = renderHook(() => useUploadData(), {
      wrapper: createWrapper(),
    });

    // Try to upload invalid data (null)
    result.current.mutate(null as any);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useClearData', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should clear all data', async () => {
    const mockData: ProcurementRecord[] = [
      {
        supplier: 'Test Corp',
        category: 'Services',
        subcategory: 'Consulting',
        amount: 1000,
        date: '2024-01-01',
        location: 'NY',
      },
    ];

    localStorage.setItem('procurementData', JSON.stringify(mockData));

    const wrapper = createWrapper();
    const { result: clearResult } = renderHook(() => useClearData(), { wrapper });
    const { result: dataResult } = renderHook(() => useProcurementData(), { wrapper });

    // Verify data exists initially
    await waitFor(() => {
      expect(dataResult.current.data).toEqual(mockData);
    });

    // Clear data
    clearResult.current.mutate();

    await waitFor(() => {
      expect(clearResult.current.isSuccess).toBe(true);
    });

    // Verify data is cleared
    await waitFor(() => {
      expect(dataResult.current.data).toEqual([]);
    });

    // Verify localStorage is cleared
    expect(localStorage.getItem('procurementData')).toBeNull();
  });
});

describe('Data statistics', () => {
  it('should calculate total spend correctly', async () => {
    const mockData: ProcurementRecord[] = [
      { supplier: 'A', category: 'X', subcategory: 'X1', amount: 100, date: '2024-01-01', location: 'NY' },
      { supplier: 'B', category: 'Y', subcategory: 'Y1', amount: 200, date: '2024-01-02', location: 'CA' },
      { supplier: 'C', category: 'Z', subcategory: 'Z1', amount: 300, date: '2024-01-03', location: 'TX' },
    ];

    localStorage.setItem('procurementData', JSON.stringify(mockData));

    const { result } = renderHook(() => useProcurementData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(3);
    });

    const totalSpend = result.current.data?.reduce((sum, r) => sum + r.amount, 0);
    expect(totalSpend).toBe(600);
  });

  it('should count unique suppliers correctly', async () => {
    const mockData: ProcurementRecord[] = [
      { supplier: 'A', category: 'X', subcategory: 'X1', amount: 100, date: '2024-01-01', location: 'NY' },
      { supplier: 'A', category: 'Y', subcategory: 'Y1', amount: 200, date: '2024-01-02', location: 'CA' },
      { supplier: 'B', category: 'Z', subcategory: 'Z1', amount: 300, date: '2024-01-03', location: 'TX' },
    ];

    localStorage.setItem('procurementData', JSON.stringify(mockData));

    const { result } = renderHook(() => useProcurementData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(3);
    });

    const uniqueSuppliers = new Set(result.current.data?.map(r => r.supplier)).size;
    expect(uniqueSuppliers).toBe(2);
  });
});
