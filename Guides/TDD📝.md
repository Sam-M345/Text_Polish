# Technical Design Document: Text Polish Web Application

## 1. Introduction

### 1.1 Purpose

This document outlines the technical design of the Text Polish application - a web-based tool that helps users improve and refine their text communications by applying various tones, styles, and formats through AI enhancement.

### 1.2 Scope

Text Polish transforms user input text into polished, contextually appropriate communications by:

- Allowing users to select text type (**Email**, **Messenger**, **Social Post**)
- Applying specific writing tones (formal, friendly, humorous, etc.)
- Generating improved text via OpenAI's GPT-4o model
- Providing well-formatted output suitable for the selected text type
- Optionally appending a branded signature line to the output.

## 2. System Architecture

### 2.1 Overview

Text Polish follows a client-server architecture:

- **Frontend**: Vanilla HTML, CSS, and JavaScript running in the browser (`public/index.html`, `public/style.css`, `public/script.js`). Handles user interaction, state management, and communication with the backend.
- **Backend**: Node.js with Express.js framework (`api/improve.js`). Handles API requests, interacts with the OpenAI API, and performs initial response processing.
- **External Integration**: OpenAI GPT-4o API for core text generation and improvement.

### 2.2 Components

```
┌─────────────┐       ┌───────────────────┐      ┌─────────────┐
│   Browser   │ ----> │ Express.js Server │ ---> │  OpenAI API │
│ (script.js) │ <---- │   (improve.js)    │ <--- │   (GPT-4o)  │
└─────────────┘       └───────────────────┘      └─────────────┘
```

#### 2.2.1 Frontend Components (`public/script.js`)

- **UI Layer**: HTML/CSS defined in `public/index.html` and `public/style.css`.
- **Client Logic**: `public/script.js` handles:
  - Capturing user input and selected options (type, tone).
  - Sending requests to the backend `/api/improve` endpoint via `fetch`.
  - Receiving the improved text response from the backend.
  - Dynamically rendering the output, including splitting text by newlines (`\n\n` and `\n`) and creating `<p>` elements for paragraph formatting.
  - Managing UI state (button selections, loading indicators, content display).
  - Implementing helper functions for copy/paste, clear, share, speech input, etc.
  - Handling email-specific formatting and sharing (`EmailHandler`).
  - Implementing API call retry logic.
  - Dynamically adjusting the input textarea height:
    - Shrinks height to `auto` on interaction to fit current content.
    - Calculates the vertical position of the **end of the text**.
    - Expands height by one line if the end of the text is within 35px of the bottom visible edge.
    - Height adjustment is triggered by `input`, `keyup`, and `scroll` events (removed from `focus` and `mouseup` to prevent scroll jumping).
  - Implementing the optional Signature feature:
    - Toggling the active state of the signature button (`#signature-output`).
    - Appending/removing a signature `div` (`.signature-container`) inside the `#improved-message` element.
    - The signature `div` contains a dash line (`.signature-dashes`) and a text container (`.signature-text-container`) with the "Polished by TextPolish.com ✍🏻" text and hyperlink.
  - Tracking end-of-text distance via a hidden element (`#cursor-distance-display`).

#### 2.2.2 Backend Components (`api/improve.js`)

- **Web Server**: Express.js handles HTTP POST requests to `/api/improve`. Serves static frontend files.
- **API Integration**: Uses `axios` to send requests to the OpenAI Chat Completions API.
- **Prompt Engineering**: Constructs specific prompts for the LLM based on `messageType` and `tone`:
  - **Email**: Instructs the LLM to return a JSON object `{ "subject": "...", "body": "..." }` with specific formatting guidelines for the body (greeting, paragraphs, closing).
    - **If tone is 'humor'**: The email prompt incorporates specific humor guidelines (sparing emoji use, natural integration, avoiding specific symbols like `♂️`) to be applied to the body.
  - **Humor (Non-Email)**: Uses a distinct, detailed prompt specifically instructing the LLM on humorous tone, emoji usage (sparing, relevant, no lone lines, avoid `♂️`), and formatting.
  - **Other Types**: Instructs the LLM to return plain text, explicitly requesting paragraph separation using double newlines (`\n\n`) for readability.
- **Response Processing**:
  - Parses JSON response for emails.
  - Trims whitespace and removes potential surrounding quotes from LLM responses.
  - Performs emoji addition/removal logic based on tone (`noEmojiTones` list, `addEmojiToText`, `removeEmojis`).
  - Applies explicit backend filters to string responses:
    - Removes specific unwanted symbols (e.g., `♂️`, `♂`).
    - Merges lines containing only emojis into the end of the preceding paragraph to prevent lone emoji lines.
