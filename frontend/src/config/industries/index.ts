/**
 * Industry Configuration System
 *
 * This file defines all industry types and their configurations.
 * Each industry has its own dashboard widgets, sidebar menu, settings pages,
 * terminology, and AI capabilities.
 */

import {
  UtensilsCrossed,
  Stethoscope,
  Scissors,
  Sparkles,
  Home,
  Scale,
  Wrench,
  Car,
  Dumbbell,
  PawPrint,
  Hotel,
  Brain,
  Syringe,
  SprayCan,
  Camera,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// BUSINESS TYPES
// ============================================================================

export const BUSINESS_TYPES = {
  RESTAURANT: 'restaurant',
  MEDICAL: 'medical',
  SALON: 'salon',
  SPA: 'spa',
  REAL_ESTATE: 'real_estate',
  LEGAL: 'legal',
  HOME_SERVICES: 'home_services',
  AUTO_REPAIR: 'auto_repair',
  FITNESS: 'fitness',
  VET: 'vet',
  HOTEL: 'hotel',
  THERAPY: 'therapy',
  MED_SPA: 'med_spa',
  CLEANING: 'cleaning',
  PHOTOGRAPHY: 'photography',
  GENERIC: 'generic',
} as const;

export type BusinessType = typeof BUSINESS_TYPES[keyof typeof BUSINESS_TYPES];

// ============================================================================
// INDUSTRY METADATA
// ============================================================================

export interface IndustryMeta {
  id: BusinessType;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
}

export const INDUSTRY_META: Record<BusinessType, IndustryMeta> = {
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant / Café / Bar',
    description: 'Reservations, tables, events, and dining experiences',
    icon: UtensilsCrossed,
    color: 'orange',
    gradient: 'from-orange-500 to-amber-500',
  },
  medical: {
    id: 'medical',
    name: 'Medical / Dental Clinic',
    description: 'Patient appointments, procedures, and healthcare',
    icon: Stethoscope,
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-500',
  },
  salon: {
    id: 'salon',
    name: 'Salon / Barbershop',
    description: 'Haircuts, styling, and beauty services',
    icon: Scissors,
    color: 'pink',
    gradient: 'from-pink-500 to-rose-500',
  },
  spa: {
    id: 'spa',
    name: 'Spa / Wellness Center',
    description: 'Massage, treatments, and relaxation',
    icon: Sparkles,
    color: 'purple',
    gradient: 'from-purple-500 to-violet-500',
  },
  real_estate: {
    id: 'real_estate',
    name: 'Real Estate Agency',
    description: 'Property showings, listings, and leads',
    icon: Home,
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-500',
  },
  legal: {
    id: 'legal',
    name: 'Law Firm / Legal Services',
    description: 'Consultations, cases, and legal intake',
    icon: Scale,
    color: 'slate',
    gradient: 'from-slate-600 to-slate-500',
  },
  home_services: {
    id: 'home_services',
    name: 'Home Services (HVAC/Plumbing)',
    description: 'Service calls, repairs, and maintenance',
    icon: Wrench,
    color: 'yellow',
    gradient: 'from-yellow-500 to-orange-500',
  },
  auto_repair: {
    id: 'auto_repair',
    name: 'Auto Repair / Service',
    description: 'Vehicle service, repairs, and maintenance',
    icon: Car,
    color: 'red',
    gradient: 'from-red-500 to-rose-500',
  },
  fitness: {
    id: 'fitness',
    name: 'Fitness / Gym / Studio',
    description: 'Classes, training, and memberships',
    icon: Dumbbell,
    color: 'lime',
    gradient: 'from-lime-500 to-green-500',
  },
  vet: {
    id: 'vet',
    name: 'Vet Clinic / Pet Services',
    description: 'Pet care, grooming, and boarding',
    icon: PawPrint,
    color: 'amber',
    gradient: 'from-amber-500 to-yellow-500',
  },
  hotel: {
    id: 'hotel',
    name: 'Hotel / B&B',
    description: 'Room reservations and hospitality',
    icon: Hotel,
    color: 'indigo',
    gradient: 'from-indigo-500 to-purple-500',
  },
  therapy: {
    id: 'therapy',
    name: 'Therapy / Counseling',
    description: 'Mental health sessions and wellness',
    icon: Brain,
    color: 'teal',
    gradient: 'from-teal-500 to-cyan-500',
  },
  med_spa: {
    id: 'med_spa',
    name: 'Med Spa / Aesthetics',
    description: 'Cosmetic treatments and aesthetics',
    icon: Syringe,
    color: 'fuchsia',
    gradient: 'from-fuchsia-500 to-pink-500',
  },
  cleaning: {
    id: 'cleaning',
    name: 'Cleaning Service',
    description: 'Home and office cleaning',
    icon: SprayCan,
    color: 'sky',
    gradient: 'from-sky-500 to-blue-500',
  },
  photography: {
    id: 'photography',
    name: 'Photography Studio',
    description: 'Photo sessions and packages',
    icon: Camera,
    color: 'violet',
    gradient: 'from-violet-500 to-purple-500',
  },
  generic: {
    id: 'generic',
    name: 'Other Business',
    description: 'General appointment booking',
    icon: Sparkles,
    color: 'gray',
    gradient: 'from-gray-500 to-slate-500',
  },
};

