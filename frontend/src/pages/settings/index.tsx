import { useState, useEffect } from 'react';
import { Save, CreditCard } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { Button, Card, Input, Select, Tabs, Skeleton } from '@/components/ui';
import { useCurrentBusiness, useUpdateBusiness, useBusinessHours, useUpdateBusinessHours } from '@/lib/api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago', 
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
];

interface BusinessFormData {
  business_name: string;
  phone_number: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  timezone: string;
  industry: string;
}

interface HoursData {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

export default function SettingsPage() {
  const { data: business, isLoading: businessLoading } = useCurrentBusiness();
  const businessId = business?.id || '';
  
  const { data: hours, isLoading: hoursLoading } = useBusinessHours(businessId);
  
  const updateBusiness = useUpdateBusiness();
  const updateHours = useUpdateBusinessHours();

  const [activeTab, setActiveTab] = useState('business');
  const [businessForm, setBusinessForm] = useState<BusinessFormData>({
    business_name: '',
    phone_number: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'US',
    timezone: 'America/New_York',
    industry: '',
  });

  const [hoursForm, setHoursForm] = useState<HoursData[]>(
    DAYS.map((_, i) => ({
      day_of_week: i,
      is_open: i > 0 && i < 6, // Mon-Fri open by default
      open_time: '09:00',
      close_time: '17:00',
    }))
  );

  const [notifications, setNotifications] = useState({
    appointment_reminders: true,
    call_summaries: true,
    daily_digest: false,
    new_customer_alerts: true,
  });

  // Load business data
  useEffect(() => {
    if (business) {
      setBusinessForm({
        business_name: business.business_name || '',
        phone_number: business.phone_number || '',
        address: business.address || '',
        city: business.city || '',
        state: business.state || '',
        zip_code: business.zip_code || '',
        country: business.country || 'US',
        timezone: business.timezone || 'America/New_York',
        industry: business.industry || '',
      });
    }
  }, [business]);

  // Load hours data
  useEffect(() => {
    if (hours && hours.length > 0) {
      setHoursForm(
        DAYS.map((_, i) => {
          const dayHours = hours.find(h => h.day_of_week === i);
          return {
            day_of_week: i,
            is_open: dayHours?.is_open ?? (i > 0 && i < 6),
            open_time: dayHours?.open_time || '09:00',
            close_time: dayHours?.close_time || '17:00',
          };
        })
      );
    }
  }, [hours]);

  const handleSaveBusiness = async () => {
    if (!businessId) return;
    await updateBusiness.mutateAsync({
      id: businessId,
      data: businessForm,
    });
  };

  const handleSaveHours = async () => {
    if (!businessId) return;
    await updateHours.mutateAsync({
      businessId,
      hours: hoursForm.map(h => ({
        business_id: businessId,
        ...h,
      })),
    });
  };

  const updateHoursDay = (dayIndex: number, updates: Partial<HoursData>) => {
    setHoursForm(prev => prev.map((day, i) => 
      i === dayIndex ? { ...day, ...updates } : day
    ));
  };

  const isLoading = businessLoading || hoursLoading;

  if (isLoading) {
    return (
      <PageContainer title="Settings" description="Manage your business settings">
        <div className="space-y-4">
          <Skeleton variant="rectangular" className="h-12 w-64" />
          <Skeleton variant="rectangular" className="h-96" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Settings" description="Manage your business settings">
      <Tabs
        tabs={[
          { id: 'business', label: 'Business Info' },
          { id: 'hours', label: 'Business Hours' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'billing', label: 'Billing' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div className="mt-6">
        {activeTab === 'business' && (
          <Card>
            <Card.Header>
              <h3 className="font-medium">Business Information</h3>
            </Card.Header>
            <Card.Body className="space-y-4">
              <Input
                label="Business Name"
                value={businessForm.business_name}
                onChange={(e) => setBusinessForm({ ...businessForm, business_name: e.target.value })}
              />
              <Input
                label="Phone Number"
                value={businessForm.phone_number}
                onChange={(e) => setBusinessForm({ ...businessForm, phone_number: e.target.value })}
              />
              <Input
                label="Industry"
                value={businessForm.industry}
                onChange={(e) => setBusinessForm({ ...businessForm, industry: e.target.value })}
                placeholder="e.g., Salon, Medical, Restaurant"
              />
              <Input
                label="Address"
                value={businessForm.address}
                onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="City"
                  value={businessForm.city}
                  onChange={(e) => setBusinessForm({ ...businessForm, city: e.target.value })}
                />
                <Input
                  label="State"
                  value={businessForm.state}
                  onChange={(e) => setBusinessForm({ ...businessForm, state: e.target.value })}
                />
                <Input
                  label="ZIP Code"
                  value={businessForm.zip_code}
                  onChange={(e) => setBusinessForm({ ...businessForm, zip_code: e.target.value })}
                />
              </div>
              <Select
                label="Timezone"
                value={businessForm.timezone}
                onChange={(e) => setBusinessForm({ ...businessForm, timezone: e.target.value })}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                ))}
              </Select>
            </Card.Body>
            <Card.Footer className="flex justify-end">
              <Button onClick={handleSaveBusiness} loading={updateBusiness.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </Card.Footer>
          </Card>
        )}

        {activeTab === 'hours' && (
          <Card>
            <Card.Header>
              <h3 className="font-medium">Business Hours</h3>
            </Card.Header>
            <Card.Body className="space-y-4">
              {hoursForm.map((day, index) => (
                <div key={index} className="flex items-center gap-4 py-3 border-b last:border-0">
                  <div className="w-28">
                    <span className="font-medium">{DAYS[index]}</span>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={day.is_open}
                      onChange={(e) => updateHoursDay(index, { is_open: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-600">Open</span>
                  </label>
                  {day.is_open && (
                    <>
                      <input
                        type="time"
                        value={day.open_time}
                        onChange={(e) => updateHoursDay(index, { open_time: e.target.value })}
                        className="px-3 py-1.5 border rounded text-sm"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={day.close_time}
                        onChange={(e) => updateHoursDay(index, { close_time: e.target.value })}
                        className="px-3 py-1.5 border rounded text-sm"
                      />
                    </>
                  )}
                  {!day.is_open && (
                    <span className="text-gray-500 text-sm">Closed</span>
                  )}
                </div>
              ))}
            </Card.Body>
            <Card.Footer className="flex justify-end">
              <Button onClick={handleSaveHours} loading={updateHours.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Hours
              </Button>
            </Card.Footer>
          </Card>
        )}

        {activeTab === 'notifications' && (
          <Card>
            <Card.Header>
              <h3 className="font-medium">Notification Preferences</h3>
            </Card.Header>
            <Card.Body className="space-y-4">
              {[
                { key: 'appointment_reminders', label: 'Appointment Reminders', desc: 'Get notified about upcoming appointments' },
                { key: 'call_summaries', label: 'Call Summaries', desc: 'Receive summaries after AI-handled calls' },
                { key: 'daily_digest', label: 'Daily Digest', desc: 'Get a daily summary of your business activity' },
                { key: 'new_customer_alerts', label: 'New Customer Alerts', desc: 'Get notified when new customers are added' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.label}</h4>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications[item.key as keyof typeof notifications]}
                      onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </Card.Body>
            <Card.Footer className="flex justify-end">
              <Button>
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </Card.Footer>
          </Card>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-6">
            <Card>
              <Card.Header>
                <h3 className="font-medium">Current Plan</h3>
              </Card.Header>
              <Card.Body>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">
                      {business?.subscription_status === 'trial' ? 'Free Trial' : 'Pro Plan'}
                    </h4>
                    <p className="text-gray-500">
                      {business?.subscription_status === 'trial' 
                        ? 'Your trial includes all Pro features'
                        : '$49/month • Unlimited calls'}
                    </p>
                  </div>
                  <Button variant="secondary">
                    {business?.subscription_status === 'trial' ? 'Upgrade Now' : 'Manage Plan'}
                  </Button>
                </div>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header>
                <h3 className="font-medium">Usage This Month</h3>
              </Card.Header>
              <Card.Body className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>AI Call Minutes</span>
                    <span>245 / 500</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '49%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Appointments Booked</span>
                    <span>87 / Unlimited</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div className="h-full bg-green-600 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header>
                <h3 className="font-medium">Payment Method</h3>
              </Card.Header>
              <Card.Body>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-gray-500">Expires 12/2025</p>
                  </div>
                  <Button variant="ghost" size="sm">Update</Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
