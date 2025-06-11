// Configuration

const DEFAULT_LANGUAGE = 'en';
const LANGUAGES = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'ro': 'Romanian',       // Adăugat
    'ru': 'Russian',        // Adăugat
    'zh': 'Chinese',        // Adăugat
    'ar': 'Arabic',         // Adăugat
    'ja': 'Japanese',       // Adăugat
    'pt': 'Portuguese'      // Adăugat
};


// State management
let appState = {
    currentSummary: null,
    audioUrl: null,
    currentLanguage: DEFAULT_LANGUAGE
};

// Initialize UI elements
const urlInput = document.getElementById('url-input');
const summarizeBtn = document.getElementById('summarize-btn');
const summaryText = document.getElementById('summary-text');
const sentimentText = document.getElementById('sentiment-text');
const speakBtn = document.getElementById('speak-btn');
const saveBookmarkBtn = document.getElementById('save-bookmark-btn');
const showBookmarksBtn = document.getElementById('show-bookmarks-btn');
const bookmarksSection = document.getElementById('bookmarks-section');
const summarizerSection = document.getElementById('summarizer-section');
const bookmarksList = document.getElementById('bookmarks-list');
const closeBookmarksBtn = document.getElementById('close-bookmarks-btn');
const feedbackMessage = document.getElementById('feedback-message');
const messageText = document.getElementById('message-text');
const maxLengthInput = document.getElementById('max-length');
const maxLengthValue = document.getElementById('max-length-value');
const numBeamsInput = document.getElementById('num-beams');
const numBeamsValue = document.getElementById('num-beams-value');
const languageSelect = document.getElementById('language-select');
const articleMetadata = document.getElementById('article-metadata');
const sentimentScore = document.getElementById('sentiment-score');
const polarityScore = document.getElementById('polarity-score');
const subjectivityScore = document.getElementById('subjectivity-score');

// Initialize language dropdown
function initLanguageDropdown() {
    languageSelect.innerHTML = '';
    for (const [code, name] of Object.entries(LANGUAGES)) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        if (code === DEFAULT_LANGUAGE) {
            option.selected = true;
        }
        languageSelect.appendChild(option);
    }
}

// Get current tab URL when popup opens
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
        urlInput.value = tabs[0].url;
    }
});

// Initialize UI
initLanguageDropdown();

// Update range input values display
maxLengthInput.addEventListener('input', () => {
    maxLengthValue.textContent = `${maxLengthInput.value} tokens`;
});

numBeamsInput.addEventListener('input', () => {
    numBeamsValue.textContent = `${numBeamsInput.value} beams`;
});

// Enhanced summarize button click handler
summarizeBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    const max_length = maxLengthInput.value;
    const num_beams = numBeamsInput.value;
    const lang = languageSelect.value;
    const recursive = document.getElementById('recursive-summary-checkbox').checked; // Obținem valoarea checkbox-ului

    if (!url) {
        showFeedbackMessage('Please enter a valid URL', 'error');
        return;
    }

    showFeedbackMessage('Generating summary...', 'info');
    summarizeBtn.disabled = true;
    summarizeBtn.innerHTML = '<span class="spinner"></span> Processing...';

    try {
        const response = await fetch('http://localhost:5000/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                url: url,
                max_length: parseInt(max_length),
                num_beams: parseInt(num_beams),
                lang: lang,
                recursive: recursive  // Adăugăm parametru pentru segmentarea recursivă
            }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate summary');
        }
        
        const data = await response.json();
        
        // Update state
        appState.currentSummary = data;
        appState.currentLanguage = lang;
        
        // Update UI
        summaryText.value = data.summary;
        sentimentText.value = data.sentiment.sentiment;
        
        // Update sentiment visualization
        updateSentimentVisualization(data.sentiment);
        
        // Update article metadata
        updateArticleMetadata(data.article_metadata);
        
        showFeedbackMessage('Summary generated successfully!', 'success');
    } catch (error) {
        console.error('Error:', error);
        showFeedbackMessage(error.message || 'Error generating summary', 'error');
    } finally {
        summarizeBtn.disabled = false;
        summarizeBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z" /></svg> Summarize Article';
    }
});

