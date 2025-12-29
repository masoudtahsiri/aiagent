import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  LayoutGrid,
  Filter,
  Search,
  X,
  Clock,
  User,
  Phone,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  XCircle,
  Scissors,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  parseISO,
} from 'date-fns';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  useAppointments,
  useStaff,
  useServices,
  useUpdateAppointment,
  useCancelAppointment,
  useAvailableSlots,
  useCustomers,
} from '@/lib/api/hooks';
import type { AppointmentWithDetails, Staff, Service } from '@/types';

type ViewMode = 'calendar' | 'grid';
type AppointmentStatusType = 'scheduled' | 'cancelled';

const statusConfig: Record<AppointmentStatusType, { label: string; color: string; icon: typeof Clock }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

export default function AppointmentsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCustomer, setFilterCustomer] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Reschedule modal state
  const [rescheduleModal, setRescheduleModal] = useState<{
    open: boolean;
    appointment: AppointmentWithDetails | null;
  }>({ open: false, appointment: null });

  // Cancel modal state
  const [cancelModal, setCancelModal] = useState<{
    open: boolean;
    appointment: AppointmentWithDetails | null;
  }>({ open: false, appointment: null });

  // Fetch data
  const { data: staffData, isLoading: staffLoading } = useStaff();
  const { data: servicesData, isLoading: servicesLoading } = useServices();
  const { data: customersData } = useCustomers();
  const staff = staffData?.data || [];
  const services = servicesData?.data || [];
  const customers = customersData?.data || [];

  // Get date range for current view
  const dateRange = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [currentMonth]);

  const { data: appointments = [], isLoading: appointmentsLoading, refetch } = useAppointments({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    staffId: filterStaff !== 'all' ? filterStaff : undefined,
  });

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          apt.customer_name?.toLowerCase().includes(query) ||
          apt.customer_phone?.includes(query) ||
          apt.service_name?.toLowerCase().includes(query) ||
          apt.staff_name?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Service filter
      if (filterService !== 'all' && apt.service_id !== filterService) return false;

      // Status filter
      if (filterStatus !== 'all' && apt.status !== filterStatus) return false;

      // Customer filter
      if (filterCustomer !== 'all' && apt.customer_id !== filterCustomer) return false;

      // Date filter (for grid view)
      if (selectedDate && viewMode === 'grid') {
        const aptDate = parseISO(apt.appointment_date);
        if (!isSameDay(aptDate, selectedDate)) return false;
      }

      return true;
    });
  }, [appointments, searchQuery, filterService, filterStatus, filterCustomer, selectedDate, viewMode]);

  // Group appointments by date for calendar view
  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, AppointmentWithDetails[]> = {};
    filteredAppointments.forEach((apt) => {
      const date = apt.appointment_date;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(apt);
    });
    return grouped;
  }, [filteredAppointments]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterStaff('all');
    setFilterService('all');
    setFilterStatus('all');
    setFilterCustomer('all');
    setSelectedDate(null);
  };

  const hasActiveFilters = searchQuery || filterStaff !== 'all' || filterService !== 'all' ||
    filterStatus !== 'all' || filterCustomer !== 'all' || selectedDate;

  const isLoading = appointmentsLoading || staffLoading || servicesLoading;

  return (
    <PageContainer
      title="Appointments"
      description="Manage and view all appointments"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <div className="flex items-center border rounded-lg p-1 bg-muted/50">
            <Button
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="h-8"
            >
              <CalendarIcon className="h-4 w-4 mr-1.5" />
              Calendar
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8"
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              Grid
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Filters Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer, phone, service..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filter Toggle */}
              <Button
                variant={showFilters ? 'secondary' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}
                className="shrink-0"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    !
                  </span>
                )}
              </Button>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Expanded Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 mt-4 border-t">
                    {/* Staff Filter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Staff</label>
                      <Select value={filterStaff} onValueChange={setFilterStaff}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="All Staff" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Staff</SelectItem>
                          {staff.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Service Filter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Service</label>
                      <Select value={filterService} onValueChange={setFilterService}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="All Services" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Services</SelectItem>
                          {services.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Customer Filter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Customer</label>
                      <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="All Customers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Customers</SelectItem>
                          {customers.slice(0, 50).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.first_name} {c.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Status</label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Main Content */}
        {isLoading ? (
          <LoadingSkeleton viewMode={viewMode} />
        ) : viewMode === 'calendar' ? (
          <CalendarView
            currentMonth={currentMonth}
            appointmentsByDate={appointmentsByDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday}
            onReschedule={(apt) => setRescheduleModal({ open: true, appointment: apt })}
            onCancel={(apt) => setCancelModal({ open: true, appointment: apt })}
            staff={staff}
          />
        ) : (
          <GridView
            appointments={filteredAppointments}
            onReschedule={(apt) => setRescheduleModal({ open: true, appointment: apt })}
            onCancel={(apt) => setCancelModal({ open: true, appointment: apt })}
          />
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{filteredAppointments.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-blue-600">
                {filteredAppointments.filter((a) => a.status === 'scheduled').length}
              </p>
              <p className="text-sm text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-red-600">
                {filteredAppointments.filter((a) => a.status === 'cancelled').length}
              </p>
              <p className="text-sm text-muted-foreground">Cancelled</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reschedule Modal */}
      <RescheduleModal
        open={rescheduleModal.open}
        appointment={rescheduleModal.appointment}
        staff={staff}
        services={services}
        onClose={() => setRescheduleModal({ open: false, appointment: null })}
        onSuccess={() => {
          setRescheduleModal({ open: false, appointment: null });
          refetch();
        }}
      />

      {/* Cancel Modal */}
      <CancelModal
        open={cancelModal.open}
        appointment={cancelModal.appointment}
        onClose={() => setCancelModal({ open: false, appointment: null })}
        onSuccess={() => {
          setCancelModal({ open: false, appointment: null });
          refetch();
        }}
      />
    </PageContainer>
  );
}

