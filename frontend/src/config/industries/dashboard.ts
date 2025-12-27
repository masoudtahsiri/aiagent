/**
 * Industry-specific Dashboard Configuration
 *
 * Defines the dashboard widgets and quick stats for each business type.
 */

import {
  CalendarDays,
  Users,
  Phone,
  TrendingUp,
  Clock,
  DollarSign,
  UserPlus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  Home,
  Car,
  PawPrint,
  Dumbbell,
  Scissors,
  UtensilsCrossed,
  BedDouble,
  Briefcase,
  Wrench,
  Camera,
  SprayCan,
  Brain,
  Syringe,
  type LucideIcon,
} from 'lucide-react';
import { type BusinessType } from './index';

// ============================================================================
// WIDGET TYPES
// ============================================================================

export type WidgetType =
  | 'stat'
  | 'list'
  | 'calendar'
  | 'chart'
  | 'table'
  | 'map'
  | 'timeline';

export interface DashboardWidget {
  id: string;
  title: string;
  type: WidgetType;
  icon: LucideIcon;
  size: 'sm' | 'md' | 'lg' | 'xl';
  dataSource: string;
  config?: Record<string, unknown>;
}

export interface QuickStat {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  dataKey: string;
  format?: 'number' | 'currency' | 'percent' | 'duration';
}

export interface DashboardConfig {
  widgets: DashboardWidget[];
  quickStats: QuickStat[];
  alerts: string[];
}

// ============================================================================
// COMMON WIDGETS
// ============================================================================

const COMMON_WIDGETS = {
  recentCalls: {
    id: 'recent-calls',
    title: 'Recent Calls',
    type: 'list' as WidgetType,
    icon: Phone,
    size: 'lg' as const,
    dataSource: 'calls',
  },
  aiStatus: {
    id: 'ai-status',
    title: 'AI Status',
    type: 'stat' as WidgetType,
    icon: CheckCircle,
    size: 'sm' as const,
    dataSource: 'ai_status',
  },
};

// ============================================================================
// RESTAURANT DASHBOARD
// ============================================================================

const RESTAURANT_CONFIG: DashboardConfig = {
  widgets: [
    {
      id: 'todays-reservations',
      title: "Today's Reservations",
      type: 'list',
      icon: CalendarDays,
      size: 'lg',
      dataSource: 'reservations_today',
    },
    {
      id: 'table-availability',
      title: 'Table Availability',
      type: 'table',
      icon: UtensilsCrossed,
      size: 'lg',
      dataSource: 'tables',
    },
    {
      id: 'waitlist',
      title: 'Current Waitlist',
      type: 'list',
      icon: Clock,
      size: 'md',
      dataSource: 'waitlist',
    },
    {
      id: 'upcoming-events',
      title: 'Upcoming Events',
      type: 'list',
      icon: Star,
      size: 'md',
      dataSource: 'events',
    },
    COMMON_WIDGETS.recentCalls,
  ],
  quickStats: [
    { id: 'reservations', label: 'Reservations Today', icon: CalendarDays, color: 'primary', dataKey: 'reservations_today' },
    { id: 'covers', label: 'Covers Today', icon: Users, color: 'success', dataKey: 'covers_today' },
    { id: 'waitlist', label: 'Waitlist', icon: Clock, color: 'warning', dataKey: 'waitlist_count' },
    { id: 'no-shows', label: 'No Shows', icon: XCircle, color: 'destructive', dataKey: 'no_shows' },
  ],
  alerts: ['low_table_availability', 'upcoming_large_party', 'special_event_today'],
};

// ============================================================================
// MEDICAL DASHBOARD
// ============================================================================

const MEDICAL_CONFIG: DashboardConfig = {
  widgets: [
    {
      id: 'todays-appointments',
      title: "Today's Patients",
      type: 'list',
      icon: CalendarDays,
      size: 'lg',
      dataSource: 'appointments_today',
    },
    {
      id: 'provider-schedule',
      title: 'Provider Schedule',
      type: 'calendar',
      icon: Users,
      size: 'lg',
      dataSource: 'provider_schedule',
    },
    {
      id: 'pending-confirmations',
      title: 'Pending Confirmations',
      type: 'list',
      icon: AlertCircle,
      size: 'md',
      dataSource: 'pending_confirmations',
    },
    COMMON_WIDGETS.recentCalls,
  ],
  quickStats: [
    { id: 'patients', label: 'Patients Today', icon: Users, color: 'primary', dataKey: 'appointments_today' },
    { id: 'new-patients', label: 'New Patients', icon: UserPlus, color: 'success', dataKey: 'new_patients' },
    { id: 'cancellations', label: 'Cancellations', icon: XCircle, color: 'warning', dataKey: 'cancellations' },
    { id: 'no-shows', label: 'No Shows', icon: AlertCircle, color: 'destructive', dataKey: 'no_shows' },
  ],
  alerts: ['insurance_verification_pending', 'intake_incomplete', 'appointment_reminder_due'],
};

