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
const clearCache = () => {
	chrome.storage.local.get(null, data => {
		let keysToRemove = [];
		Object.keys(data).forEach(key => {
			if (/^.*/g.test(key)) {
				keysToRemove.push(key);
			}
		});
		if (typeof window !== 'undefined')
			window.location.reload();
		chrome.storage.local.remove(keysToRemove);
	});
}

const clearSubjects = async () => {
	// get data to keep (it's easier than to pick the ones to remove)
	chrome.storage.local.get(null, async data => {
		const keysToKeep = ["apiKey", "settings", "userInfo", "userInfo_updated"];
		let dataToKeep = {};
		keysToKeep.forEach(key => dataToKeep[key] = data[key]);
		chrome.storage.local.clear(async () => {
			console.log("cleared");
			chrome.storage.local.set(dataToKeep);

			const db = new Database("wanikani");
			await db.create("subjects");
			await db.delete("subjects");

			if (typeof window !== 'undefined')
				window.location.reload();
		});
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
		"srs_stage" : null,
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
		"srs_stage" : null,
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
		"srs_stage" : null,
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
		"srs_stage" : null,
		"hidden" : null,
		"passed_at" : null
	});

	assocs[data.slug] = kanji.id;
}

let progress = 0, fetches = 0;

const sendSetupProgress = (text, progress, tab) => {
	const messageData = {
		setup: {
			text: text,
			progress: progress,
		}
	}
	if (tab)
		chrome.tabs.sendMessage(tab, messageData);
	else
		chrome.runtime.sendMessage(messageData);
}

const handleSubjectsResult = async (message, subjects, key) => {
	console.log("SUBJECTS: ", subjects);
	if (subjects && key) {
		await assignUponSubjects(subjects);
		await revStatsUponSubjects(key, subjects);
	}

	progress++;
	sendSetupProgress(message.text, progress/fetches, message.tab);
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
		chrome.storage.local.get([RADICAL_SETUP.storage.updated, VOCAB_SETUP.storage.updated, KANA_VOCAB_SETUP.storage.updated, KANJI_SETUP.storage.updated, ASSIGNMENTS_SETUP.storage.updated], async result => {
			const fetches = await Promise.all(
				[RADICAL_SETUP, VOCAB_SETUP, KANA_VOCAB_SETUP, KANJI_SETUP, ASSIGNMENTS_SETUP]
				  .map(async setup => await modifiedSince(apiToken, result[setup.storage.updated], setup.endpoint))
			);
			console.log(fetches);
	
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
                reject(new Error("No active tab found."));
            }
        });
    });
}

