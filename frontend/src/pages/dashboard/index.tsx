import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Zap,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  PhoneIncoming,
  PhoneOutgoing,
  User,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import {
  useDashboardStats,
  useRecentCalls,
  useTodayAppointments,
  useStaff,
  useAIRoles,
  useFAQs,
} from '@/lib/api/hooks';
import { cn } from '@/lib/utils';

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

// Format duration
const formatDuration = (seconds: number | null) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function OverviewPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentCalls, isLoading: callsLoading } = useRecentCalls(8);
  const { data: todayAppointments } = useTodayAppointments();
  const { data: staff } = useStaff();
  const { data: aiRoles } = useAIRoles();
  const { data: faqs } = useFAQs();

  // Generate alerts based on actual data
  const alerts: Array<{ type: 'warning' | 'info'; message: string; action?: { label: string; href: string } }> = [];

  // Check for staff without calendar connection (we'll assume none have it for now since we need to check)
  const staffList = staff?.data || [];
  if (staffList.length > 0) {
    // This would need calendar connection data - placeholder for now
  }

  // Check for missing FAQs
  if (!faqs || faqs.length === 0) {
    alerts.push({
      type: 'warning',
      message: 'No FAQs configured. Add knowledge base items so AI can answer questions.',
      action: { label: 'Add FAQs', href: '/ai?tab=knowledge' },
    });
  }

  // Check for missing AI configuration
  if (!aiRoles || aiRoles.length === 0) {
    alerts.push({
      type: 'warning',
      message: 'No AI role configured. Set up your AI assistant.',
      action: { label: 'Configure AI', href: '/ai' },
    });
  }

  return (
    <PageContainer title="Overview" description="Your AI automation at a glance">
      {/* AI Status Hero */}
      <Card className="bg-gradient-to-br from-success-500/10 via-success-500/5 to-transparent border-success-500/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-success-500/20 flex items-center justify-center">
                  <Zap className="h-8 w-8 text-success-500" />
                </div>
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-success-500 rounded-full animate-pulse border-2 border-background" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">AI is Active</h2>
                <p className="text-muted-foreground">Your assistant is ready to handle calls</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <div className="text-center">
                <p className="text-4xl font-bold">{stats?.calls_today ?? 0}</p>
                <p className="text-sm text-muted-foreground">Calls today</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold">{stats?.appointments_today ?? 0}</p>
                <p className="text-sm text-muted-foreground">Booked today</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-2 mt-6">
          {alerts.map((alert, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  'border-l-4',
                  alert.type === 'warning'
                    ? 'border-l-warning-500 bg-warning-500/5'
                    : 'border-l-primary bg-primary/5'
                )}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle
                      className={cn(
                        'h-5 w-5',
                        alert.type === 'warning' ? 'text-warning-500' : 'text-primary'
                      )}
                    />
                    <span className="text-sm">{alert.message}</span>
                  </div>
                  {alert.action && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={alert.action.href}>
                        {alert.action.label}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick Stats - Mobile */}
      <div className="grid grid-cols-2 gap-4 mt-6 md:hidden">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.calls_today ?? 0}</p>
              <p className="text-xs text-muted-foreground">Calls</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success-500/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-success-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.appointments_today ?? 0}</p>
              <p className="text-xs text-muted-foreground">Booked</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/activity">
                  View all
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {callsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !recentCalls?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No recent activity</p>
                <p className="text-xs mt-1">Calls and bookings will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCalls.slice(0, 6).map((call, index) => (
                  <motion.div
                    key={call.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center',
                        call.call_direction === 'inbound'
                          ? 'bg-success-500/10'
                          : 'bg-primary/10'
                      )}
                    >
                      {call.call_direction === 'inbound' ? (
                        <PhoneIncoming className="h-5 w-5 text-success-500" />
                      ) : (
                        <PhoneOutgoing className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {call.customer_name || call.caller_phone || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDuration(call.call_duration)}</span>
                        <span>•</span>
                        <span>{getRelativeTime(call.started_at)}</span>
                      </div>
                    </div>
                    {call.outcome === 'appointment_booked' && (
                      <Badge variant="success" size="sm">Booked</Badge>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Today's Appointments</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/activity?tab=appointments">
                  View all
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!todayAppointments?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No appointments today</p>
                <p className="text-xs mt-1">AI will book as calls come in</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppointments.slice(0, 5).map((apt, index) => (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border',
                      apt.status === 'completed'
                        ? 'bg-success-500/5 border-success-500/20'
                        : apt.status === 'cancelled'
                        ? 'bg-muted/50 border-border opacity-60'
                        : 'bg-card border-border'
                    )}
                  >
                    <div className="text-center min-w-[50px]">
                      <p className="text-lg font-bold">{apt.appointment_time?.slice(0, 5)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{apt.customer_name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {apt.service_name || 'Appointment'}
                      </p>
                    </div>
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
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-3 mt-6">
        <Link to="/ai">
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium group-hover:text-primary transition-colors">AI Setup</p>
                <p className="text-xs text-muted-foreground">Configure your assistant</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/business">
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                <Clock className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="font-medium group-hover:text-primary transition-colors">Business Hours</p>
                <p className="text-xs text-muted-foreground">Set operating hours</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/team">
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-success-500/10 flex items-center justify-center group-hover:bg-success-500/20 transition-colors">
                <User className="h-5 w-5 text-success-500" />
              </div>
              <div>
                <p className="font-medium group-hover:text-primary transition-colors">Team</p>
                <p className="text-xs text-muted-foreground">Manage staff & calendars</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </PageContainer>
  );
}
