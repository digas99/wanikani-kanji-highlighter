const srsStages = {
	0: {name:"Initiate", short: "Int", color: "#c1c0c1"},
	1: {name:"Apprentice I", short: "Ap1", color: "#cf72b0"},
	2: {name:"Apprentice II", short: "Ap2", color: "#d560ad"},
	3: {name:"Apprentice III", short: "Ap3", color: "#db44a9"},
	4: {name:"Apprentice IV", short: "Ap4", color: "#dd0093"},
	5: {name:"Guru I", short: "Gr1", color: "#894e97"},
	6: {name:"Guru II", short: "Gr2", color: "#882d9e"},
	7: {name:"Master", short: "Mst", color: "#294ddb"},
	8: {name:"Enlightened", short: "Enl", color: "#0093dd"},
	9: {name:"Burned", short: "Brn", color: "#e20000"}
};

const WANIKANI_COLOR = "#00aaff";
const WANIKANI_SEC_COLOR = "#f100a1";

const defaultSettings = {
	"kanji_details_popup": {
		activated: true,
		random_subject: "Any",
		key_bindings: true,
		popup_opacity: 8
	},
	"extension_icon": {
		kanji_counter: true,
		// time_until_next_reviews: false
	},
	"notifications": {
		new_reviews: false,
		practice_reminder: false,
		practice_reminder_timestamp: "21:30",
		searching_a_webpage_word: true
	},
	"highlight_style": {
		learned: "wkhighlighter_highlighted",
		not_learned: "wkhighlighter_highlightedNotLearned",
	},
	"search": {
		targeted_search: false,
		results_display: "searchResultOptionlist"
	},
	"appearance": {
		highlight_learned: WANIKANI_COLOR,
		highlight_not_learned: WANIKANI_SEC_COLOR,
		details_popup: "#404040",
		radical_color: "#00a1f1",
		kanji_color: "#f100a1",
		vocab_color: "#a100f1",
		int_color: srsStages[0].color,
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
	},
	"miscellaneous": {
		time_in_12h_format: true,
		update_interval: 60,
		//extension_popup_width: 400,
		// srs_info_on_reviews: false
	},
	"sizes": {
		highlighted_kanji_height: 150,
		reviews_list_height: 235,
		lessons_list_height: 450
	},
	"extension_popup_interface": {
		scripts_status: true,
		search_bar: true,
		highlighted_kanji: true,
		lessons_and_reviews: true,
		overall_progression_bar: true,
		overall_progression_stats: true,
		levels_in_progress: true
	},
	"home_page": {
		"page": null
	},
	"profile_menus": {
		"all": {
			"opened": true,
			"menu": {
				"color_by": "Subject Type",
				"reviews_info": true
			},
			"filter": {
				"srs_stage": "None",
				"state": "None"
			},
			"sort": {
				"type": "None",
				"direction": "Ascending"
			}
		},
		"radical": {
			"opened": true,
			"menu": {
				"color_by": "Subject Type",
				"reviews_info": true
			},
			"filter": {
				"srs_stage": "None",
				"state": "None"
			},
			"sort": {
				"type": "None",
				"direction": "Ascending"
			}
		},
		"kanji": {
			"opened": true,
			"menu": {
				"color_by": "Subject Type",
				"reviews_info": true
			},
			"filter": {
				"srs_stage": "None",
				"state": "None"
			},
			"sort": {
				"type": "None",
				"direction": "Ascending"
			}
		},
		"vocabulary": {
			"opened": true,
			"menu": {
				"color_by": "Subject Type",
				"reviews_info": true
			},
			"filter": {
				"srs_stage": "None",
				"state": "None"
			},
			"sort": {
				"type": "None",
				"direction": "Ascending"
			}
		}
	}
};

const wanikaniPattern = {
	highlight_learned: WANIKANI_COLOR,
	highlight_not_learned: WANIKANI_SEC_COLOR,
	details_popup: "#404040",
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
	brn_color: "#e20000",
	int_color: "#c1c0c1"
};

