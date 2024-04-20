const reviewsList = document.querySelector("#reviewsList");
const reviewsChart = document.querySelector("#reviewsChart");
let db, chart;

let popupLoading;
if (!messagePopup) {
	popupLoading = new MessagePopup(document.body);
	popupLoading.create("Loading subjects...");
	popupLoading.setLoading();
}

let list = new TilesList(
	reviewsList,
	[],
	{
		title: `<b>0</b> Reviews available right now!`,
		height: 250,
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

chrome.storage.local.get(["reviews"], async result => {
	const {count, data, next_reviews} = result["reviews"];
	
	list.updateTitle(`<b>${count}</b> Reviews available right now!`);

	db = new Database("wanikani");
	const opened = await db.open("subjects");
	if (opened) {
		const reviews = data.filter(review => review && !review["hidden_at"])
			.map(review => ({"srs_stage":review["data"]["srs_stage"], "subject_id":review["data"]["subject_id"], "subject_type":review["data"]["subject_type"]}));
		

		const sections = await Promise.all(Object.keys(srsStages).map(async srsId => {
			const srs = parseInt(srsId);
			const { name, short, color } = srsStages[srsId];
			const srsReviews = reviews.filter(review => review["srs_stage"] === srs);
			const subjects = await db.getAll("subjects", "srs_stage", parseInt(srs));
			const characters = srsReviews.map(review => getCharacter(subjects.find(subject => subject["id"] === review["subject_id"])));

			return {
				title: `${name}`,
				color: getComputedStyle(document.body).getPropertyValue(`--${short.toLowerCase()}-color`) || color,
				data: characters,
				callbacks: {
					item: (elem, value) => dataTile(subjects, elem, value),
					section: (wrapper, title, content) => headerSRSDecoration(title, srs)
				},
				justify: true
			};
		}));

		list.update(sections);

		if (popupLoading) popupLoading.remove();
	}

	// setup chart for the next reviews
	if (next_reviews) {
		chrome.storage.local.get(["settings"], result => {
			const futureReviewsCanvas = document.createElement("canvas");
			reviewsChart.appendChild(futureReviewsCanvas);
			const leftArrow = document.createElement("i");
			reviewsChart.appendChild(leftArrow);
			leftArrow.classList.add("left", "clickable", "hidden");
			leftArrow.style.left = "7px";
			const rightArrow = document.createElement("i");
			reviewsChart.appendChild(rightArrow);
			rightArrow.style.right = "7px";
			rightArrow.classList.add("right", "clickable");
			const today = new Date();
			const nextDay = changeDay(today, 1);
			rightArrow.title = `${nextDay.getWeekDay()}, ${nextDay.getMonthName()} ${nextDay.getDate()+ordinalSuffix(nextDay.getDate())}`;
			const daySelectorWrapper = document.createElement("div");
			reviewsChart.parentElement.appendChild(daySelectorWrapper);
			daySelectorWrapper.id = "reviewsDaySelector";
			const daySelectorLabel = document.createElement("label");
			daySelectorWrapper.appendChild(daySelectorLabel);
			daySelectorLabel.appendChild(document.createTextNode("Select another day:"));
			const daySelectorInput = document.createElement("input");
			daySelectorWrapper.appendChild(daySelectorInput);
			daySelectorInput.type = "date";
			// setup values for input
			daySelectorInput.value = simpleFormatDate(today, "ymd"); 
			daySelectorInput.min = simpleFormatDate(changeDay(today, 1), "ymd");
			daySelectorInput.max = simpleFormatDate(changeDay(today, 13), "ymd");
			const futureReviewsLabel = document.createElement("p");
			reviewsChart.parentElement.appendChild(futureReviewsLabel);
			futureReviewsLabel.id = "reviewsPage-nmrReviews24hLabel";
			futureReviewsLabel.innerHTML = "<b>0</b> more Reviews in the next 24 hours";

			settings = result["settings"];
			if (settings) {
				const time12h_format = settings["miscellaneous"]["time_in_12h_format"];
				const days = 1;

				const nmrReviewsNext = filterAssignmentsByTime(next_reviews, today, changeDay(today, days))
												.map(review => ({hour:new Date(review["available_at"]).getHours(), day:new Date(review["available_at"]).getDate(), srs:review["srs_stage"]}));
				futureReviewsLabel.getElementsByTagName("B")[0].innerText = nmrReviewsNext.length;

				const chartData = setupReviewsDataForChart(nmrReviewsNext, today, days, 1, time12h_format);

				const apprData = setupReviewsDataForChart(nmrReviewsNext.filter(review => review["srs"] > 0 && review["srs"] <= 4), today, days, 1, time12h_format);
				const guruData = setupReviewsDataForChart(nmrReviewsNext.filter(review => review["srs"] == 5 || review["srs"] == 6), today, days, 1, time12h_format);
				const masterData = setupReviewsDataForChart(nmrReviewsNext.filter(review => review["srs"] == 7), today, days, 1, time12h_format);
				const enliData = setupReviewsDataForChart(nmrReviewsNext.filter(review => review["srs"] == 8), today, days, 1, time12h_format);

				console.log(chartData, apprData, guruData, masterData, enliData);

				const style = getComputedStyle(document.body);
				const data = {
					labels: chartData["hours"],
					datasets: [{
						label: 'Apprentice',
						backgroundColor: style.getPropertyValue('--ap4-color'),
						borderColor: 'rgb(255, 255, 255)',
						data: apprData["reviewsPerHour"],
						order: 1
					},{
						label: 'Guru',
						backgroundColor: style.getPropertyValue('--gr2-color'),
						borderColor: 'rgb(255, 255, 255)',
						data: guruData["reviewsPerHour"],
						order: 2
					},{
						label: 'Master',
						backgroundColor: style.getPropertyValue('--mst-color'),
						borderColor: 'rgb(255, 255, 255)',
						data: masterData["reviewsPerHour"],
						order: 3
					},{
						label: 'Enlightened',
						backgroundColor: style.getPropertyValue('--enl-color'),
						borderColor: 'rgb(255, 255, 255)',
						data: enliData["reviewsPerHour"],
						order: 4
					}]
				};

				chart = new Chart(futureReviewsCanvas, {
					type: 'bar',
					data,
					options: {
						plugins: {
							title: {
								display: true,
								text: 'Reviews in the next 24 hours',
								padding: 20,
							},
							datalabels: {
								anchor: 'end',
								align: 'top',
								display: ctx => ctx["dataset"]["data"][ctx["dataIndex"]] != 0,
								formatter: (value, ctx) => {
									const type = ctx.dataset.order;
									const values = [];
									for (let t = 1; t <= ctx.chart._metasets.length; t++) {
										values[t] = t != type ? ctx.chart._metasets[t-1]._dataset.data[ctx.dataIndex] : value;
									}
									// create an array with only values != 0
									const finalValues = [];
									Object.keys(values).forEach(key => {
										if (values[key] != 0)
											finalValues[key] = values[key];
									});
									// check if current type is the type at the top of the bar
									if (Math.max.apply(Math, Object.keys(finalValues)) == type)
										return values.reduce((a,b) => a+b);
									else
										return "";

								}
							},
							legend: {
								position: 'bottom',
								labels: {
									padding: 7,
								},
							}
						},
						animation: {
							duration: 0
						},
						scales: {
							x: {
								stacked: true,
							},
							y: {
								stacked: true,
							}
						},
						onClick: (e, item) => {
							if (item.length > 0) {
								//window.location.href = '/popup/progressions.html';
								const time = e.chart.tooltip.title[0];
								const chartTitle = e.chart.options.plugins.title.text;

								// construct date
								let date = chartTitle.split(", ")[1].replace(/(st|nd|rd|th)/, ""); 
								// add year
								const month = chartTitle.split(", ")[1].split(" ")[0];
								if (month === "January" && new Date().getMonth() === 11)
									date += ` ${new Date().getFullYear()+1}`;
								else
									date += ` ${new Date().getFullYear()}`;
								date = new Date(date);

								// add hours which are in am and pm format
								const hours = time.split(" ")[0];
								const ampm = time.split(" ")[1]?.toLowerCase();
								let hour = parseInt(hours);
								if (ampm === "pm" && hour !== 12)
									hour += 12;
								date.setHours(hour);

								window.location.href = `/popup/progressions.html?date=${date.toISOString()}`;
							}
						},
						onHover: (e, item) => {
							if (item.length > 0) {
								e.chart.canvas.style.cursor = 'pointer';
							}
							else {
								e.chart.canvas.style.cursor = 'default';
							}
						},
						onLeave: e => {
							e.chart.canvas.style.cursor = 'default';
						}
					},
					plugins: [ChartDataLabels]
				});

				chart.id = "futureReviewsWrapper";
				setChartBaseColors(chart);

				const nextReviewsData = next_reviews;
				// changing date event listener

				daySelectorInput.addEventListener("input", e => {
					const newDate = e.target.value;
					updateChartReviewsOfDay(nextReviewsData, chart, newDate, futureReviewsLabel, time12h_format);
					arrowsDisplay(leftArrow, rightArrow, daySelectorInput.value, daySelectorInput.min, daySelectorInput.max);
				});
				// arrows event listener
				leftArrow.addEventListener("click", () => {
					const newDate = changeDay(daySelectorInput.value, -1);
					updateChartReviewsOfDay(nextReviewsData, chart, newDate, futureReviewsLabel, time12h_format);
					daySelectorInput.value = simpleFormatDate(newDate, "ymd");
					arrowsDisplay(leftArrow, rightArrow, daySelectorInput.value, daySelectorInput.min, daySelectorInput.max);
				});
				rightArrow.addEventListener("click", () => {
					const newDate = changeDay(daySelectorInput.value, 1);
					rightArrow.title = `${newDate.getWeekDay()}, ${newDate.getMonthName()} ${newDate.getDate()+ordinalSuffix(newDate.getDate())}`;
					updateChartReviewsOfDay(nextReviewsData, chart, newDate, futureReviewsLabel, time12h_format);
					daySelectorInput.value = simpleFormatDate(newDate, "ymd");
					arrowsDisplay(leftArrow, rightArrow, daySelectorInput.value, daySelectorInput.min, daySelectorInput.max);
				});
			}
		});
	}
});

const arrowsDisplay = (leftArrow, rightArrow, value, min, max) => {
	if (value === min) {
		leftArrow.classList.add("hidden");
		if (rightArrow.classList.contains("hidden"))
			rightArrow.classList.remove("hidden");
	}
	if (value === max) {
		rightArrow.classList.add("hidden");
		if (leftArrow.classList.contains("hidden"))
			leftArrow.classList.remove("hidden");
	}
	if (value !== min && value !== max) {
		if (rightArrow.classList.contains("hidden"))
			rightArrow.classList.remove("hidden");
		if (leftArrow.classList.contains("hidden"))
			leftArrow.classList.remove("hidden");
	}

	const previousDay = changeDay(value, -1);
	const nextDay = changeDay(value, 1);
	leftArrow.title = `${previousDay.getWeekDay()}, ${previousDay.getMonthName()} ${previousDay.getDate()+ordinalSuffix(previousDay.getDate())}`;
	rightArrow.title = `${nextDay.getWeekDay()}, ${nextDay.getMonthName()} ${nextDay.getDate()+ordinalSuffix(nextDay.getDate())}`;
}

// monitor theme changes
document.addEventListener("click", e => {
	const target = e.target;
	const button = target.closest(".clickable");
	if (button && (button.querySelector("#light") || button.querySelector("#dark"))) {
		setTimeout(() => setChartBaseColors(chart));
	}
});