import { useState, useMemo } from 'react';
import { PhoneIncoming, PhoneOutgoing, Search, Clock, Phone } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PageContainer } from '@/components/layout';
import { Button, Card, Modal, Badge, Select, Skeleton, EmptyState, Table } from '@/components/ui';
import { useCallLogs, useCurrentBusiness } from '@/lib/api';
import type { CallLogWithDetails, CallStatus, CallOutcome, CallDirection } from '@/types';

const outcomeColors: Record<CallOutcome, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  appointment_booked: 'success',
  appointment_rescheduled: 'primary',
  appointment_cancelled: 'danger',
  question_answered: 'default',
  callback_scheduled: 'primary',
  transferred_human: 'warning',
  voicemail: 'default',
  other: 'default',
};

const statusColors: Record<CallStatus, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  ringing: 'primary',
  in_progress: 'warning',
  completed: 'success',
  missed: 'danger',
  failed: 'danger',
};

function formatDuration(seconds?: number): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function CallsPage() {
  const { data: business } = useCurrentBusiness();
  const businessId = business?.id || '';
  
  const { data: callsResponse, isLoading } = useCallLogs(businessId);
  const calls = callsResponse?.data || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | CallDirection>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | CallOutcome>('all');
  const [selectedCall, setSelectedCall] = useState<CallLogWithDetails | null>(null);

  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!call.caller_phone.toLowerCase().includes(query) &&
            !call.customer_name?.toLowerCase().includes(query)) {
          return false;
        }
      }
      // Direction filter
      if (directionFilter !== 'all' && call.call_direction !== directionFilter) {
        return false;
      }
      // Outcome filter
      if (outcomeFilter !== 'all' && call.outcome !== outcomeFilter) {
        return false;
      }
      return true;
    });
  }, [calls, searchQuery, directionFilter, outcomeFilter]);

  if (isLoading) {
    return (
      <PageContainer title="Call Logs" description="Review all AI-handled calls">
        <Card>
          <Card.Body>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" className="h-16 w-full" />
              ))}
            </div>
          </Card.Body>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Call Logs" description="Review all AI-handled calls">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <Select
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value as 'all' | CallDirection)}
          className="w-40"
        >
          <option value="all">All Directions</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
        </Select>
        <Select
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value as 'all' | CallOutcome)}
          className="w-48"
        >
          <option value="all">All Outcomes</option>
          <option value="appointment_booked">Booked</option>
          <option value="appointment_rescheduled">Rescheduled</option>
          <option value="appointment_cancelled">Cancelled</option>
          <option value="question_answered">Inquiry</option>
          <option value="voicemail">Voicemail</option>
        </Select>
      </div>

      {calls.length === 0 ? (
        <EmptyState
          title="No calls yet"
          description="Call logs will appear here when your AI receptionist handles calls."
          icon={<Phone className="h-12 w-12 text-gray-400" />}
        />
      ) : filteredCalls.length === 0 ? (
        <Card>
          <Card.Body className="py-12 text-center">
            <p className="text-gray-500">No calls match your filters.</p>
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.Header>Direction</Table.Header>
                <Table.Header>Phone</Table.Header>
                <Table.Header>Customer</Table.Header>
                <Table.Header>Date & Time</Table.Header>
                <Table.Header>Duration</Table.Header>
                <Table.Header>Status</Table.Header>
                <Table.Header>Outcome</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {filteredCalls.map((call) => (
                <Table.Row 
                  key={call.id} 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedCall(call)}
                >
                  <Table.Cell>
                    {call.call_direction === 'inbound' ? (
                      <PhoneIncoming className="h-4 w-4 text-green-600" />
                    ) : (
                      <PhoneOutgoing className="h-4 w-4 text-blue-600" />
                    )}
                  </Table.Cell>
                  <Table.Cell className="font-mono text-sm">{call.caller_phone}</Table.Cell>
                  <Table.Cell>{call.customer_name || '-'}</Table.Cell>
                  <Table.Cell>
                    {format(parseISO(call.started_at), 'MMM d, yyyy h:mm a')}
                  </Table.Cell>
                  <Table.Cell>{formatDuration(call.call_duration)}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={statusColors[call.call_status]} size="sm">
                      {call.call_status.replace('_', ' ')}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {call.outcome && (
                      <Badge variant={outcomeColors[call.outcome]} size="sm">
                        {call.outcome.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>
      )}

      {/* Call Detail Modal */}
      <Modal
        isOpen={!!selectedCall}
        onClose={() => setSelectedCall(null)}
        title="Call Details"
        size="lg"
      >
        {selectedCall && (
          <div className="space-y-6">
            {/* Call Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Direction</h4>
                <div className="flex items-center gap-2">
                  {selectedCall.call_direction === 'inbound' ? (
                    <PhoneIncoming className="h-4 w-4 text-green-600" />
                  ) : (
                    <PhoneOutgoing className="h-4 w-4 text-blue-600" />
                  )}
                  <span className="capitalize">{selectedCall.call_direction}</span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Phone Number</h4>
                <p className="font-mono">{selectedCall.caller_phone}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Duration</h4>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {formatDuration(selectedCall.call_duration)}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                <Badge variant={statusColors[selectedCall.call_status]}>
                  {selectedCall.call_status.replace('_', ' ')}
                </Badge>
              </div>
              {selectedCall.outcome && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Outcome</h4>
                  <Badge variant={outcomeColors[selectedCall.outcome]}>
                    {selectedCall.outcome.replace(/_/g, ' ')}
                  </Badge>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Date & Time</h4>
                <p>{format(parseISO(selectedCall.started_at), 'MMMM d, yyyy h:mm a')}</p>
              </div>
            </div>

            {/* Transcript */}
            {selectedCall.transcript && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Transcript</h4>
                <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {selectedCall.transcript}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button variant="secondary" onClick={() => setSelectedCall(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
