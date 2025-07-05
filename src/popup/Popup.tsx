import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, ExternalLink, Activity } from 'lucide-react';
import type { UserPreferences, RepositoryMapping } from '@/types';

export function Popup() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [currentRepository, setCurrentRepository] = useState<string | null>(null);
  const [mappings, setMappings] = useState<RepositoryMapping[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get current tab URL to determine repository
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab.url || '';
      const repoMatch = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
      const repository = repoMatch ? repoMatch[1] : null;
      setCurrentRepository(repository);

      // Load user preferences
      const prefsResponse = await chrome.runtime.sendMessage({
        type: 'GET_USER_PREFERENCES',
      });
      if (prefsResponse.success) {
        setPreferences(prefsResponse.data);
      }

      // Load repository mappings
      const mappingsResponse = await chrome.runtime.sendMessage({
        type: 'GET_REPOSITORY_MAPPINGS',
      });
      if (mappingsResponse.success) {
        setMappings(mappingsResponse.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async (enabled: boolean) => {
    if (!preferences) return;

    const newPreferences = { ...preferences, enabled };
    
    try {
      await chrome.runtime.sendMessage({
        type: 'SET_USER_PREFERENCES',
        data: newPreferences,
      });
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  const currentMappings = mappings.filter(m => 
    currentRepository && m.repository === currentRepository && m.enabled
  );

  if (loading) {
    return (
      <div className="w-80 p-4">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">GitHub Issue Linker</h1>
        <Button variant="ghost" size="sm" onClick={openSettings}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Extension Enabled</p>
              <p className="text-sm text-muted-foreground">
                {preferences?.enabled ? 'Active' : 'Disabled'}
              </p>
            </div>
            <Switch
              checked={preferences?.enabled || false}
              onCheckedChange={toggleEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Current Repository */}
      {currentRepository ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Current Repository
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm">{currentRepository}</p>
            {currentMappings.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">Active Mappings:</p>
                {currentMappings.map(mapping => (
                  <div key={mapping.id} className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {mapping.keyPrefix}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(mapping.backlogUrl, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {currentMappings.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                No active mappings for this repository.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Not viewing a GitHub repository
            </p>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Mappings:</span>
              <span className="font-medium">{mappings.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Active Mappings:</span>
              <span className="font-medium">{mappings.filter(m => m.enabled).length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Repo:</span>
              <span className="font-medium">{currentMappings.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={openSettings}>
          Settings
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => chrome.tabs.reload()}
        >
          Reload Page
        </Button>
      </div>
    </div>
  );
}