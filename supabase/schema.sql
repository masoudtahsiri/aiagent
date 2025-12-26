-- ============================================================================
-- CORE BUSINESS & USERS
-- ============================================================================

-- Businesses (Tenants)
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_email VARCHAR(255) UNIQUE NOT NULL,
    business_name VARCHAR(200) NOT NULL,
    industry VARCHAR(100), -- 'medical', 'salon', 'legal', 'automotive', 'home_services', etc.
    phone_number VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'US',
    website VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    subscription_tier VARCHAR(50) DEFAULT 'basic', -- 'basic', 'professional', 'enterprise'
    subscription_status VARCHAR(50) DEFAULT 'trial', -- 'trial', 'active', 'suspended', 'cancelled'
    trial_ends_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Business owners/admins
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(200),
    role VARCHAR(50) DEFAULT 'owner', -- 'owner', 'admin', 'staff'
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- BUSINESS HOURS & CLOSURES
-- ============================================================================

-- Business operating hours (weekly schedule)
CREATE TABLE business_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
    is_open BOOLEAN DEFAULT TRUE,
    open_time TIME, -- NULL if closed
    close_time TIME, -- NULL if closed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, day_of_week)
);

-- Business closures (holidays, special closures)
CREATE TABLE business_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    closure_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, closure_date)
);

-- ============================================================================
-- STAFF & AVAILABILITY
-- ============================================================================

-- Staff members (Doctors, Stylists, Lawyers, Mechanics, etc.)
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    title VARCHAR(100), -- 'Doctor', 'Stylist', 'Attorney', 'Mechanic', etc.
    specialty VARCHAR(200), -- 'General Practice', 'Hair Colorist', 'Family Law', etc.
    bio TEXT,
    photo_url TEXT,
    color_code VARCHAR(7), -- Hex color for calendar display
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Weekly availability templates
CREATE TABLE availability_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Exceptions (time off, holidays, custom hours)
CREATE TABLE availability_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    exception_type VARCHAR(50), -- 'closed', 'custom_hours', 'lunch_break'
    start_time TIME,
    end_time TIME,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Generated time slots (auto-created from templates)
CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    is_booked BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE, -- Manually blocked by admin
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- SERVICES & PRICING
-- ============================================================================

-- Services offered (for service-based businesses)
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    price DECIMAL(10,2),
    category VARCHAR(100), -- 'hair', 'nails', 'repair', 'legal', etc.
    is_active BOOLEAN DEFAULT TRUE,
    requires_staff BOOLEAN DEFAULT TRUE, -- Some services might not need specific staff
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Which staff can perform which services
CREATE TABLE staff_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    custom_price DECIMAL(10,2), -- Override default price for this staff member
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(staff_id, service_id)
);

-- ============================================================================
-- CUSTOMERS
-- ============================================================================

-- Customer database
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL, -- Primary identifier for caller ID
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    notes TEXT, -- Important customer notes
    preferred_staff_id UUID REFERENCES staff(id), -- Preferred doctor/stylist
    total_appointments INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    last_visit_date DATE,
    customer_since TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, phone) -- Phone must be unique per business
);

-- Customer tags/labels
CREATE TABLE customer_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    tag VARCHAR(100), -- 'vip', 'new', 'regular', 'problematic', etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- APPOINTMENTS
-- ============================================================================

-- Appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    slot_id UUID REFERENCES time_slots(id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
    cancellation_reason TEXT,
    notes TEXT,
    reminder_sent_email BOOLEAN DEFAULT FALSE,
    reminder_sent_call BOOLEAN DEFAULT FALSE,
    reminder_sent_sms BOOLEAN DEFAULT FALSE,
    created_via VARCHAR(50) DEFAULT 'ai_phone', -- 'ai_phone', 'web', 'manual', 'api'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    -- Google Calendar sync fields
    google_event_id VARCHAR(255),
    sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'synced', 'pending_update', 'pending_delete', 'deleted', 'error'
    last_synced_at TIMESTAMP,
    last_modified_at TIMESTAMP DEFAULT NOW()
);

-- Appointment history/changes
CREATE TABLE appointment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    changed_by VARCHAR(100), -- 'customer', 'staff', 'ai', 'admin'
    change_type VARCHAR(50), -- 'created', 'rescheduled', 'cancelled', 'completed'
    old_date DATE,
    new_date DATE,
    old_time TIME,
    new_time TIME,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- CALENDAR INTEGRATIONS
-- ============================================================================

