import { Given, When, Then } from '../../support/bdd-world';
import { expect } from '@playwright/test';
import { logApiRequest, logApiResponse } from '../../support/api-helper';
import { StravaClient } from '../../support/strava-client';

export const sharedState = {
  accessToken: '',
  baseUrl: '',
  response: null as any,
  responseBody: null as any
};

let invalidToken: string = '';

Given('I have a valid Strava access token from environment variables', async () => {
  sharedState.accessToken = await StravaClient.getValidAccessToken();
  expect(sharedState.accessToken).toBeTruthy();
});

Given('I have a valid Strava access token with activity read permission', async () => {
  sharedState.accessToken = await StravaClient.getValidAccessToken({
    requireActivityReadPermission: true
  });
  expect(sharedState.accessToken).toBeTruthy();
});

Given('the Strava API base URL is {string}', async ({}, url: string) => {
  sharedState.baseUrl = url;
});

Given('I have an invalid access token {string}', async ({}, token: string) => {
  invalidToken = token;
  sharedState.accessToken = invalidToken;
});

When('I send a GET request to {string} with authorization header', async ({ request, $testInfo }, endpoint: string) => {
  const fullUrl = `${sharedState.baseUrl}${endpoint}`;
  const headers = { 'Authorization': `Bearer ${sharedState.accessToken}` };

  await logApiRequest($testInfo, 'GET', fullUrl, { 'Authorization': 'Bearer ***' });
  sharedState.response = await request.get(fullUrl, { headers });
  sharedState.responseBody = await sharedState.response.json();
  await logApiResponse($testInfo, sharedState.response, sharedState.responseBody);
});

When('I send a GET request to {string} without authorization header', async ({ request, $testInfo }, endpoint: string) => {
  const fullUrl = `${sharedState.baseUrl}${endpoint}`;
  await logApiRequest($testInfo, 'GET', fullUrl, {});
  sharedState.response = await request.get(fullUrl);
  try {
    sharedState.responseBody = await sharedState.response.json();
  } catch (e) {
    sharedState.responseBody = await sharedState.response.text();
  }
  await logApiResponse($testInfo, sharedState.response, sharedState.responseBody);
});

Then('the response status code should be {int}', async ({}, expectedStatus: number) => {
  const actualStatus = sharedState.response.status();
  const errorDetails = typeof sharedState.responseBody === 'string'
    ? sharedState.responseBody
    : JSON.stringify(sharedState.responseBody);

  expect(
    actualStatus,
    `Expected status ${expectedStatus} but received ${actualStatus}. Response body: ${errorDetails}`
  ).toBe(expectedStatus);
});

Then('the response should contain error message', async ({ $testInfo }) => {
  const hasError = 
    (typeof sharedState.responseBody === 'object' && (sharedState.responseBody.message || sharedState.responseBody.error || sharedState.responseBody.errors)) ||
    (typeof sharedState.responseBody === 'string' && sharedState.responseBody.toLowerCase().includes('unauthorized'));
  expect(hasError).toBeTruthy();
  await $testInfo.attach('Error Message Validation', {
    body: `Error found in response: ${JSON.stringify(sharedState.responseBody)}`,
    contentType: 'text/plain'
  });
});

Then('the athlete profile should contain required fields', async () => {
  expect(sharedState.responseBody).toHaveProperty('id');
  expect(sharedState.responseBody).toHaveProperty('firstname');
  expect(sharedState.responseBody).toHaveProperty('lastname');
  expect(sharedState.responseBody).toHaveProperty('resource_state');
  expect(typeof sharedState.responseBody.id).toBe('number');
  expect(sharedState.responseBody.id).toBeGreaterThan(0);
  expect(sharedState.responseBody.resource_state).toBeGreaterThan(0);
});