const flamingDurtlesPattern = {
	highlight_learned: WANIKANI_COLOR,
	highlight_not_learned: WANIKANI_SEC_COLOR,
	details_popup: "#404040",
	radical_color: "#65b6ae",
	kanji_color: "#e7e485",
	vocab_color: "#fc759b",
	ap1_color: "#7dc9fb",
	ap2_color: "#5db9fa",
	ap3_color: "#3da8f6",
	ap4_color: "#1d99f3",
	gr1_color: "#4edeac",
	gr2_color: "#1cdc9a",
	mst_color: "#c9ce3b",
	enl_color: "#f67400",
	brn_color: "#d53b49",
	int_color: "#c1c0c1"
}

const graysPattern = {
	highlight_learned: "#6B6B6B",
	highlight_not_learned: "#1E1E1E",
	details_popup: "#404040",
	radical_color: "#9E9E9E",
	kanji_color: "#757575",
	vocab_color: "#505050",
	ap1_color: "#C0C0C0",
	ap2_color: "#808080",
	ap3_color: "#6D6D6D",
	ap4_color: "#474747",
	gr1_color: "#708090",
	gr2_color: "#4c6073",
	mst_color: "#36454F",
	enl_color: "#2C3E50",
	brn_color: "#293133",
	int_color: "#B2BEB5",
  };  

const unwantedTags = ["html", "body", "head", "title", "style", "link", "meta", "script", "noscript", "img", "svg"];

const urlChecker = new RegExp("^(chrome|devtools)(-[a-zA-Z0-9]+)?:\/\/");

const defaultWindowSize = 420;

const RADICAL_SETUP = {
	name: "radicals",
	endpoint: "https://api.wanikani.com/v2/subjects?types=radical",
	storage: {
		id: "radicals",
		updated: "radicals_updated",
		level: "radical_level",
		association: "radical_assoc",
		size: "radicals_size"
	},
};

const VOCAB_SETUP = {
	name: "vocabulary",
	endpoint: "https://api.wanikani.com/v2/subjects?types=vocabulary",
	storage: {
		id: "vocabulary",
		updated: "vocabulary_updated",
		level: "vocab_level",
		association: "vocabulary_assoc",
		size: "vocabulary_size"
	},
};

const KANA_VOCAB_SETUP = {
	name: "kana vocabulary",
	endpoint: "https://api.wanikani.com/v2/subjects?types=kana_vocabulary",
	storage: {
		id: "kana_vocabulary",
		updated: "kana_vocab_updated",
		level: "kanavocab_level",
		association: "kana_vocab_assoc",
		size: "kana_vocab_size"
	},
};

const KANJI_SETUP = {
	name: "kanji",
	endpoint: "https://api.wanikani.com/v2/subjects?types=kanji",
	storage: {
		id: "kanji",
		updated: "kanji_updated",
		level: "kanji_level",
		association: "kanji_assoc",
		size: "kanji_size"
	},
	jlpt: true,
	joyo: true
};

const ASSIGNMENTS_SETUP = {
	endpoint: "https://api.wanikani.com/v2/assignments",
	storage: {
		id: "assignments",
		updated: "assignments_updated"
	}
};

const REVIEWSTATS_SETUP = {
	endpoint: "https://api.wanikani.com/v2/review_statistics",
	storage: {
		updated: "reviewStats_updated"
	}
};

const ASSIGNMENTS = ["reviews", "lessons"];
const PROGRESS = ["radical_progress", "kanji_progress", "vocabulary_progress", "radicals_size", "kanji_size", "vocabulary_size", "radical_levelsInProgress", "kanji_levelsInProgress", "vocabulary_levelsInProgress"];
const HIGHLIGHTED = ["kanji_assoc", "highlighted_kanji"];

const HOME_FETCH_KEYS = ["settings", "userInfo", ...HIGHLIGHTED, ...ASSIGNMENTS , ...PROGRESS]