-- Calendar connections (Google, Apple, Outlook)
CREATE TABLE calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'apple', 'outlook', 'office365'
    calendar_id VARCHAR(255),
    calendar_name VARCHAR(200),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_direction VARCHAR(50) DEFAULT 'bidirectional', -- 'to_calendar', 'from_calendar', 'bidirectional'
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Calendar sync log
CREATE TABLE calendar_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE,
    sync_type VARCHAR(50), -- 'push', 'pull', 'bidirectional'
    events_synced INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_details TEXT,
    sync_status VARCHAR(50), -- 'success', 'partial', 'failed'
    created_at TIMESTAMP DEFAULT NOW()
);

-- External calendar events (from Google Calendar, not appointments)
CREATE TABLE external_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    google_event_id VARCHAR(255) NOT NULL,
    summary VARCHAR(500),
    description TEXT,
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    event_status VARCHAR(50) DEFAULT 'confirmed', -- 'confirmed', 'tentative', 'cancelled'
    last_synced_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(staff_id, google_event_id)
);

-- Calendar webhook channels (for Google Calendar push notifications)
CREATE TABLE calendar_webhook_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    channel_id VARCHAR(255) NOT NULL UNIQUE,
    resource_id VARCHAR(255) NOT NULL,
    expiration TIMESTAMP NOT NULL,
    sync_token TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- AI CONFIGURATION
-- ============================================================================

-- AI Roles (Receptionist, Sales, Support, etc.)
CREATE TABLE ai_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    role_type VARCHAR(50) NOT NULL, -- 'receptionist', 'sales', 'support', 'billing', 'marketing'
    role_name VARCHAR(100), -- Display name: "Front Desk", "Sales Team", etc.
    ai_personality_name VARCHAR(100), -- "Sarah", "Mike", "Lisa"
    voice_style VARCHAR(50), -- 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'
    personality_style VARCHAR(50) DEFAULT 'friendly', -- 'professional', 'friendly', 'calm', 'energetic'
    response_length VARCHAR(50) DEFAULT 'concise', -- 'concise', 'detailed'
    voice_speed DECIMAL(3,2) DEFAULT 1.0, -- 0.5 to 2.0
    system_prompt TEXT DEFAULT '',
    greeting_message TEXT,
    fallback_message TEXT, -- When AI can't understand
    transfer_to_human_keywords TEXT[], -- Array of keywords that trigger human transfer
    is_enabled BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0, -- Higher priority roles handle calls first
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Routing rules (keyword-based routing to different AI roles)
CREATE TABLE routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    from_role_id UUID REFERENCES ai_roles(id) ON DELETE CASCADE,
    to_role_id UUID REFERENCES ai_roles(id) ON DELETE CASCADE,
    trigger_keywords TEXT[], -- Array of keywords
    trigger_phrases TEXT[], -- Array of full phrases
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- AI knowledge base (FAQs, business-specific info)
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    category VARCHAR(100), -- 'hours', 'pricing', 'services', 'policies', etc.
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT[], -- For better matching
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- CALL MANAGEMENT
-- ============================================================================

-- Phone numbers assigned to businesses
CREATE TABLE phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    provider VARCHAR(50), -- 'twilio', 'bulutfon', 'livekit', etc.
    provider_sid VARCHAR(255), -- Provider's identifier
    number_type VARCHAR(50), -- 'local', 'toll_free', 'mobile'
    country_code VARCHAR(5),
    is_active BOOLEAN DEFAULT TRUE,
    monthly_cost DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Call logs
CREATE TABLE call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    phone_number_id UUID REFERENCES phone_numbers(id) ON DELETE SET NULL,
    caller_phone VARCHAR(20) NOT NULL,
    call_sid VARCHAR(255), -- Provider's call ID
    call_direction VARCHAR(20), -- 'inbound', 'outbound'
    call_status VARCHAR(50), -- 'completed', 'busy', 'no_answer', 'failed'
    call_duration INTEGER, -- In seconds
    recording_url TEXT,
    transcript TEXT,
    current_role_id UUID REFERENCES ai_roles(id),
    role_switches INTEGER DEFAULT 0, -- How many times role changed
    outcome VARCHAR(100), -- 'appointment_booked', 'question_answered', 'transferred_human', etc.
    customer_satisfaction INTEGER, -- 1-5 rating if collected
    cost DECIMAL(10,4), -- Call cost
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Call role transitions (track when AI switches roles during call)
CREATE TABLE call_role_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_log_id UUID REFERENCES call_logs(id) ON DELETE CASCADE,
    from_role_id UUID REFERENCES ai_roles(id),
    to_role_id UUID REFERENCES ai_roles(id),
    transition_reason TEXT, -- Why the switch happened
    timestamp TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- REMINDERS & NOTIFICATIONS
-- ============================================================================

-- Scheduled reminders
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50), -- 'email', 'sms', 'phone_call'
    reminder_timing INTEGER, -- Hours before appointment (24, 1, etc.)
    scheduled_for TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Email templates
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    template_type VARCHAR(50), -- 'appointment_confirmation', 'appointment_reminder', 'cancellation', etc.
    subject VARCHAR(255),
    body_html TEXT,
    body_text TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SMS templates
