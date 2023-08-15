let settings, apiKey, userInfo, lastReviewsValue = 0, lastLessonsValue = 0;
let highlightList;
let activeTab;

let popupLoading;
if (!messagePopup) {
	popupLoading = new MessagePopup(document.body);
	popupLoading.create("Loading data...");
}

const updateHomeInterface = async (result) => {
	settings = result["settings"] ? result["settings"] : defaultSettings;
	userInfo = result["userInfo"];
	activeTab = await getTab();

	// SCRIPTS UPTIME
	if (settings["extension_popup_interface"]["scripts_status"]) {
		["Highlighter", "Details Popup"].forEach((script, i) => {
			chrome.tabs.sendMessage(activeTab.id, {uptime: script}, response => {
				if (response) document.querySelectorAll("#scripts_status div")[i].style.backgroundColor = "#80fd80";
			});
		});
	}

	// SEARCH
	const type = document.getElementById("kanjiSearchType").innerText;
	document.querySelector("#kanjiSearchInput").addEventListener("click", () => window.location.href = "search.html"+(type ? `?type=${type}` : ""));

	// HIGHLIGHTED KANJI
	if (settings["extension_popup_interface"]["highlighted_kanji"]) {
		const learned = [], notLearned = [];
		highlightList = new TilesList(
			document.querySelector("#highlighted_kanji"),
			[
				{
					title: "Learned",
					color: "var(--highlight-default-color)",
					data: learned
				},
				{
					title: "Not learned",
					color: "var(--notLearned-color)",
					data: notLearned
				}
			],
			{
				title: `Kanji: <b>${learned.length + notLearned.length}</b> (in the page)`,
				height: 200,
				bars: {
					labels: true
				},
				sections: {
					fillWidth: true,
					join: false,
					notFound: "No Kanji found in the current page!"
				}
			}
		);

		const kanjiAssoc = result["kanji_assoc"];

		chrome.tabs.sendMessage(activeTab.id, {nmrKanjiHighlighted:"popup"}, result => {
			if (result) {
				const {nmrKanjiHighlighted, learned, notLearned} = result;
				if (learned.length > 0 || notLearned.length > 0)
					kanjiListUpdate(learned, notLearned, kanjiAssoc);
			}
		});
	}

	// LESSONS AND REVIEWS
	if (settings["extension_popup_interface"]["lessons_and_reviews"]) {
		setupSummary(result["reviews"], result["lessons"]);
	}

	// PROGRESSIONS
	const allSize = (result["radicals_size"] ? result["radicals_size"] : 0)
		+ (result["kanji_size"] ? result["kanji_size"] : 0)
		+ (result["vocabulary_size"] ? result["vocabulary_size"] : 0);

	const progresses = {
		"radical": result["radical_progress"],
		"kanji": result["kanji_progress"],
		"vocabulary": result["vocabulary_progress"]
	};

	if (settings["extension_popup_interface"]["overall_progression_bar"])
		progressionBar(document.querySelector("#progression-bar"), srsStages, progresses, allSize, settings["appearance"]);

	if (settings["extension_popup_interface"]["overall_progression_stats"])
		progressionStats(document.querySelector("#progression-stats"), srsStages, progresses, settings["appearance"]);

	if (settings["extension_popup_interface"]["levels_in_progress"]) {
		const radicalsLevelInProgress = result["radical_levelsInProgress"] ? result["radical_levelsInProgress"] : [];
		const kanjiLevelInProgress = result["kanji_levelsInProgress"] ? result["kanji_levelsInProgress"] : [];
		const vocabularyLevelInProgress = result["vocabulary_levelsInProgress"] ? result["vocabulary_levelsInProgress"] : [];
		const types = ["radical", "kanji", "vocabulary"];
		const progressBarWrappers = [];
		const db = new Database("wanikani");
		db.open("subjects").then(opened => {
			if (opened) {
				[radicalsLevelInProgress, kanjiLevelInProgress, vocabularyLevelInProgress]
					.forEach((levels, i) => {
						progressBarWrappers.push(
							new Promise((resolve, reject) => {
								db.getAll("subjects", "level", levels).then(result => {	
									const bars = [];							
									levels.forEach(level => {
										const values = result[level].filter(value => value["hidden_at"] == null && value["subject_type"] === types[i]);
										bars.push(levelProgressBar(userInfo["level"], values, level, types[i], srsStages, settings["appearance"]));											
									});
									resolve(bars);
								});
							})
						);
					});

				// clear previous bars
				const levelsInProgress = document.querySelector("#levels-progress");
				levelsInProgress.innerHTML = "";
					
				// put bars in correct order
				Promise.all(progressBarWrappers).then(bars => {
					bars.flat(1).sort((a,b) => Number(a.dataset.order) - Number(b.dataset.order))
						.forEach(bar => levelsInProgress.appendChild(bar));
				});
			}
		});
	}

	// remove sections hidden by the user
	for (let [key, show] of Object.entries(settings["extension_popup_interface"])) {
		if (!show) document.querySelector(`#${key}`)?.remove();
	}	
}

