import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Mail, Phone, Send, Search, Plus } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/form-elements';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate, formatPhone } from '@/lib/utils/format';

// Mock messages
const mockMessages = [
  {
    id: '1',
    customer_name: 'John Smith',
    customer_phone: '+15550123',
    type: 'sms',
    direction: 'outbound',
    content: 'Reminder: Your appointment is tomorrow at 2 PM with Dr. Wilson.',
    sent_at: '2024-12-23T09:00:00',
    status: 'delivered',
  },
  {
    id: '2',
    customer_name: 'Emily Johnson',
    customer_phone: '+15550124',
    type: 'sms',
    direction: 'inbound',
    content: 'Yes, I confirm my appointment for Friday.',
    sent_at: '2024-12-22T14:30:00',
    status: 'received',
  },
  {
    id: '3',
    customer_name: 'Robert Davis',
    customer_phone: '+15550125',
    type: 'email',
    direction: 'outbound',
    content: 'Thank you for visiting Smile Dental Clinic...',
    sent_at: '2024-12-22T11:00:00',
    status: 'delivered',
  },
];

const templates = [
  { id: '1', name: 'Appointment Confirmation', type: 'sms' },
  { id: '2', name: 'Appointment Reminder', type: 'sms' },
  { id: '3', name: 'Follow-up Email', type: 'email' },
  { id: '4', name: 'Cancellation Notice', type: 'sms' },
];

export default function MessagingPage() {
  const [activeTab, setActiveTab] = useState('inbox');
  const [showComposeModal, setShowComposeModal] = useState(false);

  return (
    <PageContainer
      title="Messaging"
      description="Send SMS, emails, and manage customer communications"
      actions={
        <Button onClick={() => setShowComposeModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
          New Message
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">142</p>
              <p className="text-sm text-muted-foreground">SMS Sent Today</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary-100 flex items-center justify-center">
              <Mail className="h-5 w-5 text-secondary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">38</p>
              <p className="text-sm text-muted-foreground">Emails Sent Today</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success-100 flex items-center justify-center">
              <Phone className="h-5 w-5 text-success-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">98%</p>
              <p className="text-sm text-muted-foreground">Delivery Rate</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Message List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Messages</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search..." className="pl-9 w-48" inputSize="sm" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="px-4 border-b border-border">
                  <TabsList className="h-auto p-0 bg-transparent">
                    <TabsTrigger value="inbox" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                      All Messages
                    </TabsTrigger>
                    <TabsTrigger value="sms" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                      SMS
                    </TabsTrigger>
                    <TabsTrigger value="email" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                      Email
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="inbox" className="m-0">
                  <MessageList messages={mockMessages} />
                </TabsContent>
                <TabsContent value="sms" className="m-0">
                  <MessageList messages={mockMessages.filter(m => m.type === 'sms')} />
                </TabsContent>
                <TabsContent value="email" className="m-0">
                  <MessageList messages={mockMessages.filter(m => m.type === 'email')} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Templates Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.map((template) => (
              <motion.button
                key={template.id}
                className="w-full p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-left"
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{template.name}</span>
                  <Badge variant="default" size="sm">{template.type.toUpperCase()}</Badge>
                </div>
              </motion.button>
            ))}
            <Button variant="outline" className="w-full" leftIcon={<Plus className="h-4 w-4" />}>
              Create Template
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Compose Modal */}
      <Dialog open={showComposeModal} onOpenChange={setShowComposeModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <ComposeForm onSuccess={() => setShowComposeModal(false)} />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// Message List
function MessageList({ messages }: { messages: typeof mockMessages }) {
  return (
    <div className="divide-y divide-border">
      {messages.map((message) => (
        <div key={message.id} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
          <div className="flex items-start gap-3">
            <Avatar name={message.customer_name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium truncate">{message.customer_name}</p>
                <span className="text-xs text-muted-foreground">
                  {formatDate(message.sent_at, 'MMM d, h:mm a')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate">{message.content}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={message.type === 'sms' ? 'primary' : 'secondary'} size="sm">
                  {message.type.toUpperCase()}
                </Badge>
                <Badge 
                  variant={message.status === 'delivered' ? 'success' : 'default'} 
                  size="sm"
                >
                  {message.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Compose Form
function ComposeForm({ onSuccess }: { onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [messageType, setMessageType] = useState('sms');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Message Type</label>
        <Select value={messageType} onValueChange={setMessageType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          {messageType === 'sms' ? 'Phone Number' : 'Email Address'} *
        </label>
        <Input 
          placeholder={messageType === 'sms' ? '+1 (555) 000-0000' : 'customer@example.com'}
          required 
        />
      </div>

      {messageType === 'email' && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Subject *</label>
          <Input placeholder="Enter email subject..." required />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Message *</label>
        <Textarea 
          placeholder="Type your message..."
          required
        />
        {messageType === 'sms' && (
          <p className="text-xs text-muted-foreground">160 characters remaining</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading} leftIcon={<Send className="h-4 w-4" />}>
          Send Message
        </Button>
      </div>
    </form>
  );
}
