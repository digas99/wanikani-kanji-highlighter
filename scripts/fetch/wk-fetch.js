const setupSubjects = (apiToken, setup, build, callback) =>
	new Promise(async (resolve, reject) => {
		chrome.storage.local.get([setup.storage.id, setup.storage.updated, setup.storage.association], async result => {
			const updated = result[setup.storage.updated];
			const storage = result[setup.storage.id];
			const assocs = result[setup.storage.association];
			
			const db = new Database("wanikani");
			const opened = await db.open("subjects");
			if (opened) {
				fetchAllPages(apiToken, setup.endpoint, updated)
					.then(async data => {
						// too many requests or not modified
						if (data.error) {
							resolve([storage, false]);
							if (callback)
								callback(storage, false);
							return;
						}

						// open a loading popup
						chrome.runtime.sendMessage({loading: true});

						let subjects = {};
						let associations = {};
						const db_records = [];
						data.map(content => content.data)
							.flat(1)
							.forEach(subject => build(subjects, associations, db_records, subject));

						await db.insert("subjects", db_records);

						console.log("[DATABASE]: Inserted "+db_records.length+" records into database for "+setup.name);

						if (data["total_count"] > 0) {
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
						}
						
						subjects = Object.assign({}, storage, subjects);
						associations = Object.assign({}, assocs, associations);
						// saving all subjects
						chrome.storage.local.set({...{
							[setup.storage.association]: associations,
							[setup.storage.updated]: new Date().toUTCString(),
							[setup.storage.size]:Object.keys(subjects).length
						}}, () => {
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
		const storage = result["userInfo"];
		const updated = result["userInfo_updated"];

		if (updated){
			const modified = await modifiedSince(apiToken, updated, "https://api.wanikani.com/v2/user");
			if (!modified) {
				if (callback)
					callback(storage);
				return;
			}
		}

		fetchPage(apiToken, "https://api.wanikani.com/v2/user", updated)
			.then(user => {
				// too many requests
				if (user.error) {
					console.log("[USER]:", user);
					if (callback) {
						if (user.status == 302)
							callback(storage);
						else
							callback(user);
					}
					return;
				}

				chrome.storage.local.set({"userInfo":user, "userInfo_updated":new Date().toUTCString()});
				if (callback)
					callback(user);
			});
	});
}

const setupAssignments = async (apiToken, callback) => 
	new Promise((resolve, reject) => {
		chrome.storage.local.get(["assignments", "assignments_updated"], async result => {
			const updated = result["assignments_updated"];
			let assignments = result["assignments"];

			fetchAllPages(apiToken, "https://api.wanikani.com/v2/assignments", updated)
				.then(async data => {
					// too many requests or not modified
					if (data.error) {
						resolve([assignments, false]);
						if (callback)
							callback(assignments, false);
						return;
					}

					let allAssignments = assignments ? assignments["all"] : [];
					const newAssignments = data.map(arr => arr["data"]).reduce((arr1, arr2) => arr1.concat(arr2));
					newAssignments.forEach(assignment => {
						const index = allAssignments.findIndex(a => a.id === assignment.id);
						if (index !== -1)
							allAssignments[index] = assignment;
						else
							allAssignments.push(assignment);
					});

					const allFutureAssignments = filterAssignmentsByTime(allAssignments, new Date(), null);
					const allAvailableReviews = filterAssignmentsByTime(allAssignments, new Date(), changeDay(new Date(), -1000));
					chrome.storage.local.set({"assignments": {
						"all":allAssignments,
						"future":allFutureAssignments,
						"past":allAvailableReviews
					}, "assignments_updated":new Date().toUTCString()}, () => {
						resolve([data, true]);
						if (callback)
							callback(data, true);
					});
				})
		});
	});

const setupAvailableAssignments = async (apiToken, callback) => {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(["assignments", "reviews", "lessons"], async result => {
			const assignments = result["assignments"];
	
			let lessons = await fetchAllPages(apiToken, "https://api.wanikani.com/v2/assignments?immediately_available_for_lessons");
			let reviews = await fetchAllPages(apiToken, "https://api.wanikani.com/v2/assignments?immediately_available_for_review");
	
			if (!assignments) {
				if (callback)
					callback([result["reviews"], result["lessons"]], false);
				
				resolve([result["reviews"], result["lessons"]]);
			}
	
			const promises = [];
	
			if (reviews[0]) {
				reviews = reviews.map(arr => arr["data"]).reduce((arr1, arr2) => arr1.concat(arr2));
				promises.push(new Promise(resolve => {
					const updatedReviews = {
						"count":reviews.length,
						"data":reviews,
						"next_reviews":filterAssignmentsByTime(assignments["future"], new Date(), changeDay(new Date(), 14))
					};
	
					chrome.storage.local.set({"reviews": updatedReviews}, () => resolve(updatedReviews));
				}));
			}
			else
				promises.push(new Promise(resolve => resolve(result["reviews"])));
	
			if (lessons[0]) {
				lessons = lessons.map(arr => arr["data"]).reduce((arr1, arr2) => arr1.concat(arr2));
				promises.push(new Promise(resolve => {
					const updatedLessons = {
						"count":lessons.length,
						"data":lessons
					};
	
					chrome.storage.local.set({"lessons": updatedLessons}, () => resolve(updatedLessons));
				}));
			}
			else
				promises.push(new Promise(resolve => resolve(result["lessons"])));
	
			Promise.all(promises).then(results => {
				if (callback)
					callback(results[0], results[1], true);

				resolve(results);
			});
	
		});
	});
}