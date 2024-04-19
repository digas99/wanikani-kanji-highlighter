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
const clearCache = async (keysToKeep) => {
	if (keysToKeep) {
		const dataToKeep = {};

		// Get the data from chrome.storage.local
		const data = await new Promise(resolve => {
			chrome.storage.local.get(keysToKeep, data => {
				resolve(data);
			});
		});
	
		keysToKeep.forEach(key => (dataToKeep[key] = data[key]));
	
		// Clear chrome.storage.local and set the data to keep
		await new Promise(resolve => {
			chrome.storage.local.clear(() => {
				chrome.storage.local.set(dataToKeep, () => {
					resolve();
				});
			});
		});
	}

}

const clearSubjects = async () => {
	await clearCache(["apiKey", "settings", "userInfo", "userInfo_updated"]);
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
	if (hCounter == 1)
		elem = document.createElement("p");
	else
		elem = document.createElement("h"+hCounter);

	// detect links headers
	let insideLink = false;
	let newLine = "";
	for (let i = 0; i < line.length; i++) {
		if (line.charAt(i) == ']') {
			line = newLine;
			break;
		}
		
		if (insideLink) newLine+=line.charAt(i);

		if (line.charAt(i) == '[') {
			if (i !== 1) break;

			insideLink = true;
		}
	}

	if (line == "---") line = "";

	if (lineText.charAt(0) === ' ')
		elem.style.paddingLeft = "10px";

	if (line.slice(0, 3) === "***") {
		elem.classList.add("md-extra-highlighted");
	}

	line = line.replaceAll('*', '');

	elem.appendChild(document.createTextNode(line));

	// if line has ([text](url)) issue format
	if (line.includes("](")) {
		const parts = line.split("](");
		const url = parts[1].split(")")[0];
		const text = parts[0].split("[")[1];
		const a = document.createElement("a");
		a.href = url;
		a.target = "_blank";
		a.appendChild(document.createTextNode(text));
		
		// remove that part from the line
		elem.innerHTML = elem.innerHTML.replace(`([${text}](${url}))`, "(");
		elem.appendChild(a);
		elem.innerHTML += ")";
	}

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
	console.log(width, bodyWidth);
	if (typeof bodyWidth === "number" && typeof width === "number" && width <= bodyWidth)
		width = bodyWidth;
	return width;
} 

