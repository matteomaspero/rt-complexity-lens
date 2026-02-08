import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertCircle, TrendingUp, CheckCircle2 } from 'lucide-react';

export function WorkflowGuide() {
  const workflows = [
    {
      title: 'Typical Clinical Workflow',
      steps: [
        {
          number: 1,
          mode: 'Batch',
          duration: '5-10 min',
          description: 'Screen clinic workload for complexity outliers',
          icon: <TrendingUp className="h-5 w-5" />,
        },
        {
          number: 2,
          mode: 'Single',
          duration: '10-15 min',
          description: 'Deep dive on complex or concerning plans',
          icon: <AlertCircle className="h-5 w-5" />,
        },
        {
          number: 3,
          mode: 'Compare',
          duration: '5 min',
          description: 'Test plan modifications or alternatives',
          icon: <ArrowRight className="h-5 w-5" />,
        },
        {
          number: 4,
          mode: 'Decision',
          duration: '2 min',
          description: 'Approve or request re-optimization',
          icon: <CheckCircle2 className="h-5 w-5" />,
        },
      ],
    },
    {
      title: 'Research/Institutional Workflow',
      steps: [
        {
          number: 1,
          mode: 'Batch',
          duration: '30 min',
          description: 'Collect all plans (50-100+)',
          icon: <TrendingUp className="h-5 w-5" />,
        },
        {
          number: 2,
          mode: 'Cohort',
          duration: '20 min',
          description: 'Analyze population patterns & clusters',
          icon: <AlertCircle className="h-5 w-5" />,
        },
        {
          number: 3,
          mode: 'Single',
          duration: '15 min',
          description: 'Validate outliers & edge cases',
          icon: <ArrowRight className="h-5 w-5" />,
        },
        {
          number: 4,
          mode: 'Export',
          duration: '5 min',
          description: 'Generate report with findings',
          icon: <CheckCircle2 className="h-5 w-5" />,
        },
      ],
    },
  ];

  const tips = [
    {
      title: 'Start with MCS',
      description: 'Modulation Complexity Score is the primary metric—focus here first',
    },
    {
      title: 'Check MAD & LG',
      description: 'Mean Asymmetry Distance and Leaf Gap are critical for QA',
    },
    {
      title: 'Review Delivery',
      description: 'Check avgDoseRate and LS to ensure machine feasibility',
    },
    {
      title: 'Watch Rotations',
      description: 'Multi-rotation VMAT plans show as color-coded in dose rate chart',
    },
    {
      title: 'Use Batch First',
      description: 'Screen multiple plans to find the ones needing attention',
    },
    {
      title: 'Compare Variations',
      description: 'Test alternatives to find the right balance',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Workflows */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recommended Workflows</h3>
        <div className="grid gap-6 lg:grid-cols-2">
          {workflows.map((workflow, idx) => (
            <Card key={idx} className="p-4">
              <h4 className="font-semibold mb-4">{workflow.title}</h4>
              <div className="space-y-3">
                {workflow.steps.map((step, stepIdx) => (
                  <div key={stepIdx}>
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center rounded-full bg-primary/10 w-8 h-8 text-primary font-semibold text-sm flex-shrink-0">
                        {step.number}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                          {step.icon && (
                            <div className="text-muted-foreground">{step.icon}</div>
                          )}
                          <span className="font-semibold text-sm">{step.mode}</span>
                          <Badge variant="secondary" className="text-xs">
                            {step.duration}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                      </div>
                    </div>
                    {stepIdx < workflow.steps.length - 1 && (
                      <div className="ml-3 mt-2 h-6 w-1 bg-border mx-auto" />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Pro Tips */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Pro Tips for Using RTp-lens</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {tips.map((tip, idx) => (
            <Card key={idx} className="p-3 border-l-4 border-l-primary/50 hover:border-l-primary transition-colors">
              <h4 className="font-semibold text-sm">{tip.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{tip.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Common Questions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Common Questions</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-4">
            <h4 className="font-semibold text-sm mb-2">What does MCS value of 0.5 mean?</h4>
            <p className="text-xs text-muted-foreground">
              MCS ranges from 0 (highly modulated) to 1 (simple). A value of 0.5 indicates moderate complexity—likely requiring standard QA procedures.
            </p>
          </Card>
          <Card className="p-4">
            <h4 className="font-semibold text-sm mb-2">Why are metrics organized in 6 levels?</h4>
            <p className="text-xs text-muted-foreground">
              Metrics are ordered by clinical priority: Plan Overview → Details → QA Concerns → Delivery Feasibility → Machine Parameters → Advanced Analysis.
            </p>
          </Card>
          <Card className="p-4">
            <h4 className="font-semibold text-sm mb-2">How do I interpret the colored rotations?</h4>
            <p className="text-xs text-muted-foreground">
              Multi-rotation VMAT plans show each 360° rotation in a different color (blue, orange, green, etc.). This makes it easy to see which rotation has dose delivery issues.
            </p>
          </Card>
          <Card className="p-4">
            <h4 className="font-semibold text-sm mb-2">When should I use batch vs. single analysis?</h4>
            <p className="text-xs text-muted-foreground">
              Use Batch to screen many plans (5-100+) quickly. Then dive into Single mode for plans that need deeper investigation or QA validation.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
