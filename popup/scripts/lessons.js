const lessonsList = document.querySelector("#lessonsList");

let popupLoading;
if (!messagePopup) {
	popupLoading = new MessagePopup(document.body);
	popupLoading.create("Loading subjects...");
	popupLoading.setLoading();
}

let db, list;
chrome.storage.local.get(["lessons"], async result => {
	db = new Database("wanikani");
	const opened = await db.open("subjects");
	if (opened) {
		const {count, data} = result["lessons"];
		const lessons = data.map(assignment => assignment["data"])
			.map(assignment => ({"srs_stage":assignment["srs_stage"], "subject_id":assignment["subject_id"], "subject_type":assignment["subject_type"]}));

		const sections = await Promise.all(Object.keys([0]).map(async srsId => {
			const srs = parseInt(srsId);
			const { name, short, color } = srsStages[srsId];
			const srsLessons = lessons.filter(lesson => lesson["srs_stage"] === srs);
			const subjects = await db.getAll("subjects", "srs_stage", parseInt(srs));
			const characters = srsLessons.map(lesson => {
				const subject = subjects.find(subject => subject["id"] === lesson["subject_id"]);
				if (subject["characters"])
					return subject["characters"];
				else {
					const img = subject["character_images"].find(image => image["metadata"]["style_name"] == 'original');
					if (img) {
						return `<img class="radical-image" src="${img["url"]}" />`;	
					}

					return "";
				}
			});

			return {
				title: `${name}`,
				color: getComputedStyle(document.body).getPropertyValue(`--${short.toLowerCase()}-color`) || color,
				data: characters,
				callbacks: {
					item: (elem, value) => {
						const subject = subjects.find(subject => 
							subject["characters"] === value ||
							subject?.character_images?.find(image => image["url"] == elem.querySelector("img")?.src));
							
						if (subject) {
							const meaning = subject["meanings"][0];
							let reading = subject["readings"] ? subject["readings"][0] : subject["readings"];
							if (reading && typeof reading !== "string")
								reading = subject["readings"].find(reading => reading["primary"])["reading"];

							const type = subject["subject_type"];

							if (type !== "radical")
								elem.classList.add("kanjiDetails");

							elem.title = `${meaning} ${reading ? `| ${reading}` : ""}\x0D${type.split("_").map(word => word[0].toUpperCase() + word.slice(1)).join(" ")}`;
							elem.setAttribute("data-item-id", subject["id"]);
						}
					},
					section: (wrapper, title, content) => {
						// add egg before section title
						const egg = document.createElement("div");
						egg.classList.add("srsTitleEgg");
						if (srs > 4 && srs < 7)
							egg.style.backgroundPositionX = "-22px";
						if (srs == 7)
							egg.style.backgroundPositionX = "-45px";
						if (srs == 8)
							egg.style.backgroundPositionX = "-67px";

						title.insertBefore(egg, title.firstChild);
					}
				} 
			};
		}));
		
		list = new TilesList(
			lessonsList,
			sections,
			{
				title: `<b>${count}</b> Lessons available right now!`,
				height: 500,
				bars: {
					labels: true
				},
				sections: {
					fillWidth: false,
					join: true,
					notFound: "No lessons found. You're all caught up!"
				}
			}
		);

		if (popupLoading) popupLoading.remove();
	}
});