CREATE TABLE sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    template_type VARCHAR(50),
    message_text TEXT, -- Max 160 chars typically
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- n8n WEBHOOK CONFIGURATION
-- ============================================================================

-- n8n webhooks for each business
CREATE TABLE n8n_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    webhook_type VARCHAR(50), -- 'appointment_booked', 'appointment_reminder', etc.
    webhook_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Webhook call logs
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID REFERENCES n8n_webhooks(id) ON DELETE CASCADE,
    payload JSONB,
    response_status INTEGER,
    response_body TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ANALYTICS & REPORTING
-- ============================================================================

-- Daily business metrics
CREATE TABLE daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    appointments_booked INTEGER DEFAULT 0,
    appointments_cancelled INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0.00,
    avg_call_duration INTEGER, -- In seconds
    customer_satisfaction_avg DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, metric_date)
);

-- Role-specific metrics
CREATE TABLE role_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    role_id UUID REFERENCES ai_roles(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    calls_handled INTEGER DEFAULT 0,
    avg_handle_time INTEGER, -- In seconds
    successful_outcomes INTEGER DEFAULT 0,
    transferred_to_human INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, role_id, metric_date)
);

-- ============================================================================
-- BILLING & SUBSCRIPTIONS
-- ============================================================================

-- Subscription plans
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name VARCHAR(100) NOT NULL, -- 'Basic', 'Professional', 'Enterprise'
    plan_code VARCHAR(50) UNIQUE NOT NULL,
    monthly_price DECIMAL(10,2) NOT NULL,
    included_minutes INTEGER, -- Call minutes included
    max_staff INTEGER,
    max_ai_roles INTEGER,
    features JSONB, -- JSON array of features
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    billing_period_start DATE,
    billing_period_end DATE,
    subtotal DECIMAL(10,2),
    tax DECIMAL(10,2),
    total DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
    due_date DATE,
    paid_at TIMESTAMP,
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking (for billing)
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    tracking_date DATE NOT NULL,
    call_minutes_used INTEGER DEFAULT 0,
    sms_sent INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, tracking_date)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Business indexes
CREATE INDEX idx_businesses_owner_email ON businesses(owner_email);
CREATE INDEX idx_businesses_industry ON businesses(industry);
CREATE INDEX idx_businesses_subscription_status ON businesses(subscription_status);

-- Staff indexes
CREATE INDEX idx_staff_business_id ON staff(business_id);
CREATE INDEX idx_staff_is_active ON staff(is_active);

