# Text Polish

A web application that enhances your text messages using AI. Text Polish transforms ordinary messages into polished, tone-specific communications.

![Text Polish Screenshot](https://via.placeholder.com/800x450.png?text=Text+Polish+Screenshot)

## Features

- **Multiple Tones**: Choose from 15 different writing tones including formal, friendly, persuasive, expert, and more
- **Length Options**: Select short, medium, or long responses based on your needs
- **Message Types**: Optimize text for different contexts (email, messaging)
- **Easy Copy/Paste**: One-click buttons for copying input/output and transferring between fields
- **AI-Powered**: Uses GPT-4o to generate high-quality text transformations

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/Sam-M345/Text_Polish.git
   cd Text_Polish
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file in the root directory with your OpenAI API key:

   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Start the development server:

   ```
   npm run dev
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

1. Select a message type (Email or Messenger)
2. Enter your text in the input field
3. Choose desired output length
4. Select a writing tone that matches your intent
5. Click "Improve"
6. Copy the improved text or paste it back to the input for further refinement

## Deployment

This application can be deployed to platforms like Vercel, Render, or Railway with minimal configuration. Just connect your GitHub repository and set your environment variables.

## Built With

- Node.js/Express - Backend server
- Vanilla JavaScript - Frontend functionality
- CSS - Styling
- OpenAI API - Text processing

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the API
- All contributors who have helped improve this project
