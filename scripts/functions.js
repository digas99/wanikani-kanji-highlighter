/*
	GENERAL
*/

// GENERAL
const errorHandling = error => console.log(error);

const hexToRGB = hex => {
	hex = hex[0] == "#" ? hex.substring(1) : hex;
	return ({r:parseInt(hex[0]+hex[1], 16), g:parseInt(hex[2]+hex[3], 16), b:parseInt(hex[4]+hex[5], 16)});
}

// from: https://stackoverflow.com/a/3943023/11488921
const fontColorFromBackground = (r, g, b) => {
	return (r*0.299 + g*0.587 + b*0.114) > 186 ? "#000000" : "#ffffff";
}

const ordinalSuffix = number => {
	switch(number) {
		case 1:
			return "st";
		case 2:
			return "nd";
		case 3:
			return "rd";
		default:
			return "th";
	}
}

const msToDays = ms => {
	return ms / (1000 * 60 * 60 * 24);
}

// millisecond to readable format
// stole from: https://stackoverflow.com/questions/19700283/how-to-convert-time-in-milliseconds-to-hours-min-sec-format-in-javascript/32180863#32180863
function msToTime(ms) {
  let seconds = (ms / 1000).toFixed(1);
  let minutes = (ms / (1000 * 60)).toFixed(1);
  let hours = (ms / (1000 * 60 * 60)).toFixed(1);
  let days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);
  if (seconds < 60) return seconds + " Sec";
  else if (minutes < 60) return minutes + " Min";
  else if (hours < 24) return hours + " Hrs";
  else return days + " Days"
}

// format date into <day-name>, <day> <month> <year> <hour>:<minute>:<second> GMT
const formatDate = date => {
	const split = date.toString().split(" ");
	return `${split[0]}, ${split[2]} ${split[1]} ${split[3]} ${split[4]} GMT`;
}

// setup two new functions to Date
var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

Date.prototype.getMonthName = function() {
	return months[ this.getMonth() ];
};

Date.prototype.getWeekDay = function() {
	return days[ this.getDay() ];
};

const simpleFormatDate = (date, format) => {
	// make sure it is a Date object
	date = new Date(date);
	let dd = date.getDate();
	let mm = date.getMonth()+1;
	const yyyy = date.getFullYear();
	dd = dd < 10 ? '0'+dd : dd;
	mm = mm < 10 ? '0'+mm : mm;
	let value;
	switch(format) {
		case "mdy":
			value = `${mm}-${dd}-${yyyy}`
			break;
		case "dmy":
			value = `${dd}-${mm}-${yyyy}`
			break;
		case "ymd":
			value = `${yyyy}-${mm}-${dd}`; 
			break;
	}
	return value;
}

const time12h = hours => new Date('1970-01-01T'+hours+'Z').toLocaleTimeString({}, {timeZone:'UTC', hour12:true, hour:'numeric', minute:'numeric'});

const setExactHour = (date, hour) => {
	return new Date(new Date(new Date(new Date(date).setHours(hour)).setMinutes(0)).setSeconds(0));
}

const nextExactHour = (date, hours) => {
	return new Date(new Date(new Date(new Date(date).setHours(new Date(date).getHours()+hours)).setMinutes(0)).setSeconds(0));
}

const changeDay = (date, days) => {
	return new Date(new Date(date).setDate((new Date(date).getDate())+days));
}

const setupReviewsDataForChart = (reviews, today, days, hoursAhead, time12h_format) => {
	const currentHour = today.getHours();
	let currentDay = today.getDate();
	let hours = [];
	const reviewsPerHour = [];

	let hour = currentHour + hoursAhead;
	if (hour == 24) {
		hour = 0;
		currentDay++;
	}

	let counter = 0;
	const daysToHours = days*24;
	// loop all the next 24 hours (i.e.: if right now the hour is 12h, loop until 12h (of the next day))
	while (counter++ != daysToHours) {
		hours.push((days > 1 ? currentDay+" " : "")+`${hour}h`);
		reviewsPerHour.push(reviews.filter(r => r["hour"] == hour && r["day"] == currentDay).length);
		// make sure the hour after 23h is 00h and not 24h and increase day
		if (++hour == 24) {
			hour = 0;
			currentDay++; 
		}
	}

	if (time12h_format) {
		hours = hours.map(hour => {
			hour = hour.slice(0, hour.length-1);
			if (hour < 10) hour = "0"+hour;
			hour+=":00";
			return time12h(hour).split(":00").join("");
		});
	}

	return ({hours:hours, reviewsPerHour:reviewsPerHour});
}

const chartAddData = (chart, labels, data) => {
	labels.forEach(label => chart.data.labels.push(label));
	let counter = 0;
	chart.data.datasets.forEach((dataset) => {
		data[counter++].forEach(value => dataset.data.push(value));
	});
	chart.update();
}

