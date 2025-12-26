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
import type { Business } from '@/types';

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
  { value: 'airlines', label: 'Airlines / Aviation' },
  { value: 'hotel', label: 'Hotels / Hospitality' },
  { value: 'restaurant', label: 'Restaurants / Food Service' },
  { value: 'retail', label: 'Retail / E-commerce' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'automotive', label: 'Automotive / Car Dealership' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'financial', label: 'Financial Services / Banking' },
  { value: 'education', label: 'Education / Schools' },
  { value: 'veterinary', label: 'Veterinary / Pet Care' },
  { value: 'home_services', label: 'Home Services / Contractors' },
  { value: 'beauty', label: 'Beauty / Cosmetics' },
  { value: 'travel', label: 'Travel / Tourism' },
  { value: 'event_planning', label: 'Event Planning / Catering' },
  { value: 'nonprofit', label: 'Nonprofit / Charity' },
  { value: 'technology', label: 'Technology / IT Services' },
  { value: 'other', label: 'Other' },
];

// Get server timezone (defaults to UTC if not available)
// Calculate once outside component to avoid calling during render
const DEFAULT_TIMEZONE = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
})();

// Comprehensive worldwide timezones
const timezones = [
  // Americas
  { value: 'America/New_York', label: 'Eastern Time (ET) - New York' },
  { value: 'America/Chicago', label: 'Central Time (CT) - Chicago' },
  { value: 'America/Denver', label: 'Mountain Time (MT) - Denver' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT) - Los Angeles' },
  { value: 'America/Phoenix', label: 'Mountain Time (MST) - Phoenix' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT) - Anchorage' },
  { value: 'America/Honolulu', label: 'Hawaii Time (HST) - Honolulu' },
  { value: 'America/Toronto', label: 'Eastern Time - Toronto' },
  { value: 'America/Vancouver', label: 'Pacific Time - Vancouver' },
  { value: 'America/Mexico_City', label: 'Central Time - Mexico City' },
  { value: 'America/Sao_Paulo', label: 'Brasília Time - São Paulo' },
  { value: 'America/Buenos_Aires', label: 'Argentina Time - Buenos Aires' },
  { value: 'America/Lima', label: 'Peru Time - Lima' },
  { value: 'America/Santiago', label: 'Chile Time - Santiago' },
  // Europe
  { value: 'Europe/London', label: 'GMT - London' },
  { value: 'Europe/Paris', label: 'CET - Paris' },
  { value: 'Europe/Berlin', label: 'CET - Berlin' },
  { value: 'Europe/Rome', label: 'CET - Rome' },
  { value: 'Europe/Madrid', label: 'CET - Madrid' },
  { value: 'Europe/Amsterdam', label: 'CET - Amsterdam' },
  { value: 'Europe/Brussels', label: 'CET - Brussels' },
  { value: 'Europe/Vienna', label: 'CET - Vienna' },
  { value: 'Europe/Zurich', label: 'CET - Zurich' },
  { value: 'Europe/Stockholm', label: 'CET - Stockholm' },
  { value: 'Europe/Oslo', label: 'CET - Oslo' },
  { value: 'Europe/Copenhagen', label: 'CET - Copenhagen' },
  { value: 'Europe/Helsinki', label: 'EET - Helsinki' },
  { value: 'Europe/Warsaw', label: 'CET - Warsaw' },
  { value: 'Europe/Prague', label: 'CET - Prague' },
  { value: 'Europe/Budapest', label: 'CET - Budapest' },
  { value: 'Europe/Bucharest', label: 'EET - Bucharest' },
  { value: 'Europe/Athens', label: 'EET - Athens' },
  { value: 'Europe/Istanbul', label: 'TRT - Istanbul' },
  { value: 'Europe/Moscow', label: 'MSK - Moscow' },
  { value: 'Europe/Dublin', label: 'GMT - Dublin' },
  { value: 'Europe/Lisbon', label: 'WET - Lisbon' },
  // Asia
  { value: 'Asia/Dubai', label: 'GST - Dubai' },
  { value: 'Asia/Riyadh', label: 'AST - Riyadh' },
  { value: 'Asia/Tehran', label: 'IRST - Tehran' },
  { value: 'Asia/Karachi', label: 'PKT - Karachi' },
  { value: 'Asia/Dhaka', label: 'BST - Dhaka' },
  { value: 'Asia/Kolkata', label: 'IST - Mumbai / New Delhi' },
  { value: 'Asia/Colombo', label: 'IST - Colombo' },
  { value: 'Asia/Kathmandu', label: 'NPT - Kathmandu' },
  { value: 'Asia/Yangon', label: 'MMT - Yangon' },
  { value: 'Asia/Bangkok', label: 'ICT - Bangkok' },
  { value: 'Asia/Ho_Chi_Minh', label: 'ICT - Ho Chi Minh' },
  { value: 'Asia/Jakarta', label: 'WIB - Jakarta' },
  { value: 'Asia/Manila', label: 'PHT - Manila' },
  { value: 'Asia/Singapore', label: 'SGT - Singapore' },
  { value: 'Asia/Kuala_Lumpur', label: 'MYT - Kuala Lumpur' },
  { value: 'Asia/Hong_Kong', label: 'HKT - Hong Kong' },
  { value: 'Asia/Shanghai', label: 'CST - Shanghai / Beijing' },
  { value: 'Asia/Taipei', label: 'CST - Taipei' },
  { value: 'Asia/Seoul', label: 'KST - Seoul' },
  { value: 'Asia/Tokyo', label: 'JST - Tokyo' },
  { value: 'Asia/Ulaanbaatar', label: 'ULAT - Ulaanbaatar' },
  // Oceania
  { value: 'Australia/Sydney', label: 'AEDT - Sydney' },
  { value: 'Australia/Melbourne', label: 'AEDT - Melbourne' },
  { value: 'Australia/Brisbane', label: 'AEST - Brisbane' },
  { value: 'Australia/Perth', label: 'AWST - Perth' },
  { value: 'Australia/Adelaide', label: 'ACDT - Adelaide' },
  { value: 'Pacific/Auckland', label: 'NZDT - Auckland' },
  { value: 'Pacific/Honolulu', label: 'HST - Honolulu' },
  // Africa
  { value: 'Africa/Cairo', label: 'EET - Cairo' },
  { value: 'Africa/Johannesburg', label: 'SAST - Johannesburg' },
  { value: 'Africa/Lagos', label: 'WAT - Lagos' },
  { value: 'Africa/Nairobi', label: 'EAT - Nairobi' },
  { value: 'Africa/Casablanca', label: 'WET - Casablanca' },
  // UTC
  { value: 'UTC', label: 'UTC - Coordinated Universal Time' },
];

