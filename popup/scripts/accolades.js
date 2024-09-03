chrome.storage.local.get(["accolades"], async result => {
	const accolades = defaultAccolades(result["accolades"]);

	const wrapper = document.querySelector(".accolades-wrapper");
	setupAccolades(wrapper, accolades);
	
	updateAccolades(setupAccolades);
});

const defaultAccolades = accolades => {
	accolades = accolades || {};

	// setup the default accolades if key is not found
	Object.keys(ACCOLADES).forEach(type => {
		if (!(type in accolades)) {
			accolades[type] = { "stages": [], "value": {} };
		}
	});
	return accolades;
}

const setupAccolades = (wrapper, accolades) => {
	if (!wrapper || !accolades) return;

	// clear the wrapper
	wrapper.querySelectorAll(".accolades-row").forEach(row => row.remove());

	const counter = document.querySelector(".accolades-main-counter");
	const completed = Object.values(accolades).reduce((acc, accolade) => acc + accolade?.stages?.length, 0);
	const total = Object.values(ACCOLADES).reduce((acc, accolade) => acc + accolade?.milestones?.length, 0);
	counter.innerText = `${completed} / ${total}`;

	// counter.innerText = `${total} / ${Object.values(accolades).reduce((acc, accolade) => acc + accolade?.data?.total, 0)}`;
	Object.entries(ACCOLADES).forEach(([type, info]) => {
		const accolade = accolades[type];
		const row = /*html*/`
			<div class="accolades-row">
				<div class="accolades-counter">${accolade?.stages?.length} / ${info.milestones.length}</div>
				<div class="accolades-type">${info.title}</div>
				<div class="accolades-description">${info.description}</div>
				<div class="accolades-progress" title="${accolade?.data?.value} / ${accolade?.data?.total} - ${accolade?.data?.percentage.toFixed(0)}%"><div style="width: ${accolade?.data?.percentage}%"></div></div>
				<div class="accolades-milestones">
					${info.milestones.map(milestone => {
						return /*html*/`
							<div data-value="${milestone.value}" class="${accolade?.stages?.includes(milestone.value) ? "accolades-milestone-active" : ""}">
								<img src="${milestone.icon || '/images/accolades/hexagon.png'}" title="${milestone.title}">
								<div class="accolades-title">${milestone.title}</div>
							</div>
						`;
					}).join("")}
				</div>
			</div>
		`;
		wrapper.insertAdjacentHTML("beforeend", row);
	});
}

const updateAccolades = async callback => {
	const promises = Object.entries(ACCOLADES).map(async ([type, info]) => {
		switch (type) {
			case "level":
				return await updateLevelAccolades(info);
			case "anniversary":
				return await updateAnniversaryAccolades(info);
			case "burned":
				return await updateBurnedAccolades(info);
			case "jlpt":
				return await updateSchoolAccolades(info, "jlpt", jlpt);
			case "joyo":
				return await updateSchoolAccolades(info, "joyo", joyo);
			default:
				return Promise.resolve();
		}
	});

	const results = await Promise.all(promises);
	const accolades = results.reduce((acc, promise, index) => {
		acc[Object.keys(ACCOLADES)[index]] = promise;
		return acc;
	}, {});
	chrome.storage.local.set({ "accolades": accolades });

	console.log(accolades);
	if (callback) {
		const wrapper = document.querySelector(".accolades-wrapper");
		callback(wrapper, accolades);
	}
}

const updateLevelAccolades = async (info) => {
	return new Promise((resolve, reject) => {
	  	chrome.storage.local.get(["userInfo"], (result) => {
			const userInfo = result["userInfo"];
			const level = userInfo?.data?.level;
			const nextMilestone = info.milestones.find(milestone => milestone.value > level)?.value || 0;
			if (level) {
				resolve({
					"stages": info.milestones.filter(milestone => milestone.value <= level).map(milestone => milestone.value),
					"data": {
						"value": level,
						"total": nextMilestone,
						"percentage": level / nextMilestone * 100,
					}
				});
			}
			else
				resolve(defaultAccoladeResult);
		});
	});
}

const updateAnniversaryAccolades = async (info) => {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(["userInfo"], (result) => {
			const userInfo = result["userInfo"];
			const started_at = userInfo?.data?.started_at;
			if (started_at) {
				const now = new Date();
				const anniversary = Math.floor((now - new Date(started_at)) / (1000 * 60 * 60 * 24 * 365));
				const nextMilestone = info.milestones.find(milestone => milestone.value > anniversary)?.value || 0;
				resolve({
					"stages": info.milestones.filter(milestone => milestone.value <= anniversary).map(milestone => milestone.value),
					"data": {
						"value": anniversary,
						"total": nextMilestone,
						"percentage": anniversary / nextMilestone * 100,
					}
				});
			}
			else
				resolve(defaultAccoladeResult);
		});
	});
}

