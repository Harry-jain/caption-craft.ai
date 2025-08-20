# 🚀 AI-Powered Social Media Caption Generator

> Transform your images into engaging social media content with AI-powered caption generation for Instagram, Facebook, and LinkedIn.

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6.svg)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## ✨ Features

- **🤖 AI-Powered Analysis**: Uses LLAVA for image recognition and GPT-OSS/DeepSeek for caption generation
- **📱 Multi-Platform Support**: Generate captions optimized for Instagram, Facebook, and LinkedIn
- **🎯 5 Caption Types**: Get diverse caption styles (Short, Story, Philosophy, Lifestyle, Quote)
- **🧠 Intelligent Reasoning**: See the AI's thought process with `<think></think>` reasoning
- **📤 Smart Sharing**: Direct share buttons for each platform with optimized content
- **🌙 Dark/Light Mode**: Beautiful, responsive UI with theme switching
- **📚 History Management**: Save and revisit your generated captions
- **🔄 Model Selection**: Choose between GPT-OSS 120B and DeepSeek-R1 models

## 🏗️ Architecture

```
├── backend/                 # FastAPI backend server
│   ├── main.py             # Main API endpoints
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Container configuration
├── frontend/               # React + TypeScript frontend
│   ├── src/                # Source code
│   ├── package.json        # Node dependencies
│   └── Dockerfile          # Container configuration
└── docker-compose.yml      # Full-stack deployment
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (optional)
- Hugging Face API token

### 1. Clone the Repository

```bash
git clone https://github.com/Harry-jain/caption-craft.ai.git
cd caption-craft.ai
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment (choose one method):
# Method 1: Use the setup script (recommended)
python ../setup.py

# Method 2: Manual .env creation
echo "HF_TOKEN=your_huggingface_token_here" > .env
echo "HF_GPT_OSS_MODEL=openai/gpt-oss-120b:together" >> .env

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or run individually
docker build -t caption-backend ./backend
docker build -t caption-frontend ./frontend
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HF_TOKEN` | Hugging Face API token | Required |
| `HF_GPT_OSS_MODEL` | Model for caption generation | `openai/gpt-oss-120b:together` |

### 🔒 Security Notes

- **Never commit your `.env` file to git** - it's already added to `.gitignore`
- **Keep your HF_TOKEN secure** - it provides access to AI models
- **Use the setup script** (`python setup.py`) for easy configuration
- **Rotate tokens regularly** for production use

### Available Models

- **GPT-OSS 120B**: `openai/gpt-oss-120b:together`
- **GPT-OSS 20B**: `openai/gpt-oss-20b:together`
- **DeepSeek-R1**: `deepseek-ai/DeepSeek-R1:fireworks-ai`

## 📱 How It Works

1. **Upload Image**: Drag & drop or select an image file
2. **Choose Platform**: Select Instagram, Facebook, or LinkedIn
3. **Select Model**: Choose between GPT-OSS or DeepSeek-R1
4. **AI Analysis**: LLAVA analyzes the image content
5. **Caption Generation**: AI generates 5 distinct caption types
6. **Review & Share**: Copy captions or share directly to platforms

## 🎨 Caption Types

Each platform generates 5 unique caption styles:

- **SHORT**: Concise, punchy captions with hashtags
- **STORY**: Narrative, storytelling approach
- **PHILOSOPHY**: Deep, thought-provoking content
- **LIFESTYLE**: Aspirational, lifestyle-focused
- **QUOTE**: Inspirational, quote-style captions

## 🔌 API Endpoints

### Image Analysis
```http
POST /api/describe
Content-Type: multipart/form-data

file: [image file]
```

### Caption Generation
```http
POST /api/caption
Content-Type: application/json

{
  "description": "image description",
  "image_name": "filename.jpg",
  "image_hash": "optional_hash",
  "tone": "instagram|facebook|linkedin",
  "model_id": "optional_model_override"
}
```

### History Management
```http
GET /api/history          # Get all captions
GET /api/history/{id}     # Get specific caption
DELETE /api/history/{id}  # Delete caption
DELETE /api/history       # Clear all history
```

## 🛠️ Tech Stack

### Backend
- **FastAPI**: Modern, fast web framework
- **Python 3.11+**: Latest Python features
- **Hugging Face**: AI model inference
- **LLAVA**: Vision-language model for image analysis
- **OpenAI Client**: Router API integration

### Frontend
- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Vite**: Fast build tool
- **React Router**: Client-side routing

### AI Models
- **LLAVA 7B**: Image recognition and description
- **GPT-OSS 120B**: Advanced caption generation
- **DeepSeek-R1**: Alternative caption model

## 🌟 Key Features

### Smart Platform Adaptation
- **Instagram**: Trendy, aesthetic-focused with strategic emojis
- **Facebook**: Community-oriented, conversational tone
- **LinkedIn**: Professional, thought-leadership content

### Advanced AI Reasoning
- View the AI's thought process with `<think></think>` tags
- Understand how captions are adapted for each platform
- Transparent AI decision-making

### Seamless Sharing
- Direct platform integration
- Optimized content for each social network
- Copy-to-clipboard functionality

## 📊 Performance

- **Image Analysis**: ~5-10 seconds with LLAVA
- **Caption Generation**: ~10-20 seconds with GPT-OSS
- **Response Time**: Optimized for real-time interaction
- **Scalability**: Docker-ready for production deployment

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Hugging Face** for providing the AI models
- **Together AI** for GPT-OSS model hosting
- **Fireworks AI** for DeepSeek-R1 hosting
- **Open Source Community** for the amazing tools

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Harry-jain/caption-craft.ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Harry-jain/caption-craft.ai/discussions)
- **Email**: harry.jain@example.com

## 🔮 Roadmap

- [ ] Multi-language support
- [ ] Video caption generation
- [ ] Advanced hashtag optimization
- [ ] Social media scheduling integration
- [ ] Team collaboration features
- [ ] Analytics and insights

---

<div align="center">
  <p>Made with ❤️ by the AI Caption Generator Team</p>
  <p>⭐ Star this repo if you found it helpful!</p>
</div>
