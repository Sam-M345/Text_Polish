document.addEventListener("DOMContentLoaded", () => {
  const messageTypeEl = document.getElementById("message-type");
  const toneEl = document.getElementById("tone");
  const messageInputEl = document.getElementById("message-input");
  const improveBtn = document.getElementById("improve-btn");
  const improvedMessageEl = document.getElementById("improved-message");

  // Enforce SMS character limit if "SMS" is selected
  messageTypeEl.addEventListener("change", () => {
    if (messageTypeEl.value === "sms") {
      messageInputEl.maxLength = 160;
      messageInputEl.placeholder = `Type your SMS message here (max 160 characters)`;
    } else {
      messageInputEl.removeAttribute("maxLength");
      messageInputEl.placeholder = `Type your email message here`;
    }
  });

  // Trigger maxLength check initially
  messageTypeEl.dispatchEvent(new Event("change"));

  improveBtn.addEventListener("click", async () => {
    const messageType = messageTypeEl.value;
    const tone = toneEl.value;
    const originalMessage = messageInputEl.value.trim();

    if (!originalMessage) {
      alert("Please enter a message before improving.");
      return;
    }

    // Change button state to indicate loading
    improveBtn.textContent = "Improving...";
    improveBtn.disabled = true;
    improvedMessageEl.textContent = "Processing...";

    try {
      // Call our backend API
      const response = await fetch("/api/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageType,
          tone,
          text: originalMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      improvedMessageEl.textContent =
        data.improved || "No improvements were made.";
    } catch (error) {
      improvedMessageEl.textContent = "Something went wrong. Please try again.";
      console.error("Error:", error);
    } finally {
      // Reset button state
      improveBtn.textContent = "Improve Message";
      improveBtn.disabled = false;
    }
  });
});
