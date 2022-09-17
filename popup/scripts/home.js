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

// scripts uptime
chrome.tabs.query({currentWindow: true, active: true}, tabs => {
	["Highlighter", "Details Popup"].forEach((script, i) => {
		chrome.tabs.sendMessage(tabs[0].id, {uptime: script}, response => {
			if (response) document.querySelectorAll("#scriptsUptime div")[i].style.backgroundColor = "#80fd80";
		});
	});
});

let settings, apiKey, lastReviewsValue = 0, lastLessonsValue = 0;
const ASSIGNMENTS = ["wkhighlight_reviews", "wkhighlight_lessons"];
const PROGRESS = ["wkhighlight_radical_progress", "wkhighlight_kanji_progress", "wkhighlight_vocabulary_progress", "wkhighlight_allradicals_size", "wkhighlight_allkanji_size", "wkhighlight_allvocab_size"];

chrome.storage.local.get(["wkhighlight_apiKey", "wkhighlight_settings", ...ASSIGNMENTS , ...PROGRESS], result => {
	apiKey = result["wkhighlight_apiKey"];
	if (apiKey) {
		settings = result["wkhighlight_settings"] ? result["wkhighlight_settings"] : defaultSettings;

		// LESSONS AND REVIEWS
		// get all assignments if there are none in storage or if they were modified
		setupAssignments(apiKey, () => setupAvailableAssignments(apiKey, setupSummary));
	
		const reviews = result["wkhighlight_reviews"];
		const lessons = result["wkhighlight_lessons"];
		
		// put in interface whatever values are in cache
		setupSummary(reviews, lessons);
	
		// update values and update interface
		setupAvailableAssignments(apiKey, setupSummary);


		// OVERALL PROGRESS
		const radicalProgress = response["wkhighlight_radical_progress"];
		const kanjiProgress = response["wkhighlight_kanji_progress"];
		const vocabularyProgress = response["wkhighlight_vocabulary_progress"];
		if (radicalProgress || kanjiProgress || vocabularyProgress) {
			const radicalsSize = response["wkhighlight_allradicals_size"];
			const kanjiSize = response["wkhighlight_allkanji_size"];
			const vocabularySize = response["wkhighlight_allvocab_size"];
			if (radicalsSize || kanjiSize || vocabularySize) {
				
			}
		}
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