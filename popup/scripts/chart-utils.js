const chartTitleToDate = (chart, withinBar) => {
	let hours, hour;
	const chartTitle = chart.options.plugins.title.text;
	const time = (withinBar || chartTitle !== "Reviews in the next 24 hours") && chart.tooltip.title ? chart.tooltip.title[0] : null;
	if (time) {
		hours = time.split(" ")[0];
		const ampm = time.split(" ")[1]?.toLowerCase();
		hour = parseInt(hours);
	
		if (ampm === "pm" && hour != 12)
			hour += 12;
		if (ampm === "am" && hour == 12)
			hour = 0;
	}
		   
	// construct date
	let date;
	// check if title is next 24 hours
	if (hours && chartTitle === "Reviews in the next 24 hours") {
		// if hours afer 12 AM and before current time, add 1 day
		const now = new Date();
		if (hour < now.getHours())
			date = changeDay(now, 1);
		else
			date = now;
	}
	else if (time) {
		date = chartTitle.split(", ")[1].replace(/(st|nd|rd|th)/, ""); 

		// add year
		const month = chartTitle.split(", ")[1].split(" ")[0];
		if (month === "January" && new Date().getMonth() === 11)
			date += ` ${new Date().getFullYear()+1}`;
		else
			date += ` ${new Date().getFullYear()}`;
		date = new Date(date);
	}

	// add hours
	if (date) {
		date.setHours(hour || 1);
		date.setMinutes(0);
		date.setSeconds(0);
	}

	return date;
}

const getBarIndex = (e, size) => {
	const chartLeftOffset = 14;
	const barWidth = (e.chart.width - chartLeftOffset) / size;
	return Math.floor(e.x / barWidth) - 1;
}

const highlightBar = (e, item, color, selected=null) => {
	const clickIndex = getBarIndex(e, chart.data.labels.length);

	if (item.length > 0) {
		// highlight single clicked bar from chart
		chart.data.datasets.forEach(dataset => {
			// currently highlighted index
			const currentHighlighted = dataset.backgroundColor.findIndex(c => c === color);
			// highlight the bar at clickedIndex
			const newColor = color;
			dataset.backgroundColor = dataset.backgroundColor.map((oldColor, index) => {
				if (index === clickIndex || index === selected)
					return newColor;
				else if (index === currentHighlighted)
					return dataset.backgroundColor.find((_, i) => i != clickIndex && i != currentHighlighted);
				else
					return oldColor;
			});
		});
		chart.update();
	}
}

resetChartColors = (chart, selected=null) => {
	chart.data.datasets.forEach(dataset => {
		const backgroundColors = dataset.backgroundColor;
		const commonColor = backgroundColors.find(color => backgroundColors.indexOf(color) !== backgroundColors.lastIndexOf(color));
		dataset.backgroundColor = backgroundColors.map((color, index) => {
			if (index === selected)
				return color;
			else
				return commonColor;
		});
	});
	chart.update();
}