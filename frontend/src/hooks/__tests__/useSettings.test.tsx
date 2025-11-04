import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSettings, useUpdateSettings } from '../useSettings';
import React from 'react';

/**
 * Test suite for Settings hooks
 * Validates settings management, persistence, and updates
 */

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useSettings Hook', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should return default settings when no saved settings exist', async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Check default values
      expect(result.current.data?.theme).toBe('light');
      expect(result.current.data?.notifications).toBe(true);
      expect(result.current.data?.exportFormat).toBe('csv');
    });

    it('should load saved settings from localStorage', async () => {
      // Pre-populate localStorage
      const savedSettings = {
        theme: 'dark',
        notifications: false,
        exportFormat: 'xlsx',
        userName: 'John Doe',
        userEmail: 'john@example.com',
      };
      localStorage.setItem('user-settings', JSON.stringify(savedSettings));

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.theme).toBe('dark');
      expect(result.current.data?.notifications).toBe(false);
      expect(result.current.data?.exportFormat).toBe('xlsx');
      expect(result.current.data?.userName).toBe('John Doe');
    });
  });

  describe('Settings Updates', () => {
    it('should update settings and persist to localStorage', async () => {
      const { result: settingsResult } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });
      const { result: updateResult } = renderHook(() => useUpdateSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(settingsResult.current.data).toBeDefined();
      });

      // Update settings
      act(() => {
        updateResult.current.mutate({
          theme: 'dark',
          userName: 'Jane Smith',
        });
      });

      await waitFor(() => {
        expect(updateResult.current.isSuccess).toBe(true);
      });

      // Check localStorage
      const saved = localStorage.getItem('user-settings');
      expect(saved).toBeTruthy();
      const parsed = JSON.parse(saved!);
      expect(parsed.theme).toBe('dark');
      expect(parsed.userName).toBe('Jane Smith');
    });

    it('should merge partial updates with existing settings', async () => {
      // Set initial settings
      const initialSettings = {
        theme: 'light',
        notifications: true,
        exportFormat: 'csv',
        userName: 'John',
      };
      localStorage.setItem('user-settings', JSON.stringify(initialSettings));

      const { result: updateResult } = renderHook(() => useUpdateSettings(), {
        wrapper: createWrapper(),
      });

      // Update only theme
      act(() => {
        updateResult.current.mutate({ theme: 'dark' });
      });

      await waitFor(() => {
        expect(updateResult.current.isSuccess).toBe(true);
      });

      // Check that other settings are preserved
      const saved = JSON.parse(localStorage.getItem('user-settings')!);
      expect(saved.theme).toBe('dark');
      expect(saved.notifications).toBe(true); // Preserved
      expect(saved.exportFormat).toBe('csv'); // Preserved
      expect(saved.userName).toBe('John'); // Preserved
    });
  });

  describe('Validation', () => {
    it('should validate theme values', async () => {
      const { result } = renderHook(() => useUpdateSettings(), {
        wrapper: createWrapper(),
      });

      // Try to set invalid theme
      act(() => {
        result.current.mutate({ theme: 'invalid' as any });
      });

      await waitFor(() => {
        expect(result.current.isError || result.current.isSuccess).toBe(true);
      });

      // Should either reject or default to valid value
      const saved = localStorage.getItem('user-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        expect(['light', 'dark']).toContain(parsed.theme);
      }
    });

    it('should validate export format values', async () => {
      const { result } = renderHook(() => useUpdateSettings(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ exportFormat: 'invalid' as any });
      });

      await waitFor(() => {
        expect(result.current.isError || result.current.isSuccess).toBe(true);
      });

      const saved = localStorage.getItem('user-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        expect(['csv', 'xlsx', 'pdf']).toContain(parsed.exportFormat);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle corrupted localStorage data', async () => {
      // Set invalid JSON
      localStorage.setItem('user-settings', 'invalid-json{');

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Should fall back to defaults
      expect(result.current.data?.theme).toBe('light');
    });

    it('should handle empty updates gracefully', async () => {
      const { result } = renderHook(() => useUpdateSettings(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({});
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should not throw errors
      expect(result.current.isError).toBe(false);
    });
  });
});