chrome.storage.local.get(["apiKey", ...HOME_FETCH_KEYS], result => {
	if (popupLoading) popupLoading.remove();
	
	apiKey = result["apiKey"];
	
	if (apiKey) {
		updateHomeInterface(result);
		loadData(apiKey);
	}
	else
		window.location.href = "auth.html";	
});

const kanjiListUpdate = (learned, notLearned, kanjiAssoc) => {
	const itemCallback = (elem, value) => {
		elem.classList.add("kanjiDetails");
		if (kanjiAssoc && kanjiAssoc[value])
			elem.setAttribute("data-item-id", kanjiAssoc[value]);
	}

	highlightList.updateTitle(`Kanji: <b>${learned.length + notLearned.length}</b> (in the page)`);
	highlightList.update([
		{
			title: "Learned",
			color: "var(--highlight-default-color)",
			data: learned,
			callbacks: {
				item: itemCallback
			}
		},
		{
			title: "Not learned",
			color: "var(--notLearned-color)",
			data: notLearned,
			callbacks: {
				item: itemCallback
			}
		}
	]);
}

const setupSummary = (reviews, lessons) => {
	if (reviews) {
		const currentTime = new Date().getTime();
		
		const summaryReviews = document.querySelector("#summaryReviews");
		const currentValue = parseInt(summaryReviews.innerText);
		if (currentValue === 0)
			summaryReviews.innerText = reviews["count"] ? reviews["count"] : 0;
		else {
			if (reviews["count"] && typeof currentValue === "number" && !isNaN(currentTime) && reviews["count"] != lastReviewsValue) {
				counterAnimation(currentValue, reviews["count"], summaryReviews, 5);
				lastReviewsValue = reviews["count"];
			}	
		}												

		// get all the reviews for the next 14 days
		const nextReviews = reviews["next_reviews"];
		const hoursIn14Days = 24*14;
		// check reviews for the next hours, for every exact hour
		for (let i = 1; i < hoursIn14Days; i++) {
			const thisDate = nextExactHour(new Date(), i);
			const reviewsForNextHour = filterAssignmentsByTime(nextReviews, new Date(), thisDate);
			if (reviewsForNextHour.length > 0) {
				const remainingTime = msToTime(thisDate - currentTime);
				const moreReviews = document.querySelector("#more-reviews");
				if (moreReviews) {
					moreReviews.innerHTML = `<b>${reviewsForNextHour.length}</b> more <span style="color:#2c7080;font-weight:bold">Reviews</span> in <b>${remainingTime}</b>`;
					let time = `${thisDate.getHours() < 10 ? "0"+thisDate.getHours() : thisDate.getHours()}:${thisDate.getMinutes() < 10 ? "0"+thisDate.getMinutes() : thisDate.getMinutes()}`;
					if (settings && settings["miscellaneous"]["time_in_12h_format"])
						time = time12h(time);
					
					const moreReviewsDate = document.querySelector("#more-reviews-date");
					if (moreReviewsDate)
						moreReviewsDate.innerText = `${thisDate.getMonthName().slice(0, 3)} ${thisDate.getDate() < 10 ? "0"+thisDate.getDate() : thisDate.getDate()}, ${time}`;
				}

				// timeUnit = "Days, Hrs, etc..."
				let timeUnit = remainingTime.split(" ")[1];
				let timeStampInterval = setInterval(() => timeStampRefresher(moreReviews, timeStampInterval, thisDate, timeUnit, reviewsForNextHour), time_delays[timeUnit]);
				// 10% of a minute are 6000 milliseconds
				break;
			}
		}
	}

	if (lessons) {
		const summaryLessons = document.querySelector("#summaryLessons");
		const currentValue = parseInt(summaryLessons.innerText);
		if (currentValue === 0)
			summaryLessons.innerText = lessons["count"] ? lessons["count"] : 0;
		else {
			if (lessons["count"] && typeof currentValue === "number" && !isNaN(currentValue) && lessons["count"] != lastLessonsValue) {
				counterAnimation(currentValue, lessons["count"], summaryLessons, 5);
				lastLessonsValue = lessons["count"];
			}	
		}												
	}
}

