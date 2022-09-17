chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	// scripts uptime
	if (request.uptimeDetailsPopup || request.uptimeHighlight) {
		const uptimeSignals = document.querySelectorAll("#scriptsUptime div");
		if (uptimeSignals) {
			if (request.uptimeHighlight) 
				uptimeSignals[0].style.backgroundColor = "#80fd80";

			if (request.uptimeDetailsPopup) 
				uptimeSignals[1].style.backgroundColor = "#80fd80";
		}
	}
});

let settings, apiKey, lastReviewsValue = 0, lastLessonsValue = 0;
const ASSIGNMENTS = ["wkhighlight_reviews", "wkhighlight_lessons"];
const PROGRESS = ["wkhighlight_radical_progress", "wkhighlight_kanji_progress", "wkhighlight_vocabulary_progress", "wkhighlight_allradicals_size", "wkhighlight_allkanji_size", "wkhighlight_allvocab_size"];

chrome.storage.local.get(["wkhighlight_apiKey", "wkhighlight_settings", ...ASSIGNMENTS , ...PROGRESS], result => {
	apiKey = result["wkhighlight_apiKey"];
	if (apiKey) {
		settings = result["wkhighlight_settings"] ? result["wkhighlight_settings"] : defaultSettings;

		if (settings["extension_popup_interface"]["scripts_status"]) {
			// SCRIPTS UPTIME
			chrome.tabs.query({currentWindow: true, active: true}, tabs => {
				["Highlighter", "Details Popup"].forEach((script, i) => {
					chrome.tabs.sendMessage(tabs[0].id, {uptime: script}, response => {
						if (response) document.querySelectorAll("#scriptsUptime div")[i].style.backgroundColor = "#80fd80";
					});
				});
			});
		}
		

		if (settings["extension_popup_interface"]["lessons_and_reviews"]) {
			// LESSONS AND REVIEWS
			// get all assignments if there are none in storage or if they were modified
			setupAssignments(apiKey, () => setupAvailableAssignments(apiKey, setupSummary));
		
			// update values and update interface
			setupAvailableAssignments(apiKey, setupSummary);

			// put in interface whatever values are in cache
			setupSummary(result["wkhighlight_reviews"], result["wkhighlight_lessons"]);
		}


		// PROGRESSIONS
		const allSize = (result["wkhighlight_allradicals_size"] ? result["wkhighlight_allradicals_size"] : 0)
			+ (result["wkhighlight_allkanji_size"] ? result["wkhighlight_allkanji_size"] : 0)
			+ (result["wkhighlight_allvocab_size"] ? result["wkhighlight_allvocab_size"] : 0);
	
		const progresses = {
			"radical": result["wkhighlight_radical_progress"],
			"kanji": result["wkhighlight_kanji_progress"],
			"vocabulary": result["wkhighlight_vocabulary_progress"]
		};

		if (settings["extension_popup_interface"]["overall_progression_bar"])
			progressionBar(document.querySelector("#progression-bar"), srsStages, progresses, allSize, settings["appearance"]);
		
		if (settings["extension_popup_interface"]["overall_progression_stats"])
			progressionStats(document.querySelector("#progression-stats"), srsStages, progresses, settings["appearance"]);
	}
	else
		window.location.href = "auth.html";
});

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