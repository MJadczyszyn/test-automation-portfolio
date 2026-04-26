import { When, Then } from '../../support/bdd-world';
import { expect } from '@playwright/test';
import { logApiRequest, logApiResponse } from '../../support/api-helper';
import { sharedState } from '../strava/strava-auth.steps';
import {
  CrossCheckHelper,
  StravaActivity,
  IntervalsActivity,
} from '../../support/cross-check-helper';

// ---------------------------------------------------------------------------
// Cross-check state – kept separate from sharedState so Strava and Intervals
// responses don't overwrite each other during multi-step scenarios.
// ---------------------------------------------------------------------------
const crossCheckState = {
  stravaActivity: null as StravaActivity | null,
  intervalsActivities: [] as IntervalsActivity[],
  matchedIntervalsActivity: null as IntervalsActivity | null,
};

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('I fetch the most recent activity from Strava', async ({ request, $testInfo }) => {
  const accessToken = sharedState.accessToken;
  const stravaBaseUrl = process.env.STRAVA_BASE_URL || 'https://www.strava.com/api/v3';
  const url = `${stravaBaseUrl}/athlete/activities?per_page=1`;
  const headers = { Authorization: `Bearer ${accessToken}` };

  await logApiRequest($testInfo, 'GET', url, { Authorization: 'Bearer ***' });

  const response = await request.get(url, { headers });
  const body = await response.json();

  await logApiResponse($testInfo, response, body);

  expect(
    response.status(),
    `Strava /athlete/activities returned ${response.status()}`
  ).toBe(200);
  expect(
    Array.isArray(body) && body.length > 0,
    'Strava returned no activities'
  ).toBeTruthy();

  crossCheckState.stravaActivity = body[0] as StravaActivity;

  await $testInfo.attach('Strava – Most Recent Activity', {
    body: JSON.stringify(
      {
        id: crossCheckState.stravaActivity.id,
        name: crossCheckState.stravaActivity.name,
        type: crossCheckState.stravaActivity.sport_type || crossCheckState.stravaActivity.type,
        start_date_utc: crossCheckState.stravaActivity.start_date,
        start_date_local: crossCheckState.stravaActivity.start_date_local,
        moving_time_s: crossCheckState.stravaActivity.moving_time,
      },
      null,
      2
    ),
    contentType: 'application/json',
  });
});

When(
  'I fetch activities from Intervals for the last {int} days',
  async ({ request, $testInfo }, days: number) => {
    const athleteId = process.env.INTERVALS_ATHLETE_ID || '';
    const apiKey = process.env.INTERVALS_API_KEY || '';
    const intervalsBaseUrl =
      process.env.INTERVALS_BASE_URL || 'https://intervals.icu/api/v1';

    const newest = new Date().toISOString().split('T')[0];
    const oldest = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const url = `${intervalsBaseUrl}/athlete/${athleteId}/activities?oldest=${oldest}&newest=${newest}`;
    const authHeader =
      'Basic ' + Buffer.from(`API_KEY:${apiKey}`).toString('base64');

    await logApiRequest($testInfo, 'GET', url, { Authorization: 'Basic ***' });

    const response = await request.get(url, {
      headers: { Authorization: authHeader },
    });
    const body = await response.json();

    await logApiResponse($testInfo, response, body);

    expect(
      response.status(),
      `Intervals /athlete/activities returned ${response.status()}`
    ).toBe(200);
    expect(Array.isArray(body), 'Intervals returned non-array response').toBeTruthy();

    crossCheckState.intervalsActivities = body as IntervalsActivity[];

    await $testInfo.attach(`Intervals – Activities (last ${days} days)`, {
      body: JSON.stringify(
        {
          count: body.length,
          activity_ids: body.map((a: IntervalsActivity) => a.id),
        },
        null,
        2
      ),
      contentType: 'application/json',
    });
  }
);

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then(
  'the Strava activity ID should exist in Intervals activities',
  async ({ $testInfo }) => {
    const stravaActivity = crossCheckState.stravaActivity;
    const intervalsActivities = crossCheckState.intervalsActivities;

    expect(
      stravaActivity,
      'Strava activity was not fetched – run the When step first'
    ).not.toBeNull();

    const match = CrossCheckHelper.findByStravaId(
      stravaActivity!,
      intervalsActivities
    );

    if (!match) {
      const diagnosticReport = CrossCheckHelper.formatNoMatchReport(
        stravaActivity!,
        intervalsActivities
      );
      await $testInfo.attach('Cross-Check – No Match Found (diagnostic)', {
        body: diagnosticReport,
        contentType: 'application/json',
      });
    }

    expect(
      match,
      `Strava activity ID ${stravaActivity!.id} not found in Intervals.icu. ` +
        `Available Intervals IDs: [${intervalsActivities.map((a) => a.id).join(', ')}]. ` +
        `Check the diagnostic attachment for details.`
    ).not.toBeNull();

    crossCheckState.matchedIntervalsActivity = match;

    const report = CrossCheckHelper.formatComparisonReport(stravaActivity!, match!);
    await $testInfo.attach('Cross-Check – Activity Match Report', {
      body: report,
      contentType: 'application/json',
    });
  }
);

