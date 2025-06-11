from flask import Flask, request, jsonify
from newspaper import Article, ArticleException
from textblob import TextBlob
from transformers import BartTokenizer, BartForConditionalGeneration, pipeline
import torch 
from flask_cors import CORS
import logging
from datetime import datetime
import os
from gtts import gTTS
import tempfile
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
MAX_SUMMARY_LENGTH = 1024
MIN_SUMMARY_LENGTH = 50
DEFAULT_SUMMARY_LENGTH = 150
DEFAULT_NUM_BEAMS = 4

# Load models once at startup
try:
    logger.info("Loading BART model...")
    model_name = "facebook/bart-large-cnn"
    tokenizer = BartTokenizer.from_pretrained(model_name)
    model = BartForConditionalGeneration.from_pretrained(model_name)

    logger.info("Loading sentiment analysis model...")
    sentiment_analyzer = pipeline("sentiment-analysis", 
                                model="distilbert-base-uncased-finetuned-sst-2-english")

    logger.info("Models loaded successfully")
except Exception as e:
    logger.error(f"Failed to load models: {str(e)}")
    raise e


def validate_url(url):
    if not url:
        return False
    return url.startswith(('http://', 'https://'))


def extract_article(url):
    try:
        article = Article(url)
        article.download()
        article.parse()
        article.text = ' '.join(article.text.split())
        return article
    except ArticleException as e:
        logger.error(f"Article extraction failed: {str(e)}")
        raise ValueError("Failed to extract article content. Please check the URL.")


def chunk_text(text, max_tokens=1024):
    """Împarte textul în segmente logice cu maxim 1024 tokens."""
    sentences = text.split('. ')
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        if len(tokenizer.tokenize(current_chunk + sentence)) < max_tokens:
            current_chunk += sentence + ". "
        else:
            chunks.append(current_chunk.strip())
            current_chunk = sentence + ". "

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks


def generate_summary(text, max_length=DEFAULT_SUMMARY_LENGTH, min_length=None, num_beams=DEFAULT_NUM_BEAMS):
    try:
        chunks = chunk_text(text)
        logger.info(f"Textul a fost împărțit în {len(chunks)} segmente")

        summaries = []
        for idx, chunk in enumerate(chunks):
            logger.info(f"Rezumat segment {idx + 1}/{len(chunks)}")
            inputs = tokenizer([chunk], max_length=1024, return_tensors="pt", truncation=True)

            if not min_length:
                min_length = max(int(max_length * 0.5), 50)

            summary_ids = model.generate(
                inputs["input_ids"],
                num_beams=num_beams,
                max_length=max_length,
                min_length=min_length,
                early_stopping=True,
                length_penalty=2.0,
                no_repeat_ngram_size=3
            )

            summary = tokenizer.batch_decode(
                summary_ids,
                skip_special_tokens=True,
                clean_up_tokenization_spaces=True
            )[0]
            summaries.append(summary)
        # Dacă avem mai multe segmente, facem un "summary of summaries"
        if len(summaries) > 1:
            logger.info("Se generează rezumatul final din rezumate intermediare")
            combined_summary = " ".join(summaries)
            return generate_summary(combined_summary, max_length, min_length, num_beams)

        return summaries[0]

    except Exception as e:
        logger.error(f"Summary generation failed: {str(e)}")
        raise ValueError("Failed to generate summary. Please try again.")


def analyze_sentiment(text):
    try:
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity
        subjectivity = blob.sentiment.subjectivity

        result = sentiment_analyzer(text[:1024])[0]

        sentiment_score = (polarity + (0.5 if result['label'] == 'POSITIVE' else -0.5)) / 2

        if sentiment_score > 0.2:
            sentiment = "Positive"
        elif sentiment_score < -0.2:
            sentiment = "Negative"
        else:
            sentiment = "Neutral"

        return {
            "sentiment": sentiment,
            "polarity": round(polarity, 2),
            "subjectivity": round(subjectivity, 2),
            "confidence": round(result['score'], 2)
        }
    except Exception as e:
        logger.error(f"Sentiment analysis failed: {str(e)}")
        return {
            "sentiment": "Unknown",
            "polarity": 0,
            "subjectivity": 0,
            "confidence": 0
        }


def generate_tts(text, lang='en'):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_file:
            tts = gTTS(text=text, lang=lang, slow=False)
            tts.save(tmp_file.name)
            return tmp_file.name
    except Exception as e:
        logger.error(f"TTS generation failed: {str(e)}")
        raise ValueError("Failed to generate audio. Please try again.")


@app.route('/summarize', methods=['POST'])
def summarize_article():
    start_time = datetime.now()

    try:
        data = request.get_json()
        url = data.get('url')
        max_length = min(int(data.get('max_length', DEFAULT_SUMMARY_LENGTH)), MAX_SUMMARY_LENGTH)
        num_beams = min(max(int(data.get('num_beams', DEFAULT_NUM_BEAMS)), 1), 8)
        lang = data.get('lang', 'en')

        if not validate_url(url):
            return jsonify({"error": "Invalid URL format"}), 400

        article = extract_article(url)
        summary = generate_summary(article.text, max_length=max_length, num_beams=num_beams)
        sentiment = analyze_sentiment(article.text)

        response = {
            'summary': summary,
            'sentiment': sentiment,
            'article_metadata': {
                'title': article.title,
                'authors': article.authors,
                'publish_date': str(article.publish_date) if article.publish_date else None,
                'top_image': article.top_image,
                'keywords': article.keywords,
                'tags': list(article.tags)
            },
            'processing_time': str(datetime.now() - start_time)
        }

        return jsonify(response)

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500


@app.route('/tts', methods=['POST'])
def text_to_speech():
    try:
        data = request.get_json()
        text = data.get('text')
        lang = data.get('lang', 'en')

        if not text:
            return jsonify({"error": "Text is required"}), 400

        audio_path = generate_tts(text, lang)
        return jsonify({"audio_path": audio_path})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
