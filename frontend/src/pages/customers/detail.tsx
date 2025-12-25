import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Phone, Mail, Calendar, Clock, Edit, 
  MoreHorizontal, MessageSquare, Star, Brain, Plus
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge, AppointmentStatusBadge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatPhone, formatTime } from '@/lib/utils/format';
import { useCustomer, useCustomerAppointments, useCustomerCalls } from '@/lib/api/hooks';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch customer data
  const { data: customer, isLoading: customerLoading } = useCustomer(id || '');
  
  // Fetch customer appointments
  const { data: appointments, isLoading: appointmentsLoading } = useCustomerAppointments(id || '');
  
  // Fetch customer call history
  const { data: calls, isLoading: callsLoading } = useCustomerCalls(id || '');

  if (customerLoading) {
    return (
      <PageContainer title="Loading...">
        <div className="space-y-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (!customer) {
    return (
      <PageContainer title="Customer Not Found">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Customer not found or you don't have access.</p>
          <Link to="/customers">
            <Button variant="outline" className="mt-4">
              Back to Customers
            </Button>
          </Link>
        </Card>
      </PageContainer>
    );
  }

  const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';

  return (
    <PageContainer
      title={customerName}
      breadcrumbs={[
        { label: 'Customers', href: '/customers' },
        { label: customerName },
      ]}
    >
      {/* Header Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <Avatar 
              name={customerName} 
              size="2xl" 
            />
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold font-display">
                    {customerName}
                  </h1>
                  <p className="text-muted-foreground">
                    Customer since {formatDate(customer.customer_since)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" leftIcon={<Edit className="h-4 w-4" />}>
                    Edit
                  </Button>
                  <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                    Book Appointment
                  </Button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{formatPhone(customer.phone)}</span>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.email}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-bold">{customer.total_appointments || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Visits</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">${customer.total_spent || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {customer.last_visit_date ? formatDate(customer.last_visit_date, 'MMM d') : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">Last Visit</p>
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
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="calls">Call History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date of Birth</span>
                  <span>{customer.date_of_birth ? formatDate(customer.date_of_birth) : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preferred Contact</span>
                  <Badge>{customer.preferred_contact_method || 'phone'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Language</span>
                  <span>{customer.language === 'en' ? 'English' : customer.language}</span>
                </div>
                {customer.accommodations && (
                  <div>
                    <span className="text-muted-foreground block mb-1">Accommodations</span>
                    <p className="text-sm">{customer.accommodations}</p>
                  </div>
                )}
                {customer.notes && (
                  <div>
                    <span className="text-muted-foreground block mb-1">Notes</span>
                    <p className="text-sm">{customer.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" leftIcon={<Phone className="h-4 w-4" />}>
                  Call Customer
                </Button>
                <Button variant="outline" className="w-full justify-start" leftIcon={<MessageSquare className="h-4 w-4" />}>
                  Send SMS
                </Button>
                <Button variant="outline" className="w-full justify-start" leftIcon={<Mail className="h-4 w-4" />}>
                  Send Email
                </Button>
                <Button variant="outline" className="w-full justify-start" leftIcon={<Calendar className="h-4 w-4" />}>
                  Book Appointment
                </Button>
              </CardContent>
            </Card>

            {/* Recent Appointments Preview */}
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Recent Appointments
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('appointments')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {appointmentsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : !appointments?.length ? (
                  <p className="text-muted-foreground text-center py-4">No appointments found</p>
                ) : (
                  <div className="space-y-3">
                    {appointments.slice(0, 3).map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="text-center min-w-[50px]">
                            <p className="text-lg font-bold">{formatDate(apt.appointment_date, 'd')}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(apt.appointment_date, 'MMM')}</p>
                          </div>
                          <div>
                            <p className="font-medium">{apt.service_name || 'Appointment'}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatTime(apt.appointment_time)} • {apt.staff_name}
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
          </div>
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Appointments</CardTitle>
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Book New
              </Button>
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
                  <p>No appointments found for this customer</p>
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
                          <p className="font-medium">{apt.service_name || 'Appointment'}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(apt.appointment_time)} • {apt.duration_minutes} min • {apt.staff_name}
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

        <TabsContent value="calls">
          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
            </CardHeader>
            <CardContent>
              {callsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !calls?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No call history found for this customer</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {calls.map((call) => (
                    <div key={call.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{formatDate(call.started_at, 'MMM d, yyyy h:mm a')}</p>
                          <p className="text-sm text-muted-foreground">
                            Duration: {call.call_duration ? `${Math.floor(call.call_duration / 60)}:${(call.call_duration % 60).toString().padStart(2, '0')}` : '0:00'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={call.outcome === 'appointment_booked' ? 'success' : 'default'}>
                        {call.outcome?.replace(/_/g, ' ') || 'Call'}
                      </Badge>
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
