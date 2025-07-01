// Function to show error state
function showErrorState(message) {
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const codePreview = document.getElementById('codePreview');
  const tabsContainer = document.getElementById('tabsContainer');
  const practiceQuestionsContent = document.getElementById('practiceQuestionsContent');
  const mcqsContent = document.getElementById('mcqsContent');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const sidePanelBtn = document.getElementById('sidePanelBtn');
  
  if (loadingState) loadingState.classList.add('hidden');
  if (emptyState) emptyState.classList.add('hidden');
  if (codePreview) codePreview.classList.add('hidden');
  if (tabsContainer) tabsContainer.classList.add('hidden');
  if (practiceQuestionsContent) practiceQuestionsContent.classList.add('hidden');
  if (mcqsContent) mcqsContent.classList.add('hidden');
  
  // Make sure side panel button is visible during errors
  if (sidePanelBtn) sidePanelBtn.classList.remove('hidden');
  
  if (errorMessage) errorMessage.textContent = message || "Something went wrong. Please try again.";
  if (errorState) errorState.classList.remove('hidden');
}

// Add DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
  // Check if CONFIG is defined
  if (typeof CONFIG === 'undefined') {
    console.error('CONFIG is not defined in popup.js');
    
    // Get CONFIG from background script
    chrome.runtime.sendMessage({ action: 'getConfig' }, response => {
      if (response && response.config) {
        // Set CONFIG globally
        window.CONFIG = response.config;
        console.log('CONFIG loaded from background script');
        
        // Initialize the popup with the loaded CONFIG
        initializePopup();
      } else {
        console.error('Failed to get CONFIG from background script');
        // Show error state
        showErrorState('Configuration failed to load. Please try refreshing the extension.');
      }
    });
  } else {
    // Initialize popup if CONFIG is already available
    initializePopup();
  }
});

