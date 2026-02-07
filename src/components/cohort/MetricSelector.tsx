import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  METRIC_DEFINITIONS, 
  METRIC_GROUPS, 
  getMetricColor,
  type MetricGroup 
} from '@/lib/cohort/metric-utils';

interface MetricSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  maxSelections?: number;
  groups?: MetricGroup[];
  placeholder?: string;
  className?: string;
}

export function MetricSelector({
  selected,
  onChange,
  maxSelections = 6,
  groups = ['complexity', 'geometric', 'beam'],
  placeholder = 'Select metrics...',
  className,
}: MetricSelectorProps) {
  const [open, setOpen] = useState(false);

  // Get all available metrics from the specified groups
  const availableMetrics = groups.flatMap(group => 
    METRIC_GROUPS[group].map(key => ({
      key,
      ...METRIC_DEFINITIONS[key],
      group,
    }))
  ).filter(Boolean);

  const handleToggle = (metricKey: string) => {
    if (selected.includes(metricKey)) {
      onChange(selected.filter(k => k !== metricKey));
    } else if (selected.length < maxSelections) {
      onChange([...selected, metricKey]);
    }
  };

  const handleRemove = (metricKey: string) => {
    onChange(selected.filter(k => k !== metricKey));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-9 py-1.5"
          >
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {selected.map(key => {
                  const info = METRIC_DEFINITIONS[key];
                  return (
                    <Badge
                      key={key}
                      variant="secondary"
                      className="text-xs px-1.5 py-0"
                      style={{ 
                        borderColor: getMetricColor(key),
                        borderWidth: 1,
                      }}
                    >
                      {info?.shortName || key}
                    </Badge>
                  );
                })}
              </div>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search metrics..." />
            <CommandList>
              <CommandEmpty>No metric found.</CommandEmpty>
              {groups.map(group => (
                <CommandGroup key={group} heading={group.charAt(0).toUpperCase() + group.slice(1)}>
                  {METRIC_GROUPS[group].map(key => {
                    const info = METRIC_DEFINITIONS[key];
                    if (!info) return null;
                    
                    const isSelected = selected.includes(key);
                    const isDisabled = !isSelected && selected.length >= maxSelections;
                    
                    return (
                      <CommandItem
                        key={key}
                        value={`${info.name} ${info.shortName}`}
                        onSelect={() => handleToggle(key)}
                        disabled={isDisabled}
                        className={cn(isDisabled && "opacity-50")}
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/50"
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{info.shortName}</span>
                          <span className="ml-1.5 text-xs text-muted-foreground truncate">
                            {info.name}
                          </span>
                        </div>
                        {info.unit && (
                          <span className="text-xs text-muted-foreground">
                            ({info.unit})
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(key => {
            const info = METRIC_DEFINITIONS[key];
            return (
              <Badge
                key={key}
                variant="outline"
                className="text-xs cursor-pointer hover:bg-destructive/10 hover:border-destructive transition-colors"
                onClick={() => handleRemove(key)}
              >
                {info?.shortName || key}
                <span className="ml-1 text-muted-foreground">×</span>
              </Badge>
            );
          })}
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        {selected.length}/{maxSelections} metrics selected
      </p>
    </div>
  );
}