-- Customer indexes
CREATE INDEX idx_customers_business_phone ON customers(business_id, phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_last_visit ON customers(last_visit_date);

-- Appointment indexes
CREATE INDEX idx_appointments_business_date ON appointments(business_id, appointment_date);
CREATE INDEX idx_appointments_staff_date ON appointments(staff_id, appointment_date);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Time slot indexes
CREATE INDEX idx_time_slots_staff_date ON time_slots(staff_id, date);
CREATE INDEX idx_time_slots_date_available ON time_slots(date, is_booked) WHERE is_booked = FALSE;

-- Call log indexes
CREATE INDEX idx_call_logs_business_date ON call_logs(business_id, started_at);
CREATE INDEX idx_call_logs_customer ON call_logs(customer_id);
CREATE INDEX idx_call_logs_caller_phone ON call_logs(caller_phone);

-- Reminder indexes
CREATE INDEX idx_reminders_scheduled ON reminders(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_reminders_appointment ON reminders(appointment_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-generate time slots from templates
CREATE OR REPLACE FUNCTION generate_slots_for_date(p_staff_id UUID, p_date DATE)
RETURNS INTEGER AS $$
DECLARE
    template RECORD;
    current_slot_time TIME;
    slots_created INTEGER := 0;
    day_num INTEGER;
BEGIN
    -- Get day of week (0=Sunday)
    day_num := EXTRACT(DOW FROM p_date);
    
    -- Check for exceptions first
    IF EXISTS (
        SELECT 1 FROM availability_exceptions 
        WHERE staff_id = p_staff_id 
        AND exception_date = p_date 
        AND exception_type = 'closed'
    ) THEN
        RETURN 0;
    END IF;
    
    -- Get availability template for this day
    FOR template IN 
        SELECT * FROM availability_templates 
        WHERE staff_id = p_staff_id 
        AND day_of_week = day_num 
        AND is_active = TRUE
    LOOP
        current_slot_time := template.start_time;
        
        WHILE current_slot_time < template.end_time LOOP
            -- Insert slot if it doesn't exist
            INSERT INTO time_slots (staff_id, business_id, date, time, duration_minutes)
            SELECT p_staff_id, s.business_id, p_date, current_slot_time, template.slot_duration_minutes
            FROM staff s WHERE s.id = p_staff_id
            ON CONFLICT DO NOTHING;
            
            slots_created := slots_created + 1;
            current_slot_time := current_slot_time + (template.slot_duration_minutes || ' minutes')::INTERVAL;
        END LOOP;
    END LOOP;
    
    RETURN slots_created;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA INSERT (OPTIONAL - FOR TESTING)
-- ============================================================================

-- Insert default subscription plans
INSERT INTO subscription_plans (plan_name, plan_code, monthly_price, included_minutes, max_staff, max_ai_roles, features) VALUES
('Basic', 'basic', 99.00, 500, 2, 2, '["receptionist", "appointment_booking", "email_reminders"]'),
('Professional', 'professional', 199.00, 1500, 10, 5, '["receptionist", "sales", "support", "appointment_booking", "email_reminders", "sms_reminders", "call_reminders", "analytics"]'),
('Enterprise', 'enterprise', 499.00, 5000, 50, 10, '["all_features", "custom_ai_roles", "api_access", "white_label", "priority_support"]');

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Today's appointments
CREATE VIEW todays_appointments_view AS
SELECT 
    a.id,
    a.business_id,
    b.business_name,
    c.first_name || ' ' || c.last_name AS customer_name,
    c.phone AS customer_phone,
    s.name AS staff_name,
    srv.name AS service_name,
    a.appointment_date,
    a.appointment_time,
    a.duration_minutes,
    a.status
FROM appointments a
JOIN businesses b ON a.business_id = b.id
LEFT JOIN customers c ON a.customer_id = c.id
LEFT JOIN staff s ON a.staff_id = s.id
LEFT JOIN services srv ON a.service_id = srv.id
WHERE a.appointment_date = CURRENT_DATE
ORDER BY a.appointment_time;

-- View: Business dashboard metrics
CREATE VIEW business_dashboard_view AS
SELECT 
    b.id AS business_id,
    b.business_name,
    COUNT(DISTINCT c.id) AS total_customers,
    COUNT(DISTINCT s.id) AS total_staff,
    COUNT(DISTINCT CASE WHEN a.appointment_date = CURRENT_DATE THEN a.id END) AS appointments_today,
    COUNT(DISTINCT CASE WHEN a.appointment_date >= CURRENT_DATE THEN a.id END) AS upcoming_appointments,
    COUNT(DISTINCT CASE WHEN cl.started_at >= CURRENT_DATE THEN cl.id END) AS calls_today
FROM businesses b
LEFT JOIN customers c ON b.id = c.business_id AND c.is_active = TRUE
LEFT JOIN staff s ON b.id = s.business_id AND s.is_active = TRUE
LEFT JOIN appointments a ON b.id = a.business_id
LEFT JOIN call_logs cl ON b.id = cl.business_id
GROUP BY b.id, b.business_name;


-- ============================================================================
-- UNIVERSAL AI AGENT - DATABASE MIGRATION
-- Version: 1.0.0
-- Date: 2024-12-18
-- Description: Adds memory system, outbound calls, messaging, and enhanced
--              customer tracking for the Universal AI Agent system
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENHANCED CUSTOMER FIELDS
-- ============================================================================

-- Add language preference to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS 
    language VARCHAR(10) DEFAULT NULL;

COMMENT ON COLUMN customers.language IS 'Preferred language code (e.g., tr, en, es)';

-- Add preferred contact method
ALTER TABLE customers ADD COLUMN IF NOT EXISTS 
    preferred_contact_method VARCHAR(20) DEFAULT 'any';

COMMENT ON COLUMN customers.preferred_contact_method IS 'How customer prefers to be contacted: phone, sms, whatsapp, email, any';

-- Add accommodations/special needs field
ALTER TABLE customers ADD COLUMN IF NOT EXISTS 
    accommodations TEXT DEFAULT NULL;

COMMENT ON COLUMN customers.accommodations IS 'Special needs or accommodations (wheelchair, anxiety, hearing impaired, etc.)';

-- Add scheduling preferences
ALTER TABLE customers ADD COLUMN IF NOT EXISTS 
    scheduling_preferences JSONB DEFAULT NULL;

COMMENT ON COLUMN customers.scheduling_preferences IS 'JSON object with preferred times, days, staff, etc.';

-- Add last call summary for quick context
ALTER TABLE customers ADD COLUMN IF NOT EXISTS 
    last_call_summary TEXT DEFAULT NULL;

COMMENT ON COLUMN customers.last_call_summary IS 'Brief summary of the most recent call';

-- Add last call date
ALTER TABLE customers ADD COLUMN IF NOT EXISTS 
    last_call_at TIMESTAMP DEFAULT NULL;

COMMENT ON COLUMN customers.last_call_at IS 'Timestamp of most recent call';


-- ============================================================================
-- SECTION 2: ENHANCED BUSINESS FIELDS
-- ============================================================================

-- Add AI phone number (dedicated line for AI)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    ai_phone_number VARCHAR(20) DEFAULT NULL;

COMMENT ON COLUMN businesses.ai_phone_number IS 'Dedicated phone number for AI receptionist';

-- Add default language for the business
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    default_language VARCHAR(10) DEFAULT 'en';

COMMENT ON COLUMN businesses.default_language IS 'Default language for this business (fallback)';

-- Add timezone
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
    timezone VARCHAR(50) DEFAULT 'UTC';

COMMENT ON COLUMN businesses.timezone IS 'Business timezone for scheduling';


-- ============================================================================
-- SECTION 3: CUSTOMER MEMORY SYSTEM
-- ============================================================================

-- Customer memories (facts, observations, notes)
CREATE TABLE IF NOT EXISTS customer_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Memory classification
    memory_type VARCHAR(50) NOT NULL CHECK (memory_type IN (
        'fact',           -- Factual information (birthday, job, etc.)
        'preference',     -- Expressed preferences
        'note',           -- General observations
        'issue',          -- Problems or complaints
        'positive',       -- Positive feedback
        'conversation',   -- Call summary
        'relationship'    -- Family/relationship info
    )),
    
    -- The actual memory content
    content TEXT NOT NULL,
    
    -- Optional structured data
    structured_data JSONB DEFAULT NULL,
    
    -- Importance score (1-10, higher = more important)
    importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
    
    -- Source tracking
    source_type VARCHAR(50) DEFAULT 'call' CHECK (source_type IN (
        'call', 'appointment', 'feedback', 'manual', 'system', 'message'
    )),
    source_id UUID DEFAULT NULL,
    
    -- Expiration (for temporary memories)
    expires_at TIMESTAMP DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_customer_memory_customer 
    ON customer_memory(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_memory_business 
    ON customer_memory(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_memory_type 
    ON customer_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_customer_memory_importance 
    ON customer_memory(importance DESC);
CREATE INDEX IF NOT EXISTS idx_customer_memory_created 
    ON customer_memory(created_at DESC);

COMMENT ON TABLE customer_memory IS 'Stores persistent memories about customers for AI context';


-- ============================================================================
-- SECTION 4: CUSTOMER PREFERENCES (Structured & Queryable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Preference categorization
    category VARCHAR(100) NOT NULL CHECK (category IN (
        'scheduling',     -- Time preferences
        'communication',  -- Contact preferences
        'service',        -- Service preferences
        'staff',          -- Staff preferences
        'general'         -- Other preferences
    )),
    
    -- Key-value pair
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT NOT NULL,
    
    -- Confidence score (0.0 to 1.0)
    confidence DECIMAL(3,2) DEFAULT 0.50 CHECK (confidence >= 0 AND confidence <= 1),
    
    -- How many times this preference was observed
    observation_count INTEGER DEFAULT 1,
    
    -- Last time customer confirmed this preference
    last_confirmed_at TIMESTAMP DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint per customer/category/key
    UNIQUE(customer_id, category, preference_key)
);

CREATE INDEX IF NOT EXISTS idx_customer_preferences_customer 
    ON customer_preferences(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_preferences_category 
    ON customer_preferences(category);

COMMENT ON TABLE customer_preferences IS 'Structured customer preferences learned over time';


-- ============================================================================
-- SECTION 5: CUSTOMER RELATIONSHIPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Related customer (if they're also in the system)
    related_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Relationship details
    relationship_type VARCHAR(100) NOT NULL CHECK (relationship_type IN (
        'spouse', 'partner', 'child', 'parent', 'sibling',
        'friend', 'colleague', 'referral', 'assistant', 'other'
    )),
    related_name VARCHAR(200) NOT NULL,
    
    -- Additional notes
    notes TEXT DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_relationships_customer 
    ON customer_relationships(customer_id);

COMMENT ON TABLE customer_relationships IS 'Tracks relationships between customers and their contacts';


-- ============================================================================
-- SECTION 6: CUSTOMER SPECIAL DATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_special_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Date details
    date_type VARCHAR(100) NOT NULL CHECK (date_type IN (
        'birthday', 'anniversary', 'membership_start', 'first_visit', 'other'
    )),
    date_value DATE NOT NULL,
    year_known BOOLEAN DEFAULT TRUE,
    
    -- Reminder settings
    send_reminder BOOLEAN DEFAULT FALSE,
    reminder_days_before INTEGER DEFAULT 7,
    
    -- Description for 'other' types
    description TEXT DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_special_dates_customer 
    ON customer_special_dates(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_special_dates_date 
    ON customer_special_dates(date_value);

COMMENT ON TABLE customer_special_dates IS 'Tracks important dates for customers (birthdays, anniversaries)';


-- ============================================================================
-- SECTION 7: BUSINESS INSIGHTS (Learning from Patterns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Insight classification
    insight_type VARCHAR(100) NOT NULL CHECK (insight_type IN (
        'faq',            -- Frequently asked questions
        'peak_time',      -- Busy times
        'service_trend',  -- Popular services
        'issue_pattern',  -- Common problems
        'success_pattern' -- What works well
    )),
    
    -- Key-value storage
    insight_key VARCHAR(200) NOT NULL,
    insight_value TEXT NOT NULL,
    structured_data JSONB DEFAULT NULL,
    
    -- Confidence and observation tracking
    observation_count INTEGER DEFAULT 1,
    confidence DECIMAL(3,2) DEFAULT 0.50,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(business_id, insight_type, insight_key)
);

CREATE INDEX IF NOT EXISTS idx_business_insights_business 
    ON business_insights(business_id);
CREATE INDEX IF NOT EXISTS idx_business_insights_type 
    ON business_insights(insight_type);

COMMENT ON TABLE business_insights IS 'Aggregated learning and insights for each business';


-- ============================================================================
-- SECTION 8: OUTBOUND CALL SYSTEM
-- ============================================================================

-- Outbound call queue
CREATE TABLE IF NOT EXISTS outbound_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Call details
    phone_number VARCHAR(20) NOT NULL,
    call_type VARCHAR(50) NOT NULL CHECK (call_type IN (
        'appointment_reminder',
        'appointment_reminder_1h',
        'waitlist_notification',
        'no_show_followup',
        'callback',
        'payment_reminder',
        'birthday_greeting',
        'reengagement',
        'custom'
    )),
    
    -- Scheduling
    scheduled_for TIMESTAMP NOT NULL,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    
    -- Script/context for the AI
    script_type VARCHAR(50) DEFAULT NULL,
    context_data JSONB DEFAULT NULL,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'completed', 'failed', 
        'no_answer', 'busy', 'cancelled', 'max_attempts'
    )),
    
    -- Retry logic
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_attempt_at TIMESTAMP DEFAULT NULL,
    next_retry_at TIMESTAMP DEFAULT NULL,
    
    -- Results
    outcome VARCHAR(100) DEFAULT NULL,
    call_duration INTEGER DEFAULT NULL,
    call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    notes TEXT DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbound_calls_status 
    ON outbound_calls(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_outbound_calls_business 
    ON outbound_calls(business_id);
CREATE INDEX IF NOT EXISTS idx_outbound_calls_customer 
    ON outbound_calls(customer_id);
CREATE INDEX IF NOT EXISTS idx_outbound_calls_scheduled 
    ON outbound_calls(scheduled_for);

COMMENT ON TABLE outbound_calls IS 'Queue for AI-initiated outbound calls';


-- ============================================================================
-- SECTION 9: APPOINTMENT WAITLIST
-- ============================================================================

CREATE TABLE IF NOT EXISTS appointment_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Preferences
    preferred_date DATE DEFAULT NULL,
    preferred_time_of_day VARCHAR(20) DEFAULT NULL CHECK (
        preferred_time_of_day IS NULL OR 
        preferred_time_of_day IN ('morning', 'afternoon', 'evening', 'any')
    ),
    preferred_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN (
        'active', 'notified', 'booked', 'expired', 'cancelled'
    )),
    position INTEGER DEFAULT NULL,
    
    -- Notification tracking
    notified_at TIMESTAMP DEFAULT NULL,
    notification_expires_at TIMESTAMP DEFAULT NULL,
    
    -- Notes
    notes TEXT DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_business 
    ON appointment_waitlist(business_id, status);
CREATE INDEX IF NOT EXISTS idx_waitlist_customer 
    ON appointment_waitlist(customer_id);

COMMENT ON TABLE appointment_waitlist IS 'Customers waiting for appointment openings';


-- ============================================================================
-- SECTION 10: SCHEDULED CALLBACKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_callbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Contact details
    phone_number VARCHAR(20) NOT NULL,
    
    -- Schedule
    callback_date DATE NOT NULL,
    callback_time TIME NOT NULL,
    
    -- Context
    reason TEXT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    original_call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'completed', 'cancelled', 'failed'
    )),
    outbound_call_id UUID REFERENCES outbound_calls(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_callbacks_date 
    ON scheduled_callbacks(callback_date, status);
CREATE INDEX IF NOT EXISTS idx_callbacks_customer 
    ON scheduled_callbacks(customer_id);

COMMENT ON TABLE scheduled_callbacks IS 'Scheduled callbacks requested by customers or AI';


-- ============================================================================
-- SECTION 11: MESSAGE TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Template identification
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN (
        'appointment_confirmation',
        'appointment_reminder',
        'appointment_reminder_1h',
        'appointment_cancelled',
        'waitlist_notification',
        'payment_reminder',
        'birthday_greeting',
        'welcome',
        'custom'
    )),
    
    -- Channel
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
    
    -- Content
    subject VARCHAR(255) DEFAULT NULL,  -- For email
    body_template TEXT NOT NULL,        -- With {{placeholders}}
    
    -- WhatsApp specific
    whatsapp_template_id VARCHAR(100) DEFAULT NULL,
    
    -- Language
    language_code VARCHAR(10) DEFAULT 'en',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_business 
    ON message_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_type 
    ON message_templates(template_type, channel, language_code);

COMMENT ON TABLE message_templates IS 'Message templates for automated communications';


-- ============================================================================
-- SECTION 12: MESSAGE LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Message details
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('outbound', 'inbound')),
    
    -- Addresses
    to_address VARCHAR(255) NOT NULL,
    from_address VARCHAR(255) DEFAULT NULL,
    
    -- Content
    subject VARCHAR(255) DEFAULT NULL,
    body TEXT NOT NULL,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'sent', 'delivered', 'read', 'failed', 'bounced'
    )),
    
    -- Provider details
    provider_message_id VARCHAR(255) DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    
    -- Related records
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
    
    -- Delivery timestamps
    sent_at TIMESTAMP DEFAULT NULL,
    delivered_at TIMESTAMP DEFAULT NULL,
    read_at TIMESTAMP DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_log_customer 
    ON message_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_message_log_business 
    ON message_log(business_id);
CREATE INDEX IF NOT EXISTS idx_message_log_status 
    ON message_log(status);

COMMENT ON TABLE message_log IS 'Log of all messages sent and received';


-- ============================================================================
-- SECTION 13: CUSTOMER FEEDBACK
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Feedback details
    feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN (
        'complaint', 'compliment', 'suggestion', 'question', 'general'
    )),
    content TEXT NOT NULL,
    rating INTEGER DEFAULT NULL CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    
    -- Source
    source VARCHAR(50) DEFAULT 'call' CHECK (source IN (
        'call', 'message', 'email', 'manual', 'survey'
    )),
    call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    
    -- Follow-up tracking
    requires_followup BOOLEAN DEFAULT FALSE,
    followup_status VARCHAR(50) DEFAULT NULL CHECK (
        followup_status IS NULL OR 
        followup_status IN ('pending', 'in_progress', 'completed', 'escalated')
    ),
    followup_notes TEXT DEFAULT NULL,
    resolved_at TIMESTAMP DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_business 
    ON customer_feedback(business_id);
