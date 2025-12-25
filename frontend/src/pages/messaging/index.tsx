import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, Mail, Phone, Search, Send, User, Plus,
  Clock, CheckCircle, AlertCircle, Filter
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useDebounce } from '@/lib/hooks';
import { formatDate, formatPhone } from '@/lib/utils/format';
import { 
  useCustomers, 
  useMessageTemplates, 
  useMessageHistory,
  useSendSMS, 
  useSendEmail,
  useSendWhatsApp 
} from '@/lib/api/hooks';

export default function MessagingPage() {
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [selectedChannel, setSelectedChannel] = useState<'sms' | 'email' | 'whatsapp'>('sms');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch customers
  const { data: customersData, isLoading: customersLoading } = useCustomers(
    debouncedSearch,
    50
  );
  const customers = customersData?.data || [];

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useMessageTemplates(undefined, selectedChannel);

  // Fetch message history for selected customer
  const { data: messageHistory, isLoading: historyLoading } = useMessageHistory(selectedCustomerId);

  // Send mutations
  const sendSMS = useSendSMS();
  const sendEmail = useSendEmail();
  const sendWhatsApp = useSendWhatsApp();

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const handleSendMessage = async () => {
    if (!selectedCustomerId || !messageContent.trim()) return;

    try {
      if (selectedChannel === 'sms') {
        await sendSMS.mutateAsync({
          customer_id: selectedCustomerId,
          message: messageContent,
        });
      } else if (selectedChannel === 'email') {
        await sendEmail.mutateAsync({
          customer_id: selectedCustomerId,
          subject: emailSubject || 'Message from your business',
          message: messageContent,
        });
      } else if (selectedChannel === 'whatsapp') {
        await sendWhatsApp.mutateAsync({
          customer_id: selectedCustomerId,
          message: messageContent,
        });
      }
      
      // Clear form on success
      setMessageContent('');
      setEmailSubject('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setMessageContent(template.body);
      if (template.subject) {
        setEmailSubject(template.subject);
      }
    }
  };

  const isSending = sendSMS.isPending || sendEmail.isPending || sendWhatsApp.isPending;

  return (
    <PageContainer
      title="Messaging"
      description="Send SMS, WhatsApp, and email messages to your customers"
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'compose' | 'history')}>
        <TabsList className="mb-6">
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Customer Selection */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Select Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {customersLoading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))
                  ) : customers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No customers found
                    </p>
                  ) : (
                    customers.map((customer) => {
                      const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
                      const isSelected = selectedCustomerId === customer.id;
                      
                      return (
                        <motion.div
                          key={customer.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <button
                            onClick={() => setSelectedCustomerId(customer.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                              isSelected 
                                ? 'border-primary bg-primary/10' 
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <Avatar name={name} size="sm" />
                            <div className="text-left">
                              <p className="font-medium">{name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatPhone(customer.phone)}
                              </p>
                            </div>
                          </button>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Message Composer */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Compose Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Channel Selection */}
                <div className="flex gap-2 mb-6">
                  {[
                    { id: 'sms', label: 'SMS', icon: Phone },
                    { id: 'email', label: 'Email', icon: Mail },
                    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                  ].map(({ id, label, icon: Icon }) => (
                    <Button
                      key={id}
                      variant={selectedChannel === id ? 'default' : 'outline'}
                      onClick={() => setSelectedChannel(id as 'sms' | 'email' | 'whatsapp')}
                      leftIcon={<Icon className="h-4 w-4" />}
                    >
                      {label}
                    </Button>
                  ))}
                </div>

                {/* Selected Customer Display */}
                {selectedCustomer && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-4">
                    <Avatar name={`${selectedCustomer.first_name} ${selectedCustomer.last_name}`} size="sm" />
                    <div>
                      <p className="font-medium">
                        {selectedCustomer.first_name} {selectedCustomer.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedChannel === 'email' 
                          ? (selectedCustomer.email || 'No email') 
                          : formatPhone(selectedCustomer.phone)
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Template Selection */}
                {templates && templates.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Use Template</label>
                    <Select onValueChange={handleTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Email Subject (for email only) */}
                {selectedChannel === 'email' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Subject</label>
                    <Input
                      placeholder="Email subject..."
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                  </div>
                )}

                {/* Message Content */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <textarea
                    className="w-full h-40 px-3 py-2 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Type your message..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                  />
                  {selectedChannel === 'sms' && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {messageContent.length} characters
                    </p>
                  )}
                </div>

                {/* Send Button */}
                <Button
                  onClick={handleSendMessage}
                  disabled={!selectedCustomerId || !messageContent.trim() || isSending}
                  loading={isSending}
                  leftIcon={<Send className="h-4 w-4" />}
                  className="w-full"
                >
                  Send {selectedChannel.toUpperCase()}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Message History</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedCustomerId ? (
                <EmptyState
                  icon={MessageSquare}
                  title="Select a customer"
                  description="Choose a customer from the compose tab to view their message history"
                />
              ) : historyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : !messageHistory?.length ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No messages yet"
                  description="No messages have been sent to this customer"
                />
              ) : (
                <div className="space-y-4">
                  {messageHistory.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-4 p-4 rounded-lg border border-border"
                    >
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        message.channel === 'sms' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        message.channel === 'email' ? 'bg-green-100 dark:bg-green-900/30' :
                        'bg-purple-100 dark:bg-purple-900/30'
                      }`}>
                        {message.channel === 'sms' ? (
                          <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        ) : message.channel === 'email' ? (
                          <Mail className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge>{message.channel.toUpperCase()}</Badge>
                            <Badge variant={message.status === 'sent' ? 'success' : 'error'}>
                              {message.status === 'sent' ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <AlertCircle className="h-3 w-3 mr-1" />
                              )}
                              {message.status}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(message.sent_at || message.created_at, 'MMM d, h:mm a')}
                          </span>
                        </div>
                        {message.subject && (
                          <p className="font-medium mb-1">{message.subject}</p>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {message.body}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          To: {message.to_address}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
