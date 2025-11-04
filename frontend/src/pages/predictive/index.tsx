import { PlaceholderPage } from '@/components/PlaceholderPage';
import { LineChart } from 'lucide-react';

export default function PredictivePage() {
  return (
    <PlaceholderPage
      title="Predictive Analytics"
      description="Forecast future spending and identify trends"
      icon={<LineChart className="h-8 w-8 text-teal-600" />}
    />
  );
}
