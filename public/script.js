document.addEventListener("DOMContentLoaded", () => {
  // Get option buttons
  const typeButtons = document.querySelectorAll(".option-btn[data-type]");
  const lengthButtons = document.querySelectorAll(".option-btn[data-length]");
  const toneButtons = document.querySelectorAll(".option-btn[data-tone]");

  // Get other elements
  const messageInputEl = document.getElementById("message-input");
  const improveBtn = document.getElementById("improve-btn");
  const improvedMessageEl = document.getElementById("improved-message");

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
      if (length === "short") {
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
      handleButtonSelection(toneButtons, button);
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
    showIconFeedback(clearOutputBtn);
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

  // Provide visual feedback when icon button is clicked
  function showIconFeedback(button) {
    const originalBg = button.style.backgroundColor;
    button.style.backgroundColor = "#25a56a";
    setTimeout(() => {
      button.style.backgroundColor = originalBg;
    }, 300);
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

    if (!originalMessage) {
      alert("Please enter a message before polishing.");
      return;
    }

    // Change button state to indicate loading
    improveBtn.textContent = "Polishing...";
    improveBtn.disabled = true;
    improvedMessageEl.textContent = "Processing...";

    try {
      // Call our backend API
      const response = await fetch("/api/improve", {
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

      // Format the improved text with proper paragraphs
      if (data.improved) {
        // Clear existing content
        improvedMessageEl.innerHTML = "";

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
    } catch (error) {
      improvedMessageEl.textContent = "Something went wrong. Please try again.";
      console.error("Error:", error);
    } finally {
      // Reset button state
      improveBtn.textContent = "Polish Your Text";
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
});
