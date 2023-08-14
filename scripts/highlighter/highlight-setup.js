(() => {
	let totalHighlighted = 0;
	let contentHighlighted = {};
	let atWanikani = false;
	let blacklistedSite = false;
	let url = window.location.href;

	chrome.storage.local.get(["highlight_setup", "blacklist"], result => {
		atWanikani = /(http(s)?:\/\/)?www.wanikani\.com.*/g.test(url);
		blacklistedSite = blacklisted(result["blacklist"], url);
		
		if (!atWanikani && !blacklistedSite) {
			chrome.runtime.sendMessage({uptimeHighlight:true});

			result = result["highlight_setup"];

			const otherClasses = ["wkhighlighter_clickable", "wkhighlighter_hoverable"];
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
						chrome.storage.local.set({"nmrHighLightedKanji":totalHighlighted, "allHighLightedKanji":contentHighlighted});
					}, delay);

					// only delay the first time
					if (delay !== 0) delay = 0;
				}

				// make a delay for the next highlight iterations
				if (interval === 0) interval = 2000;

			}, interval);
		
			chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
				// if extension pooup is asking for number of highlighted kanji
				if (request.nmrKanjiHighlighted === "popup") {
					sendResponse({...{nmrKanjiHighlighted: totalHighlighted}, ...contentHighlighted});
					return true;
				}

				// change highlight class immediately of every kanji in the page
				if (request.newHighlightClass) {
					const highlightClass = request.target == "learned" ? learned.highlightClass : notLearned.highlightClass;
					Array.from(document.getElementsByClassName(highlightClass)).forEach(elem => elem.classList.replace(highlightClass, request.newHighlightClass));
					if (request.target == "learned")
						learned.highlightClass = request.newHighlightClass;
					else
						notLearned.highlightClass = request.newHighlightClass;
				}

				if (request.uptime === "Highlighter") {
					sendResponse({uptime:true});
					return true;
				}
			});

			const addStylesToFrame = (iframe, highlightVar, className) => {
				if (iframe.contentDocument.styleSheets[0]) {
					const color = getComputedStyle(document.documentElement).getPropertyValue(highlightVar);
					iframe.contentDocument.styleSheets[0].insertRule(`.${className} {background-color: ${color} !important;}`, iframe.contentDocument.styleSheets[0].cssRules.length);
					iframe.contentDocument.styleSheets[0].insertRule(`.${className}_underlined {border-bottom: 3px solid ${color} !important;}`, iframe.contentDocument.styleSheets[0].cssRules.length);
					iframe.contentDocument.styleSheets[0].insertRule(`.${className}_bold {color: ${color} !important;}`, iframe.contentDocument.styleSheets[0].cssRules.length);
				}
			}
		
			clearHighlight = () => {
				console.log("clearing highlight");
				const highlighted = document.querySelectorAll(".wkhighlighter_clickable");
				if (highlighted) {
					Array.from(highlighted).forEach(elem => {
						if (elem && elem.parentElement) {
							Array.from(elem.parentElement.childNodes).forEach(child => child.remove());
						}
					});
				}
			}
	
	
			// youtube temporary fix
			/*window.addEventListener('yt-page-data-updated', () => {
				if (totalHighlighted > 0)
					window.location.reload();
			});*/
	
			// soomther youtube temporary fix
			// Select the video element
			const videoElement = document.querySelector('#movie_player video');
	
			// Create a new MutationObserver
			const observer = new MutationObserver(function(mutationsList) {
				for (const mutation of mutationsList) {
				console.log(mutation);
					if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
						// if in between videos, reload page
						if (mutation.target.src == "" && totalHighlighted > 0) {
						window.location.reload();	
						}
					}
				}
			});
	
			// Configure the observer to watch for changes to the 'src' attribute
			const config = { attributes: true, attributeFilter: ['src'] };
	
			// Start observing the video element
			observer.observe(videoElement, config);
		}
		else {
			chrome.runtime.sendMessage({uptimeHighlight:false});
		}
	});
})();