// Function to initialize the popup
function initializePopup() {
// DOM elements
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const codePreview = document.getElementById('codePreview');
const codeSnippet = document.getElementById('codeSnippet');
const tabsContainer = document.getElementById('tabsContainer');
const practiceQuestionsTab = document.getElementById('practiceQuestionsTab');
const mcqsTab = document.getElementById('mcqsTab');
const practiceQuestionsContent = document.getElementById('practiceQuestionsContent');
const mcqsContent = document.getElementById('mcqsContent');
const practiceQuestionsList = document.getElementById('practiceQuestionsList');
const mcqsList = document.getElementById('mcqsList');
const settingsBtn = document.getElementById('settingsBtn');
const manualCodeInput = document.getElementById('manualCodeInput');
const generateBtn = document.getElementById('generateBtn');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const settingsFromErrorBtn = document.getElementById('settingsFromErrorBtn');
  const modelSelectorBtn = document.getElementById('modelSelectorBtn');
  const currentModelLabel = document.getElementById('currentModelLabel');
  const modelDropdown = document.getElementById('modelDropdown');
  const refreshBtn = document.getElementById('refreshBtn');

// Navigation elements
const practiceQuestionsNav = document.getElementById('practiceQuestionsNav');
const prevPracticeQuestion = document.getElementById('prevPracticeQuestion');
const nextPracticeQuestion = document.getElementById('nextPracticeQuestion');
const practiceQuestionCounter = document.getElementById('practiceQuestionCounter');
const mcqsNav = document.getElementById('mcqsNav');
const prevMcq = document.getElementById('prevMcq');
const nextMcq = document.getElementById('nextMcq');
const mcqCounter = document.getElementById('mcqCounter');

// Track current question index
let currentPracticeQuestionIndex = 0;
let currentMcqIndex = 0;
let practiceQuestionCards = [];
let mcqCards = [];

  // Show loading state initially
  showLoadingState();
  
  // Initialize the popup
  (async function() {
  try {
    // Check if we have questions in storage
    const { questions, mcqs, selectedCode, error, timestamp } = await chrome.storage.local.get(['questions', 'mcqs', 'selectedCode', 'error', 'timestamp']);
    
    // If there's an error, show error state
    if (error) {
      showErrorState(error);
      return;
    }
    
    // Check if we have questions and they're recent (within last 5 seconds)
    const currentTime = Date.now();
    const isRecent = timestamp && (currentTime - timestamp < 5000);
    
    // Only show existing questions if they exist and are not null
    if (questions && questions.length > 0 && mcqs && mcqs.length > 0 && selectedCode && isRecent) {
      // Show the questions
      showQuestions(questions, mcqs, selectedCode);
    } 
    // If we have selected code but questions are missing or null, generate new ones
    else if (selectedCode && isRecent) {
      console.log("Found selected code, generating questions...");
      // Put the code in the manual input field
      manualCodeInput.value = selectedCode;
      // Generate questions from the selected code
      generateQuestionsFromManualInput(selectedCode);
    }
    else {
      // Show empty state or clear old data
      showEmptyState();
      chrome.storage.local.remove(['questions', 'mcqs', 'selectedCode', 'error', 'timestamp']);
    }
  } catch (error) {
    showEmptyState();
  }
  })();
  
  // Set up tab switching
  setupTabs();
  
  // Set up settings button
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Set up side panel button
  const sidePanelBtn = document.getElementById('sidePanelBtn');
  if (sidePanelBtn) {
    sidePanelBtn.addEventListener('click', async () => {
      try {
        // Get the current active tab
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (activeTab && activeTab.id) {
          // Get current state from storage
          const state = await chrome.storage.local.get(['questions', 'mcqs', 'selectedCode', 'timestamp']);
          
          // Sync data with side panel before opening it
          await chrome.runtime.sendMessage({
            action: 'syncWithSidePanel',
            data: state
          });
          
          try {
            // Open the side panel for the current tab
            await chrome.sidePanel.open({ tabId: activeTab.id });
            
            // Close the popup
            window.close();
          } catch (sidePanelError) {
            console.error("Error opening side panel:", sidePanelError);
            // Show a brief notification that there was an error
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded shadow-md z-50';
            notification.textContent = 'Error opening side panel. Try again.';
            document.body.appendChild(notification);
            
            // Remove notification after 3 seconds
            setTimeout(() => {
              notification.remove();
            }, 3000);
          }
        } else {
          console.error("No active tab found");
        }
      } catch (error) {
        console.error("Error preparing side panel data:", error);
      }
    });
  }
  
  // Set up settings button in error state
  settingsFromErrorBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Set up manual code input
  generateBtn.addEventListener('click', () => {
    const code = manualCodeInput.value.trim();
    if (code) {
      generateQuestionsFromManualInput(code);
    }
  });
  
  // Set up retry button
  retryBtn.addEventListener('click', () => {
    errorState.classList.add('hidden');
    // Clear any stored error
    chrome.storage.local.remove('error');
    const code = manualCodeInput.value.trim();
    if (code) {
      generateQuestionsFromManualInput(code);
    } else {
      showEmptyState();
    }
  });
  
  // Set up model selector
  setupModelSelector();
  
  // Set up refresh button
  refreshBtn.addEventListener('click', async () => {
    // Add spinning animation to refresh button icon
    const svgIcon = refreshBtn.querySelector('svg');
    svgIcon.classList.add('animate-spin');
    
    try {
      // Get the current code
      let code = '';
      
      // If we have code in the text area
      if (manualCodeInput.value.trim()) {
        code = manualCodeInput.value.trim();
      }
      // Or if we have code in the preview
      else if (codeSnippet.textContent.trim()) {
        code = codeSnippet.textContent.trim();
      }
      
      if (code) {
        // Show loading state
        showLoadingState();
        
        // Wait a moment before generating questions (to show loading animation)
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Generate questions with the selected model
        await generateQuestionsFromManualInput(code);
        
        // Show success effect on the refresh button
        refreshBtn.classList.add('text-green-500');
        setTimeout(() => {
          refreshBtn.classList.remove('text-green-500');
        }, 1000);
      }
    } catch (error) {
      console.error('Error refreshing questions:', error);
      
      // Show error effect on the refresh button
      refreshBtn.classList.add('text-red-500');
      setTimeout(() => {
        refreshBtn.classList.remove('text-red-500');
      }, 1000);
    } finally {
      // Remove spinning animation when done
      setTimeout(() => {
        svgIcon.classList.remove('animate-spin');
      }, 500);
    }
  });
}

