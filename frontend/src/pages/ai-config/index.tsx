import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Sparkles, BookOpen, Settings, ArrowRight, Phone } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIStatusWidget } from '@/components/ai/ai-status-widget';

const configSections = [
  {
    title: 'AI Roles',
    description: 'Configure AI personalities and behaviors for different scenarios',
    icon: Sparkles,
    href: '/ai-config/roles',
    stats: { label: '3 Active Roles', variant: 'success' as const },
  },
  {
    title: 'Knowledge Base',
    description: 'Manage FAQs and information the AI uses to answer questions',
    icon: BookOpen,
    href: '/ai-config/knowledge',
    stats: { label: '24 FAQs', variant: 'default' as const },
  },
];

export default function AIConfigPage() {
  return (
    <PageContainer
      title="AI Configuration"
      description="Customize how your AI receptionist behaves and responds"
    >
      {/* AI Status */}
      <div className="mb-8">
        <AIStatusWidget />
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success-100 flex items-center justify-center">
              <Phone className="h-5 w-5 text-success-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">156</p>
              <p className="text-sm text-muted-foreground">Calls Handled Today</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">94%</p>
              <p className="text-sm text-muted-foreground">Resolution Rate</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary-100 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-secondary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">4.8</p>
              <p className="text-sm text-muted-foreground">Avg. Satisfaction</p>
            </div>
          </div>
        </Card>
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
