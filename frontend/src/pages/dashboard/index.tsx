import { Link } from 'react-router-dom';
import { Phone, Calendar, Users, Star, PhoneIncoming } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PageContainer, StatsCard, AIStatusWidget } from '@/components/layout';
import { Card, Badge, Skeleton } from '@/components/ui';
import { useCurrentBusiness, useBusinessStats, useAppointments, useCallLogs } from '@/lib/api';

export default function DashboardPage() {
  const { data: business, isLoading: businessLoading } = useCurrentBusiness();
  const businessId = business?.id || '';
  
  const { data: stats, isLoading: statsLoading } = useBusinessStats(businessId);
  const { data: appointmentsResponse, isLoading: appointmentsLoading } = useAppointments(businessId, { limit: 5 });
  const { data: callsResponse, isLoading: callsLoading } = useCallLogs(businessId, { limit: 5 });
  
  const appointments = appointmentsResponse?.data || [];
  const calls = callsResponse?.data || [];

  const isLoading = businessLoading || statsLoading;

  if (isLoading) {
    return (
      <PageContainer title="Dashboard" description="Welcome back! Here's what's happening today.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rectangular" className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton variant="rectangular" className="h-80" />
          <Skeleton variant="rectangular" className="h-80" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title="Dashboard" 
      description={`Welcome back! Here's what's happening at ${business?.business_name || 'your business'}.`}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Calls Today"
          value={stats?.calls_today?.toString() || '0'}
          icon={<Phone className="h-5 w-5" />}
          iconColor="text-blue-600"
          change={stats?.calls_change ? {
            value: Math.abs(stats.calls_change),
            type: stats.calls_change >= 0 ? 'increase' : 'decrease',
          } : undefined}
        />
        <StatsCard
          title="Appointments Today"
          value={stats?.appointments_today?.toString() || '0'}
          icon={<Calendar className="h-5 w-5" />}
          iconColor="text-green-600"
          change={stats?.appointments_completed ? {
            value: stats.appointments_completed,
            type: 'increase',
          } : undefined}
        />
        <StatsCard
          title="Total Customers"
          value={stats?.total_customers?.toString() || '0'}
          icon={<Users className="h-5 w-5" />}
          iconColor="text-purple-600"
          change={stats?.customers_change ? {
            value: Math.abs(stats.customers_change),
            type: stats.customers_change >= 0 ? 'increase' : 'decrease',
          } : undefined}
        />
        <StatsCard
          title="Avg Rating"
          value={stats?.average_rating?.toFixed(1) || '-'}
          icon={<Star className="h-5 w-5" />}
          iconColor="text-yellow-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Appointments */}
          <Card>
            <Card.Header className="flex items-center justify-between">
              <h3 className="font-semibold">Today's Appointments</h3>
              <Link to="/appointments" className="text-sm text-blue-600 hover:underline">
                View all
              </Link>
            </Card.Header>
            <Card.Body className="p-0">
              {appointmentsLoading ? (
                <div className="p-4">
                  <Skeleton variant="rectangular" className="h-16" />
                </div>
              ) : appointments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No appointments scheduled for today.
                </div>
              ) : (
                <div className="divide-y">
                  {appointments.slice(0, 5).map((apt) => (
                    <div key={apt.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                      <div
                        className="w-1 h-12 rounded-full"
                        style={{ backgroundColor: apt.staff_color }}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{apt.customer_name}</div>
                        <div className="text-sm text-gray-500">
                          {apt.appointment_time} • {apt.service_name || 'General'}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">{apt.staff_name}</div>
                      <Badge 
                        variant={apt.status === 'confirmed' ? 'success' : apt.status === 'scheduled' ? 'primary' : 'default'}
                        size="sm"
                      >
                        {apt.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Recent Calls */}
          <Card>
            <Card.Header className="flex items-center justify-between">
              <h3 className="font-semibold">Recent Calls</h3>
              <Link to="/calls" className="text-sm text-blue-600 hover:underline">
                View all
              </Link>
            </Card.Header>
            <Card.Body className="p-0">
              {callsLoading ? (
                <div className="p-4">
                  <Skeleton variant="rectangular" className="h-16" />
                </div>
              ) : calls.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No recent calls.
                </div>
              ) : (
                <div className="divide-y">
                  {calls.slice(0, 5).map((call) => (
                    <div key={call.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                      <div className="p-2 bg-gray-100 rounded-full">
                        <PhoneIncoming className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{call.customer_name || call.caller_phone}</div>
                        <div className="text-sm text-gray-500">
                          {format(parseISO(call.started_at), 'h:mm a')} • {formatDuration(call.call_duration)}
                        </div>
                      </div>
                      {call.outcome && (
                        <Badge 
                          variant={
                            call.outcome === 'appointment_booked' ? 'success' : 
                            call.outcome === 'question_answered' ? 'primary' : 'default'
                          }
                          size="sm"
                        >
                          {call.outcome.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* AI Status */}
          <AIStatusWidget status="online" activeCallsCount={0} todayCallsCount={stats?.calls_today || 0} />

          {/* Quick Stats */}
          <Card>
            <Card.Header>
              <h3 className="font-semibold">This Week</h3>
            </Card.Header>
            <Card.Body className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Calls</span>
                <span className="font-semibold">{(stats?.calls_today || 0) * 7}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Appointments Booked</span>
                <span className="font-semibold">{(stats?.appointments_completed || 0) * 5}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">New Customers</span>
                <span className="font-semibold">{stats?.customers_change || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Avg Call Duration</span>
                <span className="font-semibold">2:34</span>
              </div>
            </Card.Body>
          </Card>

          {/* Business Info */}
          <Card>
            <Card.Header>
              <h3 className="font-semibold">Your Business</h3>
            </Card.Header>
            <Card.Body>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">Business Name</div>
                  <div className="font-medium">{business?.business_name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">AI Phone Number</div>
                  <div className="font-medium font-mono">{business?.ai_phone_number || 'Not set up'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Subscription</div>
                  <Badge variant={business?.subscription_status === 'active' ? 'success' : 'warning'}>
                    {business?.subscription_status === 'trial' ? 'Free Trial' : business?.subscription_status}
                  </Badge>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