// Enhanced text-to-speech functionality
speakBtn.addEventListener('click', async () => {
    if (!appState.currentSummary || !summaryText.value) {
        showFeedbackMessage('No summary available to speak', 'error');
        return;
    }
    
    try {
        speakBtn.disabled = true;
        speakBtn.innerHTML = '<span class="spinner"></span> Generating audio...';
        
        // Stop any currently playing audio
        if (window.currentAudio) {
            window.currentAudio.pause();
            window.currentAudio = null;
        }
        
        // Generate or use cached audio
        if (!appState.audioUrl || appState.currentLanguage !== languageSelect.value) {
            const response = await fetch('http://localhost:5000/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    text: summaryText.value,
                    lang: languageSelect.value
                }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate audio');
            }
            
            const data = await response.json();
            appState.audioUrl = data.audio_path;
            appState.currentLanguage = languageSelect.value;
        }
        
        // Play audio
        const audio = new Audio(appState.audioUrl);
        window.currentAudio = audio;
        audio.play();
        
        audio.onended = () => {
            speakBtn.disabled = false;
            speakBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" /></svg> Speak Summary';
        };
        
    } catch (error) {
        console.error('Error:', error);
        showFeedbackMessage('Error generating speech. Please try again.', 'error');
        speakBtn.disabled = false;
        speakBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" /></svg> Speak Summary';
    }
});

// Enhanced save bookmark functionality
saveBookmarkBtn.addEventListener('click', () => {
    if (!appState.currentSummary) {
        showFeedbackMessage('Please generate a summary before saving.', 'error');
        return;
    }

    const bookmark = {
        url: urlInput.value,
        summary: summaryText.value,
        sentiment: appState.currentSummary.sentiment,
        metadata: appState.currentSummary.article_metadata,
        timestamp: new Date().toISOString(),
        settings: {
            max_length: maxLengthInput.value,
            num_beams: numBeamsInput.value,
            language: languageSelect.value
        }
    };

    chrome.storage.sync.get(['bookmarks'], (result) => {
        const bookmarks = result.bookmarks || {};
        bookmarks[bookmark.url] = bookmark;
        
        chrome.storage.sync.set({ bookmarks }, () => {
            showFeedbackMessage('Bookmark saved successfully!', 'success');
        });
    });
});

// Show bookmarks section
showBookmarksBtn.addEventListener('click', () => {
    summarizerSection.style.display = 'none';
    bookmarksSection.style.display = 'block';
    loadBookmarks();
});

// Close bookmarks section
closeBookmarksBtn.addEventListener('click', () => {
    summarizerSection.style.display = 'block';
    bookmarksSection.style.display = 'none';
});

// Enhanced load and display bookmarks
function loadBookmarks() {
    chrome.storage.sync.get(['bookmarks'], (result) => {
        bookmarksList.innerHTML = '';
        
        const bookmarks = result.bookmarks || {};
        const sortedBookmarks = Object.values(bookmarks).sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp));
        
        if (sortedBookmarks.length === 0) {
            bookmarksList.innerHTML = '<li class="no-bookmarks">No bookmarks saved yet</li>';
            return;
        }
        
        sortedBookmarks.forEach(bookmark => {
            const listItem = document.createElement('li');
            
            // Bookmark content
            const bookmarkContent = document.createElement('div');
            bookmarkContent.className = 'bookmark-content';
            
            // Sentiment indicator
            const sentimentIndicator = document.createElement('span');
            sentimentIndicator.className = `sentiment-indicator sentiment-${bookmark.sentiment.sentiment.toLowerCase()}`;
            bookmarkContent.appendChild(sentimentIndicator);
            
            // Title and URL
            const title = document.createElement('div');
            title.className = 'bookmark-title';
            title.textContent = bookmark.metadata.title || new URL(bookmark.url).hostname;
            bookmarkContent.appendChild(title);
            
            const urlText = document.createElement('div');
            urlText.className = 'bookmark-url';
            urlText.textContent = new URL(bookmark.url).hostname;
            bookmarkContent.appendChild(urlText);
            
            // Date and summary preview
            const dateText = document.createElement('div');
            dateText.className = 'bookmark-date';
            dateText.textContent = new Date(bookmark.timestamp).toLocaleString();
            bookmarkContent.appendChild(dateText);
            
            const preview = document.createElement('div');
            preview.className = 'bookmark-preview';
            preview.textContent = bookmark.summary.substring(0, 100) + (bookmark.summary.length > 100 ? '...' : '');
            bookmarkContent.appendChild(preview);
            
            listItem.appendChild(bookmarkContent);
            
            // Action buttons
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'bookmark-actions';
            
            // Load button
            const loadButton = document.createElement('button');
            loadButton.className = 'action-btn load-btn';
            loadButton.title = 'Load bookmark';
            loadButton.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,15L7,10H10V3H14V10H17L12,15M19,19H5V8H19V19M5,21H19A2,2 0 0,0 21,19V8A2,2 0 0,0 19,6H16V1H8V6H5A2,2 0 0,0 3,8V19A2,2 0 0,0 5,21Z" /></svg>';
            loadButton.addEventListener('click', () => {
                loadBookmark(bookmark);
            });
            actionsDiv.appendChild(loadButton);
            
            // Delete button
            const deleteButton = document.createElement('button');
            deleteButton.className = 'action-btn delete-btn';
            deleteButton.title = 'Delete bookmark';
            deleteButton.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>';
            deleteButton.addEventListener('click', () => {
                deleteBookmark(bookmark.url);
            });
            actionsDiv.appendChild(deleteButton);
            
            listItem.appendChild(actionsDiv);
            bookmarksList.appendChild(listItem);
        });
    });
}

