let settings, apiKey, userInfo, lastReviewsValue = 0, lastLessonsValue = 0;

let activeTab;

let popupLoading;
if (!messagePopup) {
	popupLoading = new MessagePopup(document.body);
	popupLoading.create("Loading data...");
	popupLoading.setLoading();
}

let learned = [], notLearned = [];
let highlightList = new TilesList(
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

const updateHomeInterface = async (result) => {
	settings = result["settings"] ? result["settings"] : defaultSettings;
	userInfo = result["userInfo"]?.data;
	activeTab = await getTab();
	const interface = settings["extension_popup_interface"];

	// SCRIPTS UPTIME
	if (interface["scripts_status"]) {
		["Highlighter", "Details Popup"].forEach((script, i) => {
			if (activeTab) {
				chrome.tabs.sendMessage(activeTab?.id, {uptime: script}, response => {
					if (response) document.querySelectorAll("#scripts_status div")[i].style.backgroundColor = "var(--wanikani-sec)";
				});
			}
		});
	}

	// SEARCH
	if (interface["search_bar"] && document.getElementById("kanjiSearchType")) {
		const type = document.getElementById("kanjiSearchType").innerText;
		document.querySelector("#kanjiSearchInput").addEventListener("click", () => window.location.href = "search.html"+(type ? `?type=${type}` : ""));
	}

	// HIGHLIGHTED KANJI
	if (interface["highlighted_kanji"]) {
		const kanjiAssoc = result["kanji_assoc"];

		if (activeTab) {
			chrome.tabs.sendMessage(activeTab?.id, {nmrKanjiHighlighted:"popup"}, result => {
				if (result) {
					const {nmrKanjiHighlighted, learned, notLearned} = result;
					if (learned.length > 0 || notLearned.length > 0)
						kanjiListUpdate(learned, notLearned, kanjiAssoc);
				}
			});
		}
	}

	// LESSONS AND REVIEWS
	if (interface["lessons_and_reviews"]) {
		setupSummary(result["reviews"], result["lessons"]);
	}

	// PROGRESSIONS
	const allSize = (result["radicals_size"] || 0)
		+ (result["kanji_size"] || 0)
		+ (result["vocabulary_size"] || 0)
		+ (result["kana_vocab_size"] || 0);

	const progresses = {
		"radical": result["radical_progress"] || [],
		"kanji": result["kanji_progress"] || [],
		"vocabulary": [result["vocabulary_progress"] || [], result["kana_vocabulary_progress"] || []]
			.reduce((acc, obj) => {
				Object.keys(obj).forEach(key => acc[key] = (acc[key] || 0) + obj[key]);
				return acc
			}, {})
	};

	if (interface["overall_progression_bar"])
		progressionBar(document.querySelector("#progression-bar"), progresses, allSize, settings["appearance"]);

	if (interface["overall_progression_stats"])
		progressionStats(document.querySelector("#progression-stats"), progresses, settings["appearance"], 5,
			(menu, srs) => {
				if (srs < 5) menu.style.top = "35px";
				if (srs % 5 == 0) menu.style.left = "20px";
			}
		);

	if (interface["levels_in_progress"]) {
		const radicalsLevelInProgress = result["radical_levelsInProgress"] || [];
		const kanjiLevelInProgress = result["kanji_levelsInProgress"] || [];
		const vocabularyLevelInProgress = result["vocabulary_levelsInProgress"] || [];
		const types = ["radical", "kanji", "vocabulary"];
		const progressBarWrappers = [];
		const db = new Database("wanikani");
		const opened = await db.open("subjects");
		if (opened) {
			[radicalsLevelInProgress, kanjiLevelInProgress, vocabularyLevelInProgress].forEach((levels, i) => {
				progressBarWrappers.push(
					new Promise(async (resolve, reject) => {
						const result = await db.getAll("subjects", "level", levels);
						const bars = [];							
						levels.forEach(level => {
							const values = result[level].filter(value => value["hidden_at"] == null && value["subject_type"] === types[i]);
							bars.push(levelProgressBar(userInfo["level"], values, level, types[i], settings["appearance"]));											
						});
						resolve(bars);
					})
				);
			});

			// put bars in correct order
			Promise.all(progressBarWrappers).then(bars => {
				// clear previous bars
				const levelsInProgress = document.querySelector("#levels-progress");
				levelsInProgress.innerHTML = "";

				bars.flat(1).sort((a,b) => Number(a.dataset.order) - Number(b.dataset.order))
					.forEach(bar => levelsInProgress.appendChild(bar));
			});
		}
	}

	// remove sections hidden by the user
	for (let [key, show] of Object.entries(interface)) {
		if (!show) document.querySelector(`#${key}`)?.remove();
	}	
}

chrome.storage.local.get(["apiKey", "rating", ...HOME_FETCH_KEYS], result => {
	const settings = result["settings"] ? result["settings"] : defaultSettings;

	if (popupLoading) popupLoading.remove();

	const rateStars = document.querySelector(".rate-stars");
	const rating = result["rating"] || {};
	if (rateStars && rating) {
		if ((rating.show != undefined && rating.show == false) || rating.value)
			rateStars.closest(".section").remove();
	}

	apiKey = result["apiKey"];
	
	if (apiKey) {
		updateHomeInterface(result);
		// check for updates every minute
		chrome.runtime.sendMessage({loadData: apiKey});
		setInterval(() => chrome.runtime.sendMessage({loadData: apiKey}), settings["miscellaneous"]["update_interval"]*1000);
	}
	else
		window.location.href = "auth.html";	
});

const kanjiListUpdate = (learned, notLearned, kanjiAssoc) => {
	if (highlightList && !highlightList.exists())
		highlightList.create();

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
			},
		},
		{
			title: "Not learned",
			color: "var(--notLearned-color)",
			data: notLearned,
			callbacks: {
				item: itemCallback
			},
		}
	]);
}

