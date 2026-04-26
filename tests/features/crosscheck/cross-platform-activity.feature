@crosscheck @api
Feature: Cross-Platform Activity Verification - Strava vs Intervals.icu

  Verify that activities recorded on Strava are correctly synchronized
  and present in Intervals.icu. Due to Strava API restrictions,
  Intervals.icu cannot expose full activity details (name, type, duration)
  for Strava-sourced activities — so this cross-check focuses on
  verifying activity existence, ID consistency, and date alignment.

  Background:
    Given I have a valid Strava access token with activity read permission
    And I have a valid Intervals.icu API key from environment variables
    And I have my athlete ID from environment variables

  @smoke @crosscheck @critical
  Scenario: Most recent Strava activity exists in Intervals.icu by ID
    When I fetch the most recent activity from Strava
    And I fetch activities from Intervals for the last 14 days
    Then the Strava activity ID should exist in Intervals activities

  @crosscheck @validation
  Scenario: Activity start dates are consistent across platforms
    When I fetch the most recent activity from Strava
    And I fetch activities from Intervals for the last 14 days
    And the Strava activity ID should exist in Intervals activities
    Then the activity start dates should match within timezone tolerance

  @crosscheck @validation
  Scenario: Strava-sourced activity in Intervals has correct source and restriction note
    When I fetch the most recent activity from Strava
    And I fetch activities from Intervals for the last 14 days
    And the Strava activity ID should exist in Intervals activities
    Then the matched Intervals activity should have source "STRAVA"
    And the matched Intervals activity should have an API restriction note
