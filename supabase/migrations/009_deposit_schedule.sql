-- Lord Tickets - Dynamic Exposure Tracker
-- Migration 009: Deposit Schedule & Templates
-- Tracks payment milestones to airlines per flight

-- ============================================
-- DEPOSIT MILESTONES TABLE
-- ============================================
-- Stores the payment schedule for each flight.
-- Multiple milestones per flight (e.g., Signing Deposit, 2nd Installment, Final Ticketing).
-- Supports partial payments and per-seat or global amounts.

CREATE TABLE deposit_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,                     -- e.g. 'מקדמה', 'תשלום שני', 'הנפקה סופית'
    due_date DATE NOT NULL,
    amount_type TEXT NOT NULL DEFAULT 'global'
        CHECK (amount_type IN ('per_seat', 'global')),
    amount DECIMAL(12, 2) NOT NULL,         -- per-seat cost OR global sum (USD)
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
    paid_date DATE,
    paid_amount DECIMAL(12, 2) DEFAULT 0,   -- actual amount paid so far
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deposit_milestones_flight ON deposit_milestones(flight_id);
CREATE INDEX idx_deposit_milestones_due ON deposit_milestones(due_date);
CREATE INDEX idx_deposit_milestones_status ON deposit_milestones(status)
    WHERE status IN ('pending', 'partial');

-- Updated_at trigger (reuses existing function from 001_create_tables.sql)
CREATE TRIGGER deposit_milestones_updated_at
    BEFORE UPDATE ON deposit_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DEPOSIT TEMPLATES TABLE
-- ============================================
-- Reusable deposit schedules per airline.
-- Milestones stored as JSONB array:
--   [{name, days_before_departure, amount_type, amount_pct}]
-- amount_pct = percentage of (flights.cost_price * total_seats) for that milestone.

CREATE TABLE deposit_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    airline TEXT NOT NULL,
    name TEXT NOT NULL,                     -- e.g. 'Turkish Airlines Standard'
    milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deposit_templates_airline ON deposit_templates(airline);

-- Updated_at trigger
CREATE TRIGGER deposit_templates_updated_at
    BEFORE UPDATE ON deposit_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE deposit_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_templates ENABLE ROW LEVEL SECURITY;

-- DEPOSIT MILESTONES POLICIES
-- SELECT: All authenticated users can view (agents need this for calendar/inventory badges)
CREATE POLICY deposit_milestones_select ON deposit_milestones FOR SELECT TO authenticated
USING (true);

-- INSERT: Only Admins and Managers
CREATE POLICY deposit_milestones_insert ON deposit_milestones FOR INSERT TO authenticated
WITH CHECK (
    get_user_role() IN ('admin', 'manager')
);

-- UPDATE: Only Admins and Managers
CREATE POLICY deposit_milestones_update ON deposit_milestones FOR UPDATE TO authenticated
USING (
    get_user_role() IN ('admin', 'manager')
);

-- DELETE: Only Admins and Managers
CREATE POLICY deposit_milestones_delete ON deposit_milestones FOR DELETE TO authenticated
USING (
    get_user_role() IN ('admin', 'manager')
);

-- DEPOSIT TEMPLATES POLICIES
-- SELECT: All authenticated users can view (to see available templates)
CREATE POLICY deposit_templates_select ON deposit_templates FOR SELECT TO authenticated
USING (true);

-- INSERT: Only Admins and Managers
CREATE POLICY deposit_templates_insert ON deposit_templates FOR INSERT TO authenticated
WITH CHECK (
    get_user_role() IN ('admin', 'manager')
);

-- UPDATE: Only Admins and Managers
CREATE POLICY deposit_templates_update ON deposit_templates FOR UPDATE TO authenticated
USING (
    get_user_role() IN ('admin', 'manager')
);

-- DELETE: Only Admins and Managers
CREATE POLICY deposit_templates_delete ON deposit_templates FOR DELETE TO authenticated
USING (
    get_user_role() IN ('admin', 'manager')
);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE deposit_milestones IS 'Payment schedule milestones for airline deposits per flight';
COMMENT ON TABLE deposit_templates IS 'Reusable deposit schedule templates per airline';
COMMENT ON COLUMN deposit_milestones.amount_type IS 'per_seat: multiplied by total_seats; global: flat sum';
COMMENT ON COLUMN deposit_milestones.amount IS 'Amount in USD - per seat or global depending on amount_type';
COMMENT ON COLUMN deposit_milestones.paid_amount IS 'Actual amount paid so far (supports partial payments)';
COMMENT ON COLUMN deposit_templates.milestones IS 'JSONB array: [{name, days_before_departure, amount_type, amount_pct}]';
COMMENT ON COLUMN deposit_templates.created_by IS 'User who created this template';
