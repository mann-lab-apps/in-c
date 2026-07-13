Feature: Product surfaces
  in C should show which product surfaces are usable now, planned next, or not
  yet supported so users do not mistake the product for only a notation app.

  Scenario: Columns and Compositions connect to a work
    Given a work has a composition entry
    And the work has one or more Columns
    When a visitor opens the work context
    Then the visitor can move between the score, the listening question, and the related writing
    And unsupported community actions are not presented as available

  Scenario: Concerts preview planned state
    Given a concert preview is not fully implemented
    When the feature map lists Concerts
    Then the status is not "지원"
    And the linked documentation explains preview cards, listening questions, and Creator links

  Scenario: Creator and Classes planned state
    Given Creator profiles and Classes are still planned surfaces
    When the feature map lists Creators and Classes
    Then each item links to the relationship model
    And the documentation keeps public profile and private contact data separate

  Scenario: Open in Chromatics from a composition
    Given a public-domain or cleared composition has a MusicXML source
    When a visitor chooses Open in Chromatics
    Then Chromatics opens the editable score source
    And the flow keeps PDF conversion separate from score editing
