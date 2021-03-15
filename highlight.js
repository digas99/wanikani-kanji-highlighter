chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	const functionDelay = request.functionDelay;
	const values = request.values;
	const unwantedTags = request.unwantedTags;
	const highlightingClass = request.highlightingClass;

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
				node.parentElement.replaceChild(fragment, node);
			}
		}

		const hasDirectChildHighlighted = (node, className) => {
			for (const child of node.childNodes) {
				if (child.classList && Array.from(child.classList).includes(className))
					return true;
			}
			return false;
		}

		const tagFilteringConditions = tag => !unwantedTags.includes(tag.localName) && textChildNodes(tag).length > 0 && !(hasDirectChildHighlighted(tag, highlightingClass) || Array.from(tag.classList).includes(highlightingClass));

		const highlighter = (delay, values, className, allWantedTags) => {
			setTimeout(() => {
				const kanjiRegex = new RegExp(`[${values.join('')}]`, "g");
				// check if there is any character to be highlighted
				const nodesToBeHighlighted = allWantedTags.filter(tag => kanjiRegex.test(tag.textContent));
				if (nodesToBeHighlighted.length > 0) {
					const span = document.createElement("span");
					span.className = className;
					nodesToBeHighlighted.filter(tag => tagFilteringConditions(tag)).forEach(node => replaceMatchesWithElem(node, kanjiRegex, span));
				}
			},delay);
		}

		highlighter(functionDelay, values, highlightingClass, Array.from(document.getElementsByTagName("*")));

		let lastNmrElements = 0;
		let nmrElements;
		// continuously check for the number of elements in the page
		// if that number updates, then run highlighter again
		const highlightUpdate = setInterval(() => {
			const allWantedTags = Array.from(document.getElementsByTagName("*"));
			nmrElements = allWantedTags.length;
			if (nmrElements !== lastNmrElements) {
				lastNmrElements = nmrElements;
				highlighter(20, values, highlightingClass, allWantedTags);
			}
		}, 3000);

		chrome.runtime.sendMessage({intervalFunction: highlightUpdate});
	}

	// if a key was pressed, then stop the highlight update
	if (request.key === "down") {
		console.log("Key pressed. Highlight update stopped! Waiting for next page update to start again...");
		clearInterval(request.intervalFunction);
	}
});

// message to the background saying a key was pressed
document.addEventListener("keydown", e => {
	// if the key is not a modifier
	if (!e.getModifierState(e.key))
		chrome.runtime.sendMessage({key: "down"});
});

document.addEventListener("mouseover", e => {
	const createPopup = () => {
		const div = document.createElement("div");
		div.className = "wkhighlighter_rightOverFlowPopup wkhighlighter_detailsPopup";
		document.body.appendChild(div);
		setTimeout(() => document.getElementsByClassName("wkhighlighter_detailsPopup")[0].classList.remove("wkhighlighter_rightOverFlowPopup"), 20);
	}
	
	const node = e.target;

	if (node.classList.contains("wkhighlighter_highlighted")) {
		if (document.getElementsByClassName("wkhighlighter_detailsPopup").length < 1) {
			createPopup();
		}
	}

	if (node.classList.contains("wkhighlighter_detailsPopup")) {
		node.classList.add("wkhighlighter_focusPopup");
	}
});

document.addEventListener("mouseout", e => {
	const node = e.target;

	if (node.classList.contains("wkhighlighter_detailsPopup")) {
		node.classList.remove("wkhighlighter_focusPopup");
	}
});

document.addEventListener("click", e => {
	const node = e.target;
	
	if (document.getElementsByClassName("wkhighlighter_detailsPopup").length > 0 && !node.classList.contains("wkhighlighter_detailsPopup")) {
		const popup = document.getElementsByClassName("wkhighlighter_detailsPopup")[0];
		popup.classList.add("wkhighlighter_rightOverFlowPopup");
		setTimeout(() => document.body.removeChild(popup), 200);
	}
});