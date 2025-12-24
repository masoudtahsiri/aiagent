import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Clock, Calendar, Play, Pause, User, Filter,
  ChevronLeft, ChevronRight, MessageSquare, X
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsCard } from '@/components/cards/stats-card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatCallDuration, formatPhone } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import { useCalls, useCall, useDashboardStats } from '@/lib/api/hooks';
import type { CallLogWithDetails } from '@/types';

const outcomeLabels: Record<string, { label: string; variant: 'success' | 'primary' | 'warning' | 'default' }> = {
  appointment_booked: { label: 'Appointment Booked', variant: 'success' },
  appointment_rescheduled: { label: 'Rescheduled', variant: 'primary' },
  appointment_cancelled: { label: 'Cancelled', variant: 'warning' },
  question_answered: { label: 'Question Answered', variant: 'default' },
  callback_scheduled: { label: 'Callback Scheduled', variant: 'primary' },
  transferred_human: { label: 'Transferred', variant: 'warning' },
  voicemail: { label: 'Voicemail', variant: 'default' },
  other: { label: 'Other', variant: 'default' },
};

const ITEMS_PER_PAGE = 50;

export default function CallsPage() {
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const offset = (page - 1) * ITEMS_PER_PAGE;

  // Fetch calls from API
  const { data: callsResponse, isLoading } = useCalls({
    limit: ITEMS_PER_PAGE,
    offset,
  });
  
  // Fetch dashboard stats for the stats cards
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const calls = callsResponse?.data || [];
  const totalCalls = callsResponse?.total || 0;

  // Filter calls client-side for quick filtering
  const filteredCalls = calls.filter(call => {
    if (filter === 'all') return true;
    if (filter === 'inbound') return call.call_direction === 'inbound';
    if (filter === 'outbound') return call.call_direction === 'outbound';
    if (filter === 'missed') return call.call_status === 'missed';
    return true;
  });

  // Get the selected call details
  const selectedCall = selectedCallId ? calls.find(c => c.id === selectedCallId) : null;

  // Parse transcript if available
  const parseTranscript = (transcript: string | undefined | null) => {
    if (!transcript) return [];
    
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(transcript);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch {
      // If not JSON, split by speaker patterns
      const messages: { speaker: string; text: string; timestamp: string }[] = [];
      const lines = transcript.split('\n');
      
      lines.forEach((line, i) => {
        if (line.startsWith('AI:') || line.startsWith('Assistant:')) {
          messages.push({ speaker: 'ai', text: line.replace(/^(AI|Assistant):/, '').trim(), timestamp: '' });
        } else if (line.startsWith('Customer:') || line.startsWith('User:')) {
          messages.push({ speaker: 'customer', text: line.replace(/^(Customer|User):/, '').trim(), timestamp: '' });
        } else if (line.trim()) {
          // Append to last message if no speaker
          if (messages.length > 0) {
            messages[messages.length - 1].text += ' ' + line.trim();
          }
        }
      });
      
      return messages;
    }
  };

  // Calculate stats from calls
  const callsToday = stats?.calls_today ?? 0;
  const missedCalls = calls.filter(c => c.call_status === 'missed').length;
  const appointmentsBooked = calls.filter(c => c.outcome === 'appointment_booked').length;
  const avgDuration = calls.length > 0
    ? Math.round(calls.reduce((sum, c) => sum + (c.call_duration || 0), 0) / calls.length)
    : 0;

  return (
    <PageContainer
      title="Call Logs"
      description="View and analyze all AI-handled calls"
    >
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatsCard
          title="Calls Today"
          value={callsToday}
          change={stats?.calls_change ?? 0}
          icon={<Phone className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatsCard
          title="Avg. Duration"
          value={formatCallDuration(avgDuration)}
          icon={<Clock className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatsCard
          title="Appointments Booked"
          value={appointmentsBooked}
          icon={<Calendar className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatsCard
          title="Missed Calls"
          value={missedCalls}
          icon={<PhoneMissed className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All Calls</TabsTrigger>
            <TabsTrigger value="inbound">Inbound</TabsTrigger>
            <TabsTrigger value="outbound">Outbound</TabsTrigger>
            <TabsTrigger value="missed">Missed</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="sm:ml-auto flex gap-2">
          <Input 
            placeholder="Search calls..." 
            className="w-48" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button variant="outline" leftIcon={<Filter className="h-4 w-4" />}>
            More Filters
          </Button>
        </div>
      </div>

      {/* Call List */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls ({filteredCalls.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y divide-border">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCalls.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Phone className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No calls found</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                {filteredCalls.map((call) => (
                  <motion.button
                    key={call.id}
                    onClick={() => setSelectedCallId(call.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors",
                      selectedCallId === call.id && "bg-muted/50"
                    )}
                    whileHover={{ x: 4 }}
                  >
                    {/* Direction Icon */}
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      call.call_status === 'missed' 
                        ? "bg-error-100 text-error-600 dark:bg-error-500/20 dark:text-error-400"
                        : call.call_direction === 'inbound'
                        ? "bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
                        : "bg-primary-100 text-primary-600 dark:bg-primary/20"
                    )}>
                      {call.call_status === 'missed' ? (
                        <PhoneMissed className="h-5 w-5" />
                      ) : call.call_direction === 'inbound' ? (
                        <PhoneIncoming className="h-5 w-5" />
                      ) : (
                        <PhoneOutgoing className="h-5 w-5" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {call.customer_name || formatPhone(call.caller_phone)}
                        </p>
                        {call.outcome && (
                          <Badge variant={outcomeLabels[call.outcome]?.variant || 'default'} size="sm">
                            {outcomeLabels[call.outcome]?.label || call.outcome}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(call.started_at, 'MMM d, h:mm a')}
                        {call.call_duration && call.call_duration > 0 && ` • ${formatCallDuration(call.call_duration)}`}
                      </p>
                    </div>

                    {/* Transcript indicator */}
                    {call.transcript && (
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call Detail / Transcript */}
        <Card>
          {selectedCall ? (
            <>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{selectedCall.customer_name || formatPhone(selectedCall.caller_phone)}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(selectedCall.started_at, 'MMMM d, yyyy h:mm a')}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedCallId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {/* Call Info */}
                <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatCallDuration(selectedCall.call_duration || 0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedCall.call_direction === 'inbound' ? (
                      <PhoneIncoming className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <PhoneOutgoing className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm capitalize">{selectedCall.call_direction}</span>
                  </div>
                  {selectedCall.outcome && (
                    <Badge variant={outcomeLabels[selectedCall.outcome]?.variant || 'default'}>
                      {outcomeLabels[selectedCall.outcome]?.label || selectedCall.outcome}
                    </Badge>
                  )}
                </div>

                {/* Transcript */}
                {selectedCall.transcript ? (
                  <div className="space-y-4">
                    <h4 className="font-medium">Transcript</h4>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {parseTranscript(selectedCall.transcript).length > 0 ? (
                        parseTranscript(selectedCall.transcript).map((message, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex gap-3",
                              message.speaker === 'ai' ? "flex-row" : "flex-row-reverse"
                            )}
                          >
                            <Avatar 
                              name={message.speaker === 'ai' ? 'AI' : 'Customer'}
                              size="sm"
                              color={message.speaker === 'ai' ? '#8B5CF6' : '#3B82F6'}
                            />
                            <div className={cn(
                              "max-w-[80%] rounded-xl px-4 py-2",
                              message.speaker === 'ai' 
                                ? "bg-secondary/10" 
                                : "bg-primary/10"
                            )}>
                              <p className="text-sm">{message.text}</p>
                              {message.timestamp && (
                                <p className="text-xs text-muted-foreground mt-1">{message.timestamp}</p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        // Raw transcript display
                        <div className="bg-muted/30 rounded-lg p-4">
                          <p className="text-sm whitespace-pre-wrap">{selectedCall.transcript}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No transcript available</p>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
              <div className="text-center">
                <Phone className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Select a call to view details</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Pagination */}
      {totalCalls > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button 
            variant="outline" 
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm px-4">
            Page {page} of {Math.ceil(totalCalls / ITEMS_PER_PAGE)}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            disabled={page >= Math.ceil(totalCalls / ITEMS_PER_PAGE)}
            onClick={() => setPage(p => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