const flipArrow = (arrow, sourceDir, destDir, paddingValue) => {
	if (arrow) {
		const padding = parseInt(paddingValue ? paddingValue : window.getComputedStyle(arrow).padding.split("px")[0]);
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

const setupRadicals = (radicals, records, radical) => {
	const data = radical["data"];

	radicals[radical.id] = {
		"characters" : data.characters,
		"character_images" : data.character_images,
		"document_url" : data.document_url,
		"level" : data.level,
		"id":radical.id,
		"meanings": data.meanings.map(data => data.meaning),
		"subject_type":radical.object,
		"hidden_at":data.hidden_at
	};

	records.push({
		"characters" : data.characters,
		"character_images" : data.character_images,
		"level" : data.level,
		"id":radical.id,
		"meanings": data.meanings.map(data => data.meaning),
		"subject_type":radical.object,
		"hidden_at":data.hidden_at,
		"srs_stage" : -1,
		"hidden" : null,
		"passed_at" : null,
		"available_at" : null
	});
}

const setupVocab = (vocabs, assocs, records, vocab) => {
	const data = vocab["data"];

	vocabs[vocab.id] = {
		"characters" : data.characters,
		"component_subject_ids" : data.component_subject_ids, 
		"context_sentences" : data.context_sentences,
		"document_url" : data.document_url,
		"level" : data.level,
		"meaning_mnemonic" : data.meaning_mnemonic,
		"meanings" : data.meanings.map(data => data.meaning),
		"parts_of_speech" : data.parts_of_speech,
		"reading_mnemonic" : data.reading_mnemonic,
		"readings" : data.readings.map(data => data.reading),
		"pronunciation_audios" : data.pronunciation_audios,
		"id":vocab.id,
		"subject_type":vocab.object,
		"hidden_at":data.hidden_at
	};

	records.push({
		"characters" : data.characters,
		"component_subject_ids" : data.component_subject_ids, 
		"level" : data.level,
		"meanings" : data.meanings.map(data => data.meaning),
		"readings" : data.readings.map(data => data.reading),
		"id":vocab.id,
		"subject_type":vocab.object,
		"hidden_at":data.hidden_at,
		"pronunciation_audios" : data.pronunciation_audios,
		"srs_stage" : -1,
		"hidden" : null,
		"passed_at" : null,
		"available_at" : null
	});

	assocs[data.characters] = vocab.id;
}

const setupKanaVocab = (vocabs, assocs, records, vocab) => {
	const data = vocab["data"];

	vocabs[vocab.id] = {
		"characters" : data.characters,
		"context_sentences" : data.context_sentences,
		"document_url" : data.document_url,
		"level" : data.level,
		"meaning_mnemonic" : data.meaning_mnemonic,
		"meanings" : data.meanings.map(data => data.meaning),
		"parts_of_speech" : data.parts_of_speech,
		"pronunciation_audios" : data.pronunciation_audios,
		"id":vocab.id,
		"subject_type":vocab.object,
		"hidden_at":data.hidden_at
	};

	records.push({
		"characters" : data.characters,
		"level" : data.level,
		"meanings" : data.meanings.map(data => data.meaning),
		"id":vocab.id,
		"subject_type":vocab.object,
		"hidden_at":data.hidden_at,
		"pronunciation_audios" : data.pronunciation_audios,
		"srs_stage" : -1,
		"hidden" : null,
		"passed_at" : null,
		"available_at" : null
	});

	assocs[data.characters] = vocab.id;
}

const setupKanji = (kanjis, assocs, records, kanji) => {
	const data = kanji["data"];

	kanjis[kanji.id] = {
		"amalgamation_subject_ids" : data.amalgamation_subject_ids,
		"characters" : data.characters,
		"component_subject_ids" : data.component_subject_ids,
		"document_url" : data.document_url,
		"level" : data.level,
		"meaning_hint" : data.meaning_hint,
		"meaning_mnemonic" : data.meaning_mnemonic,
		"meanings" : data.meanings.map(data => data.meaning),
		"reading_hint" : data.reading_hint,
		"reading_mnemonic" : data.reading_mnemonic,
		"readings" : data.readings,
		"visually_similar_subject_ids" : data.visually_similar_subject_ids,
		"slug": data.slug,
		"id":kanji.id,
		"subject_type":kanji.object,
		"hidden_at":data.hidden_at
	};
	
	records.push({
		"amalgamation_subject_ids" : data.amalgamation_subject_ids,
		"characters" : data.characters,
		"component_subject_ids" : data.component_subject_ids,
		"level" : data.level,
		"meanings" : data.meanings.map(data => data.meaning),
		"readings" : data.readings,
		"visually_similar_subject_ids" : data.visually_similar_subject_ids,
		"id" : kanji.id,
		"subject_type" : kanji.object,
		"hidden_at" : data.hidden_at,
		"srs_stage" : -1,
		"hidden" : null,
		"passed_at" : null
	});

	assocs[data.slug] = kanji.id;
}

let progress = 0, fetches = 0;

const loadEvent = new CustomEvent("loadData", {text: "", progress: progress, fetches: fetches});

const sendSetupProgress = (text, progress, tab) => {
	loadEvent.progress = progress;
	loadEvent.text = text;
	loadEvent.fetches = fetches;
	
	if (typeof window === "object")
		document.dispatchEvent(loadEvent);

	const messageData = {
		setup: {
			text: text,
			progress: progress/fetches,
			fetches: fetches
		}
	}
	chrome.storage.local.set({"fetching": {"text": text, "fetches": fetches, "progress": progress}});

	if (tab)
		chrome.tabs.sendMessage(tab, messageData);
	else
		chrome.runtime.sendMessage(messageData);

	evalProgress(progress, fetches);
}

// check if bulk fetch was done less than 1 minute ago
const canFetch = async () => {
	const bulkFetch = await new Promise(resolve => {
		chrome.storage.local.get(["bulk_fetch"], resolve);
	});
	return !bulkFetch["bulk_fetch"] || new Date().getTime() - bulkFetch["bulk_fetch"] > 60000;
}

const sizeToFetch = async apiToken => {
	return new Promise(resolve => {
		chrome.storage.local.get([RADICAL_SETUP.storage.updated, VOCAB_SETUP.storage.updated, KANA_VOCAB_SETUP.storage.updated, KANJI_SETUP.storage.updated, ASSIGNMENTS_SETUP.storage.updated, REVIEWSTATS_SETUP.storage.updated, LEVELS_STATS.storage.updated], async result => {
			const fetches = await Promise.all(
				[RADICAL_SETUP, VOCAB_SETUP, KANA_VOCAB_SETUP, KANJI_SETUP, ASSIGNMENTS_SETUP, REVIEWSTATS_SETUP, LEVELS_STATS]
				  .map(async setup => await modifiedSince(apiToken, result[setup.storage.updated], setup.endpoint))
			);
	
			const filteredFetches = fetches.filter(Boolean);
			resolve(filteredFetches.length);
		});
	});
}

const getTab = () => {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
            if (tabs && tabs.length > 0) {
                resolve(tabs[0]);
            } else {
				resolve(null);
            }
        });
    });
}

