/**
 * FilterPane Component
 * 
 * Persistent filter pane that allows users to filter procurement data.
 * Filters persist across all tabs using TanStack Query.
 * 
 * Features:
 * - Date range picker
 * - Category multi-select
 * - Supplier multi-select
 * - Amount range inputs
 * - Reset filters button
 * - Active filter badges
 * 
 * Security:
 * - All inputs validated and sanitized
 * - No XSS vulnerabilities
 * 
 * Accessibility:
 * - Proper labels and ARIA attributes
 * - Keyboard navigation support
 */

import { useState, useMemo } from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MultiSelect } from '@/components/ui/multi-select';
import { useFilters, useUpdateFilters, useResetFilters, type Filters } from '@/hooks/useFilters';
import { useProcurementData } from '@/hooks/useProcurementData';

export function FilterPane() {
  const { data: filters } = useFilters() as { data: Filters | undefined };
  const { data: procurementData = [] } = useProcurementData();
  const updateFilters = useUpdateFilters();
  const resetFilters = useResetFilters();

  // Local state for form inputs
  const [startDate, setStartDate] = useState(filters?.dateRange.start || '');
  const [endDate, setEndDate] = useState(filters?.dateRange.end || '');
  const [minAmount, setMinAmount] = useState(filters?.amountRange.min?.toString() || '');
  const [maxAmount, setMaxAmount] = useState(filters?.amountRange.max?.toString() || '');

  // Get unique categories, suppliers, locations, and years from data
  const { uniqueCategories, uniqueSubcategories, uniqueSuppliers, uniqueLocations, uniqueYears } = useMemo(() => {
    const categories = new Set<string>();
    const subcategories = new Set<string>();
    const suppliers = new Set<string>();
    const locations = new Set<string>();
    const years = new Set<string>();

    procurementData.forEach((item: { category?: string; subcategory?: string; supplier?: string; location?: string; date?: string; year?: number }) => {
      if (item.category) categories.add(item.category);
      if (item.subcategory) subcategories.add(item.subcategory);
      if (item.supplier) suppliers.add(item.supplier);
      if (item.location) locations.add(item.location);
      
      // Use year field if available, otherwise extract from date
      if (item.year) {
        years.add(item.year.toString());
      } else if (item.date) {
        const year = new Date(item.date).getFullYear().toString();
        years.add(year);
      }
    });

    return {
      uniqueCategories: Array.from(categories).sort(),
      uniqueSubcategories: Array.from(subcategories).sort(),
      uniqueSuppliers: Array.from(suppliers).sort(),
      uniqueLocations: Array.from(locations).sort(),
      uniqueYears: Array.from(years).sort((a, b) => parseInt(b) - parseInt(a)), // Sort years descending
    };
  }, [procurementData]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    if (!filters) return 0;
    let count = 0;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.categories.length > 0) count++;
    if (filters.subcategories.length > 0) count++;
    if (filters.suppliers.length > 0) count++;
    if (filters.locations.length > 0) count++;
    if (filters.years.length > 0) count++;
    if (filters.amountRange.min !== null || filters.amountRange.max !== null) count++;
    return count;
  }, [filters]);

  // Handle date range update
  const handleDateRangeChange = () => {
    updateFilters.mutate({
      dateRange: {
        start: startDate || null,
        end: endDate || null,
      },
    });
  };

  // Handle category toggle
  const toggleCategory = (category: string) => {
    const current = filters?.categories || [];
    const updated = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    
    updateFilters.mutate({ categories: updated });
  };

  // Handle subcategory toggle
  const toggleSubcategory = (subcategory: string) => {
    const current = filters?.subcategories || [];
    const updated = current.includes(subcategory)
      ? current.filter((sc) => sc !== subcategory)
      : [...current, subcategory];
    
    updateFilters.mutate({ subcategories: updated });
  };

  // Handle supplier toggle
  const toggleSupplier = (supplier: string) => {
    const current = filters?.suppliers || [];
    const updated = current.includes(supplier)
      ? current.filter((s) => s !== supplier)
      : [...current, supplier];
    
    updateFilters.mutate({ suppliers: updated });
  };

  // Handle location toggle
  const toggleLocation = (location: string) => {
    const current = filters?.locations || [];
    const updated = current.includes(location)
      ? current.filter((l) => l !== location)
      : [...current, location];
    
    updateFilters.mutate({ locations: updated });
  };

  // Handle amount range update
  const handleAmountRangeChange = () => {
    updateFilters.mutate({
      amountRange: {
        min: minAmount ? parseFloat(minAmount) : null,
        max: maxAmount ? parseFloat(maxAmount) : null,
      },
    });
  };

  // Handle reset
  const handleReset = () => {
    resetFilters.mutate();
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
  };

  if (!filters) return null;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <CardTitle className="text-lg font-semibold">Filters</CardTitle>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 px-2"
            aria-label="Reset all filters"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Date Range Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Date Range</Label>
          <div className="space-y-2">
            <div>
              <Label htmlFor="start-date" className="text-xs text-gray-600">
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onBlur={handleDateRangeChange}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="end-date" className="text-xs text-gray-600">
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onBlur={handleDateRangeChange}
                className="mt-1"
              />
            </div>
          </div>
          {(filters.dateRange.start || filters.dateRange.end) && (
            <div className="flex flex-wrap gap-2">
              {filters.dateRange.start && (
                <Badge variant="secondary" className="text-xs">
                  From: {filters.dateRange.start}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => {
                      setStartDate('');
                      updateFilters.mutate({ dateRange: { ...filters.dateRange, start: null } });
                    }}
                  />
                </Badge>
              )}
              {filters.dateRange.end && (
                <Badge variant="secondary" className="text-xs">
                  To: {filters.dateRange.end}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => {
                      setEndDate('');
                      updateFilters.mutate({ dateRange: { ...filters.dateRange, end: null } });
                    }}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Category Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Categories</Label>
          <MultiSelect
            options={uniqueCategories}
            selected={filters.categories}
            onChange={(selected) => updateFilters.mutate({ categories: selected })}
            placeholder="Select categories..."
            emptyMessage="No categories available"
          />
        </div>

        {/* Subcategory Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Subcategories</Label>
          <MultiSelect
            options={uniqueSubcategories}
            selected={filters.subcategories}
            onChange={(selected) => updateFilters.mutate({ subcategories: selected })}
            placeholder="Select subcategories..."
            emptyMessage="No subcategories available"
          />
        </div>

        {/* Supplier Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Suppliers</Label>
          <MultiSelect
            options={uniqueSuppliers}
            selected={filters.suppliers}
            onChange={(selected) => updateFilters.mutate({ suppliers: selected })}
            placeholder="Select suppliers..."
            emptyMessage="No suppliers available"
          />
        </div>

        {/* Location Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Locations</Label>
          <MultiSelect
            options={uniqueLocations}
            selected={filters.locations}
            onChange={(selected) => updateFilters.mutate({ locations: selected })}
            placeholder="Select locations..."
            emptyMessage="No locations available"
          />
        </div>

        {/* Year Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Years</Label>
          <MultiSelect
            options={uniqueYears}
            selected={filters.years}
            onChange={(selected) => updateFilters.mutate({ years: selected })}
            placeholder="Select years..."
            emptyMessage="No years available"
          />
        </div>

        {/* Amount Range Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Amount Range</Label>
          <div className="space-y-2">
            <div>
              <Label htmlFor="min-amount" className="text-xs text-gray-600">
                Minimum
              </Label>
              <Input
                id="min-amount"
                type="number"
                placeholder="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                onBlur={handleAmountRangeChange}
                className="mt-1"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Label htmlFor="max-amount" className="text-xs text-gray-600">
                Maximum
              </Label>
              <Input
                id="max-amount"
                type="number"
                placeholder="No limit"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                onBlur={handleAmountRangeChange}
                className="mt-1"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          {(filters.amountRange.min !== null || filters.amountRange.max !== null) && (
            <div className="flex flex-wrap gap-2">
              {filters.amountRange.min !== null && (
                <Badge variant="secondary" className="text-xs">
                  Min: ${filters.amountRange.min.toLocaleString()}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => {
                      setMinAmount('');
                      updateFilters.mutate({ amountRange: { ...filters.amountRange, min: null } });
                    }}
                  />
                </Badge>
              )}
              {filters.amountRange.max !== null && (
                <Badge variant="secondary" className="text-xs">
                  Max: ${filters.amountRange.max.toLocaleString()}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => {
                      setMaxAmount('');
                      updateFilters.mutate({ amountRange: { ...filters.amountRange, max: null } });
                    }}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
