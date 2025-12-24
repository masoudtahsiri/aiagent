import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, MoreHorizontal, Calendar, Mail, Phone, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/form-elements';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useStaff, useCreateStaff, useDeleteStaff, useUpdateStaff } from '@/lib/api/hooks';
import type { Staff } from '@/types';

const colorOptions = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#06B6D4', label: 'Teal' },
  { value: '#22C55E', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#EC4899', label: 'Pink' },
];

export default function StaffPage() {
  const [showNewModal, setShowNewModal] = useState(false);
  
  // Fetch staff from API
  const { data: staffResponse, isLoading, refetch } = useStaff();
  const deleteStaff = useDeleteStaff();
  const updateStaff = useUpdateStaff();
  
  const staffList = staffResponse?.data || [];

  const handleToggleActive = async (member: Staff) => {
    try {
      await updateStaff.mutateAsync({
        id: member.id,
        data: { is_active: !member.is_active }
      });
      toast.success(`${member.name} ${member.is_active ? 'deactivated' : 'activated'}`);
      refetch();
    } catch (error) {
      toast.error('Failed to update staff member');
    }
  };

  const handleDelete = async (member: Staff) => {
    if (!confirm(`Are you sure you want to delete ${member.name}?`)) return;
    
    try {
      await deleteStaff.mutateAsync(member.id);
      toast.success('Staff member deleted');
      refetch();
    } catch (error) {
      toast.error('Failed to delete staff member');
    }
  };

  const handleNewStaffSuccess = () => {
    setShowNewModal(false);
    refetch();
  };

  if (isLoading) {
    return (
      <PageContainer title="Staff" description="Manage your team">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Staff"
      description="Manage your team members and their availability"
      actions={
        <Button onClick={() => setShowNewModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Add Staff
        </Button>
      }
    >
      {staffList.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No staff members"
          description="Add your first staff member to start scheduling appointments"
          action={
            <Button onClick={() => setShowNewModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Add Staff
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {staffList.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="overflow-hidden">
                {/* Color Bar */}
                <div className="h-2" style={{ backgroundColor: member.color_code || '#3B82F6' }} />
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar 
                        name={member.name} 
                        color={member.color_code}
                        size="lg"
                        status={member.is_active ? 'online' : 'offline'}
                      />
                      <div>
                        <Link 
                          to={`/staff/${member.id}`}
                          className="font-semibold hover:text-primary transition-colors"
                        >
                          {member.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">{member.title || 'Staff Member'}</p>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/staff/${member.id}`}>View Profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/staff/${member.id}`}>Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(member)}>
                          {member.is_active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDelete(member)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Specialty */}
                  {member.specialty && (
                    <Badge variant="default" className="mb-4">
                      {member.specialty}
                    </Badge>
                  )}

                  {/* Contact */}
                  <div className="space-y-2 mb-4">
                    {member.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    )}
                    {member.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex gap-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${member.is_active ? 'bg-success-500' : 'bg-muted-foreground'}`} />
                      <span className="text-sm text-muted-foreground">
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* New Staff Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
          </DialogHeader>
          <NewStaffForm onSuccess={handleNewStaffSuccess} />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// New Staff Form
function NewStaffForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    specialty: '',
    color_code: '#3B82F6',
    is_active: true,
  });
  
  const createStaff = useCreateStaff();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Please enter a name');
      return;
    }
    
    try {
      await createStaff.mutateAsync({
        name: formData.name,
        title: formData.title || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        specialty: formData.specialty || undefined,
        color_code: formData.color_code,
        is_active: formData.is_active,
      });
      toast.success('Staff member added');
      onSuccess();
    } catch (error) {
      toast.error('Failed to add staff member');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Full Name *</label>
        <Input 
          placeholder="Dr. Jane Smith" 
          required 
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Title</label>
        <Input 
          placeholder="Senior Dentist" 
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email</label>
          <Input 
            type="email" 
            placeholder="jane@clinic.com" 
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Phone</label>
          <Input 
            type="tel" 
            placeholder="+1 (555) 000-0000" 
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Specialty</label>
        <Input 
          placeholder="General Dentistry" 
          value={formData.specialty}
          onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Calendar Color</label>
        <div className="flex gap-2">
          {colorOptions.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, color_code: color.value }))}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                formData.color_code === color.value 
                  ? 'border-foreground scale-110' 
                  : 'border-transparent'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.label}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <div>
          <p className="font-medium">Active</p>
          <p className="text-sm text-muted-foreground">Staff member can receive appointments</p>
        </div>
        <Switch 
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" loading={createStaff.isPending}>
          Add Staff Member
        </Button>
      </div>
    </form>
  );
}
