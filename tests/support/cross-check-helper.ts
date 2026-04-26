export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  moving_time: number;
  elapsed_time: number;
  distance: number;
}

export interface IntervalsActivity {
  id: string;
  icu_athlete_id: string;
  source: string;
  start_date_local: string;
  _note?: string;
  // These fields are only available for non-Strava-sourced activities:
  name?: string;
  type?: string;
  moving_time?: number;
  elapsed_time?: number;
}

export class CrossCheckHelper {
  /**
   * Finds an Intervals.icu activity that matches the Strava activity ID.
   * Intervals stores Strava activity IDs as strings in their `id` field.
   */
  static findByStravaId(
    stravaActivity: StravaActivity,
    intervalsActivities: IntervalsActivity[]
  ): IntervalsActivity | null {
    const stravaIdStr = String(stravaActivity.id);
    return intervalsActivities.find((ia) => ia.id === stravaIdStr) ?? null;
  }

  /**
   * Calculates the difference in hours between Strava start_date (UTC)
   * and Intervals start_date_local (athlete's local timezone).
   *
   * Since Intervals only returns local time without timezone info,
   * we compare the raw hour/minute/second components accounting for
   * a maximum expected timezone offset of ±14 hours.
   */
  static getDateDiffHours(
    stravaActivity: StravaActivity,
    intervalsActivity: IntervalsActivity
  ): number {
    const stravaDate = new Date(stravaActivity.start_date);
    // Intervals returns local time without timezone, e.g. "2026-04-26T10:54:31"
    // We parse it as UTC to get raw components for comparison
    const intervalsDateStr = intervalsActivity.start_date_local;
    const intervalsDate = new Date(intervalsDateStr + 'Z');

    const diffMs = Math.abs(stravaDate.getTime() - intervalsDate.getTime());
    return diffMs / (1000 * 60 * 60);
  }

  /**
   * Builds a comparison report for Allure attachments.
   */
  static formatComparisonReport(
    stravaActivity: StravaActivity,
    intervalsActivity: IntervalsActivity
  ): string {
    const dateDiffHours = this.getDateDiffHours(stravaActivity, intervalsActivity);

    return JSON.stringify(
      {
        strava: {
          id: stravaActivity.id,
          name: stravaActivity.name,
          type: stravaActivity.sport_type || stravaActivity.type,
          start_date_utc: stravaActivity.start_date,
          start_date_local: stravaActivity.start_date_local,
          moving_time_s: stravaActivity.moving_time,
          distance_m: stravaActivity.distance,
        },
        intervals: {
          id: intervalsActivity.id,
          icu_athlete_id: intervalsActivity.icu_athlete_id,
          source: intervalsActivity.source,
          start_date_local: intervalsActivity.start_date_local,
          _note: intervalsActivity._note || '(none)',
        },
        comparison: {
          id_match: String(stravaActivity.id) === intervalsActivity.id,
          date_diff_hours: Math.round(dateDiffHours * 100) / 100,
          source_is_strava: intervalsActivity.source === 'STRAVA',
        },
      },
      null,
      2
    );
  }

  /**
   * Formats a diagnostic report when no match is found.
   */
  static formatNoMatchReport(
    stravaActivity: StravaActivity,
    intervalsActivities: IntervalsActivity[]
  ): string {
    return JSON.stringify(
      {
        searched_for: {
          strava_id: stravaActivity.id,
          strava_id_as_string: String(stravaActivity.id),
          name: stravaActivity.name,
          type: stravaActivity.sport_type || stravaActivity.type,
          start_date_utc: stravaActivity.start_date,
        },
        intervals_activities_found: intervalsActivities.map((ia) => ({
          id: ia.id,
          source: ia.source,
          start_date_local: ia.start_date_local,
        })),
      },
      null,
      2
    );
  }
}
