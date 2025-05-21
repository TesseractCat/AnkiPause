(async () => {
    // Prevent multiple prompts
    if (window.__ankiPrompted) return;
    window.__ankiPrompted = true;

    // Get saved patterns
    const {patterns = []} = await chrome.storage.sync.get('patterns');
    if (!patterns.length) return;

    const url = window.location.href;
    // Convert patterns to regex and test
    const matches = patterns.some(p => {
        // Escape regex
        const reStr = p
            .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
            .replace(/\\\*/g, '.*');
        const re = new RegExp(`^https?://${reStr}`);
        return re.test(url);
    });
    if (!matches) return;
    
    let currentCard = null;
    let currentCardIdx = 0;

    const style = document.createElement("style");
    style.textContent = `
    #AnkiPause__Overlay,
    #AnkiPause__Overlay * {
        all: unset !important;
        box-sizing: border-box !important;
        font-family: tahoma !important;
        font-size: initial !important;
    }
    #AnkiPause__Overlay::before,
    #AnkiPause__Overlay::after,
    #AnkiPause__Overlay *::before,
    #AnkiPause__Overlay *::after {
        all: unset !important;
        content: none !important;
        font-family: initial !important;
        font-size: initial !important;
    }

    #AnkiPause__Overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 99999 !important;
        backdrop-filter: blur(10px) !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        align-items: center !important;
    }

    #AnkiPause__Overlay div {
        width:  min(350px, 80vw)  !important;
        height: min(450px, 80vh)  !important;
        background-color: red    !important;
        border-radius: 5px       !important;
        overflow: hidden         !important;
        display: flex            !important;
        flex-direction: column   !important;
    }

    #AnkiPause__Overlay header {
        padding: 8px                 !important;
        align-items: center          !important;
        justify-content: center      !important;
    }
    #AnkiPause__Overlay header h1 {
        font-size: 1.5em                 !important;
        font-weight: bold                 !important;
    }
    #AnkiPause__Overlay footer {
        justify-content: stretch      !important;
        align-items: stretch          !important;
    }
    #AnkiPause__Overlay header,
    #AnkiPause__Overlay footer {
        user-select: none !important;
        background-color: #DDD       !important;
        color: black                 !important;
        font-family: Tahoma, sans-serif !important;
        display: flex                !important;
        height: 60px                 !important;
    }

    #AnkiPause__Overlay footer.answer {
        display: none !important;
    }
    #AnkiPause__Overlay.answer footer.question {
        display: none !important;
    }
    #AnkiPause__Overlay.answer footer.answer {
        display: flex !important;
    }

    #AnkiPause__Overlay footer button {
        flex-grow: 1 !important;
        text-align: center !important;
        cursor: pointer !important;
        transition: background-color 0.1s !important;
    }
    #AnkiPause__Overlay footer button {
        background-color: #DDD !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        border-right: 2px solid rgba(0,0,0,0.2) !important;
    }
    #AnkiPause__Overlay footer button span {
        font-size: 0.5em !important;
    }
    #AnkiPause__Overlay footer button:hover {
        background-color: #CCC !important;
    }
    #AnkiPause__Overlay footer button.again {
        background-color: #ff2222 !important;
    }
    #AnkiPause__Overlay footer button.again:hover {
        background-color: #ff4444 !important;
    }
    #AnkiPause__Overlay footer button.good {
        background-color: #76bf49 !important;
    }
    #AnkiPause__Overlay footer button.good:hover {
        background-color: #86c261 !important;
    }

    #AnkiPause__Overlay header img {
        align-self: stretch !important;
    }

    #AnkiPause__Overlay iframe {
        width: 100%   !important;
        flex-grow: 1  !important;
        border: none  !important;
        background-color: white !important;
    }
    `;
    document.head.appendChild(style);

    const overlayElem = document.createElement("div");
    overlayElem.id = "AnkiPause__Overlay";

    const containerElem = document.createElement("div");
    overlayElem.appendChild(containerElem);

    const headerElem = document.createElement("header");
    const headerImage = document.createElement("img");
    headerImage.src = chrome.runtime.getURL("icons/icon128.png");
    headerImage.setAttribute("draggable", "false");
    headerElem.appendChild(headerImage);
    const headerText = document.createElement("h1");
    headerText.innerText = "AnkiPause";
    headerElem.appendChild(headerText);
    containerElem.appendChild(headerElem);

    let frame = document.createElement('iframe');
    containerElem.appendChild(frame);

    function setFrameContent(content) {
        let html = `
        <!DOCTYPE html>
        <head>
            <meta http-equiv="Content-type" content="text/html;charset=UTF-8">
        </head>
        <body class="card">
            ${content}
        </body>
        `;
        const blob = new Blob([html], { type: 'text/html' });
        const url  = URL.createObjectURL(blob);
        frame.src = url;
    }

    const showAnswerFooterElem = document.createElement("footer");
    showAnswerFooterElem.classList.add("question");
    let showAnswerButton = document.createElement("button");
    showAnswerButton.innerText = "Show Answer";
    showAnswerButton.addEventListener("click", async () => {
        if (currentCard != null) {
            await chrome.runtime.sendMessage({ type: "SHOW_ANSWER" });
            setFrameContent(currentCard.answer);
            overlayElem.classList.toggle("answer");
        }
    });
    showAnswerFooterElem.appendChild(showAnswerButton);
    containerElem.appendChild(showAnswerFooterElem);

    const easeFooterElem = document.createElement("footer");
    easeFooterElem.classList.add("answer");
    containerElem.appendChild(easeFooterElem);

    const settings = await chrome.storage.sync.get({
        patterns: [],
        decks: {},
        cardsPerPage: 1
    });
    let decks = await chrome.runtime.sendMessage({ type: "DECK_NAMES" });
    decks = decks.filter(name => settings.decks.hasOwnProperty(name));
    decks = decks.filter(name => settings.decks[name] == true);
    let deckStats = await chrome.runtime.sendMessage({ type: "DECK_STATS", decks: decks });
    decks = decks.filter(name => {
        for (let stat of Object.values(deckStats)) {
            if (stat.name == name) {
                if (stat.new_count + stat.learn_count + stat.review_count > 0)
                    return true;
            }
        }
        return false;
    });

    const deck = decks[Math.floor(Math.random() * decks.length)];
    await chrome.runtime.sendMessage(
        { type: "REVIEW_DECK", deck: deck }
    );

    async function loadNextCard() {
        overlayElem.classList.remove("answer");

        let card = await chrome.runtime.sendMessage(
            { type: "CURRENT_CARD" }
        );
        await chrome.runtime.sendMessage({ type: "SHOW_QUESTION" });
        currentCard = card;
        if (currentCardIdx == 0 && card != null) {
            document.body.appendChild(overlayElem);
        } else if (card == null) {
            if (currentCardIdx != 0)
                overlayElem.remove();
            return;
        }
        
        setFrameContent(currentCard.question);

        let buttons = [];
        for (let buttonIdx = 0; buttonIdx < card.buttons.length; buttonIdx++) {
            let button = card.buttons[buttonIdx];
            let nextReview = card.nextReviews[buttonIdx];

            let nameMap = ["Again", "Hard", "Good", "Easy"];

            let buttonElem = document.createElement("button");
            buttonElem.innerHTML = `${nameMap[button - 1]} <span>${nextReview}</span>`;
            buttonElem.addEventListener("click", async () => {
                await chrome.runtime.sendMessage({ type: "ANSWER_CARD", ease: button });
                currentCardIdx += 1;
                if (currentCardIdx == settings.cardsPerPage) {
                    overlayElem.remove();
                } else {
                    easeFooterElem.replaceChildren();
                    loadNextCard();
                }
            });
            if (button == 1) {
                buttonElem.classList.add("again");
            } else {
                buttonElem.classList.add("good");
            }
            buttons.push(buttonElem);
        }
        easeFooterElem.replaceChildren(...buttons);
    }
    loadNextCard();

    // Reload cards on tab return
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            loadNextCard();
        }
    });

    // Prompt user
    /*const selection = window.getSelection().toString() || document.title;
    const front = prompt('🧠 Anki — Front:', selection);
    if (!front) return;
    const back  = prompt('🧠 Anki — Back:');
    if (!back) return;

    // Send to AnkiConnect
    /*fetch('http://127.0.0.1:8765', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            action: 'addNote',
            version: 6,
            params: {
                note: {
                    deckName: 'Default',
                    modelName: 'Basic',
                    fields: {Front: front, Back: back},
                    options: {allowDuplicate: false},
                    tags: []
                }
            }
        })
    }).catch(console.error);*/
})();