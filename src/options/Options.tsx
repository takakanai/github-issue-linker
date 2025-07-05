import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RepositoryMapping } from '@/types';

export function Options() {
  const [mappings, setMappings] = useState<RepositoryMapping[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMappings();
  }, []);

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
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{mapping.repository}</h3>
                        <p className="text-sm text-muted-foreground">
                          {mapping.backlogUrl} - {mapping.keyPrefix}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Button>Add New Mapping</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import/Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline">Import Settings</Button>
              <Button variant="outline">Export Settings</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}