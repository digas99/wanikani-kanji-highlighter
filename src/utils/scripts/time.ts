export type PrettyTimeOptions = {
	short?: boolean;
	days?: boolean;
	hours?: boolean;
	minutes?: boolean;
	seconds?: boolean;
};

export function prettyTime(ms: number, options: PrettyTimeOptions = {}) {
	const seconds = Math.floor((ms / 1000) % 60);
	const minutes = Math.floor((ms / (1000 * 60)) % 60);
	const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
	const days = Math.floor(ms / (1000 * 60 * 60 * 24));

	const labels = options.short
		? { day: 'd', hour: 'h', minute: 'm', second: 's' }
		: { day: ' day', hour: ' hour', minute: ' minute', second: ' second' };

	const parts: string[] = [];
	if (days > 0 && options.days !== false) {
		parts.push(`${days}${labels.day}${days > 1 && !options.short ? 's' : ''}`);
	}
	if (hours > 0 && options.hours !== false) {
		parts.push(`${hours}${labels.hour}${hours > 1 && !options.short ? 's' : ''}`);
	}
	if (minutes > 0 && options.minutes !== false) {
		parts.push(`${minutes}${labels.minute}${minutes > 1 && !options.short ? 's' : ''}`);
	}
	if (seconds > 0 && options.seconds !== false) {
		parts.push(`${seconds}${labels.second}${seconds > 1 && !options.short ? 's' : ''}`);
	}

	return parts.length > 0 ? parts.join(', ') : '0 seconds';
}
