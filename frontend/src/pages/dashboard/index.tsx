import { motion } from 'framer-motion';
import {
  Phone,
  Calendar,
  Clock,
  TrendingUp,
  ArrowRight,
  PhoneIncoming,
  PhoneOutgoing,
  Zap,
  CheckCircle,
  DollarSign,
  Users,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDashboardStats,
  useRecentCalls,
  useTodayAppointments,
  useCallAnalytics,
  useBusinessId,
} from '@/lib/api/hooks';
import { cn } from '@/lib/utils';

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

// Metric Card Component
function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  variant = 'default',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}) {
  const variants = {
    default: 'bg-card',
    primary: 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20',
    success: 'bg-gradient-to-br from-success-500/10 to-success-500/5 border-success-500/20',
    warning: 'bg-gradient-to-br from-warning-500/10 to-warning-500/5 border-warning-500/20',
  };

  const iconVariants = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/20 text-primary',
    success: 'bg-success-500/20 text-success-600 dark:text-success-400',
    warning: 'bg-warning-500/20 text-warning-600 dark:text-warning-400',
  };

  return (
    <Card className={cn('relative overflow-hidden', variants[variant])}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
            {trend !== undefined && (
              <div className="flex items-center gap-1.5">
                {trend >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-success-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-error-500" />
                )}
                <span
                  className={cn(
                    'text-sm font-medium',
                    trend >= 0 ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'
                  )}
                >
                  {trend >= 0 ? '+' : ''}{trend}%
                </span>
                {trendLabel && (
                  <span className="text-sm text-muted-foreground">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className={cn('p-3 rounded-xl', iconVariants[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// AI Status Banner Component
function AIStatusBanner({ isActive, callsToday }: { isActive: boolean; callsToday: number }) {
  return (
    <Card className={cn(
      'relative overflow-hidden border-2',
      isActive
        ? 'bg-gradient-to-r from-success-500/10 via-success-500/5 to-transparent border-success-500/30'
        : 'bg-gradient-to-r from-warning-500/10 via-warning-500/5 to-transparent border-warning-500/30'
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              'relative p-4 rounded-2xl',
              isActive ? 'bg-success-500/20' : 'bg-warning-500/20'
            )}>
              <Zap className={cn(
                'h-8 w-8',
                isActive ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'
              )} />
              {isActive && (
                <span className="absolute top-2 right-2 h-3 w-3 bg-success-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold">
                  {isActive ? 'AI Assistant Active' : 'AI Assistant Inactive'}
                </h3>
                <Badge variant={isActive ? 'success' : 'warning'}>
                  {isActive ? 'Online' : 'Offline'}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {isActive
                  ? 'Your AI is ready and handling calls automatically'
                  : 'Your AI assistant is currently not active'}
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold">{callsToday}</p>
              <p className="text-sm text-muted-foreground">Calls Today</p>
            </div>
            <Button asChild>
              <Link to="/ai-config">
                Configure AI
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Format duration
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
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

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

  // Calculate estimated time saved (assuming 5 min per call handled by AI)
  const timeSavedMinutes = (stats?.calls_today ?? 0) * 5;
  const timeSavedHours = Math.floor(timeSavedMinutes / 60);
  const timeSavedDisplay = timeSavedHours > 0
    ? `${timeSavedHours}h ${timeSavedMinutes % 60}m`
    : `${timeSavedMinutes}m`;

  // Estimate cost savings (assuming $25/hour for receptionist)
  const costSavings = Math.round((timeSavedMinutes / 60) * 25);

  return (
    <PageContainer
      title="Dashboard"
      description="Overview of your AI automation performance"
    >
      {/* AI Status Banner */}
      <AIStatusBanner isActive={true} callsToday={stats?.calls_today ?? 0} />

      {/* Key Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
        {statsLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </Card>
            ))}
          </>
        ) : (
          <>
            <MetricCard
              title="Calls Handled"
              value={stats?.calls_today ?? 0}
              trend={stats?.calls_change ?? 0}
              trendLabel="vs yesterday"
              icon={Phone}
              variant="primary"
            />
            <MetricCard
              title="Appointments Booked"
              value={stats?.appointments_today ?? 0}
              subtitle={`${stats?.appointments_completed ?? 0} completed`}
              icon={Calendar}
              variant="success"
            />
            <MetricCard
              title="Time Saved"
              value={timeSavedDisplay}
              subtitle="by AI automation"
              icon={Clock}
              variant="warning"
            />
            <MetricCard
              title="Est. Savings"
              value={`$${costSavings}`}
              subtitle="today's value"
              icon={DollarSign}
            />
          </>
        )}
      </div>

      {/* Charts and Activity Section */}
      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        {/* Activity Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Activity Overview</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Last 7 days</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/calls">
                View Details
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {analyticsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-full w-full rounded-lg" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics || emptyAnalytics}>
                    <defs>
                      <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
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
                    <Area
                      type="monotone"
                      dataKey="calls"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fill="url(#colorCalls)"
                      name="Calls"
                    />
                    <Area
                      type="monotone"
                      dataKey="appointments"
                      stroke="#22C55E"
                      strokeWidth={2}
                      fill="url(#colorAppointments)"
                      name="Appointments"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Calls */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Recent Calls</CardTitle>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {callsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !recentCalls?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No recent calls</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCalls.map((call, index) => (
                  <motion.div
                    key={call.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={cn(
                        'p-2.5 rounded-lg',
                        call.call_direction === 'inbound'
                          ? 'bg-success-500/10'
                          : 'bg-primary/10'
                      )}
                    >
                      {call.call_direction === 'inbound' ? (
                        <PhoneIncoming className="h-4 w-4 text-success-600 dark:text-success-400" />
                      ) : (
                        <PhoneOutgoing className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {call.customer_name || call.caller_phone}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(call.call_duration)} • {getRelativeTime(call.started_at)}
                      </p>
                    </div>
                    {call.outcome === 'appointment_booked' && (
                      <CheckCircle className="h-4 w-4 text-success-500 shrink-0" />
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Today's Schedule</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {todayAppointments?.length || 0} appointments scheduled
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/appointments">
              View Calendar
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {appointmentsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : !todayAppointments?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No appointments scheduled for today</p>
              <p className="text-sm mt-1">Your AI will book appointments as calls come in</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {todayAppointments.slice(0, 6).map((apt, index) => (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'p-4 rounded-lg border transition-colors hover:border-primary/50',
                    apt.status === 'completed'
                      ? 'bg-success-500/5 border-success-500/20'
                      : apt.status === 'cancelled'
                      ? 'bg-muted/50 border-border'
                      : 'bg-card border-border'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-lg font-semibold">
                      {apt.appointment_time?.slice(0, 5)}
                    </span>
                    <Badge
                      variant={
                        apt.status === 'completed'
                          ? 'success'
                          : apt.status === 'confirmed'
                          ? 'primary'
                          : apt.status === 'cancelled'
                          ? 'secondary'
                          : 'default'
                      }
                      size="sm"
                    >
                      {apt.status}
                    </Badge>
                  </div>
                  <p className="font-medium truncate">{apt.customer_name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {apt.service_name || 'Appointment'}
                  </p>
                  {apt.staff_name && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {apt.staff_name}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
