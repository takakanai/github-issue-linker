import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { generateId, isValidRepositoryName, isValidKeyPrefix } from '@/lib/utils';
import type { RepositoryMapping } from '@/types';

interface MappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (mapping: RepositoryMapping) => void;
  mapping?: RepositoryMapping | null;
}

export function MappingDialog({ open, onOpenChange, onSave, mapping }: MappingDialogProps) {
  const [repository, setRepository] = useState('');
  const [trackerUrl, setTrackerUrl] = useState('');
  const [keyPrefix, setKeyPrefix] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Update form when mapping changes
  useEffect(() => {
    if (mapping) {
      setRepository(mapping.repository);
      setTrackerUrl(mapping.trackerUrl);
      setKeyPrefix(mapping.keyPrefix);
    } else {
      setRepository('');
      setTrackerUrl('');
      setKeyPrefix('');
    }
    setErrors({});
  }, [mapping, open]);

  const isEditing = !!mapping;

  // Check if form is valid for button state
  const isFormValid = () => {
    return (
      repository.trim() !== '' &&
      trackerUrl.trim() !== '' &&
      keyPrefix.trim() !== '' &&
      isValidRepositoryName(repository.trim()) &&
      isValidKeyPrefix(keyPrefix.trim()) &&
      (() => {
        try {
          const url = new URL(trackerUrl.trim());
          return url.protocol === 'https:';
        } catch {
          return false;
        }
      })()
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!repository.trim()) {
      newErrors.repository = 'Repository name is required';
    } else if (!isValidRepositoryName(repository.trim())) {
      newErrors.repository = 'Repository name must be in format "owner/repo"';
    }

    if (!trackerUrl.trim()) {
      newErrors.trackerUrl = 'Issue Tracker URL is required';
    } else {
      try {
        const url = new URL(trackerUrl.trim());
        if (url.protocol !== 'https:') {
          newErrors.trackerUrl = 'URL must use HTTPS';
        }
      } catch {
        newErrors.trackerUrl = 'Invalid URL format';
      }
    }

    if (!keyPrefix.trim()) {
      newErrors.keyPrefix = 'Key prefix is required';
    } else if (!isValidKeyPrefix(keyPrefix.trim())) {
      newErrors.keyPrefix = 'Key prefix must start with a letter and contain only letters, numbers, underscores, and hyphens';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const newMapping: RepositoryMapping = {
        id: mapping?.id || generateId(),
        repository: repository.trim(),
        trackerUrl: trackerUrl.trim(),
        keyPrefix: keyPrefix.trim(),
        enabled: mapping?.enabled ?? true,
        createdAt: mapping?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onSave(newMapping);
      onOpenChange(false);
      
      // Reset form
      if (!isEditing) {
        setRepository('');
        setTrackerUrl('');
        setKeyPrefix('');
      }
      setErrors({});
    } catch (error) {
      console.error('Error saving mapping:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setErrors({});
    // Reset form if not editing, or revert to original values if editing
    if (isEditing && mapping) {
      setRepository(mapping.repository);
      setTrackerUrl(mapping.trackerUrl);
      setKeyPrefix(mapping.keyPrefix);
    } else {
      setRepository('');
      setTrackerUrl('');
      setKeyPrefix('');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Repository Mapping' : 'Add New Repository Mapping'}
          </DialogTitle>
          <DialogDescription>
            Configure how issue keys should be linked for a specific repository.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="repository">Repository</Label>
            <Input
              id="repository"
              placeholder="owner/repo"
              value={repository}
              onChange={(e) => {
                setRepository(e.target.value);
                // Clear error when user starts typing
                if (errors.repository) {
                  setErrors(prev => ({ ...prev, repository: '' }));
                }
              }}
              className={errors.repository ? 'border-destructive' : ''}
            />
            {errors.repository && (
              <p className="text-sm text-destructive">{errors.repository}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Format: owner/repository (e.g., microsoft/vscode)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trackerUrl">Issue Tracker URL</Label>
            <Input
              id="trackerUrl"
              placeholder="https://your-project.example.com"
              value={trackerUrl}
              onChange={(e) => {
                setTrackerUrl(e.target.value);
                // Clear error when user starts typing
                if (errors.trackerUrl) {
                  setErrors(prev => ({ ...prev, trackerUrl: '' }));
                }
              }}
              className={errors.trackerUrl ? 'border-destructive' : ''}
            />
            {errors.trackerUrl && (
              <p className="text-sm text-destructive">{errors.trackerUrl}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Your issue tracker URL (must use HTTPS)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keyPrefix">Key Prefix</Label>
            <Input
              id="keyPrefix"
              placeholder="WMS"
              value={keyPrefix}
              onChange={(e) => {
                setKeyPrefix(e.target.value);
                // Clear error when user starts typing
                if (errors.keyPrefix) {
                  setErrors(prev => ({ ...prev, keyPrefix: '' }));
                }
              }}
              className={errors.keyPrefix ? 'border-destructive' : ''}
            />
            {errors.keyPrefix && (
              <p className="text-sm text-destructive">{errors.keyPrefix}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Issue key prefix (e.g., WMS for WMS-123, or api for api-456)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || !isFormValid()}
          >
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Mapping'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}