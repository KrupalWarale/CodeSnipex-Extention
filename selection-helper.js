// This script is injected into pages to help with code selection
(function() {
  // Store mouse position for context menu
  let lastMousePosition = { x: 0, y: 0 };
  
  // Track mouse position for context menu
  document.addEventListener('mousemove', function(event) {
    lastMousePosition.x = event.clientX;
    lastMousePosition.y = event.clientY;
  });
  
  // Listen for right-click events on pre and code elements
  document.addEventListener('mousedown', function(event) {
    // Check if it's a right-click (button 2)
    if (event.button === 2) {
      const target = event.target;
      // Check if the target is a code element or inside one
      const codeElement = target.closest('pre, code');
      
      if (codeElement) {
        // Store the element for later use
        window.__codeQuestTargetElement = codeElement;
        
        // If no text is selected, select all text in the code element
        const selection = window.getSelection();
        if (selection.toString().trim() === '') {
          const range = document.createRange();
          range.selectNodeContents(codeElement);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        // Store the selection in sessionStorage for the background script to access
        try {
          const selectedText = selection.toString();
          if (selectedText) {
            sessionStorage.setItem('codeQuestSelectedCode', selectedText);
            
            // Also dispatch a custom event that the content script can listen for
            document.dispatchEvent(new CustomEvent('codeQuestSelection', { 
              detail: { 
                text: selectedText,
                element: codeElement
              }
            }));
          }
        } catch (e) {
          console.error("Failed to store selection:", e);
        }
      }
    }
  });
  
  // Listen for messages from extension
  window.addEventListener('message', function(event) {
    // Only accept messages from the same frame
    if (event.source !== window) return;
    
    if (event.data.type && event.data.type === 'CODE_QUEST_GET_SELECTION') {
      // Get the current selection
      let selection = window.getSelection().toString();
      
      // If no selection, try to get the last code element that was right-clicked
      if (!selection && window.__codeQuestTargetElement) {
        const range = document.createRange();
        range.selectNodeContents(window.__codeQuestTargetElement);
        const tempSelection = window.getSelection();
        tempSelection.removeAllRanges();
        tempSelection.addRange(range);
        selection = tempSelection.toString();
      }
      
      // If still no selection, try to find a code element near the last mouse position
      if (!selection && lastMousePosition) {
        const element = document.elementFromPoint(lastMousePosition.x, lastMousePosition.y);
        if (element) {
          const codeElement = element.closest('pre, code');
          if (codeElement) {
            const range = document.createRange();
            range.selectNodeContents(codeElement);
            const tempSelection = window.getSelection();
            tempSelection.removeAllRanges();
            tempSelection.addRange(range);
            selection = tempSelection.toString();
          }
        }
      }
      
      // Send the selection back to the extension
      window.postMessage({
        type: 'CODE_QUEST_SELECTION_RESULT',
        selection: selection
      }, '*');
    }
  });
  
  console.log('CodeQuest selection helper loaded');
})(); 