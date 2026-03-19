/**
 * Monetag Ads Helper - Multi-zone support
 */

import { RetryManager } from '../utils/retryManager';

export const MonetagService = {
  isLoaded: false,
  loadedZones: new Set<string>(),

  // Load multiple ad zones
  async loadAllZones(): Promise<boolean> {
    const zones = [
      { id: '10748607', name: 'Vignette Banner' },
      { id: '10748606', name: 'In-Page Push' },
      { id: '10748605', name: 'OnClick Popunder' },
    ];

    let anyLoaded = false;
    for (const zone of zones) {
      try {
        await this.loadSingleZone(zone.id, zone.name);
        anyLoaded = true;
      } catch (e) {
        console.warn(`Failed to load ${zone.name} (${zone.id}):`, e);
      }
    }

    this.isLoaded = anyLoaded;
    return anyLoaded;
  },

  // Load a single zone script
  async loadSingleZone(zoneId: string, zoneName: string = 'ad'): Promise<boolean> {
    const scriptId = `monetag-script-${zoneId}`;
    
    if (document.getElementById(scriptId)) {
      this.loadedZones.add(zoneId);
      return true;
    }

    try {
      await RetryManager.executeWithRetryAndTimeout(
        async () => {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://5gvci.com/act/files/tag.min.js?z=${zoneId}`;
            script.async = true;
            script.dataset.cfasync = "false";
            script.dataset.zone = zoneId;
            
            script.onload = () => {
              console.log(`Monetag ${zoneName} (${zoneId}) loaded successfully`);
              resolve(true);
            };
            
            script.onerror = (error) => {
              console.warn(`Failed to load Monetag ${zoneName}:`, error);
              reject(new Error(`Failed to load Monetag ${zoneName}`));
            };
            
            setTimeout(() => {
              reject(new Error(`Timeout loading Monetag ${zoneName}`));
            }, 8000);
            
            if (document.head.firstChild) {
              document.head.insertBefore(script, document.head.firstChild);
            } else {
              document.head.appendChild(script);
            }
          });
        },
        { maxRetries: 2, baseDelay: 1000 },
        10000
      );

      this.loadedZones.add(zoneId);
      return true;
    } catch (error) {
      console.warn(`Failed to load Monetag ${zoneName} after retries:`, error);
      return false;
    }
  },

  // Legacy compatibility - load a single script
  async loadScript(zoneId?: string): Promise<boolean> {
    return this.loadAllZones();
  },

  // Legacy compatibility
  injectScript: async (zoneId?: string) => {
    try {
      await MonetagService.loadAllZones();
    } catch (error) {
      console.warn('Failed to inject Monetag:', error);
    }
  },

  // Remove all scripts
  removeScript: () => {
    MonetagService.loadedZones.forEach(zoneId => {
      const script = document.getElementById(`monetag-script-${zoneId}`);
      if (script) script.remove();
    });
    MonetagService.loadedZones.clear();
    MonetagService.isLoaded = false;
  },

  // Check if service is available
  isAvailable: (): boolean => {
    return MonetagService.isLoaded && MonetagService.loadedZones.size > 0;
  }
};
