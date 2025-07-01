// Load the CONFIG object
let CONFIG = null;

// Function to get CONFIG from background script
function getConfigFromBackground() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'getConfig' }, response => {
      if (response && response.config) {
        CONFIG = response.config;
        console.log("CONFIG loaded from background script");
        resolve(CONFIG);
      } else {
        const error = new Error("Failed to get CONFIG from background script");
        console.error(error);
        reject(error);
      }
    });
  });
}

// Function to dynamically load config.js
function loadConfigScript() {
  return new Promise((resolve, reject) => {
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('config.js');
      script.onload = function() {
        // When loaded, try to access the CONFIG object
        if (typeof window.CONFIG !== 'undefined') {
          CONFIG = window.CONFIG;
          console.log("CONFIG loaded from script");
          resolve(CONFIG);
        } else {
          reject(new Error("CONFIG not found in loaded script"));
        }
        this.remove(); // Remove the script element after it loads
      };
      script.onerror = function(error) {
        reject(new Error("Failed to load config.js script"));
        this.remove();
      };
      (document.head || document.documentElement).appendChild(script);
    } catch (error) {
      reject(error);
    }
  });
}

// Initialize CONFIG when content script loads
(async function() {
  try {
    // First try to get CONFIG from background script
    await getConfigFromBackground();
  } catch (backgroundError) {
    console.warn("Failed to load CONFIG from background:", backgroundError);
    try {
      // Fallback: try to load config.js directly
      await loadConfigScript();
    } catch (scriptError) {
      console.error("Failed to load CONFIG:", scriptError);
      // Create a minimal fallback CONFIG for basic functionality
      CONFIG = {
        MODELS: {
          GEMINI_PRO: {
            provider: 'google',
            id: 'gemini-pro',
            label: 'Gemini Pro',
            BASE_URL: 'https://generativelanguage.googleapis.com/v1/models',
            DEFAULT_KEY: ''
          }
        },
        SELECTED_MODEL: 'GEMINI_PRO'
        // No API object needed - we're accessing models directly now
      };
      handleConfigError(scriptError);
    }
  }
  
  // Set up side panel communication
  setupSidePanelCommunication();
})();

// Function to handle error when CONFIG is not defined
function handleConfigError(error) {
  console.error("CONFIG error:", error);
  
  // Send error message to background script
  chrome.runtime.sendMessage({
    action: 'storeQuestions',
    error: "Extension configuration failed to load. Please try refreshing or reloading the extension.",
    timestamp: Date.now()
  });
}

// Set up communication between content script and side panel
function setupSidePanelCommunication() {
  // Create an invisible bridge element for communication with the side panel
  const sidePanelBridge = document.createElement('div');
  sidePanelBridge.id = 'codesnipex-side-panel-bridge';
  sidePanelBridge.style.display = 'none';
  document.body.appendChild(sidePanelBridge);
  
  // Create a MutationObserver to monitor for changes in side panel state
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-sync-request') {
        // Side panel is requesting data
        console.log('Side panel requested data sync');
        
        // Forward the request to the background script
        chrome.runtime.sendMessage({ action: 'getSidePanelData' }, (response) => {
          if (response && response.data) {
            try {
              // Add the data to the bridge element for the side panel to access
              sidePanelBridge.setAttribute('data-sync-response', JSON.stringify(response.data));
              
              // Create a custom event to notify the side panel
              const event = new CustomEvent('sidePanelDataReceived', { 
                detail: response.data,
                bubbles: true,
                cancelable: true
              });
              
              // Dispatch the event on both the bridge and window
              sidePanelBridge.dispatchEvent(event);
              window.dispatchEvent(event);
              
              console.log("Side panel data sent via custom event");
            } catch (error) {
              console.error("Error sending data to side panel:", error);
            }
          } else {
            console.log("No data available for side panel");
          }
        });
      }
    }
  });
  
  // Start observing the bridge element
  observer.observe(sidePanelBridge, { attributes: true });
}

