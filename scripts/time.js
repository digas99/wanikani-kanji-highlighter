export const msToDays = ms => {
	return ms / (1000 * 60 * 60 * 24);
}

// millisecond to readable format
export function msToTime(ms) {
  let seconds = (ms / 1000).toFixed(1);
  let minutes = (ms / (1000 * 60)).toFixed(1);
  let hours = (ms / (1000 * 60 * 60)).toFixed(1);
  let days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);
  if (seconds < 60) return seconds + " Sec";
  else if (minutes < 60) return minutes + " Min";
  else if (hours < 24) return hours + " Hrs";
  else return days + " Days"
}

export function msToSimpleTime(ms) {
	const seconds = Math.round(ms / 1000);
	const minutes = Math.round(ms / (1000 * 60));
	const hours = Math.round(ms / (1000 * 60 * 60));
	const days = Math.round(ms / (1000 * 60 * 60 * 24));
  
	if (hours >= 100) { // Show days only if hours are greater than 99
	  return days + 'd';
	} else if (hours >= 1) {
	  return hours + 'h';
	} else if (minutes >= 1) {
	  return minutes + 'm';
	} else {
	  return seconds + 's';
	}
}

export function prettyTime(ms, options = {}) {
    // Calculate the time components
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    // Define label formats based on the short option
    const labels = options.short
        ? { day: 'd', hour: 'h', minute: 'm', second: 's' }
        : { day: ' day', hour: ' hour', minute: ' minute', second: ' second' };

    // Build the formatted time string
    const parts = [];
    if (days > 0 && !(options.days === false)) parts.push(`${days}${labels.day}${days > 1 && !options.short ? 's' : ''}`);
    if (hours > 0 && !(options.hours === false)) parts.push(`${hours}${labels.hour}${hours > 1 && !options.short ? 's' : ''}`);
    if (minutes > 0 && !(options.minutes === false)) parts.push(`${minutes}${labels.minute}${minutes > 1 && !options.short ? 's' : ''}`);
    if (seconds > 0 && !(options.seconds === false)) parts.push(`${seconds}${labels.second}${seconds > 1 && !options.short ? 's' : ''}`);

    return parts.length > 0 ? parts.join(', ') : '0 seconds';
}

// setup two new export functions to Date
export const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

Date.prototype.getMonthName = function() {
	return months[ this.getMonth() ];
};

Date.prototype.getWeekDay = function() {
	return days[ this.getDay() ];
};

export const simpleFormatDate = (date, format) => {
	// make sure it is a Date object
	date = new Date(date);
	let dd = date.getDate();
	let mm = date.getMonth()+1;
	const yyyy = date.getFullYear();
	dd = dd < 10 ? '0'+dd : dd;
	mm = mm < 10 ? '0'+mm : mm;
	let value;
	switch(format) {
		case "mdy":
			value = `${mm}-${dd}-${yyyy}`
			break;
		case "dmy":
			value = `${dd}-${mm}-${yyyy}`
			break;
		case "ymd":
			value = `${yyyy}-${mm}-${dd}`; 
			break;
	}
	return value;
}

export const time12h = hours => new Date('1970-01-01T'+hours+'Z').toLocaleTimeString({}, {timeZone:'UTC', hour12:true, hour:'numeric', minute:'numeric'});

export const setExactHour = (date, hour) => {
	return new Date(new Date(new Date(new Date(date).setHours(hour)).setMinutes(0)).setSeconds(0));
}

export const nextExactHour = (date, hours) => {
	return new Date(new Date(new Date(new Date(date).setHours(new Date(date).getHours()+hours)).setMinutes(0)).setSeconds(0));
}

export const addHours = (date, hours) => {
	return new Date(new Date(date).setHours(new Date(date).getHours()+hours));
}

export const changeDay = (date, days) => {
	return new Date(new Date(date).setDate((new Date(date).getDate())+days));
}

// create interval delay
// 10% of a day are 8640000 milliseconds
// 10% of an hour are 360000 milliseconds
// 10% of a minute are 6000 milliseconds
// 10% of a second are 100 milliseconds
export const time_delays = {
	"Days":8640000,
	"Hrs":360000,
	"Min":6000,
	"Sec":100
}

export const convertToISO8601 = (dateString) => {
	const dateObj = new Date(dateString);
	const isoString = dateObj.toISOString();
	return isoString;
}

export const daysPassed = ms => {
	const days = Number(msToDays(ms).toFixed(0));
	let timePassed;
	if (days == 0) timePassed = "Today";
	else if (days === 1) timePassed = "Yesterday";
	else if (days === -1) timePassed = "Tomorrow";
	else if (days < 0) timePassed = "In "+(days*-1)+((days*-1) === 1 ? " day" : " days");
	else timePassed = days+" days ago";
	return timePassed;
}