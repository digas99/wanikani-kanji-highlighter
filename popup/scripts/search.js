let settings, radicalsList, kanjiList, vocabularyList;

const searchBar = document.querySelector("#kanjiSearchInput");
if (searchBar) {
    searchBar.focus();

    const urlParams = new URLSearchParams(window.location.search);
    let popupLoading;
    // get search query from url
    const search = urlParams.get('search');
    if (search) {
        if (!messagePopup) {
            popupLoading = new MessagePopup(document.body);
            popupLoading.create("Loading subjects...");
            popupLoading.setLoading();
        }
        
        if (search.length == 1)
            searchBar.value = search+searchBar.value;
        else
            searchBar.value = search;            
    }

    chrome.storage.local.get(["settings"], async result => {
        settings = result["settings"];

        // select result display
        const resultsDisplay = settings["search"]["results_display"];
        if (resultsDisplay) {
            Array.from(document.getElementsByClassName("searchResultNavbarOption")).forEach(elem => elem.classList.remove("full_opacity"));
            const resultDisplayElem = document.getElementById(resultsDisplay);
            if (resultDisplayElem) resultDisplayElem.classList.add("full_opacity");
        }

        // select targeted search
        const targetedSearch = settings["search"]["targeted_search"];
        if (targetedSearch) {
            const targetedSearchElem = document.querySelector(".searchResultNavbarTarget");
            if (targetedSearchElem) targetedSearchElem.classList.add("full_opacity");
        }

        const inputWrapper = document.querySelector("#kanjiSearchInputWrapper");
        const typeWrapper = document.querySelector(".kanjiSearchTypeWrapper");
        typeWrapper.addEventListener("click", () => {
            if (typeWrapper.innerText === "A") changeInput(inputWrapper, "あ");
            else changeInput(inputWrapper, "A");

            inputWrapper.querySelector("#kanjiSearchInput").focus();
        });

        // add start search information
        const searchWrapper = document.querySelector("#searchResultItemWrapper");
        searchWrapper.appendChild(notFound("Start searching using kanji, kana, meaning or level."));

        // add search action to search bar
        const db = new Database("wanikani");
        const opened = await db.open("subjects");
        if (opened) {
            const data = await db.getAll("subjects", "subject_type", ["radical", "kanji", "vocabulary", "kana_vocabulary"]);
            
            radicalsList = data["radical"];
            kanjiList = data["kanji"];
            vocabularyList = [...data["vocabulary"], ...data["kana_vocabulary"]];

            searchBar.addEventListener("input", e => searchSubject(e.target.value, e.target, null, settings["search"]["targeted_search"], settings["search"]["results_display"]));
            
            searchBar.dispatchEvent(new Event("input")); 
            popupLoading?.remove();
        }
    });
}

const urlParams = new URLSearchParams(window.location.search);

const changeInput = (inputWrapper, type) => {
    const typeWrapper = inputWrapper.querySelector(".kanjiSearchTypeWrapper");
    const typeSpan = typeWrapper.querySelector("span");
    const input = inputWrapper.querySelector("#kanjiSearchInput");
    if (type === "A") {
        typeWrapper.id = "kanjiSearchTypeRomaji";
        typeWrapper.title = "Romaji";
        typeSpan.innerText = "A";
        input.placeholder = "きん";
    }
    else if (type == "あ") {
        typeWrapper.id = "kanjiSearchTypeKana";
        typeWrapper.title = "Kana";
        typeSpan.innerText = "あ";
        input.placeholder = "Gold / 金 / 5";
    }
    urlParams.set('type', type);
}

if (urlParams.get('type'))
    changeInput(document.querySelector("#kanjiSearchInputWrapper"), urlParams.get('type'));

