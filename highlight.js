chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.functionDelay && request.values && request.unwantedTags && request.highlightingClass) {
		const textChildNodes = obj => Array.from(obj.childNodes)
			.filter(node => node.nodeName === "#text");

		// replace a matching regex in a text node with a document element, preserving everything else, even other 
		// none text node siblings from that text node (the parent node must have atleast one text node as a childNode)
		const replaceWithElem = (parentNode, regex, elem) => {
			for (const node of textChildNodes(parentNode)) {
				const fragment = document.createDocumentFragment();
				const split = node.textContent.split(regex);
				split.forEach((content, i) => {
					fragment.appendChild(document.createTextNode(content));
					if (i !== split.length-1)
						fragment.appendChild(elem.cloneNode(true));
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

		const highlighter = (delay, values, className, allWantedTags) => {
			setTimeout(() => {
				const kanjiRegex = new RegExp(`[${values.join('')}]`, "g");

				// check if there is any character to be highlighted
				const kanjiTargetedFilter = allWantedTags.filter(tag => kanjiRegex.test(tag.textContent));
				console.log(kanjiTargetedFilter)
				if (kanjiTargetedFilter.length > 0) {
					console.log("Found Kanji to highlight!");
					// filter all tag elements of the document that haven't yet been highlighted
					let filteredNodes = kanjiTargetedFilter
						.filter(object => !(hasDirectChildHighlighted(object, className) || Array.from(object.classList).includes(className)));
					
					for (const value of values) {
						const span = document.createElement("span");
						span.className = className;
						span.appendChild(document.createTextNode(value));
						// filter the tag elements again for those that have text content equal to the preset regex value;
						// iterate the filtered tag elements and call replaceWithElem each time
						const kanjiTargetFilter = filteredNodes
							.filter(object => new RegExp(value).test(object.textContent));
							
						if (kanjiTargetFilter.length > 0)
							kanjiTargetFilter.forEach(node => replaceWithElem(node, new RegExp(value, "g"), span));
					}
				}
				else
					console.log("Could not find any Kanji to highlight yet!");
			},delay);
		}

		highlighter(request.functionDelay, request.values, request.highlightingClass, Array.from(document.getElementsByTagName("*")).filter(tag => !request.unwantedTags.includes(tag.localName) && textChildNodes(tag).length > 0));

		let lastNmrElements = 0;
		let nmrElements;
		// continuously check for the number of elements in the page
		// if that number updates, then run highlighter again
		const highlightUpdate = setInterval(() => {
			const allWantedTags = Array.from(document.getElementsByTagName("*")).filter(tag => !request.unwantedTags.includes(tag.localName) && textChildNodes(tag).length > 0);
			nmrElements = allWantedTags.length;
			if (nmrElements !== lastNmrElements) {
				lastNmrElements = nmrElements;
				highlighter(20, request.values, request.highlightingClass, allWantedTags);
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