import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Building2, Clock, CreditCard, Users, Bell, 
  Shield, Palette, Globe, Save, Upload
} from 'lucide-react';
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
import { Separator } from '@/components/ui/skeleton';

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

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
          {activeTab === 'profile' && <ProfileSettings onSave={handleSave} isSaving={isSaving} />}
          {activeTab === 'business' && <BusinessSettings onSave={handleSave} isSaving={isSaving} />}
          {activeTab === 'hours' && <HoursSettings onSave={handleSave} isSaving={isSaving} />}
          {activeTab === 'billing' && <BillingSettings />}
          {activeTab === 'team' && <TeamSettings />}
          {activeTab === 'notifications' && <NotificationSettings onSave={handleSave} isSaving={isSaving} />}
          {activeTab === 'security' && <SecuritySettings onSave={handleSave} isSaving={isSaving} />}
        </div>
      </div>
    </PageContainer>
  );
}

// Profile Settings
function ProfileSettings({ onSave, isSaving }: { onSave: () => void; isSaving: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Manage your personal account information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <Avatar name="John Doe" size="2xl" />
          <div>
            <Button variant="outline" size="sm" leftIcon={<Upload className="h-4 w-4" />}>
              Upload Photo
            </Button>
            <p className="text-xs text-muted-foreground mt-2">JPG, PNG up to 5MB</p>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">First Name</label>
            <Input defaultValue="John" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Last Name</label>
            <Input defaultValue="Doe" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email</label>
          <Input type="email" defaultValue="john@example.com" />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Phone</label>
          <Input type="tel" defaultValue="+1 (555) 123-4567" />
        </div>

        <div className="flex justify-end">
          <Button onClick={onSave} loading={isSaving} leftIcon={<Save className="h-4 w-4" />}>
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Business Settings
function BusinessSettings({ onSave, isSaving }: { onSave: () => void; isSaving: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Settings</CardTitle>
        <CardDescription>Configure your business information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Business Name</label>
          <Input defaultValue="Smile Dental Clinic" />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Industry</label>
          <Select defaultValue="healthcare">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="salon">Salon & Spa</SelectItem>
              <SelectItem value="fitness">Fitness</SelectItem>
              <SelectItem value="legal">Legal Services</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Timezone</label>
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
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Default Language</label>
            <Select defaultValue="en">
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
          <Input defaultValue="123 Main Street" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">City</label>
            <Input defaultValue="New York" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">State</label>
            <Input defaultValue="NY" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">ZIP Code</label>
            <Input defaultValue="10001" />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onSave} loading={isSaving} leftIcon={<Save className="h-4 w-4" />}>
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Hours Settings
function HoursSettings({ onSave, isSaving }: { onSave: () => void; isSaving: boolean }) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Hours</CardTitle>
        <CardDescription>Set your regular operating hours</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {days.map((day, i) => (
          <div key={day} className="flex items-center gap-4 p-3 rounded-lg border border-border">
            <Switch defaultChecked={i < 5} />
            <span className="w-24 font-medium">{day}</span>
            <Select defaultValue="09:00">
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['08:00', '09:00', '10:00'].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">to</span>
            <Select defaultValue={i === 4 ? '15:00' : '17:00'}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['15:00', '17:00', '18:00', '19:00'].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}

        <div className="flex justify-end pt-4">
          <Button onClick={onSave} loading={isSaving} leftIcon={<Save className="h-4 w-4" />}>
            Save Hours
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Billing Settings
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

// Team Settings
function TeamSettings() {
  const teamMembers = [
    { name: 'John Doe', email: 'john@example.com', role: 'Owner' },
    { name: 'Jane Smith', email: 'jane@example.com', role: 'Admin' },
    { name: 'Bob Johnson', email: 'bob@example.com', role: 'Staff' },
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
function NotificationSettings({ onSave, isSaving }: { onSave: () => void; isSaving: boolean }) {
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
          <Button onClick={onSave} loading={isSaving} leftIcon={<Save className="h-4 w-4" />}>
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Security Settings
function SecuritySettings({ onSave, isSaving }: { onSave: () => void; isSaving: boolean }) {
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
            <Button onClick={onSave} loading={isSaving}>Update Password</Button>
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
