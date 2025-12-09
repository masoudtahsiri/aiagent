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
    updated_at TIMESTAMP DEFAULT NOW()
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
    voice_style VARCHAR(50), -- 'professional_female', 'friendly_male', etc.
    voice_speed DECIMAL(3,2) DEFAULT 1.0, -- 0.5 to 2.0
    system_prompt TEXT NOT NULL,
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

-- View: Available slots per staff
CREATE VIEW available_slots_view AS
SELECT 
    ts.id,
    ts.staff_id,
    s.name AS staff_name,
    s.business_id,
    ts.date,
    ts.time,
    ts.duration_minutes,
    ts.is_booked
FROM time_slots ts
JOIN staff s ON ts.staff_id = s.id
WHERE ts.is_booked = FALSE 
AND ts.is_blocked = FALSE
AND ts.date >= CURRENT_DATE;

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