- **Environment Variables**: Uses `dotenv` to manage the `OPENAI_API_KEY`.

## 3. Project Structure

This section outlines the main files and folders in the project root, excluding `node_modules` and `.git`.

```
.
├── api/
│   └── improve.js        # Backend Express.js API endpoint logic, OpenAI interaction.
├── Guides/
│   └── TDD📝.md           # This Technical Design Document.
├── node_modules/           # (Ignored) Project dependencies.
├── Prompts/
│   ├── Diagnostic.md     # Template/Prompt for diagnostic information.
│   ├── Handoff.md        # Template/Prompt for project handoff.
│   └── ProjectClose.md   # Template/Prompt for project closure.
├── public/
│   ├── images/           # Contains static image assets (e.g., logo.png, converted_signature.svg).
│   ├── index.html        # Main HTML structure for the web application.
│   ├── script.js         # Frontend JavaScript for UI logic, API calls, etc.
│   └── style.css         # CSS styles for the application.
├── .env                    # Stores environment variables (e.g., API keys) - Not committed to Git.
├── .gitignore              # Specifies intentionally untracked files Git should ignore.
├── LICENSE                 # Project license information.
├── package-lock.json       # Records exact dependency versions.
├── package.json            # Defines project metadata, dependencies, and scripts.
├── README.md               # General project information and setup instructions.
└── vercel.json             # Configuration file for Vercel deployment.
```

### 3.1 Folder Descriptions

- **`api/`**: Contains the backend server code. Currently, only the `improve.js` handles the API logic.
- **`Guides/`**: Documentation related to the project's design and architecture.
- **`Prompts/`**: Stores template files or specific prompts used potentially for generation tasks (appears related to project management prompts).
- **`public/`**: Contains all static frontend assets (HTML, CSS, JS, Images) served directly to the user's browser.

### 3.2 Key File Descriptions

- **`api/improve.js`**: The core backend logic. Sets up an Express server, defines the `/api/improve` endpoint, handles requests, generates prompts, interacts with the OpenAI API, processes responses, and applies necessary filters.
- **`public/index.html`**: The entry point for the web application, defining the structure and elements the user interacts with, including the signature button structure.
- **`public/style.css`**: Contains all the visual styling rules for the application, including layout, colors, fonts, responsiveness, signature styling, and icon filters.
- **`public/script.js`**: Holds all the client-side JavaScript logic, including event handling, DOM manipulation, state management, API communication, UI enhancements like dynamic height adjustment, and signature toggling.
- **`package.json`**: Lists project dependencies (like Express, Axios, OpenAI) and defines scripts (like `start`, `dev`) for running the application.
- **`.env`**: Used locally to store sensitive information like the `OPENAI_API_KEY` securely.
- **`vercel.json`**: Configures how the project is built and deployed on the Vercel platform.

## 4. Technology Stack

### 4.1 Frontend

- **HTML5**: Structure (`public/index.html`)
- **CSS3**: Styling and responsive design (`public/style.css`)
- **Vanilla JavaScript (ES6+)**: Client-side functionality (`public/script.js`)
- **SVG**: Used for the signature icon (`public/images/converted_signature.svg`)
- **Web Share API**: Native sharing functionality (with clipboard fallback)
- **Web Speech API**: Optional speech-to-text input

### 4.2 Backend

- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **Axios**: Promise-based HTTP client for OpenAI API requests
- **dotenv**: Loading environment variables from `.env` file

### 4.3 External Services

- **OpenAI API**: GPT-4o model via the Chat Completions endpoint.

## 5. Data Flow

### 5.1 User Input Flow

1. User enters text into `text-input-area`.
2. User selects message type (`.text-type-option-btn`) and tone (`.tone-buttons`).
3. User clicks the "Improve" button (`#improve-btn`).
4. Frontend JS (`script.js`) constructs a JSON payload containing `text`, `messageType`, and `tone`.
5. Frontend sends a POST request to the backend `/api/improve` endpoint using `fetch`.

### 5.2 Backend Processing (`api/improve.js`)

1. Backend receives the POST request.
2. `generatePrompt` function creates a tailored prompt:
   - **If `messageType` is 'email'**: Generates a prompt requesting JSON output (`subject`, `body`) with specific structure. If `tone` is 'humor', incorporates humor guidelines into this prompt.
   - **If `messageType` is not 'email' and `tone` is 'humor'**: Generates the specific detailed humor prompt requesting plain text output with strict style/emoji/formatting guidelines.
   - **Otherwise**: Generates a standard prompt requesting plain text output with `\n\n` separators, including tone instructions and emoji inclusion/exclusion.
