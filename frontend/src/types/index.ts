// Common types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Auth types
export interface User {
  id: string;
  email: string;
  full_name: string;
  business_id?: string;
  role: 'owner' | 'admin' | 'staff';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  user: User;
}

export interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
}

// Business types
export interface Business {
  id: string;
  owner_id: string;
  business_name: string;
  industry: string;
  currency: string;
  phone_number?: string;
  ai_phone_number?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country: string;
  timezone: string;
  default_language: string;
  subscription_status: 'active' | 'trial' | 'expired' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  id: string;
  business_id: string;
  day_of_week: number;
  is_open: boolean;
  open_time?: string;
  close_time?: string;
}

// Staff types
export interface Staff {
  id: string;
  business_id: string;
  name: string;
  title?: string;
  role?: string;
  email?: string;
  phone?: string;
  specialty?: string;
  bio?: string;
  color_code: string;
  avatar_url?: string;
  is_active: boolean;
  service_ids?: string[];
  availability?: Record<string, { start: string; end: string; closed?: boolean }> | string;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityTemplate {
  id: string;
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

export interface TimeSlot {
  id: string;
  staff_id: string;
  date: string;
  time: string;
  duration_minutes: number;
  is_booked: boolean;
}

// Customer types
export interface Customer {
  id: string;
  business_id: string;
  phone: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  preferred_contact_method?: 'phone' | 'sms' | 'email' | 'whatsapp';
  accommodations?: string;
  language: string;
  notes?: string;
  total_appointments: number;
  total_spent: number;
  last_visit_date?: string;
  customer_since: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerMemory {
  id: string;
  customer_id: string;
  memory_type: 'fact' | 'preference' | 'note' | 'issue';
  content: string;
  importance: number;
  created_at: string;
}

// Appointment types
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  business_id: string;
  customer_id: string;
  staff_id: string;
  service_id?: string;
  slot_id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes?: string;
  created_via: 'dashboard' | 'ai_phone';
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithDetails extends Appointment {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  staff_name: string;
  staff_title?: string;
  staff_color: string;
  service_name?: string;
  service_price?: number;
}

// Service types
export interface Service {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price?: number;
  category?: string;
  is_active: boolean;
  requires_staff: boolean;
  created_at: string;
  updated_at: string;
}

// Call log types
export type CallOutcome = 
  | 'appointment_booked'
  | 'appointment_rescheduled'
  | 'appointment_cancelled'
  | 'question_answered'
  | 'callback_scheduled'
  | 'transferred_human'
  | 'voicemail'
  | 'other';

export interface CallLog {
  id: string;
  business_id: string;
  customer_id?: string;
  caller_phone: string;
  call_direction: 'inbound' | 'outbound';
  call_status: 'ringing' | 'in_progress' | 'completed' | 'missed' | 'failed';
  call_duration?: number;
  transcript?: string;
  outcome?: CallOutcome;
  started_at: string;
  ended_at?: string;
  created_at: string;
}

export interface CallLogWithDetails extends CallLog {
  customer_name?: string;
  customer_email?: string;
}

// AI config types
export type AIRoleType = 'assistant' | 'receptionist' | 'sales' | 'support' | 'billing' | 'marketing';
export type VoiceStyle =
  | 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede'
  | 'Zephyr' | 'Leda' | 'Orus' | 'Callirrhoe' | 'Autonoe'
  | 'Enceladus' | 'Iapetus' | 'Umbriel' | 'Algieba' | 'Despina'
  | 'Erinome' | 'Algenib' | 'Rasalgethi' | 'Laomedeia' | 'Achernar'
  | 'Alnilam' | 'Schedar' | 'Gacrux' | 'Pulcherrima' | 'Achird'
  | 'Zubenelgenubi' | 'Vindemiatrix' | 'Sadachbia' | 'Sadaltager' | 'Sulafat';
export type PersonalityStyle = 'professional' | 'friendly' | 'calm' | 'energetic';
export type ResponseLength = 'concise' | 'detailed';

export interface AIRole {
  id: string;
  business_id: string;
  role_type: AIRoleType;
  ai_name: string;
  voice_style: VoiceStyle;
  personality_style: PersonalityStyle;
  response_length: ResponseLength;
  system_prompt: string;
  greeting_message: string;
  fallback_message?: string;
  priority: number;
  is_enabled: boolean;
  calls_handled?: number;
  created_at?: string;
  updated_at?: string;
}

export type FAQCategory = 'hours' | 'pricing' | 'services' | 'policies' | 'general' | 'location';

export interface FAQ {
  id: string;
  business_id: string;
  category: FAQCategory;
  question: string;
  answer: string;
  keywords: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Dashboard types
export interface DashboardStats {
  callsToday: number;
  callsChange: number;
  appointmentsToday: number;
  appointmentsCompleted: number;
  totalCustomers: number;
  averageRating: number;
  ratingsCount: number;
}

export interface CallAnalytics {
  date: string;
  calls: number;
  appointments: number;
}

export interface CallOutcomeStats {
  outcome: string;
  count: number;
  percentage: number;
}
