/**
 * Median.co (GoNative) JavaScript Bridge Helper
 */

export const MedianService = {
  // إظهار إعلان بيني
  showInterstitial: () => {
    if ((window as any).median?.startio) {
      (window as any).median.startio.showInterstitial();
      return true;
    }
    console.warn("Median Start.io plugin not detected");
    return false;
  },

  // إظهار إعلان مكافأة (Rewarded)
  showRewarded: () => {
    if ((window as any).median?.startio) {
      (window as any).median.startio.showRewarded();
      return true;
    }
    return false;
  },

  // التحقق مما إذا كان المستخدم داخل التطبيق
  isApp: () => {
    return !!(window as any).median;
  }
};
