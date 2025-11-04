import { useMemo, useState } from 'react';
import { useFilteredProcurementData } from '@/hooks/useProcurementData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Layers, 
  TrendingUp, 
  AlertTriangle, 
  Target,
  Users,
  DollarSign,
  Eye,
  Package,
  Calendar,
  MapPin
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

// Spend band definitions
const SPEND_BANDS = [
  { name: '0 - 1K', min: 0, max: 1000, label: '0-1K' },
  { name: '1K - 2K', min: 1000, max: 2000, label: '1K-2K' },
  { name: '2K - 5K', min: 2000, max: 5000, label: '2K-5K' },
  { name: '5K - 10K', min: 5000, max: 10000, label: '5K-10K' },
  { name: '10K - 25K', min: 10000, max: 25000, label: '10K-25K' },
  { name: '25K - 50K', min: 25000, max: 50000, label: '25K-50K' },
  { name: '50K - 100K', min: 50000, max: 100000, label: '50K-100K' },
  { name: '100K - 500K', min: 100000, max: 500000, label: '100K-500K' },
  { name: '500K - 1M', min: 500000, max: 1000000, label: '500K-1M' },
  { name: '1M and Above', min: 1000000, max: Infinity, label: '1M+' },
];

// Segment definitions
const SEGMENTS = [
  { name: 'Strategic', min: 1000000, max: Infinity, color: '#ef4444', strategy: 'Partnership & Innovation' },
  { name: 'Leverage', min: 100000, max: 1000000, color: '#f59e0b', strategy: 'Competitive Bidding' },
  { name: 'Routine', min: 10000, max: 100000, color: '#eab308', strategy: 'Efficiency & Automation' },
  { name: 'Tactical', min: 0, max: 10000, color: '#10b981', strategy: 'Consolidation' },
];

const SEGMENT_COLORS = {
  'Strategic': '#ef4444',
  'Leverage': '#f59e0b',
  'Routine': '#eab308',
  'Tactical': '#10b981',
};