// Function to notify side panel of data changes
function notifySidePanel(data) {
  console.log("Notifying side panel of data changes:", data ? {
    questions: data.questions?.length || 0,
    mcqs: data.mcqs?.length || 0,
    selectedCode: data.selectedCode ? "present" : "missing",
    timestamp: data.timestamp
  } : "No data");
  
  try {
    // If we have a bridge element, update its data
    const sidePanelBridge = document.getElementById('codesnipex-side-panel-bridge');
    if (sidePanelBridge && data) {
      sidePanelBridge.setAttribute('data-sync-response', JSON.stringify(data));
      
      // Create a custom event with proper event options
      const event = new CustomEvent('updateSidePanel', { 
        detail: data,
        bubbles: true,
        cancelable: true
      });
      
      // Dispatch the event on both the bridge and window
      sidePanelBridge.dispatchEvent(event);
      window.dispatchEvent(event);
      
      // Also try to communicate with any side panel iframes that might be present
      try {
        document.querySelectorAll('iframe').forEach(iframe => {
          try {
            if (iframe.contentWindow) {
              iframe.contentWindow.postMessage({
                action: 'updateSidePanel',
                data: data
              }, '*');
            }
          } catch (iframeError) {
            // Ignore cross-origin errors
          }
        });
      } catch (iframeError) {
        // Ignore iframe errors
      }
      
      return true;
    } else {
      console.warn("Side panel bridge element not found or no data to send");
      return false;
    }
  } catch (error) {
    console.error("Error notifying side panel:", error);
    return false;
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request.action);
  
  if (request.action === 'generateQuestions') {
    // Check if CONFIG is available
    if (!CONFIG) {
      console.error("CONFIG is not defined when processing message");
      
      // Try to load CONFIG again before giving up
      getConfigFromBackground()
        .then(() => {
          // If successful, continue with the request
          processGenerateQuestionsRequest(request, sendResponse);
        })
        .catch(error => {
          // Send error response
          const errorMsg = "Extension configuration not loaded. Please try refreshing the page.";
          
          // Use try-catch to handle potential disconnection errors
          try {
            chrome.runtime.sendMessage({
              action: 'storeQuestions',
              error: errorMsg,
              timestamp: Date.now()
            }, response => {
              // Handle the response if available
              if (chrome.runtime.lastError) {
                console.warn('Error sending message:', chrome.runtime.lastError);
              }
            });
          } catch (sendError) {
            console.error("Failed to send message to background:", sendError);
          }
          
          if (sendResponse) {
            try {
              sendResponse({received: true, error: errorMsg});
            } catch (sendError) {
              console.error("Failed to send response:", sendError);
            }
          }
        });
      
      return true; // Keep the channel open for the async response
    }
    
    // If CONFIG is available, process the request
    try {
      processGenerateQuestionsRequest(request, sendResponse);
    } catch (error) {
      console.error("Error processing request:", error);
      if (sendResponse) {
        try {
          sendResponse({received: false, error: error.message});
        } catch (sendError) {
          console.error("Failed to send error response:", sendError);
        }
      }
    }
    return true; // Keep the channel open for the async response
  }
  
  // Handle side panel data request directly from the side panel
  if (request.action === 'getSidePanelData') {
    // Forward the request to the background script
    chrome.runtime.sendMessage({ action: 'getSidePanelData' }, response => {
      if (sendResponse) {
        sendResponse(response);
      }
    });
    return true;
  }
  
  // Forward updateSidePanel message to the side panel
  if (request.action === 'updateSidePanel') {
    console.log("Forwarding updateSidePanel message to side panel");
    notifySidePanel(request.data);
    
    if (sendResponse) {
      sendResponse({ received: true });
    }
    return true;
  }
  
  return true; // Keep the message channel open for async response
});

