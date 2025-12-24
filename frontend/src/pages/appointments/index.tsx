import { useState, useMemo } from 'react';
import { Plus, Calendar, List, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { PageContainer } from '@/components/layout';
import { Button, Card, Modal, Input, Select, Textarea, Badge, Skeleton, EmptyState } from '@/components/ui';
import { useAppointments, useCustomers, useStaff, useServices, useCreateAppointment, useCancelAppointment, useCurrentBusiness, useStaffSlots } from '@/lib/api';
import type { AppointmentWithDetails, AppointmentStatus } from '@/types';

const statusColors: Record<AppointmentStatus, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  scheduled: 'primary',
  confirmed: 'success',
  completed: 'default',
  cancelled: 'danger',
  no_show: 'warning',
};

export default function AppointmentsPage() {
  const { data: business } = useCurrentBusiness();
  const businessId = business?.id || '';
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: appointmentsResponse, isLoading } = useAppointments(businessId);
  const { data: customersResponse } = useCustomers(businessId);
  const { data: staffList } = useStaff(businessId);
  const { data: servicesList } = useServices(businessId);
  
  const appointments = appointmentsResponse?.data || [];
  const customers = customersResponse?.data || [];
  
  const createAppointment = useCreateAppointment();
  const cancelAppointment = useCancelAppointment();

  const [formData, setFormData] = useState({
    customer_id: '',
    staff_id: '',
    service_id: '',
    slot_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  // Get slots for selected staff and date
  const { data: slots } = useStaffSlots(formData.staff_id, formData.date);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const appointmentsByDay = useMemo(() => {
    const byDay: Record<string, AppointmentWithDetails[]> = {};
    appointments.forEach((apt) => {
      const dateKey = apt.appointment_date;
      if (!byDay[dateKey]) byDay[dateKey] = [];
      byDay[dateKey].push(apt);
    });
    return byDay;
  }, [appointments]);

  const handleOpenCreate = () => {
    setFormData({
      customer_id: '',
      staff_id: '',
      service_id: '',
      slot_id: '',
      date: format(selectedDate, 'yyyy-MM-dd'),
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createAppointment.mutateAsync({
      business_id: businessId,
      customer_id: formData.customer_id,
      staff_id: formData.staff_id,
      slot_id: formData.slot_id,
      service_id: formData.service_id || undefined,
      notes: formData.notes || undefined,
    });
    
    setIsModalOpen(false);
  };

  const handleCancel = async (appointmentId: string) => {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      await cancelAppointment.mutateAsync(appointmentId);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedDate(addDays(selectedDate, direction === 'next' ? 7 : -7));
  };

  if (isLoading) {
    return (
      <PageContainer title="Appointments" description="Manage your appointments">
        <Card>
          <Card.Body>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" className="h-20 w-full" />
              ))}
            </div>
          </Card.Body>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Appointments"
      description="Manage your appointments"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'calendar' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              <Calendar className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      }
    >
      {viewMode === 'list' ? (
        appointments.length === 0 ? (
          <EmptyState
            title="No appointments"
            description="Schedule your first appointment to get started."
            action={
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
              </Button>
            }
          />
        ) : (
          <Card>
            <div className="divide-y">
              {appointments.map((apt) => (
                <div key={apt.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-1 h-12 rounded-full"
                      style={{ backgroundColor: apt.staff_color }}
                    />
                    <div>
                      <div className="font-medium">{apt.customer_name}</div>
                      <div className="text-sm text-gray-500">
                        {format(parseISO(apt.appointment_date), 'MMM d')} at {apt.appointment_time}
                        {apt.service_name && ` • ${apt.service_name}`}
                      </div>
                      <div className="text-sm text-gray-500">
                        with {apt.staff_name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusColors[apt.status]}>
                      {apt.status.replace('_', ' ')}
                    </Badge>
                    {apt.status === 'scheduled' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(apt.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )
      ) : (
        <Card>
          <Card.Body>
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h3 className="font-medium">
                {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => navigateWeek('next')}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayAppointments = appointmentsByDay[dateKey] || [];
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={dateKey}
                    className={`min-h-[120px] p-2 rounded-lg border ${
                      isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>
                      <div>{format(day, 'EEE')}</div>
                      <div className="text-lg">{format(day, 'd')}</div>
                    </div>
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map((apt) => (
                        <div
                          key={apt.id}
                          className="text-xs p-1 rounded truncate"
                          style={{ backgroundColor: apt.staff_color + '20', borderLeft: `3px solid ${apt.staff_color}` }}
                        >
                          {apt.appointment_time} {apt.customer_name}
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Appointment"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Customer"
            value={formData.customer_id}
            onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
            required
          >
            <option value="">Select customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name} ({c.phone})
              </option>
            ))}
          </Select>

          <Select
            label="Staff Member"
            value={formData.staff_id}
            onChange={(e) => setFormData({ ...formData, staff_id: e.target.value, slot_id: '' })}
            required
          >
            <option value="">Select staff...</option>
            {staffList?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>

          <Select
            label="Service"
            value={formData.service_id}
            onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
          >
            <option value="">Select service (optional)...</option>
            {servicesList?.map((s) => (
              <option key={s.id} value={s.id}>{s.name} - ${s.price}</option>
            ))}
          </Select>

          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value, slot_id: '' })}
            required
          />

          <Select
            label="Time Slot"
            value={formData.slot_id}
            onChange={(e) => setFormData({ ...formData, slot_id: e.target.value })}
            required
            disabled={!formData.staff_id || !formData.date}
          >
            <option value="">Select time...</option>
            {slots?.filter(s => !s.is_booked).map((slot) => (
              <option key={slot.id} value={slot.id}>{slot.time}</option>
            ))}
          </Select>

          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createAppointment.isPending}>
              Create Appointment
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