// Function to set up model selector
function setupModelSelector() {
  try {
    // Ensure CONFIG is available
    if (!window.CONFIG) {
      console.error("CONFIG is not available in setupModelSelector");
      throw new Error("Extension configuration not loaded properly");
    }
    
    // Check if we have the expected structure
    if (!CONFIG.MODELS) {
      console.error("CONFIG.MODELS is not defined");
      throw new Error("Invalid configuration structure");
    }
    
    // Populate dropdown with model options
    Object.entries(CONFIG.MODELS).forEach(([modelKey, model]) => {
      const modelOption = document.createElement('button');
      modelOption.className = 'block w-full text-left px-4 py-2 text-xs text-indigo-600 hover:bg-indigo-50 transition-all duration-100';
      modelOption.textContent = model.label || modelKey;
      modelOption.dataset.modelKey = modelKey;
      
      modelDropdown.appendChild(modelOption);
      
      // Add click event to select model
      modelOption.addEventListener('click', async () => {
        // Save selected model to Chrome storage
        await chrome.storage.local.set({ selectedModel: modelKey });
        
        // Also save to localStorage for getCurrentModel
        localStorage.setItem('selectedModel', modelKey);
        
        // Save the model label for the sidebar to use
        await chrome.storage.sync.set({ selectedModelLabel: model.label || modelKey });
        
        // Update model label
        currentModelLabel.textContent = model.label || modelKey;
        
        // Hide dropdown
        modelDropdown.classList.add('hidden');
        
        // Update selected model in dropdown
        updateSelectedModelInDropdown(modelKey);
      });
    });
    
    // Load currently selected model
    chrome.storage.local.get('selectedModel').then(({ selectedModel }) => {
      // If we have a saved model in Chrome storage
      if (selectedModel && CONFIG.MODELS[selectedModel]) {
        // Set current model label
        const modelLabel = CONFIG.MODELS[selectedModel].label || selectedModel;
        currentModelLabel.textContent = modelLabel;
        
        // Sync with localStorage
        localStorage.setItem('selectedModel', selectedModel);
        
        // Save the model label for the sidebar to use
        chrome.storage.sync.set({ selectedModelLabel: modelLabel });
        
        // Update selected model in dropdown
        updateSelectedModelInDropdown(selectedModel);
      } else {
        // Use default or localStorage value
        const localModel = localStorage.getItem('selectedModel') || CONFIG.SELECTED_MODEL;
        
        // Validate that the model exists in CONFIG.MODELS
        const validModel = CONFIG.MODELS[localModel] ? localModel : CONFIG.SELECTED_MODEL;
        
        // Get the model label
        const modelLabel = CONFIG.MODELS[validModel]?.label || validModel;
        
        // Save to Chrome storage for consistency
        chrome.storage.local.set({ selectedModel: validModel });
        
        // Save the model label for the sidebar to use
        chrome.storage.sync.set({ selectedModelLabel: modelLabel });
        
        // Update label
        currentModelLabel.textContent = modelLabel;
        
        // Update selected model in dropdown
        updateSelectedModelInDropdown(validModel);
      }
    });
    
    // Toggle dropdown visibility when clicking the model selector button
    modelSelectorBtn.addEventListener('click', () => {
      modelDropdown.classList.toggle('hidden');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
      if (!modelSelectorBtn.contains(event.target) && !modelDropdown.contains(event.target)) {
        modelDropdown.classList.add('hidden');
      }
    });
  } catch (error) {
    console.error("Error in setupModelSelector:", error);
    // Set a default model label
    currentModelLabel.textContent = "Default";
    
    // Disable the model selector button
    modelSelectorBtn.disabled = true;
    modelSelectorBtn.classList.add('opacity-50');
    
    // Show error message as tooltip
    modelSelectorBtn.title = "Configuration error: " + error.message;
  }
}

