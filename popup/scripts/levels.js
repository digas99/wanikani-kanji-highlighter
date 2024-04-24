let popupLoading;
if (!messagePopup) {
	popupLoading = new MessagePopup(document.body);
	popupLoading.create("Loading data...");
    popupLoading.setLoading();
}

const levelsChart = document.querySelector('#levelsChart canvas');
const levelsList = document.querySelector('#levelsList');
let chart, levelStats, settings;
let resetIndex = 0, nLearningStreaks = 1;

const levelDuration = data => {
	const startedAt = new Date(data["started_at"]);
	const endedAt = data["passed_at"] ? new Date(data["passed_at"]) : new Date();
	const duration = endedAt - startedAt;
	return duration / (1000 * 60 * 60 * 24);
}

const getChartLevelData = (levelsStats, resets) => {
	if (levelsStats) {
		const numberLevelsToDisplay = document.querySelector("#dataSize").value || 10;
		const labels = Object.keys(levelsStats)
			.filter(level => levelsStats[level][resets])
			.slice(-numberLevelsToDisplay);

		const data = Object.values(levelsStats)
			.filter(entry => entry[resets])
			.map(entry => levelDuration(entry[resets]).toFixed(0))
			.slice(-numberLevelsToDisplay);
		
		return { labels, data };
	}
}

const mostLearningStreaks = (levelsStats) => {
	let max = 0;
	Object.keys(levelsStats).forEach(level => {
		const streaks = levelsStats[level].length;
		if (streaks > max) max = streaks;
	});
	return max;
}

const streakDates = (levelsStats, streakIndex) => {
	const streakBeginning = new Date(levelsStats[1][streakIndex]["started_at"]);
	
	let streakEnding = "";
	const streakIndexValues = Object.values(levelsStats).filter(value => value[streakIndex]);
	const latestLevel = streakIndexValues[streakIndexValues.length-1][streakIndex];
	if (latestLevel["abandoned_at"])
		streakEnding = new Date(latestLevel["abandoned_at"]);
	
	return { streakBeginning, streakEnding };
}

const setChartAxes = chart => {
	let horizontal = false;
	const dataSize = document.querySelector("#dataSize");
	if (dataSize)
		horizontal = dataSize.value > 20 && Object.keys(levelsStats).length > 20;

	if (!horizontal) {
		chart.options.aspectRatio = 1.5;
		chart.options.indexAxis = 'x';
		chart.options.scales.x = {
			title: {
				display: true,
				text: 'Levels',
			},
		};
		chart.options.scales.y = {
			type: 'logarithmic',
			ticks: {
				callback: function(value, index, values) {
					return Number(value.toString());
				}
			},
		};
	}
	else {
		chart.options.aspectRatio = 1;
		chart.options.indexAxis = 'y';
		chart.options.scales.x = {
			type: 'logarithmic',
			ticks: {
				callback: function(value, index, values) {
					return Number(value.toString());
				}
			},
		};
		chart.options.scales.y = {};
	}
	chart.update();
}

