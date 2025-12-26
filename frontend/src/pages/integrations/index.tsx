import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Link2,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Settings,
  Zap,
  CreditCard,
  MessageSquare,
  Mail,
  Phone,
  Globe,
  Database,
  ArrowRight,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/form-elements';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  category: 'calendar' | 'crm' | 'communication' | 'payment' | 'automation';
  status: 'connected' | 'disconnected' | 'coming_soon';
  lastSync?: string;
}

const integrations: Integration[] = [
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync appointments with Google Calendar for seamless scheduling',
    icon: Calendar,
    iconBg: 'bg-red-500/10 text-red-600 dark:text-red-400',
    category: 'calendar',
    status: 'disconnected',
  },
  {
    id: 'outlook-calendar',
    name: 'Outlook Calendar',
    description: 'Connect Microsoft Outlook for enterprise calendar management',
    icon: Calendar,
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    category: 'calendar',
    status: 'disconnected',
  },
  {
    id: 'hubspot',
    name: 'HubSpot CRM',
    description: 'Sync customers and track interactions in HubSpot',
    icon: Database,
    iconBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    category: 'crm',
    status: 'coming_soon',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Enterprise CRM integration for customer data sync',
    icon: Database,
    iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    category: 'crm',
    status: 'coming_soon',
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS and voice communication platform',
    icon: Phone,
    iconBg: 'bg-red-500/10 text-red-600 dark:text-red-400',
    category: 'communication',
    status: 'connected',
    lastSync: '2 minutes ago',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Email delivery for automated notifications',
    icon: Mail,
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    category: 'communication',
    status: 'disconnected',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept payments and manage subscriptions',
    icon: CreditCard,
    iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    category: 'payment',
    status: 'coming_soon',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect with 5,000+ apps through automated workflows',
    icon: Zap,
    iconBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    category: 'automation',
    status: 'disconnected',
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Send real-time events to your own systems',
    icon: Globe,
    iconBg: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    category: 'automation',
    status: 'disconnected',
  },
];

const categories = [
  { id: 'all', label: 'All' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'crm', label: 'CRM' },
  { id: 'communication', label: 'Communication' },
  { id: 'payment', label: 'Payment' },
  { id: 'automation', label: 'Automation' },
];

export default function IntegrationsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [localIntegrations, setLocalIntegrations] = useState(integrations);

  const filteredIntegrations = selectedCategory === 'all'
    ? localIntegrations
    : localIntegrations.filter(i => i.category === selectedCategory);

  const connectedCount = localIntegrations.filter(i => i.status === 'connected').length;

  const handleConnect = (integrationId: string) => {
    // Simulate connection - in real app, this would trigger OAuth flow
    const integration = localIntegrations.find(i => i.id === integrationId);
    if (integration?.status === 'coming_soon') {
      toast.info(`${integration.name} is coming soon!`);
      return;
    }

    // For demo, just toggle the status
    setLocalIntegrations(prev => prev.map(i => {
      if (i.id === integrationId) {
        const newStatus = i.status === 'connected' ? 'disconnected' : 'connected';
        toast.success(
          newStatus === 'connected'
            ? `Connected to ${i.name}`
            : `Disconnected from ${i.name}`
        );
        return {
          ...i,
          status: newStatus,
          lastSync: newStatus === 'connected' ? 'Just now' : undefined,
        };
      }
      return i;
    }));
  };

  const handleSync = (integrationId: string) => {
    toast.success('Sync started');
    // Simulate sync
    setTimeout(() => {
      setLocalIntegrations(prev => prev.map(i => {
        if (i.id === integrationId) {
          return { ...i, lastSync: 'Just now' };
        }
        return i;
      }));
      toast.success('Sync completed');
    }, 1500);
  };

  return (
    <PageContainer
      title="Integrations"
      description="Connect your favorite tools and platforms"
    >
      {/* Stats Banner */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/20">
                <Link2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {connectedCount} Integration{connectedCount !== 1 ? 's' : ''} Connected
                </h3>
                <p className="text-sm text-muted-foreground">
                  {localIntegrations.length - connectedCount} available to connect
                </p>
              </div>
            </div>
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              API Documentation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category Filters */}
      <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
            className="shrink-0"
          >
            {category.label}
          </Button>
        ))}
      </div>

      {/* Integrations Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
        {filteredIntegrations.map((integration, index) => (
          <motion.div
            key={integration.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={cn(
              'h-full transition-all duration-200 hover:shadow-md',
              integration.status === 'connected' && 'border-success-500/30 bg-success-500/5'
            )}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('p-3 rounded-xl', integration.iconBg)}>
                    <integration.icon className="h-6 w-6" />
                  </div>
                  {integration.status === 'connected' ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Connected
                    </Badge>
                  ) : integration.status === 'coming_soon' ? (
                    <Badge variant="secondary">Coming Soon</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Not Connected
                    </Badge>
                  )}
                </div>

                <h3 className="font-semibold mb-1">{integration.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {integration.description}
                </p>

                {integration.lastSync && (
                  <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Last sync: {integration.lastSync}
                  </p>
                )}

                <div className="flex gap-2">
                  {integration.status === 'connected' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleSync(integration.id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Sync
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConnect(integration.id)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      variant={integration.status === 'coming_soon' ? 'secondary' : 'default'}
                      onClick={() => handleConnect(integration.id)}
                      disabled={integration.status === 'coming_soon'}
                    >
                      {integration.status === 'coming_soon' ? (
                        'Coming Soon'
                      ) : (
                        <>
                          Connect
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Custom Integration CTA */}
      <Card className="mt-8 border-dashed">
        <CardContent className="p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Globe className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Need a custom integration?</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Use our API or webhooks to build custom integrations with your existing tools and workflows.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              View API Docs
            </Button>
            <Button>
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
