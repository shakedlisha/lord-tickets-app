-- Lord Tickets - Phase 2: Documents Table
-- Migration 007: Track generated documents

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Document identification
    doc_number TEXT NOT NULL UNIQUE,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('receipt', 'invoice', 'passenger_list', 'hotel_list')),
    
    -- Relations
    flight_id UUID REFERENCES flights(id) ON DELETE SET NULL,
    passenger_id UUID REFERENCES passengers(id) ON DELETE SET NULL,  -- For individual receipts
    
    -- Metadata
    title TEXT,
    currency TEXT DEFAULT 'EUR',
    total_amount DECIMAL(10,2),
    passenger_count INTEGER,
    
    -- Content snapshot (optional - for record keeping)
    content_snapshot JSONB,  -- Store passenger data at time of generation
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Notes
    notes TEXT
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_documents_flight ON documents(flight_id);
CREATE INDEX IF NOT EXISTS idx_documents_passenger ON documents(passenger_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_doc_number ON documents(doc_number);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view documents
CREATE POLICY documents_select ON documents FOR SELECT TO authenticated USING (true);

-- All authenticated users can create documents
CREATE POLICY documents_insert ON documents FOR INSERT TO authenticated WITH CHECK (true);

-- Only admins/managers can delete documents
CREATE POLICY documents_delete ON documents FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE auth_id = auth.uid() 
        AND role IN ('admin', 'manager')
    )
);

-- ============================================
-- HELPER FUNCTION: Generate next document number
-- ============================================
CREATE OR REPLACE FUNCTION generate_doc_number(p_type TEXT)
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    date_part TEXT;
    seq_num INTEGER;
    new_number TEXT;
BEGIN
    -- Set prefix based on type
    CASE p_type
        WHEN 'receipt' THEN prefix := 'RCP';
        WHEN 'invoice' THEN prefix := 'INV';
        WHEN 'passenger_list' THEN prefix := 'LST';
        WHEN 'hotel_list' THEN prefix := 'HTL';
        ELSE prefix := 'DOC';
    END CASE;
    
    -- Date part
    date_part := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get next sequence number for today
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(doc_number FROM LENGTH(prefix) + 10) AS INTEGER)
    ), 0) + 1
    INTO seq_num
    FROM documents
    WHERE doc_number LIKE prefix || '-' || date_part || '-%';
    
    -- Construct the number
    new_number := prefix || '-' || date_part || '-' || LPAD(seq_num::TEXT, 3, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE documents IS 'Track all generated documents (receipts, invoices, lists)';
COMMENT ON COLUMN documents.doc_number IS 'Unique document number (e.g., RCP-20240115-001)';
COMMENT ON COLUMN documents.content_snapshot IS 'JSON snapshot of data at generation time for record keeping';
COMMENT ON FUNCTION generate_doc_number(TEXT) IS 'Generate sequential document numbers by type and date';
