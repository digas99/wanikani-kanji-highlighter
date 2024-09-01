let db = new Database("wanikani");

let popupLoading = new MessagePopup(document.body);
popupLoading.create("Loading subjects...");
popupLoading.setLoading();

const url = new URL(window.location.href);
const wrapper = document.querySelector("#list");

let list;

// SRS STAGE
const srsStage = parseInt(url.searchParams.get('srs'));
if (srsStage != null && srsStage >= -1 && srsStage <= 9) {
	// progression stats
	chrome.storage.local.get(["settings"], ({settings}) => {
		progressionStats(document.querySelector("#progression-stats"), {radical: [], kanji: [], vocabulary: []}, settings["appearance"], 10);

		chrome.storage.local.get(["radical_progress", "kanji_progress", "vocabulary_progress", "kana_vocabulary_progress"], result => {
			const progresses = {
				"radical": result["radical_progress"],
				"kanji": result["kanji_progress"],
				"vocabulary": [result["vocabulary_progress"], result["kana_vocabulary_progress"]]
					.reduce((acc, obj) => {
						Object.keys(obj).forEach(key => acc[key] = (acc[key] || 0) + obj[key]);
						return acc
					}, {})
			};
			
			progressionStats(document.querySelector("#progression-stats"), progresses, settings["appearance"], 10,
				(menu, srs) => {
					if (srs == 0) menu.style.left = "0";
					if (srs == 9) menu.style.left = "-75px";
				}
			);
			
		});
		
		let srsSubjects;
		db.open("subjects").then(async opened => {
			if (opened) {
				list = new TilesList(
					wrapper,
					[],
					{
						title: `<b>0</b> Subjects on <b>${srsStages[srsStage] ? srsStages[srsStage]["name"] : "Locked"}</b>`,
						height: 430,
						bars: {
							labels: true
						},
						sections: {
							join: false,
							notFound: "No subjects found in this SRS Stage."
						}
					}
				);		
				
				srsSubjects = await db.getAll("subjects", "srs_stage", srsStage);
	
				const sections = await Promise.all(["radical", "kanji", "vocabulary"].map(async type => {
					const subjects = srsSubjects.filter(subject => subject["subject_type"].includes(type) && !subject["hidden_at"]);
					const characters = subjects.map(getCharacter);
		
					return {
						title: type[0].toUpperCase() + type.slice(1),
						color: getComputedStyle(document.body).getPropertyValue(`--${type}-tag-color`),
						data: characters,
						callbacks: {
							item: (elem, value) => dataTile(subjects, elem, value),
							section: (wrapper, title, content) => headerSubjectDecoration(title, type)
						},
						justify: true
					};
				}));
	
				list.updateTitle(`<b>${srsSubjects.length}</b> Subjects on <b>${srsStages[srsStage] ? srsStages[srsStage]["name"] : "Locked"}</b>`);
				list.update(sections);
	
				if (popupLoading) popupLoading.remove();
			}
		});
	});

}

// LEVEL AND SUBJECT TYPE
const level = parseInt(url.searchParams.get('level'));
const subjectType = url.searchParams.get('type');
const srsJump = url.searchParams.get('jump');
console.log(srsJump);
if (level != null && level >= 1 && level <= 60 && subjectType != null && ["radical", "kanji", "vocabulary"].includes(subjectType)) {
	let levelSubjects, typeSubjects;
	db.open("subjects").then(async opened => {
		if (opened) {
			list = new TilesList(
				wrapper,
				[],
				{
					title: `<b>0</b> Subjects on <b>Level ${level}</b>`,
					height: 480,
					bars: {
						labels: true
					},
					sections: {
						join: false,
						notFound: "No subjects found in this Level."
					}
				}
			);

			levelSubjects = await db.getAll("subjects", "level", level);
			typeSubjects = levelSubjects.filter(subject => subject["subject_type"].includes(subjectType) && !subject["hidden_at"]);

			const sections = await Promise.all([5,4,3,2,1,0,-1].map(async srs => {
				const subjects = typeSubjects.filter(subject => srs >= 5 ? subject["passed_at"] : subject["srs_stage"] == srs && !subject["passed_at"]);
				const characters = subjects.map(getCharacter);

				let color = getComputedStyle(document.body).getPropertyValue(`--${srsStages[srs]?.short.toLowerCase()}-color`);
				if (srs >= 5)
					color = "#000000";

				if (!color)
					color = "#ffffff";
	
				return {
					title: srsStages[srs] ? (srs < 5 ? srsStages[srs]["name"] : "Passed") : "Locked",
					color: color,
					data: characters,
					callbacks: {
						item: (elem, value) => dataTile(subjects, elem, value),
						section: (wrapper, title, content) => headerSRSDecoration(title, srs < 5 ? srs : 8)
					},
					justify: true
				};
			}));

			list.updateTitle(`<b>${typeSubjects.length}</b> ${subjectType.charAt(0).toUpperCase() + subjectType.slice(1)} on <b>Level ${level}</b>`);
			list.update(sections);

			if (popupLoading) popupLoading.remove();

			if (srsJump)
				list.list.scrollTo(0, document.querySelector(`#tiles-list-${srsJump.toLowerCase().replaceAll(" ", "-")}`).offsetTop - 100);
		}
	});
}