const searchSubject = (value, input, searchType, targeted, display) => {
    input.value = value;
	value = value.toLowerCase().trim();
    changeInput(input.parentElement, searchType);
    
    // update url
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('search', value);
    window.history.replaceState({}, '', `${location.pathname}?${urlParams}`);

    let searchResultUL = document.getElementById("searchResultItemWrapper");
	if (searchResultUL) searchResultUL.innerHTML = "";
    Array.from(document.querySelectorAll(".loadMore")).forEach(elem => elem.remove());
    
	if (!document.getElementById("searchResultWrapper")) {
		const searchResultWrapper = document.createElement("div");
		searchResultWrapper.id = "searchResultWrapper";
		document.getElementsByClassName("searchArea")[0].appendChild(searchResultWrapper);
	}
	document.getElementById("searchResultWrapper").appendChild(searchResultUL);

	let type;
	if (searchType)
		type = searchType;
	else
		type = document.getElementById("kanjiSearchType").innerText;
	
    let filteredRadicals = [];
	let filteredKanji = [];
	let filteredVocab = [];

    if (type == "A") {
        input.value = convertToKana(input.value);
    
        // if it is hiragana
        if (hasKana(value)) {
            //const filterByReadings = (itemList, value) => itemList.filter(item => matchesReadings(value, item["readings"], targeted));
            filteredRadicals = radicalsList.filter(subject => matchesReadings(input.value, subject.readings, targeted));
            filteredKanji = kanjiList.filter(subject => matchesReadings(input.value, subject.readings, targeted));
            filteredVocab = vocabularyList.filter(subject => matchesReadings(input.value, subject.readings, targeted) || new RegExp(input.value, "g").test(subject.characters));
        }
    }
    else {
        // if it is a chinese character
        if (hasKanji(value)) {
            filteredRadicals = radicalsList.filter(subject => value == subject.characters);
            if (filteredRadicals.length > 0)
                filteredRadicals[0]["amalgamation_subject_ids"].forEach(id => filteredVocab.push(vocabularyList.filter(subject => id == subject.id)));

            filteredKanji = filteredKanji.concat(kanjiList.filter(subject => value == subject.characters));
            if (filteredKanji.length > 0 && !targeted) {
                filteredKanji[0]["visually_similar_subject_ids"].forEach(id => filteredKanji.push(kanjiList.filter(subject => id == subject.id)));
                filteredKanji[0]["amalgamation_subject_ids"].forEach(id => filteredVocab.push(vocabularyList.filter(subject => id == subject.id)));
            }

            filteredVocab = filteredVocab.concat(vocabularyList.filter(subject => value == subject.characters)).flat();
            if (filteredVocab.length > 0)
                filteredVocab[0]["component_subject_ids"].forEach(id => filteredKanji.push(kanjiList.filter(subject => id == subject.id)));
        }
        // if is number check for level
        else if (!isNaN(value)) {
            filteredRadicals = radicalsList.filter(subject => subject["level"] == value);
            filteredKanji = kanjiList.filter(subject => subject["level"] == value);
            filteredVocab = vocabularyList.filter(subject => subject["level"] == value);
        }
        else if (value == "legacy") {
            filteredRadicals = radicalsList.filter(subject => subject.hidden_at !== null);
            filteredKanji = kanjiList.filter(subject => subject.hidden_at !== null);
            filteredVocab = vocabularyList.filter(subject => subject.hidden_at !== null);
        }
        else {
            const cleanInput = input.value.toLowerCase().trim();
            filteredRadicals = radicalsList.filter(subject => matchesMeanings(cleanInput, subject.meanings, targeted));
            filteredKanji = kanjiList.filter(subject => matchesMeanings(cleanInput, subject.meanings, targeted));
            filteredVocab = vocabularyList.filter(subject => matchesMeanings(value, subject.meanings, targeted));
        }
    }

    filteredRadicals = filteredRadicals.flat();
    filteredKanji = filteredKanji.flat();
    filteredVocab = filteredVocab.flat();

    const nmrItemsFound = document.getElementById("nmrKanjiFound");

    const firstRadical = filteredRadicals[0];
    const firstKanji = filteredKanji[0];
    const firstVocab = filteredVocab[0];

    const sortObjectByLevel = itemList => itemList.sort((a,b) => a["level"] > b["level"] ? 1 : -1);
    if (filteredRadicals.length > 0) sortObjectByLevel(filteredRadicals).unshift(firstRadical);
    if (filteredKanji.length > 0) sortObjectByLevel(filteredKanji).unshift(firstKanji);
    if (filteredVocab.length > 0) sortObjectByLevel(filteredVocab).unshift(firstVocab);
    const filteredContent = [...new Set(filteredRadicals), ...new Set(filteredKanji), ...new Set(filteredVocab)].flat(0);

    if (nmrItemsFound) 
        nmrItemsFound.innerHTML = `<span>${filteredContent.length}<span>`;

    let index = 0, offset = 100;
    displayResults(searchResultUL, filteredContent, index, index+offset, display);

    // add load more button
    loadMoreButton(index, offset, searchResultUL.parentElement, filteredContent, display);

    if (filteredContent.length == 0) {
        const searchWrapper = document.querySelector("#searchResultItemWrapper");
        searchWrapper.appendChild(notFound("Could not find any results for the given prompt."));
    }
}

