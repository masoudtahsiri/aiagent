import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, ChevronDown, ChevronRight, Edit, Trash2, BookOpen } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/form-elements';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/shared/empty-state';

// Mock FAQs
const mockFAQs = [
  {
    id: '1',
    category: 'hours',
    question: 'What are your business hours?',
    answer: 'We are open Monday through Friday from 9 AM to 5 PM, and Saturday from 9 AM to 1 PM. We are closed on Sundays.',
    keywords: ['hours', 'open', 'closed', 'schedule'],
  },
  {
    id: '2',
    category: 'hours',
    question: 'Are you open on holidays?',
    answer: 'We are closed on major holidays including New Year\'s Day, Memorial Day, Independence Day, Labor Day, Thanksgiving, and Christmas.',
    keywords: ['holiday', 'closed'],
  },
  {
    id: '3',
    category: 'pricing',
    question: 'How much does a teeth cleaning cost?',
    answer: 'A standard teeth cleaning costs $120. We also offer deep cleaning services starting at $250 per quadrant.',
    keywords: ['cleaning', 'price', 'cost'],
  },
  {
    id: '4',
    category: 'services',
    question: 'Do you offer teeth whitening?',
    answer: 'Yes! We offer both in-office whitening treatments ($350) and take-home whitening kits ($150). The in-office treatment takes about an hour.',
    keywords: ['whitening', 'bleaching'],
  },
  {
    id: '5',
    category: 'policies',
    question: 'What is your cancellation policy?',
    answer: 'We require 24 hours notice for cancellations. Late cancellations or no-shows may be subject to a $50 fee.',
    keywords: ['cancel', 'cancellation', 'reschedule'],
  },
  {
    id: '6',
    category: 'general',
    question: 'Do you accept insurance?',
    answer: 'Yes, we accept most major dental insurance plans including Delta Dental, Cigna, Aetna, and MetLife. Please bring your insurance card to your appointment.',
    keywords: ['insurance', 'coverage', 'pay'],
  },
];

const categories = [
  { value: 'hours', label: 'Business Hours', color: 'primary' },
  { value: 'pricing', label: 'Pricing', color: 'success' },
  { value: 'services', label: 'Services', color: 'secondary' },
  { value: 'policies', label: 'Policies', color: 'warning' },
  { value: 'general', label: 'General', color: 'default' },
];

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<typeof mockFAQs[0] | null>(null);

  const filteredFAQs = mockFAQs.filter(faq => {
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedFAQs = filteredFAQs.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, typeof mockFAQs>);

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <PageContainer
      title="Knowledge Base"
      description="FAQs and information the AI uses to answer questions"
      breadcrumbs={[
        { label: 'AI Configuration', href: '/ai-config' },
        { label: 'Knowledge Base' },
      ]}
      actions={
        <Button onClick={() => setShowNewModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Add FAQ
        </Button>
      }
    >
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
        {categories.map((cat) => {
          const count = mockFAQs.filter(f => f.category === cat.value).length;
          return (
            <Card key={cat.value} className="p-3 min-w-[140px]">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm text-muted-foreground">{cat.label}</p>
            </Card>
          );
        })}
      </div>

      {/* FAQ List */}
      {filteredFAQs.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No FAQs found"
          description={searchQuery ? "Try a different search term" : "Add your first FAQ to help the AI answer questions"}
          action={
            <Button onClick={() => setShowNewModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Add FAQ
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFAQs).map(([category, faqs]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={categories.find(c => c.value === category)?.color as any || 'default'}>
                  {categories.find(c => c.value === category)?.label || category}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {faqs.length} {faqs.length === 1 ? 'question' : 'questions'}
                </span>
              </div>
              
              <Card>
                <div className="divide-y divide-border">
                  {faqs.map((faq) => (
                    <div key={faq.id} className="p-4">
                      <button
                        onClick={() => toggleExpanded(faq.id)}
                        className="w-full flex items-start justify-between text-left"
                      >
                        <div className="flex items-start gap-3">
                          {expandedIds.includes(faq.id) ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                          )}
                          <span className="font-medium">{faq.question}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingFAQ(faq);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </button>
                      
                      <AnimatePresence>
                        {expandedIds.includes(faq.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-3 pl-8">
                              <p className="text-muted-foreground">{faq.answer}</p>
                              {faq.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                  {faq.keywords.map((keyword) => (
                                    <Badge key={keyword} variant="default" size="sm">
                                      {keyword}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* New/Edit FAQ Modal */}
      <Dialog 
        open={showNewModal || !!editingFAQ} 
        onOpenChange={(open) => {
          if (!open) {
            setShowNewModal(false);
            setEditingFAQ(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFAQ ? 'Edit FAQ' : 'Add New FAQ'}</DialogTitle>
          </DialogHeader>
          <FAQForm 
            faq={editingFAQ}
            onSuccess={() => {
              setShowNewModal(false);
              setEditingFAQ(null);
            }} 
          />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// FAQ Form
function FAQForm({ faq, onSuccess }: { faq?: typeof mockFAQs[0] | null; onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

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
        <label className="text-sm font-medium">Category *</label>
        <Select defaultValue={faq?.category || 'general'}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Question *</label>
        <Input 
          placeholder="e.g., What are your business hours?"
          defaultValue={faq?.question}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Answer *</label>
        <Textarea 
          placeholder="Enter the answer..."
          defaultValue={faq?.answer}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Keywords</label>
        <Input 
          placeholder="hours, open, schedule (comma separated)"
          defaultValue={faq?.keywords.join(', ')}
        />
        <p className="text-xs text-muted-foreground">
          Keywords help the AI match questions to answers
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          {faq ? 'Save Changes' : 'Add FAQ'}
        </Button>
      </div>
    </form>
  );
}