CREATE INDEX IF NOT EXISTS idx_feedback_customer 
    ON customer_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type 
    ON customer_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_followup 
    ON customer_feedback(requires_followup, followup_status);

COMMENT ON TABLE customer_feedback IS 'Customer feedback and complaints tracking';


-- ============================================================================
-- SECTION 14: KNOWLEDGE GAPS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- The question/topic that couldn't be answered
    question TEXT NOT NULL,
    context TEXT DEFAULT NULL,
    
    -- Tracking
    frequency INTEGER DEFAULT 1,
    call_log_ids UUID[] DEFAULT '{}',
    
    -- Resolution
    resolved BOOLEAN DEFAULT FALSE,
    resolution TEXT DEFAULT NULL,
    added_to_kb BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_business 
    ON knowledge_gaps(business_id, resolved);

COMMENT ON TABLE knowledge_gaps IS 'Tracks questions AI could not answer for knowledge base improvement';


-- ============================================================================
-- SECTION 15: ENHANCED CALL LOGS
-- ============================================================================

-- Add new columns to call_logs if they don't exist
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS 
    language_code VARCHAR(10) DEFAULT NULL;

ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS 
    language_source VARCHAR(50) DEFAULT NULL;

ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS 
    is_outbound BOOLEAN DEFAULT FALSE;

ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS 
    outbound_call_id UUID REFERENCES outbound_calls(id) ON DELETE SET NULL;

ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS 
    call_summary TEXT DEFAULT NULL;

ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS 
    sentiment VARCHAR(20) DEFAULT NULL CHECK (
        sentiment IS NULL OR sentiment IN ('positive', 'neutral', 'negative')
    );

ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS 
    tools_used TEXT[] DEFAULT '{}';

