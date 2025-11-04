import { PlaceholderPage } from '@/components/PlaceholderPage';
import { Sparkles } from 'lucide-react';

export default function AIInsightsPage() {
  return (
    <PlaceholderPage
      title="AI Insights"
      description="Get smart recommendations powered by artificial intelligence"
      icon={<Sparkles className="h-8 w-8 text-yellow-600" />}
    />
  );
}
