Feature: Product surfaces
  in C should show which product surfaces are usable now, planned next, or not
  yet supported so users do not mistake the product for only a notation app.

  Scenario: Columns and Compositions connect to a work
    Given a work has a composition entry
    And the work has one or more Columns
    When a visitor opens the work context
    Then the visitor can move between the score, the listening question, and the related writing
    And unsupported community actions are not presented as available

  Scenario: Promotion banner planned state
    Given a concert promotion banner is not fully implemented
    When the feature map lists the promotion banner slot
    Then the status is not "지원"
    And the linked documentation explains banner slots, listening questions, and related people metadata

  Scenario: Community planned state
    Given creator profiles and classes are not separate public tabs
    When the feature map lists Community
    Then it links to the relationship model
    And the documentation keeps public profile, private contact data, and class applications out of the public MVP

  Scenario: Open in Chromatics from a composition
    Given a public-domain or cleared composition has a MusicXML source
    When a visitor chooses Open in Chromatics
    Then Chromatics opens the editable score source
    And the flow keeps PDF conversion separate from score editing