// get all assignments if there are none in storage or if they were modified
// see if all subjects are already saved in storage
const loadData = async (apiToken, tabId, callback) => {
	console.log("[LOADING]: Loading data ...");
	chrome.storage.local.get(["fetching", "assignments_updated", LEVELS_STATS.storage.updated], async response => {
		const fetching = response["fetching"];
		if (fetching) {
			// if fetching has ended
			if (fetching.progress >= fetching.fetches) {
				chrome.storage.local.remove("fetching");
				chrome.storage.local.set({"initialFetch": false});
				chrome.runtime.sendMessage({loading: false});
				progress = 0;
				fetches = 0;		
			}
			// if fetching, update progress and fetches and don't fetch again
			else {
				progress = fetching.progress
				fetches = fetching.fetches;
				return;
			}
		}
		// if not fetching anymore but initial fetch is still true
		else {
			if (response["assignments_updated"]) {
				chrome.storage.local.set({"initialFetch": false});
				chrome.runtime.sendMessage({loading: false});
				progress = 0;
				fetches = 0;		
			}
		}

		const returnObject = (assignments, radicals, vocab, kana_vocabulary, kanji) => ({
				assignments: assignments,
				radicals: radicals,
				vocab: vocab,
				kana_vocabulary: kana_vocabulary,
				kanji: kanji
		});
	
		// get number of fetches that will be done
		fetches = await sizeToFetch(apiToken); 
		console.log("[FETCHES]: ", fetches);
		
		if (fetches > 0) {
			chrome.storage.local.set({"fetching": {"fetches": fetches, "progress": 0}}).then(() => chrome.alarms.create("fetching-timeout", {delayInMinutes: 3}));
			chrome.runtime.sendMessage({loading: true, setup: {fetches: fetches}});
		}
		else {
			let assignments = await new Promise(resolve => chrome.storage.local.get(["assignments"], result => resolve(result["assignments"])));
			if (assignments)
				setupAvailableAssignments(apiToken, (reviews, lessons) => chrome.runtime.sendMessage({reviews: reviews, lessons: lessons}));
	
			if (!callback)
				return;
		}		

		// levels stats
		if (!response[LEVELS_STATS.storage.updated] || modifiedSince(apiToken, response[LEVELS_STATS.storage.updated], LEVELS_STATS.endpoint)) {
			await fetchAllPages(apiToken, LEVELS_STATS.endpoint).then(async result => {
				const entries = result.map(coll => coll["data"]).flat(1);
				const levelsStats = entries.map(entry => entry.data).reduce((acc, obj) => {
					if (!acc[obj.level])
						acc[obj.level] = [];
					
					acc[obj.level].push(obj);
					return acc;
				}, {});

				await new Promise(resolve => {
					chrome.storage.local.set({
						[LEVELS_STATS.storage.updated]: new Date().toUTCString(),
						[LEVELS_STATS.storage.id]: levelsStats
					}, resolve);
				});

				const messageText = "✔ Loaded Level Stats.";
				console.log("[LOADED]:", messageText);
				progress++;
				sendSetupProgress(messageText, progress, tabId);
			});

			evalProgress(progress, fetches);
		}

		// assignments
		const result = await setupAssignments(apiToken);
		assignments = result[0];
		const fetched = result[1];

		const [reviews, lessons] = await setupAvailableAssignments(apiToken);
		chrome.runtime.sendMessage({reviews: reviews, lessons: lessons});
		
		const messageText = "✔ Loaded Assignments data.";
		console.log("[LOADED]:", messageText);
		if (fetched) {
			progress++;
			sendSetupProgress(messageText, progress, tabId);
		}	
	
		evalProgress(progress, fetches);
	
		const setups = [
			// radicals
			new Promise(async (resolve, reject) => {
				const result = await setupSubjects(apiToken, RADICAL_SETUP, (subjects, assocs, records, subject) => setupRadicals(subjects, records, subject));
				const [radicals, fetched] = result;
				
				await subjectsAssignmentStats(radicals);	
	
				resolve(radicals);
				
				const messageText = "✔ Loaded Radicals data.";
				console.log("[LOADED]:", messageText);
				if (fetched) {
					progress++;
					sendSetupProgress(messageText, progress, tabId);
				}
	
				evalProgress(progress, fetches);
			}),
			// vocabulary
			new Promise(async (resolve, reject) => {
				const result = await setupSubjects(apiToken, VOCAB_SETUP, (subjects, assocs, records, subject) => setupVocab(subjects, assocs, records, subject));
				const [vocab, fetched] = result;
	
				await subjectsAssignmentStats(vocab);	
	
				resolve(vocab);
				
				const messageText = "✔ Loaded Vocabulary data.";
				console.log("[LOADED]:", messageText);
				if (fetched) {
					progress++;
					sendSetupProgress(messageText, progress, tabId);
				}
			
				evalProgress(progress, fetches);
			}),
			// kana vocabulary
			new Promise(async (resolve, reject) => {
				const result = await setupSubjects(apiToken, KANA_VOCAB_SETUP, (subjects, assocs, records, subject) => setupKanaVocab(subjects, assocs, records, subject));
				const [vocab, fetched] = result;
	
				await subjectsAssignmentStats(vocab);	
	
				resolve(vocab);
				
				const messageText = "✔ Loaded Kana Vocabulary data.";
				console.log("[LOADED]:", messageText);
				if (fetched) {
					progress++;
					sendSetupProgress(messageText, progress, tabId);
				}
	
				evalProgress(progress, fetches);
			}),
			// kanji
			new Promise(async (resolve, reject) => {
				const result = await setupSubjects(apiToken, KANJI_SETUP, (subjects, assocs, records, subject) => setupKanji(subjects, assocs, records, subject));
				const [kanji, fetched] = result;
	
				await subjectsAssignmentStats(kanji);	
	
				resolve(kanji);
				
				const messageText = "✔ Loaded Kanji data.";
				console.log("[LOADED]:", messageText);
				if (fetched) {
					progress++;
					sendSetupProgress(messageText, progress, tabId);
				}
	
				evalProgress(progress, fetches);
			})
		];
		
		Promise.all(setups).then(async results => {
			// add bulk fetch timestamp to storage
			chrome.storage.local.set({bulk_fetch: new Date().getTime()});
			if (callback)
				callback(returnObject(assignments, results[0], results[1], results[2], results[3]));
	
			const fetched = await subjectsReviewStats(apiToken, results);
			const messageText = "✔ Loaded Review Statistics data.";
			console.log("[LOADED]:", messageText);
			if (fetched) {
				progress++;
				sendSetupProgress(messageText, progress, tabId);
			}
	
			evalProgress(progress, fetches);
		});
	});
}

