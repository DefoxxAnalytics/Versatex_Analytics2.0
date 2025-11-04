import { useProcurementData } from '@/hooks/useProcurementData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, BarChart as BarChartIcon, Info, Lightbulb, Target, DollarSign, Calendar, Layers } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell
} from 'recharts';

export default function TailSpend() {
  const { data } = useProcurementData();
  const [activeTab, setActiveTab] = useState<'multi-category' | 'category' | 'geographic'>('category');

  // Calculate tail spend metrics
  const tailMetrics = useMemo(() => {
    if (!data) return {
      totalVendors: 0,
      tailVendorCount: 0,
      tailSpend: 0,
      tailPercentage: 0,
      savingsOpportunity: 0,
      totalSpend: 0,
      allSuppliers: [],
      segments: {
        micro: { count: 0, spend: 0, transactions: 0 },
        small: { count: 0, spend: 0, transactions: 0 },
        midTail: { count: 0, spend: 0, transactions: 0 }
      },
      categoryAnalysis: []
    };

    // Group by supplier and calculate annual spend
    const supplierSpend: Record<string, number> = {};
    
    data.forEach(record => {
      supplierSpend[record.supplier] = (supplierSpend[record.supplier] || 0) + record.amount;
    });

    const totalSpend = Object.values(supplierSpend).reduce((sum, val) => sum + val, 0);
    const totalVendors = Object.keys(supplierSpend).length;

    // Define tail vendors (< $50K annual spend)
    const tailThreshold = 50000;
    const tailVendors = Object.entries(supplierSpend)
      .filter(([_, spend]) => spend < tailThreshold);

    const tailSpend = tailVendors.reduce((sum, [_, spend]) => sum + spend, 0);
    const tailVendorCount = tailVendors.length;
    const tailPercentage = totalSpend > 0 ? (tailSpend / totalSpend) * 100 : 0;

    // Calculate savings opportunity (conservative estimate: 8% of tail spend)
    const savingsOpportunity = tailSpend * 0.08;

    // Prepare all suppliers for Pareto analysis
    const allSuppliers = Object.entries(supplierSpend).map(([supplier, spend]) => ({
      supplier,
      spend
    }));

    // Calculate transactions per supplier
    const supplierTransactions: Record<string, number> = {};
    data.forEach(record => {
      supplierTransactions[record.supplier] = (supplierTransactions[record.supplier] || 0) + 1;
    });

    // Segment tail vendors
    const microVendors = tailVendors.filter(([_, spend]) => spend < 10000);
    const smallVendors = tailVendors.filter(([_, spend]) => spend >= 10000 && spend < 50000);
    const midTailVendors = allSuppliers.filter(s => s.spend >= 50000); // Actually non-tail

    const microSpend = microVendors.reduce((sum, [_, spend]) => sum + spend, 0);
    const smallSpend = smallVendors.reduce((sum, [_, spend]) => sum + spend, 0);
    const midTailSpend = midTailVendors.reduce((sum, v) => sum + v.spend, 0);

    const microTransactions = microVendors.reduce((sum, [supplier]) => sum + (supplierTransactions[supplier] || 0), 0);
    const smallTransactions = smallVendors.reduce((sum, [supplier]) => sum + (supplierTransactions[supplier] || 0), 0);
    const midTailTransactions = midTailVendors.reduce((sum, v) => sum + (supplierTransactions[v.supplier] || 0), 0);

    // Category-level tail analysis
    const categoryTailAnalysis: Record<string, { tailSpend: number, tailVendors: number, totalSpend: number, totalVendors: number }> = {};
    
    data.forEach(record => {
      if (!categoryTailAnalysis[record.category]) {
        categoryTailAnalysis[record.category] = { tailSpend: 0, tailVendors: 0, totalSpend: 0, totalVendors: 0 };
      }
      categoryTailAnalysis[record.category].totalSpend += record.amount;
    });

    // Count vendors per category
    const categoryVendors: Record<string, Set<string>> = {};
    const categoryTailVendors: Record<string, Set<string>> = {};
    
    data.forEach(record => {
      if (!categoryVendors[record.category]) {
        categoryVendors[record.category] = new Set();
        categoryTailVendors[record.category] = new Set();
      }
      categoryVendors[record.category].add(record.supplier);
      
      // Check if supplier is tail vendor
      if (supplierSpend[record.supplier] < tailThreshold) {
        categoryTailVendors[record.category].add(record.supplier);
        categoryTailAnalysis[record.category].tailSpend += record.amount;
      }
    });

    // Finalize category analysis
    Object.keys(categoryTailAnalysis).forEach(category => {
      categoryTailAnalysis[category].totalVendors = categoryVendors[category].size;
      categoryTailAnalysis[category].tailVendors = categoryTailVendors[category].size;
    });

    const categoryAnalysis = Object.entries(categoryTailAnalysis)
      .map(([category, metrics]) => ({
        category,
        tailPercentage: metrics.totalSpend > 0 ? (metrics.tailSpend / metrics.totalSpend) * 100 : 0,
        tailSpend: metrics.tailSpend,
        tailVendors: metrics.tailVendors,
        vendorPercentage: metrics.totalVendors > 0 ? (metrics.tailVendors / metrics.totalVendors) * 100 : 0
      }))
      .sort((a, b) => b.tailPercentage - a.tailPercentage);

    return {
      totalVendors,
      tailVendorCount,
      tailSpend,
      tailPercentage,
      savingsOpportunity,
      totalSpend,
      allSuppliers,
      segments: {
        micro: { count: microVendors.length, spend: microSpend, transactions: microTransactions },
        small: { count: smallVendors.length, spend: smallSpend, transactions: smallTransactions },
        midTail: { count: midTailVendors.length, spend: midTailSpend, transactions: midTailTransactions }
      },
      categoryAnalysis
    };
  }, [data]);

  // Pareto analysis data (80/20 rule)
  const paretoData = useMemo(() => {
    const sorted = [...tailMetrics.allSuppliers].sort((a, b) => b.spend - a.spend);
    let cumulative = 0;
    return sorted.map(item => {
      cumulative += item.spend;
      const cumulativePercent = (cumulative / tailMetrics.totalSpend) * 100;
      // Mark tail vendors in red
      const isTail = item.spend < 50000;
      return {
        supplier: item.supplier,
        spend: item.spend,
        cumulative: cumulativePercent,
        fill: isTail ? '#ef4444' : '#3b82f6' // red for tail, blue for others
      };
    }).slice(0, 20); // Top 20 vendors
  }, [tailMetrics]);

  // Bubble chart data (tail spend by category and business unit)
  const bubbleData = useMemo(() => {
    if (!data) return [];

    const categoryBUSpend: Record<string, Record<string, number>> = {};
    const categoryBUVendors: Record<string, Record<string, Set<string>>> = {};

    // Group tail spend by category and business unit
    data.forEach(record => {
      // Check if supplier is tail vendor
      const supplierAnnualSpend = tailMetrics.allSuppliers.find(s => s.supplier === record.supplier)?.spend || 0;
      if (supplierAnnualSpend >= 50000) return; // Skip non-tail vendors

      const category = record.category;
      const bu = record.location || 'Unknown';

      if (!categoryBUSpend[category]) {
        categoryBUSpend[category] = {};
        categoryBUVendors[category] = {};
      }
      if (!categoryBUSpend[category][bu]) {
        categoryBUSpend[category][bu] = 0;
        categoryBUVendors[category][bu] = new Set();
      }

      categoryBUSpend[category][bu] += record.amount;
      categoryBUVendors[category][bu].add(record.supplier);
    });

    // Convert to bubble chart format
    const bubbles: Array<{ category: string; bu: string; spend: number; vendors: number; x: number; y: number; z: number }> = [];
    const categories = Object.keys(categoryBUSpend);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    categories.forEach((category, catIdx) => {
      Object.entries(categoryBUSpend[category]).forEach(([bu, spend]) => {
        const vendors = categoryBUVendors[category][bu].size;
        bubbles.push({
          category,
          bu,
          spend,
          vendors,
          x: catIdx,
          y: Object.keys(categoryBUSpend).indexOf(category),
          z: spend
        });
      });
    });

    return bubbles;
  }, [data, tailMetrics]);

  // Calculate consolidation opportunities
  const consolidationOpportunities = useMemo(() => {
    if (!data) return {
      multiCategory: [],
      category: [],
      geographic: [],
      totalOpportunities: 0,
      totalSavings: 0,
      topType: 'Category'
    };

    const tailThreshold = 50000;

    // Multi-Category Vendors: Tail vendors operating across multiple categories
    const supplierCategories: Record<string, Set<string>> = {};
    const supplierSpend: Record<string, number> = {};
    const supplierLocations: Record<string, Set<string>> = {};

    data.forEach(record => {
      if (!supplierCategories[record.supplier]) {
        supplierCategories[record.supplier] = new Set();
        supplierSpend[record.supplier] = 0;
        supplierLocations[record.supplier] = new Set();
      }
      supplierCategories[record.supplier].add(record.category);
      supplierSpend[record.supplier] += record.amount;
      supplierLocations[record.supplier].add(record.location);
    });

    const multiCategoryOpportunities = Object.entries(supplierCategories)
      .filter(([supplier, categories]) => {
        const spend = supplierSpend[supplier];
        return spend < tailThreshold && categories.size > 1;
      })
      .map(([supplier, categories]) => ({
        supplier,
        categories: Array.from(categories),
        categoryCount: categories.size,
        totalSpend: supplierSpend[supplier],
        locations: Array.from(supplierLocations[supplier]),
        savingsPotential: supplierSpend[supplier] * 0.12 // 12% savings
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend);

    // Category Consolidation: Categories with high tail vendor counts
    const categoryTailVendors: Record<string, Set<string>> = {};
    const categoryTailSpend: Record<string, number> = {};
    const categoryTotalVendors: Record<string, Set<string>> = {};

    data.forEach(record => {
      if (!categoryTotalVendors[record.category]) {
        categoryTotalVendors[record.category] = new Set();
        categoryTailVendors[record.category] = new Set();
        categoryTailSpend[record.category] = 0;
      }
      categoryTotalVendors[record.category].add(record.supplier);
      
      if (supplierSpend[record.supplier] < tailThreshold) {
        categoryTailVendors[record.category].add(record.supplier);
        categoryTailSpend[record.category] += record.amount;
      }
    });

    const categoryOpportunities = Object.entries(categoryTailVendors)
      .filter(([_, vendors]) => vendors.size >= 3) // At least 3 tail vendors
      .map(([category, vendors]) => {
        const totalVendors = categoryTotalVendors[category].size;
        const tailVendors = vendors.size;
        const tailSpend = categoryTailSpend[category];
        const topVendor = Array.from(vendors)
          .map(supplier => ({ supplier, spend: supplierSpend[supplier] }))
          .sort((a, b) => b.spend - a.spend)[0];

        return {
          category,
          tailVendors,
          totalVendors,
          tailSpend,
          topVendor: topVendor?.supplier || 'N/A',
          topVendorSpend: topVendor?.spend || 0,
          savingsPotential: tailSpend * 0.10 // 10% savings
        };
      })
      .sort((a, b) => b.tailVendors - a.tailVendors);

    // Geographic Consolidation: Locations with high tail vendor counts
    const locationTailVendors: Record<string, Set<string>> = {};
    const locationTailSpend: Record<string, number> = {};
    const locationTotalVendors: Record<string, Set<string>> = {};

    data.forEach(record => {
      const location = record.location || 'Unknown';
      if (!locationTotalVendors[location]) {
        locationTotalVendors[location] = new Set();
        locationTailVendors[location] = new Set();
        locationTailSpend[location] = 0;
      }
      locationTotalVendors[location].add(record.supplier);
      
      if (supplierSpend[record.supplier] < tailThreshold) {
        locationTailVendors[location].add(record.supplier);
        locationTailSpend[location] += record.amount;
      }
    });

    const geographicOpportunities = Object.entries(locationTailVendors)
      .filter(([_, vendors]) => vendors.size >= 3) // At least 3 tail vendors
      .map(([location, vendors]) => {
        const totalVendors = locationTotalVendors[location].size;
        const tailVendors = vendors.size;
        const tailSpend = locationTailSpend[location];
        const topVendor = Array.from(vendors)
          .map(supplier => ({ supplier, spend: supplierSpend[supplier] }))
          .sort((a, b) => b.spend - a.spend)[0];

        return {
          location,
          tailVendors,
          totalVendors,
          tailSpend,
          topVendor: topVendor?.supplier || 'N/A',
          topVendorSpend: topVendor?.spend || 0,
          savingsPotential: tailSpend * 0.08 // 8% savings
        };
      })
      .sort((a, b) => b.tailVendors - a.tailVendors);

    const totalOpportunities = multiCategoryOpportunities.length + categoryOpportunities.length + geographicOpportunities.length;
    const totalSavings = 
      multiCategoryOpportunities.reduce((sum, opp) => sum + opp.savingsPotential, 0) +
      categoryOpportunities.reduce((sum, opp) => sum + opp.savingsPotential, 0) +
      geographicOpportunities.reduce((sum, opp) => sum + opp.savingsPotential, 0);

    // Determine top opportunity type
    const counts = {
      'Multi-Category': multiCategoryOpportunities.length,
      'Category': categoryOpportunities.length,
      'Geographic': geographicOpportunities.length
    };
    const topType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

    return {
      multiCategory: multiCategoryOpportunities,
      category: categoryOpportunities,
      geographic: geographicOpportunities,
      totalOpportunities,
      totalSavings,
      topType
    };
  }, [data]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-purple-600">
        <Package className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Tail Spend Analysis & Vendor Consolidation Opportunities</h1>
      </div>

      {/* Tail Spend Definition */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">What is Tail Spend?</h3>
              <p className="text-sm text-blue-800">
                <strong>Tail spend</strong> refers to suppliers with annual spend below <strong>$50,000</strong>. 
                These vendors typically represent a large portion of the vendor base but a smaller percentage of total spend. 
                Consolidating tail spend can reduce administrative overhead, improve compliance, and unlock significant savings opportunities.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{tailMetrics.totalVendors}</div>
            <div className="text-sm text-gray-600 mt-1">Total Vendors</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-purple-600">{tailMetrics.tailVendorCount}</div>
            <div className="text-sm text-gray-600 mt-1">Tail Vendors</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">
              ${tailMetrics.tailSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-gray-600 mt-1">Tail Spend</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-orange-600">
              {tailMetrics.tailPercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">% of Total Spend</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-red-600">
              ${tailMetrics.savingsOpportunity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-gray-600 mt-1">Savings Opportunity</div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Pareto Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChartIcon className="h-5 w-5 text-blue-600" />
            Vendor Pareto Analysis (80/20 Rule)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={paretoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="supplier" 
                angle={-45} 
                textAnchor="end" 
                height={150}
                interval={0}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                yAxisId="left" 
                label={{ value: 'Annual Spend ($)', angle: -90, position: 'insideLeft' }} 
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                label={{ value: 'Cumulative %', angle: 90, position: 'insideRight' }} 
                domain={[0, 100]}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'spend') return [`$${value.toLocaleString()}`, 'Vendor Spend'];
                  return [`${value.toFixed(1)}%`, 'Cumulative %'];
                }}
              />
              <Legend />
              <Bar 
                yAxisId="left" 
                dataKey="spend" 
                name="Vendor Spend"
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="cumulative" 
                stroke="#f97316" 
                strokeWidth={2} 
                name="Cumulative %" 
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500"></div>
              <span>Non-Tail Vendors (&gt;$50K)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500"></div>
              <span>Tail Vendors (&lt;$50K)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tail Vendor Segmentation */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-teal-600">
          <Target className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Tail Vendor Segmentation</h2>
        </div>

        {/* Segmentation Definitions */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-purple-900">Tail Vendor Segmentation Definitions</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div>
                  <span className="font-semibold">Micro:</span>
                  <span className="text-sm text-muted-foreground ml-1">&lt; $10,000 annual spend</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div>
                  <span className="font-semibold">Small:</span>
                  <span className="text-sm text-muted-foreground ml-1">$10,000 - $50,000 annual spend</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div>
                  <span className="font-semibold">Mid-tail:</span>
                  <span className="text-sm text-muted-foreground ml-1">&gt; $50,000 annual spend</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Segment Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Micro Vendors */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-red-600">Micro Vendors</span>
                <span className="text-sm text-muted-foreground">&lt; $10K</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-2xl font-bold">{tailMetrics.segments.micro.count} Vendors</div>
                <div className="text-sm text-muted-foreground">Total Vendors</div>
              </div>
              <div>
                <div className="text-lg font-semibold">${tailMetrics.segments.micro.spend.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Spend</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{tailMetrics.segments.micro.transactions.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Transactions</div>
              </div>
              <div className="flex items-start gap-2 mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-900">
                  <span className="font-semibold">Recommendation:</span> Consolidate or eliminate to reduce administrative overhead
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Small Vendors */}
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-yellow-600">Small Vendors</span>
                <span className="text-sm text-muted-foreground">$10K - $50K</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-2xl font-bold">{tailMetrics.segments.small.count} Vendors</div>
                <div className="text-sm text-muted-foreground">Total Vendors</div>
              </div>
              <div>
                <div className="text-lg font-semibold">${tailMetrics.segments.small.spend.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Spend</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{tailMetrics.segments.small.transactions.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Transactions</div>
              </div>
              <div className="flex items-start gap-2 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <span className="font-semibold">Recommendation:</span> Negotiate better terms and implement process improvements
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mid-Tail Vendors */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-green-600">Mid-Tail Vendors</span>
                <span className="text-sm text-muted-foreground">&gt; $50K</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-2xl font-bold">{tailMetrics.segments.midTail.count} Vendors</div>
                <div className="text-sm text-muted-foreground">Total Vendors</div>
              </div>
              <div>
                <div className="text-lg font-semibold">${tailMetrics.segments.midTail.spend.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Spend</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{tailMetrics.segments.midTail.transactions.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Transactions</div>
              </div>
              <div className="flex items-start gap-2 mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <Lightbulb className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-900">
                  <span className="font-semibold">Recommendation:</span> Strategic partnerships and volume consolidation
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Savings Opportunities & Strategic Recommendations */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-orange-600">
              <DollarSign className="h-5 w-5" />
              <CardTitle>Savings Opportunities & Strategic Recommendations</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Vendor Consolidation */}
            <div className="border-l-4 border-l-blue-500 pl-4 py-2">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">Vendor Consolidation</h3>
                <span className="text-sm text-muted-foreground">3-6 months</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Consolidate micro vendors to reduce administrative overhead
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground">Conservative Savings</div>
                  <div className="text-xl font-bold text-blue-600">
                    ${(tailMetrics.segments.micro.spend * 0.105).toLocaleString()}
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground">Optimistic Savings</div>
                  <div className="text-xl font-bold text-blue-600">
                    ${(tailMetrics.segments.micro.spend * 0.15).toLocaleString()}
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground">Vendors Affected</div>
                  <div className="text-xl font-bold text-blue-600">
                    {tailMetrics.segments.micro.count}
                  </div>
                </div>
              </div>
            </div>

            {/* Process Improvement */}
            <div className="border-l-4 border-l-green-500 pl-4 py-2">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">Process Improvement</h3>
                <span className="text-sm text-muted-foreground">2-4 months</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Streamline procurement processes for tail spend
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground">Conservative Savings</div>
                  <div className="text-xl font-bold text-green-600">
                    ${(tailMetrics.tailSpend * 0.06).toLocaleString()}
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground">Optimistic Savings</div>
                  <div className="text-xl font-bold text-green-600">
                    ${(tailMetrics.tailSpend * 0.10).toLocaleString()}
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground">Vendors Affected</div>
                  <div className="text-xl font-bold text-green-600">
                    {tailMetrics.tailVendorCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Contract Optimization */}
            <div className="border-l-4 border-l-purple-500 pl-4 py-2">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">Contract Optimization</h3>
                <span className="text-sm text-muted-foreground">4-8 months</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Negotiate better terms with small vendors
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground">Conservative Savings</div>
                  <div className="text-xl font-bold text-purple-600">
                    ${(tailMetrics.segments.small.spend * 0.105).toLocaleString()}
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground">Optimistic Savings</div>
                  <div className="text-xl font-bold text-purple-600">
                    ${(tailMetrics.segments.small.spend * 0.14).toLocaleString()}
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground">Vendors Affected</div>
                  <div className="text-xl font-bold text-purple-600">
                    {tailMetrics.segments.small.count}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Plan - Implementation Timeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-blue-600">
              <Calendar className="h-5 w-5" />
              <CardTitle>Action Plan - Implementation Timeline</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Phase 1: Quick Wins */}
            <div className="border-l-4 border-l-green-500 bg-green-50 p-4 rounded-r-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg text-green-700">Phase 1: Quick Wins</h3>
                <span className="text-sm font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">0-3 months</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>Identify micro vendors for immediate consolidation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>Implement basic process improvements</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>Set up vendor performance tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>Establish procurement governance framework</span>
                </li>
              </ul>
            </div>

            {/* Phase 2: Strategic Implementation */}
            <div className="border-l-4 border-l-blue-500 bg-blue-50 p-4 rounded-r-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg text-blue-700">Phase 2: Strategic Implementation</h3>
                <span className="text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">3-6 months</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Execute vendor consolidation strategy</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Negotiate improved contracts with small vendors</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Implement automated procurement workflows</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Roll out vendor management system</span>
                </li>
              </ul>
            </div>

            {/* Phase 3: Optimization */}
            <div className="border-l-4 border-l-purple-500 bg-purple-50 p-4 rounded-r-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg text-purple-700">Phase 3: Optimization</h3>
                <span className="text-sm font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">6-12 months</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Monitor and optimize new processes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Measure savings realization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Continuous improvement initiatives</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Review and refine vendor relationships</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Category-Level Tail Analysis */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-purple-600">
              <Layers className="h-5 w-5" />
              <CardTitle>Category-Level Tail Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tailMetrics.categoryAnalysis.map((cat, index) => (
                <div key={index} className="border-l-4 border-l-gray-300 bg-gray-50 p-4 rounded-r-lg">
                  <h3 className="font-semibold text-lg text-gray-800 mb-2">{cat.category}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                    <div>
                      <span className="font-medium">{cat.tailPercentage.toFixed(1)}% Tail</span>
                    </div>
                    <div>
                      <span className="font-medium">{cat.vendorPercentage.toFixed(0)}% Vendor %</span>
                    </div>
                    <div>
                      <span>${cat.tailSpend.toLocaleString()} Tail Spend</span>
                    </div>
                    <div>
                      <span>{cat.tailVendors} Tail Vendors</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Intelligent Vendor Consolidation Opportunities */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-indigo-600">
              <Lightbulb className="h-5 w-5" />
              <CardTitle>Intelligent Vendor Consolidation Opportunities</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Strategic opportunities to consolidate vendors and reduce complexity.
            </p>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-600 font-medium mb-1">Total Opportunities</div>
                <div className="text-2xl font-bold text-blue-900">{consolidationOpportunities.totalOpportunities}</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-600 font-medium mb-1">Total Savings Potential</div>
                <div className="text-2xl font-bold text-green-900">${consolidationOpportunities.totalSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-sm text-purple-600 font-medium mb-1">Top Opportunity Type</div>
                <div className="text-2xl font-bold text-purple-900">{consolidationOpportunities.topType}</div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-4 border-b">
              <Button
                variant={activeTab === 'multi-category' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('multi-category')}
                className="rounded-b-none"
              >
                Multi-Category Vendors
              </Button>
              <Button
                variant={activeTab === 'category' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('category')}
                className="rounded-b-none"
              >
                Category Consolidation
              </Button>
              <Button
                variant={activeTab === 'geographic' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('geographic')}
                className="rounded-b-none"
              >
                Geographic Consolidation
              </Button>
            </div>

            {/* Tab Content */}
            <div className="mt-4">
              {activeTab === 'multi-category' && (
                <div>
                  {consolidationOpportunities.multiCategory.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>No multi-category vendor opportunities identified.</p>
                      <p className="text-sm mt-2">All tail vendors operate in a single category.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {consolidationOpportunities.multiCategory.map((opp, index) => (
                        <div key={index} className="border-l-4 border-l-indigo-500 bg-indigo-50 p-4 rounded-r-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-lg text-indigo-900">{opp.supplier}</h3>
                            <span className="text-sm font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                              {opp.categoryCount} Categories
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm text-gray-700 mb-2">
                            <div>
                              <span className="font-medium">Total Spend:</span> ${opp.totalSpend.toLocaleString()}
                            </div>
                            <div>
                              <span className="font-medium">Savings Potential:</span> ${opp.savingsPotential.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            <div>
                              <span className="font-medium">Locations:</span> {opp.locations.join(', ')}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Categories:</span> {opp.categories.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'category' && (
                <div className="space-y-3">
                  {consolidationOpportunities.category.map((opp, index) => (
                    <div key={index} className="border-l-4 border-l-blue-500 bg-blue-50 p-4 rounded-r-lg">
                      <h3 className="font-semibold text-lg text-blue-900 mb-2">{opp.category}</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 mb-3">
                        <div>
                          <span className="font-medium">Total Vendors:</span> {opp.totalVendors}
                        </div>
                        <div>
                          <span className="font-medium">Tail Vendors:</span> {opp.tailVendors}
                        </div>
                        <div>
                          <span className="font-medium">Tail Spend:</span> ${opp.tailSpend.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Savings Potential:</span> ${opp.savingsPotential.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Top Vendor:</span> {opp.topVendor} (${opp.topVendorSpend.toLocaleString()})
                      </div>
                      <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2 flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <p className="text-xs text-yellow-800">
                          <strong>Recommendation:</strong> Consolidate {opp.tailVendors} tail vendors to reduce administrative overhead and negotiate better rates.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'geographic' && (
                <div className="space-y-3">
                  {consolidationOpportunities.geographic.map((opp, index) => (
                    <div key={index} className="border-l-4 border-l-green-500 bg-green-50 p-4 rounded-r-lg">
                      <h3 className="font-semibold text-lg text-green-900 mb-2">{opp.location}</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 mb-3">
                        <div>
                          <span className="font-medium">Total Vendors:</span> {opp.totalVendors}
                        </div>
                        <div>
                          <span className="font-medium">Tail Vendors:</span> {opp.tailVendors}
                        </div>
                        <div>
                          <span className="font-medium">Tail Spend:</span> ${opp.tailSpend.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Savings Potential:</span> ${opp.savingsPotential.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Top Vendor:</span> {opp.topVendor} (${opp.topVendorSpend.toLocaleString()})
                      </div>
                      <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2 flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <p className="text-xs text-yellow-800">
                          <strong>Recommendation:</strong> Consolidate {opp.tailVendors} tail vendors in {opp.location} to leverage regional purchasing power.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
