import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, Mail, Phone, Calendar, Clock, Edit, Save,
  Check, X, Plus, Trash2, AlertCircle, CalendarOff,
  Info, User, ChevronRight, ChevronLeft
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge, AppointmentStatusBadge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/form-elements';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatDate, formatTime, formatDuration } from '@/lib/utils/format';
import {
  useStaffMember,
  useStaffAppointments,
  useServices,
  useStaffAvailability,
  useStaffTimeOffs,
  useCreateStaffTimeOff,
  useDeleteStaffTimeOff,
  useStaffBusinessHours,
  useUpdateStaffAvailabilitySchedule,
  useUpdateStaff,
  useStaffServices,
  useUpdateStaffServices,
} from '@/lib/api/hooks';
import type { StaffTimeOff, StaffAvailabilityEntry, TimeOffType, BusinessHours, Service } from '@/types';

const TIME_OFF_TYPES: { value: TimeOffType; label: string; color: string }[] = [
  { value: 'vacation', label: 'Vacation', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'sick_leave', label: 'Sick Leave', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'personal', label: 'Personal', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'holiday', label: 'Holiday', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
];

const colorOptions = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#06B6D4', label: 'Teal' },
  { value: '#22C55E', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#EC4899', label: 'Pink' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ScheduleEntry extends StaffAvailabilityEntry {
  businessOpen?: string;
  businessClose?: string;
  businessIsOpen?: boolean;
}

export default function StaffDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('profile');

  // Fetch staff data
  const { data: staffMember, isLoading: staffLoading, refetch: refetchStaff } = useStaffMember(id || '');

  // Fetch staff appointments
  const { data: appointments, isLoading: appointmentsLoading } = useStaffAppointments(id || '');

  // Fetch all services
  const { data: servicesData, isLoading: servicesLoading } = useServices();
  const allServices = (servicesData?.data || []).filter((s: Service) => s.is_active);

  // Fetch staff's assigned services
  const { data: staffServices, isLoading: staffServicesLoading } = useStaffServices(id || '');

  // Fetch staff availability
  const { data: availabilityTemplates, isLoading: availabilityLoading } = useStaffAvailability(id || '');

  // Fetch time offs
  const { data: timeOffs, isLoading: timeOffsLoading } = useStaffTimeOffs(id || '');

  // Fetch business hours for validation
  const { data: businessHours, isLoading: businessHoursLoading } = useStaffBusinessHours(id || '');

  // Mutations
  const updateStaff = useUpdateStaff();
  const updateStaffServices = useUpdateStaffServices();
  const createTimeOff = useCreateStaffTimeOff();
  const deleteTimeOff = useDeleteStaffTimeOff();
  const updateAvailability = useUpdateStaffAvailabilitySchedule();

  // Profile form state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    specialty: '',
    color_code: '#3B82F6',
    is_active: true,
  });

  // Services state
  const [assignedServiceIds, setAssignedServiceIds] = useState<string[]>([]);
  const [hasServiceChanges, setHasServiceChanges] = useState(false);

  // Time off dialog state
  const [showTimeOffDialog, setShowTimeOffDialog] = useState(false);
  const [timeOffForm, setTimeOffForm] = useState({
    start_date: '',
    end_date: '',
    time_off_type: 'vacation' as TimeOffType,
    reason: '',
  });

  // Schedule editor state
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [hasScheduleChanges, setHasScheduleChanges] = useState(false);

  // Initialize profile form
  useEffect(() => {
    if (staffMember) {
      setProfileForm({
        name: staffMember.name || '',
        title: staffMember.title || '',
        email: staffMember.email || '',
        phone: staffMember.phone || '',
        specialty: staffMember.specialty || '',
        color_code: staffMember.color_code || '#3B82F6',
        is_active: staffMember.is_active,
      });
    }
  }, [staffMember]);

  // Initialize selected services
  useEffect(() => {
    if (staffServices && staffServices.length > 0) {
      setAssignedServiceIds(staffServices.map((s: { id: string }) => s.id));
      setHasServiceChanges(false);
    }
  }, [staffServices]);

  // Initialize schedule from business hours (defaults) or existing availability
  useEffect(() => {
    if (availabilityLoading || businessHoursLoading) return;

    const businessHoursMap: Record<number, BusinessHours> = {};
    if (businessHours) {
      for (const h of businessHours) {
        businessHoursMap[h.day_of_week] = h;
      }
    }

    const availabilityMap: Record<number, { start_time: string; end_time: string; slot_duration_minutes: number }> = {};
    if (availabilityTemplates && availabilityTemplates.length > 0) {
      for (const t of availabilityTemplates) {
        availabilityMap[t.day_of_week] = {
          start_time: t.start_time?.slice(0, 5) || '09:00',
          end_time: t.end_time?.slice(0, 5) || '17:00',
          slot_duration_minutes: t.slot_duration_minutes || 30,
        };
      }
    }

    const newSchedule: ScheduleEntry[] = DAY_NAMES.map((_, idx) => {
      const bh = businessHoursMap[idx];
      const av = availabilityMap[idx];
      const businessIsOpen = bh?.is_open !== false;
      const businessOpen = bh?.open_time?.slice(0, 5);
      const businessClose = bh?.close_time?.slice(0, 5);

      // If staff has existing availability, use it; otherwise default to business hours
      const hasExistingAvailability = availabilityTemplates && availabilityTemplates.length > 0;

      if (hasExistingAvailability) {
        return {
          day_of_week: idx,
          is_working: !!av && businessIsOpen,
          start_time: av?.start_time || businessOpen || '09:00',
          end_time: av?.end_time || businessClose || '17:00',
          slot_duration_minutes: av?.slot_duration_minutes || 30,
          businessOpen,
          businessClose,
          businessIsOpen,
        };
      } else {
        // Default to business hours
        return {
          day_of_week: idx,
          is_working: businessIsOpen,
          start_time: businessOpen || '09:00',
          end_time: businessClose || '17:00',
          slot_duration_minutes: 30,
          businessOpen,
          businessClose,
          businessIsOpen,
        };
      }
    });

    setSchedule(newSchedule);
    setHasScheduleChanges(false);
  }, [availabilityTemplates, businessHours, availabilityLoading, businessHoursLoading]);

  // Profile handlers
  const handleSaveProfile = async () => {
    if (!id) return;

    try {
      await updateStaff.mutateAsync({
        id,
        data: {
          name: profileForm.name,
          title: profileForm.title || undefined,
          email: profileForm.email || undefined,
          phone: profileForm.phone || undefined,
          specialty: profileForm.specialty || undefined,
          color_code: profileForm.color_code,
          is_active: profileForm.is_active,
        }
      });
      toast.success('Profile updated');
      setIsEditingProfile(false);
      refetchStaff();
    } catch {
      toast.error('Failed to update profile');
    }
  };

  // Services handlers
  const assignService = (serviceId: string) => {
    setAssignedServiceIds(prev => [...prev, serviceId]);
    setHasServiceChanges(true);
  };

  const unassignService = (serviceId: string) => {
    setAssignedServiceIds(prev => prev.filter(id => id !== serviceId));
    setHasServiceChanges(true);
  };

  const handleSaveServices = async () => {
    if (!id) return;

    try {
      await updateStaffServices.mutateAsync({
        staffId: id,
        serviceIds: assignedServiceIds,
      });
      toast.success('Services updated');
      setHasServiceChanges(false);
    } catch {
      toast.error('Failed to update services');
    }
  };

  // Derived service lists
  const assignedServices = allServices.filter(s => assignedServiceIds.includes(s.id));
  const unassignedServices = allServices.filter(s => !assignedServiceIds.includes(s.id));

  // Schedule handlers
  const handleScheduleToggle = (dayIndex: number) => {
    const entry = schedule[dayIndex];
    if (!entry.businessIsOpen) return; // Can't enable if business is closed

    setSchedule(prev => prev.map(e =>
      e.day_of_week === dayIndex ? { ...e, is_working: !e.is_working } : e
    ));
    setHasScheduleChanges(true);
  };

  const handleScheduleTimeChange = (dayIndex: number, field: 'start_time' | 'end_time', value: string) => {
    const entry = schedule[dayIndex];

    // Constrain to business hours
    let constrainedValue = value;
    if (field === 'start_time' && entry.businessOpen && value < entry.businessOpen) {
      constrainedValue = entry.businessOpen;
    }
    if (field === 'end_time' && entry.businessClose && value > entry.businessClose) {
      constrainedValue = entry.businessClose;
    }

    setSchedule(prev => prev.map(e =>
      e.day_of_week === dayIndex ? { ...e, [field]: constrainedValue } : e
    ));
    setHasScheduleChanges(true);
  };

  const handleSaveSchedule = async () => {
    if (!id) return;

    try {
      await updateAvailability.mutateAsync({
        staffId: id,
        schedule: schedule.map(s => ({
          day_of_week: s.day_of_week,
          is_working: s.is_working,
          start_time: s.start_time,
          end_time: s.end_time,
          slot_duration_minutes: s.slot_duration_minutes || 30,
        })),
      });
      toast.success('Schedule saved');
      setHasScheduleChanges(false);
    } catch (error) {
      const apiError = error as { response?: { data?: { detail?: { errors?: string[] } | string } } };
      const detail = apiError?.response?.data?.detail;
      if (typeof detail === 'object' && detail?.errors) {
        toast.error(detail.errors.join('\n'));
      } else {
        toast.error('Failed to save schedule');
      }
    }
  };

  const handleResetSchedule = () => {
    // Reset to business hours
    if (!businessHours) return;

    const businessHoursMap: Record<number, BusinessHours> = {};
    for (const h of businessHours) {
      businessHoursMap[h.day_of_week] = h;
    }

    const resetSchedule: ScheduleEntry[] = DAY_NAMES.map((_, idx) => {
      const bh = businessHoursMap[idx];
      const businessIsOpen = bh?.is_open !== false;
      const businessOpen = bh?.open_time?.slice(0, 5);
      const businessClose = bh?.close_time?.slice(0, 5);

      return {
        day_of_week: idx,
        is_working: businessIsOpen,
        start_time: businessOpen || '09:00',
        end_time: businessClose || '17:00',
        slot_duration_minutes: 30,
        businessOpen,
        businessClose,
        businessIsOpen,
      };
    });

    setSchedule(resetSchedule);
    setHasScheduleChanges(true);
  };

  // Time off handlers
  const handleCreateTimeOff = async () => {
    if (!id) return;

    if (!timeOffForm.start_date || !timeOffForm.end_date) {
      toast.error('Please select start and end dates');
      return;
    }

    if (timeOffForm.end_date < timeOffForm.start_date) {
      toast.error('End date must be on or after start date');
      return;
    }

    try {
      await createTimeOff.mutateAsync({
        staff_id: id,
        start_date: timeOffForm.start_date,
        end_date: timeOffForm.end_date,
        time_off_type: timeOffForm.time_off_type,
        reason: timeOffForm.reason || undefined,
      });
      toast.success('Time off added');
      setShowTimeOffDialog(false);
      setTimeOffForm({ start_date: '', end_date: '', time_off_type: 'vacation', reason: '' });
    } catch (error) {
      const apiError = error as { response?: { data?: { detail?: string } } };
      toast.error(apiError?.response?.data?.detail || 'Failed to add time off');
    }
  };

  const handleDeleteTimeOff = async (timeOff: StaffTimeOff) => {
    if (!id) return;

    try {
      await deleteTimeOff.mutateAsync({ timeOffId: timeOff.id, staffId: id });
      toast.success('Time off deleted');
    } catch {
      toast.error('Failed to delete time off');
    }
  };

  // Helpers
  const getTimeOffTypeInfo = (type: string) => {
    return TIME_OFF_TYPES.find(t => t.value === type) || TIME_OFF_TYPES[4];
  };

  const calculateDuration = (start: string, end: string): string => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    if (totalMinutes < 0) totalMinutes += 24 * 60;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const calculateTimeOffDays = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Group time offs
  const upcomingTimeOffs = useMemo(() => {
    if (!timeOffs) return [];
    const today = new Date().toISOString().split('T')[0];
    return timeOffs.filter(t => t.end_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [timeOffs]);

  if (staffLoading) {
    return (
      <PageContainer title="Loading...">
        <div className="space-y-6">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (!staffMember) {
    return (
      <PageContainer title="Team Member Not Found">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Team member not found or you don't have access.</p>
          <Link to="/team">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Team
            </Button>
          </Link>
        </Card>
      </PageContainer>
    );
  }

  const staffName = staffMember.name || 'Unknown';

  return (
    <PageContainer
      title={staffName}
      breadcrumbs={[
        { label: 'Team', href: '/team' },
        { label: staffName },
      ]}
    >
      {/* Header Card */}
      <Card className="mb-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Avatar
              name={staffName}
              color={staffMember.color_code}
              size="xl"
              status={staffMember.is_active ? 'online' : 'offline'}
            />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold">{staffName}</h1>
                {staffMember.is_active ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
              <p className="text-muted-foreground">{staffMember.title || 'Team Member'}</p>

              <div className="flex flex-wrap gap-4 mt-3 text-sm">
                {staffMember.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {staffMember.phone}
                  </span>
                )}
                {staffMember.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {staffMember.email}
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold">{appointments?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Appointments</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{assignedServices.length}</p>
                <p className="text-xs text-muted-foreground">Services</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingTimeOffs.length}</p>
                <p className="text-xs text-muted-foreground">Time Off</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="services">
            Services
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule & Time Off
          </TabsTrigger>
          <TabsTrigger value="appointments">
            <Clock className="h-4 w-4 mr-2" />
            Appointments
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Basic Information</CardTitle>
              {!isEditingProfile ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveProfile} loading={updateStaff.isPending}>
                    Save
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditingProfile ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Full Name</label>
                      <Input
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Title / Role</label>
                      <Input
                        value={profileForm.title}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Phone</label>
                      <Input
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Specialty</label>
                      <Input
                        value={profileForm.specialty}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, specialty: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Calendar Color</label>
                    <div className="flex gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setProfileForm(prev => ({ ...prev, color_code: color.value }))}
                          className={cn(
                            'w-8 h-8 rounded-full border-2 transition-all',
                            profileForm.color_code === color.value ? 'border-foreground scale-110' : 'border-transparent'
                          )}
                          style={{ backgroundColor: color.value }}
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
                      checked={profileForm.is_active}
                      onCheckedChange={(checked) => setProfileForm(prev => ({ ...prev, is_active: checked }))}
                    />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{staffMember.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Title</span>
                    <span>{staffMember.title || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Email</span>
                    <span>{staffMember.email || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{staffMember.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Specialty</span>
                    <span>{staffMember.specialty || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Status</span>
                    {staffMember.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab - Two Pool Design */}
        <TabsContent value="services">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold">Assigned Services</h2>
              <p className="text-sm text-muted-foreground">Select which services this team member can perform</p>
            </div>
            {hasServiceChanges && (
              <Button onClick={handleSaveServices} loading={updateStaffServices.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            )}
          </div>

          {servicesLoading || staffServicesLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
            </div>
          ) : allServices.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No services available. Create services first.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Unassigned Services Pool */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Available Services</span>
                    <Badge variant="secondary">{unassignedServices.length}</Badge>
                  </CardTitle>
                  <CardDescription>Click to assign to this team member</CardDescription>
                </CardHeader>
                <CardContent>
                  {unassignedServices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">All services assigned</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {unassignedServices.map((service) => (
                        <motion.div
                          key={service.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-3 rounded-lg border border-dashed hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors group"
                          onClick={() => assignService(service.id)}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{service.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDuration(service.duration_minutes)} {service.price ? `• $${service.price}` : ''}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assigned Services Pool */}
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Assigned Services</span>
                    <Badge variant="default">{assignedServices.length}</Badge>
                  </CardTitle>
                  <CardDescription>Click to remove from this team member</CardDescription>
                </CardHeader>
                <CardContent>
                  {assignedServices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No services assigned yet</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {assignedServices.map((service) => (
                        <motion.div
                          key={service.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-3 rounded-lg border bg-background hover:border-destructive/50 hover:bg-destructive/5 cursor-pointer transition-colors group"
                          onClick={() => unassignService(service.id)}
                        >
                          <div className="flex items-center gap-3">
                            <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-destructive transition-colors" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm">{service.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDuration(service.duration_minutes)} {service.price ? `• $${service.price}` : ''}
                              </p>
                            </div>
                          </div>
                          <Check className="h-4 w-4 text-primary" />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Schedule & Time Off Tab (Combined like Business Hours page) */}
        <TabsContent value="schedule">
          <div className="space-y-8">
            {/* Weekly Schedule Section */}
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Weekly Schedule</h2>
                  <p className="text-sm text-muted-foreground">Working hours based on business operating hours</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleResetSchedule}>
                    Reset to Business Hours
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveSchedule}
                    disabled={!hasScheduleChanges}
                    loading={updateAvailability.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  {availabilityLoading || businessHoursLoading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-14" />)}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {schedule.map((entry) => (
                        <div
                          key={entry.day_of_week}
                          className={cn(
                            'flex flex-wrap items-center gap-4 p-4 transition-colors',
                            !entry.businessIsOpen && 'bg-muted/50'
                          )}
                        >
                          {/* Toggle */}
                          <Switch
                            checked={entry.is_working}
                            onCheckedChange={() => handleScheduleToggle(entry.day_of_week)}
                            disabled={!entry.businessIsOpen}
                          />

                          {/* Day Name */}
                          <span className={cn(
                            'font-medium w-28',
                            !entry.is_working && 'text-muted-foreground'
                          )}>
                            {DAY_NAMES[entry.day_of_week]}
                          </span>

                          {/* Status/Times */}
                          {!entry.businessIsOpen ? (
                            <span className="text-sm text-muted-foreground">Business Closed</span>
                          ) : entry.is_working ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                type="time"
                                value={entry.start_time || ''}
                                min={entry.businessOpen}
                                max={entry.businessClose}
                                onChange={(e) => handleScheduleTimeChange(entry.day_of_week, 'start_time', e.target.value)}
                                className="w-32"
                              />
                              <span className="text-muted-foreground">to</span>
                              <Input
                                type="time"
                                value={entry.end_time || ''}
                                min={entry.businessOpen}
                                max={entry.businessClose}
                                onChange={(e) => handleScheduleTimeChange(entry.day_of_week, 'end_time', e.target.value)}
                                className="w-32"
                              />
                              {entry.start_time && entry.end_time && (
                                <Badge variant="secondary" className="ml-2">
                                  {calculateDuration(entry.start_time, entry.end_time)}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not Working</span>
                          )}

                          {/* Business Hours Reference */}
                          {entry.businessIsOpen && entry.businessOpen && entry.businessClose && (
                            <span className="text-xs text-muted-foreground hidden lg:block ml-auto">
                              Business: {entry.businessOpen} - {entry.businessClose}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Scheduled Time Off Section (like Business Closures) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Scheduled Time Off</h2>
                  <p className="text-sm text-muted-foreground">Vacation, sick leave, and other time off</p>
                </div>
                <Button onClick={() => setShowTimeOffDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Off
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  {timeOffsLoading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
                    </div>
                  ) : upcomingTimeOffs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CalendarOff className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="text-sm">No scheduled time off</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {upcomingTimeOffs.map((timeOff) => {
                        const typeInfo = getTimeOffTypeInfo(timeOff.time_off_type);
                        const days = calculateTimeOffDays(timeOff.start_date, timeOff.end_date);

                        return (
                          <div
                            key={timeOff.id}
                            className="flex items-center justify-between p-4"
                          >
                            <div className="flex items-center gap-4">
                              <div className="text-center w-12">
                                <p className="text-2xl font-bold leading-none">{formatDate(timeOff.start_date, 'd')}</p>
                                <p className="text-xs text-muted-foreground">{formatDate(timeOff.start_date, 'MMM')}</p>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <Badge className={cn('text-xs', typeInfo.color)}>{typeInfo.label}</Badge>
                                  <span className="text-xs text-muted-foreground">{days} day{days > 1 ? 's' : ''}</span>
                                </div>
                                <p className="text-sm">
                                  {formatDate(timeOff.start_date, 'MMM d, yyyy')}
                                  {timeOff.start_date !== timeOff.end_date && <> — {formatDate(timeOff.end_date, 'MMM d, yyyy')}</>}
                                </p>
                                {timeOff.reason && <p className="text-xs text-muted-foreground mt-0.5">{timeOff.reason}</p>}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteTimeOff(timeOff)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appointments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {appointmentsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : !appointments?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No appointments</p>
                </div>
              ) : (
                <div className="divide-y">
                  {appointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="text-center w-12">
                          <p className="text-2xl font-bold leading-none">{formatDate(apt.appointment_date, 'd')}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(apt.appointment_date, 'MMM')}</p>
                        </div>
                        <div>
                          <p className="font-medium">{apt.customer_name || 'Customer'}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(apt.appointment_time)} • {apt.duration_minutes} min • {apt.service_name}
                          </p>
                        </div>
                      </div>
                      <AppointmentStatusBadge status={apt.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Time Off Dialog */}
      <Dialog open={showTimeOffDialog} onOpenChange={setShowTimeOffDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Time Off</DialogTitle>
            <DialogDescription>Schedule time off for {staffName}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_OFF_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setTimeOffForm(prev => ({ ...prev, time_off_type: type.value }))}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                      timeOffForm.time_off_type === type.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted'
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={timeOffForm.start_date}
                  onChange={(e) => setTimeOffForm(prev => ({ ...prev, start_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={timeOffForm.end_date}
                  onChange={(e) => setTimeOffForm(prev => ({ ...prev, end_date: e.target.value }))}
                  min={timeOffForm.start_date || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input
                placeholder="e.g., Family vacation"
                value={timeOffForm.reason}
                onChange={(e) => setTimeOffForm(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTimeOffDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateTimeOff} loading={createTimeOff.isPending}>Add Time Off</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