// Function to process generateQuestions request
function processGenerateQuestionsRequest(request, sendResponse) {
  // Log the received code for debugging
  console.log("Selected code received:", request.selectedCode ? request.selectedCode.substring(0, 50) + "..." : "none");
  
  // Process the selected code
  if (request.selectedCode && request.selectedCode.trim() !== '') {
    generateQuestionsFromCode(request.selectedCode);
  } else {
    // Try to get selection from the page
    const selection = window.getSelection().toString();
    if (selection && selection.trim() !== '') {
      console.log("Using selection from content script:", selection.substring(0, 50) + "...");
      generateQuestionsFromCode(selection);
    } else {
      // Try to find a code element that might be relevant
      const codeElements = document.querySelectorAll('pre, code');
      if (codeElements.length > 0) {
        // Find the code element that's most likely in view
        let selectedElement = null;
        
        // First try to find a code element that has focus or is near the mouse
        for (const element of codeElements) {
          if (element === document.activeElement || element.contains(document.activeElement)) {
            selectedElement = element;
            break;
          }
        }
        
        // If no focused element, take the first visible one
        if (!selectedElement) {
          for (const element of codeElements) {
            const rect = element.getBoundingClientRect();
            if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
              selectedElement = element;
              break;
            }
          }
        }
        
        // If we found an element, use its text content
        if (selectedElement) {
          const codeText = selectedElement.textContent;
          if (codeText && codeText.trim() !== '') {
            console.log("Using code element text:", codeText.substring(0, 50) + "...");
          generateQuestionsFromCode(codeText);
          } else {
            showError("No code found in the selected element.");
          }
        } else {
          showError("No code element found on the page.");
        }
      } else {
        showError("No code element found on the page.");
      }
    }
  }
}

// Inject selection helper script
function injectSelectionHelper() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('selection-helper.js');
  script.onload = function() {
    this.remove(); // Remove the script element after it loads
  };
  (document.head || document.documentElement).appendChild(script);
  
  // Listen for messages from the injected script
  window.addEventListener('message', function(event) {
    // Only accept messages from the same frame
    if (event.source !== window) return;
    
    if (event.data.type && event.data.type === 'CODE_QUEST_SELECTION_RESULT') {
      if (event.data.selection) {
        console.log("Selection helper got code:", event.data.selection.substring(0, 50) + "...");
        // Process the selection
        generateQuestionsFromCode(event.data.selection);
      }
    }
  });
}

// Run the injection when content script loads
injectSelectionHelper();

// Function to display error messages
function showError(message) {
  console.error("Error:", message);
  
  // Send the error to the background script
  chrome.runtime.sendMessage({
    action: 'storeQuestions',
    error: message,
    timestamp: Date.now()
  });
}

// Function to generate questions using AI API
async function generateQuestionsFromCode(codeSnippet) {
    if (!CONFIG) {
    console.error("CONFIG not available for API call");
    showError("Configuration not available. Please refresh the page.");
    return;
  }
  
  try {
    // Get the current selected model from storage
    const { selectedModel } = await chrome.storage.local.get('selectedModel');
    
    // Get the model configuration directly from CONFIG.MODELS
    let modelConfig;
    if (selectedModel && CONFIG.MODELS[selectedModel]) {
      modelConfig = CONFIG.MODELS[selectedModel];
    } else {
      // Fallback to default model
      const defaultModelKey = CONFIG.SELECTED_MODEL || Object.keys(CONFIG.MODELS)[0];
      modelConfig = CONFIG.MODELS[defaultModelKey];
    }
    
    if (!modelConfig) {
      throw new Error("Model configuration not found");
    }
    
    // Get the API key from storage
    // Get API key - try geminiKey first, then fallback to apiKey for backward compatibility
    const apiKeyData = await chrome.storage.sync.get(['geminiKey', 'apiKey']);
    const apiKey = apiKeyData.geminiKey || apiKeyData.apiKey || modelConfig.DEFAULT_KEY;
    
    if (!apiKey) {
      throw new Error(`Gemini API key not found. Please add it in the extension options.`);
    }
    
    console.log(`Using Gemini model: ${modelConfig.id}`);
    
    // Call the Gemini API
    const response = await callGemini(codeSnippet, modelConfig, apiKey);
    const responseText = response.candidates[0].content.parts[0].text;
    
    // Process the response
    const { practiceQs, multipleChoice } = parseResponse(responseText);
    
    // Create the data to store
    const dataToStore = {
      questions: practiceQs,
      mcqs: multipleChoice,
      selectedCode: codeSnippet,
      timestamp: Date.now()
    };
    
    console.log("Generated questions:", {
      practiceQuestions: practiceQs.length,
      mcqs: multipleChoice.length
    });
    
    // Send to background script
    chrome.runtime.sendMessage({
      action: 'storeQuestions',
      ...dataToStore
    });
    
    // Also notify the side panel directly
    notifySidePanel(dataToStore);
    
    return { questions: practiceQs, mcqs: multipleChoice };
  } catch (error) {
    console.error('Error generating questions:', error);
    
    // Send error to background script
    chrome.runtime.sendMessage({
      action: 'storeQuestions',
      error: error.message,
      selectedCode: codeSnippet,
      timestamp: Date.now()
    });
    
    return { error: error.message };
  }
}

