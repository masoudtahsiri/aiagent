import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Mail, Phone, Calendar, Clock, Edit,
  Check, X, Briefcase, User, Plus
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge, AppointmentStatusBadge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatTime } from '@/lib/utils/format';
import { useStaffMember, useStaffAppointments, useServices } from '@/lib/api/hooks';

export default function StaffDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch staff data
  const { data: staffMember, isLoading: staffLoading } = useStaffMember(id || '');
  
  // Fetch staff appointments
  const { data: appointments, isLoading: appointmentsLoading } = useStaffAppointments(id || '');
  
  // Fetch services to show which ones are assigned
  const { data: servicesData, isLoading: servicesLoading } = useServices();
  const services = servicesData?.data || [];

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
              Back to Staff
            </Button>
          </Link>
        </Card>
      </PageContainer>
    );
  }

  const staffName = staffMember.name || 'Unknown';
  const assignedServices = services.filter(s => 
    staffMember.service_ids?.includes(s.id)
  );

  // Parse availability from JSON if available
  const availability = staffMember.availability 
    ? (typeof staffMember.availability === 'string' 
        ? JSON.parse(staffMember.availability) 
        : staffMember.availability)
    : null;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <Avatar 
              name={staffName}
              src={staffMember.avatar_url}
              size="2xl" 
            />
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold font-display flex items-center gap-2">
                    {staffName}
                    {staffMember.is_active && (
                      <Badge variant="success">Active</Badge>
                    )}
                  </h1>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {staffMember.role || staffMember.title || 'Staff'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" leftIcon={<Edit className="h-4 w-4" />}>
                    Edit
                  </Button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 mb-4">
                {staffMember.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{staffMember.phone}</span>
                  </div>
                )}
                {staffMember.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{staffMember.email}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-bold">{appointments?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Appointments</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{assignedServices.length}</p>
                  <p className="text-sm text-muted-foreground">Services</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Services Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Assigned Services
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
                  <p className="text-muted-foreground text-center py-4">
                    No services assigned
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assignedServices.map((service) => (
                      <div 
                        key={service.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {service.duration_minutes} min • ${service.price}
                          </p>
                        </div>
                        <Badge>{service.category}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Today's Schedule Preview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
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
                        <p className="text-muted-foreground text-center py-4">
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
                            <div>
                              <p className="font-medium">{apt.customer_name || 'Customer'}</p>
                              <p className="text-sm text-muted-foreground">
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

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Weekly Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availability ? (
                <div className="space-y-3">
                  {dayNames.map((day, idx) => {
                    const dayKey = day.toLowerCase();
                    const daySchedule = availability[dayKey];
                    const isWorking = daySchedule && !daySchedule.closed;
                    
                    return (
                      <div 
                        key={day}
                        className="flex items-center justify-between p-3 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            isWorking ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                          }`}>
                            {isWorking ? (
                              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <span className="font-medium">{day}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {isWorking 
                            ? `${daySchedule.start} - ${daySchedule.end}`
                            : 'Off'
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No availability schedule set
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>All Appointments</CardTitle>
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
                  <p>No appointments found for this staff member</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{formatDate(apt.appointment_date, 'd')}</p>
                          <p className="text-sm text-muted-foreground">{formatDate(apt.appointment_date, 'MMM')}</p>
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
    </PageContainer>
  );
}
