const srsStages = {
	0: {name:"Locked", short: "Lkd"},
	1: {name:"Apprentice1", short: "Ap1"},
	2: {name:"Apprentice2", short: "Ap2"},
	3: {name:"Apprentice3", short: "Ap3"},
	4: {name:"Apprentice4", short: "Ap4"},
	5: {name:"Guru1", short: "Gr1"},
	6: {name:"Guru2", short: "Gr2"},
	7: {name:"Master", short: "Mst"},
	8: {name:"Enlighted", short: "Enl"},
	9: {name:"Burned", short: "Brn"}
};

const defaultSettings = {
	"kanji_details_popup": {
		activated: true
	},
	"extension_icon": {
		kanji_counter: true
	},
	"highlight_style": {
		learned: "wkhighlighter_highlighted",
		not_learned: "wkhighlighter_highlightedNotLearned"
	},
	"search": {
		targeted_search: false,
		results_display: "searchResultOptionlist"
	},
	"appearance": {
		highlight_learned: "#2c5091",
		highlight_not_learned: "#a32727",
		details_popup: "#475058",
		radical_color: "#65b6ae",
		kanji_color: "#e7e485",
		vocab_color: "#fc759b"
	},
	"assignments": {
		srsMaterialsDisplay: {
			0: true,
			1: true,
			2: true,
			3: true,
			4: true,
			5: true,
			6: true,
			7: true,
			8: true,
			9: true,
		}
	}
};

const wanikaniPattern = {
	radical_color: "#00a1f1",
	kanji_color: "#f100a1",
	vocab_color: "#a100f1"
};

const unwantedTags = ["html", "body", "head", "title", "style", "link", "meta", "script", "noscript", "img", "svg"];

const urlChecker = new RegExp("^(chrome||devtools)(-[a-zA-Z0-9]+)?:\/\/");