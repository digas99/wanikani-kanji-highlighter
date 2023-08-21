const lessonsList = document.querySelector("#lessonsList");

let popupLoading;
if (!messagePopup) {
	popupLoading = new MessagePopup(document.body);
	popupLoading.create("Loading subjects...");
	popupLoading.setLoading();
}

let db;

let list = new TilesList(
	lessonsList,
	[],
	{
		title: `<b>0</b> Lessons available right now!`,
		height: 500,
		bars: {
			labels: true
		},
		sections: {
			join: false,
			notFound: "No lessons found. You're all caught up!"
		}
	}
);

chrome.storage.local.get(["lessons"], async result => {
	db = new Database("wanikani");
	const opened = await db.open("subjects");
	if (opened) {
		const {count, data} = result["lessons"];
		const lessons = data.map(assignment => assignment["data"])
			.map(assignment => ({"srs_stage":assignment["srs_stage"], "subject_id":assignment["subject_id"], "subject_type":assignment["subject_type"]}));
		
		list.updateTitle(`<b>${count}</b> Lessons available right now!`);

		const sections = await Promise.all(["radical", "kanji", "vocabulary"].map(async type => {
			const srsLessons = lessons.filter(lesson => lesson["subject_type"].includes(type) && !lesson["hidden_at"]);
			const subjects = await db.getAll("subjects", "subject_type", type !== "vocabulary" ? type : ["vocabulary", "kana_vocabulary"], true);
			const characters = srsLessons.map(lesson => getCharacter(subjects.find(subject => subject["id"] === lesson["subject_id"])));

			return {
				title: `${type[0].toUpperCase() + type.slice(1)}`,
				color: getComputedStyle(document.body).getPropertyValue(`--${type}-tag-color`),
				data: characters,
				callbacks: {
					item: (elem, value) => dataTile(subjects, elem, value),
					section: (wrapper, title, content) => headerSRSDecoration(title, type)
				},
				justify: type.includes("vocab")
			};
		}));

		list.update(sections);

		if (popupLoading) popupLoading.remove();
	}
});