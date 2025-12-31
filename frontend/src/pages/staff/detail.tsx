import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, isSameMonth, eachDayOfInterval } from 'date-fns';
import {
  ArrowLeft, Mail, Phone, Calendar, Clock, Edit, Save,
  Plus, Trash2, AlertCircle, CalendarOff, Info, User,
  ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge, AppointmentStatusBadge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch, Checkbox } from '@/components/ui/form-elements';
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
import type { StaffTimeOff, StaffAvailabilityEntry, TimeOffType, BusinessHours } from '@/types';

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
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const allServices = servicesData?.data || [];

  // Fetch staff's assigned services
  const { data: staffServices, isLoading: staffServicesLoading } = useStaffServices(id || '');

  // Fetch staff availability
  const { data: availabilityTemplates, isLoading: availabilityLoading, refetch: refetchAvailability } = useStaffAvailability(id || '');

  // Fetch time offs
  const { data: timeOffs, isLoading: timeOffsLoading, refetch: refetchTimeOffs } = useStaffTimeOffs(id || '');

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
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [hasServiceChanges, setHasServiceChanges] = useState(false);

  // Schedule & Time Off state
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [hasScheduleChanges, setHasScheduleChanges] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [timeOffReason, setTimeOffReason] = useState('');
  const [timeOffType, setTimeOffType] = useState<TimeOffType>('vacation');
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [showTimeOffDialog, setShowTimeOffDialog] = useState(false);

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
      setSelectedServices(staffServices.map((s: { id: string }) => s.id));
      setHasServiceChanges(false);
    }
  }, [staffServices]);

  // Initialize schedule
  useEffect(() => {
    if (availabilityLoading || businessHoursLoading) return;

    const businessHoursMap: Record<number, BusinessHours> = {};
    if (businessHours) {
      for (const h of businessHours) {
        businessHoursMap[h.day_of_week] = h;
      }
    }

    const availabilityMap: Record<number, { start_time: string; end_time: string; slot_duration_minutes: number }> = {};
    if (availabilityTemplates) {
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

      return {
        day_of_week: idx,
        is_working: !!av,
        start_time: av?.start_time || bh?.open_time?.slice(0, 5) || '09:00',
        end_time: av?.end_time || bh?.close_time?.slice(0, 5) || '17:00',
        slot_duration_minutes: av?.slot_duration_minutes || 30,
        businessOpen: bh?.open_time?.slice(0, 5),
        businessClose: bh?.close_time?.slice(0, 5),
        businessIsOpen: bh?.is_open !== false,
      };
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
  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
    setHasServiceChanges(true);
  };

  const handleSaveServices = async () => {
    if (!id) return;

    try {
      await updateStaffServices.mutateAsync({
        staffId: id,
        serviceIds: selectedServices,
      });
      toast.success('Services updated');
      setHasServiceChanges(false);
    } catch {
      toast.error('Failed to update services');
    }
  };

  // Schedule handlers
  const handleScheduleToggle = (dayIndex: number) => {
    setSchedule(prev => prev.map(entry =>
      entry.day_of_week === dayIndex ? { ...entry, is_working: !entry.is_working } : entry
    ));
    setHasScheduleChanges(true);
  };

  const handleScheduleTimeChange = (dayIndex: number, field: 'start_time' | 'end_time', value: string) => {
    setSchedule(prev => prev.map(entry =>
      entry.day_of_week === dayIndex ? { ...entry, [field]: value } : entry
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
      refetchAvailability();
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

  // Time off handlers
  const handleAddTimeOff = async () => {
    if (!id || !dateRange?.from) {
      toast.error('Please select a date');
      return;
    }

    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : startDate;

      await createTimeOff.mutateAsync({
        staff_id: id,
        start_date: startDate,
        end_date: endDate,
        time_off_type: timeOffType,
        reason: timeOffReason || undefined,
      });
      toast.success('Time off added');
      setDateRange(undefined);
      setTimeOffReason('');
      setTimeOffType('vacation');
      refetchTimeOffs();
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
      refetchTimeOffs();
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

  // Get time off dates for calendar
  const timeOffDates = useMemo(() => {
    if (!timeOffs) return [];
    const dates: Date[] = [];
    for (const t of timeOffs) {
      const start = new Date(t.start_date);
      const end = new Date(t.end_date);
      const range = eachDayOfInterval({ start, end });
      dates.push(...range);
    }
    return dates;
  }, [timeOffs]);

  // Filter time offs by selected calendar month
  const monthTimeOffs = useMemo(() => {
    if (!timeOffs) return [];
    return timeOffs
      .filter(t => {
        const start = new Date(t.start_date);
        const end = new Date(t.end_date);
        return isSameMonth(start, calendarMonth) || isSameMonth(end, calendarMonth);
      })
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [timeOffs, calendarMonth]);

  // Upcoming time offs
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
  const workingDaysCount = schedule.filter(s => s.is_working).length;

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
                <p className="text-2xl font-bold">{selectedServices.length}</p>
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
          <TabsTrigger value="schedule">
            <Clock className="h-4 w-4 mr-2" />
            Schedule & Time Off
          </TabsTrigger>
          <TabsTrigger value="appointments">
            <Calendar className="h-4 w-4 mr-2" />
            Appointments
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Basic Info Card */}
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
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Specialty</label>
                      <Input
                        value={profileForm.specialty}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, specialty: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Color</label>
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
                  <div className="space-y-3">
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
                    <div className="flex justify-between py-2">
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

            {/* Services Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Assigned Services</CardTitle>
                  <CardDescription>Services this team member can perform</CardDescription>
                </div>
                {hasServiceChanges && (
                  <Button size="sm" onClick={handleSaveServices} loading={updateStaffServices.isPending}>
                    Save
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {servicesLoading || staffServicesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : allServices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No services available</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {allServices.filter(s => s.is_active).map((service) => (
                      <div
                        key={service.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                          selectedServices.includes(service.id)
                            ? 'bg-primary/5 border-primary/30'
                            : 'hover:bg-muted/50'
                        )}
                        onClick={() => handleServiceToggle(service.id)}
                      >
                        <Checkbox
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={() => handleServiceToggle(service.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{service.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(service.duration_minutes)} {service.price ? `• $${service.price}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Schedule & Time Off Tab - Combined like Business Hours & Closures */}
        <TabsContent value="schedule">
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Left: Working Hours */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      Working Hours
                    </h3>
                    {hasScheduleChanges && (
                      <Button size="sm" onClick={handleSaveSchedule} loading={updateAvailability.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    )}
                  </div>

                  {/* Column Headers */}
                  <div className="grid grid-cols-[auto_48px_1fr_16px_1fr] items-center py-2 px-4 mb-2 text-xs font-medium text-muted-foreground">
                    <div className="w-[52px]"></div>
                    <div></div>
                    <span className="text-center">Start</span>
                    <span></span>
                    <span className="text-center">End</span>
                  </div>

                  {availabilityLoading || businessHoursLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-14" />)}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {schedule.map((entry) => {
                        const isWorking = entry.is_working;
                        const businessClosed = !entry.businessIsOpen;

                        return (
                          <div
                            key={entry.day_of_week}
                            className={cn(
                              'grid grid-cols-[auto_48px_1fr_16px_1fr] items-center py-3 px-4 rounded-xl border transition-all',
                              isWorking
                                ? 'bg-card border-border hover:border-primary/30'
                                : 'bg-muted/30 border-transparent'
                            )}
                          >
                            <Switch
                              checked={isWorking}
                              onCheckedChange={() => handleScheduleToggle(entry.day_of_week)}
                              disabled={businessClosed}
                            />
                            <span className={cn(
                              'text-sm font-medium',
                              !isWorking && 'text-muted-foreground'
                            )}>
                              {DAY_NAMES_SHORT[entry.day_of_week]}
                            </span>
                            {businessClosed ? (
                              <span className="col-span-3 text-sm text-muted-foreground text-center">Business Closed</span>
                            ) : isWorking ? (
                              <>
                                <Input
                                  type="time"
                                  value={entry.start_time || '09:00'}
                                  onChange={(e) => handleScheduleTimeChange(entry.day_of_week, 'start_time', e.target.value)}
                                  className="h-9 w-full max-w-28 mx-auto text-sm text-center"
                                />
                                <span className="text-muted-foreground text-sm text-center">—</span>
                                <Input
                                  type="time"
                                  value={entry.end_time || '17:00'}
                                  onChange={(e) => handleScheduleTimeChange(entry.day_of_week, 'end_time', e.target.value)}
                                  className="h-9 w-full max-w-28 mx-auto text-sm text-center"
                                />
                              </>
                            ) : (
                              <span className="col-span-3 text-sm text-muted-foreground text-center">Not Working</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Working <span className="font-medium text-foreground">{workingDaysCount}</span> days per week
                    </span>
                  </div>
                </div>

                {/* Right: Time Off */}
                <div className="lg:border-l lg:pl-8">
                  <div className="flex items-center mb-4">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <CalendarOff className="h-4 w-4 text-destructive" />
                      </div>
                      Scheduled Time Off
                    </h3>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    {/* Calendar Section */}
                    <div>
                      <DayPicker
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        month={calendarMonth}
                        onMonthChange={setCalendarMonth}
                        disabled={[{ before: new Date() }]}
                        modifiers={{
                          timeOff: timeOffDates,
                        }}
                        modifiersClassNames={{
                          timeOff: 'bg-destructive/20 text-destructive rounded-lg',
                        }}
                        components={{
                          IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                          IconRight: () => <ChevronRight className="h-4 w-4" />,
                        }}
                        classNames={{
                          months: 'flex flex-col',
                          month: 'space-y-3',
                          caption: 'flex justify-center relative items-center h-9',
                          caption_label: 'text-sm font-semibold',
                          nav: 'flex items-center',
                          nav_button: 'h-8 w-8 bg-transparent p-0 hover:bg-accent inline-flex items-center justify-center rounded-lg transition-colors',
                          nav_button_previous: 'absolute left-0',
                          nav_button_next: 'absolute right-0',
                          table: 'w-full border-collapse',
                          head_row: 'flex',
                          head_cell: 'text-muted-foreground w-10 font-medium text-xs flex-1 text-center py-2',
                          row: 'flex w-full',
                          cell: 'flex-1 h-10 text-center text-sm p-0.5 relative',
                          day: 'h-10 w-10 p-0 font-normal hover:bg-accent hover:text-accent-foreground rounded-lg inline-flex items-center justify-center cursor-pointer transition-colors mx-auto',
                          day_selected: 'bg-primary text-primary-foreground hover:bg-primary',
                          day_today: 'bg-accent text-accent-foreground font-semibold',
                          day_outside: 'text-muted-foreground opacity-50',
                          day_disabled: 'text-muted-foreground opacity-30 cursor-not-allowed hover:bg-transparent',
                          day_range_middle: 'bg-primary/10 rounded-none',
                          day_range_start: 'bg-primary text-primary-foreground rounded-l-lg rounded-r-none',
                          day_range_end: 'bg-primary text-primary-foreground rounded-r-lg rounded-l-none',
                          day_hidden: 'invisible',
                        }}
                        className="p-0"
                      />

                      <div className="mt-4 space-y-3">
                        {dateRange?.from && (
                          <div className="text-sm text-center py-2 px-3 bg-primary/5 rounded-lg border border-primary/20">
                            {dateRange.to
                              ? `${format(dateRange.from, 'MMM d')} — ${format(dateRange.to, 'MMM d, yyyy')}`
                              : format(dateRange.from, 'MMMM d, yyyy')}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Reason (optional)"
                            value={timeOffReason}
                            onChange={(e) => setTimeOffReason(e.target.value)}
                            className="h-10"
                          />
                          <Button
                            className="h-10 px-5"
                            onClick={handleAddTimeOff}
                            disabled={!dateRange?.from}
                            loading={createTimeOff.isPending}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Monthly Time Off List */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          {format(calendarMonth, 'MMMM yyyy')}
                        </span>
                        <Badge variant="secondary">
                          {monthTimeOffs.length}
                        </Badge>
                      </div>

                      {timeOffsLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-14 w-full rounded-xl" />
                          <Skeleton className="h-14 w-full rounded-xl" />
                          <Skeleton className="h-14 w-full rounded-xl" />
                        </div>
                      ) : monthTimeOffs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[280px] text-center bg-muted/20 rounded-xl border-2 border-dashed border-muted-foreground/20">
                          <CalendarOff className="h-10 w-10 text-muted-foreground/30 mb-3" />
                          <p className="text-sm font-medium text-muted-foreground">No time off in {format(calendarMonth, 'MMMM')}</p>
                          <p className="text-xs text-muted-foreground/70 mt-1 max-w-[180px]">
                            Select dates to add time off
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                          <AnimatePresence mode="popLayout">
                            {monthTimeOffs.map((timeOff) => {
                              const startDate = new Date(timeOff.start_date);
                              const typeInfo = getTimeOffTypeInfo(timeOff.time_off_type);
                              const isToday = new Date().toISOString().split('T')[0] === timeOff.start_date;

                              return (
                                <motion.div
                                  key={timeOff.id}
                                  layout
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, x: -10 }}
                                  className={cn(
                                    'group flex items-center gap-3 p-3 rounded-xl border transition-all',
                                    isToday
                                      ? 'bg-destructive/5 border-destructive/30'
                                      : 'bg-card border-border hover:border-primary/30 hover:shadow-sm'
                                  )}
                                >
                                  <div className={cn(
                                    'flex flex-col items-center justify-center w-12 h-12 rounded-lg text-center flex-shrink-0',
                                    isToday
                                      ? 'bg-destructive text-destructive-foreground'
                                      : 'bg-muted'
                                  )}>
                                    <span className="text-[10px] font-bold uppercase">
                                      {format(startDate, 'MMM')}
                                    </span>
                                    <span className="text-lg font-bold leading-none">
                                      {format(startDate, 'd')}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium flex items-center gap-2">
                                      <Badge className={cn('text-xs', typeInfo.color)}>{typeInfo.label}</Badge>
                                      {isToday && (
                                        <Badge variant="error" className="text-[10px]">
                                          Today
                                        </Badge>
                                      )}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                      {timeOff.start_date !== timeOff.end_date
                                        ? `${format(startDate, 'MMM d')} — ${format(new Date(timeOff.end_date), 'MMM d')}`
                                        : format(startDate, 'EEEE')}
                                    </p>
                                    {timeOff.reason && (
                                      <p className="text-xs text-muted-foreground/70 truncate">{timeOff.reason}</p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteTimeOff(timeOff)}
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {appointmentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : !appointments?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No appointments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{formatDate(apt.appointment_date, 'd')}</p>
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

      {/* Unsaved Changes Warning */}
      <AnimatePresence>
        {hasScheduleChanges && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <Card className="border-warning-500/50 bg-warning-500/10 shadow-lg">
              <CardContent className="p-4 flex items-center gap-4">
                <AlertCircle className="h-5 w-5 text-warning-600" />
                <span className="text-sm font-medium">You have unsaved schedule changes</span>
                <Button size="sm" onClick={handleSaveSchedule} loading={updateAvailability.isPending}>
                  Save Now
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
}
