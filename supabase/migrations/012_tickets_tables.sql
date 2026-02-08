-- Lord Tickets - Ticket Reseller Module
-- Migration 012: Create ticket reseller tables (events, suppliers, tickets, ticket_sales, ticket_documents)
-- Shares auth/users with flights app, separate data tables

-- ============================================
-- 1. EVENTS TABLE (Event master data)
-- ============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    event_type TEXT CHECK (event_type IN ('sports', 'concert', 'theater', 'festival', 'other')),
    venue TEXT,
    city TEXT,
    country TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    event_end_date TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_name ON events(name);
CREATE INDEX idx_events_upcoming ON events(event_date) WHERE event_date >= CURRENT_DATE;

-- Updated_at trigger
CREATE TRIGGER events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can view
CREATE POLICY events_select ON events FOR SELECT TO authenticated USING (true);

-- INSERT: Only Admins and Managers
CREATE POLICY events_insert ON events FOR INSERT TO authenticated
WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- UPDATE: Only Admins and Managers
CREATE POLICY events_update ON events FOR UPDATE TO authenticated
USING (get_user_role() IN ('admin', 'manager'));

-- DELETE: Only Admins and Managers
CREATE POLICY events_delete ON events FOR DELETE TO authenticated
USING (get_user_role() IN ('admin', 'manager'));

COMMENT ON TABLE events IS 'Event master data for ticket reseller module (sports, concerts, shows, etc.)';

-- ============================================
-- 2. SUPPLIERS TABLE (Supplier master data)
-- ============================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    contact_info TEXT,
    website TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_suppliers_name ON suppliers(name);

-- RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_select ON suppliers FOR SELECT TO authenticated USING (true);

CREATE POLICY suppliers_insert ON suppliers FOR INSERT TO authenticated
WITH CHECK (get_user_role() IN ('admin', 'manager'));

CREATE POLICY suppliers_update ON suppliers FOR UPDATE TO authenticated
USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY suppliers_delete ON suppliers FOR DELETE TO authenticated
USING (get_user_role() IN ('admin', 'manager'));

COMMENT ON TABLE suppliers IS 'Ticket supplier/source master data (Viagogo, StubHub, etc.)';

-- ============================================
-- 3. TICKETS TABLE (Inventory - purchased from suppliers)
-- ============================================
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event reference
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Supplier info
    supplier TEXT NOT NULL,
    supplier_ref TEXT,
    
    -- Seat details
    quantity INTEGER NOT NULL DEFAULT 1,
    section TEXT,
    block TEXT,
    "row" TEXT,
    seat_from TEXT,
    seat_to TEXT,
    ticket_category TEXT,
    
    -- Pricing (per ticket)
    currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'ILS', 'GBP')),
    cost_price DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2),
    
    -- Generated profit columns (auto-calculated, never manually overridden)
    total_cost DECIMAL(12,2) GENERATED ALWAYS AS (cost_price * quantity) STORED,
    profit_per_ticket DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE WHEN selling_price IS NOT NULL THEN selling_price - cost_price ELSE NULL END
    ) STORED,
    total_profit DECIMAL(12,2) GENERATED ALWAYS AS (
        CASE WHEN selling_price IS NOT NULL THEN (selling_price - cost_price) * quantity ELSE NULL END
    ) STORED,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'reserved', 'sold', 'cancelled', 'refunded')),
    purchase_date DATE DEFAULT CURRENT_DATE,
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_supplier ON tickets(supplier);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_purchase_date ON tickets(purchase_date);
CREATE INDEX idx_tickets_in_stock ON tickets(event_id, status) WHERE status = 'in_stock';
CREATE INDEX idx_tickets_category ON tickets(ticket_category) WHERE ticket_category IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can view (cost hidden from agents via frontend)
CREATE POLICY tickets_select ON tickets FOR SELECT TO authenticated USING (true);

-- INSERT: Only Admins and Managers
CREATE POLICY tickets_insert ON tickets FOR INSERT TO authenticated
WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- UPDATE: Only Admins and Managers
CREATE POLICY tickets_update ON tickets FOR UPDATE TO authenticated
USING (get_user_role() IN ('admin', 'manager'));

-- DELETE: Only Admins and Managers
CREATE POLICY tickets_delete ON tickets FOR DELETE TO authenticated
USING (get_user_role() IN ('admin', 'manager'));

COMMENT ON TABLE tickets IS 'Ticket inventory - lots purchased from suppliers for resale';
COMMENT ON COLUMN tickets.cost_price IS 'Buy price per ticket (PRIVATE - hidden from agents via frontend)';
COMMENT ON COLUMN tickets.selling_price IS 'Target sell price per ticket';
COMMENT ON COLUMN tickets.total_cost IS 'Auto-calculated: cost_price * quantity';
COMMENT ON COLUMN tickets.profit_per_ticket IS 'Auto-calculated: selling_price - cost_price';
COMMENT ON COLUMN tickets.total_profit IS 'Auto-calculated: (selling_price - cost_price) * quantity';