const evalProgress = (progress, fetches) => {
	if (progress >= fetches) {
		progress = 0;
		fetches = 0;
	}
}

const subjectsAssignmentStats = async list => {
	if (list) {
		const type = list[Object.keys(list)[0]]["subject_type"];
        const db = new Database("wanikani");
        const opened = await db.open("subjects");

        if (opened) {
            const result = await new Promise(resolve => {
                chrome.storage.local.get("assignments", resolve);
            });

            const allAssignments = result["assignments"]["all"];
            const progress = Object.fromEntries(Object.keys(srsStages).map(stage => [stage, 0]));
            const levelsInProgress = [];

            if (allAssignments) {
                console.log(`[ASSIGNMENTS]: Associating assignments with ${type} ...`);

                const updatePromises = allAssignments.map(assignment => {
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
                        };
                        subject["timestamps"] = timestamps;
                        subject["srs_stage"] = data["srs_stage"];
                        subject["hidden"] = data["hidden"];
                        progress[data["srs_stage"]]++;
					
						if (!data["passed_at"] && !levelsInProgress.includes(subject["level"])) {
							levelsInProgress.push(subject["level"]);
						}

                        return db.get("subjects", subjectId).then(result => {
                            if (result) {
                                ["srs_stage", "hidden", "passed_at", "available_at"].forEach(key => result[key] = data[key]);
                                return db.update("subjects", result);
                            }
                        });
                    }
                });

                await Promise.all(updatePromises);

				const storageData = {
					[type]: list,
					["" + type + "_progress"]: progress,
					["" + type + "_levelsInProgress"]: levelsInProgress
				};
				await new Promise(resolve => {
					chrome.storage.local.set(storageData, resolve);
				});
            }
        }
    }
}

