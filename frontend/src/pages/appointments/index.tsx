import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, Filter,
  LayoutGrid, List, Clock, User
} from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, AppointmentStatusBadge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import { formatTime, formatDate } from '@/lib/utils/format';

// Mock data
const mockAppointments = [
  {
    id: '1',
    customer_name: 'John Smith',
    customer_phone: '+1 555-0123',
    staff_name: 'Dr. Sarah Wilson',
    staff_color: '#3B82F6',
    service_name: 'General Consultation',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '09:00',
    duration_minutes: 30,
    status: 'confirmed',
  },
  {
    id: '2',
    customer_name: 'Emily Johnson',
    customer_phone: '+1 555-0124',
    staff_name: 'Dr. Michael Brown',
    staff_color: '#8B5CF6',
    service_name: 'Follow-up',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '10:30',
    duration_minutes: 45,
    status: 'scheduled',
  },
  {
    id: '3',
    customer_name: 'Robert Davis',
    customer_phone: '+1 555-0125',
    staff_name: 'Dr. Sarah Wilson',
    staff_color: '#3B82F6',
    service_name: 'Dental Cleaning',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '14:00',
    duration_minutes: 60,
    status: 'completed',
  },
];

const mockStaff = [
  { id: '1', name: 'Dr. Sarah Wilson', color: '#3B82F6' },
  { id: '2', name: 'Dr. Michael Brown', color: '#8B5CF6' },
  { id: '3', name: 'Dr. Emma Lee', color: '#06B6D4' },
];

export default function AppointmentsPage() {
  const { calendarView, setCalendarView, calendarDate, setCalendarDate } = useUIStore();
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [isLoading] = useState(false);

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

  const filteredAppointments = selectedStaff === 'all' 
    ? mockAppointments 
    : mockAppointments.filter(apt => apt.staff_name === mockStaff.find(s => s.id === selectedStaff)?.name);

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
              {mockStaff.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: staff.color }} />
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
        <AgendaView appointments={filteredAppointments} loading={isLoading} />
      ) : (
        <CalendarGrid 
          view={calendarView} 
          date={calendarDate}
          appointments={filteredAppointments}
          loading={isLoading}
        />
      )}

      {/* New Appointment Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
          </DialogHeader>
          <NewAppointmentForm onSuccess={() => setShowNewModal(false)} />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// Agenda View Component
function AgendaView({ appointments, loading }: { appointments: typeof mockAppointments; loading: boolean }) {
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

  return (
    <div className="space-y-3">
      {appointments.map((apt, i) => (
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
                style={{ backgroundColor: apt.staff_color }}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold truncate">{apt.customer_name}</h4>
                  <AppointmentStatusBadge status={apt.status} />
                </div>
                <p className="text-sm text-muted-foreground">{apt.service_name}</p>
                <p className="text-sm text-muted-foreground">with {apt.staff_name}</p>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm font-medium">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {formatTime(apt.appointment_time)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {apt.duration_minutes} min
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// Calendar Grid Component (simplified)
function CalendarGrid({ 
  view, 
  date, 
  appointments,
  loading 
}: { 
  view: string; 
  date: Date;
  appointments: typeof mockAppointments;
  loading: boolean;
}) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

  if (loading) {
    return <Skeleton className="h-[600px] rounded-xl" />;
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Time slots */}
          <div className="divide-y divide-border">
            {hours.map((hour) => (
              <div key={hour} className="flex min-h-[80px]">
                <div className="w-20 p-2 text-xs text-muted-foreground border-r border-border bg-muted/30">
                  {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                </div>
                <div className="flex-1 p-2 relative">
                  {appointments
                    .filter(apt => {
                      const aptHour = parseInt(apt.appointment_time.split(':')[0]);
                      return aptHour === hour;
                    })
                    .map((apt) => (
                      <div
                        key={apt.id}
                        className="absolute inset-x-2 rounded-lg p-2 text-white text-xs"
                        style={{ 
                          backgroundColor: apt.staff_color,
                          top: '4px',
                        }}
                      >
                        <p className="font-medium truncate">{apt.customer_name}</p>
                        <p className="opacity-80 truncate">{apt.service_name}</p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// New Appointment Form (simplified)
function NewAppointmentForm({ onSuccess }: { onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Customer</label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">John Smith</SelectItem>
            <SelectItem value="2">Emily Johnson</SelectItem>
            <SelectItem value="3">Robert Davis</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Staff Member</label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select staff" />
          </SelectTrigger>
          <SelectContent>
            {mockStaff.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: staff.color }} />
                  {staff.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Date</label>
          <input
            type="date"
            className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
            defaultValue={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Time</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="09:00">9:00 AM</SelectItem>
              <SelectItem value="10:00">10:00 AM</SelectItem>
              <SelectItem value="11:00">11:00 AM</SelectItem>
              <SelectItem value="14:00">2:00 PM</SelectItem>
              <SelectItem value="15:00">3:00 PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          Create Appointment
        </Button>
      </div>
    </form>
  );
}
