// DOM elements
const modelSelect = document.getElementById('modelSelect');
const geminiKeyInput = document.getElementById('geminiKey');
const toggleGeminiVisibilityBtn = document.getElementById('toggleGeminiVisibility');
const saveBtn = document.getElementById('saveBtn');
const savedNotification = document.getElementById('savedNotification');
const geminiKeySection = document.getElementById('geminiKeySection');

// Load saved settings
document.addEventListener('DOMContentLoaded', async () => {
  // Load model selection
  const { selectedModel } = await chrome.storage.local.get('selectedModel');
  modelSelect.value = selectedModel || 'GEMINI_25_FLASH';
  
  // Load API keys
  const { geminiKey } = await chrome.storage.sync.get(['geminiKey']);
  if (geminiKey) {
    geminiKeyInput.value = geminiKey;
  }
  
  // Set up model selection change handler
  modelSelect.addEventListener('change', () => {
    // Update storage immediately
    chrome.storage.local.set({ selectedModel: modelSelect.value });
  });
});

// Toggle Gemini API key visibility
toggleGeminiVisibilityBtn.addEventListener('click', () => {
  togglePasswordVisibility(geminiKeyInput, toggleGeminiVisibilityBtn);
});

// Function to toggle password visibility
function togglePasswordVisibility(inputElement, buttonElement) {
  if (inputElement.type === 'password') {
    inputElement.type = 'text';
    buttonElement.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    `;
  } else {
    inputElement.type = 'password';
    buttonElement.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    `;
  }
}

// Save settings
saveBtn.addEventListener('click', async () => {
  // Save model selection
  const selectedModel = modelSelect.value;
  await chrome.storage.local.set({ selectedModel });
  
  // Save API key
  const geminiKey = geminiKeyInput.value.trim();
  
  const keysToSave = {};
  if (geminiKey) {
    keysToSave.geminiKey = geminiKey;
  }
  
  // Save to Chrome storage
  await chrome.storage.sync.set(keysToSave);
  
  // For backward compatibility, save the API key as 'apiKey'
  if (geminiKey) {
    await chrome.storage.sync.set({ apiKey: geminiKey });
  }
  
  // Show saved notification
  savedNotification.classList.remove('hidden');
  
  // Hide notification after 3 seconds
  setTimeout(() => {
    savedNotification.classList.add('hidden');
  }, 3000);
}); 