const subjectsReviewStats = async (apiToken, lists) => {
	return new Promise(async (resolve) => {
		chrome.storage.local.get("reviewStats_updated", async result => {
			const updated = result["reviewStats_updated"];
			const stats = await fetchAllPages(apiToken, "https://api.wanikani.com/v2/review_statistics", updated);

			if (stats.error) {
				resolve(false);
				return;
			}

			console.log(lists);
			for (const list of lists) {
				const type = list[Object.keys(list)[0]]["subject_type"];
				console.log(`[REVIEW STATS]: Associating review statistics with ${type} ...`);

				stats.map(coll => coll["data"]).flat(1).forEach(stat => {
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
						};
					}
				});

				chrome.storage.local.set({ [type]: list }, () => console.log(`[REVIEW STATS]: ${type} updated`));
			}

			chrome.storage.local.set({ reviewStats_updated: new Date().toUTCString() }, () => resolve(true));
		});
	});
}

const blacklist = async url => {
	if (!url) {
		url = await new Promise(resolve => {
			chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
				activeTab = tabs[0];
				chrome.tabs.sendMessage(activeTab.id, {windowLocation: "host"}, response => {
					if (!window.chrome.runtime.lastError && response["windowLocation"])
						resolve(response["windowLocation"]);
					else
						resolve(null);
				});
			});
		});
	}

    const blacklistData = await new Promise(resolve => {
        chrome.storage.local.get(["blacklist"], blacklist => {
            resolve(blacklist);
        });
    });

    let blacklistedUrls = blacklistData["blacklist"] ? blacklistData["blacklist"] : [];
    blacklistedUrls.push(url.replace("www.", "").replace(".", "\\."));
    
    chrome.storage.local.set({"blacklist": [...new Set(blacklistedUrls)]});
}

const blacklistRemove = url => {
	return new Promise(resolve => {
		chrome.storage.local.get(["blacklist"], data => {
			const blacklist = data["blacklist"];
			const index = blacklist.indexOf(url.replace("www.", "").replace(".", "\\."));
			if (index > -1) {
				blacklist.splice(index, 1);
				chrome.storage.local.set({"blacklist":blacklist});
				resolve(blacklist.length);
			} else
				resolve(-1);
		});
	});
}

const blacklisted = (blacklist, url) => {
	if (blacklist && blacklist.length > 0) {
		const regex = new RegExp(`^http(s)?:\/\/(www\.)?(${blacklist.join("|")})(\/)?([a-z]+.*)?`, "g");
		return regex.test(url);
	}
	return false;
}

const dataTile = (subjects, elem, value) => {
	console.log(subjects, elem);
	const subject = subjects.find(subject => 
		subject["characters"] === value ||
		subject?.character_images?.find(image => image["url"] == elem.querySelector("image")?.getAttribute("src")));
		
	if (subject) {
		const meaning = subject["meanings"][0];
		let reading = subject["readings"] ? subject["readings"][0] : subject["readings"];
		if (reading && typeof reading !== "string")
			reading = subject["readings"].find(reading => reading["primary"])["reading"];

		const type = subject["subject_type"];

		if (type !== "radical")
			elem.classList.add("kanjiDetails");

		elem.title = `${meaning} ${reading ? `| ${reading}` : ""}\x0D${type.split("_").map(word => word[0].toUpperCase() + word.slice(1)).join(" ")}`;
		elem.setAttribute("data-item-id", subject["id"]);
	}
}