// ============================================================================
// TERMINOLOGY MAPPING
// ============================================================================

export interface IndustryTerminology {
  customer: string;
  customerPlural: string;
  appointment: string;
  appointmentPlural: string;
  service: string;
  servicePlural: string;
  staff: string;
  staffPlural: string;
  resource: string;
  resourcePlural: string;
  booking: string;
  bookingPlural: string;
}

export const INDUSTRY_TERMINOLOGY: Record<BusinessType, IndustryTerminology> = {
  restaurant: {
    customer: 'Guest',
    customerPlural: 'Guests',
    appointment: 'Reservation',
    appointmentPlural: 'Reservations',
    service: 'Experience',
    servicePlural: 'Experiences',
    staff: 'Host',
    staffPlural: 'Hosts',
    resource: 'Table',
    resourcePlural: 'Tables',
    booking: 'Reservation',
    bookingPlural: 'Reservations',
  },
  medical: {
    customer: 'Patient',
    customerPlural: 'Patients',
    appointment: 'Appointment',
    appointmentPlural: 'Appointments',
    service: 'Procedure',
    servicePlural: 'Procedures',
    staff: 'Provider',
    staffPlural: 'Providers',
    resource: 'Room',
    resourcePlural: 'Rooms',
    booking: 'Appointment',
    bookingPlural: 'Appointments',
  },
  salon: {
    customer: 'Client',
    customerPlural: 'Clients',
    appointment: 'Appointment',
    appointmentPlural: 'Appointments',
    service: 'Service',
    servicePlural: 'Services',
    staff: 'Stylist',
    staffPlural: 'Stylists',
    resource: 'Chair',
    resourcePlural: 'Chairs',
    booking: 'Appointment',
    bookingPlural: 'Appointments',
  },
  spa: {
    customer: 'Guest',
    customerPlural: 'Guests',
    appointment: 'Appointment',
    appointmentPlural: 'Appointments',
    service: 'Treatment',
    servicePlural: 'Treatments',
    staff: 'Therapist',
    staffPlural: 'Therapists',
    resource: 'Room',
    resourcePlural: 'Rooms',
    booking: 'Appointment',
    bookingPlural: 'Appointments',
  },
  real_estate: {
    customer: 'Lead',
    customerPlural: 'Leads',
    appointment: 'Showing',
    appointmentPlural: 'Showings',
    service: 'Property',
    servicePlural: 'Properties',
    staff: 'Agent',
    staffPlural: 'Agents',
    resource: 'Property',
    resourcePlural: 'Properties',
    booking: 'Showing',
    bookingPlural: 'Showings',
  },
  legal: {
    customer: 'Client',
    customerPlural: 'Clients',
    appointment: 'Consultation',
    appointmentPlural: 'Consultations',
    service: 'Service',
    servicePlural: 'Services',
    staff: 'Attorney',
    staffPlural: 'Attorneys',
    resource: 'Conference Room',
    resourcePlural: 'Conference Rooms',
    booking: 'Consultation',
    bookingPlural: 'Consultations',
  },
  home_services: {
    customer: 'Customer',
    customerPlural: 'Customers',
    appointment: 'Service Call',
    appointmentPlural: 'Service Calls',
    service: 'Service',
    servicePlural: 'Services',
    staff: 'Technician',
    staffPlural: 'Technicians',
    resource: 'Technician',
    resourcePlural: 'Technicians',
    booking: 'Job',
    bookingPlural: 'Jobs',
  },
  auto_repair: {
    customer: 'Customer',
    customerPlural: 'Customers',
    appointment: 'Appointment',
    appointmentPlural: 'Appointments',
    service: 'Service',
    servicePlural: 'Services',
    staff: 'Technician',
    staffPlural: 'Technicians',
    resource: 'Bay',
    resourcePlural: 'Bays',
    booking: 'Appointment',
    bookingPlural: 'Appointments',
  },
  fitness: {
    customer: 'Member',
    customerPlural: 'Members',
    appointment: 'Session',
    appointmentPlural: 'Sessions',
    service: 'Class',
    servicePlural: 'Classes',
    staff: 'Instructor',
    staffPlural: 'Instructors',
    resource: 'Studio',
    resourcePlural: 'Studios',
    booking: 'Booking',
    bookingPlural: 'Bookings',
  },
  vet: {
    customer: 'Pet Parent',
    customerPlural: 'Pet Parents',
    appointment: 'Appointment',
    appointmentPlural: 'Appointments',
    service: 'Service',
    servicePlural: 'Services',
    staff: 'Veterinarian',
    staffPlural: 'Veterinarians',
    resource: 'Exam Room',
    resourcePlural: 'Exam Rooms',
    booking: 'Appointment',
    bookingPlural: 'Appointments',
  },
  hotel: {
    customer: 'Guest',
    customerPlural: 'Guests',
    appointment: 'Reservation',
    appointmentPlural: 'Reservations',
    service: 'Room',
    servicePlural: 'Rooms',
    staff: 'Concierge',
    staffPlural: 'Concierges',
    resource: 'Room',
    resourcePlural: 'Rooms',
    booking: 'Reservation',
    bookingPlural: 'Reservations',
  },
  therapy: {
    customer: 'Client',
    customerPlural: 'Clients',
    appointment: 'Session',
    appointmentPlural: 'Sessions',
    service: 'Session Type',
    servicePlural: 'Session Types',
    staff: 'Therapist',
    staffPlural: 'Therapists',
    resource: 'Office',
    resourcePlural: 'Offices',
    booking: 'Session',
    bookingPlural: 'Sessions',
  },
  med_spa: {
    customer: 'Client',
    customerPlural: 'Clients',
    appointment: 'Appointment',
    appointmentPlural: 'Appointments',
    service: 'Treatment',
    servicePlural: 'Treatments',
    staff: 'Provider',
    staffPlural: 'Providers',
    resource: 'Treatment Room',
    resourcePlural: 'Treatment Rooms',
    booking: 'Appointment',
    bookingPlural: 'Appointments',
  },
  cleaning: {
    customer: 'Customer',
    customerPlural: 'Customers',
    appointment: 'Cleaning',
    appointmentPlural: 'Cleanings',
    service: 'Service',
    servicePlural: 'Services',
    staff: 'Crew',
    staffPlural: 'Crews',
    resource: 'Crew',
    resourcePlural: 'Crews',
    booking: 'Job',
    bookingPlural: 'Jobs',
  },
  photography: {
    customer: 'Client',
    customerPlural: 'Clients',
    appointment: 'Session',
    appointmentPlural: 'Sessions',
    service: 'Session Type',
    servicePlural: 'Session Types',
    staff: 'Photographer',
    staffPlural: 'Photographers',
    resource: 'Studio',
    resourcePlural: 'Studios',
    booking: 'Session',
    bookingPlural: 'Sessions',
  },
  generic: {
    customer: 'Customer',
    customerPlural: 'Customers',
    appointment: 'Appointment',
    appointmentPlural: 'Appointments',
    service: 'Service',
    servicePlural: 'Services',
    staff: 'Staff',
    staffPlural: 'Staff',
    resource: 'Resource',
    resourcePlural: 'Resources',
    booking: 'Booking',
    bookingPlural: 'Bookings',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getIndustryMeta(businessType: BusinessType): IndustryMeta {
  return INDUSTRY_META[businessType] || INDUSTRY_META.generic;
}

export function getTerminology(businessType: BusinessType): IndustryTerminology {
  return INDUSTRY_TERMINOLOGY[businessType] || INDUSTRY_TERMINOLOGY.generic;
}

export function getIndustryIcon(businessType: BusinessType): LucideIcon {
  return INDUSTRY_META[businessType]?.icon || INDUSTRY_META.generic.icon;
}

export function getIndustryColor(businessType: BusinessType): string {
  return INDUSTRY_META[businessType]?.color || 'gray';
}

export function isValidBusinessType(type: string): type is BusinessType {
  return Object.values(BUSINESS_TYPES).includes(type as BusinessType);
}

// Convert old industry values to new business types
// Get CSS classes for industry badge styling (safe for Tailwind)
export function getIndustryBadgeClasses(businessType: BusinessType): {
  bg: string;
  border: string;
  icon: string;
  text: string;
} {
  const colorMap: Record<string, { bg: string; border: string; icon: string; text: string }> = {
    orange: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      icon: 'text-orange-500',
      text: 'text-orange-600 dark:text-orange-400',
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      icon: 'text-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
    },
    pink: {
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
      icon: 'text-pink-500',
      text: 'text-pink-600 dark:text-pink-400',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      icon: 'text-purple-500',
      text: 'text-purple-600 dark:text-purple-400',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      icon: 'text-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
    slate: {
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/20',
      icon: 'text-slate-500',
      text: 'text-slate-600 dark:text-slate-400',
    },
    yellow: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      icon: 'text-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-400',
    },
    red: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      icon: 'text-red-500',
      text: 'text-red-600 dark:text-red-400',
    },
    lime: {
      bg: 'bg-lime-500/10',
      border: 'border-lime-500/20',
      icon: 'text-lime-500',
      text: 'text-lime-600 dark:text-lime-400',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      icon: 'text-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
    },
    indigo: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      icon: 'text-indigo-500',
      text: 'text-indigo-600 dark:text-indigo-400',
    },
    teal: {
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
      icon: 'text-teal-500',
      text: 'text-teal-600 dark:text-teal-400',
    },
    fuchsia: {
      bg: 'bg-fuchsia-500/10',
      border: 'border-fuchsia-500/20',
      icon: 'text-fuchsia-500',
      text: 'text-fuchsia-600 dark:text-fuchsia-400',
    },
    sky: {
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      icon: 'text-sky-500',
      text: 'text-sky-600 dark:text-sky-400',
    },
    violet: {
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      icon: 'text-violet-500',
      text: 'text-violet-600 dark:text-violet-400',
    },
    gray: {
      bg: 'bg-gray-500/10',
      border: 'border-gray-500/20',
      icon: 'text-gray-500',
      text: 'text-gray-600 dark:text-gray-400',
    },
  };

  const color = INDUSTRY_META[businessType]?.color || 'gray';
  return colorMap[color] || colorMap.gray;
}

