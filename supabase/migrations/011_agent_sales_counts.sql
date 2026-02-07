-- Lord Tickets - Migration 011: Agent Sales Counts Function
-- Returns per-flight sales count for a specific agent.
-- Used in inventory.html to show agents how many seats they sold per flight.

CREATE OR REPLACE FUNCTION get_agent_sales_counts(p_agent_id UUID)
RETURNS TABLE(flight_id UUID, sales_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT p.flight_id, COUNT(*)::BIGINT AS sales_count
    FROM passengers p
    WHERE (p.status = 'active' OR p.status IS NULL)
      AND p.agent_id = p_agent_id
    GROUP BY p.flight_id;
$$;

GRANT EXECUTE ON FUNCTION get_agent_sales_counts(UUID) TO authenticated;
