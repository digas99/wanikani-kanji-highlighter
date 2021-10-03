'use strict';

(() => {
	let totalHighlightedKanji = 0;
	let learnedHighlightedKanji = [];
	let notLearnedHighlightedKanji = [];
	let highlightingClass = "";
	let notLearnedHighlightingClass = "";

	let loaded = false;

	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		if (!loaded) {
			loaded = true;
			
			// youtube temporary fix
			window.addEventListener('yt-page-data-updated', () => {
				if (totalHighlightedKanji > 0) {
					console.log("reload");
					window.location.reload();
				}
			});

			const functionDelay = request.functionDelay;
			const values = request.values;
			const notLearnedYet = request.notLearnedYet;
			const unwantedTags = request.unwantedTags;
			highlightingClass = request.highlightingClass
			notLearnedHighlightingClass = request.notLearnedHighlightingClass;
	
			if (functionDelay && values && unwantedTags && highlightingClass && notLearnedYet) {
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
	
				const tagFilteringConditions = (tag, highlightClass) => !unwantedTags.includes(tag.localName) && textChildNodes(tag).length > 0 && !(hasDirectChildHighlighted(tag, highlightClass) || tag.classList.contains(highlightClass)) && !(tag.closest(".wkhighlighter_detailsPopup") && !tag.closest(".wkhighlighter_detailsPopup_sentencesWrapper"));
	
				const highlighter = (values, className, allTags) => {
					const kanjiRegex = new RegExp(`[${values.join('')}]`, "g");
					// check if there is any character to be highlighted
					const nodesToBeHighlighted = allTags.filter(tag => {
						const test = tag.textContent.match(kanjiRegex);
						return test !== null ? test.length > 0 : false;
					});
	
					let highlightedKanji = [];
					if (nodesToBeHighlighted.length > 0) {
						const span = document.createElement("span");
						span.classList.add(className, "clickable", "wkhighlighter_hoverable");
						nodesToBeHighlighted.filter(tag => tagFilteringConditions(tag, className)).forEach(node => highlightedKanji = highlightedKanji.concat(replaceMatchesWithElem(node, kanjiRegex, span)));
					}
					return highlightedKanji;
				}

				const addStylesToIFrame = iframe => {
					if (iframe.contentDocument.styleSheets[0]) {
						const learnedColor = getComputedStyle(document.documentElement).getPropertyValue('--highlight-default-color');
						const notLearnedColor = getComputedStyle(document.documentElement).getPropertyValue('--notLearned-color');
						iframe.contentDocument.styleSheets[0].insertRule(`.wkhighlighter_highlighted {background-color: ${learnedColor} !important;}`, iframe.contentDocument.styleSheets[0].cssRules.length);
						iframe.contentDocument.styleSheets[0].insertRule(`.wkhighlighter_highlightedNotLearned {background-color: ${notLearnedColor} !important;}`, iframe.contentDocument.styleSheets[0].cssRules.length);
						iframe.contentDocument.styleSheets[0].insertRule(`.wkhighlighter_highlighted_underlined {border-bottom: 3px solid ${learnedColor} !important;}`, iframe.contentDocument.styleSheets[0].cssRules.length);
						iframe.contentDocument.styleSheets[0].insertRule(`.wkhighlighter_highlighted_bold {color: ${learnedColor} !important;}`, iframe.contentDocument.styleSheets[0].cssRules.length);
						iframe.contentDocument.styleSheets[0].insertRule(`.wkhighlighter_highlightedNotLearned_underlined {{border-bottom: 3px solid ${notLearnedColor} !important;}`, iframe.contentDocument.styleSheets[0].cssRules.length);
						iframe.contentDocument.styleSheets[0].insertRule(`.wkhighlighter_highlightedNotLearned_bold {color: ${notLearnedColor} !important;}`, iframe.contentDocument.styleSheets[0].cssRules.length);
					}
				}
				
				const highlightSetup = (tags, highlightDelay) => {
					setTimeout(() => {
						learnedHighlightedKanji = [... new Set(learnedHighlightedKanji.concat(highlighter(values, highlightingClass, tags)))];
						notLearnedHighlightedKanji = [... new Set(notLearnedHighlightedKanji.concat(highlighter(notLearnedYet, notLearnedHighlightingClass, tags)))];
						totalHighlightedKanji = learnedHighlightedKanji.length + notLearnedHighlightedKanji.length;
						chrome.runtime.sendMessage({badge:totalHighlightedKanji, nmrKanjiHighlighted:totalHighlightedKanji, kanjiHighlighted:{learned:learnedHighlightedKanji, notLearned:notLearnedHighlightedKanji}});
						chrome.storage.local.set({"wkhighlight_nmrHighLightedKanji":totalHighlightedKanji, "wkhighlight_allHighLightedKanji":{learned:learnedHighlightedKanji, notLearned:notLearnedHighlightedKanji}});
					}, highlightDelay);
				}
	
				let allTags = Array.from(document.getElementsByTagName("*"));
				// include iframes in the highlight
				const iframes = document.getElementsByTagName("IFRAME");
				if (iframes) {
					Array.from(iframes).forEach(iframe => {
						try {
							// only add css rules if they aren't there yet
							if (iframe.contentDocument && !Array.from(iframe.contentDocument?.styleSheets[0].rules).map(rule => rule.selectorText).includes(".wkhighlighter_highlighted"))
								addStylesToIFrame(iframe);
							allTags = allTags.concat(Array.from(iframe.contentWindow.document.getElementsByTagName("*")));
						}
						catch (e) {
						}
					});
				}

				highlightSetup(allTags, functionDelay);
	
				let lastNmrElements = 0;
				let nmrElements;
				// continuously check for the number of elements in the page
				// if that number updates, then run highlighter again
				const highlightUpdate = setInterval(() => {
					let allTags = Array.from(document.getElementsByTagName("*"));
					// include iframes in the highlight
					const iframes = document.getElementsByTagName("IFRAME");
					if (iframes) {
						Array.from(iframes).forEach(iframe => {
							try {
								// only add css rules if they aren't there yet
								if (iframe.contentDocument && !Array.from(iframe.contentDocument?.styleSheets[0].rules).map(rule => rule.selectorText).includes(".wkhighlighter_highlighted"))
									addStylesToIFrame(iframe);
								allTags = allTags.concat(Array.from(iframe.contentWindow.document.getElementsByTagName("*")));
							}
							catch (e) {
							}
						});
					}
					nmrElements = allTags.length;
					if (nmrElements !== lastNmrElements) {
						lastNmrElements = nmrElements;
						highlightSetup(allTags, 20);
					}
				}, 2000);
	
				chrome.runtime.sendMessage({intervalFunction: highlightUpdate});
			}
		}
	
		// if a key was pressed, then stop the highlight update
		if (request.key === "down")
			clearInterval(request.intervalFunction);

		// if extension pooup is asking for number of highlighted kanji
		if (request.nmrKanjiHighlighted === "popup")
			sendResponse({nmrKanjiHighlighted: totalHighlightedKanji, learned:learnedHighlightedKanji, notLearned:notLearnedHighlightedKanji});

		// change highlight class immediately of every kanji in the page
		if (request.newHighlightClass) {
			const highlightClass = request.target == "learned" ? highlightingClass : notLearnedHighlightingClass;
			Array.from(document.getElementsByClassName(highlightClass)).forEach(elem => elem.classList.replace(highlightClass, request.newHighlightClass));
			if (request.target == "learned")
				highlightingClass = request.newHighlightClass;
			else
				notLearnedHighlightingClass = request.newHighlightClass;
		}

		// // message to the background saying a key was pressed
		// document.addEventListener("keydown", e => {
		// 	// if the key is not a modifier
		// 	if (!e.getModifierState(e.key))
		// 		chrome.runtime.sendMessage({key: "down"});
		// });

		document.addEventListener("click", e => {
			chrome.runtime.sendMessage({selectedText: window.getSelection().toString().trim()});
		});
	});
})();