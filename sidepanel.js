// Simple sidepanel.js - Minimal implementation to ensure loading
console.log("sidepanel.js is loading...");

// Set global flag to indicate script is loading
window.sidepanelJsLoaded = false;

// Self-recovery function to check if script loaded properly
function checkScriptLoaded() {
  // If the script isn't marked as loaded after 2 seconds, try to reload it
  if (!window.sidepanelJsLoaded) {
    console.error("sidepanel.js did not initialize properly, attempting recovery");
    
    // Try to initialize again
    if (typeof initSidePanel === 'function') {
      try {
        initSidePanel();
      } catch (e) {
        console.error("Recovery failed:", e);
      }
    }
  }
}

// Set a timeout to check if initialization completed
setTimeout(checkScriptLoaded, 2000);

// Basic functionality - ensure we wait for DOM to be fully loaded
if (document.readyState === 'complete') {
  initSidePanel();
} else {
  document.addEventListener('DOMContentLoaded', initSidePanel);
  // Fallback in case DOMContentLoaded doesn't fire
  window.addEventListener('load', function() {
    if (!window.sidepanelJsLoaded) {
      initSidePanel();
    }
  });
}

function initSidePanel() {
  console.log("Initializing side panel");
  
  // Prevent double initialization
  if (window.sidepanelJsLoaded === true) {
    console.log("Side panel already initialized, skipping");
    return;
  }
  
  // Elements
  const elements = {
    // UI states
    loadingState: document.getElementById('loadingState'),
    emptyState: document.getElementById('emptyState'),
    errorState: document.getElementById('errorState'),
    codePreview: document.getElementById('codePreview'),
    tabsContainer: document.getElementById('tabsContainer'),
    
    // Code display
    codeSnippet: document.getElementById('codeSnippet'),
    codeInput: document.getElementById('codeInput'),
    
    // Buttons
    generateBtn: document.getElementById('generateBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    retryBtn: document.getElementById('retryBtn'),
    errorSettingsBtn: document.getElementById('errorSettingsBtn'),
    
    // Model display
    currentModel: document.getElementById('currentModel'),
    
    // Error display
    errorMessage: document.getElementById('errorMessage'),
    
    // Tab navigation
    practiceTab: document.getElementById('practiceTab'),
    mcqTab: document.getElementById('mcqTab'),
    practiceContent: document.getElementById('practiceContent'),
    mcqContent: document.getElementById('mcqContent'),
  };
  
  // Check if elements were found
  let elementsFound = true;
  let missingElements = [];
  for (const [key, element] of Object.entries(elements)) {
    if (!element) {
      console.error(`Element not found: ${key}`);
      missingElements.push(key);
      elementsFound = false;
    }
  }
  
  if (!elementsFound) {
    console.error("Some elements were not found. DOM might not be fully loaded:", missingElements);
    return;
  }
  
  // Check for existing questions in storage and load them
  loadExistingQuestionsFromStorage();
  
  // Basic event listeners with error handling
  try {
    elements.generateBtn.addEventListener('click', function() {
      const code = elements.codeInput.value;
      if (code) {
        console.log("Generate button clicked with code:", code.substring(0, 50) + "...");
        showLoadingState();
        
        // Simulate API call with timeout
        setTimeout(() => {
          hideLoadingState();
          showCodePreview(code);
          
          // TODO: Replace this with actual API call to generate syntax questions
          // Example API call:
          // fetch('https://api.example.com/generate-questions', {
          //   method: 'POST',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify({ code, questionTypes: ['syntax', 'concept'] })
          // })
          // .then(response => response.json())
          // .then(data => {
          //   const { syntaxQuestions, conceptQuestions } = data;
          //   chrome.storage.local.set({
          //     questions: syntaxQuestions,
          //     mcqs: conceptQuestions,
          //     selectedCode: code,
          //     timestamp: Date.now()
          //   });
          //   showQuestions(syntaxQuestions, conceptQuestions);
          // })
          // .catch(error => {
          //   console.error('Error fetching questions:', error);
          //   showErrorState();
          // });
          
          // For now, using hardcoded examples for testing
          // Create syntax MCQ questions for the first tab
          const syntaxMCQs = [
            {
              question: "Find the correct syntax to declare a constant variable in JavaScript:",
              options: [
                "constant name = value;",
                "const name = value;",
                "const: name = value;",
                "let const name = value;"
              ],
              correctAnswer: "B"
            },
            {
              question: "Which syntax correctly creates a function in JavaScript?",
              options: [
                "function myFunction() { return true; }",
                "function = myFunction() => { return true; }",
                "function:myFunction() { return true; }",
                "func myFunction() { return true; }"
              ],
              correctAnswer: "A"
            },
            {
              question: "Select the correct syntax for a for loop:",
              options: [
                "for (i = 0; i < 5; i++) {}",
                "for (i < 5; i++) {}",
                "for (i = 0; i++) {}",
                "for i = 1 to 5 {}"
              ],
              correctAnswer: "A"
            }
          ];
          
          // Create concept MCQs for the second tab
          const conceptMCQs = [
            {
              question: "Which of the following best describes the purpose of this code?",
              options: [
                "A. Sorting an array",
                "B. Event handling",
                "C. Data validation",
                "D. DOM manipulation"
              ],
              correctAnswer: "B"
            },
            {
              question: "What design pattern is demonstrated in this code?",
              options: [
                "A. Observer pattern",
                "B. Singleton pattern",
                "C. Factory pattern",
                "D. Module pattern"
              ],
              correctAnswer: "D"
            }
          ];
          
          // Store in Chrome storage for sharing between popup and sidebar
          chrome.storage.local.set({
            questions: syntaxMCQs,
            mcqs: conceptMCQs,
            selectedCode: code,
            timestamp: Date.now()
          });
          
          // Show the questions
          showQuestions(syntaxMCQs, conceptMCQs);
        }, 1500);
      } else {
        alert("Please enter some code first");
      }
    });
    
    elements.practiceTab.addEventListener('click', function() {
      switchTab('practice');
    });
    
    elements.mcqTab.addEventListener('click', function() {
      switchTab('mcq');
    });
    
    elements.refreshBtn.addEventListener('click', function() {
      console.log("Refresh button clicked");
      
      // Show loading state
      showLoadingState();
      
      // Reload questions from storage
      setTimeout(() => {
        loadExistingQuestionsFromStorage();
      }, 500);
    });
    
    elements.settingsBtn.addEventListener('click', function() {
      console.log("Settings button clicked");
      chrome.runtime.openOptionsPage();
    });
    
    // Also update the error settings button to open options page
    elements.errorSettingsBtn.addEventListener('click', function() {
      console.log("Error settings button clicked");
      chrome.runtime.openOptionsPage();
    });
    
    // Listen for storage changes to sync model selection from popup
    chrome.storage.onChanged.addListener(function(changes, namespace) {
      if (namespace === 'sync' && changes.selectedModelLabel && changes.selectedModelLabel.newValue) {
        updateModelDisplay(changes.selectedModelLabel.newValue);
      }
      
      // Listen for changes to questions in local storage
      if (namespace === 'local') {
        // Check if questions, mcqs, or selectedCode have changed
        const hasQuestionChanges = changes.questions || changes.mcqs || changes.selectedCode;
        
        if (hasQuestionChanges) {
          console.log("Questions updated in storage, refreshing sidebar");
          
          // Get the updated data from storage
          chrome.storage.local.get(['questions', 'mcqs', 'selectedCode', 'error', 'timestamp'], function(data) {
            // If there's an error, show error state
            if (data.error) {
              if (elements.errorMessage) {
                elements.errorMessage.textContent = data.error;
              }
              showErrorState();
              return;
            }
            
            // Check if we have valid data
            if (data.questions && data.mcqs && data.selectedCode) {
              // Display the code with preserved formatting
              if (elements.codeSnippet) {
                const codeElement = elements.codeSnippet.querySelector('code');
                if (codeElement) {
                  codeElement.textContent = data.selectedCode;
                  codeElement.className = 'preserve-format';
                } else {
                  elements.codeSnippet.textContent = data.selectedCode;
                }
                elements.codeSnippet.style.whiteSpace = 'pre';
              }
              
              // Show the questions
              showQuestions(data.questions, data.mcqs);
            }
          });
        }
      }
    });
    
    // Get the current model from storage when initializing
    chrome.storage.sync.get(['selectedModelLabel'], function(result) {
      if (result.selectedModelLabel) {
        updateModelDisplay(result.selectedModelLabel);
    } else {
        // Try to get the default model from CONFIG
        if (typeof CONFIG !== 'undefined' && CONFIG.MODELS && CONFIG.SELECTED_MODEL) {
          const defaultModel = CONFIG.MODELS[CONFIG.SELECTED_MODEL];
          if (defaultModel && defaultModel.label) {
            updateModelDisplay(defaultModel.label);
          }
        }
      }
    });
    
    // Close dropdown when clicking elsewhere
    document.addEventListener('click', function() {
      // No dropdown to close anymore, but keeping the event handler for future use
    });
  } catch (e) {
    console.error("Error setting up event listeners:", e);
  }
  
  // Function to update the model display
  function updateModelDisplay(modelLabel) {
    if (elements.currentModel) {
      elements.currentModel.textContent = modelLabel;
      console.log("Model display updated to:", modelLabel);
    }
  }
  
  // UI state functions
  function showLoadingState() {
    elements.loadingState.classList.remove('hidden');
    elements.emptyState.classList.add('hidden');
    elements.errorState.classList.add('hidden');
    elements.tabsContainer.classList.add('hidden');
    elements.codePreview.classList.add('hidden');
  }
  
  function hideLoadingState() {
    elements.loadingState.classList.add('hidden');
  }
  
  function showCodePreview(code) {
    // Get the code element inside the pre tag
    const codeElement = elements.codeSnippet.querySelector('code');
    
    if (codeElement) {
      // Set content to the code element
      codeElement.textContent = code;
      // Ensure proper formatting
      codeElement.className = 'preserve-format';
    } else {
      // Fallback to setting content directly on pre element
      elements.codeSnippet.textContent = code;
    }
    
    // Ensure white-space is set to pre
    elements.codeSnippet.style.whiteSpace = 'pre';
    elements.codePreview.classList.remove('hidden');
  }
  
  // Switch between tabs
  function switchTab(tab) {
    if (tab === 'practice') {
      elements.practiceTab.classList.add('active');
      elements.mcqTab.classList.remove('active');
      elements.practiceContent.classList.remove('hidden');
      elements.mcqContent.classList.add('hidden');
      } else {
      elements.mcqTab.classList.add('active');
      elements.practiceTab.classList.remove('active');
      elements.mcqContent.classList.remove('hidden');
      elements.practiceContent.classList.add('hidden');
    }
  }
  
  // Function to load existing questions from storage
  function loadExistingQuestionsFromStorage() {
    chrome.storage.local.get(['questions', 'mcqs', 'selectedCode', 'error', 'timestamp'], function(data) {
      // If there's an error, show error state
      if (data.error) {
        if (elements.errorMessage) {
          elements.errorMessage.textContent = data.error;
        }
        showErrorState();
      return;
    }
    
      // Check if we have questions and they're recent (within last 30 minutes)
      const currentTime = Date.now();
      const isRecent = data.timestamp && (currentTime - data.timestamp < 30 * 60 * 1000); // 30 minutes
      
      if (data.questions && data.mcqs && data.selectedCode && isRecent) {
        console.log("Found existing questions in storage, loading them");
        
        // Display the code with preserved formatting
        if (elements.codeSnippet) {
          const codeElement = elements.codeSnippet.querySelector('code');
          if (codeElement) {
            codeElement.textContent = data.selectedCode;
            codeElement.className = 'preserve-format';
          } else {
            elements.codeSnippet.textContent = data.selectedCode;
          }
          elements.codeSnippet.style.whiteSpace = 'pre';
        }
        
        // Show the questions
        showQuestions(data.questions, data.mcqs);
      } else {
        // Show empty state
        showEmptyState();
      }
    });
  }
  
  // Function to show error state
  function showErrorState() {
    elements.loadingState.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    elements.codePreview.classList.add('hidden');
    elements.tabsContainer.classList.add('hidden');
    elements.errorState.classList.remove('hidden');
  }
  
  // Function to show empty state
  function showEmptyState() {
    elements.loadingState.classList.add('hidden');
    elements.errorState.classList.add('hidden');
    elements.codePreview.classList.add('hidden');
    elements.tabsContainer.classList.add('hidden');
    elements.emptyState.classList.remove('hidden');
  }
  
  // Function to show questions
  function showQuestions(questions, mcqs) {
    // Hide loading and empty states
    elements.loadingState.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    elements.errorState.classList.add('hidden');
    
    // Show content
    elements.codePreview.classList.remove('hidden');
    elements.tabsContainer.classList.remove('hidden');
    
    // Create syntax MCQs for the practice tab (formerly practice questions)
    createSyntaxMCQs(questions);
    
    // Create concept MCQs
    createMCQs(mcqs);
  }
  
  // Function to create syntax MCQs (replaces createPracticeQuestions)
  function createSyntaxMCQs(questions) {
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return;
    }
    
    const practiceList = document.getElementById('practiceQuestionsList');
    if (!practiceList) {
      console.error("Practice questions list element not found");
      return;
    }
    
    // Clear existing questions
    practiceList.innerHTML = '';
    
    // Track current question index
    let currentPracticeIndex = 0;
    const practiceQuestionCards = [];
    
    // Create syntax MCQs
    questions.forEach((question, index) => {
      const mcqCard = document.createElement('div');
      mcqCard.className = 'question-card';
      
      // Hide all cards except the first one
      if (index !== 0) {
        mcqCard.classList.add('hidden');
      }
      
      const questionTitle = document.createElement('div');
      questionTitle.className = 'question-title';
      questionTitle.textContent = `Syntax Question ${index + 1}`;
      
      const questionText = document.createElement('div');
      questionText.className = 'question-text';
      questionText.textContent = question.question || "Find the correct syntax:";
      
      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'options mt-3';
      
      mcqCard.appendChild(questionTitle);
      mcqCard.appendChild(questionText);
      mcqCard.appendChild(optionsDiv);
      
      // Add options (either from API or generate from question object)
      const options = question.options || generateSyntaxOptions(question);
      if (options && Array.isArray(options)) {
        options.forEach((option, optIndex) => {
          const optionDiv = document.createElement('div');
          optionDiv.className = 'mcq-option';
          
          // Extract option letter (A, B, C, D)
          let optionLetter = '';
          if (option.match(/^[A-D]\.\s/)) {
            optionLetter = option.substring(0, 1);
          } else {
            // If option doesn't start with letter, use index
            optionLetter = String.fromCharCode(65 + optIndex); // A, B, C, D
          }
          
          const letterDiv = document.createElement('div');
          letterDiv.className = 'mr-2 font-medium';
          letterDiv.textContent = optionLetter + '.';
          
          const textDiv = document.createElement('div');
          // If option contains code, wrap it in a pre element
          if (option.includes('`') || option.includes('```')) {
            textDiv.innerHTML = formatCodeInOption(option.replace(/^[A-D]\.\s/, '').trim());
          } else {
            textDiv.textContent = option.replace(/^[A-D]\.\s/, '').trim();
          }
          
          optionDiv.appendChild(letterDiv);
          optionDiv.appendChild(textDiv);
          
          // Check if this is the correct answer
          const isCorrect = question.correctAnswer && 
            (question.correctAnswer === optionLetter || 
             question.correctAnswer.startsWith(optionLetter + '.'));
          
          // Store whether this option is correct
          optionDiv.dataset.correct = isCorrect;
          
          optionsDiv.appendChild(optionDiv);
          
          // Add click event to option
          optionDiv.addEventListener('click', function() {
            // If an option is already selected, don't do anything
            if (optionsDiv.querySelector('.selected')) {
              return;
            }
            
            // Mark this option as selected
            optionDiv.classList.add('selected');
            
            // Check if the option is correct
            const isCorrect = optionDiv.dataset.correct === 'true';
            
            // Show feedback popup
            showFeedback(isCorrect);
            
            // After a short delay, show all correct/incorrect answers
            setTimeout(() => {
              optionsDiv.querySelectorAll('.mcq-option').forEach(opt => {
                if (opt.dataset.correct === 'true') {
                  opt.classList.add('correct');
                } else if (opt === optionDiv && opt.dataset.correct !== 'true') {
                  opt.classList.add('incorrect');
                }
              });
            }, 300);
          });
        });
      }
      
      practiceList.appendChild(mcqCard);
      practiceQuestionCards.push(mcqCard);
    });
    
    // Show navigation if there's more than one question
    const practiceNav = document.getElementById('practiceNav');
    const prevPractice = document.getElementById('prevPractice');
    const nextPractice = document.getElementById('nextPractice');
    const practiceCounter = document.getElementById('practiceCounter');
    
    if (questions.length > 1 && practiceNav && prevPractice && nextPractice && practiceCounter) {
      practiceNav.classList.remove('hidden');
      
      // Update counter
      updatePracticeCounter();
      
      // Add event listeners for navigation
      prevPractice.addEventListener('click', showPreviousPracticeQuestion);
      nextPractice.addEventListener('click', showNextPracticeQuestion);
      
      // Update button states
      updatePracticeNavigationButtons();
    } else if (practiceNav) {
      practiceNav.classList.add('hidden');
    }
    
    // Function to update counter
    function updatePracticeCounter() {
      practiceCounter.textContent = `Question ${currentPracticeIndex + 1}/${questions.length}`;
    }
    
    // Function to update navigation buttons
    function updatePracticeNavigationButtons() {
      // Disable/enable previous button
      if (currentPracticeIndex === 0) {
        prevPractice.classList.add('opacity-50', 'cursor-not-allowed');
        prevPractice.disabled = true;
      } else {
        prevPractice.classList.remove('opacity-50', 'cursor-not-allowed');
        prevPractice.disabled = false;
      }
      
      // Disable/enable next button
      if (currentPracticeIndex === practiceQuestionCards.length - 1) {
        nextPractice.classList.add('opacity-50', 'cursor-not-allowed');
        nextPractice.disabled = true;
      } else {
        nextPractice.classList.remove('opacity-50', 'cursor-not-allowed');
        nextPractice.disabled = false;
      }
    }
    
    // Function to show previous question
    function showPreviousPracticeQuestion() {
      if (currentPracticeIndex > 0) {
        // Hide current question
        practiceQuestionCards[currentPracticeIndex].classList.add('hidden');
        // Show previous question
        currentPracticeIndex--;
        practiceQuestionCards[currentPracticeIndex].classList.remove('hidden');
        // Update counter and button states
        updatePracticeCounter();
        updatePracticeNavigationButtons();
      }
    }
    
    // Function to show next question
    function showNextPracticeQuestion() {
      if (currentPracticeIndex < practiceQuestionCards.length - 1) {
        // Hide current question
        practiceQuestionCards[currentPracticeIndex].classList.add('hidden');
        // Show next question
        currentPracticeIndex++;
        practiceQuestionCards[currentPracticeIndex].classList.remove('hidden');
        // Update counter and button states
        updatePracticeCounter();
        updatePracticeNavigationButtons();
      }
    }
  }
  
  // Helper function to format code in options
  function formatCodeInOption(text) {
    // Replace markdown-style code blocks with HTML
    text = text.replace(/```(\w*)\n([\s\S]*?)\n```/g, '<pre class="bg-gray-100 p-2 rounded text-xs overflow-x-auto">$2</pre>');
    // Replace inline code
    text = text.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-xs">$1</code>');
    return text;
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
  
  // Function to create MCQs
  function createMCQs(mcqs) {
    if (!mcqs || !Array.isArray(mcqs) || mcqs.length === 0) {
      return;
    }
    
    const mcqList = document.getElementById('mcqList');
    if (!mcqList) {
      console.error("MCQ list element not found");
      return;
    }
    
    // Clear existing MCQs
    mcqList.innerHTML = '';
    
    // Track current question index
    let currentMcqIndex = 0;
    const mcqCards = [];
    
    // Create MCQs
    mcqs.forEach((mcq, index) => {
      const mcqCard = document.createElement('div');
      mcqCard.className = 'question-card';
      
      // Hide all cards except the first one
      if (index !== 0) {
        mcqCard.classList.add('hidden');
      }
      
      const questionTitle = document.createElement('div');
      questionTitle.className = 'question-title';
      questionTitle.textContent = `Multiple Choice ${index + 1}`;
      
      const questionText = document.createElement('div');
      questionText.className = 'question-text';
      questionText.textContent = mcq.question;
      
      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'options mt-3';
      
      mcqCard.appendChild(questionTitle);
      mcqCard.appendChild(questionText);
      mcqCard.appendChild(optionsDiv);
      
      // Add options
      if (mcq.options && Array.isArray(mcq.options)) {
        mcq.options.forEach((option, optIndex) => {
          const optionDiv = document.createElement('div');
          optionDiv.className = 'mcq-option';
          
          // Extract option letter (A, B, C, D)
          let optionLetter = '';
          if (option.match(/^[A-D]\.\s/)) {
            optionLetter = option.substring(0, 1);
    } else {
            // If option doesn't start with letter, use index
            optionLetter = String.fromCharCode(65 + optIndex); // A, B, C, D
          }
          
          const letterDiv = document.createElement('div');
          letterDiv.className = 'mr-2 font-medium';
          letterDiv.textContent = optionLetter + '.';
          
          const textDiv = document.createElement('div');
          textDiv.textContent = option.replace(/^[A-D]\.\s/, '').trim();
          
          optionDiv.appendChild(letterDiv);
          optionDiv.appendChild(textDiv);
          
          // Check if this is the correct answer
          const isCorrect = mcq.correctAnswer && 
            (mcq.correctAnswer === optionLetter || 
             mcq.correctAnswer.startsWith(optionLetter + '.'));
          
          // Store whether this option is correct
          optionDiv.dataset.correct = isCorrect;
          
          optionsDiv.appendChild(optionDiv);
          
          // Add click event to option
          optionDiv.addEventListener('click', function() {
            // If an option is already selected, don't do anything
            if (optionsDiv.querySelector('.selected')) {
              return;
            }
            
            // Mark this option as selected
            optionDiv.classList.add('selected');
            
            // Check if the option is correct
            const isCorrect = optionDiv.dataset.correct === 'true';
            
            // Show feedback popup
            showFeedback(isCorrect);
            
            // After a short delay, show all correct/incorrect answers
            setTimeout(() => {
              optionsDiv.querySelectorAll('.mcq-option').forEach(opt => {
                if (opt.dataset.correct === 'true') {
                  opt.classList.add('correct');
                } else if (opt === optionDiv && opt.dataset.correct !== 'true') {
                  opt.classList.add('incorrect');
                }
              });
            }, 300);
          });
        });
      }
      
      mcqList.appendChild(mcqCard);
      mcqCards.push(mcqCard);
    });
    
    // Show navigation if there's more than one question
    const mcqNav = document.getElementById('mcqNav');
    const prevMcq = document.getElementById('prevMcq');
    const nextMcq = document.getElementById('nextMcq');
    const mcqCounter = document.getElementById('mcqCounter');
    
    if (mcqs.length > 1 && mcqNav && prevMcq && nextMcq && mcqCounter) {
      mcqNav.classList.remove('hidden');
      
      // Update counter
      updateMcqCounter();
      
      // Add event listeners for navigation
      prevMcq.addEventListener('click', showPreviousMcq);
      nextMcq.addEventListener('click', showNextMcq);
      
      // Update button states
      updateMcqNavigationButtons();
    } else if (mcqNav) {
      mcqNav.classList.add('hidden');
    }
    
    // Function to update counter
  function updateMcqCounter() {
    mcqCounter.textContent = `Question ${currentMcqIndex + 1}/${mcqs.length}`;
  }
  
    // Function to update navigation buttons
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
    
    // Function to show previous question
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
    
    // Function to show next question
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
  }
  
  // Function to show feedback for correct/incorrect answers
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
  
  // Set global flag to indicate script loaded successfully
  window.sidepanelJsLoaded = true;
  console.log("sidepanel.js loaded successfully");
} 