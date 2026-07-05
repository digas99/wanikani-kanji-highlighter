export type VersionStatus = 'latest' | 'outdated' | 'dev' | null;

export type ChangelogSection = {
	id: string;
	label: string;
	html: string;
};

function parseVersionParts(version: string): number[] {
	return version
		.replace(/^v/i, '')
		.split('.')
		.map(part => Number.parseInt(part.replace(/[^\d]/g, ''), 10) || 0);
}

export function compareVersions(current: string, latest: string): VersionStatus {
	const currentParts = parseVersionParts(current);
	const latestParts = parseVersionParts(latest);

	for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i += 1) {
		const currentPart = currentParts[i] ?? 0;
		const latestPart = latestParts[i] ?? 0;

		if (currentPart > latestPart) return 'dev';
		if (currentPart < latestPart) return 'outdated';
	}

	return 'latest';
}

export async function fetchLatestReleaseTag(
	owner: string,
	repo: string,
): Promise<string | null> {
	try {
		const response = await fetch(
			`https://api.github.com/repos/${owner}/${repo}/releases?per_page=1`,
		);

		if (!response.ok) return null;

		const releases = await response.json();
		return releases?.[0]?.tag_name ?? null;
	} catch {
		return null;
	}
}

function inlineMarkdown(text: string): string {
	return text
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function sectionMarkdownToHtml(section: string): string {
	const lines = section.split('\n');
	const htmlParts: string[] = [];
	let listOpen = false;

	const closeList = () => {
		if (listOpen) {
			htmlParts.push('</ul>');
			listOpen = false;
		}
	};

	for (const line of lines) {
		const trimmed = line.trim();

		if (!trimmed) {
			closeList();
			continue;
		}

		const h1Match = trimmed.match(/^# \[Changelog v([^\]]+)\]\(([^)]+)\)/);
		if (h1Match) {
			closeList();
			htmlParts.push(
				`<h1 id="changelog-v${h1Match[1]}"><a href="${h1Match[2]}" target="_blank" rel="noopener">Changelog v${h1Match[1]}</a></h1>`,
			);
			continue;
		}

		const h2Match = trimmed.match(/^## (.+)$/);
		if (h2Match) {
			closeList();
			htmlParts.push(`<h2>${inlineMarkdown(h2Match[1])}</h2>`);
			continue;
		}

		const listMatch = trimmed.match(/^- (.+)$/);
		if (listMatch) {
			if (!listOpen) {
				htmlParts.push('<ul>');
				listOpen = true;
			}
			htmlParts.push(`<li>${inlineMarkdown(listMatch[1])}</li>`);
			continue;
		}

		closeList();
		htmlParts.push(`<p>${inlineMarkdown(trimmed)}</p>`);
	}

	closeList();
	return htmlParts.join('\n');
}

export function parseChangelogMarkdown(markdown: string): ChangelogSection[] {
	return markdown
		.split(/\n(?=# \[Changelog v)/)
		.map(section => section.trim())
		.filter(Boolean)
		.map(section => {
			const labelMatch = section.match(/^# \[Changelog v([^\]]+)\]/);
			const label = labelMatch?.[1] ?? 'unknown';

			return {
				id: `changelog-v${label}`,
				label,
				html: sectionMarkdownToHtml(section),
			};
		});
}
