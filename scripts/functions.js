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
const formatWKDate = (date, type) => {
	const split = date.toString().split(" ");
	return `${split[0]}, ${split[2]} ${split[1]} ${split[3]} ${split[4]} GMT`;
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