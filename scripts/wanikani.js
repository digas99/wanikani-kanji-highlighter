(() => {
	chrome.storage.local.get(["wkhighlight_allkanji", "wkhighlight_allradicals", "wkhighlight_allvocab", "wkhighlight_kanji_assoc", "wkhighlight_vocab_assoc"], result => {
		chrome.runtime.sendMessage({uptimeWanikani:true});

		const atWanikani = /(http(s)?:\/\/)?www.wanikani\.com.*/g.test(window.location.origin);
		
		const allKanji = result["wkhighlight_allkanji"];
		const allRadicals = result["wkhighlight_allradicals"];
		const allVocab = result["wkhighlight_allvocab"];
		const kanjiAssoc = result["wkhighlight_kanji_assoc"];
		const vocabAssoc = result["wkhighlight_vocab_assoc"]

		const wrapper = document.getElementById("question");
		
		const getSrsStage = (characterWrapper) => {
			const type = characterWrapper.classList[0];
			if (characterWrapper && type) {
				const character = characterWrapper.innerText;
				let stage;
				switch(type) {
					case "kanji":
						stage = allKanji[kanjiAssoc[character]]["srs_stage"];
						break;
					case "vocabulary":
						stage = allVocab[vocabAssoc[character]]["srs_stage"];
						break;
					default: return null;
				}
				return stage;
			}
			return null;
		}

		const srsTitle = title => {
			const p = document.createElement("p");
			p.appendChild(document.createTextNode(title));
			p.classList.add("wanikani-srs-stage")
			return p;
		}

		if (atWanikani && allKanji && allRadicals && allVocab && kanjiAssoc && vocabAssoc && wrapper) {
			const characterWrapper = document.getElementById("character");
			//wrapper.appendChild(srsTitle(srsStages[getSrsStage(characterWrapper)]["name"]));

			// mutation observer to detect new subject in reviews
			new MutationObserver((mutationsList, observer) => {
				Array.from(document.getElementsByClassName("wanikani-srs-stage"))
					.forEach(srsTitle => srsTitle.remove());
				wrapper.appendChild(srsTitle(srsStages[getSrsStage(characterWrapper)]["name"]));
			}).observe(characterWrapper, {
				childList: true,
				subtree: true});	
		}

		const style = document.createElement('style');
		style.type = 'text/css';
		style.innerHTML = ".wanikani-srs-stage { \
							position: absolute; \
							top: 0; \
							left: 0; \
							right: 0; \
							color: white; \
							font-size: 30px; \
							}";
		document.getElementsByTagName('head')[0].appendChild(style);
	});
})();