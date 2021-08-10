/*
	GENERAL
*/

// GENERAL
const errorHandling = error => console.log(error);

// fetch a single page from the WaniKani API
const fetchPage = async (apiToken, page) => {				
	const requestHeaders = new Headers({Authorization: `Bearer ${apiToken}`});
	let apiEndpoint = new Request(page, {
		method: 'GET',
		headers: requestHeaders
	});

	return await fetch(apiEndpoint)
		.then(response => response.json())
		.then(responseBody => responseBody)
		.catch(errorHandling);
}

// recursive function to fetch all pages that come after a given page (given page included)
const fetchAllPages = async (apiToken, page) => {
	if (!page)
		return [];

	const result = await fetchPage(apiToken, page);
	return [result].concat(await fetchAllPages(apiToken, result.pages.next_url));
}

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

const setExactHour = (date, hour) => {
	return new Date(new Date(new Date(new Date(date).setHours(hour)).setMinutes(0)).setSeconds(0));
}

const nextExactHour = (date, hours) => {
	return new Date(new Date(new Date(new Date(date).setHours(new Date(date).getHours()+hours)).setMinutes(0)).setSeconds(0));
}

const changeDay = (date, days) => {
	return new Date(new Date().setDate((new Date(date).getDate())+days));
}

const setupReviewsDataForChart = (reviews, today, days, hoursAhead) => {
	const currentHour = today.getHours();
	let currentDay = today.getDate();
	const hours = [];
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

const updateChartReviewsOfDay = (reviews, chart, date, numberReviewsElement) => {
	const newDate = setExactHour(new Date(date), 0);
	chartRemoveData(chart, chart.data.labels.length);
	const nextReviews = filterAssignmentsByTime(reviews, newDate, changeDay(newDate, 1))
							.map(review => ({hour:new Date(review["available_at"]).getHours(), day:new Date(review["available_at"]).getDate(), srs:review["srs_stage"]}));
	console.log(nextReviews);
	const apprData = setupReviewsDataForChart(nextReviews.filter(review => review["srs"] > 0 && review["srs"] <= 4), newDate, 1, 0);
	const guruData = setupReviewsDataForChart(nextReviews.filter(review => review["srs"] == 5 || review["srs"] == 6), newDate, 1, 0);
	const masterData = setupReviewsDataForChart(nextReviews.filter(review => review["srs"] == 7), newDate, 1, 0);
	const enliData = setupReviewsDataForChart(nextReviews.filter(review => review["srs"] == 8), newDate, 1, 0);
	//const newData = setupReviewsDataForChart(nextReviews, newDate, 1, 0);
	chartAddData(chart, apprData["hours"], [apprData["reviewsPerHour"], guruData["reviewsPerHour"], masterData["reviewsPerHour"], enliData["reviewsPerHour"]]);
	const newDateDay = newDate.getDate();
	const dateIdentifier = `${newDate.getWeekDay()}, ${newDate.getMonthName()} ${newDateDay+ordinalSuffix(newDateDay)}`;
	chart.options.plugins.title.text = `Reviews on ${dateIdentifier}`;
	console.log(setupReviewsDataForChart(nextReviews, newDate, 1, 0));
	if (numberReviewsElement)
		numberReviewsElement.innerHTML = `<b>${setupReviewsDataForChart(nextReviews, newDate, 1, 0)["reviewsPerHour"].reduce((a,b) => a+b)}</b> Reviews on ${dateIdentifier}`;
	chart.update();
}

// check if the data in the endpoints has been modified since the given date
const modifiedSince = async (apiKey, date, url) => {
	var requestHeaders = new Headers();
	requestHeaders.append('Authorization', `Bearer ${apiKey}`);
	requestHeaders.append('Wanikani-Revision', '20170710');
	requestHeaders.append('If-Modified-Since', date);
	var requestInit = { method: 'GET', headers: requestHeaders };
	var endpoint = new Request(url, requestInit);

	return await fetch(endpoint)
		.then(response => {
			const result = response.status !== 304;
			console.log(response);
			console.log("MODIFIED: "+result);
			return result;
		
		})
		.catch(errorHandling);
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
		chrome.storage.local.remove(keysToRemove, () => alert("Local data cleared! This didn't affect your WaniKani account!"));
	});
}

const reposVersions = async (user, repos) => {
	return await fetch(`https://api.github.com/repos/${user}/${repos}/tags`).then(response => response.json()).then(body => body);
}

const reposFirstVersion = async (user, repos) => {
	return await reposVersions(user, repos).then(result => result[0].name);
}

const reposLastVersion = async (user, repos) => {
	return await reposVersions(user, repos).then(result => result[result.length-1].name);
}

const rand = (min, max) => {
	return Math.floor(Math.random() * (max - min) ) + min;
}