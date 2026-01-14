/**
 * Lord Tickets - Gmail to Google Drive Image Extractor
 * =====================================================
 * 
 * הוראות התקנה:
 * 1. לך ל: https://script.google.com
 * 2. צור פרויקט חדש
 * 3. העתק את כל הקוד הזה
 * 4. שמור והרץ את הפונקציה setup() פעם אחת
 * 5. אשר את ההרשאות
 * 6. הגדר Trigger להרצה אוטומטית (כל 5 דקות)
 * 
 * שימוש:
 * - הוסף תווית "LordTickets" למיילים עם תמונות
 * - התמונות יישמרו אוטומטית ב-Google Drive
 * - האתר יוכל לייבא אותן
 */

// ==========================================
// הגדרות - שנה לפי הצורך
// ==========================================
const CONFIG = {
  LABEL_NAME: 'LordTickets',           // שם התווית ב-Gmail
  FOLDER_NAME: 'LordTickets_Images',   // שם התיקייה ב-Drive
  PROCESSED_LABEL: 'LordTickets_Done', // תווית למיילים שעובדו
  MAX_EMAILS_PER_RUN: 10,              // מקסימום מיילים לעיבוד בכל הרצה
  SUPPORTED_TYPES: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
  MANIFEST_FILE: 'images_manifest.json' // קובץ JSON עם רשימת התמונות
};

// ==========================================
// פונקציית הגדרה ראשונית - הרץ פעם אחת!
// ==========================================
function setup() {
  // יצירת תווית אם לא קיימת
  let label = GmailApp.getUserLabelByName(CONFIG.LABEL_NAME);
  if (!label) {
    label = GmailApp.createLabel(CONFIG.LABEL_NAME);
    Logger.log('✅ נוצרה תווית: ' + CONFIG.LABEL_NAME);
  } else {
    Logger.log('✓ תווית קיימת: ' + CONFIG.LABEL_NAME);
  }
  
  // יצירת תווית "עובד"
  let processedLabel = GmailApp.getUserLabelByName(CONFIG.PROCESSED_LABEL);
  if (!processedLabel) {
    processedLabel = GmailApp.createLabel(CONFIG.PROCESSED_LABEL);
    Logger.log('✅ נוצרה תווית: ' + CONFIG.PROCESSED_LABEL);
  } else {
    Logger.log('✓ תווית קיימת: ' + CONFIG.PROCESSED_LABEL);
  }
  
  // יצירת תיקייה ב-Drive
  const folder = getOrCreateFolder();
  Logger.log('✅ תיקייה ב-Drive: ' + folder.getUrl());
  
  // יצירת קובץ manifest ריק
  createOrUpdateManifest([]);
  
  Logger.log('');
  Logger.log('========================================');
  Logger.log('🎉 ההגדרה הושלמה בהצלחה!');
  Logger.log('========================================');
  Logger.log('');
  Logger.log('הצעדים הבאים:');
  Logger.log('1. הוסף תווית "' + CONFIG.LABEL_NAME + '" למיילים עם תמונות');
  Logger.log('2. הגדר Trigger להרצה אוטומטית של processEmails()');
  Logger.log('3. התמונות יישמרו ב: ' + folder.getUrl());
}

// ==========================================
// פונקציה ראשית - עיבוד מיילים
// ==========================================
function processEmails() {
  const label = GmailApp.getUserLabelByName(CONFIG.LABEL_NAME);
  const processedLabel = GmailApp.getUserLabelByName(CONFIG.PROCESSED_LABEL);
  
  if (!label) {
    Logger.log('❌ תווית לא נמצאה: ' + CONFIG.LABEL_NAME);
    Logger.log('הרץ את setup() קודם!');
    return;
  }
  
  // קבלת שרשורי מייל עם התווית
  const threads = label.getThreads(0, CONFIG.MAX_EMAILS_PER_RUN);
  
  if (threads.length === 0) {
    Logger.log('📭 אין מיילים חדשים עם תווית ' + CONFIG.LABEL_NAME);
    return;
  }
  
  Logger.log('📬 נמצאו ' + threads.length + ' שרשורים לעיבוד');
  
  const folder = getOrCreateFolder();
  let extractedImages = [];
  let processedCount = 0;
  
  for (const thread of threads) {
    const messages = thread.getMessages();
    
    for (const message of messages) {
      const attachments = message.getAttachments();
      const subject = message.getSubject();
      const date = message.getDate();
      
      for (const attachment of attachments) {
        const mimeType = attachment.getContentType();
        
        // בדיקה אם זו תמונה
        if (CONFIG.SUPPORTED_TYPES.some(type => mimeType.includes(type.split('/')[1]))) {
          const fileName = generateFileName(attachment.getName(), date);
          
          // שמירה ב-Drive
          const file = folder.createFile(attachment.copyBlob().setName(fileName));
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          
          const imageInfo = {
            id: file.getId(),
            name: fileName,
            originalName: attachment.getName(),
            url: file.getUrl(),
            directUrl: 'https://drive.google.com/uc?export=view&id=' + file.getId(),
            thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w400',
            mimeType: mimeType,
            size: attachment.getSize(),
            emailSubject: subject,
            emailDate: date.toISOString(),
            extractedAt: new Date().toISOString()
          };
          
          extractedImages.push(imageInfo);
          Logger.log('✅ נשמרה תמונה: ' + fileName);
        }
      }
    }
    
    // הסרת התווית והוספת תווית "עובד"
    thread.removeLabel(label);
    if (processedLabel) {
      thread.addLabel(processedLabel);
    }
    processedCount++;
  }
  
  // עדכון ה-manifest
  if (extractedImages.length > 0) {
    updateManifest(extractedImages);
  }
  
  Logger.log('');
  Logger.log('========================================');
  Logger.log('✅ סיום עיבוד');
  Logger.log('שרשורים שעובדו: ' + processedCount);
  Logger.log('תמונות שנשמרו: ' + extractedImages.length);
  Logger.log('========================================');
}

