chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	const functionDelay = request.functionDelay;
	const values = request.values;
	const unwantedTags = request.unwantedTags;
	const highlightingClass = request.highlightingClass

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
				// node.parentElement.replaceChild(fragment, node);
				// solution: keep the child there, with empty data
				node.data = '';
				// insert new child after the old child
				node.after(fragment);
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

		const highlighter = (delay, values, className, allTags) => {
			setTimeout(() => {
				const kanjiRegex = new RegExp(`[${values.join('')}]`, "g");
				// check if there is any character to be highlighted
				const nodesToBeHighlighted = allTags.filter(tag => {
					const test = tag.textContent.match(kanjiRegex);
					return test !== null ? test.length > 0 : false;
				});
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
			const allTags = Array.from(document.getElementsByTagName("*"));
			nmrElements = allTags.length;
			if (nmrElements !== lastNmrElements) {
				lastNmrElements = nmrElements;
				highlighter(20, values, highlightingClass, allTags);
			}
		}, 3000);

		chrome.runtime.sendMessage({intervalFunction: highlightUpdate});
	}

	// if a key was pressed, then stop the highlight update
	if (request.key === "down")
		clearInterval(request.intervalFunction);
});

// message to the background saying a key was pressed
document.addEventListener("keydown", e => {
	// if the key is not a modifier
	if (!e.getModifierState(e.key))
		chrome.runtime.sendMessage({key: "down"});
});