const timeStampRefresher = (moreReviews, timeStampInterval,thisDate, timeUnit, reviewsForNextHour) => {
	const newCurrentDate = new Date().getTime();
	const newTimeStamp = msToTime(thisDate - newCurrentDate);
	const newTimeUnit = newTimeStamp.split(" ")[1];
	// check if has changed the unit of time
	if (newTimeUnit != timeUnit) {
		timeUnit = newTimeUnit;
		// if so then clear the current interval
		clearInterval(timeStampInterval);
		// and start a new one with a new interval delay
		timeStampInterval = setInterval(timeStampRefresher, time_delays[newTimeUnit]);
	}

	// if time stamp reached 0
	if (thisDate <= newCurrentDate) {
		moreReviews.innerHTML = `<b>${reviewsForNextHour.length}</b> more <span style="color:#2c7080;font-weight:bold">Reviews</span> <b class="refresh clickable">now</b>`;
		// refresh popup automatically
		setTimeout(() => window.location.reload(), 1000);
		clearInterval(timeStampInterval);
		return;
	}

	// refresh time stamp
	moreReviews.getElementsByTagName("B")[1].innerText = newTimeStamp;
}

const progressionBar = (wrapper, srsStages, progresses, size, colors) => {
	let unlockedSize = 0, stageValue, stageColor;

	// clear bar beforehand if needed
	if (wrapper) wrapper.innerHTML = "";

	Object.keys(srsStages).forEach(stage => {
		stageValue = (progresses["radical"] && progresses["radical"][stage] ? progresses["radical"][stage] : 0)
			+ (progresses["kanji"] && progresses["kanji"][stage] ? progresses["kanji"][stage] : 0)
			+ (progresses["vocabulary"] && progresses["vocabulary"][stage] ? progresses["vocabulary"][stage] : 0);
		
		stageColor = colors ? colors[srsStages[stage]["short"].toLowerCase()+"_color"] : srsStages[stage]["color"];
		unlockedSize += stageValue;

		// add bar to progress bar
		if (wrapper && size) {
			const progressBarBar = document.createElement("li");
			wrapper.appendChild(progressBarBar);
			progressBarBar.classList.add("clickable");
			const percentageValue = stageValue/size*100;
			progressBarBar.style.width = percentageValue+"%";
			progressBarBar.style.backgroundColor = stageColor;
			progressBarBar.title = srsStages[stage]["name"]+": "+stageValue+" / "+percentageValue.toFixed(1)+"%";
			if (percentageValue > 8.1) {
				const percentage = document.createElement("div");
				progressBarBar.appendChild(percentage);
				percentage.appendChild(document.createTextNode(percentageValue.toFixed(percentageValue > 11 ? 1 : 0)+"%"));
			}
		}
	});

	// add locked subjects bar
	const lockedSubjectsBar = document.createElement("li");
	wrapper.appendChild(lockedSubjectsBar);
	const percentageValue = (size-unlockedSize)/size*100
	lockedSubjectsBar.style.width = percentageValue+"%";
	lockedSubjectsBar.classList.add("clickable");
	lockedSubjectsBar.title = "Locked: "+(size-unlockedSize)+" / "+percentageValue.toFixed(1)+"%";
	if (percentageValue > 8.1) {
		const percentage = document.createElement("div");
		lockedSubjectsBar.appendChild(percentage);
		percentage.appendChild(document.createTextNode(percentageValue.toFixed(percentageValue > 11 ? 1 : 0)+"%"));
	}
}