// ==========================================
// פונקציות עזר
// ==========================================

function getOrCreateFolder() {
  const folders = DriveApp.getFoldersByName(CONFIG.FOLDER_NAME);
  
  if (folders.hasNext()) {
    return folders.next();
  }
  
  const folder = DriveApp.createFolder(CONFIG.FOLDER_NAME);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return folder;
}

function generateFileName(originalName, date) {
  const timestamp = Utilities.formatDate(date, 'Asia/Jerusalem', 'yyyyMMdd_HHmmss');
  const extension = originalName.split('.').pop();
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9א-ת]/g, '_');
  return timestamp + '_' + baseName.substring(0, 30) + '.' + extension;
}

function createOrUpdateManifest(images) {
  const folder = getOrCreateFolder();
  const files = folder.getFilesByName(CONFIG.MANIFEST_FILE);
  
  const manifest = {
    lastUpdated: new Date().toISOString(),
    folderUrl: folder.getUrl(),
    folderId: folder.getId(),
    totalImages: images.length,
    images: images
  };
  
  const content = JSON.stringify(manifest, null, 2);
  
  if (files.hasNext()) {
    const file = files.next();
    file.setContent(content);
  } else {
    const file = folder.createFile(CONFIG.MANIFEST_FILE, content, 'application/json');
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
}

function updateManifest(newImages) {
  const folder = getOrCreateFolder();
  const files = folder.getFilesByName(CONFIG.MANIFEST_FILE);
  
  let existingImages = [];
  
  if (files.hasNext()) {
    const file = files.next();
    try {
      const content = JSON.parse(file.getBlob().getDataAsString());
      existingImages = content.images || [];
    } catch (e) {
      Logger.log('⚠️ שגיאה בקריאת manifest, יוצר חדש');
    }
  }
  
  // הוספת תמונות חדשות בהתחלה
  const allImages = [...newImages, ...existingImages];
  
  // שמירה של 100 תמונות אחרונות
  const limitedImages = allImages.slice(0, 100);
  
  createOrUpdateManifest(limitedImages);
  Logger.log('📝 עודכן manifest עם ' + limitedImages.length + ' תמונות');
}

// ==========================================
// API לאתר - קבלת רשימת תמונות
// ==========================================
function doGet(e) {
  const folder = getOrCreateFolder();
  const files = folder.getFilesByName(CONFIG.MANIFEST_FILE);
  
  let manifest = {
    lastUpdated: new Date().toISOString(),
    totalImages: 0,
    images: []
  };
  
  if (files.hasNext()) {
    const file = files.next();
    try {
      manifest = JSON.parse(file.getBlob().getDataAsString());
    } catch (err) {
      // Return empty manifest on error
    }
  }
  
  // Add base64 data for each image to bypass CORS
  manifest.images = manifest.images.map(img => {
    try {
      const file = DriveApp.getFileById(img.id);
      const blob = file.getBlob();
      const base64 = Utilities.base64Encode(blob.getBytes());
      img.base64Data = 'data:' + img.mimeType + ';base64,' + base64;
    } catch(err) {
      img.base64Data = null;
    }
    return img;
  });
  
  // Return JSONP or JSON based on callback parameter
  const callback = e.parameter.callback;
  const output = JSON.stringify(manifest);
  
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + output + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  return ContentService
    .createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// פונקציה לניקוי תמונות ישנות (אופציונלי)
// ==========================================
function cleanupOldImages(daysToKeep = 30) {
  const folder = getOrCreateFolder();
  const files = folder.getFiles();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  let deletedCount = 0;
  
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName() === CONFIG.MANIFEST_FILE) continue;
    
    if (file.getDateCreated() < cutoffDate) {
      file.setTrashed(true);
      deletedCount++;
    }
  }
  
  Logger.log('🗑️ נמחקו ' + deletedCount + ' תמונות ישנות');
  
  // עדכון ה-manifest
  rebuildManifest();
}

function rebuildManifest() {
  const folder = getOrCreateFolder();
  const files = folder.getFiles();
  const images = [];
  
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName() === CONFIG.MANIFEST_FILE) continue;
    
    const mimeType = file.getMimeType();
    if (!mimeType.startsWith('image/')) continue;
    
    images.push({
      id: file.getId(),
      name: file.getName(),
      url: file.getUrl(),
      directUrl: 'https://drive.google.com/uc?export=view&id=' + file.getId(),
      thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w400',
      mimeType: mimeType,
      size: file.getSize(),
      extractedAt: file.getDateCreated().toISOString()
    });
  }
  
  // מיון לפי תאריך (חדש ראשון)
  images.sort((a, b) => new Date(b.extractedAt) - new Date(a.extractedAt));
  
  createOrUpdateManifest(images);
  Logger.log('📝 נבנה מחדש manifest עם ' + images.length + ' תמונות');
}

// ==========================================
// יצירת Trigger אוטומטי
// ==========================================
function createTimeTrigger() {
  // מחיקת triggers קיימים
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'processEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  
  // יצירת trigger חדש - כל 5 דקות
  ScriptApp.newTrigger('processEmails')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  Logger.log('⏰ נוצר Trigger אוטומטי - הרצה כל 5 דקות');
}
