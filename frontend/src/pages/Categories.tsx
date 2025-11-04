import { useFilteredProcurementData } from '@/hooks/useProcurementData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, TrendingUp, DollarSign, Layers, AlertTriangle, Eye, ShieldAlert, Shield, Search, X } from 'lucide-react';
import { useState } from 'react';

export default function Categories() {
  const { data = [] } = useFilteredProcurementData();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600">Upload your procurement data to see category analysis.</p>
        </div>
      </div>
    );
  }

  // Calculate comprehensive category metrics with subcategory analysis
  const categoryData = data.reduce((acc, record) => {
    const category = record.category || 'Uncategorized';
    const subcategory = record.subcategory || 'Unspecified';
    const supplier = record.supplier || 'Unknown';
    
    if (!acc[category]) {
      acc[category] = {
        category,
        totalSpend: 0,
        transactionCount: 0,
        subcategories: new Map<string, number>(),
        suppliers: new Set<string>(),
        supplierSpend: new Map<string, number>(),
      };
    }
    
    acc[category].totalSpend += record.amount;
    acc[category].transactionCount += 1;
    acc[category].suppliers.add(supplier);
    
    // Track subcategory spend
    const currentSubSpend = acc[category].subcategories.get(subcategory) || 0;
    acc[category].subcategories.set(subcategory, currentSubSpend + record.amount);
    
    // Track supplier spend
    const currentSupplierSpend = acc[category].supplierSpend.get(supplier) || 0;
    acc[category].supplierSpend.set(supplier, currentSupplierSpend + record.amount);
    
    return acc;
  }, {} as Record<string, {
    category: string;
    totalSpend: number;
    transactionCount: number;
    subcategories: Map<string, number>;
    suppliers: Set<string>;
    supplierSpend: Map<string, number>;
  }>);

  const totalSpend = data.reduce((sum, r) => sum + r.amount, 0);

  // Calculate enhanced metrics
  const categories = Object.values(categoryData)
    .map(cat => {
      const subcategoryCount = cat.subcategories.size;
      const supplierCount = cat.suppliers.size;
      const avgPerSupplier = supplierCount > 0 ? cat.totalSpend / supplierCount : 0;
      
      // Find top subcategory
      let topSubcategory = '';
      let topSubSpend = 0;
      cat.subcategories.forEach((spend, subcat) => {
        if (spend > topSubSpend) {
          topSubSpend = spend;
          topSubcategory = subcat;
        }
      });
      
      // Calculate concentration (top subcategory as % of category spend)
      const concentration = cat.totalSpend > 0 ? (topSubSpend / cat.totalSpend) * 100 : 0;
      
      // Calculate risk level based on concentration and supplier count
      let riskLevel: 'Low' | 'Medium' | 'High';
      if (concentration > 70 || supplierCount < 3) {
        riskLevel = 'High';
      } else if (concentration > 50 || supplierCount < 5) {
        riskLevel = 'Medium';
      } else {
        riskLevel = 'Low';
      }
      
      return {
        ...cat,
        subcategoryCount,
        supplierCount,
        avgPerSupplier,
        topSubcategory,
        topSubSpend,
        concentration,
        riskLevel,
        percentage: (cat.totalSpend / totalSpend) * 100,
        avgTransaction: cat.totalSpend / cat.transactionCount,
      };
    })
    .sort((a, b) => b.totalSpend - a.totalSpend);

  // Filter categories based on search query
  const filteredCategories = searchQuery.trim()
    ? categories.filter(cat => 
        cat.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categories;

  // Calculate summary metrics
  const totalCategories = categories.length;
  const mostComplexCategory = categories.reduce((max, cat) => 
    cat.subcategoryCount > max.subcategoryCount ? cat : max
  , categories[0]);
  const avgSubcategories = categories.reduce((sum, cat) => sum + cat.subcategoryCount, 0) / totalCategories;
  const highestRiskCategory = categories.find(cat => cat.riskLevel === 'High') || categories[0];

  // Colors for charts
  const COLORS = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#06b6d4', '#6366f1', '#f43f5e', '#84cc16', '#14b8a6'
  ];

  // Prepare data for donut chart (top 10)
  const topCategories = categories.slice(0, 10);
  const pieData = topCategories.map(cat => ({
    name: cat.category,
    value: cat.totalSpend,
  }));

  // Risk level colors
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High': return 'text-red-600 bg-red-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'Low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'High': return <ShieldAlert className="h-4 w-4" />;
      case 'Medium': return <AlertTriangle className="h-4 w-4" />;
      case 'Low': return <Shield className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  // Calculate modal data for selected category
  const selectedCategoryData = selectedCategory ? (() => {
    const categoryInfo = categories.find(c => c.category === selectedCategory);
    if (!categoryInfo) return null;

    const categoryRecords = data.filter(r => r.category === selectedCategory);
    
    const subcategoryData = categoryRecords.reduce((acc, record) => {
      const subcategory = record.subcategory || 'Unspecified';
      const supplier = record.supplier || 'Unknown';
      
      if (!acc[subcategory]) {
        acc[subcategory] = {
          subcategory,
          totalSpend: 0,
          transactionCount: 0,
          suppliers: new Set<string>(),
        };
      }
      
      acc[subcategory].totalSpend += record.amount;
      acc[subcategory].transactionCount += 1;
      acc[subcategory].suppliers.add(supplier);
      
      return acc;
    }, {} as Record<string, {
      subcategory: string;
      totalSpend: number;
      transactionCount: number;
      suppliers: Set<string>;
    }>);

    const subcategories = Object.values(subcategoryData)
      .map(sub => ({
        ...sub,
        supplierCount: sub.suppliers.size,
        avgTransaction: sub.totalSpend / sub.transactionCount,
        percentage: (sub.totalSpend / categoryInfo.totalSpend) * 100,
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend);

    const largestSubcategory = subcategories[0];
    const subPieData = subcategories.slice(0, 10).map(sub => ({
      name: sub.subcategory,
      value: sub.totalSpend,
    }));

    return {
      categoryInfo,
      subcategories,
      largestSubcategory,
      subPieData,
    };
  })() : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Category Analysis</h1>
        <p className="text-gray-600 mt-1">Comprehensive category and subcategory spending analysis</p>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-600">Total Categories</CardTitle>
              <Package className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalCategories}</div>
            <p className="text-xs text-gray-500 mt-1">Unique categories</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-600">Most Complex</CardTitle>
              <Layers className="h-5 w-5 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-gray-900 truncate" title={mostComplexCategory?.category}>
              {mostComplexCategory?.category}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {mostComplexCategory?.subcategoryCount} subcategories
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-600">Avg Subcategories</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{avgSubcategories.toFixed(1)}</div>
            <p className="text-xs text-gray-500 mt-1">Per category</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-600">Highest Risk</CardTitle>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-gray-900 truncate" title={highestRiskCategory?.category}>
              {highestRiskCategory?.category}
            </div>
            <p className="text-xs text-red-600 mt-1 font-semibold">
              {highestRiskCategory?.riskLevel} Risk • {highestRiskCategory?.concentration.toFixed(0)}% concentration
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subcategory Analysis Summary */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-green-600" />
            Subcategory Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <div key={cat.category} className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
                <div className="text-sm font-semibold text-gray-900 truncate" title={cat.category}>
                  {cat.category}
                </div>
                <div className="text-2xl font-bold text-green-600 mt-2">
                  {cat.subcategoryCount}
                </div>
                <div className="text-xs text-gray-500 mt-1">subcategories</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Top 10 categories by total spend</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={60}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => value.length > 30 ? value.substring(0, 30) + '...' : value}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Top 10 Categories by Spend</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Ranked by total procurement spend</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart 
                data={topCategories.map(cat => ({
                  category: cat.category.length > 20 ? cat.category.substring(0, 20) + '...' : cat.category,
                  spend: cat.totalSpend,
                }))} 
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="category" width={150} />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Bar dataKey="spend" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Comprehensive Category Analysis Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Detailed Category Analysis</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Complete breakdown with subcategory metrics, supplier analysis, and risk assessment</p>
            </div>
            <div className="text-sm text-gray-600">
              {searchQuery && (
                <span>
                  {filteredCategories.length} of {categories.length} categories
                </span>
              )}
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search categories by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Total Spend</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">% of Total</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Subcategories</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Top Subcategory</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Concentration</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Suppliers</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Avg/Supplier</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Risk Level</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No categories found</p>
                      <p className="text-sm text-gray-400 mt-1">Try adjusting your search query</p>
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => (
                  <tr key={cat.category} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{cat.category}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      ${cat.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {cat.percentage.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                      {cat.subcategoryCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-[150px]" title={cat.topSubcategory}>
                      {cat.topSubcategory}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {cat.concentration.toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {cat.supplierCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      ${cat.avgPerSupplier.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getRiskColor(cat.riskLevel)}`}>
                        {getRiskIcon(cat.riskLevel)}
                        {cat.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCategory(cat.category)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Category Drill-Down Modal */}
      {selectedCategoryData && (
          <Dialog open={true} onOpenChange={() => setSelectedCategory(null)}>
            <DialogContent className="!max-w-7xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{selectedCategory} - Detailed Analysis</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="border-0 shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-semibold text-gray-600">Total Subcategories</CardTitle>
                        <Layers className="h-4 w-4 text-blue-500" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-900">{selectedCategoryData.subcategories.length}</div>
                      <p className="text-xs text-gray-500 mt-1">Unique subcategories</p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-semibold text-gray-600">Largest Subcategory</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-bold text-gray-900 truncate" title={selectedCategoryData.largestSubcategory?.subcategory}>
                        {selectedCategoryData.largestSubcategory?.subcategory}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        ${(selectedCategoryData.largestSubcategory?.totalSpend || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-semibold text-gray-600">Total Suppliers</CardTitle>
                        <Package className="h-4 w-4 text-purple-500" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-900">{selectedCategoryData.categoryInfo.supplierCount}</div>
                      <p className="text-xs text-gray-500 mt-1">Across all subcategories</p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-semibold text-gray-600">Risk Level</CardTitle>
                        {getRiskIcon(selectedCategoryData.categoryInfo.riskLevel)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-xl font-bold ${selectedCategoryData.categoryInfo.riskLevel === 'High' ? 'text-red-600' : selectedCategoryData.categoryInfo.riskLevel === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                        {selectedCategoryData.categoryInfo.riskLevel}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{selectedCategoryData.categoryInfo.concentration.toFixed(0)}% concentration</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Subcategory Distribution Donut */}
                  <Card className="border-0 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg">Subcategory Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={selectedCategoryData.subPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={false}
                          >
                            {selectedCategoryData.subPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => `$${value.toLocaleString()}`}
                            contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px' }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={50}
                            iconType="circle"
                            wrapperStyle={{ fontSize: '11px' }}
                            formatter={(value) => value.length > 25 ? value.substring(0, 25) + '...' : value}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Subcategory Bar Chart */}
                  <Card className="border-0 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg">Top 10 Subcategories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart 
                          data={selectedCategoryData.subcategories.slice(0, 10).map(sub => ({
                            subcategory: sub.subcategory.length > 20 ? sub.subcategory.substring(0, 20) + '...' : sub.subcategory,
                            spend: sub.totalSpend,
                          }))} 
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                          <YAxis type="category" dataKey="subcategory" width={120} style={{ fontSize: '11px' }} />
                          <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                          <Bar dataKey="spend" fill="#8b5cf6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Subcategory Table */}
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">Subcategory Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Subcategory</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Total Spend</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">% of Category</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Transactions</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Suppliers</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Avg/Transaction</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Concentration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedCategoryData.subcategories.map((sub) => (
                            <tr key={sub.subcategory} className="hover:bg-purple-50/50 transition-colors">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{sub.subcategory}</td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                ${sub.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-600">
                                {sub.percentage.toFixed(1)}%
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-600">
                                {sub.transactionCount.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-600">
                                {sub.supplierCount}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-600">
                                ${sub.avgTransaction.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-600">
                                {sub.percentage.toFixed(0)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </DialogContent>
          </Dialog>
        )}
    </div>
  );
}