// Function to update the selected model in the dropdown
function updateSelectedModelInDropdown(selectedModelKey) {
  // Remove 'selected' class from all options
  modelDropdown.querySelectorAll('button').forEach(btn => {
    btn.classList.remove('font-medium', 'bg-indigo-50');
    
    // Remove check icon if it exists
    const checkIcon = btn.querySelector('.check-icon');
    if (checkIcon) {
      btn.removeChild(checkIcon);
    }
  });
  
  // Add 'selected' class to currently selected option
  const selectedOption = modelDropdown.querySelector(`button[data-model-key="${selectedModelKey}"]`);
  if (selectedOption) {
    selectedOption.classList.add('font-medium', 'bg-indigo-50');
    
    // Add check icon
    const checkIcon = document.createElement('span');
    checkIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    `;
    checkIcon.className = 'check-icon absolute right-3 top-1/2 transform -translate-y-1/2';
    selectedOption.appendChild(checkIcon);
  }
}

// Function to clean text from special characters
function cleanText(text) {
  return text
    .replace(/```[\s\S]*?```/g, 'Code snippet') // Replace code blocks with simple text
    .replace(/`([^`]+)`/g, "'$1'") // Replace inline code with quotes
    .replace(/`/g, "'") // Replace any remaining backticks with single quotes
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold markdown (double asterisks)
    .replace(/\*([^*]+)\*/g, "$1") // Remove italic markdown (single asterisks)
    .replace(/\*/g, "") // Remove any remaining asterisks
    .replace(/[']/g, "'")   // Replace special single quotes
    .replace(/["]/g, '"')   // Replace special double quotes
    .replace(/[""]/g, '"')  // Replace curly quotes
    .replace(/['']/g, "'")  // Replace curly single quotes
    .replace(/[–—]/g, '-'); // Replace special dashes
}

// Function to generate questions from manual input
async function generateQuestionsFromManualInput(code) {
  showLoadingState();
  
  // Clear previous questions and errors from storage
  await chrome.storage.local.remove(['questions', 'mcqs', 'selectedCode', 'error']);
  
  try {
    // Ensure CONFIG is available
    if (!window.CONFIG) {
      console.error("CONFIG is not available in generateQuestionsFromManualInput");
      throw new Error("Extension configuration not loaded properly");
    }
    
    // Get selected model
    const { selectedModel } = await chrome.storage.local.get('selectedModel');
    
    // Validate selected model exists in CONFIG
    if (!selectedModel || !CONFIG.MODELS[selectedModel]) {
      console.warn("Selected model not found in CONFIG:", selectedModel);
      throw new Error("Invalid model selected. Please select a different model.");
    }
    
    const currentModel = CONFIG.MODELS[selectedModel];
    
    // Get API key
      const { geminiKey } = await chrome.storage.sync.get('geminiKey');
    const key = geminiKey || currentModel.DEFAULT_KEY;
    
    if (!key) {
      throw new Error("No API key available. Please add your API key in the extension options.");
    }
    
    // First, do a simple test to verify the API key works
    try {
      let testResponse;
      
      testResponse = await fetch(`${currentModel.BASE_URL}/${currentModel.id}:generateContent?key=${key}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: "Hello, please respond with the word 'working' if you can see this message."
              }]
            }]
          })
        });
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        throw new Error(`API key validation failed (${testResponse.status}): ${errorText}`);
      }
    } catch (testError) {
      throw new Error(`API key test failed: ${testError.message}`);
    }
    
    // Prepare the prompt for AI
    const prompt = `
      I have the following code snippet:
      \`\`\`
      ${code}
      \`\`\`
      
      Based on this code, please generate:
      1. 3 syntax MCQs that ask the user to identify the correct syntax related to this code. Each question should have 4 options with only one correct answer.
      2. 3 concept MCQs related to this code with 4 options each and the correct answer marked.
      
      For the syntax MCQs, focus on:
      - Finding correct syntax without errors
      - Identifying proper syntax for specific operations
      - Recognizing valid syntax patterns
      
      IMPORTANT: Please do not use backticks (\`) or code formatting in questions or answers. If you need to refer to code elements, just use quotes or italics.
      
      Format the response as a JSON object with the following structure:
      {
        "practiceQuestions": [
          {"question": "Which of the following is the correct syntax for...", "options": ["A. syntax1", "B. syntax2", "C. syntax3", "D. syntax4"], "correctAnswer": "A"},
          {"question": "Find the correct syntax to...", "options": ["A. syntax1", "B. syntax2", "C. syntax3", "D. syntax4"], "correctAnswer": "B"},
          {"question": "Select the valid syntax for...", "options": ["A. syntax1", "B. syntax2", "C. syntax3", "D. syntax4"], "correctAnswer": "C"}
        ],
        "mcqs": [
          {"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctAnswer": "A"},
          {"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctAnswer": "B"},
          {"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctAnswer": "C"}
        ]
      }
    `;
    
    // Call the API
    let response;
    let responseText;
    
      // Call Gemini API
    const apiUrl = `${currentModel.BASE_URL}/${currentModel.id}:generateContent?key=${key}`;
    response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      // Extract text from Gemini response format
      if (!data.candidates || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0].text) {
        throw new Error("Invalid API response structure - missing expected data");
      }
      
      responseText = data.candidates[0].content.parts[0].text;
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid API response format - could not extract JSON");
    }
    
    try {
      const questionsData = JSON.parse(jsonMatch[0]);
      
      // Validate the structure
      if (!questionsData.practiceQuestions || !questionsData.mcqs || 
          !Array.isArray(questionsData.practiceQuestions) || !Array.isArray(questionsData.mcqs)) {
        throw new Error("Invalid response format - missing required arrays");
      }

      // Clean all text in the questions and answers
      const cleanedData = {
        practiceQuestions: questionsData.practiceQuestions.map(q => ({
          question: cleanText(q.question),
          options: q.options ? q.options.map(opt => cleanText(opt)) : [],
          correctAnswer: cleanText(q.correctAnswer || "")
        })),
        mcqs: questionsData.mcqs.map(q => ({
          question: cleanText(q.question),
          options: q.options.map(opt => cleanText(opt)),
          correctAnswer: cleanText(q.correctAnswer)
        }))
      };
      
      // Store the questions and code in Chrome storage
      await chrome.storage.local.set({
        questions: cleanedData.practiceQuestions,
        mcqs: cleanedData.mcqs,
        selectedCode: code,
        timestamp: Date.now()
      });
      
      // Show the questions
      showQuestions(cleanedData.practiceQuestions, cleanedData.mcqs, code);
      
    } catch (parseError) {
      throw new Error(`Failed to parse API response: ${parseError.message}`);
    }
  } catch (error) {
    console.error('Error generating questions:', error);
    showErrorState(error.message);
    
    // Store the error in Chrome storage
    await chrome.storage.local.set({
      error: error.message,
      timestamp: Date.now()
    });
  }
}