// ============================================================================
// SALON DASHBOARD
// ============================================================================

const SALON_CONFIG: DashboardConfig = {
  widgets: [
    {
      id: 'todays-appointments',
      title: "Today's Appointments",
      type: 'list',
      icon: CalendarDays,
      size: 'lg',
      dataSource: 'appointments_today',
    },
    {
      id: 'stylist-schedule',
      title: 'Stylist Schedule',
      type: 'calendar',
      icon: Scissors,
      size: 'lg',
      dataSource: 'stylist_schedule',
    },
    {
      id: 'walk-ins',
      title: 'Walk-in Queue',
      type: 'list',
      icon: Users,
      size: 'md',
      dataSource: 'walkins',
    },
    COMMON_WIDGETS.recentCalls,
  ],
  quickStats: [
    { id: 'appointments', label: 'Appointments', icon: CalendarDays, color: 'primary', dataKey: 'appointments_today' },
    { id: 'revenue', label: 'Revenue Today', icon: DollarSign, color: 'success', dataKey: 'revenue_today', format: 'currency' },
    { id: 'new-clients', label: 'New Clients', icon: UserPlus, color: 'info', dataKey: 'new_clients' },
    { id: 'rebookings', label: 'Rebookings', icon: TrendingUp, color: 'warning', dataKey: 'rebookings' },
  ],
  alerts: ['stylist_double_booked', 'product_low_stock', 'birthday_this_week'],
};

// ============================================================================
// SPA DASHBOARD
// ============================================================================

const SPA_CONFIG: DashboardConfig = {
  widgets: [
    {
      id: 'todays-appointments',
      title: "Today's Appointments",
      type: 'list',
      icon: CalendarDays,
      size: 'lg',
      dataSource: 'appointments_today',
    },
    {
      id: 'room-availability',
      title: 'Room Availability',
      type: 'table',
      icon: Home,
      size: 'md',
      dataSource: 'room_availability',
    },
    {
      id: 'package-bookings',
      title: 'Package Bookings',
      type: 'list',
      icon: Star,
      size: 'md',
      dataSource: 'package_bookings',
    },
    COMMON_WIDGETS.recentCalls,
  ],
  quickStats: [
    { id: 'appointments', label: 'Appointments', icon: CalendarDays, color: 'primary', dataKey: 'appointments_today' },
    { id: 'revenue', label: 'Revenue', icon: DollarSign, color: 'success', dataKey: 'revenue_today', format: 'currency' },
    { id: 'new-guests', label: 'New Guests', icon: UserPlus, color: 'info', dataKey: 'new_guests' },
    { id: 'packages-sold', label: 'Packages Sold', icon: Star, color: 'warning', dataKey: 'packages_sold' },
  ],
  alerts: ['couples_room_needed', 'therapist_unavailable', 'package_expiring'],
};

// ============================================================================
// REAL ESTATE DASHBOARD
// ============================================================================

const REAL_ESTATE_CONFIG: DashboardConfig = {
  widgets: [
    {
      id: 'todays-showings',
      title: "Today's Showings",
      type: 'list',
      icon: CalendarDays,
      size: 'lg',
      dataSource: 'showings_today',
    },
    {
      id: 'active-listings',
      title: 'Active Listings',
      type: 'stat',
      icon: Home,
      size: 'md',
      dataSource: 'listings',
    },
    {
      id: 'new-leads',
      title: 'New Leads',
      type: 'list',
      icon: UserPlus,
      size: 'md',
      dataSource: 'new_leads',
    },
    {
      id: 'hot-properties',
      title: 'Hot Properties',
      type: 'list',
      icon: TrendingUp,
      size: 'md',
      dataSource: 'hot_properties',
    },
    COMMON_WIDGETS.recentCalls,
  ],
  quickStats: [
    { id: 'showings', label: 'Showings Today', icon: CalendarDays, color: 'primary', dataKey: 'showings_today' },
    { id: 'new-leads', label: 'New Leads', icon: UserPlus, color: 'success', dataKey: 'new_leads' },
    { id: 'active-listings', label: 'Active Listings', icon: Home, color: 'info', dataKey: 'active_listings' },
    { id: 'pending', label: 'Pending Sales', icon: Clock, color: 'warning', dataKey: 'pending_sales' },
  ],
  alerts: ['hot_lead_no_followup', 'showing_feedback_needed', 'listing_price_reduction'],
};

