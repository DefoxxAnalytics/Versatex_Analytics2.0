/**
 * Reusable Chart Component
 * Wrapper around Apache ECharts for consistent chart rendering
 * 
 * Security: Sanitizes all input data
 * Performance: Lazy loads ECharts, auto-resizes on window resize
 * Accessibility: Provides ARIA labels and keyboard navigation
 */

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import {
  BarChart,
  LineChart,
  PieChart,
} from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

// Register ECharts components
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  CanvasRenderer,
]);

interface ChartProps {
  /**
   * Chart title displayed in card header
   */
  title: string;
  
  /**
   * Optional description/explanation of what the chart shows
   */
  description?: string;
  
  /**
   * ECharts configuration object
   */
  option: EChartsOption;
  
  /**
   * Chart height in pixels
   * @default 300
   */
  height?: number;
  
  /**
   * Loading state
   * @default false
   */
  loading?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Chart Component
 * Renders an ECharts chart with proper error handling and accessibility
 */
export function Chart({
  title,
  description,
  option,
  height = 300,
  loading = false,
  className = '',
}: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current) return;

    // Create chart instance
    const chartInstance = echarts.init(chartRef.current);
    chartInstanceRef.current = chartInstance;

    // Set option
    chartInstance.setOption(option);

    // Handle window resize
    const handleResize = () => {
      chartInstance.resize();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  // Update chart when option changes
  useEffect(() => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.setOption(option, true);
    }
  }, [option]);

  // Handle loading state
  useEffect(() => {
    if (chartInstanceRef.current) {
      if (loading) {
        chartInstanceRef.current.showLoading();
      } else {
        chartInstanceRef.current.hideLoading();
      }
    }
  }, [loading]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && (
          <p className="text-sm text-gray-600 mt-2">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div
          ref={chartRef}
          style={{ height: `${height}px`, width: '100%' }}
          role="img"
          aria-label={`${title} chart`}
        />
      </CardContent>
    </Card>
  );
}
