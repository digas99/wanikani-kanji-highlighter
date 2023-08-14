let settings;

const searchBar = document.querySelector("#kanjiSearchInput");
if (searchBar) {
    searchBar.focus();

    chrome.storage.local.get(["settings"], result => {
        settings = result["settings"];

        // add search action to search bar
        const db = new Database("wanikani");
        db.create("subjects").then(created => {
            if (created) {
                db.getAll("subjects", "subject_type", ["kanji", "vocabulary", "kana_vocabulary"]).then(data => {
                    const kanji = data["kanji"];
                    const vocabulary = [...data["vocabulary"], ...data["kana_vocabulary"]];
                    console.log(data["vocabulary"], data["kana_vocabulary"], vocabulary);

                    searchBar.addEventListener("input", () => searchSubject(kanji, vocabulary, searchBar, null, settings["search"]["targeted_search"], settings["search"]["results_display"]));
                });
            }
        });

        const inputWrapper = document.querySelector("#kanjiSearchInputWrapper");
        const typeWrapper = document.querySelector(".kanjiSearchTypeWrapper");
        typeWrapper.addEventListener("click", () => {
            if (typeWrapper.innerText === "A") changeInput(inputWrapper, "あ");
            else changeInput(inputWrapper, "A");

            inputWrapper.querySelector("#kanjiSearchInput").focus();
        });
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

const searchSubject = (kanji, vocabulary, input, searchType, targeted, display) => {
    let wrapper = document.getElementById("searchResultItemWrapper");
	if (wrapper) wrapper.remove();

	const searchResultUL = document.createElement("ul");
	searchResultUL.id = "searchResultItemWrapper";

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
	
	const value = (type == "A" ? input.value : input.value.toLowerCase()).trim();

	let filteredKanji = [];
	let filteredVocab = [];

    if (type == "A") {
        input.value = convertToKana(input.value);
    
        // if it is hiragana
        if (input.value.match(/[\u3040-\u309f]/)) {
            //const filterByReadings = (itemList, value) => itemList.filter(item => matchesReadings(value, item["readings"], targeted));
            filteredKanji = kanji.filter(subject => matchesReadings(input.value, subject.readings, targeted));
            filteredVocab = vocabulary.filter(subject => matchesReadings(input.value, subject.readings, targeted) || new RegExp(input.value, "g").test(subject.characters));
        }
    }
    else {
        // if it is a chinese character
        if (value.match(/[\u3400-\u9FBF]/)) {
            filteredKanji = filteredKanji.concat(kanji.filter(subject => value == subject.characters));
                    
            if (filteredKanji.length > 0 && !targeted) {
                filteredKanji[0]["visually_similar_subject_ids"].forEach(id => filteredKanji.push(kanji.filter(subject => id == subject.id)));
                filteredKanji[0]["amalgamation_subject_ids"].forEach(id => filteredVocab.push(vocabulary.filter(subject => id == subject.id)));
            }

            filteredVocab = filteredVocab.concat(vocabulary.filter(subject => value == subject.characters)).flat();
            if (filteredVocab.length > 0)
                filteredVocab[0]["component_subject_ids"].forEach(id => filteredKanji.push(kanji.filter(subject => id == subject.id)));
        }
        // if is number check for level
        else if (!isNaN(value)) {
            //const filterByLevel = (itemList, value) => itemList.filter(item => value == item["level"]);
            filteredKanji = kanji.filter(subject => subject["level"] == value);
            filteredVocab = vocabulary.filter(subject => subject["level"] == value);
        }
        else if (value == "legacy") {
            filteredKanji = kanji.filter(subject => subject.hidden_at !== null);
            filteredVocab = vocabulary.filter(subject => subject.hidden_at !== null);
        }
        else {
            //const filterByMeanings = (itemList, value) => itemList.filter(item => matchesMeanings(value, item["meanings"], targeted));
            const cleanInput = input.value.toLowerCase().trim();
            filteredKanji = kanji.filter(subject => matchesMeanings(cleanInput, subject.meanings, targeted));
            filteredVocab = vocabulary.filter(subject => matchesMeanings(value, subject.meanings, targeted));
        }
    }

    filteredKanji = filteredKanji.flat();
    filteredVocab = filteredVocab.flat();

    const nmrItemsFound = document.getElementById("nmrKanjiFound");
    if (nmrItemsFound) 
        nmrItemsFound.innerHTML = `<span>Found <strong>0</strong> items<span>`;

    if (filteredKanji.length > 0 || filteredVocab.length > 0) {
        const firstKanji = filteredKanji[0];
        const firstVocab = filteredVocab[0];

        const sortObjectByLevel = itemList => itemList.sort((a,b) => a["level"] > b["level"] ? 1 : -1);
        if (filteredKanji.length > 0) sortObjectByLevel(filteredKanji).unshift(firstKanji);
        if (filteredVocab.length > 0) sortObjectByLevel(filteredVocab).unshift(firstVocab);
        const filteredContent = [...new Set(filteredKanji.concat(filteredVocab))].flat(0);
    
        if (nmrItemsFound) 
            nmrItemsFound.innerHTML = `<span>Found <strong>${filteredContent.length}</strong> items<span>`;

        let index = 0, offset = 100;
        displayResults(searchResultUL, filteredContent, index, index+offset, display);

        // add load more button
        loadMoreButton(index, offset, searchResultUL, filteredContent, display);

        if (display != "searchResultOptionlist")
            document.documentElement.style.setProperty('--body-base-width', manageBodyWidth(630, parseInt(document.documentElement.style.getPropertyValue('--body-base-width')))+"px");
            
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
    for (let index = lowerIndex; index < upperIndex && index < results.length; index++) {
        const data = results[index];
        const type = data["subject_type"];
        const chars = data["characters"];

        const kanjiAlike = type == "kanji" || chars.length == 1;
        const vocabAlike = type.includes("vocab") && chars.length > 1;	
        
        const li = document.createElement("li");
        li.classList.add("searchResultItemLine", "kanjiDetails"); 
        wrapper.appendChild(li);
        li.setAttribute('data-item-id', data["id"]);
        if (data["hidden_at"]) {
            li.style.borderLeft = "4px solid yellow";
            li.style.opacity = "0.4";
            li.title = "This subject no longer shows up in lessons or reviews, since "+data["hidden_at"].split("T")[0]+".";
        }
        else if (data["srs_stage"]) {
            li.style.borderLeft = `4px solid var(--${srsStages[data["srs_stage"]]["short"].toLowerCase()}-color)`;
            li.title = srsStages[data["srs_stage"]]["name"];
        }

        const itemSpan = document.createElement("span");
        itemSpan.classList.add("searchResultItem");

        li.appendChild(itemSpan);
        itemSpan.appendChild(document.createTextNode(chars));

        if (vocabAlike)
            li.style.display = "inherit";

        const itemInfoWrapper = document.createElement("div");
        itemInfoWrapper.classList.add("searchResultItemInfo");
        li.appendChild(itemInfoWrapper);
        if (kanjiAlike)
            itemInfoWrapper.style.width = "100%";
        const level = document.createElement("span");
        itemInfoWrapper.appendChild(level);
        level.classList.add("searchResultItemLevel");
        level.appendChild(document.createTextNode(data["level"]));
        const meaning = document.createElement("span");
        itemInfoWrapper.appendChild(meaning);
        meaning.classList.add("searchResultItemTitle");
        meaning.appendChild(document.createTextNode(data["meanings"].join(", ")));

        if (kanjiAlike) {
            const on = document.createElement("span");
            itemInfoWrapper.appendChild(on); 
            on.appendChild(document.createTextNode("on: "));
            on.appendChild(document.createTextNode(data["readings"].filter(reading => reading.type == "onyomi").map(kanji => kanji.reading).join(", ")));
            const kun = document.createElement("span");
            itemInfoWrapper.appendChild(kun); 
            kun.appendChild(document.createTextNode("kun: "));
            kun.appendChild(document.createTextNode(data["readings"].filter(reading => reading.type == "kunyomi").map(kanji => kanji.reading).join(", ")));
        }

        // specifically for 'vocabulary'
        if (type == "vocabulary") {
            const read = document.createElement("span");
            itemInfoWrapper.appendChild(read);
            read.appendChild(document.createTextNode(data["readings"].join(", ")));
        }

        //specifically for 'kana_vocabulary'
        console.log(type);
        if (type == "kana_vocabulary") {
            meaning.style.borderBottom = "none";
        }

        // subject type
        const subjectType = document.createElement("div");
        li.appendChild(subjectType);
        let colorClass;
        if (kanjiAlike)
            colorClass = "kanji_back";
        else if (vocabAlike)
            colorClass = "vocab_back";
        subjectType.classList.add("searchResultItemType", colorClass);
        
        // if it is not in list type
        if (display != "searchResultOptionlist") {
            if (display == "searchResultOptionbig-grid") {
                li.classList.add("searchResultItemSquare");
                subjectType.classList.add("searchResultItemType-small");
            }
            else if (display == "searchResultOptionsmall-grid") {
                li.classList.add("searchResultItemSquareSmall");
                subjectType.classList.add("searchResultItemType-tiny");
            }
            itemInfoWrapper.style.display = "none";
        }
        else
            subjectType.classList.add("searchResultItemType-normal");
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
            displayResults(searchResultsWrapper, content, index, index+offset, display);
            loadMore.remove();
            
            loadMoreButton(index, offset, searchResultsWrapper, content, display);
        });
    }
}