// ─── Keyword Intelligence Utility ───

export interface KeywordData {
    id: string;
    label: string;
    url: string;
    searchVolume: number;
    followers: number;
}

export type CompetitionLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface KeywordIntelligence {
    exact: KeywordData | null;
    related: KeywordData[];
    competitionLevel: CompetitionLevel;
    recommendation: string;
}

// ─── Competition Level ───

function getCompetitionLevel(searchVolume: number): CompetitionLevel {
    if (searchVolume > 1_000_000) return 'HIGH';
    if (searchVolume >= 100_000) return 'MEDIUM';
    return 'LOW';
}

// ─── CSV Parser ───

function parseNumber(raw: string): number {
    const cleaned = raw.replace(/,/g, '').trim();
    const n = parseInt(cleaned, 10);
    return isNaN(n) ? 0 : n;
}

export function parseKeywordCSV(rawText: string): KeywordData[] {
    try {
        const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return [];

        // Detect separator: tab or comma (pipe also supported)
        const firstLine = lines[0];
        const separator = firstLine.includes('\t') ? '\t'
            : firstLine.includes('|') ? '|'
            : ',';

        const rows: string[][] = lines.map(line => line.split(separator).map(c => c.trim()));

        // Detect header row
        const headerRow = rows[0];
        const isHeader = headerRow.some(
            h => /^(id|label|url|search\s*volume|followers)$/i.test(h)
        );

        const dataRows = isHeader ? rows.slice(1) : rows;
        const results: KeywordData[] = [];

        for (const cols of dataRows) {
            if (cols.length < 5) continue;

            const id = cols[0];
            const label = cols[1];
            const url = cols[2];
            const searchVolume = parseNumber(cols[3]);
            const followers = parseNumber(cols[4]);

            if (!label) continue;

            results.push({ id, label, url, searchVolume, followers });
        }

        return results;
    } catch {
        return [];
    }
}

// ─── Intelligence Lookup ───

export function getKeywordIntelligence(
    keyword: string,
    csvData: KeywordData[]
): KeywordIntelligence {
    const kwLower = keyword.trim().toLowerCase();
    const kwWords = kwLower.split(/\s+/).filter(Boolean);

    // 1. Exact match
    const exact = csvData.find(
        d => d.label.trim().toLowerCase() === kwLower
    ) || null;

    // 2. Related keywords — contains any word from input
    const related = csvData
        .filter(d => {
            if (exact && d.label.trim().toLowerCase() === kwLower) return false;
            const lbl = d.label.toLowerCase();
            return kwWords.some(w => lbl.includes(w));
        })
        .sort((a, b) => b.searchVolume - a.searchVolume)
        .slice(0, 5);

    // 3. Competition level
    let competitionVolume = 0;
    if (exact) {
        competitionVolume = exact.searchVolume;
    } else if (related.length > 0) {
        competitionVolume = related[0].searchVolume;
    }
    const competitionLevel = getCompetitionLevel(competitionVolume);

    // 4. Recommendation
    let recommendation: string;
    if (!exact) {
        recommendation = 'Keyword not found in your CSV. Upload a CSV with this keyword for full intelligence.';
    } else if (competitionLevel === 'HIGH') {
        const betterTarget = related.find(r => {
            const lvl = getCompetitionLevel(r.searchVolume);
            return lvl === 'MEDIUM' || lvl === 'LOW';
        });
        if (betterTarget) {
            recommendation = `Target '${betterTarget.label}' for faster ranking — lower competition, still ${formatSearchVolume(betterTarget.searchVolume)} monthly searches`;
        } else {
            recommendation = 'High competition keyword. Consider adding long-tail variations to your CSV.';
        }
    } else if (competitionLevel === 'MEDIUM') {
        recommendation = 'Good keyword difficulty. Proceed with this keyword.';
    } else {
        recommendation = 'Low competition — excellent keyword to target now.';
    }

    return { exact, related, competitionLevel, recommendation };
}

// ─── Volume Formatter ───

export function formatSearchVolume(volume: number): string {
    if (volume >= 1_000_000) {
        return `${(volume / 1_000_000).toFixed(1)}M`;
    }
    if (volume >= 1_000) {
        return `${(volume / 1_000).toFixed(1)}K`;
    }
    return String(volume);
}
