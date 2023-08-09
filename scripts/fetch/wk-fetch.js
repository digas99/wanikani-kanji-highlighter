const setupSubjects = (apiToken, setup, build, callback) =>
	new Promise(async (resolve, reject) => {
		chrome.storage.local.get([setup.storage.id, setup.storage.updated], async result => {
			const updated = result[setup.storage.updated] ? result[setup.storage.updated] : formatDate(new Date());
			const modified = await modifiedSince(apiToken, updated, setup.endpoint);
			console.log(result);
			if (!result[setup.storage.id] || modified) {
				const db = new Database("wanikani");
				const created = await db.create("subjects");
				if (created) {
					fetchAllPages(apiToken, setup.endpoint)
						.then(async data => {
							const subjects = {};
							const associations = {};
							const db_records = [];
							data.map(content => content.data)
								.flat(1)
								.forEach(subject => build(subjects, associations, db_records, subject));

							await db.insert("subjects", db_records);

							console.log("Inserted "+db_records.length+" records into database for "+setup.name);

							// add jlpt info
							if (setup.jlpt) {
								for (const n in jlpt) {
									jlpt[n].forEach(kanji => subjects[associations[kanji]]["jlpt"] = n.toUpperCase());
								}
							}

							// add joyo info
							if (setup.joyo) {
								for (const n in joyo) {
									joyo[n].forEach(kanji => subjects[associations[kanji]]["joyo"] = "Grade "+n.charAt(1));
								}
							}
							
							// saving all subjects
							chrome.storage.local.set({...{[setup.storage.id]: subjects, [setup.storage.association]: associations, [setup.storage.updated]: formatDate(new Date()), [setup.storage.size]:data[0]["total_count"]}}, () => {
								console.log("Setup "+setup.name+"...");
								resolve([subjects, true]);
								if (callback)
									callback(subjects, true);
							});
						})
						.catch(reject);
				}
			}
			else {
				resolve([result[setup.storage.id], false]);
				if (callback)
					callback(result[setup.storage.id], false);
			}
		});
	});

const fetchUserInfo = (apiToken, callback) => {
	fetchPage(apiToken, "https://api.wanikani.com/v2/user")
		.then(user => {
			chrome.storage.local.set({"wkhighlight_userInfo":user, "wkhighlight_userInfo_updated":formatDate(new Date())});
			if (callback)
				callback(user);
		})
		.catch(() => callback(null));
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
									resolve(data, true);
									if (callback)
										callback(data, true);
								});
							})
							.catch(reject);
					}
					else {
						resolve(assignments, false);
						if (callback)
							callback(assignments, false);
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