-- Create index for outbound calls
CREATE INDEX IF NOT EXISTS idx_call_logs_outbound 
    ON call_logs(is_outbound, outbound_call_id);


-- ============================================================================
-- SECTION 16: PERFORMANCE METRICS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW ai_performance_metrics AS
SELECT 
    business_id,
    DATE(started_at) as date,
    
    -- Call volume
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE call_status = 'completed') as completed_calls,
    COUNT(*) FILTER (WHERE is_outbound = TRUE) as outbound_calls,
    COUNT(*) FILTER (WHERE is_outbound = FALSE) as inbound_calls,
    
    -- Duration
    AVG(call_duration) FILTER (WHERE call_duration > 0) as avg_duration_seconds,
    MAX(call_duration) as max_duration_seconds,
    
    -- Outcomes
    COUNT(*) FILTER (WHERE outcome = 'appointment_booked') as appointments_booked,
    COUNT(*) FILTER (WHERE outcome = 'appointment_cancelled') as appointments_cancelled,
    COUNT(*) FILTER (WHERE outcome = 'appointment_rescheduled') as appointments_rescheduled,
    COUNT(*) FILTER (WHERE outcome = 'question_answered') as questions_answered,
    COUNT(*) FILTER (WHERE outcome = 'complaint_recorded') as complaints,
    
    -- Languages
    COUNT(DISTINCT language_code) as languages_used,
    
    -- Sentiment (if tracked)
    COUNT(*) FILTER (WHERE sentiment = 'positive') as positive_calls,
    COUNT(*) FILTER (WHERE sentiment = 'negative') as negative_calls