const matchesMeanings = (input, meanings, precise) => {
	let expr;
	if (input.length > 1 && !precise) {
		expr = new RegExp(input, "g");
		for (const index in meanings) {
			if (expr.test(meanings[index].toLowerCase())) {
				return true;
			}
		}
	}
	else {
		expr = input;
		for (const index in meanings) {
			if (expr == meanings[index].toLowerCase()) {
				return true;
			}
		}
	}
	return false;
}

const matchesReadings = (input, readings, precise) => {
	if (!precise) {
		const expr = new RegExp(input, "g");
		for (const index in readings) {
			const reads = readings[index];
			if (expr.test(reads.reading ? reads.reading : reads)) {
				return true;
			}
		}
	}
	else {
		for (const index in readings) {
			const reads = readings[index];
			if ((reads.reading ? reads.reading : reads)  == input) {
				return true;
			}
		}
	}
	return false;
}

const displayResults = (wrapper, results, lowerIndex, upperIndex, display) => {
    unjustifyLastRow(wrapper);
    if (display == "searchResultOptionbig-grid")
        wrapper.classList.add("justify-list");

    for (let index = lowerIndex; index < upperIndex && index < results.length; index++) {
        const data = results[index];
        let type = data["subject_type"];
        const chars = data["characters"];

        const li = document.createElement("li");
        li.classList.add("searchResultItemLine"); 
        wrapper.appendChild(li);
        if (data["hidden_at"]) {
            li.style.borderLeft = "4px solid yellow";
            li.style.opacity = "0.4";
            li.title = "This subject no longer shows up in lessons or reviews, since "+data["hidden_at"].split("T")[0]+".";
        }
        else if (data["srs_stage"] && data["srs_stage"] > -1) {
            li.style.borderLeft = `4px solid var(--${srsStages[data["srs_stage"]]["short"].toLowerCase()}-color)`;
        }
        else {
            li.style.borderLeft = "4px solid white";
        }

        const dataWrapper = document.createElement("div");
        li.appendChild(dataWrapper);
        dataWrapper.setAttribute('data-item-id', data["id"]);
        dataWrapper.classList.add("kanjiDetails");
        const itemSpan = document.createElement("span");
        itemSpan.classList.add("searchResultItem");

        dataWrapper.appendChild(itemSpan);
        if (chars) {
            itemSpan.appendChild(document.createTextNode(chars));
        }
        // add character image
        else {
            const charsWrapper = document.createElement("img");
            itemSpan.appendChild(charsWrapper);
            const characterImages = data["character_images"];
            charsWrapper.style.width = "35px";
            charsWrapper.style.filter = "invert(1)";
            charsWrapper.style.marginBottom = "-5px";
            const svg = characterImages.find(image => image["content_type"] == "image/svg+xml");
            if (svg)
                charsWrapper.src = svg["url"];
            else
                charsWrapper.src = characterImages[0]["url"];
        }

        const itemInfoType = document.createElement("div");
        itemInfoType.classList.add("searchResultType");
        dataWrapper.appendChild(itemInfoType);

        const itemInfoWrapper = document.createElement("div");
        itemInfoWrapper.classList.add("searchResultItemInfo");
        dataWrapper.appendChild(itemInfoWrapper);


        const meaning = document.createElement("span");
        itemInfoWrapper.appendChild(meaning);
        meaning.classList.add("searchResultItemTitle");
        meaning.appendChild(document.createTextNode(data["meanings"].join(", ")));

        if (type == "radical") {
            li.style.minHeight = "120px";
            itemInfoWrapper.style.minHeight = "30px";
            meaning.style.borderBottom = "none";
        }

        if (type == "kanji") {
            const on = document.createElement("span");
            itemInfoWrapper.appendChild(on); 
            const onText = document.createElement("span");
            on.appendChild(onText);
            onText.appendChild(document.createTextNode("ON: "));
            on.appendChild(document.createTextNode(data["readings"].filter(reading => reading.type == "onyomi").map(kanji => kanji.reading).join(", ")));
            const kun = document.createElement("span");
            itemInfoWrapper.appendChild(kun); 
            const kunText = document.createElement("span");
            kun.appendChild(kunText);
            kunText.appendChild(document.createTextNode("KUN: "));
            kun.appendChild(document.createTextNode(data["readings"].filter(reading => reading.type == "kunyomi").map(kanji => kanji.reading).join(", ")));
        }

        // specifically for 'vocabulary'
        if (type == "vocabulary") {
            const read = document.createElement("span");
            itemInfoWrapper.appendChild(read);
            read.appendChild(document.createTextNode(data["readings"].join(", ")));
        }

        //specifically for 'kana_vocabulary'
        if (type == "kana_vocabulary") {
            meaning.style.borderBottom = "none";
            type = "vocabulary";
        }

        itemInfoType.appendChild(document.createTextNode(type.charAt(0).toUpperCase()+type.slice(1).replaceAll("_", " ")));
        if (itemInfoType.innerText == "Kanji")
            itemInfoType.style.color = "var(--kanji-tag-color)";
        else if (itemInfoType.innerText == "Vocabulary")
            itemInfoType.style.color = "var(--vocabulary-tag-color)";
        else if (itemInfoType.innerText == "Radical")
            itemInfoType.style.color = "var(--radical-tag-color)";

        // subject type
        const subjectType = document.createElement("div");
        li.appendChild(subjectType);
        subjectType.classList.add("searchResultItemType");
        // audio icon
        if (type != "radical") {
            const audioWrapper = document.createElement("div");
            subjectType.appendChild(audioWrapper);
            if (data["pronunciation_audios"]) {
                audioWrapper.classList.add("clickable");
                audioWrapper.title = "Play audio";
                audioWrapper.addEventListener("click", () => playSubjectAudio(data["pronunciation_audios"], audioWrapper));
            }
            else {
                audioWrapper.classList.add("disabled");
                audioWrapper.title = "No audio available";
            }
            const audio = document.createElement("img");
            audioWrapper.appendChild(audio);
            audio.src = chrome.runtime.getURL("/images/volume.png");
        }
        // search icon
        const searchWrapper = document.createElement("div");
        subjectType.appendChild(searchWrapper);
        searchWrapper.classList.add("clickable");
        searchWrapper.title = "Search for "+(data["characters"]);
        searchWrapper.addEventListener("click", () => searchSubject(data["characters"], searchBar, hasKana(data["characters"]) ? "A" : "あ", settings["search"]["targeted_search"], settings["search"]["results_display"]));        
        const search = document.createElement("img");
        searchWrapper.appendChild(search);
        search.src = chrome.runtime.getURL("/images/search.png");
        if (!chars) {
            searchWrapper.classList.add("disabled");
            searchWrapper.title = "Can't search for this character";
        }
        // copy icon
        const copyWrapper = document.createElement("div");
        subjectType.appendChild(copyWrapper);
        copyWrapper.classList.add("clickable");
        copyWrapper.title = "Copy";
        const copy = document.createElement("img");
        copyWrapper.addEventListener("click", () => copyToClipboard(chars, copy)); 
        copyWrapper.appendChild(copy);
        copy.src = chrome.runtime.getURL("/images/copy.png");
        if (!chars) {
            copyWrapper.classList.add("disabled");
            copyWrapper.title = "Can't copy this character";
        }
        // srs stage
        if (data["srs_stage"] != undefined) {
            const srsStage = document.createElement("div");
            subjectType.appendChild(srsStage);
            const srsStageText = document.createElement("span");
            srsStage.appendChild(srsStageText);
            srsStageText.appendChild(document.createTextNode(data["srs_stage"] >= 0 ? srsStages[data["srs_stage"]]["short"] : "Lkd"));
            if (data["srs_stage"] >= 0)
                srsStageText.style.color = `var(--${srsStages[data["srs_stage"]]["short"].toLowerCase()}-color)`;
        }
        // level
        if (data["level"]) {
            const levelWrapper = document.createElement("div");
            subjectType.appendChild(levelWrapper);
            const levelText = document.createElement("span");
            levelWrapper.appendChild(levelText);
            levelText.appendChild(document.createTextNode(data["level"]));
        }
        
        // if it is not in list type
        if (display == "searchResultOptionbig-grid") {
            li.classList.add("searchResultItemSquare");
        }
    }
}

