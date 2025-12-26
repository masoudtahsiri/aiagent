import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, MoreHorizontal, Bot, Volume2, Edit, Trash2, Copy, Play } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/form-elements';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/form-elements';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/shared/empty-state';
import { useAIRoles, useCreateAIRole, useUpdateAIRole, useDeleteAIRole } from '@/lib/api/hooks';
import type { AIRole } from '@/types';

const roleTypes = [
  { value: 'assistant', label: 'Assistant', color: 'primary' },
  { value: 'sales', label: 'Sales', color: 'success' },
  { value: 'support', label: 'Support', color: 'secondary' },
  { value: 'billing', label: 'Billing', color: 'warning' },
  { value: 'marketing', label: 'Marketing', color: 'info' },
  { value: 'receptionist', label: 'Receptionist', color: 'default' },
];

const voiceStyles = [
  { value: 'professional_female', label: 'Professional Female' },
  { value: 'friendly_female', label: 'Friendly Female' },
  { value: 'professional_male', label: 'Professional Male' },
  { value: 'friendly_male', label: 'Friendly Male' },
  { value: 'neutral', label: 'Neutral' },
];

export default function AIRolesPage() {
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingRole, setEditingRole] = useState<AIRole | null>(null);
  
  // Fetch roles from API
  const { data: roles, isLoading, refetch } = useAIRoles();
  const updateRole = useUpdateAIRole();
  const deleteRole = useDeleteAIRole();

  const handleToggleEnabled = async (role: AIRole) => {
    try {
      await updateRole.mutateAsync({
        id: role.id,
        data: { is_enabled: !role.is_enabled }
      });
      toast.success(`${role.ai_name} ${role.is_enabled ? 'disabled' : 'enabled'}`);
      refetch();
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleDelete = async (role: AIRole) => {
    if (!confirm(`Are you sure you want to delete ${role.ai_name}?`)) return;
    
    try {
      await deleteRole.mutateAsync(role.id);
      toast.success('Role deleted');
      refetch();
    } catch (error) {
      toast.error('Failed to delete role');
    }
  };

  const handleSuccess = () => {
    setShowNewModal(false);
    setEditingRole(null);
    refetch();
  };

  if (isLoading) {
    return (
      <PageContainer
        title="AI Roles"
        description="Configure different AI personalities for various scenarios"
        breadcrumbs={[
          { label: 'AI Configuration', href: '/ai-config' },
          { label: 'AI Roles' },
        ]}
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="AI Roles"
      description="Configure different AI personalities for various scenarios"
      breadcrumbs={[
        { label: 'AI Configuration', href: '/ai-config' },
        { label: 'AI Roles' },
      ]}
      actions={
        <Button onClick={() => setShowNewModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Create Role
        </Button>
      }
    >
      {!roles || roles.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No AI roles configured"
          description="Create your first AI role to start handling calls"
          action={
            <Button onClick={() => setShowNewModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Create Role
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role, i) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`h-full ${!role.is_enabled && 'opacity-60'}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <Bot className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{role.ai_name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={roleTypes.find(r => r.value === role.role_type)?.color as any || 'default'}>
                            {role.role_type}
                          </Badge>
                          {!role.is_enabled && (
                            <Badge variant="default">Disabled</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingRole(role)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleEnabled(role)}>
                          {role.is_enabled ? 'Disable' : 'Enable'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(role)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Voice Style */}
                  <div className="flex items-center gap-2 text-sm">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">
                      {role.voice_style?.replace('_', ' ') || 'Default'}
                    </span>
                  </div>

                  {/* Greeting Preview */}
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    <p className="text-muted-foreground line-clamp-3">
                      "{role.greeting_message || 'No greeting set'}"
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                      {(role.calls_handled || 0).toLocaleString()} calls handled
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Priority: {role.priority || 1}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* New/Edit Role Modal */}
      <Dialog 
        open={showNewModal || !!editingRole} 
        onOpenChange={(open) => {
          if (!open) {
            setShowNewModal(false);
            setEditingRole(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit AI Role' : 'Create New AI Role'}</DialogTitle>
          </DialogHeader>
          <RoleForm 
            role={editingRole}
            onSuccess={handleSuccess} 
          />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// Role Form Component
function RoleForm({ role, onSuccess }: { role?: AIRole | null; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    ai_name: '',
    role_type: 'assistant' as AIRole['role_type'],
    voice_style: 'professional_female' as AIRole['voice_style'],
    greeting_message: '',
    system_prompt: '',
    is_enabled: true,
    priority: 1,
  });
  
  const createRole = useCreateAIRole();
  const updateRole = useUpdateAIRole();

  useEffect(() => {
    if (role) {
      setFormData({
        ai_name: role.ai_name,
        role_type: role.role_type,
        voice_style: role.voice_style,
        greeting_message: role.greeting_message,
        system_prompt: role.system_prompt || '',
        is_enabled: role.is_enabled,
        priority: role.priority,
      });
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.ai_name) {
      toast.error('Please enter an AI name');
      return;
    }
    
    try {
      if (role) {
        await updateRole.mutateAsync({
          id: role.id,
          data: formData
        });
        toast.success('Role updated');
      } else {
        await createRole.mutateAsync(formData);
        toast.success('Role created');
      }
      onSuccess();
    } catch (error) {
      toast.error(role ? 'Failed to update role' : 'Failed to create role');
    }
  };

  const isLoading = createRole.isPending || updateRole.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">AI Name *</label>
          <Input 
            placeholder="e.g., Sarah" 
            value={formData.ai_name}
            onChange={(e) => setFormData(prev => ({ ...prev, ai_name: e.target.value }))}
            required 
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Role Type *</label>
          <Select 
            value={formData.role_type}
            onValueChange={(v) => setFormData(prev => ({ ...prev, role_type: v as AIRole['role_type'] }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Voice Style *</label>
        <Select 
          value={formData.voice_style}
          onValueChange={(v) => setFormData(prev => ({ ...prev, voice_style: v as AIRole['voice_style'] }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {voiceStyles.map((style) => (
              <SelectItem key={style.value} value={style.value}>
                {style.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Greeting Message *</label>
        <Textarea 
          placeholder="Enter the greeting the AI will use..."
          value={formData.greeting_message}
          onChange={(e) => setFormData(prev => ({ ...prev, greeting_message: e.target.value }))}
          required
        />
        <p className="text-xs text-muted-foreground">
          Use {"{{business_name}}"} and {"{{ai_name}}"} as placeholders
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">System Prompt</label>
        <Textarea 
          placeholder="Define the AI's personality and behavior guidelines..."
          className="min-h-[150px] font-mono text-sm"
          value={formData.system_prompt}
          onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">
          This defines how the AI should behave and respond to callers
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Priority</label>
        <Select 
          value={formData.priority.toString()}
          onValueChange={(v) => setFormData(prev => ({ ...prev, priority: parseInt(v) }))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((p) => (
              <SelectItem key={p} value={p.toString()}>
                {p} {p === 1 ? '(Highest)' : p === 5 ? '(Lowest)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        <div>
          <p className="font-medium">Enable this role</p>
          <p className="text-sm text-muted-foreground">
            This role will handle incoming calls when enabled
          </p>
        </div>
        <Switch 
          checked={formData.is_enabled}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          {role ? 'Save Changes' : 'Create Role'}
        </Button>
      </div>
    </form>
  );
}
