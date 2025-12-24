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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsCard } from '@/components/cards/stats-card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatCallDuration, formatPhone } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

// Mock call data
const mockCalls = [
  {
    id: '1',
    caller_phone: '+15550123',
    customer_name: 'John Smith',
    call_direction: 'inbound',
    call_status: 'completed',
    call_duration: 245,
    outcome: 'appointment_booked',
    started_at: '2024-12-23T10:30:00',
    has_transcript: true,
  },
  {
    id: '2',
    caller_phone: '+15550124',
    customer_name: 'Emily Johnson',
    call_direction: 'inbound',
    call_status: 'completed',
    call_duration: 180,
    outcome: 'question_answered',
    started_at: '2024-12-23T09:15:00',
    has_transcript: true,
  },
  {
    id: '3',
    caller_phone: '+15550125',
    customer_name: null,
    call_direction: 'inbound',
    call_status: 'missed',
    call_duration: 0,
    outcome: null,
    started_at: '2024-12-23T08:45:00',
    has_transcript: false,
  },
  {
    id: '4',
    caller_phone: '+15550126',
    customer_name: 'Sarah Wilson',
    call_direction: 'outbound',
    call_status: 'completed',
    call_duration: 120,
    outcome: 'callback_scheduled',
    started_at: '2024-12-22T16:00:00',
    has_transcript: true,
  },
  {
    id: '5',
    caller_phone: '+15550127',
    customer_name: 'Michael Brown',
    call_direction: 'inbound',
    call_status: 'completed',
    call_duration: 320,
    outcome: 'appointment_rescheduled',
    started_at: '2024-12-22T14:30:00',
    has_transcript: true,
  },
];

const mockTranscript = [
  { speaker: 'ai', text: "Thank you for calling Smile Dental Clinic. This is Sarah, your virtual assistant. How can I help you today?", timestamp: '0:00' },
  { speaker: 'customer', text: "Hi, I'd like to schedule an appointment for a teeth cleaning.", timestamp: '0:08' },
  { speaker: 'ai', text: "I'd be happy to help you schedule a teeth cleaning appointment. Could you please tell me your name?", timestamp: '0:15' },
  { speaker: 'customer', text: "John Smith", timestamp: '0:22' },
  { speaker: 'ai', text: "Thank you, John. I see you're an existing patient. Let me check our available times. Do you have a preference for morning or afternoon?", timestamp: '0:25' },
  { speaker: 'customer', text: "Afternoon would be better for me.", timestamp: '0:35' },
  { speaker: 'ai', text: "Perfect. I have availability this Friday at 2 PM or next Monday at 3 PM. Which works better for you?", timestamp: '0:40' },
  { speaker: 'customer', text: "Friday at 2 PM sounds good.", timestamp: '0:50' },
  { speaker: 'ai', text: "Great! I've booked you for a teeth cleaning on Friday, December 27th at 2 PM with Dr. Wilson. You'll receive a confirmation text shortly. Is there anything else I can help you with?", timestamp: '0:55' },
  { speaker: 'customer', text: "No, that's all. Thank you!", timestamp: '1:10' },
  { speaker: 'ai', text: "You're welcome, John! We'll see you on Friday. Have a great day!", timestamp: '1:15' },
];

const outcomeLabels: Record<string, { label: string; variant: 'success' | 'primary' | 'warning' | 'default' }> = {
  appointment_booked: { label: 'Appointment Booked', variant: 'success' },
  appointment_rescheduled: { label: 'Rescheduled', variant: 'primary' },
  appointment_cancelled: { label: 'Cancelled', variant: 'warning' },
  question_answered: { label: 'Question Answered', variant: 'default' },
  callback_scheduled: { label: 'Callback Scheduled', variant: 'primary' },
  transferred_human: { label: 'Transferred', variant: 'warning' },
  voicemail: { label: 'Voicemail', variant: 'default' },
};

export default function CallsPage() {
  const [selectedCall, setSelectedCall] = useState<typeof mockCalls[0] | null>(null);
  const [filter, setFilter] = useState('all');
  const [isLoading] = useState(false);

  const filteredCalls = filter === 'all' 
    ? mockCalls 
    : mockCalls.filter(call => {
        if (filter === 'inbound') return call.call_direction === 'inbound';
        if (filter === 'outbound') return call.call_direction === 'outbound';
        if (filter === 'missed') return call.call_status === 'missed';
        return true;
      });

  return (
    <PageContainer
      title="Call Logs"
      description="View and analyze all AI-handled calls"
    >
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatsCard
          title="Calls Today"
          value={12}
          change={8}
          icon={<Phone className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatsCard
          title="Avg. Duration"
          value="3:42"
          change={-5}
          icon={<Clock className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatsCard
          title="Appointments Booked"
          value={8}
          change={15}
          icon={<Calendar className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatsCard
          title="Missed Calls"
          value={2}
          change={-20}
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
          <Input placeholder="Search calls..." className="w-48" />
          <Button variant="outline" leftIcon={<Filter className="h-4 w-4" />}>
            More Filters
          </Button>
        </div>
      </div>

      {/* Call List */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filteredCalls.map((call) => (
                <motion.button
                  key={call.id}
                  onClick={() => setSelectedCall(call)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors",
                    selectedCall?.id === call.id && "bg-muted/50"
                  )}
                  whileHover={{ x: 4 }}
                >
                  {/* Direction Icon */}
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    call.call_status === 'missed' 
                      ? "bg-error-100 text-error-600"
                      : call.call_direction === 'inbound'
                      ? "bg-success-100 text-success-600"
                      : "bg-primary-100 text-primary-600"
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
                      {call.call_duration > 0 && ` • ${formatCallDuration(call.call_duration)}`}
                    </p>
                  </div>

                  {/* Transcript indicator */}
                  {call.has_transcript && (
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  )}
                </motion.button>
              ))}
            </div>
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
                <Button variant="ghost" size="icon" onClick={() => setSelectedCall(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {/* Call Info */}
                <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatCallDuration(selectedCall.call_duration)}</span>
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
                {selectedCall.has_transcript ? (
                  <div className="space-y-4">
                    <h4 className="font-medium">Transcript</h4>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {mockTranscript.map((message, i) => (
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
                            <p className="text-xs text-muted-foreground mt-1">{message.timestamp}</p>
                          </div>
                        </div>
                      ))}
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
    </PageContainer>
  );
}
