import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  CreditCard,
  Save,
  Shield,
  Building2,
  Calendar,
  Download,
  FileText,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/features/auth/auth-provider';
import { useBusiness } from '@/lib/api/hooks';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <PageContainer
      title="Settings"
      description="Manage your account settings"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="billing">
          <BillingSettings />
        </TabsContent>
      </Tabs>
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Profile Settings */}
        <Card className="h-fit">
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

        {/* Right Column - Security */}
        <Card className="h-fit">
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
    </motion.div>
  );
}

// Billing Settings - Two Column Layout
function BillingSettings() {
  const [dateFilter, setDateFilter] = useState('all');

  // Mock billing history data
  const allInvoices = [
    { id: '1', date: '2024-12-15', amount: 99.00, status: 'paid', plan: 'Professional Plan' },
    { id: '2', date: '2024-11-15', amount: 99.00, status: 'paid', plan: 'Professional Plan' },
    { id: '3', date: '2024-10-15', amount: 99.00, status: 'paid', plan: 'Professional Plan' },
    { id: '4', date: '2024-09-15', amount: 99.00, status: 'paid', plan: 'Professional Plan' },
    { id: '5', date: '2024-08-15', amount: 99.00, status: 'paid', plan: 'Professional Plan' },
    { id: '6', date: '2024-07-15', amount: 99.00, status: 'paid', plan: 'Professional Plan' },
    { id: '7', date: '2024-06-15', amount: 79.00, status: 'paid', plan: 'Starter Plan' },
    { id: '8', date: '2024-05-15', amount: 79.00, status: 'paid', plan: 'Starter Plan' },
    { id: '9', date: '2024-04-15', amount: 79.00, status: 'paid', plan: 'Starter Plan' },
  ];

  // Filter invoices based on date selection
  const filteredInvoices = useMemo(() => {
    if (dateFilter === 'all') return allInvoices;

    const now = new Date();
    let startDate: Date;
    let endDate = now;

    switch (dateFilter) {
      case 'this_month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'last_month':
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case 'last_3_months':
        startDate = subMonths(now, 3);
        break;
      case 'last_6_months':
        startDate = subMonths(now, 6);
        break;
      case 'last_year':
        startDate = subMonths(now, 12);
        break;
      default:
        return allInvoices;
    }

    return allInvoices.filter(invoice => {
      const invoiceDate = parseISO(invoice.date);
      return isWithinInterval(invoiceDate, { start: startDate, end: endDate });
    });
  }, [dateFilter]);

  const totalSpent = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Current Plan & Payment Method */}
        <div className="space-y-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold">Professional Plan</h3>
                    <Badge variant="success">Active</Badge>
                  </div>
                </div>
                <p className="text-2xl font-bold">$99<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                <p className="text-sm text-muted-foreground mt-1">Renews Jan 15, 2025</p>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">AI Minutes</p>
                      <p className="font-medium">500 / 1,000</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Staff Members</p>
                      <p className="font-medium">3 / 10</p>
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4">
                  Manage Plan
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-16 rounded bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center text-white text-xs font-bold">
                    VISA
                  </div>
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/2026</p>
                  </div>
                </div>
                <Badge variant="outline">Default</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">Update Card</Button>
                <Button variant="outline" className="flex-1">Add New</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Billing History */}
        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Billing History
              </CardTitle>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateFilter !== 'all' && (
              <p className="text-sm text-muted-foreground mt-2">
                {filteredInvoices.length} invoices • Total: ${totalSpent.toFixed(2)}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {filteredInvoices.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No invoices found for this period</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {filteredInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{format(parseISO(invoice.date), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">{invoice.plan}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-medium">${invoice.amount.toFixed(2)}</p>
                        <Badge variant="success" className="text-[10px] h-5">
                          {invoice.status === 'paid' ? 'Paid' : 'Pending'}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
