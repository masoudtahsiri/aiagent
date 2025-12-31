import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, Mail, Phone, Calendar, Clock, Edit, Save,
  Check, X, Briefcase, Plus, Trash2, AlertCircle,
  CalendarOff, CalendarCheck, RotateCcw, AlertTriangle, Info
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
import { formatDate, formatTime } from '@/lib/utils/format';
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
} from '@/lib/api/hooks';
import type { StaffTimeOff, StaffAvailabilityEntry, TimeOffType, BusinessHours } from '@/types';

const TIME_OFF_TYPES: { value: TimeOffType; label: string; color: string }[] = [
  { value: 'vacation', label: 'Vacation', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'sick_leave', label: 'Sick Leave', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'personal', label: 'Personal', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'holiday', label: 'Holiday', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
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
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch staff data
  const { data: staffMember, isLoading: staffLoading } = useStaffMember(id || '');

  // Fetch staff appointments
  const { data: appointments, isLoading: appointmentsLoading } = useStaffAppointments(id || '');

  // Fetch services
  const { data: servicesData, isLoading: servicesLoading } = useServices();
  const services = servicesData?.data || [];

  // Fetch staff availability from dedicated endpoint
  const { data: availabilityTemplates, isLoading: availabilityLoading } = useStaffAvailability(id || '');

  // Fetch time offs
  const { data: timeOffs, isLoading: timeOffsLoading } = useStaffTimeOffs(id || '');

  // Fetch business hours for validation
  const { data: businessHours, isLoading: businessHoursLoading } = useStaffBusinessHours(id || '');

  // Time off mutations
  const createTimeOff = useCreateStaffTimeOff();
  const deleteTimeOff = useDeleteStaffTimeOff();

  // Availability mutations
  const updateAvailability = useUpdateStaffAvailabilitySchedule();

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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Initialize schedule from availability templates and business hours
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

  // Validate schedule changes
  useEffect(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const entry of schedule) {
      if (!entry.is_working) continue;

      const dayName = DAY_NAMES[entry.day_of_week];

      if (!entry.businessIsOpen) {
        errors.push(`${dayName}: Business is closed on this day`);
        continue;
      }

      if (entry.businessOpen && entry.start_time && entry.start_time < entry.businessOpen) {
        errors.push(`${dayName}: Start time (${entry.start_time}) is before business opens (${entry.businessOpen})`);
      }

      if (entry.businessClose && entry.end_time && entry.end_time > entry.businessClose) {
        errors.push(`${dayName}: End time (${entry.end_time}) is after business closes (${entry.businessClose})`);
      }

      if (!entry.businessOpen || !entry.businessClose) {
        warnings.push(`${dayName}: No business hours set for this day`);
      }
    }

    setValidationErrors(errors);
    setValidationWarnings(warnings);
  }, [schedule]);

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

    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before saving');
      return;
    }

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
      toast.success('Schedule saved successfully');
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
    // Reset to original values
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

    const resetSchedule: ScheduleEntry[] = DAY_NAMES.map((_, idx) => {
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

    setSchedule(resetSchedule);
    setHasScheduleChanges(false);
  };

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
      toast.success('Time off added successfully');
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

  // Group upcoming time offs
  const upcomingTimeOffs = useMemo(() => {
    if (!timeOffs) return [];
    const today = new Date().toISOString().split('T')[0];
    return timeOffs
      .filter(t => t.end_date >= today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [timeOffs]);

  const pastTimeOffs = useMemo(() => {
    if (!timeOffs) return [];
    const today = new Date().toISOString().split('T')[0];
    return timeOffs
      .filter(t => t.end_date < today)
      .sort((a, b) => b.start_date.localeCompare(a.start_date));
  }, [timeOffs]);

  if (staffLoading) {
    return (
      <PageContainer title="Loading...">
        <div className="space-y-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (!staffMember) {
    return (
      <PageContainer title="Staff Not Found">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Staff member not found or you don't have access.</p>
          <Link to="/staff">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Staff
            </Button>
          </Link>
        </Card>
      </PageContainer>
    );
  }

  const staffName = staffMember.name || 'Unknown';
  const assignedServices = services;

  return (
    <PageContainer
      title={staffName}
      breadcrumbs={[
        { label: 'Staff', href: '/staff' },
        { label: staffName },
      ]}
    >
      {/* Header Card */}
      <Card className="mb-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <Avatar
              name={staffName}
              size="2xl"
            />

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold font-display flex items-center gap-2 flex-wrap">
                    <span className="truncate">{staffName}</span>
                    {staffMember.is_active && (
                      <Badge variant="success" className="shrink-0">Active</Badge>
                    )}
                  </h1>
                  <p className="text-muted-foreground flex items-center gap-2 text-sm sm:text-base">
                    <Briefcase className="h-4 w-4 shrink-0" />
                    <span className="truncate">{staffMember.title || 'Staff'}</span>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" leftIcon={<Edit className="h-4 w-4" />}>
                    Edit
                  </Button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap gap-3 sm:gap-4 mb-4">
                {staffMember.phone && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{staffMember.phone}</span>
                  </div>
                )}
                {staffMember.email && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{staffMember.email}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-4 sm:gap-6">
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{appointments?.length || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Appointments</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{assignedServices.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Services</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{upcomingTimeOffs.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Upcoming Time Off</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs sm:text-sm">Schedule</TabsTrigger>
          <TabsTrigger value="time-off" className="text-xs sm:text-sm">Time Off</TabsTrigger>
          <TabsTrigger value="appointments" className="text-xs sm:text-sm">Appointments</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Services Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Briefcase className="h-5 w-5" />
                  Available Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                {servicesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : assignedServices.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">
                    No services available
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assignedServices.slice(0, 5).map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{service.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {service.duration_minutes} min • ${service.price || 0}
                          </p>
                        </div>
                        <Badge className="shrink-0 ml-2">{service.category || 'General'}</Badge>
                      </div>
                    ))}
                    {assignedServices.length > 5 && (
                      <p className="text-xs sm:text-sm text-muted-foreground text-center pt-2">
                        +{assignedServices.length - 5} more services
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Today's Schedule Preview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  Today's Appointments
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('appointments')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {appointmentsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : (
                  (() => {
                    const today = new Date().toISOString().split('T')[0];
                    const todayAppointments = (appointments || []).filter(
                      apt => apt.appointment_date === today
                    );

                    if (todayAppointments.length === 0) {
                      return (
                        <p className="text-muted-foreground text-center py-4 text-sm">
                          No appointments today
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {todayAppointments.slice(0, 5).map((apt) => (
                          <div
                            key={apt.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{apt.customer_name || 'Customer'}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatTime(apt.appointment_time)} • {apt.service_name}
                              </p>
                            </div>
                            <AppointmentStatusBadge status={apt.status} />
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          {/* Info Banner */}
          <Card className="bg-primary/5 border-primary/20 mb-6">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Info className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm sm:text-base">Staff Availability</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Set when this staff member is available for appointments. Hours must be within business operating hours.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Validation Errors */}
          <AnimatePresence>
            {validationErrors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="border-destructive/50 bg-destructive/5 mb-6">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-destructive text-sm">Validation Errors</p>
                        <ul className="text-xs sm:text-sm text-destructive/80 mt-1 space-y-1">
                          {validationErrors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Validation Warnings */}
          <AnimatePresence>
            {validationWarnings.length > 0 && validationErrors.length === 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="border-warning-500/50 bg-warning-500/5 mb-6">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-warning-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-warning-600 text-sm">Warnings</p>
                        <ul className="text-xs sm:text-sm text-warning-600/80 mt-1 space-y-1">
                          {validationWarnings.map((warn, i) => (
                            <li key={i}>{warn}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Schedule Grid */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base sm:text-lg">Weekly Availability</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Configure working hours for each day</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetSchedule}
                  disabled={!hasScheduleChanges}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveSchedule}
                  disabled={!hasScheduleChanges || validationErrors.length > 0}
                  loading={updateAvailability.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {availabilityLoading || businessHoursLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {schedule.map((entry, index) => {
                    const hasError = !entry.businessIsOpen && entry.is_working;
                    const hasTimeError = entry.is_working && (
                      (entry.businessOpen && entry.start_time && entry.start_time < entry.businessOpen) ||
                      (entry.businessClose && entry.end_time && entry.end_time > entry.businessClose)
                    );

                    return (
                      <motion.div
                        key={entry.day_of_week}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={cn(
                          'flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-colors',
                          entry.is_working
                            ? hasError || hasTimeError
                              ? 'bg-destructive/5 border-destructive/30'
                              : 'bg-card border-border'
                            : 'bg-muted/50 border-border'
                        )}
                      >
                        {/* Day Name & Toggle */}
                        <div className="flex items-center justify-between sm:justify-start gap-3 sm:w-36">
                          <Switch
                            checked={entry.is_working}
                            onCheckedChange={() => handleScheduleToggle(entry.day_of_week)}
                            disabled={!entry.businessIsOpen}
                          />
                          <span className={cn(
                            'font-medium text-sm sm:text-base',
                            !entry.is_working && 'text-muted-foreground'
                          )}>
                            <span className="hidden sm:inline">{DAY_NAMES[entry.day_of_week]}</span>
                            <span className="sm:hidden">{DAY_NAMES_SHORT[entry.day_of_week]}</span>
                          </span>

                          {/* Mobile Status */}
                          <div className="flex items-center gap-1.5 sm:hidden">
                            {entry.is_working ? (
                              <span className="flex items-center gap-1 text-xs text-success-600 dark:text-success-400">
                                <Check className="h-3 w-3" />
                                Working
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <X className="h-3 w-3" />
                                Off
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Desktop Status Indicator */}
                        <div className="hidden sm:flex items-center gap-2 w-24">
                          {entry.is_working ? (
                            <span className="flex items-center gap-1.5 text-sm text-success-600 dark:text-success-400">
                              <Check className="h-4 w-4" />
                              Working
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <X className="h-4 w-4" />
                              Off
                            </span>
                          )}
                        </div>

                        {/* Time Inputs */}
                        <div className={cn(
                          'flex flex-wrap items-center gap-2 sm:gap-3 flex-1',
                          !entry.is_working && 'opacity-50 pointer-events-none'
                        )}>
                          <div className="flex items-center gap-2">
                            <label className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12">From</label>
                            <Input
                              type="time"
                              value={entry.start_time || ''}
                              onChange={(e) => handleScheduleTimeChange(entry.day_of_week, 'start_time', e.target.value)}
                              className="w-28 sm:w-32 text-sm"
                            />
                          </div>
                          <span className="text-muted-foreground hidden sm:inline">—</span>
                          <div className="flex items-center gap-2">
                            <label className="text-xs sm:text-sm text-muted-foreground w-6 sm:w-8">To</label>
                            <Input
                              type="time"
                              value={entry.end_time || ''}
                              onChange={(e) => handleScheduleTimeChange(entry.day_of_week, 'end_time', e.target.value)}
                              className="w-28 sm:w-32 text-sm"
                            />
                          </div>
                        </div>

                        {/* Business Hours Reference & Duration */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 text-xs text-muted-foreground">
                          {entry.businessIsOpen && entry.businessOpen && entry.businessClose && (
                            <span className="hidden lg:inline">
                              Business: {entry.businessOpen} - {entry.businessClose}
                            </span>
                          )}
                          {!entry.businessIsOpen && (
                            <span className="text-destructive/70 text-xs">Business closed</span>
                          )}
                          {entry.is_working && entry.start_time && entry.end_time && (
                            <span className="hidden md:inline w-16 text-right">
                              {calculateDuration(entry.start_time, entry.end_time)}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unsaved Changes Warning */}
          <AnimatePresence>
            {hasScheduleChanges && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
              >
                <Card className="border-warning-500/50 bg-warning-500/10 shadow-lg">
                  <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                    <AlertCircle className="h-5 w-5 text-warning-600 shrink-0" />
                    <span className="text-xs sm:text-sm font-medium">Unsaved changes</span>
                    <Button
                      size="sm"
                      onClick={handleSaveSchedule}
                      disabled={validationErrors.length > 0}
                      loading={updateAvailability.isPending}
                    >
                      Save
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Time Off Tab */}
        <TabsContent value="time-off">
          {/* Info Banner */}
          <Card className="bg-primary/5 border-primary/20 mb-6">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <CalendarOff className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm sm:text-base">Time Off Management</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Schedule vacation days, sick leave, or other time off. The staff member won't be available for appointments during these periods.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Time Off Button */}
          <div className="flex justify-end mb-6">
            <Button onClick={() => setShowTimeOffDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Time Off
            </Button>
          </div>

          {/* Time Off List */}
          <div className="space-y-6">
            {/* Upcoming Time Off */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                  Upcoming Time Off
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeOffsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : upcomingTimeOffs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarOff className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No upcoming time off scheduled</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setShowTimeOffDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule Time Off
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingTimeOffs.map((timeOff) => {
                      const typeInfo = getTimeOffTypeInfo(timeOff.time_off_type);
                      const days = calculateTimeOffDays(timeOff.start_date, timeOff.end_date);

                      return (
                        <motion.div
                          key={timeOff.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card"
                        >
                          <div className="flex items-start gap-4">
                            <div className="text-center shrink-0">
                              <p className="text-xl sm:text-2xl font-bold">{formatDate(timeOff.start_date, 'd')}</p>
                              <p className="text-xs sm:text-sm text-muted-foreground">{formatDate(timeOff.start_date, 'MMM')}</p>
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <Badge className={cn('text-xs', typeInfo.color)}>
                                  {typeInfo.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {days} day{days > 1 ? 's' : ''}
                                </span>
                              </div>
                              <p className="text-sm font-medium">
                                {formatDate(timeOff.start_date, 'MMM d, yyyy')}
                                {timeOff.start_date !== timeOff.end_date && (
                                  <> — {formatDate(timeOff.end_date, 'MMM d, yyyy')}</>
                                )}
                              </p>
                              {timeOff.reason && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">{timeOff.reason}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => handleDeleteTimeOff(timeOff)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Past Time Off */}
            {pastTimeOffs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-muted-foreground">
                    <Clock className="h-5 w-5" />
                    Past Time Off
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pastTimeOffs.slice(0, 5).map((timeOff) => {
                      const typeInfo = getTimeOffTypeInfo(timeOff.time_off_type);
                      const days = calculateTimeOffDays(timeOff.start_date, timeOff.end_date);

                      return (
                        <div
                          key={timeOff.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 opacity-70"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Badge variant="outline" className="text-xs shrink-0">
                              {typeInfo.label}
                            </Badge>
                            <span className="text-sm truncate">
                              {formatDate(timeOff.start_date, 'MMM d')}
                              {timeOff.start_date !== timeOff.end_date && (
                                <> — {formatDate(timeOff.end_date, 'MMM d, yyyy')}</>
                              )}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{days} day{days > 1 ? 's' : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base sm:text-lg">All Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {appointmentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : !appointments?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No appointments found for this staff member</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {appointments.map((apt) => (
                    <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="text-center shrink-0">
                          <p className="text-xl sm:text-2xl font-bold">{formatDate(apt.appointment_date, 'd')}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{formatDate(apt.appointment_date, 'MMM')}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">{apt.customer_name || 'Customer'}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
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
            <DialogDescription>
              Schedule time off for {staffName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Time Off Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

            {/* Date Range */}
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

            {/* Reason */}
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
            <Button variant="outline" onClick={() => setShowTimeOffDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTimeOff}
              loading={createTimeOff.isPending}
            >
              Add Time Off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