// Function to show loading state
function showLoadingState() {
  emptyState.classList.add('hidden');
  codePreview.classList.add('hidden');
  tabsContainer.classList.add('hidden');
  practiceQuestionsContent.classList.add('hidden');
  mcqsContent.classList.add('hidden');
  errorState.classList.add('hidden');
  loadingState.classList.remove('hidden');
  
  // Hide side panel button only during loading
  const sidePanelBtn = document.getElementById('sidePanelBtn');
  if (sidePanelBtn) {
    sidePanelBtn.classList.add('hidden');
  }
}

// Function to show empty state
function showEmptyState() {
  loadingState.classList.add('hidden');
  codePreview.classList.add('hidden');
  tabsContainer.classList.add('hidden');
  practiceQuestionsContent.classList.add('hidden');
  mcqsContent.classList.add('hidden');
  errorState.classList.add('hidden');
  emptyState.classList.remove('hidden');
  
  // Make sure side panel button is visible in empty state
  const sidePanelBtn = document.getElementById('sidePanelBtn');
  if (sidePanelBtn) {
    sidePanelBtn.classList.remove('hidden');
  }
}

// Function to show questions
function showQuestions(questions, mcqs, selectedCode) {
  // Hide loading and empty states
  loadingState.classList.add('hidden');
  emptyState.classList.add('hidden');
  errorState.classList.add('hidden');
  
  // Show code preview, tabs, and content
  codePreview.classList.remove('hidden');
  tabsContainer.classList.remove('hidden');
  practiceQuestionsContent.classList.remove('hidden');
  
  // Make sure side panel button is visible when showing questions
  const sidePanelBtn = document.getElementById('sidePanelBtn');
  if (sidePanelBtn) {
    sidePanelBtn.classList.remove('hidden');
  }
  
  // Set the code snippet
  codeSnippet.textContent = selectedCode;
  
  // Create practice questions
  createPracticeQuestions(questions);
  
  // Create MCQs
  createMCQs(mcqs);
}

