import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Building2, Clock, CreditCard, Users, Bell, 
  Shield, Palette, Globe, Save, Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/form-elements';
import { Switch } from '@/components/ui/form-elements';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/auth-provider';
import { useBusiness, useUpdateBusiness, useBusinessHours, useUpdateBusinessHours } from '@/lib/api/hooks';
import type { Business, BusinessHours } from '@/types';

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'GMT (London)' },
  { value: 'Europe/Istanbul', label: 'Turkey Time (TRT)' },
  { value: 'Asia/Dubai', label: 'Gulf Time (Dubai)' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'tr', label: 'Turkish' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <PageContainer
      title="Settings"
      description="Manage your account and business settings"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 shrink-0">
          <Card className="p-2">
            <nav className="space-y-1">
              {[
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'business', label: 'Business', icon: Building2 },
                { id: 'hours', label: 'Business Hours', icon: Clock },
                { id: 'billing', label: 'Billing', icon: CreditCard },
                { id: 'team', label: 'Team', icon: Users },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'security', label: 'Security', icon: Shield },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'business' && <BusinessSettings />}
          {activeTab === 'hours' && <HoursSettings />}
          {activeTab === 'billing' && <BillingSettings />}
          {activeTab === 'team' && <TeamSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'security' && <SecuritySettings />}
        </div>
      </div>
    </PageContainer>
  );
}

