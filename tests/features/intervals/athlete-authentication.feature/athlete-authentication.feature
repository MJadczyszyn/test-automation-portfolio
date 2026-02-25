@intervals @authentication @api
Feature: Intervals.icu API - Athlete Authentication

  Background:
    Given I have a valid Intervals.icu API key from environment variables
    And I have my athlete ID from environment variables
    And the Intervals.icu API base URL is "https://intervals.icu/api/v1"

  @smoke @critical
  Scenario: Successfully retrieve athlete profile
    When I send a GET request to "/athlete/{athleteId}" with API key authentication
    Then the response status code should be 200
    And the athlete profile should contain id and name

  @negative @security
  Scenario: Fail to retrieve athlete profile with invalid API key
    Given I have an invalid API key "invalid_key_123"
    When I send a GET request to "/athlete/{athleteId}" with API key authentication
    Then the response status code should be 403