// Function to create practice questions (now syntax MCQs)
function createPracticeQuestions(questions) {
  practiceQuestionsList.innerHTML = '';
  practiceQuestionCards = [];
  currentPracticeQuestionIndex = 0;
  
  if (questions.length === 0) {
    return;
  }
  
  questions.forEach((q, index) => {
    const questionCard = document.createElement('div');
    questionCard.className = 'question-card glass-effect rounded-xl shadow-lg p-6 border border-gray-100 transition-all duration-300 animate-fade-in hover-scale';
    // Hide all cards except the first one
    if (index !== 0) {
      questionCard.classList.add('hidden');
    }
    
    const questionHeader = document.createElement('div');
    questionHeader.className = 'flex justify-between items-center';
    
    const questionTitle = document.createElement('h3');
    questionTitle.className = 'text-sm font-medium text-indigo-600';
    questionTitle.textContent = `Syntax Question ${index + 1}`;
    
    questionHeader.appendChild(questionTitle);
    
    const questionText = document.createElement('p');
    questionText.className = 'mt-3 text-sm text-gray-700 leading-relaxed';
    questionText.textContent = q.question || "Find the correct syntax:";
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'mt-4 space-y-2';
    
    questionCard.appendChild(questionHeader);
    questionCard.appendChild(questionText);
    questionCard.appendChild(optionsContainer);
    
    // Create options (either from API or generate from question object)
    const options = q.options || generateSyntaxOptions(q);
    if (options && Array.isArray(options)) {
      options.forEach((option, optIndex) => {
        const optionBtn = document.createElement('button');
        optionBtn.className = 'mcq-option w-full text-left p-3 rounded-lg text-sm hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm';
        
        // Extract option letter (A, B, C, D)
        let optionLetter = '';
        if (option.match(/^[A-D]\.\s/)) {
          optionLetter = option.substring(0, 1);
          optionBtn.textContent = option;
        } else {
          // If option doesn't start with letter, use index
          optionLetter = String.fromCharCode(65 + optIndex); // A, B, C, D
          optionBtn.textContent = `${optionLetter}. ${option}`;
        }
        
        // Check if this is the correct answer
        const isCorrect = q.correctAnswer && 
          (q.correctAnswer === optionLetter || 
           q.correctAnswer.startsWith(optionLetter + '.'));
        
        // Store whether this option is correct
        optionBtn.dataset.correct = isCorrect;
        
        optionsContainer.appendChild(optionBtn);
        
        // Add event listener for option selection
        optionBtn.addEventListener('click', (e) => {
          // If already answered, don't do anything
          if (optionsContainer.querySelector('.selected')) {
            return;
          }
          
          // Mark this option as selected
          optionBtn.classList.add('selected');
          
          // Show feedback based on correctness
          if (isCorrect) {
            optionBtn.classList.add('bg-green-50', 'border-green-300', 'text-green-800');
            showFeedback(true);
          } else {
            optionBtn.classList.add('bg-red-50', 'border-red-300', 'text-red-800');
            showFeedback(false);
            
            // Show the correct answer
            const correctOption = Array.from(optionsContainer.querySelectorAll('button')).find(
              btn => btn.dataset.correct === 'true'
            );
            if (correctOption) {
              correctOption.classList.add('bg-green-50', 'border-green-300', 'text-green-800');
            }
          }
        });
      });
    }
    
    practiceQuestionsList.appendChild(questionCard);
    practiceQuestionCards.push(questionCard);
  });
  
  // Show navigation if there's more than one question
  if (questions.length > 1) {
    practiceQuestionsNav.classList.remove('hidden');
    updatePracticeQuestionCounter();
    
    // Add event listeners for navigation buttons
    prevPracticeQuestion.addEventListener('click', showPreviousPracticeQuestion);
    nextPracticeQuestion.addEventListener('click', showNextPracticeQuestion);
    
    // Update button states
    updatePracticeNavigationButtons();
  } else {
    practiceQuestionsNav.classList.add('hidden');
  }
}

// Helper function to generate syntax options if none provided by API
function generateSyntaxOptions(question) {
  // This function would ideally not be needed as we want options from the API
  // But included as fallback to generate sample syntax options
  if (question.answer) {
    // If we have a single answer in the old format, create 4 options with one correct
    const correctSyntax = question.answer;
    
    // Create variations with common syntax errors
    return [
      correctSyntax, // The correct one
      correctSyntax.replace(/;/g, ''), // Remove semicolons
      correctSyntax.replace(/\{/g, '[').replace(/\}/g, ']'), // Wrong brackets
      correctSyntax.replace(/\./g, ',') // Replace dots with commas
    ];
  }
  
  // Default generic options
  return [
    "for (let i = 0; i < array.length; i++) { console.log(i); }",
    "for (let i = 0, i < array.length, i++) { console.log(i); }",
    "for (let i = 0; i < array.length; i++); { console.log(i); }",
    "for (let i = 0; i < array.length; i) { console.log(i); }"
  ];
}