const chartRemoveData = (chart, size) => {
	while (size-- != 0) {
		chart.data.labels.pop();
		chart.data.datasets.forEach((dataset) => {
			dataset.data.pop();
		});
	}
	chart.update();
}

const updateChartReviewsOfDay = (reviews, chart, date, numberReviewsElement, time12h_format) => {
	const newDate = setExactHour(new Date(date), 0);
	chartRemoveData(chart, chart.data.labels.length);
	const nextReviews = filterAssignmentsByTime(reviews, newDate, changeDay(newDate, 1))
							.map(review => ({hour:new Date(review["available_at"]).getHours(), day:new Date(review["available_at"]).getDate(), srs:review["srs_stage"]}));
	const apprData = setupReviewsDataForChart(nextReviews.filter(review => review["srs"] > 0 && review["srs"] <= 4), newDate, 1, 0, time12h_format);
	const guruData = setupReviewsDataForChart(nextReviews.filter(review => review["srs"] == 5 || review["srs"] == 6), newDate, 1, 0, time12h_format);
	const masterData = setupReviewsDataForChart(nextReviews.filter(review => review["srs"] == 7), newDate, 1, 0, time12h_format);
	const enliData = setupReviewsDataForChart(nextReviews.filter(review => review["srs"] == 8), newDate, 1, 0, time12h_format);
	//const newData = setupReviewsDataForChart(nextReviews, newDate, 1, 0);
	chartAddData(chart, apprData["hours"], [apprData["reviewsPerHour"], guruData["reviewsPerHour"], masterData["reviewsPerHour"], enliData["reviewsPerHour"]]);
	const newDateDay = newDate.getDate();
	const dateIdentifier = `${newDate.getWeekDay()}, ${newDate.getMonthName()} ${newDateDay+ordinalSuffix(newDateDay)}`;
	chart.options.plugins.title.text = `Reviews on ${dateIdentifier}`;
	if (numberReviewsElement)
		numberReviewsElement.innerHTML = `<b>${setupReviewsDataForChart(nextReviews, newDate, 1, 0, time12h_format)["reviewsPerHour"].reduce((a,b) => a+b)}</b> Reviews on ${dateIdentifier}`;
	chart.update();
}

const filterAssignmentsByTime = (list, currentDate, capDate) => {
	list = list[0] && list[0]["data"] ? list.map(review => review["data"]) : list;
	const date = capDate ? new Date(capDate) : null;
	if (date) {
		// if the given date is in the future
		if (date.getTime() > new Date().getTime()) {
			return list.filter(assignment =>
					new Date(assignment["available_at"]).getTime() >= currentDate.getTime()
					&& new Date(assignment["available_at"]).getTime() <= date.getTime());
		}
		// if it is in the past
		else {
			return list.filter(assignment =>
				new Date(assignment["available_at"]).getTime() <= currentDate.getTime()
				&& new Date(assignment["available_at"]).getTime() >= date.getTime());
		}
	}
	// if capDate is null then return all assignments with dates greater than today
	return list.filter(assignment =>
			new Date(assignment["available_at"]).getTime() > currentDate.getTime());
}

// clears cache of this extension from chrome storage
const clearCache = () => {
	chrome.storage.local.get(null, data => {
		let keysToRemove = [];
		Object.keys(data).forEach(key => {
			if (/^wkhighlight_.*/g.test(key)) {
				keysToRemove.push(key);
			}
		});
		window.location.reload();
		chrome.storage.local.remove(keysToRemove);
	});
}

const clearSubjects = () => {
	chrome.storage.local.get(null, data => {
		let keysToRemove = [];
		Object.keys(data).forEach(key => {
			if (/^wkhighlight_all.*/g.test(key)) {
				keysToRemove.push(key);
			}
		});
		window.location.reload();
		chrome.storage.local.remove(keysToRemove);
	});
}

const rand = (min, max) => {
	return Math.floor(Math.random() * (max - min) ) + min;
}

const mdToHTML = lineText => {
	// maintain the original value to add padding bellow, in needed
	let line = lineText;

	// start at 1 to ignore h1
	let hCounter = 1;
	// counter number of # in a row
	for (let i = 0; i < 3; i++) {
		if (line.charAt(0) == '#') {
			hCounter++;
			line = line.substring(1);
		}
		else break;
	}

	let elem;
	if (hCounter == 1) {
		elem = document.createElement("p");
		elem.style.fontSize = "14px";
	}
	else {
		elem = document.createElement("h"+hCounter);
		if (hCounter == 2) {
			elem.style.marginTop = "10px";
			elem.style.borderTop = "1px solid silver";
		}
		if (hCounter == 3) elem.style.fontSize = "16px";
	}

	// detect links headers
	let insideLink = false;
	let newLine = "";
	for (let i = 0; i < line.length; i++) {
		if (line.charAt(i) == ']') {
			line = newLine;
			break;
		}
		
		if (insideLink) newLine+=line.charAt(i);

		if (line.charAt(i) == '[') insideLink = true;
	}

	if (lineText.charAt(0) === ' ')
		elem.style.paddingLeft = "10px";

		line.replaceAll('*', '');

	elem.appendChild(document.createTextNode(line));

	return elem;
}

