import { useState, useEffect } from 'react';
import {
  User,
  CreditCard,
  Save,
  Shield,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/auth-provider';
import { useBusiness } from '@/lib/api/hooks';
import { cn } from '@/lib/utils';

const settingsSections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');

  return (
    <PageContainer
      title="Settings"
      description="Manage your account settings"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 shrink-0">
          <Card className="p-2">
            <nav className="space-y-1">
              {settingsSections.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeSection === item.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
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
          {activeSection === 'profile' && <ProfileSettings />}
          {activeSection === 'billing' && <BillingSettings />}
        </div>
      </div>
    </PageContainer>
  );
}

// Profile Settings (combined with Security)
function ProfileSettings() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('Profile updated');
    setIsSaving(false);
  };

  const handlePasswordSave = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setIsSavingPassword(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('Password updated');
    setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    setIsSavingPassword(false);
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Settings
          </CardTitle>
          <CardDescription>Manage your personal account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar using business logo */}
          <div className="flex items-center gap-4">
            {business?.logo_url ? (
              <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-border">
                <img
                  src={business.logo_url}
                  alt="Business logo"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                <Building2 className="h-8 w-8 text-primary/60" />
              </div>
            )}
            <div>
              <p className="font-medium">{user?.full_name || 'User'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
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
            <Button onClick={handleSave} loading={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Manage your password and account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Change Password</h4>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Current Password</label>
              <Input
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">New Password</label>
              <Input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Confirm New Password</label>
              <Input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handlePasswordSave}
                loading={isSavingPassword}
                disabled={!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password}
              >
                Update Password
              </Button>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
            </div>
            <Button variant="outline">Enable</Button>
          </div>
        </CardContent>
      </Card>
    </div>
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