// ============================================================================
// LEGAL DASHBOARD
// ============================================================================

const LEGAL_CONFIG: DashboardConfig = {
  widgets: [
    {
      id: 'todays-consultations',
      title: "Today's Consultations",
      type: 'list',
      icon: CalendarDays,
      size: 'lg',
      dataSource: 'consultations_today',
    },
    {
      id: 'new-inquiries',
      title: 'New Inquiries',
      type: 'list',
      icon: UserPlus,
      size: 'md',
      dataSource: 'new_inquiries',
    },
    {
      id: 'case-pipeline',
      title: 'Case Pipeline',
      type: 'chart',
      icon: Briefcase,
      size: 'md',
      dataSource: 'case_pipeline',
    },
    COMMON_WIDGETS.recentCalls,
  ],
  quickStats: [
    { id: 'consultations', label: 'Consultations', icon: CalendarDays, color: 'primary', dataKey: 'consultations_today' },
    { id: 'new-cases', label: 'New Cases', icon: Briefcase, color: 'success', dataKey: 'new_cases' },
    { id: 'pending-conflicts', label: 'Pending Conflicts', icon: AlertCircle, color: 'warning', dataKey: 'pending_conflicts' },
    { id: 'retainers', label: 'Retainers Signed', icon: CheckCircle, color: 'info', dataKey: 'retainers_signed' },
  ],
  alerts: ['conflict_check_pending', 'consultation_follow_up', 'retainer_unsigned'],
};

// ============================================================================
// HOME SERVICES DASHBOARD
// ============================================================================

const HOME_SERVICES_CONFIG: DashboardConfig = {
  widgets: [
    {
      id: 'todays-jobs',
      title: "Today's Jobs",
      type: 'list',
      icon: CalendarDays,
      size: 'lg',
      dataSource: 'jobs_today',
    },
    {
      id: 'technician-map',
      title: 'Technician Locations',
      type: 'map',
      icon: Wrench,
      size: 'lg',
      dataSource: 'technician_locations',
    },
    {
      id: 'emergency-queue',
      title: 'Emergency Queue',
      type: 'list',
      icon: AlertCircle,
      size: 'md',
      dataSource: 'emergency_queue',
    },
    COMMON_WIDGETS.recentCalls,
  ],
  quickStats: [
    { id: 'jobs', label: 'Jobs Today', icon: Wrench, color: 'primary', dataKey: 'jobs_today' },
    { id: 'revenue', label: 'Revenue', icon: DollarSign, color: 'success', dataKey: 'revenue_today', format: 'currency' },
    { id: 'completed', label: 'Completed', icon: CheckCircle, color: 'info', dataKey: 'jobs_completed' },
    { id: 'emergency', label: 'Emergency Calls', icon: AlertCircle, color: 'destructive', dataKey: 'emergency_calls' },
  ],
  alerts: ['emergency_unassigned', 'parts_needed', 'callback_required'],
};

// ============================================================================
// AUTO REPAIR DASHBOARD
// ============================================================================

