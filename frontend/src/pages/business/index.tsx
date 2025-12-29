import { useState, useEffect, useMemo, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Phone,
  Camera,
  Check,
  Copy,
  Sparkles,
  Sun,
  Moon,
  Coffee,
  X,
  Info,
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format, isPast, isToday } from 'date-fns';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/form-elements';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

// Comprehensive list of countries with their default timezone, currency, and flag emoji
const countries = [
  { code: 'US', name: 'United States', timezone: 'America/New_York', currency: 'USD', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', timezone: 'Europe/London', currency: 'GBP', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', timezone: 'America/Toronto', currency: 'CAD', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', timezone: 'Australia/Sydney', currency: 'AUD', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', timezone: 'Europe/Berlin', currency: 'EUR', flag: '🇩🇪' },
  { code: 'FR', name: 'France', timezone: 'Europe/Paris', currency: 'EUR', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', timezone: 'Europe/Rome', currency: 'EUR', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', timezone: 'Europe/Madrid', currency: 'EUR', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', timezone: 'Europe/Amsterdam', currency: 'EUR', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', timezone: 'Europe/Brussels', currency: 'EUR', flag: '🇧🇪' },
  { code: 'AT', name: 'Austria', timezone: 'Europe/Vienna', currency: 'EUR', flag: '🇦🇹' },
  { code: 'CH', name: 'Switzerland', timezone: 'Europe/Zurich', currency: 'CHF', flag: '🇨🇭' },
  { code: 'SE', name: 'Sweden', timezone: 'Europe/Stockholm', currency: 'SEK', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', timezone: 'Europe/Oslo', currency: 'NOK', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', timezone: 'Europe/Copenhagen', currency: 'DKK', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', timezone: 'Europe/Helsinki', currency: 'EUR', flag: '🇫🇮' },
  { code: 'IE', name: 'Ireland', timezone: 'Europe/Dublin', currency: 'EUR', flag: '🇮🇪' },
  { code: 'PT', name: 'Portugal', timezone: 'Europe/Lisbon', currency: 'EUR', flag: '🇵🇹' },
  { code: 'PL', name: 'Poland', timezone: 'Europe/Warsaw', currency: 'PLN', flag: '🇵🇱' },
  { code: 'CZ', name: 'Czech Republic', timezone: 'Europe/Prague', currency: 'CZK', flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary', timezone: 'Europe/Budapest', currency: 'HUF', flag: '🇭🇺' },
  { code: 'RO', name: 'Romania', timezone: 'Europe/Bucharest', currency: 'RON', flag: '🇷🇴' },
  { code: 'BG', name: 'Bulgaria', timezone: 'Europe/Sofia', currency: 'BGN', flag: '🇧🇬' },
  { code: 'GR', name: 'Greece', timezone: 'Europe/Athens', currency: 'EUR', flag: '🇬🇷' },
  { code: 'TR', name: 'Turkey', timezone: 'Europe/Istanbul', currency: 'TRY', flag: '🇹🇷' },
  { code: 'RU', name: 'Russia', timezone: 'Europe/Moscow', currency: 'RUB', flag: '🇷🇺' },
  { code: 'UA', name: 'Ukraine', timezone: 'Europe/Kiev', currency: 'UAH', flag: '🇺🇦' },
  { code: 'JP', name: 'Japan', timezone: 'Asia/Tokyo', currency: 'JPY', flag: '🇯🇵' },
  { code: 'CN', name: 'China', timezone: 'Asia/Shanghai', currency: 'CNY', flag: '🇨🇳' },
  { code: 'KR', name: 'South Korea', timezone: 'Asia/Seoul', currency: 'KRW', flag: '🇰🇷' },
  { code: 'IN', name: 'India', timezone: 'Asia/Kolkata', currency: 'INR', flag: '🇮🇳' },
  { code: 'SG', name: 'Singapore', timezone: 'Asia/Singapore', currency: 'SGD', flag: '🇸🇬' },
  { code: 'HK', name: 'Hong Kong', timezone: 'Asia/Hong_Kong', currency: 'HKD', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan', timezone: 'Asia/Taipei', currency: 'TWD', flag: '🇹🇼' },
  { code: 'TH', name: 'Thailand', timezone: 'Asia/Bangkok', currency: 'THB', flag: '🇹🇭' },
  { code: 'MY', name: 'Malaysia', timezone: 'Asia/Kuala_Lumpur', currency: 'MYR', flag: '🇲🇾' },
  { code: 'ID', name: 'Indonesia', timezone: 'Asia/Jakarta', currency: 'IDR', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', timezone: 'Asia/Manila', currency: 'PHP', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', timezone: 'Asia/Ho_Chi_Minh', currency: 'VND', flag: '🇻🇳' },
  { code: 'AE', name: 'United Arab Emirates', timezone: 'Asia/Dubai', currency: 'AED', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', timezone: 'Asia/Riyadh', currency: 'SAR', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', timezone: 'Asia/Qatar', currency: 'QAR', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', timezone: 'Asia/Kuwait', currency: 'KWD', flag: '🇰🇼' },
  { code: 'BH', name: 'Bahrain', timezone: 'Asia/Bahrain', currency: 'BHD', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', timezone: 'Asia/Muscat', currency: 'OMR', flag: '🇴🇲' },
  { code: 'IL', name: 'Israel', timezone: 'Asia/Jerusalem', currency: 'ILS', flag: '🇮🇱' },
  { code: 'EG', name: 'Egypt', timezone: 'Africa/Cairo', currency: 'EGP', flag: '🇪🇬' },
  { code: 'ZA', name: 'South Africa', timezone: 'Africa/Johannesburg', currency: 'ZAR', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', timezone: 'Africa/Lagos', currency: 'NGN', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', timezone: 'Africa/Nairobi', currency: 'KES', flag: '🇰🇪' },
  { code: 'MA', name: 'Morocco', timezone: 'Africa/Casablanca', currency: 'MAD', flag: '🇲🇦' },
  { code: 'BR', name: 'Brazil', timezone: 'America/Sao_Paulo', currency: 'BRL', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', timezone: 'America/Mexico_City', currency: 'MXN', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', timezone: 'America/Buenos_Aires', currency: 'ARS', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', timezone: 'America/Santiago', currency: 'CLP', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', timezone: 'America/Bogota', currency: 'COP', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', timezone: 'America/Lima', currency: 'PEN', flag: '🇵🇪' },
  { code: 'NZ', name: 'New Zealand', timezone: 'Pacific/Auckland', currency: 'NZD', flag: '🇳🇿' },
  { code: 'PK', name: 'Pakistan', timezone: 'Asia/Karachi', currency: 'PKR', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', timezone: 'Asia/Dhaka', currency: 'BDT', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka', timezone: 'Asia/Colombo', currency: 'LKR', flag: '🇱🇰' },
  { code: 'NP', name: 'Nepal', timezone: 'Asia/Kathmandu', currency: 'NPR', flag: '🇳🇵' },
].sort((a, b) => a.name.localeCompare(b.name));

// Supported currencies
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
      { value: 'America/New_York', label: 'New York (ET)', offset: '-05:00' },
      { value: 'America/Chicago', label: 'Chicago (CT)', offset: '-06:00' },
      { value: 'America/Denver', label: 'Denver (MT)', offset: '-07:00' },
      { value: 'America/Los_Angeles', label: 'Los Angeles (PT)', offset: '-08:00' },
      { value: 'America/Anchorage', label: 'Alaska', offset: '-09:00' },
      { value: 'Pacific/Honolulu', label: 'Hawaii', offset: '-10:00' },
      { value: 'America/Toronto', label: 'Toronto', offset: '-05:00' },
      { value: 'America/Vancouver', label: 'Vancouver', offset: '-08:00' },
      { value: 'America/Mexico_City', label: 'Mexico City', offset: '-06:00' },
      { value: 'America/Sao_Paulo', label: 'São Paulo', offset: '-03:00' },
      { value: 'America/Buenos_Aires', label: 'Buenos Aires', offset: '-03:00' },
      { value: 'America/Santiago', label: 'Santiago', offset: '-03:00' },
      { value: 'America/Bogota', label: 'Bogotá', offset: '-05:00' },
      { value: 'America/Lima', label: 'Lima', offset: '-05:00' },
    ],
  },
  {
    region: 'Europe',
    timezones: [
      { value: 'Europe/London', label: 'London (GMT)', offset: '+00:00' },
      { value: 'Europe/Paris', label: 'Paris (CET)', offset: '+01:00' },
      { value: 'Europe/Berlin', label: 'Berlin (CET)', offset: '+01:00' },
      { value: 'Europe/Rome', label: 'Rome (CET)', offset: '+01:00' },
      { value: 'Europe/Madrid', label: 'Madrid (CET)', offset: '+01:00' },
      { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)', offset: '+01:00' },
      { value: 'Europe/Brussels', label: 'Brussels (CET)', offset: '+01:00' },
      { value: 'Europe/Vienna', label: 'Vienna (CET)', offset: '+01:00' },
      { value: 'Europe/Zurich', label: 'Zurich (CET)', offset: '+01:00' },
      { value: 'Europe/Stockholm', label: 'Stockholm (CET)', offset: '+01:00' },
      { value: 'Europe/Oslo', label: 'Oslo (CET)', offset: '+01:00' },
      { value: 'Europe/Copenhagen', label: 'Copenhagen (CET)', offset: '+01:00' },
      { value: 'Europe/Helsinki', label: 'Helsinki (EET)', offset: '+02:00' },
      { value: 'Europe/Dublin', label: 'Dublin (GMT)', offset: '+00:00' },
      { value: 'Europe/Lisbon', label: 'Lisbon (WET)', offset: '+00:00' },
      { value: 'Europe/Warsaw', label: 'Warsaw (CET)', offset: '+01:00' },
      { value: 'Europe/Prague', label: 'Prague (CET)', offset: '+01:00' },
      { value: 'Europe/Budapest', label: 'Budapest (CET)', offset: '+01:00' },
      { value: 'Europe/Bucharest', label: 'Bucharest (EET)', offset: '+02:00' },
      { value: 'Europe/Sofia', label: 'Sofia (EET)', offset: '+02:00' },
      { value: 'Europe/Athens', label: 'Athens (EET)', offset: '+02:00' },
      { value: 'Europe/Istanbul', label: 'Istanbul (TRT)', offset: '+03:00' },
      { value: 'Europe/Moscow', label: 'Moscow (MSK)', offset: '+03:00' },
      { value: 'Europe/Kiev', label: 'Kyiv (EET)', offset: '+02:00' },
    ],
  },
  {
    region: 'Asia',
    timezones: [
      { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: '+04:00' },
      { value: 'Asia/Riyadh', label: 'Riyadh (AST)', offset: '+03:00' },
      { value: 'Asia/Qatar', label: 'Qatar (AST)', offset: '+03:00' },
      { value: 'Asia/Kuwait', label: 'Kuwait (AST)', offset: '+03:00' },
      { value: 'Asia/Bahrain', label: 'Bahrain (AST)', offset: '+03:00' },
      { value: 'Asia/Muscat', label: 'Muscat (GST)', offset: '+04:00' },
      { value: 'Asia/Jerusalem', label: 'Jerusalem (IST)', offset: '+02:00' },
      { value: 'Asia/Kolkata', label: 'India (IST)', offset: '+05:30' },
      { value: 'Asia/Karachi', label: 'Pakistan (PKT)', offset: '+05:00' },
      { value: 'Asia/Dhaka', label: 'Bangladesh (BST)', offset: '+06:00' },
      { value: 'Asia/Colombo', label: 'Sri Lanka (IST)', offset: '+05:30' },
      { value: 'Asia/Kathmandu', label: 'Nepal (NPT)', offset: '+05:45' },
      { value: 'Asia/Bangkok', label: 'Bangkok (ICT)', offset: '+07:00' },
      { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh (ICT)', offset: '+07:00' },
      { value: 'Asia/Jakarta', label: 'Jakarta (WIB)', offset: '+07:00' },
      { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: '+08:00' },
      { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (MYT)', offset: '+08:00' },
      { value: 'Asia/Manila', label: 'Manila (PHT)', offset: '+08:00' },
      { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', offset: '+08:00' },
      { value: 'Asia/Taipei', label: 'Taipei (CST)', offset: '+08:00' },
      { value: 'Asia/Shanghai', label: 'Shanghai (CST)', offset: '+08:00' },
      { value: 'Asia/Seoul', label: 'Seoul (KST)', offset: '+09:00' },
      { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: '+09:00' },
    ],
  },
  {
    region: 'Africa',
    timezones: [
      { value: 'Africa/Cairo', label: 'Cairo (EET)', offset: '+02:00' },
      { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)', offset: '+02:00' },
      { value: 'Africa/Lagos', label: 'Lagos (WAT)', offset: '+01:00' },
      { value: 'Africa/Nairobi', label: 'Nairobi (EAT)', offset: '+03:00' },
      { value: 'Africa/Casablanca', label: 'Casablanca (WET)', offset: '+00:00' },
    ],
  },
  {
    region: 'Pacific',
    timezones: [
      { value: 'Australia/Sydney', label: 'Sydney (AEST)', offset: '+10:00' },
      { value: 'Australia/Melbourne', label: 'Melbourne (AEST)', offset: '+10:00' },
      { value: 'Australia/Brisbane', label: 'Brisbane (AEST)', offset: '+10:00' },
      { value: 'Australia/Perth', label: 'Perth (AWST)', offset: '+08:00' },
      { value: 'Australia/Adelaide', label: 'Adelaide (ACST)', offset: '+09:30' },
      { value: 'Pacific/Auckland', label: 'Auckland (NZST)', offset: '+12:00' },
    ],
  },
];

// Flatten timezones for easy lookup
const allTimezones = timezoneGroups.flatMap(g => g.timezones);

// Day names
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export default function BusinessPage() {
  return (
    <PageContainer
      title="Business Settings"
      description="Configure your business profile, location, and operating hours"
    >
      <BusinessContent />
    </PageContainer>
  );
}

function BusinessContent() {
  const { data: business, isLoading: businessLoading, refetch: refetchBusiness } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  const { data: hoursData, isLoading: hoursLoading, refetch: refetchHours } = useBusinessHours();
  const updateHours = useUpdateBusinessHours();
  const { data: closuresData, isLoading: closuresLoading, refetch: refetchClosures } = useBusinessClosures();
  const addClosure = useAddBusinessClosure();
  const deleteClosure = useDeleteBusinessClosure();

  const { meta: industryMeta, businessType } = useIndustry();
  const badgeClasses = getIndustryBadgeClasses(businessType);

  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState<Partial<Business>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [schedule, setSchedule] = useState<Record<number, { is_open: boolean; open_time: string; close_time: string }>>({});
  const [hoursHasChanges, setHoursHasChanges] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [closureReason, setClosureReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  const handleCountryChange = useCallback((countryCode: string) => {
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
  }, []);

  const currentTimezoneLabel = useMemo(() => {
    const tz = allTimezones.find(t => t.value === formData.timezone);
    return tz?.label || formData.timezone || 'Select timezone';
  }, [formData.timezone]);

  const currentCurrency = useMemo(() => {
    return currencies.find(c => c.code === formData.currency);
  }, [formData.currency]);

  const currentCountry = useMemo(() => {
    return countries.find(c => c.code === formData.country);
  }, [formData.country]);

  const handleToggleDay = useCallback((dayIndex: number) => {
    setSchedule(prev => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], is_open: !prev[dayIndex]?.is_open },
    }));
    setHoursHasChanges(true);
  }, []);

  const handleTimeChange = useCallback((dayIndex: number, field: 'open_time' | 'close_time', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], [field]: value },
    }));
    setHoursHasChanges(true);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
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

      toast.success('All changes saved successfully');
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const applyToWeekdays = useCallback(() => {
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
  }, [schedule]);

  const applyToWeekend = useCallback(() => {
    const saturday = schedule[5];
    if (!saturday) return;

    setSchedule(prev => ({
      ...prev,
      6: { ...saturday },
    }));
    setHoursHasChanges(true);
    toast.success('Applied Saturday schedule to Sunday');
  }, [schedule]);

  const setAllClosed = useCallback((days: number[]) => {
    setSchedule(prev => {
      const newSchedule = { ...prev };
      days.forEach(i => {
        newSchedule[i] = { ...prev[i], is_open: false };
      });
      return newSchedule;
    });
    setHoursHasChanges(true);
  }, []);

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
      toast.success('Closure added successfully');
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

  const closedDates = (closuresData || []).map(c => new Date(c.closure_date));
  const upcomingClosures = (closuresData || [])
    .filter(c => !isPast(new Date(c.closure_date)) || isToday(new Date(c.closure_date)))
    .sort((a, b) => new Date(a.closure_date).getTime() - new Date(b.closure_date).getTime());

  if (businessLoading || hoursLoading) {
    return <LoadingSkeleton />;
  }

  const totalChanges = (hasChanges ? 1 : 0) + (hoursHasChanges ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <TabsList className="grid w-full sm:w-auto grid-cols-4 sm:inline-flex h-auto p-1 bg-muted/50">
            <TabsTrigger
              value="profile"
              className="flex items-center gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger
              value="location"
              className="flex items-center gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Location</span>
            </TabsTrigger>
            <TabsTrigger
              value="hours"
              className="flex items-center gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Hours</span>
            </TabsTrigger>
            <TabsTrigger
              value="closures"
              className="flex items-center gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <CalendarOff className="h-4 w-4" />
              <span className="hidden sm:inline">Closures</span>
            </TabsTrigger>
          </TabsList>

          {/* Save Button - Desktop */}
          <AnimatePresence>
            {(hasChanges || hoursHasChanges) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="hidden sm:flex items-center gap-3"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>{totalChanges} unsaved {totalChanges === 1 ? 'change' : 'changes'}</span>
                </div>
                <Button onClick={handleSave} loading={isSaving} className="shadow-lg">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-0">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid gap-6 md:grid-cols-2"
          >
            {/* Business Identity Card */}
            <motion.div variants={fadeInUp}>
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    Business Identity
                  </CardTitle>
                  <CardDescription>Your business name and branding</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Business Avatar/Logo */}
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-dashed border-primary/30 transition-all group-hover:border-primary/50">
                        <Building2 className="h-8 w-8 text-primary/60" />
                      </div>
                      <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
                        <Camera className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Business Logo</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Recommended: 512x512px, PNG or JPG
                      </p>
                      <Button variant="outline" size="sm" className="mt-2 h-8">
                        Upload Logo
                      </Button>
                    </div>
                  </div>

                  {/* Business Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      Business Name
                      <span className="text-xs text-muted-foreground font-normal">
                        ({(formData.business_name || '').length}/100)
                      </span>
                    </label>
                    <Input
                      value={formData.business_name || ''}
                      onChange={(e) => handleChange('business_name', e.target.value)}
                      placeholder="Enter your business name"
                      maxLength={100}
                      className="h-11"
                    />
                  </div>

                  {/* Industry Badge */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Industry</label>
                    <div className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                      badgeClasses.bg,
                      badgeClasses.border
                    )}>
                      <div className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center',
                        'bg-gradient-to-br from-white/80 to-white/40 dark:from-white/20 dark:to-white/10'
                      )}>
                        <industryMeta.icon className={cn('h-5 w-5', badgeClasses.icon)} />
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">{industryMeta.name}</span>
                        <p className="text-xs text-muted-foreground">Set during onboarding</p>
                      </div>
                      <Badge variant="outline" className="ml-auto text-xs">
                        Locked
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Information Card */}
            <motion.div variants={fadeInUp}>
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                      <Phone className="h-4 w-4 text-green-600" />
                    </div>
                    Contact Information
                  </CardTitle>
                  <CardDescription>How customers can reach you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Phone Number */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="tel"
                        value={formData.phone_number || ''}
                        onChange={(e) => handleChange('phone_number', e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="h-11 pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Include country code for international calls
                    </p>
                  </div>

                  {/* Quick Stats */}
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Profile Completion</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Business name</span>
                        {formData.business_name ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Phone number</span>
                        {formData.phone_number ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Address</span>
                        {formData.address ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>

        {/* Location Tab */}
        <TabsContent value="location" className="mt-0">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid gap-6 md:grid-cols-2"
          >
            {/* Country & Regional Settings */}
            <motion.div variants={fadeInUp}>
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                      <Globe className="h-4 w-4 text-blue-600" />
                    </div>
                    Regional Settings
                  </CardTitle>
                  <CardDescription>Country, timezone, and currency preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Country Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Country</label>
                    <Select
                      value={formData.country || 'US'}
                      onValueChange={handleCountryChange}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue>
                          {currentCountry ? (
                            <span className="flex items-center gap-2">
                              <span className="text-lg">{currentCountry.flag}</span>
                              <span>{currentCountry.name}</span>
                            </span>
                          ) : 'Select country'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            <span className="flex items-center gap-2">
                              <span className="text-lg">{country.flag}</span>
                              <span>{country.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Changing country updates timezone and currency
                    </p>
                  </div>

                  {/* Timezone & Currency Row */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Timezone</label>
                      <Select
                        value={formData.timezone || 'America/New_York'}
                        onValueChange={(v) => handleChange('timezone', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue>
                            <span className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{currentTimezoneLabel}</span>
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {timezoneGroups.map((group) => (
                            <SelectGroup key={group.region}>
                              <SelectLabel className="text-xs font-bold text-primary bg-primary/5 py-2 px-2 -mx-1 rounded">
                                {group.region}
                              </SelectLabel>
                              {group.timezones.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  <span className="flex items-center justify-between gap-4">
                                    <span>{tz.label}</span>
                                    <span className="text-xs text-muted-foreground font-mono">
                                      UTC{tz.offset}
                                    </span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Currency</label>
                      <Select
                        value={formData.currency || 'USD'}
                        onValueChange={(v) => handleChange('currency', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue>
                            {currentCurrency ? (
                              <span className="flex items-center gap-2">
                                <span className="font-semibold text-primary w-6">{currentCurrency.symbol}</span>
                                <span>{currentCurrency.code}</span>
                              </span>
                            ) : 'Select currency'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {currencies.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              <span className="flex items-center gap-3">
                                <span className="font-semibold w-8 text-primary">{c.symbol}</span>
                                <span>{c.name}</span>
                                <span className="text-xs text-muted-foreground ml-auto">{c.code}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Current Time Display */}
                  {formData.timezone && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Current Local Time</p>
                          <p className="text-2xl font-bold font-mono mt-1">
                            <CurrentTime timezone={formData.timezone} />
                          </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Physical Address */}
            <motion.div variants={fadeInUp}>
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                      <MapPin className="h-4 w-4 text-orange-600" />
                    </div>
                    Physical Address
                  </CardTitle>
                  <CardDescription>Your business location for customers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Street Address */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Street Address</label>
                    <Input
                      value={formData.address || ''}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="123 Main Street, Suite 100"
                      className="h-11"
                    />
                  </div>

                  {/* City */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">City</label>
                    <Input
                      value={formData.city || ''}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="City name"
                      className="h-11"
                    />
                  </div>

                  {/* State & ZIP Row */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">State / Province</label>
                      <Input
                        value={formData.state || ''}
                        onChange={(e) => handleChange('state', e.target.value)}
                        placeholder="State or province"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">ZIP / Postal Code</label>
                      <Input
                        value={formData.zip_code || ''}
                        onChange={(e) => handleChange('zip_code', e.target.value)}
                        placeholder="Postal code"
                        className="h-11"
                      />
                    </div>
                  </div>

                  {/* Address Preview */}
                  {(formData.address || formData.city) && (
                    <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
                        Address Preview
                      </p>
                      <p className="text-sm">
                        {[
                          formData.address,
                          formData.city,
                          formData.state,
                          formData.zip_code,
                          currentCountry?.name
                        ].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>

        {/* Hours Tab */}
        <TabsContent value="hours" className="mt-0">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                        <Clock className="h-4 w-4 text-purple-600" />
                      </div>
                      Operating Hours
                    </CardTitle>
                    <CardDescription className="mt-1">Set when your business is open</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={applyToWeekdays} className="h-8">
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copy Mon → Weekdays
                    </Button>
                    <Button variant="outline" size="sm" onClick={applyToWeekend} className="h-8">
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copy Sat → Sun
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAllClosed([5, 6])}
                      className="h-8 text-destructive hover:text-destructive"
                    >
                      <Moon className="h-3.5 w-3.5 mr-1.5" />
                      Close Weekend
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Visual Week Schedule */}
                <div className="space-y-3">
                  {days.map((day, index) => {
                    const isOpen = schedule[index]?.is_open ?? index < 5;
                    const isWeekend = index >= 5;

                    return (
                      <motion.div
                        key={day}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          'group relative flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200',
                          isOpen
                            ? 'bg-card border-border hover:border-primary/30 hover:shadow-sm'
                            : 'bg-muted/20 border-border/50'
                        )}
                      >
                        {/* Day Toggle */}
                        <div className="flex items-center gap-3 min-w-[140px]">
                          <Switch
                            checked={isOpen}
                            onCheckedChange={() => handleToggleDay(index)}
                          />
                          <div className="flex items-center gap-2">
                            {isWeekend ? (
                              <Coffee className={cn('h-4 w-4', isOpen ? 'text-amber-500' : 'text-muted-foreground')} />
                            ) : (
                              <Sun className={cn('h-4 w-4', isOpen ? 'text-primary' : 'text-muted-foreground')} />
                            )}
                            <span className={cn(
                              'font-medium transition-colors',
                              !isOpen && 'text-muted-foreground'
                            )}>
                              {day}
                            </span>
                          </div>
                        </div>

                        {/* Time Inputs or Closed Label */}
                        <div className="flex-1 flex items-center gap-3 sm:justify-end">
                          {isOpen ? (
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                              <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                                <Input
                                  type="time"
                                  value={schedule[index]?.open_time || '09:00'}
                                  onChange={(e) => handleTimeChange(index, 'open_time', e.target.value)}
                                  className="h-9 w-[110px] text-center border-0 bg-background"
                                />
                                <span className="text-muted-foreground px-1">to</span>
                                <Input
                                  type="time"
                                  value={schedule[index]?.close_time || '17:00'}
                                  onChange={(e) => handleTimeChange(index, 'close_time', e.target.value)}
                                  className="h-9 w-[110px] text-center border-0 bg-background"
                                />
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs font-normal',
                                  'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                                )}
                              >
                                Open
                              </Badge>
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs font-normal bg-muted text-muted-foreground"
                            >
                              Closed
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        Open {Object.values(schedule).filter(s => s.is_open).length} days a week
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Object.entries(schedule)
                          .filter(([_, s]) => s.is_open)
                          .map(([i]) => shortDays[parseInt(i)])
                          .join(', ') || 'No open days set'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Closures Tab */}
        <TabsContent value="closures" className="mt-0">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid gap-6 lg:grid-cols-2"
          >
            {/* Add Closure */}
            <motion.div variants={fadeInUp}>
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                      <Plus className="h-4 w-4 text-red-600" />
                    </div>
                    Add Closure
                  </CardTitle>
                  <CardDescription>Schedule days when your business will be closed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Calendar */}
                  <div className="flex justify-center">
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
                      modifiersClassNames={{
                        closed: 'bg-destructive/20 text-destructive font-semibold rounded-lg',
                        selected: 'bg-primary text-primary-foreground rounded-lg',
                      }}
                      components={{
                        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                        IconRight: () => <ChevronRight className="h-4 w-4" />,
                      }}
                      classNames={{
                        months: 'flex flex-col space-y-4',
                        month: 'space-y-4',
                        caption: 'flex justify-center pt-1 relative items-center',
                        caption_label: 'text-sm font-semibold',
                        nav: 'space-x-1 flex items-center',
                        nav_button: 'h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 inline-flex items-center justify-center rounded-lg border border-input hover:bg-accent hover:text-accent-foreground transition-colors',
                        nav_button_previous: 'absolute left-1',
                        nav_button_next: 'absolute right-1',
                        table: 'w-full border-collapse',
                        head_row: 'flex',
                        head_cell: 'text-muted-foreground rounded-md w-10 font-medium text-[0.8rem] flex-1 text-center',
                        row: 'flex w-full mt-2',
                        cell: 'flex-1 h-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
                        day: 'h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-lg inline-flex items-center justify-center cursor-pointer transition-colors mx-auto',
                        day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                        day_today: 'bg-accent text-accent-foreground font-bold',
                        day_outside: 'text-muted-foreground opacity-50',
                        day_disabled: 'text-muted-foreground opacity-30 cursor-not-allowed hover:bg-transparent',
                        day_hidden: 'invisible',
                      }}
                      className="p-4 bg-muted/30 rounded-xl border"
                    />
                  </div>

                  {/* Reason Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Reason (optional)</label>
                    <Input
                      placeholder="e.g., Holiday, Renovation, Training"
                      value={closureReason}
                      onChange={(e) => setClosureReason(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  {/* Add Button */}
                  <Button
                    className="w-full h-11"
                    onClick={handleAddClosure}
                    disabled={!selectedDate}
                    loading={addClosure.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {selectedDate
                      ? `Add Closure for ${format(selectedDate, 'MMMM d, yyyy')}`
                      : 'Select a date to add closure'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Scheduled Closures List */}
            <motion.div variants={fadeInUp}>
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                          <Calendar className="h-4 w-4 text-amber-600" />
                        </div>
                        Scheduled Closures
                      </CardTitle>
                      <CardDescription className="mt-1">Upcoming and past closure dates</CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {upcomingClosures.length} upcoming
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {closuresLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-full rounded-xl" />
                      <Skeleton className="h-16 w-full rounded-xl" />
                      <Skeleton className="h-16 w-full rounded-xl" />
                    </div>
                  ) : upcomingClosures.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                        <CalendarOff className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <p className="font-medium text-foreground">No Scheduled Closures</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Select a date on the calendar to add one
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                      <AnimatePresence mode="popLayout">
                        {upcomingClosures.map((closure) => {
                          const closureDate = new Date(closure.closure_date);
                          const isUpcoming = !isPast(closureDate) || isToday(closureDate);
                          const isClosureToday = isToday(closureDate);

                          return (
                            <motion.div
                              key={closure.id}
                              layout
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className={cn(
                                'group flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200',
                                isClosureToday
                                  ? 'bg-destructive/5 border-destructive/30'
                                  : isUpcoming
                                    ? 'bg-card border-border hover:border-primary/30'
                                    : 'bg-muted/20 border-border/30 opacity-60'
                              )}
                            >
                              {/* Date Badge */}
                              <div className={cn(
                                'flex flex-col items-center justify-center w-14 h-14 rounded-xl text-center flex-shrink-0',
                                isClosureToday
                                  ? 'bg-destructive text-destructive-foreground'
                                  : isUpcoming
                                    ? 'bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20'
                                    : 'bg-muted'
                              )}>
                                <span className={cn(
                                  'text-[10px] font-bold uppercase tracking-wider',
                                  isClosureToday ? 'text-destructive-foreground/80' : 'text-destructive'
                                )}>
                                  {format(closureDate, 'MMM')}
                                </span>
                                <span className={cn(
                                  'text-xl font-bold leading-none',
                                  isClosureToday ? 'text-destructive-foreground' : 'text-foreground'
                                )}>
                                  {format(closureDate, 'd')}
                                </span>
                              </div>

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm truncate">
                                    {format(closureDate, 'EEEE')}
                                  </p>
                                  {isClosureToday && (
                                    <Badge variant="error" className="text-[10px] h-5">
                                      Today
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {closure.reason || 'No reason specified'}
                                </p>
                              </div>

                              {/* Delete Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClosure(closure.id)}
                                className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Mobile Save Button */}
      <AnimatePresence>
        {(hasChanges || hoursHasChanges) && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t sm:hidden z-50"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-muted-foreground">
                  {totalChanges} unsaved {totalChanges === 1 ? 'change' : 'changes'}
                </span>
              </div>
              <Button onClick={handleSave} loading={isSaving} className="shadow-lg">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Current Time Component
function CurrentTime({ timezone }: { timezone: string }) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const formatted = now.toLocaleTimeString('en-US', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
        setTime(formatted);
      } catch {
        setTime('--:--:--');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  return <>{time}</>;
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    </div>
  );
}
