# LinguaFlow – Smart Language Translator 🌐✨

> A modern, AI-powered language translation web application built with React, TypeScript, Tailwind CSS, Netlify Serverless Functions, and the Google Cloud Translation API.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.3-61dafb.svg?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8.svg?logo=tailwindcss)
![Netlify Functions](https://img.shields.io/badge/Netlify-Serverless-00C7B7.svg?logo=netlify)
![Google Cloud Translation](https://img.shields.io/badge/Google_Cloud-Translation_API-4285F4.svg?logo=googlecloud)

---

## 📖 Overview

**LinguaFlow** is a production-ready, full-stack language translation platform. It bridges cross-lingual communication with zero latency, providing natural neural translations, speech synthesis, real-time language detection, and automatic translation history.

Unlike client-only mockups, LinguaFlow features a secure serverless backend on Netlify (`netlify/functions/translate.js`). This ensures that your private Google Cloud credentials remain completely shielded from client-side JavaScript.

---

## ✨ Features

- ⚡ **Real-Time AI Translation**: Powered directly by Google Cloud Translation v2 REST API.
- 🔍 **Auto Language Detection**: Automatically recognizes input languages across 100+ global dialects.
- 🔄 **Smart Language Swap**: One-click exchange between source and target languages with state preservation (safely disabled when auto-detection is selected).
- 🔊 **Text-to-Speech (TTS)**: Built-in SpeechSynthesis engine with dialect-matching voices and Play/Stop controls for both input and output text.
- 📋 **One-Click Copy**: Instant clipboard copying with tactile feedback and toast notifications.
- 🕒 **Persistent Translation History**: Saves queries locally in `localStorage` with options to view, reuse, listen, or delete entries.
- 🎨 **Glassmorphism UI / UX**: Modern translucent cards, gradient backdrops, smooth micro-interactions, and custom scrollbars.
- 🌓 **Dark & Light Mode**: Fluid day/night switching with automatic system preference detection and localStorage persistence.
- 🛡️ **Zero API Key Exposure**: Secure Netlify Serverless proxy with strict input validation, length bounds (5,000 chars), and error mapping.
- 📱 **Fully Responsive**: Optimized for seamless translation across mobile phones, tablets, laptops, and ultra-wide desktops.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18 (Vite + TypeScript) |
| **Styling** | Tailwind CSS + Modern Glassmorphism & Animations |
| **Icons** | Lucide React |
| **Serverless Backend** | Netlify Functions (Node.js ESM) |
| **Translation Engine** | Google Cloud Translation API (v2 REST) |
| **Speech Engine** | Web SpeechSynthesis API |
| **Deployment Target** | Netlify Edge CDN |
| **Version Control** | Git & GitHub |

---

## 📂 Project Folder Structure

```text
Translater web/
├── .env.example                 # Sample environment variables
├── .gitignore                   # Ignored files (node_modules, .env, dist)
├── index.html                   # HTML entry point with fonts & metadata
├── netlify.toml                 # Netlify build, SPA redirects & security headers
├── package.json                 # Project dependencies & npm scripts
├── postcss.config.js            # PostCSS configuration
├── tailwind.config.js           # Tailwind theme, dark mode & animations
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite configuration with local Netlify dev proxy
├── netlify/
│   └── functions/
│       └── translate.js         # Secure serverless translation proxy function
├── public/
│   └── logo.svg                 # LinguaFlow brand logo
└── src/
    ├── App.tsx                  # Main application orchestrator
    ├── main.tsx                 # React DOM mount point
    ├── index.css                # Global styles, fonts, and scrollbars
    ├── types/
    │   └── index.ts             # TypeScript interfaces (Language, History, Response)
    ├── data/
    │   └── languages.ts         # 100+ supported languages with native names & codes
    ├── context/
    │   ├── ThemeContext.tsx     # Dark/Light theme manager
    │   └── ToastContext.tsx     # Floating toast alert system
    ├── utils/
    │   ├── cn.ts                # Tailwind class utility
    │   ├── speech.ts            # SpeechSynthesis voice manager & controller
    │   └── storage.ts           # Resilient localStorage translation history helper
    └── components/
        ├── Navbar.tsx           # Navigation header with logo, theme toggle & mobile menu
        ├── Hero.tsx             # Hero banner with value proposition & feature badges
        ├── Features.tsx         # Showcase of 8 core product capabilities
        ├── SupportedLanguages.tsx # Interactive searchable directory of 100+ languages
        ├── HowItWorks.tsx       # 4-step workflow roadmap
        ├── About.tsx            # Mission statement & architecture overview
        ├── Footer.tsx           # Footer with links & copyright
        ├── Translator/
        │   ├── TranslatorWorkspace.tsx  # Central translation split interface
        │   ├── LanguageSelectorModal.tsx # Searchable modal for language selection
        │   └── ApiKeyAlert.tsx          # Clear error & credential setup guide banner
        └── History/
            └── TranslationHistory.tsx   # History management cards & actions
```

---

## 🚀 Installation & Local Development

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (version 18.0 or newer)
- npm (version 9.0 or newer)
- A Google Cloud Platform account with Translation API enabled

### 2. Clone or Navigate to the Repository

```bash
cd "Translater web"
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Open `.env` and add your Google Cloud Translation API key:

```env
GOOGLE_TRANSLATION_API_KEY=AIzaSyYourActualGoogleTranslationApiKeyHere
```

> 💡 **Note**: If you run without an API key, the website will load normally, and clicking Translate will show a helpful configuration alert explaining how to configure your credentials without crashing.

### 5. Run the Local Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> The local Vite development server includes an integrated proxy that handles `/.netlify/functions/translate` requests, enabling full local testing without requiring the Netlify CLI.

---

## 🔑 Google Cloud Translation API Setup Guide

To obtain a Google Cloud Translation API key:

1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `LinguaFlow-Translator`).
3. Navigate to **APIs & Services > Library**.
4. Search for **Cloud Translation API** and click **Enable**.
5. Go to **APIs & Services > Credentials**.
6. Click **Create Credentials > API Key**.
7. *(Recommended)* Click **Restrict Key** and restrict usage to the **Cloud Translation API**.
8. Copy the generated API key and save it to your `.env` or Netlify environment variables.

---

## ☁️ Netlify Deployment Instructions

### Method A: Deploy via Netlify CLI

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```
2. Link or initialize your site:
   ```bash
   netlify init
   ```
3. Set your environment variable:
   ```bash
   netlify env:set GOOGLE_TRANSLATION_API_KEY "your_api_key_here"
   ```
4. Build and deploy to production:
   ```bash
   netlify deploy --prod
   ```

### Method B: Deploy via GitHub Continuous Deployment (Recommended)

1. Push your repository to GitHub (see instructions below).
2. Log in to [Netlify](https://app.netlify.com/).
3. Click **Add new site > Import an existing project**.
4. Select **GitHub** and authorize access to your `Translater web` repository.
5. Netlify will auto-detect settings from `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`
6. Go to **Site configuration > Environment variables**.
7. Click **Add a variable**:
   - **Key**: `GOOGLE_TRANSLATION_API_KEY`
   - **Value**: `YourGoogleCloudTranslationApiKey`
8. Click **Deploy site**. Netlify will build and deploy your app globally!

---

## 🐙 GitHub Upload Instructions

Initialize and publish your repository to GitHub:

```bash
# 1. Initialize git (if not already initialized)
git init

# 2. Add all files to staging
git add .

# 3. Commit your changes
git commit -m "feat: complete LinguaFlow AI translation application"

# 4. Set main branch
git branch -M main

# 5. Link your GitHub remote repository
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# 6. Push code to GitHub
git push -u origin main
```

---

## 🧪 Testing Checklist

- [x] **Translation Workflow**: Verified POST requests with dynamic source and target languages.
- [x] **Automatic Language Detection**: Validated source `auto` resolution via Google Cloud Translation API.
- [x] **Language Swapping**: Tested swapping source & target codes and values; verified disabled state during `auto`.
- [x] **Speech Synthesis (TTS)**: Tested native voice synthesis with target language voice resolution.
- [x] **Clipboard Copy**: Verified copy-to-clipboard with instant toast notifications.
- [x] **Translation History**: Tested saving, loading, reusing, and clearing items in `localStorage`.
- [x] **Dark / Light Modes**: Verified smooth palette transitions and persistence across refreshes.
- [x] **Character Limits & Validation**: Verified 5,000 character maximum and empty input guards.
- [x] **Serverless Error Handling**: Verified 405 Method Not Allowed, 500 Missing API Key, and 400 Bad Request error codes.
- [x] **Production Build**: Verified zero TypeScript and ESLint warnings with `npm run build`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

