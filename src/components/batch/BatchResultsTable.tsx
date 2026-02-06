import { useState, useMemo } from 'react';
import { ArrowUpDown, Trash2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useBatch, type BatchPlan } from '@/contexts/BatchContext';
import { cn } from '@/lib/utils';

type SortKey = 'fileName' | 'technique' | 'MCS' | 'LSV' | 'AAV' | 'totalMU' | 'deliveryTime';
type SortDirection = 'asc' | 'desc';

export function BatchResultsTable() {
  const { plans, removePlan, toggleSelection, selectAll, deselectAll } = useBatch();
  const [search, setSearch] = useState('');
  const [techniqueFilter, setTechniqueFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('fileName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const techniques = useMemo(() => {
    const set = new Set<string>();
    plans.forEach(p => {
      if (p.status === 'success' && p.plan.technique) {
        set.add(p.plan.technique);
      }
    });
    return Array.from(set).sort();
  }, [plans]);

  const filteredAndSortedPlans = useMemo(() => {
    let result = [...plans];

    // Filter by search
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(p => 
        p.fileName.toLowerCase().includes(lower) ||
        p.plan.planLabel?.toLowerCase().includes(lower)
      );
    }

    // Filter by technique
    if (techniqueFilter !== 'all') {
      result = result.filter(p => p.plan.technique === techniqueFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortKey) {
        case 'fileName':
          aVal = a.fileName;
          bVal = b.fileName;
          break;
        case 'technique':
          aVal = a.plan.technique || '';
          bVal = b.plan.technique || '';
          break;
        case 'MCS':
          aVal = a.metrics?.MCS ?? 0;
          bVal = b.metrics?.MCS ?? 0;
          break;
        case 'LSV':
          aVal = a.metrics?.LSV ?? 0;
          bVal = b.metrics?.LSV ?? 0;
          break;
        case 'AAV':
          aVal = a.metrics?.AAV ?? 0;
          bVal = b.metrics?.AAV ?? 0;
          break;
        case 'totalMU':
          aVal = a.metrics?.totalMU ?? 0;
          bVal = b.metrics?.totalMU ?? 0;
          break;
        case 'deliveryTime':
          aVal = a.metrics?.totalDeliveryTime ?? 0;
          bVal = b.metrics?.totalDeliveryTime ?? 0;
          break;
        default:
          aVal = a.fileName;
          bVal = b.fileName;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [plans, search, techniqueFilter, sortKey, sortDirection]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const allSelected = plans.filter(p => p.status === 'success').every(p => p.selected);
  const someSelected = plans.some(p => p.selected);

  const handleSelectAll = () => {
    if (allSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  };

  const SortableHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 font-medium"
      onClick={() => toggleSort(sortKeyName)}
    >
      {label}
      <ArrowUpDown className={cn(
        "ml-1 h-3 w-3",
        sortKey === sortKeyName && "text-primary"
      )} />
    </Button>
  );

  const StatusIcon = ({ status }: { status: BatchPlan['status'] }) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-[hsl(var(--status-success))]" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'parsing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-muted" />;
    }
  };

  if (plans.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No plans loaded. Drop DICOM files above to begin analysis.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search files..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-[200px]"
        />
        <Select value={techniqueFilter} onValueChange={setTechniqueFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Technique" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Techniques</SelectItem>
            {techniques.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {someSelected && (
          <Badge variant="secondary" className="ml-auto">
            {plans.filter(p => p.selected).length} selected
          </Badge>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead><SortableHeader label="File" sortKeyName="fileName" /></TableHead>
              <TableHead><SortableHeader label="Technique" sortKeyName="technique" /></TableHead>
              <TableHead className="text-right"><SortableHeader label="MCS" sortKeyName="MCS" /></TableHead>
              <TableHead className="text-right"><SortableHeader label="LSV" sortKeyName="LSV" /></TableHead>
              <TableHead className="text-right"><SortableHeader label="AAV" sortKeyName="AAV" /></TableHead>
              <TableHead className="text-right"><SortableHeader label="MU" sortKeyName="totalMU" /></TableHead>
              <TableHead className="text-right"><SortableHeader label="Time" sortKeyName="deliveryTime" /></TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedPlans.map(plan => (
              <TableRow 
                key={plan.id}
                className={cn(plan.selected && 'bg-muted/50')}
              >
                <TableCell>
                  <Checkbox
                    checked={plan.selected}
                    onCheckedChange={() => toggleSelection(plan.id)}
                    disabled={plan.status !== 'success'}
                    aria-label={`Select ${plan.fileName}`}
                  />
                </TableCell>
                <TableCell>
                  <StatusIcon status={plan.status} />
                </TableCell>
                <TableCell className="max-w-[200px] truncate font-medium" title={plan.fileName}>
                  {plan.fileName}
                </TableCell>
                <TableCell>
                  {plan.status === 'success' && (
                    <Badge variant="outline">{plan.plan.technique}</Badge>
                  )}
                  {plan.status === 'error' && (
                    <span className="text-xs text-destructive">{plan.error}</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {plan.status === 'success' ? plan.metrics.MCS?.toFixed(3) : '—'}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {plan.status === 'success' ? plan.metrics.LSV?.toFixed(3) : '—'}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {plan.status === 'success' ? plan.metrics.AAV?.toFixed(3) : '—'}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {plan.status === 'success' ? plan.metrics.totalMU?.toFixed(0) : '—'}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {plan.status === 'success' && plan.metrics.totalDeliveryTime 
                    ? `${Math.floor(plan.metrics.totalDeliveryTime / 60)}:${String(Math.round(plan.metrics.totalDeliveryTime % 60)).padStart(2, '0')}`
                    : '—'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removePlan(plan.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
