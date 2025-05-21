chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "REVIEW_DECK") {
        fetch('http://127.0.0.1:8765', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'guiDeckReview',
                version: 6,
                params: {
                    name: msg.deck
                }
            })
        });
        return false;
    } else if (msg.type == "DECK_NAMES") {
        fetch('http://127.0.0.1:8765', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'deckNamesAndIds',
                version: 6
            })
        }).then((response) => {
            return response.json();
        }).then((response) => {
            sendResponse(response.result);
        });
        return true;
    } else if (msg.type == "DECK_STATS") {
        fetch('http://127.0.0.1:8765', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'getDeckStats',
                version: 6,
                params: { decks: msg.decks }
            })
        }).then((response) => {
            return response.json();
        }).then((response) => {
            sendResponse(response.result);
        });
        return true;
    } else if (msg.type == "CURRENT_CARD") {
        fetch('http://127.0.0.1:8765', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'guiCurrentCard',
                version: 6
            })
        }).then((response) => {
            return response.json();
        }).then((response) => {
            sendResponse(response.result);
        });
        return true;
    } else if (msg.type === "SHOW_QUESTION") {
        fetch('http://127.0.0.1:8765', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'guiShowQuestion',
                version: 6,
            })
        });
        return false;
    } else if (msg.type === "SHOW_ANSWER") {
        fetch('http://127.0.0.1:8765', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'guiShowAnswer',
                version: 6,
            })
        });
        return false;
    } else if (msg.type === "ANSWER_CARD") {
        fetch('http://127.0.0.1:8765', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'guiAnswerCard',
                version: 6,
                params: {
                    ease: msg.ease
                }
            })
        });
        return false;
    } else if (msg.type === "GET_MEDIA") {
        fetch('http://127.0.0.1:8765', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'retrieveMediaFile',
                version: 6,
                params: {
                    filename: msg.filename
                }
            })
        }).then((response) => {
            return response.json();
        }).then((response) => {
            sendResponse(response.result);
        });
        return true;
    }
});