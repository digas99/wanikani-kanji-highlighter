// WANIKANI

// fetch a single page from the WaniKani API
const fetchPage = async (apiToken, page, updated) => {				
	const requestHeaders = new Headers({Authorization: `Bearer ${apiToken}`});
	if (updated) {
		// add updated_after to the url
		page += page.includes("?") ? "&" : "?";
		page += `updated_after=${convertToISO8601(updated)}`;
	}

	let apiEndpoint = new Request(page, {
		method: 'GET',
		headers: requestHeaders
	});

	return await fetch(apiEndpoint)
		.then(response => response.json())
		.then(responseBody => {
			const result = responseBody;
			if (result.error) {
				console.log(result.error);
				chrome.runtime.sendMessage({error: {
					message: result.error,
					code: result.code
				}});
			}
			return result;
		})
}

// recursive function to fetch all pages that come after a given page (given page included)
const fetchAllPages = async (apiToken, page, updated) => {
	if (!page) return [];

	if (updated) {
		const modified = await modifiedSince(apiToken, updated, page);
		if (!modified)
			return {error: {message: "Not modified", code: 304}};
	}

	const result = await fetchPage(apiToken, page, updated);
	
	if (result.error)
		return result;

	return [result].concat(await fetchAllPages(apiToken, result.pages.next_url));
}

// check if the data in the endpoints has been modified since the given date
const modifiedSince = async (apiKey, date, url) => {
	var requestHeaders = new Headers();
	requestHeaders.append('Authorization', `Bearer ${apiKey}`);
	requestHeaders.append('Wanikani-Revision', '20170710');
	requestHeaders.append('If-Modified-Since', date || new Date("1700 1 1").toUTCString());
	var requestInit = { method: 'GET', headers: requestHeaders };
	var endpoint = new Request(url, requestInit);
	return fetch(endpoint)
		.then(response => {
			const result = response.status != 429 && response.status !== 304;
			console.log("[MODIFIED]:", date, url, result);
			return result;
		
		});
}


// GITHUB
const reposVersions = async (user, repos) => {
	return await fetch(`https://api.github.com/repos/${user}/${repos}/tags`).then(response => response.json()).then(body => body);
}

const reposLatestVersion = async (user, repos) => {
	return await reposVersions(user, repos).then(result => result[0].name);
}

const reposOldestVersion = async (user, repos) => {
	return await reposVersions(user, repos).then(result => result[result.length-1].name);
}