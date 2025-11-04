import { useMemo, useState } from 'react';
import { useFilteredProcurementData } from '@/hooks/useProcurementData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sun,
  TrendingUp,
  TrendingDown,
  Target,
  Lightbulb,
  Calendar
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Calendar and fiscal year month names
const CALENDAR_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FISCAL_MONTH_NAMES = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

export default function Seasonality() {
  const { data = [], isLoading } = useFilteredProcurementData();
  const [viewMode, setViewMode] = useState<'all' | number>('all');
  const [useFiscalYear, setUseFiscalYear] = useState(true);

  // Helper function to get fiscal year from date (Jul-Jun)
  const getFiscalYear = (dateStr: string): number => {
    const date = new Date(dateStr);
    const month = date.getMonth(); // 0-11
    const year = date.getFullYear();
    // If month is Jul-Dec (6-11), fiscal year is next year
    // If month is Jan-Jun (0-5), fiscal year is current year
    return month >= 6 ? year + 1 : year;
  };

  // Convert calendar month (1-12) to fiscal month (1-12)
  const calendarToFiscalMonth = (calendarMonth: number): number => {
    if (!useFiscalYear) return calendarMonth;
    // Calendar: Jan=1, Feb=2, ..., Dec=12
    // Fiscal: Jul=1, Aug=2, ..., Jun=12
    // If calendar month >= 7 (Jul-Dec), fiscal month = calendar - 6
    // If calendar month < 7 (Jan-Jun), fiscal month = calendar + 6
    return calendarMonth >= 7 ? calendarMonth - 6 : calendarMonth + 6;
  };

  // Get month names based on fiscal year setting
  const monthNames = useFiscalYear ? FISCAL_MONTH_NAMES : CALENDAR_MONTH_NAMES;

  // Extract fiscal years from data
  const availableYears = useMemo(() => {
    const years = new Set(data.map(record => getFiscalYear(record.date)));
    return Array.from(years).sort();
  }, [data]);

  // Filter data by view mode
  const viewFilteredData = useMemo(() => {
    if (viewMode === 'all') return data;
    return data.filter(record => getFiscalYear(record.date) === viewMode);
  }, [data, viewMode]);

  // Calculate monthly spending by fiscal year for chart
  const monthlyChartData = useMemo(() => {
    const result: any[] = [];
    
    for (let fiscalMonth = 1; fiscalMonth <= 12; fiscalMonth++) {
      const monthData: any = { 
        month: monthNames[fiscalMonth - 1],
        fiscalMonth 
      };
      
      // Calculate spending for each year
      availableYears.forEach(year => {
        const yearMonthData = data.filter(record => {
          if (getFiscalYear(record.date) !== year) return false;
          
          const recordDate = new Date(record.date);
          const calendarMonth = recordDate.getMonth() + 1; // 1-12
          const recordFiscalMonth = calendarToFiscalMonth(calendarMonth);
          
          return recordFiscalMonth === fiscalMonth;
        });
        
        monthData[`FY${year}`] = yearMonthData.reduce((sum, record) => sum + record.amount, 0);
      });
      
      // Calculate average across all years
      const yearValues = availableYears.map(year => monthData[`FY${year}`] || 0);
      monthData.Average = yearValues.length > 0 ? yearValues.reduce((a, b) => a + b, 0) / yearValues.length : 0;
      
      result.push(monthData);
    }
    
    return result;
  }, [data, availableYears, useFiscalYear, monthNames]);

  // Calculate seasonality metrics per category
  const categorySeasonality = useMemo(() => {
    const categories = Array.from(new Set(viewFilteredData.map(record => record.category)));
    
    return categories.map(category => {
      const categoryData = viewFilteredData.filter(record => record.category === category);
      
      // Group by fiscal month
      const monthlySpend: number[] = [];
      for (let fiscalMonth = 1; fiscalMonth <= 12; fiscalMonth++) {
        const monthData = categoryData.filter(record => {
          const recordDate = new Date(record.date);
          const calendarMonth = recordDate.getMonth() + 1; // 1-12
          const recordFiscalMonth = calendarToFiscalMonth(calendarMonth);
          return recordFiscalMonth === fiscalMonth;
        });
        monthlySpend.push(monthData.reduce((sum, record) => sum + record.amount, 0));
      }
      
      // Find peak and low months
      const maxSpend = Math.max(...monthlySpend);
      const minSpend = Math.min(...monthlySpend.filter(s => s > 0));
      const peakMonthIndex = monthlySpend.indexOf(maxSpend);
      const lowMonthIndex = monthlySpend.indexOf(minSpend);
      
      // Calculate total spend and average monthly spend
      const totalSpend = categoryData.reduce((sum, record) => sum + record.amount, 0);
      const avgMonthlySpend = monthlySpend.reduce((a, b) => a + b, 0) / monthlySpend.length;
      
      // Calculate seasonal indices (normalized, where average = 100)
      const seasonalIndices = monthlySpend.map(spend => 
        avgMonthlySpend > 0 ? (spend / avgMonthlySpend) * 100 : 100
      );
      
      // Find peak month and calculate peak spend percentage
      const peakMonthSpend = monthlySpend[peakMonthIndex];
      const peakSpendPercentage = totalSpend > 0 ? (peakMonthSpend / totalSpend) * 100 : 0;
      
      // Calculate seasonality strength (coefficient of variation on indices)
      const meanIndex = seasonalIndices.reduce((sum, val) => sum + val, 0) / seasonalIndices.length;
      const varianceIndex = seasonalIndices.reduce((sum, val) => sum + Math.pow(val - meanIndex, 2), 0) / seasonalIndices.length;
      const stdDevIndex = Math.sqrt(varianceIndex);
      const seasonalityStrength = meanIndex > 0 ? (stdDevIndex / meanIndex) * 100 : 0;
      
      // Calculate savings potential based on seasonality strength
      // Apply savings rate to peak month spending only (not total spend)
      let savingsRate = 0;
      
      if (seasonalityStrength > 30) {
        // High seasonality: 15-25% savings (use optimistic 25%)
        savingsRate = 0.25;
      } else if (seasonalityStrength > 20) {
        // Medium seasonality: 10-20% savings (use optimistic 20%)
        savingsRate = 0.20;
      } else {
        // Low seasonality: 5-10% savings (use optimistic 10%)
        savingsRate = 0.10;
      }
      
      // Savings = Total Spend × Peak Month % × Savings Rate
      const savingsPotential = totalSpend * (peakSpendPercentage / 100) * savingsRate;
      
      // Calculate YoY growth
      const fy2024Data = categoryData.filter(r => getFiscalYear(r.date) === 2024);
      const fy2025Data = categoryData.filter(r => getFiscalYear(r.date) === 2025);
      const fy2024Total = fy2024Data.reduce((sum, r) => sum + r.amount, 0);
      const fy2025Total = fy2025Data.reduce((sum, r) => sum + r.amount, 0);
      const yoyGrowth = fy2024Total > 0 ? ((fy2025Total - fy2024Total) / fy2024Total) * 100 : 0;
      
      // Determine impact level based on seasonality strength
      let impactLevel: 'High' | 'Medium' | 'Low' = 'Low';
      if (seasonalityStrength > 30) impactLevel = 'High';
      else if (seasonalityStrength > 15) impactLevel = 'Medium';
      
      return {
        category,
        peakMonth: monthNames[peakMonthIndex],
        lowMonth: monthNames[lowMonthIndex],
        seasonalityStrength,
        savingsPotential,
        impactLevel,
        totalSpend,
        yoyGrowth,
        fy2024Total,
        fy2025Total
      };
    })
    .filter(c => c.seasonalityStrength > 15) // Only show categories with meaningful seasonality
    .sort((a, b) => b.savingsPotential - a.savingsPotential);
  }, [viewFilteredData, useFiscalYear, monthNames]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const categoriesAnalyzed = categorySeasonality.length;
    const opportunitiesFound = categorySeasonality.filter(c => c.seasonalityStrength > 15).length;
    const highImpact = categorySeasonality.filter(c => c.impactLevel === 'High').length;
    const totalSavingsPotential = categorySeasonality.reduce((sum, c) => sum + c.savingsPotential, 0);
    
    // Calculate average YoY growth
    const avgYoYGrowth = categorySeasonality.length > 0
      ? categorySeasonality.reduce((sum, c) => sum + c.yoyGrowth, 0) / categorySeasonality.length
      : 0;
    
    return {
      categoriesAnalyzed,
      opportunitiesFound,
      highImpact,
      totalSavingsPotential,
      avgYoYGrowth
    };
  }, [categorySeasonality]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading seasonality data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-8">
        <Calendar className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Seasonality Analysis Ready</h3>
        <p className="text-gray-600 mb-4">
          Upload your procurement data with date information to discover seasonal patterns and optimization opportunities.
        </p>
        <p className="text-sm text-gray-500">
          <strong>Required columns:</strong> Date, Amount, Category, Supplier
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
              <Sun className="h-6 w-6 text-yellow-500" />
              Seasonality Intelligence & Optimization Opportunities
            </h1>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="bg-white">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-blue-600">{summaryMetrics.categoriesAnalyzed}</div>
                <div className="text-sm text-gray-600 mt-1">Categories Analyzed</div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-blue-600">{summaryMetrics.opportunitiesFound}</div>
                <div className="text-sm text-gray-600 mt-1">Opportunities Found</div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-blue-600">{summaryMetrics.highImpact}</div>
                <div className="text-sm text-gray-600 mt-1">High Impact</div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-cyan-600">
                  ${summaryMetrics.totalSavingsPotential.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-gray-600 mt-1">Savings Potential</div>
              </CardContent>
            </Card>
          </div>

          {/* Key Insights */}
          <Card className="bg-white">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <Target className="h-5 w-5 text-pink-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-gray-800">Key Insights</span>
                  <p className="text-sm text-gray-700 mt-1">
                    Analysis of {summaryMetrics.categoriesAnalyzed} categories revealed {summaryMetrics.opportunitiesFound} optimization opportunities with potential savings of ${summaryMetrics.totalSavingsPotential.toLocaleString()}. {summaryMetrics.highImpact} high-impact opportunities identified for immediate action.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">View Mode:</span>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('all')}
            >
              All Years
            </Button>
            {availableYears.map(year => (
              <Button
                key={year}
                variant={viewMode === year ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode(year)}
              >
                FY{year}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Years Available:</span> {availableYears.map(y => `FY${y}`).join(', ')}
            {availableYears.length >= 2 && (
              <>
                {' | '}
                <span className="font-medium">Avg YoY Growth %:</span>{' '}
                <span className={summaryMetrics.avgYoYGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {summaryMetrics.avgYoYGrowth >= 0 ? '+' : ''}{summaryMetrics.avgYoYGrowth.toFixed(1)}%
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="fiscal-year"
              checked={useFiscalYear}
              onCheckedChange={(checked) => setUseFiscalYear(checked as boolean)}
            />
            <label htmlFor="fiscal-year" className="text-sm font-medium text-blue-600 cursor-pointer">
              Use Fiscal Year (Jul-Jun)
            </label>
          </div>
        </div>
      </div>

      {/* Seasonality Summary */}
      {categorySeasonality.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {/* Highest Seasonality */}
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Highest Seasonality</h3>
                  <p className="text-lg font-bold text-gray-900">{categorySeasonality[0].category}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Strength:</span> {categorySeasonality[0].seasonalityStrength.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Peak:</span> {categorySeasonality[0].peakMonth} | 
                      <span className="font-medium"> Low:</span> {categorySeasonality[0].lowMonth}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lowest Seasonality */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Lowest Seasonality</h3>
                  <p className="text-lg font-bold text-gray-900">{categorySeasonality[categorySeasonality.length - 1].category}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Strength:</span> {categorySeasonality[categorySeasonality.length - 1].seasonalityStrength.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Peak:</span> {categorySeasonality[categorySeasonality.length - 1].peakMonth} | 
                      <span className="font-medium"> Low:</span> {categorySeasonality[categorySeasonality.length - 1].lowMonth}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Seasonal Patterns Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Seasonal Patterns Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">
              {viewMode === 'all' 
                ? `Multi-Year Seasonality Analysis (${useFiscalYear ? 'Fiscal Year' : 'Calendar Year'})`
                : `FY${viewMode} Seasonality Analysis (${useFiscalYear ? 'Fiscal Year' : 'Calendar Year'})`
              }
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                label={{ value: useFiscalYear ? 'Fiscal Year Month' : 'Calendar Month', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                label={{ value: 'Total Spend', angle: -90, position: 'insideLeft' }}
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
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
              />
              {viewMode === 'all' ? (
                // Show all years plus average when in "All Years" mode
                <>
                  {availableYears.map((year, idx) => (
                    <Line
                      key={year}
                      type="monotone"
                      dataKey={`FY${year}`}
                      stroke={idx === 0 ? '#06b6d4' : '#10b981'}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="Average"
                    stroke="#6b7280"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                  />
                </>
              ) : (
                // Show only selected year when specific year is selected
                <Line
                  type="monotone"
                  dataKey={`FY${viewMode}`}
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                  activeDot={{ r: 7 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Opportunity Cards */}
      <div className="space-y-4">
        {categorySeasonality.map((category, idx) => (
          <Card key={idx} className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Category Header */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {category.category} - Off-Peak Contracting
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Peak spending in {category.peakMonth}, low in {category.lowMonth}. Seasonality strength: {category.seasonalityStrength.toFixed(1)}%
                  </p>
                  
                  {/* YoY Growth Badge */}
                  {availableYears.length >= 2 && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-gray-600">YoY Growth (FY2024 → FY2025):</span>
                      <Badge variant={category.yoyGrowth >= 0 ? 'default' : 'destructive'} className="gap-1">
                        {category.yoyGrowth >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {category.yoyGrowth >= 0 ? '+' : ''}{category.yoyGrowth.toFixed(1)}%
                      </Badge>
                      <span className="text-sm text-gray-500">
                        ${category.fy2024Total.toLocaleString()} → ${category.fy2025Total.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-cyan-50">
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-cyan-700">
                        ${category.savingsPotential.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Savings Potential</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-cyan-50">
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-cyan-700">{category.impactLevel}</div>
                      <div className="text-sm text-gray-600 mt-1">Impact Level</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-cyan-50">
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-cyan-700">6-12 months</div>
                      <div className="text-sm text-gray-600 mt-1">Timeline</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recommendation */}
                <div className="bg-yellow-50 border-l-4 border-l-yellow-400 p-4 rounded">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      Contract during {category.lowMonth} (low demand) for {category.peakMonth} (peak demand) services to optimize costs.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categorySeasonality.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">
              No significant seasonal patterns detected in the current data. Try adjusting filters or uploading more historical data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
