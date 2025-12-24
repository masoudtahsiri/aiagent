import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Sparkles, BookOpen, Settings, ArrowRight, Phone } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AIStatusWidget } from '@/components/ai/ai-status-widget';
import { useAIRoles, useFAQs, useDashboardStats } from '@/lib/api/hooks';

export default function AIConfigPage() {
  // Fetch real data
  const { data: roles, isLoading: rolesLoading } = useAIRoles();
  const { data: faqs, isLoading: faqsLoading } = useFAQs();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const activeRolesCount = roles?.filter(r => r.is_enabled).length || 0;
  const totalFaqsCount = faqs?.length || 0;
  const callsToday = stats?.calls_today || 0;

  const configSections = [
    {
      title: 'AI Roles',
      description: 'Configure AI personalities and behaviors for different scenarios',
      icon: Sparkles,
      href: '/ai-config/roles',
      stats: { 
        label: rolesLoading ? 'Loading...' : `${activeRolesCount} Active Role${activeRolesCount !== 1 ? 's' : ''}`, 
        variant: 'success' as const 
      },
    },
    {
      title: 'Knowledge Base',
      description: 'Manage FAQs and information the AI uses to answer questions',
      icon: BookOpen,
      href: '/ai-config/knowledge',
      stats: { 
        label: faqsLoading ? 'Loading...' : `${totalFaqsCount} FAQ${totalFaqsCount !== 1 ? 's' : ''}`, 
        variant: 'default' as const 
      },
    },
  ];

  return (
    <PageContainer
      title="AI Configuration"
      description="Customize how your AI receptionist behaves and responds"
    >
      {/* AI Status */}
      <div className="mb-8">
        <AIStatusWidget status="active" callsToday={callsToday} />
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {statsLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success-100 dark:bg-success-500/20 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-success-600 dark:text-success-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{callsToday}</p>
                  <p className="text-sm text-muted-foreground">Calls Handled Today</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary/20 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary-600 dark:text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeRolesCount}</p>
                  <p className="text-sm text-muted-foreground">Active AI Roles</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-secondary-100 dark:bg-secondary/20 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-secondary-600 dark:text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalFaqsCount}</p>
                  <p className="text-sm text-muted-foreground">Knowledge Base Items</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Configuration Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {configSections.map((section, i) => (
          <motion.div
            key={section.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link to={section.href}>
              <Card className="h-full hover:shadow-lg transition-all hover:border-primary/50 group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                      <section.icon className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant={section.stats.variant}>{section.stats.label}</Badge>
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {section.title}
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-primary font-medium">
                    <span>Configure</span>
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Tips Card */}
      <Card className="mt-8 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Pro Tips for Better AI Performance</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Keep your FAQ answers concise and clear</li>
                <li>• Update business hours and holiday schedules regularly</li>
                <li>• Review call transcripts to identify common questions</li>
                <li>• Customize greeting messages for different times of day</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
