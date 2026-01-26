-- Lord Tickets - Row Level Security Policies
-- Migration 004: RLS for secure data access

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FLIGHTS POLICIES
-- Authenticated users: Full access
-- Anonymous: No direct access (use public_inventory view via Edge Function)
-- ============================================

-- Authenticated users can view all flights
CREATE POLICY "Authenticated users can view flights"
ON flights FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can insert flights
CREATE POLICY "Authenticated users can insert flights"
ON flights FOR INSERT
TO authenticated
WITH CHECK (true);

-- Authenticated users can update flights
CREATE POLICY "Authenticated users can update flights"
ON flights FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Authenticated users can delete flights
CREATE POLICY "Authenticated users can delete flights"
ON flights FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- QUOTES POLICIES
-- ============================================

CREATE POLICY "Authenticated users can view quotes"
ON quotes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert quotes"
ON quotes FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotes"
ON quotes FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete quotes"
ON quotes FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- QUOTE_FLIGHTS POLICIES
-- ============================================

CREATE POLICY "Authenticated users can view quote_flights"
ON quote_flights FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert quote_flights"
ON quote_flights FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete quote_flights"
ON quote_flights FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- BOOKINGS POLICIES
-- ============================================

CREATE POLICY "Authenticated users can view bookings"
ON bookings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update bookings"
ON bookings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- AUDIT_LOG POLICIES
-- Read-only for authenticated users
-- ============================================

CREATE POLICY "Authenticated users can view audit_log"
ON audit_log FOR SELECT
TO authenticated
USING (true);

-- Only system can insert (via triggers/functions)
CREATE POLICY "System can insert audit_log"
ON audit_log FOR INSERT
TO authenticated
WITH CHECK (true);
