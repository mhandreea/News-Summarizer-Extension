#📰 News Summarizer Chrome Extension

 My AI-powered News Summarizer Chrome extension delivers instant news summaries with sentiment insights, enabling professionals, students, and busy individuals to consume information faster and act smarter- without sacrificing depth, accuracy or time.
 Breaks barriers with integrated text-to-speech, ensuring critical knowledge reaches visually impaired users and multitaskers who prefer audio content.
 This extension tackles modern challenges like information overload and misinformation by delivering concise, source-backed summaries while providing advanced sentiment analysis and objectivity scoring. 
 Unlike generic tools, News Summarizer adds crucial context by revealing the emotional tone and potential biases in reporting. 

#-Features

AI-Powered Summarization – Uses BART (NLP) to generate concise summaries.
Sentiment Analysis – Detects article tone (Positive/Neutral/Negative) via DistilBERT & TextBlob.
Text-to-Speech – Listen to summaries on-the-go with gTTS-generated MP3s.
Save & Bookmark – Store articles for later reading.
Clean Metadata Extraction – Fetches titles, authors, and publish dates via newspaper3k.

#-Tech Stack

Backend: Python (Flask API)
NLP: BART (summarization), DistilBERT & TextBlob (sentiment)
TTS: gTTS (Google Text-to-Speech)
Scraping: newspaper3k for article extraction

#-How It Works

Fetch: Submit a URL → API downloads and cleans the article.
Analyze: Text is summarized (BART) and sentiment-scored (DistilBERT).
Deliver: Returns a summary + metadata, with optional audio (gTTS).