const loadMoreButton = (index, offset, searchResultsWrapper, content, display) => {
    if (index+offset < content.length) {
        const loadMore = document.createElement("div");
        searchResultsWrapper.appendChild(loadMore);
        loadMore.classList.add("loadMore", "clickable");
        loadMore.appendChild(document.createTextNode("Load more..."));
        index += offset;
        loadMore.addEventListener("click", () => {
            displayResults(searchResultsWrapper.querySelector("ul"), content, index, index+offset, display);
            loadMore.remove();
            
            loadMoreButton(index, offset, searchResultsWrapper, content, display);
        });
    }
}

document.addEventListener("click", e => {
    const target = e.target;

	// clicked in the menu option in search results
	if (target.classList.contains("searchResultNavbarOption")) {
		Array.from(document.querySelectorAll(".searchResultNavbarOption")).forEach(elem => elem.classList.remove("full_opacity"));

		target.classList.add("full_opacity");

		chrome.storage.local.get(["settings"], result => {
			settings = result["settings"];
			if (settings && settings["search"])
				settings["search"]["results_display"] = target.id;
			chrome.storage.local.set({"settings":settings});
		});

		const removeSquareClasses = elem => {
			const classes = elem.classList;
			if (classes.contains("searchResultItemSquare")) classes.remove("searchResultItemSquare");
		}

        const wrapper = document.querySelector("#searchResultItemWrapper");
        // clicked in the grid option
		if (target.id == "searchResultOptionbig-grid") {
			Array.from(document.getElementsByClassName("searchResultItemInfo")).forEach(elem => {
				const parent = elem.parentElement.parentElement;
				removeSquareClasses(parent);
				parent.classList.add("searchResultItemSquare");
				elem.style.display = "none";
			});
			
			const newClass = "searchResultItemType-small";
			Array.from(document.getElementsByClassName("searchResultItemType")).forEach(elem => elem.classList.replace(elem.classList[2], newClass));

            wrapper.classList.add("justify-list");
		}
        // clicked in the list option
		else {
			Array.from(document.getElementsByClassName("searchResultItemLine")).forEach(elem => {
				elem.getElementsByClassName("searchResultItemInfo")[0].style.display = "grid";
				removeSquareClasses(elem);
			});
			Array.from(document.getElementsByClassName("searchResultItemType")).forEach(elem => elem.classList.replace(elem.classList[2], "searchResultItemType-normal"));

            wrapper.classList.remove("justify-list");
		}
	}

    // clicked in the targeted search option in search results
	if (target.classList.contains("searchResultNavbarTarget")) {
		chrome.storage.local.get(["settings"], result => {
			settings = result["settings"];
			if (settings && settings["search"]) {
				if (settings["search"]["targeted_search"]) {
					target.classList.remove("full_opacity");
					settings["search"]["targeted_search"] = false;
				}
				else {
					target.classList.add("full_opacity");
					settings["search"]["targeted_search"] = true;
				}
				chrome.storage.local.set({"settings":settings});

				document.getElementById("kanjiSearchInput").dispatchEvent(new Event("input"));
			}
		});
	}
});