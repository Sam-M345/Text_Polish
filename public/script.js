document.addEventListener("DOMContentLoaded", () => {
  // Get option buttons
  const typeButtons = document.querySelectorAll(".option-btn[data-type]");
  const lengthButtons = document.querySelectorAll(".option-btn[data-length]");
  const toneButtons = document.querySelectorAll(".option-btn[data-tone]");

  // Get other elements
  const messageInputEl = document.getElementById("text-input-area");
  const improveBtn = document.getElementById("improve-btn");
  const improvedMessageEl = document.getElementById("improved-message");
  const outputContainer = document.getElementById("output-container");
  const outputIcons = document.querySelector(".output-icons");

  // Check for content on page load to handle scrolling
  checkContentAndUpdateBody();

  // Add event listeners to detect content changes
  messageInputEl.addEventListener("input", checkContentAndUpdateBody);

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
        ".option-btn[data-type].selected"
      )?.dataset.type;
      const newType = button.dataset.type;

      // Clear email data when switching away from email type
      if (previousType === "email" && newType !== "email") {
        EmailHandler.clearData();
      }

      handleButtonSelection(typeButtons, button);

      // Update placeholder based on selected type
      if (newType === "email") {
        messageInputEl.placeholder = "Type your email content here...";
      } else {
        messageInputEl.placeholder = "Type your message here...";
      }
    });
  });

  lengthButtons.forEach((button) => {
    button.addEventListener("click", () => {
      handleButtonSelection(lengthButtons, button);

      // Remove all placeholder customization to keep consistent message
    });
  });

  toneButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedTone = button.dataset.tone;
      const toneText = button.innerHTML; // Get the button content with emoji

      // Update all tone buttons selection state
      handleButtonSelection(toneButtons, button);

      // Find the top tone container and the tone options
      const toneContainer = document.querySelector(".tone-container");
      const toneOptions = document.querySelector(".tone-options");
      const autoButton = toneOptions.querySelector('[data-tone="auto"]');

      if (selectedTone === "auto") {
        // If Auto is selected:
        // 1. Make sure Auto is selected with green highlight
        autoButton.classList.add("selected");

        // 2. If there's an existing secondary tone button, keep it but remove selected class
        const existingToneButton = toneOptions.querySelector(
          '.option-btn:not([data-tone="auto"])'
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
          '.option-btn:not([data-tone="auto"])'
        );

        if (existingToneButton) {
          // Update the existing button
          existingToneButton.innerHTML = toneText;
          existingToneButton.dataset.tone = selectedTone;
          existingToneButton.classList.add("selected");
        } else {
          // Create a new button for the selected tone
          const newSelectedButton = document.createElement("button");
          newSelectedButton.className = "option-btn selected";
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
        console.log("Subject:", data.improved.subject);
        console.log(
          "Body preview:",
          data.improved.body.substring(0, 50) + "..."
        );

        // Save for sharing
        lastEmailData.subject = data.improved.subject;
        lastEmailData.body = data.improved.body;

        // Format using the subject and body from the response
        displayText = this.format(data.improved.subject, data.improved.body);
      }
      // Handle string response
      else if (typeof data.improved === "string") {
        console.log("Received unstructured email response, formatting locally");

        // Extract subject from the first sentence
        const subjectText = this.extractSubject(data.improved);

        // Save for sharing
        lastEmailData.subject = subjectText;
        lastEmailData.body = data.improved;

        // Format the email
        displayText = this.format(subjectText, data.improved);
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
      ".option-btn[data-type].selected"
    ).dataset.type;
    const selectedLength = document.querySelector(
      ".option-btn[data-length].selected"
    ).dataset.length;
    const selectedTone = document.querySelector(
      ".option-btn[data-tone].selected"
    ).dataset.tone;
    const originalMessage = messageInputEl.value.trim();

    // Map "auto" values to "automatic" for API communication to avoid car emoji issues
    // This preserves the UI labels while using a safer term for backend processing
    const apiLength = selectedLength === "auto" ? "automatic" : selectedLength;
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

    // Show output container and icons when starting the process
    outputContainer.style.display = "block";
    outputIcons.style.display = "flex";
    improvedMessageEl.textContent = "Processing...";

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
            textLength: apiLength, // Use the mapped value
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
            improvedMessageEl.textContent = `Processing... (Retry ${retryCount}/${maxRetries})`;
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
          // Clear existing content
          improvedMessageEl.innerHTML = "";

          // Add a class to the body to indicate content has been generated
          document.body.classList.add("response-generated");

          // Handle the improved text based on its format (plain text or JSON with subject/body)
          let displayText;

          if (selectedType === "email") {
            // Process email using the consolidated EmailHandler
            displayText = EmailHandler.processResponse(data);
          } else {
            // For non-email responses
            // Apply emoji density limitation
            displayText = limitEmojiDensity(data.improved);

            // Clear email data since this is not an email
            EmailHandler.clearData();
          }

          // For text messages, format paragraphs with emoji breaks
          if (selectedType === "messenger") {
            displayText = formatEmojiBreaks(displayText);
          }

          // Split text by line breaks (handle both \n\n and single \n with proper spacing)
          const paragraphs = displayText.split(/\n\n+/).flatMap((block) => {
            // Further split by single newlines but preserve as separate paragraphs
            return block.split(/\n/).filter((p) => p.trim());
          });

          // Create paragraph elements for each section
          paragraphs.forEach((paragraph) => {
            if (paragraph.trim()) {
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

        // Show output container and icons when there's content
        outputContainer.style.display = "block";
        outputIcons.style.display = "flex";
      } catch (error) {
        improvedMessageEl.textContent = `Something went wrong: ${error.message}. Please try again.`;
        console.error("Error:", error);

        // Remove the response-generated class on error
        document.body.classList.remove("response-generated");

        // Still show output container and icons for error messages
        outputContainer.style.display = "block";
        outputIcons.style.display = "flex";

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

  // Add a function to limit emoji density in generated text
  function limitEmojiDensity(text) {
    // 1. Remove consecutive emojis by keeping only the first one in each group
    let reducedText = text.replace(/(\p{Emoji})\p{Emoji}+/gu, "$1");

    // 2. Count remaining emojis and text
    const emojiCount = (reducedText.match(/\p{Emoji}/gu) || []).length;
    const wordCount = reducedText.split(/\s+/).length;

    // 3. Enforce emoji density limits (more strict enforcement)
    // Maximum 2 emojis per paragraph for all tone categories that allow emojis
    const maxEmojisPerParagraph = 2;
    const paragraphs = reducedText.split(/\n\n+/);

    let result = [];
    for (const paragraph of paragraphs) {
      // Count emojis in this paragraph
      const paragraphEmojiCount = (paragraph.match(/\p{Emoji}/gu) || []).length;

      if (paragraphEmojiCount > maxEmojisPerParagraph) {
        // Remove extra emojis, keeping only the first few
        let processedParagraph = paragraph;
        const emojis = paragraph.match(/\p{Emoji}/gu) || [];
        for (let i = maxEmojisPerParagraph; i < emojis.length; i++) {
          const emoji = emojis[i];
          // Replace the emoji and any immediately following whitespace
          processedParagraph = processedParagraph.replace(
            new RegExp(emoji + "\\s*", "u"),
            ""
          );
        }
        result.push(processedParagraph);
      } else {
        result.push(paragraph);
      }
    }

    return result.join("\n\n");
  }

  // Function to open an email client with subject and body
  function tryMailtoFallback(subject, body) {
    EmailHandler.shareViaEmail();
    showIconFeedback(shareOutputBtn);
  }

  // Function to add paragraph breaks after emojis (except the first one) in text messages
  function formatEmojiBreaks(text) {
    // Don't process empty text
    if (!text || text.length === 0) return text;

    // Find the position of the first emoji (if any)
    const emojiRegex = /\p{Emoji}/u;
    const firstEmojiMatch = text.match(emojiRegex);

    // If no emoji found, return the original text
    if (!firstEmojiMatch) return text;

    // Get the position of the first emoji
    const firstEmojiPos = text.indexOf(firstEmojiMatch[0]);

    // Split the text into sections: before the first emoji, the first emoji itself, and after the first emoji
    const beforeFirstEmoji = text.substring(0, firstEmojiPos);
    const firstEmoji = text.substring(
      firstEmojiPos,
      firstEmojiPos + firstEmojiMatch[0].length
    );
    let afterFirstEmoji = text.substring(
      firstEmojiPos + firstEmojiMatch[0].length
    );

    // Process the section after the first emoji to add paragraph breaks after any subsequent emojis
    // Match all emojis in the remaining text
    const emojiMatches = [...afterFirstEmoji.matchAll(/\p{Emoji}/gu)];

    // Start from the end to avoid messing up indices
    for (let i = emojiMatches.length - 1; i >= 0; i--) {
      const match = emojiMatches[i];
      const emojiPos = match.index;

      // Skip if the emoji is already at the end of a line
      if (
        afterFirstEmoji.substring(
          emojiPos + match[0].length,
          emojiPos + match[0].length + 2
        ) === "\n\n"
      ) {
        continue;
      }

      // Add double newline after this emoji
      afterFirstEmoji =
        afterFirstEmoji.substring(0, emojiPos + match[0].length) +
        "\n\n" +
        afterFirstEmoji.substring(emojiPos + match[0].length).trim();
    }

    // Combine the parts back together
    return beforeFirstEmoji + firstEmoji + afterFirstEmoji;
  }
});
