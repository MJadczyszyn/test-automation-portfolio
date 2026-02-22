import * as allure from 'allure-playwright';

export async function logApiRequest(
  testInfo: any,
  method: string,
  url: string,
  headers?: any,
  body?: any
) {
  const requestDetails = {
    method,
    url,
    headers: headers || {},
    body: body || null
  };

  await testInfo.attach('Request', {
    body: JSON.stringify(requestDetails, null, 2),
    contentType: 'application/json'
  });
}

export async function logApiResponse(
  testInfo: any,
  response: any,
  responseBody: any
) {
  const responseDetails = {
    status: response.status(),
    statusText: response.statusText(),
    headers: response.headers(),
    body: responseBody
  };

  await testInfo.attach('Response', {
    body: JSON.stringify(responseDetails, null, 2),
    contentType: 'application/json'
  });
}