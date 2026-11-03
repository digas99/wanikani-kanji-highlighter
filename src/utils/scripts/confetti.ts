/** A short confetti burst drawn on a canvas (sized to it); resolves when it's over. */

const COLORS = ['#f100a1', '#00aaff', '#9b5de5', '#ffd23f', '#30a46c', '#ffffff'];
const PIECES = 110;
const DURATION_MS = 2200;
const GRAVITY = 0.16;

type Piece = { x: number; y: number; vx: number; vy: number; size: number; color: string; angle: number; spin: number };

export function confettiBurst(canvas: HTMLCanvasElement): Promise<void> {
	const context = canvas.getContext('2d');
	if (!context) return Promise.resolve();
	const ratio = window.devicePixelRatio || 1;
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;
	canvas.width = Math.round(width * ratio);
	canvas.height = Math.round(height * ratio);
	context.scale(ratio, ratio);

	// from the level badge's corner (top left), fanning out across the card
	const pieces: Piece[] = Array.from({ length: PIECES }, () => {
		const angle = -Math.PI / 2 + (Math.random() - 0.3) * Math.PI * 0.9;
		const speed = 3 + Math.random() * 5;
		return {
			x: 40 + Math.random() * 20,
			y: 45,
			vx: Math.cos(angle) * speed * 1.3,
			vy: Math.sin(angle) * speed,
			size: 4 + Math.random() * 4,
			color: COLORS[Math.floor(Math.random() * COLORS.length)],
			angle: Math.random() * Math.PI,
			spin: (Math.random() - 0.5) * 0.3,
		};
	});

	return new Promise(resolve => {
		const start = performance.now();
		const frame = (now: number) => {
			const elapsed = now - start;
			context.clearRect(0, 0, width, height);
			// fades out over the last third
			context.globalAlpha = Math.min(1, 3 * (1 - elapsed / DURATION_MS));
			for (const piece of pieces) {
				piece.vy += GRAVITY;
				piece.vx *= 0.985;
				piece.x += piece.vx;
				piece.y += piece.vy;
				piece.angle += piece.spin;
				context.save();
				context.translate(piece.x, piece.y);
				context.rotate(piece.angle);
				context.fillStyle = piece.color;
				// a strip that seems to flip as it turns
				context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, (piece.size / 2) * Math.abs(Math.cos(piece.angle * 2)) + 1);
				context.restore();
			}
			if (elapsed < DURATION_MS) {
				requestAnimationFrame(frame);
			} else {
				context.clearRect(0, 0, width, height);
				resolve();
			}
		};
		requestAnimationFrame(frame);
	});
}
