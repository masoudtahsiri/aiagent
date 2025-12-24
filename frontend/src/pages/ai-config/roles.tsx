import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, MoreHorizontal, Bot, Volume2, Edit, Trash2, Copy, Play } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/form-elements';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/form-elements';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/shared/empty-state';

// Mock AI roles
const mockRoles = [
  {
    id: '1',
    ai_name: 'Sarah',
    role_type: 'receptionist',
    voice_style: 'professional_female',
    greeting_message: "Thank you for calling Smile Dental Clinic. This is Sarah, your virtual assistant. How can I help you today?",
    is_enabled: true,
    priority: 1,
    calls_handled: 1250,
  },
  {
    id: '2',
    ai_name: 'Mike',
    role_type: 'sales',
    voice_style: 'friendly_male',
    greeting_message: "Hi there! Thanks for calling. I'm Mike, and I'd love to tell you about our services. What brings you in today?",
    is_enabled: true,
    priority: 2,
    calls_handled: 430,
  },
  {
    id: '3',
    ai_name: 'Emma',
    role_type: 'support',
    voice_style: 'friendly_female',
    greeting_message: "Hello! This is Emma from customer support. I'm here to help you with any questions or concerns.",
    is_enabled: false,
    priority: 3,
    calls_handled: 890,
  },
];

const roleTypes = [
  { value: 'receptionist', label: 'Receptionist', color: 'primary' },
  { value: 'sales', label: 'Sales', color: 'success' },
  { value: 'support', label: 'Support', color: 'secondary' },
  { value: 'billing', label: 'Billing', color: 'warning' },
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
  const [editingRole, setEditingRole] = useState<typeof mockRoles[0] | null>(null);

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
      {mockRoles.length === 0 ? (
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
          {mockRoles.map((role, i) => (
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
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Play className="h-4 w-4 mr-2" />
                          Test Call
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
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
                      {role.voice_style.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Greeting Preview */}
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    <p className="text-muted-foreground line-clamp-3">
                      "{role.greeting_message}"
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                      {role.calls_handled.toLocaleString()} calls handled
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Priority: {role.priority}
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
            onSuccess={() => {
              setShowNewModal(false);
              setEditingRole(null);
            }} 
          />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// Role Form Component
function RoleForm({ role, onSuccess }: { role?: typeof mockRoles[0] | null; onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">AI Name *</label>
          <Input 
            placeholder="e.g., Sarah" 
            defaultValue={role?.ai_name}
            required 
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Role Type *</label>
          <Select defaultValue={role?.role_type || 'receptionist'}>
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
        <Select defaultValue={role?.voice_style || 'professional_female'}>
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
          defaultValue={role?.greeting_message}
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
        />
        <p className="text-xs text-muted-foreground">
          This defines how the AI should behave and respond to callers
        </p>
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        <div>
          <p className="font-medium">Enable this role</p>
          <p className="text-sm text-muted-foreground">
            This role will handle incoming calls when enabled
          </p>
        </div>
        <Switch defaultChecked={role?.is_enabled ?? true} />
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
