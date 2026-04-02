@intervals @wellness @api
Feature: Intervals API - Wellness Data Management

  Background:
    Given I have a valid Intervals.icu API key from environment variables
    And I have my athlete ID from environment variables
    And the Intervals.icu API base URL is "https://intervals.icu/api/v1"

  @smoke @wellness
  Scenario: Successfully retrieve wellness data for the last 30 days
    When I send a GET request to "/athlete/{athleteId}/wellness" for the last 30 days
    Then the response status code should be 200
    And the response should contain array of wellness entries

  @wellness @validation
  Scenario: Validate wellness data fields
    When I send a GET request to "/athlete/{athleteId}/wellness" for the last 30 days
    Then the response status code should be 200
    And each wellness entry should have standard metrics like weight, restingHR or HRV

  @wellness @filtering
  Scenario: Filter wellness data by date range
    When I send a GET request to "/athlete/{athleteId}/wellness" with specific date range filtering
    Then the response status code should be 200
    And all wellness entries should fall within the requested date range

  @negative @security
  Scenario: Fail to retrieve wellness data with invalid API key
    Given I have an invalid API key "invalid_key_123"
    When I send a GET request to "/athlete/{athleteId}/wellness" for the last 30 days
    Then the response status code should be 403