3. Backend sends the generated prompt to the OpenAI API via`axios`.
4. Backend receives the raw response from OpenAI.
5. **If Email**: Attempts to `JSON.parse`the response. If successful and valid, extracts`subject`and`body`. If parsing fails, returns an error.
6. **If Other Types**: Trims whitespace, strips surrounding quotes.
7. Performs emoji addition/removal logic based on `shouldIncludeEmojis`flag and tone.
8. Applies backend filters to the processed string (`improved`):
   - Removes specific unwanted symbols (e.g., `♂️`, `♂`).
   - Merges lone emoji lines into the preceding paragraph.
9. Returns a JSON response`{"improved": ...}`to the client. For emails,`improved`is the structured`{subject, body}`object; otherwise, it's the final processed text string.

### 5.3 User Output Flow (`script.js`)

1. Frontend `fetch` call receives the JSON response from the backend.
2. **If Email**: `EmailHandler.processResponse` formats the `subject` and `body` (including a `***` separator) into a single `displayText` string.
3. **If Other Types**: `displayText` is assigned the `improved` string directly from the response.
4. The `displayText` is logged (`>>> FRONTEND LOG: ... before splitting`).
5. `displayText.split(/\n\n+/).flatMap(...)` splits the text first by double newlines, then by single newlines, creating an array of potential paragraphs. Empty strings are filtered out.
6. The resulting `paragraphs` array is logged (`>>> FRONTEND LOG: ... after splitting`).
7. Frontend iterates through the `paragraphs` array. For each non-empty string, it creates a `<p>` HTML element (`document.createElement('p')`), sets its `textContent`, and appends it to the output container (`#improved-message`).
8. The output container is displayed.
9. User can interact with the output using Copy, Paste to Input, Clear, Edit (contenteditable), Share, and **Signature** (`#signature-output`) buttons.
10. Clicking the Signature button toggles its active state and appends/removes the signature `div` (`.signature-container`) containing dashes and the "Polished by..." text inside the `#improved-message` element.

## 6. API Endpoints

### 6.1 Internal API

- **POST /api/improve**
  - **Request Body:**
    ```json
    {
      "text": "Original user text",
      "messageType": "email | text-message | social", // Updated types
      "tone": "formal | friendly | etc." // Selected tone
      // Note: textLength was removed as it wasn't implemented
    }
    ```
  - **Success Response (Email):**
    ```json
    {
      "improved": {
        "subject": "Generated Email Subject",
        "body": "Generated email body with \n characters for line breaks"
      }
    }
    ```
  - **Success Response (Other Types):**
    ```json
    {
      "improved": "Enhanced text, potentially containing \n\n for paragraph breaks"
    }
    ```
  - **Error Response:**
    ```json
    {
      "error": "Description of the error",
      "details": "Optional additional error details"
    }
    ```

### 6.2 External API

- **OpenAI Chat Completions API (`https://api.openai.com/v1/chat/completions`)**
  - Used via POST request with appropriate headers (`Authorization: Bearer $OPENAI_API_KEY`) and payload including model (`gpt-4o`), messages (system and user roles), and temperature.

## 7. Key Features

### 7.1 Text Type Selection

- **Email**: Targets formal correspondence format. Backend expects structured JSON (subject/body) from LLM. Frontend uses `EmailHandler` for processing and sharing.
- **Text Message**: Targets conversational, concise format. Backend expects plain text with `\n\n` separators. Frontend formats using paragraph splitting.
- **Social Post**: Targets platform-appropriate posts (Facebook, LinkedIn, etc.). Backend expects plain text with `\n\n` separators. Frontend formats using paragraph splitting.

### 7.2 Output Formatting **(Crucial Implementation Detail)**

- **Email**: Relies on the LLM returning structured JSON (`{subject, body}`). The frontend `EmailHandler` combines these with a visual separator (`***`) for display. Paragraphs within the body are expected to be handled by `\n` characters within the `body` string returned by the LLM, which are then rendered correctly when the frontend splits the combined text and creates `<p>` tags.
- **Messenger / Social Post**: Relies on the LLM following the instruction to use double newlines (`\n\n`) for paragraph separation in its plain text response. The frontend explicitly splits the received text using `/\n\n+/`and`/\n/`regex and generates individual`<p>` elements for each resulting non-empty string. This ensures visual separation of paragraphs in the UI.

### 7.3 Tone Application

- Dynamically modifies the prompt sent to OpenAI based on the selected tone.
- For 'Humor' tone: Uses specific, detailed prompts (different for email vs. non-email) to guide the LLM on style, emoji usage, formatting, and avoiding specific symbols.
- Influences emoji usage and writing style.

