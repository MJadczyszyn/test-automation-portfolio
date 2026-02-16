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