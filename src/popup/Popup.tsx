import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, ExternalLink, Activity, Link2, RefreshCw } from 'lucide-react';
import type { UserPreferences, RepositoryMapping } from '@/types';
import { sanitizeUrl } from '@/lib/utils';

export function Popup() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [currentRepository, setCurrentRepository] = useState<string | null>(null);
  const [mappings, setMappings] = useState<RepositoryMapping[]>([]);
  const [detectedKeys, setDetectedKeys] = useState<Array<{ key: string; mapping: RepositoryMapping }>>([]);
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

      // Get detected keys from content script
      if (repository) {
        try {
          const detectedResponse = await chrome.tabs.sendMessage(tab.id!, {
            type: 'GET_DETECTED_KEYS',
          });
          if (detectedResponse.success) {
            setDetectedKeys(detectedResponse.data.keys || []);
          }
        } catch (error) {
          console.log('Content script not ready or no keys detected');
          setDetectedKeys([]);
        }
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

  const reloadPage = () => {
    chrome.tabs.reload();
  };

  const currentMappings = mappings.filter(m => 
    currentRepository && m.repository === currentRepository && m.enabled
  );

  const generateBacklogUrl = (key: string, mapping: RepositoryMapping): string => {
    return `${sanitizeUrl(mapping.backlogUrl)}/${encodeURIComponent(key)}`;
  };

  if (loading) {
    return (
      <div className="w-80 p-2">
        <div className="flex items-center justify-center h-16">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 p-2 space-y-2">
      {/* Header with Enable/Disable Control */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={preferences?.enabled || false}
            onCheckedChange={toggleEnabled}
          />
          <div>
            <p className="font-medium">Extension</p>
            <p className="text-xs text-muted-foreground">
              {preferences?.enabled ? 'Active' : 'Disabled'}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={reloadPage} title="Reload Page">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={openSettings} title="Settings">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Current Repository */}
      {currentRepository ? (
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Repository</span>
                </div>
                <p className="font-mono text-sm truncate">{currentRepository}</p>
              </div>
              {currentMappings.length > 0 && (
                <div className="ml-3 flex items-center gap-1">
                  {currentMappings.map(mapping => (
                    <Badge key={mapping.id} variant="secondary" className="text-xs">
                      {mapping.keyPrefix}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-sm text-muted-foreground text-center">
              Not viewing a GitHub repository
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detected Issue Keys */}
      {detectedKeys.length > 0 ? (
        <Card className="flex-1">
          <CardHeader className="pb-1 px-4 pt-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Detected Issue Keys ({detectedKeys.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-3">
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {detectedKeys.map((item, index) => {
                const backlogUrl = generateBacklogUrl(item.key, item.mapping);
                return (
                  <div key={`${item.key}-${index}`} className="flex items-center justify-between p-2 rounded border">
                    <div className="flex items-center gap-2 flex-1">
                      <Badge 
                        variant="outline" 
                        className="text-xs cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => window.open(backlogUrl, '_blank')}
                        title={`Open ${item.key} in Backlog`}
                      >
                        {item.key}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(backlogUrl, '_blank')}
                      title={`Open ${item.key} in Backlog`}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1">
          <CardContent className="py-8 px-4">
            <div className="text-center text-muted-foreground">
              <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No issue keys detected</p>
              <p className="text-xs mt-1">Navigate to a page with issue keys to see them here</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}