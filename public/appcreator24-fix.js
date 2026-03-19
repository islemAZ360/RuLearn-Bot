/**
 * حل لمشكلة رسالة Disconnected في appCreator24
 * هذا الكود يتم تشغيله فوراً لإخفاء الرسائل المنبثقة المزعجة
 */

(function() {
    'use strict';
    
    // الكلمات المفتاحية للبحث (بعدة لغات للشمولية)
    const errorKeywords = [
        'disconnected', 
        'internet connection', 
        'try again',
        'قطع الاتصال',
        'الاتصال بالانترنت',
        'حاول مرة أخرى'
    ];
    
    // إخفاء رسائل الخطأ من appCreator24
    const hideAppCreatorErrors = () => {
        // 1. البحث في جميع العناصر عن نصوص الخطأ
        const allElements = document.querySelectorAll('div, p, h1, h2, h3, span');
        
        allElements.forEach(el => {
            if (el.children.length > 3) return; // تقليل البحث في الحاويات الكبيرة
            
            const text = (el.textContent || '').toLowerCase();
            const hasKeyword = errorKeywords.some(keyword => text.includes(keyword));
            
            if (hasKeyword) {
                // البحث عن الحاوية الأب التي تشبه النافذة المنبثقة
                const popup = el.closest('[style*="position: fixed"], [style*="position: absolute"], [class*="dialog"], [class*="modal"]');
                if (popup) {
                    popup.style.display = 'none';
                    popup.style.opacity = '0';
                    popup.style.pointerEvents = 'none';
                    // popup.remove(); // لا نحذفها تماماً لتجنب مشاكل في كود AppCreator24
                } else {
                    // إذا لم نجد حاوية، نخفي العنصر نفسه
                    el.style.display = 'none';
                }
            }
        });
        
        // 2. البحث عن أزرار "CLOSE" و "إغلاق" ونقرها تلقائياً
        const buttons = document.querySelectorAll('button, [role="button"], .button');
        const closeKeywords = ['close', 'إغلاق', 'ok', 'موافق'];
        
        buttons.forEach(button => {
            const btnText = (button.textContent || '').trim().toLowerCase();
            if (closeKeywords.includes(btnText)) {
                // التأكد من أن الزر داخل نافذة منبثقة محتملة
                const isInPopup = button.closest('[style*="position: fixed"], [style*="position: absolute"], [class*="dialog"], [class*="modal"]');
                if (isInPopup) {
                    button.click();
                }
            }
        });
    };
    
    // مراقبة وإخفاء رسائل الخطأ عند حدوث أي تغيير في الصفحة
    const observer = new MutationObserver((mutations) => {
        hideAppCreatorErrors();
    });
    
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
    
    // التحقق الدوري المكثف في البداية
    const interval = setInterval(hideAppCreatorErrors, 100);
    
    // تقليل الوتيرة بعد 10 ثوانٍ لتوفير البطارية
    setTimeout(() => {
        clearInterval(interval);
        setInterval(hideAppCreatorErrors, 1000);
    }, 10000);
    
    // تنفيذ فوري عند التحميل
    hideAppCreatorErrors();
    
    console.log('🚀 AppCreator24 connection fix active');
})();

