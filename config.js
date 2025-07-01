// Configuration for CodeQuest extension
const CONFIG = {
  MODELS: {
    GEMINI_25_FLASH: {
      provider: 'google',
      id: 'gemini-2.5-flash',
      label: '2.5 Flash',
      BASE_URL: 'https://generativelanguage.googleapis.com/v1/models',
      DEFAULT_KEY: 'YOUR_API_KEY_HEREAI'
    },
    GEMINI_20_FLASH: {
      provider: 'google',
      id: 'gemini-2.0-flash',
      label: '2.0 Flash',
      BASE_URL: 'https://generativelanguage.googleapis.com/v1/models',
      DEFAULT_KEY: 'YOUR_API_KEY_HEREAI'
    },
    GEMINI_20_FLASH_LITE: {
      provider: 'google',
      id: 'gemini-2.0-flash-lite',
      label: '2.0 Flash Lite',
      BASE_URL: 'https://generativelanguage.googleapis.com/v1/models',
      DEFAULT_KEY: 'YOUR_API_KEY_HEREAI'
    },
    GEMINI_15_FLASH: {
      provider: 'google',
      id: 'gemini-1.5-flash',
      label: '1.5 Flash',
      BASE_URL: 'https://generativelanguage.googleapis.com/v1/models',
      DEFAULT_KEY: 'YOUR_API_KEY_HEREAI'
    },
    GEMINI_15_FLASH_8B: {
      provider: 'google',
      id: 'gemini-1.5-flash-8b',
      label: '1.5 Flash 8B',
      BASE_URL: 'https://generativelanguage.googleapis.com/v1/models',
      DEFAULT_KEY: 'YOUR_API_KEY_HEREAI'
    }
  },
  
  // Default selected model
  SELECTED_MODEL: 'GEMINI_25_FLASH',
  
  API: {
    // Helper function to get current model config
    getCurrentModel: function() {
      // Get selected model from storage or use default
      let modelKey;
      
      // Try localStorage first (for content scripts)
      if (typeof localStorage !== 'undefined') {
        modelKey = localStorage.getItem('selectedModel');
      }
      
      // If not found, use default
      if (!modelKey) {
        modelKey = CONFIG.SELECTED_MODEL;
      }
      
      return CONFIG.MODELS[modelKey] || CONFIG.MODELS[CONFIG.SELECTED_MODEL];
    },
    
    // Get current model ID
    get MODEL() {
      return this.getCurrentModel().id;
    },
    
    // Get current base URL
    get BASE_URL() {
      return this.getCurrentModel().BASE_URL;
    },
    
    // Get current default API key
    get DEFAULT_API_KEY() {
      return this.getCurrentModel().DEFAULT_KEY;
    }
  }
};

// Make CONFIG available in different contexts
try {
  // For service worker / background script
  if (typeof self !== 'undefined' && typeof self.importScripts === 'function') {
    self.CONFIG = CONFIG;
  }
  
  // For content script / web page context
  if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
  }
  
  // For CommonJS environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
  }
} catch (e) {
  console.warn("Error while exporting CONFIG:", e);
} 