const AUTO_REPAIR_CONFIG: DashboardConfig = {
  widgets: [
    {
      id: 'todays-appointments',
      title: "Today's Appointments",
      type: 'list',
      icon: CalendarDays,
      size: 'lg',
      dataSource: 'appointments_today',
    },
    {
      id: 'bay-status',
      title: 'Bay Status',
      type: 'table',
      icon: Car,
      size: 'md',
      dataSource: 'bay_status',
    },
    {
      id: 'vehicles-in-progress',
      title: 'Vehicles In Progress',
      type: 'list',
      icon: Wrench,
      size: 'md',
      dataSource: 'vehicles_in_progress',
    },
    COMMON_WIDGETS.recentCalls,
  ],
  quickStats: [
    { id: 'appointments', label: 'Appointments', icon: CalendarDays, color: 'primary', dataKey: 'appointments_today' },
    { id: 'cars-in-shop', label: 'Cars in Shop', icon: Car, color: 'info', dataKey: 'cars_in_shop' },
    { id: 'revenue', label: 'Revenue', icon: DollarSign, color: 'success', dataKey: 'revenue_today', format: 'currency' },
    { id: 'completed', label: 'Completed', icon: CheckCircle, color: 'success', dataKey: 'completed' },
  ],
  alerts: ['parts_on_order', 'waiting_approval', 'vehicle_ready_pickup'],
};

// ============================================================================
// FITNESS DASHBOARD
// ============================================================================

const FITNESS_CONFIG: DashboardConfig = {
  widgets: [
    {
      id: 'todays-classes',
      title: "Today's Classes",
      type: 'list',
      icon: CalendarDays,
      size: 'lg',
      dataSource: 'classes_today',
    },
    {
      id: 'pt-sessions',
      title: 'Personal Training',
      type: 'list',
      icon: Dumbbell,
      size: 'md',
      dataSource: 'pt_sessions',
    },
    {
      id: 'member-checkins',
      title: 'Recent Check-ins',
      type: 'list',
      icon: Users,
      size: 'md',
      dataSource: 'member_checkins',
    },
    COMMON_WIDGETS.recentCalls,
  ],
  quickStats: [
    { id: 'classes', label: 'Classes Today', icon: CalendarDays, color: 'primary', dataKey: 'classes_today' },
    { id: 'checkins', label: 'Check-ins', icon: Users, color: 'success', dataKey: 'member_checkins' },
    { id: 'pt-sessions', label: 'PT Sessions', icon: Dumbbell, color: 'info', dataKey: 'pt_sessions' },
    { id: 'new-members', label: 'New Members', icon: UserPlus, color: 'warning', dataKey: 'new_members' },
  ],
  alerts: ['class_almost_full', 'instructor_unavailable', 'membership_expiring'],
};

// ============================================================================
// VET DASHBOARD
// ============================================================================

const VET_CONFIG: DashboardConfig = {
  widgets: [
    {
      id: 'todays-appointments',
      title: "Today's Appointments",
      type: 'list',
      icon: CalendarDays,
      size: 'lg',
      dataSource: 'appointments_today',
    },
    {
      id: 'boarding-status',
      title: 'Boarding Status',
      type: 'list',
      icon: PawPrint,
      size: 'md',
      dataSource: 'boarding_status',
    },
    {
      id: 'vaccination-reminders',
      title: 'Vaccination Reminders',
      type: 'list',
      icon: Syringe,
      size: 'md',
      dataSource: 'vaccination_reminders',
    },
    COMMON_WIDGETS.recentCalls,
  ],
  quickStats: [
    { id: 'appointments', label: 'Appointments', icon: CalendarDays, color: 'primary', dataKey: 'appointments_today' },
    { id: 'boarding', label: 'Pets Boarding', icon: PawPrint, color: 'info', dataKey: 'pets_boarding' },
    { id: 'grooming', label: 'Grooming', icon: Scissors, color: 'success', dataKey: 'grooming_today' },
    { id: 'new-pets', label: 'New Pets', icon: UserPlus, color: 'warning', dataKey: 'new_pets' },
  ],
  alerts: ['vaccination_overdue', 'boarding_checkout_today', 'prescription_refill'],
};

// ============================================================================
// HOTEL DASHBOARD
// ============================================================================

const HOTEL_CONFIG: DashboardConfig = {
  widgets: [
    {
      id: 'todays-arrivals',
      title: "Today's Arrivals",
      type: 'list',
      icon: CalendarDays,
      size: 'md',
      dataSource: 'arrivals_today',
    },
    {
      id: 'todays-departures',
      title: "Today's Departures",
      type: 'list',
      icon: Clock,
      size: 'md',
      dataSource: 'departures_today',
    },
    {
      id: 'room-availability',
      title: 'Room Availability',
      type: 'table',
      icon: BedDouble,
      size: 'lg',
      dataSource: 'room_availability',
    },
    COMMON_WIDGETS.recentCalls,
  ],
  quickStats: [
    { id: 'arrivals', label: 'Arrivals', icon: CalendarDays, color: 'primary', dataKey: 'arrivals_today' },
    { id: 'departures', label: 'Departures', icon: Clock, color: 'info', dataKey: 'departures_today' },
    { id: 'occupancy', label: 'Occupancy', icon: BedDouble, color: 'success', dataKey: 'occupancy_rate', format: 'percent' },
    { id: 'revenue', label: 'Revenue', icon: DollarSign, color: 'warning', dataKey: 'revenue_today', format: 'currency' },
  ],
  alerts: ['room_not_ready', 'vip_arrival', 'late_checkout_request'],
};

