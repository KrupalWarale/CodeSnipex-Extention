// This script is injected when the context menu is clicked
// It gets the selected text and sends it back to the extension

function getSelectedCodeText() {
  // First try to get any existing selection
  let selection = window.getSelection().toString();
  
  // If there's a selection, return it
  if (selection && selection.trim() !== '') {
    return selection;
  }
  
  // If no selection, try to find the code element under the mouse
  try {
    // Try to get the element at the current mouse position
    const mouseX = window.__codeQuestMouseX || 0;
    const mouseY = window.__codeQuestMouseY || 0;
    
    const elementAtMouse = document.elementFromPoint(mouseX, mouseY);
    if (elementAtMouse) {
      // Check if the element is a code element or inside one
      const codeElement = elementAtMouse.closest('pre, code');
      if (codeElement) {
        // Select all text in the code element
        const range = document.createRange();
        range.selectNodeContents(codeElement);
        const tempSelection = window.getSelection();
        tempSelection.removeAllRanges();
        tempSelection.addRange(range);
        return tempSelection.toString();
      }
    }
    
    // If still no selection, try to find any code element on the page
    const codeElements = document.querySelectorAll('pre, code');
    for (const element of codeElements) {
      const rect = element.getBoundingClientRect();
      // Check if the element is visible in the viewport
      if (rect.top >= 0 && rect.bottom <= window.innerHeight && 
          rect.width > 0 && rect.height > 0) {
        const range = document.createRange();
        range.selectNodeContents(element);
        const tempSelection = window.getSelection();
        tempSelection.removeAllRanges();
        tempSelection.addRange(range);
        return tempSelection.toString();
      }
    }
    
    // If still no selection and there are code elements, use the first one
    if (codeElements.length > 0) {
      const range = document.createRange();
      range.selectNodeContents(codeElements[0]);
      const tempSelection = window.getSelection();
      tempSelection.removeAllRanges();
      tempSelection.addRange(range);
      return tempSelection.toString();
    }
  } catch (e) {
    console.error("Error in getSelectedCodeText:", e);
  }
  
  // If all else fails, return the original selection
  return selection;
}

// Get the selected text and return it
getSelectedCodeText(); 