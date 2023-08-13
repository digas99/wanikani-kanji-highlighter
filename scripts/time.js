const msToDays = ms => {
	return ms / (1000 * 60 * 60 * 24);
}

// millisecond to readable format
// stole from: https://stackoverflow.com/questions/19700283/how-to-convert-time-in-milliseconds-to-hours-min-sec-format-in-javascript/32180863#32180863
function msToTime(ms) {
  let seconds = (ms / 1000).toFixed(1);
  let minutes = (ms / (1000 * 60)).toFixed(1);
  let hours = (ms / (1000 * 60 * 60)).toFixed(1);
  let days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);
  if (seconds < 60) return seconds + " Sec";
  else if (minutes < 60) return minutes + " Min";
  else if (hours < 24) return hours + " Hrs";
  else return days + " Days"
}

// format date into <day-name>, <day> <month> <year> <hour>:<minute>:<second> GMT
const formatDate = date => {
	const split = date.toString().split(" ");
	return `${split[0]}, ${split[2]} ${split[1]} ${split[3]} ${split[4]} GMT`;
}

// setup two new functions to Date
var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

Date.prototype.getMonthName = function() {
	return months[ this.getMonth() ];
};

Date.prototype.getWeekDay = function() {
	return days[ this.getDay() ];
};

const simpleFormatDate = (date, format) => {
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

const time12h = hours => new Date('1970-01-01T'+hours+'Z').toLocaleTimeString({}, {timeZone:'UTC', hour12:true, hour:'numeric', minute:'numeric'});

const setExactHour = (date, hour) => {
	return new Date(new Date(new Date(new Date(date).setHours(hour)).setMinutes(0)).setSeconds(0));
}

const nextExactHour = (date, hours) => {
	return new Date(new Date(new Date(new Date(date).setHours(new Date(date).getHours()+hours)).setMinutes(0)).setSeconds(0));
}

const addHours = (date, hours) => {
	return new Date(new Date(date).setHours(new Date(date).getHours()+hours));
}

const changeDay = (date, days) => {
	return new Date(new Date(date).setDate((new Date(date).getDate())+days));
}

// create interval delay
// 10% of a day are 8640000 milliseconds
// 10% of an hour are 360000 milliseconds
// 10% of a minute are 6000 milliseconds
// 10% of a second are 100 milliseconds
const time_delays = {
	"Days":8640000,
	"Hrs":360000,
	"Min":6000,
	"Sec":100
}

const convertToISO8601 = (dateString) => {
	const dateObj = new Date(dateString);
	const isoString = dateObj.toISOString();
	return isoString;
  }