const headerSRSDecoration = (header, srs) => {
	const egg = document.createElement("div");
	egg.classList.add("srsTitleEgg");
	if (srs > 4 && srs < 7)
		egg.style.backgroundPositionX = "-22px";
	if (srs == 7)
		egg.style.backgroundPositionX = "-45px";
	if (srs == 8)
		egg.style.backgroundPositionX = "-67px";

	header.insertBefore(egg, header.firstChild);
}

const headerSubjectDecoration = (header, type) => {
	const typeElem = document.createElement("span");
	header.insertBefore(typeElem, header.firstChild);
	typeElem.style.fontWeight = "bold";
	let text;
	switch(type) {
		case "radical":
			text = "部首";
			break;
		case "kanji":
			text = "漢字";
			break;
		case "vocabulary":
		case "kana_vocabulary":
			text = "単語";
			break;
	}
	typeElem.textContent = text;
}

const getCharacter = subject => {
	if (subject["characters"])
		return subject["characters"];
	else {
		const imageUrl = subject["character_images"]?.find(image => image["content_type"] == "image/svg+xml")["url"];
		if (imageUrl) {
			return `<svg style="width: 23px; height: 23px; filter: invert(1);">       
				<image xlink:href="${imageUrl}" src="${imageUrl}" width="22" height="22"></image>    
			</svg>`;
		}

		return "";
	}
}

const progressionStats = (wrapper, progresses, colors, line, menuCallback) => {
	let row, stageValue, stageColor;
	console.log(progresses);

	// clear stats beforehand if needed
	if (wrapper) wrapper.innerHTML = "";

	Object.keys(srsStages).forEach(stage => {
		stageValue = Object.keys(progresses).reduce((acc, type) => {
			if (progresses[type] && progresses[type][stage])
				acc += progresses[type][stage];
			return acc;
		}, 0);

		stageColor = colors ? colors[srsStages[stage]["short"].toLowerCase()+"_color"] : srsStages[stage]["color"];

		if (stage % line == 0) {
			row = document.createElement("ul");
			wrapper.appendChild(row);
		}

		const stageSquareWrapper = document.createElement("li");
		row.appendChild(stageSquareWrapper);
		const stageSquare = document.createElement("div");
		stageSquareWrapper.appendChild(stageSquare);
		stageSquare.classList.add("clickable");
		const stageLink = document.createElement("a");
		stageSquare.title = srsStages[stage]["name"];
		stageSquare.style.backgroundColor = stageColor;
		stageLink.href = "/popup/progressions.html?srs="+stage;
		stageSquare.appendChild(stageLink);
		stageLink.appendChild(document.createTextNode(stageValue));

		const infoMenu = progressionMenu(stage, progresses, stageValue, {stage: stageColor, type: colors});
		stageSquareWrapper.appendChild(infoMenu);

		if (menuCallback)
			menuCallback(infoMenu, stage);

		stageSquareWrapper.addEventListener("mouseover", () => infoMenu.classList.remove("hidden"));
		stageSquareWrapper.addEventListener("mouseout", () => infoMenu.classList.add("hidden"));
	});
}

const progressionMenu = (stage, progresses, value, colors) => {
	const infoMenu = document.createElement("div");
	infoMenu.classList.add("progression-menu", "hidden");
	const infoMenuTitle = document.createElement("p");
	infoMenu.appendChild(infoMenuTitle);
	infoMenuTitle.appendChild(document.createTextNode(srsStages[stage]["name"]));
	infoMenuTitle.style.color = colors.stage;
	const infoMenuBar = document.createElement("div");
	infoMenu.appendChild(infoMenuBar);
	const infoMenuListing = document.createElement("ul");
	infoMenu.appendChild(infoMenuListing);
	["Radical", "Kanji", "Vocabulary"].forEach(type => {
		let typeProgress = progresses[type.toLowerCase()];

		const bar = document.createElement("div");
		infoMenuBar.appendChild(bar);
		bar.style.width = (typeProgress && typeProgress[stage] ? typeProgress[stage] / value *100 : 0)+"%";
		const colorId = (type == "Radical" ? "radical" : type == "Kanji" ? "kanji" : "vocab")+"_color";
		bar.style.backgroundColor = colors.type[colorId];

		const infoMenuType = document.createElement("li");
		infoMenuListing.appendChild(infoMenuType);
		const typeTitle = document.createElement("b");
		infoMenuType.appendChild(typeTitle);
		typeTitle.appendChild(document.createTextNode(type+": "));
		infoMenuType.appendChild(document.createTextNode(typeProgress && typeProgress[stage] ? typeProgress[stage] : 0));
	});

	return infoMenu;
}

