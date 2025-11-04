import { FileUpload } from '@/components/FileUpload';
import { useProcurementData, useUploadData, useClearData, useProcurementStats } from '@/hooks/useProcurementData';
import type { ProcurementRecord } from '@/lib/csvParser';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileSpreadsheet, TrendingUp, DollarSign, Package, Trash2, Upload, BarChart3, PieChart, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export default function Home() {
  const { data = [] } = useProcurementData();
  const uploadData = useUploadData();
  const clearData = useClearData();
  const stats = useProcurementStats();
  const [, setLocation] = useLocation();

  const handleDataParsed = (parsedData: ProcurementRecord[]) => {
    uploadData.mutate(parsedData, {
      onSuccess: () => {
        // Redirect to Overview page after successful upload
        setTimeout(() => {
          setLocation('/');
        }, 1500); // Give user time to see success message
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <FileSpreadsheet className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Transform your procurement data into actionable insights
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10">
        {data.length === 0 ? (
          /* Upload State */
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold text-gray-900 mb-3">
                Get Started
              </h2>
              <p className="text-lg text-gray-600">
                Upload your procurement data file to unlock powerful analytics
              </p>
            </div>
            
            <div className="mb-12">
              <FileUpload onDataParsed={handleDataParsed} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <Card className="relative border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <CardContent className="pt-8 pb-6">
                    <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl mb-4 shadow-lg">
                      <BarChart3 className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Spend Analysis</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Visualize spending patterns across categories and identify cost-saving opportunities
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <Card className="relative border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <CardContent className="pt-8 pb-6">
                    <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl mb-4 shadow-lg">
                      <PieChart className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Supplier Insights</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Analyze vendor performance and optimize your supplier relationships
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <Card className="relative border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <CardContent className="pt-8 pb-6">
                    <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl mb-4 shadow-lg">
                      <TrendingUp className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Cost Savings</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Discover hidden savings and improve procurement efficiency
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          /* Data Loaded State */
          <div>
            {/* Action Bar */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Data Overview
                    </h2>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {stats.recordCount.toLocaleString()} procurement records loaded and ready
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => clearData.mutate()}
                    className="border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Data
                  </Button>
                  <FileUpload onDataParsed={handleDataParsed} />
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                <Card className="relative border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-gray-400 to-gray-600"></div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Total Records
                      </CardTitle>
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold bg-gradient-to-br from-gray-700 to-gray-900 bg-clip-text text-transparent">
                      {stats.recordCount.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Transactions processed</p>
                  </CardContent>
                </Card>
              </div>

              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                <Card className="relative border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-green-400 to-emerald-600"></div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Total Spend
                      </CardTitle>
                      <DollarSign className="h-5 w-5 text-green-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold bg-gradient-to-br from-green-600 to-emerald-700 bg-clip-text text-transparent">
                      ${(stats.totalSpend / 1000000).toFixed(1)}M
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      ${stats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                <Card className="relative border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-400 to-indigo-600"></div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Suppliers
                      </CardTitle>
                      <Package className="h-5 w-5 text-blue-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold bg-gradient-to-br from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                      {stats.uniqueSuppliers}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Active vendors</p>
                  </CardContent>
                </Card>
              </div>

              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                <Card className="relative border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-purple-400 to-pink-600"></div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Categories
                      </CardTitle>
                      <PieChart className="h-5 w-5 text-purple-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold bg-gradient-to-br from-purple-600 to-pink-700 bg-clip-text text-transparent">
                      {stats.uniqueCategories}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Spend categories</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Data Preview */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">Recent Transactions</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Supplier</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.slice(0, 10).map((record, index) => (
                        <tr key={index} className="hover:bg-indigo-50/50 transition-colors duration-150">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.supplier}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {record.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                            ${record.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{record.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.length > 10 && (
                    <div className="text-center py-5 text-sm text-gray-500 bg-gradient-to-r from-gray-50 to-gray-100 border-t">
                      Showing 10 of {data.length.toLocaleString()} records • 
                      <span className="text-indigo-600 font-medium ml-1">View all in Overview tab</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
