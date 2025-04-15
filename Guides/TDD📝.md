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

#### 2.2.2 Backend Components (`api/improve.js`)

- **Web Server**: Express.js handles HTTP POST requests to `/api/improve`. Serves static frontend files.
- **API Integration**: Uses `axios` to send requests to the OpenAI Chat Completions API.
- **Prompt Engineering**: Constructs specific prompts for the LLM based on `messageType` and `tone`:
  - **Email**: Instructs the LLM to return a JSON object `{ "subject": "...", "body": "..." }` with specific formatting guidelines for the body (greeting, paragraphs, closing).
  - **Messenger/Social**: Instructs the LLM to return plain text, but explicitly requests paragraph separation using double newlines (`\n\n`) for readability.
- **Response Processing**:
  - Parses JSON response for emails.
  - Trims whitespace and removes potential surrounding quotes from LLM responses.
  - Handles emoji inclusion/exclusion based on tone (`noEmojiTones` list, `addEmojiToText`, `removeEmojis`). **Note:** `removeEmojis` was updated to preserve newline characters (`\n`) during whitespace cleanup.
- **Environment Variables**: Uses `dotenv` to manage the `OPENAI_API_KEY`.

## 3. Technology Stack

### 3.1 Frontend

- **HTML5**: Structure (`public/index.html`)
- **CSS3**: Styling and responsive design (`public/style.css`)
- **Vanilla JavaScript (ES6+)**: Client-side functionality (`public/script.js`)
- **Web Share API**: Native sharing functionality (with clipboard fallback)
- **Web Speech API**: Optional speech-to-text input

### 3.2 Backend

- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **Axios**: Promise-based HTTP client for OpenAI API requests
- **dotenv**: Loading environment variables from `.env` file

### 3.3 External Services

- **OpenAI API**: GPT-4o model via the Chat Completions endpoint.

## 4. Data Flow

### 4.1 User Input Flow

1. User enters text into `text-input-area`.
2. User selects message type (`.text-type-option-btn`) and tone (`.tone-buttons`).
3. User clicks the "Improve" button (`#improve-btn`).
4. Frontend JS (`script.js`) constructs a JSON payload containing `text`, `messageType`, and `tone`.
5. Frontend sends a POST request to the backend `/api/improve` endpoint using `fetch`.

### 4.2 Backend Processing (`api/improve.js`)

1. Backend receives the POST request.
2. `generatePrompt` function creates a tailored prompt based on `messageType`:
   - **Email**: Asks for JSON output with `subject` and `body`, specifying required body structure (greeting, paragraphs, closing).
   - **Other Types**: Asks for plain text output, requesting `

`paragraph separators.
3. Backend sends the generated prompt to the OpenAI API via`axios`.
4. Backend receives the raw response from OpenAI.
5. **If Email**: Attempts to `JSON.parse`the response. If successful and valid, extracts`subject`and`body`. If parsing fails, returns an error.
6. **If Other Types**: Trims whitespace, strips surrounding quotes.
7. Performs emoji addition/removal logic based on `shouldIncludeEmojis`flag and tone. The`removeEmojis`function specifically avoids removing`
`characters.
8. Returns a JSON response`{"improved": ...}`to the client. For emails,`improved`is the structured`{subject, body}`object; otherwise, it's the processed text string containing potential`
` characters.

### 4.3 User Output Flow (`script.js`)

1. Frontend `fetch` call receives the JSON response from the backend.
2. **If Email**: `EmailHandler.processResponse` formats the `subject` and `body` (including a `***` separator) into a single `displayText` string.
3. **If Other Types**: `displayText` is assigned the `improved` string directly from the response.
4. The `displayText` is logged (`>>> FRONTEND LOG: ... before splitting`).
5. `displayText.split(/\n\n+/).flatMap(...)` splits the text first by double newlines, then by single newlines, creating an array of potential paragraphs. Empty strings are filtered out.
6. The resulting `paragraphs` array is logged (`>>> FRONTEND LOG: ... after splitting`).
7. Frontend iterates through the `paragraphs` array. For each non-empty string, it creates a `<p>` HTML element (`document.createElement('p')`), sets its `textContent`, and appends it to the output container (`#improved-message`).
8. The output container is displayed.
9. User can interact with the output using Copy, Paste to Input, Clear, Edit (contenteditable), and Share buttons.

## 5. API Endpoints

### 5.1 Internal API

- **POST /api/improve**
  - **Request Body:**
    ```json
    {
      "text": "Original user text",
      "messageType": "email | messenger | social", // Updated types
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

### 5.2 External API

- **OpenAI Chat Completions API (`https://api.openai.com/v1/chat/completions`)**
  - Used via POST request with appropriate headers (`Authorization: Bearer $OPENAI_API_KEY`) and payload including model (`gpt-4o`), messages (system and user roles), and temperature.

## 6. Key Features

### 6.1 Text Type Selection

