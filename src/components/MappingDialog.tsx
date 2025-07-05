import { useState } from 'react';
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
  const [repository, setRepository] = useState(mapping?.repository || '');
  const [backlogUrl, setBacklogUrl] = useState(mapping?.backlogUrl || '');
  const [keyPrefix, setKeyPrefix] = useState(mapping?.keyPrefix || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const isEditing = !!mapping;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!repository.trim()) {
      newErrors.repository = 'Repository name is required';
    } else if (!isValidRepositoryName(repository.trim())) {
      newErrors.repository = 'Repository name must be in format "owner/repo"';
    }

    if (!backlogUrl.trim()) {
      newErrors.backlogUrl = 'Backlog URL is required';
    } else {
      try {
        const url = new URL(backlogUrl.trim());
        if (url.protocol !== 'https:') {
          newErrors.backlogUrl = 'URL must use HTTPS';
        }
      } catch {
        newErrors.backlogUrl = 'Invalid URL format';
      }
    }

    if (!keyPrefix.trim()) {
      newErrors.keyPrefix = 'Key prefix is required';
    } else if (!isValidKeyPrefix(keyPrefix.trim())) {
      newErrors.keyPrefix = 'Key prefix must start with a letter and contain only uppercase letters, numbers, underscores, and hyphens';
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
        backlogUrl: backlogUrl.trim(),
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
        setBacklogUrl('');
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
    onOpenChange(false);
    setErrors({});
    if (!isEditing) {
      setRepository('');
      setBacklogUrl('');
      setKeyPrefix('');
    }
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
              onChange={(e) => setRepository(e.target.value)}
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
            <Label htmlFor="backlogUrl">Backlog URL</Label>
            <Input
              id="backlogUrl"
              placeholder="https://your-project.backlog.com"
              value={backlogUrl}
              onChange={(e) => setBacklogUrl(e.target.value)}
              className={errors.backlogUrl ? 'border-destructive' : ''}
            />
            {errors.backlogUrl && (
              <p className="text-sm text-destructive">{errors.backlogUrl}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Your Backlog project URL (must use HTTPS)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keyPrefix">Key Prefix</Label>
            <Input
              id="keyPrefix"
              placeholder="WMS"
              value={keyPrefix}
              onChange={(e) => setKeyPrefix(e.target.value.toUpperCase())}
              className={errors.keyPrefix ? 'border-destructive' : ''}
            />
            {errors.keyPrefix && (
              <p className="text-sm text-destructive">{errors.keyPrefix}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Issue key prefix (e.g., WMS for WMS-123)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Mapping'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}