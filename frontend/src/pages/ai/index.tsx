import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Volume2,
  BookOpen,
  Sparkles,
  Save,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Play,
  Square,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/form-elements';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useAIRoles,
  useCreateAIRole,
  useUpdateAIRole,
  useFAQs,
  useCreateFAQ,
  useUpdateFAQ,
  useDeleteFAQ,
  useVoicePreview,
} from '@/lib/api/hooks';
import type { FAQ, FAQCategory, VoiceStyle, PersonalityStyle, ResponseLength } from '@/types';

// Voice options - all 30 Google Gemini TTS voices with official descriptions
const voiceOptions: Array<{ value: VoiceStyle; label: string; description: string }> = [
  { value: 'Puck', label: 'Puck', description: 'Upbeat' },
  { value: 'Charon', label: 'Charon', description: 'Informative' },
  { value: 'Kore', label: 'Kore', description: 'Firm' },
  { value: 'Fenrir', label: 'Fenrir', description: 'Excitable' },
  { value: 'Aoede', label: 'Aoede', description: 'Breezy' },
  { value: 'Zephyr', label: 'Zephyr', description: 'Bright' },
  { value: 'Leda', label: 'Leda', description: 'Youthful' },
  { value: 'Orus', label: 'Orus', description: 'Firm' },
  { value: 'Callirrhoe', label: 'Callirrhoe', description: 'Easy-going' },
  { value: 'Autonoe', label: 'Autonoe', description: 'Bright' },
  { value: 'Enceladus', label: 'Enceladus', description: 'Breathy' },
  { value: 'Iapetus', label: 'Iapetus', description: 'Clear' },
  { value: 'Umbriel', label: 'Umbriel', description: 'Easy-going' },
  { value: 'Algieba', label: 'Algieba', description: 'Smooth' },
  { value: 'Despina', label: 'Despina', description: 'Smooth' },
  { value: 'Erinome', label: 'Erinome', description: 'Clear' },
  { value: 'Algenib', label: 'Algenib', description: 'Gravelly' },
  { value: 'Rasalgethi', label: 'Rasalgethi', description: 'Informative' },
  { value: 'Laomedeia', label: 'Laomedeia', description: 'Upbeat' },
  { value: 'Achernar', label: 'Achernar', description: 'Soft' },
  { value: 'Alnilam', label: 'Alnilam', description: 'Firm' },
  { value: 'Schedar', label: 'Schedar', description: 'Even' },
  { value: 'Gacrux', label: 'Gacrux', description: 'Mature' },
  { value: 'Pulcherrima', label: 'Pulcherrima', description: 'Forward' },
  { value: 'Achird', label: 'Achird', description: 'Friendly' },
  { value: 'Zubenelgenubi', label: 'Zubenelgenubi', description: 'Casual' },
  { value: 'Vindemiatrix', label: 'Vindemiatrix', description: 'Gentle' },
  { value: 'Sadachbia', label: 'Sadachbia', description: 'Lively' },
  { value: 'Sadaltager', label: 'Sadaltager', description: 'Knowledgeable' },
  { value: 'Sulafat', label: 'Sulafat', description: 'Warm' },
];