// REVIEWS
const dateString = url.searchParams.get('date');
if (dateString != null) {
	chrome.storage.local.get(["reviews"], ({reviews}) => {
		const nextReviews = reviews.next_reviews;
		if (nextReviews) {
			// filter by date and hours (ignore minutes and seconds)
			const reviewsData = nextReviews.filter(review => review["available_at"].split(":")[0] == dateString.split(":")[0]);
			let subjects, typeSubjects;
			db.open("subjects").then(async opened => {
				if (opened) {
					const date = new Date(dateString);
					date.setMinutes(0);
					date.setSeconds(0);
					const readableDate = date.toLocaleString("en-US", {weekday: "short", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "numeric", second: "numeric"});
					list = new TilesList(
						wrapper,
						[],
						{
							title: `<b>0</b> Subjects on <b>${readableDate}</b>`,
							height: 480,
							bars: {
								labels: true
							},
							sections: {
								join: false,
								notFound: "No subjects found for this date."
							}
						}
					);
					
					subjects = Object.values(await db.getAll("subjects", "id", reviewsData.map(review => review["subject_id"])));
					typeSubjects = subjects.filter(subject => !subject["hidden_at"]);

					const sections = await Promise.all(Object.keys(srsStages).map(async srsId => {
						const srs = parseInt(srsId);
						const { name, short, color } = srsStages[srsId];
						const srsSubjects = subjects.filter(subject => subject["srs_stage"] == srs);
						const characters = srsSubjects.map(review => getCharacter(subjects.find(subject => subject["id"] === review["id"])));
			
						return {
							title: `${name}`,
							color: getComputedStyle(document.body).getPropertyValue(`--${short.toLowerCase()}-color`) || color,
							data: characters,
							callbacks: {
								item: (elem, value) => dataTile(subjects, elem, value),
								section: (wrapper, title, content) => headerSRSDecoration(title, srs)
							},
							justify: true
						};
					}));

					list.updateTitle(`<b>${typeSubjects.length}</b> Subjects on <b>${readableDate}</b>`);
					list.update(sections);

					if (popupLoading) popupLoading.remove();
				}
			});
		}
	});
}

// SCHOOL
const school = url.searchParams.get('school');
const grade = url.searchParams.get('grade');
const type = url.searchParams.get('type');
const schoolJump = url.searchParams.get('jump');
if (school != null && grade != null && type != null) {
	db.open("subjects").then(async opened => {
		if (opened) {
			list = new TilesList(
				wrapper,
				[],
				{
					title: `<b>0</b> Subjects from <b>${school.toUpperCase()} - ${grade.toUpperCase()}</b>`,
					height: 480,
					bars: {
						labels: true
					},
					sections: {
						join: false,
						notFound: "No subjects found for this grade."
					}
				}
			);

			const subjects = await db.getAll("subjects", "subject_type", type);
			const gradeSubjects = subjects.filter(subject => subject[school]?.match(/(\d+)/)[0] == grade?.match(/(\d+)/)[0] && !subject["hidden"]);
			console.log(gradeSubjects);
			
			// sections
			const sectionsInfo = {
				"burned": {
					"color": getComputedStyle(document.body).getPropertyValue("--brn-color"),
					"title": "Burned",
					"srs": 8,
					"subjects": gradeSubjects.filter(subject => subject["srs_stage"] == 9)
				},
				"passed": {
					"color": "#000000",
					"title": "Passed",
					"srs": 7,
					"subjects": gradeSubjects.filter(subject => subject["passed_at"] && subject["srs_stage"] != 9)
				},
				"progress": {
					"color": getComputedStyle(document.body).getPropertyValue("--ap4-color"),
					"title": "Progress",
					"srs": 5,
					"subjects": gradeSubjects.filter(subject => subject["srs_stage"] >= 0 && !subject["passed_at"])
				},
				"locked": {
					"color": "#ffffff",
					"title": "Locked",
					"srs": -1,
					"subjects": gradeSubjects.filter(subject => subject["srs_stage"] == -1)
				}
			}
			
			const sections = await Promise.all(Object.keys(sectionsInfo).map(async section => {
				const { color, title, srs, subjects } = sectionsInfo[section];
				const characters = subjects.map(getCharacter);

				return {
					title: title,
					color: color,
					data: characters,
					callbacks: {
						item: (elem, value) => dataTile(subjects, elem, value),
						section: (wrapper, title, content) => headerSRSDecoration(title, srs)
					},
					justify: true
				};
			}));

			list.updateTitle(`<b>${gradeSubjects.length}</b> Subjects from <b>${school.toUpperCase()} - ${grade.toUpperCase()}</b>`);
			list.update(sections);

			if (schoolJump)
				list.list.scrollTo(0, document.querySelector(`#tiles-list-${schoolJump.toLowerCase().replaceAll(" ", "-")}`).offsetTop - 100);

			if (popupLoading) popupLoading.remove();
		}
	});
}