// Phone number country codes
const countryCodes = [
  { value: '+90', label: '🇹🇷 Turkey (+90)', default: true },
  { value: '+1', label: '🇺🇸 United States / Canada (+1)' },
  { value: '+44', label: '🇬🇧 United Kingdom (+44)' },
  { value: '+49', label: '🇩🇪 Germany (+49)' },
  { value: '+33', label: '🇫🇷 France (+33)' },
  { value: '+39', label: '🇮🇹 Italy (+39)' },
  { value: '+34', label: '🇪🇸 Spain (+34)' },
  { value: '+31', label: '🇳🇱 Netherlands (+31)' },
  { value: '+32', label: '🇧🇪 Belgium (+32)' },
  { value: '+41', label: '🇨🇭 Switzerland (+41)' },
  { value: '+43', label: '🇦🇹 Austria (+43)' },
  { value: '+46', label: '🇸🇪 Sweden (+46)' },
  { value: '+47', label: '🇳🇴 Norway (+47)' },
  { value: '+45', label: '🇩🇰 Denmark (+45)' },
  { value: '+358', label: '🇫🇮 Finland (+358)' },
  { value: '+48', label: '🇵🇱 Poland (+48)' },
  { value: '+420', label: '🇨🇿 Czech Republic (+420)' },
  { value: '+36', label: '🇭🇺 Hungary (+36)' },
  { value: '+40', label: '🇷🇴 Romania (+40)' },
  { value: '+30', label: '🇬🇷 Greece (+30)' },
  { value: '+7', label: '🇷🇺 Russia (+7)' },
  { value: '+353', label: '🇮🇪 Ireland (+353)' },
  { value: '+351', label: '🇵🇹 Portugal (+351)' },
  { value: '+971', label: '🇦🇪 UAE (+971)' },
  { value: '+966', label: '🇸🇦 Saudi Arabia (+966)' },
  { value: '+974', label: '🇶🇦 Qatar (+974)' },
  { value: '+965', label: '🇰🇼 Kuwait (+965)' },
  { value: '+973', label: '🇧🇭 Bahrain (+973)' },
  { value: '+968', label: '🇴🇲 Oman (+968)' },
  { value: '+961', label: '🇱🇧 Lebanon (+961)' },
  { value: '+962', label: '🇯🇴 Jordan (+962)' },
  { value: '+972', label: '🇮🇱 Israel (+972)' },
  { value: '+98', label: '🇮🇷 Iran (+98)' },
  { value: '+92', label: '🇵🇰 Pakistan (+92)' },
  { value: '+880', label: '🇧🇩 Bangladesh (+880)' },
  { value: '+91', label: '🇮🇳 India (+91)' },
  { value: '+94', label: '🇱🇰 Sri Lanka (+94)' },
  { value: '+977', label: '🇳🇵 Nepal (+977)' },
  { value: '+95', label: '🇲🇲 Myanmar (+95)' },
  { value: '+66', label: '🇹🇭 Thailand (+66)' },
  { value: '+84', label: '🇻🇳 Vietnam (+84)' },
  { value: '+62', label: '🇮🇩 Indonesia (+62)' },
  { value: '+63', label: '🇵🇭 Philippines (+63)' },
  { value: '+65', label: '🇸🇬 Singapore (+65)' },
  { value: '+60', label: '🇲🇾 Malaysia (+60)' },
  { value: '+852', label: '🇭🇰 Hong Kong (+852)' },
  { value: '+86', label: '🇨🇳 China (+86)' },
  { value: '+886', label: '🇹🇼 Taiwan (+886)' },
  { value: '+82', label: '🇰🇷 South Korea (+82)' },
  { value: '+81', label: '🇯🇵 Japan (+81)' },
  { value: '+61', label: '🇦🇺 Australia (+61)' },
  { value: '+64', label: '🇳🇿 New Zealand (+64)' },
  { value: '+20', label: '🇪🇬 Egypt (+20)' },
  { value: '+27', label: '🇿🇦 South Africa (+27)' },
  { value: '+234', label: '🇳🇬 Nigeria (+234)' },
  { value: '+254', label: '🇰🇪 Kenya (+254)' },
  { value: '+212', label: '🇲🇦 Morocco (+212)' },
  { value: '+55', label: '🇧🇷 Brazil (+55)' },
  { value: '+52', label: '🇲🇽 Mexico (+52)' },
  { value: '+54', label: '🇦🇷 Argentina (+54)' },
  { value: '+51', label: '🇵🇪 Peru (+51)' },
  { value: '+56', label: '🇨🇱 Chile (+56)' },
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
  phone_country_code: string;
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
      phone_country_code: '+90', // Turkey default
      phone_number: '',
      timezone: DEFAULT_TIMEZONE,
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
        // Combine country code and phone number
        let fullPhoneNumber = null;
        if (formData.phone_number) {
          // Remove spaces and any leading +, then add selected country code
          const cleanNumber = formData.phone_number.replace(/\s+/g, '').replace(/^\+/, '');
          fullPhoneNumber = `${formData.phone_country_code}${cleanNumber}`;
        }
        
        const business = await post<Business>('/api/businesses', {
          business_name: formData.business_name,
          industry: formData.industry,
          phone_number: fullPhoneNumber,
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
          role_type: 'assistant',
          ai_name: formData.ai_name,
          voice_style: formData.voice_style,
          system_prompt: `You are ${formData.ai_name}, a professional AI assistant for ${formData.business_name}. You help customers schedule appointments, answer questions, and provide excellent service.`,
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
          <h1 className="mt-6 text-2xl font-bold font-display">Let's set up your AI assistant</h1>
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
              {currentStep === 4 && <AISetupStep control={control} watch={watch} />}
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
                Launch My AI Assistant
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

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Phone Number</label>
            <div className="flex gap-2">
              <Controller
                name="phone_country_code"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {countryCodes.map((code) => (
                        <SelectItem key={`${code.value}-${code.label}`} value={code.value}>
                          {code.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Controller
                name="phone_number"
                control={control}
                render={({ field }) => (
                  <Input 
                    type="tel" 
                    placeholder="555 123 4567" 
                    className="flex-1"
                    {...field} 
                  />
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">Optional - for business contact</p>
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
                  <SelectContent className="max-h-[400px]">
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
function AISetupStep({ control, watch }: { control: any; watch: any }) {
  const selectedVoice = watch('voice_style') || 'professional_female';
  const businessName = watch('business_name') || '[Business Name]';
  const aiName = watch('ai_name') || 'Sarah';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold font-display">Configure your AI</h2>
        <p className="text-muted-foreground mt-1">Choose how your AI assistant sounds and behaves</p>
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
                placeholder={`Thank you for calling ${businessName}. This is ${aiName}, your virtual assistant. How can I help you today?`}
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
        Your AI assistant is ready to start taking calls. Here's what happens next:
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
