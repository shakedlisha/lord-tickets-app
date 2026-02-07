-- Lord Tickets - User Self-Registration Policy
-- Migration 011: Allow Google sign-in users to auto-create their own record
-- They are created as inactive agents, pending admin approval

-- ============================================
-- RLS policy: allow self-registration
-- ============================================

-- Users can insert their own record, but only as inactive agent
CREATE POLICY users_self_register ON users
    FOR INSERT TO authenticated
    WITH CHECK (
        auth_id = auth.uid() 
        AND role = 'agent' 
        AND is_active = false
    );
