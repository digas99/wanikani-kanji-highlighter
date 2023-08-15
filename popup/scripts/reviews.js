const reviewsList = document.querySelector("#reviewsList");
let db, list;

let popupLoading;
if (!messagePopup) {
	popupLoading = new MessagePopup(document.body);
	popupLoading.create("Loading subjects...");
	popupLoading.setLoading();
}

chrome.storage.local.get(["reviews"], async result => {
	db = new Database("wanikani");
	const opened = await db.open("subjects");
	if (opened) {
		const {count, data, next_reviews} = result["reviews"];
		const reviews = data.map(assignment => assignment["data"])
			.map(assignment => ({"srs_stage":assignment["srs_stage"], "subject_id":assignment["subject_id"], "subject_type":assignment["subject_type"]}));

		const sections = await Promise.all(Object.keys(srsStages).map(async srsId => {
			const srs = parseInt(srsId);
			const { name, short, color } = srsStages[srsId];
			const srsReviews = reviews.filter(review => review["srs_stage"] === srs && !review["hidden_at"]);
			const subjects = await db.getAll("subjects", "srs_stage", parseInt(srs));
			const characters = srsReviews.map(review => {
				const subject = subjects.find(subject => subject["id"] === review["subject_id"]);
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
					item: (elem, value) => dataTile(subjects, elem, value),
					section: (wrapper, title, content) => headerSRSDecoration(title, srs)
				} 
			};
		}));
		
		list = new TilesList(
			reviewsList,
			sections,
			{
				title: `<b>${count}</b> Reviews available right now!`,
				height: 400,
				bars: {
					labels: true
				},
				sections: {
					fillWidth: false,
					join: false,
					notFound: "No reviews found. You're all caught up!"
				}
			}
		);

		if (popupLoading) popupLoading.remove();
	}
});