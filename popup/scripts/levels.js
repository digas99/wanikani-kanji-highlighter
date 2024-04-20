const levelsChart = document.querySelector('#levelsChart canvas');
const levelsList = document.querySelector('#levelsList');
let chart;

const levelDuration = data => {
	const startedAt = new Date(data["started_at"]);
	const endedAt = data["passed_at"] ? new Date(data["passed_at"]) : new Date();
	const duration = endedAt - startedAt;
	return duration / (1000 * 60 * 60 * 24);
}

chrome.storage.local.get(["levels_stats"], async result => {
	const levelsStats = result["levels_stats"];
	if (levelsStats) {
		// levels list
		let levelsListHTML = "";
		Object.keys(levelsStats).reverse().forEach(level => {
			levelsListHTML += `<div class="level">
				<div class="label">${level}</div>
				<div class="values">`;
			levelsStats[level].reverse().forEach(entry => {
				const duration = levelDuration(entry);
				levelsListHTML += `<div>
					<div>${entry["started_at"].split("T")[0]}</div>
					<div>${duration.toFixed(0)} days</div>
				</div>`;
			});
			levelsListHTML += `</div></div>`;
		});
		levelsList.innerHTML = levelsListHTML;

		// levels chart
		const numberLevelsToDisplay = 10;
		const labels = Object.keys(levelsStats).slice(-numberLevelsToDisplay);
		const data = Object.values(levelsStats).map(entry => levelDuration(entry[0]).toFixed(0)).slice(-numberLevelsToDisplay);
		console.log(data, labels);

		// get color code from --wanikani
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
				maintainAspectRatio: false,
				plugins: {
					title: {
						display: true,
						text: 'Levels duration in days',
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