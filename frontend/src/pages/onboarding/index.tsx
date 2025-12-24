import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { 
  Building2, Clock, Users, Bot, Check, ArrowRight, 
  ArrowLeft, Sparkles, Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/form-elements';
import { Logo } from '@/components/shared/loading-screen';
import { cn } from '@/lib/utils';
import { post } from '@/lib/api/client';
import { useAuth } from '@/features/auth/auth-provider';
import { toast } from 'sonner';

const steps = [
  { id: 1, title: 'Business Info', icon: Building2 },
  { id: 2, title: 'Hours', icon: Clock },
  { id: 3, title: 'Staff', icon: Users },
  { id: 4, title: 'AI Setup', icon: Bot },
  { id: 5, title: 'Complete', icon: Check },
];

const industries = [
  { value: 'healthcare', label: 'Healthcare / Medical' },
  { value: 'dental', label: 'Dental' },
  { value: 'salon', label: 'Salon & Spa' },
  { value: 'fitness', label: 'Fitness & Wellness' },
  { value: 'legal', label: 'Legal Services' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' },
];

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
];

const voiceStyles = [
  { value: 'professional_female', label: 'Professional Female', description: 'Clear, professional tone' },
  { value: 'friendly_female', label: 'Friendly Female', description: 'Warm, approachable tone' },
  { value: 'professional_male', label: 'Professional Male', description: 'Clear, professional tone' },
  { value: 'friendly_male', label: 'Friendly Male', description: 'Warm, approachable tone' },
];

interface OnboardingFormData {
  // Step 1: Business Info
  business_name: string;
  industry: string;
  phone_number: string;
  timezone: string;
  
  // Step 2: Hours
  hours: Array<{
    day_of_week: number;
    is_open: boolean;
    open_time: string;
    close_time: string;
  }>;
  
  // Step 3: Staff
  staff: Array<{
    name: string;
    title: string;
  }>;
  
  // Step 4: AI Setup
  ai_name: string;
  voice_style: string;
  greeting_message: string;
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<OnboardingFormData>({
    defaultValues: {
      business_name: '',
      industry: '',
      phone_number: '',
      timezone: 'America/New_York',
      hours: [
        { day_of_week: 1, is_open: true, open_time: '09:00', close_time: '17:00' }, // Monday
        { day_of_week: 2, is_open: true, open_time: '09:00', close_time: '17:00' }, // Tuesday
        { day_of_week: 3, is_open: true, open_time: '09:00', close_time: '17:00' }, // Wednesday
        { day_of_week: 4, is_open: true, open_time: '09:00', close_time: '17:00' }, // Thursday
        { day_of_week: 5, is_open: true, open_time: '09:00', close_time: '17:00' }, // Friday
        { day_of_week: 6, is_open: false, open_time: '09:00', close_time: '17:00' }, // Saturday
        { day_of_week: 0, is_open: false, open_time: '09:00', close_time: '17:00' }, // Sunday
      ],
      staff: [{ name: '', title: '' }],
      ai_name: 'Sarah',
      voice_style: 'professional_female',
      greeting_message: 'Thank you for calling. This is Sarah, your virtual assistant. How can I help you today?',
    },
  });

  const nextStep = async () => {
    if (currentStep === 1) {
      // Validate and create business
      const formData = watch();
      if (!formData.business_name || !formData.industry) {
        toast.error('Please fill in all required fields');
        return;
      }

      setIsLoading(true);
      try {
        const business = await post('/api/businesses', {
          business_name: formData.business_name,
          industry: formData.industry,
          phone_number: formData.phone_number || null,
          timezone: formData.timezone,
          owner_email: user?.email,
        });
        setBusinessId(business.id);
        toast.success('Business created!');
        setCurrentStep(2);
      } catch (error: any) {
        toast.error('Failed to create business', {
          description: error.response?.data?.detail || 'Please try again',
        });
      } finally {
        setIsLoading(false);
      }
    } else if (currentStep === 2) {
      // Save business hours
      if (!businessId) {
        toast.error('Business not found');
        return;
      }

      setIsLoading(true);
      try {
        const hours = watch('hours');
        await post(`/api/business-hours/${businessId}`, {
          business_id: businessId,
          hours: hours.map(h => ({
            day_of_week: h.day_of_week,
            is_open: h.is_open,
            open_time: h.is_open ? h.open_time : null,
            close_time: h.is_open ? h.close_time : null,
          })),
        });
        toast.success('Business hours saved!');
        setCurrentStep(3);
      } catch (error: any) {
        toast.error('Failed to save business hours', {
          description: error.response?.data?.detail || 'Please try again',
        });
      } finally {
        setIsLoading(false);
      }
    } else if (currentStep === 3) {
      // Save staff (optional - can skip)
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Save AI config and staff
      if (!businessId) {
        toast.error('Business not found');
        return;
      }

      setIsLoading(true);
      try {
        const formData = watch();
        
        // Create staff members
        const staffPromises = formData.staff
          .filter(s => s.name && s.title)
          .map(staff => post('/api/staff', {
            business_id: businessId,
            name: staff.name,
            title: staff.title,
          }));
        
        await Promise.all(staffPromises);

        // Create AI role
        await post('/api/ai/roles', {
          business_id: businessId,
          role_type: 'receptionist',
          ai_name: formData.ai_name,
          voice_style: formData.voice_style,
          system_prompt: `You are ${formData.ai_name}, a professional AI receptionist for ${formData.business_name}. You help customers schedule appointments, answer questions, and provide excellent service.`,
          greeting_message: formData.greeting_message,
          is_enabled: true,
        });

        // Refresh user data to get business_id
        await refreshUser();
        
        toast.success('Setup complete!');
        setCurrentStep(5);
      } catch (error: any) {
        toast.error('Failed to complete setup', {
          description: error.response?.data?.detail || 'Please try again',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    // Wait a moment for user data to refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-background to-secondary-50 dark:from-background dark:via-background dark:to-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Logo size="lg" />
          <h1 className="mt-6 text-2xl font-bold font-display">Let's set up your AI receptionist</h1>
          <p className="text-muted-foreground mt-2">This will only take a few minutes</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                  currentStep > step.id
                    ? 'bg-primary border-primary text-primary-foreground'
                    : currentStep === step.id
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-muted text-muted-foreground'
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-12 h-0.5 mx-2',
                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 1 && <BusinessInfoStep control={control} errors={errors} />}
              {currentStep === 2 && <HoursStep control={control} watch={watch} />}
              {currentStep === 3 && <StaffStep control={control} setValue={setValue} watch={watch} />}
              {currentStep === 4 && <AISetupStep control={control} watch={watch} businessName={watch('business_name')} />}
              {currentStep === 5 && <CompleteStep />}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1 || isLoading}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Back
            </Button>

            {currentStep < 5 ? (
              <Button onClick={nextStep} loading={isLoading} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Continue
              </Button>
            ) : (
              <Button onClick={handleComplete} loading={isLoading}>
                <Sparkles className="h-4 w-4 mr-2" />
                Launch My AI Receptionist
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// Step 1: Business Info
function BusinessInfoStep({ control, errors }: { control: any; errors: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold font-display">Tell us about your business</h2>
        <p className="text-muted-foreground mt-1">This helps us customize the AI for your industry</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Business Name *</label>
          <Controller
            name="business_name"
            control={control}
            rules={{ required: 'Business name is required' }}
            render={({ field }) => (
              <Input placeholder="e.g., Smile Dental Clinic" {...field} />
            )}
          />
          {errors.business_name && (
            <p className="text-xs text-destructive">{errors.business_name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Industry *</label>
          <Controller
            name="industry"
            control={control}
            rules={{ required: 'Industry is required' }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.industry && (
            <p className="text-xs text-destructive">{errors.industry.message}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Phone Number</label>
            <Controller
              name="phone_number"
              control={control}
              render={({ field }) => (
                <Input type="tel" placeholder="+1 (555) 000-0000" {...field} />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Timezone *</label>
            <Controller
              name="timezone"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 2: Hours
function HoursStep({ control, watch }: { control: any; watch: any }) {
  const days = [
    { name: 'Sunday', value: 0 },
    { name: 'Monday', value: 1 },
    { name: 'Tuesday', value: 2 },
    { name: 'Wednesday', value: 3 },
    { name: 'Thursday', value: 4 },
    { name: 'Friday', value: 5 },
    { name: 'Saturday', value: 6 },
  ];

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  const hours = watch('hours') || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold font-display">Set your business hours</h2>
        <p className="text-muted-foreground mt-1">The AI will use these to schedule appointments</p>
      </div>

      <div className="space-y-3">
        {days.map((day) => {
          const dayHour = hours.find((h: any) => h.day_of_week === day.value) || hours[day.value];
          const isOpen = dayHour?.is_open ?? false;
          
          return (
            <div key={day.value} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <Controller
                name={`hours.${day.value}.is_open`}
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <span className="w-24 font-medium">{day.name}</span>
              <Controller
                name={`hours.${day.value}.open_time`}
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!isOpen}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <span className="text-muted-foreground">to</span>
              <Controller
                name={`hours.${day.value}.close_time`}
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!isOpen}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Step 3: Staff
function StaffStep({ control, setValue, watch }: { control: any; setValue: any; watch: any }) {
  const staff = watch('staff') || [{ name: '', title: '' }];

  const addStaff = () => {
    const current = watch('staff') || [];
    setValue('staff', [...current, { name: '', title: '' }]);
  };

  const removeStaff = (index: number) => {
    const current = watch('staff') || [];
    setValue('staff', current.filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold font-display">Add your team</h2>
        <p className="text-muted-foreground mt-1">Staff members who can be booked for appointments</p>
      </div>

      <div className="space-y-4">
        {staff.map((_: any, index: number) => (
          <div key={index} className="grid gap-4 sm:grid-cols-2 p-4 rounded-lg bg-muted/50">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <Controller
                name={`staff.${index}.name`}
                control={control}
                render={({ field }) => (
                  <Input placeholder="e.g., Dr. Sarah Wilson" {...field} />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Controller
                name={`staff.${index}.title`}
                control={control}
                render={({ field }) => (
                  <Input placeholder="e.g., Senior Dentist" {...field} />
                )}
              />
            </div>
            {staff.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeStaff(index)}
                className="col-span-2"
              >
                Remove
              </Button>
            )}
          </div>
        ))}

        <Button variant="outline" onClick={addStaff} className="w-full">
          + Add Another Staff Member
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        You can add more staff and configure their schedules later
      </p>
    </div>
  );
}

// Step 4: AI Setup
function AISetupStep({ control, watch, businessName }: { control: any; watch: any; businessName: string }) {
  const selectedVoice = watch('voice_style') || 'professional_female';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold font-display">Configure your AI</h2>
        <p className="text-muted-foreground mt-1">Choose how your AI receptionist sounds and behaves</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">AI Name</label>
          <Controller
            name="ai_name"
            control={control}
            render={({ field }) => (
              <Input placeholder="e.g., Sarah" {...field} />
            )}
          />
          <p className="text-xs text-muted-foreground">This is how the AI will introduce itself</p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Voice Style</label>
          <div className="grid gap-3 sm:grid-cols-2">
            {voiceStyles.map((voice) => (
              <Controller
                key={voice.value}
                name="voice_style"
                control={control}
                render={({ field }) => (
                  <button
                    type="button"
                    onClick={() => field.onChange(voice.value)}
                    className={cn(
                      'p-4 rounded-lg border-2 text-left transition-all',
                      selectedVoice === voice.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{voice.label}</span>
                      {selectedVoice === voice.value && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{voice.description}</p>
                  </button>
                )}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Greeting Message</label>
          <Controller
            name="greeting_message"
            control={control}
            render={({ field }) => (
              <textarea
                className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                placeholder={`Thank you for calling ${businessName || '[Business Name]'}. This is ${watch('ai_name') || 'Sarah'}, your virtual assistant. How can I help you today?`}
                {...field}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}

// Step 5: Complete
function CompleteStep() {
  return (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success-100 mb-6">
        <Check className="h-10 w-10 text-success-600" />
      </div>

      <h2 className="text-2xl font-bold font-display mb-2">You're all set!</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Your AI receptionist is ready to start taking calls. Here's what happens next:
      </p>

      <div className="grid gap-4 sm:grid-cols-3 text-left max-w-2xl mx-auto">
        {[
          {
            icon: Phone,
            title: 'Get Your Number',
            description: "We'll assign a phone number for your AI",
          },
          {
            icon: Bot,
            title: 'AI Goes Live',
            description: 'Start receiving calls immediately',
          },
          {
            icon: Sparkles,
            title: 'Keep Improving',
            description: 'Review calls and train your AI',
          },
        ].map((item) => (
          <div key={item.title} className="p-4 rounded-lg bg-muted/50">
            <item.icon className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
