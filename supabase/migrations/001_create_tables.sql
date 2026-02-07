-- Lord Tickets - Database Schema
-- Migration 001: Create core tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- FLIGHTS TABLE (Master Inventory)
-- ============================================
CREATE TABLE flights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    departure_date DATE NOT NULL,
    return_date DATE,
    outbound_details TEXT NOT NULL,
    inbound_details TEXT,
    airline TEXT NOT NULL,
    destination_code TEXT NOT NULL,
    destination_name TEXT NOT NULL,
    total_seats INTEGER NOT NULL DEFAULT 0,
    available_seats INTEGER NOT NULL DEFAULT 0,
    cost_price DECIMAL(10, 2),          -- PRIVATE: Hidden from public API
    selling_price DECIMAL(10, 2) NOT NULL,
    supplier_info TEXT,                  -- PRIVATE: Hidden from public API
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX idx_flights_departure ON flights(departure_date);
CREATE INDEX idx_flights_airline ON flights(airline);
CREATE INDEX idx_flights_destination ON flights(destination_code);
CREATE INDEX idx_flights_available ON flights(available_seats) WHERE available_seats > 0;

-- ============================================
-- QUOTES TABLE
-- ============================================
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name TEXT NOT NULL,
    client_phone TEXT,
    client_email TEXT,
    total_cost DECIMAL(10, 2) DEFAULT 0,
    total_price DECIMAL(10, 2) DEFAULT 0,
    markup_percent DECIMAL(5, 2) DEFAULT 15,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    expires_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_client ON quotes(client_name);

-- ============================================
-- QUOTE_FLIGHTS TABLE (Junction table)
-- ============================================
CREATE TABLE quote_flights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE RESTRICT,
    seats_requested INTEGER NOT NULL DEFAULT 1,
    price_at_quote DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_flights_quote ON quote_flights(quote_id);
CREATE INDEX idx_quote_flights_flight ON quote_flights(flight_id);

-- ============================================
-- BOOKINGS TABLE (Confirmed sales)
-- ============================================
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE RESTRICT,
    seats_booked INTEGER NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    total_paid DECIMAL(10, 2),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
    booked_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_flight ON bookings(flight_id);
CREATE INDEX idx_bookings_quote ON bookings(quote_id);

-- ============================================
-- AUDIT_LOG TABLE (Track changes)
-- ============================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    user_email TEXT,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_record ON audit_log(record_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- ============================================
-- UPDATE TIMESTAMP TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER flights_updated_at
    BEFORE UPDATE ON flights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
