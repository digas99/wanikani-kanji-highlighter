const srsStages = {
	0: {name:"Locked", short: "Lkd", color: "#c0c0c0"},
	1: {name:"Apprentice I", short: "Ap1", color: "#84bedb"},
	2: {name:"Apprentice II", short: "Ap2", color: "#58afdb"},
	3: {name:"Apprentice III", short: "Ap3", color: "#2ca2de"},
	4: {name:"Apprentice IV", short: "Ap4", color: "#0093de"},
	5: {name:"Guru I", short: "Gr1", color: "#65ab63"},
	6: {name:"Guru II", short: "Gr2", color: "#15af12"},
	7: {name:"Master", short: "Mst", color: "#bd772f"},
	8: {name:"Enlightened", short: "Enl", color: "#b255bd"},
	9: {name:"Burned", short: "Brn", color: "#b34b50"}
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
		vocab_color: "#fc759b",
		lkd_color: srsStages[0].color,
		ap1_color: srsStages[1].color,
		ap2_color: srsStages[2].color,
		ap3_color: srsStages[3].color,
		ap4_color: srsStages[4].color,
		gr1_color: srsStages[5].color,
		gr2_color: srsStages[6].color,
		mst_color: srsStages[7].color,
		enl_color: srsStages[8].color,
		brn_color: srsStages[9].color
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
	vocab_color: "#a100f1",
	ap1_color: "#cf72b0",
	ap2_color: "#d560ad",
	ap3_color: "#db44a9",
	ap4_color: "#dd0093",
	gr1_color: "#894e97",
	gr2_color: "#882d9e",
	mst_color: "#294ddb",
	enl_color: "#0093dd",
	brn_color: "#434343",
	lkd_color: "#c1c0c1"
};

const flamingDurtlesPattern = {
	ap1_color: "#7dc9fb",
	ap2_color: "#5db9fa",
	ap3_color: "#3da8f6",
	ap4_color: "#1d99f3",
	gr1_color: "#4edeac",
	gr2_color: "#1cdc9a",
	mst_color: "#c9ce3b",
	enl_color: "#f67400",
	brn_color: "#d53b49",
	lkd_color: "#c1c0c1"
}

const unwantedTags = ["html", "body", "head", "title", "style", "link", "meta", "script", "noscript", "img", "svg"];

const urlChecker = new RegExp("^(chrome||devtools)(-[a-zA-Z0-9]+)?:\/\/");