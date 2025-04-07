# Message Improver

A simple web application that enhances text messages and emails according to your preferred tone.

## Features

- Input your original message
- Select the message type (SMS or Email)
- Choose a tone (Friendly, Serious, Professional, Flirty)
- Get an improved version of your message

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **API Integration**: Ready for LLM APIs like OpenAI (currently using mock responses)

## Getting Started

### Prerequisites

- Node.js (v12 or higher)
- npm

### Installation

1. Clone the repository:

   ```
   git clone [repository-url]
   cd message-improver
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the server:

   ```
   npm start
   ```

4. Open your browser and go to `http://localhost:3000`

### Development Mode

For development with automatic reloading:

```
npm run dev
```

## API Usage

The application has a simple API endpoint:

- **POST /api/improve**
  - Body: `{ text: "Your message", messageType: "sms|email", tone: "friendly|serious|professional|flirty" }`
  - Response: `{ improved: "Improved message" }`

## LLM Integration

The application is designed to work with Large Language Model APIs like OpenAI's GPT:

1. Obtain an API key from your preferred LLM provider.
2. Create a `.env` file in the root directory with:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```
3. Uncomment the API integration code in `src/app.js`.

## Responsive Design

The application is fully responsive and works well on both desktop and mobile devices.

## License

MIT
