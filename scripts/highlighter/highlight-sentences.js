'use strict';

(() => {
	const unwantedTags = ["html", "body", "head", "title", "style", "link", "meta", "script", "noscript", "img", "svg"];

	const vocabularyParser = (data, sentence) => {
		// add a terminator character, 'e' for example
		sentence+='e';
		let finalVocabList = [];
		let tempWordUpdated = "", tempWord = "";
		for (let i = 0; i < sentence.length; i++) {
			if (tempWord == "")
				tempWord = sentence[i];
			else {
				tempWordUpdated = tempWord + sentence[i];
				if (data.includes(tempWordUpdated))
					tempWord = tempWordUpdated;
				else {
					if (data.includes(tempWord))
						finalVocabList.push(tempWord);
					tempWord = tempWordUpdated[tempWordUpdated.length-1];
					tempWordUpdated = "";
				}
			}
		}
		return finalVocabList;
	}

	chrome.storage.local.get(["vocabulary", "learnable_kanji"], result => {
		let allVocab = result["vocabulary"];
		const values = result["learnable_kanji"];
		if (allVocab && values) {
			allVocab = Object.keys(allVocab).map(key => allVocab[key]["characters"]);

			const kanjiRegex = new RegExp(`[${values.join('')}]`, "g");;

			const nodesToBeHighlighted = Array.from(document.getElementsByTagName("*"))
				.filter(tag => {
					const test = tag.textContent.match(kanjiRegex);
					return test !== null ? test.length > 0 : false;
				});
			
			const textChildNodes = obj => Array.from(obj.childNodes)
				.filter(node => node.nodeName === "#text");

			const tagFilteringConditions = tag => !unwantedTags.includes(tag.localName) && textChildNodes(tag).length > 0;

			if (nodesToBeHighlighted.length > 0) {
				nodesToBeHighlighted.filter(tag => tagFilteringConditions(tag))
					.forEach(parentNode => {
						for (const node of textChildNodes(parentNode)) {
							const text = node.textContent;
							const fragmet = document.createDocumentFragment();
							if (text.match(kanjiRegex)) {
								vocabularyParser(allVocab, text).forEach(vocab => {
									const split = text.split(vocab);
									const div1 = document.createElement("span");
									div1.innerHTML = split[0];
									const div2 = document.createElement("span");
									div2.innerHTML = split[1];
									const span = document.createElement("span");
									span.classList.add("wkhighlighter_highlighted", "wkhighlighter_clickable");
									span.appendChild(document.createTextNode(vocab));
									fragmet.appendChild(div1);
									fragmet.appendChild(span);
									fragmet.appendChild(div2);
								});
								node.parentElement.replaceChild(fragmet, node);
							}
						}
					});
			}
		}
	});
})();