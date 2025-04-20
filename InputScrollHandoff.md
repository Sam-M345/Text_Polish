# Issue Documentation for Developer Handoff: Input Area Scrolls to Top on Blur (iOS)

### Problem Statement

When the main text input area (`#text-input-area`) loses focus after editing (specifically, when the user taps the "Done" button on the iOS keyboard), the entire page view scrolls to the top (coordinates 0,0). This behavior is undesirable, especially when the input area contains a large amount of text and the user was scrolled down.

- **Exact symptoms:** After editing text in `#text-input-area` and tapping "Done" on the iOS keyboard, the page jumps to the very top.
- **Expected vs. actual behavior:**
  - **Expected:** The page should maintain its current scroll position when the input area loses focus and the keyboard dismisses. The input area itself should remain expanded to fit its content (this height part appears to be working).
  - **Actual:** The page scrolls to the top.
- **Contrast with Output Area:** This incorrect scroll-to-top behavior does _not_ occur when the polished message output area (`#polished-message`) loses focus after editing (tapping "Done"); it correctly maintains its scroll position as intended.
- **Reproduction steps:**
  1. Load the application on an iOS device (e.g., iPhone Safari).
  2. Type or paste a large amount of text into the `#text-input-area`, enough to require vertical scrolling within the textarea itself.
  3. Manually scroll the page down slightly if possible.
  4. Ensure the cursor is active within the `#text-input-area`.
  5. Tap the "Done" button on the iOS keyboard.
  6. Observe the page scroll unexpectedly to the top.
- **Context:** We have been trying to refine the scrolling behavior related to keyboard appearance and dismissal to provide a smoother user experience on iOS. We successfully prevented scroll-to-top for the output area but the same logic isn't working for the input area.
- **User impact:** High, as it's jarring and disorienting for users editing longer texts, forcing them to scroll back down.

### Affected Files

- [`public/script.js`](public/script.js): Contains the primary JavaScript logic attempting to manage scroll behavior on keyboard close, specifically within the `handleViewportResize` function and the `blur` event listener for `messageInputEl`.
- [`public/index.html`](public/index.html): Defines the `#text-input-area` element.

### Attempted Solutions

1.  **Approach #1: Flags & Conditional Scroll in `handleViewportResize`**

    - **Implementation:** Introduced boolean flags (`didJustBlurInputArea`, `didJustBlurPolishedMessage`). Added `blur` event listeners to the respective elements to set these flags. Modified the keyboard closing logic within `handleViewportResize` to check `if (didJustBlurInputArea || didJustBlurPolishedMessage)` and skip the `window.scrollTo({ top: 0,... })` call if true.
    - **Why it didn't resolve (for Input Area):** Despite the flag being set in the input area's blur listener, the check within `handleViewportResize` seemed to execute _before_ the flag was reliably set to `true`, leading to the scroll still occurring.

2.  **Approach #2: Delayed Scroll Check**
    - **Implementation:** Added a `setTimeout(..., 10)` around the `window.scrollTo({ top: 0,... })` call within the `else` block of the keyboard closing logic (where the flags were initially false). Added a re-check of the flags _inside_ the timeout callback before actually scrolling.
    - **Why it didn't resolve:** Even with the 10ms delay, the re-check `if (!didJustBlurInputArea && !didJustBlurPolishedMessage)` still evaluated to `true` (meaning `didJustBlurInputArea` was still perceived as `false` at that moment), causing the scroll-to-top to execute.

### Current obstacles / Root Cause Analysis:

- The root cause is strongly suspected to be a **timing issue on iOS** regarding the `blur` event of the `textarea` (`messageInputEl`) and the `resize` event of the `visualViewport` (`handleViewportResize`).
- The `blur` event handler, which sets `didJustBlurInputArea = true`, does not consistently complete its execution _before_ the condition `if (!didJustBlurInputArea && !didJustBlurPolishedMessage)` is checked within the `handleViewportResize` function's delayed callback.
- Therefore, the logic designed to prevent the scroll-to-top for the input area isn't reliably triggered, leading to the unwanted scroll.
- It's unclear why this timing works correctly for the `contenteditable` div (`polishedMessageEl`) but fails for the `textarea` (`messageInputEl`).

### Developer Instructions

**IMPORTANT**: Please review this document thoroughly before proceeding.

Your task:

1.  **Analyze** the interaction and timing between the `messageInputEl.addEventListener('blur', ...)` callback and the `handleViewportResize` function, specifically the keyboard closing logic section (`isKeyboardOpen` becomes `false`).
2.  **Debug on iOS:** Utilize Safari's developer tools connected to an iOS device/simulator. Place breakpoints and detailed logs within both the `blur` listener for `messageInputEl` and the relevant sections of `handleViewportResize` (especially inside the 10ms `setTimeout`). Observe the exact order of execution and the value of `didJustBlurInputArea` at each stage when the "Done" button is pressed after editing the input area.
3.  **Identify Root Cause Confirmation:** Confirm definitively why the flag check fails for the input area scenario.
4.  **Propose & Implement Solution:** Develop a more robust solution to prevent the scroll-to-top _specifically_ when the keyboard hides immediately following a blur event on `messageInputEl`. Potential strategies:
    - Increase the `setTimeout` delay (e.g., 50ms, 100ms), though this might introduce noticeable lag.
    - Add logic directly within the `messageInputEl` blur handler to somehow cancel or override a potential pending scroll-to-top triggered by `handleViewportResize` (might be complex).
    - Re-evaluate if relying solely on `handleViewportResize` for this scroll prevention is feasible, or if the `blur` event needs a more direct mechanism to manage scroll restoration/prevention in this specific case.
    - Ensure the solution _only_ affects the scroll behavior after an input area blur, preserving the intended scroll-to-top for other scenarios (like app switching) and the correct no-scroll behavior for the output area.
5.  **Test Thoroughly:** Verify the fix on iOS, ensuring the page stays put after tapping "Done" in the input area. Also re-test the output area blur and other keyboard dismissal scenarios.
