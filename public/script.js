// --- ensure we always start at the top on iOS Safari ---
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

// --- Helper Debug Functions ---
const DEBUG_INPUT = true; // Toggle to enable/disable input debug logging
function debugLog(category, message, data = null) {
  if (!DEBUG_INPUT) return;
  const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm format
  const logMessage = `[${timestamp}][${category}] ${message}`;
  if (data !== null) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
}

// --- Helper functions for contenteditable div ---
function getTextFromContentEditable(element) {
  return element.innerText || element.textContent;
}

function setTextToContentEditable(element, text) {
  debugLog("SET_TEXT", "setTextToContentEditable called", {
    text: text?.substring(0, 50) + "...",
  }); // Log start
  // Clear content first
  const oldHTML = element.innerHTML;
  element.innerHTML = "";
  debugLog("SET_TEXT", "Element cleared", {
    oldHTML: oldHTML?.substring(0, 50) + "...",
  });

  // Add text with paragraph formatting
  if (text && text.trim()) {
    const paragraphs = text
      .split(/\n\n+/)
      .flatMap((block) => {
        return block.split(/\n/);
      })
      .filter((p) => p.trim() !== "");
    debugLog("SET_TEXT", "Processed paragraphs", {
      count: paragraphs.length,
      firstPara: paragraphs[0]?.substring(0, 30) + "...",
    });

    if (paragraphs.length > 0) {
      paragraphs.forEach((paragraph, index) => {
        if (paragraph.trim()) {
          const p = document.createElement("p");
          p.textContent = paragraph.trim();
          element.appendChild(p);
          debugLog("SET_TEXT", `Appended paragraph ${index}`, {
            content: paragraph.trim().substring(0, 30) + "...",
          });
        }
      });
    } else {
      // If splitting results in no paragraphs (e.g., single line with no newlines), treat as plain text node
      debugLog(
        "SET_TEXT",
        "No paragraphs found, setting text content directly"
      );
      element.textContent = text;
    }
  } else {
    debugLog(
      "SET_TEXT",
      "Input text is empty or whitespace, leaving element empty"
    );
  }
  debugLog("SET_TEXT", "setTextToContentEditable finished", {
    finalHTML: element.innerHTML?.substring(0, 50) + "...",
  });
}

function getCursorPositionInContentEditable(element) {
  const selection = window.getSelection();

  if (selection.rangeCount === 0) return 0;

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);

  return preCaretRange.toString().length;
}

