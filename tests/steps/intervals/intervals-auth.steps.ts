import { Given, When, Then } from '../../support/bdd-world';
import { expect } from '@playwright/test';
import { logApiRequest, logApiResponse } from '../../support/api-helper';
import { sharedState } from '../strava/strava-auth.steps';

let athleteId: string = '';

Given('I have a valid Intervals.icu API key from environment variables', async () => {
  sharedState.apiKey = process.env.INTERVALS_API_KEY || '';
  expect(sharedState.apiKey).toBeTruthy();
});

Given('I have my athlete ID from environment variables', async () => {
  athleteId = process.env.INTERVALS_ATHLETE_ID || '';
  expect(athleteId).toBeTruthy();
});

Given('the Intervals.icu API base URL is {string}', async ({}, url: string) => {
  sharedState.baseUrl = url;
});

Given('I have an invalid API key {string}', async ({}, apiKey: string) => {
  sharedState.apiKey = apiKey;
});

When('I send a GET request to {string} with API key authentication', async ({ request, $testInfo }, endpoint: string) => {
  // Zamień {athleteId} na prawdziwe ID
  const fullUrl = `${sharedState.baseUrl}${endpoint.replace('{athleteId}', athleteId)}`;
  
  const authHeader = 'Basic ' + Buffer.from(`API_KEY:${sharedState.apiKey}`).toString('base64');
  
  await logApiRequest($testInfo, 'GET', fullUrl, { 'Authorization': 'Basic ***' });
  
  sharedState.response = await request.get(fullUrl, {
    headers: { 'Authorization': authHeader }
  });
  
  sharedState.responseBody = await sharedState.response.json();
  await logApiResponse($testInfo, sharedState.response, sharedState.responseBody);
});

Then('the athlete profile should contain id and name', async () => {
  expect(sharedState.responseBody).toHaveProperty('id');
  expect(sharedState.responseBody).toHaveProperty('name');
  expect(typeof sharedState.responseBody.id).toBe('string');
  expect(typeof sharedState.responseBody.name).toBe('string');
});