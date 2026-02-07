# 📧 הוראות הגדרת ייבוא תמונות מ-Gmail

## סקירה כללית

מערכת זו מאפשרת לך לייבא תמונות אוטומטית מהמייל שלך ישירות לאתר הצעות המחיר.

**איך זה עובד:**
```
📧 מייל עם תמונה → 🏷️ תווית "LordTickets" → 🔄 סקריפט אוטומטי → 📁 Google Drive → 🌐 האתר
```

---

## 📋 שלב 1: יצירת Google Apps Script

1. **פתח את Google Apps Script:**
   - לך ל: https://script.google.com
   - לחץ "New Project" (פרויקט חדש)

2. **העתק את הקוד:**
   - פתח את הקובץ `gmail-to-drive-script.js` שבתיקייה
   - סמן הכל (Ctrl+A) והעתק (Ctrl+C)
   - הדבק בעורך של Google Apps Script (Ctrl+V)

3. **שמור את הפרויקט:**
   - לחץ על 💾 או Ctrl+S
   - תן שם לפרויקט: "Lord Tickets Gmail Import"

---

## 📋 שלב 2: הרצה ראשונית והרשאות

1. **הרץ את פונקציית ההגדרה:**
   - בחר בפונקציה `setup` מהתפריט הנפתח למעלה
   - לחץ "Run" (▶️)

2. **אשר הרשאות:**
   - יופיע חלון "Authorization required"
   - לחץ "Review permissions"
   - בחר את החשבון `shaked9098@gmail.com`
   - לחץ "Advanced" → "Go to Lord Tickets Gmail Import (unsafe)"
   - לחץ "Allow"

3. **בדוק שההגדרה הצליחה:**
   - בלוג למטה תראה הודעות ✅
   - נוצרה תווית "LordTickets" ב-Gmail
   - נוצרה תיקייה "LordTickets_Images" ב-Google Drive

---

## 📋 שלב 3: הפעלת Trigger אוטומטי

1. **צור Trigger:**
   - בחר בפונקציה `createTimeTrigger` מהתפריט
   - לחץ "Run" (▶️)

2. **או הגדר ידנית:**
   - לחץ על ⏰ (Triggers) בצד שמאל
   - לחץ "+ Add Trigger"
   - בחר:
     - Function: `processEmails`
     - Event source: `Time-driven`
     - Type: `Minutes timer`
     - Interval: `Every 5 minutes`
   - לחץ "Save"

---

## 📋 שלב 4: פרסום כ-Web App

1. **לחץ "Deploy" → "New deployment"**

2. **הגדרות:**
   - Type: `Web app`
   - Description: `Lord Tickets API`
   - Execute as: `Me`
   - Who has access: `Anyone`

3. **לחץ "Deploy"**

4. **העתק את ה-URL:**
   - יופיע URL שנראה כך:
   - `https://script.google.com/macros/s/AKfycb.../exec`
   - **העתק את ה-URL הזה!**

---

## 📋 שלב 5: עדכון האתר

1. **פתח את הקובץ `index.html`**

2. **חפש את השורה:**
   ```javascript
   webAppUrl: '', // e.g., 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'
   ```

3. **החלף עם ה-URL שהעתקת:**
   ```javascript
   webAppUrl: 'https://script.google.com/macros/s/AKfycb.../exec',
   ```

4. **שמור את הקובץ**

---

## 🎯 שימוש במערכת

### הוספת תמונות מהמייל:

1. **קבל מייל** עם תמונות (מסיטונאי, מערכת הזמנות, וכו')

2. **הוסף תווית "LordTickets"** למייל:
   - פתח את המייל ב-Gmail
   - לחץ על 🏷️ (Labels)
   - בחר "LordTickets"

3. **המתן 5 דקות** (הסקריפט רץ אוטומטית)

4. **פתח את האתר:**
   - לחץ על "📥 ייבא תמונות"
   - בחר את התמונות שברצונך לייבא
   - בחר סוג (טיסות/מלונות/שירותים)
   - לחץ "ייבא נבחרים"

---

## ❓ פתרון בעיות

### הסקריפט לא רץ:
- בדוק שה-Trigger מוגדר נכון
- בדוק את הלוגים: View → Execution logs

### אין תמונות:
- ודא שהוספת את התווית "LordTickets" למייל
- המתן 5 דקות
- בדוק שיש קבצים מצורפים מסוג תמונה

### שגיאת הרשאות:
- הרץ שוב את `setup()` ואשר הרשאות

### השרת לא מגיב:
- ודא שפרסמת את ה-Web App
- בדוק שה-URL נכון

---

## 📞 תמיכה

אם יש בעיות - בדוק:
1. Execution logs ב-Apps Script
2. Console בדפדפן (F12)
3. שהתווית נוספה נכון למייל

---

## 🔒 אבטחה

- התמונות נשמרות ב-Google Drive שלך
- רק אתה יכול לגשת לקבצים
- הסקריפט רץ עם ההרשאות שלך
- ה-Web App דורש הזדהות

בהצלחה! 🚀
