import { Given, When, Then } from '../../support/bdd-world';
import { expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import { logApiRequest, logApiResponse } from '../../support/api-helper';

dotenv.config();

let accessToken: string;
let baseUrl: string;
let response: any;
let responseBody: any;

Given('I have a valid Strava access token from environment variables', async () => {
  accessToken = process.env.STRAVA_ACCESS_TOKEN || '';
  expect(accessToken).toBeTruthy();
});

Given('the Strava API base URL is {string}', async ({}, url: string) => {
  baseUrl = url;
});

When('I send a GET request to {string} with authorization header', async ({ request, $testInfo }, endpoint: string) => {
  const fullUrl = `${baseUrl}${endpoint}`;
  const headers = { 'Authorization': `Bearer ${accessToken}` };

  await logApiRequest($testInfo, 'GET', fullUrl, { 'Authorization': 'Bearer ***' });
  response = await request.get(fullUrl, { headers });
  responseBody = await response.json();

  await logApiResponse($testInfo, response, responseBody);
});

Then('the response status code should be {int}', async ({}, expectedStatus: number) => {
  expect(response.status()).toBe(expectedStatus);
});

Then('the athlete profile should contain required fields', async () => {
  expect(responseBody).toHaveProperty('id');
  expect(responseBody).toHaveProperty('firstname');
  expect(responseBody).toHaveProperty('lastname');
  expect(responseBody).toHaveProperty('resource_state');
  expect(typeof responseBody.id).toBe('number');
  expect(responseBody.id).toBeGreaterThan(0);
  expect(responseBody.resource_state).toBeGreaterThan(0);
});

let invalidToken: string = '';
let useAuthHeader: boolean = true;

Given('I have an invalid access token {string}', async ({}, token: string) => {
  invalidToken = token;
  accessToken = invalidToken;
});

When('I send a GET request to {string} without authorization header', async ({ request, $testInfo }, endpoint: string) => {
  const fullUrl = `${baseUrl}${endpoint}`;
  await logApiRequest($testInfo, 'GET', fullUrl, {});
  console.log(`→ Sending GET ${fullUrl} WITHOUT authorization`);
  response = await request.get(fullUrl);
  try {
    responseBody = await response.json();
  } catch (e) {
    responseBody = await response.text();
  }
  await logApiResponse($testInfo, response, responseBody);
});

Then('the response should contain error message', async ({ $testInfo }) => {
  const hasError = 
    (typeof responseBody === 'object' && (responseBody.message || responseBody.error || responseBody.errors)) ||
    (typeof responseBody === 'string' && responseBody.toLowerCase().includes('unauthorized'));
  expect(hasError).toBeTruthy();
  await $testInfo.attach('Error Message Validation', {
    body: `Error found in response: ${JSON.stringify(responseBody)}`,
    contentType: 'text/plain'
  });
});