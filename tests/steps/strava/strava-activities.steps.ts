import { When, Then } from '../../support/bdd-world';
import { expect } from '@playwright/test';
import { logApiRequest, logApiResponse } from '../../support/api-helper';
import { StravaActivities } from '../../support/strava-activities';
import { sharedState } from './strava-auth.steps';

When('I send a GET request to {string} with query parameters:', async ({ request, $testInfo }, endpoint: string, dataTable: any) => {
  const fullUrl = `${sharedState.baseUrl}${endpoint}`;
  const params: any = {};
  const rows = dataTable.raw();
  for (let i = 1; i < rows.length; i++) {
    params[rows[i][0]] = rows[i][1];
  }
  const urlWithParams = `${fullUrl}?${new URLSearchParams(params).toString()}`;
  const headers = { 'Authorization': `Bearer ${sharedState.accessToken}` };
  
  await logApiRequest($testInfo, 'GET', urlWithParams, { 'Authorization': 'Bearer ***' });
  sharedState.response = await request.get(urlWithParams, { headers });
  sharedState.responseBody = await sharedState.response.json();
  await logApiResponse($testInfo, sharedState.response, sharedState.responseBody);
});

Then('the response should be a non-empty array', async ({ $testInfo }) => {
  StravaActivities.validateActivityArray(sharedState.responseBody);
  
  await $testInfo.attach('Array Validation', {
    body: StravaActivities.formatArrayValidation(sharedState.responseBody),
    contentType: 'text/plain'
  });
});

Then('the first activity should have required fields', async ({ $testInfo }) => {
  const activity = sharedState.responseBody[0];
  const isValid = StravaActivities.validateActivity(activity);
  expect(isValid).toBeTruthy();
  await $testInfo.attach('Activity Summary', {
    body: StravaActivities.formatActivitySummary(activity),
    contentType: 'application/json'
  });
});