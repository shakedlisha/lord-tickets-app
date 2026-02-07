-- Lord Tickets - Migration 010: Public Seat Counts Function
-- Allows all users (including guests/anon) to see remaining seat counts
-- without accessing the passengers table directly.

-- Function returns flight_id and booked passenger count
-- Accessible via RPC by anyone (no RLS restriction)
CREATE OR REPLACE FUNCTION get_flight_seat_counts()
RETURNS TABLE(flight_id UUID, booked_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT p.flight_id, COUNT(*)::BIGINT AS booked_count
    FROM passengers p
    WHERE p.status = 'active' OR p.status IS NULL
    GROUP BY p.flight_id;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_flight_seat_counts() TO anon;
GRANT EXECUTE ON FUNCTION get_flight_seat_counts() TO authenticated;
