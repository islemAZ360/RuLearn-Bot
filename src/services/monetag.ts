/**
 * Monetag Ads Helper
 */

export const MonetagService = {
  // حقن كود Monetag في الموقع
  injectScript: (zoneId?: string) => {
    // استخدم الرقم المرفق أو الرقم الافتراضي الداخلي (10748605)
    const finalZoneId = zoneId || '10748605';
    
    if (!finalZoneId) return;
    
    // منع التكرار
    if (document.getElementById('monetag-script')) return;

    const script = document.createElement('script');
    script.id = 'monetag-script';
    script.src = `https://5gvci.com/act/files/tag.min.js?z=${finalZoneId}`;
    script.async = true;
    script.dataset.cfasync = "false";
    script.dataset.zone = finalZoneId;
    
    // Insert at the top of head for better performance
    if (document.head.firstChild) {
      document.head.insertBefore(script, document.head.firstChild);
    } else {
      document.head.appendChild(script);
    }
    
    console.log(`Monetag Zone ${finalZoneId} injected internally`);
  },

  // إزالة الكود إذا لزم الأمر
  removeScript: () => {
    const script = document.getElementById('monetag-script');
    if (script) script.remove();
  }
};
