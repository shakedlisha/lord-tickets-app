-- Migration: Flight Packages System
-- Allows creating price packages per flight (e.g., "Flight Only", "Flight + Hotel", "VIP Package")

-- Create flight_packages table
CREATE TABLE IF NOT EXISTS flight_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                              -- e.g., "אפשרות א'", "טיסה בלבד", "חבילת VIP"
    description TEXT,                                -- Optional description
    price DECIMAL(10,2) NOT NULL DEFAULT 0,          -- Package price
    currency TEXT NOT NULL DEFAULT 'ILS',            -- ILS, EUR, USD
    includes_flight_outbound BOOLEAN DEFAULT true,   -- Includes outbound flight
    includes_flight_return BOOLEAN DEFAULT true,     -- Includes return flight
    includes_hotel BOOLEAN DEFAULT false,            -- Includes hotel
    hotel_nights INTEGER,                            -- Number of hotel nights if included
    includes_event_ticket BOOLEAN DEFAULT false,     -- Includes event/match ticket
    event_ticket_category TEXT,                      -- e.g., "VIP", "Standard", "Premium"
    includes_transport BOOLEAN DEFAULT false,        -- Includes ground transport
    includes_insurance BOOLEAN DEFAULT false,        -- Includes travel insurance
    max_quantity INTEGER,                            -- Optional max passengers for this package
    sort_order INTEGER DEFAULT 0,                    -- Display order
    is_active BOOLEAN DEFAULT true,                  -- Can be disabled without deletion
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add package reference to passengers table
ALTER TABLE passengers 
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES flight_packages(id) ON DELETE SET NULL;

-- Add cost_price and selling_price if not exists (for price tracking)
ALTER TABLE passengers 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2);

ALTER TABLE passengers 
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_flight_packages_flight_id ON flight_packages(flight_id);
CREATE INDEX IF NOT EXISTS idx_passengers_package_id ON passengers(package_id);

-- RLS Policies for flight_packages
ALTER TABLE flight_packages ENABLE ROW LEVEL SECURITY;

-- Everyone can view packages (needed for booking)
CREATE POLICY flight_packages_select ON flight_packages
    FOR SELECT TO authenticated
    USING (true);

-- Only admin/manager can create packages
CREATE POLICY flight_packages_insert ON flight_packages
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Only admin/manager can update packages
CREATE POLICY flight_packages_update ON flight_packages
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Only admin can delete packages
CREATE POLICY flight_packages_delete ON flight_packages
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Helper function to get package price
CREATE OR REPLACE FUNCTION get_package_price(p_package_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    pkg_price DECIMAL;
BEGIN
    SELECT price INTO pkg_price 
    FROM flight_packages 
    WHERE id = p_package_id;
    RETURN COALESCE(pkg_price, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update passengers.selling_price when package is assigned
CREATE OR REPLACE FUNCTION update_passenger_price_from_package()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if package_id changed and selling_price is not manually set
    IF NEW.package_id IS NOT NULL AND 
       (OLD.package_id IS NULL OR OLD.package_id != NEW.package_id) AND
       (NEW.selling_price IS NULL OR NEW.selling_price = 0) THEN
        NEW.selling_price := get_package_price(NEW.package_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_update_passenger_price ON passengers;
CREATE TRIGGER trg_update_passenger_price
    BEFORE INSERT OR UPDATE ON passengers
    FOR EACH ROW
    EXECUTE FUNCTION update_passenger_price_from_package();

-- Add comments for documentation
COMMENT ON TABLE flight_packages IS 'Price packages available for each flight (e.g., Flight Only, Flight+Hotel, VIP)';
COMMENT ON COLUMN flight_packages.currency IS 'Price currency: ILS, EUR, USD';
COMMENT ON COLUMN flight_packages.event_ticket_category IS 'Category for event/match tickets: VIP, Standard, Premium, etc.';
