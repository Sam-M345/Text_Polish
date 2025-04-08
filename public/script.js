document.addEventListener("DOMContentLoaded", () => {
  // Get option buttons
  const typeButtons = document.querySelectorAll(".option-btn[data-type]");
  const lengthButtons = document.querySelectorAll(".option-btn[data-length]");
  const toneButtons = document.querySelectorAll(".option-btn[data-tone]");

  // Get other elements
  const messageInputEl = document.getElementById("message-input");
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
  const clearInputBtn = document.getElementById("clear-input");
  const copyInputBtn = document.getElementById("copy-input");
  const pasteInputBtn = document.getElementById("paste-input");
  const clearOutputBtn = document.getElementById("clear-output");
  const copyOutputBtn = document.getElementById("copy-output");
  const pasteOutputBtn = document.getElementById("paste-output");

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

      // Adjust textarea based on selected length
      const length = button.dataset.length;
      if (length === "auto") {
        messageInputEl.style.minHeight = "120px";
        messageInputEl.placeholder = "Type your message here...";
      } else if (length === "short") {
        messageInputEl.style.minHeight = "80px";
        messageInputEl.placeholder = "Type your short message here...";
      } else if (length === "medium") {
        messageInputEl.style.minHeight = "120px";
        messageInputEl.placeholder = "Type your medium-length message here...";
      } else if (length === "long") {
        messageInputEl.style.minHeight = "150px";
        messageInputEl.placeholder = "Type your detailed message here...";
      }
    });
  });

  toneButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedTone = button.dataset.tone;
      const toneText = button.innerHTML; // Get the button content with emoji

      // Update all tone buttons selection state
      handleButtonSelection(toneButtons, button);

      // Find the top tone button
      const topToneBtn = document.querySelector(".tone-options .option-btn");

      if (selectedTone === "auto") {
        // Reset the top button to "Auto" when Auto is selected
        if (topToneBtn) {
          topToneBtn.innerHTML = "Auto";
          topToneBtn.dataset.tone = "auto";
        }
      } else {
        // Update the visible tone display if this isn't the top Auto button
        if (topToneBtn) {
          topToneBtn.innerHTML = toneText;
          topToneBtn.dataset.tone = selectedTone;

          // Ensure the top button visually shows as selected
          topToneBtn.classList.add("selected");
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

        if (navigator.share) {
          navigator
            .share({
              title: "Text Polish Output",
              text: textToShare,
            })
            .then(() => {
              showIconFeedback(shareOutputBtn);
            })
            .catch((error) => {
              console.error("Error sharing:", error);
              // Fallback to copy if sharing fails
              navigator.clipboard.writeText(textToShare).then(() => {
                alert("Text copied to clipboard for sharing!");
                showIconFeedback(shareOutputBtn);
              });
            });
        } else {
          // Fallback for browsers that don't support the Web Share API
          navigator.clipboard.writeText(textToShare).then(() => {
            alert("Text copied to clipboard for sharing!");
            showIconFeedback(shareOutputBtn);
          });
        }
      }
    });
  }

  // Provide visual feedback when icon button is clicked
  function showIconFeedback(button) {
    const originalBg = button.style.backgroundColor;
    button.style.backgroundColor = "#25a56a";
    setTimeout(() => {
      button.style.backgroundColor = originalBg;
    }, 300);
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

    // Collapse the tone categories when improve button is pressed
    const toneCategories = document.getElementById("tone-categories");
    const toggleTonesBtn = document.getElementById("toggle-tones");
    if (toneCategories && toggleTonesBtn) {
      toneCategories.classList.remove("expanded-tones");
      toneCategories.classList.add("collapsed-tones");
      toggleTonesBtn.textContent = "⏬";
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
          textLength: selectedLength,
          tone: selectedTone,
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

        // Split text by line breaks (handle both \n\n and single \n with proper spacing)
        const paragraphs = data.improved.split(/\n\n+/).flatMap((block) => {
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
          improvedMessageEl.textContent = data.improved;
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

      // Show "Improved OK" for 3 seconds
      stopHourglassAnimation(improveBtn, "Improved OK");
      setTimeout(() => {
        improveBtn.textContent = "Improve";
      }, 3000);

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

  // Initialize length based on default selection
  const defaultLengthButton = document.querySelector(
    ".option-btn[data-length].selected"
  );
  if (defaultLengthButton) {
    const defaultLength = defaultLengthButton.dataset.length;
    if (defaultLength === "short") {
      messageInputEl.style.minHeight = "80px";
      messageInputEl.placeholder = "Type your short message here...";
    } else if (defaultLength === "medium") {
      messageInputEl.style.minHeight = "120px";
      messageInputEl.placeholder = "Type your medium-length message here...";
    } else if (defaultLength === "long") {
      messageInputEl.style.minHeight = "150px";
      messageInputEl.placeholder = "Type your detailed message here...";
    }
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
      } else {
        toneCategories.classList.remove("expanded-tones");
        toneCategories.classList.add("collapsed-tones");
        toggleTonesBtn.textContent = "⏬";
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
});
