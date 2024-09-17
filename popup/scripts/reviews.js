const reviewsList = document.querySelector("#reviewsList");
const reviewsChart = document.querySelector("#reviewsChart");
let db, chart, reviews, availableReviewsCount, selectedBarIndex;

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

const resetReviewsList = async () => {
	list.updateTitle(`<b>${availableReviewsCount}</b> Reviews available right now!`);
	list.update(await setupReviewsSections(reviews, db));
	selectedBarIndex = null;
}

const setupReviewsSections = async (reviews, db) => {
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

	return sections;
}

window.onload = () => {
	// add buttons
	const buttonsWrapper = document.querySelector('#secPageButtons');
	// history button
	buttonsWrapper.insertAdjacentHTML('beforeend', /*html*/`<a href="/popup/reviews_history.html"><img src="/images/history.png" alt="History" title="Reviews history"></a>`);
}

chrome.storage.local.get(["reviews"], async result => {
	const {count, data, next_reviews} = result["reviews"];
	availableReviewsCount = count;

	list.updateTitle(`<b>${count}</b> Reviews available right now!`);

	db = new Database("wanikani");
	const opened = await db.open("subjects");
	if (opened) {
		reviews = data.filter(review => review && !review["hidden_at"])
			.map(review => ({"srs_stage":review["data"]["srs_stage"], "subject_id":review["data"]["subject_id"], "subject_type":review["data"]["subject_type"]}));

		list.update(await setupReviewsSections(reviews, db));

		if (popupLoading) popupLoading.remove();
	}

	// setup chart for the next reviews
	if (next_reviews) {
		chrome.storage.local.get(["settings"], result => {
			const futureReviewsCanvas = document.createElement("canvas");
			reviewsChart.appendChild(futureReviewsCanvas);
			const leftArrow = document.createElement("div");
			reviewsChart.appendChild(leftArrow);
			leftArrow.classList.add("chart-arrow", "clickable", "hidden");
			leftArrow.style.left = "7px";
			const leftArrowElem = document.createElement("i");
			leftArrow.appendChild(leftArrowElem);
			leftArrowElem.classList.add("left");
			const rightArrow = document.createElement("div");
			reviewsChart.appendChild(rightArrow);
			const rightArrowElem = document.createElement("i");
			rightArrow.appendChild(rightArrowElem);
			rightArrow.classList.add("chart-arrow", "clickable");
			rightArrow.style.right = "7px";
			rightArrowElem.classList.add("right");
			const today = new Date();
			const nextDay = changeDay(today, 1);
			rightArrowElem.title = `${nextDay.getWeekDay()}, ${nextDay.getMonthName()} ${nextDay.getDate()+ordinalSuffix(nextDay.getDate())}`;
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

				const style = getComputedStyle(document.body);
				const data = {
					labels: chartData["hours"],
					datasets: [{
						label: 'Apprentice',
						backgroundColor: Array(24).fill(style.getPropertyValue('--ap4-color')),
						borderColor: Array(24).fill('rgb(255, 255, 255)'),
						data: apprData["reviewsPerHour"],
						order: 1
					},{
						label: 'Guru',
						backgroundColor: Array(24).fill(style.getPropertyValue('--gr2-color')),
						borderColor: Array(24).fill('rgb(255, 255, 255)'),
						data: guruData["reviewsPerHour"],
						order: 2
					},{
						label: 'Master',
						backgroundColor: Array(24).fill(style.getPropertyValue('--mst-color')),
						borderColor: Array(24).fill('rgb(255, 255, 255)'),
						data: masterData["reviewsPerHour"],
						order: 3
					},{
						label: 'Enlightened',
						backgroundColor: Array(24).fill(style.getPropertyValue('--enl-color')),
						borderColor: Array(24).fill('rgb(255, 255, 255)'),
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
						onClick: async (e, item) => {
							// clicked on a bar
							if (item.length > 0) {
								selectedBarIndex = getBarIndex(e, chart.data.labels.length);

								const date = chartTitleToDate(chart, true);
								const reviewsData = next_reviews.filter(review => review["available_at"].split(":")[0] == date.toISOString().split(":")[0]);
								const readableDate = date.toLocaleString("en-US", {weekday: "short", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "numeric", second: "numeric"});
								list.update(await setupReviewsSections(reviewsData, db));
								list.updateTitle(`<b>${reviewsData.length}</b> Subjects on <b>${readableDate}</b>`);

								resetChartColors(chart);
								highlightBar(e, item, getComputedStyle(document.body).getPropertyValue('--font-color'));
							}
							// clicked outside a bar
							else {
								let date = chartTitleToDate(chart, false);
								let reviewsData, title;
								if (date) {
									reviewsData = next_reviews.filter(review => review["available_at"].split("T")[0] == date.toISOString().split("T")[0]);
									title = date.toLocaleString("en-US", {weekday: "short", month: "long", day: "numeric", year: "numeric"});
								}
								else {
									// get reviews for the next 24 hours
									// https://stackoverflow.com/a/3224854/11488921
									reviewsData = next_reviews.filter(review => {
										const reviewDate = new Date(review["available_at"]);
										const now = new Date();
										return (reviewDate - now) < (24 * 60 * 60 * 1000) && (reviewDate - now) > 0;
									});
									title = "the next 24 hours";
								}
								list.update(await setupReviewsSections(reviewsData, db));
								list.updateTitle(`<b>${reviewsData.length}</b> Subjects on <b>${title}</b>`);
								resetChartColors(chart);
								selectedBarIndex = null;
							}
						},
						onHover: (e, item) => {
							if (item.length > 0) {
								e.chart.canvas.style.cursor = 'pointer';
								highlightBar(e, item, getComputedStyle(document.body).getPropertyValue('--font-color'), selectedBarIndex);
							}
							else {
								e.chart.canvas.style.cursor = 'default';
							
								const barIndex = getBarIndex(e, chart.data.labels.length);	
								if (barIndex != selectedBarIndex)
									resetChartColors(chart, selectedBarIndex);
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

				daySelectorInput.addEventListener("input", async e => {
					const newDate = e.target.value;
					updateChartReviewsOfDay(nextReviewsData, chart, newDate, futureReviewsLabel, time12h_format);
					arrowsDisplay(leftArrow, rightArrow, daySelectorInput.value, daySelectorInput.min, daySelectorInput.max);
					resetReviewsList();
					resetChartColors(chart);
				});
				// arrows event listener
				leftArrow.addEventListener("click", async () => {
					const newDate = changeDay(daySelectorInput.value, -1);
					updateChartReviewsOfDay(nextReviewsData, chart, newDate, futureReviewsLabel, time12h_format);
					daySelectorInput.value = simpleFormatDate(newDate, "ymd");
					arrowsDisplay(leftArrow, rightArrow, daySelectorInput.value, daySelectorInput.min, daySelectorInput.max);
					resetReviewsList();
					resetChartColors(chart);
				});
				rightArrow.addEventListener("click", async () => {
					const newDate = changeDay(daySelectorInput.value, 1);
					rightArrow.title = `${newDate.getWeekDay()}, ${newDate.getMonthName()} ${newDate.getDate()+ordinalSuffix(newDate.getDate())}`;
					updateChartReviewsOfDay(nextReviewsData, chart, newDate, futureReviewsLabel, time12h_format);
					daySelectorInput.value = simpleFormatDate(newDate, "ymd");
					arrowsDisplay(leftArrow, rightArrow, daySelectorInput.value, daySelectorInput.min, daySelectorInput.max);
					resetReviewsList();
					resetChartColors(chart);
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
		setTimeout(() => {
			setChartBaseColors(chart);
			
			// update highlighted bar
			chart.data.datasets.forEach(dataset => {
				const backgroundColors = dataset.backgroundColor;
				const oldColor = backgroundColors.find(color => backgroundColors.indexOf(color) === backgroundColors.lastIndexOf(color));
				dataset.backgroundColor = backgroundColors.map(color => {
					if (color === oldColor)
						return getComputedStyle(document.body).getPropertyValue('--font-color');
					else
						return color;
				});
			});
			chart.update();
		});
	}

	// clicked outside the chart
	if (!target.closest("#reviewsChart") && getComputedStyle(target).cursor !== "pointer") {
		resetChartColors(chart);
		resetReviewsList();
	}
});