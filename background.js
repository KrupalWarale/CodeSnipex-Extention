// Import config
importScripts('config.js');

// Ensure CONFIG is properly defined
if (typeof CONFIG === 'undefined') {
  console.error("CONFIG not loaded in background script");
  // Create a minimal fallback CONFIG
  self.CONFIG = {
    MODELS: {
      GEMINI_25_FLASH: {
        provider: 'google',
        id: 'gemini-2.5-flash',
        label: '2.5 Flash',
        BASE_URL: 'https://generativelanguage.googleapis.com/v1/models',
        DEFAULT_KEY: ''
      }
    },
    SELECTED_MODEL: 'GEMINI_25_FLASH'
    // No API object needed - we're accessing models directly now
  };
}

// Store for shared data between popup and sidepanel
const sharedData = {
  questions: null,
  mcqs: null,
  selectedCode: null,
  timestamp: null,
  error: null
};

// Initialize context menu for code selection
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'generateQuestions',
    title: 'Generate Practice Questions',
    contexts: ['selection']
  });
  
  // Set up the side panel
  if (chrome.sidePanel) {
    try {
      // For Chrome 114+
      if (chrome.sidePanel.setOptions) {
        chrome.sidePanel.setOptions({
          path: 'sidepanel.html',
          enabled: true
        });
        console.log("Side panel registered with setOptions API");
      } 
      // For Chrome 116+
      else if (chrome.sidePanel.setPanelBehavior) {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
          .catch(error => console.error("Error setting panel behavior:", error));
        console.log("Side panel behavior set with setPanelBehavior API");
      }
    } catch (error) {
      console.error("Error setting up side panel:", error);
    }
  } else {
    console.warn("Side panel API not available in this browser version");
  }
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'generateQuestions') {
    console.log("Context menu clicked");
    
    // Use the selection text from the context menu info
    if (info.selectionText) {
      console.log("Selection from context menu:", info.selectionText.substring(0, 50) + "...");
      handleDirectRequest(info.selectionText);
      
      // Also send message to content script
      chrome.tabs.sendMessage(tab.id, {
        action: 'generateQuestions',
        selectedCode: info.selectionText
      });
    } else {
      console.log("No selection text in context menu info");
      
      // Try to execute the context-menu-helper script to get a better selection
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['context-menu-helper.js']
      }).then((results) => {
        if (results && results[0] && results[0].result) {
          const selectedText = results[0].result;
          console.log("Got selection from helper script:", selectedText.substring(0, 50) + "...");
          handleDirectRequest(selectedText);
          
          // Also send to content script
          chrome.tabs.sendMessage(tab.id, {
            action: 'generateQuestions',
            selectedCode: selectedText
          });
        } else {
          // Fallback to basic selection
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => window.getSelection().toString()
          }).then((fallbackResults) => {
            if (fallbackResults && fallbackResults[0] && fallbackResults[0].result) {
              const fallbackText = fallbackResults[0].result;
              console.log("Got fallback selection:", fallbackText.substring(0, 50) + "...");
              handleDirectRequest(fallbackText);
              
              // Also send to content script
              chrome.tabs.sendMessage(tab.id, {
                action: 'generateQuestions',
                selectedCode: fallbackText
              });
            }
          }).catch(err => console.error("Error with fallback selection:", err));
        }
      }).catch(err => console.error("Error with helper script:", err));
    }
  }
});

