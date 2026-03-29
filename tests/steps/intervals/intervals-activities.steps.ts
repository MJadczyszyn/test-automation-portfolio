import { When, Then } from '../../support/bdd-world';
import { expect } from '@playwright/test';
import { logApiRequest, logApiResponse } from '../../support/api-helper';
import { sharedState } from '../strava/strava-auth.steps';

let athleteId: string = '';
let requestedOldest: string = '';
let requestedNewest: string = '';

When('I send a GET request to {string} with pagination', async ({ request, $testInfo }, endpoint: string) => {
  athleteId = process.env.INTERVALS_ATHLETE_ID || '';
  const newest = new Date().toISOString().split('T')[0];
  const oldest = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const fullUrl = `${sharedState.baseUrl}${endpoint.replace('{athleteId}', athleteId)}?oldest=${oldest}&newest=${newest}`;
  const authHeader = 'Basic ' + Buffer.from(`API_KEY:${sharedState.apiKey}`).toString('base64');
  await logApiRequest($testInfo, 'GET', fullUrl, { 'Authorization': 'Basic ***' });
  sharedState.response = await request.get(fullUrl, {
    headers: { 'Authorization': authHeader }
  });
  sharedState.responseBody = await sharedState.response.json();
  await logApiResponse($testInfo, sharedState.response, sharedState.responseBody);
});

When('I send a GET request to {string} with date range filtering', async ({ request, $testInfo }, endpoint: string) => {
  athleteId = process.env.INTERVALS_ATHLETE_ID || '';
  requestedNewest = new Date().toISOString().split('T')[0];
  requestedOldest = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const fullUrl = `${sharedState.baseUrl}${endpoint.replace('{athleteId}', athleteId)}?oldest=${requestedOldest}&newest=${requestedNewest}`;
  const authHeader = 'Basic ' + Buffer.from(`API_KEY:${sharedState.apiKey}`).toString('base64');
  await logApiRequest($testInfo, 'GET', fullUrl, { 'Authorization': 'Basic ***' });
  sharedState.response = await request.get(fullUrl, {
    headers: { 'Authorization': authHeader }
  });
  sharedState.responseBody = await sharedState.response.json();
  await logApiResponse($testInfo, sharedState.response, sharedState.responseBody);
});

Then('the response should contain array of activities', async ({ $testInfo }) => {
  expect(Array.isArray(sharedState.responseBody)).toBeTruthy();
  expect(sharedState.responseBody.length).toBeGreaterThan(0);
  await $testInfo.attach('Activities Count', {
    body: `Found ${sharedState.responseBody.length} activities`,
    contentType: 'text/plain'
  });
});

Then('each activity should have required metadata fields', async ({ $testInfo }) => {
  const expectedAthleteId = process.env.INTERVALS_ATHLETE_ID || '';
  for (const activity of sharedState.responseBody) {
    expect(activity).toHaveProperty('id');
    expect(typeof activity.id).toBe('string');
    expect(activity.id.length).toBeGreaterThan(0);

    expect(activity).toHaveProperty('icu_athlete_id');
    expect(activity.icu_athlete_id).toBe(expectedAthleteId);

    expect(activity).toHaveProperty('start_date_local');
    expect(new Date(activity.start_date_local).toString()).not.toBe('Invalid Date');

    expect(activity).toHaveProperty('source');
    expect(typeof activity.source).toBe('string');
    expect(activity.source.length).toBeGreaterThan(0);
  }
  await $testInfo.attach('Metadata Validation', {
    body: `Validated ${sharedState.responseBody.length} activities - all have required fields (id, icu_athlete_id, start_date_local, source)`,
    contentType: 'text/plain'
  });
});

Then('activities should be sorted from newest to oldest', async ({ $testInfo }) => {
  const dates = sharedState.responseBody.map((a: any) => new Date(a.start_date_local).getTime());
  for (let i = 0; i < dates.length - 1; i++) {
    expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
  }
  const first = sharedState.responseBody[0].start_date_local;
  const last = sharedState.responseBody[sharedState.responseBody.length - 1].start_date_local;
  await $testInfo.attach('Sort Validation', {
    body: `Verified ${dates.length} activities sorted newest to oldest\nNewest: ${first}\nOldest: ${last}`,
    contentType: 'text/plain'
  });
});

Then('all activities should fall within the requested date range', async ({ $testInfo }) => {
  const oldestDate = new Date(requestedOldest).getTime();
  const newestDate = new Date(requestedNewest + 'T23:59:59').getTime();

  for (const activity of sharedState.responseBody) {
    const activityDate = new Date(activity.start_date_local).getTime();
    expect(activityDate).toBeGreaterThanOrEqual(oldestDate);
    expect(activityDate).toBeLessThanOrEqual(newestDate);
  }
  await $testInfo.attach('Date Range Validation', {
    body: `All ${sharedState.responseBody.length} activities fall within ${requestedOldest} to ${requestedNewest}`,
    contentType: 'text/plain'
  });
});

Then('Strava-sourced activities should have API restriction note', async ({ $testInfo }) => {
  const stravaActivities = sharedState.responseBody.filter((a: any) => a.source === 'STRAVA');
  expect(stravaActivities.length).toBeGreaterThan(0);

  for (const activity of stravaActivities) {
    expect(activity).toHaveProperty('_note');
    expect(activity._note).toContain('not available via the API');
  }
  await $testInfo.attach('Strava Restriction Validation', {
    body: `${stravaActivities.length} Strava-sourced activities correctly include API restriction note`,
    contentType: 'text/plain'
  });
});