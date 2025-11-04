import { PlaceholderPage } from '@/components/PlaceholderPage';
import { FileText } from 'lucide-react';

export default function ContractsPage() {
  return (
    <PlaceholderPage
      title="Contract Optimization"
      description="Analyze contract performance and identify savings opportunities"
      icon={<FileText className="h-8 w-8 text-blue-700" />}
    />
  );
}