- **Email**: Targets formal correspondence format. Backend expects structured JSON (subject/body) from LLM. Frontend uses `EmailHandler` for processing and sharing.
- **Messenger**: Targets conversational, concise format. Backend expects plain text with `

` separators. Frontend formats using paragraph splitting.

- **Social Post**: Targets platform-appropriate posts (Facebook, LinkedIn, etc.). Backend expects plain text with `

` separators. Frontend formats using paragraph splitting.

### 6.2 Output Formatting **(Crucial Implementation Detail)**

- **Email**: Relies on the LLM returning structured JSON (`{subject, body}`). The frontend `EmailHandler` combines these with a visual separator (`***`) for display. Paragraphs within the body are expected to be handled by `
` characters within the `body` string returned by the LLM, which are then rendered correctly when the frontend splits the combined text and creates `<p>` tags.
- **Messenger / Social Post**: Relies on the LLM following the instruction to use double newlines (`

`) for paragraph separation in its plain text response. The frontend explicitly splits the received text using `/\n\n+/`and`/\n/`regex and generates individual`<p>` elements for each resulting non-empty string. This ensures visual separation of paragraphs in the UI.

### 6.3 Tone Application

- Dynamically modifies the system prompt sent to OpenAI based on the selected tone.
- Influences emoji usage and writing style.

### 6.4 Emoji Management

- `noEmojiTones` list prevents emoji insertion/request for specific tones.
- `containsEmoji`, `addEmojiToText`, `removeEmojis` functions handle emoji logic.
- `removeEmojis` regex updated (`/ +/g`) to preserve newline characters (`
`) during whitespace normalization, fixing a previous bug that collapsed paragraphs.

### 6.5 Error Handling

- Backend validates input (`text` required) and API key presence.
- Backend includes `try...catch` blocks for OpenAI API calls and JSON parsing. Returns informative JSON errors.
- Frontend includes `try...catch` for `fetch` calls. Displays error messages to the user.
- Frontend implements API call retry logic (`callAPIWithRetry`) for transient server errors (e.g., 500 status).

### 6.6 UI/UX Enhancements

- Dynamic textarea resizing (`autoResizeTextarea`).
- Dynamic input placeholder text based on selected message type.
- Loading animations (`startHourglassAnimation`) on the "Improve" button.
- Visual feedback (`showIconFeedback`) on icon button clicks.
- Content-aware body class (`has-content`) for styling adjustments.
- Speech-to-text input using Web Speech API.
- Output text editing via `contenteditable` attribute.

## 7. User Interface

### 7.1 Main Components

- Text input area (`#text-input-area`) with dynamic placeholder and auto-resize.
- Option selection buttons for Type and Tone.
- Collapsible Tone Category section (`#tone-categories`).
- Improve button (`#improve-btn`) with loading state.
- Output display area (`#improved-message`) rendering content within `<p>` tags.
- Action buttons for Input (Mic, Clear, Copy, Paste) and Output (Edit, Clear, Copy, Paste to Input, Share).

### 7.2 Responsive Design

- CSS utilizes flexbox and media queries for responsiveness.
- Mobile-first considerations in styling.

## 8. Deployment

### 8.1 Development Environment

- Run locally using `npm install` and `npm run dev` (or `npm run dev:sync` if using concurrently).
- Uses `nodemon` for automatic server restarts on file changes.
- Requires a `.env` file with `OPENAI_API_KEY`.

### 8.2 Production Deployment

- Can be deployed to platforms supporting Node.js (e.g., Vercel, Render, Heroku).
- Requires setting the `OPENAI_API_KEY` environment variable on the hosting platform.
- Express serves the static frontend files.

## 9. Security Considerations

### 9.1 API Key Management

- OpenAI API key is stored securely in backend environment variables, never exposed to the client.

### 9.2 Input Sanitization

- Basic trimming of input text occurs. No complex sanitization is currently implemented, relying on OpenAI's handling of input content.

## 10. Performance Optimization

### 10.1 Frontend

- Vanilla JS avoids framework overhead.
- DOM manipulation is generally limited to button state changes and rendering output.

### 10.2 Backend

- API calls to OpenAI are the main performance bottleneck. Timeout (`60s`) is set for `axios` requests.
- No complex computations performed on the backend besides prompt generation and basic string manipulation.

## 11. Future Enhancements

### 11.1 Potential Features

- User accounts and saved preferences
- History of previous improvements
- Additional text types (social media, academic, etc.)
- Multi-language support
- More advanced formatting options

### 11.2 Technical Improvements

- Client-side caching
- Service workers for offline capabilities
- Analytics integration for usage patterns
- A/B testing for UI improvements

## 12. Conclusion

Text Polish provides an efficient solution for improving written communications through AI assistance. The architecture leverages specific prompting strategies and complementary frontend/backend processing to deliver appropriately formatted output for different communication types (Email, Messenger, Social Post). Key implementation details, such as JSON handling for emails and newline-based paragraph splitting for other types, ensure a user-friendly experience.
