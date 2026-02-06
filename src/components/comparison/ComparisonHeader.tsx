import type { SessionPlan } from '@/lib/dicom/types';
import { ComparisonUploadZone } from './ComparisonUploadZone';

interface ComparisonHeaderProps {
  planA: SessionPlan | null;
  planB: SessionPlan | null;
  onPlanALoaded: (plan: SessionPlan) => void;
  onPlanBLoaded: (plan: SessionPlan) => void;
  onPlanARemoved: () => void;
  onPlanBRemoved: () => void;
}

export function ComparisonHeader({
  planA,
  planB,
  onPlanALoaded,
  onPlanBLoaded,
  onPlanARemoved,
  onPlanBRemoved,
}: ComparisonHeaderProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ComparisonUploadZone
        label="Plan A (Reference)"
        plan={planA}
        onPlanLoaded={onPlanALoaded}
        onPlanRemoved={onPlanARemoved}
      />
      <ComparisonUploadZone
        label="Plan B (Comparison)"
        plan={planB}
        onPlanLoaded={onPlanBLoaded}
        onPlanRemoved={onPlanBRemoved}
      />
    </div>
  );
}
