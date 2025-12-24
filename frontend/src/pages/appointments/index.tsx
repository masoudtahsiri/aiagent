import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, Filter,
  LayoutGrid, List, Clock, User
} from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, AppointmentStatusBadge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import { formatTime, formatDate } from '@/lib/utils/format';
import { 
  useAppointments, 
  useStaff, 
  useCustomers,
  useServices,
  useCreateAppointment,
  useCancelAppointment 
} from '@/lib/api/hooks';
import type { AppointmentWithDetails, Staff } from '@/types';

export default function AppointmentsPage() {
  const { calendarView, setCalendarView, calendarDate, setCalendarDate } = useUIStore();
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [showNewModal, setShowNewModal] = useState(false);

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    const today = calendarDate;
    if (calendarView === 'day') {
      return { 
        startDate: format(today, 'yyyy-MM-dd'), 
        endDate: format(today, 'yyyy-MM-dd') 
      };
    } else if (calendarView === 'week') {
      return { 
        startDate: format(startOfWeek(today), 'yyyy-MM-dd'), 
        endDate: format(endOfWeek(today), 'yyyy-MM-dd') 
      };
    } else {
      // Month or Agenda view - show current month
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { 
        startDate: format(start, 'yyyy-MM-dd'), 
        endDate: format(end, 'yyyy-MM-dd') 
      };
    }
  }, [calendarView, calendarDate]);

  // Fetch appointments
  const { data: appointments, isLoading: appointmentsLoading, refetch } = useAppointments({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    staffId: selectedStaff !== 'all' ? selectedStaff : undefined,
  });

  // Fetch staff for filter
  const { data: staffResponse } = useStaff();
  const staffList = staffResponse?.data || [];

  const navigateDate = (direction: 'prev' | 'next') => {
    if (calendarView === 'day') {
      setCalendarDate(direction === 'next' ? addDays(calendarDate, 1) : subDays(calendarDate, 1));
    } else if (calendarView === 'week') {
      setCalendarDate(direction === 'next' ? addWeeks(calendarDate, 1) : subWeeks(calendarDate, 1));
    } else {
      const newDate = new Date(calendarDate);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      setCalendarDate(newDate);
    }
  };

  const getDateRangeLabel = () => {
    if (calendarView === 'day') {
      return format(calendarDate, 'EEEE, MMMM d, yyyy');
    } else if (calendarView === 'week') {
      const start = startOfWeek(calendarDate);
      const end = endOfWeek(calendarDate);
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    } else {
      return format(calendarDate, 'MMMM yyyy');
    }
  };

  const handleNewAppointmentSuccess = () => {
    setShowNewModal(false);
    refetch();
  };

  return (
    <PageContainer
      title="Appointments"
      description="Manage your appointment calendar"
      actions={
        <Button onClick={() => setShowNewModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
          New Appointment
        </Button>
      }
    >
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* View Toggle */}
        <Tabs value={calendarView} onValueChange={(v) => setCalendarView(v as typeof calendarView)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCalendarDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="font-medium ml-2">{getDateRangeLabel()}</span>
        </div>

        {/* Staff Filter */}
        <div className="sm:ml-auto">
          <Select value={selectedStaff} onValueChange={setSelectedStaff}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staffList.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: staff.color_code }} />
                    {staff.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar View / Agenda List */}
      {calendarView === 'agenda' ? (
        <AgendaView 
          appointments={appointments || []} 
          loading={appointmentsLoading} 
          onRefresh={refetch}
        />
      ) : (
        <CalendarGrid 
          view={calendarView} 
          date={calendarDate}
          appointments={appointments || []}
          loading={appointmentsLoading}
        />
      )}

      {/* New Appointment Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
          </DialogHeader>
          <NewAppointmentForm onSuccess={handleNewAppointmentSuccess} />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// Agenda View Component
function AgendaView({ 
  appointments, 
  loading,
  onRefresh 
}: { 
  appointments: AppointmentWithDetails[]; 
  loading: boolean;
  onRefresh: () => void;
}) {
  const cancelAppointment = useCancelAppointment();

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    
    try {
      await cancelAppointment.mutateAsync({ id });
      toast.success('Appointment cancelled');
      onRefresh();
    } catch (error) {
      toast.error('Failed to cancel appointment');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">No appointments</h3>
        <p className="text-muted-foreground">There are no appointments scheduled for this period.</p>
      </Card>
    );
  }

  // Group by date
  const groupedByDate = appointments.reduce((acc, apt) => {
    const date = apt.appointment_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(apt);
    return acc;
  }, {} as Record<string, AppointmentWithDetails[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).sort().map(([date, dateAppointments]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {formatDate(date)}
          </h3>
          <div className="space-y-3">
            {dateAppointments.map((apt, i) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-1 h-16 rounded-full"
                      style={{ backgroundColor: apt.staff_color || '#3B82F6' }}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{apt.customer_name}</h4>
                        <AppointmentStatusBadge status={apt.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">{apt.service_name || 'Appointment'}</p>
                      <p className="text-sm text-muted-foreground">with {apt.staff_name}</p>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {apt.appointment_time?.slice(0, 5)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {apt.duration_minutes} min
                      </p>
                      {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-1 text-destructive text-xs h-6"
                          onClick={() => handleCancel(apt.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Calendar Grid Component
function CalendarGrid({ 
  view, 
  date, 
  appointments,
  loading 
}: { 
  view: string; 
  date: Date;
  appointments: AppointmentWithDetails[];
  loading: boolean;
}) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM
  const todayStr = format(date, 'yyyy-MM-dd');

  // Filter appointments for the current day (for day view)
  const dayAppointments = view === 'day' 
    ? appointments.filter(apt => apt.appointment_date === todayStr)
    : appointments;

  if (loading) {
    return <Skeleton className="h-[600px] rounded-xl" />;
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Time slots */}
          <div className="divide-y divide-border">
            {hours.map((hour) => {
              const hourAppointments = dayAppointments.filter(apt => {
                if (!apt.appointment_time) return false;
                const aptHour = parseInt(apt.appointment_time.split(':')[0]);
                return aptHour === hour;
              });

              return (
                <div key={hour} className="flex min-h-[80px]">
                  <div className="w-20 p-2 text-xs text-muted-foreground border-r border-border bg-muted/30">
                    {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                  </div>
                  <div className="flex-1 p-2 relative">
                    {hourAppointments.map((apt, idx) => (
                      <div
                        key={apt.id}
                        className="rounded-lg p-2 text-white text-xs mb-1"
                        style={{ 
                          backgroundColor: apt.staff_color || '#3B82F6',
                        }}
                      >
                        <p className="font-medium truncate">{apt.customer_name}</p>
                        <p className="opacity-80 truncate">{apt.service_name || 'Appointment'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

// New Appointment Form
function NewAppointmentForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    customer_id: '',
    staff_id: '',
    service_id: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
  });

  // Fetch data for dropdowns
  const { data: customersResponse } = useCustomers(undefined, 100, 0);
  const { data: staffResponse } = useStaff();
  const { data: servicesResponse } = useServices();
  
  const customers = customersResponse?.data || [];
  const staffList = staffResponse?.data || [];
  const services = servicesResponse?.data || [];

  const createAppointment = useCreateAppointment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_id || !formData.staff_id || !formData.date || !formData.time) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createAppointment.mutateAsync({
        customer_id: formData.customer_id,
        staff_id: formData.staff_id,
        service_id: formData.service_id || undefined,
        appointment_date: formData.date,
        appointment_time: formData.time,
        duration_minutes: 30,
        status: 'scheduled',
        created_via: 'dashboard',
      });
      toast.success('Appointment created');
      onSuccess();
    } catch (error) {
      toast.error('Failed to create appointment');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Customer *</label>
        <Select 
          value={formData.customer_id} 
          onValueChange={(v) => setFormData(prev => ({ ...prev, customer_id: v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select customer" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.first_name} {customer.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Staff Member *</label>
        <Select 
          value={formData.staff_id} 
          onValueChange={(v) => setFormData(prev => ({ ...prev, staff_id: v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select staff" />
          </SelectTrigger>
          <SelectContent>
            {staffList.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: staff.color_code }} />
                  {staff.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Service</label>
        <Select 
          value={formData.service_id} 
          onValueChange={(v) => setFormData(prev => ({ ...prev, service_id: v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select service (optional)" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name} ({service.duration_minutes} min)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Date *</label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Time *</label>
          <Select 
            value={formData.time} 
            onValueChange={(v) => setFormData(prev => ({ ...prev, time: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
                '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
                '15:00', '15:30', '16:00', '16:30', '17:00'].map((time) => (
                <SelectItem key={time} value={time}>
                  {parseInt(time) > 12 
                    ? `${parseInt(time) - 12}:${time.split(':')[1]} PM`
                    : parseInt(time) === 12 
                      ? `12:${time.split(':')[1]} PM`
                      : `${parseInt(time)}:${time.split(':')[1]} AM`
                  }
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" loading={createAppointment.isPending}>
          Create Appointment
        </Button>
      </div>
    </form>
  );
}
