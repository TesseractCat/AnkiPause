document.addEventListener('DOMContentLoaded', function() {
    const sitesContainer = document.getElementById('sites-container');
    const addSiteButton = document.getElementById('add-site');
    const aboutLink = document.getElementById('about-link');
    const cardsCount = document.getElementById('cards-count');
    const deckOptions = document.getElementById('deck-options');

    // Save on change
    document.addEventListener("change", saveSettings);
    
    // Add new site input
    addSiteButton.addEventListener('click', function() {
        addSiteInput();
        saveSettings();
    });
    
    // About link
    aboutLink.addEventListener('click', function(e) {
        e.preventDefault();
        alert('AnkiPause: Study flashcards while browsing distracting websites.\n\nDeveloped to help you learn while managing your browsing habits.');
    });
    
    function addSiteInput(value = '') {
        const siteEntry = document.createElement('div');
        siteEntry.className = 'site-entry';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'site-input';
        input.value = value;
        input.placeholder = 'e.g. reddit.com, facebook.com, etc.';
        
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-site';
        removeButton.textContent = '×';
        removeButton.addEventListener('click', () => {
            sitesContainer.removeChild(siteEntry);
            saveSettings();
        });
        
        siteEntry.appendChild(input);
        siteEntry.appendChild(removeButton);
        sitesContainer.appendChild(siteEntry);
    }

    function addDeckCheckbox(name, checked) {
        const deckCheckboxDiv = document.createElement('div');
        deckCheckboxDiv.classList.add("deck-checkbox");
        const checkbox = document.createElement('input');
        checkbox.dataset.deck = name;
        if (checked)
            checkbox.setAttribute("checked", "");
        checkbox.type = "checkbox";
        checkbox.id = crypto.randomUUID();
        const label = document.createElement('label');
        label.innerText = name;
        label.setAttribute("for", checkbox.id);

        deckCheckboxDiv.appendChild(checkbox);
        deckCheckboxDiv.appendChild(label);
        deckOptions.appendChild(deckCheckboxDiv)
    }
    
    function loadSettings() {
        chrome.storage.sync.get({
            patterns: [],
            decks: {},
            cardsPerPage: 1
        }).then((items) => {
            // Load site patterns
            items.patterns.forEach(pattern => {
                addSiteInput(pattern);
            });

            // Load decks
            console.log(items.decks);
            for (let [k, v] of Object.entries(items.decks)) {
                let deckElem = document.querySelector(`input[data-deck="${k}"]`);
                if (deckElem) {
                    if (v) {
                        deckElem.setAttribute("checked", "");
                    } else {
                        deckElem.removeAttribute("checked");
                    }
                }
            }
            
            // Load cards per page
            cardsCount.value = items.cardsPerPage;
        });
    }
    
    function saveSettings() {
        // Get all site patterns
        const siteInputs = document.querySelectorAll('.site-input');
        const patterns = Array.from(siteInputs)
            .map(input => input.value.trim())
            .filter(value => value !== '');
        
        // Get deck options
        let decks = {};
        let deckCheckboxes = document.querySelectorAll("input[data-deck]");
        for (let checkbox of [...deckCheckboxes]) {
            decks[checkbox.dataset.deck] = checkbox.checked;
        }
        
        // Get cards per page
        const cardsPerPage = parseInt(cardsCount.value) || 5;
        
        // Save to Chrome storage
        chrome.storage.sync.set({
            patterns: patterns,
            decks: decks,
            cardsPerPage: cardsPerPage
        });
    }

    // Query AnkiConnect for decks
    fetch('http://127.0.0.1:8765', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            action: 'deckNames',
            version: 6,
        })
    }).then((response) => {
        for (let el of [...document.querySelectorAll(".loading")]) {
            el.style.display = "none";
        }
        return response.json();
    }, () => {
        // Timed out
        document.getElementById("no-connection").style.display = "block";
        for (let el of [...document.querySelectorAll(".loading")]) {
            el.style.display = "none";
        }
        
        // Load saved settings
        loadSettings();
    }).then((response) => {
        console.log(response);
        let decks = response["result"];
        for (let deck of decks) {
            addDeckCheckbox(deck, false);
        }
        
        // Load saved settings
        loadSettings();
    });
});