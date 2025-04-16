document.addEventListener("DOMContentLoaded", () => {
  // Get option buttons
  const typeButtons = document.querySelectorAll(
    ".text-type-option-btn[data-type]"
  );
  const toneButtons = document.querySelectorAll(".tone-buttons[data-tone]");

  // Get other elements
  const messageInputEl = document.getElementById("text-input-area");
  const improveBtn = document.getElementById("improve-btn");
  const improvedMessageEl = document.getElementById("improved-message");
  const outputContainer = document.getElementById("output-container");
  const outputIcons = document.querySelector(".output-icons");
  const inputAreaButtonsContainer = document.querySelector(
    ".input-area-buttons"
  );

  // Undo functionality constants
  const UNDO_STORAGE_KEY = "textPolishUndoState";

  // --- Tone Selection State ---
  // 'initial': No user interaction with tones yet.
  // 'auto': User explicitly selected Auto.
  // 'specific': User explicitly selected a specific tone.
  let toneSelectionMode = "initial";

  // Auto-resize textarea function
  function autoResizeTextarea() {
    // Temporarily reset height to calculate the correct scrollHeight
    messageInputEl.style.height = "auto";
    // Set height to the scrollHeight, ensuring it respects the min-height
    const scrollHeight = messageInputEl.scrollHeight;
    const minHeight = 150; // Match the CSS min-height
    messageInputEl.style.height = Math.max(scrollHeight, minHeight) + "px";
  }

  // Set default selections: Messenger type, Friendly tone
  function setDefaultSelections() {
    // 1. Set default type
    const defaultTypeButton = document.querySelector(
      ".text-type-option-btn[data-type='messenger']"
    );
    if (defaultTypeButton) {
      typeButtons.forEach((btn) => btn.classList.remove("selected"));
      defaultTypeButton.classList.add("selected");
      updatePlaceholder("messenger"); // Directly update placeholder
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

  // Check for content on page load to handle scrolling
  checkContentAndUpdateBody();

  // Add event listeners to detect content changes
  messageInputEl.addEventListener("input", checkContentAndUpdateBody);
  // Add event listener for auto-resizing
  messageInputEl.addEventListener("input", autoResizeTextarea);

  // Function to check for content and update body class - only disable elastic scroll when absolutely no content
  function checkContentAndUpdateBody() {
    if (
      messageInputEl.value.trim() ||
      (improvedMessageEl.textContent &&
        improvedMessageEl.textContent.trim() !== "Processing...") ||
      document.body.classList.contains("tones-expanded")
    ) {
      document.body.classList.add("has-content");
    } else {
      document.body.classList.remove("has-content");
    }
  }

  // Initially hide output container and icons if empty
  if (!improvedMessageEl.textContent.trim()) {
    outputContainer.style.display = "none";
    outputIcons.style.display = "none";
  }

  // Get icon buttons
  const micInputBtn = document.getElementById("mic-input");
  const clearInputBtn = document.getElementById("clear-input");
  const copyInputBtn = document.getElementById("copy-input");
  const pasteInputBtn = document.getElementById("paste-input");
  const editOutputBtn = document.getElementById("edit-output");
  const clearOutputBtn = document.getElementById("clear-output");
  const copyOutputBtn = document.getElementById("copy-output");
  const pasteOutputBtn = document.getElementById("paste-output");
  const listeningIndicator = document.getElementById("listening-indicator");

  // Ensure listening indicator is hidden initially
  if (listeningIndicator) {
    listeningIndicator.classList.add("hidden");
  }

  // Speech recognition setup
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
      recognition.interimResults = false; // Only get final results to avoid changing previous words
      recognition.lang = "en-US"; // Default to English

      // Initialize with the indicators hidden
      if (listeningIndicator) listeningIndicator.classList.add("hidden");

      recognition.onstart = function () {
        console.log("Speech recognition started.");
        isRecognizing = true;
        manualStop = false; // Reset flag on successful start
        micInputBtn.style.backgroundColor = "#25a56a";
        micInputBtn.style.borderColor = "#25a56a";
        inputAreaButtonsContainer.classList.add("listening");
        listeningIndicator.classList.remove("hidden");
        listeningIndicator.style.display = "flex";
      };

      recognition.onresult = function (event) {
        // Get current cursor position for insertion
        const cursorPosition = messageInputEl.selectionStart;
        const currentText = messageInputEl.value;

        // Get only the latest final result
        const latestResult = event.results[event.results.length - 1];
        let newText = latestResult[0].transcript;

        // Fix first word duplication only on the first recognized text
        if (currentText.trim() === "" || cursorPosition === 0) {
          // Fix first word duplication using a simple pattern match
          const firstWordMatch = newText.match(/^(\w+['']?\w*)\s+\1\b/i);
          if (firstWordMatch) {
            newText = newText.replace(/^(\w+['']?\w*)\s+/, "");
            console.log("Fixed repeated first word");
          }
        }

        // Add space before new text if needed (if cursor isn't at the start and doesn't end with space)
        if (
          cursorPosition > 0 &&
          cursorPosition === currentText.length &&
          !currentText.endsWith(" ") &&
          currentText.trim() !== "" &&
          !newText.startsWith(" ")
        ) {
          newText = " " + newText;
        }

        // Insert the new text at the cursor position
        messageInputEl.value =
          currentText.substring(0, cursorPosition) +
          newText +
          currentText.substring(cursorPosition);

        // Move cursor to end of inserted text
        const newCursorPosition = cursorPosition + newText.length;
        messageInputEl.selectionStart = newCursorPosition;
        messageInputEl.selectionEnd = newCursorPosition;

        // Scroll textarea to keep cursor visible
        messageInputEl.scrollTop = messageInputEl.scrollHeight;

        // Manually trigger resize and content check after speech input
        autoResizeTextarea();
        checkContentAndUpdateBody();
      };

      recognition.onend = function () {
        console.log("Speech recognition ended.");
        isRecognizing = false;
        micInputBtn.style.backgroundColor = "";
        micInputBtn.style.borderColor = "";
        inputAreaButtonsContainer.classList.remove("listening");
        listeningIndicator.classList.add("hidden");
        listeningIndicator.style.display = "none";
        clearInputBtn.style.display = "";
        copyInputBtn.style.display = "";
        pasteInputBtn.style.display = "";

        // --- START: Auto-restart logic ---
        if (!manualStop) {
          console.log("Recognition ended automatically, restarting...");
          try {
            recognition.start(); // Attempt to restart immediately
          } catch (error) {
            console.error(
              "Error restarting recognition after automatic end:",
              error
            );
            // Ensure UI is fully reset if restart fails
            manualStop = true; // Prevent potential loops if start fails repeatedly
          }
        } else {
          console.log("Recognition ended due to manual stop.");
          // Reset flag for the next session
          manualStop = false;
        }
        // --- END: Auto-restart logic ---
      };

      recognition.onerror = function (event) {
        console.error("Speech recognition error:", event.error);
        isRecognizing = false;
        manualStop = true; // Treat errors as a reason to stop trying to auto-restart
        micInputBtn.style.backgroundColor = "";
        micInputBtn.style.borderColor = "";
        inputAreaButtonsContainer.classList.remove("listening");
        listeningIndicator.classList.add("hidden");
        listeningIndicator.style.display = "none";
        clearInputBtn.style.display = "";
        copyInputBtn.style.display = "";
        pasteInputBtn.style.display = "";
      };

      return true;
    } else {
      console.log("Speech recognition not supported");
      return false;
    }
  }

  // Speech to text button
  if (micInputBtn) {
    micInputBtn.addEventListener("click", () => {
      // Initialize on first click if not already done
      if (!recognition && !initSpeechRecognition()) {
        alert("Speech recognition is not supported in your browser.");
        return;
      }

      if (isRecognizing) {
        // Stop listening
        console.log("Manual stop initiated.");
        manualStop = true; // Set flag BEFORE stopping
        recognition.stop();
        // UI updates now handled primarily by onend event
      } else {
        // Start listening
        // Reset flag just in case it was left true from an error
        manualStop = false;
        try {
          messageInputEl.focus(); // Focus the textarea
          recognition.start(); // This triggers onstart where visibility is handled
          showIconFeedback(micInputBtn);
          // Manually hide buttons when starting via button click
          clearInputBtn.style.display = "none";
          copyInputBtn.style.display = "none";
          pasteInputBtn.style.display = "none";

          // Explicitly show the listening indicator (ear)
          if (listeningIndicator) {
            listeningIndicator.classList.remove("hidden");
            listeningIndicator.style.display = "flex";
          }
        } catch (error) {
          console.error("Speech recognition error:", error);
          // If the recognition is already started, stop and restart
          if (error.name === "InvalidStateError") {
            recognition.stop();
            // Make sure the indicators are hidden when stopping
            if (listeningIndicator) {
              listeningIndicator.classList.add("hidden");
              listeningIndicator.style.display = "none";
            }
            // Manually show buttons when stopping due to error/restart
            clearInputBtn.style.display = "";
            copyInputBtn.style.display = "";
            pasteInputBtn.style.display = "";

            setTimeout(() => {
              recognition.start();
              // Show the indicators when restarting
              if (listeningIndicator) {
                listeningIndicator.classList.remove("hidden");
                listeningIndicator.style.display = "flex";
              }
            }, 200);
          }
          manualStop = true; // Ensure flag is set if start fails critically
        }
      }
    });
  }

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
    messageInputEl.value = "";
    // Reset height to default minimum
    messageInputEl.style.height = "auto";
    messageInputEl.focus();
    showIconFeedback(clearInputBtn);
    checkContentAndUpdateBody();
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
        // Trigger resize after pasting
        autoResizeTextarea();
        // Ensure content check runs after paste
        checkContentAndUpdateBody();
      })
      .catch((err) => {
        console.error("Failed to copy text to clipboard:", err);
      });
  });

  // Edit output text
  if (editOutputBtn) {
    editOutputBtn.addEventListener("click", () => {
      // Check if we're already in edit mode
      const isEditing =
        improvedMessageEl.getAttribute("contenteditable") === "true";

      if (isEditing) {
        // Save changes and exit edit mode
        improvedMessageEl.setAttribute("contenteditable", "false");
        // Change button appearance to indicate editing is complete
        editOutputBtn.classList.remove("active");
        editOutputBtn.title = "Edit output";
        showIconFeedback(editOutputBtn);
      } else {
        // Enter edit mode
        improvedMessageEl.setAttribute("contenteditable", "true");
        // Focus the element for immediate editing
        improvedMessageEl.focus();
        // Change button appearance to indicate we're in edit mode
        editOutputBtn.classList.add("active");
        editOutputBtn.title = "Save edits";
      }
    });
  }

  // Clear output text
  clearOutputBtn.addEventListener("click", () => {
    improvedMessageEl.textContent = "";
    document.body.classList.remove("response-generated");
    showIconFeedback(clearOutputBtn);

    // Hide output container and icons when cleared
    outputContainer.style.display = "none";
    outputIcons.style.display = "none";
    checkContentAndUpdateBody();
  });

  // Copy output text
  copyOutputBtn.addEventListener("click", () => {
    if (improvedMessageEl.innerHTML) {
      // Get the text content from all paragraph elements
      const textToCopy =
        improvedMessageEl.innerText || improvedMessageEl.textContent;

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
    if (improvedMessageEl.innerText || improvedMessageEl.textContent) {
      messageInputEl.value =
        improvedMessageEl.innerText || improvedMessageEl.textContent;
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
      const improvedMessageEl = document.getElementById("improved-message");
      const currentFullText =
        improvedMessageEl.innerText || improvedMessageEl.textContent;

      // 2. Try to parse subject and body based on the known separator
      const separator = "\n\n***\n\n"; // Separator used in EmailHandler.format
      const separatorIndex = currentFullText.indexOf(separator);

      let subjectToShare = "Polished Email"; // Default subject
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

  // Update the improveBtn event listener
  improveBtn.addEventListener("click", async () => {
    // --- Stop Mic if Active ---
    if (isRecognizing) {
      console.log("Improve button clicked, stopping microphone...");
      manualStop = true; // Prevent auto-restart
      recognition.stop();
    }

    // --- START: Remove Undo Button ---
    const undoButton = document.getElementById("undo-button");
    if (undoButton) {
      console.log("Improve button clicked, removing undo button...");
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

    // Collapse the tone categories when improve button is pressed
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
    startHourglassAnimation(improveBtn);
    improveBtn.disabled = true;

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
            // improvedMessageEl.textContent = `Processing... (Retry ${retryCount}/${maxRetries})`; // No need to show this if container is hidden
            // Wait a second before retrying
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return callAPIWithRetry(); // Recursive retry
          }
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();

        // Log the raw API response
        console.log("Raw API response:", data);

        // Check if there's an error message in the response
        if (data.error) {
          throw new Error(`API Error: ${data.error}`);
        }

        // Format the improved text with proper paragraphs
        if (data.improved) {
          console.log("Original improved text:", data.improved);

          // Clear existing content
          improvedMessageEl.innerHTML = "";

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

          console.log(
            ">>> FRONTEND LOG: displayText received from backend (before splitting):",
            JSON.stringify(displayText)
          ); // Log before split

          // For text messages, format paragraphs with emoji breaks
          if (selectedType === "messenger") {
            displayText = formatEmojiBreaks(displayText);
            console.log("After emoji breaks formatting:", displayText);
          }

          // Split text by line breaks (handle both \n\n and single \n with proper spacing)
          const paragraphs = displayText.split(/\n\n+/).flatMap((block) => {
            // Further split by single newlines but preserve as separate paragraphs
            const result = block.split(/\n/).filter((p) => p.trim());
            // console.log("Paragraphs after splitting:", result); // Keep original log
            return result;
          });

          console.log(
            ">>> FRONTEND LOG: Paragraphs array after splitting:",
            paragraphs
          ); // Log the result of splitting

          // Create paragraph elements for each section
          paragraphs.forEach((paragraph, index) => {
            if (paragraph.trim()) {
              console.log(`Creating paragraph ${index}:`, paragraph.trim());
              const p = document.createElement("p");
              p.textContent = paragraph.trim();
              improvedMessageEl.appendChild(p);
            }
          });

          // If there were no paragraphs, just set the text directly
          if (improvedMessageEl.children.length === 0) {
            improvedMessageEl.textContent = displayText;
          }

          // Update body class since we have content
          document.body.classList.add("has-content");
        } else {
          improvedMessageEl.textContent = "No improvements were made.";
        }

        // Scroll to the very bottom of the page
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });

        // Set button text back to normal immediately
        stopHourglassAnimation(improveBtn, "Improve");

        // Show output container and icons now that we have a result
        outputContainer.style.display = "block";
        outputIcons.style.display = "flex";
      } catch (error) {
        // Show output container and icons for error messages
        outputContainer.style.display = "block";
        outputIcons.style.display = "flex";

        improvedMessageEl.textContent = `Something went wrong: ${error.message}. Please try again.`;
        console.error("Error:", error);

        // Remove the response-generated class on error
        document.body.classList.remove("response-generated");

        // Reset button state
        stopHourglassAnimation(improveBtn, "Improve");
        improveBtn.disabled = false;

        // Make sure to check content state
        checkContentAndUpdateBody();
      } finally {
        // Enable button
        improveBtn.disabled = false;
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
        // Add class to body to enable improve button safe zone and disable elastic bounce
        document.body.classList.add("tones-expanded");
        document.body.classList.add("has-content");

        // No scrolling behavior - removed to keep improve button visible
      } else {
        toneCategories.classList.remove("expanded-tones");
        toneCategories.classList.add("collapsed-tones");
        toggleTonesBtn.textContent = "⏬";
        // Remove class from body to disable improve button safe zone
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
      if (improvedMessageEl.innerText || improvedMessageEl.textContent) {
        const textToShare =
          improvedMessageEl.innerText || improvedMessageEl.textContent;
        console.log("Share button clicked, text length:", textToShare.length);

        // Check if we have email data to share
        if (lastEmailData.subject && lastEmailData.body) {
          console.log("Sharing as email");
          EmailHandler.shareViaEmail();
          showIconFeedback(shareOutputBtn);
          return;
        }

        // Regular sharing for non-email content
        if (navigator.share) {
          console.log("Web Share API available, sharing content");

          // Simple share with just title and text for all content types
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
              // Fall back to clipboard
              tryClipboardFallback(textToShare);
            });
        } else {
          console.log("Web Share API not available, using clipboard fallback");
          tryClipboardFallback(textToShare);
        }
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
    }, 500); // Increased to 500ms for more noticeable effect
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

  // Function to add paragraph breaks after emojis (except those at the very beginning) in text messages
  function formatEmojiBreaks(text) {
    // Don't process empty text
    if (!text || text.length === 0) return text;

    console.log("formatEmojiBreaks input:", text);

    // Find all emoji groups in the text - using a more specific emoji pattern
    const emojiGroupRegex =
      /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;
    const emojiGroups = [...text.matchAll(emojiGroupRegex)];

    console.log(
      "Detected emoji groups:",
      emojiGroups.map((m) => ({ emoji: m[0], position: m.index }))
    );

    // If no emojis found, return the original text
    if (!emojiGroups.length) {
      console.log("No emojis found, returning original text");
      return text;
    }

    // Create a map of emoji positions for quick lookup
    const emojiPositions = new Set();
    emojiGroups.forEach((match) => {
      const start = match.index;
      const end = start + match[0].length - 1;
      for (let i = start; i <= end; i++) {
        emojiPositions.add(i);
      }
    });

    // Create a working copy of the text
    let processedText = text;

    // Start from the end to avoid messing up indices when adding line breaks
    for (let i = emojiGroups.length - 1; i >= 0; i--) {
      const match = emojiGroups[i];
      const groupPos = match.index;
      const groupLength = match[0].length;

      // Skip if:
      // 1. The emoji is the absolute first character of the text
      // 2. Or if the emoji is already at the end of a paragraph
      // 3. Or if the next character is a digit (to avoid splitting numbers)
      // 4. Or if the emoji is immediately followed by another emoji
      if (
        groupPos === 0 ||
        processedText.substring(
          groupPos + groupLength,
          groupPos + groupLength + 2
        ) === "\n\n" ||
        (processedText[groupPos + groupLength] &&
          emojiPositions.has(groupPos + groupLength))
      ) {
        continue;
      }

      // Add double newline after the emoji group
      const nextChar = processedText[groupPos + groupLength];
      if (nextChar && !/\d/.test(nextChar)) {
        processedText =
          processedText.substring(0, groupPos + groupLength) +
          "\n\n" +
          processedText.substring(groupPos + groupLength);
      }
    }

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
      // TODO: Add logic here to re-activate/re-check UI elements if necessary
      // For example, ensure buttons are enabled:
      if (improveBtn) improveBtn.disabled = false;
      // Re-check content in case state was lost/reset
      checkContentAndUpdateBody();
      // Maybe re-attach critical listeners if they prove unreliable (less common)
    }
  });
  // --- End Page Visibility API Listener ---

  // --- UNDO FUNCTIONALITY --- START ---

  // Function to save state to sessionStorage
  function saveStateForUndo() {
    const state = {
      inputText: messageInputEl.value,
      outputHTML: improvedMessageEl.innerHTML,
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
      improvedMessageEl.innerHTML = savedState.outputHTML || "";
      if (improvedMessageEl.innerHTML.trim()) {
        outputContainer.style.display = "block";
        outputIcons.style.display = "flex";
        improvedMessageEl.contentEditable = "false"; // Ensure it's not editable initially
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
      autoResizeTextarea();
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
      // Fallback: append to body if improve button not found (shouldn't happen)
      console.error("Improve button not found, appending undo button to body.");
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
      case "messenger":
      default:
        messageInputEl.placeholder = "Type your Message here...";
        break;
    }
  }

  // --- START: New Function to Update Header Tone Display ---
  function updateMainToneDisplay(selectedToneButton) {
    const toneOptions = document.querySelector(".tone-options");
    if (!toneOptions) return; // Exit if container not found

    const autoButton = toneOptions.querySelector(
      '.tone-buttons[data-tone="auto"]'
    );
    const selectedTone = selectedToneButton.dataset.tone;
    const toneText = selectedToneButton.innerHTML; // Includes emoji if present

    // Find existing specific tone button in header, if it exists
    const existingHeaderToneButton = toneOptions.querySelector(
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

      // Append the new button
      toneOptions.appendChild(newHeaderToneButton);
    }
  }
  // --- END: Function to Update Header Tone Display ---\

  // --- START: Listener for Header Tone Buttons (.tone-options) ---
  const toneOptionsContainer = document.querySelector(".tone-options");
  if (toneOptionsContainer) {
    toneOptionsContainer.addEventListener("click", (event) => {
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
});
