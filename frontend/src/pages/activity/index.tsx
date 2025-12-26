import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  Calendar,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  Play,
  FileText,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, AppointmentStatusBadge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatDate, formatTime, formatDuration, formatCurrency } from '@/lib/utils/format';
import { useCalls, useAppointments } from '@/lib/api/hooks';
import type { CallLogWithDetails, AppointmentWithDetails } from '@/types';

const tabs = [
  { id: 'calls', label: 'Calls', icon: Phone },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
];

export default function ActivityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'calls';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <PageContainer
      title="Activity"
      description="View call history and appointments"
    >
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'calls' && (
          <motion.div
            key="calls"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <CallsTab />
          </motion.div>
        )}
        {activeTab === 'appointments' && (
          <motion.div
            key="appointments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AppointmentsTab />
          </motion.div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
}

// Calls Tab
function CallsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCall, setSelectedCall] = useState<CallLogWithDetails | null>(null);

  const { data: callsData, isLoading } = useCalls({ limit: 100 });
  const calls = callsData?.data || [];

  const filteredCalls = calls.filter(call => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      call.caller_phone?.toLowerCase().includes(search) ||
      call.customer_name?.toLowerCase().includes(search) ||
      call.outcome?.toLowerCase().includes(search)
    );
  });

  const getCallIcon = (call: CallLogWithDetails) => {
    if (call.call_status === 'missed') {
      return <PhoneMissed className="h-5 w-5 text-destructive" />;
    }
    if (call.call_direction === 'inbound') {
      return <PhoneIncoming className="h-5 w-5 text-success-500" />;
    }
    return <PhoneOutgoing className="h-5 w-5 text-primary" />;
  };

  const getOutcomeBadge = (outcome: string | undefined) => {
    const variants: Record<string, { variant: any; label: string }> = {
      appointment_booked: { variant: 'success', label: 'Booked' },
      appointment_rescheduled: { variant: 'warning', label: 'Rescheduled' },
      appointment_cancelled: { variant: 'error', label: 'Cancelled' },
      question_answered: { variant: 'info', label: 'Question Answered' },
      callback_scheduled: { variant: 'secondary', label: 'Callback' },
      transferred_human: { variant: 'warning', label: 'Transferred' },
      voicemail: { variant: 'default', label: 'Voicemail' },
    };

    const config = variants[outcome || ''] || { variant: 'default', label: outcome || 'Unknown' };
    return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search calls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{calls.length}</p>
              <p className="text-sm text-muted-foreground">Total Calls</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success-500/10 flex items-center justify-center">
              <PhoneIncoming className="h-5 w-5 text-success-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {calls.filter(c => c.call_direction === 'inbound').length}
              </p>
              <p className="text-sm text-muted-foreground">Inbound</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {calls.filter(c => c.outcome === 'appointment_booked').length}
              </p>
              <p className="text-sm text-muted-foreground">Booked</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {calls.length > 0
                  ? formatDuration(
                      Math.round(
                        calls.reduce((sum, c) => sum + (c.call_duration || 0), 0) / calls.length
                      )
                    )
                  : '0:00'}
              </p>
              <p className="text-sm text-muted-foreground">Avg Duration</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Calls List */}
      {filteredCalls.length === 0 ? (
        <Card className="p-8 text-center">
          <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold mb-2">
            {searchQuery ? 'No calls found' : 'No calls yet'}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery ? 'Try a different search term' : 'Call activity will appear here'}
          </p>
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {filteredCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setSelectedCall(call)}
              >
                <div className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center',
                  call.call_direction === 'inbound' ? 'bg-success-500/10' : 'bg-primary/10'
                )}>
                  {getCallIcon(call)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium">
                    {call.customer_name || call.caller_phone || 'Unknown'}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{call.caller_phone}</span>
                    <span>•</span>
                    <span>{formatDuration(call.call_duration || 0)}</span>
                  </div>
                </div>

                <div className="text-right">
                  {getOutcomeBadge(call.outcome || undefined)}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(call.started_at, 'MMM d')} at {formatTime(call.started_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Call Detail Modal */}
      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Call Details</DialogTitle>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'h-12 w-12 rounded-xl flex items-center justify-center',
                  selectedCall.call_direction === 'inbound' ? 'bg-success-500/10' : 'bg-primary/10'
                )}>
                  {getCallIcon(selectedCall)}
                </div>
                <div>
                  <p className="font-semibold text-lg">
                    {selectedCall.customer_name || selectedCall.caller_phone}
                  </p>
                  <p className="text-muted-foreground">{selectedCall.caller_phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{formatDuration(selectedCall.call_duration || 0)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Direction</p>
                  <p className="font-medium capitalize">{selectedCall.call_direction}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Outcome</p>
                  {getOutcomeBadge(selectedCall.outcome || undefined)}
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(selectedCall.started_at, 'MMM d, yyyy')}</p>
                </div>
              </div>

              {selectedCall.transcript && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Transcript
                  </p>
                  <div className="p-4 rounded-lg bg-muted/50 text-sm max-h-64 overflow-y-auto">
                    {selectedCall.transcript}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Appointments Tab
function AppointmentsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: appointments, isLoading } = useAppointments();
  const appointmentsList = appointments || [];

  const filteredAppointments = appointmentsList.filter(apt => {
    const matchesSearch = !searchQuery ||
      apt.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.service_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.staff_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort by date descending
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
    const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
    return dateB.getTime() - dateA.getTime();
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search appointments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{appointmentsList.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {appointmentsList.filter(a => a.status === 'completed').length}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-warning-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-warning-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {appointmentsList.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length}
              </p>
              <p className="text-sm text-muted-foreground">Upcoming</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {appointmentsList.filter(a => a.status === 'cancelled' || a.status === 'no_show').length}
              </p>
              <p className="text-sm text-muted-foreground">Cancelled</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Appointments List */}
      {sortedAppointments.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold mb-2">
            {searchQuery || statusFilter !== 'all' ? 'No appointments found' : 'No appointments yet'}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Appointments will appear here when booked by the AI'}
          </p>
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {sortedAppointments.map((apt) => (
              <div key={apt.id} className="flex items-center gap-4 p-4">
                <div className="text-center min-w-[60px]">
                  <p className="text-2xl font-bold">{formatDate(apt.appointment_date, 'd')}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(apt.appointment_date, 'MMM')}</p>
                </div>

                <div
                  className="w-1 h-12 rounded-full"
                  style={{ backgroundColor: apt.staff_color || '#3B82F6' }}
                />

                <div className="flex-1 min-w-0">
                  <p className="font-medium">{apt.customer_name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{formatTime(apt.appointment_time)}</span>
                    <span>•</span>
                    <span>{apt.service_name || 'Appointment'}</span>
                    <span>•</span>
                    <span>{apt.staff_name}</span>
                  </div>
                </div>

                <div className="text-right">
                  <AppointmentStatusBadge status={apt.status} />
                  {apt.created_via === 'ai_phone' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Booked by AI
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