function setCursorPositionInContentEditable(element, position) {
  // This is a simplified implementation and may not work perfectly in all cases
  const selection = window.getSelection();
  const range = document.createRange();

  // Find the text node and position
  let currentPos = 0;
  let foundNode = null;
  let foundOffset = 0;

  function findPosition(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (currentPos + node.length >= position) {
        foundNode = node;
        foundOffset = position - currentPos;
        return true;
      }
      currentPos += node.length;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        if (findPosition(node.childNodes[i])) {
          return true;
        }
      }
    }
    return false;
  }

  findPosition(element);

  if (foundNode) {
    range.setStart(foundNode, foundOffset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

// --- START: Custom Fast Smooth Scroll Implementation ---
function fastSmoothScroll(targetY, duration = 1) {
  // Changed from 150ms to just 1ms for near-instant scrolling
  const startY = window.scrollY;
  const difference = targetY - startY;
  const startTime = performance.now();

  function step() {
    const currentTime = performance.now();
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);

    // Ease function - easeOutQuad for smoother finish
    const easeProgress = 1 - (1 - progress) * (1 - progress);

    window.scrollTo(0, startY + difference * easeProgress);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

// --- START: Global ScrollTo Override (Prevent Upward Scrolls) ---
const originalScrollTo = window.scrollTo.bind(window);
window.scrollTo = function (optionsOrX, y) {
  let targetY;
  let useFastScroll = false;

  // Handle both object ({ top: y, ... }) and coordinate (x, y) arguments
  if (
    typeof optionsOrX === "object" &&
    optionsOrX !== null &&
    optionsOrX.top !== undefined
  ) {
    targetY = optionsOrX.top;
    // Check if smooth behavior was requested and use our faster version instead
    useFastScroll = optionsOrX.behavior === "smooth";
  } else if (typeof optionsOrX === "number" && typeof y === "number") {
    targetY = y;
  } else if (typeof optionsOrX === "number" && y === undefined) {
    // Handling scrollTo(y) is tricky, browser might treat it as scrollTo(0, y) or ignore.
    // Let's assume it means scrollTo(0, y) for this check, but pass original args.
    targetY = optionsOrX;
  } else {
    // Default to 0 if y is not determinable or args are weird, unlikely to block useful scrolls
    targetY = 0;
  }

  // ignore attempts to move ABOVE the current position
  if (targetY < window.scrollY) {
    console.log(
      `Blocked upward scrollTo: targetY=${targetY}, currentY=${window.scrollY}`
    );
    return;
  }

  // Use our custom fast smooth scroll if requested
  if (useFastScroll) {
    fastSmoothScroll(targetY);
    return;
  }

  // Call original function with original arguments for non-smooth scrolls
  if (arguments.length === 1 && typeof optionsOrX === "object") {
    originalScrollTo(optionsOrX);
  } else if (arguments.length >= 2) {
    originalScrollTo(optionsOrX, y);
  } else if (arguments.length === 1 && typeof optionsOrX === "number") {
    // Handle potential scrollTo(y) case if needed, though less common
    // originalScrollTo(0, optionsOrX);
    originalScrollTo(optionsOrX); // Pass single number as is, let browser decide
  } else {
    originalScrollTo(); // Call with no args if none given
  }
};
// --- END: Global ScrollTo Override ---

// pageshow fires on initial load + when restoring from back-forward cache
window.addEventListener("pageshow", () => {
  // tiny timeout helps ensure it kicks in *after* any input-focus scroll
  setTimeout(() => {
    // Check if we are NOT already at the top before scrolling
    if (window.scrollY !== 0) {
      // window.scrollTo(0, 0); // <<< COMMENTED OUT
      // console.log("Forced scroll to top on pageshow"); // <<< COMMENTED OUT
    }
  }, 0);
});

document.addEventListener("DOMContentLoaded", () => {
  // --- START: Scroll to top on load --- // <<< COMMENTED OUT Section
  /*
  setTimeout(() => {
    if (window.scrollY !== 0) {
      window.scrollTo(0, 0);
      console.log("Scrolled to top on load (delayed, after focus).");
    }
  }, 50); // 50ms delay
  */
  // --- END: Scroll to top on load --- // <<< COMMENTED OUT Section

  // Get option buttons
  const typeButtons = document.querySelectorAll(
    ".text-type-option-btn[data-type]"
  );
  const toneButtons = document.querySelectorAll(".tone-buttons[data-tone]");

  // Get other elements
  const messageInputEl = document.getElementById("text-input-area");
  const polishBtn = document.getElementById("polish-btn");
  const polishedMessageEl = document.getElementById("polished-message");
  const outputIcons = document.querySelector(".output-icons");
  const toneMicListeningIndicator = document.getElementById(
    "tone-mic-listening-indicator"
  );
  const toneHeaderMicBtn = document.getElementById("tone-header-mic-indicator"); // NEW Mic Button in Tone Header
  const keyboardStatusIndicator = document.getElementById(
    "keyboard-status-indicator"
  ); // Get the new indicator

  // --- START: Define focus indicator element and update function early ---
  const focusStatusEl = document.getElementById("focus-status-indicator");
  console.log("[INIT] Focus Status Element Found:", focusStatusEl);

  // Flags/state for scroll management
  let didJustBlurPolishedMessage = false;
  let didJustBlurInputArea = false;
  let lastInputBlurTs = 0;
  let shouldScrollEmptyInputOnKeyboardOpen = false; // <<< NEW FLAG

  // Define the specific strings and their corresponding selectors
  const focusMappings = {
    logo: ".logo-container",
    "textarea-wrapper": ".textarea-wrapper",
    "text-type-container": ".text-type-container",
    "tone-settings-container": ".tone-settings-container",
    "indicator-button-container": ".indicator-button-container",
    "polished-message-area": "#polished-message", // Track polished message directly
    "output-icons-area": ".output-icons", // Track icons directly
  };
  const notFoundMessage = "Not Found - Error";

  // Function to update the indicator based on the currently focused element OR a provided element
  const updateFocusIndicator = (element = null, caller = "unknown") => {
    // Ensure focusStatusEl exists before proceeding
    if (!focusStatusEl) return;

    const timestamp = new Date().toISOString();
    console.log(
      `[DIAG-FOCUS-1] ${timestamp} - updateFocusIndicator called by: ${caller}`
    );

    const targetElement = element || document.activeElement; // Use provided element or activeElement
    console.log(
      `[DIAG-FOCUS-2] ${timestamp} - Target Element for check:`,
      targetElement
    );

    let statusText = notFoundMessage; // Default to error message
    let foundMatch = false;

    if (targetElement && targetElement !== document.body) {
      console.log(
        `[DIAG-FOCUS-3] ${timestamp} - Checking targetElement against mappings...`
      );
      // Check against selectors. Order can matter for nested elements.
      // Use targetElement for checks
      if (targetElement.closest(focusMappings["textarea-wrapper"])) {
        console.log(`[DIAG-FOCUS-4] ${timestamp} - Match: textarea-wrapper`);
        statusText = "textarea-wrapper";
        foundMatch = true;
      } else if (targetElement.closest(focusMappings["text-type-container"])) {
        console.log(`[DIAG-FOCUS-4] ${timestamp} - Match: text-type-container`);
        statusText = "text-type-container";
        foundMatch = true;
      } else if (targetElement.closest(focusMappings["logo"])) {
        console.log(`[DIAG-FOCUS-4] ${timestamp} - Match: logo`);
        statusText = "logo";
        foundMatch = true;
      } else if (
        targetElement.closest(focusMappings["tone-settings-container"])
      ) {
        console.log(
          `[DIAG-FOCUS-4] ${timestamp} - Match: tone-settings-container`
        );
        statusText = "tone-settings-container";
        foundMatch = true;
      } else if (
        targetElement.closest(focusMappings["indicator-button-container"])
      ) {
        console.log(
          `[DIAG-FOCUS-4] ${timestamp} - Match: indicator-button-container`
        );
        statusText = "indicator-button-container";
        foundMatch = true;
      } else if (
        targetElement.closest(focusMappings["polished-message-area"])
      ) {
        // UPDATED Check
        console.log(
          `[DIAG-FOCUS-4] ${timestamp} - Potential Match: polished-message-area. Checking editability...`
        );
        // Special check for output area: only count if editable
        if (targetElement.getAttribute("contenteditable") === "true") {
          console.log(
            `[DIAG-FOCUS-5] ${timestamp} - Confirmed Match: polished-message-area (editable)`
          );
          statusText = "polished-message-area"; // UPDATED Status
          foundMatch = true;
        } else {
          console.log(
            `[DIAG-FOCUS-5] ${timestamp} - No Match: polished-message-area (not editable)`
          );
          statusText = notFoundMessage; // Treat non-editable focus as not found
        }
      } else if (targetElement.closest(focusMappings["output-icons-area"])) {
        // ADDED Check for icons
        console.log(`[DIAG-FOCUS-4] ${timestamp} - Match: output-icons-area`);
        statusText = "output-icons-area"; // ADDED Status
        foundMatch = true;
      } else {
        console.log(
          `[DIAG-FOCUS-4] ${timestamp} - No match found in mappings.`
        );
      }
    } else if (targetElement === document.body) {
      console.log(`[DIAG-FOCUS-3] ${timestamp} - Target element is body.`);
      statusText = notFoundMessage; // Treat body focus as not found
    } else {
      console.log(
        `[DIAG-FOCUS-3] ${timestamp} - Target element is null or invalid.`
      );
    }

    console.log(
      `[DIAG-FOCUS-6] ${timestamp} - Final statusText determined: ${statusText}`
    );
    // No need for extra check here, done at function start
    focusStatusEl.textContent = statusText;
    console.log(
      `[DIAG-FOCUS-7] ${timestamp} - Updated focusStatusEl.textContent to: ${focusStatusEl.textContent}`
    );
  };
  // --- END: Define focus indicator element and update function early ---

  // Undo functionality constants
  const UNDO_STORAGE_KEY = "textPolishUndoState";

  // --- Tone Selection State ---
  // 'initial': No user interaction with tones yet.
  // 'auto': User explicitly selected Auto.
  // 'specific': User explicitly selected a specific tone.
  let toneSelectionMode = "initial";

  // Set default selections: Text Message type, Friendly tone
  function setDefaultSelections() {
    // 1. Set default type
    const defaultTypeButton = document.querySelector(
      ".text-type-option-btn[data-type='text-message']"
    );
    if (defaultTypeButton) {
      typeButtons.forEach((btn) => btn.classList.remove("selected"));
      defaultTypeButton.classList.add("selected");
      updatePlaceholder("text-message");
    }

    // 2. Set default tone ('friendly') specifically in categories
    const defaultToneValue = "friendly";
    const defaultToneCategoryButton = document.querySelector(
      `#tone-categories .tone-buttons[data-tone='${defaultToneValue}']`
    );
    const allToneButtons = document.querySelectorAll(
      ".tone-buttons[data-tone]"
    ); // Get all tone buttons
    allToneButtons.forEach((btn) => btn.classList.remove("selected")); // Deselect all

    if (defaultToneCategoryButton) {
      defaultToneCategoryButton.classList.add("selected"); // Select category button
      updateMainToneDisplay(defaultToneCategoryButton); // Update header based on the category button
    } else {
      // Fallback to selecting Auto if friendly category button not found
      const autoButton = document.querySelector(
        '.tone-buttons[data-tone="auto"]'
      );
      if (autoButton) {
        autoButton.classList.add("selected");
        updateMainToneDisplay(autoButton);
      }
    }

    // Ensure mode is initial on load
    toneSelectionMode = "initial";
  }

  // Call the function after all other initialization
  setTimeout(setDefaultSelections, 100);

  // --- START: Auto-focus on input area ---
  if (messageInputEl) {
    messageInputEl.focus();
    console.log("Text input area focused on load.");
  }
  // --- END: Auto-focus on input area ---

  // --- START: Scroll to top on textarea blur (iOS "Done" button) ---
  if (messageInputEl) {
    messageInputEl.addEventListener("blur", () => {
      // Check if keyboard *was* open before blur
      if (isKeyboardOpen) {
        // Use a small delay to see if focus immediately returns (e.g., Clear button)
        setTimeout(() => {
          // Check if focus is *still* not on the input after the delay
          if (document.activeElement !== messageInputEl) {
            // Only scroll if focus has truly moved away (like tapping "Done")
            window.scrollTo({ top: 0, behavior: "smooth" });
            console.log(
              "Scrolled to top on textarea blur after delay (focus moved away)."
            );
          } else {
            console.log(
              "Textarea blurred but focus returned quickly, skipped scroll."
            );
          }
        }, 50); // 50ms delay
      }
    });
  }
  // --- END: Scroll to top on textarea blur (iOS "Done" button) ---

  // Check for content on page load to handle scrolling
  checkContentAndUpdateBody();

  // Add event listeners to detect content changes
  messageInputEl.addEventListener("input", checkContentAndUpdateBody);

  // Function to check for content and update body class - only disable elastic scroll when absolutely no content
  function checkContentAndUpdateBody() {
    const inputText = getTextFromContentEditable(messageInputEl);

    if (
      inputText.trim() ||
      (polishedMessageEl.textContent &&
        polishedMessageEl.textContent.trim() !== "Processing...") ||
      document.body.classList.contains("tones-expanded")
    ) {
      document.body.classList.add("has-content");
    } else {
      document.body.classList.remove("has-content");
    }
  }

  // Initially hide output elements if empty
  if (!polishedMessageEl.textContent.trim()) {
    polishedMessageEl.style.display = "none";
    outputIcons.style.display = "none";
  }

  // Get icon buttons (excluding edit)
  const micInputBtn = document.getElementById("mic-input");
  const clearInputBtn = document.getElementById("clear-input");
  const copyInputBtn = document.getElementById("copy-input");
  const pasteInputBtn = document.getElementById("paste-input");
  const clearOutputBtn = document.getElementById("clear-output");
  const copyOutputBtn = document.getElementById("copy-output");
  const pasteOutputBtn = document.getElementById("paste-output");
  const signatureOutputBtn = document.getElementById("signature-output"); // Get signature button

  // --- START: Cursor Distance Calculation ---
  const mirrorDivId = "input-mirror-div";

  // Renamed function: Calculates vertical pixel position for a given text index
  function getTextVPixelPosition(element, textIndex) {
    // Different implementation for contenteditable div vs textarea
    if (element.tagName === "TEXTAREA") {
      // Original implementation for textarea
      // ... existing getTextVPixelPosition code ...
    } else {
      // Implementation for contenteditable div
      const range = document.createRange();
      const sel = window.getSelection();

      // Find the appropriate text node and position
      let currentLength = 0;
      let foundNode = null;
      let foundOffset = 0;

      function findTextPosition(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          if (currentLength + node.length >= textIndex) {
            foundNode = node;
            foundOffset = textIndex - currentLength;
            return true;
          }
          currentLength += node.length;
        } else {
          for (let i = 0; i < node.childNodes.length; i++) {
            if (findTextPosition(node.childNodes[i])) {
              return true;
            }
          }
        }
        return false;
      }

      // Try to find the position
      findTextPosition(element);

      // If we found the position, calculate the visual coordinates
      if (foundNode) {
        range.setStart(foundNode, foundOffset);
        range.collapse(true);

        const rect = range.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        // Return the position relative to the element's top
        return rect.top - elementRect.top + element.scrollTop;
      }

      // Fallback: if we can't find the exact position, return the bottom
      return element.scrollHeight;
    }
  }

  function updateCursorDistance() {
    if (!messageInputEl) return; // Keep check for messageInputEl

    try {
      // Save current scroll position and selection before any changes
      const originalScrollTop = messageInputEl.scrollTop;
      const originalHeight = messageInputEl.offsetHeight;

      // For contenteditable, we need to save/restore the selection
      const selection = window.getSelection();
      let savedRange = null;
      if (selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0).cloneRange();
      }

      // Get content length for contenteditable div
      const textLength = getTextFromContentEditable(messageInputEl).length;
      const atVeryEnd = isSelectionNearEnd(messageInputEl, 5);

      const computedStyle = window.getComputedStyle(messageInputEl);
      const minHeightCSS = parseFloat(computedStyle.minHeight);
      const lineHeight = parseFloat(computedStyle.lineHeight);

      // Calculate end of text position
      const endOfTextY = getTextVPixelPosition(messageInputEl, textLength);
      const scrollTop = messageInputEl.scrollTop;
      const clientHeight = messageInputEl.clientHeight;
      const scrollHeight = messageInputEl.scrollHeight;

      // Calculate the end-of-text's visible position
      const visibleEndOfTextY = endOfTextY - scrollTop;

      // Calculate distance from end-of-text to bottom
      const distance = Math.max(
        0,
        clientHeight - visibleEndOfTextY - lineHeight
      );

      console.log(
        `After Auto Height -> EndOfTextY: ${endOfTextY}, ScrollTop: ${scrollTop}, ClientHeight: ${clientHeight}, ScrollHeight: ${scrollHeight}, VisibleEndOfTextY: ${visibleEndOfTextY}, DistanceToEnd: ${distance}`
      );

      // Height adjustment (only if keyboard IS open and cursor is near bottom)
      // <<< MODIFICATION START: Check isKeyboardOpen here >>>
      if (isKeyboardOpen && distance <= 35 && hasContent) {
        // <<< MODIFICATION END >>>
        // Potential new height calculation
        const potentialNewHeight = scrollHeight + lineHeight;
        const newHeight = Math.max(potentialNewHeight, minHeightCSS);

        // Check for large height changes
        const heightDifference = newHeight - originalHeight;

        if (Math.abs(heightDifference) < 100 || atVeryEnd) {
          debugLog(
            "CURSOR_DISTANCE",
            "Adjusting height (Keyboard UP, cursor near bottom)",
            { scrollHeight, newHeight }
          ); // Updated Log Context
          console.log(
            `Cursor close to bottom (<=35px). Adjusting height. Current scrollHeight: ${scrollHeight}, New height target: ${newHeight}`
          );

          // Apply the new height
          messageInputEl.style.minHeight = newHeight + "px";
        } else {
          debugLog(
            "CURSOR_DISTANCE",
            "Skipping large height adjustment (Keyboard UP)",
            { heightDifference }
          ); // Updated Log Context
          console.log(
            `Skipping large height adjustment (${heightDifference}px) to prevent visual jump`
          );
          // Restore original height
          messageInputEl.style.minHeight = originalHeight + "px";
        }
        // Removed the `else` block that previously handled the !isKeyboardOpen case for this specific adjustment
      }

      // Always restore scroll position
      messageInputEl.scrollTop = originalScrollTop;

      // Restore selection for contenteditable div
      if (savedRange) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      }

      // Final verification of scroll position
      if (Math.abs(messageInputEl.scrollTop - originalScrollTop) > 5) {
        console.warn(
          `Scroll position didn't stick! Expected: ${originalScrollTop}, Actual: ${messageInputEl.scrollTop}`
        );
        setTimeout(() => {
          messageInputEl.scrollTop = originalScrollTop;
        }, 0);
      }
    } catch (error) {
      console.error("Error in updateCursorDistance:", error);
      distanceValueEl.textContent = "Err";
    }
  }

  // Helper function to check if selection is near the end of content
  function isSelectionNearEnd(element, threshold = 5) {
    if (element.tagName === "TEXTAREA") {
      return element.selectionStart >= element.value.length - threshold;
    } else {
      const selection = window.getSelection();
      if (selection.rangeCount === 0) return false;

      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);

      const position = preCaretRange.toString().length;
      const totalLength = getTextFromContentEditable(element).length;

      return position >= totalLength - threshold;
    }
  }

  // Add event listeners to update distance
  if (messageInputEl) {
    messageInputEl.addEventListener("input", updateCursorDistance);
    messageInputEl.addEventListener("keyup", updateCursorDistance); // Catch arrow key movements
    messageInputEl.addEventListener("scroll", updateCursorDistance); // Update on scroll
    // Initial calculation
    setTimeout(updateCursorDistance, 100); // Small delay to ensure layout is stable
  }
  // --- END: Cursor Distance Calculation ---

  // --- START: Viewport Height Keyboard Detection ---
  let baseHeight = window.visualViewport
    ? window.visualViewport.height
    : window.innerHeight;
  let isKeyboardOpen = false;
  let initialResizeCheckDone = false; // Flag for initial logging
  debugLog("INIT_RESIZE", "Initial baseHeight calculated", { baseHeight }); // <<< Log initial baseHeight

  function updateKeyboardStatusIndicator() {
    keyboardStatusIndicator.textContent = `Keyboard: ${
      isKeyboardOpen ? "UP" : "DOWN"
    }`;
  }

  function handleViewportResize() {
    const currentHeight = window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight;
    const keyboardThreshold = 100; // Pixels
    const heightDifference = baseHeight - currentHeight;

    debugLog("VIEWPORT_RESIZE", "handleViewportResize triggered", {
      currentHeight,
      baseHeight,
      heightDifference,
      keyboardThreshold,
      isKeyboardOpen_before: isKeyboardOpen,
    });

    // --- Condition for Keyboard OPEN ---
    if (currentHeight < baseHeight - keyboardThreshold) {
      debugLog(
        "VIEWPORT_RESIZE",
        "Condition MET: currentHeight < baseHeight - threshold",
        {
          currentHeight,
          comparisonValue: baseHeight - keyboardThreshold,
        }
      );
      if (!isKeyboardOpen) {
        debugLog(
          "VIEWPORT_RESIZE",
          "Keyboard state changing: false -> true (OPENING)"
        );
        isKeyboardOpen = true;
        updateKeyboardStatusIndicator();
        console.log("Keyboard open (Viewport)");
        // --- START: Adjust min-height when keyboard opens ---
        if (messageInputEl) {
          debugLog(
            "VIEWPORT_RESIZE",
            "Setting min-height to 388px (Keyboard OPEN)"
          ); // <<< Log before setting 388px
          messageInputEl.style.minHeight = "388px";
        }
        // --- END: Adjust min-height when keyboard opens ---

        // --- START: Scroll EMPTY Input Area IF Flag is Set ---
        if (document.activeElement === messageInputEl) {
          console.log(
            "[DEBUG] handleViewportResize: ActiveElement is messageInputEl."
          ); // Log 3
          console.log(
            "[DEBUG] handleViewportResize: Flag value BEFORE check:",
            shouldScrollEmptyInputOnKeyboardOpen
          ); // Log 4
          if (shouldScrollEmptyInputOnKeyboardOpen) {
            console.log(
              "[DEBUG] handleViewportResize: Flag is TRUE, scheduling scroll."
            ); // Log 5
            const forceFirst = shouldScrollEmptyInputOnKeyboardOpen === true; // Check if this is the first trigger after focus
            console.log(
              "[DEBUG] handleViewportResize: forceFirst value:",
              forceFirst
            ); // Log 6
            shouldScrollEmptyInputOnKeyboardOpen = false; // <<< RESET FLAG HERE, before timeout
            console.log(
              "[DEBUG] handleViewportResize: Flag value AFTER reset:",
              shouldScrollEmptyInputOnKeyboardOpen
            ); // Log 7

            // Scroll logic now runs here, triggered by resize + flag
            setTimeout(() => {
              console.log("[DEBUG] setTimeout: Callback executing."); // Log 8
              console.log(
                "[DEBUG] setTimeout: ActiveElement:",
                document.activeElement
              ); // Log 9
              if (document.activeElement === messageInputEl) {
                // Check focus persists
                const desiredOffset = 5;
                const elementTopRelativeToViewport =
                  messageInputEl.getBoundingClientRect().top;
                console.log(
                  "[DEBUG] setTimeout: elementTopRelativeToViewport:",
                  elementTopRelativeToViewport
                ); // Log 10
                // Scroll if forced (first time) OR if element is actually low
                console.log(
                  `[DEBUG] setTimeout: Checking condition (forceFirst || > offset): (${forceFirst} || ${elementTopRelativeToViewport} > ${
                    desiredOffset + 10
                  })`
                ); // Log 11
                if (
                  forceFirst ||
                  elementTopRelativeToViewport > desiredOffset + 10
                ) {
                  const currentScrollY = window.scrollY;
                  const scrollAmount =
                    elementTopRelativeToViewport - desiredOffset;
                  const targetScrollY = currentScrollY + scrollAmount;
                  console.log("[DEBUG] setTimeout: Performing scroll...", {
                    targetScrollY,
                    behavior: "smooth",
                  }); // Log 12
                  window.scrollTo({ top: targetScrollY, behavior: "smooth" });
                  console.log(
                    `Scrolled empty input near top (forceFirst=${forceFirst}). TargetY: ${targetScrollY}`
                  ); // Updated log
                } else {
                  console.log(
                    "[DEBUG] setTimeout: Condition FALSE. Scroll skipped."
                  ); // Log 13
                  console.log(
                    "Empty input focused, but already near top. Scroll skipped."
                  );
                }
              } else {
                console.log(
                  "[DEBUG] setTimeout: ActiveElement check FAILED. Focus moved away."
                ); // Log 14
                console.log(
                  "Focus moved away before delayed scroll could execute."
                );
              }
            }, 150); // 150ms delay
          } else {
            console.log(
              "[DEBUG] handleViewportResize: Flag is FALSE, scroll not scheduled."
            ); // Log 15
            console.log(
              "Keyboard opened for input area (has content), scroll flag not set."
            );
          }
        } else {
          console.log(
            "[DEBUG] handleViewportResize: ActiveElement is NOT messageInputEl."
          ); // Log 16
          console.log("Keyboard opened, but focus is not on the input area.");
        }
        // ALWAYS reset the flag after checking it // <<< REMOVED Redundant Reset
        // shouldScrollEmptyInputOnKeyboardOpen = false;
        // --- END: Scroll EMPTY Input Area IF Flag is Set ---
      }
    } else {
      // --- Condition for Keyboard CLOSED ---
      debugLog(
        "VIEWPORT_RESIZE",
        "Condition NOT MET: currentHeight >= baseHeight - threshold",
        {
          currentHeight,
          comparisonValue: baseHeight - keyboardThreshold,
        }
      );
      // Check if it was previously open to avoid redundant updates
      if (isKeyboardOpen) {
        debugLog(
          "VIEWPORT_RESIZE",
          "Keyboard state changing: true -> false (CLOSING)"
        );
        isKeyboardOpen = false;
        updateKeyboardStatusIndicator();
        console.log("Keyboard closed (Viewport)");
        // --- START: Adjust min-height when keyboard closes ---
        if (messageInputEl) {
          debugLog(
            "VIEWPORT_RESIZE",
            "Setting min-height to 240px (Keyboard CLOSED)"
          ); // <<< Log before setting 240px
          messageInputEl.style.minHeight = "240px";
        }
        // --- END: Adjust min-height when keyboard closes ---

        // --- START: Adjust input area height based on content AFTER keyboard closes ---
        if (messageInputEl) {
          // Set height based on scroll height to fit content, but not less than 240px
          const requiredHeight = Math.max(messageInputEl.scrollHeight, 240);
          debugLog("VIEWPORT_RESIZE", "Adjusting height after keyboard close", {
            requiredHeight,
          }); // <<< Log height adjustment
          messageInputEl.style.height = requiredHeight + "px";
          // Reset min-height to allow shrinking later if content is removed
          messageInputEl.style.minHeight = "240px";
          console.log(
            `Keyboard closed, set input height to fit content: ${requiredHeight}px`
          );
        }
        // --- END: Adjust input area height ---

        // --- START: Conditional Scroll to top on keyboard close (REMOVED) ---
        /* --- REMOVED Timestamp/Flag Guarded Scroll Logic ---
        // Check if the input area blurred very recently
        const recentlyBlurredInput = Date.now() - lastInputBlurTs < 350;

        if (recentlyBlurredInput || didJustBlurInputArea || didJustBlurPolishedMessage) {
          // If keyboard closed right after blurring input OR polished message, OR if input blur was very recent,
          // DON'T scroll.
          console.log(`Keyboard closed, skipping scroll to top due to: ${recentlyBlurredInput ? 'Recent Input Blur' : (didJustBlurInputArea ? 'Input Flag' : 'Polished Flag')}`);
        } else {
          // Otherwise (e.g., keyboard closed without recent blur, like switching apps), scroll to top
          window.scrollTo({ top: 0, behavior: "smooth" });
          console.log("Scrolled to top on keyboard close (viewport resize, no recent input/output blur detected).");
        }

        // Reset flags for the next cycle regardless of scroll decision
        didJustBlurInputArea = false;
        didJustBlurPolishedMessage = false;
        // No need to reset lastInputBlurTs, it just gets overwritten on next blur
        */
        // --- END: Conditional Scroll to top on keyboard close ---
      }
    }

    // Log initial check completion
    if (!initialResizeCheckDone) {
      debugLog("INIT_RESIZE", "Initial handleViewportResize check completed", {
        isKeyboardOpen_after: isKeyboardOpen,
      });
      initialResizeCheckDone = true;
    }
  }

  // Initial setup
  if (keyboardStatusIndicator) {
    debugLog("INIT_RESIZE", "Adding viewport resize listeners");
    updateKeyboardStatusIndicator(); // Set initial state (DOWN)
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportResize);
    } else {
      window.addEventListener("resize", handleViewportResize);
    }

    // Update base height on orientation change
    window.addEventListener("orientationchange", () => {
      // Use a timeout to allow viewport to stabilize after orientation change
      setTimeout(() => {
        baseHeight = window.visualViewport
          ? window.visualViewport.height
          : window.innerHeight;
        debugLog(
          "ORIENTATION_CHANGE",
          "Orientation changed, new baseHeight calculated",
          { baseHeight }
        ); // <<< Log orientation change
        console.log("Orientation changed, new baseHeight:", baseHeight);
        // Re-evaluate keyboard state after orientation change
        handleViewportResize();
      }, 300); // Adjust delay if needed
    });
  }
  // --- END: Viewport Height Keyboard Detection ---

  // --- START: Add Blur Listeners for Input and Polished Message ---
  if (messageInputEl) {
    messageInputEl.addEventListener("blur", () => {
      // Update focus indicator after a delay
      setTimeout(
        () => updateFocusIndicator(null, "messageInputEl_blur_timeout"),
        50
      );
    });
  }

  if (polishedMessageEl) {
    polishedMessageEl.addEventListener("blur", () => {
      // Check if it was editable when blurred
      if (polishedMessageEl.getAttribute("contenteditable") === "true") {
        // Also update focus indicator state since blur might not trigger touch timeout reliably
        setTimeout(
          () => updateFocusIndicator(null, "polishedMessageEl_blur_timeout"),
          50
        );
      }
    });
  }
  // --- END: Add Blur Listeners for Input and Polished Message ---

  // --- START: Scroll Empty Input Area to Top on Focus (iOS Keyboard) ---
  if (messageInputEl) {
    messageInputEl.addEventListener("focus", () => {
      const inputText = getTextFromContentEditable(messageInputEl);
      if (inputText.trim() === "") {
        console.log("Empty input area focused, setting scroll flag.");
        shouldScrollEmptyInputOnKeyboardOpen = true;
      } else {
        // Ensure flag is false if input has content on focus
        shouldScrollEmptyInputOnKeyboardOpen = false;
      }
    });
  }
  // --- END: Scroll Empty Input Area to Top on Focus ---

  // --- START: Speech Recognition Logic (Restored based on temp-23-Microphone.md) ---
  let recognition = null;
  let isRecognizing = false;
  let manualStop = false; // Flag to track if stop was initiated by user click

  // Initialize speech recognition if available
  function initSpeechRecognition() {
    // Check for SpeechRecognition API support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = true; // Keep listening until stopped
      recognition.interimResults = false; // Only get final results
      recognition.lang = "en-US"; // Default to English

      recognition.onstart = function () {
        console.log("Speech recognition started.");
        isRecognizing = true;
        manualStop = false; // Reset flag on successful start
        // Apply active styles directly to the new button
        if (toneHeaderMicBtn) {
          toneHeaderMicBtn.classList.add("listening"); // Use class for styling active state
        }
        // Show the new ear indicator
        if (toneMicListeningIndicator) {
          toneMicListeningIndicator.classList.remove("hidden");
        }
      };

      recognition.onresult = function (event) {
        const cursorPosition = messageInputEl.selectionStart;
        const currentText = messageInputEl.value;
        const latestResult = event.results[event.results.length - 1];
        let newText = latestResult[0].transcript;

        if (currentText.trim() === "" || cursorPosition === 0) {
          const firstWordMatch = newText.match(/^(\w+['']?\w*)\s+\1\b/i);
          if (firstWordMatch) {
            newText = newText.replace(/^(\w+['']?\w*)\s+/, "");
            console.log("Fixed repeated first word");
          }
        }

        if (
          cursorPosition > 0 &&
          cursorPosition === currentText.length &&
          !currentText.endsWith(" ") &&
          currentText.trim() !== "" &&
          !newText.startsWith(" ")
        ) {
          newText = " " + newText;
        }

        setTextToContentEditable(
          messageInputEl,
          currentText.substring(0, cursorPosition) +
            newText +
            currentText.substring(cursorPosition)
        );

        const newCursorPosition = cursorPosition + newText.length;
        setCursorPositionInContentEditable(messageInputEl, newCursorPosition);
        messageInputEl.scrollTop = messageInputEl.scrollHeight;

        updateCursorDistance(); // Update height/distance
        checkContentAndUpdateBody(); // Update content status
      };

      recognition.onend = function () {
        console.log("Speech recognition ended.");
        isRecognizing = false;
        // Reset mic button styles
        if (toneHeaderMicBtn) {
          toneHeaderMicBtn.classList.remove("listening");
        }

        // Auto-restart logic
        if (!manualStop) {
          console.log("Recognition ended automatically, restarting...");
          // Add a small delay before restarting
          setTimeout(() => {
            try {
              if (recognition) {
                // Check if recognition still exists
                recognition.start();
              }
            } catch (error) {
              console.error(
                "Error restarting recognition after automatic end:",
                error
              );
              manualStop = true; // Prevent loops if start fails repeatedly
            }
          }, 250); // 250ms delay
        } else {
          console.log("Recognition ended due to manual stop.");
          manualStop = false; // Reset flag for the next session
        }
        // Hide the new ear indicator
        if (toneMicListeningIndicator) {
          toneMicListeningIndicator.classList.add("hidden");
        }
      };

      recognition.onerror = function (event) {
        console.error("Speech recognition error:", event.error);
        isRecognizing = false;
        manualStop = true; // Stop trying to auto-restart on error
        // Reset UI styles (ensure consistency)
        if (toneHeaderMicBtn) {
          toneHeaderMicBtn.classList.remove("listening");
        }

        // Make sure to check content state
        checkContentAndUpdateBody();
        // Hide the new ear indicator
        if (toneMicListeningIndicator) {
          toneMicListeningIndicator.classList.add("hidden");
        }
      };

      return true; // Indicate success
    } else {
      console.log("Speech recognition not supported");
      return false; // Indicate failure
    }
  }

  // Mic Button Click Handler - Now targets the tone header mic
  if (toneHeaderMicBtn) {
    console.log(
      "Tone header mic button (#tone-header-mic-indicator) found. Attaching listener."
    );
    toneHeaderMicBtn.addEventListener("click", () => {
      console.log("Tone header mic button CLICK HANDLER FIRED!");

      // Check if the button is actually visible (desktop check)
      const micDisplayStyle = window.getComputedStyle(toneHeaderMicBtn).display;
      console.log(`Tone header mic button display style: ${micDisplayStyle}`);
      if (micDisplayStyle === "none") {
        console.log("Tone header mic button is hidden. Ignoring click.");
        return; // Do nothing if button is hidden
      }

      // Initialize on first click if not already done
      let initResult = false;
      if (!recognition) {
        console.log("Attempting to initialize Speech Recognition..."); // Log: Init attempt
        initResult = initSpeechRecognition();
        console.log(`Speech Recognition initialization result: ${initResult}`); // Log: Init result
      }

      if (!recognition && !initResult) {
        // Check if init failed
        // Alert only shown if init failed on this click
        alert("Speech recognition is not supported or failed to initialize.");
        return;
      }

      if (isRecognizing) {
        // Stop listening
        console.log("Manual stop initiated.");
        manualStop = true; // Set flag BEFORE stopping
        if (recognition) recognition.stop();
      } else {
        // Start listening
        manualStop = false; // Reset flag just in case
        try {
          messageInputEl.focus(); // Focus the textarea
          console.log("Attempting to call recognition.start()..."); // Log: Start attempt
          if (recognition) recognition.start(); // This triggers onstart where UI is handled
        } catch (error) {
          console.error("Speech recognition start error:", error);
          // Handle specific errors like InvalidStateError
          if (error.name === "InvalidStateError") {
            console.log(
              "Attempting to stop and restart recognition due to InvalidStateError"
            );
            // Stop recognition first
            recognition.stop();
            // Important: Ensure UI resets related to stopping occur
            // Manually trigger parts of onend logic here if needed,
            // as the auto-restart might happen before onend fully completes.
            if (toneHeaderMicBtn) {
              toneHeaderMicBtn.classList.remove("listening");
            }

            // Defer restart slightly
            setTimeout(() => {
              manualStop = false; // Reset before trying to start again
              try {
                if (recognition) recognition.start();
              } catch (restartError) {
                console.error(
                  "Failed to restart recognition after InvalidStateError:",
                  restartError
                );
                manualStop = true; // Prevent loops if restart also fails
              }
            }, 300); // Increased delay slightly
          } else {
            manualStop = true; // Ensure flag is set if start fails critically
            // Reset UI as a fallback
            if (toneHeaderMicBtn) {
              toneHeaderMicBtn.classList.remove("listening");
            }
          }
        }
      }
    });
  } else {
    console.error(
      "Tone header mic button (#tone-header-mic-indicator) NOT FOUND in DOM when trying to attach listener."
    );
  }
  // --- END: Speech Recognition Logic ---

  // Function to handle selection state update for button groups
  function handleButtonSelection(buttons, clickedButton) {
    // --- START: Strict Already Selected Check ---
    if (clickedButton.classList.contains("selected")) {
      console.log(
        "handleButtonSelection: Button already selected, preventing visual changes.",
        clickedButton
      );
      // DON'T return here if it's the Auto button, needs to proceed to deselect others
      // DO return if it's a specific category tone button already selected
      if (clickedButton.dataset.tone !== "auto") {
        return;
      }
    }
    // --- END: Strict Already Selected Check ---
    // Deselect all buttons in the provided group *before* adding class to the clicked one
    // Exception: If 'Auto' was clicked and was already selected, don't deselect others
    if (
      !(
        clickedButton.dataset.tone === "auto" &&
        clickedButton.classList.contains("selected")
      )
    ) {
      buttons.forEach((btn) => btn.classList.remove("selected"));
    }
    // Ensure the clicked one is selected (might have been deselected above if it wasn't Auto)
    clickedButton.classList.add("selected");

    const buttonIsTone = clickedButton.classList.contains("tone-buttons");
    const buttonIsType = clickedButton.classList.contains(
      "text-type-option-btn"
    );

    // --- START: Refined Tone Button Logic ---
    if (buttonIsTone) {
      // Tone button was clicked (could be initial, category, or Auto header)
      // Set the mode based on the actual button clicked (important for initial load/category clicks)
      // Note: Header specific clicks set the mode in the direct listener above
      if (
        toneSelectionMode === "initial" ||
        clickedButton.closest("#tone-categories") ||
        clickedButton.dataset.tone === "auto"
      ) {
        toneSelectionMode =
          clickedButton.dataset.tone === "auto" ? "auto" : "specific";
        console.log(
          `handleButtonSelection (Tone): toneSelectionMode set to '${toneSelectionMode}'`
        );
      }

      updateMainToneDisplay(clickedButton); // Update header display
    } else if (buttonIsType) {
      // --- START: Type Button Logic ---
      const selectedType = clickedButton.dataset.type;
      updatePlaceholder(selectedType);

      // Simplified previous type tracking
      let previousType = null;
      typeButtons.forEach((btn) => {
        if (btn !== clickedButton && btn.classList.contains("selected")) {
          previousType = btn.dataset.type;
        }
      });
      // Deselect others and select clicked one
      typeButtons.forEach((btn) => btn.classList.remove("selected"));
      clickedButton.classList.add("selected");

      if (previousType === "email" && selectedType !== "email") {
        EmailHandler.clearData();
      }

      // Check if we should update the default tone (ONLY if mode is 'initial')
      if (toneSelectionMode === "initial") {
        console.log(
          "Type changed and tone mode is 'initial', updating default tone..."
        );
        let defaultToneValue = "friendly";
        if (selectedType === "email") {
          defaultToneValue = "formal";
        } else if (selectedType === "social") {
          defaultToneValue = "informative";
        }

        const defaultToneCategoryButton = document.querySelector(
          `#tone-categories .tone-buttons[data-tone='${defaultToneValue}']`
        );

        if (defaultToneCategoryButton) {
          const allToneButtons = document.querySelectorAll(
            ".tone-buttons[data-tone]"
          );
          allToneButtons.forEach((btn) => btn.classList.remove("selected"));
          defaultToneCategoryButton.classList.add("selected");
          updateMainToneDisplay(defaultToneCategoryButton);
          // IMPORTANT: Keep mode as 'initial' here, as this was not a user tone click
        } else {
          // Fallback needed?
        }
      } else {
        console.log(
          `Type changed but tone mode is '${toneSelectionMode}', keeping existing tone.`
        );
      }
      // --- END: Type Button Logic ---
    }
  }

  // Add click event listeners to all option buttons
  typeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const timestamp = new Date().toISOString();
      console.log(
        `[DIAG-FOCUS-CLICK] ${timestamp} - Click detected on typeButton:`,
        button
      );
      handleButtonSelection(typeButtons, button);
      // Explicitly update focus indicator based on the CLICKED button
      updateFocusIndicator(button, "typeButton_click"); // Function is now defined in this scope
    });
  });

  // Tone category buttons listener
  const categoryToneButtons = document.querySelectorAll(
    "#tone-categories .tone-buttons[data-tone]"
  );
  categoryToneButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Set the mode when a category button is explicitly clicked
      toneSelectionMode = button.dataset.tone === "auto" ? "auto" : "specific";
      console.log(
        `Category button ${button.dataset.tone} clicked. toneSelectionMode = '${toneSelectionMode}'`
      );
      handleButtonSelection(toneButtons, button); // Use allToneButtons for deselection logic inside
    });
  });

  // Icon button functionality
  // Clear input text
  clearInputBtn.addEventListener("click", () => {
    saveStateForUndo(); // Save state BEFORE clearing
    setTextToContentEditable(messageInputEl, "");

    // --- START: Conditional Height Reset ---
    // Only reset height to CSS min-height if keyboard is DOWN
    if (!isKeyboardOpen) {
      messageInputEl.style.minHeight = "240px";
      console.log("Keyboard down, reset height on clear.");
    } else {
      console.log("Keyboard up, skipped height reset on clear.");
    }
    // --- END: Conditional Height Reset ---

    messageInputEl.focus(); // Keep focus behavior
    showIconFeedback(clearInputBtn);
    checkContentAndUpdateBody();
    createUndoButton(); // Show undo button AFTER clearing

    // --- START: Conditional Distance Update ---
    // Only update distance/height if keyboard is DOWN
    if (!isKeyboardOpen) {
      updateCursorDistance();
      console.log("Keyboard down, updated cursor distance on clear.");
    } else {
      console.log("Keyboard up, skipped cursor distance update on clear.");
    }
    // --- END: Conditional Distance Update ---
  });

  // Copy input text
  copyInputBtn.addEventListener("click", () => {
    const inputText = getTextFromContentEditable(messageInputEl);
    if (inputText) {
      navigator.clipboard
        .writeText(inputText)
        .then(() => {
          showIconFeedback(copyInputBtn);
        })
        .catch((err) => {
          console.error("Failed to copy text to clipboard:", err);
        });
    }
  });

  // Paste text into input
  pasteInputBtn.addEventListener("click", () => {
    navigator.clipboard
      .readText()
      .then((text) => {
        setTextToContentEditable(messageInputEl, text);
        messageInputEl.focus();
        showIconFeedback(pasteInputBtn);

        // --- START: Conditional Distance Update ---
        // Only trigger resize/distance update if keyboard is DOWN
        if (!isKeyboardOpen) {
          updateCursorDistance();
          console.log("Keyboard down, updated cursor distance on paste.");
        } else {
          console.log("Keyboard up, skipped cursor distance update on paste.");
        }
        // --- END: Conditional Distance Update ---

        // Ensure content check runs after paste
        checkContentAndUpdateBody();
      })
      .catch((err) => {
        console.error("Failed to copy text to clipboard:", err);
      });
  });

  // Clear output text
  clearOutputBtn.addEventListener("click", () => {
    saveStateForUndo(); // Save state BEFORE clearing
    polishedMessageEl.textContent = "";
    polishedMessageEl.style.display = "none";
    outputIcons.style.display = "none";
    document.body.classList.remove("response-generated");
    showIconFeedback(clearOutputBtn);
    checkContentAndUpdateBody();
    createUndoButton(); // Show undo button AFTER clearing

    // Sync signature button state after clearing
    syncSignatureButtonState();
  });

  // Copy output text
  copyOutputBtn.addEventListener("click", () => {
    if (polishedMessageEl.innerHTML) {
      // Get the text content from all paragraph elements
      const textToCopy =
        polishedMessageEl.innerText || polishedMessageEl.textContent;

      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          showIconFeedback(copyOutputBtn);
        })
        .catch((err) => {
          console.error("Failed to copy text to clipboard:", err);
        });
    }
  });

  // Paste output text to input
  pasteOutputBtn.addEventListener("click", () => {
    const outputText =
      polishedMessageEl.innerText || polishedMessageEl.textContent;
    debugLog("PASTE_OUTPUT", "Paste output button clicked", {
      outputText: outputText?.substring(0, 50) + "...",
    });

    if (outputText) {
      const inputBeforeHTML = messageInputEl.innerHTML;
      const inputBeforeHeight = messageInputEl.offsetHeight;
      const inputBeforeMinHeight = messageInputEl.style.minHeight;
      debugLog("PASTE_OUTPUT", "Before setting text", {
        inputBeforeHTML: inputBeforeHTML?.substring(0, 50) + "...",
        inputBeforeHeight,
        inputBeforeMinHeight,
      });

      // <<< ADDED RESET >>>
      debugLog("PASTE_OUTPUT", "Resetting min-height to 240px before paste");
      messageInputEl.style.minHeight = "240px";
      // <<< END ADDED RESET >>>

      setTextToContentEditable(messageInputEl, outputText);

      const inputAfterHTML = messageInputEl.innerHTML;
      debugLog("PASTE_OUTPUT", "After setting text", {
        inputAfterHTML: inputAfterHTML?.substring(0, 50) + "...",
      });

      messageInputEl.focus();
      debugLog("PASTE_OUTPUT", "Input focused");
      showIconFeedback(pasteOutputBtn);

      // <<< ADDED UPDATES >>>
      // Ensure height is recalculated and body class is updated
      debugLog(
        "PASTE_OUTPUT",
        "Calling updateCursorDistance and checkContentAndUpdateBody"
      );
      const heightBeforeUpdate = messageInputEl.offsetHeight;
      const minHeightBeforeUpdate = messageInputEl.style.minHeight;
      updateCursorDistance();
      checkContentAndUpdateBody();
      const heightAfterUpdate = messageInputEl.offsetHeight;
      const minHeightAfterUpdate = messageInputEl.style.minHeight;

      // <<< WORKAROUND START: Reset height if keyboard is closed >>>
      if (!isKeyboardOpen) {
        debugLog(
          "PASTE_OUTPUT",
          "Applying height: auto workaround (Keyboard CLOSED)"
        );
        messageInputEl.style.height = "auto";
      }
      // <<< WORKAROUND END >>>

      debugLog("PASTE_OUTPUT", "Finished updates", {
        heightBeforeUpdate,
        minHeightBeforeUpdate,
        heightAfterUpdate,
        minHeightAfterUpdate,
      });
      console.log("Updated distance and content status after paste-output.");
    } else {
      debugLog("PASTE_OUTPUT", "No output text to paste");
    }
  });

  // Track the last processed email data for sharing
  let lastEmailData = {
    subject: "",
    body: "",
  };

  // Email Handler - Consolidated email-related functionality
  const EmailHandler = {
    // Format email with subject and body
    format: function (subject, body) {
      console.log("Formatting email with subject and body");

      // Remove [Your Name] and variations with regex
      const cleanedBody = body.replace(
        /\[Your Name\]|\[NAME\]|\[Name\]|\[your name\]/g,
        ""
      );

      return `${subject}

***


${cleanedBody}


`;
    },

    // Process email response from API
    processResponse: function (data) {
      console.log("Processing email response");
      let displayText;

      // Handle structured JSON response
      if (typeof data.improved === "object") {
        console.log("Received structured email response:", data.improved);

        // Clean the body *before* saving and formatting
        const rawBody = data.improved.body;
        const cleanedBody = rawBody
          .replace(/\[Your Name\]|\[NAME\]|\[Name\]|\[your name\]/g, "")
          .trim(); // Clean and trim

        console.log("Subject:", data.improved.subject);
        console.log(
          "Cleaned Body preview:",
          cleanedBody.substring(0, 50) + "..."
        );

        // Save cleaned data for sharing
        lastEmailData.subject = data.improved.subject;
        lastEmailData.body = cleanedBody; // Save the cleaned version

        // Format using the subject and the *cleaned* body for display
        displayText = this.format(data.improved.subject, cleanedBody);
      }
      // Handle string response (fallback)
      else if (typeof data.improved === "string") {
        console.log("Received unstructured email response, formatting locally");

        // Clean the text *before* extracting subject or saving
        const rawText = data.improved;
        const cleanedText = rawText
          .replace(/\[Your Name\]|\[NAME\]|\[Name\]|\[your name\]/g, "")
          .trim(); // Clean and trim

        // Extract subject from the *cleaned* text
        const subjectText = this.extractSubject(cleanedText);

        // Save cleaned data for sharing
        lastEmailData.subject = subjectText;
        lastEmailData.body = cleanedText; // Save the cleaned version

        // Format the email using the *cleaned* text
        displayText = this.format(subjectText, cleanedText);
      }

      return displayText;
    },

    // Extract subject from email text
    extractSubject: function (text) {
      const firstSentenceMatch = text.match(/^([^.!?]+[.!?])/);
      if (!firstSentenceMatch) return "Email Subject";

      let subjectText = firstSentenceMatch[1].trim();
      // Limit subject length to 50 chars
      return subjectText.length > 50
        ? subjectText.substring(0, 47) + "..."
        : subjectText;
    },

    // Share email via mailto
    shareViaEmail: function () {
      console.log("Attempting to share email via mailto");

      // 1. Get the current displayed text from the output element
      const polishedMessageEl = document.getElementById("polished-message");
      const currentFullText =
        polishedMessageEl.innerText || polishedMessageEl.textContent;

      // 2. Try to parse subject and body based on the known separator
      const separator = "\n\n***\n\n"; // Separator used in EmailHandler.format
      const separatorIndex = currentFullText.indexOf(separator);

      let subjectToShare = "Hi There 🙂"; // Default subject
      let bodyToShare = currentFullText; // Default to full text if parsing fails

      if (separatorIndex !== -1) {
        subjectToShare = currentFullText.substring(0, separatorIndex).trim();
        bodyToShare = currentFullText
          .substring(separatorIndex + separator.length)
          .trim();
        console.log("Parsed current text for sharing:", {
          subject: subjectToShare,
        });
      } else {
        // If separator is missing (likely due to edits), use the whole text as body
        console.warn(
          "Could not find '***' separator in edited text. Sharing full content as body."
        );
        // You could potentially fall back to the old link-click method here, or just alert.
        alert(
          "Could not open email client automatically. Please check popup blockers."
        );
      }

      // 3. Construct the mailto URL
      const mailtoHref = `mailto:?subject=${encodeURIComponent(
        subjectToShare
      )}&body=${encodeURIComponent(bodyToShare)}`;

      // 4. Try to open the mailto link in a new tab/window
      const mailWindow = window.open(mailtoHref);

      // Check if the window was blocked (popup blockers)
      if (
        !mailWindow ||
        mailWindow.closed ||
        typeof mailWindow.closed == "undefined"
      ) {
        // Fallback or alert user if window.open failed (optional)
        console.warn(
          "Could not open mailto link automatically (popup blocker?)."
        );
        // You could potentially fall back to the old link-click method here, or just alert.
        alert(
          "Could not open email client automatically. Please check popup blockers."
        );
      }
    },

    // Clear email data
    clearData: function () {
      lastEmailData.subject = "";
      lastEmailData.body = "";
    },
  };

  // Update the polishBtn event listener
  polishBtn.addEventListener("click", async () => {
    const timestamp = new Date().toISOString();
    console.log(
      `[DIAG-FOCUS-CLICK] ${timestamp} - Click detected on polishBtn:`,
      polishBtn
    );
    // Explicitly update focus indicator based on the CLICKED polish button
    updateFocusIndicator(polishBtn, "polishBtn_click");

    console.log("--- New Polish Click ---"); // Updated Log

    // --- Stop Mic if Active ---
    if (isRecognizing && recognition) {
      console.log("Polish button clicked, stopping microphone...");
      manualStop = true; // Prevent auto-restart
      recognition.stop();
    }

    // --- START: Remove Undo Button ---
    const undoButton = document.getElementById("undo-button");
    if (undoButton) {
      console.log("Polish button clicked, removing undo button...");
      undoButton.remove();
    }
    // --- END: Remove Undo Button ---

    // Get selected options
    const selectedType = document.querySelector(
      ".text-type-option-btn[data-type].selected"
    ).dataset.type;
    const selectedTone = document.querySelector(
      ".tone-buttons[data-tone].selected"
    ).dataset.tone;
    const originalMessage = getTextFromContentEditable(messageInputEl).trim();

    // Map "auto" values to "automatic" for API communication to avoid car emoji issues
    // This preserves the UI labels while using a safer term for backend processing
    const apiTone = selectedTone === "auto" ? "automatic" : selectedTone;

    // Collapse the tone categories when polish button is pressed
    const toneCategories = document.getElementById("tone-categories");
    const toggleTonesBtn = document.getElementById("toggle-tones");
    if (toneCategories && toggleTonesBtn) {
      toneCategories.classList.remove("expanded-tones");
      toneCategories.classList.add("collapsed-tones");
      toggleTonesBtn.textContent = "⏬";
      // Remove the tones-expanded class from body as well
      document.body.classList.remove("tones-expanded");
    }

    if (!originalMessage) {
      alert("Please enter a message before polishing.");
      return;
    }

    // Change button state to indicate loading with spinning hourglass
    startHourglassAnimation(polishBtn);
    polishBtn.disabled = true;

    // Hide output elements while processing
    polishedMessageEl.style.display = "none";
    outputIcons.style.display = "none";

    // Add retry functionality
    const maxRetries = 2; // Maximum number of retry attempts
    let retryCount = 0;

    async function callAPIWithRetry() {
      try {
        // Create the API URL - works for both local development and production
        const apiUrl =
          window.location.hostname === "localhost"
            ? "http://localhost:3000/api/improve"
            : "/api/improve";

        // Set returnFormat parameter for emails to get structured response
        const returnFormat = selectedType === "email" ? "json" : "text";
        console.log(`Request type: ${selectedType}, format: ${returnFormat}`);

        // Call our backend API
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: originalMessage,
            messageType: selectedType,
            tone: apiTone, // Use the mapped value
            returnFormat: returnFormat, // Add format parameter
          }),
        });

        if (!response.ok) {
          // If we get a 500 error and haven't exceeded max retries
          if (response.status === 500 && retryCount < maxRetries) {
            retryCount++;
            console.log(
              `API returned 500 error. Retry attempt ${retryCount}/${maxRetries}`
            );
            // polishedMessageEl.textContent = `Processing... (Retry ${retryCount}/${maxRetries})`; // No need to show this if container is hidden
            // Wait a second before retrying
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return callAPIWithRetry(); // Recursive retry
          }
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();

        // Check if there's an error message in the response
        if (data.error) {
          throw new Error(`API Error: ${data.error}`);
        }

        // ---> STEP 1: Remember signature state BEFORE clearing <---
        const wasSignatureActiveBeforePolish =
          !!polishedMessageEl.querySelector("#signature-line-output");
        console.log(
          "[DEBUG] Persist Signature: Was active before clearing?",
          wasSignatureActiveBeforePolish
        );

        // Format the improved text with proper paragraphs
        if (data.improved) {
          console.log("Original improved text:", data.improved);

          // Clear existing content AFTER checking state
          polishedMessageEl.innerHTML = "";

          // Add a class to the body to indicate content has been generated
          document.body.classList.add("response-generated");

          // Handle the improved text based on its format (plain text or JSON with subject/body)
          let displayText;

          if (selectedType === "email") {
            // Process email using the consolidated EmailHandler
            displayText = EmailHandler.processResponse(data);
            console.log("After email processing:", displayText);
          } else {
            // For non-email responses
            // Apply emoji density limitation
            displayText = data.improved;
            console.log("Bypassing emoji density limiting:", displayText);

            // Clear email data since this is not an email
            EmailHandler.clearData();
          }

          // For text messages, format paragraphs with emoji breaks
          if (selectedType === "text-message") {
            displayText = formatEmojiBreaks(displayText);
            console.log("After emoji breaks formatting:", displayText);
          }

          // Split text by line breaks (handle both \n\n and single \n with proper spacing)
          const paragraphs = displayText
            .split(/\n\n+/)
            .flatMap((block) => {
              // Further split by single newlines but preserve as separate paragraphs
              const result = block.split(/\n/);
              return result;
            })
            .filter((p) => {
              // Filter out empty strings, strings containing only whitespace,
              // and strings containing only whitespace and/or variation selectors
              const trimmed = p.trim();
              // Check if trimmed string is empty OR if it consists ONLY of Variation Selector 16 (U+FE0F)
              return trimmed !== "" && !/^\uFE0F+$/.test(trimmed);
            });

          // Create paragraph elements for each section
          paragraphs.forEach((paragraph, index) => {
            if (paragraph.trim()) {
              console.log(`Creating paragraph ${index}:`, paragraph.trim());
              const p = document.createElement("p");
              p.textContent = paragraph.trim();
              polishedMessageEl.appendChild(p);
            }
          });

          // If there were no paragraphs, just set the text directly
          if (polishedMessageEl.children.length === 0) {
            polishedMessageEl.textContent = displayText;
          }

          // ---> STEP 3: Re-apply signature state AFTER rendering (Direct Manipulation Approach) <---
          console.log(
            "[DEBUG] Persist Signature (Direct): Checking flag after render:",
            wasSignatureActiveBeforePolish
          );
          if (wasSignatureActiveBeforePolish) {
            // If signature WAS active before, ensure it exists and button is active now.
            let existingSignature = polishedMessageEl.querySelector(
              "#signature-line-output"
            );
            if (!existingSignature) {
              // Create and append the signatureDiv directly
              const signatureDiv = document.createElement("div");
              signatureDiv.id = "signature-line-output"; // Use the correct ID
              signatureDiv.className = "signature-container";
              signatureDiv.innerHTML = `
                <div class="signature-dashes">----------------------------</div>
                <div class="signature-text-container">
                  <span>Polished by <a href="https://textpolish.com" target="_blank" class="signature-link" rel="noopener noreferrer">TextPolish.com</a> ✍🏻</span>
                </div>
              `;
              polishedMessageEl.appendChild(signatureDiv);
              console.log(
                "[DEBUG] Persist Signature (Direct): Added signature element."
              );
            } else {
              console.log(
                "[DEBUG] Persist Signature (Direct): Signature element already existed."
              );
            }
            // Directly ensure the button is active
            if (signatureOutputBtn) {
              signatureOutputBtn.classList.add("active");
              console.log(
                "[DEBUG] Persist Signature (Direct): Set button class to active."
              );
            }
          } else {
            // If signature was NOT active before, ensure element is removed and button is inactive.
            let existingSignature = polishedMessageEl.querySelector(
              "#signature-line-output"
            );
            if (existingSignature) {
              existingSignature.remove();
              console.log(
                "[DEBUG] Persist Signature (Direct): Removed signature element."
              );
            }
            if (signatureOutputBtn) {
              signatureOutputBtn.classList.remove("active");
              console.log(
                "[DEBUG] Persist Signature (Direct): Set button class to inactive."
              );
            }
          }
          // END: Re-apply signature state (Direct Manipulation Approach)

          // Update body class since we have content
          document.body.classList.add("has-content");
        } else {
          polishedMessageEl.textContent = "No improvements were made.";
        }

        // Set button text back to normal immediately
        stopHourglassAnimation(polishBtn, "Polish");

        // Show output elements now that we have a result
        polishedMessageEl.style.display = "block";
        outputIcons.style.display = "flex";
      } catch (error) {
        // Show output elements for error messages
        polishedMessageEl.style.display = "block";
        outputIcons.style.display = "flex";

        polishedMessageEl.textContent = `Something went wrong: ${error.message}. Please try again.`;
        console.error("Error:", error);

        // Remove the response-generated class on error
        document.body.classList.remove("response-generated");

        // Reset button state
        stopHourglassAnimation(polishBtn, "Polish");
        polishBtn.disabled = false;

        // Make sure to check content state
        checkContentAndUpdateBody();

        // Ensure signature state is synced even on error (likely becomes inactive)
        syncSignatureButtonState();
      } finally {
        // Enable button
        polishBtn.disabled = false;
      }
    }

    // Start the API call with retry functionality
    await callAPIWithRetry();
  });

  // Helper function to check if an element is in the viewport
  function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  // Add toggle functionality for tone categories
  const toggleTonesBtn = document.getElementById("toggle-tones");
  const toneCategories = document.getElementById("tone-categories");

  if (toggleTonesBtn && toneCategories) {
    toggleTonesBtn.addEventListener("click", function () {
      if (toneCategories.classList.contains("collapsed-tones")) {
        toneCategories.classList.remove("collapsed-tones");
        toneCategories.classList.add("expanded-tones");
        toggleTonesBtn.textContent = "⏫";
        // Add class to body to enable polish button safe zone and disable elastic bounce
        document.body.classList.add("tones-expanded");
        document.body.classList.add("has-content");

        // No scrolling behavior - removed to keep polish button visible
      } else {
        toneCategories.classList.remove("expanded-tones");
        toneCategories.classList.add("collapsed-tones");
        toggleTonesBtn.textContent = "⏬";
        // Remove class from body to disable polish button safe zone
        document.body.classList.remove("tones-expanded");
      }
    });
  }

  // Add scroll to top functionality
  const scrollToTopBtn = document.getElementById("scroll-to-top");
  if (scrollToTopBtn) {
    scrollToTopBtn.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }

  // Share output text
  const shareOutputBtn = document.getElementById("share-output");
  if (shareOutputBtn) {
    shareOutputBtn.addEventListener("click", () => {
      const outputElement = polishedMessageEl;
      if (outputElement.innerText || outputElement.textContent) {
        // --- START: Check CURRENTLY selected type ---
        const currentSelectedTypeButton = document.querySelector(
          ".text-type-option-btn.selected"
        );
        const currentSelectedType = currentSelectedTypeButton?.dataset.type;
        console.log(
          "Share clicked. Currently selected type:",
          currentSelectedType
        );
        // --- END: Check CURRENTLY selected type ---

        const textToShare =
          outputElement.innerText || outputElement.textContent;
        console.log("Text to share content length:", textToShare.length);

        // --- START: Conditional Sharing Logic ---
        if (currentSelectedType === "email") {
          // If Email is currently selected, attempt mailto sharing
          console.log("Sharing as email based on current selection.");
          EmailHandler.shareViaEmail(); // This function already gets current text
          showIconFeedback(shareOutputBtn);
        } else {
          // For Text Message or Social Post, use Web Share API / Fallback
          console.log("Sharing as text/social based on current selection.");
          if (navigator.share) {
            console.log("Web Share API available, sharing content");
            navigator
              .share({
                title: "Text Polish",
                text: textToShare,
              })
              .then(() => {
                console.log("Share successful via Web Share API");
                showIconFeedback(shareOutputBtn);
              })
              .catch((error) => {
                console.error("Error sharing via Web Share API:", error);
                tryClipboardFallback(textToShare);
              });
          } else {
            console.log(
              "Web Share API not available, using clipboard fallback"
            );
            tryClipboardFallback(textToShare);
          }
        }
        // --- END: Conditional Sharing Logic ---

        // REMOVED: Old logic based on lastEmailData
        /*
        // Check if we have email data to share
        if (lastEmailData.subject && lastEmailData.body) {
          console.log("Sharing as email");
          EmailHandler.shareViaEmail();
          showIconFeedback(shareOutputBtn);
          return;
        }

        // Regular sharing for non-email content
        if (navigator.share) { ... }
        */
      } else {
        console.warn("Nothing to share - no text in output");
        alert("Nothing to share - please polish some text first");
      }
    });
  }

  // Simplified clipboard fallback
  function tryClipboardFallback(text) {
    console.log("Attempting clipboard fallback...");

    navigator.clipboard
      .writeText(text)
      .then(() => {
        console.log("Text successfully copied to clipboard");
        alert("Text copied to clipboard for sharing!");
        showIconFeedback(shareOutputBtn);
      })
      .catch((err) => {
        console.error("Failed to copy text to clipboard:", err);
      });
  }

  // Provide visual feedback when icon button is clicked
  function showIconFeedback(button) {
    console.log("Showing visual feedback for button");
    const originalBg = button.style.backgroundColor || "";
    button.style.backgroundColor = "#25a56a";

    // Add a temporary class for additional visual feedback
    button.classList.add("button-feedback");

    setTimeout(() => {
      button.style.backgroundColor = originalBg;
      button.classList.remove("button-feedback");
      console.log("Visual feedback completed");
    }, 50); // Increased to 500ms for more noticeable effect
  }

  // Create a spinning animation for the hourglass
  function startHourglassAnimation(button) {
    // Reset any existing animation
    clearInterval(button.spinInterval);

    const hourglassEmojis = ["⏳", "⌛"];
    let hourglassIndex = 0;

    // Dot animation pattern - now includes 4 dots in the sequence
    const dotPatterns = [" ", ".", "..", "...", "....", "...", "..", "."];
    let dotIndex = 0;

    // Store the original text without emoji
    const originalText = "Polishing";

    // Set initial state
    button.textContent = `${originalText} ${hourglassEmojis[hourglassIndex]}${dotPatterns[dotIndex]}`;

    // Start animation interval
    button.spinInterval = setInterval(() => {
      // Update hourglass every other frame
      if (dotIndex % 2 === 0) {
        hourglassIndex = (hourglassIndex + 1) % hourglassEmojis.length;
      }

      // Update dot pattern every frame
      dotIndex = (dotIndex + 1) % dotPatterns.length;

      button.textContent = `${originalText} ${hourglassEmojis[hourglassIndex]}${dotPatterns[dotIndex]}`;
    }, 300); // Slightly faster animation (300ms) to make the dots more fluid
  }

  // Stop the animation and reset the button
  function stopHourglassAnimation(button, newText) {
    clearInterval(button.spinInterval);
    button.textContent = newText;
  }

  // Function to add paragraph breaks after emojis (except those at the very beginning
  // or followed by punctuation/other emojis) in text messages.
  // Simplified: Replaces space after suitable emoji with single newline.
  function formatEmojiBreaks(text) {
    // Don't process empty text or non-text-message types
    const selectedType = document.querySelector(
      ".text-type-option-btn[data-type].selected"
    )?.dataset.type;
    if (!text || text.length === 0 || selectedType !== "text-message")
      return text;

    console.log("formatEmojiBreaks input:", JSON.stringify(text));

    // Regex to find an emoji followed by a single space, NOT followed by punctuation or another emoji.
    // Using lookahead assertion.
    const emojiFollowedBySpaceRegex =
      /(\p{Emoji_Presentation}|\p{Extended_Pictographic})(\uFE0F)?\s(?![\p{Punctuation}\s\p{Emoji_Presentation}\p{Extended_Pictographic}])/gu;

    let processedText = text.replace(emojiFollowedBySpaceRegex, "$1$2\n");

    console.log("formatEmojiBreaks output:", JSON.stringify(processedText));
    return processedText;
  }

  // --- Page Visibility API Listener ---
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      // Page is hidden (user switched tabs/apps)
      console.log("Page hidden");
      // Optional: Add code here to pause things if needed
    } else {
      // Page is visible again (user returned)
      console.log("Page visible again - checking state...");
      // Re-enable polish button if it was disabled
      if (polishBtn) polishBtn.disabled = false;
      // Re-check content in case state was lost/reset
      checkContentAndUpdateBody();

      // --- START: Reset potentially inconsistent Mic state ---
      if (isRecognizing && recognition) {
        console.log(
          "Page became visible while recognition was active. Resetting mic state for consistency."
        );
        manualStop = true; // Prevent auto-restart from the onend event this might trigger
        recognition.stop(); // Explicitly stop recognition
        // The onend event handler will reset isRecognizing and UI elements.
      }
      // --- END: Reset potentially inconsistent Mic state ---
    }
  });
  // --- End Page Visibility API Listener ---

  // --- UNDO FUNCTIONALITY --- START ---

  // Function to save state to sessionStorage
  function saveStateForUndo() {
    const state = {
      inputText: getTextFromContentEditable(messageInputEl),
      outputHTML: polishedMessageEl.innerHTML,
      selectedType: document.querySelector(".text-type-option-btn.selected")
        ?.dataset.type,
      selectedTone: document.querySelector(".tone-buttons.selected")?.dataset
        .tone,
      tonesVisible: !document
        .getElementById("tone-categories")
        .classList.contains("collapsed-tones"),
    };
    // Only save if there's something to save
    if (
      state.inputText ||
      (state.outputHTML && state.outputHTML.trim() !== "")
    ) {
      try {
        sessionStorage.setItem(UNDO_STORAGE_KEY, JSON.stringify(state));
        console.log("State saved for undo");
      } catch (e) {
        console.error("Failed to save state to sessionStorage:", e);
      }
    } else {
      // If nothing to save, ensure any previous state is cleared
      sessionStorage.removeItem(UNDO_STORAGE_KEY);
      console.log("Nothing to save, cleared undo state.");
    }
  }

  // Function to restore state from sessionStorage
  function restoreState() {
    try {
      const savedStateJSON = sessionStorage.getItem(UNDO_STORAGE_KEY);
      if (!savedStateJSON) return; // No state saved

      const savedState = JSON.parse(savedStateJSON);

      // Restore input
      setTextToContentEditable(messageInputEl, savedState.inputText || "");

      // Restore output
      polishedMessageEl.innerHTML = savedState.outputHTML || "";
      if (polishedMessageEl.innerHTML.trim()) {
        polishedMessageEl.style.display = "block";
        outputIcons.style.display = "flex";
        polishedMessageEl.contentEditable = "false"; // Ensure it's not editable initially
        editOutputBtn.classList.remove("active"); // Assuming editOutputBtn exists
        // Make sure edit button icon resets if it exists
        const editBtnIcon = editOutputBtn?.querySelector(".icon");
        if (editBtnIcon) editBtnIcon.textContent = "✏️";
      } else {
        polishedMessageEl.style.display = "none";
        outputIcons.style.display = "none";
      }

      // Restore type selection
      if (savedState.selectedType) {
        const typeButton = document.querySelector(
          `.text-type-option-btn[data-type="${savedState.selectedType}"]`
        );
        if (typeButton) handleButtonSelection(typeButtons, typeButton);
      }

      // Restore tone selection
      if (savedState.selectedTone) {
        const toneButton = document.querySelector(
          `.tone-buttons[data-tone="${savedState.selectedTone}"]`
        );
        if (toneButton) {
          // Check if it's a category button or the header button
          if (toneButton.closest("#tone-categories")) {
            handleButtonSelection(toneButtons, toneButton); // Selects in category
          } else {
            // If it was the header button (e.g., Auto), select it directly
            handleButtonSelection(toneButtons, toneButton);
          }
        }
      }

      // Restore tone category visibility
      const toneCategories = document.getElementById("tone-categories");
      const toggleTonesBtn = document.getElementById("toggle-tones");
      if (savedState.tonesVisible) {
        toneCategories.classList.remove("collapsed-tones");
        toneCategories.classList.add("expanded-tones");
        toggleTonesBtn.textContent = "🔼";
        document.body.classList.add("tones-expanded");
      } else {
        toneCategories.classList.add("collapsed-tones");
        toneCategories.classList.remove("expanded-tones");
        toggleTonesBtn.textContent = "⏬";
        document.body.classList.remove("tones-expanded");
      }

      // Clean up storage
      sessionStorage.removeItem(UNDO_STORAGE_KEY);

      // Trigger UI updates
      updateCursorDistance(); // Recalculate distance/height
      checkContentAndUpdateBody();

      console.log("State restored");
    } catch (e) {
      console.error("Failed to restore state from sessionStorage:", e);
      // Clear potentially corrupted state
      sessionStorage.removeItem(UNDO_STORAGE_KEY);
    }
  }

  // Function to create and show the Undo button
  function createUndoButton() {
    // Check if button already exists
    if (document.getElementById("undo-button")) return;

    const undoButton = document.createElement("button");
    undoButton.id = "undo-button";
    undoButton.textContent = "↩️"; // Standard Undo Emoji
    undoButton.title = "Undo last state (before refresh)";

    undoButton.addEventListener("click", () => {
      restoreState();
      undoButton.remove(); // Remove button after clicking
    });

    // --- START: Append to Logo Container ---
    const logoContainer = document.querySelector(".logo-container");
    if (logoContainer) {
      logoContainer.appendChild(undoButton); // Append inside logo container
    } else {
      // Fallback: append to body if logo container not found
      // Fallback: append to body if polish button not found (shouldn't happen)
      console.error("Polish button not found, appending undo button to body.");
      document.body.appendChild(undoButton);
    }
    // --- END: Append to Logo Container ---
  }

  // Add listener to save state before unloading the page
  // window.addEventListener(\"beforeunload\", saveStateForUndo); // Less reliable on mobile
  // Use pagehide instead
  window.addEventListener("pagehide", saveStateForUndo); // More reliable for bfcache/mobile

  // Check for saved state on page load (initial load)
  if (sessionStorage.getItem(UNDO_STORAGE_KEY)) {
    createUndoButton();
  }

  // --- UNDO FUNCTIONALITY --- END ---

  // Function to update placeholder text dynamically
  function updatePlaceholder(type) {
    let placeholderText = "";
    switch (type) {
      case "email":
        placeholderText = "Type your Email content here...";
        break;
      case "social":
        placeholderText = "Type your Social Post here...";
        break;
      case "text-message":
      default:
        placeholderText = "Type your Message here...";
        break;
    }
    // Use data-placeholder attribute instead of standard placeholder
    if (messageInputEl) {
      // messageInputEl.placeholder = placeholderText; // OLD LINE - REMOVE
      messageInputEl.dataset.placeholder = placeholderText; // NEW LINE - ADD
    }
  }

  // --- START: New Function to Update Header Tone Display ---
  function updateMainToneDisplay(selectedToneButton) {
    // Target the new parent container
    const toneGroupContainer = document.querySelector(".tone-selection-group");
    if (!toneGroupContainer) {
      console.error("Could not find .tone-selection-group container!");
      return;
    }

    // Find the Auto button WITHIN the new container
    const autoButton = toneGroupContainer.querySelector(
      '.tone-buttons[data-tone="auto"]'
    );
    const selectedTone = selectedToneButton.dataset.tone;
    const toneText = selectedToneButton.innerHTML; // Includes emoji if present

    // Find existing specific tone button in the new container, if it exists
    const existingHeaderToneButton = toneGroupContainer.querySelector(
      '.tone-buttons:not([data-tone="auto"])'
    );

    if (selectedTone === "auto") {
      // If AUTO is selected
      if (autoButton) autoButton.classList.add("selected");
      // Just DESELECT the specific tone button in header if it exists, DO NOT remove
      if (existingHeaderToneButton) {
        existingHeaderToneButton.classList.remove("selected");
      }
    } else {
      // If a SPECIFIC tone is selected
      if (autoButton) autoButton.classList.remove("selected");

      // Remove the OLD specific header button before adding the NEW one
      if (existingHeaderToneButton) {
        existingHeaderToneButton.remove();
      }

      // Create a brand new header button for the specific tone
      const newHeaderToneButton = document.createElement("button");
      newHeaderToneButton.className = "tone-buttons selected"; // Start selected
      newHeaderToneButton.dataset.tone = selectedTone;
      newHeaderToneButton.innerHTML = toneText;

      // Add the single, correct event listener to the NEW button
      newHeaderToneButton.addEventListener("click", () => {
        console.log(
          "Header button clicked, finding original category button...",
          selectedTone
        );
        const originalButton = document.querySelector(
          `#tone-categories .tone-buttons[data-tone="${selectedTone}"]`
        );
        if (originalButton) {
          console.log(
            "Found original button, simulating click:",
            originalButton
          );
          originalButton.click(); // Simulate click on the original button in the category
        } else {
          console.warn(
            "Could not find original category button for tone:",
            selectedTone
          );
        }
      });

      // Insert the new button AFTER the Auto button
      if (autoButton) {
        autoButton.parentNode.insertBefore(
          newHeaderToneButton,
          autoButton.nextSibling
        );
      } else {
        // Fallback if auto button isn't found (shouldn't happen)
        toneGroupContainer.appendChild(newHeaderToneButton);
      }
    }
  }
  // --- END: Function to Update Header Tone Display ---\

  // --- START: Listener for Header Tone Buttons (Now targets .tone-selection-group) ---
  const toneGroupContainerForListener = document.querySelector(
    ".tone-selection-group"
  );
  if (toneGroupContainerForListener) {
    toneGroupContainerForListener.addEventListener("click", (event) => {
      // Find the closest tone button that was clicked
      const clickedButton = event.target.closest(".tone-buttons[data-tone]");
      if (!clickedButton) return; // Ignore clicks not on a tone button

      const clickedTone = clickedButton.dataset.tone;
      console.log(
        `Direct click captured on header button: ${clickedTone}. Setting TONE MODE.`
      );

      // Set the TONE MODE based on which header button was clicked
      if (clickedTone === "auto") {
        toneSelectionMode = "auto";
        console.log("toneSelectionMode set to 'auto' (Auto header clicked)");
        // We still need handleButtonSelection to run for Auto to deselect others
        handleButtonSelection(toneButtons, clickedButton);
      } else {
        toneSelectionMode = "specific";
        console.log(
          "toneSelectionMode set to 'specific' (Specific header clicked)"
        );
        // The existing listener on the button itself (added in updateMainToneDisplay)
        // will simulate the click on the category button. handleButtonSelection
        // will correctly ignore the simulated click due to the 'selected' check,
        // but the mode is now correctly set.
      }
    });
  }
  // --- END: Listener for Header Tone Buttons (.tone-options) ---

  // Add listener to check state when page is shown (including bfcache restores)
  window.addEventListener("pageshow", (event) => {
    console.log("pageshow event fired. Persisted:", event.persisted);
    // Check for state again, especially if restored from bfcache
    if (sessionStorage.getItem(UNDO_STORAGE_KEY)) {
      // createUndoButton already checks if the button exists, so it's safe to call again
      createUndoButton();
    }
  });

  // --- START: Click to Edit Output Box ---
  if (polishedMessageEl) {
    polishedMessageEl.addEventListener("click", (event) => {
      // Add logging to see if listener fires
      console.log("#polished-message click listener fired!", event.target);

      // Only make editable if it's not already
      if (polishedMessageEl.getAttribute("contenteditable") !== "true") {
        console.log("Output box clicked, enabling edit mode.");
        polishedMessageEl.setAttribute("contenteditable", "true");
        polishedMessageEl.focus(); // Focus for immediate editing
        // Add a class for visual feedback during editing
        polishedMessageEl.classList.add("editing-output");
      }
    });
  }
  // --- END: Click to Edit Output Box ---

  // --- START: Click Outside Output Box to Save ---
  document.addEventListener("click", (event) => {
    // Check if the output box exists and is currently editable
    if (
      polishedMessageEl &&
      polishedMessageEl.getAttribute("contenteditable") === "true"
    ) {
      // Check if the click was outside the output box
      if (!polishedMessageEl.contains(event.target)) {
        console.log(
          "Clicked outside editable output box, saving/disabling edit mode."
        );
        polishedMessageEl.setAttribute("contenteditable", "false");
        // Remove the editing class
        polishedMessageEl.classList.remove("editing-output");
        checkContentAndUpdateBody();
      }
    }
  });
  // --- END: Click Outside Output Box to Save ---

  // --- START: Signature Button Functionality ---
  // REMOVED: const signatureOutputBtn = document.getElementById("signature-output");
  // REMOVED: const polishedMessageEl = document.getElementById("polished-message");

  // Use the existing variables from the outer scope
  if (signatureOutputBtn && polishedMessageEl) {
    signatureOutputBtn.addEventListener("click", () => {
      const signatureId = "signature-line-output";
      let signatureElement = polishedMessageEl.querySelector(`#${signatureId}`); // Use let

      // Determine intended state BEFORE modification
      const shouldBeActive = !signatureElement;

      if (shouldBeActive) {
        // Intend to Activate: Add signature if it doesn't exist
        if (!signatureElement) {
          const signatureDiv = document.createElement("div");
          signatureDiv.id = signatureId;
          signatureDiv.className = "signature-container";
          signatureDiv.innerHTML = `
            <div class="signature-dashes">----------------------------</div>
            <div class="signature-text-container">
              <span>Polished by <a href="https://textpolish.com" target="_blank" class="signature-link" rel="noopener noreferrer">TextPolish.com</a> ✍🏻</span>
            </div>
          `;
          polishedMessageEl.appendChild(signatureDiv);
          signatureElement = signatureDiv; // Update reference after adding
        }
      } else {
        // Intend to Deactivate: Remove signature if it exists
        if (signatureElement) {
          signatureElement.remove();
          signatureElement = null; // Update reference after removing
        }
      }

      // --- Update button state AFTER modification using the global function ---
      syncSignatureButtonState();

      // Provide visual feedback (optional, can reuse existing function)
      showIconFeedback(signatureOutputBtn);
    });
  }
  // --- END: Signature Button Functionality ---

  // --- START: Add Focus Event Listeners (Touch Event Based) ---
  // Check if the indicator element exists before adding listeners that use it
  if (focusStatusEl) {
    // Listen for touchstart - often fires before focus fully shifts
    document.body.addEventListener(
      "touchstart",
      (event) => {
        const timestamp = new Date().toISOString();
        console.log(
          `[DIAG-FOCUS-TOUCH] ${timestamp} - Touchstart detected on:`,
          event.target
        );

        // <<< START RE-ADDED FIX >>>
        // Use closest() for robustness to check if touch is inside input
        if (event.target.closest("#text-input-area")) {
          const isEmpty =
            getTextFromContentEditable(messageInputEl).trim() === ""; // Use helper
          console.log(
            `[DEBUG] Touchstart listener: Target is input area. Is empty? ${isEmpty}`
          );
          if (isEmpty) {
            console.log(
              "[DEBUG] Touchstart listener: Input empty, setting scroll flag TRUE."
            );
            shouldScrollEmptyInputOnKeyboardOpen = true;
          } else {
            console.log(
              "[DEBUG] Touchstart listener: Input NOT empty, ensuring scroll flag FALSE."
            );
            shouldScrollEmptyInputOnKeyboardOpen = false;
          }
        } else {
          console.log("[DEBUG] Touchstart listener: Target is NOT input area.");
          // If touch is not on input, ensure flag is false
          shouldScrollEmptyInputOnKeyboardOpen = false;
        }
        // <<< END RE-ADDED FIX >>>

        // Check focus shortly after touchstart allows focus to potentially settle
        setTimeout(() => updateFocusIndicator(null, "touchstart_timeout"), 50); // 50ms delay
      },
      { passive: true }
    ); // Use passive listener

    // Also listen for blur on key elements to catch focus moving away
    if (messageInputEl) {
      messageInputEl.addEventListener("blur", () => {
        const timestamp = new Date().toISOString();
        console.log(
          `[DIAG-FOCUS-BLUR] ${timestamp} - Blur detected on messageInputEl`
        );
        setTimeout(
          () => updateFocusIndicator(null, "messageInputEl_blur_timeout"),
          50
        );
      });
    }
    if (polishedMessageEl) {
      polishedMessageEl.addEventListener("blur", () => {
        const timestamp = new Date().toISOString();
        console.log(
          `[DIAG-FOCUS-BLUR] ${timestamp} - Blur detected on polishedMessageEl`
        );
        setTimeout(
          () => updateFocusIndicator(null, "polishedMessageEl_blur_timeout"),
          50
        );
      });
    }
    // Potentially add blur listeners to other focusable elements if needed

    // Set initial state
    updateFocusIndicator(null, "initial_load");
  }
  // --- END: Add Focus Event Listeners ---

  // --- START: Enhanced Input Debug Tracking ---
  if (messageInputEl) {
    let lastScrollTop = 0;
    let lastHeight = 0;
    let lastSelectionStart = 0;
    let lastSelectionEnd = 0;

    // Track input events for debugging
    messageInputEl.addEventListener("input", (e) => {
      const currentScrollTop = messageInputEl.scrollTop;
      const currentHeight = messageInputEl.offsetHeight;
      const currentSelectionStart = messageInputEl.selectionStart;
      const currentSelectionEnd = messageInputEl.selectionEnd;

      debugLog("INPUT_EVENT", "Text input detected", {
        type: e.inputType,
        atEnd: currentSelectionStart >= messageInputEl.value.length - 5,
        selectionChange: {
          start: {
            from: lastSelectionStart,
            to: currentSelectionStart,
            diff: currentSelectionStart - lastSelectionStart,
          },
          end: {
            from: lastSelectionEnd,
            to: currentSelectionEnd,
            diff: currentSelectionEnd - lastSelectionEnd,
          },
        },
        scroll: {
          from: lastScrollTop,
          to: currentScrollTop,
          diff: currentScrollTop - lastScrollTop,
        },
        height: {
          from: lastHeight,
          to: currentHeight,
          diff: currentHeight - lastHeight,
        },
        textLength: messageInputEl.value.length,
        keyboardOpen: isKeyboardOpen,
      });

      // Update tracking values
      lastScrollTop = currentScrollTop;
      lastHeight = currentHeight;
      lastSelectionStart = currentSelectionStart;
      lastSelectionEnd = currentSelectionEnd;
    });

    // Track focus events
    messageInputEl.addEventListener("focus", () => {
      debugLog("FOCUS", "Input field received focus", {
        scrollTop: messageInputEl.scrollTop,
        height: messageInputEl.offsetHeight,
        selection: {
          start: messageInputEl.selectionStart,
          end: messageInputEl.selectionEnd,
        },
        isEmpty: getTextFromContentEditable(messageInputEl).trim() === "", // <<< FIX: Use helper function
        keyboardOpen: isKeyboardOpen,
      });

      // Existing focus code...
      if (getTextFromContentEditable(messageInputEl).trim() === "") {
        debugLog("FOCUS", "Empty input area focused, setting scroll flag");
        shouldScrollEmptyInputOnKeyboardOpen = true;
      } else {
        // Ensure flag is false if input has content on focus
        shouldScrollEmptyInputOnKeyboardOpen = false;
      }
    });

    // Track blur events
    messageInputEl.addEventListener("blur", () => {
      debugLog("BLUR", "Input field lost focus", {
        scrollTop: messageInputEl.scrollTop,
        height: messageInputEl.offsetHeight,
        selection: {
          start: messageInputEl.selectionStart,
          end: messageInputEl.selectionEnd,
        },
        isEmpty: getTextFromContentEditable(messageInputEl).trim() === "", // <<< FIX: Use helper function
        keyboardOpen: isKeyboardOpen,
      });

      // Existing blur code...
      if (isKeyboardOpen) {
        // Use a small delay to see if focus immediately returns (e.g., Clear button)
        setTimeout(() => {
          // Check if focus is *still* not on the input after the delay
          if (document.activeElement !== messageInputEl) {
            // Only scroll if focus has truly moved away (like tapping "Done")
            debugLog("BLUR_TIMEOUT", "Focus did not return, scrolling to top");
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            debugLog("BLUR_TIMEOUT", "Focus returned quickly, skipped scroll");
          }
        }, 50); // 50ms delay
      }
    });

    // Track selection changes
    messageInputEl.addEventListener("selectionchange", () => {
      // This may not fire in all browsers, but worth trying
      debugLog("SELECTION", "Selection changed", {
        start: messageInputEl.selectionStart,
        end: messageInputEl.selectionEnd,
        atEnd: messageInputEl.selectionStart >= messageInputEl.value.length - 5,
        scrollTop: messageInputEl.scrollTop,
      });
    });

    // Also track keydown for potential navigation
    messageInputEl.addEventListener("keydown", (e) => {
      // Only log arrow keys and nav keys
      if (
        e.key.includes("Arrow") ||
        ["Home", "End", "PageUp", "PageDown"].includes(e.key)
      ) {
        debugLog("KEYDOWN", `Navigation key: ${e.key}`, {
          selectionBefore: {
            start: messageInputEl.selectionStart,
            end: messageInputEl.selectionEnd,
          },
          scrollTopBefore: messageInputEl.scrollTop,
        });

        // After the key event has been processed
        setTimeout(() => {
          debugLog("KEYDOWN_AFTER", `After ${e.key} processed`, {
            selectionAfter: {
              start: messageInputEl.selectionStart,
              end: messageInputEl.selectionEnd,
            },
            scrollTopAfter: messageInputEl.scrollTop,
            scrollChange: messageInputEl.scrollTop - lastScrollTop,
          });
          lastScrollTop = messageInputEl.scrollTop;
          lastSelectionStart = messageInputEl.selectionStart;
          lastSelectionEnd = messageInputEl.selectionEnd;
        }, 0);
      }
    });
  }
  // --- END: Enhanced Input Debug Tracking ---

  // Enhance viewport resize logging
  const originalHandleViewportResize = handleViewportResize;
  handleViewportResize = function () {
    const beforeHeight = window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight;
    const beforeKeyboardOpen = isKeyboardOpen;

    debugLog("VIEWPORT", "Before resize handler", {
      height: beforeHeight,
      keyboardOpen: beforeKeyboardOpen,
    });

    // Call original function
    originalHandleViewportResize.apply(this, arguments);

    const afterHeight = window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight;

    debugLog("VIEWPORT", "After resize handler", {
      height: afterHeight,
      heightChange: afterHeight - beforeHeight,
      keyboardOpen: isKeyboardOpen,
      keyboardStateChanged: beforeKeyboardOpen !== isKeyboardOpen,
    });

    // If keyboard state just changed, log detailed input state
    if (beforeKeyboardOpen !== isKeyboardOpen) {
      if (messageInputEl) {
        debugLog(
          "KEYBOARD_CHANGE",
          `Keyboard ${isKeyboardOpen ? "opened" : "closed"}`,
          {
            inputHeight: messageInputEl.offsetHeight,
            inputScrollTop: messageInputEl.scrollTop,
            inputScrollHeight: messageInputEl.scrollHeight,
            cursorPosition: messageInputEl.selectionStart,
            cursorAtEnd:
              messageInputEl.selectionStart >= messageInputEl.value.length - 5,
            windowScrollY: window.scrollY,
          }
        );
      }
    }
  };

  // Enhance updateCursorDistance with logging
  const originalUpdateCursorDistance = updateCursorDistance;
  updateCursorDistance = function () {
    // Note: Line numbers inside this function might shift relative to original
    if (!messageInputEl) return; // Keep check for messageInputEl

    const beforeHeight = messageInputEl.offsetHeight;
    const beforeScrollTop = messageInputEl.scrollTop;

    // <<< FIX START: Use correct method for contenteditable cursor position >>>
    let cursorPos = -1; // Default value if error occurs
    let textLength = 0;
    try {
      cursorPos = getCursorPositionInContentEditable(messageInputEl);
      textLength = getTextFromContentEditable(messageInputEl).length;
    } catch (e) {
      console.error("Error getting cursor/text length in debug log:", e);
    }
    const isAtEnd = textLength > 0 ? cursorPos >= textLength - 5 : false;
    // <<< FIX END >>>

    debugLog("CURSOR_DISTANCE", "Before update", {
      height: beforeHeight,
      scrollTop: beforeScrollTop,
      // selectionStart: messageInputEl.selectionStart, // OLD INCORRECT LINE
      cursorPos: cursorPos, // Use calculated position
      // atEnd: messageInputEl.selectionStart >= getTextFromContentEditable(messageInputEl).length - 5, // OLD INCORRECT LINE
      atEnd: isAtEnd, // Use calculated boolean
    });

    // Call original function
    originalUpdateCursorDistance.apply(this, arguments);

    const afterHeight = messageInputEl.offsetHeight;
    const afterScrollTop = messageInputEl.scrollTop;

    // <<< FIX START: Update subsequent logs as well >>>
    let afterCursorPos = -1;
    let afterTextLength = 0;
    try {
      afterCursorPos = getCursorPositionInContentEditable(messageInputEl);
      afterTextLength = getTextFromContentEditable(messageInputEl).length;
    } catch (e) {
      console.error(
        "Error getting cursor/text length in debug log (after):",
        e
      );
    }
    const afterIsAtEnd =
      afterTextLength > 0 ? afterCursorPos >= afterTextLength - 5 : false;
    // <<< FIX END >>>

    debugLog("CURSOR_DISTANCE", "After update", {
      height: afterHeight,
      heightChange: afterHeight - beforeHeight,
      scrollTop: afterScrollTop,
      scrollChange: afterScrollTop - beforeScrollTop,
      // distanceValue: distanceValueEl.textContent, // REMOVED
      // Add corrected cursor info if needed for further debugging
      afterCursorPos: afterCursorPos,
      afterAtEnd: afterIsAtEnd,
    });

    // If height changed significantly, this could be causing the jump
    if (Math.abs(afterHeight - beforeHeight) > 5) {
      debugLog("HEIGHT_CHANGE", "Significant height change detected", {
        from: beforeHeight,
        to: afterHeight,
        change: afterHeight - beforeHeight,
        keyboardOpen: isKeyboardOpen,
        // cursorPosition: messageInputEl.selectionStart, // OLD INCORRECT LINE
        cursorPos: afterCursorPos, // Use calculated position
        // atEnd: messageInputEl.selectionStart >= getTextFromContentEditable(messageInputEl).length - 5, // OLD INCORRECT LINE
        atEnd: afterIsAtEnd, // Use calculated boolean
      });
    }

    // If scroll position changed significantly, this could be causing the jump
    if (Math.abs(afterScrollTop - beforeScrollTop) > 5) {
      debugLog("SCROLL_CHANGE", "Significant scroll change detected", {
        from: beforeScrollTop,
        to: afterScrollTop,
        change: afterScrollTop - beforeScrollTop,
        keyboardOpen: isKeyboardOpen,
        // cursorPosition: messageInputEl.selectionStart, // OLD INCORRECT LINE
        cursorPos: afterCursorPos, // Use calculated position
        // atEnd: messageInputEl.selectionStart >= getTextFromContentEditable(messageInputEl).length - 5, // OLD INCORRECT LINE
        atEnd: afterIsAtEnd, // Use calculated boolean
      });
    }
  };

  // --- START: Handle Paste Event for Contenteditable Div ---
  // Add paste event listener to strip formatting from pasted text
  if (messageInputEl) {
    messageInputEl.addEventListener("paste", function (e) {
      // Prevent the default paste behavior
      e.preventDefault();

      // Get plain text from clipboard
      let text;
      if (e.clipboardData && e.clipboardData.getData) {
        // Try text/plain first (standard)
        text = e.clipboardData.getData("text/plain");

        // Fallback for iOS Safari if text/plain doesn't work
        if (!text) {
          text = e.clipboardData.getData("text");
        }
      } else if (window.clipboardData && window.clipboardData.getData) {
        // IE fallback
        text = window.clipboardData.getData("Text");
      }

      // Insert text at cursor position
      if (text) {
        // Get selection to identify cursor position
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          // Delete any selected text first
          const range = selection.getRangeAt(0);
          range.deleteContents();

          // Insert text as a text node (preserves no formatting)
          const textNode = document.createTextNode(text);
          range.insertNode(textNode);

          // Move cursor to end of inserted text
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);

          // Force iOS to use plain text and remove any remaining styling
          document.execCommand("insertText", false, text);
        } else {
          // If no selection, just append at the end
          messageInputEl.appendChild(document.createTextNode(text));
        }

        // iOS specific: clear any potential styles that were applied
        setTimeout(() => {
          // Use this opportunity to normalize any potential formatting issues
          const currentText =
            messageInputEl.innerText || messageInputEl.textContent;

          // Only proceed if we have content to avoid flickering
          if (currentText && currentText.trim()) {
            const hasHTML = messageInputEl.innerHTML !== currentText;

            // If we detect HTML formatting, forcibly reset the content to plain text
            if (hasHTML) {
              const plainText = currentText;
              messageInputEl.innerHTML = "";
              messageInputEl.appendChild(document.createTextNode(plainText));
            }
          }
        }, 0);

        // Trigger content check and cursor distance update
        checkContentAndUpdateBody();
        if (!isKeyboardOpen) {
          updateCursorDistance();
          console.log(
            "Keyboard down, updated cursor distance after paste event."
          );
        }
      }
    });
  }
  // --- END: Handle Paste Event for Contenteditable Div ---

  // Sync signature button state on initial load
  if (typeof syncSignatureButtonState === "function") {
    syncSignatureButtonState();
  }

  // --- START: Global Helper - Sync Signature Button State ---
  function syncSignatureButtonState() {
    const signatureOutputBtn = document.getElementById("signature-output");
    const polishedMessageEl = document.getElementById("polished-message");
    if (signatureOutputBtn && polishedMessageEl) {
      const signatureElement = polishedMessageEl.querySelector(
        "#signature-line-output"
      );
      signatureOutputBtn.classList.toggle("active", !!signatureElement);
      console.log(
        "[DEBUG] syncSignatureButtonState: Button active set to",
        !!signatureElement
      );
    } else {
      console.log(
        "[DEBUG] syncSignatureButtonState: Button or output element not found."
      );
    }
  }
  // --- END: Global Helper - Sync Signature Button State ---

  // Initialize button states, including signature
  syncSignatureButtonState();

  // ... rest of DOMContentLoaded code ...
});
