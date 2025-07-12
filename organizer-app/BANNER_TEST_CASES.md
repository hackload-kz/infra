# Banner Notification System - Comprehensive Test Cases

## Overview
This document outlines comprehensive test cases for the banner notification system that displays personalized notifications to participants based on their profile completeness and team status.

## Test Categories

### 1. Banner Calculation Logic Tests

#### 1.1 Telegram Profile Banner (BannerType.TELEGRAM_PROFILE)

**Test Case 1.1.1: Show Telegram Banner for Empty Profile**
- **Preconditions**: Participant has no telegram field value (null or empty)
- **Expected Result**: TELEGRAM_PROFILE banner should be included in calculated banners
- **Banner Properties**:
  - Type: TELEGRAM_PROFILE
  - Title: "Заполните профиль Telegram"
  - Message: "Укажите свой Telegram для связи с администраторами и участниками хакатона"
  - Variant: warning
  - Action URL: /space/info/edit

**Test Case 1.1.2: Hide Telegram Banner for Filled Profile**
- **Preconditions**: Participant has telegram field value (e.g., "@username")
- **Expected Result**: TELEGRAM_PROFILE banner should NOT be included in calculated banners

#### 1.2 GitHub Profile Banner (BannerType.GITHUB_PROFILE)

**Test Case 1.2.1: Show GitHub Banner for Empty Profile**
- **Preconditions**: Participant has no githubUrl field value (null or empty)
- **Expected Result**: GITHUB_PROFILE banner should be included in calculated banners
- **Banner Properties**:
  - Type: GITHUB_PROFILE
  - Title: "Добавьте GitHub профиль"
  - Message: "GitHub профиль обязателен для участия. Все решения команд должны храниться в GitHub"
  - Variant: error
  - Action URL: /space/info/edit

**Test Case 1.2.2: Hide GitHub Banner for Filled Profile**
- **Preconditions**: Participant has githubUrl field value (e.g., "https://github.com/username")
- **Expected Result**: GITHUB_PROFILE banner should NOT be included in calculated banners

#### 1.3 Find Team Banner (BannerType.FIND_TEAM)

**Test Case 1.3.1: Show Find Team Banner for Teamless Participant**
- **Preconditions**: 
  - Participant has no team (team field is null)
  - Participant is not a team leader (ledTeam field is null)
- **Expected Result**: FIND_TEAM banner should be included in calculated banners
- **Banner Properties**:
  - Type: FIND_TEAM
  - Title: "Найдите команду"
  - Message: "Только участники в составе команд допускаются к хакатону. Максимальный размер команды 4 человека, минимальный 3. Читайте FAQ для получения дополнительной информации."
  - Variant: info
  - Action URL: /space/teams

**Test Case 1.3.2: Hide Find Team Banner for Team Member**
- **Preconditions**: Participant has team (team field is not null)
- **Expected Result**: FIND_TEAM banner should NOT be included in calculated banners

**Test Case 1.3.3: Hide Find Team Banner for Team Leader**
- **Preconditions**: Participant is a team leader (ledTeam field is not null)
- **Expected Result**: FIND_TEAM banner should NOT be included in calculated banners

#### 1.4 Team Needs Members Banner (BannerType.TEAM_NEEDS_MEMBERS)

**Test Case 1.4.1: Show Team Needs Members Banner for Understaffed Team**
- **Preconditions**: 
  - Participant is a team leader (ledTeam is not null)
  - Team has less than 3 members (members array length < 3)
- **Expected Result**: TEAM_NEEDS_MEMBERS banner should be included in calculated banners
- **Banner Properties**:
  - Type: TEAM_NEEDS_MEMBERS
  - Title: "Найдите участников для команды"
  - Message: "Вашей команде нужно минимум 3 участника для участия в хакатоне. Читайте FAQ для получения дополнительной информации."
  - Variant: warning
  - Action URL: /space/participants

**Test Case 1.4.2: Hide Team Needs Members Banner for Adequate Team**
- **Preconditions**: 
  - Participant is a team leader (ledTeam is not null)
  - Team has 3 or more members (members array length >= 3)
- **Expected Result**: TEAM_NEEDS_MEMBERS banner should NOT be included in calculated banners

**Test Case 1.4.3: Hide Team Needs Members Banner for Non-Leader**
- **Preconditions**: Participant is not a team leader (ledTeam is null)
- **Expected Result**: TEAM_NEEDS_MEMBERS banner should NOT be included in calculated banners

#### 1.5 Multiple Banner Scenarios

**Test Case 1.5.1: New Participant (All Banners)**
- **Preconditions**: 
  - Empty telegram field
  - Empty githubUrl field
  - No team membership
  - Not a team leader
- **Expected Result**: Should show TELEGRAM_PROFILE, GITHUB_PROFILE, and FIND_TEAM banners
- **Expected Count**: 3 banners

**Test Case 1.5.2: Team Leader with Incomplete Profile**
- **Preconditions**:
  - Empty telegram field
  - Empty githubUrl field
  - Is team leader with 2 members
- **Expected Result**: Should show TELEGRAM_PROFILE, GITHUB_PROFILE, and TEAM_NEEDS_MEMBERS banners
- **Expected Count**: 3 banners