// Calendar View Component
function CalendarView({
  currentMonth,
  appointmentsByDate,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  onReschedule,
  onCancel,
  staff,
}: {
  currentMonth: Date;
  appointmentsByDate: Record<string, AppointmentWithDetails[]>;
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onReschedule: (apt: AppointmentWithDetails) => void;
  onCancel: (apt: AppointmentWithDetails) => void;
  staff: Staff[];
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Get appointments for selected date
  const selectedDateAppointments = selectedDate
    ? appointmentsByDate[format(selectedDate, 'yyyy-MM-dd')] || []
    : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{format(currentMonth, 'MMMM yyyy')}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onToday}>
                Today
              </Button>
              <Button variant="ghost" size="icon" onClick={onPrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Week days header */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayAppointments = appointmentsByDate[dateKey] || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const dayIsToday = isToday(day);

              return (
                <button
                  key={dateKey}
                  onClick={() => onSelectDate(isSelected ? null : day)}
                  className={cn(
                    'relative p-2 min-h-[80px] rounded-lg border transition-all text-left',
                    isCurrentMonth ? 'bg-card' : 'bg-muted/30',
                    isSelected && 'ring-2 ring-primary border-primary',
                    !isSelected && 'hover:border-primary/50',
                    dayIsToday && !isSelected && 'border-primary/30'
                  )}
                >
                  <span
                    className={cn(
                      'text-sm font-medium',
                      !isCurrentMonth && 'text-muted-foreground',
                      dayIsToday && 'text-primary'
                    )}
                  >
                    {format(day, 'd')}
                  </span>

                  {dayAppointments.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {dayAppointments.slice(0, 3).map((apt) => {
                        const staffMember = staff.find((s) => s.id === apt.staff_id);
                        const isCancelled = apt.status === 'cancelled';
                        return (
                          <div
                            key={apt.id}
                            className={cn(
                              'text-[10px] px-1 py-0.5 rounded truncate',
                              isCancelled && 'line-through opacity-60'
                            )}
                            style={{
                              backgroundColor: staffMember?.color_code
                                ? `${staffMember.color_code}20`
                                : '#e5e7eb',
                              borderLeft: `2px solid ${staffMember?.color_code || '#9ca3af'}`,
                            }}
                          >
                            {apt.appointment_time.slice(0, 5)}
                          </div>
                        );
                      })}
                      {dayAppointments.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mb-4 opacity-20" />
              <p>Click on a date to view appointments</p>
            </div>
          ) : selectedDateAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mb-4 opacity-20" />
              <p>No appointments on this date</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {selectedDateAppointments
                .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
                .map((apt) => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onReschedule={() => onReschedule(apt)}
                    onCancel={() => onCancel(apt)}
                  />
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Grid View Component
function GridView({
  appointments,
  onReschedule,
  onCancel,
}: {
  appointments: AppointmentWithDetails[];
  onReschedule: (apt: AppointmentWithDetails) => void;
  onCancel: (apt: AppointmentWithDetails) => void;
}) {
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateCompare = a.appointment_date.localeCompare(b.appointment_date);
    if (dateCompare !== 0) return dateCompare;
    return a.appointment_time.localeCompare(b.appointment_time);
  });

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-medium">No appointments found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date & Time</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Service</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Staff</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAppointments.map((apt) => {
                const status = statusConfig[apt.status as AppointmentStatusType];
                const StatusIcon = status?.icon || Clock;

                return (
                  <tr key={apt.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="font-medium">{format(parseISO(apt.appointment_date), 'MMM d, yyyy')}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {apt.appointment_time.slice(0, 5)}
                        <span className="text-xs">({apt.duration_minutes}min)</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{apt.customer_name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {apt.customer_phone}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-muted-foreground" />
                        {apt.service_name || '-'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: apt.staff_color || '#9ca3af' }}
                        />
                        <span>{apt.staff_name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={cn('gap-1', status?.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {status?.label}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onReschedule(apt)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reschedule
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onCancel(apt)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Appointment Card Component
function AppointmentCard({
  appointment,
  onReschedule,
  onCancel,
}: {
  appointment: AppointmentWithDetails;
  onReschedule: () => void;
  onCancel: () => void;
}) {
  const status = statusConfig[appointment.status as AppointmentStatusType];
  const StatusIcon = status?.icon || Clock;

  return (
    <div
      className="p-3 rounded-lg border bg-card hover:shadow-sm transition-all"
      style={{ borderLeftWidth: 3, borderLeftColor: appointment.staff_color || '#9ca3af' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{appointment.appointment_time.slice(0, 5)}</span>
            <Badge variant="outline" className={cn('text-[10px] h-5', status?.color)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status?.label}
            </Badge>
          </div>
          <p className="font-medium truncate">{appointment.customer_name}</p>
          <p className="text-sm text-muted-foreground truncate">{appointment.service_name || 'No service'}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <User className="h-3 w-3" />
            {appointment.staff_name}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onReschedule}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reschedule
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCancel} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Cancel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Reschedule Modal Component
function RescheduleModal({
  open,
  appointment,
  staff,
  services,
  onClose,
  onSuccess,
}: {
  open: boolean;
  appointment: AppointmentWithDetails | null;
  staff: Staff[];
  services: Service[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  const updateAppointment = useUpdateAppointment();

  // Reset form when appointment changes
  useEffect(() => {
    if (appointment && open) {
      setSelectedStaff(appointment.staff_id);
      setSelectedService(appointment.service_id || '');
      setSelectedDate(appointment.appointment_date);
      setSelectedTime(appointment.appointment_time.slice(0, 5));
    }
  }, [appointment, open]);

  // Fetch available slots for selected staff and date
  const { data: availableSlots = [], isLoading: slotsLoading } = useAvailableSlots(
    selectedStaff,
    selectedDate,
    selectedDate
  );

  // Generate time slots for display
  const timeSlots = useMemo(() => {
    if (!selectedDate || !selectedStaff) return [];

    // Get available times from the API response
    const available = availableSlots
      .filter((slot) => slot.is_available)
      .map((slot) => slot.time.slice(0, 5));

    // If no slots from API, generate default business hours
    if (available.length === 0) {
      const slots = [];
      for (let hour = 9; hour < 18; hour++) {
        for (let min = 0; min < 60; min += 30) {
          slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
        }
      }
      return slots;
    }

    return available;
  }, [availableSlots, selectedDate, selectedStaff]);

  const handleSubmit = async () => {
    if (!appointment || !selectedStaff || !selectedDate || !selectedTime) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await updateAppointment.mutateAsync({
        id: appointment.id,
        data: {
          staff_id: selectedStaff,
          service_id: selectedService || undefined,
          appointment_date: selectedDate,
          appointment_time: selectedTime + ':00',
        },
      });
      toast.success('Appointment rescheduled successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to reschedule appointment');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
          <DialogDescription>
            Change the date, time, staff, or service for this appointment.
          </DialogDescription>
        </DialogHeader>

        {appointment && (
          <div className="space-y-4 py-4">
            {/* Current appointment info */}
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium">{appointment.customer_name}</p>
              <p className="text-muted-foreground">
                Currently: {format(parseISO(appointment.appointment_date), 'MMM d, yyyy')} at{' '}
                {appointment.appointment_time.slice(0, 5)}
              </p>
            </div>

            {/* Staff Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Staff Member</label>
              <Select value={selectedStaff} onValueChange={(v) => {
                setSelectedStaff(v);
                setSelectedTime(''); // Reset time when staff changes
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.filter((s) => s.is_active).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: s.color_code }}
                        />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Service</label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {services.filter((s) => s.is_active).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.duration_minutes}min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date & Time Selection Combined */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date & Time</label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime(''); // Reset time when date changes
                  }}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  disabled={!selectedStaff}
                  className="h-10"
                />
                {slotsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedTime} onValueChange={setSelectedTime} disabled={!selectedDate || !selectedStaff}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={!selectedStaff ? 'Select staff first' : !selectedDate ? 'Select date' : 'Select time'} />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {selectedStaff && selectedDate && timeSlots.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {timeSlots.length} available time slots for {format(parseISO(selectedDate), 'MMM d')}
                </p>
              )}
              {selectedStaff && selectedDate && timeSlots.length === 0 && !slotsLoading && (
                <p className="text-xs text-amber-600">
                  No available slots for this date
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={updateAppointment.isPending}
            disabled={!selectedStaff || !selectedDate || !selectedTime}
          >
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Cancel Modal Component
function CancelModal({
  open,
  appointment,
  onClose,
  onSuccess,
}: {
  open: boolean;
  appointment: AppointmentWithDetails | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState('');
  const cancelAppointment = useCancelAppointment();

  const handleCancel = async () => {
    if (!appointment) return;

    try {
      await cancelAppointment.mutateAsync({
        id: appointment.id,
        reason: reason || undefined,
      });
      toast.success('Appointment cancelled');
      setReason('');
      onSuccess();
    } catch (error) {
      toast.error('Failed to cancel appointment');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Appointment</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {appointment && (
          <div className="py-4 space-y-4">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="font-medium">{appointment.customer_name}</p>
              <p className="text-sm text-muted-foreground">
                {format(parseISO(appointment.appointment_date), 'EEEE, MMMM d, yyyy')} at{' '}
                {appointment.appointment_time.slice(0, 5)}
              </p>
              <p className="text-sm text-muted-foreground">
                {appointment.service_name} with {appointment.staff_name}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cancellation Reason (optional)</label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for cancellation"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep Appointment
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            loading={cancelAppointment.isPending}
          >
            Cancel Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Loading Skeleton
function LoadingSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'calendar') {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <Skeleton className="h-[500px] rounded-xl" />
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  );
}