Then(
  'the activity start dates should match within timezone tolerance',
  async ({ $testInfo }) => {
    const stravaActivity = crossCheckState.stravaActivity!;
    const intervalsActivity = crossCheckState.matchedIntervalsActivity!;

    expect(stravaActivity, 'Strava activity missing').not.toBeNull();
    expect(intervalsActivity, 'Matched Intervals activity missing').not.toBeNull();

    const dateDiffHours = CrossCheckHelper.getDateDiffHours(
      stravaActivity,
      intervalsActivity
    );

    // Maximum expected timezone offset is ±14 hours (UTC-12 to UTC+14)
    const maxToleranceHours = 14;

    await $testInfo.attach('Date Comparison', {
      body: JSON.stringify(
        {
          strava_start_date_utc: stravaActivity.start_date,
          strava_start_date_local: stravaActivity.start_date_local,
          intervals_start_date_local: intervalsActivity.start_date_local,
          difference_hours: Math.round(dateDiffHours * 100) / 100,
          max_tolerance_hours: maxToleranceHours,
          explanation:
            'Strava returns UTC, Intervals returns athlete local time. ' +
            'The difference should equal the athlete timezone offset.',
          passed: dateDiffHours <= maxToleranceHours,
        },
        null,
        2
      ),
      contentType: 'application/json',
    });

    expect(
      dateDiffHours,
      `Date difference is ${dateDiffHours.toFixed(2)} hours, exceeds max timezone offset of ${maxToleranceHours}h. ` +
        `Strava (UTC): ${stravaActivity.start_date}, ` +
        `Intervals (local): ${intervalsActivity.start_date_local}`
    ).toBeLessThanOrEqual(maxToleranceHours);
  }
);

Then(
  'the matched Intervals activity should have source {string}',
  async ({ $testInfo }, expectedSource: string) => {
    const intervalsActivity = crossCheckState.matchedIntervalsActivity!;
    expect(intervalsActivity, 'Matched Intervals activity missing').not.toBeNull();

    await $testInfo.attach('Source Verification', {
      body: JSON.stringify(
        {
          intervals_id: intervalsActivity.id,
          expected_source: expectedSource,
          actual_source: intervalsActivity.source,
          match: intervalsActivity.source === expectedSource,
        },
        null,
        2
      ),
      contentType: 'application/json',
    });

    expect(
      intervalsActivity.source,
      `Expected source "${expectedSource}" but got "${intervalsActivity.source}"`
    ).toBe(expectedSource);
  }
);

Then(
  'the matched Intervals activity should have an API restriction note',
  async ({ $testInfo }) => {
    const intervalsActivity = crossCheckState.matchedIntervalsActivity!;
    expect(intervalsActivity, 'Matched Intervals activity missing').not.toBeNull();

    await $testInfo.attach('API Restriction Note', {
      body: JSON.stringify(
        {
          intervals_id: intervalsActivity.id,
          _note: intervalsActivity._note || '(missing)',
          has_note: !!intervalsActivity._note,
        },
        null,
        2
      ),
      contentType: 'application/json',
    });

    expect(
      intervalsActivity._note,
      `Expected API restriction note on Intervals activity ${intervalsActivity.id}, but _note is missing`
    ).toBeTruthy();

    expect(
      intervalsActivity._note,
      `Expected _note to mention API restriction, got: "${intervalsActivity._note}"`
    ).toContain('not available via the API');
  }
);
