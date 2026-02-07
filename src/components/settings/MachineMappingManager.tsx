import { useState } from 'react';
import { Plus, Trash2, Pencil, TestTube2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useThresholdConfig } from '@/contexts/ThresholdConfigContext';
import { BUILTIN_PRESETS } from '@/lib/threshold-definitions';
import {
  type MachineMappingEntry,
  testMachineMapping,
  createMappingEntry,
} from '@/lib/machine-mapping';
import { MachineMappingEditor } from './MachineMappingEditor';

export function MachineMappingManager() {
  const { toast } = useToast();
  const {
    machineMappings,
    autoSelectEnabled,
    setAutoSelectEnabled,
    addMachineMapping,
    updateMachineMapping,
    deleteMachineMapping,
    userPresets,
  } = useThresholdConfig();

  const [editingMapping, setEditingMapping] = useState<MachineMappingEntry | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [testMachineName, setTestMachineName] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const userPresetIds = userPresets.map((p) => p.id);

  const handleAddNew = () => {
    setEditingMapping(null);
    setIsAddingNew(true);
  };

  const handleEdit = (mapping: MachineMappingEntry) => {
    setEditingMapping(mapping);
    setIsAddingNew(false);
  };

  const handleSave = (mapping: MachineMappingEntry) => {
    if (isAddingNew) {
      addMachineMapping(mapping);
      toast({ title: 'Mapping added', description: `Pattern "${mapping.pattern}" created.` });
    } else {
      updateMachineMapping(mapping.id, mapping);
      toast({ title: 'Mapping updated', description: `Pattern "${mapping.pattern}" saved.` });
    }
    setEditingMapping(null);
    setIsAddingNew(false);
  };

  const handleDelete = (mapping: MachineMappingEntry) => {
    deleteMachineMapping(mapping.id);
    toast({ title: 'Mapping deleted', description: `Pattern "${mapping.pattern}" removed.` });
  };

  const handleToggleEnabled = (mapping: MachineMappingEntry) => {
    updateMachineMapping(mapping.id, {
      ...mapping,
      enabled: !mapping.enabled,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleTest = () => {
    if (!testMachineName.trim()) {
      setTestResult(null);
      return;
    }

    const { matchedPresetId, matchedMapping } = testMachineMapping(
      testMachineName,
      undefined,
      machineMappings,
      userPresetIds
    );

    if (matchedPresetId) {
      const presetName =
        BUILTIN_PRESETS[matchedPresetId]?.name ||
        userPresets.find((p) => p.id === matchedPresetId)?.name ||
        matchedPresetId;
      setTestResult(`✓ Matches → ${presetName} (via "${matchedMapping?.pattern}")`);
    } else {
      setTestResult('✗ No matching mapping found');
    }
  };

  const getPresetName = (presetId: string): string => {
    if (presetId in BUILTIN_PRESETS) {
      return BUILTIN_PRESETS[presetId].name;
    }
    return userPresets.find((p) => p.id === presetId)?.name || presetId;
  };

  const matchTypeLabels: Record<string, string> = {
    exact: 'Exact',
    prefix: 'Starts with',
    contains: 'Contains',
    regex: 'Regex',
  };

  return (
    <div className="space-y-4">
      {/* Auto-select Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base">Auto-select preset based on machine name</Label>
          <p className="text-sm text-muted-foreground">
            When enabled, automatically applies the matching preset when a plan is loaded
          </p>
        </div>
        <Switch
          checked={autoSelectEnabled}
          onCheckedChange={setAutoSelectEnabled}
        />
      </div>

      {/* Mappings Table */}
      <div className="rounded-lg border">
        <ScrollArea className="h-64">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Pattern</TableHead>
                <TableHead>Match Type</TableHead>
                <TableHead>Preset</TableHead>
                <TableHead className="w-16">Priority</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machineMappings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No mappings configured. Add one to enable auto-selection.
                  </TableCell>
                </TableRow>
              ) : (
                machineMappings
                  .sort((a, b) => b.priority - a.priority)
                  .map((mapping) => (
                    <TableRow
                      key={mapping.id}
                      className={!mapping.enabled ? 'opacity-50' : undefined}
                    >
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleToggleEnabled(mapping)}
                          title={mapping.enabled ? 'Disable' : 'Enable'}
                        >
                          {mapping.enabled ? (
                            <ToggleRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {mapping.pattern}
                        {mapping.manufacturer && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {mapping.manufacturer}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {matchTypeLabels[mapping.matchType]}
                        </Badge>
                      </TableCell>
                      <TableCell>{getPresetName(mapping.presetId)}</TableCell>
                      <TableCell className="text-center">{mapping.priority}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(mapping)}
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(mapping)}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Add Button */}
      <Button onClick={handleAddNew} className="gap-2">
        <Plus className="h-4 w-4" />
        Add Mapping
      </Button>

      {/* Test Section */}
      <div className="rounded-lg border p-4 space-y-3">
        <Label className="text-sm font-medium">Test Machine Name</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Enter machine name to test..."
            value={testMachineName}
            onChange={(e) => {
              setTestMachineName(e.target.value);
              setTestResult(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleTest()}
          />
          <Button variant="outline" onClick={handleTest} className="gap-2">
            <TestTube2 className="h-4 w-4" />
            Test
          </Button>
        </div>
        {testResult && (
          <p className={`text-sm ${testResult.startsWith('✓') ? 'text-primary' : 'text-muted-foreground'}`}>
            {testResult}
          </p>
        )}
      </div>

      {/* Editor Dialog */}
      <MachineMappingEditor
        mapping={editingMapping}
        open={isAddingNew || !!editingMapping}
        onOpenChange={(open) => {
          if (!open) {
            setEditingMapping(null);
            setIsAddingNew(false);
          }
        }}
        onSave={handleSave}
        isNew={isAddingNew}
      />
    </div>
  );
}
