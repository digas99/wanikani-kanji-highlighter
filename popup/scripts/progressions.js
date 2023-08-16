let db = new Database("wanikani");

let popupLoading;
if (!messagePopup) {
	popupLoading = new MessagePopup(document.body);
	popupLoading.create("Loading subjects...");
	popupLoading.setLoading();
}


const url = new URL(window.location.href);
const wrapper = document.querySelector("#list");

// SRS STAGE
const srsStage = parseInt(url.searchParams.get('srs'));
if (srsStage != null && srsStage >= -1 && srsStage <= 9) {
	let srsSubjects;
	db.open("subjects").then(async opened => {
		if (opened) {
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
					} 
				};
			}));
			
			console.log(sections);
			list = new TilesList(
				wrapper,
				sections,
				{
					title: `<b>${srsSubjects.length}</b> Subjects on <b>${srsStages[srsStage] ? srsStages[srsStage]["name"] : "Locked"}</b>`,
					height: 445,
					bars: {
						labels: true
					},
					sections: {
						fillWidth: false,
						join: false,
						notFound: "No subjects found in this SRS Stage."
					}
				}
			);		

		}
	});
	
	// progression stats
	chrome.storage.local.get(["settings", "radical_progress", "kanji_progress", "vocabulary_progress"], result => {
		const progresses = {
			"radical": result["radical_progress"],
			"kanji": result["kanji_progress"],
			"vocabulary": result["vocabulary_progress"]
		};
		
		progressionStats(document.querySelector("#progression-stats"), progresses, result["settings"]["appearance"], 10,
			(menu, srs) => {
				if (srs == 0) menu.style.left = "0";
				if (srs == 9) menu.style.left = "-75px";
			}
		);
		
		if (popupLoading) popupLoading.remove();
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
			levelSubjects = await db.getAll("subjects", "level", level);
			console.log(levelSubjects);
			typeSubjects = levelSubjects.filter(subject => subject["subject_type"].includes(subjectType) && !subject["hidden_at"]);
			console.log(typeSubjects);
			const sections = await Promise.all([5,4,3,2,1,0,-1].map(async srs => {
				const subjects = typeSubjects.filter(subject => srs >= 5 ? subject["passed_at"] : subject["srs_stage"] == srs && !subject["passed_at"]);
				const characters = subjects.map(getCharacter);

				let color = getComputedStyle(document.body).getPropertyValue(`--${srsStages[srs]?.short.toLowerCase()}-color`);
				console.log(color, srs);
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
					}
				};
			}));

			console.log(sections);
			list = new TilesList(
				wrapper,
				sections,
				{
					title: `<b>${typeSubjects.length}</b> ${subjectType.charAt(0).toUpperCase() + subjectType.slice(1)} on <b>Level ${level}</b>`,
					height: 500,
					bars: {
						labels: true
					},
					sections: {
						fillWidth: false,
						join: false,
						notFound: "No subjects found in this Level."
					}
				}
			);

			if (popupLoading) popupLoading.remove();

			if (srsJump)
				list.list.scrollTo(0, document.querySelector(`#tiles-list-${srsJump.toLowerCase().replaceAll(" ", "-")}`).offsetTop - 100);
		}
	});
}