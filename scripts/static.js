const srsStages = {
	0: {name:"Initiate", short: "Int", color: "#c0c0c0"},
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
		highlight_learned: "#2c5091",
		highlight_not_learned: "#a32727",
		details_popup: "#404040",
		radical_color: "#65b6ae",
		kanji_color: "#e7e485",
		vocab_color: "#fc759b",
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
		kana_writing: false,
		extension_popup_width: 300
		// show_scripts_status: true
	},
	"sizes": {
		highlighted_kanji_height: 150,
		reviews_list_height: 235,
		lessons_list_height: 450
	}
};

const settingsInterface = [
	{
		title:"Kanji Details Popup",
		options: [
			{
				title:"Activated",
				type: "checkbox",
				id:"settings-kanji_details_popup-activated",
				description: "Activate Details Popup script (side panel with subject information)"
			},
			{
				title: "Key Bindings",
				type: "checkbox",
				id: "settings-kanji_details_popup-key_bindings",
				description: "Enable Hotkeys within Details Popup"
			},
			{
				title: "Random Subject",
				type: "select",
				options: ["Any", "Kanji", "Vocabulary"],
				id: "settings-kanji_details_popup-random_subject",
				description: "Type of subject that will appear upon clicking on the button Random on the Extension Popup side panel"
			},
			{
				title: "Popup Opacity",
				type: "slider",
				range: {
					min: 0,
					max: 10,
					value: 7
				},
				id: "settings-kanji_details_popup-popup_opacity",
				description: "Opacity of the small Details Popup that shows up when hovering a kanji. \x0DTip: opacity changes in real time if small popup is open (hover a kanji or get a random subject)."
			}
		]
	},
	{
		title:"Extension Icon",
		options: [
			{
				title:"Kanji Counter",
				type: "checkbox",
				id:"settings-extension_icon-kanji_counter",
				description: "Show Kanji Counter on the Extension icon"
			},
			// {
			// 	title:"Time Until Next Reviews",
			// 	type: "checkbox",
			// 	id:"settings-extension_icon-time_until_next_reviews"
			// },
			// {
			// 	title:"Number of Reviews",
			// 	type: "checkbox",
			// 	id:"settings-extension_icon-number_of_reviews"
			// },
			// {
			// 	title:"Number of Lessons",
			// 	type: "checkbox",
			// 	id:"settings-extension_icon-number_of_lessons"
			// }
		]
	},
	{
		title:"Notifications",
		options: [
			{
				title:"New Reviews",
				type: "checkbox",
				id:"settings-notifications-new_reviews",
				description: "Be notified whenever new reviews are available (browser needs to be open)"
			},
			{
				title:"Practice Reminder",
				type: "checkbox",
				id:"settings-notifications-practice_reminder",
				description: "Be notified at a specific time of the day to practice Japanese (browser needs to be open)"
			},
			{
				title:"Searching a Webpage Word",
				type: "checkbox",
				id:"settings-notifications-searching_a_webpage_word",
				description: "Get a notification when searching a word from a webpage on the extension"
			}
		]
	},
	{
		title: "Miscellaneous",
		options: [
			{
				title: "Time in 12h Format",
				type: "checkbox",
				id: "settings-miscellaneous-time_in_12h_format",
				description: "Set timestamps within the Extension Popup to be on 12h Format"
			},
			{
				title: "Kana Writing",
				type: "checkbox",
				id: "settings-miscellaneous-kana_writing",
				description: "Write Kana on text inputs on a webpage. Some inputs might not work."
			},
			{
				title: "Extension Popup Width",
				type: "slider",
				range: {
					min: 400,
					max: 725,
					value: 400
				},
				id: "settings-miscellaneous-extension_popup_width",
				description: "Width of the Extension Popup window."
			}
			// {
			// 	title: "Show Scripts Status",
			// 	type: "checkbox",
			// 	id: "show_scripts_status"
			// }
		]
	}
	// {
	// 	title:"Highlight Style",
	// 	options: [
	// 		{
	// 			title:"Learned",
	// 			type: "chooser",
	// 			options: [
	// 				{
	// 					text:"A",
	// 					classes: ["wkhighlighter_highlighted", "settings_highlight_style_option" ,"clickable"]
	// 				},
	// 				{
	// 					text:"A",
	// 					classes: ["wkhighlighter_highlighted_underlined", "settings_highlight_style_option" ,"clickable"]
	// 				},
	// 				{
	// 					text:"A",
	// 					classes: ["wkhighlighter_highlighted_bold", "settings_highlight_style_option" ,"clickable"]
	// 				}
	// 			]
	// 		},
	// 		{
	// 			title:"Not Learned",
	// 			type: "chooser",
	// 			options: [
	// 				{
	// 					text:"A",
	// 					classes: ["wkhighlighter_highlightedNotLearned", "settings_highlight_style_option" ,"clickable"]
	// 				},
	// 				{
	// 					text:"A",
	// 					classes: ["wkhighlighter_highlightedNotLearned_underlined", "settings_highlight_style_option" ,"clickable"]
	// 				},
	// 				{
	// 					text:"A",
	// 					classes: ["wkhighlighter_highlightedNotLearned_bold", "settings_highlight_style_option" ,"clickable"]
	// 				}
	// 			]
	// 		}
	// 	]
	// },
	// {
	// 	title:"Danger Sections",
	// 	type: "button-description",
	// 	options: [
	// 		{
	// 			title:"Clear Cache",
	// 			id:"clearCash",
	// 			classes: [],
	// 			description:"Clears local data. This won't affect your WaniKani account!"
	// 		}
	// 	]
	// }
];

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
	brn_color: "#e20000",
	int_color: "#c1c0c1"
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
	int_color: "#c1c0c1"
}

const unwantedTags = ["html", "body", "head", "title", "style", "link", "meta", "script", "noscript", "img", "svg"];

const urlChecker = new RegExp("^(chrome|devtools)(-[a-zA-Z0-9]+)?:\/\/");

const defaultWindowSize = 400;
