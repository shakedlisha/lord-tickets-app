-- Lord Tickets - Public Inventory View
-- Migration 002: Create VIEW that excludes sensitive columns

-- ============================================
-- PUBLIC INVENTORY VIEW
-- Exposes only public data, excludes:
--   - cost_price
--   - supplier_info
-- ============================================
CREATE OR REPLACE VIEW public_inventory AS
SELECT 
    id,
    departure_date,
    return_date,
    outbound_details,
    inbound_details,
    airline,
    destination_code,
    destination_name,
    available_seats,
    selling_price,
    created_at,
    updated_at
FROM flights
WHERE available_seats > 0
ORDER BY departure_date ASC;

-- Comment for documentation
COMMENT ON VIEW public_inventory IS 'Public-facing inventory view. Excludes cost_price and supplier_info for security.';
