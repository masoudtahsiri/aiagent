import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, ChevronDown, ChevronRight, Edit, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/form-elements';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useFAQs, useCreateFAQ, useUpdateFAQ, useDeleteFAQ } from '@/lib/api/hooks';
import type { FAQ } from '@/types';

const categories = [
  { value: 'hours', label: 'Business Hours', color: 'primary' },
  { value: 'pricing', label: 'Pricing', color: 'success' },
  { value: 'services', label: 'Services', color: 'secondary' },
  { value: 'policies', label: 'Policies', color: 'warning' },
  { value: 'general', label: 'General', color: 'default' },
  { value: 'location', label: 'Location', color: 'info' },
];

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  
  // Fetch FAQs from API
  const { data: faqs, isLoading, refetch } = useFAQs();
  const deleteFAQ = useDeleteFAQ();
  
  const faqList = faqs || [];

  const filteredFAQs = faqList.filter(faq => {
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedFAQs = filteredFAQs.reduce((acc, faq) => {
    const cat = faq.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDelete = async (faq: FAQ) => {
    if (!confirm(`Are you sure you want to delete this FAQ?`)) return;
    
    try {
      await deleteFAQ.mutateAsync(faq.id);
      toast.success('FAQ deleted');
      refetch();
    } catch (error) {
      toast.error('Failed to delete FAQ');
    }
  };

  const handleSuccess = () => {
    setShowNewModal(false);
    setEditingFAQ(null);
    refetch();
  };

  if (isLoading) {
    return (
      <PageContainer
        title="Knowledge Base"
        description="FAQs and information the AI uses to answer questions"
        breadcrumbs={[
          { label: 'AI Configuration', href: '/ai-config' },
          { label: 'Knowledge Base' },
        ]}
      >
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-32" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </PageContainer>
    );
  }

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
          const count = faqList.filter(f => f.category === cat.value).length;
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
          {Object.entries(groupedFAQs).map(([category, categoryFaqs]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={categories.find(c => c.value === category)?.color as any || 'default'}>
                  {categories.find(c => c.value === category)?.label || category}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {categoryFaqs.length} {categoryFaqs.length === 1 ? 'question' : 'questions'}
                </span>
              </div>
              
              <Card>
                <div className="divide-y divide-border">
                  {categoryFaqs.map((faq) => (
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(faq);
                            }}
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
                              {faq.keywords && faq.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                  {faq.keywords.map((keyword: string) => (
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
            onSuccess={handleSuccess} 
          />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// FAQ Form
function FAQForm({ faq, onSuccess }: { faq?: FAQ | null; onSuccess: () => void }) {
  const [formData, setFormData] = useState<{
    category: FAQ['category'];
    question: string;
    answer: string;
    keywords: string;
  }>({
    category: 'general',
    question: '',
    answer: '',
    keywords: '',
  });
  
  const createFAQ = useCreateFAQ();
  const updateFAQ = useUpdateFAQ();

  useEffect(() => {
    if (faq) {
      setFormData({
        category: faq.category || 'general',
        question: faq.question,
        answer: faq.answer,
        keywords: faq.keywords?.join(', ') || '',
      });
    }
  }, [faq]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.question || !formData.answer) {
      toast.error('Please fill in question and answer');
      return;
    }

    const keywords = formData.keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    try {
      if (faq) {
        await updateFAQ.mutateAsync({
          id: faq.id,
          data: {
            category: formData.category,
            question: formData.question,
            answer: formData.answer,
            keywords,
          }
        });
        toast.success('FAQ updated');
      } else {
        await createFAQ.mutateAsync({
          category: formData.category,
          question: formData.question,
          answer: formData.answer,
          keywords,
          is_active: true,
        });
        toast.success('FAQ added');
      }
      onSuccess();
    } catch (error) {
      toast.error(faq ? 'Failed to update FAQ' : 'Failed to add FAQ');
    }
  };

  const isLoading = createFAQ.isPending || updateFAQ.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Category *</label>
        <Select 
          value={formData.category}
          onValueChange={(v) => setFormData(prev => ({ ...prev, category: v as FAQ['category'] }))}
        >
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
          value={formData.question}
          onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Answer *</label>
        <Textarea 
          placeholder="Enter the answer..."
          value={formData.answer}
          onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Keywords</label>
        <Input 
          placeholder="hours, open, schedule (comma separated)"
          value={formData.keywords}
          onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
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