**Test Case 1.5.3: Complete Profile Team Member**
- **Preconditions**:
  - Has telegram field
  - Has githubUrl field
  - Is team member (not leader)
- **Expected Result**: Should show no banners
- **Expected Count**: 0 banners

### 2. Banner Dismissal Logic Tests

#### 2.1 Dismiss Banner Functionality

**Test Case 2.1.1: Successfully Dismiss Banner**
- **Preconditions**: Active banner exists for participant
- **Action**: Call dismissBanner(participantId, hackathonId, bannerType)
- **Expected Result**: 
  - DismissedBanner record created in database
  - Banner no longer appears in getActiveBanners() results

**Test Case 2.1.2: Dismiss Already Dismissed Banner (Idempotent)**
- **Preconditions**: Banner already dismissed for participant
- **Action**: Call dismissBanner() again with same parameters
- **Expected Result**: 
  - No error thrown
  - DismissedBanner record updated with new dismissedAt timestamp
  - Banner remains dismissed

**Test Case 2.1.3: Dismiss Banner for Different Hackathon**
- **Preconditions**: Banner dismissed for hackathon A
- **Action**: Check banners for same participant in hackathon B
- **Expected Result**: Banner should still appear for hackathon B (dismissal is hackathon-specific)

#### 2.2 Active Banner Filtering

**Test Case 2.2.1: Filter Out Dismissed Banners**
- **Preconditions**: 
  - Participant qualifies for 3 banners
  - 1 banner has been dismissed
- **Action**: Call getActiveBanners()
- **Expected Result**: Should return only 2 non-dismissed banners

**Test Case 2.2.2: All Banners Dismissed**
- **Preconditions**: All qualifying banners have been dismissed
- **Action**: Call getActiveBanners()
- **Expected Result**: Should return empty array

### 3. Database Integration Tests

#### 3.1 DismissedBanner Model Tests

**Test Case 3.1.1: Create Dismissed Banner Record**
- **Action**: Create DismissedBanner with valid participantId, hackathonId, bannerType
- **Expected Result**: Record successfully created with auto-generated ID and timestamp

**Test Case 3.1.2: Unique Constraint Enforcement**
- **Preconditions**: DismissedBanner record exists
- **Action**: Attempt to create duplicate with same participantId, hackathonId, bannerType
- **Expected Result**: Database should enforce unique constraint

**Test Case 3.1.3: Foreign Key Constraints**
- **Action**: Attempt to create DismissedBanner with invalid participantId or hackathonId
- **Expected Result**: Database should enforce foreign key constraints

**Test Case 3.1.4: Cascade Delete on Participant**
- **Preconditions**: DismissedBanner records exist for participant
- **Action**: Delete participant
- **Expected Result**: All related DismissedBanner records should be deleted

**Test Case 3.1.5: Cascade Delete on Hackathon**
- **Preconditions**: DismissedBanner records exist for hackathon
- **Action**: Delete hackathon
- **Expected Result**: All related DismissedBanner records should be deleted

### 4. API Integration Tests

#### 4.1 Banner Dismissal API Tests

**Test Case 4.1.1: Valid Dismissal Request**
- **Request**: POST to dismissBannerAction with valid participantId, hackathonId, bannerType
- **Expected Result**: 
  - HTTP 200 response
  - Banner dismissed in database
  - Page revalidated

**Test Case 4.1.2: Invalid Parameters**
- **Request**: POST with missing or invalid parameters
- **Expected Result**: HTTP 400 with appropriate error message

**Test Case 4.1.3: Unauthorized Dismissal**
- **Request**: Attempt to dismiss banner for different participant
- **Expected Result**: HTTP 403 or appropriate security error

### 5. UI Component Tests

#### 5.1 BannerNotification Component Tests

**Test Case 5.1.1: Render Banner with Correct Styling**
- **Props**: Banner with variant 'error'
- **Expected Result**: 
  - Red color scheme applied
  - AlertCircle icon displayed
  - Error-specific button styling

**Test Case 5.1.2: Render Banner with Warning Styling**
- **Props**: Banner with variant 'warning'
- **Expected Result**: 
  - Amber color scheme applied
  - AlertTriangle icon displayed
  - Warning-specific button styling

**Test Case 5.1.3: Render Banner with Info Styling**
- **Props**: Banner with variant 'info'
- **Expected Result**: 
  - Blue color scheme applied
  - Info icon displayed
  - Info-specific button styling

**Test Case 5.1.4: Display Banner Content**
- **Props**: Banner with title, message, actionText
- **Expected Result**: All text content rendered correctly

**Test Case 5.1.5: Action Button Link**
- **Props**: Banner with actionUrl
- **Expected Result**: Action button links to correct URL

**Test Case 5.1.6: Dismiss Button Functionality**
- **Action**: Click dismiss (X) button
- **Expected Result**: 
  - dismissBannerAction called with correct parameters
  - Banner disappears from view
  - Loading state shown during dismissal

**Test Case 5.1.7: Dismiss Button Disabled State**
- **Preconditions**: Dismissal in progress
- **Expected Result**: 
  - Dismiss button disabled
  - Loading state indicators shown