const progressionStats = (wrapper, srsStages, progresses, colors) => {
	let row, stageValue, stageColor;
	console.log(progresses);

	// clear stats beforehand if needed
	if (wrapper) wrapper.innerHTML = "";

	Object.keys(srsStages).forEach(stage => {
		stageValue = (progresses["radical"] && progresses["radical"][stage] ? progresses["radical"][stage] : 0)
			+ (progresses["kanji"] && progresses["kanji"][stage] ? progresses["kanji"][stage] : 0)
			+ (progresses["vocabulary"] && progresses["vocabulary"][stage] ? progresses["vocabulary"][stage] : 0);
	
		stageColor = colors ? colors[srsStages[stage]["short"].toLowerCase()+"_color"] : srsStages[stage]["color"];
		
		// add square to progression stats
		if (stage % 5 == 0) {
			row = document.createElement("ul");
			wrapper.appendChild(row);
		}

		const stageSquareWrapper = document.createElement("li");
		row.appendChild(stageSquareWrapper);
		const stageSquare = document.createElement("div");
		stageSquareWrapper.appendChild(stageSquare);
		stageSquare.classList.add("clickable");
		stageSquare.appendChild(document.createTextNode(stageValue));
		stageSquare.title = srsStages[stage]["name"];
		stageSquare.style.backgroundColor = stageColor;

		const infoMenu = progressionMenu(srsStages, stage, progresses, stageValue, stageColor, colors);
		stageSquareWrapper.appendChild(infoMenu);
		
		if (stage < 5)
			infoMenu.style.top = "35px";

		if (stage % 5 == 0)
			infoMenu.style.left = "20px";

		stageSquareWrapper.addEventListener("mouseover", () => infoMenu.classList.remove("hidden"));
		stageSquareWrapper.addEventListener("mouseout", () => infoMenu.classList.add("hidden"));
	});
}

const progressionMenu = (srsStages, stage, progresses, stageValue, stageColor, typeColors) => {
	const infoMenu = document.createElement("div");
	infoMenu.classList.add("progression-menu", "hidden");
	const infoMenuTitle = document.createElement("p");
	infoMenu.appendChild(infoMenuTitle);
	infoMenuTitle.appendChild(document.createTextNode(srsStages[stage]["name"]));
	infoMenuTitle.style.color = stageColor;
	const infoMenuBar = document.createElement("div");
	infoMenu.appendChild(infoMenuBar);
	const infoMenuListing = document.createElement("ul");
	infoMenu.appendChild(infoMenuListing);
	["Radical", "Kanji", "Vocabulary"].forEach(type => {
		let typeProgress = progresses[type.toLowerCase()];

		const bar = document.createElement("div");
		infoMenuBar.appendChild(bar);
		bar.style.width = (typeProgress && typeProgress[stage] ? typeProgress[stage] / stageValue *100 : 0)+"%";
		const colorId = (type == "Radical" ? "radical" : type == "Kanji" ? "kanji" : "vocab")+"_color";
		bar.style.backgroundColor = typeColors[colorId];

		const infoMenuType = document.createElement("li");
		infoMenuListing.appendChild(infoMenuType);
		const typeTitle = document.createElement("b");
		infoMenuType.appendChild(typeTitle);
		typeTitle.appendChild(document.createTextNode(type+": "));
		infoMenuType.appendChild(document.createTextNode(typeProgress && typeProgress[stage] ? typeProgress[stage] : 0));
	});

	return infoMenu;
}

