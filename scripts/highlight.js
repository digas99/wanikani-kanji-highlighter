'use strict';

(() => {
	// console.log("here");
	let totalHighlightedKanji = 0;
	let allHighlightedKanji = [];
	let loaded = false;
	let highlightingClass = "";
	let thisPageUrl = "";
	let currentUrl = "";

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
					let allMatches = [];
					for (const node of textChildNodes(parentNode)) {
						const fragment = document.createDocumentFragment();
						const matches = node.textContent.match(regex);
						if (matches) {
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
							allMatches = allMatches.concat(matches);
						}
					}
					return allMatches;
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

					let highlightedKanji = [];
					if (nodesToBeHighlighted.length > 0) {
						const span = document.createElement("span");
						span.classList.add(className, "clickable");
						nodesToBeHighlighted.filter(tag => tagFilteringConditions(tag)).forEach(node => highlightedKanji = highlightedKanji.concat(replaceMatchesWithElem(node, kanjiRegex, span)));
					}

					return highlightedKanji;
				}
				
				setTimeout(() => {
					allHighlightedKanji = [... new Set(allHighlightedKanji.concat(highlighter(values, highlightingClass, Array.from(document.getElementsByTagName("*")))))];
					totalHighlightedKanji = allHighlightedKanji.length;
					chrome.runtime.sendMessage({badge:totalHighlightedKanji, nmrKanjiHighlighted:totalHighlightedKanji, kanjiHighlighted:allHighlightedKanji});
					chrome.storage.local.get(["wkhighlight_kanjiPerSite"], result => {
						const kanjiPerSite = result["wkhighlight_kanjiPerSite"] ? result["wkhighlight_kanjiPerSite"] : {};
						const site = window.location.href;
						if (kanjiPerSite) {
							kanjiPerSite[site] = {"number":totalHighlightedKanji,"kanji":allHighlightedKanji};
						}
						chrome.storage.local.set({"wkhighlight_kanjiPerSite":kanjiPerSite});
					});
					chrome.storage.local.set({"wkhighlight_nmrHighLightedKanji":totalHighlightedKanji, "wkhighlight_allHighLightedKanji":allHighlightedKanji});
				} ,functionDelay);

				let lastNmrElements = 0;
				let nmrElements;
				// continuously check for the number of elements in the page
				// if that number updates, then run highlighter again
				const highlightUpdate = setInterval(() => {
					// make sure that the script only runs for its url (pages like facebook keep the script running
					// even when on other urls of facebook, which causes more than one instance of the script to be
					// running at the same time, scripts injected in different pages)
					if (currentUrl == thisPageUrl) {
						const allTags = Array.from(document.getElementsByTagName("*"));
						nmrElements = allTags.length;
						if (nmrElements !== lastNmrElements) {
							lastNmrElements = nmrElements;
							setTimeout(() => {
							allHighlightedKanji = [...new Set(allHighlightedKanji.concat(highlighter(values, highlightingClass, allTags)))];
							totalHighlightedKanji = allHighlightedKanji.length;
							chrome.runtime.sendMessage({badge:totalHighlightedKanji, nmrKanjiHighlighted:totalHighlightedKanji, kanjiHighlighted:allHighlightedKanji});
							chrome.storage.local.get(["wkhighlight_kanjiPerSite"], result => {
								const kanjiPerSite = result["wkhighlight_kanjiPerSite"] ? result["wkhighlight_kanjiPerSite"] : {};
								const site = window.location.href;
								if (kanjiPerSite) {
									kanjiPerSite[site] = {"number":totalHighlightedKanji,"kanji":allHighlightedKanji};
								}
								chrome.storage.local.set({"wkhighlight_kanjiPerSite":kanjiPerSite});
							});
							chrome.storage.local.set({"wkhighlight_nmrHighLightedKanji":totalHighlightedKanji, "wkhighlight_allHighLightedKanji":allHighlightedKanji});
							} ,20);
						}
					}
				}, 2000);

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

		// check for the user's current url
		if (request.pageUrl) {
			if (thisPageUrl == "")
				thisPageUrl = request.pageUrl;
			currentUrl = request.pageUrl;
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

})();