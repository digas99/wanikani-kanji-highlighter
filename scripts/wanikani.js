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
		
		const getSrsStage = (id, type) => {
			if (id && type) {
				let stage;
				switch(type) {
					case "kanji":
						stage = allKanji[id]["srs_stage"];
						break;
					case "vocabulary":
						stage = allVocab[id]["srs_stage"];
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
			let id, type, character, list, passed;

			// mutation observer to detect new subject in reviews
			new MutationObserver((mutationsList, observer) => {
				Array.from(document.getElementsByClassName("wanikani-srs-stage"))
					.forEach(srsTitle => srsTitle.remove());
				
				type = characterWrapper.classList[0];
				if (type !== "Radical") {
					character = characterWrapper.innerText;
					id = type == "kanji" ? kanjiAssoc[character] : vocabAssoc[character];
	
					// srs title
					const srsTitleElem = srsTitle(srsStages[getSrsStage(id, type)]["name"]);
					wrapper.appendChild(srsTitleElem);
	
					// passed
					list = type == "kanji" ? allKanji[id] : allVocab[id];
					passed = list["timestamps"]["passed_at"];
					if (passed && srsTitleElem) {
						const img = document.createElement("img");
						srsTitleElem.appendChild(img);
						img.src = "https://i.imgur.com/a0lyk8f.png";
						img.classList.add("wanikani-passed");
						const days = msToDays(new Date() - new Date(passed.split("T")[0])).toFixed(0);
						let timePassed;
						if (days === '0') timePassed = "Today";
						else if (days === '1') timePassed = "Yesterday";
						else if (parseInt(days) < 0) timePassed = "In "+(parseInt(days)*-1)+((parseInt(days)*-1) === 1 ? " day" : " days");
						else timePassed = days+" days ago";
						srsTitleElem.title = "Passed "+timePassed;
					}
				}

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
							} \
							.wanikani-passed { \
								position: absolute; \
								top: 0; \
								bottom: 0; \
								width: 17px; \
								filter: invert(1); \
								margin: auto; \
								margin-left: 9px; \
							}";
		document.getElementsByTagName('head')[0].appendChild(style);
	});
})();