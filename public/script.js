// --- ensure we always start at the top on iOS Safari ---
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

// pageshow fires on initial load + when restoring from back-forward cache
window.addEventListener("pageshow", () => {
  // tiny timeout helps ensure it kicks in *after* any input-focus scroll
  setTimeout(() => {
    // Check if we are NOT already at the top before scrolling
    if (window.scrollY !== 0) {
      window.scrollTo(0, 0);
      console.log("Forced scroll to top on pageshow");
    }
  }, 0);
});

document.addEventListener("DOMContentLoaded", () => {
  // --- START: Scroll to top on load ---
  setTimeout(() => {
    if (window.scrollY !== 0) {
      window.scrollTo(0, 0);
      console.log("Scrolled to top on load (delayed, after focus).");
    }
  }, 50); // 50ms delay
  // --- END: Scroll to top on load ---

  // Get option buttons
  const typeButtons = document.querySelectorAll(
    ".text-type-option-btn[data-type]"
  );
  const toneButtons = document.querySelectorAll(".tone-buttons[data-tone]");

  // Get other elements
  const messageInputEl = document.getElementById("text-input-area");
  const polishBtn = document.getElementById("polish-btn");
  const polishedMessageEl = document.getElementById("polished-message");
  const outputContainer = document.getElementById("output-container");
  const outputIcons = document.querySelector(".output-icons");
  const toneMicListeningIndicator = document.getElementById(
    "tone-mic-listening-indicator"
  );
  const distanceValueEl = document.getElementById("distance-value");
  const toneHeaderMicBtn = document.getElementById("tone-header-mic-indicator"); // NEW Mic Button in Tone Header
  const keyboardStatusIndicator = document.getElementById(
    "keyboard-status-indicator"
  ); // Get the new indicator

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
    if (
      messageInputEl.value.trim() ||
      (polishedMessageEl.textContent &&
        polishedMessageEl.textContent.trim() !== "Processing...") ||
      document.body.classList.contains("tones-expanded")
    ) {
      document.body.classList.add("has-content");
    } else {
      document.body.classList.remove("has-content");
    }
  }

  // Initially hide output container and icons if empty
  if (!polishedMessageEl.textContent.trim()) {
    outputContainer.style.display = "none";
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
    const text = element.value;
    // Clamp index to be within valid range
    const position = Math.max(0, Math.min(textIndex, text.length));
    const textBeforePos = text.substring(0, position);

    let mirrorDiv = document.getElementById(mirrorDivId);
    if (!mirrorDiv) {
      mirrorDiv = document.createElement("div");
      mirrorDiv.id = mirrorDivId;
      document.body.appendChild(mirrorDiv);
    }

    // Apply relevant styles from textarea to mirror div
    const style = window.getComputedStyle(element);
    [
      "fontFamily",
      "fontSize",
      "fontWeight",
      "fontStyle",
      "letterSpacing",
      "lineHeight",
      "textTransform",
      "wordSpacing",
      "textIndent",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "borderTopWidth",
      "borderRightWidth",
      "borderBottomWidth",
      "borderLeftWidth",
      "width",
      "boxSizing",
    ].forEach((prop) => {
      mirrorDiv.style[prop] = style[prop];
    });

    // Make the mirror div behave like the textarea for wrapping
    mirrorDiv.style.whiteSpace = "pre-wrap";
    mirrorDiv.style.wordWrap = "break-word";

    // Hide the mirror div but keep its layout dimensions
    mirrorDiv.style.position = "absolute";
    mirrorDiv.style.visibility = "hidden";
    mirrorDiv.style.top = "-9999px";
    mirrorDiv.style.left = "-9999px";
    mirrorDiv.style.height = "auto"; // Allow height to adjust to content

    // Use textContent to handle newlines correctly
    mirrorDiv.textContent = textBeforePos;

    // Create a span to mark the caret position
    const span = document.createElement("span");
    // Use a zero-width space or similar to avoid affecting layout
    span.innerHTML = "&#x200B;";
    mirrorDiv.appendChild(span);

    // Calculate position relative to the mirror div's content area
    const caretY = span.offsetTop;
    console.log(
      `Mirror Div Scroll Height: ${mirrorDiv.scrollHeight}, Caret Span OffsetTop: ${caretY}`
    );

    // Clean up the temporary span
    mirrorDiv.removeChild(span);

    // Return the calculated Y position relative to the start of the text content
    return caretY;
  }

  function updateCursorDistance() {
    if (!messageInputEl || !distanceValueEl) return; // Ensure elements exist

    try {
      const computedStyle = window.getComputedStyle(messageInputEl);
      const minHeightCSS = parseFloat(computedStyle.minHeight);
      const lineHeight = parseFloat(computedStyle.lineHeight);

      // --- START: Shrink Logic ---
      // Reset height to auto first to allow shrinking based on content
      messageInputEl.style.height = "auto";
      // Force reflow/recalculation might not be strictly necessary but can help ensure values are updated
      // messageInputEl.offsetHeight; // Reading offsetHeight can sometimes trigger reflow
      // --- END: Shrink Logic ---

      // Recalculate values AFTER resetting height to auto
      const endOfTextY = getTextVPixelPosition(
        messageInputEl,
        messageInputEl.value.length
      );
      const scrollTop = messageInputEl.scrollTop; // How much the textarea is scrolled
      // IMPORTANT: Re-read clientHeight and scrollHeight AFTER setting height to auto
      const clientHeight = messageInputEl.clientHeight; // Visible height
      const scrollHeight = messageInputEl.scrollHeight; // Total height of content

      // Calculate the end-of-text's visible position from the *top* of the visible area
      const visibleEndOfTextY = endOfTextY - scrollTop;

      // Calculate distance from the end-of-text's visible position to the bottom of the *visible* area
      const distance = Math.max(
        0,
        clientHeight - visibleEndOfTextY - lineHeight
      );

      console.log(
        `After Auto Height -> EndOfTextY: ${endOfTextY}, ScrollTop: ${scrollTop}, ClientHeight: ${clientHeight}, ScrollHeight: ${scrollHeight}, VisibleEndOfTextY: ${visibleEndOfTextY}, DistanceToEnd: ${distance}`
      );

      distanceValueEl.textContent = Math.round(distance);

      // --- Expansion Logic (Based on end of text position) ---
      // --- Only expand if keyboard is NOT open ---
      if (!isKeyboardOpen) {
        if (distance <= 35) {
          // Check distance from END OF TEXT
          // Calculate potential new height (current scrollHeight + one line)
          const potentialNewHeight = scrollHeight + lineHeight;
          // Ensure new height is at least the CSS min-height
          const newHeight = Math.max(potentialNewHeight, minHeightCSS);

          console.log(
            `Cursor close to bottom (<=35px). Adjusting height. Current scrollHeight: ${scrollHeight}, New height target: ${newHeight}`
          );
          messageInputEl.style.height = newHeight + "px";
        }
      }
      // --- END Expansion Logic ---
    } catch (error) {
      console.error(
        "Error calculating end-of-text distance or adjusting height:",
        error
      );
      distanceValueEl.textContent = "Err"; // Indicate an error occurred
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

    if (currentHeight < baseHeight - keyboardThreshold) {
      if (!isKeyboardOpen) {
        isKeyboardOpen = true;
        updateKeyboardStatusIndicator();
        console.log("Keyboard open (Viewport)");
        // --- START: Adjust min-height when keyboard opens ---
        if (messageInputEl) messageInputEl.style.minHeight = "330px";
        // --- END: Adjust min-height when keyboard opens ---
        // --- START: Scroll input area near top when keyboard opens ---
        setTimeout(() => {
          if (messageInputEl) {
            const desiredOffset = 10; // Pixels to leave between viewport top and textarea top
            const elementTopRelativeToViewport =
              messageInputEl.getBoundingClientRect().top;
            const currentScrollY = window.scrollY;
            // Calculate how much we need to scroll UP (elementTop - offset)
            const scrollAmount = elementTopRelativeToViewport - desiredOffset;
            // Calculate the final absolute scroll position
            const targetScrollY = currentScrollY + scrollAmount;

            window.scrollTo({
              top: targetScrollY,
              behavior: "smooth",
            });
            console.log(
              `Scrolled input area near top (offset: ${desiredOffset}px) on keyboard open. Scrolled by: ${Math.round(
                scrollAmount
              )}px`
            );
            // Removed: messageInputEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100); // Delay to allow layout to stabilize
        // --- END: Scroll input area near top when keyboard opens ---
      }
    } else {
      // Check if it was previously open to avoid redundant updates
      if (isKeyboardOpen) {
        isKeyboardOpen = false;
        updateKeyboardStatusIndicator();
        console.log("Keyboard closed (Viewport)");
        // --- START: Adjust min-height when keyboard closes ---
        if (messageInputEl) messageInputEl.style.minHeight = "240px";
        // --- END: Adjust min-height when keyboard closes ---

        // --- START: Scroll to top on keyboard close ---
        window.scrollTo({ top: 0, behavior: "smooth" });
        console.log("Scrolled to top on keyboard close (viewport resize).");
        // --- END: Scroll to top on keyboard close ---
      }
    }
  }

  // Initial setup
  if (keyboardStatusIndicator) {
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
        console.log("Orientation changed, new baseHeight:", baseHeight);
        // Re-evaluate keyboard state after orientation change
        handleViewportResize();
      }, 300); // Adjust delay if needed
    });
  }
  // --- END: Viewport Height Keyboard Detection ---

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

        messageInputEl.value =
          currentText.substring(0, cursorPosition) +
          newText +
          currentText.substring(cursorPosition);

        const newCursorPosition = cursorPosition + newText.length;
        messageInputEl.selectionStart = newCursorPosition;
        messageInputEl.selectionEnd = newCursorPosition;
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
      handleButtonSelection(typeButtons, button);
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
    messageInputEl.value = "";

    // --- START: Conditional Height Reset ---
    // Only reset height to CSS min-height if keyboard is DOWN
    if (!isKeyboardOpen) {
      const computedStyle = window.getComputedStyle(messageInputEl);
      messageInputEl.style.height = computedStyle.minHeight;
      console.log("Keyboard down, reset height on clear.");
    } else {
      console.log("Keyboard up, skipped height reset on clear.");
      // When keyboard is up, height is controlled by minHeight: 330px and content
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
    if (messageInputEl.value) {
      navigator.clipboard
        .writeText(messageInputEl.value)
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
        messageInputEl.value = text;
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
    document.body.classList.remove("response-generated");
    showIconFeedback(clearOutputBtn);

    // Hide output container and icons when cleared
    outputContainer.style.display = "none";
    outputIcons.style.display = "none";
    checkContentAndUpdateBody();
    createUndoButton(); // Show undo button AFTER clearing
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
    if (polishedMessageEl.innerText || polishedMessageEl.textContent) {
      messageInputEl.value =
        polishedMessageEl.innerText || polishedMessageEl.textContent;
      messageInputEl.focus();
      showIconFeedback(pasteOutputBtn);
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
        // Optionally, could try falling back to lastEmailData.subject here if desired
        // subjectToShare = lastEmailData.subject || "Polished Email";
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

      /* // Old method: Create and click a mailto link using the potentially edited data
      const mailtoLink = document.createElement("a");
      mailtoLink.href = mailtoHref;
      mailtoLink.style.display = "none";
      document.body.appendChild(mailtoLink);
      mailtoLink.click();
      setTimeout(() => {
        document.body.removeChild(mailtoLink);
      }, 100);
      */
    },

    // Clear email data
    clearData: function () {
      lastEmailData.subject = "";
      lastEmailData.body = "";
    },
  };

  // Update the polishBtn event listener
  polishBtn.addEventListener("click", async () => {
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
    const originalMessage = messageInputEl.value.trim();

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

    // Hide output container while processing, keep icons hidden until result
    outputContainer.style.display = "none";
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

        // Format the improved text with proper paragraphs
        if (data.improved) {
          console.log("Original improved text:", data.improved);

          // Clear existing content
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

          // Update body class since we have content
          document.body.classList.add("has-content");
        } else {
          polishedMessageEl.textContent = "No improvements were made.";
        }

        // Scroll to the very bottom of the page
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });

        // Set button text back to normal immediately
        stopHourglassAnimation(polishBtn, "Polish");

        // Show output container and icons now that we have a result
        outputContainer.style.display = "block";
        outputIcons.style.display = "flex";
      } catch (error) {
        // Show output container and icons for error messages
        outputContainer.style.display = "block";
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
      inputText: messageInputEl.value,
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
      messageInputEl.value = savedState.inputText || "";

      // Restore output
      polishedMessageEl.innerHTML = savedState.outputHTML || "";
      if (polishedMessageEl.innerHTML.trim()) {
        outputContainer.style.display = "block";
        outputIcons.style.display = "flex";
        polishedMessageEl.contentEditable = "false"; // Ensure it's not editable initially
        editOutputBtn.classList.remove("active");
        editOutputBtn.querySelector(".icon").textContent = "✏️";
      } else {
        outputContainer.style.display = "none";
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
    switch (type) {
      case "email":
        messageInputEl.placeholder = "Type your Email content here...";
        break;
      case "social":
        messageInputEl.placeholder = "Type your Social Post here...";
        break;
      case "text-message":
      default:
        messageInputEl.placeholder = "Type your Message here...";
        break;
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
  if (signatureOutputBtn && polishedMessageEl) {
    signatureOutputBtn.addEventListener("click", () => {
      const signatureId = "signature-line-output";
      const existingSignature = polishedMessageEl.querySelector(
        `#${signatureId}`
      );

      // Toggle active class on the button
      signatureOutputBtn.classList.toggle("active");

      if (signatureOutputBtn.classList.contains("active")) {
        // Activate: Add signature if it doesn't exist
        if (!existingSignature) {
          const signatureDiv = document.createElement("div");
          signatureDiv.id = signatureId;
          signatureDiv.className = "signature-container";
          signatureDiv.innerHTML = `
            <div class="signature-dashes">----------------------------</div>
            <div class="signature-text-container">
              <span>Polished by <a href="https://textpolish.com" target="_blank" class="signature-link" rel="noopener noreferrer">TextPolish.com</a> ✍🏻</span>
            </div>
          `;
          // Append back INSIDE polishedMessageEl
          polishedMessageEl.appendChild(signatureDiv);

          // --- START: Smart Logging for Signature Spacing ---
          // REMOVED
          // --- END: Smart Logging for Signature Spacing ---
        }
      } else {
        // Deactivate: Remove signature if it exists
        if (existingSignature) {
          existingSignature.remove();
        }
      }

      // Provide visual feedback (optional, can reuse existing function)
      showIconFeedback(signatureOutputBtn);
    });
  }
  // --- END: Signature Button Functionality ---
});