function loadBookmark(bookmark) {
    urlInput.value = bookmark.url;
    summaryText.value = bookmark.summary;
    
    // Update sentiment visualization
    updateSentimentVisualization(bookmark.sentiment);
    
    // Update article metadata
    updateArticleMetadata(bookmark.metadata);
    
    // Update settings
    maxLengthInput.value = bookmark.settings.max_length || DEFAULT_SUMMARY_LENGTH;
    numBeamsInput.value = bookmark.settings.num_beams || DEFAULT_NUM_BEAMS;
    languageSelect.value = bookmark.settings.language || DEFAULT_LANGUAGE;
    
    // Update display values
    maxLengthValue.textContent = `${maxLengthInput.value} tokens`;
    numBeamsValue.textContent = `${numBeamsInput.value} beams`;
    
    // Update state
    appState.currentSummary = {
        summary: bookmark.summary,
        sentiment: bookmark.sentiment,
        article_metadata: bookmark.metadata
    };
    
    summarizerSection.style.display = 'block';
    bookmarksSection.style.display = 'none';
    showFeedbackMessage('Bookmark loaded!', 'success');
}

function deleteBookmark(url) {
    chrome.storage.sync.get(['bookmarks'], (result) => {
        const bookmarks = result.bookmarks || {};
        delete bookmarks[url];
        
        chrome.storage.sync.set({ bookmarks }, () => {
            loadBookmarks();
            showFeedbackMessage('Bookmark deleted successfully!', 'success');
        });
    });
}

function updateSentimentVisualization(sentimentData) {
    sentimentText.value = `Sentiment: ${sentimentData.sentiment} (Polarity: ${sentimentData.polarity}, Subjectivity: ${sentimentData.subjectivity})`;
    
    // Update sentiment score visualization
    sentimentScore.textContent = sentimentData.sentiment;
    sentimentScore.className = `sentiment-${sentimentData.sentiment.toLowerCase()}`;
    
    polarityScore.textContent = sentimentData.polarity;
    polarityScore.className = sentimentData.polarity > 0 ? 'positive' : 
                            sentimentData.polarity < 0 ? 'negative' : 'neutral';
    
    subjectivityScore.textContent = sentimentData.subjectivity;
    subjectivityScore.className = sentimentData.subjectivity > 0.5 ? 'high-subjectivity' : 'low-subjectivity';
}

function updateArticleMetadata(metadata) {
    let metadataHTML = '';
    
    if (metadata.title) {
        metadataHTML += `<div><strong>Title:</strong> ${metadata.title}</div>`;
    }
    
    if (metadata.authors && metadata.authors.length > 0) {
        metadataHTML += `<div><strong>Author(s):</strong> ${metadata.authors.join(', ')}</div>`;
    }
    
    if (metadata.publish_date) {
        metadataHTML += `<div><strong>Published:</strong> ${new Date(metadata.publish_date).toLocaleDateString()}</div>`;
    }
    
    if (metadata.keywords && metadata.keywords.length > 0) {
        metadataHTML += `<div><strong>Keywords:</strong> ${metadata.keywords.join(', ')}</div>`;
    }
    
    articleMetadata.innerHTML = metadataHTML || '<div>No metadata available</div>';
}

// Show feedback message
function showFeedbackMessage(message, type) {
    messageText.textContent = message;
    feedbackMessage.style.display = 'block';
    feedbackMessage.className = `feedback-${type}`;
    
    setTimeout(() => {
        feedbackMessage.style.display = 'none';
    }, 3000);
}

// Clean up audio when popup closes
window.addEventListener('beforeunload', () => {
    if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio = null;
    }
    
});

