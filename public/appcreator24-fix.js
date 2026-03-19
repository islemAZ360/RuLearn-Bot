/**
 * حل لمشكلة رسالة Disconnected في appCreator24
 * هذا الكود يتم تشغيله قبل تحميل التطبيق الرئيسي
 */

(function() {
    'use strict';
    
    // إخفاء رسائل الخطأ من appCreator24
    const hideAppCreatorErrors = () => {
        // البحث عن نافذة منبثقة "Disconnected"
        const errorDialogs = document.querySelectorAll('[class*="dialog"], [class*="modal"], [class*="popup"]');
        errorDialogs.forEach(dialog => {
            const text = dialog.textContent || '';
            if (text.includes('Disconnected') || text.includes('internet connection')) {
                dialog.style.display = 'none';
                dialog.remove();
            }
        });
        
        // البحث عن أزرار "CLOSE"
        const closeButtons = document.querySelectorAll('button, [class*="button"]');
        closeButtons.forEach(button => {
            const text = button.textContent || '';
            if (text === 'CLOSE' && button.closest('[class*="dialog"], [class*="modal"]')) {
                button.click();
            }
        });
    };
    
    // مراقبة وإخفاء رسائل الخطأ
    const observer = new MutationObserver(() => {
        hideAppCreatorErrors();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
    });
    
    // التحقق كل 100 مللي ثانية
    const interval = setInterval(() => {
        hideAppCreatorErrors();
    }, 100);
    
    // التوقف بعد 10 ثوانٍ
    setTimeout(() => {
        clearInterval(interval);
        observer.disconnect();
    }, 10000);
    
    // تنفيذ فوري
    hideAppCreatorErrors();
    
    console.log('AppCreator24 fix loaded');
})();
