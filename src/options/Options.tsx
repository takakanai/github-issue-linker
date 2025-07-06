import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { MappingDialog } from '@/components/MappingDialog';
import { Edit, Trash2, ExternalLink, Globe, GitBranch, Download, Upload, Palette } from 'lucide-react';
import type { RepositoryMapping, UserPreferences } from '@/types';
import { changeLanguage } from '@/lib/i18n';

export function Options() {
  const { t, ready } = useTranslation();
  const [mappings, setMappings] = useState<RepositoryMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<RepositoryMapping | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  useEffect(() => {
    loadMappings();
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_USER_PREFERENCES',
      });
      if (response.success) {
        setPreferences(response.data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
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

  const handleLanguageChange = async (language: string) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_USER_PREFERENCES',
        data: { ...preferences, language },
      });
      await changeLanguage(language);
      setPreferences(prev => prev ? { ...prev, language: language as 'en' | 'ja' } : null);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const handleThemeChange = async (theme: string) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_USER_PREFERENCES',
        data: { ...preferences, theme },
      });
      setPreferences(prev => prev ? { ...prev, theme: theme as 'light' | 'dark' | 'system' } : null);
    } catch (error) {
      console.error('Error changing theme:', error);
    }
  };

  if (loading || !ready) {
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
          <h1 className="text-3xl font-bold">{t('options.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('options.description')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              {t('options.repositoryMappings.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mappings.length === 0 ? (
              <p className="text-muted-foreground">
                {t('options.repositoryMappings.noMappings')}
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
                          <span>{mapping.trackerUrl}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(mapping.trackerUrl, '_blank')}
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
              <Button onClick={handleAddMapping}>{t('options.repositoryMappings.addNew')}</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('options.language.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('options.language.description')}
              </p>
              <RadioGroup
                value={preferences?.language || 'en'}
                onValueChange={handleLanguageChange}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="en" id="language-en" />
                  <Label htmlFor="language-en" className="cursor-pointer">
                    English
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ja" id="language-ja" />
                  <Label htmlFor="language-ja" className="cursor-pointer">
                    日本語
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t('options.theme.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('options.theme.description')}
              </p>
              <RadioGroup
                value={preferences?.theme || 'system'}
                onValueChange={handleThemeChange}
                className="grid grid-cols-3 gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="light" id="theme-light" />
                  <Label htmlFor="theme-light" className="cursor-pointer">
                    {t('options.theme.light')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dark" id="theme-dark" />
                  <Label htmlFor="theme-dark" className="cursor-pointer">
                    {t('options.theme.dark')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="system" id="theme-system" />
                  <Label htmlFor="theme-system" className="cursor-pointer">
                    {t('options.theme.system')}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Download className="h-4 w-4" />
                <Upload className="h-4 w-4" />
              </div>
              {t('options.importExport.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleImportSettings} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                {t('options.importExport.import')}
              </Button>
              <Button variant="outline" onClick={handleExportSettings} className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {t('options.importExport.export')}
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