// ─── Food SEO Writer v2.0 — Seasonal Content Calendar (Section 9) ───

import type { SeasonalSuggestion } from "../types";

// ─── 9.1 Month-by-Month Seasonal Suggestions ───
// Based on Pinterest's 60-90 day content lead time

interface MonthEntry {
  month: string;
  suggestedContent: string;
  pinterestPeakPeriod: string;
}

const SEASONAL_CALENDAR: MonthEntry[] = [
  {
    month: "January",
    suggestedContent: "Spring recipes, Easter, St. Patrick's Day",
    pinterestPeakPeriod: "March-April",
  },
  {
    month: "February",
    suggestedContent: "Spring, Mother's Day brunch, outdoor dining",
    pinterestPeakPeriod: "April-May",
  },
  {
    month: "March",
    suggestedContent: "Summer BBQ, grilling, picnic, 4th of July",
    pinterestPeakPeriod: "May-July",
  },
  {
    month: "April",
    suggestedContent: "Summer entertaining, cold drinks, salads",
    pinterestPeakPeriod: "June-August",
  },
  {
    month: "May",
    suggestedContent: "Back-to-school lunches, fall comfort food",
    pinterestPeakPeriod: "August-September",
  },
  {
    month: "June",
    suggestedContent: "Fall recipes, Halloween, apple/pumpkin",
    pinterestPeakPeriod: "September-October",
  },
  {
    month: "July",
    suggestedContent: "Thanksgiving, holiday appetizers",
    pinterestPeakPeriod: "October-November",
  },
  {
    month: "August",
    suggestedContent: "Thanksgiving, Christmas baking, holiday cookies",
    pinterestPeakPeriod: "November-December",
  },
  {
    month: "September",
    suggestedContent: "Christmas, New Year's Eve, winter comfort food",
    pinterestPeakPeriod: "December-January",
  },
  {
    month: "October",
    suggestedContent: "New Year, winter soups, slow cooker, meal prep",
    pinterestPeakPeriod: "January-February",
  },
  {
    month: "November",
    suggestedContent: "Valentine's Day, Super Bowl food, winter comfort",
    pinterestPeakPeriod: "January-March",
  },
  {
    month: "December",
    suggestedContent: "Valentine's Day, spring cleaning/detox, healthy eating",
    pinterestPeakPeriod: "February-March",
  },
];

// ─── Keyword-to-Season Mapping ───

const SEASONAL_KEYWORDS: Record<string, { peakMonths: string; season: string }> = {
  // Fall/Autumn
  "crockpot": { peakMonths: "September-November", season: "Fall" },
  "slow cooker": { peakMonths: "September-November", season: "Fall" },
  "soup": { peakMonths: "October-January", season: "Fall/Winter" },
  "stew": { peakMonths: "October-January", season: "Fall/Winter" },
  "pumpkin": { peakMonths: "September-November", season: "Fall" },
  "apple": { peakMonths: "September-November", season: "Fall" },
  "thanksgiving": { peakMonths: "October-November", season: "Fall" },
  "casserole": { peakMonths: "September-December", season: "Fall/Winter" },
  "comfort food": { peakMonths: "September-February", season: "Fall/Winter" },
  // Winter/Holiday
  "christmas": { peakMonths: "November-December", season: "Winter" },
  "holiday": { peakMonths: "November-December", season: "Holiday" },
  "cookies": { peakMonths: "November-December", season: "Holiday" },
  "baking": { peakMonths: "October-December", season: "Fall/Winter" },
  "hot chocolate": { peakMonths: "November-February", season: "Winter" },
  // Spring
  "easter": { peakMonths: "March-April", season: "Spring" },
  "spring": { peakMonths: "March-May", season: "Spring" },
  "brunch": { peakMonths: "March-May", season: "Spring" },
  "detox": { peakMonths: "January-March", season: "Winter/Spring" },
  // Summer
  "bbq": { peakMonths: "May-July", season: "Summer" },
  "grill": { peakMonths: "May-August", season: "Summer" },
  "grilling": { peakMonths: "May-August", season: "Summer" },
  "salad": { peakMonths: "May-August", season: "Summer" },
  "smoothie": { peakMonths: "May-August", season: "Summer" },
  "ice cream": { peakMonths: "June-August", season: "Summer" },
  "picnic": { peakMonths: "May-July", season: "Summer" },
  "4th of july": { peakMonths: "June-July", season: "Summer" },
  // Year-round with peaks
  "meal prep": { peakMonths: "January-February", season: "New Year" },
  "healthy": { peakMonths: "January-March", season: "New Year" },
  "super bowl": { peakMonths: "January-February", season: "Winter" },
  "valentine": { peakMonths: "January-February", season: "Winter" },
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Get seasonal suggestion for the current month
 */
export function getSeasonalSuggestion(): SeasonalSuggestion {
  const currentMonthIndex = new Date().getMonth(); // 0-indexed
  const entry = SEASONAL_CALENDAR[currentMonthIndex];

  return {
    currentMonth: entry.month,
    suggestedContent: entry.suggestedContent,
    pinterestPeakPeriod: entry.pinterestPeakPeriod,
    tip: `📅 It's ${entry.month}! Pinterest users are searching 60-90 days ahead. Create content for: ${entry.suggestedContent} (peaks ${entry.pinterestPeakPeriod}).`,
  };
}

/**
 * Check keyword seasonality and return timing advice (Section 9.2)
 */
export function getKeywordSeasonality(keyword: string): string | null {
  const kwLower = keyword.toLowerCase();
  const currentMonth = new Date().getMonth(); // 0-indexed
  const currentMonthName = MONTH_NAMES[currentMonth];

  for (const [term, data] of Object.entries(SEASONAL_KEYWORDS)) {
    if (kwLower.includes(term)) {
      // Parse peak months to determine timing
      const peakParts = data.peakMonths.split("-");
      const peakStartIdx = MONTH_NAMES.findIndex(
        (m) => m.toLowerCase() === peakParts[0].toLowerCase()
      );
      const peakEndIdx = MONTH_NAMES.findIndex(
        (m) => m.toLowerCase() === peakParts[1].toLowerCase()
      );

      if (peakStartIdx === -1 || peakEndIdx === -1) continue;

      // Calculate lead time (60-90 days = ~2-3 months before peak)
      const idealPublishStart = (peakStartIdx - 3 + 12) % 12;
      const idealPublishEnd = (peakStartIdx - 1 + 12) % 12;

      // Determine timing status
      const isInPeakWindow =
        peakStartIdx <= peakEndIdx
          ? currentMonth >= peakStartIdx && currentMonth <= peakEndIdx
          : currentMonth >= peakStartIdx || currentMonth <= peakEndIdx;

      const isInLeadWindow =
        idealPublishStart <= idealPublishEnd
          ? currentMonth >= idealPublishStart && currentMonth <= idealPublishEnd
          : currentMonth >= idealPublishStart || currentMonth <= idealPublishEnd;

      if (isInLeadWindow) {
        return `💡 Tip: '${keyword}' peaks on Pinterest in ${data.peakMonths}. Great timing! Publish now for maximum ${data.season} traffic.`;
      } else if (isInPeakWindow) {
        return `⚡ Tip: '${keyword}' is in peak season right now (${data.peakMonths})! Publish immediately to catch the remaining traffic.`;
      } else {
        return `📌 Tip: '${keyword}' peaks on Pinterest in ${data.peakMonths}. You're currently in ${currentMonthName}. Plan to publish 60-90 days before the peak for best results.`;
      }
    }
  }

  return null;
}
