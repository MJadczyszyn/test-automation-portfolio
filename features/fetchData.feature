@strava @oauth2 @authentication @api
Feature: Strava API - OAuth2 Authentication Flow
  As a Strava API consumer
  I want to authenticate users via OAuth2
  So that I can obtain valid access tokens and retrieve athlete information

  Background:
    Given I have Strava OAuth2 credentials:
      | credential      | value                                    |
      | client_id       | {CLIENT_ID}                              |
      | client_secret   | {CLIENT_SECRET}                          |
      | redirect_uri    | http://localhost:3000/exchange_token     |
    And the Strava authorization URL is "https://www.strava.com/oauth/authorize"
    And the Strava token URL is "https://www.strava.com/oauth/token"
    And the Strava API base URL is "https://www.strava.com/api/v3"

  @smoke @critical @oauth
  Scenario: Complete OAuth2 authorization flow and retrieve athlete profile
    # Step 1: Build authorization URL
    Given I build the authorization URL with parameters:
      | parameter        | value                                |
      | client_id        | {CLIENT_ID}                          |
      | response_type    | code                                 |
      | redirect_uri     | http://localhost:3000/exchange_token |
      | approval_prompt  | force                                |
      | scope            | read,activity:read_all               |
    
    # Step 2: Simulate user authorization (in real scenario, user clicks "Authorize")
    # This step would open browser and user approves the app
    # For testing, we simulate that authorization code is received
    And I simulate user authorization approval
    
    # Step 3: Extract authorization code from redirect URL
    When the user is redirected back with authorization code
    Then I should receive an authorization code in the callback URL
    And the callback URL should contain "code" parameter
    And the callback URL should contain "scope" parameter
    
    # Step 4: Exchange authorization code for access token
    When I send a POST request to "/oauth/token" with form data:
      | parameter      | value                   |
      | client_id      | {CLIENT_ID}             |
      | client_secret  | {CLIENT_SECRET}         |
      | code           | {AUTHORIZATION_CODE}    |
      | grant_type     | authorization_code      |
    Then the response status code should be 200
    And the response should have "application/json" content type
    And the response body should contain token data with fields:
      | field          |
      | token_type     |
      | expires_at     |
      | expires_in     |
      | refresh_token  |
      | access_token   |
    And the "token_type" should be "Bearer"
    And the "expires_in" should be 21600
    And I should store the access token for future requests
    And I should store the refresh token for token refresh
    
    # Step 5: Use access token to retrieve athlete profile
    When I send a GET request to "/athlete" with headers:
      | header        | value                      |
      | Authorization | Bearer {ACCESS_TOKEN}      |
    Then the response status code should be 200
    And the response should have "application/json" content type
    And the athlete profile should contain required fields:
      | field          |
      | id             |
      | username       |
      | firstname      |
      | lastname       |
      | resource_state |
      | profile        |
      | created_at     |
      | updated_at     |
    And the athlete "resource_state" should be greater than 0
    And the athlete "id" should be a positive integer
    
    # Step 6: Verify access token validity
    When I verify the access token is not expired
    Then the current timestamp should be less than "expires_at" value
    And the access token should be valid for at least 1 hour
