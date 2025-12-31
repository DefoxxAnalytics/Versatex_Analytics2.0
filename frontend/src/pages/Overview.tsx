/**
 * Overview Page Component
 * 
 * Main dashboard view showing key procurement metrics and statistics.
 * 
 * Features:
 * - Summary statistics cards (total spend, suppliers, categories, avg transaction)
 * - Four interactive charts (category, trend, suppliers, distribution)
 * - Real-time data from TanStack Query
 * - Responsive grid layout
 * - Loading and empty states
 * 
 * Security:
 * - All data validated before display
 * - No XSS vulnerabilities
 * 
 * Performance:
 * - Memoized calculations
 * - Efficient data transformations
 * - Lazy-loaded ECharts
 */

import { useState, useMemo } from 'react';
import { DollarSign, Users, Package, TrendingUp, Filter, ExternalLink } from 'lucide-react';
import { useFilteredProcurementData, type ProcurementRecord } from '@/hooks/useProcurementData';
import { usePermissions } from '@/contexts/PermissionContext';
import { useFilters } from '@/hooks/useFilters';
import { StatCard } from '@/components/StatCard';
import { Chart } from '@/components/Chart';
import { SkeletonCard } from '@/components/SkeletonCard';
import { SkeletonChart } from '@/components/SkeletonChart';
import { DrillDownModal } from '@/components/DrillDownModal';
import {
  calculateTotalSpend,
  calculateSupplierCount,
  calculateCategoryCount,
  calculateAverageTransaction,
  applyFilters,
} from '@/lib/analytics';
import {
  getSpendByCategoryConfig,
  getSpendTrendConfig,
  getTopSuppliersConfig,
  getSpendDistributionConfig,
} from '@/lib/chartConfigs';

// Drill-down state type
interface DrillDownState {
  open: boolean;
  entityType: 'category' | 'supplier' | 'location' | 'year';
  entityName: string;
}

export default function Overview() {
  const { data: filteredData = [], isLoading } = useFilteredProcurementData();
  const { data: filters, isLoading: filtersLoading } = useFilters();
  const { hasPermission } = usePermissions();
  const canAccessAdmin = hasPermission('admin_panel');

  // Drill-down modal state
  const [drillDown, setDrillDown] = useState<DrillDownState>({
    open: false,
    entityType: 'category',
    entityName: '',
  });

  // Admin panel URL for data upload
  const adminUploadUrl = `${window.location.protocol}//${window.location.hostname}:8001/admin/procurement/dataupload/upload-csv/`;

  // Calculate statistics from filtered data
  const totalSpend = calculateTotalSpend(filteredData);
  const supplierCount = calculateSupplierCount(filteredData);
  const categoryCount = calculateCategoryCount(filteredData);
  const avgTransaction = calculateAverageTransaction(filteredData);

  // Filter data for drill-down modal
  const drillDownData = useMemo(() => {
    if (!drillDown.entityName || !filteredData.length) return [];

    return filteredData.filter((record) => {
      switch (drillDown.entityType) {
        case 'category':
          return record.category === drillDown.entityName;
        case 'supplier':
          return record.supplier === drillDown.entityName;
        case 'location':
          return record.location === drillDown.entityName;
        default:
          return false;
      }
    });
  }, [drillDown.entityType, drillDown.entityName, filteredData]);

  // Handle chart click for drill-down
  const handleCategoryClick = (params: { name: string; value: number }) => {
    setDrillDown({
      open: true,
      entityType: 'category',
      entityName: params.name,
    });
  };

  const handleSupplierClick = (params: { name: string; value: number }) => {
    setDrillDown({
      open: true,
      entityType: 'supplier',
      entityName: params.name,
    });
  };

  const closeDrillDown = () => {
    setDrillDown((prev) => ({ ...prev, open: false }));
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Loading state with skeleton loaders
  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
          <p className="text-gray-600 mt-2">
            Key metrics and insights from your procurement data
          </p>
        </div>

        {/* Skeleton Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Skeleton Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart height={350} type="bar" />
          <SkeletonChart height={350} type="line" />
          <SkeletonChart height={350} type="bar" />
          <SkeletonChart height={350} type="pie" />
        </div>
      </div>
    );
  }

  // Empty state - no data available
  if (filteredData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Data Available
          </h2>
          <p className="text-gray-600 mb-6">
            {canAccessAdmin
              ? 'Upload your procurement data via the Admin Panel to see analytics and insights.'
              : 'Contact an administrator to upload procurement data to see analytics and insights.'}
          </p>
          {canAccessAdmin && (
            <a
              href={adminUploadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Go to Admin Panel
            </a>
          )}
        </div>
      </div>
    );
  }

  // Empty state - all data filtered out
  if (filteredData.length === 0) {
    const resetFilters = () => {
      // Reset will be handled by FilterPane's reset button
      window.location.reload();
    };

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <Filter className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Results Found
          </h2>
          <p className="text-gray-600 mb-6">
            No procurement records match your current filters. Try adjusting or clearing the filters.
          </p>
          <button
            onClick={resetFilters}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      </div>
    );
  }

  // Generate chart configurations from filtered data
  const spendByCategoryConfig = getSpendByCategoryConfig(filteredData);
  const spendTrendConfig = getSpendTrendConfig(filteredData);
  const topSuppliersConfig = getTopSuppliersConfig(filteredData);
  const spendDistributionConfig = getSpendDistributionConfig(filteredData);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Overview
        </h1>
        <p className="text-gray-600 mt-2">
          Key metrics and insights from your procurement data
        </p>
      </div>

      {/* Summary Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Spend"
          value={formatCurrency(totalSpend)}
          description="Across all categories"
          icon={DollarSign}
        />
        
        <StatCard
          title="Suppliers"
          value={supplierCount}
          description="Unique vendors"
          icon={Users}
        />
        
        <StatCard
          title="Categories"
          value={categoryCount}
          description="Spend categories"
          icon={Package}
        />
        
        <StatCard
          title="Avg Transaction"
          value={formatCurrency(avgTransaction)}
          description="Per purchase"
          icon={TrendingUp}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by Category */}
        <Chart
          title="Spend by Category"
          description="Shows how your procurement budget is distributed across different categories. Click a category to see details."
          option={spendByCategoryConfig}
          height={350}
          loading={isLoading}
          onChartClick={handleCategoryClick}
        />

        {/* Spend Trend Over Time */}
        <Chart
          title="Spend Trend Over Time"
          description="Track monthly spending patterns to identify trends, seasonal variations, and anomalies in your procurement activity."
          option={spendTrendConfig}
          height={350}
          loading={isLoading}
        />

        {/* Top 10 Suppliers */}
        <Chart
          title="Top 10 Suppliers"
          description="Your largest vendors by total spend. Click a supplier to see details."
          option={topSuppliersConfig}
          height={350}
          loading={isLoading}
          onChartClick={handleSupplierClick}
        />

        {/* Spend Distribution */}
        <Chart
          title="Spend Distribution"
          description="Categorizes transactions into High (top 20%), Medium (next 30%), and Low (bottom 50%) value tiers. Helps identify spend concentration and tail spend opportunities."
          option={spendDistributionConfig}
          height={350}
          loading={isLoading}
        />
      </div>

      {/* Drill-Down Modal */}
      <DrillDownModal
        open={drillDown.open}
        onClose={closeDrillDown}
        title={drillDown.entityType === 'category' ? 'Category' : 'Supplier'}
        entityType={drillDown.entityType}
        entityName={drillDown.entityName}
        data={drillDownData}
        totalSpend={totalSpend}
      />
    </div>
  );
}