const counterAnimation = (currentValue, newValue, targetElem, delay) => {
	if (currentValue != newValue) {
		const modulus = newValue - currentValue > 0 ? newValue - currentValue : (newValue - currentValue)*-1;
		let scale = 1;
		if (modulus > 50) scale = parseInt((modulus/10).toFixed(0));

		let interval, i = currentValue;
		if (currentValue < newValue) {
			interval = setInterval(() => {
				if (i >= newValue)
					clearInterval(interval);

				if (newValue - i < scale) scale = newValue - i;

				targetElem.innerHTML = i+=scale;
				i++;
			} , delay);
		}
		else {
			interval = setInterval(() => {
				if (i <= newValue)
					clearInterval(interval);

				if (i - newValue < scale) scale = i - newValue;

				targetElem.innerHTML = i-=scale;
				i--;
			} , delay);
		}
		return true;
	}
	return false;
}

const manageBodyWidth = (width, bodyWidth) => {
	if (typeof bodyWidth === "number" && typeof width === "number" && width <= bodyWidth)
		width = bodyWidth;
	return width;
} 

const flipArrow = (arrow, sourceDir, destDir) => {
	if (arrow) {
		const padding = parseInt(window.getComputedStyle(arrow).padding.split("px")[0]);
		if (typeof padding === "number" && !isNaN(padding)) {
			arrow.classList.remove(sourceDir);
			arrow.classList.add(destDir);
			if (destDir === "up")
				arrow.style.marginBottom = -2*padding+"px";
			else if (destDir === "down")
				arrow.style.marginBottom = -1*(padding-1)+"px";
		}
	}
}

const assignUponSubjects = list => {
	const type = list[Object.keys(list)[0]]["subject_type"];
	if (list && type) {
		chrome.storage.local.get(["wkhighlight_assignments"], result => {
			const allAssignments = result["wkhighlight_assignments"]["all"];
			if (allAssignments) {
				console.log(`Associating assignments with ${type} ...`);
				allAssignments.forEach(assignment => {
					const data = assignment["data"];
					const subjectId = data["subject_id"];
					if (subjectId && list[subjectId]) {
						const subject = list[subjectId];
						const timestamps = {
							data_updated_at: assignment["data_updated_at"],
							available_at: data["available_at"],
							burned_at: data["burned_at"],
							created_at: data["created_at"],
							passed_at: data["passed_at"],
							resurrected_at: data["resurrected_at"],
							started_at: data["started_at"],
							unlocked_at: data["unlocked_at"]
						}
						subject["timestamps"] = timestamps;
						subject["srs_stage"] = data["srs_stage"];
						subject["hidden"] = data["hidden"];
					}
				});
				let storageId;
				switch(type) {
					case "radical":
						storageId = "wkhighlight_allradicals";
						break;
					case "kanji":
						storageId = "wkhighlight_allkanji";
						break;
					case "vocabulary":
						storageId = "wkhighlight_allvocab";
						break;
				}
				if (storageId)
					chrome.storage.local.set({[storageId]:list});
			}
		});
	}
}

const revStatsUponSubjects = (apiToken, list) => {
	const type = list[Object.keys(list)[0]]["subject_type"];
	if (list && type) {
		console.log(`Associating review statistics with ${type} ...`);
		fetchAllPages(apiToken, "https://api.wanikani.com/v2/review_statistics")
			.then(stats => {
				stats.map(coll => coll["data"])
					.flat(1)
					.forEach(stat => {
						const data = stat["data"];
						const subjectId = data["subject_id"];
						if (subjectId && list[subjectId]) {
							const subject = list[subjectId];
							subject["stats"] = {
								meaning_correct: data["meaning_correct"],
								meaning_current_streak: data["meaning_current_streak"],
								meaning_incorrect: data["meaning_incorrect"],
								meaning_max_streak: data["meaning_max_streak"],
								percentage_correct: data["percentage_correct"],
								reading_correct: data["reading_correct"],
								reading_current_streak: data["reading_current_streak"],
								reading_incorrect: data["reading_incorrect"],
								reading_max_streak: data["reading_max_streak"]
							}
						}
					});
					let storageId;
					switch(type) {
						case "radical":
							storageId = "wkhighlight_allradicals";
							break;
						case "kanji":
							storageId = "wkhighlight_allkanji";
							break;
						case "vocabulary":
							storageId = "wkhighlight_allvocab";
							break;
					}
					if (storageId)
						chrome.storage.local.set({[storageId]:list});
			});
	}
}