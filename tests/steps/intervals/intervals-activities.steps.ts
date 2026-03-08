import { Given, When, Then } from '../../support/bdd-world';
import { expect } from '@playwright/test';
import { logApiRequest, logApiResponse } from '../../support/api-helper';
import { sharedState } from '../strava/strava-auth.steps';

let athleteId: string = '';
let activityId: string = '';

When('I send a GET request to {string} with pagination', async ({ request, $testInfo }, endpoint: string) => {
  athleteId = process.env.INTERVALS_ATHLETE_ID || '';
  const fullUrl = `${sharedState.baseUrl}${endpoint.replace('{athleteId}', athleteId)}?oldest=0&newest=${Math.floor(Date.now() / 1000)}`;
  const authHeader = 'Basic ' + Buffer.from(`API_KEY:${sharedState.apiKey}`).toString('base64');
  await logApiRequest($testInfo, 'GET', fullUrl, { 'Authorization': 'Basic ***' });
  sharedState.response = await request.get(fullUrl, {
    headers: { 'Authorization': authHeader }
  });
  sharedState.responseBody = await sharedState.response.json();
  await logApiResponse($testInfo, sharedState.response, sharedState.responseBody);
});

Then('the response should contain array of activities', async ({ $testInfo }) => {
  const activities = sharedState.responseBody.sportSettings;
  expect(activities).toBeDefined();
  expect(Array.isArray(activities)).toBeTruthy();
  expect(activities.length).toBeGreaterThan(0);
  await $testInfo.attach('Activities Count', {
    body: `Found ${activities.length} activities`,
    contentType: 'text/plain'
  });
});

Then('each activity should have required fields', async ({ $testInfo }) => {
  expect(sharedState.responseBody.length).toBeGreaterThan(0);
  const firstActivity = sharedState.responseBody[0];
  expect(firstActivity).toHaveProperty('id');
  expect(firstActivity).toHaveProperty('start_date_local');
  expect(firstActivity).toHaveProperty('type');
  expect(firstActivity).toHaveProperty('name');
  await $testInfo.attach('First Activity Sample', {
    body: JSON.stringify({
      id: firstActivity.id,
      name: firstActivity.name,
      type: firstActivity.type,
      start_date: firstActivity.start_date_local
    }, null, 2),
    contentType: 'application/json'
  });
});

When('I send a GET request to {string}', async ({ request, $testInfo }, endpoint: string) => {
  athleteId = process.env.INTERVALS_ATHLETE_ID || '';
  if (endpoint.includes('{activityId}')) {
    const activitiesUrl = `${sharedState.baseUrl}/athlete/${athleteId}/activities?oldest=0&newest=${Math.floor(Date.now() / 1000)}`;
    const authHeader = 'Basic ' + Buffer.from(`API_KEY:${sharedState.apiKey}`).toString('base64'); 
    const activitiesResponse = await request.get(activitiesUrl, {
      headers: { 'Authorization': authHeader }
    });
    const activities = await activitiesResponse.json();
    if (activities.length > 0) {
      activityId = activities[0].id;
    } else {
      throw new Error('No activities found to test with');
    }
    const fullUrl = `${sharedState.baseUrl}${endpoint.replace('{activityId}', activityId)}`;
    await logApiRequest($testInfo, 'GET', fullUrl, { 'Authorization': 'Basic ***' });
    sharedState.response = await request.get(fullUrl, {
      headers: { 'Authorization': authHeader }
    });
    sharedState.responseBody = await sharedState.response.json();
    await logApiResponse($testInfo, sharedState.response, sharedState.responseBody);
  }
});

Then('the activity should contain detailed training data', async ({ $testInfo }) => {
  expect(sharedState.responseBody).toHaveProperty('id');
  expect(sharedState.responseBody).toHaveProperty('icu_training_load');
  expect(sharedState.responseBody).toHaveProperty('average_watts');
  await $testInfo.attach('Activity Training Data', {
    body: JSON.stringify({
      id: sharedState.responseBody.id,
      training_load: sharedState.responseBody.icu_training_load,
      avg_watts: sharedState.responseBody.average_watts,
      distance: sharedState.responseBody.distance
    }, null, 2),
    contentType: 'application/json'
  });
});

Then('the activity should have power or heart rate data', async () => {
  const hasZones = sharedState.responseBody.average_watts || sharedState.responseBody.average_hr;
  expect(hasZones).toBeTruthy();
});