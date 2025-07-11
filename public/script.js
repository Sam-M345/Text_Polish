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
  const typeButtons = document.querySelectorAll(
    ".text-type-option-btn[data-type]"
  );
  const toneSelect = document.getElementById("tone-select");
  const messageInputEl = document.getElementById("text-input-area");
  const polishBtn = document.getElementById("polish-btn");
  const polishedMessageEl = document.getElementById("polished-message");
  const outputIcons = document.querySelector(".output-icons");
  const clearInputBtn = document.getElementById("clear-input");
  const copyInputBtn = document.getElementById("copy-input");
  const pasteInputBtn = document.getElementById("paste-input");
  const clearOutputBtn = document.getElementById("clear-output");
  const copyOutputBtn = document.getElementById("copy-output");
  const pasteOutputBtn = document.getElementById("paste-output");
  const signatureBtn = document.getElementById("signature-output");
  const shareBtn = document.getElementById("share-output");

  // Initially hide output elements if empty on load
  if (!polishedMessageEl.textContent.trim()) {
    polishedMessageEl.style.display = "none";
    outputIcons.style.display = "none";
  }

  // Autofocus on the input area on page load
  messageInputEl.focus();

  // START: Email Handler to manage email-specific formatting and sharing
  const EmailHandler = {
    format: (subject, body) => {
      // Clean the body of any placeholder text before formatting
      const cleanedBody = body
        .replace(
          /\\\[Your Name\\\]|\\\[NAME\\\]|\\\[Name\\\]|\\\[your name\\\]/g,
          ""
        )
        .trim();
      // Use a clear separator that can be parsed later for sharing
      return `${subject}\n\n***\n\n${cleanedBody}`;
    },
    shareViaEmail: () => {
      const currentFullText =
        polishedMessageEl.innerText || polishedMessageEl.textContent;
      const separator = "\n\n***\n\n";
      const separatorIndex = currentFullText.indexOf(separator);

      let subject = "Polished Email";
      let body = currentFullText;

      // If the separator is found, parse the text into subject and body
      if (separatorIndex !== -1) {
        subject = currentFullText.substring(0, separatorIndex).trim();
        body = currentFullText
          .substring(separatorIndex + separator.length)
          .trim();
      }

      const mailtoHref = `mailto:?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
      window.open(mailtoHref);
    },
  };
  // END: Email Handler

  // START: Overlay logic for tone select
  if (toneSelect) {
    const closeOverlay = () => document.body.classList.remove("overlay-active");

    toneSelect.addEventListener("focus", () => {
      document.body.classList.add("overlay-active");

      // One–shot listeners to hide the overlay immediately on interaction
      const off = () => {
        closeOverlay();
        document.removeEventListener("touchend", off, true);
        document.removeEventListener("mousedown", off, true);
      };

      document.addEventListener("touchend", off, true);
      document.addEventListener("mousedown", off, true);
    });

    toneSelect.addEventListener("change", closeOverlay); // Still needed for when a selection is made
    toneSelect.addEventListener("blur", closeOverlay); // Fall-back for other cases
  }
  // END: Overlay logic

  let selectedTextType = "text-message";
  let isPolishing = false;

  function handleButtonSelection(buttons, clickedButton) {
    buttons.forEach((button) => {
      button.classList.remove("selected");
    });
    clickedButton.classList.add("selected");
  }

  function setDefaultSelections() {
    // --- START: Device-dependent default type selection ---
    let defaultTypeName = "text-message"; // Default for mobile
    if (window.innerWidth > 768) {
      // Check for desktop-like screen width
      defaultTypeName = "email";
    }
    // --- END: Device-dependent default type selection ---

    // 1. Set default type
    const defaultTypeButton = document.querySelector(
      `.text-type-option-btn[data-type='${defaultTypeName}']`
    );
    if (defaultTypeButton) {
      handleButtonSelection(typeButtons, defaultTypeButton);
      selectedTextType = defaultTypeName;
      updatePlaceholder(selectedTextType);
    } else {
      // Fallback to text-message if the dynamically chosen default isn't found for some reason
      const fallbackTypeButton = document.querySelector(
        ".text-type-option-btn[data-type='text-message']"
      );
      if (fallbackTypeButton) {
        handleButtonSelection(typeButtons, fallbackTypeButton);
        selectedTextType = "text-message";
        updatePlaceholder("text-message");
      }
    }
    updateDefaultToneForType(selectedTextType);
  }

  typeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (isPolishing) return;
      handleButtonSelection(typeButtons, button);
      selectedTextType = button.getAttribute("data-type");
      updatePlaceholder(selectedTextType);
      updateDefaultToneForType(selectedTextType);
    });
  });

  function updateDefaultToneForType(type) {
    let defaultTone;
    switch (type) {
      case "email":
        defaultTone = "neutral";
        break;
      case "social":
        defaultTone = "informative";
        break;
      case "text-message":
      default:
        defaultTone = "warm";
        break;
    }
    toneSelect.value = defaultTone;
  }

  function updatePlaceholder(type) {
    const placeholderMap = {
      "text-message": "Type your Message here...",
      email: "Type your Email here...",
      social: "Type your Social Post here...",
    };
    messageInputEl.setAttribute(
      "placeholder",
      placeholderMap[type] || "Type your Message here..."
    );
  }

  polishBtn.addEventListener("click", async () => {
    if (isPolishing) return;

    const message = messageInputEl.innerText.trim();
    if (!message) {
      polishedMessageEl.textContent = "Please enter some text first.";
      polishedMessageEl.style.display = "block";
      outputIcons.style.display = "flex";
      return;
    }

    const selectedTone = toneSelect.value;

    isPolishing = true;
    polishBtn.textContent = "Polishing...";
    polishBtn.classList.add("loading");
    polishedMessageEl.style.display = "none";
    outputIcons.style.display = "none";

    try {
      const response = await fetch("/api/improve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: message,
          messageType: selectedTextType,
          tone: selectedTone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Something went wrong");
      }

      const data = await response.json();

      // --- START: Improved Paragraph Formatting ---
      polishedMessageEl.innerHTML = ""; // Clear existing content

      let contentToDisplay = "";
      if (
        typeof data.improved === "object" &&
        data.improved.subject &&
        data.improved.body
      ) {
        // Handle email object response using the EmailHandler
        contentToDisplay = EmailHandler.format(
          data.improved.subject,
          data.improved.body
        );
      } else {
        // Handle standard string response
        contentToDisplay = data.improved;
      }

      // Ensure contentToDisplay is a string before splitting
      if (typeof contentToDisplay !== "string") {
        console.error(
          "The content to display is not a string:",
          contentToDisplay
        );
        contentToDisplay = "Error: Received invalid content from the server.";
      }

      // Split text by one or more newlines to create paragraphs
      const paragraphs = contentToDisplay
        .split(/\n+/)
        .filter((p) => p.trim() !== "");

      // Create paragraph elements for each section
      paragraphs.forEach((paragraph) => {
        if (paragraph.trim()) {
          const p = document.createElement("p");
          p.textContent = paragraph.trim();
          polishedMessageEl.appendChild(p);
        }
      });
      // --- END: Improved Paragraph Formatting ---

      polishedMessageEl.style.display = "block";
      outputIcons.style.display = "flex";
      document.body.classList.add("response-generated");
    } catch (error) {
      polishedMessageEl.textContent = "Error: " + error.message;
      polishedMessageEl.style.display = "block";
    } finally {
      isPolishing = false;
      polishBtn.textContent = "Polish";
      polishBtn.classList.remove("loading");
    }
  });

  clearInputBtn.addEventListener("click", () => {
    messageInputEl.innerText = "";
  });

  copyInputBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(messageInputEl.innerText);
  });

  pasteInputBtn.addEventListener("click", () => {
    navigator.clipboard.readText().then((text) => {
      // Use the same command as the paste event to ensure consistency
      document.execCommand("insertText", false, text);
    });
  });

  if (messageInputEl) {
    messageInputEl.addEventListener("paste", (e) => {
      // Prevent the default paste action
      e.preventDefault();
      // Get plain text from the clipboard
      const text = e.clipboardData.getData("text/plain");
      // Insert the plain text at the cursor position
      document.execCommand("insertText", false, text);
    });
  }

  clearOutputBtn.addEventListener("click", () => {
    polishedMessageEl.innerHTML = "";
    polishedMessageEl.style.display = "none";
    outputIcons.style.display = "none";
    document.body.classList.remove("response-generated");
  });

  copyOutputBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(polishedMessageEl.innerText);

    const copyIcon = copyOutputBtn.querySelector(".copy-icon");
    const checkIcon = copyOutputBtn.querySelector(".check-icon");

    copyOutputBtn.classList.add("copied");
    copyIcon.style.display = "none";
    checkIcon.style.display = "inline-block";

    setTimeout(() => {
      copyOutputBtn.classList.remove("copied");
      copyIcon.style.display = "inline-block";
      checkIcon.style.display = "none";
    }, 1111);
  });

  pasteOutputBtn.addEventListener("click", () => {
    messageInputEl.innerText = polishedMessageEl.innerText;
  });

  signatureBtn.addEventListener("click", () => {
    const signature = `
-------------------------
Polished by TextPolish.com ✍`;
    polishedMessageEl.innerText += signature;
  });

  shareBtn.addEventListener("click", () => {
    const selectedType = document.querySelector(
      ".text-type-option-btn.selected"
    )?.dataset.type;

    if (selectedType === "email") {
      // Use the dedicated email handler for mailto links
      EmailHandler.shareViaEmail();
    } else {
      // Use the Web Share API for other types
      if (navigator.share) {
        navigator
          .share({
            title: "Polished Text",
            text: polishedMessageEl.innerText,
          })
          .catch(console.error);
      } else {
        // Fallback for browsers that don't support Web Share API
        alert("Sharing is not supported on your browser.");
      }
    }
  });

  // --- START: Click to Edit Output Box ---
  if (polishedMessageEl) {
    polishedMessageEl.addEventListener("click", (event) => {
      // Only make editable if it's not already and there's content
      if (
        polishedMessageEl.getAttribute("contenteditable") !== "true" &&
        polishedMessageEl.innerText.trim() !== ""
      ) {
        polishedMessageEl.setAttribute("contenteditable", "true");
        polishedMessageEl.focus(); // Focus for immediate editing
        // Move cursor to the end of the text
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(polishedMessageEl);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });
  }
  // --- END: Click to Edit Output Box ---

  // --- START: Click Outside Output Box to Save ---
  document.addEventListener("click", (event) => {
    if (
      polishedMessageEl &&
      polishedMessageEl.getAttribute("contenteditable") === "true"
    ) {
      // Check if the click was outside the output box AND not on an output icon
      if (
        !polishedMessageEl.contains(event.target) &&
        !outputIcons.contains(event.target)
      ) {
        polishedMessageEl.setAttribute("contenteditable", "false");
      }
    }
  });
  // --- END: Click Outside Output Box to Save ---

  // Call the function after all other initialization
  setTimeout(setDefaultSelections, 100);

  // START: Viewport Height Keyboard Detection for mobile text area expansion
  let baseHeight = window.visualViewport
    ? window.visualViewport.height
    : window.innerHeight;
  let isKeyboardOpen = false;

  function handleViewportResize() {
    const currentHeight = window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight;
    const keyboardThreshold = 100; // More than 100px difference indicates a keyboard

    // Keyboard opens
    if (currentHeight < baseHeight - keyboardThreshold) {
      if (!isKeyboardOpen) {
        isKeyboardOpen = true;
        if (messageInputEl) {
          messageInputEl.style.minHeight = "310px";
        }
      }
    } else {
      // Keyboard closes
      if (isKeyboardOpen) {
        isKeyboardOpen = false;
        if (messageInputEl) {
          messageInputEl.style.minHeight = "240px";
        }
      }
    }
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleViewportResize);
  } else {
    window.addEventListener("resize", handleViewportResize);
  }

  // Update base height on orientation change
  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      baseHeight = window.visualViewport
        ? window.visualViewport.height
        : window.innerHeight;
      handleViewportResize();
    }, 300);
  });
  // END: Viewport Height Keyboard Detection
});