const progressionBar = (wrapper, progresses, size, colors) => {
	let unlockedSize = 0, stageValue, stageColor;

	// clear bar beforehand if needed
	if (wrapper) wrapper.innerHTML = "";

	Object.keys(srsStages).forEach(stage => {
		stageValue = Object.keys(progresses).reduce((acc, type) => {
			if (progresses[type] && progresses[type][stage])
				acc += progresses[type][stage];
			return acc;
		}, 0);
		
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
			const progressBarLink = document.createElement("a");
			progressBarBar.appendChild(progressBarLink);
			progressBarLink.href = "/popup/progressions.html?srs="+stage;
			if (percentageValue > 8.1) {
				const percentage = document.createElement("div");
				progressBarLink.appendChild(percentage);
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
	lockedSubjectsBar.style.backgroundColor = "white";
	lockedSubjectsBar.title = "Locked: "+(size-unlockedSize)+" / "+percentageValue.toFixed(1)+"%";
	const progressBarLink = document.createElement("a");
	lockedSubjectsBar.appendChild(progressBarLink);
	progressBarLink.href = "/popup/progressions.html?srs="+-1;
	if (percentageValue > 8.1) {
		const percentage = document.createElement("div");
		progressBarLink.appendChild(percentage);
		percentage.appendChild(document.createTextNode(percentageValue.toFixed(percentageValue > 11 ? 1 : 0)+"%"));
	}
}

const levelProgressBar = (currentLevel, values, level, type, colors) => {
	const all = values.length;
	const passed = values.filter(subject => subject["passed_at"]).length;
	const notPassed = values.filter(subject => !subject["passed_at"]);
	const locked = notPassed.filter(subject => subject["srs_stage"] == -1).length;

	const progressBarWrapper = document.createElement("ul");

	// set order value
	const levelValue = Number(level);
	progressBarWrapper.setAttribute("data-order", levelValue);

	// bar for passed
	progressBarWrapper.appendChild(levelProgressBarSlice(passed/all*100, {background: "black", text: "white"}, "Passed: "+passed, {level: level, type: type, srs: "passed"}));

	// traverse from initiate until apprentice IV
	for (let i = 5; i >= 0; i--) {
		const stageSubjects = notPassed.filter(subject => subject["srs_stage"] == i).length;
		progressBarWrapper.appendChild(levelProgressBarSlice(stageSubjects/all*100, {background: colors[srsStages[i]["short"].toLowerCase()+"_color"], text: "white"}, srsStages[i]["name"]+": "+stageSubjects, {level: level, type: type, srs: srsStages[i]["name"]}));
	}

	// bar for locked
	progressBarWrapper.appendChild(levelProgressBarSlice(locked/all*100, {background: "white", text: "black"}, "Locked: "+locked, {level: level, type: type, srs: "locked"}));

	// bar id
	const barTitle = document.createElement("div");
	progressBarWrapper.appendChild(barTitle);
	barTitle.classList.add("clickable", "bar-id");
	barTitle.title = "Level: "+all;
	const barLink = document.createElement("a");
	barTitle.appendChild(barLink);
	barLink.href = "/popup/progressions.html?level="+level+"&type="+type;
	barLink.appendChild(document.createTextNode(levelValue+" "+type.charAt(0).toUpperCase()+type.substring(1, 3)));

	// levelup marker
	if (type == "kanji" && levelValue == currentLevel)
		progressBarWrapper.appendChild(levelUpMarker(all));

	return progressBarWrapper;
}

const levelProgressBarSlice = (value, color, title, info) => {
	const {level, type, srs} = info;

	const progressBarBar = document.createElement("li");
	progressBarBar.classList.add("clickable");
	const percentageValue = value;
	progressBarBar.style.width = percentageValue+"%";
	progressBarBar.style.backgroundColor = color["background"];
	progressBarBar.title = title;
	progressBarLink = document.createElement("a");
	progressBarBar.appendChild(progressBarLink);
	progressBarLink.href = `/popup/progressions.html?level=${level}&type=${type}&jump=${srs}`;
	if (percentageValue > 8.1) {
		const percentage = document.createElement("div");
		progressBarLink.appendChild(percentage);
		percentage.style.color = color["text"];
		percentage.appendChild(document.createTextNode(percentageValue.toFixed(percentageValue > 11 ? 1 : 0)+"%"));
	}
	return progressBarBar;
}

const levelUpMarker = numberKanji => {
	const levelupMarkerWrapper = document.createElement("div");
	levelupMarkerWrapper.classList.add("levelup-marker");
	levelupMarkerWrapper.style.width = "87%";
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

const notFound = (title) => {
	const wrapper = document.createElement("div");
	wrapper.classList.add("not-found");
	const kanji = document.createElement("p");
	wrapper.appendChild(kanji);
	kanji.appendChild(document.createTextNode("金"));
	const text = document.createElement("p");
	wrapper.appendChild(text);
	text.appendChild(document.createTextNode(title));
	return wrapper;
}


const setupReviewsAlarm = reviews => {
	if (reviews && reviews["next_reviews"]) {
		const next_date = setNextReviewsBundle(reviews["next_reviews"])["date"];
		if (next_date) {
			// create alarm for the time of the next reviews
			chrome.alarms.create("next-reviews", {
				when: next_date.getTime()
			});
			return next_date;
		}
	}
}

const setupPracticeAlarm = time => {
	time = time?.split(":");
	if (time?.length === 2) {
		let date = new Date(setExactHour(new Date(), time[0]).getTime() + time[1]*60000);
		if (date?.getTime() <= new Date().getTime()) date = changeDay(date, 1);
		if (date) {
			chrome.alarms.create("practice", {
				when: date.getTime(),
				periodInMinutes: 1440
			});
			console.log("[PRACTICE]: Alarm set for", date);
			return date;
		}
	}
}

const setNextReviewsBundle = next_reviews => {
	const next_revs_dates = next_reviews.map(review => new Date(review["available_at"]));
	const next_date = new Date(Math.min.apply(null, next_revs_dates));
	const next_revs = filterAssignmentsByTime(next_reviews, new Date(), next_date);

	chrome.storage.local.set({"next-reviews-bundle":next_revs});

	return {
		date: next_date,
		reviews: next_revs
	}
}

const playSubjectAudio = (audioList, wrapper) => {
	if (audioList && audioList.length > 0) {
		const audio = new Audio();
		audio.src = audioList[Math.floor(Math.random() * audioList.length)].url;
		const play = audio.play();
		if (play !== undefined) {
			play.then(() => console.log("Audio played"))
			.catch(e => {
				let failAudioPlay;
				if (wrapper.getElementsByClassName("fail-audio-play").length == 0) {
					wrapper.getElementsByClassName("fail-audio-play");
					failAudioPlay = document.createElement("div");
					wrapper.appendChild(failAudioPlay);
					failAudioPlay.classList.add("fail-audio-play");
					failAudioPlay.appendChild(document.createTextNode("Could not play audio"));
					console.log("Could not play audio!");

					setTimeout(() => failAudioPlay.remove(), 1500);
				}
			});
		}
	}
}

const copyToClipboard = async (text, wrapper) => {
	if (window.navigator.clipboard) {
		await window.navigator.clipboard.writeText(text);
		Array.from(document.getElementsByClassName("copiedMessage")).forEach(elem => elem.remove());
		const copiedMessage = document.createElement("div");
		wrapper.parentElement.appendChild(copiedMessage);
		copiedMessage.appendChild(document.createTextNode("Copied!"));
		copiedMessage.classList.add("copiedMessage");
		copiedMessage.style.color = "gray";
		copiedMessage.style.fontSize = "12px";
		setTimeout(() => copiedMessage.remove(), 1500);
	}
}