const setupKanji = (apiToken, callback) =>
	new Promise((resolve, reject) => {
		chrome.storage.local.get(['wkhighlight_allkanji', 'wkhighlight_allkanji_updated'], result => {
			const kanjiUpdated = result["wkhighlight_allkanji_updated"] ? result["wkhighlight_allkanji_updated"] : formatDate(new Date());
			modifiedSince(apiToken, kanjiUpdated, "https://api.wanikani.com/v2/subjects?types=kanji")
				.then(modified => {
					if (!result['wkhighlight_allkanji'] || modified) {
						fetchAllPages(apiToken, "https://api.wanikani.com/v2/subjects?types=kanji")
							.then(kanji_data => {
								const kanji_dict = {};
								const kanji_assoc = {};
								const levels = {};
								kanji_data.map(content => content.data)
									.flat(1)
									.forEach(kanji => {
										const data = kanji.data;
										if (!levels["wkhighlight_kanji_level"+data.level])
											levels["wkhighlight_kanji_level"+data.level] = {};

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
										levels["wkhighlight_kanji_level"+data.level][kanji.id] = {
											"characters" : data.characters,
											"id":kanji.id,
											"meanings" : data.meanings.map(data => data.meaning),
											"readings" : data.readings
										};
									});

								// add jlpt info to kanjis
								for (const n in jlpt) {
									jlpt[n].forEach(kanji => kanji_dict[kanji_assoc[kanji]]["jlpt"] = n.toUpperCase());
								}

								// add joyo info to kanjis
								for (const n in joyo) {
									joyo[n].forEach(kanji => kanji_dict[kanji_assoc[kanji]]["joyo"] = "Grade "+n.charAt(1));
								}
								// saving all kanji
								chrome.storage.local.set({...{"wkhighlight_allkanji": kanji_dict, "wkhighlight_kanji_assoc": kanji_assoc, "wkhighlight_allkanji_updated": formatDate(new Date())}, ...levels}, () => {
									console.log("Setup Kanji...");
									resolve([kanji_dict, true]);
									if (callback)
										callback(kanji_dict, true);	
								});
							})
							.catch(reject);
					}
					else {
						resolve([result['wkhighlight_allkanji'], false]);
						if (callback)
							callback(result['wkhighlight_allkanji'], false);
					}
				});
		});
	});

const setupRadicals = (apiToken, callback) => 
	new Promise((resolve, reject) => {
		chrome.storage.local.get(['wkhighlight_allradicals', 'wkhighlight_allradicals_updated'], result => {
			const radicalsUpdated = result["wkhighlight_allradicals_updated"] ? result["wkhighlight_allradicals_updated"] : formatDate(new Date());
			modifiedSince(apiToken, radicalsUpdated, "https://api.wanikani.com/v2/subjects?types=radical")
				.then(modified => {
					if (!result['wkhighlight_allradicals'] || modified) {
						fetchAllPages(apiToken, "https://api.wanikani.com/v2/subjects?types=radical")
							.then(radical_data => {
								const radical_dict = {};
								const levels = {};
								radical_data.map(content => content.data)
									.flat(1)
									.forEach(radical => {
										const data = radical.data;
										if (!levels["wkhighlight_radical_level"+data.level])
											levels["wkhighlight_radical_level"+data.level] = {};

										radical_dict[radical.id] = {
											"characters" : data.characters,
											"character_images" : data.character_images,
											"document_url" : data.document_url,
											"level" : data.level,
											"id":radical.id,
											"meanings": data.meanings.map(data => data.meaning),
											"subject_type":radical.object
										};

										levels["wkhighlight_radical_level"+data.level][radical.id] = {
											"characters" : data.characters,
											"character_images" : data.character_images,
											"id":radical.id,
											"meanings": data.meanings.map(data => data.meaning)
										};
									});
								// saving all radical
								chrome.storage.local.set({...{"wkhighlight_allradicals": radical_dict, "wkhighlight_allradicals_updated": formatDate(new Date())}, ...levels}, () => {
									console.log("Setup Radicals...");
									resolve([radical_dict, true]);
									if (callback)
										callback(radical_dict, true);
								});
							})
							.catch(reject);
					}
					else {
						resolve([result['wkhighlight_allradicals'], false]);
						if (callback)
							callback(result['wkhighlight_allradicals'], false);
					}
				});
		});
	});