// Function to handle request directly
function handleDirectRequest(selectedCode) {
  console.log("Handling request directly in background script:", selectedCode.substring(0, 50) + "...");
  
  if (!selectedCode || selectedCode.trim() === '') {
    console.log("No code selected, cannot proceed");
    return;
  }
  
  // Update shared data - CLEAR previous questions to force regeneration
  sharedData.selectedCode = selectedCode;
  sharedData.timestamp = Date.now();
  sharedData.questions = null;  // Clear previous questions
  sharedData.mcqs = null;       // Clear previous MCQs
  sharedData.error = null;
  
    // Store the selected code and open popup - CLEAR questions and mcqs to force regeneration
    chrome.storage.local.set({ 
    selectedCode: selectedCode,
    timestamp: sharedData.timestamp,
    questions: null,  // Clear previous questions
    mcqs: null,       // Clear previous MCQs
    sidePanelData: {
      selectedCode: selectedCode,
      timestamp: sharedData.timestamp,
      questions: null,  // Clear previous questions
      mcqs: null        // Clear previous MCQs
    }
    }, () => {
      // Open the popup which will handle the API call
    try {
      chrome.action.openPopup();
    } catch (e) {
      console.error("Error opening popup:", e);
    }
    
          // Open side panel if available
    try {
      if (chrome.sidePanel) {
        // For Chrome 114+
        if (chrome.sidePanel.open) {
          // Get the current tab first to avoid "tabId and windowId" error
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs && tabs.length > 0) {
              const tabId = tabs[0].id;
              chrome.sidePanel.open({tabId}).catch(e => {
                console.warn("Error opening side panel with open API:", e);
              });
              console.log("Side panel opened with open API for tab", tabId);
            } else {
              console.warn("No active tab found for side panel");
            }
          });
        }
        // For Chrome 116+
        else if (chrome.sidePanel.setPanelBehavior) {
          chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
            .then(() => chrome.action.openPopup())
            .catch(e => console.warn("Error with side panel behavior:", e));
          console.log("Using setPanelBehavior for side panel");
        }
      }
    } catch (e) {
      console.error("Error opening side panel:", e);
    }
    
    // Notify any open side panels
    notifySidePanels();
  });
}

