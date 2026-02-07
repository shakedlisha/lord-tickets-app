"""
Flight Inventory Manager - Lord Tickets Style
מנהל מלאי טיסות בעיצוב Lord Tickets
"""

import streamlit as st
import pandas as pd
import json
import re
import io
from datetime import datetime
from PIL import Image

# Try to import Google GenAI
try:
    from google import genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

# =============================================================================
# PAGE CONFIG & STYLING
# =============================================================================

st.set_page_config(
    page_title="Lord Tickets - מלאי טיסות",
    page_icon="✈️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Lord Tickets Theme CSS
st.markdown("""
<style>
    /* Main theme colors */
    :root {
        --gold: #D4AF37;
        --gold-light: #E8C547;
        --navy: #1B365D;
        --navy-light: #2A4A7A;
        --navy-dark: #0F1F3A;
    }
    
    /* Header styling */
    .main-header {
        background: linear-gradient(135deg, #1B365D 0%, #0F1F3A 100%);
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 20px;
        text-align: center;
    }
    
    .main-header h1 {
        color: #D4AF37 !important;
        font-size: 2.5rem !important;
        margin: 0 !important;
    }
    
    .main-header p {
        color: #E8C547 !important;
        margin: 5px 0 0 0 !important;
    }
    
    /* Stats cards */
    .stat-card {
        background: linear-gradient(135deg, #1B365D 0%, #2A4A7A 100%);
        padding: 20px;
        border-radius: 12px;
        text-align: center;
        border: 2px solid #D4AF37;
        margin: 5px;
    }
    
    .stat-number {
        font-size: 2.5rem;
        font-weight: bold;
        color: #D4AF37;
    }
    
    .stat-label {
        color: white;
        font-size: 0.9rem;
        margin-top: 5px;
    }
    
    /* Section headers */
    .section-header {
        background: linear-gradient(90deg, #1B365D 0%, transparent 100%);
        padding: 10px 20px;
        border-radius: 8px;
        border-right: 4px solid #D4AF37;
        margin: 20px 0 15px 0;
    }
    
    .section-header h3 {
        color: white !important;
        margin: 0 !important;
    }
    
    /* Buttons */
    .stButton > button {
        background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%) !important;
        color: #1B365D !important;
        font-weight: bold !important;
        border: none !important;
        padding: 10px 25px !important;
        border-radius: 8px !important;
    }
    
    .stButton > button:hover {
        background: linear-gradient(135deg, #E8C547 0%, #D4AF37 100%) !important;
    }
    
    /* Data table styling */
    .dataframe {
        font-size: 0.85rem !important;
    }
    
    /* RTL support */
    .rtl {
        direction: rtl;
        text-align: right;
    }
    
    /* Action buttons row */
    .action-row {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        flex-wrap: wrap;
    }
    
    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    
    /* Tab styling */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
    }
    
    .stTabs [data-baseweb="tab"] {
        background-color: #1B365D;
        color: white;
        border-radius: 8px 8px 0 0;
        padding: 10px 20px;
    }
    
    .stTabs [aria-selected="true"] {
        background-color: #D4AF37 !important;
        color: #1B365D !important;
    }
</style>
""", unsafe_allow_html=True)

# =============================================================================
# CONFIGURATION
# =============================================================================

COLUMNS = {
    'dates': 'תאריכים',
    'outbound': 'הלוך',
    'inbound': 'חזור',
    'airline': 'חברה',
    'destination': 'יעד',
    'seats': 'מושבים',
    'price': 'מחיר'
}

COLUMN_ORDER = list(COLUMNS.values())

AIRLINE_ALIASES = {
    'wizz': 'Wizz Air', 'wizz air': 'Wizz Air', 'w6': 'Wizz Air',
    'ryanair': 'Ryanair', 'fr': 'Ryanair',
    'easyjet': 'easyJet', 'u2': 'easyJet',
    'elal': 'El Al', 'el al': 'El Al', 'ly': 'El Al',
    'centrum': 'Centrum',
}

AIRLINE_COLORS = {
    'Wizz Air': '#E31E7B',
    'Ryanair': '#073590',
    'easyJet': '#FF6600',
    'El Al': '#1E3A8A',
    'Centrum': '#4A5568',
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def normalize_airline(name: str) -> str:
    if not name:
        return "Other"
    return AIRLINE_ALIASES.get(name.lower().strip(), name.strip())


def fix_overnight_time(time_string: str) -> str:
    if not time_string or '(+1)' in time_string:
        return time_string
    match = re.search(r'(\d{2}:\d{2}).*?->\s*(\d{2}:\d{2})', str(time_string))
    if match and match.group(2) < match.group(1):
        return time_string.replace(match.group(2), f"{match.group(2)}(+1)", 1)
    return time_string


def parse_date_for_sorting(date_str: str) -> datetime:
    if not date_str or pd.isna(date_str):
        return datetime.max
    match = re.search(r'(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?', str(date_str))
    if match:
        day, month = int(match.group(1)), int(match.group(2))
        year = int(match.group(3)) if match.group(3) else datetime.now().year
        if year < 100:
            year += 2000
        try:
            return datetime(year, month, day)
        except ValueError:
            pass
    return datetime.max


def read_inventory(file) -> pd.DataFrame:
    try:
        if file.name.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file)
        else:
            for encoding in ['utf-8-sig', 'utf-8', 'cp1255']:
                try:
                    file.seek(0)
                    df = pd.read_csv(file, encoding=encoding)
                    break
                except:
                    continue
            else:
                return None
        return df
    except Exception as e:
        st.error(f"שגיאה: {e}")
        return None


def get_stats(df: pd.DataFrame) -> dict:
    """Calculate dashboard statistics."""
    if df is None or df.empty:
        return {'flights': 0, 'seats': 0, 'airlines': 0}
    
    # Count non-header rows (rows with actual flight data)
    data_rows = df[df[COLUMNS['dates']].notna() & (df[COLUMNS['dates']] != '')]
    data_rows = data_rows[~data_rows[COLUMNS['outbound']].isna() | (data_rows[COLUMNS['outbound']] != '')]
    
    flights = len(data_rows)
    
    # Sum seats
    seats = 0
    for val in data_rows[COLUMNS['seats']]:
        try:
            seats += int(val)
        except:
            pass
    
    # Count unique airlines
    airlines = data_rows[COLUMNS['airline']].dropna().nunique()
    
    return {'flights': flights, 'seats': seats, 'airlines': airlines}


def filter_dataframe(df: pd.DataFrame, search: str, airline_filter: str) -> pd.DataFrame:
    """Filter dataframe by search term and airline."""
    if df is None:
        return None
    
    filtered = df.copy()
    
    if search:
        mask = filtered.apply(lambda row: search.lower() in str(row.values).lower(), axis=1)
        filtered = filtered[mask]
    
    if airline_filter and airline_filter != "הכל":
        filtered = filtered[filtered[COLUMNS['airline']] == airline_filter]
    
    return filtered


def identify_airline_blocks(df: pd.DataFrame) -> dict:
    blocks = {}
    current_airline = None
    current_start = None
    
    for idx, row in df.iterrows():
        first_col = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""
        other_empty = all(pd.isna(v) or str(v).strip() == "" for v in row.iloc[1:])
        
        if first_col and other_empty and first_col not in ['', 'nan']:
            if current_airline and current_start is not None:
                blocks[current_airline] = {'start': current_start, 'end': idx - 1}
            current_airline = first_col
            current_start = idx
    
    if current_airline and current_start is not None:
        blocks[current_airline] = {'start': current_start, 'end': len(df) - 1}
    
    return blocks


def find_duplicate(df: pd.DataFrame, new_data: dict) -> int:
    new_dates = str(new_data.get('dates', '')).strip()
    new_outbound = str(new_data.get('outbound', '')).strip()
    
    for idx, row in df.iterrows():
        if (str(row.get(COLUMNS['dates'], '')).strip() == new_dates and 
            str(row.get(COLUMNS['outbound'], '')).strip() == new_outbound):
            return idx
    return -1


def update_inventory(df: pd.DataFrame, new_data: dict):
    df = df.copy()
    airline = normalize_airline(new_data.get('airline', 'Other'))
    
    new_row = {
        COLUMNS['dates']: new_data.get('dates', ''),
        COLUMNS['outbound']: fix_overnight_time(new_data.get('outbound', '')),
        COLUMNS['inbound']: fix_overnight_time(new_data.get('inbound', '')),
        COLUMNS['airline']: airline,
        COLUMNS['destination']: new_data.get('destination', ''),
        COLUMNS['seats']: new_data.get('seats', ''),
        COLUMNS['price']: new_data.get('price', '')
    }
    
    dup_idx = find_duplicate(df, new_data)
    if dup_idx >= 0:
        df.at[dup_idx, COLUMNS['seats']] = new_row[COLUMNS['seats']]
        df.at[dup_idx, COLUMNS['price']] = new_row[COLUMNS['price']]
        return df, "עודכן", dup_idx
    
    blocks = identify_airline_blocks(df)
    
    if airline in blocks:
        block = blocks[airline]
        block_start = block['start'] + 1
        block_end = block['end']
        block_df = df.iloc[block_start:block_end + 1].copy()
        new_row_df = pd.DataFrame([new_row])
        block_df = pd.concat([block_df, new_row_df], ignore_index=True)
        block_df['_sort'] = block_df[COLUMNS['dates']].apply(parse_date_for_sorting)
        block_df = block_df.sort_values('_sort').drop('_sort', axis=1)
        before = df.iloc[:block_start]
        after = df.iloc[block_end + 1:]
        df = pd.concat([before, block_df, after], ignore_index=True)
        return df, "נוסף", -1
    else:
        empty = pd.DataFrame([{col: '' for col in df.columns}])
        header = pd.DataFrame([{df.columns[0]: airline, **{c: '' for c in df.columns[1:]}}])
        data = pd.DataFrame([new_row])
        df = pd.concat([df, empty, header, data], ignore_index=True)
        return df, "נוסף (בלוק חדש)", -1


def export_csv(df: pd.DataFrame) -> bytes:
    buffer = io.BytesIO()
    df.to_csv(buffer, index=False, encoding='utf-8-sig')
    return buffer.getvalue()


def export_excel(df: pd.DataFrame) -> bytes:
    buffer = io.BytesIO()
    df.to_excel(buffer, index=False, engine='openpyxl')
    return buffer.getvalue()


# =============================================================================
# LLM EXTRACTION
# =============================================================================

def extract_with_gemini(content, api_key: str, is_image: bool = False) -> dict:
    if not GEMINI_AVAILABLE:
        st.error("google-genai לא מותקן. הרץ: pip install google-genai")
        return None
    
    try:
        client = genai.Client(api_key=api_key)
        
        prompt = """Extract flight information from this input. Return ONLY valid JSON:
{
    "dates": "DD/MM - DD/MM",
    "outbound": "HH:MM CITY (CODE) -> HH:MM CITY (CODE) FLIGHT#",
    "inbound": "HH:MM CITY (CODE) -> HH:MM CITY (CODE) FLIGHT#",
    "airline": "Airline Name",
    "destination": "City (CODE)",
    "seats": 1,
    "price": "$199"
}
If arrival time < departure time, add (+1) after arrival time."""

        if is_image:
            img_byte_arr = io.BytesIO()
            content.save(img_byte_arr, format='PNG')
            img_bytes = img_byte_arr.getvalue()
            
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[prompt, {"mime_type": "image/png", "data": img_bytes}]
            )
        else:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=f"{prompt}\n\nInput:\n{content}"
            )
        
        text = response.text
        json_match = re.search(r'\{[^{}]*\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return json.loads(text)
        
    except Exception as e:
        st.error(f"שגיאת Gemini: {e}")
        return None


def extract_mock(content, is_image: bool = False) -> dict:
    return {
        "dates": "01/03 - 05/03",
        "outbound": "06:00 TLV -> 09:30 VIE W6 1283",
        "inbound": "14:00 VIE -> 18:30 TLV W6 1284",
        "airline": "Wizz Air",
        "destination": "Vienna (VIE)",
        "seats": 2,
        "price": "$199"
    }


# =============================================================================
# MAIN APP
# =============================================================================

def main():
    # Initialize session state
    if 'inventory_df' not in st.session_state:
        st.session_state.inventory_df = None
    if 'extracted_data' not in st.session_state:
        st.session_state.extracted_data = None
    if 'show_add_modal' not in st.session_state:
        st.session_state.show_add_modal = False
    
    # =========================================================================
    # HEADER
    # =========================================================================
    st.markdown("""
    <div class="main-header">
        <h1>✈️ Lord Tickets</h1>
        <p>מנהל מלאי טיסות</p>
    </div>
    """, unsafe_allow_html=True)
    
    # =========================================================================
    # SIDEBAR - Settings
    # =========================================================================
    with st.sidebar:
        st.markdown("### ⚙️ הגדרות")
        api_key = st.text_input("🔑 Gemini API Key", type="password")
        use_mock = st.checkbox("מצב בדיקה (ללא API)", value=not api_key)
        
        st.divider()
        
        st.markdown("### 📁 טעינת קובץ")
        uploaded = st.file_uploader("בחר קובץ CSV/Excel", type=['csv', 'xlsx'], label_visibility="collapsed")
        
        if uploaded:
            df = read_inventory(uploaded)
            if df is not None:
                st.session_state.inventory_df = df
                st.success(f"נטענו {len(df)} שורות")
        
        if st.button("📋 טען נתוני דוגמה", use_container_width=True):
            try:
                st.session_state.inventory_df = pd.read_csv("sample_inventory.csv", encoding='utf-8-sig')
                st.success("נטענו נתוני דוגמה!")
            except:
                st.error("קובץ דוגמה לא נמצא")
    
    # =========================================================================
    # STATS DASHBOARD
    # =========================================================================
    stats = get_stats(st.session_state.inventory_df)
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown(f"""
        <div class="stat-card">
            <div class="stat-number">{stats['flights']}</div>
            <div class="stat-label">✈️ טיסות במלאי</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown(f"""
        <div class="stat-card">
            <div class="stat-number">{stats['seats']}</div>
            <div class="stat-label">💺 מושבים זמינים</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown(f"""
        <div class="stat-card">
            <div class="stat-number">{stats['airlines']}</div>
            <div class="stat-label">🏢 חברות תעופה</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col4:
        if st.session_state.inventory_df is not None:
            st.markdown("""
            <div class="stat-card">
                <div class="stat-number">✓</div>
                <div class="stat-label">📊 מלאי פעיל</div>
            </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown("""
            <div class="stat-card">
                <div class="stat-number">—</div>
                <div class="stat-label">📊 טען מלאי</div>
            </div>
            """, unsafe_allow_html=True)
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # =========================================================================
    # ACTION BUTTONS
    # =========================================================================
    col_add, col_import, col_export_csv, col_export_excel, col_refresh = st.columns([2, 2, 1.5, 1.5, 1])
    
    with col_add:
        if st.button("➕ הוסף טיסה", type="primary", use_container_width=True):
            st.session_state.show_add_modal = True
    
    with col_import:
        st.markdown("<small>⬆️ ייבוא בסרגל הצד</small>", unsafe_allow_html=True)
    
    with col_export_csv:
        if st.session_state.inventory_df is not None:
            st.download_button(
                "📥 CSV",
                export_csv(st.session_state.inventory_df),
                f"flights_{datetime.now().strftime('%Y%m%d')}.csv",
                "text/csv",
                use_container_width=True
            )
    
    with col_export_excel:
        if st.session_state.inventory_df is not None:
            st.download_button(
                "📥 Excel",
                export_excel(st.session_state.inventory_df),
                f"flights_{datetime.now().strftime('%Y%m%d')}.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                use_container_width=True
            )
    
    with col_refresh:
        if st.button("🔄", use_container_width=True):
            st.rerun()
    
    # =========================================================================
    # ADD FLIGHT MODAL
    # =========================================================================
    if st.session_state.show_add_modal:
        st.markdown("""
        <div class="section-header">
            <h3>➕ הוסף טיסה חדשה</h3>
        </div>
        """, unsafe_allow_html=True)
        
        if st.session_state.inventory_df is None:
            st.warning("⚠️ יש לטעון מלאי קודם")
        else:
            tab_text, tab_image = st.tabs(["📝 הדבק טקסט", "📷 העלה תמונה"])
            
            with tab_text:
                text = st.text_area("הדבק פרטי טיסה", height=100, placeholder="הדבק כאן פרטי טיסה מהאתר...")
                if st.button("🔍 נתח טקסט", type="primary"):
                    if text.strip():
                        with st.spinner("מנתח..."):
                            result = extract_mock(text) if use_mock else extract_with_gemini(text, api_key)
                            if result:
                                st.session_state.extracted_data = result
            
            with tab_image:
                img_file = st.file_uploader("העלה צילום מסך", type=['png', 'jpg', 'jpeg'], label_visibility="collapsed")
                if img_file:
                    img = Image.open(img_file)
                    st.image(img, width=400)
                    if st.button("🔍 נתח תמונה", type="primary"):
                        with st.spinner("מנתח..."):
                            result = extract_mock(None, True) if use_mock else extract_with_gemini(img, api_key, True)
                            if result:
                                st.session_state.extracted_data = result
            
            # Review extracted data
            if st.session_state.extracted_data:
                st.markdown("---")
                st.markdown("### 📋 בדוק ואשר:")
                
                data = st.session_state.extracted_data
                
                col1, col2 = st.columns(2)
                with col1:
                    dates = st.text_input("תאריכים", data.get('dates', ''))
                    outbound = st.text_input("הלוך", data.get('outbound', ''))
                    inbound = st.text_input("חזור", data.get('inbound', ''))
                    airline = st.text_input("חברה", data.get('airline', ''))
                
                with col2:
                    destination = st.text_input("יעד", data.get('destination', ''))
                    seats = st.number_input("מושבים", value=int(data.get('seats', 1)), min_value=1)
                    price = st.text_input("מחיר", data.get('price', ''))
                
                st.session_state.extracted_data = {
                    'dates': dates, 'outbound': outbound, 'inbound': inbound,
                    'airline': airline, 'destination': destination, 'seats': seats, 'price': price
                }
                
                col_add, col_cancel = st.columns(2)
                with col_add:
                    if st.button("✅ הוסף למלאי", type="primary", use_container_width=True):
                        df, action, idx = update_inventory(st.session_state.inventory_df, st.session_state.extracted_data)
                        st.session_state.inventory_df = df
                        st.success(f"הטיסה {action}!")
                        st.session_state.extracted_data = None
                        st.session_state.show_add_modal = False
                        st.rerun()
                
                with col_cancel:
                    if st.button("❌ בטל", use_container_width=True):
                        st.session_state.extracted_data = None
                        st.session_state.show_add_modal = False
                        st.rerun()
    
    # =========================================================================
    # INVENTORY TABLE
    # =========================================================================
    st.markdown("""
    <div class="section-header">
        <h3>📊 מלאי טיסות</h3>
    </div>
    """, unsafe_allow_html=True)
    
    if st.session_state.inventory_df is not None:
        # Search and filter
        col_search, col_airline = st.columns([3, 1])
        
        with col_search:
            search = st.text_input("🔍 חיפוש יעד, חברה...", label_visibility="collapsed", placeholder="חיפוש...")
        
        with col_airline:
            airlines = ["הכל"] + list(st.session_state.inventory_df[COLUMNS['airline']].dropna().unique())
            airline_filter = st.selectbox("סינון חברה", airlines, label_visibility="collapsed")
        
        # Filter and display
        filtered_df = filter_dataframe(st.session_state.inventory_df, search, airline_filter)
        
        if filtered_df is not None and not filtered_df.empty:
            st.dataframe(
                filtered_df,
                use_container_width=True,
                height=400,
                hide_index=True
            )
            st.caption(f"מציג {len(filtered_df)} מתוך {len(st.session_state.inventory_df)} שורות")
        else:
            st.info("לא נמצאו תוצאות")
    else:
        st.info("👆 טען קובץ מלאי מהסרגל הצד כדי להתחיל")
    
    # =========================================================================
    # FOOTER
    # =========================================================================
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666; font-size: 0.8rem;">
        Lord Tickets - מנהל מלאי טיסות | 2026
    </div>
    """, unsafe_allow_html=True)


if __name__ == "__main__":
    main()
