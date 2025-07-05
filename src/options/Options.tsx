import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { MappingDialog } from '@/components/MappingDialog';
import { Edit, Trash2, ExternalLink, BarChart3 } from 'lucide-react';
import type { RepositoryMapping } from '@/types';

export function Options() {
  const [mappings, setMappings] = useState<RepositoryMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<RepositoryMapping | null>(null);
  const [currentRepository, setCurrentRepository] = useState<string | null>(null);
  const [detectedKeys, setDetectedKeys] = useState<Array<{ key: string; mapping: RepositoryMapping }>>([]);

  useEffect(() => {
    loadMappings();
    loadStatisticsData();
  }, []);

  const loadStatisticsData = async () => {
    try {
      // Get current tab to determine repository (if running from a GitHub tab)
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (tab?.url) {
        const repoMatch = tab.url.match(/github\.com\/([^\/]+\/[^\/]+)/);
        if (repoMatch) {
          setCurrentRepository(repoMatch[1]);
          
          // Try to get detected keys from content script
          try {
            const response = await chrome.tabs.sendMessage(tab.id!, {
              type: 'GET_DETECTED_KEYS',
            });
            if (response.success) {
              setDetectedKeys(response.data.keys || []);
            }
          } catch (error) {
            // Content script not available
            setDetectedKeys([]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading statistics data:', error);
    }
  };

  const loadMappings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_REPOSITORY_MAPPINGS',
      });
      if (response.success) {
        setMappings(response.data);
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMapping = async (mapping: RepositoryMapping) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'ADD_REPOSITORY_MAPPING',
        data: mapping,
      });
      await loadMappings();
    } catch (error) {
      console.error('Error saving mapping:', error);
    }
  };

  const handleDeleteMapping = async (id: string) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'REMOVE_REPOSITORY_MAPPING',
        data: { id },
      });
      await loadMappings();
    } catch (error) {
      console.error('Error deleting mapping:', error);
    }
  };

  const handleToggleMapping = async (mapping: RepositoryMapping) => {
    try {
      const updatedMapping = { ...mapping, enabled: !mapping.enabled };
      await chrome.runtime.sendMessage({
        type: 'ADD_REPOSITORY_MAPPING',
        data: updatedMapping,
      });
      await loadMappings();
    } catch (error) {
      console.error('Error toggling mapping:', error);
    }
  };

  const handleEditMapping = (mapping: RepositoryMapping) => {
    setEditingMapping(mapping);
    setDialogOpen(true);
  };

  const handleAddMapping = () => {
    setEditingMapping(null);
    setDialogOpen(true);
  };

  const handleExportSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'EXPORT_SETTINGS',
      });
      if (response.success) {
        const blob = new Blob([response.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'github-issue-linker-settings.json';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting settings:', error);
    }
  };

  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          await chrome.runtime.sendMessage({
            type: 'IMPORT_SETTINGS',
            data: text,
          });
          await loadMappings();
        } catch (error) {
          console.error('Error importing settings:', error);
        }
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">GitHub Issue Linker Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your Backlog issue linking preferences.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Repository Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            {mappings.length === 0 ? (
              <p className="text-muted-foreground">
                No repository mappings configured yet.
              </p>
            ) : (
              <div className="space-y-4">
                {mappings.map(mapping => (
                  <div key={mapping.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">{mapping.repository}</h3>
                          <Badge variant={mapping.enabled ? 'default' : 'secondary'}>
                            {mapping.keyPrefix}
                          </Badge>
                          <Switch
                            checked={mapping.enabled}
                            onCheckedChange={() => handleToggleMapping(mapping)}
                          />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{mapping.backlogUrl}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(mapping.backlogUrl, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditMapping(mapping)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteMapping(mapping.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Button onClick={handleAddMapping}>Add New Mapping</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">{mappings.length}</div>
                <div className="text-sm text-muted-foreground">Total Mappings</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">{mappings.filter(m => m.enabled).length}</div>
                <div className="text-sm text-muted-foreground">Active Mappings</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">{detectedKeys.length}</div>
                <div className="text-sm text-muted-foreground">Detected Keys</div>
                {currentRepository && (
                  <div className="text-xs text-muted-foreground mt-1">
                    in {currentRepository}
                  </div>
                )}
              </div>
            </div>
            {detectedKeys.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Recently Detected Keys:</h4>
                <div className="flex flex-wrap gap-2">
                  {detectedKeys.slice(0, 10).map((item, index) => (
                    <Badge key={`${item.key}-${index}`} variant="outline" className="text-xs">
                      {item.key}
                    </Badge>
                  ))}
                  {detectedKeys.length > 10 && (
                    <span className="text-xs text-muted-foreground">
                      +{detectedKeys.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import/Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleImportSettings}>
                Import Settings
              </Button>
              <Button variant="outline" onClick={handleExportSettings}>
                Export Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <MappingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveMapping}
        mapping={editingMapping}
      />
    </div>
  );
}