// Function to show feedback popup
function showFeedback(isCorrect) {
  // Remove any existing feedback
  const existingFeedback = document.querySelector('.answer-feedback');
  if (existingFeedback) {
    existingFeedback.remove();
  }
  
  // Create feedback element
  const feedback = document.createElement('div');
  feedback.className = `answer-feedback ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`;
  feedback.textContent = isCorrect ? '✨ Correct!' : '❌ Try Again';
  
  // Add to body
  document.body.appendChild(feedback);
  
  // Remove after animation
  setTimeout(() => {
    feedback.style.animation = 'fadeIn 0.3s reverse';
    setTimeout(() => feedback.remove(), 300);
  }, 1500);
}

// Function to create MCQs
function createMCQs(mcqs) {
  mcqsList.innerHTML = '';
  mcqCards = [];
  currentMcqIndex = 0;
  
  if (mcqs.length === 0) {
    return;
  }
  
  mcqs.forEach((q, index) => {
    const mcqCard = document.createElement('div');
    mcqCard.className = 'question-card glass-effect rounded-xl shadow-lg p-6 border border-gray-100 transition-all duration-300 animate-fade-in hover-scale';
    // Hide all cards except the first one
    if (index !== 0) {
      mcqCard.classList.add('hidden');
    }
    
    const questionTitle = document.createElement('h3');
    questionTitle.className = 'text-sm font-medium text-indigo-600';
    questionTitle.textContent = `Question ${index + 1}`;
    
    const questionText = document.createElement('p');
    questionText.className = 'mt-3 text-sm text-gray-700 leading-relaxed';
    questionText.textContent = q.question;
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'mt-4 space-y-2';
    
    mcqCard.appendChild(questionTitle);
    mcqCard.appendChild(questionText);
    mcqCard.appendChild(optionsContainer);
    
    // Create options
    q.options.forEach((option, optIndex) => {
      const optionBtn = document.createElement('button');
      optionBtn.className = 'mcq-option w-full text-left p-3 rounded-lg text-sm hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm';
      optionBtn.textContent = option;
      optionBtn.dataset.correct = option.startsWith(q.correctAnswer.split('.')[0]);
      
      optionsContainer.appendChild(optionBtn);
      
      // Add event listener for option selection
      optionBtn.addEventListener('click', (e) => {
        // If already answered, don't do anything
        if (optionsContainer.querySelector('.selected')) {
          return;
        }
        
        // Mark this option as selected
        optionBtn.classList.add('selected');
        
        // Check if answer is correct
        const isCorrect = optionBtn.dataset.correct === 'true';
        
        // Show feedback popup
        showFeedback(isCorrect);
        
        // After a short delay, show all correct/incorrect answers
        setTimeout(() => {
          optionsContainer.querySelectorAll('.mcq-option').forEach(opt => {
            if (opt.dataset.correct === 'true') {
              opt.classList.add('correct', 'bg-green-50', 'border-green-200', 'text-green-800');
            } else if (opt === optionBtn && opt.dataset.correct !== 'true') {
              opt.classList.add('incorrect', 'bg-red-50', 'border-red-200', 'text-red-800');
            }
          });
        }, 300);
      });
    });
    
    mcqsList.appendChild(mcqCard);
    mcqCards.push(mcqCard);
  });
  
  // Show navigation if there's more than one question
  if (mcqs.length > 1) {
    mcqsNav.classList.remove('hidden');
    updateMcqCounter();
    
    // Add event listeners for navigation buttons
    prevMcq.addEventListener('click', showPreviousMcq);
    nextMcq.addEventListener('click', showNextMcq);
    
    // Update button states
    updateMcqNavigationButtons();
  } else {
    mcqsNav.classList.add('hidden');
  }
}

// Function to set up tab switching
function setupTabs() {
  const tabs = [
    { tab: practiceQuestionsTab, content: practiceQuestionsContent },
    { tab: mcqsTab, content: mcqsContent }
  ];
  
  tabs.forEach(({ tab, content }) => {
    tab.addEventListener('click', () => {
      // Hide all tab contents
      tabs.forEach(t => {
        t.content.classList.add('hidden');
        t.tab.classList.remove('active', 'text-indigo-600', 'border-indigo-500');
        t.tab.classList.add('text-gray-500', 'border-transparent');
      });
      
      // Show selected tab content
      content.classList.remove('hidden');
      tab.classList.add('active', 'text-indigo-600', 'border-indigo-500');
      tab.classList.remove('text-gray-500', 'border-transparent');
      
      // Reset to first question when switching tabs
      if (tab === practiceQuestionsTab && practiceQuestionCards.length > 0) {
        // Hide all practice question cards
        practiceQuestionCards.forEach(card => card.classList.add('hidden'));
        // Show the first card
        currentPracticeQuestionIndex = 0;
        practiceQuestionCards[0].classList.remove('hidden');
        updatePracticeQuestionCounter();
        updatePracticeNavigationButtons();
      } else if (tab === mcqsTab && mcqCards.length > 0) {
        // Hide all MCQ cards
        mcqCards.forEach(card => card.classList.add('hidden'));
        // Show the first card
        currentMcqIndex = 0;
        mcqCards[0].classList.remove('hidden');
        updateMcqCounter();
        updateMcqNavigationButtons();
      }
    });
  });
}

