📰 News Summarizer Chrome Extension

Cut through the noise with AI-powered news summaries.

This Chrome extension helps you combat information overload by instantly summarizing articles, analyzing sentiment, and even reading them aloud. Perfect for quick insights without the clutter!
✨ Features

    AI-Powered Summarization – Uses BART (NLP) to generate concise summaries.

    Sentiment Analysis – Detects article tone (Positive/Neutral/Negative) via DistilBERT & TextBlob.

    Text-to-Speech – Listen to summaries on-the-go with gTTS-generated MP3s.

    Save & Bookmark – Store articles for later reading.

    Clean Metadata Extraction – Fetches titles, authors, and publish dates via newspaper3k.

🛠 Tech Stack

    Backend: Python (Flask API)

    NLP: BART (summarization), DistilBERT & TextBlob (sentiment)

    TTS: gTTS (Google Text-to-Speech)

    Scraping: newspaper3k for article extraction

🔍 How It Works

    Fetch: Submit a URL → API downloads and cleans the article.

    Analyze: Text is summarized (BART) and sentiment-scored (DistilBERT).

    Deliver: Returns a summary + metadata, with optional audio (gTTS).