// Make API call to Gemini
async function callGemini(code, modelConfig, apiKey) {
  const prompt = createPrompt(code);
  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelConfig.id}:generateContent?key=${apiKey}`;
  
  const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: "You are a coding instructor creating practice questions from code snippets."
            },
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
        })
      });
      
      if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
      }
      
  return await response.json();
}

// Create the prompt for AI
function createPrompt(code) {
  return `
Given the following code snippet:

\`\`\`
${code}
\`\`\`

Please generate:
1. Three practice questions that test understanding of the syntax and structure of this code.
2. Two multiple-choice questions that test conceptual understanding of what this code does.

Format your response as follows:

PRACTICE QUESTIONS:
1. Question 1
2. Question 2
3. Question 3

MULTIPLE CHOICE QUESTIONS:
1. Question 1
   A. Option A
   B. Option B
   C. Option C
   D. Option D
   Correct Answer: [letter]
2. Question 2
   A. Option A
   B. Option B
   C. Option C
   D. Option D
   Correct Answer: [letter]
`;
}

// Parse the response from AI
function parseResponse(responseText) {
  try {
    console.log("Parsing response");
    
    // Initialize arrays for different question types
    const practiceQs = [];
    const multipleChoice = [];
    
    // Split the response text by sections
    const sections = responseText.split(/PRACTICE QUESTIONS:|MULTIPLE CHOICE QUESTIONS:/i);
    
    // Process practice questions
    if (sections.length > 1) {
      // Get practice questions section
      const practiceSection = sections[1].trim();
      // Split by numbered items
      const practiceItems = practiceSection.split(/\d+\.\s+/).filter(item => item.trim().length > 0);
      
      // Add each practice question to the array
      practiceItems.forEach(item => {
        const question = item.trim();
        if (question) {
          practiceQs.push({
            question,
            options: generateOptions(question)
          });
        }
      });
    }
    
    // Process multiple choice questions
    if (sections.length > 2) {
      // Get multiple choice section
      const mcqSection = sections[2].trim();
      // Use regex to match MCQ patterns
      const mcqMatches = mcqSection.match(/\d+\.\s+(.*?)(?=\s*\d+\.\s+|$)/gs) || [];
      
      // Process each MCQ
      mcqMatches.forEach(match => {
        const questionMatch = match.match(/\d+\.\s+(.*?)(?=\s*[A-D]\.)/s);
        const optionsMatch = match.match(/([A-D])\.\s+(.*?)(?=\s*[A-D]\.|\s*Correct Answer:|$)/gs);
        const correctAnswerMatch = match.match(/Correct Answer:\s*\[?([A-D])\]?/i);
        
        if (questionMatch && optionsMatch && correctAnswerMatch) {
          const question = questionMatch[1].trim();
          const correctAnswer = correctAnswerMatch[1];
          const options = [];
          
          // Process the options
          optionsMatch.forEach(opt => {
            const optionParts = opt.match(/([A-D])\.\s+(.*?)$/s);
            if (optionParts) {
              options.push(optionParts[2].trim());
            }
          });
          
          // Only add valid MCQs with sufficient options
          if (question && options.length >= 2 && correctAnswer) {
            multipleChoice.push({
              question,
              options,
              correctAnswer
            });
          }
        }
      });
    }
    
    console.log(`Parsed ${practiceQs.length} practice questions and ${multipleChoice.length} MCQs`);
    
    return {
      practiceQs,
      multipleChoice
    };
  } catch (error) {
    console.error("Error parsing response:", error);
    return {
      practiceQs: [],
      multipleChoice: []
    };
  }
}

// Helper function to generate options for practice questions
function generateOptions(question) {
  // Create 4 plausible options for the question
  // This is a simplified implementation
  return [
    'Option A',
    'Option B',
    'Option C',
    'Option D'
  ];
}