/**
 * Industry-specific Navigation Configuration
 *
 * Defines the sidebar menu items for each business type.
 */

import {
  LayoutDashboard,
  Bot,
  Building2,
  Users,
  UserCircle,
  Activity,
  Settings,
  UtensilsCrossed,
  CalendarDays,
  ClipboardList,
  PartyPopper,
  BookOpen,
  Stethoscope,
  FileText,
  Shield,
  Scissors,
  Palette,
  Package,
  Sparkles,
  Heart,
  Home,
  MapPin,
  TrendingUp,
  Scale,
  Briefcase,
  FileCheck,
  Wrench,
  MapPinned,
  Hammer,
  Car,
  Gauge,
  FileSpreadsheet,
  Dumbbell,
  Trophy,
  CreditCard,
  PawPrint,
  Syringe,
  Dog,
  Hotel,
  BedDouble,
  Star,
  Brain,
  Clock,
  Lock,
  Droplets,
  Ruler,
  SprayCan,
  Repeat,
  Camera,
  Image,
  FolderOpen,
  type LucideIcon,
} from 'lucide-react';
import { type BusinessType } from './index';

// ============================================================================
// NAVIGATION ITEM TYPE
// ============================================================================

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: string;
  isNew?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

// ============================================================================
// CORE NAVIGATION (Shared by all industries)
// ============================================================================

const CORE_NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/' },
  { id: 'ai', label: 'AI Setup', icon: Bot, href: '/ai' },
];

const BOTTOM_NAV: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
];

// ============================================================================
// INDUSTRY-SPECIFIC NAVIGATION
// ============================================================================

const RESTAURANT_NAV: NavItem[] = [
  { id: 'reservations', label: 'Reservations', icon: CalendarDays, href: '/reservations' },
  { id: 'tables', label: 'Tables & Sections', icon: UtensilsCrossed, href: '/tables' },
  { id: 'events', label: 'Events', icon: PartyPopper, href: '/events' },
  { id: 'waitlist', label: 'Waitlist', icon: ClipboardList, href: '/waitlist' },
  { id: 'menu', label: 'Menu', icon: BookOpen, href: '/menu' },
  { id: 'guests', label: 'Guests', icon: UserCircle, href: '/customers' },
  { id: 'team', label: 'Team', icon: Users, href: '/team' },
  { id: 'activity', label: 'Activity', icon: Activity, href: '/activity' },
];

const MEDICAL_NAV: NavItem[] = [
  { id: 'appointments', label: 'Appointments', icon: CalendarDays, href: '/appointments' },
  { id: 'patients', label: 'Patients', icon: UserCircle, href: '/customers' },
  { id: 'providers', label: 'Providers', icon: Stethoscope, href: '/team' },
  { id: 'procedures', label: 'Procedures', icon: FileText, href: '/services' },
  { id: 'insurance', label: 'Insurance', icon: Shield, href: '/insurance' },
  { id: 'intake', label: 'Intake Forms', icon: ClipboardList, href: '/intake' },
  { id: 'activity', label: 'Activity', icon: Activity, href: '/activity' },
];

const SALON_NAV: NavItem[] = [
  { id: 'appointments', label: 'Appointments', icon: CalendarDays, href: '/appointments' },
  { id: 'clients', label: 'Clients', icon: UserCircle, href: '/customers' },
  { id: 'stylists', label: 'Stylists', icon: Scissors, href: '/team' },
  { id: 'services', label: 'Services', icon: Palette, href: '/services' },
  { id: 'products', label: 'Products', icon: Package, href: '/products' },
  { id: 'activity', label: 'Activity', icon: Activity, href: '/activity' },
];

const SPA_NAV: NavItem[] = [
  { id: 'appointments', label: 'Appointments', icon: CalendarDays, href: '/appointments' },
  { id: 'guests', label: 'Guests', icon: UserCircle, href: '/customers' },
  { id: 'therapists', label: 'Therapists', icon: Sparkles, href: '/team' },
  { id: 'treatments', label: 'Treatments', icon: Heart, href: '/services' },
  { id: 'packages', label: 'Packages', icon: Package, href: '/packages' },
  { id: 'rooms', label: 'Rooms', icon: Building2, href: '/rooms' },
  { id: 'activity', label: 'Activity', icon: Activity, href: '/activity' },
];

const REAL_ESTATE_NAV: NavItem[] = [
  { id: 'properties', label: 'Properties', icon: Home, href: '/properties' },
  { id: 'showings', label: 'Showings', icon: CalendarDays, href: '/showings' },
  { id: 'leads', label: 'Leads', icon: UserCircle, href: '/customers' },
  { id: 'agents', label: 'Agents', icon: Users, href: '/team' },
  { id: 'pipeline', label: 'Pipeline', icon: TrendingUp, href: '/pipeline' },
  { id: 'areas', label: 'Service Areas', icon: MapPin, href: '/areas' },
  { id: 'activity', label: 'Activity', icon: Activity, href: '/activity' },
];

