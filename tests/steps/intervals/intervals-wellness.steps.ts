import { When, Then } from '../../support/bdd-world';
import { expect } from '@playwright/test';
import { logApiRequest, logApiResponse } from '../../support/api-helper';
import { sharedState } from '../strava/strava-auth.steps';

let athleteId: string = '';
let requestedOldest: string = '';
let requestedNewest: string = '';

When('I send a GET request to {string} for the last {int} days', async ({ request, $testInfo }, endpoint: string, days: number) => {
  athleteId = process.env.INTERVALS_ATHLETE_ID || '';
  const newest = new Date().toISOString().split('T')[0];
  const oldest = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const fullUrl = `${sharedState.baseUrl}${endpoint.replace('{athleteId}', athleteId)}?oldest=${oldest}&newest=${newest}`;
  const authHeader = 'Basic ' + Buffer.from(`API_KEY:${sharedState.apiKey}`).toString('base64');
  
  await logApiRequest($testInfo, 'GET', fullUrl, { 'Authorization': 'Basic ***' });
  sharedState.response = await request.get(fullUrl, {
    headers: { 'Authorization': authHeader }
  });
  sharedState.responseBody = await sharedState.response.json();
  await logApiResponse($testInfo, sharedState.response, sharedState.responseBody);
});

When('I send a GET request to {string} with specific date range filtering', async ({ request, $testInfo }, endpoint: string) => {
  athleteId = process.env.INTERVALS_ATHLETE_ID || '';
  requestedNewest = new Date().toISOString().split('T')[0];
  // 14 days for a specific date range filter
  requestedOldest = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const fullUrl = `${sharedState.baseUrl}${endpoint.replace('{athleteId}', athleteId)}?oldest=${requestedOldest}&newest=${requestedNewest}`;
  const authHeader = 'Basic ' + Buffer.from(`API_KEY:${sharedState.apiKey}`).toString('base64');
  
  await logApiRequest($testInfo, 'GET', fullUrl, { 'Authorization': 'Basic ***' });
  sharedState.response = await request.get(fullUrl, {
    headers: { 'Authorization': authHeader }
  });
  sharedState.responseBody = await sharedState.response.json();
  await logApiResponse($testInfo, sharedState.response, sharedState.responseBody);
});

Then('the response should contain array of wellness entries', async ({ $testInfo }) => {
  expect(Array.isArray(sharedState.responseBody)).toBeTruthy();
  // We can't guarantee there are wellness entries, so we just check it's a valid array. 
  // If there are entries, we'll log how many.
  await $testInfo.attach('Wellness Entries Count', {
    body: `Found ${sharedState.responseBody.length} wellness entries`,
    contentType: 'text/plain'
  });
});

Then('each wellness entry should have standard metrics like weight, restingHR or HRV', async ({ $testInfo }) => {
  if (sharedState.responseBody.length === 0) {
    await $testInfo.attach('Wellness Validation', {
      body: `No wellness data returned to validate.`,
      contentType: 'text/plain'
    });
    return;
  }

  for (const entry of sharedState.responseBody) {
    // ID mapping for the date e.g. "2026-03-29"
    expect(entry).toHaveProperty('id');
    expect(typeof entry.id).toBe('string');
    
    // The entry should have at least some wellness fields
    const hasWellnessMetrics = 
      entry.hasOwnProperty('weight') || 
      entry.hasOwnProperty('restingHR') || 
      entry.hasOwnProperty('hrv') || 
      entry.hasOwnProperty('steps') || 
      entry.hasOwnProperty('sleepSecs') ||
      entry.hasOwnProperty('feel');
      
    expect(hasWellnessMetrics).toBeTruthy();
  }

  await $testInfo.attach('Wellness Metrics Validation', {
    body: `Validated ${sharedState.responseBody.length} wellness entries - they contain standard wellness fields.`,
    contentType: 'text/plain'
  });
});

Then('all wellness entries should fall within the requested date range', async ({ $testInfo }) => {
  if (sharedState.responseBody.length === 0) {
    return;
  }

  const oldestDate = new Date(requestedOldest).getTime();
  const newestDate = new Date(requestedNewest + 'T23:59:59').getTime();

  for (const entry of sharedState.responseBody) {
    // Usually 'id' is the date like '2026-03-29', but there might be a date field too.
    const entryDateStr = entry.date || entry.id;
    const entryDate = new Date(entryDateStr).getTime();
    
    expect(entryDate).toBeGreaterThanOrEqual(oldestDate);
    expect(entryDate).toBeLessThanOrEqual(newestDate);
  }
  
  await $testInfo.attach('Wellness Date Range Validation', {
    body: `All ${sharedState.responseBody.length} wellness entries fall within ${requestedOldest} to ${requestedNewest}`,
    contentType: 'text/plain'
  });
});
