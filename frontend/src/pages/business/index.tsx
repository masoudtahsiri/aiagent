import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Clock,
  Save,
  MapPin,
  CalendarOff,
  Plus,
  Globe,
  Trash2,
  Calendar,
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format, isPast, isToday } from 'date-fns';
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

// Comprehensive list of countries with their default timezone and currency
const countries = [
  { code: 'US', name: 'United States', timezone: 'America/New_York', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', timezone: 'Europe/London', currency: 'GBP' },
  { code: 'CA', name: 'Canada', timezone: 'America/Toronto', currency: 'CAD' },
  { code: 'AU', name: 'Australia', timezone: 'Australia/Sydney', currency: 'AUD' },
  { code: 'DE', name: 'Germany', timezone: 'Europe/Berlin', currency: 'EUR' },
  { code: 'FR', name: 'France', timezone: 'Europe/Paris', currency: 'EUR' },
  { code: 'IT', name: 'Italy', timezone: 'Europe/Rome', currency: 'EUR' },
  { code: 'ES', name: 'Spain', timezone: 'Europe/Madrid', currency: 'EUR' },
  { code: 'NL', name: 'Netherlands', timezone: 'Europe/Amsterdam', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', timezone: 'Europe/Brussels', currency: 'EUR' },
  { code: 'AT', name: 'Austria', timezone: 'Europe/Vienna', currency: 'EUR' },
  { code: 'CH', name: 'Switzerland', timezone: 'Europe/Zurich', currency: 'CHF' },
  { code: 'SE', name: 'Sweden', timezone: 'Europe/Stockholm', currency: 'SEK' },
  { code: 'NO', name: 'Norway', timezone: 'Europe/Oslo', currency: 'NOK' },
  { code: 'DK', name: 'Denmark', timezone: 'Europe/Copenhagen', currency: 'DKK' },
  { code: 'FI', name: 'Finland', timezone: 'Europe/Helsinki', currency: 'EUR' },
  { code: 'IE', name: 'Ireland', timezone: 'Europe/Dublin', currency: 'EUR' },
  { code: 'PT', name: 'Portugal', timezone: 'Europe/Lisbon', currency: 'EUR' },
  { code: 'PL', name: 'Poland', timezone: 'Europe/Warsaw', currency: 'PLN' },
  { code: 'CZ', name: 'Czech Republic', timezone: 'Europe/Prague', currency: 'CZK' },
  { code: 'HU', name: 'Hungary', timezone: 'Europe/Budapest', currency: 'HUF' },
  { code: 'RO', name: 'Romania', timezone: 'Europe/Bucharest', currency: 'RON' },
  { code: 'BG', name: 'Bulgaria', timezone: 'Europe/Sofia', currency: 'BGN' },
  { code: 'GR', name: 'Greece', timezone: 'Europe/Athens', currency: 'EUR' },
  { code: 'TR', name: 'Turkey', timezone: 'Europe/Istanbul', currency: 'TRY' },
  { code: 'RU', name: 'Russia', timezone: 'Europe/Moscow', currency: 'RUB' },
  { code: 'UA', name: 'Ukraine', timezone: 'Europe/Kiev', currency: 'UAH' },
  { code: 'JP', name: 'Japan', timezone: 'Asia/Tokyo', currency: 'JPY' },
  { code: 'CN', name: 'China', timezone: 'Asia/Shanghai', currency: 'CNY' },
  { code: 'KR', name: 'South Korea', timezone: 'Asia/Seoul', currency: 'KRW' },
  { code: 'IN', name: 'India', timezone: 'Asia/Kolkata', currency: 'INR' },
  { code: 'SG', name: 'Singapore', timezone: 'Asia/Singapore', currency: 'SGD' },
  { code: 'HK', name: 'Hong Kong', timezone: 'Asia/Hong_Kong', currency: 'HKD' },
  { code: 'TW', name: 'Taiwan', timezone: 'Asia/Taipei', currency: 'TWD' },
  { code: 'TH', name: 'Thailand', timezone: 'Asia/Bangkok', currency: 'THB' },
  { code: 'MY', name: 'Malaysia', timezone: 'Asia/Kuala_Lumpur', currency: 'MYR' },
  { code: 'ID', name: 'Indonesia', timezone: 'Asia/Jakarta', currency: 'IDR' },
  { code: 'PH', name: 'Philippines', timezone: 'Asia/Manila', currency: 'PHP' },
  { code: 'VN', name: 'Vietnam', timezone: 'Asia/Ho_Chi_Minh', currency: 'VND' },
  { code: 'AE', name: 'United Arab Emirates', timezone: 'Asia/Dubai', currency: 'AED' },
  { code: 'SA', name: 'Saudi Arabia', timezone: 'Asia/Riyadh', currency: 'SAR' },
  { code: 'QA', name: 'Qatar', timezone: 'Asia/Qatar', currency: 'QAR' },
  { code: 'KW', name: 'Kuwait', timezone: 'Asia/Kuwait', currency: 'KWD' },
  { code: 'BH', name: 'Bahrain', timezone: 'Asia/Bahrain', currency: 'BHD' },
  { code: 'OM', name: 'Oman', timezone: 'Asia/Muscat', currency: 'OMR' },
  { code: 'IL', name: 'Israel', timezone: 'Asia/Jerusalem', currency: 'ILS' },
  { code: 'EG', name: 'Egypt', timezone: 'Africa/Cairo', currency: 'EGP' },
  { code: 'ZA', name: 'South Africa', timezone: 'Africa/Johannesburg', currency: 'ZAR' },
  { code: 'NG', name: 'Nigeria', timezone: 'Africa/Lagos', currency: 'NGN' },
  { code: 'KE', name: 'Kenya', timezone: 'Africa/Nairobi', currency: 'KES' },
  { code: 'MA', name: 'Morocco', timezone: 'Africa/Casablanca', currency: 'MAD' },
  { code: 'BR', name: 'Brazil', timezone: 'America/Sao_Paulo', currency: 'BRL' },
  { code: 'MX', name: 'Mexico', timezone: 'America/Mexico_City', currency: 'MXN' },
  { code: 'AR', name: 'Argentina', timezone: 'America/Buenos_Aires', currency: 'ARS' },
  { code: 'CL', name: 'Chile', timezone: 'America/Santiago', currency: 'CLP' },
  { code: 'CO', name: 'Colombia', timezone: 'America/Bogota', currency: 'COP' },
  { code: 'PE', name: 'Peru', timezone: 'America/Lima', currency: 'PEN' },
  { code: 'NZ', name: 'New Zealand', timezone: 'Pacific/Auckland', currency: 'NZD' },
  { code: 'PK', name: 'Pakistan', timezone: 'Asia/Karachi', currency: 'PKR' },
  { code: 'BD', name: 'Bangladesh', timezone: 'Asia/Dhaka', currency: 'BDT' },
  { code: 'LK', name: 'Sri Lanka', timezone: 'Asia/Colombo', currency: 'LKR' },
  { code: 'NP', name: 'Nepal', timezone: 'Asia/Kathmandu', currency: 'NPR' },
].sort((a, b) => a.name.localeCompare(b.name));

// Supported currencies (expanded)
const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar' },
  { code: 'OMR', symbol: '﷼', name: 'Omani Rial' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'EGP', symbol: '£', name: 'Egyptian Pound' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'MAD', symbol: 'د.م.', name: 'Moroccan Dirham' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso' },
  { code: 'COP', symbol: '$', name: 'Colombian Peso' },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'LKR', symbol: '₨', name: 'Sri Lankan Rupee' },
  { code: 'NPR', symbol: '₨', name: 'Nepalese Rupee' },
].sort((a, b) => a.name.localeCompare(b.name));

// Comprehensive worldwide timezone list grouped by region
const timezoneGroups = [
  {
    region: 'Americas',
    timezones: [
      { value: 'America/New_York', label: 'New York (ET)' },
      { value: 'America/Chicago', label: 'Chicago (CT)' },
      { value: 'America/Denver', label: 'Denver (MT)' },
      { value: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
      { value: 'America/Anchorage', label: 'Alaska' },
      { value: 'Pacific/Honolulu', label: 'Hawaii' },
      { value: 'America/Toronto', label: 'Toronto' },
      { value: 'America/Vancouver', label: 'Vancouver' },
      { value: 'America/Mexico_City', label: 'Mexico City' },
      { value: 'America/Sao_Paulo', label: 'São Paulo' },
      { value: 'America/Buenos_Aires', label: 'Buenos Aires' },
      { value: 'America/Santiago', label: 'Santiago' },
      { value: 'America/Bogota', label: 'Bogotá' },
      { value: 'America/Lima', label: 'Lima' },
    ],
  },
  {
    region: 'Europe',
    timezones: [
      { value: 'Europe/London', label: 'London (GMT)' },
      { value: 'Europe/Paris', label: 'Paris (CET)' },
      { value: 'Europe/Berlin', label: 'Berlin (CET)' },
      { value: 'Europe/Rome', label: 'Rome (CET)' },
      { value: 'Europe/Madrid', label: 'Madrid (CET)' },
      { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
      { value: 'Europe/Brussels', label: 'Brussels (CET)' },
      { value: 'Europe/Vienna', label: 'Vienna (CET)' },
      { value: 'Europe/Zurich', label: 'Zurich (CET)' },
      { value: 'Europe/Stockholm', label: 'Stockholm (CET)' },
      { value: 'Europe/Oslo', label: 'Oslo (CET)' },
      { value: 'Europe/Copenhagen', label: 'Copenhagen (CET)' },
      { value: 'Europe/Helsinki', label: 'Helsinki (EET)' },
      { value: 'Europe/Dublin', label: 'Dublin (GMT)' },
      { value: 'Europe/Lisbon', label: 'Lisbon (WET)' },
      { value: 'Europe/Warsaw', label: 'Warsaw (CET)' },
      { value: 'Europe/Prague', label: 'Prague (CET)' },
      { value: 'Europe/Budapest', label: 'Budapest (CET)' },
      { value: 'Europe/Bucharest', label: 'Bucharest (EET)' },
      { value: 'Europe/Sofia', label: 'Sofia (EET)' },
      { value: 'Europe/Athens', label: 'Athens (EET)' },
      { value: 'Europe/Istanbul', label: 'Istanbul (TRT)' },
      { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
      { value: 'Europe/Kiev', label: 'Kyiv (EET)' },
    ],
  },
  {
    region: 'Asia',
    timezones: [
      { value: 'Asia/Dubai', label: 'Dubai (GST)' },
      { value: 'Asia/Riyadh', label: 'Riyadh (AST)' },
      { value: 'Asia/Qatar', label: 'Qatar (AST)' },
      { value: 'Asia/Kuwait', label: 'Kuwait (AST)' },
      { value: 'Asia/Bahrain', label: 'Bahrain (AST)' },
      { value: 'Asia/Muscat', label: 'Muscat (GST)' },
      { value: 'Asia/Jerusalem', label: 'Jerusalem (IST)' },
      { value: 'Asia/Kolkata', label: 'India (IST)' },
      { value: 'Asia/Karachi', label: 'Pakistan (PKT)' },
      { value: 'Asia/Dhaka', label: 'Bangladesh (BST)' },
      { value: 'Asia/Colombo', label: 'Sri Lanka (IST)' },
      { value: 'Asia/Kathmandu', label: 'Nepal (NPT)' },
      { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
      { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh (ICT)' },
      { value: 'Asia/Jakarta', label: 'Jakarta (WIB)' },
      { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
      { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (MYT)' },
      { value: 'Asia/Manila', label: 'Manila (PHT)' },
      { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
      { value: 'Asia/Taipei', label: 'Taipei (CST)' },
      { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
      { value: 'Asia/Seoul', label: 'Seoul (KST)' },
      { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    ],
  },
  {
    region: 'Africa',
    timezones: [
      { value: 'Africa/Cairo', label: 'Cairo (EET)' },
      { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
      { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
      { value: 'Africa/Nairobi', label: 'Nairobi (EAT)' },
      { value: 'Africa/Casablanca', label: 'Casablanca (WET)' },
    ],
  },
  {
    region: 'Pacific',
    timezones: [
      { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
      { value: 'Australia/Melbourne', label: 'Melbourne (AEST)' },
      { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
      { value: 'Australia/Perth', label: 'Perth (AWST)' },
      { value: 'Australia/Adelaide', label: 'Adelaide (ACST)' },
      { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
    ],
  },
];

// Flatten timezones for easy lookup
const allTimezones = timezoneGroups.flatMap(g => g.timezones);

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

  // Handle country change with auto-setting timezone and currency
  const handleCountryChange = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    if (country) {
      setFormData(prev => ({
        ...prev,
        country: countryCode,
        timezone: country.timezone,
        currency: country.currency,
      }));
      setHasChanges(true);
      toast.success(`Updated to ${country.name} defaults`);
    }
  };

  // Get current timezone label
  const currentTimezoneLabel = useMemo(() => {
    const tz = allTimezones.find(t => t.value === formData.timezone);
    return tz?.label || formData.timezone || 'Select timezone';
  }, [formData.timezone]);

  // Get current currency info
  const currentCurrency = useMemo(() => {
    return currencies.find(c => c.code === formData.currency);
  }, [formData.currency]);

  // Get current country name
  const currentCountryName = useMemo(() => {
    const country = countries.find(c => c.code === formData.country);
    return country?.name || 'Select country';
  }, [formData.country]);

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
          {/* Country - Primary selector that sets timezone and currency */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              Country
            </label>
            <Select
              value={formData.country || 'US'}
              onValueChange={handleCountryChange}
            >
              <SelectTrigger>
                <SelectValue>{currentCountryName}</SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Changing country will update timezone and currency
            </p>
          </div>

          {/* Timezone and Currency - Auto-set but editable */}
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Timezone</label>
              <Select
                value={formData.timezone || 'America/New_York'}
                onValueChange={(v) => handleChange('timezone', v)}
              >
                <SelectTrigger>
                  <SelectValue>{currentTimezoneLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {timezoneGroups.map((group) => (
                    <div key={group.region}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                        {group.region}
                      </div>
                      {group.timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Currency</label>
              <Select
                value={formData.currency || 'USD'}
                onValueChange={(v) => handleChange('currency', v)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {currentCurrency ? (
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{currentCurrency.symbol}</span>
                        <span>{currentCurrency.code}</span>
                      </span>
                    ) : 'Select currency'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="flex items-center gap-2">
                        <span className="font-medium w-8">{c.symbol}</span>
                        <span>{c.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Street Address */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Street Address</label>
            <Input
              value={formData.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="123 Main Street"
            />
          </div>

          {/* City, State/Province, ZIP */}
          <div className="grid gap-4 grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">City</label>
              <Input
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">State/Province</label>
              <Input
                value={formData.state || ''}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="State"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">ZIP/Postal</label>
              <Input
                value={formData.zip_code || ''}
                onChange={(e) => handleChange('zip_code', e.target.value)}
                placeholder="ZIP"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row 2 - Schedule (Business Hours & Closed Dates in Two Columns) */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Business Hours */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-muted-foreground">Weekly Hours</h3>
                <Button variant="outline" size="sm" onClick={applyToWeekdays}>
                  Copy Mon to Weekdays
                </Button>
              </div>
              <div className="space-y-2">
                {days.map((day, index) => (
                  <div
                    key={day}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                      schedule[index]?.is_open
                        ? 'bg-card border-border'
                        : 'bg-muted/30 border-border/50'
                    )}
                  >
                    <Switch
                      checked={schedule[index]?.is_open ?? index < 5}
                      onCheckedChange={() => handleToggleDay(index)}
                    />
                    <span className={cn(
                      'font-medium text-sm min-w-[80px]',
                      !schedule[index]?.is_open && 'text-muted-foreground'
                    )}>
                      {day}
                    </span>
                    {schedule[index]?.is_open ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={schedule[index]?.open_time || '09:00'}
                          onChange={(e) => handleTimeChange(index, 'open_time', e.target.value)}
                          className="h-8 text-xs flex-1"
                        />
                        <span className="text-muted-foreground text-xs">to</span>
                        <Input
                          type="time"
                          value={schedule[index]?.close_time || '17:00'}
                          onChange={(e) => handleTimeChange(index, 'close_time', e.target.value)}
                          className="h-8 text-xs flex-1"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Closed</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Closed Dates */}
            <div className="space-y-4 lg:border-l lg:pl-8">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                  <CalendarOff className="h-4 w-4" />
                  Closed Dates
                </h3>
                <Badge variant="outline" className="text-xs">
                  {(closuresData || []).length} scheduled
                </Badge>
              </div>

              {/* Add Closure Form */}
              <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Add New Closure</span>
                </div>
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
                    closed: {
                      backgroundColor: 'hsl(var(--destructive))',
                      color: 'white',
                      borderRadius: '6px',
                      fontWeight: '500'
                    },
                  }}
                  className="border rounded-lg p-2 bg-background mx-auto"
                />
                <div className="space-y-2">
                  <Input
                    placeholder="Reason (optional, e.g., Holiday, Renovation)"
                    value={closureReason}
                    onChange={(e) => setClosureReason(e.target.value)}
                    className="text-sm"
                  />
                  <Button
                    className="w-full"
                    onClick={handleAddClosure}
                    disabled={!selectedDate}
                    loading={addClosure.isPending}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {selectedDate
                      ? `Add ${format(selectedDate, 'MMM d, yyyy')}`
                      : 'Select a date above'}
                  </Button>
                </div>
              </div>

              {/* Scheduled Closures List */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Upcoming Closures
                </h4>
                {closuresLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (closuresData || []).length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CalendarOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No scheduled closures</p>
                    <p className="text-xs">Select a date above to add one</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    <AnimatePresence mode="popLayout">
                      {(closuresData || [])
                        .sort((a, b) => new Date(a.closure_date).getTime() - new Date(b.closure_date).getTime())
                        .map((closure) => {
                          const closureDate = new Date(closure.closure_date);
                          const isPastDate = isPast(closureDate) && !isToday(closureDate);
                          return (
                            <motion.div
                              key={closure.id}
                              layout
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className={cn(
                                'group flex items-center justify-between p-3 rounded-lg border transition-all',
                                isPastDate
                                  ? 'bg-muted/20 border-border/50 opacity-60'
                                  : 'bg-card border-border hover:border-primary/30'
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn(
                                  'flex flex-col items-center justify-center w-12 h-12 rounded-lg text-center flex-shrink-0',
                                  isPastDate ? 'bg-muted' : 'bg-destructive/10'
                                )}>
                                  <span className={cn(
                                    'text-xs font-medium uppercase',
                                    isPastDate ? 'text-muted-foreground' : 'text-destructive'
                                  )}>
                                    {format(closureDate, 'MMM')}
                                  </span>
                                  <span className={cn(
                                    'text-lg font-bold leading-none',
                                    isPastDate ? 'text-muted-foreground' : 'text-destructive'
                                  )}>
                                    {format(closureDate, 'd')}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className={cn(
                                    'font-medium text-sm truncate',
                                    isPastDate && 'text-muted-foreground'
                                  )}>
                                    {format(closureDate, 'EEEE, yyyy')}
                                  </p>
                                  {closure.reason ? (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {closure.reason}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-muted-foreground/60 italic">
                                      No reason specified
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDeleteClosure(closure.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </motion.div>
                          );
                        })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
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