// Navigation functions for practice questions
function showPreviousPracticeQuestion() {
  if (currentPracticeQuestionIndex > 0) {
    // Hide current question
    practiceQuestionCards[currentPracticeQuestionIndex].classList.add('hidden');
    // Show previous question
    currentPracticeQuestionIndex--;
    practiceQuestionCards[currentPracticeQuestionIndex].classList.remove('hidden');
    // Update counter and button states
    updatePracticeQuestionCounter();
    updatePracticeNavigationButtons();
  }
}

function showNextPracticeQuestion() {
  if (currentPracticeQuestionIndex < practiceQuestionCards.length - 1) {
    // Hide current question
    practiceQuestionCards[currentPracticeQuestionIndex].classList.add('hidden');
    // Show next question
    currentPracticeQuestionIndex++;
    practiceQuestionCards[currentPracticeQuestionIndex].classList.remove('hidden');
    // Update counter and button states
    updatePracticeQuestionCounter();
    updatePracticeNavigationButtons();
  }
}

function updatePracticeQuestionCounter() {
  practiceQuestionCounter.textContent = `Question ${currentPracticeQuestionIndex + 1} of ${practiceQuestionCards.length}`;
}

function updatePracticeNavigationButtons() {
  // Disable/enable previous button
  if (currentPracticeQuestionIndex === 0) {
    prevPracticeQuestion.classList.add('opacity-50', 'cursor-not-allowed');
    prevPracticeQuestion.disabled = true;
  } else {
    prevPracticeQuestion.classList.remove('opacity-50', 'cursor-not-allowed');
    prevPracticeQuestion.disabled = false;
  }
  
  // Disable/enable next button
  if (currentPracticeQuestionIndex === practiceQuestionCards.length - 1) {
    nextPracticeQuestion.classList.add('opacity-50', 'cursor-not-allowed');
    nextPracticeQuestion.disabled = true;
  } else {
    nextPracticeQuestion.classList.remove('opacity-50', 'cursor-not-allowed');
    nextPracticeQuestion.disabled = false;
  }
}

// Navigation functions for MCQs
function showPreviousMcq() {
  if (currentMcqIndex > 0) {
    // Hide current question
    mcqCards[currentMcqIndex].classList.add('hidden');
    // Show previous question
    currentMcqIndex--;
    mcqCards[currentMcqIndex].classList.remove('hidden');
    // Update counter and button states
    updateMcqCounter();
    updateMcqNavigationButtons();
  }
}

function showNextMcq() {
  if (currentMcqIndex < mcqCards.length - 1) {
    // Hide current question
    mcqCards[currentMcqIndex].classList.add('hidden');
    // Show next question
    currentMcqIndex++;
    mcqCards[currentMcqIndex].classList.remove('hidden');
    // Update counter and button states
    updateMcqCounter();
    updateMcqNavigationButtons();
  }
}

function updateMcqCounter() {
  mcqCounter.textContent = `Question ${currentMcqIndex + 1} of ${mcqCards.length}`;
}

function updateMcqNavigationButtons() {
  // Disable/enable previous button
  if (currentMcqIndex === 0) {
    prevMcq.classList.add('opacity-50', 'cursor-not-allowed');
    prevMcq.disabled = true;
  } else {
    prevMcq.classList.remove('opacity-50', 'cursor-not-allowed');
    prevMcq.disabled = false;
  }
  
  // Disable/enable next button
  if (currentMcqIndex === mcqCards.length - 1) {
    nextMcq.classList.add('opacity-50', 'cursor-not-allowed');
    nextMcq.disabled = true;
  } else {
    nextMcq.classList.remove('opacity-50', 'cursor-not-allowed');
    nextMcq.disabled = false;
  }
} 