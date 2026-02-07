-- Lord Tickets - Phase 1: Role-Based Access Control
-- Migration 006: Update status enum and RLS policies

-- ============================================
-- UPDATE STATUS CONSTRAINT (Add cancellation_requested)
-- ============================================
ALTER TABLE passengers DROP CONSTRAINT IF EXISTS passengers_status_check;
ALTER TABLE passengers ADD CONSTRAINT passengers_status_check 
    CHECK (status IN ('active', 'cancelled', 'waitlist', 'cancellation_requested'));

-- Add column for cancellation request details
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS cancellation_requested_by UUID REFERENCES users(id);
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS cancellation_request_reason TEXT;

-- ============================================
-- DROP EXISTING PERMISSIVE POLICIES
-- ============================================
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

-- ============================================
-- HELPER FUNCTION: Get current user's role
-- ============================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role 
    FROM users 
    WHERE auth_id = auth.uid();
    
    RETURN COALESCE(user_role, 'agent');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Get current user's ID
-- ============================================
CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID AS $$
DECLARE
    user_uuid UUID;
BEGIN
    SELECT id INTO user_uuid 
    FROM users 
    WHERE auth_id = auth.uid();
    
    RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PASSENGERS POLICIES
-- ============================================

-- SELECT: Admins/Managers see all, Agents see only their own
CREATE POLICY passengers_select ON passengers FOR SELECT TO authenticated
USING (
    get_user_role() IN ('admin', 'manager')
    OR agent_id = get_user_id()
    OR created_by = get_user_id()
);

-- INSERT: All authenticated users can insert
CREATE POLICY passengers_insert ON passengers FOR INSERT TO authenticated
WITH CHECK (true);

-- UPDATE: Admins/Managers can update all, Agents only their own
CREATE POLICY passengers_update ON passengers FOR UPDATE TO authenticated
USING (
    get_user_role() IN ('admin', 'manager')
    OR agent_id = get_user_id()
    OR created_by = get_user_id()
);

-- DELETE: Only Admins and Managers can hard delete
CREATE POLICY passengers_delete ON passengers FOR DELETE TO authenticated
USING (
    get_user_role() IN ('admin', 'manager')
);

-- ============================================
-- USERS POLICIES
-- ============================================

-- SELECT: All authenticated users can see users list (for dropdowns)
CREATE POLICY users_select ON users FOR SELECT TO authenticated
USING (true);

-- INSERT: Only Admins and Managers can add users
CREATE POLICY users_insert ON users FOR INSERT TO authenticated
WITH CHECK (
    get_user_role() IN ('admin', 'manager')
);

-- UPDATE: Only Admins and Managers can update users
CREATE POLICY users_update ON users FOR UPDATE TO authenticated
USING (
    get_user_role() IN ('admin', 'manager')
);

-- DELETE: Only Admins can delete users
CREATE POLICY users_delete ON users FOR DELETE TO authenticated
USING (
    get_user_role() = 'admin'
);

-- ============================================
-- CUSTOMERS POLICIES (All authenticated can CRUD)
-- ============================================
CREATE POLICY customers_select ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY customers_insert ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY customers_update ON customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY customers_delete ON customers FOR DELETE TO authenticated USING (true);

-- ============================================
-- ROOM_GROUPS POLICIES (All authenticated can CRUD)
-- ============================================
CREATE POLICY room_groups_select ON room_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY room_groups_insert ON room_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY room_groups_update ON room_groups FOR UPDATE TO authenticated USING (true);
CREATE POLICY room_groups_delete ON room_groups FOR DELETE TO authenticated USING (true);

-- ============================================
-- FLIGHTS POLICIES
-- ============================================
DROP POLICY IF EXISTS flights_select ON flights;
DROP POLICY IF EXISTS flights_insert ON flights;
DROP POLICY IF EXISTS flights_update ON flights;
DROP POLICY IF EXISTS flights_delete ON flights;

-- SELECT: All can view flights
CREATE POLICY flights_select ON flights FOR SELECT TO authenticated USING (true);

-- INSERT: Only Admins and Managers can add flights
CREATE POLICY flights_insert ON flights FOR INSERT TO authenticated
WITH CHECK (
    get_user_role() IN ('admin', 'manager')
);

-- UPDATE: Only Admins and Managers can update flights
CREATE POLICY flights_update ON flights FOR UPDATE TO authenticated
USING (
    get_user_role() IN ('admin', 'manager')
);

-- DELETE: Only Admins and Managers can delete flights
CREATE POLICY flights_delete ON flights FOR DELETE TO authenticated
USING (
    get_user_role() IN ('admin', 'manager')
);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION get_user_role() IS 'Returns the role of the currently authenticated user';
COMMENT ON FUNCTION get_user_id() IS 'Returns the users table ID of the currently authenticated user';
COMMENT ON COLUMN passengers.cancellation_requested_at IS 'Timestamp when agent requested cancellation';
COMMENT ON COLUMN passengers.cancellation_requested_by IS 'User ID of agent who requested cancellation';
COMMENT ON COLUMN passengers.cancellation_request_reason IS 'Reason provided by agent for cancellation request';
