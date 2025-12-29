import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Camera,
  Sparkles,
  Info,
  Instagram,
  Facebook,
  Loader2,
} from 'lucide-react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, isToday, eachDayOfInterval, getYear, isSameMonth } from 'date-fns';
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
  useUploadBusinessLogo,
  useDeleteBusinessLogo,
  useBusinessHours,
  useUpdateBusinessHours,
  useBusinessClosures,
  useAddBusinessClosure,
  useDeleteBusinessClosure,
  useFetchPublicHolidays,
} from '@/lib/api/hooks';
import type { Business, BusinessHours } from '@/types';

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
  const uploadLogo = useUploadBusinessLogo();
  const deleteLogo = useDeleteBusinessLogo();
  const { data: hoursData, isLoading: hoursLoading, refetch: refetchHours } = useBusinessHours();
  const updateHours = useUpdateBusinessHours();
  const { data: closuresData, isLoading: closuresLoading, refetch: refetchClosures } = useBusinessClosures();
  const addClosure = useAddBusinessClosure();
  const deleteClosure = useDeleteBusinessClosure();
  const fetchHolidays = useFetchPublicHolidays();


  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState<Partial<Business>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [schedule, setSchedule] = useState<Record<number, { is_open: boolean; open_time: string; close_time: string }>>({});
  const [hoursHasChanges, setHoursHasChanges] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [closureReason, setClosureReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const hasAutoRefreshedHolidays = useRef(false);

  // File input ref for logo upload
  const fileInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      node.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          await handleLogoUpload(file);
        }
      };
    }
  }, []);

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
        email: business.email,
        website: business.website,
        instagram_url: business.instagram_url,
        facebook_url: business.facebook_url,
        logo_url: business.logo_url,
        country: business.country,
        currency: business.currency || 'USD',
      });
    }
  }, [business]);

  const handleLogoUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a PNG, JPG, GIF, or WebP image.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const result = await uploadLogo.mutateAsync(file);
      setFormData(prev => ({ ...prev, logo_url: result.logo_url }));
      toast.success('Logo uploaded successfully');
      refetchBusiness();
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleLogoDelete = async () => {
    try {
      await deleteLogo.mutateAsync();
      setFormData(prev => ({ ...prev, logo_url: undefined }));
      toast.success('Logo removed');
      refetchBusiness();
    } catch (error) {
      toast.error('Failed to remove logo');
    }
  };

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

  const handleCountryChange = useCallback(async (countryCode: string) => {
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

      // Auto-fetch national holidays for the selected country
      const currentYear = getYear(new Date());
      try {
        const result = await fetchHolidays.mutateAsync({
          countryCode: countryCode,
          year: currentYear,
        });
        if (result.unsupported) {
          toast.info(`Holiday data not available for ${country.name}. You can add closures manually.`);
        } else if (result.added > 0) {
          toast.success(`Added ${result.added} national holidays for ${country.name} (${currentYear}-${currentYear + 2})`);
        } else if (result.total > 0) {
          toast.info(`All holidays for ${country.name} already added`);
        }
      } catch (error) {
        console.warn('Could not fetch holidays:', error);
      }
    }
  }, [fetchHolidays]);

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


  const handleAddClosure = async () => {
    if (!dateRange?.from) {
      toast.error('Please select a date');
      return;
    }

    try {
      // Get all dates in the range
      const dates = dateRange.to
        ? eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
        : [dateRange.from];

      // Filter out dates that are already closed
      const existingDates = new Set((closuresData || []).map(c => c.closure_date));
      const newDates = dates.filter(d => !existingDates.has(format(d, 'yyyy-MM-dd')));

      // Add each date
      for (const date of newDates) {
        await addClosure.mutateAsync({
          closure_date: format(date, 'yyyy-MM-dd'),
          reason: closureReason || undefined,
        });
      }

      toast.success(`${newDates.length} closure${newDates.length !== 1 ? 's' : ''} added`);
      setDateRange(undefined);
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

  // Auto-refresh holidays if latest closure is less than 1 year away (runs once per session)
  useEffect(() => {
    if (!closuresData || !formData.country || fetchHolidays.isPending || hasAutoRefreshedHolidays.current) return;

    const now = new Date();
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    // Find the latest closure date
    const latestClosure = closuresData.reduce((latest, c) => {
      const date = new Date(c.closure_date);
      return date > latest ? date : latest;
    }, new Date(0));

    // If latest closure is less than 1 year away, fetch more (silently)
    if (latestClosure < oneYearFromNow && closuresData.length > 0) {
      hasAutoRefreshedHolidays.current = true;
      const currentYear = getYear(new Date());
      fetchHolidays.mutate({
        countryCode: formData.country,
        year: currentYear,
      });
    }
  }, [closuresData, formData.country]);

  // Filter closures by selected calendar month
  const monthClosures = (closuresData || [])
    .filter(c => isSameMonth(new Date(c.closure_date), calendarMonth))
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
          <TabsList className="grid w-full sm:w-auto grid-cols-3 sm:inline-flex h-auto p-1 bg-muted/50">
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
              <span className="hidden sm:inline">Hours & Closures</span>
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
            variants={fadeInUp}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left: Logo Section */}
                  <div className="flex flex-col items-center lg:items-start gap-3 lg:w-48 flex-shrink-0">
                    <div className="relative group">
                      {formData.logo_url ? (
                        <div className="h-32 w-32 rounded-2xl overflow-hidden border-2 border-border shadow-sm">
                          <img
                            src={formData.logo_url}
                            alt="Business logo"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-32 w-32 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center border-2 border-dashed border-primary/30 transition-all group-hover:border-primary/50">
                          {isUploadingLogo ? (
                            <Loader2 className="h-8 w-8 text-primary/60 animate-spin" />
                          ) : (
                            <Building2 className="h-10 w-10 text-primary/40" />
                          )}
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        className="hidden"
                        id="logo-upload"
                        ref={fileInputRef}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                        disabled={isUploadingLogo}
                      >
                        {isUploadingLogo ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Camera className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {isUploadingLogo ? 'Uploading...' : 'Change'}
                      </Button>
                      {formData.logo_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={handleLogoDelete}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground text-center lg:text-left">
                      PNG, JPG up to 5MB
                    </p>
                  </div>

                  {/* Right: Form Fields */}
                  <div className="flex-1 space-y-6">
                    {/* Row 1: Business Name */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Business Name</label>
                      <Input
                        value={formData.business_name || ''}
                        onChange={(e) => handleChange('business_name', e.target.value)}
                        placeholder="Enter your business name"
                        maxLength={100}
                        className="h-10"
                      />
                    </div>

                    {/* Row 2: Phone & Email */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Phone Number</label>
                        <div className="flex gap-2">
                          <Select
                            value={formData.country || 'US'}
                            onValueChange={(code) => handleChange('country', code)}
                          >
                            <SelectTrigger className="w-[90px] h-10 flex-shrink-0">
                              <SelectValue>
                                {currentCountry ? (
                                  <span className="flex items-center gap-1">
                                    <span className="text-base">{currentCountry.flag}</span>
                                  </span>
                                ) : '🇺🇸'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {countries.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  <span className="flex items-center gap-2">
                                    <span>{country.flag}</span>
                                    <span>{country.name}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="tel"
                            value={formData.phone_number || ''}
                            onChange={(e) => handleChange('phone_number', e.target.value)}
                            placeholder="(555) 000-0000"
                            className="h-10 flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Email Address</label>
                        <Input
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => handleChange('email', e.target.value)}
                          placeholder="contact@yourbusiness.com"
                          className="h-10"
                        />
                      </div>
                    </div>

                    {/* Row 3: Website */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Website</label>
                      <Input
                        type="url"
                        value={formData.website || ''}
                        onChange={(e) => handleChange('website', e.target.value)}
                        placeholder="https://yourbusiness.com"
                        className="h-10"
                      />
                    </div>

                    {/* Row 4: Social Media */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <Instagram className="h-4 w-4 text-pink-500" />
                          Instagram
                        </label>
                        <Input
                          type="url"
                          value={formData.instagram_url || ''}
                          onChange={(e) => handleChange('instagram_url', e.target.value)}
                          placeholder="instagram.com/yourbusiness"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <Facebook className="h-4 w-4 text-blue-600" />
                          Facebook
                        </label>
                        <Input
                          type="url"
                          value={formData.facebook_url || ''}
                          onChange={(e) => handleChange('facebook_url', e.target.value)}
                          placeholder="facebook.com/yourbusiness"
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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

        {/* Hours & Closures Tab */}
        <TabsContent value="hours" className="mt-0">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Single Card Layout */}
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-8 lg:grid-cols-2">
                  {/* Left: Operating Hours */}
                  <motion.div variants={fadeInUp}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        Operating Hours
                      </h3>
                    </div>

                    {/* Column Headers */}
                    <div className="flex items-center py-2 px-4 mb-2 text-xs font-medium text-muted-foreground">
                      <div className="w-[52px]"></div>
                      <div className="w-12"></div>
                      <div className="flex-1 flex items-center justify-end gap-3">
                        <span className="w-28 text-center">Open</span>
                        <span className="w-4"></span>
                        <span className="w-28 text-center">Close</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {days.map((day, index) => {
                        const isOpen = schedule[index]?.is_open ?? index < 5;

                        return (
                          <div
                            key={day}
                            className={cn(
                              'flex items-center py-3 px-4 rounded-xl border transition-all',
                              isOpen
                                ? 'bg-card border-border hover:border-primary/30'
                                : 'bg-muted/30 border-transparent'
                            )}
                          >
                            <Switch
                              checked={isOpen}
                              onCheckedChange={() => handleToggleDay(index)}
                            />
                            <span className={cn(
                              'ml-4 text-sm font-medium w-12',
                              !isOpen && 'text-muted-foreground'
                            )}>
                              {shortDays[index]}
                            </span>
                            <div className="flex-1 flex items-center justify-end gap-3">
                              {isOpen ? (
                                <>
                                  <Input
                                    type="time"
                                    value={schedule[index]?.open_time || '09:00'}
                                    onChange={(e) => handleTimeChange(index, 'open_time', e.target.value)}
                                    className="h-9 w-28 text-sm text-center"
                                  />
                                  <span className="text-muted-foreground text-sm">—</span>
                                  <Input
                                    type="time"
                                    value={schedule[index]?.close_time || '17:00'}
                                    onChange={(e) => handleTimeChange(index, 'close_time', e.target.value)}
                                    className="h-9 w-28 text-sm text-center"
                                  />
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">Closed</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 pt-4 border-t flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Open <span className="font-medium text-foreground">{Object.values(schedule).filter(s => s.is_open).length}</span> days per week
                      </span>
                    </div>
                  </motion.div>

                  {/* Right: Scheduled Closures */}
                  <motion.div variants={fadeInUp} className="lg:border-l lg:pl-8">
                    <div className="flex items-center mb-4">
                      <h3 className="text-base font-semibold flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                          <CalendarOff className="h-4 w-4 text-destructive" />
                        </div>
                        Scheduled Closures
                      </h3>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      {/* Calendar Section */}
                      <div>
                        <DayPicker
                          mode="range"
                          selected={dateRange}
                          onSelect={setDateRange}
                          month={calendarMonth}
                          onMonthChange={setCalendarMonth}
                          disabled={[{ before: new Date() }]}
                          modifiers={{
                            closed: closedDates,
                          }}
                          modifiersClassNames={{
                            closed: 'bg-destructive/20 text-destructive rounded-lg',
                          }}
                          components={{
                            IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                            IconRight: () => <ChevronRight className="h-4 w-4" />,
                          }}
                          classNames={{
                            months: 'flex flex-col',
                            month: 'space-y-3',
                            caption: 'flex justify-center relative items-center h-9',
                            caption_label: 'text-sm font-semibold',
                            nav: 'flex items-center',
                            nav_button: 'h-8 w-8 bg-transparent p-0 hover:bg-accent inline-flex items-center justify-center rounded-lg transition-colors',
                            nav_button_previous: 'absolute left-0',
                            nav_button_next: 'absolute right-0',
                            table: 'w-full border-collapse',
                            head_row: 'flex',
                            head_cell: 'text-muted-foreground w-10 font-medium text-xs flex-1 text-center py-2',
                            row: 'flex w-full',
                            cell: 'flex-1 h-10 text-center text-sm p-0.5 relative',
                            day: 'h-10 w-10 p-0 font-normal hover:bg-accent hover:text-accent-foreground rounded-lg inline-flex items-center justify-center cursor-pointer transition-colors mx-auto',
                            day_selected: 'bg-primary text-primary-foreground hover:bg-primary',
                            day_today: 'bg-accent text-accent-foreground font-semibold',
                            day_outside: 'text-muted-foreground opacity-50',
                            day_disabled: 'text-muted-foreground opacity-30 cursor-not-allowed hover:bg-transparent',
                            day_range_middle: 'bg-primary/10 rounded-none',
                            day_range_start: 'bg-primary text-primary-foreground rounded-l-lg rounded-r-none',
                            day_range_end: 'bg-primary text-primary-foreground rounded-r-lg rounded-l-none',
                            day_hidden: 'invisible',
                          }}
                          className="p-0"
                        />

                        <div className="mt-4 space-y-3">
                          {dateRange?.from && (
                            <div className="text-sm text-center py-2 px-3 bg-primary/5 rounded-lg border border-primary/20">
                              {dateRange.to
                                ? `${format(dateRange.from, 'MMM d')} — ${format(dateRange.to, 'MMM d, yyyy')}`
                                : format(dateRange.from, 'MMMM d, yyyy')}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Input
                              placeholder="Reason (optional)"
                              value={closureReason}
                              onChange={(e) => setClosureReason(e.target.value)}
                              className="h-10"
                            />
                            <Button
                              className="h-10 px-5"
                              onClick={handleAddClosure}
                              disabled={!dateRange?.from}
                              loading={addClosure.isPending}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Monthly Closures List */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-muted-foreground">
                            {format(calendarMonth, 'MMMM yyyy')}
                          </span>
                          <Badge variant="secondary">
                            {monthClosures.length}
                          </Badge>
                        </div>

                        {closuresLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-14 w-full rounded-xl" />
                            <Skeleton className="h-14 w-full rounded-xl" />
                            <Skeleton className="h-14 w-full rounded-xl" />
                          </div>
                        ) : monthClosures.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-[280px] text-center bg-muted/20 rounded-xl border-2 border-dashed border-muted-foreground/20">
                            <CalendarOff className="h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-sm font-medium text-muted-foreground">No closures in {format(calendarMonth, 'MMMM')}</p>
                            <p className="text-xs text-muted-foreground/70 mt-1 max-w-[180px]">
                              Select dates to add closure days
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                            <AnimatePresence mode="popLayout">
                              {monthClosures.map((closure) => {
                                const closureDate = new Date(closure.closure_date);
                                const isClosureToday = isToday(closureDate);

                                return (
                                  <motion.div
                                    key={closure.id}
                                    layout
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className={cn(
                                      'group flex items-center gap-3 p-3 rounded-xl border transition-all',
                                      isClosureToday
                                        ? 'bg-destructive/5 border-destructive/30'
                                        : 'bg-card border-border hover:border-primary/30 hover:shadow-sm'
                                    )}
                                  >
                                    <div className={cn(
                                      'flex flex-col items-center justify-center w-12 h-12 rounded-lg text-center flex-shrink-0',
                                      isClosureToday
                                        ? 'bg-destructive text-destructive-foreground'
                                        : 'bg-muted'
                                    )}>
                                      <span className="text-[10px] font-bold uppercase">
                                        {format(closureDate, 'MMM')}
                                      </span>
                                      <span className="text-lg font-bold leading-none">
                                        {format(closureDate, 'd')}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium flex items-center gap-2">
                                        {format(closureDate, 'EEEE')}
                                        {isClosureToday && (
                                          <Badge variant="error" className="text-[10px]">
                                            Today
                                          </Badge>
                                        )}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                                        {closure.reason || 'No reason specified'}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteClosure(closure.id)}
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
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
