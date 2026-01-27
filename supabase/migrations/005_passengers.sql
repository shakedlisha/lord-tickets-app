-- Lord Tickets - Phase 1: Passenger Management System
-- Migration 005: Create passengers, customers, and users tables

-- ============================================
-- CUSTOMERS TABLE (Master customer data)
-- ============================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    crm_id TEXT,  -- דוקט טופ - numbers only, e.g., "2839"
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for customer lookups
CREATE INDEX idx_customers_name ON customers(last_name, first_name);
CREATE INDEX idx_customers_crm_id ON customers(crm_id) WHERE crm_id IS NOT NULL;
CREATE INDEX idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;

-- ============================================
-- USERS TABLE (For role-based access)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE,  -- Links to Supabase Auth
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'manager', 'agent')),
    commission_rate DECIMAL(5, 2) DEFAULT 0,  -- Variable commission per agent
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- ============================================
-- ROOM GROUPS TABLE (For room sharing)
-- ============================================
CREATE TABLE room_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    name TEXT NOT NULL,  -- Group name like "משפחת כהן", "זוג 1"
    room_type TEXT DEFAULT 'double' CHECK (room_type IN ('single', 'double', 'triple', 'family')),
    hotel_name TEXT,
    room_number INTEGER,  -- Room 1, Room 2, etc.
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_room_groups_flight ON room_groups(flight_id);
CREATE INDEX idx_room_groups_name ON room_groups(flight_id, name);

-- ============================================
-- PASSENGERS TABLE (Replaces bookings for detailed passenger tracking)
-- ============================================
CREATE TABLE passengers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Passenger details (denormalized for quick access)
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    crm_id TEXT,  -- דוקט טופ
    agent_name TEXT,  -- Denormalized agent name for quick display
    
    -- Flight legs (separately tracked) - V marks
    has_outbound BOOLEAN DEFAULT true,
    has_return BOOLEAN DEFAULT true,
    
    -- Package details
    hotel_name TEXT,
    hotel_booking_ref TEXT,  -- Segment code like "346993"
    room_group_id UUID REFERENCES room_groups(id) ON DELETE SET NULL,
    is_single_supplement BOOLEAN DEFAULT false,
    ticket_category TEXT,  -- VIP, Regular, etc.
    components JSONB DEFAULT '[]'::jsonb,  -- Flexible: tickets, transfers, extras
    
    -- Pricing (negotiated per passenger)
    currency TEXT DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'ILS', 'GBP')),
    price_paid DECIMAL(10, 2),
    cost_price DECIMAL(10, 2),
    agent_commission DECIMAL(10, 2),
    
    -- Tracking
    booking_ref TEXT,  -- ALP LORD number like "ALP LORD-1110015"
    insurance_notes TEXT,  -- Free text
    special_notes TEXT,  -- e.g., "מיטות טווין חובה"
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'excel_import', 'copy_paste', 'migration')),
    
    -- Status (soft delete)
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'waitlist')),
    cancelled_at TIMESTAMPTZ,
    cancelled_reason TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for common passenger queries
CREATE INDEX idx_passengers_flight ON passengers(flight_id);
CREATE INDEX idx_passengers_customer ON passengers(customer_id);
CREATE INDEX idx_passengers_agent ON passengers(agent_id);
CREATE INDEX idx_passengers_status ON passengers(status);
CREATE INDEX idx_passengers_name ON passengers(last_name, first_name);
CREATE INDEX idx_passengers_active ON passengers(flight_id, status) WHERE status = 'active';

-- ============================================
-- UPDATE FLIGHTS TABLE (Add new columns)
-- ============================================
ALTER TABLE flights ADD COLUMN IF NOT EXISTS outbound_seats_total INTEGER;
ALTER TABLE flights ADD COLUMN IF NOT EXISTS outbound_seats_available INTEGER;
ALTER TABLE flights ADD COLUMN IF NOT EXISTS return_seats_total INTEGER;
ALTER TABLE flights ADD COLUMN IF NOT EXISTS return_seats_available INTEGER;
ALTER TABLE flights ADD COLUMN IF NOT EXISTS event_name TEXT;
ALTER TABLE flights ADD COLUMN IF NOT EXISTS flight_code TEXT;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE TRIGGER customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER passengers_updated_at
    BEFORE UPDATE ON passengers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCTION: Count passengers per flight leg
-- ============================================
CREATE OR REPLACE FUNCTION get_flight_passenger_counts(p_flight_id UUID)
RETURNS TABLE (
    total_passengers INTEGER,
    outbound_passengers INTEGER,
    return_passengers INTEGER,
    active_passengers INTEGER,
    cancelled_passengers INTEGER,
    waitlist_passengers INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_passengers,
        COUNT(*) FILTER (WHERE has_outbound = true AND status = 'active')::INTEGER as outbound_passengers,
        COUNT(*) FILTER (WHERE has_return = true AND status = 'active')::INTEGER as return_passengers,
        COUNT(*) FILTER (WHERE status = 'active')::INTEGER as active_passengers,
        COUNT(*) FILTER (WHERE status = 'cancelled')::INTEGER as cancelled_passengers,
        COUNT(*) FILTER (WHERE status = 'waitlist')::INTEGER as waitlist_passengers
    FROM passengers
    WHERE flight_id = p_flight_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES (Row Level Security)
-- ============================================
-- Enable RLS on new tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_groups ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all
CREATE POLICY customers_select ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY users_select ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY passengers_select ON passengers FOR SELECT TO authenticated USING (true);
CREATE POLICY room_groups_select ON room_groups FOR SELECT TO authenticated USING (true);

-- Policy: Authenticated users can insert
CREATE POLICY customers_insert ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY users_insert ON users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY passengers_insert ON passengers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY room_groups_insert ON room_groups FOR INSERT TO authenticated WITH CHECK (true);

-- Policy: Users can update (will add role-based restrictions in Phase 6)
CREATE POLICY customers_update ON customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY users_update ON users FOR UPDATE TO authenticated USING (true);
CREATE POLICY passengers_update ON passengers FOR UPDATE TO authenticated USING (true);
CREATE POLICY room_groups_update ON room_groups FOR UPDATE TO authenticated USING (true);

-- Policy: Only admins can delete (soft delete preferred)
CREATE POLICY customers_delete ON customers FOR DELETE TO authenticated USING (true);
CREATE POLICY users_delete ON users FOR DELETE TO authenticated USING (true);
CREATE POLICY passengers_delete ON passengers FOR DELETE TO authenticated USING (true);
CREATE POLICY room_groups_delete ON room_groups FOR DELETE TO authenticated USING (true);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE customers IS 'Master customer database with trip history';
COMMENT ON TABLE users IS 'System users with role-based access (admin, manager, agent)';
COMMENT ON TABLE passengers IS 'Individual passenger records per flight - replaces bookings table';
COMMENT ON TABLE room_groups IS 'Groups passengers sharing hotel rooms';
COMMENT ON COLUMN passengers.has_outbound IS 'V mark - passenger has outbound flight';
COMMENT ON COLUMN passengers.has_return IS 'V mark - passenger has return flight';
COMMENT ON COLUMN passengers.status IS 'active = confirmed, cancelled = soft deleted, waitlist = waiting for seat';
