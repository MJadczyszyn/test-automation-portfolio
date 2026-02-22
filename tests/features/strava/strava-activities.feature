@strava @activities @api
Feature: Strava API - Activities Management

  Background:
    Given I have a valid Strava access token with activity read permission
    And the Strava API base URL is "https://www.strava.com/api/v3"

  @smoke @critical
  Scenario: Successfully retrieve last activity
    When I send a GET request to "/athlete/activities" with query parameters:
      | parameter | value |
      | per_page  | 1     |
    Then the response status code should be 200
    And the response should be a non-empty array
    And the first activity should have required fields
