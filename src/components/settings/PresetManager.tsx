import { useState, useRef } from 'react';
import { Settings, Plus, Copy, Trash2, Download, Upload, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useThresholdConfig } from '@/contexts/ThresholdConfigContext';
import {
  BUILTIN_PRESETS,
  type UserPreset,
  exportPresetsToJSON,
  importPresetsFromJSON,
  duplicateBuiltInPreset,
  createEmptyUserPreset,
} from '@/lib/threshold-definitions';
import { PresetEditor } from './PresetEditor';
import { MachineMappingManager } from './MachineMappingManager';

interface PresetManagerProps {
  trigger?: React.ReactNode;
}

export function PresetManager({ trigger }: PresetManagerProps) {
  const { toast } = useToast();
  const {
    userPresets,
    addUserPreset,
    updateUserPreset,
    deleteUserPreset,
    setPreset,
  } = useThresholdConfig();

  const [open, setOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [editingPreset, setEditingPreset] = useState<UserPreset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const builtInList = Object.values(BUILTIN_PRESETS);

  const handleCreateNew = () => {
    if (!newPresetName.trim()) return;
    const preset = createEmptyUserPreset(newPresetName.trim());
    addUserPreset(preset);
    setNewPresetName('');
    toast({ title: 'Preset created', description: `"${preset.name}" has been created.` });
  };

  const handleDuplicate = (sourceId: string, isBuiltIn: boolean) => {
    const sourceName = isBuiltIn
      ? BUILTIN_PRESETS[sourceId]?.name
      : userPresets.find((p) => p.id === sourceId)?.name;

    if (!sourceName) return;

    const newName = `${sourceName} (Copy)`;

    if (isBuiltIn) {
      const preset = duplicateBuiltInPreset(sourceId, newName);
      addUserPreset(preset);
    } else {
      const source = userPresets.find((p) => p.id === sourceId);
      if (source) {
        const now = new Date().toISOString();
        const preset: UserPreset = {
          ...JSON.parse(JSON.stringify(source)),
          id: `user_${Date.now()}`,
          name: newName,
          createdAt: now,
          updatedAt: now,
        };
        addUserPreset(preset);
      }
    }
    toast({ title: 'Preset duplicated', description: `Created "${newName}"` });
  };

  const handleDelete = (presetId: string) => {
    const preset = userPresets.find((p) => p.id === presetId);
    if (!preset) return;
    deleteUserPreset(presetId);
    toast({ title: 'Preset deleted', description: `"${preset.name}" has been removed.` });
  };

  const handleExport = () => {
    if (userPresets.length === 0) {
      toast({
        title: 'No presets to export',
        description: 'Create a custom preset first.',
        variant: 'destructive',
      });
      return;
    }

    const json = exportPresetsToJSON(userPresets);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `rtplan-presets-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    toast({ title: 'Presets exported', description: `${userPresets.length} preset(s) saved.` });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const imported = importPresetsFromJSON(json);

        if (imported.length === 0) {
          toast({
            title: 'No valid presets found',
            description: 'The file did not contain any valid presets.',
            variant: 'destructive',
          });
          return;
        }

        // Add each imported preset with a new ID to avoid conflicts
        let addedCount = 0;
        for (const preset of imported) {
          const newPreset: UserPreset = {
            ...preset,
            id: `user_${Date.now()}_${addedCount}`,
          };
          addUserPreset(newPreset);
          addedCount++;
        }

        toast({
          title: 'Presets imported',
          description: `${addedCount} preset(s) added.`,
        });
      } catch (err) {
        // Import failed - user sees error toast
        toast({
          title: 'Import failed',
          description: err instanceof Error ? err.message : 'Invalid file format',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditPreset = (preset: UserPreset) => {
    setEditingPreset(preset);
  };

  const handleSavePreset = (updated: UserPreset) => {
    updateUserPreset(updated.id, updated);
    setEditingPreset(null);
    toast({ title: 'Preset saved', description: `"${updated.name}" has been updated.` });
  };

  const handleSelectPreset = (presetId: string) => {
    setPreset(presetId);
    setOpen(false);
    toast({ title: 'Preset selected' });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Manage Presets
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Machine Presets</DialogTitle>
            <DialogDescription>
              Manage machine-specific thresholds, delivery parameters, and auto-selection mappings.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="presets" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="presets">Presets</TabsTrigger>
              <TabsTrigger value="mappings">Machine Mappings</TabsTrigger>
            </TabsList>

            <TabsContent value="presets" className="flex-1 overflow-auto mt-4">
              <div className="space-y-4">
                {/* Import/Export Actions */}
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Import
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="gap-2"
                    disabled={userPresets.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>

                <Separator />

                {/* Built-in Presets */}
                <div>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">Built-in Presets</h4>
                  <ScrollArea className="h-32">
                    <div className="space-y-1">
                      {builtInList.map((preset) => (
                        <div
                          key={preset.id}
                          className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50"
                        >
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => handleSelectPreset(preset.id)}
                          >
                            <div className="text-sm font-medium">{preset.name}</div>
                            <div className="text-xs text-muted-foreground">{preset.description}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDuplicate(preset.id, true)}
                            title="Duplicate as user preset"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <Separator />

                {/* User Presets */}
                <div>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">Your Presets</h4>
                  {userPresets.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No custom presets yet. Create one or duplicate a built-in preset.
                    </p>
                  ) : (
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {userPresets.map((preset) => (
                          <div
                            key={preset.id}
                            className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50"
                          >
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => handleSelectPreset(preset.id)}
                            >
                              <div className="text-sm font-medium">{preset.name}</div>
                              <div className="text-xs text-muted-foreground">{preset.description}</div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditPreset(preset)}
                                title="Edit preset"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDuplicate(preset.id, false)}
                                title="Duplicate preset"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(preset.id)}
                                title="Delete preset"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                <Separator />

                {/* Create New */}
                <div className="space-y-2">
                  <Label htmlFor="new-preset-name">Create New Preset</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-preset-name"
                      placeholder="My Machine"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
                    />
                    <Button onClick={handleCreateNew} disabled={!newPresetName.trim()} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="mappings" className="flex-1 overflow-auto mt-4">
              <MachineMappingManager />
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preset Editor Dialog */}
      {editingPreset && (
        <PresetEditor
          preset={editingPreset}
          open={!!editingPreset}
          onOpenChange={(open) => !open && setEditingPreset(null)}
          onSave={handleSavePreset}
        />
      )}
    </>
  );
}
