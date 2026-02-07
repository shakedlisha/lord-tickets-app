@echo off
echo ========================================
echo   Flight Inventory Manager
echo ========================================
echo.
echo Installing dependencies...
python -m pip install streamlit pandas openpyxl Pillow --quiet
echo.
echo Starting app...
echo.
echo When you see "Local URL: http://localhost:8501"
echo Open your browser and go to: http://localhost:8501
echo.
echo Press Ctrl+C to stop the app.
echo ========================================
echo.
python -m streamlit run app.py
pause
