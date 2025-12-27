/**
 * Industry Context
 *
 * Provides industry-specific configuration throughout the app.
 * Components use this context to adapt their UI and behavior
 * based on the business type.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useBusiness } from '@/lib/api/hooks';
import {
  type BusinessType,
  type IndustryMeta,
  type IndustryTerminology,
  getIndustryMeta,
  getTerminology,
  normalizeBusinessType,
  BUSINESS_TYPES,
} from '@/config/industries';
import {
  type NavItem,
  getIndustryNavigation,
} from '@/config/industries/navigation';
import {
  type DashboardConfig,
  getDashboardConfig,
} from '@/config/industries/dashboard';

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface IndustryContextValue {
  // Current business type
  businessType: BusinessType;

  // Industry metadata (name, icon, color, etc.)
  meta: IndustryMeta;

  // Terminology mapping (customer → Patient, appointment → Session, etc.)
  terminology: IndustryTerminology;

  // Navigation items
  navigation: {
    main: NavItem[];
    bottom: NavItem[];
  };

  // Dashboard configuration
  dashboard: DashboardConfig;

  // Helper functions
  t: (key: keyof IndustryTerminology) => string;
  tPlural: (key: keyof IndustryTerminology, count: number) => string;

  // Check if a feature is available for this industry
  hasFeature: (feature: IndustryFeature) => boolean;

  // Check if this is a specific industry
  is: (type: BusinessType) => boolean;
  isAnyOf: (...types: BusinessType[]) => boolean;
}

// ============================================================================
// INDUSTRY FEATURES
// ============================================================================

export type IndustryFeature =
  | 'tables'
  | 'waitlist'
  | 'events'
  | 'menu'
  | 'insurance'
  | 'intake_forms'
  | 'properties'
  | 'showings'
  | 'cases'
  | 'practice_areas'
  | 'vehicles'
  | 'work_orders'
  | 'bays'
  | 'classes'
  | 'memberships'
  | 'personal_training'
  | 'pets'
  | 'boarding'
  | 'grooming'
  | 'vaccinations'
  | 'rooms'
  | 'room_types'
  | 'rates'
  | 'packages'
  | 'treatments'
  | 'consultations'
  | 'crews'
  | 'recurring'
  | 'service_areas'
  | 'estimates'
  | 'session_types'
  | 'galleries'
  | 'specialties';

const INDUSTRY_FEATURES: Record<BusinessType, IndustryFeature[]> = {
  restaurant: ['tables', 'waitlist', 'events', 'menu'],
  medical: ['insurance', 'intake_forms'],
  salon: ['packages'],
  spa: ['rooms', 'packages', 'treatments'],
  real_estate: ['properties', 'showings', 'service_areas'],
  legal: ['cases', 'practice_areas', 'intake_forms', 'consultations'],
  home_services: ['service_areas', 'estimates', 'crews'],
  auto_repair: ['vehicles', 'work_orders', 'bays'],
  fitness: ['classes', 'memberships', 'personal_training'],
  vet: ['pets', 'boarding', 'grooming', 'vaccinations'],
  hotel: ['rooms', 'room_types', 'rates'],
  therapy: ['intake_forms', 'insurance', 'specialties'],
  med_spa: ['treatments', 'packages', 'consultations'],
  cleaning: ['crews', 'recurring', 'estimates', 'service_areas'],
  photography: ['session_types', 'packages', 'galleries'],
  generic: [],
};

// ============================================================================
// CONTEXT
// ============================================================================

const IndustryContext = createContext<IndustryContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface IndustryProviderProps {
  children: React.ReactNode;
  businessType?: BusinessType;
}

export function IndustryProvider({ children, businessType: propBusinessType }: IndustryProviderProps) {
  const { data: business } = useBusiness();

  // Determine business type from props or business data
  const businessType = useMemo(() => {
    if (propBusinessType) {
      return propBusinessType;
    }
    if (business?.industry) {
      return normalizeBusinessType(business.industry);
    }
    return BUSINESS_TYPES.GENERIC;
  }, [propBusinessType, business?.industry]);

  // Memoize the context value
  const value = useMemo<IndustryContextValue>(() => {
    const meta = getIndustryMeta(businessType);
    const terminology = getTerminology(businessType);
    const navigation = getIndustryNavigation(businessType);
    const dashboard = getDashboardConfig(businessType);
    const features = INDUSTRY_FEATURES[businessType] || [];

    // Helper: get terminology value
    const t = (key: keyof IndustryTerminology): string => {
      return terminology[key] || key;
    };

    // Helper: get plural or singular based on count
    const tPlural = (key: keyof IndustryTerminology, count: number): string => {
      const singularKey = key.replace(/Plural$/, '') as keyof IndustryTerminology;
      const pluralKey = `${singularKey}Plural` as keyof IndustryTerminology;

      if (count === 1) {
        return terminology[singularKey] || singularKey;
      }
      return terminology[pluralKey] || pluralKey;
    };

    // Helper: check if feature is available
    const hasFeature = (feature: IndustryFeature): boolean => {
      return features.includes(feature);
    };

    // Helper: check if current industry matches
    const is = (type: BusinessType): boolean => {
      return businessType === type;
    };

    // Helper: check if current industry is any of the given types
    const isAnyOf = (...types: BusinessType[]): boolean => {
      return types.includes(businessType);
    };

    return {
      businessType,
      meta,
      terminology,
      navigation,
      dashboard,
      t,
      tPlural,
      hasFeature,
      is,
      isAnyOf,
    };
  }, [businessType]);

  return (
    <IndustryContext.Provider value={value}>
      {children}
    </IndustryContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useIndustry(): IndustryContextValue {
  const context = useContext(IndustryContext);

  if (!context) {
    throw new Error('useIndustry must be used within an IndustryProvider');
  }

  return context;
}

// ============================================================================
// OPTIONAL HOOK (Returns null if not in provider)
// ============================================================================

export function useIndustryOptional(): IndustryContextValue | null {
  return useContext(IndustryContext);
}

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

export function useTerminology(): IndustryTerminology {
  const { terminology } = useIndustry();
  return terminology;
}

export function useIndustryMeta(): IndustryMeta {
  const { meta } = useIndustry();
  return meta;
}

export function useIndustryNavigation() {
  const { navigation } = useIndustry();
  return navigation;
}

export function useDashboardConfig(): DashboardConfig {
  const { dashboard } = useIndustry();
  return dashboard;
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Returns a translated term based on current industry
 * Usage: const customerLabel = useTerm('customer'); // Returns "Patient" for medical
 */
export function useTerm(key: keyof IndustryTerminology): string {
  const { t } = useIndustry();
  return t(key);
}

/**
 * Returns singular or plural term based on count
 * Usage: const label = usePluralTerm('customer', items.length);
 */
export function usePluralTerm(key: keyof IndustryTerminology, count: number): string {
  const { tPlural } = useIndustry();
  return tPlural(key, count);
}

/**
 * Check if current industry has a specific feature
 * Usage: const hasTables = useHasFeature('tables');
 */
export function useHasFeature(feature: IndustryFeature): boolean {
  const { hasFeature } = useIndustry();
  return hasFeature(feature);
}

/**
 * Check if current industry is a specific type
 * Usage: const isRestaurant = useIsIndustry('restaurant');
 */
export function useIsIndustry(type: BusinessType): boolean {
  const { is } = useIndustry();
  return is(type);
}