chrome.storage.local.get(["levels_stats", "settings"], async result => {
	if (popupLoading) popupLoading.remove();
	
	settings = result["settings"];
	if (settings && settings["levels"] && settings["levels"]["dataSize"]) {
		const dataSize = document.querySelector("#dataSize");
		dataSize.value = settings["levels"]["dataSize"];
	}

	const levelsStats = result["levels_stats"];
	if (levelsStats) {
		// update learning streak selector
		nLearningStreaks = mostLearningStreaks(levelsStats);
		const pastResets = document.querySelector("#pastResets");
		for (let i = 1; i < nLearningStreaks; i++) {
			const option = document.createElement("option");
			option.value = i;
			option.textContent = `Learning Streak ${i+1}`;
			pastResets.appendChild(option);

			if (i === nLearningStreaks - 1) {
				option.selected = true;
			}
		}

		// levels list
		let levelsListHTML = "";
		Object.keys(levelsStats).reverse().forEach(level => {
			levelsListHTML += `<a href="/popup/profile.html?level=${level}" class="level" title="Check level ${level}">
				<div class="label">${level}</div>
				<div class="values">`;
			levelsStats[level].reverse().forEach(entry => {
				const duration = levelDuration(entry);
				levelsListHTML += `<div>
					<div>${entry["started_at"].split("T")[0]}</div>
					<div>${duration.toFixed(0)} days</div>
				</div>`;
			});
			levelsListHTML += `</div></a>`;
		});
		levelsList.innerHTML = levelsListHTML;

		// levels chart
		const { labels, data } = getChartLevelData(levelsStats, resetIndex);
		
		const { streakBeginning, streakEnding } = streakDates(levelsStats, resetIndex);
		
		const wanikaniColor = getComputedStyle(document.documentElement).getPropertyValue('--wanikani');
		chart = new Chart(levelsChart, {
			type: 'bar',
			data: {
				labels: labels,
				datasets: [{
					label: 'Days',
					data: data,
					backgroundColor: wanikaniColor,
				}]
			},
			options: {
				responsive: true,
				aspectRatio: 1.5,
				plugins: {
					title: {
						display: true,
						text: [
							`Levels duration in days (Streak ${nLearningStreaks-(resetIndex)})`,
							`${streakBeginning.toISOString().split("T")[0]} - ${streakEnding instanceof Date ? streakEnding.toISOString().split("T")[0] : "now"}`
						],
						padding: 30,
					},
					datalabels: {
						anchor: 'end',
						align: 'top',
						offset: 4,
					},
					legend: {
						display: false,
					},
				},
				scales: {
					y: {
						type: 'logarithmic',
						ticks: {
							callback: function(value, index, values) {
								return Number(value.toString());
							}
						},
					},
					x: {
						title: {
							display: true,
							text: 'Levels',
						}
					}
				}
			},
			plugins: [ChartDataLabels],
		});

		setChartBaseColors(chart);
		setChartAxes(chart);

		// add level subjects progress
		const db = new Database("wanikani");
		const opened = await db.open("subjects");
		if (opened) {
			Object.keys(levelsStats).reverse().forEach(async (level, index) => {
				const subjects = await db.getAll("subjects", "level", Number(level));
				const allPassedSubjects = subjects.filter(subject => subject.passed_at != null);
				const allAvailableSubjects = subjects.filter(subject => subject.hidden_at == null);
				const progress = allPassedSubjects.length / allAvailableSubjects.length * 100;
				let progressDescription = `${allPassedSubjects.length} / ${allAvailableSubjects.length}`;
				let barLabel = "";
				if (progress >= 40)
					barLabel = progressDescription;
				const progressBarHtml = `<div class="progress-bar" title="${progressDescription}  ${progress.toFixed(1)}%">
					<div class="outer">
						<div class="progress" style="width: ${progress}%">${barLabel}</div>
					</div>
				</div>`;
				const levelDiv = levelsList.querySelector(`.level:nth-child(${index+1})`);
				levelDiv.insertAdjacentHTML("beforeend", progressBarHtml);					
			});
		}
	}
});

// monitor theme changes
document.addEventListener("click", e => {
	const target = e.target;
	const button = target.closest(".clickable");
	if (button && (button.querySelector("#light") || button.querySelector("#dark"))) {
		setTimeout(() => setChartBaseColors(chart));
	}
});

document.addEventListener("change", e => {
	const target = e.target;
	if (target.id === "dataSize") {
		const { labels, data } = getChartLevelData(levelsStats, resetIndex);	
		chart.data.labels = labels;
		chart.data.datasets[0].data = data;
		chart.update();
		setChartAxes(chart);

		if (!settings["levels"])
			settings["levels"] = {};
		settings["levels"]["dataSize"] = target.value;
		chrome.storage.local.set({ "settings": settings });
	}

	if (target.id === "pastResets") {
		resetIndex = nLearningStreaks-(Number(target.value)+1);
		const { labels, data } = getChartLevelData(levelsStats, resetIndex);
		const { streakBeginning, streakEnding } = streakDates(levelsStats, resetIndex);

		chart.data.labels = labels;
		chart.data.datasets[0].data = data;
		chart.options.plugins.title.text = [
			`Levels duration in days (Streak ${nLearningStreaks-(resetIndex)})`, 
			`${streakBeginning.toISOString().split("T")[0]} - ${streakEnding instanceof Date ? streakEnding.toISOString().split("T")[0] : "now"}`
		];
		chart.update();
	}
});