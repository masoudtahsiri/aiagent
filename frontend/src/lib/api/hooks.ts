/**
 * API Hooks - Centralized data fetching hooks using React Query
 * 
 * This file provides reusable hooks for all API operations.
 * Each hook handles loading states, caching, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, upload } from './client';
import { useAuth } from '@/features/auth/auth-provider';
import type {
  Customer,
  Staff,
  Service,
  Appointment,
  AppointmentWithDetails,
  CallLog,
  CallLogWithDetails,
  AIRole,
  FAQ,
  Business,
  BusinessHours,
  DashboardStats,
  CallAnalytics,
  PaginatedResponse,
  StaffTimeOff,
  StaffTimeOffCreate,
  StaffAvailabilityEntry,
  StaffAvailabilityValidation,
} from '@/types';

// =============================================================================
// QUERY KEYS - Centralized for cache management
// =============================================================================

export const queryKeys = {
  // Dashboard
  dashboardStats: (businessId: string) => ['dashboard', 'stats', businessId] as const,
  dashboardAnalytics: (businessId: string) => ['dashboard', 'analytics', businessId] as const,
  
  // Customers
  customers: (businessId: string) => ['customers', businessId] as const,
  customer: (customerId: string) => ['customer', customerId] as const,
  
  // Staff
  staff: (businessId: string) => ['staff', businessId] as const,
  staffMember: (staffId: string) => ['staff', 'member', staffId] as const,
  
  // Services
  services: (businessId: string) => ['services', businessId] as const,
  service: (serviceId: string) => ['service', serviceId] as const,
  
  // Appointments
  appointments: (businessId: string, params?: object) => 
    ['appointments', businessId, params] as const,
  appointment: (appointmentId: string) => ['appointment', appointmentId] as const,
  availableSlots: (staffId: string, startDate: string) => 
    ['slots', staffId, startDate] as const,
  
  // Calls
  calls: (businessId: string, params?: object) => 
    ['calls', businessId, params] as const,
  call: (callId: string) => ['call', callId] as const,
  
  // AI Config
  aiRoles: (businessId: string) => ['ai-roles', businessId] as const,
  aiRole: (roleId: string) => ['ai-role', roleId] as const,
  faqs: (businessId: string) => ['faqs', businessId] as const,
  
  // Business
  business: (businessId: string) => ['business', businessId] as const,
  businessHours: (businessId: string) => ['business-hours', businessId] as const,
};

// =============================================================================
// HELPER - Get business ID from auth context
// =============================================================================

export function useBusinessId() {
  const { user } = useAuth();
  return user?.business_id || null;
}

// =============================================================================
// DASHBOARD HOOKS
// =============================================================================

interface DashboardStatsResponse {
  calls_today: number;
  calls_yesterday: number;
  calls_change: number;
  appointments_today: number;
  appointments_completed: number;
  total_customers: number;
  customers_this_month: number;
  average_rating: number;
  ratings_count: number;
}

interface RecentCall {
  id: string;
  caller_phone: string;
  call_direction: 'inbound' | 'outbound';
  call_duration: number | null;
  outcome: string | null;
  started_at: string;
  customer_name?: string;
}

interface TodayAppointment {
  id: string;
  appointment_time: string;
  customer_name: string;
  service_name: string | null;
  staff_name: string;
  status: string;
}

export function useDashboardStats() {
  const businessId = useBusinessId();
  
  return useQuery({
    queryKey: queryKeys.dashboardStats(businessId || ''),
    queryFn: () => get<DashboardStatsResponse>(`/api/dashboard/stats/${businessId}`),
    enabled: !!businessId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });
}

export function useRecentCalls(limit: number = 5) {
  const businessId = useBusinessId();
  
  return useQuery({
    queryKey: ['recent-calls', businessId, limit],
    queryFn: async () => {
      const result = await get<{ calls: RecentCall[]; total: number }>(
        `/api/calls/business/${businessId}?limit=${limit}&offset=0`
      );
      return result.calls || [];
    },
    enabled: !!businessId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useTodayAppointments() {
  const businessId = useBusinessId();
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['today-appointments', businessId, today],
    queryFn: () => get<AppointmentWithDetails[]>(
      `/api/appointments/business/${businessId}?start_date=${today}&end_date=${today}`
    ),
    enabled: !!businessId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCallAnalytics(days: number = 7) {
  const businessId = useBusinessId();
  
  return useQuery({
    queryKey: queryKeys.dashboardAnalytics(businessId || ''),
    queryFn: () => get<CallAnalytics[]>(`/api/dashboard/analytics/${businessId}?days=${days}`),
    enabled: !!businessId,
    staleTime: 1000 * 60 * 5,
  });
}

// =============================================================================
// CUSTOMER HOOKS
// =============================================================================

interface CustomersResponse {
  customers: Customer[];
  total: number;
  limit: number;
  offset: number;
}

export function useCustomers(search?: string, limit: number = 50, offset: number = 0) {
  const businessId = useBusinessId();
  
  return useQuery({
    queryKey: [...queryKeys.customers(businessId || ''), { search, limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());
      
      const result = await get<CustomersResponse>(
        `/api/customers/business/${businessId}?${params.toString()}`
      );
      // Normalize response to use 'data' key for consistency
      return { data: result.customers || [], total: result.total || 0 };
    },
    enabled: !!businessId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCustomer(customerId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.customer(customerId),
    queryFn: () => get<Customer>(`/api/customers/${customerId}`),
    enabled: !!customerId && !!user,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: (data: Partial<Customer>) => 
      post<Customer>('/api/customers', { ...data, business_id: businessId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers(businessId || '') });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) => 
      put<Customer>(`/api/customers/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers(businessId || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.customer(variables.id) });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: (id: string) => del(`/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers(businessId || '') });
    },
  });
}

export function useCustomerAppointments(customerId: string) {
  const businessId = useBusinessId();
  
  return useQuery({
    queryKey: ['customer-appointments', customerId],
    queryFn: async () => {
      // Fetch all appointments for the business (backend doesn't support customer_id filter)
      const result = await get<AppointmentWithDetails[]>(
        `/api/appointments/business/${businessId}`
      );
      // Filter by customer_id on the client side
      const customerAppointments = (result || []).filter(
        (apt) => apt.customer_id === customerId
      );
      return customerAppointments;
    },
    enabled: !!customerId && !!businessId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCustomerCalls(customerId: string) {
  const businessId = useBusinessId();
  
  return useQuery({
    queryKey: ['customer-calls', customerId],
    queryFn: async () => {
      // Fetch calls for this business and filter by customer
      const result = await get<{ calls: CallLogWithDetails[]; total: number }>(
        `/api/calls/business/${businessId}?limit=100`
      );
      // Filter by customer_id on the client side
      const customerCalls = (result.calls || []).filter(
        (call) => call.customer_id === customerId
      );
      return customerCalls;
    },
    enabled: !!customerId && !!businessId,
    staleTime: 1000 * 60 * 2,
  });
}

// =============================================================================
// STAFF HOOKS
// =============================================================================

interface StaffResponse {
  data: Staff[];
  total: number;
}

export function useStaff(includeInactive: boolean = true) {
  const businessId = useBusinessId();

  return useQuery({
    queryKey: queryKeys.staff(businessId || ''),
    queryFn: async () => {
      const params = includeInactive ? '?include_inactive=true' : '';
      const result = await get<Staff[] | StaffResponse>(`/api/staff/business/${businessId}${params}`);
      // Handle both array and wrapped response formats
      if (Array.isArray(result)) {
        return { data: result, total: result.length };
      }
      return result;
    },
    enabled: !!businessId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useStaffMember(staffId: string) {
  return useQuery({
    queryKey: queryKeys.staffMember(staffId),
    queryFn: () => get<Staff>(`/api/staff/${staffId}`),
    enabled: !!staffId,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: (data: Partial<Staff>) => 
      post<Staff>('/api/staff', { ...data, business_id: businessId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff(businessId || '') });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Staff> }) => 
      put<Staff>(`/api/staff/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff(businessId || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.staffMember(variables.id) });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: (id: string) => del(`/api/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff(businessId || '') });
    },
  });
}

export function useStaffAppointments(staffId: string) {
  const businessId = useBusinessId();
  
  return useQuery({
    queryKey: ['staff-appointments', staffId],
    queryFn: async () => {
      const result = await get<AppointmentWithDetails[]>(
        `/api/appointments/business/${businessId}?staff_id=${staffId}`
      );
      return result || [];
    },
    enabled: !!staffId && !!businessId,
    staleTime: 1000 * 60 * 2,
  });
}

interface AvailabilityTemplate {
  id: string;
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

export function useStaffAvailability(staffId: string) {
  return useQuery({
    queryKey: ['staff-availability', staffId],
    queryFn: () => get<AvailabilityTemplate[]>(`/api/staff/${staffId}/availability`),
    enabled: !!staffId,
    staleTime: 1000 * 60 * 5,
  });
}

interface AvailabilityTemplateInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

export function useUpdateStaffAvailability() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();

  return useMutation({
    mutationFn: ({ staffId, templates }: { staffId: string; templates: AvailabilityTemplateInput[] }) =>
      post(`/api/staff/availability/bulk`, { staff_id: staffId, templates }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-availability', variables.staffId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.staff(businessId || '') });
    },
  });
}

interface StaffServiceMapping {
  staff_id: string;
  service_id: string;
}

interface StaffServiceMapping {
  id: string;
  name: string;
  duration_minutes: number;
  price?: number;
  category?: string;
  is_active: boolean;
  custom_price?: number;
}

export function useStaffServices(staffId: string) {
  return useQuery({
    queryKey: ['staff-services', staffId],
    queryFn: () => get<StaffServiceMapping[]>(`/api/staff/${staffId}/services`),
    enabled: !!staffId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateStaffServices() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();

  return useMutation({
    mutationFn: ({ staffId, serviceIds }: { staffId: string; serviceIds: string[] }) =>
      put(`/api/staff/${staffId}/services`, serviceIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-services', variables.staffId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.staff(businessId || '') });
    },
  });
}

// Staff Time Off Hooks

export function useStaffTimeOffs(staffId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['staff-time-offs', staffId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const queryString = params.toString();
      const url = `/api/staff/${staffId}/time-offs${queryString ? `?${queryString}` : ''}`;
      return get<StaffTimeOff[]>(url);
    },
    enabled: !!staffId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateStaffTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StaffTimeOffCreate) =>
      post<StaffTimeOff>('/api/staff/time-offs', data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-time-offs', variables.staff_id] });
    },
  });
}

export function useDeleteStaffTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ timeOffId, staffId }: { timeOffId: string; staffId: string }) =>
      del(`/api/staff/time-offs/${timeOffId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-time-offs', variables.staffId] });
    },
  });
}

export function useDeleteStaffTimeOffRange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ staffId, startDate, endDate }: { staffId: string; startDate: string; endDate: string }) =>
      del(`/api/staff/${staffId}/time-offs/range?start_date=${startDate}&end_date=${endDate}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-time-offs', variables.staffId] });
    },
  });
}

// Staff Availability with Business Hours Validation Hooks

export function useStaffBusinessHours(staffId: string) {
  return useQuery({
    queryKey: ['staff-business-hours', staffId],
    queryFn: () => get<BusinessHours[]>(`/api/staff/${staffId}/business-hours`),
    enabled: !!staffId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useValidateStaffAvailability() {
  return useMutation({
    mutationFn: ({ staffId, schedule }: { staffId: string; schedule: StaffAvailabilityEntry[] }) =>
      post<StaffAvailabilityValidation>(`/api/staff/${staffId}/availability/validate`, {
        staff_id: staffId,
        schedule,
      }),
  });
}

export function useUpdateStaffAvailabilitySchedule() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();

  return useMutation({
    mutationFn: ({ staffId, schedule }: { staffId: string; schedule: StaffAvailabilityEntry[] }) =>
      put(`/api/staff/${staffId}/availability/schedule`, {
        staff_id: staffId,
        schedule,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-availability', variables.staffId] });
      queryClient.invalidateQueries({ queryKey: ['staff-business-hours', variables.staffId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.staff(businessId || '') });
    },
  });
}

// =============================================================================
// SERVICE HOOKS
// =============================================================================

interface ServicesResponse {
  data: Service[];
  total: number;
}

export function useServices(includeInactive: boolean = true) {
  const businessId = useBusinessId();

  return useQuery({
    queryKey: queryKeys.services(businessId || ''),
    queryFn: async () => {
      const params = includeInactive ? '?include_inactive=true' : '';
      const result = await get<Service[] | ServicesResponse>(`/api/services/business/${businessId}${params}`);
      // Handle both array and wrapped response formats
      if (Array.isArray(result)) {
        return { data: result, total: result.length };
      }
      return result;
    },
    enabled: !!businessId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: (data: Partial<Service>) => 
      post<Service>('/api/services', { ...data, business_id: businessId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services(businessId || '') });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Service> }) => 
      put<Service>(`/api/services/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services(businessId || '') });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: (id: string) => del(`/api/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services(businessId || '') });
    },
  });
}

// =============================================================================
// APPOINTMENT HOOKS
// =============================================================================

interface AppointmentFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  staffId?: string;
}

export function useAppointments(filters?: AppointmentFilters) {
  const businessId = useBusinessId();
  
  return useQuery({
    queryKey: queryKeys.appointments(businessId || '', filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('start_date', filters.startDate);
      if (filters?.endDate) params.append('end_date', filters.endDate);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.staffId) params.append('staff_id', filters.staffId);
      
      return get<AppointmentWithDetails[]>(
        `/api/appointments/business/${businessId}?${params.toString()}`
      );
    },
    enabled: !!businessId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAppointment(appointmentId: string) {
  return useQuery({
    queryKey: queryKeys.appointment(appointmentId),
    queryFn: () => get<AppointmentWithDetails>(`/api/appointments/${appointmentId}`),
    enabled: !!appointmentId,
  });
}

interface TimeSlotResponse {
  id: string;
  staff_id: string;
  date: string;
  time: string;
  duration_minutes: number;
  is_booked: boolean;
}

export function useAvailableSlots(staffId: string, startDate: string, endDate?: string) {
  return useQuery({
    queryKey: queryKeys.availableSlots(staffId, startDate),
    queryFn: async () => {
      const params = new URLSearchParams({ start_date: startDate });
      if (endDate) params.append('end_date', endDate);
      
      const result = await get<TimeSlotResponse[]>(
        `/api/appointments/staff/${staffId}/slots?${params.toString()}`
      );
      // Transform to expected format (is_booked → is_available)
      return (result || []).map(slot => ({
        date: slot.date,
        time: slot.time,
        is_available: !slot.is_booked,
        duration_minutes: slot.duration_minutes,
      }));
    },
    enabled: !!staffId && !!startDate,
    staleTime: 1000 * 60 * 1,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: (data: Partial<Appointment>) => 
      post<AppointmentWithDetails>('/api/appointments', { ...data, business_id: businessId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['today-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Appointment> }) => 
      put<AppointmentWithDetails>(`/api/appointments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['today-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => {
      const params = reason ? `?cancellation_reason=${encodeURIComponent(reason)}` : '';
      return del(`/api/appointments/${id}${params}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['today-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// =============================================================================
// CALL LOG HOOKS
// =============================================================================

interface CallFilters {
  startDate?: string;
  endDate?: string;
  direction?: 'inbound' | 'outbound';
  outcome?: string;
  limit?: number;
  offset?: number;
}

interface CallsResponse {
  calls: CallLogWithDetails[];
  total: number;
  limit: number;
  offset: number;
}

export function useCalls(filters?: CallFilters) {
  const businessId = useBusinessId();
  
  return useQuery({
    queryKey: queryKeys.calls(businessId || '', filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('start_date', filters.startDate);
      if (filters?.endDate) params.append('end_date', filters.endDate);
      params.append('limit', (filters?.limit || 50).toString());
      params.append('offset', (filters?.offset || 0).toString());
      
      const result = await get<CallsResponse>(
        `/api/calls/business/${businessId}?${params.toString()}`
      );
      // Normalize response to use 'data' key for consistency
      return { data: result.calls || [], total: result.total || 0 };
    },
    enabled: !!businessId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCall(callId: string) {
  return useQuery({
    queryKey: queryKeys.call(callId),
    queryFn: () => get<CallLogWithDetails>(`/api/calls/${callId}`),
    enabled: !!callId,
  });
}

// =============================================================================
// AI CONFIG HOOKS
// =============================================================================

export function useAIRoles() {
  const businessId = useBusinessId();
  
  return useQuery({
    queryKey: queryKeys.aiRoles(businessId || ''),
    queryFn: () => get<AIRole[]>(`/api/ai/roles/${businessId}`),
    enabled: !!businessId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateAIRole() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: (data: Partial<AIRole>) => 
      post<AIRole>('/api/ai/roles', { ...data, business_id: businessId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiRoles(businessId || '') });
    },
  });
}

export function useUpdateAIRole() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AIRole> }) => 
      put<AIRole>(`/api/ai/roles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiRoles(businessId || '') });
    },
  });
}

export function useDeleteAIRole() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: (id: string) => del(`/api/ai/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiRoles(businessId || '') });
    },
  });
}

export function useFAQs() {
  const businessId = useBusinessId();
  
  return useQuery({
    queryKey: queryKeys.faqs(businessId || ''),
    queryFn: () => get<FAQ[]>(`/api/knowledge-base/business/${businessId}`),
    enabled: !!businessId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateFAQ() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: (data: Partial<FAQ>) => 
      post<FAQ>('/api/knowledge-base', { ...data, business_id: businessId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faqs(businessId || '') });
    },
  });
}

export function useUpdateFAQ() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FAQ> }) => 
      put<FAQ>(`/api/knowledge-base/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faqs(businessId || '') });
    },
  });
}

export function useDeleteFAQ() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: (id: string) => del(`/api/knowledge-base/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faqs(businessId || '') });
    },
  });
}

// =============================================================================
// BUSINESS HOOKS
// =============================================================================

export function useBusiness() {
  const businessId = useBusinessId();
  
  return useQuery({
    queryKey: queryKeys.business(businessId || ''),
    queryFn: () => get<Business>(`/api/businesses/${businessId}`),
    enabled: !!businessId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();

  return useMutation({
    mutationFn: (data: Partial<Business>) =>
      put<Business>(`/api/businesses/${businessId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.business(businessId || '') });
    },
  });
}

interface LogoUploadResponse {
  logo_url: string;
  message: string;
}

export function useUploadBusinessLogo() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();

  return useMutation({
    mutationFn: (file: File) =>
      upload<LogoUploadResponse>('/api/businesses/me/logo', file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.business(businessId || '') });
    },
  });
}

export function useDeleteBusinessLogo() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();

  return useMutation({
    mutationFn: () => del('/api/businesses/me/logo'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.business(businessId || '') });
    },
  });
}

export function useBusinessHours() {
  const businessId = useBusinessId();
  
  return useQuery({
    queryKey: queryKeys.businessHours(businessId || ''),
    queryFn: () => get<BusinessHours[]>(`/api/business-hours/${businessId}`),
    enabled: !!businessId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useUpdateBusinessHours() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();

  return useMutation({
    mutationFn: (data: BusinessHours[]) =>
      post<BusinessHours[]>(`/api/business-hours/${businessId}`, {
        business_id: businessId,
        hours: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.businessHours(businessId || '') });
    },
  });
}

// =============================================================================
// BUSINESS CLOSURES HOOKS
// =============================================================================

interface BusinessClosure {
  id: string;
  business_id: string;
  closure_date: string;
  reason?: string;
  created_at: string;
}

export function useBusinessClosures() {
  const businessId = useBusinessId();

  return useQuery({
    queryKey: ['business-closures', businessId],
    queryFn: () => get<BusinessClosure[]>(`/api/business-hours/${businessId}/closures`),
    enabled: !!businessId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useAddBusinessClosure() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();

  return useMutation({
    mutationFn: (data: { closure_date: string; reason?: string }) =>
      post<BusinessClosure>('/api/business-hours/closures', { ...data, business_id: businessId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-closures', businessId] });
    },
  });
}

export function useDeleteBusinessClosure() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();

  return useMutation({
    mutationFn: (closureId: string) => del(`/api/business-hours/closures/${closureId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-closures', businessId] });
    },
  });
}

// =============================================================================
// PUBLIC HOLIDAYS (via backend - uses Python holidays library)
// =============================================================================

interface SyncHolidaysResponse {
  added: number;
  total: number;
  unsupported: boolean;
  message?: string;
}

export function useSyncHolidays() {
  const queryClient = useQueryClient();
  const businessId = useBusinessId();

  return useMutation({
    mutationFn: async (countryCode: string) => {
      return await post<SyncHolidaysResponse>('/api/business-hours/sync-holidays', {
        country_code: countryCode,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-closures', businessId] });
    },
  });
}

// =============================================================================
// MESSAGING HOOKS
// =============================================================================

interface MessageTemplate {
  id: string;
  business_id: string | null;
  template_type: string;
  channel: string;
  name: string;
  subject: string | null;
  body: string;
  variables: string[];
  language_code: string;
  is_active: boolean;
}

interface MessageLog {
  id: string;
  business_id: string;
  customer_id: string | null;
  channel: string;
  direction: string;
  to_address: string;
  subject: string | null;
  body: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export function useMessageTemplates(templateType?: string, channel?: string) {
  const businessId = useBusinessId();
  
  return useQuery({
    queryKey: ['message-templates', businessId, templateType, channel],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (businessId) params.append('business_id', businessId);
      if (templateType) params.append('template_type', templateType);
      if (channel) params.append('channel', channel);
      
      return get<MessageTemplate[]>(`/api/messaging/templates?${params.toString()}`);
    },
    enabled: !!businessId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useMessageHistory(customerId: string) {
  const businessId = useBusinessId();
  
  return useQuery({
    queryKey: ['message-history', customerId, businessId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (businessId) params.append('business_id', businessId);
      
      return get<MessageLog[]>(`/api/messaging/history/${customerId}?${params.toString()}`);
    },
    enabled: !!customerId && !!businessId,
    staleTime: 1000 * 60 * 2,
  });
}

interface SendSMSRequest {
  to_phone?: string;
  message: string;
  customer_id?: string;
  include_appointment?: boolean;
}

interface SendEmailRequest {
  to_email?: string;
  subject: string;
  message: string;
  customer_id?: string;
  include_appointment?: boolean;
}

export function useSendSMS() {
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: (data: SendSMSRequest) => 
      post(`/api/messaging/send-sms`, { ...data, business_id: businessId }),
  });
}

export function useSendEmail() {
  const businessId = useBusinessId();
  
  return useMutation({
    mutationFn: (data: SendEmailRequest) => 
      post(`/api/messaging/send-email`, { ...data, business_id: businessId }),
  });
}

export function useSendWhatsApp() {
  const businessId = useBusinessId();

  return useMutation({
    mutationFn: (data: SendSMSRequest) =>
      post(`/api/messaging/send-whatsapp`, { ...data, business_id: businessId }),
  });
}

// =============================================================================
// VOICE PREVIEW HOOK
// =============================================================================

interface VoicePreviewRequest {
  voice: string;
  text: string;
}

interface VoicePreviewResponse {
  audio: string;  // Base64-encoded WAV audio
  format: string;
  voice: string;
}

export function useVoicePreview() {
  return useMutation({
    mutationFn: (data: VoicePreviewRequest) =>
      post<VoicePreviewResponse>('/api/ai/voice-preview', data),
  });
}

