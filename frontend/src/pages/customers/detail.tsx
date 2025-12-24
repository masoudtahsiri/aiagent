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

// Mock customer data
const mockCustomer = {
  id: '1',
  first_name: 'John',
  last_name: 'Smith',
  phone: '+15550123',
  email: 'john.smith@email.com',
  date_of_birth: '1985-06-15',
  preferred_contact_method: 'phone',
  language: 'en',
  accommodations: 'Prefers afternoon appointments',
  notes: 'VIP customer, always punctual',
  total_appointments: 12,
  total_spent: 2450,
  last_visit_date: '2024-12-20',
  customer_since: '2024-01-15',
};

const mockAppointments = [
  {
    id: '1',
    appointment_date: '2024-12-20',
    appointment_time: '14:00',
    service_name: 'General Consultation',
    staff_name: 'Dr. Sarah Wilson',
    status: 'completed',
    duration_minutes: 30,
  },
  {
    id: '2',
    appointment_date: '2024-12-28',
    appointment_time: '10:00',
    service_name: 'Follow-up',
    staff_name: 'Dr. Sarah Wilson',
    status: 'scheduled',
    duration_minutes: 30,
  },
];

const mockCallHistory = [
  {
    id: '1',
    started_at: '2024-12-19T10:30:00',
    call_duration: 245,
    outcome: 'appointment_booked',
  },
  {
    id: '2',
    started_at: '2024-12-15T14:15:00',
    call_duration: 180,
    outcome: 'question_answered',
  },
];

const mockMemories = [
  {
    id: '1',
    memory_type: 'preference',
    content: 'Prefers afternoon appointments after 2 PM',
    created_at: '2024-12-19',
  },
  {
    id: '2',
    memory_type: 'fact',
    content: 'Has a dog named Max',
    created_at: '2024-12-15',
  },
  {
    id: '3',
    memory_type: 'preference',
    content: 'Likes to receive appointment reminders via SMS',
    created_at: '2024-12-10',
  },
];

export default function CustomerDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading] = useState(false);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  const customer = mockCustomer;

  return (
    <PageContainer
      breadcrumbs={[
        { label: 'Customers', href: '/customers' },
        { label: `${customer.first_name} ${customer.last_name}` },
      ]}
    >
      {/* Header Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <Avatar 
              name={`${customer.first_name} ${customer.last_name}`} 
              size="2xl" 
            />
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold font-display">
                    {customer.first_name} {customer.last_name}
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
                  <p className="text-2xl font-bold">{customer.total_appointments}</p>
                  <p className="text-sm text-muted-foreground">Total Visits</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">${customer.total_spent}</p>
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
          <TabsTrigger value="memory">AI Memory</TabsTrigger>
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
                  <Badge>{customer.preferred_contact_method}</Badge>
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

            {/* AI Memory Preview */}
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-secondary" />
                  AI Memory
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('memory')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockMemories.slice(0, 3).map((memory) => (
                    <div key={memory.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Badge variant={memory.memory_type === 'preference' ? 'primary' : 'default'} size="sm">
                        {memory.memory_type}
                      </Badge>
                      <p className="text-sm flex-1">{memory.content}</p>
                    </div>
                  ))}
                </div>
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
              <div className="space-y-4">
                {mockAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{formatDate(apt.appointment_date, 'd')}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(apt.appointment_date, 'MMM')}</p>
                      </div>
                      <div>
                        <p className="font-medium">{apt.service_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(apt.appointment_time)} • {apt.duration_minutes} min • {apt.staff_name}
                        </p>
                      </div>
                    </div>
                    <AppointmentStatusBadge status={apt.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls">
          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockCallHistory.map((call) => (
                  <div key={call.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{formatDate(call.started_at, 'MMM d, yyyy h:mm a')}</p>
                        <p className="text-sm text-muted-foreground">
                          Duration: {Math.floor(call.call_duration / 60)}:{(call.call_duration % 60).toString().padStart(2, '0')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="success">{call.outcome.replace('_', ' ')}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memory">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-secondary" />
                AI Memory
              </CardTitle>
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Add Memory
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                These are facts and preferences the AI has learned about this customer from conversations.
              </p>
              <div className="space-y-3">
                {mockMemories.map((memory) => (
                  <motion.div
                    key={memory.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 p-4 rounded-lg border border-border"
                  >
                    <Badge variant={memory.memory_type === 'preference' ? 'primary' : 'default'}>
                      {memory.memory_type}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm">{memory.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Added {formatDate(memory.created_at)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