// ============================================================================
// THERAPY DASHBOARD
// ============================================================================

const THERAPY_CONFIG: DashboardConfig = {
  widgets: [
    {
      id: 'todays-sessions',
      title: "Today's Sessions",
      type: 'list',
      icon: CalendarDays,
      size: 'lg',
      dataSource: 'sessions_today',
    },
    {
      id: 'therapist-schedule',
      title: 'Therapist Schedule',
      type: 'calendar',
      icon: Brain,
      size: 'lg',
      dataSource: 'therapist_schedule',
    },
    {
      id: 'new-inquiries',
      title: 'New Client Inquiries',
      type: 'list',
      icon: UserPlus,
      size: 'md',
      dataSource: 'new_inquiries',
    },
    COMMON_WIDGETS.recentCalls,
  ],
  quickStats: [
    { id: 'sessions', label: 'Sessions Today', icon: CalendarDays, color: 'primary', dataKey: 'sessions_today' },
    { id: 'new-clients', label: 'New Clients', icon: UserPlus, color: 'success', dataKey: 'new_clients' },
    { id: 'cancellations', label: 'Cancellations', icon: XCircle, color: 'warning', dataKey: 'cancellations' },
    { id: 'telehealth', label: 'Telehealth', icon: Brain, color: 'info', dataKey: 'telehealth_sessions' },
  ],
  alerts: ['intake_incomplete', 'insurance_expiring', 'crisis_protocol'],
};

// ============================================================================
// MED SPA DASHBOARD
// ============================================================================

const MED_SPA_CONFIG: DashboardConfig = {
  widgets: [
    {
      id: 'todays-appointments',
      title: "Today's Appointments",
      type: 'list',
      icon: CalendarDays,
      size: 'lg',
      dataSource: 'appointments_today',
    },
    {
      id: 'provider-schedule',
      title: 'Provider Schedule',
      type: 'calendar',
      icon: Syringe,
      size: 'lg',
      dataSource: 'provider_schedule',
    },
    {
      id: 'consultations',
      title: 'Consultations',
      type: 'list',
      icon: Star,
      size: 'md',
      dataSource: 'consultations',
    },
    COMMON_WIDGETS.recentCalls,
  ],
  quickStats: [
    { id: 'appointments', label: 'Appointments', icon: CalendarDays, color: 'primary', dataKey: 'appointments_today' },
    { id: 'revenue', label: 'Revenue', icon: DollarSign, color: 'success', dataKey: 'revenue_today', format: 'currency' },
    { id: 'consultations', label: 'Consultations', icon: UserPlus, color: 'info', dataKey: 'consultations_today' },
    { id: 'new-clients', label: 'New Clients', icon: Star, color: 'warning', dataKey: 'new_clients' },
  ],
  alerts: ['medical_history_needed', 'before_photo_missing', 'follow_up_due'],
};

// ============================================================================
// CLEANING DASHBOARD
// ============================================================================

const CLEANING_CONFIG: DashboardConfig = {
  widgets: [
    {
      id: 'todays-jobs',
      title: "Today's Jobs",
      type: 'list',
      icon: CalendarDays,
      size: 'lg',
      dataSource: 'jobs_today',
    },
    {
      id: 'crew-assignments',
      title: 'Crew Assignments',
      type: 'table',
      icon: Users,
      size: 'md',
      dataSource: 'crew_assignments',
    },
    {
      id: 'recurring-upcoming',
      title: 'Upcoming Recurring',
      type: 'list',
      icon: Clock,
      size: 'md',
      dataSource: 'recurring_upcoming',
    },
    COMMON_WIDGETS.recentCalls,
  ],
  quickStats: [
    { id: 'jobs', label: 'Jobs Today', icon: SprayCan, color: 'primary', dataKey: 'jobs_today' },
    { id: 'revenue', label: 'Revenue', icon: DollarSign, color: 'success', dataKey: 'revenue_today', format: 'currency' },
    { id: 'completed', label: 'Completed', icon: CheckCircle, color: 'info', dataKey: 'jobs_completed' },
    { id: 'recurring', label: 'Recurring', icon: Clock, color: 'warning', dataKey: 'recurring_clients' },
  ],
  alerts: ['crew_unavailable', 'estimate_pending', 'recurring_skip_request'],
};