// get all assignments if there are none in storage or if they were modified
// see if all subjects are already saved in storage
const loadData = async (apiToken, tabId, callback) => {
	const returnObject = (assignments, radicals, vocab, kana_vocab, kanji) => ({
			assignments: assignments,
			radicals: radicals,
			vocab: vocab,
			kana_vocab: kana_vocab,
			kanji: kanji
	});

	/*
	if (!await canFetch()) {
		// use data from storage
		if (callback) {
			chrome.storage.local.get([ASSIGNMENTS_SETUP.storage.id, RADICAL_SETUP.storage.id, VOCAB_SETUP.storage.id, KANA_VOCAB_SETUP.storage.id, KANJI_SETUP.storage.id], result => {
				callback(returnObject(result[ASSIGNMENTS_SETUP.storage.id], result[RADICAL_SETUP.storage.id], result[VOCAB_SETUP.storage.id], result[KANA_VOCAB_SETUP.storage.id], result[KANJI_SETUP.storage.id]));
			});
		}
		return;
	}	
	*/			

	// get number of fetches that will be done
	fetches = await sizeToFetch(apiToken); 
	console.log("fetches: ", fetches);
		
	// assignments
	const result = await setupAssignments(apiToken);
	const assignments = result[0];
	const fetched = result[1];			
	
	const messageText = "✔ Loaded Assignments data.";
	console.log(messageText);
	if (fetched) {
		await handleSubjectsResult({
			text: messageText,
			tab: tabId
		});
	}	
	

	const setups = [
		// radicals
		new Promise(async (resolve, reject) => {
			const result = await setupSubjects(apiToken, RADICAL_SETUP, (subjects, assocs, records, subject) => setupRadicals(subjects, records, subject));
			const [radicals, fetched] = result;
			
			resolve(radicals);

			const messageText = "✔ Loaded Radicals data.";
			console.log(messageText);
			if (fetched) {
				await handleSubjectsResult({
					text: messageText,
					tab: tabId
				}, radicals, apiToken);
			}
		}),
		// vocabulary
		new Promise(async (resolve, reject) => {
			const result = await setupSubjects(apiToken, VOCAB_SETUP, (subjects, assocs, records, subject) => setupVocab(subjects, assocs, records, subject));
			const [vocab, fetched] = result;

			resolve(vocab);

			const messageText = "✔ Loaded Vocabulary data.";
			console.log(messageText);
			if (fetched) {
				await handleSubjectsResult({
					text: messageText,
					tab: tabId
				}, vocab, apiToken);
			}
		}),
		// kana vocabulary
		new Promise(async (resolve, reject) => {
			const result = await setupSubjects(apiToken, KANA_VOCAB_SETUP, (subjects, assocs, records, subject) => setupKanaVocab(subjects, assocs, records, subject));
			const [vocab, fetched] = result;

			resolve(vocab);

			const messageText = "✔ Loaded Kana Vocabulary data.";
			console.log(messageText);
			if (fetched) {
				await handleSubjectsResult({
					text: messageText,
					tab: tabId
				}, vocab, apiToken);
			}
		}),
		// kanji
		new Promise(async (resolve, reject) => {
			const result = await setupSubjects(apiToken, KANJI_SETUP, (subjects, assocs, records, subject) => setupKanji(subjects, assocs, records, subject));
			const [kanji, fetched] = result;

			resolve(kanji);
			
			const messageText = "✔ Loaded Kanji data.";
			console.log(messageText);
			if (fetched) {
				await handleSubjectsResult({
					text: messageText,
					tab: tabId
				}, kanji, apiToken);
			}
		})
	];
	
	Promise.all(setups).then(results => {
		// add bulk fetch timestamp to storage
		chrome.storage.local.set({bulk_fetch: new Date().getTime()});

		if (callback) {
			callback(returnObject(assignments, results[0], results[1], results[2], results[3]));
		}
	});
}

const assignUponSubjects = async list => {
	console.log("Assigning subjects ...", list);
    const type = list[Object.keys(list)[0]]["subject_type"];
    if (list && type) {
        const db = new Database("wanikani");
        const created = await db.create("subjects");

        if (created) {
            const result = await new Promise(resolve => {
                chrome.storage.local.get("assignments", resolve);
            });

            const allAssignments = result["assignments"]["all"];
            const progress = Object.fromEntries(Object.keys(srsStages).map(stage => [stage, 0]));
            const levelsInProgress = [];

            if (allAssignments) {
                console.log(`Associating assignments with ${type} ...`);

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

                let storageId;
                switch (type) {
                    case "radical":
                        storageId = "allradicals";
                        break;
                    case "kanji":
                        storageId = "allkanji";
                        break;
                    case "vocabulary":
                        storageId = "allvocab";
                        break;
                }

                if (storageId) {
                    const storageData = {
                        [storageId]: list,
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
}

const revStatsUponSubjects = async (apiToken, list) => {
	const type = list[Object.keys(list)[0]]["subject_type"];
	if (list && type) {
		console.log(`Associating review statistics with ${type} ...`);
		await fetchAllPages(apiToken, "https://api.wanikani.com/v2/review_statistics")
			.then(stats => {
				console
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
							storageId = "allradicals";
							break;
						case "kanji":
							storageId = "allkanji";
							break;
						case "vocabulary":
							storageId = "allvocab";
							break;
					}
					if (storageId)
						chrome.storage.local.set({[storageId]:list});
			});
	}
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
			const index = blacklist.indexOf(url.replace(".", "\\."));
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