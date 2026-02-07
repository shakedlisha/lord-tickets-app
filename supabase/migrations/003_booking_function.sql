-- Lord Tickets - Booking Functions
-- Migration 003: Atomic booking stored procedure

-- ============================================
-- BOOK_SEATS FUNCTION
-- Atomically decrements seats and creates booking
-- Returns: success boolean, message text
-- ============================================
CREATE OR REPLACE FUNCTION book_seats(
    p_flight_id UUID,
    p_seats_requested INTEGER,
    p_quote_id UUID DEFAULT NULL,
    p_client_name TEXT DEFAULT 'Guest',
    p_client_phone TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    booking_id UUID
) AS $$
DECLARE
    v_rows_affected INTEGER;
    v_booking_id UUID;
    v_available INTEGER;
BEGIN
    -- Check current availability first (for better error message)
    SELECT available_seats INTO v_available
    FROM flights
    WHERE id = p_flight_id;
    
    IF v_available IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Flight not found'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    IF v_available < p_seats_requested THEN
        RETURN QUERY SELECT FALSE, 
            format('Only %s seats available (requested %s)', v_available, p_seats_requested)::TEXT, 
            NULL::UUID;
        RETURN;
    END IF;
    
    -- Atomic update with conditional check
    UPDATE flights
    SET 
        available_seats = available_seats - p_seats_requested,
        updated_at = NOW()
    WHERE id = p_flight_id
      AND available_seats >= p_seats_requested;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
    IF v_rows_affected = 0 THEN
        -- Race condition: seats were taken between check and update
        RETURN QUERY SELECT FALSE, 'Seats no longer available (taken by another booking)'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- Create booking record
    INSERT INTO bookings (
        quote_id,
        flight_id,
        seats_booked,
        client_name,
        client_phone
    ) VALUES (
        p_quote_id,
        p_flight_id,
        p_seats_requested,
        p_client_name,
        p_client_phone
    )
    RETURNING id INTO v_booking_id;
    
    -- Update quote status if provided
    IF p_quote_id IS NOT NULL THEN
        UPDATE quotes
        SET status = 'accepted', updated_at = NOW()
        WHERE id = p_quote_id;
    END IF;
    
    RETURN QUERY SELECT TRUE, 'Booking successful'::TEXT, v_booking_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CANCEL_BOOKING FUNCTION
-- Restores seats when a booking is cancelled
-- ============================================
CREATE OR REPLACE FUNCTION cancel_booking(
    p_booking_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_flight_id UUID;
    v_seats INTEGER;
BEGIN
    -- Get booking details
    SELECT flight_id, seats_booked 
    INTO v_flight_id, v_seats
    FROM bookings
    WHERE id = p_booking_id;
    
    IF v_flight_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Booking not found'::TEXT;
        RETURN;
    END IF;
    
    -- Restore seats
    UPDATE flights
    SET 
        available_seats = available_seats + v_seats,
        updated_at = NOW()
    WHERE id = v_flight_id;
    
    -- Delete booking
    DELETE FROM bookings WHERE id = p_booking_id;
    
    RETURN QUERY SELECT TRUE, format('Booking cancelled, %s seats restored', v_seats)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CHECK_AVAILABILITY FUNCTION
-- Quick check without locking
-- ============================================
CREATE OR REPLACE FUNCTION check_availability(
    p_flight_id UUID,
    p_seats_needed INTEGER DEFAULT 1
)
RETURNS TABLE (
    is_available BOOLEAN,
    available_seats INTEGER,
    flight_info JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (f.available_seats >= p_seats_needed) AS is_available,
        f.available_seats,
        jsonb_build_object(
            'id', f.id,
            'airline', f.airline,
            'destination', f.destination_name,
            'departure_date', f.departure_date,
            'selling_price', f.selling_price
        ) AS flight_info
    FROM flights f
    WHERE f.id = p_flight_id;
END;
$$ LANGUAGE plpgsql;
