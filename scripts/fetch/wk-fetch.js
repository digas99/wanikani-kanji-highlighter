const setupSubjects = (apiToken, setup, build, callback) =>
	new Promise(async (resolve, reject) => {
		chrome.storage.local.get([setup.storage.id, setup.storage.updated], async result => {
			const updated = result[setup.storage.updated];
			const storage = result[setup.storage.id];

			const db = new Database("wanikani");
			const created = await db.create("subjects");
			if (created) {
				fetchAllPages(apiToken, setup.endpoint, updated)
					.then(async data => {
						// too many requests or not modified
						if (data.error) {
							console.log(data);
							resolve([storage, false]);
							if (callback)
								callback(storage, false);
							return;
						}

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
		});
	});

const fetchUserInfo = async(apiToken, callback) => {
	chrome.storage.local.get(["userInfo", "userInfo_updated"], async result => {
		const updated = result["userInfo"];
		const storage = result["userInfo_updated"];

		fetchPage(apiToken, "https://api.wanikani.com/v2/user", updated)
			.then(user => {
				// too many requests or not modified
				if (user.error) {
					console.log(user);
					if (callback)
						callback(storage);
					return;
				}

				chrome.storage.local.set({"userInfo":user, "userInfo_updated":formatDate(new Date())});
				if (callback)
					callback(user);
			});
	});
}

const setupAssignments = async (apiToken, callback) => 
	new Promise((resolve, reject) => {
		chrome.storage.local.get(["assignments", "assignments_updated"], async result => {
			const updated = result["assignments_updated"];
			const assignments = result["assignments"];

			fetchAllPages(apiToken, "https://api.wanikani.com/v2/assignments", updated)
				.then(data => {
					// too many requests or not modified
					if (data.error) {
						console.log(data);
						resolve([assignments, false]);
						if (callback)
							callback(assignments, false);
						return;
					}

					const allAssignments = data.map(arr => arr["data"]).reduce((arr1, arr2) => arr1.concat(arr2));
					const allFutureAssignments = filterAssignmentsByTime(allAssignments, new Date(), null);
					const allAvailableReviews = filterAssignmentsByTime(allAssignments, new Date(), changeDay(new Date(), -1000));
					chrome.storage.local.set({"assignments":{
						"all":allAssignments,
						"future":allFutureAssignments,
						"past":allAvailableReviews
					}, "assignments_updated":formatDate(new Date())}, () => {
						resolve([data, true]);
						if (callback)
							callback(data, true);
					});
				})
		});
	});

const setupAvailableAssignments = async (apiToken, callback) => {
	fetchAllPages(apiToken, "https://api.wanikani.com/v2/assignments?immediately_available_for_lessons")
		.then(lessons => {
			fetchAllPages(apiToken, "https://api.wanikani.com/v2/assignments?immediately_available_for_review")
				.then(reviews => {
					const countReviews = reviews[0]["total_count"];
					const countLessons = lessons[0]["total_count"];

					// get all assigments into one array
					reviews = Array.prototype.concat.apply([], reviews.map(assignments => assignments["data"]))
					lessons = Array.prototype.concat.apply([], lessons.map(assignments => assignments["data"]))
					chrome.storage.local.get(["assignments"], result => {
						const assignments = result["assignments"];
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
							chrome.storage.local.set({"reviews": updatedReviews, "lessons": updatedLessons}, () => {
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