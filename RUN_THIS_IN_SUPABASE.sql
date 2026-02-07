-- =============================================
-- LORD TICKETS - PHASE 1 & 2 MIGRATION
-- COPY ALL THIS TEXT AND PASTE IN SUPABASE SQL EDITOR
-- =============================================

ALTER TABLE passengers DROP CONSTRAINT IF EXISTS passengers_status_check;
ALTER TABLE passengers ADD CONSTRAINT passengers_status_check CHECK (status IN ('active', 'cancelled', 'waitlist', 'cancellation_requested'));
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS cancellation_requested_by UUID REFERENCES users(id);
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS cancellation_request_reason TEXT;

DROP POLICY IF EXISTS passengers_select ON passengers;
DROP POLICY IF EXISTS passengers_insert ON passengers;
DROP POLICY IF EXISTS passengers_update ON passengers;
DROP POLICY IF EXISTS passengers_delete ON passengers;
DROP POLICY IF EXISTS customers_select ON customers;
DROP POLICY IF EXISTS customers_insert ON customers;
DROP POLICY IF EXISTS customers_update ON customers;
DROP POLICY IF EXISTS customers_delete ON customers;
DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_insert ON users;
DROP POLICY IF EXISTS users_update ON users;
DROP POLICY IF EXISTS users_delete ON users;
DROP POLICY IF EXISTS room_groups_select ON room_groups;
DROP POLICY IF EXISTS room_groups_insert ON room_groups;
DROP POLICY IF EXISTS room_groups_update ON room_groups;
DROP POLICY IF EXISTS room_groups_delete ON room_groups;
DROP POLICY IF EXISTS flights_select ON flights;
DROP POLICY IF EXISTS flights_insert ON flights;
DROP POLICY IF EXISTS flights_update ON flights;
DROP POLICY IF EXISTS flights_delete ON flights;

CREATE OR REPLACE FUNCTION get_user_role() RETURNS TEXT AS $$
DECLARE user_role TEXT;
BEGIN SELECT role INTO user_role FROM users WHERE auth_id = auth.uid(); RETURN COALESCE(user_role, 'agent'); END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_id() RETURNS UUID AS $$
DECLARE user_uuid UUID;
BEGIN SELECT id INTO user_uuid FROM users WHERE auth_id = auth.uid(); RETURN user_uuid; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY passengers_select ON passengers FOR SELECT TO authenticated USING (get_user_role() IN ('admin', 'manager') OR agent_id = get_user_id() OR created_by = get_user_id());
CREATE POLICY passengers_insert ON passengers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY passengers_update ON passengers FOR UPDATE TO authenticated USING (get_user_role() IN ('admin', 'manager') OR agent_id = get_user_id() OR created_by = get_user_id());
CREATE POLICY passengers_delete ON passengers FOR DELETE TO authenticated USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY users_select ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY users_insert ON users FOR INSERT TO authenticated WITH CHECK (get_user_role() IN ('admin', 'manager'));
CREATE POLICY users_update ON users FOR UPDATE TO authenticated USING (get_user_role() IN ('admin', 'manager'));
CREATE POLICY users_delete ON users FOR DELETE TO authenticated USING (get_user_role() = 'admin');

CREATE POLICY customers_select ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY customers_insert ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY customers_update ON customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY customers_delete ON customers FOR DELETE TO authenticated USING (true);

CREATE POLICY room_groups_select ON room_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY room_groups_insert ON room_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY room_groups_update ON room_groups FOR UPDATE TO authenticated USING (true);
CREATE POLICY room_groups_delete ON room_groups FOR DELETE TO authenticated USING (true);

CREATE POLICY flights_select ON flights FOR SELECT TO authenticated USING (true);
CREATE POLICY flights_insert ON flights FOR INSERT TO authenticated WITH CHECK (get_user_role() IN ('admin', 'manager'));
CREATE POLICY flights_update ON flights FOR UPDATE TO authenticated USING (get_user_role() IN ('admin', 'manager'));
CREATE POLICY flights_delete ON flights FOR DELETE TO authenticated USING (get_user_role() IN ('admin', 'manager'));

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_number TEXT NOT NULL UNIQUE,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('receipt', 'invoice', 'passenger_list', 'hotel_list')),
    flight_id UUID REFERENCES flights(id) ON DELETE SET NULL,
    passenger_id UUID REFERENCES passengers(id) ON DELETE SET NULL,
    title TEXT, currency TEXT DEFAULT 'EUR', total_amount DECIMAL(10,2), passenger_count INTEGER,
    content_snapshot JSONB, created_at TIMESTAMPTZ DEFAULT NOW(), created_by UUID REFERENCES users(id), notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_documents_flight ON documents(flight_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY documents_select ON documents FOR SELECT TO authenticated USING (true);
CREATE POLICY documents_insert ON documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY documents_delete ON documents FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('admin', 'manager')));

-- =============================================
-- FIX: Sync total_seats with available_seats
-- This fixes the bug where flight stats show wrong capacity (e.g., "16/1")
-- =============================================
UPDATE flights 
SET total_seats = available_seats 
WHERE total_seats < available_seats OR total_seats = 0 OR total_seats IS NULL;

-- =============================================
-- FIX: Normalize airline names (Hebrew -> English)
-- This removes duplicate airlines in the filter dropdown
-- =============================================
UPDATE flights SET airline = 'El Al' WHERE airline IN ('אל על', 'אלעל');
UPDATE flights SET airline = 'Arkia' WHERE airline = 'ארקיע';
UPDATE flights SET airline = 'Israir' WHERE airline = 'ישראייר';
UPDATE flights SET airline = 'Aegean' WHERE airline = 'איגיאן';
UPDATE flights SET airline = 'Wizz Air' WHERE airline IN ('ויז אייר', 'ויז');
UPDATE flights SET airline = 'LOT' WHERE airline = 'לוט';
