chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractContent") {
        let articleText = document.body.innerText;
        sendResponse({ text: articleText });
    }
});
