@intervals @activities @api
Feature: Intervals API - Activities Management

Background:
  Given I have a valid Intervals.icu API key from environment variables
  And I have my athlete ID from environment variables
  And the Intervals.icu API base URL is "https://intervals.icu/api/v1"

@smoke @activities
Scenario: Successfully retrieve list of recent activities
  When I send a GET request to "/athlete/{athleteId}/activities" with pagination
  Then the response status code should be 200
  And the response should contain array of activities

@activities @validation
Scenario: Validate activity metadata fields
  When I send a GET request to "/athlete/{athleteId}/activities" with pagination
  Then the response status code should be 200
  And each activity should have required metadata fields

@activities @validation
Scenario: Activities are sorted by date descending
  When I send a GET request to "/athlete/{athleteId}/activities" with pagination
  Then the response status code should be 200
  And activities should be sorted from newest to oldest

@activities @filtering
Scenario: Filter activities by date range
  When I send a GET request to "/athlete/{athleteId}/activities" with date range filtering
  Then the response status code should be 200
  And all activities should fall within the requested date range

@activities @validation
Scenario: Strava-sourced activities include restriction note
  When I send a GET request to "/athlete/{athleteId}/activities" with pagination
  Then the response status code should be 200
  And Strava-sourced activities should have API restriction note

@negative @security
Scenario: Fail to retrieve activities with invalid API key
  Given I have an invalid API key "invalid_key_123"
  When I send a GET request to "/athlete/{athleteId}/activities" with pagination
  Then the response status code should be 403