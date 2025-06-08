# Handoff: Mobile Dropdown Overlay Issue

> **IMPORTANT INSTRUCTIONS (for human or AI generating a new handoff):**
>
> 1.  **Create a brand-new Markdown file directly within the `SOP/` folder.**
> 2.  **Use a clear, descriptive name for the new file** (e.g., `Handoff-LoginBug-MobileLayout.md`).
>     _Do NOT include dates or times in the filename._
> 3.  _Never overwrite or rename existing hand-off documents._
> 4.  **Ensure all file paths listed below are clickable relative markdown links** (e.g., `[filename.ext](../path/to/filename.ext)`).

---

## 1 · Affected Files

List every file another developer must read or touch. _(The first entry, referring to this handoff document, should be plain text. Ensure all other paths are clickable relative links, e.g., `[text_to_display](../relative/path/to/file.ext)`). Add more rows as needed._

| Path                                                                   | Purpose                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| Handoff-Mobile-Dropdown-Overlay.md (plain text, no link for this item) | This handoff document                                        |
| [`public/index.html`](../public/index.html)                            | Contains the `<select>` element and the `#page-overlay` div. |
| [`public/style.css`](../public/style.css)                              | Styles the dropdown and the overlay.                         |
| [`public/script.js`](../public/script.js)                              | Handles the logic for showing/hiding the overlay.            |

---

## 2 · Problem Statement

Describe **what's wrong** and **why it matters**. Include:

- **Symptoms / error messages**: When the tone selection dropdown is opened on a mobile device (specifically iOS Safari), the background content is not fully obscured by our black overlay, even when the overlay's opacity is set to `1`.
- **Expected vs. actual behaviour**: We expect the `#page-overlay` div to render on top of all other page content (except the dropdown menu itself), creating a fully opaque black background. Instead, the browser's native `<select>` menu (picker wheel) renders on top of our entire webpage, including the overlay, making the overlay ineffective.
- **Business or user impact (severity & priority)**: Low severity, but it's a UI/UX refinement issue. The goal is to have a focused, clean interface when the user is making a selection.

---

## 3 · Reproduction Steps

Step-by-step guide to make the issue appear:

1.  Open the application on a mobile device or a browser's mobile simulator.
2.  Tap the "Tone" dropdown menu.
3.  Observe that the background dims according to the OS's default behavior, but it is not the fully opaque black background we implemented with `#page-overlay`.

---

## 4 · Attempted Solutions & Findings

| Attempt | Key Changes Made                                                                                                                                 | Outcome / Remaining Issue                                                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1      | Implemented a div with ID `page-overlay` to cover the screen. Used JavaScript to show this overlay when the `<select>` element receives `focus`. | This works perfectly on desktop browsers. However, on mobile, the native OS renders its own UI for the dropdown _on top of_ the web page's DOM, including our overlay. |
| #2      | Changed the `background-color` of `#page-overlay` to `rgba(0, 0, 0, 1)` to ensure it was fully opaque.                                           | This had no effect on the mobile experience because the native UI component is in a layer above the webpage viewport.                                                  |

> **Current blockers / unknowns:**
>
> - **Technical constraints**: We cannot style the native mobile `<select>` picker/menu using CSS. Its behavior and appearance are controlled by the mobile operating system.

---

## 5 · Developer Instructions

**Goal:** Implement a solution that allows a fully opaque background to be displayed when the tone dropdown is active on mobile.

1.  Review the _Affected Files_ above to understand the current implementation.
2.  **Refactor the `<select>` element into a custom dropdown component.** This will involve replacing the `<select>` tag with `<div>`s and `<span>`s (or similar elements) that can be fully styled with CSS.
3.  The custom dropdown's visibility should be toggled with JavaScript.
4.  Ensure the existing `#page-overlay` is triggered to become visible when the custom dropdown is opened.
5.  Verify that the custom dropdown is accessible (e.g., can be navigated with a keyboard on desktop).
6.  Test the solution on both mobile and desktop to ensure consistent and correct behavior.

---

_End of template – duplicate and fill in for each new hand-off._

**Upon completion:**

Ask the 2nd-opinion expert:

            "Please read all attached files and then provide me with necessary information.

            it would be great if you can create a downloadable markdown file .md

    		Provide me  with a download link.

            Example:     Download the analysis (markdown)"