const setupSummary = (reviews, lessons) => {
	console.log("[SUMMARY]: Setting up summary ...", reviews, lessons);
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
					moreReviews.innerHTML = `<b>${reviewsForNextHour.length}</b> more <span style="color:var(--wanikani-sec);font-weight:bold">Reviews</span> in <b>${remainingTime}</b>`;
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
		moreReviews.innerHTML = `<b>${reviewsForNextHour.length}</b> more <span style="color:var(--wanikani-sec);font-weight:bold">Reviews</span> <b class="refresh clickable">now</b>`;
		// refresh popup automatically
		setTimeout(() => window.location.reload(), 1000);
		clearInterval(timeStampInterval);
		return;
	}

	// refresh time stamp
	moreReviews.getElementsByTagName("B")[1].innerText = newTimeStamp;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	// scripts uptime
	if (request.uptimeDetailsPopup || request.uptimeHighlight) {
		const uptimeSignals = document.querySelectorAll("#scripts_status div");
		if (uptimeSignals && uptimeSignals.length > 0) {
			if (request.uptimeHighlight) 
				uptimeSignals[0].style.backgroundColor = "var(--wanikani-sec)";

			if (request.uptimeDetailsPopup) 
				uptimeSignals[1].style.backgroundColor = "var(--wanikani-sec)";
		}
	}

	// update highlighted kanji list
	if (request.kanjiHighlighted && highlightList && sender.tab.id == activeTab.id) {
		chrome.storage.local.get(["kanji_assoc"], result => {
			const kanjiAssoc = result["kanji_assoc"];
			const {learned, notLearned} = request.kanjiHighlighted;
			if (learned.length > 0 || notLearned.length > 0) {
				kanjiListUpdate(learned, notLearned, kanjiAssoc);
				document.querySelector("#enhancedMessage")?.remove();
			}
		});
	}

	if (request.reviews || request.lessons) {
		const reviews = request.reviews;
		const lessons = request.lessons;
		setupSummary(reviews, lessons);
	}
});

document.addEventListener("scriptsLoaded", () => {
	const main = document.getElementById("main");
	
	if (atWanikani || blacklistedSite || !validSite) {
		if (atWanikani) document.body.insertBefore(enhancedWarning("Limited features at wanikani, sorry!", "var(--wanikani)"), main);
		else if (blacklistedSite) document.body.insertBefore(enhancedWarning("Site blacklisted by you!", "red"), main);
		else if (!validSite) document.body.insertBefore(enhancedWarning("Can't inject highlighter (maybe reload the page?)", "#b3b3b3"), main);

		// remove highlighted kanji container
		if (highlightList)
			highlightList.remove();
	}

});

const enhancedWarning = (text, color) => {
	const wrapper = document.createElement("div");
	wrapper.appendChild(document.createTextNode(text));
	wrapper.id = "enhancedMessage";
	wrapper.style.borderBottom = "0px";
	wrapper.style.color = color;
	return wrapper;
}

window.addEventListener("keydown", e => {
	if (!window.location.href.includes("search") && e.key.length == 1 && e.key.match(/[a-z]/i)) {
		makeSearch(e.key);
	}
});