### 7.4 Emoji Management

- `noEmojiTones` list prevents emoji insertion/request for specific tones.
- Specific 'Humor' prompt instructs LLM on appropriate emoji usage (sparing, relevant, integrated, no lone lines, avoid `♂️`).
- `containsEmoji`, `addEmojiToText`, `removeEmojis` functions handle basic emoji logic.
- Backend filtering explicitly removes certain unwanted symbols (e.g., `♂️`) and merges lone emoji lines into preceding paragraphs as a fallback/cleanup step.

### 7.5 Error Handling

- Backend validates input (`text` required) and API key presence.
- Backend includes `try...catch` blocks for OpenAI API calls and JSON parsing. Returns informative JSON errors.
- Frontend includes `try...catch` for `fetch` calls. Displays error messages to the user.
- Frontend implements API call retry logic (`callAPIWithRetry`) for transient server errors (e.g., 500 status).

### 7.6 UI/UX Enhancements

- Dynamic textarea height adjustment based on the **end-of-text** position (not cursor) to bottom (`updateCursorDistance`), preventing unexpected scrolling on focus/click.
- Dynamic input placeholder text based on selected message type.
- Loading animations (`startHourglassAnimation`) on the "Improve" button.
- Visual feedback (`showIconFeedback`) on icon button clicks.
- Content-aware body class (`has-content`) for styling adjustments.
- Speech-to-text input using Web Speech API.
- Output text editing via `contenteditable` attribute.
- **Signature Feature**:
  - Toggleable signature line appended within the output box.
  - Includes dash line, clickable link, and emoji.
  - Uses negative margin (`.signature-container`) to visually align with parent padding.
  - Uses SVG icon (`converted_signature.svg`) with CSS filter for consistent appearance.
- Hidden end-of-text distance display element (`#cursor-distance-display`).
- Desktop-specific CSS rule reduces the size of the input clear button (`#clear-input`).

## 8. User Interface

### 8.1 Main Components

- Text input area (`#text-input-area`) with dynamic placeholder and end-of-text-based height adjustment.
- Option selection buttons for Type and Tone.
- Collapsible Tone Category section (`#tone-categories`).
- Improve button (`#improve-btn`) with loading state.
- Output display area (`#improved-message`) rendering content within `<p>` tags and optionally containing the signature `div`.
- Action buttons for Input (Mic, Clear, Copy, Paste) and Output (Clear, Copy, Paste to Input, **Signature**, Share).
- Hidden distance display element (`#cursor-distance-display`).

### 8.2 Responsive Design

- CSS utilizes flexbox and media queries for responsiveness.
- Mobile-first considerations in styling.
- Desktop-specific styling applied to reduce the size of the input area's clear button.

## 9. Deployment

### 9.1 Development Environment

- Run locally using `npm install` and `npm run dev` (or `npm run dev:sync` if using concurrently).
- Uses `nodemon` for automatic server restarts on file changes.
- Requires a `.env` file with `OPENAI_API_KEY`.

### 9.2 Production Deployment

- Deployed on Vercel (configured via `vercel.json`).
- Requires setting the `OPENAI_API_KEY` environment variable on the hosting platform.
- Express serves the static frontend files.

## 10. Security Considerations

### 10.1 API Key Management

- OpenAI API key is stored securely in backend environment variables, never exposed to the client.

### 10.2 Input Sanitization

- Basic trimming of input text occurs. No complex sanitization is currently implemented, relying on OpenAI's handling of input content.

## 11. Performance Optimization

### 11.1 Frontend

- Vanilla JS avoids framework overhead.
- DOM manipulation is generally limited to button state changes and rendering output/signature.

### 11.2 Backend

- API calls to OpenAI are the main performance bottleneck. Timeout (`60s`) is set for `axios` requests.
- No complex computations performed on the backend besides prompt generation and basic string manipulation.

## 12. Future Enhancements

### 12.1 Potential Features

- User accounts and saved preferences
- History of previous improvements
- Additional text types (social media, academic, etc.)
- Multi-language support
- More advanced formatting options (bold, italics, lists)
- Custom signatures

### 12.2 Technical Improvements

- Client-side caching
- Service workers for offline capabilities
- More robust frontend state management (if complexity increases)
- A/B testing for UI improvements

## 13. Conclusion

Text Polish provides an efficient solution for improving written communications through AI assistance. The architecture leverages specific prompting strategies and complementary frontend/backend processing to deliver appropriately formatted output for different communication types (Email, Messenger, Social Post). Key implementation details, such as JSON handling for emails, newline-based paragraph splitting, end-of-text height adjustment, and the optional signature feature, ensure a user-friendly and functional experience.
