import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Plus, MoreHorizontal, Phone, Mail, Calendar,
  ChevronLeft, ChevronRight, Users, Filter, Check, X,
  Eye, Edit, Trash2, UserX, UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useIsMobile } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import {
  useStaff,
  useCreateStaff,
  useDeleteStaff,
  useUpdateStaff,
} from '@/lib/api/hooks';
import { useIndustry } from '@/contexts/industry-context';
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

export default function TeamPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showNewModal, setShowNewModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Get industry-specific terminology
  const { terminology } = useIndustry();
  const staffLabel = terminology.staff;
  const staffLabelPlural = terminology.staffPlural;

  const { data: staffResponse, isLoading, refetch } = useStaff();
  const deleteStaff = useDeleteStaff();
  const updateStaff = useUpdateStaff();

  const allStaff = staffResponse?.data || [];

  // Filter staff by status and search
  const staffList = allStaff.filter((member) => {
    // Status filter
    if (statusFilter === 'active' && !member.is_active) return false;
    if (statusFilter === 'inactive' && member.is_active) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = member.name?.toLowerCase().includes(query);
      const matchesEmail = member.email?.toLowerCase().includes(query);
      const matchesPhone = member.phone?.includes(query);
      const matchesTitle = member.title?.toLowerCase().includes(query);
      if (!matchesName && !matchesEmail && !matchesPhone && !matchesTitle) return false;
    }

    return true;
  });

  // Counts
  const activeCount = allStaff.filter(s => s.is_active).length;
  const inactiveCount = allStaff.filter(s => !s.is_active).length;

  const handleToggleActive = async (member: Staff, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      await updateStaff.mutateAsync({
        id: member.id,
        data: { is_active: !member.is_active }
      });
      toast.success(`${member.name} ${member.is_active ? 'deactivated' : 'activated'}`);
      refetch();
    } catch {
      toast.error('Failed to update team member');
    }
  };

  const handleDelete = async (member: Staff, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!confirm(`Delete ${member.name}? This action cannot be undone.`)) return;
    try {
      await deleteStaff.mutateAsync(member.id);
      toast.success('Team member deleted');
      refetch();
    } catch {
      toast.error('Failed to delete team member');
    }
  };

  const handleNewSuccess = () => {
    setShowNewModal(false);
    refetch();
  };

  return (
    <PageContainer
      title={staffLabelPlural}
      description={`Manage your ${staffLabelPlural.toLowerCase()} and their schedules`}
      actions={
        <Button onClick={() => setShowNewModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Add {staffLabel}
        </Button>
      }
    >
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All ({allStaff.length})
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('active')}
          >
            Active ({activeCount})
          </Button>
          <Button
            variant={statusFilter === 'inactive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('inactive')}
          >
            Inactive ({inactiveCount})
          </Button>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : staffList.length === 0 ? (
        <EmptyState
          icon={Users}
          title={`No ${staffLabelPlural.toLowerCase()} found`}
          description={searchQuery ? "Try a different search term" : `Add your first ${staffLabel.toLowerCase()} to get started`}
          action={
            <Button onClick={() => setShowNewModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Add {staffLabel}
            </Button>
          }
        />
      ) : isMobile ? (
        <MobileTeamList
          staff={staffList}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
        />
      ) : (
        <DesktopTeamTable
          staff={staffList}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
        />
      )}

      {/* Results count */}
      {staffList.length > 0 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Showing {staffList.length} of {allStaff.length} {staffLabelPlural.toLowerCase()}
          </p>
        </div>
      )}

      {/* New Staff Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add {staffLabel}</DialogTitle>
          </DialogHeader>
          <NewStaffForm onSuccess={handleNewSuccess} staffLabel={staffLabel} />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// Mobile Team List
function MobileTeamList({
  staff,
  onToggleActive,
  onDelete,
}: {
  staff: Staff[];
  onToggleActive: (member: Staff, e?: React.MouseEvent) => void;
  onDelete: (member: Staff, e?: React.MouseEvent) => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      {staff.map((member, i) => (
        <motion.div
          key={member.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card
            className={cn(
              'p-4 cursor-pointer hover:shadow-md transition-shadow',
              !member.is_active && 'opacity-60'
            )}
            onClick={() => navigate(`/team/${member.id}`)}
          >
            <div className="flex items-center gap-3">
              <Avatar
                name={member.name}
                color={member.color_code}
                size="lg"
                status={member.is_active ? 'online' : 'offline'}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold truncate">{member.name}</h4>
                  {member.is_active ? (
                    <Badge variant="success" size="sm">Active</Badge>
                  ) : (
                    <Badge variant="secondary" size="sm">Inactive</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {member.title || 'Team Member'}
                </p>
                {member.phone && (
                  <p className="text-sm text-muted-foreground">{member.phone}</p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/team/${member.id}`); }}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => onToggleActive(member, e)}>
                    {member.is_active ? (
                      <>
                        <UserX className="h-4 w-4 mr-2" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Activate
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => onDelete(member, e)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// Desktop Team Table
function DesktopTeamTable({
  staff,
  onToggleActive,
  onDelete,
}: {
  staff: Staff[];
  onToggleActive: (member: Staff, e?: React.MouseEvent) => void;
  onDelete: (member: Staff, e?: React.MouseEvent) => void;
}) {
  const navigate = useNavigate();

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Team Member</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Contact</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Specialty</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member, i) => (
              <motion.tr
                key={member.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  'border-b border-border hover:bg-muted/50 transition-colors cursor-pointer',
                  !member.is_active && 'opacity-60'
                )}
                onClick={() => navigate(`/team/${member.id}`)}
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={member.name}
                      color={member.color_code}
                      status={member.is_active ? 'online' : 'offline'}
                    />
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.title || 'Team Member'}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    {member.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {member.phone}
                      </div>
                    )}
                    {member.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {member.email}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  {member.specialty ? (
                    <Badge variant="default">{member.specialty}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-4">
                  {member.is_active ? (
                    <Badge variant="success">
                      <Check className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <X className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </td>
                <td className="p-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/team/${member.id}`); }}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => onToggleActive(member, e)}>
                        {member.is_active ? (
                          <>
                            <UserX className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => onDelete(member, e)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// Simple New Staff Form (basic info only)
function NewStaffForm({ onSuccess, staffLabel = 'Team Member' }: { onSuccess: () => void; staffLabel?: string }) {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    specialty: '',
    color_code: '#3B82F6',
  });

  const createStaff = useCreateStaff();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    try {
      const result = await createStaff.mutateAsync({
        name: formData.name,
        title: formData.title || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        specialty: formData.specialty || undefined,
        color_code: formData.color_code,
        is_active: true,
      });
      toast.success(`${staffLabel} added successfully`);
      onSuccess();
    } catch {
      toast.error(`Failed to add ${staffLabel.toLowerCase()}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Full Name *</label>
        <Input
          placeholder="John Smith"
          required
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Title / Role</label>
        <Input
          placeholder="Senior Stylist, Dentist, etc."
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            placeholder="john@example.com"
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
          placeholder="Specialty or area of expertise"
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
              className={cn(
                'w-8 h-8 rounded-full border-2 transition-all',
                formData.color_code === color.value
                  ? 'border-foreground scale-110'
                  : 'border-transparent'
              )}
              style={{ backgroundColor: color.value }}
              title={color.label}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" loading={createStaff.isPending}>
          Add {staffLabel}
        </Button>
      </div>
    </form>
  );
}
