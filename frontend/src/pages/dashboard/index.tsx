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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTime, formatRelativeTime } from '@/lib/utils/format';
import { 
  useDashboardStats, 
  useRecentCalls, 
  useTodayAppointments, 
  useCallAnalytics,
  useBusinessId
} from '@/lib/api/hooks';
import { get } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';

// Fallback data for empty states
const emptyAnalytics = [
  { date: 'Mon', calls: 0, appointments: 0 },
  { date: 'Tue', calls: 0, appointments: 0 },
  { date: 'Wed', calls: 0, appointments: 0 },
  { date: 'Thu', calls: 0, appointments: 0 },
  { date: 'Fri', calls: 0, appointments: 0 },
  { date: 'Sat', calls: 0, appointments: 0 },
  { date: 'Sun', calls: 0, appointments: 0 },
];

// Loading skeleton for stats
function StatsLoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const businessId = useBusinessId();
  
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  
  // Fetch call analytics for the chart
  const { data: analytics, isLoading: analyticsLoading } = useCallAnalytics(7);
  
  // Fetch today's appointments
  const { data: todayAppointments, isLoading: appointmentsLoading } = useTodayAppointments();
  
  // Fetch recent calls
  const { data: recentCalls, isLoading: callsLoading } = useRecentCalls(5);
  
  // Fetch call outcomes for pie chart
  const { data: callOutcomes } = useQuery({
    queryKey: ['call-outcomes', businessId],
    queryFn: () => get<Array<{ name: string; value: number; color: string }>>(
      `/api/dashboard/call-outcomes/${businessId}?days=30`
    ),
    enabled: !!businessId,
    staleTime: 1000 * 60 * 5,
  });
  
  // Format call duration for display
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Format relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <PageContainer
      title="Dashboard"
      description="Welcome back! Here's what's happening today."
    >
      {/* Stats Grid */}
      {statsLoading ? (
        <StatsLoadingSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Calls Today"
            value={stats?.calls_today ?? 0}
            change={stats?.calls_change ?? 0}
            changeLabel="vs yesterday"
            icon={<Phone className="h-5 w-5" />}
            iconColor="bg-primary/10 text-primary"
          />
          <StatsCard
            title="Appointments"
            value={`${stats?.appointments_completed ?? 0}/${stats?.appointments_today ?? 0}`}
            icon={<Calendar className="h-5 w-5" />}
            iconColor="bg-secondary/10 text-secondary"
          />
          <StatsCard
            title="Total Customers"
            value={stats?.total_customers ?? 0}
            change={stats?.customers_this_month ?? 0}
            changeLabel="this month"
            icon={<Users className="h-5 w-5" />}
            iconColor="bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
          />
          <StatsCard
            title="Avg. Rating"
            value={stats?.average_rating?.toFixed(1) ?? '0.0'}
            icon={<Star className="h-5 w-5" />}
            iconColor="bg-warning-100 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400"
          />
        </div>
      )}

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
                {analyticsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics || emptyAnalytics}>
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
                )}
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
              {appointmentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-3">
                      <Skeleton className="h-10 w-16" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : !todayAppointments?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No appointments scheduled for today</p>
                </div>
              ) : (
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
                        <p className="text-sm font-semibold">{apt.appointment_time?.slice(0, 5)}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{apt.customer_name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {apt.service_name || 'Appointment'} • {apt.staff_name}
                        </p>
                      </div>
                      <Badge
                        variant={
                          apt.status === 'completed' ? 'success' :
                          apt.status === 'confirmed' ? 'primary' : 'default'
                        }
                      >
                        {apt.status === 'completed' ? 'Done' :
                         apt.status === 'confirmed' ? 'Confirmed' : 
                         apt.status === 'cancelled' ? 'Cancelled' : 'Scheduled'}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* AI Status */}
          <AIStatusWidget
            status="active"
            callsToday={stats?.calls_today ?? 0}
            aiName="Sarah"
          />

          {/* Recent Calls */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Calls</CardTitle>
            </CardHeader>
            <CardContent>
              {callsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <div className="text-right space-y-2">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !recentCalls?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No recent calls</p>
                </div>
              ) : (
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
                        call.call_direction === 'inbound' 
                          ? 'bg-success-100 dark:bg-success-500/20' 
                          : 'bg-primary/10'
                      }`}>
                        {call.call_direction === 'inbound' 
                          ? <PhoneIncoming className="h-4 w-4 text-success-600 dark:text-success-400" />
                          : <PhoneOutgoing className="h-4 w-4 text-primary" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {call.customer_name || call.caller_phone}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {call.outcome?.replace(/_/g, ' ') || 'Call'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatDuration(call.call_duration)}</p>
                        <p className="text-xs text-muted-foreground">
                          {getRelativeTime(call.started_at)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call Outcomes Donut */}
          <Card>
            <CardHeader>
              <CardTitle>Call Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              {!callOutcomes?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No call data yet</p>
                </div>
              ) : (
                <>
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
                    {callOutcomes.slice(0, 4).map((outcome) => (
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
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
