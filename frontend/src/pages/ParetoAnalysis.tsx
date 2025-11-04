import { useState } from 'react';
import { useFilteredProcurementData } from '@/hooks/useProcurementData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ComposedChart, Bar, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Target, AlertTriangle, DollarSign, Package, MapPin, Calendar } from 'lucide-react';

export default function ParetoAnalysis() {
  const { data = [] } = useFilteredProcurementData();
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600">Upload your procurement data to see Pareto analysis.</p>
        </div>
      </div>
    );
  }

  // Calculate supplier spend
  const supplierSpend = data.reduce((acc, record) => {
    const supplier = record.supplier || 'Unknown';
    acc[supplier] = (acc[supplier] || 0) + record.amount;
    return acc;
  }, {} as Record<string, number>);

  // Sort suppliers by spend (descending)
  const sortedSuppliers = Object.entries(supplierSpend)
    .map(([supplier, spend]) => ({ supplier, spend }))
    .sort((a, b) => b.spend - a.spend);

  const totalSpend = sortedSuppliers.reduce((sum, s) => sum + s.spend, 0);

  // Calculate cumulative percentages and classifications
  let cumulativeSpend = 0;
  const suppliersWithCumulative = sortedSuppliers.map((sup, index) => {
    cumulativeSpend += sup.spend;
    const cumulativePercentage = (cumulativeSpend / totalSpend) * 100;
    const percentage = (sup.spend / totalSpend) * 100;
    
    // Determine classification and priority
    let classification: string;
    let priority: string;
    let recommendedAction: string;
    
    if (cumulativePercentage <= 80) {
      classification = 'Critical (80%)';
      priority = 'Strategic';
      recommendedAction = 'Partnership Development';
    } else if (cumulativePercentage <= 90) {
      classification = 'Important (90%)';
      priority = 'Tactical';
      recommendedAction = 'Performance Monitoring';
    } else if (cumulativePercentage <= 95) {
      classification = 'Standard';
      priority = 'Operational';
      recommendedAction = 'Regular Review';
    } else {
      classification = 'Low Impact';
      priority = 'Minimal';
      recommendedAction = 'Consolidation Review';
    }

    return {
      rank: index + 1,
      supplier: sup.supplier,
      spend: sup.spend,
      percentage,
      cumulativePercentage,
      classification,
      priority,
      recommendedAction,
    };
  });

  // Calculate key metrics
  const suppliersFor80 = suppliersWithCumulative.filter(s => s.cumulativePercentage <= 80).length;
  const suppliersFor90 = suppliersWithCumulative.filter(s => s.cumulativePercentage <= 90).length;
  const efficiencyRatio = totalSpend > 0 ? (suppliersFor80 / sortedSuppliers.length) * 100 : 0;
  const topSupplierShare = sortedSuppliers.length > 0 ? (sortedSuppliers[0].spend / totalSpend) * 100 : 0;

  // Prepare chart data (top 20 suppliers)
  const chartData = suppliersWithCumulative.slice(0, 20).map(s => ({
    name: s.supplier.length > 15 ? s.supplier.substring(0, 15) + '...' : s.supplier,
    fullName: s.supplier, // Store full name for modal lookup
    spend: s.spend,
    cumulative: parseFloat(s.cumulativePercentage.toFixed(1)),
  }));

  // Get classification badge color
  const getClassificationColor = (classification: string) => {
    if (classification.includes('Critical')) return 'bg-red-100 text-red-800 border-red-200';
    if (classification.includes('Important')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (classification.includes('Standard')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Insights & Interpretation Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-yellow-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-amber-600" />
            <CardTitle className="text-amber-900">Pareto Analysis Insights & Interpretation</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-100">
              <div className="text-3xl font-bold text-amber-900">{suppliersFor80}</div>
              <div className="text-sm text-amber-700 mt-1">Suppliers (80% spend)</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-100">
              <div className="text-3xl font-bold text-amber-900">{efficiencyRatio.toFixed(1)}%</div>
              <div className="text-sm text-amber-700 mt-1">Efficiency Ratio</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-100">
              <div className="text-3xl font-bold text-amber-900">{topSupplierShare.toFixed(1)}%</div>
              <div className="text-sm text-amber-700 mt-1">Top Supplier Share</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-100">
              <div className="text-3xl font-bold text-amber-900">{suppliersFor90}</div>
              <div className="text-sm text-amber-700 mt-1">Suppliers (90% spend)</div>
            </div>
          </div>

          {/* Strategic Analysis */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-amber-100">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <h3 className="font-bold text-amber-900">Strategic Analysis & Recommendations</h3>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              <span className="font-semibold">Excellent Pareto Distribution:</span> Only {efficiencyRatio.toFixed(1)}% of suppliers account for 80% of spend, indicating a highly efficient supplier base with strong concentration among key partners. <span className="font-semibold text-red-600">High Dependency Risk:</span> The top supplier represents {topSupplierShare.toFixed(1)}% of total spend, creating potential supply chain risk.
            </p>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-amber-900">Recommended Actions:</span> Focus on deepening partnerships with top suppliers and implementing strategic supplier development programs. Develop alternative suppliers to reduce dependency risk.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pareto Chart */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <CardTitle>Pareto Analysis (80/20 Rule)</CardTitle>
          </div>
          <p className="text-sm text-gray-600 mt-1">Pareto Analysis - Top 20 Suppliers (80/20 Rule)</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData} margin={{ top: 20, right: 60, left: 60, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'Spend') return [`$${value.toLocaleString()}`, 'Spend'];
                  if (name === 'Cumulative %') return [`${value.toFixed(1)}%`, 'Cumulative %'];
                  return value;
                }}
                labelFormatter={(label) => label}
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
                formatter={(value) => <span style={{ color: '#374151', fontSize: '14px' }}>{value}</span>}
              />
              <Bar 
                yAxisId="left" 
                dataKey="spend" 
                fill="#3b82f6" 
                name="Spend"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(data) => {
                  if (data && data.fullName) {
                    setSelectedSupplier(data.fullName);
                  }
                }}
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="cumulative" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="Cumulative %"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Pareto Details with Strategic Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-800 text-white sticky top-0">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Supplier</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase">Spend</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase">Cumulative %</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase">Classification</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase">Strategic Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {suppliersWithCumulative.map((sup) => (
                  <tr key={sup.rank} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">#{sup.rank}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{sup.supplier}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                      ${sup.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">
                      {sup.cumulativePercentage.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge className={`${getClassificationColor(sup.classification)} border`}>
                        {sup.classification}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-700 font-medium">
                      {sup.priority}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {sup.recommendedAction}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Drill-Down Modal */}
      <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
        <DialogContent className="!max-w-6xl max-h-[90vh] overflow-y-auto">
          {selectedSupplier && (() => {
            // Filter data for selected supplier
            const supplierData = data.filter(r => r.supplier === selectedSupplier);
            const totalSpend = supplierData.reduce((sum, r) => sum + r.amount, 0);
            const transactionCount = supplierData.length;
            
            // Get date range
            const dates = supplierData.map(r => new Date(r.date));
            const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
            
            // Category breakdown
            const categorySpend = supplierData.reduce((acc, r) => {
              acc[r.category] = (acc[r.category] || 0) + r.amount;
              return acc;
            }, {} as Record<string, number>);
            const categoryData = Object.entries(categorySpend)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value);
            
            // Subcategory breakdown
            const subcategorySpend = supplierData.reduce((acc, r) => {
              acc[r.subcategory] = (acc[r.subcategory] || 0) + r.amount;
              return acc;
            }, {} as Record<string, number>);
            const subcategoryData = Object.entries(subcategorySpend)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 10);
            
            // Location breakdown
            const locationSpend = supplierData.reduce((acc, r) => {
              acc[r.location] = (acc[r.location] || 0) + r.amount;
              return acc;
            }, {} as Record<string, number>);
            const locationData = Object.entries(locationSpend)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 10);
            
            const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#f97316', '#14b8a6', '#a855f7'];
            
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">Supplier Details: {selectedSupplier}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 mt-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <DollarSign className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Spend</p>
                            <p className="text-2xl font-bold">${totalSpend.toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-purple-100 rounded-lg">
                            <Package className="h-6 w-6 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Transactions</p>
                            <p className="text-2xl font-bold">{transactionCount}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-green-100 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Avg Transaction</p>
                            <p className="text-2xl font-bold">${(totalSpend / transactionCount).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-amber-100 rounded-lg">
                            <Calendar className="h-6 w-6 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Date Range</p>
                            <p className="text-sm font-semibold">{minDate.toLocaleDateString()} - {maxDate.toLocaleDateString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Category Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Spending by Category
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                          <Legend 
                            layout="vertical" 
                            align="right" 
                            verticalAlign="middle"
                            formatter={(value, entry: any) => {
                              const percentage = ((entry.payload.value / totalSpend) * 100).toFixed(1);
                              return `${value} (${percentage}%)`;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  
                  {/* Subcategory Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Top 10 Subcategories
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {subcategoryData.map((item, index) => {
                          const percentage = ((item.value / totalSpend) * 100).toFixed(1);
                          return (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                                  <span className="text-sm text-gray-600">${item.value.toLocaleString()} ({percentage}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Location Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Top 10 Locations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {locationData.map((item, index) => {
                          const percentage = ((item.value / totalSpend) * 100).toFixed(1);
                          return (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                                  <span className="text-sm text-gray-600">${item.value.toLocaleString()} ({percentage}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-purple-600 h-2 rounded-full" 
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
