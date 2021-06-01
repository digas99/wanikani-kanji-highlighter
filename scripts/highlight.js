totalHighlightedKanji = 0;
loaded = false;
highlightingClass = "";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (!loaded) {
		loaded = true;

		const functionDelay = request.functionDelay;
		const values = request.values;
		const unwantedTags = request.unwantedTags;
		highlightingClass = request.highlightingClass

		if (functionDelay && values && unwantedTags && highlightingClass) {	
			const textChildNodes = obj => Array.from(obj.childNodes)
				.filter(node => node.nodeName === "#text");

			// replace a matching regex in a text node with a document element, preserving everything else, even other 
			// none text node siblings from that text node (the parent node must have atleast one text node as a childNode)
			const replaceMatchesWithElem = (parentNode, regex, elem) => {
				for (const node of textChildNodes(parentNode)) {
					const fragment = document.createDocumentFragment();
					const matches = node.textContent.match(regex);
					const split = node.textContent.split(regex);
					split.forEach((content, i) => {
						fragment.appendChild(document.createTextNode(content));
						if (i !== split.length-1) {
							const clone = elem.cloneNode(true);
							clone.appendChild(document.createTextNode(matches[i]));
							fragment.appendChild(clone);
						}
					});
					// can't do the replaceChild because it will throw an error 
					// when React tries to access the old child that was replaced
					node.parentElement.replaceChild(fragment, node);
					// solution: keep the child there, with empty data
					//node.data = '';
					// insert new child after the old child
					//node.after(fragment);
					return !matches ? 0 : matches.length;
				}
			}

			const hasDirectChildHighlighted = (node, className) => {
				for (const child of node.childNodes) {
					if (child.classList && Array.from(child.classList).includes(className))
						return true;
				}
				return false;
			}

			const tagFilteringConditions = tag => !unwantedTags.includes(tag.localName) && textChildNodes(tag).length > 0 && !(hasDirectChildHighlighted(tag, highlightingClass) || tag.classList.contains(highlightingClass));

			const highlighter = (values, className, allTags) => {
				const kanjiRegex = new RegExp(`[${values.join('')}]`, "g");
				// check if there is any character to be highlighted
				const nodesToBeHighlighted = allTags.filter(tag => {
					const test = tag.textContent.match(kanjiRegex);
					//console.log(kanjiRegex);
					return test !== null ? test.length > 0 : false;
				});

				let nmrHighlightedKanji = 0;
				if (nodesToBeHighlighted.length > 0) {
					const span = document.createElement("span");
					span.classList.add(className, "clickable");
					span.style.setProperty("cursor", "pointer", "important");
					nodesToBeHighlighted.filter(tag => tagFilteringConditions(tag)).forEach(node => nmrHighlightedKanji += replaceMatchesWithElem(node, kanjiRegex, span));
				}
				return nmrHighlightedKanji;
			}
			
			setTimeout(() => {
				totalHighlightedKanji += highlighter(values, highlightingClass, Array.from(document.getElementsByTagName("*")));
				chrome.runtime.sendMessage({badge:totalHighlightedKanji, nmrKanjiHighlighted:totalHighlightedKanji});
				chrome.storage.local.set({"wkhighlight_nmrHighLightedKanji":totalHighlightedKanji});
			} ,functionDelay);

			let lastNmrElements = 0;
			let nmrElements;
			// continuously check for the number of elements in the page
			// if that number updates, then run highlighter again
			const highlightUpdate = setInterval(() => {
				const allTags = Array.from(document.getElementsByTagName("*"));
				nmrElements = allTags.length;
				if (nmrElements !== lastNmrElements) {
					lastNmrElements = nmrElements;
					setTimeout(() => {
					totalHighlightedKanji += highlighter(values, highlightingClass, allTags);	
					chrome.runtime.sendMessage({badge:totalHighlightedKanji, nmrKanjiHighlighted:totalHighlightedKanji});
					chrome.storage.local.set({"wkhighlight_nmrHighLightedKanji":totalHighlightedKanji});
					} ,20);
				}
			}, 3000);

			chrome.runtime.sendMessage({intervalFunction: highlightUpdate});
		}
	}

	// if a key was pressed, then stop the highlight update
	if (request.key === "down")
		clearInterval(request.intervalFunction);

	// if extension pooup is asking for number of highlighted kanji
	if (request.nmrKanjiHighlighted === "popup") {
		sendResponse({nmrKanjiHighlighted: totalHighlightedKanji});
	}

});

// message to the background saying a key was pressed
document.addEventListener("keydown", e => {
	// if the key is not a modifier
	if (!e.getModifierState(e.key))
		chrome.runtime.sendMessage({key: "down"});
});

document.addEventListener("click", e => {
	chrome.runtime.sendMessage({selectedText: window.getSelection().toString().trim()});
});