#### 5.2 BannerList Component Tests

**Test Case 5.2.1: Render Multiple Banners**
- **Props**: Array of 3 banners
- **Expected Result**: All 3 banners rendered in order

**Test Case 5.2.2: Empty Banner List**
- **Props**: Empty banners array
- **Expected Result**: Component renders nothing (null)

**Test Case 5.2.3: Banner Removal on Dismissal**
- **Action**: Dismiss one banner from list of 3
- **Expected Result**: List updates to show only 2 remaining banners

### 6. Integration with Space Page Tests

#### 6.1 Space Page Banner Integration

**Test Case 6.1.1: Banners Display at Top of Page**
- **Preconditions**: Participant has qualifying banners
- **Expected Result**: Banners appear between page title and dashboard content

**Test Case 6.1.2: No Banners Section When Empty**
- **Preconditions**: No active banners for participant
- **Expected Result**: No banner section rendered, normal page layout

**Test Case 6.1.3: Banner Data Fetching**
- **Action**: Load space page
- **Expected Result**: 
  - Participant data fetched with team member counts
  - Active banners calculated correctly
  - Banners passed to BannerList component

### 7. Performance Tests

#### 7.1 Banner Calculation Performance

**Test Case 7.1.1: Large Team Member Count**
- **Preconditions**: Team with maximum members (4)
- **Expected Result**: Banner calculation completes within acceptable time

**Test Case 7.1.2: Multiple Hackathon Dismissals**
- **Preconditions**: Participant with many dismissed banners across multiple hackathons
- **Expected Result**: Active banner filtering performs efficiently

### 8. Edge Cases and Error Handling

#### 8.1 Data Edge Cases

**Test Case 8.1.1: Null Team Data**
- **Preconditions**: Participant data has null team references
- **Expected Result**: Banner calculation handles null values gracefully

**Test Case 8.1.2: Invalid Team Member Count**
- **Preconditions**: Team data inconsistency (empty members array but team exists)
- **Expected Result**: System handles data inconsistency appropriately

**Test Case 8.1.3: Missing Hackathon Data**
- **Preconditions**: No active hackathon found
- **Expected Result**: No banners displayed, no errors thrown

#### 8.2 Network Error Handling

**Test Case 8.2.1: Dismissal API Failure**
- **Preconditions**: Network error during banner dismissal
- **Expected Result**: 
  - Error state shown to user
  - Banner remains visible
  - Retry mechanism available

**Test Case 8.2.2: Page Load with API Errors**
- **Preconditions**: Banner data fetch fails
- **Expected Result**: Page loads without banners, error logged appropriately

### 9. Accessibility Tests

#### 9.1 Banner Accessibility

**Test Case 9.1.1: Screen Reader Compatibility**
- **Expected Result**: 
  - Banner titles and messages readable by screen readers
  - Dismiss button has proper aria-label
  - Banner importance level conveyed

**Test Case 9.1.2: Keyboard Navigation**
- **Expected Result**: 
  - All interactive elements focusable via keyboard
  - Tab order logical
  - Enter/Space activate buttons

**Test Case 9.1.3: Color Contrast**
- **Expected Result**: All banner variants meet WCAG color contrast requirements

### 10. Regression Tests

#### 10.1 Feature Interaction Tests

**Test Case 10.1.1: Profile Update Banner Refresh**
- **Action**: Update participant profile to fill missing fields
- **Expected Result**: Corresponding banners disappear on next page load

**Test Case 10.1.2: Team Join Banner Update**
- **Action**: Participant joins team
- **Expected Result**: FIND_TEAM banner disappears, team-related banners may appear

**Test Case 10.1.3: Team Leadership Change**
- **Action**: Participant becomes team leader
- **Expected Result**: Banner set updates to reflect new role

### Test Data Setup Requirements

#### Required Test Fixtures:
1. **Participants**:
   - New participant (empty profile)
   - Complete participant (all fields filled)
   - Team member participant
   - Team leader participant

2. **Teams**:
   - Understaffed team (1-2 members)
   - Adequate team (3-4 members)
   - Team without leader

3. **Hackathons**:
   - Active hackathon
   - Inactive hackathon
   - Multiple hackathons for cross-hackathon testing

4. **DismissedBanners**:
   - Various dismissal combinations
   - Cross-hackathon dismissals
   - Historical dismissal data

### Automated Test Implementation Notes

1. **Unit Tests**: Focus on banner calculation logic and utility functions
2. **Integration Tests**: Test database operations and API endpoints
3. **Component Tests**: Test React components with React Testing Library
4. **E2E Tests**: Test full user workflows with banner interactions
5. **Performance Tests**: Measure banner calculation and rendering performance

### Success Criteria

- All banner types display correctly based on participant state
- Banner dismissal works reliably across sessions
- No performance degradation with banner system enabled
- Accessibility standards met for all banner components
- Zero data corruption from banner operations
- Graceful handling of all error conditions

This comprehensive test suite ensures the banner notification system works reliably across all user scenarios and maintains data integrity while providing a smooth user experience.