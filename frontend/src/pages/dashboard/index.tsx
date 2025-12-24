import { motion } from 'framer-motion';
import { 
  Phone, Calendar, Users, Star, TrendingUp, Clock,
  ArrowRight, PhoneIncoming, PhoneOutgoing
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { PageContainer } from '@/components/layout/page-container';
import { StatsCard } from '@/components/cards/stats-card';
import { AIStatusWidget } from '@/components/ai/ai-status-widget';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatTime, formatRelativeTime } from '@/lib/utils/format';

// Mock data
const stats = {
  callsToday: 24,
  callsChange: 12,
  appointmentsToday: 8,
  appointmentsCompleted: 5,
  totalCustomers: 342,
  customersChange: 8,
  avgRating: 4.8,
  ratingsCount: 156,
};

const callAnalytics = [
  { date: 'Mon', calls: 18, appointments: 6 },
  { date: 'Tue', calls: 24, appointments: 8 },
  { date: 'Wed', calls: 21, appointments: 7 },
  { date: 'Thu', calls: 28, appointments: 10 },
  { date: 'Fri', calls: 32, appointments: 12 },
  { date: 'Sat', calls: 15, appointments: 5 },
  { date: 'Sun', calls: 8, appointments: 2 },
];

const todayAppointments = [
  { id: '1', time: '09:00', customer: 'John Smith', service: 'Consultation', staff: 'Dr. Sarah', status: 'completed' },
  { id: '2', time: '10:30', customer: 'Emily Davis', service: 'Follow-up', staff: 'Dr. Mike', status: 'completed' },
  { id: '3', time: '11:00', customer: 'Michael Brown', service: 'New Patient', staff: 'Dr. Sarah', status: 'in_progress' },
  { id: '4', time: '14:00', customer: 'Lisa Wilson', service: 'Checkup', staff: 'Dr. Mike', status: 'scheduled' },
  { id: '5', time: '15:30', customer: 'David Lee', service: 'Consultation', staff: 'Dr. Sarah', status: 'scheduled' },
];

const recentCalls = [
  { id: '1', phone: '+1 555-0123', direction: 'inbound', duration: '3:45', outcome: 'Appointment booked', time: '10 mins ago' },
  { id: '2', phone: '+1 555-0456', direction: 'inbound', duration: '2:12', outcome: 'Question answered', time: '25 mins ago' },
  { id: '3', phone: '+1 555-0789', direction: 'outbound', duration: '1:58', outcome: 'Reminder sent', time: '1 hour ago' },
  { id: '4', phone: '+1 555-0321', direction: 'inbound', duration: '4:22', outcome: 'Rescheduled', time: '2 hours ago' },
];

const callOutcomes = [
  { name: 'Appointment Booked', value: 45, color: '#22C55E' },
  { name: 'Question Answered', value: 30, color: '#3B82F6' },
  { name: 'Rescheduled', value: 15, color: '#F59E0B' },
  { name: 'Voicemail', value: 10, color: '#64748B' },
];

export default function DashboardPage() {
  return (
    <PageContainer
      title="Dashboard"
      description="Welcome back! Here's what's happening today."
    >
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Calls Today"
          value={stats.callsToday}
          change={stats.callsChange}
          changeLabel="vs yesterday"
          icon={<Phone className="h-5 w-5" />}
          iconColor="bg-primary/10 text-primary"
        />
        <StatsCard
          title="Appointments"
          value={`${stats.appointmentsCompleted}/${stats.appointmentsToday}`}
          icon={<Calendar className="h-5 w-5" />}
          iconColor="bg-secondary/10 text-secondary"
        />
        <StatsCard
          title="Total Customers"
          value={stats.totalCustomers}
          change={stats.customersChange}
          changeLabel="this month"
          icon={<Users className="h-5 w-5" />}
          iconColor="bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
        />
        <StatsCard
          title="Avg. Rating"
          value={stats.avgRating}
          icon={<Star className="h-5 w-5" />}
          iconColor="bg-warning-100 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Call Analytics Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Call Analytics</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/calls">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={callAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      className="text-xs fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="calls" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', strokeWidth: 0 }}
                      name="Calls"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="appointments" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      dot={{ fill: '#8B5CF6', strokeWidth: 0 }}
                      name="Appointments"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Today's Schedule */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Today's Schedule</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/appointments">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayAppointments.map((apt, index) => (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="text-center min-w-[60px]">
                      <p className="text-sm font-semibold">{apt.time}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{apt.customer}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {apt.service} • {apt.staff}
                      </p>
                    </div>
                    <Badge
                      variant={
                        apt.status === 'completed' ? 'success' :
                        apt.status === 'in_progress' ? 'primary' : 'default'
                      }
                      dot
                    >
                      {apt.status === 'completed' ? 'Done' :
                       apt.status === 'in_progress' ? 'In Progress' : 'Scheduled'}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* AI Status */}
          <AIStatusWidget
            status="active"
            callsToday={stats.callsToday}
            aiName="Sarah"
          />

          {/* Recent Calls */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentCalls.map((call, index) => (
                  <motion.div
                    key={call.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${
                      call.direction === 'inbound' 
                        ? 'bg-success-100 dark:bg-success-500/20' 
                        : 'bg-primary/10'
                    }`}>
                      {call.direction === 'inbound' 
                        ? <PhoneIncoming className="h-4 w-4 text-success-600 dark:text-success-400" />
                        : <PhoneOutgoing className="h-4 w-4 text-primary" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{call.phone}</p>
                      <p className="text-xs text-muted-foreground truncate">{call.outcome}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{call.duration}</p>
                      <p className="text-xs text-muted-foreground">{call.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Call Outcomes Donut */}
          <Card>
            <CardHeader>
              <CardTitle>Call Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={callOutcomes}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {callOutcomes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {callOutcomes.map((outcome) => (
                  <div key={outcome.name} className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: outcome.color }}
                    />
                    <span className="text-xs text-muted-foreground truncate">
                      {outcome.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
