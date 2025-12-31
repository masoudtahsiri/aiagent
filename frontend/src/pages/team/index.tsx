import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  MoreHorizontal,
  Calendar,
  Mail,
  Phone,
  Users,
  Edit,
  Trash2,
  Link2,
  LinkIcon,
  ExternalLink,
  Check,
  AlertCircle,
  RefreshCw,
  Clock,
  Briefcase,
  Eye,
  CalendarOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch, Checkbox } from '@/components/ui/form-elements';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  useStaff,
  useCreateStaff,
  useDeleteStaff,
  useUpdateStaff,
  useServices,
  useStaffServices,
  useUpdateStaffServices,
  useStaffAvailability,
  useUpdateStaffAvailability,
} from '@/lib/api/hooks';
import { useIndustry } from '@/contexts/industry-context';
import { formatDuration } from '@/lib/utils/format';
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
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Get industry-specific terminology
  const { terminology } = useIndustry();
  const staffLabel = terminology.staff;
  const staffLabelPlural = terminology.staffPlural;

  const { data: staffResponse, isLoading, refetch } = useStaff();
  const deleteStaff = useDeleteStaff();
  const updateStaff = useUpdateStaff();

  const allStaff = staffResponse?.data || [];

  // Filter staff by status
  const staffList = allStaff.filter((member) => {
    if (statusFilter === 'active') return member.is_active;
    if (statusFilter === 'inactive') return !member.is_active;
    return true;
  });

  // Count for filter badges
  const activeCount = allStaff.filter(s => s.is_active).length;
  const inactiveCount = allStaff.filter(s => !s.is_active).length;

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
    if (!confirm(`Delete ${member.name}?`)) return;
    try {
      await deleteStaff.mutateAsync(member.id);
      toast.success('Staff member deleted');
      refetch();
    } catch (error) {
      toast.error('Failed to delete staff member');
    }
  };

  const handleConnectCalendar = (member: Staff) => {
    // This would initiate OAuth flow for Google Calendar
    // For now, show a placeholder message
    toast.info(`Calendar connection for ${member.name} coming soon! This will initiate Google OAuth.`);
  };

  const handleSuccess = () => {
    setShowNewModal(false);
    setEditingStaff(null);
    refetch();
  };

  if (isLoading) {
    return (
      <PageContainer title={staffLabelPlural} description={`Manage your ${staffLabelPlural.toLowerCase()} and their calendar integrations`}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={staffLabelPlural}
      description={`Manage ${staffLabelPlural.toLowerCase()} and their calendar integrations`}
    >
      {/* Info Banner */}
      <Card className="bg-primary/5 border-primary/20 mb-6">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Calendar Integration</p>
              <p className="text-sm text-muted-foreground">
                Each {staffLabel.toLowerCase()} can connect their own Google Calendar. The AI will automatically
                check availability and sync appointments.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Add Staff */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
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
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add {staffLabel}
        </Button>
      </div>

      {/* Staff Grid */}
      {staffList.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold mb-2">No team members yet</h3>
          <p className="text-muted-foreground mb-4">
            Add your first team member to start scheduling appointments
          </p>
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Team Member
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {staffList.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={cn('overflow-hidden h-full', !member.is_active && 'opacity-60')}>
                {/* Color Bar */}
                <div className="h-2" style={{ backgroundColor: member.color_code || '#3B82F6' }} />

                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => navigate(`/team/${member.id}`)}
                    >
                      <Avatar
                        name={member.name}
                        color={member.color_code}
                        size="lg"
                        status={member.is_active ? 'online' : 'offline'}
                      />
                      <div>
                        <h3 className="font-semibold">{member.name}</h3>
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
                        <DropdownMenuItem onClick={() => navigate(`/team/${member.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingStaff(member)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(member)}>
                          {member.is_active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(member)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
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

                  {/* Contact Info */}
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

                  {/* Calendar Integration Section */}
                  <div className="pt-4 border-t border-border">
                    <CalendarIntegrationStatus
                      member={member}
                      onConnect={() => handleConnectCalendar(member)}
                    />
                  </div>

                  {/* Quick Actions */}
                  <div className="pt-4 mt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/team/${member.id}`)}
                    >
                      <CalendarOff className="h-4 w-4 mr-2" />
                      Schedule & Time Off
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* New/Edit Staff Modal */}
      <Dialog
        open={showNewModal || !!editingStaff}
        onOpenChange={(open) => {
          if (!open) {
            setShowNewModal(false);
            setEditingStaff(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
          </DialogHeader>
          <StaffForm
            staff={editingStaff}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// Calendar Integration Status Component
function CalendarIntegrationStatus({
  member,
  onConnect,
}: {
  member: Staff;
  onConnect: () => void;
}) {
  // For now, we'll simulate the connection status
  // In a real implementation, this would come from the staff data or a separate API call
  const isConnected = false; // This would be: member.calendar_connection?.is_active

  if (isConnected) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-success-500/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-success-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Google Calendar</p>
              <p className="text-xs text-success-600 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Connected
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Last synced: Just now
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Calendar</p>
          <p className="text-xs text-muted-foreground">Not connected</p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onConnect}
      >
        <LinkIcon className="h-4 w-4 mr-2" />
        Connect Google Calendar
      </Button>
    </div>
  );
}

// Staff Form Component with Tabs
function StaffForm({ staff, onSuccess }: { staff?: Staff | null; onSuccess: () => void }) {
  const [activeTab, setActiveTab] = useState('info');
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    specialty: '',
    color_code: '#3B82F6',
    is_active: true,
  });

  // Availability state
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [schedule, setSchedule] = useState<Record<number, { is_open: boolean; start_time: string; end_time: string }>>({});

  // Services state
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const updateStaffServices = useUpdateStaffServices();
  const updateStaffAvailability = useUpdateStaffAvailability();

  // Fetch all services for the services tab
  const { data: servicesData } = useServices();
  const allServices = servicesData?.data || [];

  // Fetch staff's current services (only when editing)
  const { data: staffServices } = useStaffServices(staff?.id || '');

  // Fetch staff's availability (only when editing)
  const { data: staffAvailability } = useStaffAvailability(staff?.id || '');

  // Initialize form data
  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name,
        title: staff.title || '',
        email: staff.email || '',
        phone: staff.phone || '',
        specialty: staff.specialty || '',
        color_code: staff.color_code || '#3B82F6',
        is_active: staff.is_active,
      });
    }
  }, [staff]);

  // Initialize selected services from staff's current services
  useEffect(() => {
    if (staffServices && staffServices.length > 0) {
      setSelectedServices(staffServices.map((s: { id: string }) => s.id));
    }
  }, [staffServices]);

  // Initialize schedule from staff's availability
  useEffect(() => {
    if (staffAvailability && staffAvailability.length > 0) {
      const scheduleMap: Record<number, { is_open: boolean; start_time: string; end_time: string }> = {};
      staffAvailability.forEach((a: { day_of_week: number; start_time: string; end_time: string }) => {
        scheduleMap[a.day_of_week] = {
          is_open: true,
          start_time: a.start_time?.slice(0, 5) || '09:00',
          end_time: a.end_time?.slice(0, 5) || '17:00',
        };
      });
      // Fill in missing days
      for (let i = 0; i < 7; i++) {
        if (!scheduleMap[i]) {
          scheduleMap[i] = { is_open: false, start_time: '09:00', end_time: '17:00' };
        }
      }
      setSchedule(scheduleMap);
    } else {
      // Default schedule: Mon-Fri open
      const defaultSchedule: Record<number, { is_open: boolean; start_time: string; end_time: string }> = {};
      for (let i = 0; i < 7; i++) {
        defaultSchedule[i] = {
          is_open: i >= 1 && i <= 5, // Mon-Fri
          start_time: '09:00',
          end_time: '17:00',
        };
      }
      setSchedule(defaultSchedule);
    }
  }, [staffAvailability]);

  const handleToggleDay = (dayIndex: number) => {
    setSchedule(prev => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], is_open: !prev[dayIndex]?.is_open },
    }));
  };

  const handleTimeChange = (dayIndex: number, field: 'start_time' | 'end_time', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], [field]: value },
    }));
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Please enter a name');
      return;
    }

    try {
      let staffId = staff?.id;

      // Create or update staff info
      if (staff) {
        await updateStaff.mutateAsync({
          id: staff.id,
          data: {
            name: formData.name,
            title: formData.title || undefined,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            specialty: formData.specialty || undefined,
            color_code: formData.color_code,
            is_active: formData.is_active,
          }
        });
      } else {
        const result = await createStaff.mutateAsync({
          name: formData.name,
          title: formData.title || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          specialty: formData.specialty || undefined,
          color_code: formData.color_code,
          is_active: formData.is_active,
        });
        staffId = result.id;
      }

      // Update services if we have a staff ID
      if (staffId) {
        await updateStaffServices.mutateAsync({
          staffId,
          serviceIds: selectedServices,
        });

        // Update availability
        const templates = Object.entries(schedule)
          .filter(([_, data]) => data.is_open)
          .map(([day, data]) => ({
            day_of_week: parseInt(day),
            start_time: data.start_time + ':00',
            end_time: data.end_time + ':00',
            slot_duration_minutes: 30,
            is_active: true,
          }));

        if (templates.length > 0) {
          await updateStaffAvailability.mutateAsync({
            staffId,
            templates,
          });
        }
      }

      toast.success(staff ? 'Team member updated' : 'Team member added');
      onSuccess();
    } catch (error) {
      toast.error(staff ? 'Failed to update team member' : 'Failed to add team member');
    }
  };

  const isLoading = createStaff.isPending || updateStaff.isPending ||
    updateStaffServices.isPending || updateStaffAvailability.isPending;

  return (
    <form onSubmit={handleSubmit}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="availability" disabled={!staff}>Availability</TabsTrigger>
          <TabsTrigger value="services" disabled={!staff}>Services</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full Name *</label>
            <Input
              placeholder="John Smith"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
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

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">Active</p>
              <p className="text-sm text-muted-foreground">Can receive appointments</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
          </div>
        </TabsContent>

        {/* Availability Tab */}
        <TabsContent value="availability" className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Set the weekly schedule for this team member
          </p>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {days.map((day, index) => (
              <div
                key={day}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  schedule[index]?.is_open ? 'bg-card' : 'bg-muted/50'
                )}
              >
                <Switch
                  checked={schedule[index]?.is_open ?? false}
                  onCheckedChange={() => handleToggleDay(index)}
                />
                <span className={cn(
                  'font-medium w-24',
                  !schedule[index]?.is_open && 'text-muted-foreground'
                )}>
                  {day}
                </span>
                {schedule[index]?.is_open ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={schedule[index]?.start_time || '09:00'}
                      onChange={(e) => handleTimeChange(index, 'start_time', e.target.value)}
                      className="h-8 w-28"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={schedule[index]?.end_time || '17:00'}
                      onChange={(e) => handleTimeChange(index, 'end_time', e.target.value)}
                      className="h-8 w-28"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Not available</span>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Select which services this team member can perform
          </p>
          {allServices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No services available. Add services first.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {allServices.filter(s => s.is_active).map((service) => (
                <div
                  key={service.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedServices.includes(service.id)
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-card hover:bg-muted/50'
                  )}
                  onClick={() => handleServiceToggle(service.id)}
                >
                  <Checkbox
                    checked={selectedServices.includes(service.id)}
                    onCheckedChange={() => handleServiceToggle(service.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDuration(service.duration_minutes)}
                      {service.price ? ` • $${service.price}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          {staff ? 'Save Changes' : 'Add Team Member'}
        </Button>
      </div>
    </form>
  );
}
