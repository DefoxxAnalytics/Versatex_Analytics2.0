import { PlaceholderPage } from '@/components/PlaceholderPage';
import { AlertTriangle } from 'lucide-react';

export default function MaverickPage() {
  return (
    <PlaceholderPage
      title="Maverick Spend & Compliance"
      description="Track policy violations and off-contract spending"
      icon={<AlertTriangle className="h-8 w-8 text-amber-600" />}
    />
  );
}