export default function SpendStratification() {
  const { data = [], isLoading } = useFilteredProcurementData();
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  // Calculate spend band analysis using spendBand field from dataset
  const spendBandAnalysis = useMemo(() => {
    // Group records by spendBand
    const bandMap = new Map<string, { records: typeof data; suppliers: Set<string> }>();
    
    data.forEach(record => {
      const band = record.spendBand || 'Unknown';
      if (!bandMap.has(band)) {
        bandMap.set(band, { records: [], suppliers: new Set() });
      }
      const existing = bandMap.get(band)!;
      existing.records.push(record);
      existing.suppliers.add(record.supplier);
    });
    
    // Create analysis for each spend band
    return SPEND_BANDS.map(band => {
      const bandData = bandMap.get(band.name) || { records: [], suppliers: new Set() };
      const totalSpend = bandData.records.reduce((sum, r) => sum + r.amount, 0);
      const supplierCount = bandData.suppliers.size;
      const avgSpendPerSupplier = supplierCount > 0 ? totalSpend / supplierCount : 0;
      
      return {
        band: band.name,
        label: band.label,
        spendRange: band.name,
        totalSpend,
        percentOfTotal: 0, // Will calculate after
        suppliers: supplierCount,
        transactions: bandData.records.length,
        avgSpendPerSupplier,
      };
    });
  }, [data]);

  // Calculate percentages
  const totalSpend = useMemo(() => 
    spendBandAnalysis.reduce((sum, band) => sum + band.totalSpend, 0),
    [spendBandAnalysis]
  );

  const spendBandWithPercent = useMemo(() => 
    spendBandAnalysis.map(band => {
      const percentOfTotal = totalSpend > 0 ? (band.totalSpend / totalSpend) * 100 : 0;
      
      // Classify strategic importance based on spend percentage
      let strategicImportance: 'Tactical' | 'Strategic' | 'Critical' = 'Tactical';
      let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
      
      if (percentOfTotal > 30) {
        strategicImportance = 'Critical';
        riskLevel = 'High';
      } else if (percentOfTotal > 15) {
        strategicImportance = 'Strategic';
        riskLevel = 'Medium';
      }
      
      return {
        ...band,
        percentOfTotal,
        strategicImportance,
        riskLevel,
      };
    }),
    [spendBandAnalysis, totalSpend]
  );

  // Calculate segment analysis based on spend bands
  const segmentAnalysis = useMemo(() => {
    return SEGMENTS.map(segment => {
      // Find spend bands that fall within this segment
      const bandsInSegment = spendBandWithPercent.filter(band => {
        const bandMin = SPEND_BANDS.find(b => b.name === band.band)?.min || 0;
        return bandMin >= segment.min && bandMin < segment.max;
      });
      
      const segmentTotalSpend = bandsInSegment.reduce((sum, band) => sum + band.totalSpend, 0);
      const suppliers = bandsInSegment.reduce((sum, band) => sum + band.suppliers, 0);
      const percentOfTotal = totalSpend > 0 ? (segmentTotalSpend / totalSpend) * 100 : 0;
      
      return {
        segment: segment.name,
        spendRange: segment.min === 0 ? `<$${(segment.max / 1000).toFixed(0)}K` : 
                    segment.max === Infinity ? `>$${(segment.min / 1000000).toFixed(0)}M` :
                    `$${(segment.min / 1000).toFixed(0)}K-$${(segment.max / 1000).toFixed(0)}K`,
        totalSpend: segmentTotalSpend,
        percentOfTotal,
        suppliers,
        strategy: segment.strategy,
        color: segment.color,
      };
    });
  }, [spendBandWithPercent]);

  // Calculate metrics for top cards
  const metrics = useMemo(() => {
    const activeSpendBands = spendBandWithPercent.filter(b => b.suppliers > 0).length;
    const strategicBands = spendBandWithPercent.filter(b => 
      (b.strategicImportance === 'Strategic' || b.strategicImportance === 'Critical') && b.suppliers > 0
    ).length;
    const highestImpactBand = spendBandWithPercent.reduce((max, band) => 
      band.percentOfTotal > max.percentOfTotal ? band : max
    , spendBandWithPercent[0]);
    const mostFragmented = spendBandWithPercent.reduce((max, band) => 
      band.suppliers > max.suppliers ? band : max
    , spendBandWithPercent[0]);
    const complexBands = spendBandWithPercent.filter(b => b.suppliers >= 50).length;
    const highRiskBands = spendBandWithPercent.filter(b => 
      b.riskLevel === 'High' && b.suppliers > 0
    ).length;

    return {
      activeSpendBands,
      strategicBands,
      highestImpactBand,
      mostFragmented,
      complexBands,
      highRiskBands,
    };
  }, [spendBandWithPercent, segmentAnalysis]);

  // Strategic analysis
  const strategicAnalysis = useMemo(() => {
    const strategicSegment = segmentAnalysis.find(s => s.segment === 'Strategic');
    const avgSuppliersPerBand = spendBandWithPercent.reduce((sum, b) => sum + b.suppliers, 0) / spendBandWithPercent.length;
    
    let riskLevel = 'LOW';
    let riskColor = 'bg-green-100 text-green-800 border-green-300';
    
    if (strategicSegment && strategicSegment.percentOfTotal > 60) {
      riskLevel = 'HIGH - CONCENTRATION RISK REQUIRES IMMEDIATE ATTENTION';
      riskColor = 'bg-red-100 text-red-800 border-red-300';
    } else if (strategicSegment && strategicSegment.percentOfTotal > 40) {
      riskLevel = 'MEDIUM - MONITOR CONCENTRATION';
      riskColor = 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
    
    const recommendations = [];
    
    if (strategicSegment && strategicSegment.percentOfTotal > 50) {
      recommendations.push('Implement supplier diversification strategy within the dominant spend band');
      recommendations.push('Evaluate supplier consolidation opportunities to reduce administrative burden');
    }
    
    // Add band-specific recommendations
    spendBandWithPercent.forEach(band => {
      if (band.suppliers > 100 && band.label.includes('K') && !band.label.includes('M')) {
        recommendations.push(`${band.label}: Consider supplier consolidation to improve efficiency`);
      }
      if (band.percentOfTotal > 10 && band.suppliers < 5) {
        recommendations.push(`${band.label}: Consider supplier consolidation to improve efficiency`);
      }
    });
    
    return {
      riskLevel,
      riskColor,
      recommendations: recommendations.slice(0, 5), // Limit to 5 recommendations
      concentration: strategicSegment?.percentOfTotal || 0,
      avgSuppliersPerBand: Math.round(avgSuppliersPerBand),
    };
  }, [segmentAnalysis, spendBandWithPercent]);

  // Chart data with percentage calculation
  const chartDataTotalSpend = segmentAnalysis.reduce((sum, seg) => sum + seg.totalSpend, 0);
  const chartData = segmentAnalysis.map(seg => ({
    name: `${seg.segment} (${seg.spendRange})`,
    value: seg.totalSpend,
    color: seg.color,
    percentage: chartDataTotalSpend > 0 ? (seg.totalSpend / chartDataTotalSpend) * 100 : 0,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading spend stratification data...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Layers className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Upload your procurement data to see spend stratification analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Layers className="h-8 w-8 text-blue-600" />
          Spend Stratification
        </h1>
        <p className="text-gray-600 mt-1">
          Analyze spending patterns across different spend bands and supplier segments
        </p>
      </div>

      {/* SpendBand Analysis & Strategic Intelligence Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Target className="h-5 w-5" />
            Procurement Specialist SpendBand Analysis & Strategic Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="bg-white/80 border-blue-200">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {metrics.activeSpendBands}
                </div>
                <div className="text-xs font-semibold text-gray-700 mb-1">Active SpendBands</div>
                <div className="text-xs text-gray-500">Segmentation complexity</div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 border-blue-200">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {metrics.strategicBands}
                </div>
                <div className="text-xs font-semibold text-gray-700 mb-1">Strategic Bands</div>
                <div className="text-xs text-gray-500">Requiring executive attention</div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 border-blue-200">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {metrics.highestImpactBand.label}
                </div>
                <div className="text-xs font-semibold text-gray-700 mb-1">Highest Impact Band</div>
                <div className="text-xs text-gray-500">
                  {metrics.highestImpactBand.percentOfTotal.toFixed(1)}% of total spend
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 border-blue-200">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {metrics.highRiskBands}
                </div>
                <div className="text-xs font-semibold text-gray-700 mb-1">High Risk Bands</div>
                <div className="text-xs text-gray-500">Concentration concerns</div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 border-blue-200">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {metrics.mostFragmented.label}
                </div>
                <div className="text-xs font-semibold text-gray-700 mb-1">Most Fragmented</div>
                <div className="text-xs text-gray-500">{metrics.mostFragmented.suppliers} suppliers</div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 border-blue-200">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {metrics.complexBands}
                </div>
                <div className="text-xs font-semibold text-gray-700 mb-1">Complex Bands</div>
                <div className="text-xs text-gray-500">Management intensive</div>
              </CardContent>
            </Card>
          </div>

          {/* Strategic Analysis */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Procurement Specialist Strategic Analysis</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  <strong>High Concentration Risk:</strong> The {metrics.highestImpactBand.label} band represents{' '}
                  {metrics.highestImpactBand.percentOfTotal.toFixed(1)}% of total spend, creating significant exposure.{' '}
                  <strong>Supplier Base Complexity:</strong> Average of {strategicAnalysis.avgSuppliersPerBand} suppliers per
                  band indicates high management complexity.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Overall Risk Assessment:</span>
              <Badge className={`${strategicAnalysis.riskColor} border px-3 py-1`}>
                {strategicAnalysis.riskLevel}
              </Badge>
            </div>

            <div className="border-l-4 border-blue-400 pl-4 py-2 bg-white/50 rounded-r">
              <div className="flex items-start gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <h4 className="font-semibold text-gray-900 text-sm">Strategic Recommendations</h4>
              </div>
              <ul className="space-y-1.5 text-sm text-gray-700">
                {strategicAnalysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">—</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spend Stratification Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            Spend Stratification by Supplier Segments
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-visible">
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={100}
                outerRadius={160}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string, props: any) => {
                  const percentage = props.payload?.percentage || 0;
                  return [
                    `$${value.toLocaleString()} (${percentage.toFixed(2)}% of total spend)`,
                    ''
                  ];
                }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  padding: '12px',
                  zIndex: 1000
                }}
                wrapperStyle={{ zIndex: 1000 }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => <span className="text-sm">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stratification Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Stratification Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-800 text-white">
                  <th className="text-left p-3 font-semibold">Segment</th>
                  <th className="text-left p-3 font-semibold">Spend Range</th>
                  <th className="text-right p-3 font-semibold">Total Spend</th>
                  <th className="text-right p-3 font-semibold">% of Total</th>
                  <th className="text-right p-3 font-semibold">Suppliers</th>
                  <th className="text-left p-3 font-semibold">Strategy</th>
                  <th className="text-center p-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {segmentAnalysis.map((segment, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-3 font-medium">{segment.segment}</td>
                    <td className="p-3">{segment.spendRange}</td>
                    <td className="p-3 text-right font-semibold">
                      ${segment.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-3 text-right">{segment.percentOfTotal.toFixed(2)}%</td>
                    <td className="p-3 text-right">{segment.suppliers}</td>
                    <td className="p-3">{segment.strategy}</td>
                    <td className="p-3 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSegment(segment.segment)}
                        className="gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SpendBand Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            SpendBand Analysis (Sorted by SpendBand)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-800 text-white z-10">
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left p-3 font-semibold">SpendBand</th>
                  <th className="text-right p-3 font-semibold">Total Spend</th>
                  <th className="text-right p-3 font-semibold">% of Total</th>
                  <th className="text-right p-3 font-semibold">Suppliers</th>
                  <th className="text-right p-3 font-semibold">Transactions</th>
                  <th className="text-right p-3 font-semibold">Avg Spend per Supplier</th>
                </tr>
              </thead>
              <tbody>
                {spendBandWithPercent.map((band, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-3 font-medium">{band.band}</td>
                    <td className="p-3 text-right font-semibold">
                      ${band.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-3 text-right">{band.percentOfTotal.toFixed(2)}%</td>
                    <td className="p-3 text-right">{band.suppliers}</td>
                    <td className="p-3 text-right">{band.transactions.toLocaleString()}</td>
                    <td className="p-3 text-right">
                      ${band.avgSpendPerSupplier.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Segment Drill-Through Modal */}
      <Dialog open={!!selectedSegment} onOpenChange={() => setSelectedSegment(null)}>
        <DialogContent className="!max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Target className="h-6 w-6 text-blue-600" />
              {selectedSegment} Segment Analysis
            </DialogTitle>
          </DialogHeader>
          {selectedSegment && (() => {
            // Get segment definition
            const segmentDef = SEGMENTS.find(s => s.name === selectedSegment);
            if (!segmentDef) return null;

            // Find spend bands that belong to this segment (same logic as table)
            const bandsInSegment = spendBandWithPercent.filter(band => {
              const bandMin = SPEND_BANDS.find(b => b.name === band.band)?.min || 0;
              return bandMin >= segmentDef.min && bandMin < segmentDef.max;
            });

            // Get the spend band names for this segment
            const segmentBandNames = new Set(bandsInSegment.map(b => b.band));

            // Filter records that have SpendBand belonging to this segment
            const segmentRecords = data.filter(record => 
              record.spendBand && segmentBandNames.has(record.spendBand)
            );

            // Group by supplier to get supplier-level metrics
            const supplierSpendMap = new Map<string, { total: number; records: typeof data }>();
            segmentRecords.forEach(record => {
              if (!supplierSpendMap.has(record.supplier)) {
                supplierSpendMap.set(record.supplier, { total: 0, records: [] });
              }
              const existing = supplierSpendMap.get(record.supplier)!;
              existing.total += record.amount;
              existing.records.push(record);
            });

            // Convert to array and sort by total spend
            const segmentSuppliers = Array.from(supplierSpendMap.entries())
              .map(([supplier, data]) => ({ supplier, ...data }))
              .sort((a, b) => b.total - a.total);

            // Calculate metrics
            const totalSpend = segmentSuppliers.reduce((sum, s) => sum + s.total, 0);
            const supplierCount = segmentSuppliers.length;
            const transactionCount = segmentRecords.length;
            const avgSpend = supplierCount > 0 ? totalSpend / supplierCount : 0;

            // Subcategory breakdown
            const subcategoryMap = new Map<string, number>();
            segmentRecords.forEach(record => {
              subcategoryMap.set(
                record.subcategory,
                (subcategoryMap.get(record.subcategory) || 0) + record.amount
              );
            });
            const subcategoryData = Array.from(subcategoryMap.entries())
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 10);

            // Location breakdown
            const locationMap = new Map<string, number>();
            segmentRecords.forEach(record => {
              locationMap.set(
                record.location,
                (locationMap.get(record.location) || 0) + record.amount
              );
            });
            const locationData = Array.from(locationMap.entries())
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 10);

            return (
              <div className="space-y-6 mt-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <div className="text-2xl font-bold text-gray-900">
                        ${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Total Spend</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <div className="text-2xl font-bold text-gray-900">{supplierCount}</div>
                      <div className="text-sm text-gray-600 mt-1">Suppliers</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6 text-center">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <div className="text-2xl font-bold text-gray-900">
                        ${avgSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Avg Spend/Supplier</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Package className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                      <div className="text-2xl font-bold text-gray-900">{transactionCount.toLocaleString()}</div>
                      <div className="text-sm text-gray-600 mt-1">Transactions</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Supplier List Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Supplier Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-gray-800 text-white z-10">
                          <tr className="border-b-2 border-gray-300">
                            <th className="text-left p-3 font-semibold">Rank</th>
                            <th className="text-left p-3 font-semibold">Supplier</th>
                            <th className="text-right p-3 font-semibold">Total Spend</th>
                            <th className="text-right p-3 font-semibold">% of Segment</th>
                            <th className="text-right p-3 font-semibold">Transactions</th>
                            <th className="text-right p-3 font-semibold">Subcategories</th>
                            <th className="text-right p-3 font-semibold">Locations</th>
                          </tr>
                        </thead>
                        <tbody>
                          {segmentSuppliers.map((supplier, idx) => {
                            const subcategoryCount = new Set(supplier.records.map(r => r.subcategory)).size;
                            const locationCount = new Set(supplier.records.map(r => r.location)).size;
                            const percentOfSegment = totalSpend > 0 ? (supplier.total / totalSpend) * 100 : 0;

                            return (
                              <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="p-3 text-gray-600">{idx + 1}</td>
                                <td className="p-3 font-medium">{supplier.supplier}</td>
                                <td className="p-3 text-right font-semibold">
                                  ${supplier.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </td>
                                <td className="p-3 text-right">{percentOfSegment.toFixed(2)}%</td>
                                <td className="p-3 text-right">{supplier.records.length}</td>
                                <td className="p-3 text-right">{subcategoryCount}</td>
                                <td className="p-3 text-right">{locationCount}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Subcategory and Location Breakdown */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Top 10 Subcategories */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Top 10 Subcategories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {subcategoryData.map((item, idx) => {
                          const percentage = totalSpend > 0 ? (item.value / totalSpend) * 100 : 0;
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-gray-600">
                                  ${item.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top 10 Locations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Top 10 Locations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {locationData.map((item, idx) => {
                          const percentage = totalSpend > 0 ? (item.value / totalSpend) * 100 : 0;
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-gray-600">
                                  ${item.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-purple-600 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