const updateBurnedAccolades = async (info) => {
	return new Promise(async (resolve, reject) => {
		const db = new Database("wanikani");
		const opened = await db.open("subjects");
		if (opened) {
			const subjects = await db.getAll("subjects", "srs_stage", 9);
			const burned = subjects.length;
			const nextMilestone = info.milestones.find(milestone => milestone.value > burned)?.value || 0;
			resolve({
				"stages": info.milestones.filter(milestone => milestone.value <= burned).map(milestone => milestone.value),
				"data": {
					"value": burned,
					"total": nextMilestone,
					"percentage": burned / nextMilestone * 100,
				}
			});
		}
		else
			resolve(defaultAccoladeResult);
	});
}

const updateSchoolAccolades = async (info, school, map) => {
	return new Promise(async (resolve, reject) => {
		const db = new Database("wanikani");
		const opened = await db.open("subjects");
		if (opened) {
			const kanji = await db.getAll("subjects", "subject_type", "kanji");
			const stages = Object.keys(map).filter(grade => {
				const learnedSubjects = kanji.filter(kanji => kanji[school]?.match(/(\d+)/)[0] == grade?.match(/(\d+)/)[0] && !kanji["hidden"] && kanji["passed_at"]);
				return learnedSubjects.length >= map[grade].length;
			}).map(stage => Number(stage.match(/(\d+)/)[0]));

			// percentage until next grade
			const grade = stages.length == 0 ? 0 : Math.max(...stages);
			const gradeIndex = info.milestones.map(milestone => milestone.value).indexOf(grade);
			const nextGradeValue = info.milestones[gradeIndex+1]?.value || 0;
			const nextGrade = Object.keys(map).find(grade => grade.match(/(\d+)/)[0] == nextGradeValue.toString());
			const nextGradeSubjects = kanji.filter(kanji => kanji[school]?.match(/(\d+)/)[0] == nextGradeValue && !kanji["hidden"] && kanji["passed_at"]);
			const percentage = nextGradeSubjects.length / map[nextGrade].length * 100;

			resolve({
				"stages": stages,
				"data": {
					"value": nextGradeSubjects.length,
					"total": map[nextGrade].length,
					"percentage": percentage,
				}
			});
		}
		else
			resolve(defaultAccoladeResult);
	});
}

const defaultAccoladeResult = () => {
	return ({
		"stages": [],
		"data": {
			"value": 0,
			"total": 0,
			"percentage:": 0,
		}
	});
}

const ACCOLADES = {
	"level": {
		"title": "Level",
		"description": "Level reached so far while learning with Wanikani.",
		"milestones": [
			{
				value: 10,
				title: "快 Pleasant",
				icon: "",
			},
			{
				value: 20,
				title: "苦 Painful",
				icon: "",
			},
			{
				value: 30,
				title: "死 Death",
				icon: "",
			},
			{
				value: 40,
				title: "地獄 Hell",
				icon: "",
			},
			{
				value: 50,
				title: "天国 Paradise",
				icon: "",
			},
			{
				value: 60,
				title: "現実 Reality",
				icon: "",
			}
		]
	},
	"anniversary": {
		"title": "Anniversary",
		"description": "Years spent learning with Wanikani.",
		"milestones": [
			{
				value: 1,
				title: "1 year",
				icon: "",
			},
			{
				value: 5,
				title: "5 years",
				icon: "",
			},
			{
				value: 10,
				title: "10 years",
				icon: "",
			},
			{
				value: 15,
				title: "15 years",
				icon: "",
			}
		]
	},
	"burned": {
		"title": "Burned",
		"description": "Total number of items burned.",
		"milestones": [
			{
				value: 1000,
				title: "1000 items",
				icon: "",
			},
			{
				value: 3500,
				title: "3500 items",
				icon: "",
			},
			{
				value: 7000,
				title: "7000 items",
				icon: "",
			},
		]
	},
	"jlpt": {
		"title": "JLPT",
		"description": "JLPT levels reached by number of kanji learned.",
		"milestones": [
			{
				value: 5,
				title: "N5",
				icon: "",
			},
			{
				value: 4,
				title: "N4",
				icon: "",
			},
			{
				value: 3,
				title: "N3",
				icon: "",
			},
			{
				value: 2,
				title: "N2",
				icon: "",
			},
			{
				value: 1,
				title: "N1",
				icon: "",
			}
		]
	},
	"joyo": {
		"title": "Jōyō",
		"description": "Jōyō school grade levels reached by number of kanji learned.",
		"milestones": [
			{
				value: 1,
				title: "Grade 1",
				icon: "",
			},
			{
				value: 2,
				title: "Grade 2",
				icon: "",
			},
			{
				value: 3,
				title: "Grade 3",
				icon: "",
			},
			{
				value: 4,
				title: "Grade 4",
				icon: "",
			},
			{
				value: 5,
				title: "Grade 5",
				icon: "",
			},
			{
				value: 6,
				title: "Grade 6",
				icon: "",
			},
			{
				value: 9,
				title: "Middle School",
				icon: "",
			}
		]
	}
};