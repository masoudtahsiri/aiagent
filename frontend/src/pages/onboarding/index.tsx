import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
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
              {currentStep === 1 && <BusinessInfoStep />}
              {currentStep === 2 && <HoursStep />}
              {currentStep === 3 && <StaffStep />}
              {currentStep === 4 && <AISetupStep />}
              {currentStep === 5 && <CompleteStep />}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Back
            </Button>

            {currentStep < 5 ? (
              <Button onClick={nextStep} rightIcon={<ArrowRight className="h-4 w-4" />}>
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
function BusinessInfoStep() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold font-display">Tell us about your business</h2>
        <p className="text-muted-foreground mt-1">This helps us customize the AI for your industry</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Business Name *</label>
          <Input placeholder="e.g., Smile Dental Clinic" />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Industry *</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((ind) => (
                <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Phone Number</label>
            <Input type="tel" placeholder="+1 (555) 000-0000" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Timezone *</label>
            <Select defaultValue="America/New_York">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 2: Hours
function HoursStep() {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold font-display">Set your business hours</h2>
        <p className="text-muted-foreground mt-1">The AI will use these to schedule appointments</p>
      </div>

      <div className="space-y-3">
        {days.map((day, i) => (
          <div key={day} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <Switch defaultChecked={i < 5} />
            <span className="w-24 font-medium">{day}</span>
            <Select defaultValue="09:00">
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['08:00', '09:00', '10:00'].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">to</span>
            <Select defaultValue="17:00">
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['17:00', '18:00', '19:00', '20:00'].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

// Step 3: Staff
function StaffStep() {
  const [staffMembers, setStaffMembers] = useState([{ name: '', title: '' }]);

  const addStaff = () => {
    setStaffMembers([...staffMembers, { name: '', title: '' }]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold font-display">Add your team</h2>
        <p className="text-muted-foreground mt-1">Staff members who can be booked for appointments</p>
      </div>

      <div className="space-y-4">
        {staffMembers.map((_, index) => (
          <div key={index} className="grid gap-4 sm:grid-cols-2 p-4 rounded-lg bg-muted/50">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <Input placeholder="e.g., Dr. Sarah Wilson" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input placeholder="e.g., Senior Dentist" />
            </div>
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
function AISetupStep() {
  const [selectedVoice, setSelectedVoice] = useState('professional_female');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold font-display">Configure your AI</h2>
        <p className="text-muted-foreground mt-1">Choose how your AI receptionist sounds and behaves</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">AI Name</label>
          <Input placeholder="e.g., Sarah" defaultValue="Sarah" />
          <p className="text-xs text-muted-foreground">This is how the AI will introduce itself</p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Voice Style</label>
          <div className="grid gap-3 sm:grid-cols-2">
            {voiceStyles.map((voice) => (
              <button
                key={voice.value}
                onClick={() => setSelectedVoice(voice.value)}
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
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Greeting Message</label>
          <textarea
            className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
            defaultValue="Thank you for calling [Business Name]. This is Sarah, your virtual assistant. How can I help you today?"
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
            description: 'We'll assign a phone number for your AI',
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
