# Shikbo AI 🤖

Your Virtual Tutor - A beautiful, privacy-first AI chat application built with Next.js, TypeScript, and Hugging Face that provides educational assistance!

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![Hugging Face](https://img.shields.io/badge/Hugging%20Face-API-green)
![License](https://img.shields.io/badge/License-CC--BY--NC--SA--4.0-orange)

## ✨ Key Features

- 🤖 **AI-Powered Tutoring** - Advanced Qwen model for intelligent educational assistance
- 🌐 **Multilingual Support** - English and Bengali language processing
- 🎤 **Voice Interaction** - Text-to-speech and speech-to-text capabilities
- 📚 **Grade-Specific Learning** - Tailored responses for Classes 1-12
- 🎨 **Beautiful Modern UI** - Glassmorphic design with smooth animations
- 🚀 Production Ready - Built with Next.js 14, TypeScript, and modern web standards

## 🇧🇩 Our Mission

Shikbo AI is dedicated to empowering students in Bangladesh by providing accessible, AI-powered educational assistance. Our goal is to foster learning through intelligent, multilingual tutoring that adapts to different grade levels and languages.

## 🛠️ Technology Stack

- **[Next.js 16](https://nextjs.org/)** - React framework with App Router and Server Components
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Hugging Face Inference](https://huggingface.co/inference-api)** - Qwen 2.5-7B multilingual AI model
- **[HeroUI](https://heroui.com/)** - Beautiful React components
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Framer Motion](https://www.framer.com/motion/)** - Smooth animations
- **[React Markdown](https://github.com/remarkjs/react-markdown)** - Markdown rendering
- **[Bun](https://bun.sh/)** - Fast JavaScript runtime and package manager

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (or a compatible version)
- A package manager: **npm**, **yarn**, or **pnpm**

### Installation & Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/shikbo-ai.git
    cd shikbo-ai
    ```

2.  **Install dependencies** (choose your package manager):

    ```bash
    # Using pnpm
    pnpm install

    # Using npm
    npm install

    # Using yarn
    yarn install
    ```

3.  **Start the development server:**

    ```bash
    # Using pnpm
    pnpm run dev

    # Using npm
    npm run dev

    # Using yarn
    yarn dev
    ```

4.  **Open your browser**

    Visit [http://localhost:3000](http://localhost:3000) to start chatting!

### Production Deployment

1. **Build for production**

   ```bash
   npm run build
   ```

2. **Start production server**

   ```bash
   npm start
   ```

3. **Deploy to Vercel** (recommended)
   ```bash
   npx vercel
   ```

## 📱 How to Use

1. **Select an AI Model** - Choose from the dropdown menu in the header based on your needs
2. **Start Chatting** - Type your message in the input field
3. **First-Time Loading** - Models download automatically on first use (cached afterward)
4. **Switch Models** - Change models anytime to get different response styles
5. **Educational Focus** - Ask questions, request explanations, or get help with learning

## 🤖 Available AI Models

| Model              | Best For                                  | Size   | Speed    |
| ------------------ | ----------------------------------------- | ------ | -------- |
| **DistilGPT-2**    | General text generation, fast responses   | ~300MB | ⭐⭐⭐⭐ |
| **Flan-T5 Small**  | Educational Q&A, explanations, study help | ~200MB | ⭐⭐⭐   |
| **DialoGPT Small** | Interactive discussions, tutoring         | ~350MB | ⭐⭐     |

_Note: All models are free and run entirely in your browser. Download size is one-time only. Models are cached permanently._

## 🎯 Production Features

### Performance Optimizations

- **Code Splitting** - Optimized bundle sizes with Next.js
- **Model Caching** - Persistent model storage across sessions
- **Lazy Loading** - Dynamic imports for better initial load times
- **Memory Management** - Conversation limits with optional cache clearing

### Security & Privacy

- **Zero Data Collection** - No user data ever leaves your device
- **Content Security Policy** - Security headers for XSS protection
- **HTTPS Ready** - SSL/TLS support for production deployments
- **No External APIs** - Complete independence from third-party services

### SEO & Accessibility

- **Meta Tags** - Complete Open Graph and Twitter Card support
- **Sitemap** - Auto-generated sitemap.xml
- **Robots.txt** - Search engine optimization
- **Responsive Design** - Works on all devices and screen sizes

## 🗂 Project Structure

```
ai-chat-assistant/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── globals.css     # Global styles
│   │   ├── layout.tsx      # Root layout with metadata
│   │   ├── page.tsx        # Home page
│   │   ├── robots.ts       # SEO robots.txt
│   │   └── sitemap.ts      # SEO sitemap
│   ├── components/         # React components
│   │   └── ChatInterface.tsx
│   ├── lib/               # Utilities and APIs
│   │   ├── api.ts         # Transformers.js integration
│   │   └── utils.ts       # Helper functions
│   └── types/             # TypeScript definitions
│       └── index.ts
├── public/                # Static assets
├── .env.example          # Environment variables template
├── next.config.js        # Next.js configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── package.json          # Dependencies and scripts
```

## ⚙️ Configuration

### Environment Variables (Optional)

Create `.env.local` for optional features:

```bash
# Optional: Google Analytics
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id

# Optional: App URL for production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional: Google Site Verification
GOOGLE_SITE_VERIFICATION=your_verification_code
```

### Next.js Configuration

The app includes production-optimized configuration:

```javascript
// next.config.js
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: [
      "@huggingface/transformers",
      "onnxruntime-web",
    ],
  },
  // ... additional webpack configuration for Transformers.js
};
```

## 🚀 Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/ai-chat-assistant)

1. Connect your GitHub repository to Vercel
2. Set any optional environment variables
3. Deploy with automatic builds on push

### Other Platforms

The app works on any platform supporting Node.js:

- **Netlify** - Static export compatible
- **AWS Amplify** - Full SSR support
- **Docker** - Use provided Dockerfile
- **Self-hosted** - Standard Node.js deployment

## 🛠️ Development

### Adding New Models

1. Add model configuration to `src/lib/api.ts`
2. Update model selection in `availableModels` array
3. Test model loading and response formatting

### Customizing UI

- Modify `src/app/globals.css` for global styles
- Update `tailwind.config.js` for design system changes
- Edit components in `src/components/` for UI modifications

## 📄 License

This project is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0) - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[Hugging Face](https://huggingface.co/)** - For Transformers.js and model ecosystem
- **[Xenova](https://github.com/xenova)** - For ONNX model conversions and Transformers.js
- **[Vercel](https://vercel.com/)** - For Next.js framework and deployment platform
- **[The Open Source Community](https://opensource.org/)** - For making projects like this possible

## 📊 Performance Notes

- **Initial Load**: ~2-3 seconds for app initialization
- **Model Download**: 200MB-500MB per model (one-time only)
- **Response Time**: 1-5 seconds depending on model size and device
- **Memory Usage**: 200MB-1GB depending on loaded models
- **Browser Support**: Chrome 88+, Firefox 78+, Safari 14+

## 🏘 Support

- **Documentation**: Check our [Wiki](https://github.com/your-username/ai-chat-assistant/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/ai-chat-assistant/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/ai-chat-assistant/discussions)

---

**Made with ❤️ by developers who believe in privacy-first AI**
