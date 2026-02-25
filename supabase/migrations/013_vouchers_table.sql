-- Travel Vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reservation_number TEXT,
    voucher_number TEXT UNIQUE NOT NULL,
    agent_name TEXT,
    guest_names TEXT,
    trip_dates_from DATE,
    trip_dates_to DATE,
    data_json JSONB NOT NULL DEFAULT '{}',
    voucher_html TEXT,
    language TEXT DEFAULT 'he',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_reservation ON vouchers(reservation_number);
CREATE INDEX IF NOT EXISTS idx_vouchers_user_id ON vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_created_at ON vouchers(created_at DESC);

ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vouchers"
    ON vouchers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create vouchers"
    ON vouchers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vouchers"
    ON vouchers FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vouchers"
    ON vouchers FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all vouchers"
    ON vouchers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'manager')
        )
    );

CREATE OR REPLACE FUNCTION update_voucher_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vouchers_updated_at
    BEFORE UPDATE ON vouchers
    FOR EACH ROW
    EXECUTE FUNCTION update_voucher_timestamp();