const setupVocab = (apiToken, callback) => 
	new Promise((resolve, reject) => {
		chrome.storage.local.get(['wkhighlight_allvocab', 'wkhighlight_allvocab_updated'], result => {
			const vocabUpdates = result["wkhighlight_allvocab_updated"] ? result["wkhighlight_allvocab_updated"] : formatDate(new Date());
			modifiedSince(apiToken, vocabUpdates, "https://api.wanikani.com/v2/subjects?types=vocabulary")
				.then(modified => {
					if (!result['wkhighlight_allvocab'] || modified) {
						fetchAllPages(apiToken, "https://api.wanikani.com/v2/subjects?types=vocabulary")
							.then(vocab => {
								const vocab_dict = {};
								const vocab_assoc = {};
								const levels = {};
								vocab.map(content => content.data)
									.flat(1)
									.forEach(vocab => {
										const data = vocab.data;
										if (!levels["wkhighlight_vocabulary_level"+data.level])
											levels["wkhighlight_vocabulary_level"+data.level] = {};

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
										
										vocab_assoc[data.characters] = vocab.id;
										levels["wkhighlight_vocabulary_level"+data.level][vocab.id] = {
											"characters" : data.characters,
											"id":vocab.id,
											"meanings": data.meanings.map(data => data.meaning),
											"readings" : data.readings.map(data => data.reading),
											"pronunciation_audios" : data.pronunciation_audios
										};
									});
								// saving all vocabulary
								chrome.storage.local.set({...{'wkhighlight_allvocab':vocab_dict, "wkhighlight_vocab_assoc": vocab_assoc, "wkhighlight_allvocab_updated": formatDate(new Date())}, ...levels}, () => {
									console.log("Setup Vocabulary...");
									resolve([vocab_dict, true]);
									if (callback)
										callback(vocab_dict, true);
								});
							})
							.catch(reject);
					}
					else {
						resolve([result['wkhighlight_allvocab'], false]);
						if (callback)
							callback(result['wkhighlight_allvocab'], false);
					}
				});
		});
	});

const fetchUserInfo = (apiToken, callback) => {
	fetchPage(apiToken, "https://api.wanikani.com/v2/user")
		.then(user => {
			chrome.storage.local.set({"wkhighlight_userInfo":user, "wkhighlight_userInfo_updated":formatDate(new Date())});
			if (callback)
				callback(user);
		})
		.catch(errorHandling);
}

const setupAssignments = (apiToken, callback) => 
	new Promise((resolve, reject) => {
		chrome.storage.local.get(["wkhighlight_assignments", "wkhighlight_assignments_updated"], result => {
			const assignments = result["wkhighlight_assignments"];
			modifiedSince(apiToken, result["wkhighlight_assignments_updated"], "https://api.wanikani.com/v2/assignments")
				.then(modified => {
					if (!assignments || modified) {
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
									resolve(data);
									if (callback)
										callback(data);
								});
							})
							.catch(reject);
					}
					else {
						resolve("No fetch");
						if (callback)
							callback();
					}
				});
		});
	});

const setupAvailableAssignments = (apiToken, callback) => {
	fetchAllPages(apiToken, "https://api.wanikani.com/v2/assignments?immediately_available_for_lessons")
		.then(lessons => {
			fetchAllPages(apiToken, "https://api.wanikani.com/v2/assignments?immediately_available_for_review")
				.then(reviews => {
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
				})
				.catch(errorHandling);
		})
		.catch(errorHandling);
}