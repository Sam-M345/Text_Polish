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
      handleButtonSelection(typeButtons, button);
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
          console.error("Could not copy text: ", err);
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
        console.error("Could not paste text: ", err);
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
          console.error("Could not copy text: ", err);
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

  // Share output text
  const shareOutputBtn = document.getElementById("share-output");
  if (shareOutputBtn) {
    shareOutputBtn.addEventListener("click", () => {
      if (improvedMessageEl.innerText || improvedMessageEl.textContent) {
        const textToShare =
          improvedMessageEl.innerText || improvedMessageEl.textContent;
        console.log("Share button clicked, text length:", textToShare.length);

        if (navigator.share) {
          console.log("Web Share API available, attempting to use it");
          navigator
            .share({
              title: "Text Polish Output",
              text: textToShare,
            })
            .then(() => {
              console.log("Share successful via Web Share API");
              showIconFeedback(shareOutputBtn);
            })
            .catch((error) => {
              console.error("Error sharing via Web Share API:", error);
              // Fallback to copy if sharing fails
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

  // Separate function for clipboard fallback with better error handling
  function tryClipboardFallback(text) {
    console.log("Attempting clipboard fallback...");

    // Check if the Clipboard API is available
    if (!navigator.clipboard) {
      console.error("Clipboard API not available");
      offerManualCopy(text);
      return;
    }

    navigator.clipboard
      .writeText(text)
      .then(() => {
        console.log("Text successfully copied to clipboard");
        alert("Text copied to clipboard for sharing!");
        showIconFeedback(shareOutputBtn);
      })
      .catch((err) => {
        console.error("Failed to copy text to clipboard:", err);
        offerManualCopy(text);
      });
  }

  // iOS-friendly manual copy fallback
  function offerManualCopy(text) {
    console.log("Offering manual copy option");

    // Create a temporary textarea element
    const tempTextArea = document.createElement("textarea");
    tempTextArea.value = text;
    tempTextArea.style.position = "fixed";
    tempTextArea.style.top = "0";
    tempTextArea.style.left = "0";
    tempTextArea.style.width = "100%";
    tempTextArea.style.height = "200px";
    tempTextArea.style.padding = "10px";
    tempTextArea.style.zIndex = "9999";
    tempTextArea.style.background = "#fff";
    tempTextArea.style.color = "#000";
    tempTextArea.style.border = "1px solid #ccc";

    // Add instructions
    const instructions = document.createElement("div");
    instructions.innerHTML = `
      <div style="position:fixed; top:200px; left:0; width:100%; padding:15px; background:#f8f8f8; z-index:9999; text-align:center;">
        <p style="margin:0 0 10px 0;">Tap and hold to select all text, then copy</p>
        <button id="manualCopyDone" style="padding:8px 15px; background:#25a56a; color:white; border:none; border-radius:4px;">Done</button>
      </div>
    `;

    // Add to document
    document.body.appendChild(tempTextArea);
    document.body.appendChild(instructions);

    // Select the text
    tempTextArea.focus();
    tempTextArea.select();

    // Add event listener to the Done button
    document
      .getElementById("manualCopyDone")
      .addEventListener("click", function () {
        document.body.removeChild(tempTextArea);
        document.body.removeChild(instructions);

        // Show feedback
        showIconFeedback(shareOutputBtn);
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

    try {
      // Create the API URL - works for both local development and production
      const apiUrl =
        window.location.hostname === "localhost"
          ? "http://localhost:3000/api/improve"
          : "/api/improve";

      // Call our backend API
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: originalMessage,
          messageType: selectedType,
          textLength: apiLength, // Use the mapped value
          tone: apiTone, // Use the mapped value
        }),
      });

      if (!response.ok) {
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

        // Apply emoji density limitation
        const processedText = limitEmojiDensity(data.improved);

        // Split text by line breaks (handle both \n\n and single \n with proper spacing)
        const paragraphs = processedText.split(/\n\n+/).flatMap((block) => {
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
          improvedMessageEl.textContent = processedText;
        }
      } else {
        improvedMessageEl.textContent = "No improvements were made.";
      }

      // Scroll to the output if it's off-screen
      if (!isElementInViewport(document.getElementById("output-container"))) {
        document
          .getElementById("output-container")
          .scrollIntoView({ behavior: "smooth" });
      }

      stopHourglassAnimation(improveBtn, "✓ Improve");
      setTimeout(() => {
        improveBtn.textContent = "Improve";
      }, 2000);

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
    } finally {
      // Enable button
      improveBtn.disabled = false;
    }
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
        // Add class to body to enable improve button safe zone
        document.body.classList.add("tones-expanded");

        // Give time for the transition to complete before scrolling
        setTimeout(() => {
          // On iOS, scroll to position the first category at the top of the screen
          if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
            // Find the "1. Positive & Engaging" heading specifically
            const firstCategoryHeading = Array.from(
              document.querySelectorAll(".tone-category h3")
            ).find((h) => h.textContent.includes("1. Positive & Engaging"));

            if (firstCategoryHeading) {
              // Scroll the first category to the top of the viewport
              firstCategoryHeading.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });

              // Apply a small offset to ensure it's exactly at the top edge
              setTimeout(() => {
                // Slight adjustment to position exactly at the top edge
                window.scrollBy({
                  top: -5, // Small negative offset to account for any padding
                  behavior: "smooth",
                });
              }, 400);
            } else {
              // Fallback if heading not found
              const firstCategory = document.querySelector(".tone-category");
              if (firstCategory) {
                firstCategory.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              } else {
                // Last resort fallback
                toneCategories.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }
          }
        }, 350);
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
  const dotStates = ["", ".", "..", "...", "....", "...", "..", "."];

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
});
