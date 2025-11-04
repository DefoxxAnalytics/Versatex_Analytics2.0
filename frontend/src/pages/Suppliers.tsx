import { useState } from 'react';
import { useFilteredProcurementData } from '@/hooks/useProcurementData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, DollarSign, Percent, AlertTriangle, Shield, ShieldAlert, Search, X } from 'lucide-react';

export default function Suppliers() {
  const { data = [] } = useFilteredProcurementData();
  const [searchQuery, setSearchQuery] = useState('');

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600">Upload your procurement data to see supplier analysis.</p>
        </div>
      </div>
    );
  }

  // Calculate supplier metrics
  const supplierData = data.reduce((acc, record) => {
    const supplier = record.supplier || 'Unknown';
    if (!acc[supplier]) {
      acc[supplier] = {
        supplier,
        totalSpend: 0,
        transactionCount: 0,
        avgTransaction: 0,
        categories: new Set<string>(),
      };
    }
    acc[supplier].totalSpend += record.amount;
    acc[supplier].transactionCount += 1;
    acc[supplier].categories.add(record.category);
    return acc;
  }, {} as Record<string, { supplier: string; totalSpend: number; transactionCount: number; avgTransaction: number; categories: Set<string> }>);

  // Calculate averages and sort
  const suppliers = Object.values(supplierData)
    .map(sup => ({
      ...sup,
      avgTransaction: sup.totalSpend / sup.transactionCount,
      categoryCount: sup.categories.size,
      percentage: (sup.totalSpend / data.reduce((sum, r) => sum + r.amount, 0)) * 100,
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend);

  const totalSpend = suppliers.reduce((sum, sup) => sum + sup.totalSpend, 0);
  const topSuppliers = suppliers.slice(0, 10);

  // Filter suppliers based on search query
  const filteredSuppliers = searchQuery.trim()
    ? suppliers.filter(sup => 
        sup.supplier.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : suppliers;

  // Calculate Herfindahl-Hirschman Index (HHI) for supplier concentration
  // HHI = Σ(market share%)²
  // Range: 0-10,000
  // < 1,500 = Low concentration (competitive)
  // 1,500-2,500 = Moderate concentration
  // > 2,500 = High concentration (risk)
  const hhi = suppliers.reduce((sum, sup) => {
    const marketShare = sup.percentage; // Already in percentage
    return sum + (marketShare * marketShare);
  }, 0);

  const getHHIRiskLevel = (hhi: number) => {
    if (hhi < 1500) return { level: 'Low', color: 'text-green-600', bgColor: 'bg-green-50', icon: Shield };
    if (hhi < 2500) return { level: 'Moderate', color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: AlertTriangle };
    return { level: 'High', color: 'text-red-600', bgColor: 'bg-red-50', icon: ShieldAlert };
  };

  const hhiRisk = getHHIRiskLevel(hhi);

  // Calculate concentration risk (top 3 suppliers)
  const top3Concentration = (suppliers.slice(0, 3).reduce((sum, sup) => sum + sup.totalSpend, 0) / totalSpend) * 100;

  // Colors for charts
  const COLORS = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#06b6d4', '#6366f1', '#f43f5e', '#84cc16', '#14b8a6'
  ];

  // Prepare data for pie chart
  const pieData = topSuppliers.map(sup => ({
    name: sup.supplier,
    value: sup.totalSpend,
  }));

  // Prepare data for bar chart
  const barData = topSuppliers.map(sup => ({
    supplier: sup.supplier.length > 20 ? sup.supplier.substring(0, 20) + '...' : sup.supplier,
    spend: sup.totalSpend,
    transactions: sup.transactionCount,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Supplier Analysis</h1>
        <p className="text-gray-600 mt-1">Analyze vendor performance and spending patterns</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-600">Total Suppliers</CardTitle>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{suppliers.length}</div>
            <p className="text-xs text-gray-500 mt-1">Active vendors</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-600">Total Spend</CardTitle>
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              ${(totalSpend / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-gray-500 mt-1">Across all suppliers</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-600">Top Supplier</CardTitle>
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-gray-900 truncate">
              {suppliers[0]?.supplier}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ${(suppliers[0]?.totalSpend / 1000).toFixed(0)}K spend
            </p>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-lg ${top3Concentration > 50 ? 'bg-red-50' : ''}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-600">Concentration Risk</CardTitle>
              {top3Concentration > 50 ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : (
                <Percent className="h-5 w-5 text-orange-500" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${top3Concentration > 50 ? 'text-red-600' : 'text-gray-900'}`}>
              {top3Concentration.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Top 3 suppliers</p>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-lg ${hhiRisk.bgColor}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-600">HHI Score</CardTitle>
              <hhiRisk.icon className={`h-5 w-5 ${hhiRisk.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${hhiRisk.color}`}>
              {hhi.toFixed(0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              <span className={`font-semibold ${hhiRisk.color}`}>{hhiRisk.level}</span> concentration
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Spend Distribution by Supplier</CardTitle>
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
            <CardTitle>Top 10 Suppliers by Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="supplier" width={150} />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Bar dataKey="spend" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Supplier Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Supplier Details</CardTitle>
            <div className="text-sm text-gray-600">
              {searchQuery && (
                <span>
                  {filteredSuppliers.length} of {suppliers.length} suppliers
                </span>
              )}
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search suppliers by name..."
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
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Supplier</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Total Spend</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">% of Total</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Transactions</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Avg Transaction</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Categories</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No suppliers found</p>
                      <p className="text-sm text-gray-400 mt-1">Try adjusting your search query</p>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((sup, index) => (
                  <tr key={sup.supplier} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{sup.supplier}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                      ${sup.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">
                      {sup.percentage.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">
                      {sup.transactionCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">
                      ${sup.avgTransaction.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">
                      {sup.categoryCount}
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