const LEGAL_NAV: NavItem[] = [
  { id: 'consultations', label: 'Consultations', icon: CalendarDays, href: '/consultations' },
  { id: 'clients', label: 'Clients', icon: UserCircle, href: '/customers' },
  { id: 'cases', label: 'Cases', icon: Briefcase, href: '/cases' },
  { id: 'attorneys', label: 'Attorneys', icon: Scale, href: '/team' },
  { id: 'practice', label: 'Practice Areas', icon: FileCheck, href: '/practice-areas' },
  { id: 'intake', label: 'Intake', icon: ClipboardList, href: '/intake' },
  { id: 'activity', label: 'Activity', icon: Activity, href: '/activity' },
];

const HOME_SERVICES_NAV: NavItem[] = [
  { id: 'jobs', label: 'Jobs', icon: CalendarDays, href: '/jobs' },
  { id: 'customers', label: 'Customers', icon: UserCircle, href: '/customers' },
  { id: 'technicians', label: 'Technicians', icon: Wrench, href: '/team' },
  { id: 'services', label: 'Services', icon: Hammer, href: '/services' },
  { id: 'areas', label: 'Service Areas', icon: MapPinned, href: '/areas' },
  { id: 'estimates', label: 'Estimates', icon: FileSpreadsheet, href: '/estimates' },
  { id: 'activity', label: 'Activity', icon: Activity, href: '/activity' },
];

const AUTO_REPAIR_NAV: NavItem[] = [
  { id: 'appointments', label: 'Appointments', icon: CalendarDays, href: '/appointments' },
  { id: 'customers', label: 'Customers', icon: UserCircle, href: '/customers' },
  { id: 'vehicles', label: 'Vehicles', icon: Car, href: '/vehicles' },
  { id: 'technicians', label: 'Technicians', icon: Wrench, href: '/team' },
  { id: 'services', label: 'Services', icon: Gauge, href: '/services' },
  { id: 'work-orders', label: 'Work Orders', icon: ClipboardList, href: '/work-orders' },
  { id: 'activity', label: 'Activity', icon: Activity, href: '/activity' },
];

const FITNESS_NAV: NavItem[] = [
  { id: 'classes', label: 'Classes', icon: CalendarDays, href: '/classes' },
  { id: 'training', label: 'Training', icon: Dumbbell, href: '/training' },
  { id: 'members', label: 'Members', icon: UserCircle, href: '/customers' },
  { id: 'instructors', label: 'Instructors', icon: Trophy, href: '/team' },
  { id: 'memberships', label: 'Memberships', icon: CreditCard, href: '/memberships' },
  { id: 'studios', label: 'Studios', icon: Building2, href: '/studios' },
  { id: 'activity', label: 'Activity', icon: Activity, href: '/activity' },
];

const VET_NAV: NavItem[] = [
  { id: 'appointments', label: 'Appointments', icon: CalendarDays, href: '/appointments' },
  { id: 'pets', label: 'Pets', icon: PawPrint, href: '/pets' },
  { id: 'pet-parents', label: 'Pet Parents', icon: UserCircle, href: '/customers' },
  { id: 'veterinarians', label: 'Veterinarians', icon: Stethoscope, href: '/team' },
  { id: 'services', label: 'Services', icon: Syringe, href: '/services' },
  { id: 'boarding', label: 'Boarding', icon: Dog, href: '/boarding' },
  { id: 'grooming', label: 'Grooming', icon: Scissors, href: '/grooming' },
  { id: 'activity', label: 'Activity', icon: Activity, href: '/activity' },
];

const HOTEL_NAV: NavItem[] = [
  { id: 'reservations', label: 'Reservations', icon: CalendarDays, href: '/reservations' },
  { id: 'rooms', label: 'Rooms', icon: BedDouble, href: '/rooms' },
  { id: 'guests', label: 'Guests', icon: UserCircle, href: '/customers' },
  { id: 'room-types', label: 'Room Types', icon: Hotel, href: '/room-types' },
  { id: 'rates', label: 'Rates', icon: CreditCard, href: '/rates' },
  { id: 'amenities', label: 'Amenities', icon: Star, href: '/amenities' },
  { id: 'team', label: 'Team', icon: Users, href: '/team' },
  { id: 'activity', label: 'Activity', icon: Activity, href: '/activity' },
];

