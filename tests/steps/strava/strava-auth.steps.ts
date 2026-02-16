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