// Function to notify open side panels about data changes
function notifySidePanels() {
  console.log("Notifying side panels of data changes");
  
  // First update the shared data in storage for any side panel that loads later
  try {
    chrome.storage.local.set({
      sidePanelData: {
        questions: sharedData.questions,
        mcqs: sharedData.mcqs,
        selectedCode: sharedData.selectedCode,
        timestamp: sharedData.timestamp,
        error: sharedData.error
      },
      sidePanelTimestamp: sharedData.timestamp
    }).then(() => {
      console.log("Side panel data stored in local storage");
    }).catch(error => {
      console.error("Error storing side panel data:", error);
    });
  } catch (error) {
    console.error("Error accessing storage:", error);
  }
  
  // Then try to notify any active tabs
  try {
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError) {
        console.warn("Error querying tabs:", chrome.runtime.lastError);
        return;
      }
      
      tabs.forEach(tab => {
        try {
          console.log(`Sending updateSidePanel message to tab ${tab.id}`);
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateSidePanel',
            data: {
              questions: sharedData.questions,
              mcqs: sharedData.mcqs,
              selectedCode: sharedData.selectedCode,
              timestamp: sharedData.timestamp,
              error: sharedData.error
            }
          }, response => {
            // Check for errors after sending the message
            if (chrome.runtime.lastError) {
              // This is expected for tabs without content scripts - don't log as error
              console.log(`Tab ${tab.id} has no listener:`, chrome.runtime.lastError.message);
            } else if (response) {
              console.log(`Tab ${tab.id} responded:`, response);
            }
          });
        } catch (error) {
          console.warn(`Error sending to tab ${tab.id}:`, error.message);
        }
      });
    });
  } catch (error) {
    console.error("Error in notifySidePanels:", error);
  }
}

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request.action);
  
  if (request.action === 'getConfig') {
    // Make sure CONFIG is available
    if (typeof CONFIG === 'undefined') {
      console.error("CONFIG is not defined when trying to send to content script");
      sendResponse({ error: "Configuration not available" });
      return true;
    }
    
    try {
      // Send a serializable copy of the CONFIG object
      const configCopy = JSON.parse(JSON.stringify(CONFIG));
      
      // Instead of trying to recreate the getCurrentModel function, we'll remove API if it exists
      // since we've updated the code to not rely on it
      if (configCopy.API) {
        delete configCopy.API;
      }
      
      sendResponse({ config: configCopy });
    } catch (error) {
      console.error("Error serializing CONFIG:", error);
      sendResponse({ error: "Failed to serialize configuration" });
    }
    return true;
  }
  
  if (request.action === 'storeQuestions') {
    // Update shared data
    sharedData.questions = request.questions;
    sharedData.mcqs = request.mcqs;
    sharedData.selectedCode = request.selectedCode;
    sharedData.error = request.error;
    sharedData.timestamp = Date.now();
    
    console.log("Storing question data:", {
      questions: request.questions?.length || 0,
      mcqs: request.mcqs?.length || 0,
      selectedCode: request.selectedCode ? "present" : "missing",
      error: request.error,
      timestamp: sharedData.timestamp
    });
    
    // Store generated questions in chrome.storage for popup to access
    chrome.storage.local.set({ 
      questions: request.questions,
      mcqs: request.mcqs,
      selectedCode: request.selectedCode,
      error: request.error, // Store error if present
      timestamp: sharedData.timestamp,
      sidePanelData: {
        questions: request.questions,
        mcqs: request.mcqs,
        selectedCode: request.selectedCode,
        timestamp: sharedData.timestamp
      }
    }, () => {
      // Open the popup after storing the data
      try {
        chrome.action.openPopup();
        notifySidePanels();
        sendResponse({ success: true });
      } catch (error) {
        console.error("Error opening popup:", error);
        sendResponse({ success: false, error: error.message });
      }
    });
    return true; // Required for async sendResponse
  }
  
  // Handle synchronization between popup and side panel
  if (request.action === 'syncWithSidePanel') {
    // Update shared data
    if (request.data) {
      sharedData.questions = request.data.questions;
      sharedData.mcqs = request.data.mcqs;
      sharedData.selectedCode = request.data.selectedCode;
      sharedData.timestamp = Date.now();
    }
    
    console.log("Syncing with side panel:", request.data);
    
    // Store the data in storage for the side panel to access
    chrome.storage.local.set({
      sidePanelData: sharedData,
      sidePanelTimestamp: sharedData.timestamp
    }, () => {
      console.log("Stored side panel data for synchronization");
      
        // Try to open the side panel with the current tab
      try {
        if (chrome.sidePanel && chrome.sidePanel.open) {
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs && tabs.length > 0) {
              const tabId = tabs[0].id;
              chrome.sidePanel.open({tabId});
              console.log("Side panel opened for tab", tabId);
            } else {
              console.warn("No active tab found for side panel");
            }
          });
        }
        
        // Notify any open side panels
        notifySidePanels();
        
        sendResponse({ success: true });
      } catch (error) {
        console.error("Error opening side panel:", error);
        sendResponse({ success: false, error: error.message });
      }
    });
    return true;
  }
  
  // Handle side panel data request
  if (request.action === 'getSidePanelData') {
    console.log("getSidePanelData request received");
    
    // First try to use shared data
    if (sharedData.selectedCode && sharedData.timestamp && 
        Date.now() - sharedData.timestamp < 300000) { // 5 minutes
      console.log("Returning shared data:", {
        timestamp: sharedData.timestamp,
        questions: sharedData.questions?.length || 0,
        mcqs: sharedData.mcqs?.length || 0,
        selectedCode: sharedData.selectedCode ? "present" : "missing"
      });
      
      sendResponse({
        data: sharedData,
        timestamp: sharedData.timestamp
      });
      return true;
    }
    
    // If shared data not available or too old, check storage
    chrome.storage.local.get(['sidePanelData', 'sidePanelTimestamp', 'questions', 'mcqs', 'selectedCode', 'timestamp'], (data) => {
      // First try to use sidePanelData
      if (data.sidePanelData && data.sidePanelTimestamp && 
          Date.now() - data.sidePanelTimestamp < 300000) {
        
        console.log("Returning sidePanelData from storage:", {
          timestamp: data.sidePanelTimestamp,
          questions: data.sidePanelData.questions?.length || 0,
          mcqs: data.sidePanelData.mcqs?.length || 0,
          selectedCode: data.sidePanelData.selectedCode ? "present" : "missing"
        });
        
      sendResponse({
        data: data.sidePanelData,
        timestamp: data.sidePanelTimestamp
        });
        return;
      }
      
      // Otherwise try to use regular data
      if (data.questions && data.mcqs && data.selectedCode && data.timestamp &&
          Date.now() - data.timestamp < 300000) {
        
        console.log("Returning regular data from storage:", {
          timestamp: data.timestamp,
          questions: data.questions.length,
          mcqs: data.mcqs.length,
          selectedCode: "present"
        });
        
        const responseData = {
          questions: data.questions,
          mcqs: data.mcqs,
          selectedCode: data.selectedCode
        };
        sendResponse({
          data: responseData,
          timestamp: data.timestamp
        });
        return;
      }
      
      // If we get here, no suitable data found
      console.log("No suitable data found for side panel");
      sendResponse({
        data: null,
        timestamp: null
      });
    });
    return true;
  }
  
  return false;
}); 