// Personality options
const personalityOptions: Array<{ value: PersonalityStyle; label: string; description: string }> = [
  { value: 'professional', label: 'Professional', description: 'Efficient and business-like' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and conversational' },
  { value: 'calm', label: 'Calm', description: 'Patient and reassuring' },
  { value: 'energetic', label: 'Energetic', description: 'Upbeat and enthusiastic' },
];

// Response length options
const responseLengthOptions: Array<{ value: ResponseLength; label: string; description: string }> = [
  { value: 'concise', label: 'Concise', description: 'Brief and to the point' },
  { value: 'detailed', label: 'Detailed', description: 'Thorough and informative' },
];

const faqCategories = [
  { value: 'hours', label: 'Business Hours', color: 'primary' },
  { value: 'pricing', label: 'Pricing', color: 'success' },
  { value: 'services', label: 'Services', color: 'secondary' },
  { value: 'policies', label: 'Policies', color: 'warning' },
  { value: 'general', label: 'General', color: 'default' },
  { value: 'location', label: 'Location', color: 'info' },
];

const tabs = [
  { id: 'config', label: 'Configuration', icon: Sparkles },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
];

export default function AISetupPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'config';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <PageContainer
      title="AI Setup"
      description="Configure your AI assistant's personality and knowledge"
    >
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'config' && (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ConfigurationTab />
          </motion.div>
        )}
        {activeTab === 'knowledge' && (
          <motion.div
            key="knowledge"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <KnowledgeBaseTab />
          </motion.div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
}

// Configuration Tab - Simplified with personality controls
function ConfigurationTab() {
  const { data: roles, isLoading } = useAIRoles();
  const updateRole = useUpdateAIRole();
  const createRole = useCreateAIRole();
  const voicePreview = useVoicePreview();

  const [formData, setFormData] = useState<{
    ai_name: string;
    voice_style: VoiceStyle;
    personality_style: PersonalityStyle;
    response_length: ResponseLength;
    greeting_message: string;
  }>({
    ai_name: 'Alex',
    voice_style: 'Puck',
    personality_style: 'friendly',
    response_length: 'concise',
    greeting_message: '',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get primary role (first enabled role or first role)
  const primaryRole = roles?.find(r => r.is_enabled) || roles?.[0];

  useEffect(() => {
    if (primaryRole) {
      setFormData({
        ai_name: primaryRole.ai_name || 'Alex',
        voice_style: (primaryRole.voice_style as VoiceStyle) || 'Puck',
        personality_style: (primaryRole.personality_style as PersonalityStyle) || 'friendly',
        response_length: (primaryRole.response_length as ResponseLength) || 'concise',
        greeting_message: primaryRole.greeting_message || '',
      });
    }
  }, [primaryRole]);

  const handleChange = <K extends keyof typeof formData>(field: K, value: typeof formData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      if (primaryRole) {
        await updateRole.mutateAsync({
          id: primaryRole.id,
          data: formData,
        });
      } else {
        await createRole.mutateAsync({
          ...formData,
          role_type: 'receptionist',
          system_prompt: '',
          is_enabled: true,
          priority: 1,
        });
      }
      toast.success('AI configuration saved');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save configuration');
    }
  };

  const playPreview = async (text: string) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (isPreviewPlaying) {
      setIsPreviewPlaying(false);
      return;
    }

    try {
      const response = await voicePreview.mutateAsync({
        voice: formData.voice_style,
        text,
      });

      // Create audio from base64
      const audioBlob = new Blob(
        [Uint8Array.from(atob(response.audio), c => c.charCodeAt(0))],
        { type: 'audio/wav' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);

      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsPreviewPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      audioRef.current.onerror = () => {
        setIsPreviewPlaying(false);
        toast.error('Failed to play audio preview');
        URL.revokeObjectURL(audioUrl);
      };

      await audioRef.current.play();
      setIsPreviewPlaying(true);
    } catch (error) {
      toast.error('Failed to generate voice preview');
      setIsPreviewPlaying(false);
    }
  };

  const handleVoiceSample = () => {
    const sampleText = `Hello! This is a sample of the ${formData.voice_style} voice. How can I assist you today?`;
    playPreview(sampleText);
  };

  const handleGreetingPreview = () => {
    const greetingText = formData.greeting_message ||
      `Hello! Thank you for calling. I'm ${formData.ai_name}, how can I help you today?`;
    playPreview(greetingText);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-xl">
      {/* AI Assistant Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-primary" />
            AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Name & Voice Row */}
          <div className="flex gap-4">
            <div className="space-y-1.5 flex-1">
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <Input
                value={formData.ai_name}
                onChange={(e) => handleChange('ai_name', e.target.value)}
                placeholder="Alex"
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <label className="text-sm font-medium text-muted-foreground">Voice</label>
              <div className="flex gap-1.5">
                <Select
                  value={formData.voice_style}
                  onValueChange={(v) => handleChange('voice_style', v as VoiceStyle)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceOptions.map((voice) => (
                      <SelectItem key={voice.value} value={voice.value}>
                        <span>{voice.label}</span>
                        <span className="text-muted-foreground ml-1">· {voice.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleVoiceSample}
                  disabled={voicePreview.isPending}
                  className="shrink-0 h-11"
                >
                  {voicePreview.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isPreviewPlaying ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Communication Style */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Style</label>
            <div className="grid grid-cols-4 gap-1.5">
              {personalityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleChange('personality_style', option.value)}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-all text-center',
                    formData.personality_style === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Response Length */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Responses</label>
            <div className="grid grid-cols-2 gap-1.5">
              {responseLengthOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleChange('response_length', option.value)}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-all text-center',
                    formData.response_length === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Greeting Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            Greeting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1.5">
            <Input
              value={formData.greeting_message}
              onChange={(e) => handleChange('greeting_message', e.target.value)}
              placeholder="Hello! Thank you for calling. I'm Alex, how can I help you today?"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleGreetingPreview}
              disabled={voicePreview.isPending}
              className="shrink-0 h-11"
            >
              {voicePreview.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPreviewPlaying ? (
                <Square className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            size="lg"
            onClick={handleSave}
            loading={updateRole.isPending || createRole.isPending}
            className="shadow-lg"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// Knowledge Base Tab
function KnowledgeBaseTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);

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
    if (!confirm('Delete this FAQ?')) return;
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
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="bg-secondary/5 border-secondary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-secondary mt-0.5" />
            <div>
              <p className="font-medium">Knowledge Base</p>
              <p className="text-sm text-muted-foreground">
                Add FAQs so your AI can answer common questions accurately.
                The more information you provide, the smarter your AI becomes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
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
            {faqCategories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add FAQ
        </Button>
      </div>

      {/* Category Stats */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {faqCategories.map((cat) => {
          const count = faqList.filter(f => f.category === cat.value).length;
          return (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value === selectedCategory ? 'all' : cat.value)}
              className={cn(
                'px-4 py-2 rounded-lg border text-sm font-medium transition-colors shrink-0',
                selectedCategory === cat.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card hover:bg-muted'
              )}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* FAQ List */}
      {filteredFAQs.length === 0 ? (
        <Card className="p-8 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold mb-2">
            {searchQuery ? 'No FAQs found' : 'No FAQs yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? 'Try a different search term'
              : 'Add your first FAQ to help your AI answer questions'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First FAQ
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedFAQs).map(([category, categoryFaqs]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant={faqCategories.find(c => c.value === category)?.color as any || 'default'}>
                    {faqCategories.find(c => c.value === category)?.label || category}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {categoryFaqs.length} {categoryFaqs.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-border">
                  {categoryFaqs.map((faq) => (
                    <div key={faq.id} className="py-3">
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
              </CardContent>
            </Card>
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
          <FAQForm faq={editingFAQ} onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// FAQ Form Component
function FAQForm({ faq, onSuccess }: { faq?: FAQ | null; onSuccess: () => void }) {
  const [formData, setFormData] = useState<{
    category: FAQCategory;
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
        <label className="text-sm font-medium">Category</label>
        <Select
          value={formData.category}
          onValueChange={(v) => setFormData(prev => ({ ...prev, category: v as FAQCategory }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {faqCategories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Question</label>
        <Input
          placeholder="e.g., What are your business hours?"
          value={formData.question}
          onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Answer</label>
        <Textarea
          placeholder="Enter the answer your AI should give..."
          value={formData.answer}
          onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Keywords (optional)</label>
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
