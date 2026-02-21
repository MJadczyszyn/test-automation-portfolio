@strava @authentication @api
Feature: Strava API - Athlete Authentication

  Background:
    Given I have a valid Strava access token from environment variables
    And the Strava API base URL is "https://www.strava.com/api/v3"

  @smoke @critical
  Scenario: Successfully retrieve athlete profile with valid token
    When I send a GET request to "/athlete" with authorization header
    Then the response status code should be 200
    And the athlete profile should contain required fields

    @negative @security
  Scenario: Fail to retrieve athlete profile with invalid token
    Given I have an invalid access token "invalid_token_123"
    When I send a GET request to "/athlete" with authorization header
    Then the response status code should be 401
    And the response should contain error message

  @negative @security
  Scenario: Fail to retrieve athlete profile without authorization
    When I send a GET request to "/athlete" without authorization header
    Then the response status code should be 401