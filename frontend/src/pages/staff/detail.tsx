import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Edit, Calendar, Mail, Phone, Clock, Plus, 
  Trash2, Link2, Check
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/form-elements';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Mock staff member data
const mockStaffMember = {
  id: '1',
  name: 'Dr. Sarah Wilson',
  title: 'Senior Dentist',
  email: 'sarah@clinic.com',
  phone: '+15550201',
  specialty: 'General Dentistry',
  bio: 'Dr. Sarah Wilson has over 15 years of experience in general dentistry. She specializes in preventive care and cosmetic procedures.',
  color_code: '#3B82F6',
  is_active: true,
  google_calendar_connected: true,
};

const mockAvailability = [
  { day: 'Monday', enabled: true, start: '09:00', end: '17:00', break_start: '12:00', break_end: '13:00' },
  { day: 'Tuesday', enabled: true, start: '09:00', end: '17:00', break_start: '12:00', break_end: '13:00' },
  { day: 'Wednesday', enabled: true, start: '09:00', end: '17:00', break_start: '12:00', break_end: '13:00' },
  { day: 'Thursday', enabled: true, start: '09:00', end: '17:00', break_start: '12:00', break_end: '13:00' },
  { day: 'Friday', enabled: true, start: '09:00', end: '15:00', break_start: '12:00', break_end: '13:00' },
  { day: 'Saturday', enabled: false, start: '09:00', end: '13:00', break_start: null, break_end: null },
  { day: 'Sunday', enabled: false, start: '09:00', end: '13:00', break_start: null, break_end: null },
];

const mockServices = [
  { id: '1', name: 'General Consultation', duration: 30, assigned: true },
  { id: '2', name: 'Teeth Cleaning', duration: 45, assigned: true },
  { id: '3', name: 'Filling', duration: 60, assigned: true },
  { id: '4', name: 'Root Canal', duration: 90, assigned: false },
  { id: '5', name: 'Teeth Whitening', duration: 60, assigned: true },
];

export default function StaffDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('schedule');
  
  const staff = mockStaffMember;

  return (
    <PageContainer
      title={staff.name}
      breadcrumbs={[
        { label: 'Staff', href: '/staff' },
        { label: staff.name },
      ]}
    >
      {/* Header Card */}
      <Card className="mb-6 overflow-hidden">
        <div className="h-2" style={{ backgroundColor: staff.color_code }} />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <Avatar 
              name={staff.name}
              color={staff.color_code}
              size="2xl"
              status={staff.is_active ? 'online' : 'offline'}
            />
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold font-display">{staff.name}</h1>
                  <p className="text-muted-foreground">{staff.title}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" leftIcon={<Edit className="h-4 w-4" />}>
                    Edit
                  </Button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{staff.email}</span>
                </div>
                {staff.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{staff.phone}</span>
                  </div>
                )}
              </div>

              <Badge variant="primary">{staff.specialty}</Badge>

              {staff.bio && (
                <p className="mt-4 text-sm text-muted-foreground">{staff.bio}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="calendar">Calendar Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockAvailability.map((day) => (
                  <div 
                    key={day.day}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border"
                  >
                    <Switch checked={day.enabled} />
                    <span className="w-24 font-medium">{day.day}</span>
                    
                    {day.enabled ? (
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          <Select defaultValue={day.start}>
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {['08:00', '09:00', '10:00', '11:00'].map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-muted-foreground">to</span>
                          <Select defaultValue={day.end}>
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {['15:00', '16:00', '17:00', '18:00', '19:00'].map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {day.break_start && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Break: {day.break_start} - {day.break_end}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not working</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <Button>Save Schedule</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Assigned Services</CardTitle>
              <p className="text-sm text-muted-foreground">
                {mockServices.filter(s => s.assigned).length} of {mockServices.length} services
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockServices.map((service) => (
                  <div 
                    key={service.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Switch checked={service.assigned} />
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">{service.duration} minutes</p>
                      </div>
                    </div>
                    {service.assigned && (
                      <Badge variant="success">
                        <Check className="h-3 w-3 mr-1" />
                        Assigned
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Google Calendar */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-white border border-border flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="h-8 w-8">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Google Calendar</p>
                      <p className="text-sm text-muted-foreground">
                        {staff.google_calendar_connected 
                          ? 'Connected • Syncing appointments' 
                          : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  {staff.google_calendar_connected ? (
                    <Button variant="outline" size="sm">
                      Disconnect
                    </Button>
                  ) : (
                    <Button size="sm" leftIcon={<Link2 className="h-4 w-4" />}>
                      Connect
                    </Button>
                  )}
                </div>

                {/* Sync Settings */}
                {staff.google_calendar_connected && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Sync Settings</h4>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Two-way sync</p>
                        <p className="text-sm text-muted-foreground">
                          Changes in Google Calendar will update here
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Block busy times</p>
                        <p className="text-sm text-muted-foreground">
                          Prevent bookings during Google Calendar events
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
