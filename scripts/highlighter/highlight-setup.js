(() => {
	let totalHighlighted = 0;
	let contentHighlighted = {};

	chrome.storage.local.get("wkhighlight_highlight_setup", result => {
		result = result["wkhighlight_highlight_setup"];

		chrome.runtime.sendMessage({uptime:"Highlighter"});

		// youtube temporary fix
		window.addEventListener('yt-page-data-updated', () => {
			console.log(totalHighlighted);
			if (totalHighlighted > 0)
				window.location.reload();
		});

		const otherClasses = ["clickable", "wkhighlighter_hoverable"];
		const tagFilter = tag => !(tag.closest(".sd-detailsPopup") && !tag.closest(".sd-detailsPopup_sentencesWrapper") && !tag.closest(".sd-popupDetails_p"));

		const learned = new Highlight(result.learned, result.learnedClass, otherClasses, result.unwantedTags, tagFilter);
		const notLearned = new Highlight(result.notLearned, result.notLearnedClass, otherClasses, result.unwantedTags, tagFilter);

		let delay = result.functionDelay;
		let interval = 0;
		let nElemsLast = 0;

		setInterval(() => {
			let allTags = document.getElementsByTagName("*");
			// include iframes in the highlight
			const iframes = document.getElementsByTagName("IFRAME");
			if (iframes) {
				Array.from(iframes).forEach(iframe => {
					try {
						// only add css rules if they aren't there yet
						if (iframe.contentDocument && !Array.from(iframe.contentDocument?.styleSheets[0].rules).map(rule => rule.selectorText).includes(".wkhighlighter_highlighted")) {
							addStylesToFrame(iframe, "--highlight-default-color", "wkhighlighter_highlighted");
							addStylesToFrame(iframe, "--notLearned-color", "wkhighlighter_highlightedNotLearned");
						}
						allTags = allTags.concat(Array.from(iframe.contentWindow.document.getElementsByTagName("*")));
					}
					catch (e) {
					}
				});
			}

			// only highlight when there is a change in the number of tags
			if (allTags.length !== nElemsLast) {
				nElemsLast = allTags.length;

				setTimeout(() => {
					learned.highlighter(allTags);
					notLearned.highlighter(allTags);

					totalHighlighted = learned.size() + notLearned.size();
					contentHighlighted = {learned:learned.highlightedSet(), notLearned:notLearned.highlightedSet()};

					chrome.runtime.sendMessage({badge:totalHighlighted, nmrKanjiHighlighted:totalHighlighted, kanjiHighlighted:contentHighlighted});
					chrome.storage.local.set({"wkhighlight_nmrHighLightedKanji":totalHighlighted, "wkhighlight_allHighLightedKanji":contentHighlighted});
				}, delay);

				// only delay the first time
				if (delay !== 0) delay = 0;
			}

			// make a delay for the next highlight iterations
			if (interval === 0) interval = 2000;

		}, interval);
	
		chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
			// if extension pooup is asking for number of highlighted kanji
			if (request.nmrKanjiHighlighted === "popup")
				sendResponse({...{nmrKanjiHighlighted: totalHighlighted}, ...contentHighlighted});

			// change highlight class immediately of every kanji in the page
			if (request.newHighlightClass) {
				const highlightClass = request.target == "learned" ? learned.highlightClass : notLearned.highlightClass;
				Array.from(document.getElementsByClassName(highlightClass)).forEach(elem => elem.classList.replace(highlightClass, request.newHighlightClass));
				if (request.target == "learned")
					learned.highlightClass = request.newHighlightClass;
				else
					notLearned.highlightClass = request.newHighlightClass;
			}

			if (request.uptime === "Highlighter")
				sendResponse({uptime:true});

		});

		const addStylesToFrame = (iframe, highlightVar, className) => {
			if (iframe.contentDocument.styleSheets[0]) {
				const color = getComputedStyle(document.documentElement).getPropertyValue(highlightVar);
				iframe.contentDocument.styleSheets[0].insertRule(`.${className} {background-color: ${color} !important;}`, iframe.contentDocument.styleSheets[0].cssRules.length);
				iframe.contentDocument.styleSheets[0].insertRule(`.${className}_underlined {border-bottom: 3px solid ${color} !important;}`, iframe.contentDocument.styleSheets[0].cssRules.length);
				iframe.contentDocument.styleSheets[0].insertRule(`.${className}_bold {color: ${color} !important;}`, iframe.contentDocument.styleSheets[0].cssRules.length);
			}
		}
	});
})();