const levelProgressBar = (currentLevel, values, level, type, srsStages, colors) => {
	const all = values.length;
	const passed = values.filter(subject => subject["passed_at"]).length;
	const notPassed = values.filter(subject => !subject["passed_at"]);
	const locked = notPassed.filter(subject => subject["srs_stage"] == null).length;

	const progressBarWrapper = document.createElement("ul");

	// set order value
	const levelValue = Number(level);
	progressBarWrapper.setAttribute("data-order", levelValue);

	// bar for passed
	progressBarWrapper.appendChild(levelProgressBarSlice(passed, all, {background: "black", text: "white"}, "Passed: "+passed));

	// traverse from initiate until apprentice IV
	for (let i = 5; i >= 0; i--) {
		const stageSubjects = notPassed.filter(subject => subject["srs_stage"] == i).length;
		progressBarWrapper.appendChild(levelProgressBarSlice(stageSubjects, all, {background: colors[srsStages[i]["short"].toLowerCase()+"_color"], text: "white"}, srsStages[i]["name"]+": "+stageSubjects));
	}

	// bar for locked
	progressBarWrapper.appendChild(levelProgressBarSlice(locked, all, {background: "white", text: "black"}, "Locked: "+locked));

	// bar id
	const barTitle = document.createElement("span");
	progressBarWrapper.appendChild(barTitle);
	barTitle.appendChild(document.createTextNode(levelValue+" "+type.charAt(0).toUpperCase()+type.substring(1, 3)));

	// levelup marker
	if (type == "kanji" && levelValue == currentLevel)
		progressBarWrapper.appendChild(levelUpMarker(all));

	return progressBarWrapper;
}

const levelProgressBarSlice = (subjects, all, color, title) => {
	const progressBarBar = document.createElement("li");
	progressBarBar.classList.add("clickable");
	const percentageValue = subjects/all*100;
	progressBarBar.style.width = percentageValue+"%";
	progressBarBar.style.backgroundColor = color["background"];
	progressBarBar.style.color = color["text"];
	progressBarBar.title = title;
	if (percentageValue > 8.1) {
		const percentage = document.createElement("div");
		progressBarBar.appendChild(percentage);
		percentage.appendChild(document.createTextNode(percentageValue.toFixed(percentageValue > 11 ? 1 : 0)+"%"));
	}
	return progressBarBar;
}

const levelUpMarker = numberKanji => {
	const levelupMarkerWrapper = document.createElement("div");
	levelupMarkerWrapper.classList.add("levelup-marker");
	levelupMarkerWrapper.style.width = "86%";
	const levelupMarker = document.createElement("div");
	levelupMarkerWrapper.appendChild(levelupMarker);
	
	// calculate number of kanji to get atleast 90%
	let final = numberKanji;
	for (let k = numberKanji; k > 0; k--) {
		if (k/numberKanji*100 < 90) break;
		final = k;
	}
	levelupMarker.style.width = final/numberKanji*100+"%";
	return levelupMarkerWrapper;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	// scripts uptime
	if (request.uptimeDetailsPopup || request.uptimeHighlight) {
		const uptimeSignals = document.querySelectorAll("#scripts_status div");
		if (uptimeSignals) {
			if (request.uptimeHighlight) 
				uptimeSignals[0].style.backgroundColor = "#80fd80";

			if (request.uptimeDetailsPopup) 
				uptimeSignals[1].style.backgroundColor = "#80fd80";
		}
	}

	// update highlighted kanji list
	if (request.kanjiHighlighted && highlightList && sender.tab.id == activeTab.id) {
		chrome.storage.local.get(["kanji_assoc"], result => {
			const kanjiAssoc = result["kanji_assoc"];
			const {learned, notLearned} = request.kanjiHighlighted;
			if (learned.length > 0 || notLearned.length > 0)
				kanjiListUpdate(learned, notLearned, kanjiAssoc);
		});
	}
});

document.addEventListener("scriptsLoaded", () => {
	const main = document.getElementById("main");
	const userInfoWrapper = document.querySelector("#userInfoWrapper");

	if (atWanikani) main.insertBefore(enhancedWarning("Limited features at wanikani, sorry!", "var(--wanikani)"), userInfoWrapper);
	else if (blacklistedSite) main.insertBefore(enhancedWarning("Site blacklisted by you!", "red"), userInfoWrapper);
	else if (!validSite) main.insertBefore(enhancedWarning("The current site doesn't allow for highlighting.", "#b3b3b3"), userInfoWrapper);
});

const enhancedWarning = (text, color) => {
	const wrapper = document.createElement("div");
	wrapper.appendChild(document.createTextNode(text));
	wrapper.id = "enhancedMessage";
	wrapper.style.borderBottom = "0px";
	wrapper.style.borderLeft = "10px solid";
	wrapper.style.color = color;
	return wrapper;
}