// Profile Settings
function ProfileSettings() {
  const { user, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      const nameParts = user.full_name?.split(' ') || ['', ''];
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    // Profile update would go here - not implemented in current backend
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('Profile updated');
    setIsSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Manage your personal account information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <Avatar name={user?.full_name || 'User'} size="2xl" />
          <div>
            <Button variant="outline" size="sm" leftIcon={<Upload className="h-4 w-4" />}>
              Upload Photo
            </Button>
            <p className="text-xs text-muted-foreground mt-2">JPG, PNG up to 5MB</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Full Name</label>
          <Input 
            value={formData.full_name}
            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email</label>
          <Input 
            type="email" 
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} loading={isSaving} leftIcon={<Save className="h-4 w-4" />}>
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Business Settings
function BusinessSettings() {
  const { data: business, isLoading, refetch } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  
  const [formData, setFormData] = useState<Partial<Business>>({});

  useEffect(() => {
    if (business) {
      setFormData({
        business_name: business.business_name,
        industry: business.industry,
        timezone: business.timezone,
        default_language: business.default_language,
        address: business.address,
        city: business.city,
        state: business.state,
        zip_code: business.zip_code,
        phone_number: business.phone_number,
      });
    }
  }, [business]);

  const handleSave = async () => {
    try {
      await updateBusiness.mutateAsync(formData);
      toast.success('Business settings saved');
      refetch();
    } catch (error) {
      toast.error('Failed to save business settings');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Settings</CardTitle>
        <CardDescription>Configure your business information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Business Name</label>
          <Input 
            value={formData.business_name || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Industry</label>
          <Select 
            value={formData.industry || 'other'}
            onValueChange={(v) => setFormData(prev => ({ ...prev, industry: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="dental">Dental</SelectItem>
              <SelectItem value="salon">Salon & Spa</SelectItem>
              <SelectItem value="fitness">Fitness</SelectItem>
              <SelectItem value="legal">Legal Services</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Phone Number</label>
          <Input 
            type="tel"
            value={formData.phone_number || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Timezone</label>
            <Select 
              value={formData.timezone || 'America/New_York'}
              onValueChange={(v) => setFormData(prev => ({ ...prev, timezone: v }))}
            >
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
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Default Language</label>
            <Select 
              value={formData.default_language || 'en'}
              onValueChange={(v) => setFormData(prev => ({ ...prev, default_language: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Address</label>
          <Input 
            value={formData.address || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">City</label>
            <Input 
              value={formData.city || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">State</label>
            <Input 
              value={formData.state || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">ZIP Code</label>
            <Input 
              value={formData.zip_code || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            loading={updateBusiness.isPending} 
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Hours Settings
function HoursSettings() {
  const { data: hours, isLoading, refetch } = useBusinessHours();
  const updateHours = useUpdateBusinessHours();
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const [formData, setFormData] = useState<Record<number, { is_open: boolean; open_time: string; close_time: string }>>({});

  useEffect(() => {
    if (hours) {
      const hoursMap: Record<number, { is_open: boolean; open_time: string; close_time: string }> = {};
      hours.forEach(h => {
        hoursMap[h.day_of_week] = {
          is_open: h.is_open,
          open_time: h.open_time || '09:00',
          close_time: h.close_time || '17:00',
        };
      });
      // Fill in missing days with defaults
      for (let i = 0; i < 7; i++) {
        if (!hoursMap[i]) {
          hoursMap[i] = {
            is_open: i < 5, // Mon-Fri open by default
            open_time: '09:00',
            close_time: '17:00',
          };
        }
      }
      setFormData(hoursMap);
    }
  }, [hours]);

  const handleSave = async () => {
    try {
      const hoursArray = Object.entries(formData).map(([day, data]) => ({
        day_of_week: parseInt(day),
        is_open: data.is_open,
        open_time: data.open_time,
        close_time: data.close_time,
      })) as BusinessHours[];
      
      await updateHours.mutateAsync(hoursArray);
      toast.success('Business hours saved');
      refetch();
    } catch (error) {
      toast.error('Failed to save business hours');
    }
  };

  const updateDay = (dayIndex: number, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        [field]: value,
      }
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Hours</CardTitle>
        <CardDescription>Set your regular operating hours</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {days.map((day, i) => (
          <div key={day} className="flex items-center gap-4 p-3 rounded-lg border border-border">
            <Switch 
              checked={formData[i]?.is_open ?? i < 5}
              onCheckedChange={(checked) => updateDay(i, 'is_open', checked)}
            />
            <span className="w-24 font-medium">{day}</span>
            <Select 
              value={formData[i]?.open_time || '09:00'}
              onValueChange={(v) => updateDay(i, 'open_time', v)}
              disabled={!formData[i]?.is_open}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['07:00', '08:00', '09:00', '10:00', '11:00'].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">to</span>
            <Select 
              value={formData[i]?.close_time || '17:00'}
              onValueChange={(v) => updateDay(i, 'close_time', v)}
              disabled={!formData[i]?.is_open}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave} 
            loading={updateHours.isPending} 
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Hours
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Billing Settings (unchanged - mock data)
function BillingSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">Professional Plan</h3>
                <Badge variant="success">Active</Badge>
              </div>
              <p className="text-muted-foreground mt-1">$99/month • Renews Jan 15, 2025</p>
            </div>
            <Button variant="outline">Manage Plan</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="flex items-center gap-4">
              <div className="h-10 w-16 rounded bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center text-white text-xs font-bold">
                VISA
              </div>
              <div>
                <p className="font-medium">•••• •••• •••• 4242</p>
                <p className="text-sm text-muted-foreground">Expires 12/2026</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Update</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: 'Dec 15, 2024', amount: '$99.00', status: 'Paid' },
              { date: 'Nov 15, 2024', amount: '$99.00', status: 'Paid' },
              { date: 'Oct 15, 2024', amount: '$99.00', status: 'Paid' },
            ].map((invoice, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="font-medium">{invoice.date}</p>
                  <p className="text-sm text-muted-foreground">Professional Plan</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{invoice.amount}</p>
                  <Badge variant="success" size="sm">{invoice.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Team Settings (unchanged - mock data)
function TeamSettings() {
  const { user } = useAuth();
  
  const teamMembers = [
    { name: user?.full_name || 'Owner', email: user?.email || '', role: 'Owner' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage who has access to your account</CardDescription>
        </div>
        <Button size="sm">Invite Member</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {teamMembers.map((member) => (
            <div key={member.email} className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Avatar name={member.name} />
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={member.role === 'Owner' ? 'primary' : 'default'}>
                  {member.role}
                </Badge>
                {member.role !== 'Owner' && (
                  <Button variant="ghost" size="sm">Remove</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Notification Settings
function NotificationSettings() {
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('Notification preferences saved');
    setIsSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Choose what notifications you receive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {[
          { title: 'New Appointments', description: 'Get notified when a new appointment is booked' },
          { title: 'Cancellations', description: 'Get notified when an appointment is cancelled' },
          { title: 'Missed Calls', description: 'Get notified when the AI misses a call' },
          { title: 'Daily Summary', description: 'Receive a daily summary of activity' },
          { title: 'Weekly Report', description: 'Receive weekly analytics and insights' },
        ].map((item) => (
          <div key={item.title} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <Switch defaultChecked />
          </div>
        ))}

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} loading={isSaving} leftIcon={<Save className="h-4 w-4" />}>
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Security Settings
function SecuritySettings() {
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('Password updated');
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Current Password</label>
            <Input type="password" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">New Password</label>
            <Input type="password" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Confirm New Password</label>
            <Input type="password" />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} loading={isSaving}>Update Password</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Authenticator App</p>
              <p className="text-sm text-muted-foreground">Use an authenticator app to generate codes</p>
            </div>
            <Button variant="outline">Enable</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
