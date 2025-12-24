import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from './client';
import type { 
  Business, Staff, Customer, Appointment, Service, 
  AIRole, FAQ, BusinessHours, PaginatedResponse,
  AppointmentWithDetails, CallLogWithDetails, TimeSlot
} from '@/types';

// ============================================================================
// Business Hooks
// ============================================================================

export function useCurrentBusiness() {
  return useQuery({
    queryKey: ['business', 'current'],
    queryFn: () => get<Business>('/api/businesses/me'),
  });
}

export function useBusinessStats(businessId: string) {
  return useQuery({
    queryKey: ['business', businessId, 'stats'],
    queryFn: () => get<{
      calls_today: number;
      calls_change: number;
      appointments_today: number;
      appointments_completed: number;
      total_customers: number;
      customers_change: number;
      average_rating: number;
    }>(`/api/businesses/${businessId}/stats`),
    enabled: !!businessId,
  });
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Business> }) =>
      put<Business>(`/api/businesses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
    },
  });
}

// ============================================================================
// Staff Hooks
// ============================================================================

export function useStaff(businessId: string) {
  return useQuery({
    queryKey: ['staff', businessId],
    queryFn: () => get<Staff[]>(`/api/staff/business/${businessId}`),
    enabled: !!businessId,
  });
}

export function useStaffMember(staffId: string) {
  return useQuery({
    queryKey: ['staff', 'detail', staffId],
    queryFn: () => get<Staff>(`/api/staff/${staffId}`),
    enabled: !!staffId,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Staff, 'id' | 'created_at' | 'updated_at'>) =>
      post<Staff>('/api/staff', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Staff> }) =>
      put<Staff>(`/api/staff/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<void>(`/api/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useStaffSlots(staffId: string, date: string) {
  return useQuery({
    queryKey: ['staff', staffId, 'slots', date],
    queryFn: () => get<TimeSlot[]>(`/api/staff/${staffId}/slots`, { date }),
    enabled: !!staffId && !!date,
  });
}

export function useGenerateStaffSlots() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ staffId, startDate, endDate }: { staffId: string; startDate: string; endDate: string }) =>
      post<void>(`/api/staff/${staffId}/generate-slots`, { start_date: startDate, end_date: endDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

// ============================================================================
// Customer Hooks
// ============================================================================

export function useCustomers(businessId: string, params?: { search?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['customers', businessId, params],
    queryFn: () => get<PaginatedResponse<Customer>>(`/api/customers/business/${businessId}`, params),
    enabled: !!businessId,
  });
}

export function useCustomer(customerId: string) {
  return useQuery({
    queryKey: ['customers', 'detail', customerId],
    queryFn: () => get<Customer>(`/api/customers/${customerId}`),
    enabled: !!customerId,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'total_appointments' | 'total_spent' | 'customer_since'>) =>
      post<Customer>('/api/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      put<Customer>(`/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// ============================================================================
// Appointment Hooks
// ============================================================================

export function useAppointments(businessId: string, params?: { 
  date?: string; 
  staff_id?: string; 
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['appointments', businessId, params],
    queryFn: () => get<PaginatedResponse<AppointmentWithDetails>>(`/api/appointments/business/${businessId}`, params),
    enabled: !!businessId,
  });
}

export function useAppointment(appointmentId: string) {
  return useQuery({
    queryKey: ['appointments', 'detail', appointmentId],
    queryFn: () => get<AppointmentWithDetails>(`/api/appointments/${appointmentId}`),
    enabled: !!appointmentId,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      business_id: string;
      customer_id: string;
      staff_id: string;
      slot_id: string;
      service_id?: string;
      notes?: string;
    }) => post<Appointment>('/api/appointments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] }); // Refresh slots
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Appointment> }) =>
      put<Appointment>(`/api/appointments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      put<Appointment>(`/api/appointments/${id}`, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] }); // Refresh slots
    },
  });
}

// ============================================================================
// Service Hooks
// ============================================================================

export function useServices(businessId: string) {
  return useQuery({
    queryKey: ['services', businessId],
    queryFn: () => get<Service[]>(`/api/services/business/${businessId}`),
    enabled: !!businessId,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Service, 'id' | 'created_at' | 'updated_at'>) =>
      post<Service>('/api/services', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Service> }) =>
      put<Service>(`/api/services/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<void>(`/api/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

// ============================================================================
// AI Config Hooks
// ============================================================================

export function useAIRoles(businessId: string) {
  return useQuery({
    queryKey: ['ai-roles', businessId],
    queryFn: () => get<AIRole[]>(`/api/ai/roles/${businessId}`),
    enabled: !!businessId,
  });
}

export function useCreateAIRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<AIRole, 'id' | 'created_at' | 'updated_at' | 'calls_handled'>) =>
      post<AIRole>('/api/ai/roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-roles'] });
    },
  });
}

export function useUpdateAIRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AIRole> }) =>
      put<AIRole>(`/api/ai/roles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-roles'] });
    },
  });
}

export function useDeleteAIRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<void>(`/api/ai/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-roles'] });
    },
  });
}

// ============================================================================
// Knowledge Base (FAQ) Hooks
// ============================================================================

export function useFAQs(businessId: string) {
  return useQuery({
    queryKey: ['faqs', businessId],
    queryFn: () => get<FAQ[]>(`/api/knowledge-base/business/${businessId}`),
    enabled: !!businessId,
  });
}

export function useCreateFAQ() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<FAQ, 'id' | 'created_at' | 'updated_at'>) =>
      post<FAQ>('/api/knowledge-base', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
    },
  });
}

export function useUpdateFAQ() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FAQ> }) =>
      put<FAQ>(`/api/knowledge-base/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
    },
  });
}

export function useDeleteFAQ() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<void>(`/api/knowledge-base/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
    },
  });
}

// ============================================================================
// Call Log Hooks
// ============================================================================

export function useCallLogs(businessId: string, params?: {
  direction?: 'inbound' | 'outbound';
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['calls', businessId, params],
    queryFn: () => get<PaginatedResponse<CallLogWithDetails>>(`/api/calls/business/${businessId}`, params),
    enabled: !!businessId,
  });
}

export function useCallLog(callId: string) {
  return useQuery({
    queryKey: ['calls', 'detail', callId],
    queryFn: () => get<CallLogWithDetails>(`/api/calls/${callId}`),
    enabled: !!callId,
  });
}

// ============================================================================
// Business Hours Hooks
// ============================================================================

export function useBusinessHours(businessId: string) {
  return useQuery({
    queryKey: ['business-hours', businessId],
    queryFn: () => get<BusinessHours[]>(`/api/business-hours/${businessId}`),
    enabled: !!businessId,
  });
}

export function useUpdateBusinessHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ businessId, hours }: { businessId: string; hours: Omit<BusinessHours, 'id'>[] }) =>
      post<BusinessHours[]>(`/api/business-hours/${businessId}`, { hours }),
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({ queryKey: ['business-hours', businessId] });
    },
  });
}
