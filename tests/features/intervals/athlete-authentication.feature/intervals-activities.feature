@intervals @activities @api
Feature: Intervals API - Activities Management

Background:
  Given I have a valid Intervals.icu API key from environment variables
  And I have my athlete ID from environment variables
  And the Intervals.icu API base URL is "https://intervals.icu/api/v1"

@smoke @activities
Scenario: Get list of recent activities
  When I send a GET request to "/athlete/{athleteId}" with pagination
  Then the response should contain array of activities
  And each activity should have required fields

@activities @detailed
Scenario: Get specific activity details
  When I send a GET request to "/activity/{activityId}"
  Then the activity should contain detailed training data
  And the activity should have power or heart rate data