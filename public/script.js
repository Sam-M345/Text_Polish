document.addEventListener("DOMContentLoaded", () => {
  // Get option buttons
  const typeButtons = document.querySelectorAll(".option-btn[data-type]");
  const lengthButtons = document.querySelectorAll(".option-btn[data-length]");
  const toneButtons = document.querySelectorAll(".option-btn[data-tone]");

  // Get other elements
  const messageInputEl = document.getElementById("message-input");
  const improveBtn = document.getElementById("improve-btn");
  const improvedMessageEl = document.getElementById("improved-message");

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
      improvedMessageEl.textContent =
        data.improved || "No improvements were made.";

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
