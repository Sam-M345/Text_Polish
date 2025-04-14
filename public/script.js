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

  let userManuallySelectedTone = false; // Flag to track manual tone selection

  // Auto-resize textarea function
  function autoResizeTextarea() {
    // Temporarily reset height to calculate the correct scrollHeight
    messageInputEl.style.height = "auto";
    // Set height to the scrollHeight, ensuring it respects the min-height
    const scrollHeight = messageInputEl.scrollHeight;
    const minHeight = 150; // Match the CSS min-height
    messageInputEl.style.height = Math.max(scrollHeight, minHeight) + "px";
  }

  // Set default selections: Text Message, Auto length, and Friendly tone
  function setDefaultSelections() {
    // Default to Text Message (already selected in HTML)
    const defaultType = document.querySelector(
      ".text-type-option-btn[data-type='messenger']"
    );
    if (defaultType) handleButtonSelection(typeButtons, defaultType);

    // Update default tone based on message type
    updateDefaultTone();
  }

  // Function to update default tone based on selected message type
  function updateDefaultTone() {
    const selectedType = document.querySelector(
      ".text-type-option-btn[data-type].selected"
    )?.dataset.type;

    // Different default tones based on message type
    let defaultTone = "friendly"; // Default to friendly
    if (selectedType === "email") {
      defaultTone = "formal";
    } else if (selectedType === "social") {
      defaultTone = "informative"; // Set default for social
    }

    // Find and click the appropriate tone button
    const toneButton = document.querySelector(
      `.tone-buttons[data-tone='${defaultTone}']`
    );
    if (toneButton) {
      // Directly handle selection state and UI update without simulating a click
      handleButtonSelection(toneButtons, toneButton);

      // --- Manually update the tone button shown in the top options ---
      const toneOptions = document.querySelector(".tone-options");
      const autoButton = toneOptions.querySelector(
        '.tone-buttons[data-tone="auto"]'
      );
      const toneText = toneButton.innerHTML; // Get the button content with emoji
      const selectedTone = toneButton.dataset.tone;

      // Ensure Auto is not selected
      if (autoButton) autoButton.classList.remove("selected");

      // Check if there's already a selected tone button in the top
      const existingToneButton = toneOptions.querySelector(
        '.tone-buttons:not([data-tone="auto"])'
      );

      if (existingToneButton) {
        // Update the existing button
        existingToneButton.innerHTML = toneText;
        existingToneButton.dataset.tone = selectedTone;
        existingToneButton.classList.add("selected");
      } else {
        // Create a new button for the selected tone if it doesn't exist
        const newSelectedButton = document.createElement("button");
        newSelectedButton.className = "tone-buttons selected";
        newSelectedButton.dataset.tone = selectedTone;
        newSelectedButton.innerHTML = toneText;

        // Add a click handler to the new button (important for consistency)
        newSelectedButton.addEventListener("click", function () {
          // Find the original button in the categories and click it
          const originalButton = document.querySelector(
            `#tone-categories [data-tone="${selectedTone}"]`
          );
          if (originalButton) {
            originalButton.click();
          }
        });

        // Insert the new button after the Auto button
        if (toneOptions) toneOptions.appendChild(newSelectedButton);
      }
      // --- End of manual update logic ---

      // toneButton.click(); // REMOVED - prevents triggering listener prematurely
    }
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

      // Initialize with the indicator hidden
      if (listeningIndicator) {
        listeningIndicator.classList.add("hidden");
      }

      recognition.onstart = function () {
        isRecognizing = true;
        micInputBtn.style.backgroundColor = "#25a56a"; // Green to indicate active
        micInputBtn.style.borderColor = "#25a56a";
        // Show the listening indicator
        listeningIndicator.classList.remove("hidden");
        listeningIndicator.style.display = "flex";
        startListeningAnimation();
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
        isRecognizing = false;
        micInputBtn.style.backgroundColor = ""; // Reset color
        micInputBtn.style.borderColor = "";
        // Hide the listening indicator
        listeningIndicator.classList.add("hidden");
        listeningIndicator.style.display = "none";
        stopListeningAnimation();
      };

      recognition.onerror = function (event) {
        console.error("Speech recognition error:", event.error);
        isRecognizing = false;
        micInputBtn.style.backgroundColor = ""; // Reset color
        micInputBtn.style.borderColor = "";
        // Hide the listening indicator
        listeningIndicator.classList.add("hidden");
        listeningIndicator.style.display = "none";
        stopListeningAnimation();
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
        recognition.stop();
        // Explicitly hide the listening indicator when microphone is manually stopped
        if (listeningIndicator) {
          listeningIndicator.classList.add("hidden");
          listeningIndicator.style.display = "none";
        }
      } else {
        // Start listening
        try {
          messageInputEl.focus(); // Focus the textarea
          recognition.start();
          showIconFeedback(micInputBtn);

          // Explicitly show the listening indicator when microphone is activated
          if (listeningIndicator) {
            listeningIndicator.classList.remove("hidden");
            listeningIndicator.style.display = "flex";
          }
        } catch (error) {
          console.error("Speech recognition error:", error);
          // If the recognition is already started, stop and restart
          if (error.name === "InvalidStateError") {
            recognition.stop();
            // Make sure the indicator is hidden when stopping
            if (listeningIndicator) {
              listeningIndicator.classList.add("hidden");
              listeningIndicator.style.display = "none";
            }

            setTimeout(() => {
              recognition.start();
              // Show the indicator when restarting
              if (listeningIndicator) {
                listeningIndicator.classList.remove("hidden");
                listeningIndicator.style.display = "flex";
              }
            }, 200);
          }
        }
      }
    });
  }

  // Button selection handlers
  function handleButtonSelection(buttons, clickedButton) {
    buttons.forEach((button) => button.classList.remove("selected"));
    clickedButton.classList.add("selected");
  }

  // Add click event listeners to all option buttons
  typeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const previousType = document.querySelector(
        ".text-type-option-btn[data-type].selected"
      )?.dataset.type;
      const newType = button.dataset.type;

      // Skip processing if the same button is clicked again
      if (previousType === newType) {
        return;
      }

      // Clear email data when switching away from email type
      if (previousType === "email" && newType !== "email") {
        EmailHandler.clearData();
      }

      handleButtonSelection(typeButtons, button);

      // Update placeholder based on selected type
      if (newType === "email") {
        messageInputEl.placeholder = "Type your email content here...";
      } else if (newType === "social") {
        messageInputEl.placeholder = "Type your social post or reply here...";
      } else {
        messageInputEl.placeholder = "Type your message here...";
      }

      // Update default tone whenever message type changes, ONLY if user hasn't manually selected one
      if (!userManuallySelectedTone) {
        updateDefaultTone();
      }
    });
  });

  toneButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedTone = button.dataset.tone;
      const toneText = button.innerHTML; // Get the button content with emoji

      // Update all tone buttons selection state
      handleButtonSelection(toneButtons, button);
      userManuallySelectedTone = true; // Mark that user has manually selected a tone

      // Find the top tone container and the tone options
      const toneContainer = document.querySelector(".tone-container");
      const toneOptions = document.querySelector(".tone-options");
      const autoButton = toneOptions.querySelector(
        '.tone-buttons[data-tone="auto"]'
      );

      if (selectedTone === "auto") {
        // If Auto is selected:
        // 1. Make sure Auto is selected with green highlight
        autoButton.classList.add("selected");

        // 2. If there's an existing secondary tone button, keep it but remove selected class
        const existingToneButton = toneOptions.querySelector(
          '.tone-buttons:not([data-tone="auto"])'
        );
        if (existingToneButton) {
          existingToneButton.classList.remove("selected");
        }
      } else {
        // If another tone is selected:
        // 1. Make sure Auto is there but not selected
        autoButton.classList.remove("selected");

        // 2. Check if there's already a selected tone button in the top
        const existingToneButton = toneOptions.querySelector(
          '.tone-buttons:not([data-tone="auto"])'
        );

        if (existingToneButton) {
          // Update the existing button
          existingToneButton.innerHTML = toneText;
          existingToneButton.dataset.tone = selectedTone;
          existingToneButton.classList.add("selected");
        } else {
          // Create a new button for the selected tone
          const newSelectedButton = document.createElement("button");
          newSelectedButton.className = "tone-buttons selected";
          newSelectedButton.dataset.tone = selectedTone;
          newSelectedButton.innerHTML = toneText;

          // Add a click handler to the new button
          newSelectedButton.addEventListener("click", function () {
            // Find the original button in the categories and click it
            const originalButton = document.querySelector(
              `#tone-categories [data-tone="${selectedTone}"]`
            );
            if (originalButton) {
              originalButton.click();
            }
          });

          // Insert the new button after the Auto button
          toneOptions.appendChild(newSelectedButton);
        }
      }
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
      console.log("Opening email client with mailto link");

      // Create and click a mailto link
      const mailtoLink = document.createElement("a");
      mailtoLink.href = `mailto:?subject=${encodeURIComponent(
        lastEmailData.subject
      )}&body=${encodeURIComponent(lastEmailData.body)}`;
      mailtoLink.style.display = "none";
      document.body.appendChild(mailtoLink);

      // Click the link to open the email client
      mailtoLink.click();

      // Remove the link from the DOM
      setTimeout(() => {
        document.body.removeChild(mailtoLink);
      }, 100);
    },

    // Clear email data
    clearData: function () {
      lastEmailData.subject = "";
      lastEmailData.body = "";
    },
  };

  // Update the improveBtn event listener to handle text formatting
  improveBtn.addEventListener("click", async () => {
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
              `API returned 500 error. Retry attempt ${retryCount}...`
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

          // For text messages, format paragraphs with emoji breaks
          if (selectedType === "messenger") {
            displayText = formatEmojiBreaks(displayText);
            console.log("After emoji breaks formatting:", displayText);
          }

          // Split text by line breaks (handle both \n\n and single \n with proper spacing)
          const paragraphs = displayText.split(/\n\n+/).flatMap((block) => {
            // Further split by single newlines but preserve as separate paragraphs
            const result = block.split(/\n/).filter((p) => p.trim());
            console.log("Paragraphs after splitting:", result);
            return result;
          });

          console.log("All paragraphs after processing:", paragraphs);

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

  // Functions for listening animation
  let listeningAnimationInterval;
  const dotStates = [
    "",
    ".",
    "..",
    "...",
    "....",
    ".....",
    "......",
    ".......",
    "......",
    ".....",
    "....",
    "...",
    "..",
    ".",
  ];

  function startListeningAnimation() {
    if (listeningAnimationInterval) {
      clearInterval(listeningAnimationInterval);
    }

    let dotIndex = 0;
    const ear = "👂🏻";

    listeningAnimationInterval = setInterval(() => {
      if (listeningIndicator) {
        listeningIndicator.textContent = ear + dotStates[dotIndex];
        dotIndex = (dotIndex + 1) % dotStates.length;
      }
    }, 250); // Update every 250ms for smooth animation
  }

  function stopListeningAnimation() {
    if (listeningAnimationInterval) {
      clearInterval(listeningAnimationInterval);
      listeningAnimationInterval = null;
    }
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
});