FROM call_logs
WHERE started_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY business_id, DATE(started_at);

COMMENT ON VIEW ai_performance_metrics IS 'Daily performance metrics for AI calls';


-- ============================================================================
-- SECTION 17: DEFAULT MESSAGE TEMPLATES
-- ============================================================================

-- Insert default templates (only if table is empty)
INSERT INTO message_templates (business_id, template_name, template_type, channel, subject, body_template, language_code)
SELECT NULL, 'Default Appointment Confirmation SMS', 'appointment_confirmation', 'sms', NULL,
    'Hi {{first_name}}! Your appointment at {{business_name}} is confirmed for {{date}} at {{time}}. See you then!',
    'en'
WHERE NOT EXISTS (SELECT 1 FROM message_templates WHERE template_type = 'appointment_confirmation' AND channel = 'sms' AND business_id IS NULL);

INSERT INTO message_templates (business_id, template_name, template_type, channel, subject, body_template, language_code)
SELECT NULL, 'Default Appointment Reminder SMS', 'appointment_reminder', 'sms', NULL,
    'Reminder: You have an appointment at {{business_name}} tomorrow ({{date}}) at {{time}}. Reply CONFIRM to confirm or call us to reschedule.',
    'en'
WHERE NOT EXISTS (SELECT 1 FROM message_templates WHERE template_type = 'appointment_reminder' AND channel = 'sms' AND business_id IS NULL);

