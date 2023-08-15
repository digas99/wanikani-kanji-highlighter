let db = new Database("wanikani");

let popupLoading;
if (!messagePopup) {
	popupLoading = new MessagePopup(document.body);
	popupLoading.create("Loading subjects...");
	popupLoading.setLoading();
}

// get srs stage from url params
const url = new URL(window.location.href);
const srsStage = parseInt(url.searchParams.get('srs'));
const wrapper = document.querySelector("#list");
let srsSubjects;
if (srsStage != null && srsStage >= -1 && srsStage <= 9) {
	db.open("subjects").then(async opened => {
		if (opened) {
			srsSubjects = await db.getAll("subjects", "srs_stage", srsStage);
			console.log(srsSubjects);
			const sections = await Promise.all(["radical", "kanji", "vocabulary"].map(async type => {
				const subjects = srsSubjects.filter(subject => subject["subject_type"].includes(type));
				const characters = subjects.map(subject => {
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
					title: type[0].toUpperCase() + type.slice(1),
					color: getComputedStyle(document.body).getPropertyValue(`--${type}-tag-color`) || color,
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
							// add subject type text before title
							const typeElem = document.createElement("span");
							title.insertBefore(typeElem, title.firstChild);
							typeElem.style.fontWeight = "bold";
							let text;
							switch(type) {
								case "radical":
									text = "部首";
									break;
								case "kanji":
									text = "漢字";
									break;
								case "vocabulary":
								case "kana_vocabulary":
									text = "単語";
									break;
							}
							typeElem.textContent = text;
						}
					} 
				};
			}));
			
			console.log(sections);
			list = new TilesList(
				wrapper,
				sections,
				{
					title: `<b>${srsSubjects.length}</b> Subjects on <b>${srsStages[srsStage] ? srsStages[srsStage]["name"] : "Locked"}</b>`,
					height: 500,
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

			if (popupLoading) popupLoading.remove();
		}
	});
}