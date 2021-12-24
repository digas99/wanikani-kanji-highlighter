const setupKanji = (apiToken, callback) => {
	fetchAllPages(apiToken, "https://api.wanikani.com/v2/subjects?types=kanji")
		.then(kanji_data => {
			const kanji_dict = {};
			const kanji_assoc = {};
			kanji_data.map(content => content.data)
				.flat(1)
				.forEach(kanji => {
					const data = kanji.data;
					kanji_dict[kanji.id] = {
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
						"subject_type":kanji.object
					};
					kanji_assoc[data.slug] = kanji.id;
				});
			// saving all kanji
			chrome.storage.local.set({"wkhighlight_allkanji": kanji_dict, "wkhighlight_kanji_assoc": kanji_assoc, "wkhighlight_allkanji_updated": formatDate(new Date())}, () => {
				console.log("SETUP KANJI");
				if (callback)
					callback(kanji_dict);	
			});
		})
		.catch(errorHandling);
}

const setupRadicals = (apiToken, callback) => {
	fetchAllPages(apiToken, "https://api.wanikani.com/v2/subjects?types=radical")
		.then(radical_data => {
			const radical_dict = {};
			radical_data.map(content => content.data)
				.flat(1)
				.forEach(radical => {
					const data = radical.data;
					radical_dict[radical.id] = {
						"characters" : data.characters,
						"character_images" : data.character_images,
						"document_url" : data.document_url,
						"level" : data.level,
						"id":radical.id,
						"meanings": data.meanings.map(data => data.meaning),
						"subject_type":radical.object
					};
				});
			// saving all radical
			chrome.storage.local.set({"wkhighlight_allradicals": radical_dict, "wkhighlight_allradicals_updated": formatDate(new Date())}, () => {
				console.log("SETUP RADICALS");
				if (callback)
					callback(radical_dict);
			});
		})
		.catch(errorHandling);
}

const setupVocab = (apiToken, callback) => {
	fetchAllPages(apiToken, "https://api.wanikani.com/v2/subjects?types=vocabulary")
		.then(vocab => {
			const vocab_dict = {};
			vocab.map(content => content.data)
				.flat(1)
				.forEach(vocab => {
					const data = vocab.data;
					vocab_dict[vocab.id] = {
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
						"subject_type":vocab.object
					};
				});
			// saving all vocabulary
			chrome.storage.local.set({'wkhighlight_allvocab':vocab_dict, "wkhighlight_allvocab_updated": formatDate(new Date())}, () => {
				console.log("SETUP VOCAB");
				if (callback)
					callback(vocab_dict);
			});
		})
		.catch(errorHandling);
}

const fetchUserInfo = (apiToken, callback) => {
	fetchPage(apiToken, "https://api.wanikani.com/v2/user")
		.then(user => {
			chrome.storage.local.set({"wkhighlight_userInfo":user, "wkhighlight_userInfo_updated":formatDate(new Date())});
			if (callback)
				callback(user);
		})
		.catch(errorHandling);
}

const setupAssignments = (apiToken, callback) => {
	fetchAllPages(apiToken, "https://api.wanikani.com/v2/assignments")
		.then(data => {
			const allAssignments = data.map(arr => arr["data"]).reduce((arr1, arr2) => arr1.concat(arr2));
			const allFutureAssignments = filterAssignmentsByTime(allAssignments, new Date(), null);
			const allAvailableReviews = filterAssignmentsByTime(allAssignments, new Date(), changeDay(new Date(), -1000));
			chrome.storage.local.set({"wkhighlight_assignments":{
				"all":allAssignments,
				"future":allFutureAssignments,
				"past":allAvailableReviews
			}, "wkhighlight_assignments_updated":formatDate(new Date())}, () => {
				if (callback)
					callback(data);
			});
		})
		.catch(errorHandling);
}

const setupAvailableAssignments = (apiToken, callback) => {
	fetchAllPages(apiToken, "https://api.wanikani.com/v2/assignments?immediately_available_for_lessons")
	.then(lessons => {
		fetchAllPages(apiToken, "https://api.wanikani.com/v2/assignments?immediately_available_for_review")
			.then(reviews => {
				console.log("REVIEWSSSSS", reviews);
				const countReviews = reviews[0]["total_count"];
				const countLessons = lessons[0]["total_count"];

				// get all assigments into one array
				reviews = Array.prototype.concat.apply([], reviews.map(assignments => assignments["data"]))
				lessons = Array.prototype.concat.apply([], lessons.map(assignments => assignments["data"]))
				chrome.storage.local.get(["wkhighlight_assignments"], result => {
					const assignments = result["wkhighlight_assignments"];
					if (lessons && reviews && assignments) {
						const updatedReviews = {
							"count":countReviews,
							"data":reviews,
							"next_reviews":filterAssignmentsByTime(assignments["future"], new Date(), changeDay(new Date(), 14))
						};
						const updatedLessons = {
							"count":countLessons,
							"data":lessons
						};
						chrome.storage.local.set({"wkhighlight_reviews": updatedReviews, "wkhighlight_lessons": updatedLessons}, () => {
							if (callback)
								callback(updatedReviews, updatedLessons);
						});
					}
				});
			});
	});
}