-- ============================================
-- 4. TICKET_SALES TABLE (Sales to customers)
-- ============================================
CREATE TABLE ticket_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Sale details
    quantity INTEGER NOT NULL DEFAULT 1,
    sale_price DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'ILS', 'GBP')),
    
    -- Status tracking
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
    delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'issue')),
    delivery_method TEXT,
    
    -- Dates
    sale_date DATE DEFAULT CURRENT_DATE,
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ticket_sales_ticket ON ticket_sales(ticket_id);
CREATE INDEX idx_ticket_sales_customer ON ticket_sales(customer_id);
CREATE INDEX idx_ticket_sales_agent ON ticket_sales(agent_id);
CREATE INDEX idx_ticket_sales_payment ON ticket_sales(payment_status);
CREATE INDEX idx_ticket_sales_delivery ON ticket_sales(delivery_status);
CREATE INDEX idx_ticket_sales_date ON ticket_sales(sale_date);

-- Updated_at trigger
CREATE TRIGGER ticket_sales_updated_at
    BEFORE UPDATE ON ticket_sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE ticket_sales ENABLE ROW LEVEL SECURITY;

-- SELECT: Admins/Managers see all, Agents see only their own
CREATE POLICY ticket_sales_select ON ticket_sales FOR SELECT TO authenticated
USING (
    get_user_role() IN ('admin', 'manager')
    OR agent_id = get_user_id()
    OR created_by = get_user_id()
);

-- INSERT: All authenticated users can create sales
CREATE POLICY ticket_sales_insert ON ticket_sales FOR INSERT TO authenticated
WITH CHECK (true);

-- UPDATE: Admins/Managers can update all, Agents only their own
CREATE POLICY ticket_sales_update ON ticket_sales FOR UPDATE TO authenticated
USING (
    get_user_role() IN ('admin', 'manager')
    OR agent_id = get_user_id()
    OR created_by = get_user_id()
);

-- DELETE: Only Admins and Managers
CREATE POLICY ticket_sales_delete ON ticket_sales FOR DELETE TO authenticated
USING (get_user_role() IN ('admin', 'manager'));

COMMENT ON TABLE ticket_sales IS 'Ticket sales to customers - tracks payment and delivery status';

-- ============================================
-- 5. TICKET_DOCUMENTS TABLE (Document tracking)
-- ============================================
CREATE TABLE ticket_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Document identification
    doc_number TEXT NOT NULL UNIQUE,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('sale_receipt', 'delivery_confirmation', 'ticket_list', 'event_summary')),
    
    -- Relations
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
    ticket_sale_id UUID REFERENCES ticket_sales(id) ON DELETE SET NULL,
    
    -- Metadata
    title TEXT,
    currency TEXT DEFAULT 'EUR',
    total_amount DECIMAL(10,2),
    ticket_count INTEGER,
    
    -- Content snapshot
    content_snapshot JSONB,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    notes TEXT
);

-- Indexes
CREATE INDEX idx_ticket_documents_event ON ticket_documents(event_id);
CREATE INDEX idx_ticket_documents_ticket ON ticket_documents(ticket_id);
CREATE INDEX idx_ticket_documents_sale ON ticket_documents(ticket_sale_id);
CREATE INDEX idx_ticket_documents_type ON ticket_documents(doc_type);
CREATE INDEX idx_ticket_documents_created ON ticket_documents(created_at DESC);
CREATE INDEX idx_ticket_documents_doc_number ON ticket_documents(doc_number);

-- RLS
ALTER TABLE ticket_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY ticket_documents_select ON ticket_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY ticket_documents_insert ON ticket_documents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY ticket_documents_delete ON ticket_documents FOR DELETE TO authenticated
USING (get_user_role() IN ('admin', 'manager'));

COMMENT ON TABLE ticket_documents IS 'Track generated documents for ticket operations';

-- ============================================
-- HELPER FUNCTION: Generate ticket document number
-- ============================================
CREATE OR REPLACE FUNCTION generate_ticket_doc_number(p_type TEXT)
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    date_part TEXT;
    seq_num INTEGER;
    new_number TEXT;
BEGIN
    CASE p_type
        WHEN 'sale_receipt' THEN prefix := 'TRC';
        WHEN 'delivery_confirmation' THEN prefix := 'TDC';
        WHEN 'ticket_list' THEN prefix := 'TLS';
        WHEN 'event_summary' THEN prefix := 'TES';
        ELSE prefix := 'TDO';
    END CASE;
    
    date_part := TO_CHAR(NOW(), 'YYYYMMDD');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(doc_number FROM LENGTH(prefix) + 10) AS INTEGER)
    ), 0) + 1
    INTO seq_num
    FROM ticket_documents
    WHERE doc_number LIKE prefix || '-' || date_part || '-%';
    
    new_number := prefix || '-' || date_part || '-' || LPAD(seq_num::TEXT, 3, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_ticket_doc_number(TEXT) IS 'Generate sequential document numbers for ticket documents by type and date';

-- ============================================
-- HELPER FUNCTION: Get ticket sales count for a ticket lot
-- ============================================
CREATE OR REPLACE FUNCTION get_ticket_sold_count(p_ticket_id UUID)
RETURNS INTEGER AS $$
DECLARE
    sold_count INTEGER;
BEGIN
    SELECT COALESCE(SUM(quantity), 0)
    INTO sold_count
    FROM ticket_sales
    WHERE ticket_id = p_ticket_id
    AND payment_status != 'refunded';
    
    RETURN sold_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_ticket_sold_count(UUID) IS 'Returns total sold quantity for a ticket lot (excluding refunded)';

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN tickets."row" IS 'Seat row (quoted because row is a reserved word)';
COMMENT ON COLUMN tickets.supplier_ref IS 'Supplier reference number (e.g., VIAGOGO-634584890)';
COMMENT ON COLUMN ticket_sales.delivery_method IS 'How tickets are delivered (email, physical, transfer)';