INSERT INTO message_templates (business_id, template_name, template_type, channel, subject, body_template, language_code)
SELECT NULL, 'Default Appointment Confirmation SMS TR', 'appointment_confirmation', 'sms', NULL,
    'Merhaba {{first_name}}! {{business_name}} randevunuz {{date}} tarihinde saat {{time}} için onaylanmıştır. Görüşmek üzere!',
    'tr'
WHERE NOT EXISTS (SELECT 1 FROM message_templates WHERE template_type = 'appointment_confirmation' AND channel = 'sms' AND language_code = 'tr' AND business_id IS NULL);

INSERT INTO message_templates (business_id, template_name, template_type, channel, subject, body_template, language_code)
SELECT NULL, 'Default Appointment Reminder SMS TR', 'appointment_reminder', 'sms', NULL,
    'Hatırlatma: {{business_name}} randevunuz yarın ({{date}}) saat {{time}}. Onaylamak için ONAY yazın veya değiştirmek için bizi arayın.',
    'tr'
WHERE NOT EXISTS (SELECT 1 FROM message_templates WHERE template_type = 'appointment_reminder' AND channel = 'sms' AND language_code = 'tr' AND business_id IS NULL);


-- ============================================================================
-- SECTION 18: TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
        AND table_name IN (
            'customer_memory', 'customer_preferences', 'business_insights',
            'outbound_calls', 'message_templates'
        )
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
            CREATE TRIGGER update_%s_updated_at
                BEFORE UPDATE ON %s
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$;


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add a migration record (optional - if you have a migrations table)
-- INSERT INTO schema_migrations (version, name, applied_at)
-- VALUES ('20241218001', 'universal_ai_agent', NOW());

COMMENT ON SCHEMA public IS 'Universal AI Agent schema v1.0.0 - Full memory, outbound, and messaging support';





