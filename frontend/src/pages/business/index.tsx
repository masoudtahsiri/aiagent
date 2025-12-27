import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Clock,
  Save,
  MapPin,
  CalendarOff,
  X,
  Plus,
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/form-elements';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useBusiness,
  useUpdateBusiness,
  useBusinessHours,
  useUpdateBusinessHours,
  useBusinessClosures,
  useAddBusinessClosure,
  useDeleteBusinessClosure,
} from '@/lib/api/hooks';
import type { Business, BusinessHours } from '@/types';
import { useIndustry } from '@/contexts/industry-context';
import { getIndustryBadgeClasses } from '@/config/industries';

// Supported currencies
const currencies = [
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
];


const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'GMT (London)' },
  { value: 'Europe/Istanbul', label: 'Turkey Time (TRT)' },
  { value: 'Asia/Dubai', label: 'Gulf Time (Dubai)' },
];

export default function BusinessPage() {
  return (
    <PageContainer
      title="Business"
      description="Manage your business profile and hours"
    >
      <BusinessContent />
    </PageContainer>
  );
}

// Business Content - 2x2 Grid Layout
function BusinessContent() {
  const { data: business, isLoading: businessLoading, refetch: refetchBusiness } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  const { data: hoursData, isLoading: hoursLoading, refetch: refetchHours } = useBusinessHours();
  const updateHours = useUpdateBusinessHours();

  // Closures hooks
  const { data: closuresData, isLoading: closuresLoading, refetch: refetchClosures } = useBusinessClosures();
  const addClosure = useAddBusinessClosure();
  const deleteClosure = useDeleteBusinessClosure();

  // Get industry-specific terminology and meta
  const { meta: industryMeta, businessType } = useIndustry();
  const badgeClasses = getIndustryBadgeClasses(businessType);

  const [formData, setFormData] = useState<Partial<Business>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Hours state
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [schedule, setSchedule] = useState<Record<number, { is_open: boolean; open_time: string; close_time: string }>>({});
  const [hoursHasChanges, setHoursHasChanges] = useState(false);

  // Closures state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [closureReason, setClosureReason] = useState('');

  useEffect(() => {
    if (business) {
      setFormData({
        business_name: business.business_name,
        timezone: business.timezone,
        default_language: business.default_language,
        address: business.address,
        city: business.city,
        state: business.state,
        zip_code: business.zip_code,
        phone_number: business.phone_number,
        country: business.country,
        currency: business.currency || 'TRY',
      });
    }
  }, [business]);

  useEffect(() => {
    if (hoursData) {
      const hoursMap: Record<number, { is_open: boolean; open_time: string; close_time: string }> = {};
      hoursData.forEach(h => {
        hoursMap[h.day_of_week] = {
          is_open: h.is_open !== false,
          open_time: h.open_time?.slice(0, 5) || '09:00',
          close_time: h.close_time?.slice(0, 5) || '17:00',
        };
      });
      for (let i = 0; i < 7; i++) {
        if (!hoursMap[i]) {
          hoursMap[i] = {
            is_open: i < 5,
            open_time: '09:00',
            close_time: '17:00',
          };
        }
      }
      setSchedule(hoursMap);
    }
  }, [hoursData]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleToggleDay = (dayIndex: number) => {
    setSchedule(prev => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], is_open: !prev[dayIndex]?.is_open },
    }));
    setHoursHasChanges(true);
  };

  const handleTimeChange = (dayIndex: number, field: 'open_time' | 'close_time', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], [field]: value },
    }));
    setHoursHasChanges(true);
  };

  const handleSave = async () => {
    try {
      if (hasChanges) {
        await updateBusiness.mutateAsync(formData);
        setHasChanges(false);
        refetchBusiness();
      }

      if (hoursHasChanges) {
        const hoursArray = Object.entries(schedule).map(([day, data]) => ({
          day_of_week: parseInt(day),
          is_open: data.is_open,
          open_time: data.open_time + ':00',
          close_time: data.close_time + ':00',
        })) as BusinessHours[];
        await updateHours.mutateAsync(hoursArray);
        setHoursHasChanges(false);
        refetchHours();
      }

      toast.success('Changes saved');
    } catch (error) {
      toast.error('Failed to save changes');
    }
  };

  const applyToWeekdays = () => {
    const monday = schedule[0];
    if (!monday) return;

    setSchedule(prev => {
      const newSchedule = { ...prev };
      for (let i = 0; i <= 4; i++) {
        newSchedule[i] = { ...monday };
      }
      return newSchedule;
    });
    setHoursHasChanges(true);
    toast.success('Applied Monday schedule to all weekdays');
  };

  const handleAddClosure = async () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    try {
      await addClosure.mutateAsync({
        closure_date: format(selectedDate, 'yyyy-MM-dd'),
        reason: closureReason || undefined,
      });
      toast.success('Closure added');
      setSelectedDate(undefined);
      setClosureReason('');
      refetchClosures();
    } catch (error) {
      toast.error('Failed to add closure');
    }
  };

  const handleDeleteClosure = async (closureId: string) => {
    try {
      await deleteClosure.mutateAsync(closureId);
      toast.success('Closure removed');
      refetchClosures();
    } catch (error) {
      toast.error('Failed to remove closure');
    }
  };

  // Get dates that are already marked as closed
  const closedDates = (closuresData || []).map(c => new Date(c.closure_date));

  if (businessLoading || hoursLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full lg:col-span-2" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
      {/* Row 1, Col 1 - Business Identity */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Business Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Business Name</label>
            <Input
              value={formData.business_name || ''}
              onChange={(e) => handleChange('business_name', e.target.value)}
              placeholder="Your business name"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Industry</label>
            <div className={cn(
              'flex items-center gap-3 p-3 rounded-lg border',
              badgeClasses.bg,
              badgeClasses.border
            )}>
              <industryMeta.icon className={cn('h-5 w-5', badgeClasses.icon)} />
              <span className="font-medium">{industryMeta.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Industry is set during onboarding and cannot be changed
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
            <Input
              type="tel"
              value={formData.phone_number || ''}
              onChange={(e) => handleChange('phone_number', e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Currency</label>
            <Select
              value={formData.currency || 'TRY'}
              onValueChange={(v) => handleChange('currency', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{c.symbol}</span>
                      <span>{c.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Row 1, Col 2 - Location */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Street Address</label>
            <Input
              value={formData.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="123 Main Street"
            />
          </div>
          <div className="grid gap-4 grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">City</label>
              <Input
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">State</label>
              <Input
                value={formData.state || ''}
                onChange={(e) => handleChange('state', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">ZIP</label>
              <Input
                value={formData.zip_code || ''}
                onChange={(e) => handleChange('zip_code', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Timezone</label>
            <Select
              value={formData.timezone || 'America/New_York'}
              onValueChange={(v) => handleChange('timezone', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Row 2 - Business Hours (full width) */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Business Hours
            </CardTitle>
            <Button variant="outline" size="sm" onClick={applyToWeekdays}>
              Copy Mon to Weekdays
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {days.map((day, index) => (
              <div
                key={day}
                className={cn(
                  'flex flex-col gap-2 p-3 rounded-lg border transition-colors',
                  schedule[index]?.is_open
                    ? 'bg-card border-border'
                    : 'bg-muted/50 border-border'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'font-medium text-sm',
                    !schedule[index]?.is_open && 'text-muted-foreground'
                  )}>
                    {day}
                  </span>
                  <Switch
                    checked={schedule[index]?.is_open ?? index < 5}
                    onCheckedChange={() => handleToggleDay(index)}
                  />
                </div>

                {schedule[index]?.is_open ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={schedule[index]?.open_time || '09:00'}
                      onChange={(e) => handleTimeChange(index, 'open_time', e.target.value)}
                      className="h-8 text-xs"
                    />
                    <span className="text-muted-foreground text-xs">-</span>
                    <Input
                      type="time"
                      value={schedule[index]?.close_time || '17:00'}
                      onChange={(e) => handleTimeChange(index, 'close_time', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Closed</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Row 3 - Closed Dates (full width) */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarOff className="h-5 w-5 text-primary" />
            Closed Dates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar picker */}
            <div className="flex flex-col items-center">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={[
                  { before: new Date() },
                  ...closedDates,
                ]}
                modifiers={{
                  closed: closedDates,
                }}
                modifiersStyles={{
                  closed: { backgroundColor: 'hsl(var(--destructive))', color: 'white', borderRadius: '50%' },
                }}
                className="border rounded-lg p-3"
              />
              <div className="mt-4 w-full max-w-xs space-y-3">
                <Input
                  placeholder="Reason (optional)"
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                />
                <Button
                  className="w-full"
                  onClick={handleAddClosure}
                  disabled={!selectedDate}
                  loading={addClosure.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Closure
                </Button>
              </div>
            </div>

            {/* Closures list */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Scheduled Closures</h4>
              {closuresLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (closuresData || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No scheduled closures</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {(closuresData || [])
                    .sort((a, b) => new Date(a.closure_date).getTime() - new Date(b.closure_date).getTime())
                    .map((closure) => (
                      <div
                        key={closure.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">
                            {format(new Date(closure.closure_date), 'EEEE, MMMM d, yyyy')}
                          </p>
                          {closure.reason && (
                            <p className="text-sm text-muted-foreground">{closure.reason}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeleteClosure(closure.id)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {(hasChanges || hoursHasChanges) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            size="lg"
            onClick={handleSave}
            loading={updateBusiness.isPending || updateHours.isPending}
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
