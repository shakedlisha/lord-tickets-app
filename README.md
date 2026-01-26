# Lord Tickets - Travel Agency System

A unified travel agency system with two separate modules: **Quote Generator** and **Inventory Manager**, both connected to a shared Supabase database.

## Live Demo

- GitHub Pages: https://shakedlisha.github.io/lord-tickets-app/
- Custom Domain: https://www.supatours.com/lord-tickets-app/

## System Architecture

```
lord-tickets-app/
├── index.html          # Quote Generator - Create customer quotes
├── inventory.html      # Inventory Manager - Manage flight inventory
├── view.html           # Public view for shared quotes
└── supabase/
    └── migrations/     # Database schema
```

## Two Systems, One Database

### 1. Quote Generator (`index.html`)

Create professional travel quotes for customers:
- Add flights from inventory or manually
- Add hotels and services
- AI-powered image parsing (Gemini)
- Calculate prices with commission
- Generate shareable links
- Export to WhatsApp format

### 2. Inventory Manager (`inventory.html`)

Manage your flight inventory:
- Add, edit, delete flights
- Inline editing (Excel-like)
- Real-time sync across users
- CSV import/export
- AI text/image parsing (Gemini)
- Filter by airline, availability
- Search functionality

## Features

| Feature | Quote Generator | Inventory Manager |
|---------|----------------|-------------------|
| Supabase Integration | Read inventory | Full CRUD |
| AI Parsing (Gemini) | Images | Text & Images |
| Real-time Sync | - | Yes |
| CSV Import/Export | - | Yes |
| Hebrew RTL Support | Yes | Yes |
| Gold/Navy Theme | Yes | Yes |

## Quick Start

1. **Open in Browser**: Just open `index.html` or `inventory.html` directly
2. **No Build Required**: Pure HTML/CSS/JS - no npm, no bundler
3. **Navigation**: Click the header links to switch between systems

## Supabase Setup (Optional)

To enable cloud storage and sync:

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migrations in `supabase/migrations/`
3. Copy your Project URL and Anon Key
4. Enter them in the Settings (gear icon) in both pages

### Database Schema

```sql
-- Main flights table
CREATE TABLE flights (
    id UUID PRIMARY KEY,
    departure_date DATE,
    return_date DATE,
    airline TEXT,
    destination_code TEXT,
    destination_name TEXT,
    available_seats INTEGER,
    selling_price DECIMAL,
    cost_price DECIMAL,      -- Private
    supplier_info TEXT       -- Private
);
```

## Gemini AI Setup

For AI-powered text/image parsing:

1. Get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Enter the key in the Gemini API field in the header

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API
- **Fonts**: Heebo (Hebrew), Material Icons
- **No Build Tools**: Open directly in browser

## File Descriptions

| File | Description |
|------|-------------|
| `index.html` | Quote Generator - main app for creating customer quotes |
| `inventory.html` | Inventory Manager - manage flight stock |
| `view.html` | Public view page for shared quotes |
| `gmail-to-drive-script.js` | Google Apps Script for email automation |
| `SETUP_GMAIL_IMPORT.md` | Instructions for Gmail import setup |

## Development

No setup needed! Just edit the HTML files and refresh your browser.

```bash
# Open Quote Generator
start index.html

# Open Inventory Manager
start inventory.html
```

## License

Private project for Lord Tickets travel agency.