// ============================================================================
// PHOTOGRAPHY DASHBOARD
// ============================================================================

const PHOTOGRAPHY_CONFIG: DashboardConfig = {
  widgets: [
    {
      id: 'todays-sessions',
      title: "Today's Sessions",
      type: 'list',
      icon: CalendarDays,
      size: 'lg',
      dataSource: 'sessions_today',
    },
    {
      id: 'upcoming-shoots',
      title: 'Upcoming Shoots',
      type: 'list',
      icon: Camera,
      size: 'md',
      dataSource: 'upcoming_shoots',
    },
    {
      id: 'gallery-deliveries',
      title: 'Pending Deliveries',
      type: 'list',
      icon: Clock,
      size: 'md',
      dataSource: 'pending_deliveries',
    },
    COMMON_WIDGETS.recentCalls,
  ],
  quickStats: [
    { id: 'sessions', label: 'Sessions Today', icon: Camera, color: 'primary', dataKey: 'sessions_today' },
    { id: 'bookings', label: 'This Month', icon: CalendarDays, color: 'success', dataKey: 'bookings_this_month' },
    { id: 'revenue', label: 'Revenue', icon: DollarSign, color: 'info', dataKey: 'revenue_this_month', format: 'currency' },
    { id: 'pending', label: 'Pending Delivery', icon: Clock, color: 'warning', dataKey: 'pending_deliveries' },
  ],
  alerts: ['contract_unsigned', 'questionnaire_pending', 'gallery_expiring'],
};

// ============================================================================
// GENERIC DASHBOARD
// ============================================================================

const GENERIC_CONFIG: DashboardConfig = {
  widgets: [
    {
      id: 'todays-appointments',
      title: "Today's Appointments",
      type: 'list',
      icon: CalendarDays,
      size: 'lg',
      dataSource: 'appointments_today',
    },
    {
      id: 'staff-schedule',
      title: 'Staff Schedule',
      type: 'calendar',
      icon: Users,
      size: 'lg',
      dataSource: 'staff_schedule',
    },
    COMMON_WIDGETS.recentCalls,
  ],
  quickStats: [
    { id: 'appointments', label: 'Appointments', icon: CalendarDays, color: 'primary', dataKey: 'appointments_today' },
    { id: 'customers', label: 'Customers', icon: Users, color: 'success', dataKey: 'total_customers' },
    { id: 'calls', label: 'Calls Today', icon: Phone, color: 'info', dataKey: 'calls_today' },
    { id: 'booked', label: 'Booked via AI', icon: CheckCircle, color: 'warning', dataKey: 'ai_bookings' },
  ],
  alerts: ['no_faq_configured', 'ai_role_missing', 'calendar_not_connected'],
};

// ============================================================================
// DASHBOARD CONFIG GETTER
// ============================================================================

const DASHBOARD_CONFIGS: Record<BusinessType, DashboardConfig> = {
  restaurant: RESTAURANT_CONFIG,
  medical: MEDICAL_CONFIG,
  salon: SALON_CONFIG,
  spa: SPA_CONFIG,
  real_estate: REAL_ESTATE_CONFIG,
  legal: LEGAL_CONFIG,
  home_services: HOME_SERVICES_CONFIG,
  auto_repair: AUTO_REPAIR_CONFIG,
  fitness: FITNESS_CONFIG,
  vet: VET_CONFIG,
  hotel: HOTEL_CONFIG,
  therapy: THERAPY_CONFIG,
  med_spa: MED_SPA_CONFIG,
  cleaning: CLEANING_CONFIG,
  photography: PHOTOGRAPHY_CONFIG,
  generic: GENERIC_CONFIG,
};

export function getDashboardConfig(businessType: BusinessType): DashboardConfig {
  return DASHBOARD_CONFIGS[businessType] || GENERIC_CONFIG;
}
