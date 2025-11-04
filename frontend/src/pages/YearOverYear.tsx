import { useProcurementData } from '@/hooks/useProcurementData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users,
  Calculator,
  ArrowUp,
  ArrowDown,
  BarChart3
} from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#6366f1'];

export default function YearOverYear() {
  const { data, isLoading } = useProcurementData();
  
  // Get fiscal year from date (Jul-Jun)
  const getFiscalYear = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1; // 1-12
    const year = date.getFullYear();
    return month >= 7 ? year + 1 : year;
  };

  // Get available fiscal years
  const availableYears = useMemo(() => {
    if (!data || data.length === 0) return [];
    const yearsSet = new Set(data.map(record => getFiscalYear(record.date)));
    const years = Array.from(yearsSet).sort();
    return years;
  }, [data]);

  const [fy1, setFy1] = useState<number>(availableYears[availableYears.length - 2] || 2024);
  const [fy2, setFy2] = useState<number>(availableYears[availableYears.length - 1] || 2025);

  // Filter data by fiscal year
  const fy1Data = useMemo(() => 
    data ? data.filter(record => getFiscalYear(record.date) === fy1) : [],
    [data, fy1]
  );

  const fy2Data = useMemo(() => 
    data ? data.filter(record => getFiscalYear(record.date) === fy2) : [],
    [data, fy2]
  );

  // Calculate key metrics
  const metrics = useMemo(() => {
    const fy1TotalSpend = fy1Data.reduce((sum, r) => sum + r.amount, 0);
    const fy2TotalSpend = fy2Data.reduce((sum, r) => sum + r.amount, 0);
    const spendChange = fy1TotalSpend > 0 ? ((fy2TotalSpend - fy1TotalSpend) / fy1TotalSpend) * 100 : 0;

    const fy1Transactions = fy1Data.length;
    const fy2Transactions = fy2Data.length;
    const transactionChange = fy1Transactions > 0 ? ((fy2Transactions - fy1Transactions) / fy1Transactions) * 100 : 0;

    const fy1AvgTransaction = fy1Transactions > 0 ? fy1TotalSpend / fy1Transactions : 0;
    const fy2AvgTransaction = fy2Transactions > 0 ? fy2TotalSpend / fy2Transactions : 0;
    const avgTransactionChange = fy1AvgTransaction > 0 ? ((fy2AvgTransaction - fy1AvgTransaction) / fy1AvgTransaction) * 100 : 0;

    const fy1Suppliers = new Set(fy1Data.map(r => r.supplier)).size;
    const fy2Suppliers = new Set(fy2Data.map(r => r.supplier)).size;
    const supplierChange = fy1Suppliers > 0 ? ((fy2Suppliers - fy1Suppliers) / fy1Suppliers) * 100 : 0;

    return {
      totalSpend: { fy1: fy1TotalSpend, fy2: fy2TotalSpend, change: spendChange },
      transactions: { fy1: fy1Transactions, fy2: fy2Transactions, change: transactionChange },
      avgTransaction: { fy1: fy1AvgTransaction, fy2: fy2AvgTransaction, change: avgTransactionChange },
      suppliers: { fy1: fy1Suppliers, fy2: fy2Suppliers, change: supplierChange }
    };
  }, [fy1Data, fy2Data]);

  // Category comparison data
  const categoryData = useMemo(() => {
    const fy1Categories: Record<string, number> = {};
    const fy2Categories: Record<string, number> = {};

    fy1Data.forEach(record => {
      fy1Categories[record.category] = (fy1Categories[record.category] || 0) + record.amount;
    });

    fy2Data.forEach(record => {
      fy2Categories[record.category] = (fy2Categories[record.category] || 0) + record.amount;
    });

    // Get all unique categories and sort them for consistent ordering
    const allCategories = Array.from(new Set([...Object.keys(fy1Categories), ...Object.keys(fy2Categories)])).sort();
    
    // Create color map for consistent colors across both years
    const categoryColorMap: Record<string, string> = {};
    allCategories.forEach((category, index) => {
      categoryColorMap[category] = COLORS[index % COLORS.length];
    });

    const fy1Chart = Object.entries(fy1Categories).map(([name, value]) => ({ 
      name, 
      value,
      color: categoryColorMap[name]
    }));
    const fy2Chart = Object.entries(fy2Categories).map(([name, value]) => ({ 
      name, 
      value,
      color: categoryColorMap[name]
    }));

    // Calculate growth rates
    const growthData = allCategories.map(category => {
      const fy1Value = fy1Categories[category] || 0;
      const fy2Value = fy2Categories[category] || 0;
      const growth = fy1Value > 0 ? ((fy2Value - fy1Value) / fy1Value) * 100 : 0;
      return { category, fy1: fy1Value, fy2: fy2Value, growth };
    }).sort((a, b) => Math.abs(b.growth) - Math.abs(a.growth)).slice(0, 10);

    return { fy1Chart, fy2Chart, growthData, categoryColorMap, allCategories };
  }, [fy1Data, fy2Data]);

  // Monthly comparison data
  const monthlyData = useMemo(() => {
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const fy1Monthly: Record<string, number> = {};
    const fy2Monthly: Record<string, number> = {};

    months.forEach(month => {
      fy1Monthly[month] = 0;
      fy2Monthly[month] = 0;
    });

    fy1Data.forEach(record => {
      const date = new Date(record.date);
      const month = date.getMonth(); // 0-11
      const fiscalMonth = month >= 6 ? month - 6 : month + 6; // Convert to fiscal month index
      fy1Monthly[months[fiscalMonth]] += record.amount;
    });

    fy2Data.forEach(record => {
      const date = new Date(record.date);
      const month = date.getMonth();
      const fiscalMonth = month >= 6 ? month - 6 : month + 6;
      fy2Monthly[months[fiscalMonth]] += record.amount;
    });

    const chartData = months.map(month => ({
      month,
      [`FY${fy1}`]: fy1Monthly[month],
      [`FY${fy2}`]: fy2Monthly[month]
    }));

    // Calculate month-over-month growth
    const momGrowth = months.map((month, idx) => {
      const fy1Value = fy1Monthly[month];
      const fy2Value = fy2Monthly[month];
      const growth = fy1Value > 0 ? ((fy2Value - fy1Value) / fy1Value) * 100 : 0;
      return { month, growth };
    });

    return { chartData, momGrowth };
  }, [fy1Data, fy2Data, fy1, fy2]);

  // Top movers
  const topMovers = useMemo(() => {
    const categoryGrowth: Record<string, { fy1: number; fy2: number }> = {};

    fy1Data.forEach(record => {
      if (!categoryGrowth[record.category]) {
        categoryGrowth[record.category] = { fy1: 0, fy2: 0 };
      }
      categoryGrowth[record.category].fy1 += record.amount;
    });

    fy2Data.forEach(record => {
      if (!categoryGrowth[record.category]) {
        categoryGrowth[record.category] = { fy1: 0, fy2: 0 };
      }
      categoryGrowth[record.category].fy2 += record.amount;
    });

    const movers = Object.entries(categoryGrowth).map(([category, values]) => {
      const growth = values.fy1 > 0 ? ((values.fy2 - values.fy1) / values.fy1) * 100 : 0;
      const change = values.fy2 - values.fy1;
      return { category, ...values, growth, change };
    }).filter(item => item.fy1 > 0 && item.fy2 > 0);

    const gainers = movers.filter(m => m.growth > 0).sort((a, b) => b.growth - a.growth).slice(0, 5);
    const decliners = movers.filter(m => m.growth < 0).sort((a, b) => a.growth - b.growth).slice(0, 5);

    return { gainers, decliners };
  }, [fy1Data, fy2Data]);

  // Top suppliers comparison
  const supplierComparison = useMemo(() => {
    const supplierData: Record<string, { fy1: number; fy2: number }> = {};

    fy1Data.forEach(record => {
      if (!supplierData[record.supplier]) {
        supplierData[record.supplier] = { fy1: 0, fy2: 0 };
      }
      supplierData[record.supplier].fy1 += record.amount;
    });

    fy2Data.forEach(record => {
      if (!supplierData[record.supplier]) {
        supplierData[record.supplier] = { fy1: 0, fy2: 0 };
      }
      supplierData[record.supplier].fy2 += record.amount;
    });

    return Object.entries(supplierData)
      .map(([supplier, values]) => {
        const growth = values.fy1 > 0 ? ((values.fy2 - values.fy1) / values.fy1) * 100 : 0;
        const change = values.fy2 - values.fy1;
        return { supplier, ...values, growth, change };
      })
      .sort((a, b) => (b.fy1 + b.fy2) - (a.fy1 + a.fy2))
      .slice(0, 15);
  }, [fy1Data, fy2Data]);

  if (isLoading || !data || data.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Year-over-Year Analysis</h1>
        <p className="text-gray-600">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Year-over-Year Analysis</h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Compare Fiscal Years:</label>
            <Select value={fy1.toString()} onValueChange={(value) => setFy1(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>FY{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-gray-600">vs</span>
            <Select value={fy2.toString()} onValueChange={(value) => setFy2(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>FY{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Key Metrics Comparison */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-blue-100 rounded-lg mb-3">
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Total Spend</p>
              <div className="flex items-center justify-center gap-4 mb-2 w-full">
                <div>
                  <p className="text-xs text-gray-500">FY{fy2}</p>
                  <p className="text-base font-bold text-gray-900">
                    ${metrics.totalSpend.fy2.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">FY{fy1}</p>
                  <p className="text-base font-bold text-gray-900">
                    ${metrics.totalSpend.fy1.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-1 text-sm font-bold ${metrics.totalSpend.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.totalSpend.change >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                {metrics.totalSpend.change >= 0 ? '+' : ''}{metrics.totalSpend.change.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.totalSpend.change >= 0 ? '+' : ''}${(metrics.totalSpend.fy2 - metrics.totalSpend.fy1).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} change
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-purple-100 rounded-lg mb-3">
                <ShoppingCart className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Transaction Count</p>
              <div className="flex items-center justify-center gap-4 mb-2 w-full">
                <div>
                  <p className="text-xs text-gray-500">FY{fy2}</p>
                  <p className="text-base font-bold text-gray-900">
                    {metrics.transactions.fy2.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">FY{fy1}</p>
                  <p className="text-base font-bold text-gray-900">
                    {metrics.transactions.fy1.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-1 text-sm font-bold ${metrics.transactions.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.transactions.change >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                {metrics.transactions.change >= 0 ? '+' : ''}{metrics.transactions.change.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.transactions.change >= 0 ? '+' : ''}{(metrics.transactions.fy2 - metrics.transactions.fy1).toLocaleString()} change
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-green-100 rounded-lg mb-3">
                <Calculator className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Average Transaction</p>
              <div className="flex items-center justify-center gap-4 mb-2 w-full">
                <div>
                  <p className="text-xs text-gray-500">FY{fy2}</p>
                  <p className="text-base font-bold text-gray-900">
                    ${metrics.avgTransaction.fy2.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">FY{fy1}</p>
                  <p className="text-base font-bold text-gray-900">
                    ${metrics.avgTransaction.fy1.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-1 text-sm font-bold ${metrics.avgTransaction.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.avgTransaction.change >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                {metrics.avgTransaction.change >= 0 ? '+' : ''}{metrics.avgTransaction.change.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.avgTransaction.change >= 0 ? '+' : ''}${(metrics.avgTransaction.fy2 - metrics.avgTransaction.fy1).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} change
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-orange-100 rounded-lg mb-3">
                <Users className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Supplier Count</p>
              <div className="flex items-center justify-center gap-4 mb-2 w-full">
                <div>
                  <p className="text-xs text-gray-500">FY{fy2}</p>
                  <p className="text-base font-bold text-gray-900">
                    {metrics.suppliers.fy2.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">FY{fy1}</p>
                  <p className="text-base font-bold text-gray-900">
                    {metrics.suppliers.fy1.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-1 text-sm font-bold ${metrics.suppliers.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.suppliers.change >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                {metrics.suppliers.change >= 0 ? '+' : ''}{metrics.suppliers.change.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.suppliers.change >= 0 ? '+' : ''}{(metrics.suppliers.fy2 - metrics.suppliers.fy1).toLocaleString()} change
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Comparison */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Category Comparison
        </h2>
        <div className="grid grid-cols-2 gap-6">
          {/* FY1 Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-center">FY{fy1} Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pb-8">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={categoryData.fy1Chart}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.fy1Chart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* FY2 Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-center">FY{fy2} Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pb-8">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={categoryData.fy2Chart}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.fy2Chart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        
        {/* Shared Legend */}
        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {categoryData.allCategories.map((category) => (
            <div key={category} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: categoryData.categoryColorMap[category] }}
              />
              <span className="text-sm text-gray-700">{category}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Growth Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Category Spend Analysis (Sorted by Growth %)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={categoryData.growthData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tickFormatter={(value) => `${value.toFixed(0)}%`} />
              <YAxis type="category" dataKey="category" width={200} style={{ fontSize: '12px' }} />
              <Tooltip
                formatter={(value: number) => `${value.toFixed(1)}%`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="growth" fill="#3b82f6">
                {categoryData.growthData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.growth >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Spending Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monthlyData.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip
                formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={`FY${fy1}`}
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey={`FY${fy2}`}
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Month-over-Month Growth Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Month-over-Month Growth Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData.momGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
              />
              <Tooltip
                formatter={(value: number) => `${value.toFixed(1)}%`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="growth">
                {monthlyData.momGrowth.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.growth >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Movers */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Gainers */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <TrendingUp className="h-5 w-5" />
              Top Gainers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topMovers.gainers.map((item, idx) => (
                <div key={idx} className="border-b border-gray-200 pb-3 last:border-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.category}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Current: ${item.fy2.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-gray-500">
                        Previous: ${item.fy1.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-green-600 font-bold">
                        <ArrowUp className="h-4 w-4" />
                        +{item.growth.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Decliners */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <TrendingDown className="h-5 w-5" />
              Top Decliners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topMovers.decliners.map((item, idx) => (
                <div key={idx} className="border-b border-gray-200 pb-3 last:border-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.category}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Current: ${item.fy2.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-gray-500">
                        Previous: ${item.fy1.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-red-600 font-bold">
                        <ArrowDown className="h-4 w-4" />
                        {item.growth.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Suppliers Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Top Suppliers Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Supplier Name</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">FY{fy1} Spend</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">FY{fy2} Spend</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Change</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Growth %</th>
                </tr>
              </thead>
              <tbody>
                {supplierComparison.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{item.supplier}</td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      ${item.fy1.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      ${item.fy2.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.change >= 0 ? '+' : ''}${item.change.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className={`flex items-center justify-end gap-1 font-bold ${item.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.growth >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        {item.growth >= 0 ? '+' : ''}{item.growth.toFixed(1)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
