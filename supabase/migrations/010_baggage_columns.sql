-- Lord Tickets - Baggage & Currency Columns
-- Migration 010: Add currency, trolley_baggage, suitcase_baggage to flights table

-- ============================================
-- Add missing columns that the UI already sends
-- ============================================

ALTER TABLE flights ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE flights ADD COLUMN IF NOT EXISTS trolley_baggage NUMERIC DEFAULT NULL;
ALTER TABLE flights ADD COLUMN IF NOT EXISTS suitcase_baggage NUMERIC DEFAULT NULL;
