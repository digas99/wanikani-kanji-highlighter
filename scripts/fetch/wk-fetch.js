import { urls } from "../static.js";

export const setupSubjects = async (apiToken, setup, build, callback) => {
	let db, opened;
	try {
		const result = await new Promise((resolve, reject) => {
			chrome.storage.local.get([setup.storage.updated, setup.storage.association], async result => {
				const updated = result[setup.storage.updated];
				const assocs = result[setup.storage.association];
				
				db = new Database("wanikani");
				opened = await db.open("subjects");
				if (opened) {
					const cached = await db.getAll("subjects", "subject_type", [setup.storage.id]);
					const storage = cached[setup.storage.id];
					try {
						const data = await fetchAllPages(apiToken, setup.endpoint, updated);
						resolve({ data, storage, assocs });
					} catch (error) {
						reject(error);
					}
				}
			});
		});

		const { data, storage, assocs } = result;

		// too many requests or not modified
		if (data.error) {
			if (opened) {
				if (callback) callback(storage, false);
				return [storage, false];
			}
		}

		// open a loading popup
		chrome.runtime.sendMessage({ loading: true });

		let subjects = {};
		let associations = {};
		const db_records = [];
		data.map(content => content.data)
			.flat(1)
			.forEach(subject => build(subjects, associations, db_records, subject));

		if (data.length > 0) {
			const schools = [
				{
					name: "jlpt",
					data: jlpt,
					callback: n => n.toUpperCase()
				},
				{
					name: "joyo",
					data: joyo,
					callback: n => "Grade " + n.charAt(1)
				}
			];
			schools.forEach(school => {
				if (setup[school.name]) {
					console.log("Adding " + school.name + " info", school.data);
					for (const n in school.data) {
						school.data[n].forEach(kanji => {
							const subjectId = associations[kanji];
							if (subjectId) {
								const subject = subjects[subjectId];
								if (subject)
									subject[school.name] = school.callback(n);
							}
						});
					}
				}
			});
		}

		await db.insert("subjects", db_records);

		console.log("[DATABASE]: Inserted " + db_records.length + " records into database for " + setup.name);

		subjects = Object.assign({}, storage, Object.values(subjects));
		console.log("[SUBJECTS]:", subjects);
		associations = Object.assign({}, assocs, associations);
		// saving all subjects
		chrome.storage.local.set({
			...{
				[setup.storage.association]: associations,
				[setup.storage.updated]: new Date().toUTCString(),
				[setup.storage.size]: Object.keys(subjects).length
			}
		}, () => {
			if (callback) callback(subjects, true);
		});

		return [subjects, true];
	} catch (error) {
		return Promise.reject(error);
	}
};

export const fetchUserInfo = async(apiToken, callback) => {
	chrome.storage.local.get(["userInfo", "userInfo_updated"], async result => {
		const storage = result["userInfo"];
		const updated = result["userInfo_updated"];

		if (updated){
			const modified = await modifiedSince(apiToken, updated, `${urls.wanikani_api}/user`);
			if (!modified) {
				if (callback)
					callback(storage);
				return;
			}
		}

		fetchPage(apiToken, `${urls.wanikani_api}/user`, updated)
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

export const setupAssignments = async (apiToken, callback) => 
	new Promise((resolve, reject) => {
		chrome.storage.local.get(["assignments", "assignments_updated", "assignments_history"], async result => {
			const updated = result["assignments_updated"];
			let assignments = result["assignments"];

			fetchAllPages(apiToken, `${urls.wanikani_api}/assignments`, updated)
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
					console.log("NEW ASSIGNMENTS");
					console.log(newAssignments);

					// get subjects old data
					const newAssignmentsIds = newAssignments.map(a => a.data.subject_id);
					const db = new Database("wanikani");
					const opened = await db.open("subjects");
					let subjects = [];
					if (opened)
						subjects = await db.getAll("subjects", "id", newAssignmentsIds);

					const assignmentsHistory = result["assignments_history"] || [];
					newAssignments.forEach(assignment => {
						const index = allAssignments.findIndex(a => a.id === assignment.id);
						if (index !== -1)
							allAssignments[index] = assignment;
						else
							allAssignments.push(assignment);

						// add to history
						const subjectId = assignment.data.subject_id;
						const subject = subjects[subjectId];
						if (subject) {
							assignmentsHistory.push({
								"id": subjectId,
								"subject_type": subject.subject_type,
								"level": subject.level,
								"characters": getCharacter(subject),
								"srs_stage": {
									"old": subject.srs_stage,
									"new": assignment.data.srs_stage
								},
								"meanings": subject.meanings,
								"available_at": new Date(assignment.data.available_at).toString(),
								"passed_at": assignment.data.passed_at ? new Date(assignment.data.passed_at).toString() : null,
								"burned_at": assignment.data.burned_at ? new Date(assignment.data.burned_at).toString() : null,
								"updated_at": new Date(assignment.data_updated_at).toString()
							});
						}
					});

					const allFutureAssignments = filterAssignmentsByTime(allAssignments, new Date(), null);
					const allAvailableReviews = filterAssignmentsByTime(allAssignments, new Date(), changeDay(new Date(), -1000));
					chrome.storage.local.set({
						"assignments": {
							"all":allAssignments,
							"future":allFutureAssignments,
							"past":allAvailableReviews
						},
						"assignments_updated":new Date().toUTCString(),
						"assignments_history": assignmentsHistory
					}, () => {
						resolve([data, true]);
						if (callback)
							callback(data, true);
					});
				})
		});
	});

export const setupAvailableAssignments = async (apiToken, callback) => {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(["assignments", "reviews", "lessons"], async result => {
			const assignments = result["assignments"];
	
			let lessons = await fetchAllPages(apiToken, `${urls.wanikani_api}/assignments?immediately_available_for_lessons`);
			let reviews = await fetchAllPages(apiToken, `${urls.wanikani_api}/assignments?immediately_available_for_review`);
	
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