const THERAPY_NAV: NavItem[] = [
  { id: 'sessions', label: 'Sessions', icon: CalendarDays, href: '/sessions' },
  { id: 'clients', label: 'Clients', icon: UserCircle, href: '/customers' },
  { id: 'therapists', label: 'Therapists', icon: Brain, href: '/team' },
  { id: 'specialties', label: 'Specialties', icon: Heart, href: '/specialties' },
  { id: 'insurance', label: 'Insurance', icon: Shield, href: '/insurance' },
  { id: 'intake', label: 'Intake Forms', icon: ClipboardList, href: '/intake' },
  { id: 'activity', label: 'Activity', icon: Activity, href: '/activity' },
];

const MED_SPA_NAV: NavItem[] = [
  { id: 'appointments', label: 'Appointments', icon: CalendarDays, href: '/appointments' },
  { id: 'clients', label: 'Clients', icon: UserCircle, href: '/customers' },
  { id: 'providers', label: 'Providers', icon: Syringe, href: '/team' },
  { id: 'treatments', label: 'Treatments', icon: Sparkles, href: '/services' },
  { id: 'packages', label: 'Packages', icon: Package, href: '/packages' },
  { id: 'consultations', label: 'Consultations', icon: Clock, href: '/consultations' },
  { id: 'activity', label: 'Activity', icon: Activity, href: '/activity' },
];

const CLEANING_NAV: NavItem[] = [
  { id: 'jobs', label: 'Jobs', icon: CalendarDays, href: '/jobs' },
  { id: 'customers', label: 'Customers', icon: UserCircle, href: '/customers' },
  { id: 'properties', label: 'Properties', icon: Home, href: '/properties' },
  { id: 'crews', label: 'Crews', icon: Users, href: '/team' },
  { id: 'services', label: 'Services', icon: SprayCan, href: '/services' },
  { id: 'recurring', label: 'Recurring', icon: Repeat, href: '/recurring' },
  { id: 'estimates', label: 'Estimates', icon: FileSpreadsheet, href: '/estimates' },
  { id: 'activity', label: 'Activity', icon: Activity, href: '/activity' },
];

const PHOTOGRAPHY_NAV: NavItem[] = [
  { id: 'sessions', label: 'Sessions', icon: CalendarDays, href: '/sessions' },
  { id: 'clients', label: 'Clients', icon: UserCircle, href: '/customers' },
  { id: 'session-types', label: 'Session Types', icon: Camera, href: '/session-types' },
  { id: 'packages', label: 'Packages', icon: Package, href: '/packages' },
  { id: 'galleries', label: 'Galleries', icon: Image, href: '/galleries' },
  { id: 'team', label: 'Team', icon: Users, href: '/team' },
  { id: 'activity', label: 'Activity', icon: Activity, href: '/activity' },
];

const GENERIC_NAV: NavItem[] = [
  { id: 'appointments', label: 'Appointments', icon: CalendarDays, href: '/appointments' },
  { id: 'customers', label: 'Customers', icon: UserCircle, href: '/customers' },
  { id: 'team', label: 'Team', icon: Users, href: '/team' },
  { id: 'services', label: 'Services', icon: Package, href: '/services' },
  { id: 'business', label: 'Business', icon: Building2, href: '/business' },
  { id: 'activity', label: 'Activity', icon: Activity, href: '/activity' },
];

// ============================================================================
// NAVIGATION GETTER
// ============================================================================

const INDUSTRY_NAV_MAP: Record<BusinessType, NavItem[]> = {
  restaurant: RESTAURANT_NAV,
  medical: MEDICAL_NAV,
  salon: SALON_NAV,
  spa: SPA_NAV,
  real_estate: REAL_ESTATE_NAV,
  legal: LEGAL_NAV,
  home_services: HOME_SERVICES_NAV,
  auto_repair: AUTO_REPAIR_NAV,
  fitness: FITNESS_NAV,
  vet: VET_NAV,
  hotel: HOTEL_NAV,
  therapy: THERAPY_NAV,
  med_spa: MED_SPA_NAV,
  cleaning: CLEANING_NAV,
  photography: PHOTOGRAPHY_NAV,
  generic: GENERIC_NAV,
};

export function getIndustryNavigation(businessType: BusinessType): {
  main: NavItem[];
  bottom: NavItem[];
} {
  const industryNav = INDUSTRY_NAV_MAP[businessType] || GENERIC_NAV;

  return {
    main: [...CORE_NAV, ...industryNav],
    bottom: BOTTOM_NAV,
  };
}

export function getAllNavItems(businessType: BusinessType): NavItem[] {
  const { main, bottom } = getIndustryNavigation(businessType);
  return [...main, ...bottom];
}
