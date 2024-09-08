chrome.storage.local.get(["assignments_history"], result => {
	const history = result["assignments_history"];
	const historyWrapper = document.querySelector(".history");
	if (history) {
		let historyCorrection = [];
		// filter assignments from the last 24 hours
		history.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
			.filter(assignment => new Date(assignment.updated_at) > new Date(new Date() - 24 * 60 * 60 * 1000))
			.forEach(assignment => {
				const srsStage = assignment.srs_stage;
				// check if the assignment is correct
				if (srsStage.old != srsStage.new) {
					historyCorrection.push(assignment);

					const failed = srsStage.old > srsStage.new;
					console.log(assignment, failed, srsStage.old);
					const oldSRSColor = srsStage.old < 0 ? "white" : `var(--${srsStages[srsStage.old]["short"].toLowerCase()}-color)`;
					const oldSRSFontColor = srsStage.old < 0 ? "black" : getFontColorFromVar(`--${srsStages[srsStage.old]["short"].toLowerCase()}-color`);
					const newSRSColor = `var(--${srsStages[srsStage.new]["short"].toLowerCase()}-color)`;
					const newSRSFontColor = getFontColorFromVar(`--${srsStages[srsStage.new]["short"].toLowerCase()}-color`);
					const updatedAt = new Date(new Date() - new Date(assignment.updated_at));
					const updatedAtPretty = prettyTime(updatedAt, {seconds: false});
					const availableAt = new Date(new Date(assignment.available_at) - new Date());
					const availableAtPretty = prettyTime(availableAt, {seconds: false, short: true});
					const passedAt = assignment.passed_at ? new Date(new Date() - new Date(assignment.passed_at)) : null;
					const passedAtPretty = assignment.passed_at ? prettyTime(passedAt, {seconds: false}) : null;
					const burnedAt = assignment.burned_at ? new Date(new Date() - new Date(assignment.burned_at)) : null;
					const burnedAtPretty = assignment.burned_at ? prettyTime(burnedAt, {seconds: false}) : null;
					const achievement = assignment.burnedAt ? new Date(assignment.burned_at) : new Date(assignment.passed_at);
					const achievementPretty = burnedAtPretty || passedAtPretty;
					const achievementLogo = burnedAt ? "flame" : "check";
					const statusColor = failed ? "var(--wanikani)" : "var(--wanikani-sec)";
	
					historyWrapper.insertAdjacentHTML("beforeend", /*html*/`
						<div class="history-row section clickable" data-status="${failed ? "mistake" : "correct"}" data-type="${assignment.subject_type}" style="border-left: 5px solid ${statusColor}">
							<div class="history-passed" ${!assignment.passed_at ? 'style="display: none;"' : `title="${achievementPretty} ago \x0D${achievement?.toLocaleString()}"`}><img src="/images/${achievementLogo}.png" class="icon"></div>
							<p class="history-date" title="${new Date(assignment.updated_at).toLocaleString()}">${updatedAtPretty} ago</p>
							<div class="tiles-list-section">
								<ul class="history-characters">
									<div><li class="clickable kanjiDetails" data-item-id="${assignment.id}" title="${assignment.meanings[0]} \x0DLevel ${assignment.level}" style="background-color: ${oldSRSColor}; color:${oldSRSFontColor};">${assignment.characters}</li></div>
									<div><img class="history-transition-arrow icon" src="/images/up-arrow-thick.png"></div>
									<div><li class="clickable kanjiDetails" data-item-id="${assignment.id}" title="${assignment.meanings[0]} \x0DLevel ${assignment.level}" style="background-color: ${newSRSColor}; color:${newSRSFontColor};">${assignment.characters}</li></div>
								</ul>
							</div>
							<div class="history-srs">
								<div>${srsStage.old < 0 ? "Locked" : srsStages[srsStage.old]["name"]}</div>
								<div>${assignment.subject_type.charAt(0).toUpperCase()+assignment.subject_type.slice(1).split("_").join(" ")}</div>
								<div>${srsStages[srsStage.new]["name"]}</div>
							</div>
							<div class="history-extra" style="display: none">
								<div><b>${assignment.level}</b> &nbsp; ${assignment.meanings[0]}</div>
								<div style="color: ${statusColor}">${failed ? "Mistake" : "Correct"}</div>
								<div title="${new Date(assignment.available_at).toLocaleString()}">Next in ${availableAtPretty}</div>
							</div>
						</div>
					`);
				}
			});

			// update storage with corrected history if needed
			if (historyCorrection.length < history.length) {
				chrome.storage.local.set({assignments_history: historyCorrection});
			}
	}

	// filter
	const filterWrapper = document.querySelector("#secPageButtons");
	filterWrapper.insertAdjacentHTML("beforeend", /*html*/`
		<select class="history-filter select">
			<option value="all">All</option>
			<option value="correct">Correct</option>
			<option value="mistake">Mistake</option>
			<option value="radical">Radicals</option>
			<option value="kanji">Kanji</option>
			<option value="vocabulary">Vocabulary</option>
			<option value="kana_vocabulary">Kana Vocabulary</option>
		</select>
	`);
	const filter = document.querySelector(".history-filter");
	filter.addEventListener("change", e => {
		const value = e.target.value;
		const rows = document.querySelectorAll(".history-row");
		const toRemove = Array.from(rows).filter(row => {
			if (value === "all") return false;
			if (value === "correct") return row.dataset.status === "mistake";
			if (value === "mistake") return row.dataset.status === "correct";
			if (value === "radical") return row.dataset.type !== "radical";
			if (value === "kanji") return row.dataset.type !== "kanji";
			if (value === "vocabulary") return row.dataset.type !== "vocabulary";
			if (value === "kana_vocabulary") return row.dataset.type !== "kana_vocabulary";
		});

		rows.forEach(row => row.style.removeProperty("display"));
		toRemove.forEach(row => row.style.display = "none");
	});
		
});

const getFontColorFromVar = (varName) => {
	const hex = getComputedStyle(document.documentElement).getPropertyValue(varName);
	const rgb = hexToRGB(hex);
	return fontColorFromBackground(rgb.r, rgb.g, rgb.b);
}

document.addEventListener("click", e => {
	// show history extra
	if (e.target.closest(".history-row") && !e.target.closest(".kanjiDetails")) {
		const row = e.target.closest(".history-row");
		const extra = row.querySelector(".history-extra");
		// swap display
		if (extra.style.display === "none")
			extra.style.removeProperty("display");
		else
			extra.style.display = "none";
	}
});