# Technical Design Document: Text Polish Web Application

## 1. Introduction

### 1.1 Purpose

This document outlines the technical design of the Text Polish application - a web-based tool that helps users improve and refine their text communications by applying various tones, styles, and formats through AI enhancement.

### 1.2 Scope

Text Polish is designed to transform user input text into more polished, contextually appropriate communications by:

- Allowing users to select text type (email, text message)
- Configuring desired message length (auto, short, medium, long)
- Applying specific tones (formal, friendly, humorous, etc.)
- Generating improved text via OpenAI's GPT-4o model

## 2. System Architecture

### 2.1 Overview

Text Polish follows a client-server architecture:

- **Frontend**: HTML, CSS, and JavaScript running in the browser
- **Backend**: Node.js with Express.js framework
- **External Integration**: OpenAI GPT-4o API for text improvement

### 2.2 Components

```
┌─────────────┐       ┌─────────────┐      ┌─────────────┐
│   Browser   │ ──→   │  Express.js │ ──→  │  OpenAI API │
│  Frontend   │ ←──   │   Backend   │ ←──  │   (GPT-4o)  │
└─────────────┘       └─────────────┘      └─────────────┘
```

#### 2.2.1 Frontend Components

- **UI Layer**: HTML/CSS interface for user interaction
- **Client Logic**: JavaScript handling UI state and API communication

#### 2.2.2 Backend Components

- **Web Server**: Express.js handling HTTP requests
- **API Integration**: OpenAI client for text improvement
- **Response Processing**: Formatting and enhancing API responses

## 3. Technology Stack

### 3.1 Frontend

- **HTML5**: Structure and content
- **CSS3**: Styling and responsive design
- **JavaScript**: Client-side functionality
- **Web Share API**: For sharing improved text (with fallback)

### 3.2 Backend

- **Node.js**: JavaScript runtime
- **Express.js**: Web framework
- **Axios**: HTTP client for API requests
- **dotenv**: Environment variable management

### 3.3 External Services

- **OpenAI API**: GPT-4o model for text improvement

## 4. Data Flow

### 4.1 User Input Flow

1. User enters text in the input field
2. User selects text type, length, and tone options
3. User clicks "Improve" button
4. Client sends request to backend API

### 4.2 Backend Processing

1. Backend receives request with text and formatting options
2. Constructs appropriate prompt for OpenAI
3. Sends request to OpenAI API
4. Processes response (emoji handling, formatting)
5. Returns improved text to client

### 4.3 User Output Flow

1. Client receives improved text from backend
2. Text is displayed in the output container
3. User can copy, paste, clear, or share the text

## 5. API Endpoints

### 5.1 Internal API

- **POST /api/improve**
  - Request:
    ```json
    {
      "text": "Original user text",
      "messageType": "email|messenger",
      "textLength": "auto|short|medium|long",
      "tone": "formal|friendly|etc."
    }
    ```
  - Response:
    ```json
    {
      "improved": "Enhanced text with appropriate tone and format"
    }
    ```

### 5.2 External API

- **OpenAI Chat Completions API**
  - Used to generate improved text based on system and user prompts

## 6. Key Features

### 6.1 Text Type Selection

- Email: Formal correspondence format
- Text Message: Conversational, concise format

### 6.2 Length Configuration

- Auto: Maintains relatively similar length to input
- Short: Concise summary of key points
- Medium: Moderate elaboration
- Long: Detailed expansion with additional content

### 6.3 Tone Categories

1. **Positive & Engaging**

   - Exciting, Friendly, Humorous, Inspire, Loving

2. **Professional (Work)**

   - Confident, Formal, Informative, Neutral, Urgent

3. **Reflective & Responsive**
   - Blunt, Supportive, Surprised, Thoughtful

### 6.4 Emoji Management

- Smart emoji detection and density control
- Tone-appropriate emoji insertion
- Option to exclude emojis for professional tones

### 6.5 Error Handling

- Fallback response generation for API failures
- Graceful degradation for missing browser features
- Input validation and error notifications

## 7. User Interface

### 7.1 Main Components

- Text input area
- Option selection buttons (type, length, tone)
- Improve button with loading animation
- Output display area
- Action buttons (copy, paste, clear, share)

### 7.2 Responsive Design

- Mobile-first approach with responsive layouts
- Special handling for iOS devices (safe areas)
- Optimized for various screen sizes and orientations

## 8. Deployment

### 8.1 Development Environment

- Local Node.js server with Express
- Environment variables for API keys
- Hot-reloading with nodemon

### 8.2 Production Deployment

- Node.js server deployment
- Environment configuration for production
- Static file serving via Express

## 9. Security Considerations

### 9.1 API Key Management

- Server-side OpenAI API key storage
- No exposure of sensitive keys to client side

### 9.2 Input Validation

- Basic validation for empty or malformed input
- Safe handling of special characters and emojis

## 10. Performance Optimization

### 10.1 Frontend

- Minimal DOM manipulation
- Efficient event handling with delegation
- Responsive feedback during processing

### 10.2 Backend

- Timeout handling for API requests
- Fallback response generation
- Response caching opportunities

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

Text Polish provides an efficient solution for improving written communications through AI assistance. The architecture balances simplicity with effectiveness, offering users quick improvements to their text with minimal friction.