export function normalizeBusinessType(industry: string): BusinessType {
  const mapping: Record<string, BusinessType> = {
    // Old values -> new values
    'healthcare': 'medical',
    'dental': 'medical',
    'salon': 'salon',
    'salon & spa': 'salon',
    'fitness': 'fitness',
    'fitness & wellness': 'fitness',
    'legal': 'legal',
    'legal services': 'legal',
    'consulting': 'generic',
    'airlines': 'generic',
    'hotel': 'hotel',
    'hotels / hospitality': 'hotel',
    'restaurant': 'restaurant',
    'restaurants / food service': 'restaurant',
    'retail': 'generic',
    'real_estate': 'real_estate',
    'real estate': 'real_estate',
    'automotive': 'auto_repair',
    'automotive / car dealership': 'auto_repair',
    'insurance': 'generic',
    'financial': 'generic',
    'education': 'generic',
    'veterinary': 'vet',
    'veterinary / pet care': 'vet',
    'home_services': 'home_services',
    'home services / contractors': 'home_services',
    'beauty': 'salon',
    'beauty / cosmetics': 'salon',
    'travel': 'generic',
    'event_planning': 'generic',
    'nonprofit': 'generic',
    'technology': 'generic',
    'other': 'generic',
  };

  const normalized = industry.toLowerCase();
  return mapping[normalized] || (isValidBusinessType(normalized) ? normalized as BusinessType : 'generic');
}
