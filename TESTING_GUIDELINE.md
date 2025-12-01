# Talent Hub - Comprehensive Testing Guideline

## Table of Contents

1. [Pre-Testing Setup](#pre-testing-setup)
2. [Registration & Authentication](#registration--authentication)
3. [Email Verification](#email-verification)
4. [Graduate Onboarding](#graduate-onboarding)
5. [Company Onboarding](#company-onboarding)
6. [Assessment (Graduate)](#assessment-graduate)
7. [Job Posting (Company)](#job-posting-company)
8. [Matching & Applications](#matching--applications)
9. [Interview Management](#interview-management)
10. [Offer Management](#offer-management)
11. [Messaging System](#messaging-system)
12. [Notifications](#notifications)
13. [Profile Management](#profile-management)
14. [Admin Features](#admin-features)
15. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Pre-Testing Setup

### Environment Requirements

- **Frontend**: React + Vite (running on `http://localhost:5173` or configured port)
- **Backend**: Node.js + Express (running on configured API URL)
- **Database**: MongoDB (local or remote instance)
- **AI Service**: Python FastAPI service (for matching and assessment)
- **Cloudinary**: Configured for file uploads (CVs, offer documents)

### Test Accounts

Create separate test accounts for:

- **Graduate User**: `graduate.test@example.com`
- **Company User**: `company.test@example.com`
- **Admin User**: `admin.test@example.com`

### Browser Testing

Test on multiple browsers:

- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (if on macOS)
- Edge (latest)

### Test Data Preparation

- Have sample CV files ready (PDF format)
- Prepare test company logos
- Have sample job descriptions ready

---

## Registration & Authentication

### 1.1 Graduate Registration

**Test Steps:**

1. Navigate to `/register`
2. Select "Graduate" role
3. Enter email: `graduate.test@example.com`
4. Enter password: `TestPassword123!` (minimum 8 characters)
5. Click "Continue" or "Register"

**Expected Results:**

- ✅ User account is created
- ✅ Redirected to `/onboarding` page
- ✅ Email verification message is sent
- ✅ Session token is stored in localStorage
- ✅ User is authenticated

**Negative Test Cases:**

- ❌ Register with existing email → Should show "User already exists"
- ❌ Register with invalid email format → Should show validation error
- ❌ Register with password < 8 characters → Should show "Password must be at least 8 characters"
- ❌ Register without selecting role → Should prevent submission

### 1.2 Company Registration

**Test Steps:**

1. Navigate to `/register`
2. Select "Company" role
3. Enter email: `company.test@example.com`
4. Enter password: `TestPassword123!`
5. Click "Continue"

**Expected Results:**

- ✅ User account is created
- ✅ Redirected to `/company/onboarding`
- ✅ Email verification message is sent
- ✅ Session token is stored

### 1.3 Google OAuth Registration

**Test Steps:**

1. Navigate to `/register`
2. Select role (Graduate or Company)
3. Click "Continue with Google"
4. Complete Google OAuth flow
5. Grant permissions

**Expected Results:**

- ✅ User account is created from Google profile
- ✅ Redirected to appropriate onboarding page
- ✅ Email is verified automatically (if Google email is verified)
- ✅ User profile picture is imported (if available)

### 1.4 Login

**Test Steps:**

1. Navigate to `/login`
2. Enter registered email
3. Enter password
4. Click "Login"

**Expected Results:**

- ✅ Successful login
- ✅ Redirected based on role:
  - Graduates → `/graduate` (if assessment completed) or `/assessment` (if not)
  - Companies → `/company` (if onboarding completed) or `/company/onboarding`
- ✅ Session token stored
- ✅ Refresh token stored

**Negative Test Cases:**

- ❌ Login with incorrect password → "Invalid credentials"
- ❌ Login with non-existent email → "Invalid credentials"
- ❌ Login with unverified email → Should prompt for verification

### 1.5 Password Reset Flow

**Test Steps:**

1. Navigate to `/forgot-password`
2. Enter registered email
3. Click "Send Reset Link"
4. Check email for reset link
5. Click reset link (navigates to `/reset-password?token=...`)
6. Enter new password
7. Confirm new password
8. Submit

**Expected Results:**

- ✅ Reset email sent
- ✅ Reset link is valid (not expired)
- ✅ Password is updated
- ✅ User can login with new password
- ✅ Old password no longer works

**Negative Test Cases:**

- ❌ Reset link expired → Show error message
- ❌ Invalid token → Show error message
- ❌ Password mismatch → Show validation error

---

## Email Verification

### 2.1 Email Verification Flow

**Test Steps:**

1. After registration, check email inbox
2. Click verification link in email
3. Link should navigate to `/verify-email?token=...`

**Expected Results:**

- ✅ Email contains verification link
- ✅ Link is valid and not expired
- ✅ Email is marked as verified in database
- ✅ User can access protected routes
- ✅ Success message displayed

**Negative Test Cases:**

- ❌ Expired verification link → Show error, option to resend
- ❌ Invalid token → Show error message
- ❌ Already verified email → Show appropriate message

### 2.2 Email Verification Guard

**Test Steps:**

1. Register new account
2. Try to access protected route (e.g., `/graduate`) without verifying email

**Expected Results:**

- ✅ Redirected to email verification page
- ✅ Cannot access protected routes until verified
- ✅ Clear message explaining need for verification

---

## Graduate Onboarding

### 3.1 Personal Information Step

**Test Steps:**

1. Complete registration as graduate
2. Navigate to `/onboarding`
3. Fill in:
   - First Name
   - Last Name
   - Phone Number
   - Date of Birth
   - Gender
   - Location/Address
4. Click "Next"

**Expected Results:**

- ✅ All required fields validated
- ✅ Form data saved (can navigate back and see data)
- ✅ Progress indicator shows step 1/X
- ✅ Can proceed to next step

**Validation Checks:**

- ❌ Empty required fields → Show validation errors
- ❌ Invalid phone format → Show error
- ❌ Invalid date → Show error

### 3.2 Education Step

**Test Steps:**

1. From Personal Information step, proceed
2. Fill in:
   - Degree
   - Field of Study
   - Institution
   - Graduation Year
   - GPA (if applicable)
3. Click "Next"

**Expected Results:**

- ✅ Education data saved
- ✅ Can add multiple education entries (if supported)
- ✅ Can proceed to next step

### 3.3 Experience Step

**Test Steps:**

1. From Education step, proceed
2. Fill in:
   - Job Title
   - Company Name
   - Start Date
   - End Date (or "Present")
   - Description
   - **Salary Per Annum** (NEW)
3. Click "Next"

**Expected Results:**

- ✅ Experience data saved
- ✅ Salary per annum is captured
- ✅ Can add multiple work experiences
- ✅ Can proceed to next step

### 3.4 Skills Step

**Test Steps:**

1. From Experience step, proceed
2. Select or add skills:
   - Technical skills
   - Soft skills
   - Programming languages
   - Tools and frameworks
3. Click "Next"

**Expected Results:**

- ✅ Skills saved
- ✅ Can search/add custom skills
- ✅ Skills displayed as tags
- ✅ Can remove skills

### 3.5 CV Upload Step

**Test Steps:**

1. From Skills step, proceed
2. Click "Upload CV" or drag and drop
3. Select PDF file
4. Wait for upload to complete
5. Click "Next" or "Complete"

**Expected Results:**

- ✅ File uploads to Cloudinary
- ✅ Upload progress shown
- ✅ CV URL stored in profile
- ✅ Can preview uploaded CV
- ✅ File size validation (if implemented)

**Negative Test Cases:**

- ❌ Upload non-PDF file → Show error
- ❌ Upload file > 10MB → Show error
- ❌ Upload corrupted file → Show error

### 3.6 Onboarding Completion

**Test Steps:**

1. Complete all onboarding steps
2. Click "Complete" or "Finish"

**Expected Results:**

- ✅ Profile created in database
- ✅ Redirected to `/assessment` page
- ✅ Cannot access dashboard until assessment is completed
- ✅ Onboarding data persisted

---

## Company Onboarding

### 4.1 Company Information Step

**Test Steps:**

1. Complete registration as company
2. Navigate to `/company/onboarding`
3. Fill in:
   - Company Name
   - Industry
   - Company Size
   - Website
   - Description
   - Logo (optional)
4. Click "Next"

**Expected Results:**

- ✅ Company profile created
- ✅ Logo uploaded (if provided)
- ✅ Can proceed to next step

### 4.2 Job Posting Step

**Test Steps:**

1. From Company Information step, proceed
2. Fill in job details:
   - Job Title
   - Job Type (Full-time, Part-time, Contract, etc.)
   - Location
   - **Salary Amount** (single value, not range)
   - Description
   - Required Skills
   - Preferred Rank (A, B, C, or Any)
3. Click "Next" or "Create Job"

**Expected Results:**

- ✅ Job posting created
- ✅ Salary stored as single amount
- ✅ Job is active
- ✅ Can proceed to next step or complete onboarding

### 4.3 Company Onboarding Completion

**Test Steps:**

1. Complete all company onboarding steps
2. Click "Complete"

**Expected Results:**

- ✅ Company profile created
- ✅ Redirected to `/company` dashboard
- ✅ Can access company features
- ✅ Onboarding data persisted

---

## Assessment (Graduate)

### 5.1 Assessment Access

**Test Steps:**

1. Complete graduate onboarding
2. Navigate to `/assessment` (should redirect automatically)

**Expected Results:**

- ✅ Assessment page loads
- ✅ Cannot access dashboard without completing assessment
- ✅ Clear instructions displayed
- ✅ Assessment guard prevents skipping

### 5.2 Assessment Question Generation

**Test Steps:**

1. On assessment page, click "Start Assessment"
2. Wait for questions to load

**Expected Results:**

- ✅ Questions generated via AI service
- ✅ Questions displayed one at a time or all at once (depending on UI)
- ✅ Question set version stored
- ✅ Questions saved in `assessmentData.currentQuestions`

**Negative Test Cases:**

- ❌ AI service unavailable → Show error, retry option
- ❌ Network error → Show error message

### 5.3 Answering Questions

**Test Steps:**

1. Read each question
2. Type answer in text field
3. Navigate between questions (if multiple shown)
4. Ensure all questions answered
5. Click "Submit Assessment"

**Expected Results:**

- ✅ Answers saved as user types
- ✅ Can navigate between questions
- ✅ All questions must be answered before submission
- ✅ Answers validated (non-empty)

**Validation Checks:**

- ❌ Submit with empty answers → Show error
- ❌ Submit with partial answers → Show warning

### 5.4 Assessment Scoring

**Test Steps:**

1. Submit assessment with answers
2. Wait for scoring to complete

**Expected Results:**

- ✅ Score calculated: `(correctAnswers / totalQuestions) * 100`
- ✅ Rank assigned based on score:
  - **85-100**: Rank A
  - **75-84**: Rank B
  - **60-74**: Rank C
  - **< 60**: Rank D (needs retake)
- ✅ `needsRetake` set to `true` if score < 60
- ✅ Score and rank displayed to user
- ✅ Profile embedding generated for matching

**Test Scenarios:**

- **Score 95**: Should get Rank A, `needsRetake: false`
- **Score 80**: Should get Rank B, `needsRetake: false`
- **Score 65**: Should get Rank C, `needsRetake: false`
- **Score 45**: Should get Rank D, `needsRetake: true`

### 5.5 Assessment Retake

**Test Steps:**

1. Complete assessment with score < 60
2. See "Retake Required" message
3. Click "Retake Assessment"
4. Answer questions again
5. Submit

**Expected Results:**

- ✅ Cannot access dashboard until passing (score >= 60)
- ✅ Redirected back to assessment page
- ✅ Attempt count incremented
- ✅ Previous score retained in `lastScore`
- ✅ New score replaces old if higher

### 5.6 Assessment Completion & Redirect

**Test Steps:**

1. Complete assessment with score >= 60
2. See results page
3. Click "Continue to Dashboard"

**Expected Results:**

- ✅ Redirected to `/graduate` dashboard
- ✅ Can access all graduate features
- ✅ Assessment guard allows access
- ✅ Matching process triggered

**Negative Test Cases:**

- ❌ Score < 60 → Redirected back to assessment, cannot access dashboard
- ❌ Assessment not submitted → Cannot access dashboard

---

## Job Posting (Company)

### 6.1 Create Job Posting

**Test Steps:**

1. Login as company
2. Navigate to `/jobs` or company dashboard
3. Click "Create Job" or "Post New Job"
4. Fill in:
   - Job Title
   - Job Type
   - Location
   - **Salary Amount** (single value)
   - Description
   - Required Skills
   - Preferred Rank (A, B, C, or Any)
5. Click "Create Job" or "Post Job"

**Expected Results:**

- ✅ Job created successfully
- ✅ Job appears in company's job list
- ✅ Job is active and visible to graduates
- ✅ Salary stored as single `amount` value
- ✅ Success notification shown

**Validation Checks:**

- ❌ Empty required fields → Show validation errors
- ❌ Invalid salary → Show error
- ❌ Invalid job type → Show error

### 6.2 Edit Job Posting

**Test Steps:**

1. Navigate to job list
2. Click "Edit" on a job
3. Modify fields
4. Click "Save Changes"

**Expected Results:**

- ✅ Job updated in database
- ✅ Changes reflected immediately
- ✅ Success message shown

### 6.3 Deactivate/Close Job

**Test Steps:**

1. Navigate to job list
2. Click "Close Job" or "Deactivate"
3. Confirm action

**Expected Results:**

- ✅ Job status changed to inactive
- ✅ Job no longer visible to graduates
- ✅ Existing applications remain
- ✅ Cannot receive new applications

---

## Matching & Applications

### 7.1 AI Matching Process

**Test Steps:**

1. Graduate completes assessment (score >= 60)
2. Wait for matching process to run
3. Check graduate dashboard for matches

**Expected Results:**

- ✅ Matching algorithm runs after assessment
- ✅ Graduates matched with relevant jobs based on:
  - Skills similarity
  - Education alignment
  - Experience match
  - Profile embedding similarity
- ✅ Matches displayed on dashboard
- ✅ Match score/percentage shown (if implemented)

### 7.2 Graduate Exploring Companies

**Test Steps:**

1. Login as graduate
2. Navigate to `/explore`
3. Browse available companies/jobs
4. Use filters (if available):
   - Job type
   - Location
   - Salary range
   - Company size
5. Click "Preview" on a company/job

**Expected Results:**

- ✅ Companies/jobs listed
- ✅ Filters work correctly
- ✅ Preview modal shows:
  - Company details
  - Job description (HTML stripped)
  - Application status (if already applied)
  - "Apply" or "Already Applied" button
- ✅ Can navigate between previews

### 7.3 Graduate Applying for Job

**Test Steps:**

1. From explore page, click "Preview" on a job
2. Review job details
3. Click "Apply" button
4. Confirm application (if confirmation required)

**Expected Results:**

- ✅ Application created with status `'pending'`
- ✅ Application appears in `/applications` page
- ✅ Company receives notification
- ✅ "Apply" button changes to "Already Applied"
- ✅ Cannot apply twice to same job

**Negative Test Cases:**

- ❌ Apply to same job twice → Show "Already Applied" message
- ❌ Apply to closed job → Show error message

### 7.4 Company Viewing Candidates

**Test Steps:**

1. Login as company
2. Navigate to `/candidates`
3. View candidate list
4. Use filters:
   - Status: All, Matched, Applied, Pending, Hired
   - Job (if multiple jobs)
   - Rank (A, B, C)
5. Search candidates by name

**Expected Results:**

- ✅ Default filter shows "Matched" candidates
- ✅ Candidates listed with:
  - Name
  - Rank
  - Job they applied for
  - Application status
  - Match score (if available)
- ✅ Filters work correctly
- ✅ Search functionality works
- ✅ Can click candidate to preview

### 7.5 Candidate Preview (Company)

**Test Steps:**

1. From candidates page, click on a candidate
2. Preview modal opens

**Expected Results:**

- ✅ Modal shows:
  - Candidate profile
  - Education
  - Experience
  - Skills
  - CV download link
  - Assessment rank
  - Application status
- ✅ Actions available:
  - "Chat" button
  - "View CV" button
  - "Accept" button (if status allows)
  - "Reject" button (if status allows)
  - "Schedule Interview" button

**Status-Based Button Behavior:**

- **Pending/Applied**: Accept and Reject buttons enabled
- **Offer Sent/Pending**: Accept and Reject buttons disabled, shows "Offer Sent"
- **Hired**: Accept and Reject buttons disabled

### 7.6 Company Accepting Application

**Test Steps:**

1. From candidate preview, click "Accept"
2. Confirm action (if required)

**Expected Results:**

- ✅ Application status changes to `'accepted'`
- ✅ Offer automatically created and sent
- ✅ Offer PDF generated and uploaded to Cloudinary
- ✅ Message created in chat system with offer
- ✅ Email notification sent to graduate
- ✅ Accept/Reject buttons disabled
- ✅ Company automatically navigated to `/messages` page
- ✅ Candidate moved to "Pending" status (until offer accepted)

**Verification:**

- ✅ Check `/messages` page shows offer message
- ✅ Check graduate receives email
- ✅ Check offer document is downloadable

### 7.7 Company Rejecting Application

**Test Steps:**

1. From candidate preview, click "Reject"
2. Confirm action (if required)

**Expected Results:**

- ✅ Application status changes to `'rejected'`
- ✅ Graduate receives notification
- ✅ Candidate removed from active candidates list
- ✅ Rejection message sent (if implemented)

---

## Interview Management

### 8.1 Schedule Interview (Company)

**Test Steps:**

1. From candidate preview, click "Schedule Interview"
2. Fill in:
   - Date
   - Time
   - **Duration**: Select 15, 30, 45, or 60 minutes
   - Meeting link/room (if applicable)
3. Click "Schedule"

**Expected Results:**

- ✅ Interview created
- ✅ Interview appears in "Upcoming Interviews"
- ✅ Both company and graduate receive notifications
- ✅ Interview link/room accessible
- ✅ Duration stored correctly

**Validation Checks:**

- ❌ Schedule with past date/time → Show error
- ❌ Schedule overlapping interview with same candidate → Show error
- ❌ Duration not 15, 30, 45, or 60 → Show error

### 8.2 Interview Conflict Prevention

**Test Steps:**

1. Schedule interview with Candidate A for 2:00 PM (30 min duration)
2. Try to schedule another interview with Candidate A for 2:15 PM

**Expected Results:**

- ✅ Error: "Candidate already has an active interview"
- ✅ Cannot schedule overlapping interview with same candidate
- ✅ Can still schedule with other candidates

**Test Scenarios:**

- **Same candidate, overlapping time**: ❌ Blocked
- **Same candidate, non-overlapping time**: ✅ Allowed
- **Different candidate, overlapping time**: ✅ Allowed

### 8.3 View Upcoming Interviews

**Test Steps:**

1. Login as company or graduate
2. Navigate to `/interviews`
3. View "Upcoming Interviews" section

**Expected Results:**

- ✅ Interviews listed with:
  - Date and time
  - Duration
  - Participant name (company or candidate)
  - Job title
  - Status
- ✅ Interviews sorted by date (soonest first)
- ✅ Can click to view details or join interview

### 8.4 Interview Auto-Completion

**Test Steps:**

1. Schedule interview for past time (e.g., 1 hour ago, 30 min duration)
2. Navigate to `/interviews` page
3. Check "Past Interviews" section

**Expected Results:**

- ✅ Interview automatically moved to "Past Interviews" when `scheduledAt + durationMinutes` has passed
- ✅ Interview status changed to `'completed'`
- ✅ No longer appears in "Upcoming Interviews"
- ✅ Appears in "Past Interviews"

**Test Scenarios:**

- **Interview at 2:00 PM, 30 min duration**: Should be "past" after 2:30 PM
- **Interview at 2:00 PM, 60 min duration**: Should be "past" after 3:00 PM

### 8.5 Join Interview

**Test Steps:**

1. From interviews page, click on upcoming interview
2. Click "Join Interview" or navigate to interview room
3. Enter interview room

**Expected Results:**

- ✅ Interview room loads
- ✅ Video/audio connection established (if implemented)
- ✅ Chat available (if implemented)
- ✅ Can leave interview room

---

## Offer Management

### 9.1 Offer Creation (Automatic)

**Test Steps:**

1. Company accepts an application
2. Check offer creation

**Expected Results:**

- ✅ Offer automatically created when application is accepted
- ✅ Offer PDF generated with:
  - Job title
  - Job type
  - Location
  - Salary (amount and currency)
  - Start date
  - Benefits
  - Company details
- ✅ PDF uploaded to Cloudinary
- ✅ Offer document URL stored
- ✅ Offer status: `'sent'`
- ✅ Message created in chat with offer attachment

### 9.2 Graduate Receiving Offer

**Test Steps:**

1. Login as graduate who received offer
2. Navigate to `/messages`
3. Open conversation with company
4. View offer message

**Expected Results:**

- ✅ Offer message visible in chat
- ✅ Offer details displayed
- ✅ "Download Offer" button available
- ✅ Offer PDF downloadable
- ✅ Email notification received

### 9.3 Download Offer Document

**Test Steps:**

1. From messages page, click "Download Offer"
2. PDF downloads

**Expected Results:**

- ✅ PDF downloads successfully
- ✅ PDF contains all offer details
- ✅ PDF is properly formatted
- ✅ Can open and view PDF

### 9.4 Upload Signed Offer

**Test Steps:**

1. From messages page, download offer
2. Sign offer document (manually)
3. Click "Upload Signed Offer" or file upload button
4. Select signed PDF
5. Upload file

**Expected Results:**

- ✅ File uploads to Cloudinary
- ✅ Signed document URL stored in offer
- ✅ Offer status changes to `'signed'`
- ✅ Message updated in chat showing signed document
- ✅ Company receives notification
- ✅ "Accept Offer" button becomes available

**Validation Checks:**

- ❌ Upload non-PDF file → Show error
- ❌ Upload file > 10MB → Show error
- ❌ Upload before signing → Should allow (no validation of signature)

### 9.5 Accept Offer

**Test Steps:**

1. After uploading signed offer, click "Accept Offer" button
2. Confirm action (if required)

**Expected Results:**

- ✅ Offer status changes to `'accepted'`
- ✅ Application status changes to `'hired'`
- ✅ Job posting becomes inactive (no new applications)
- ✅ Company receives notification
- ✅ Graduate moved to "Hired" status on company's candidate page
- ✅ Success message shown

**Verification:**

- ✅ Check job is inactive
- ✅ Check application status is `'hired'`
- ✅ Check offer status is `'accepted'`
- ✅ Check company notification received

### 9.6 Reject Offer

**Test Steps:**

1. From messages page, view offer
2. Click "Reject Offer" (if available)
3. Confirm action

**Expected Results:**

- ✅ Offer status changes to `'rejected'`
- ✅ Application status may change (depending on business logic)
- ✅ Company receives notification
- ✅ Offer marked as rejected

### 9.7 Offer Expiration

**Test Steps:**

1. Create offer with expiration date (if implemented)
2. Wait for expiration
3. Try to accept expired offer

**Expected Results:**

- ✅ Expired offers cannot be accepted
- ✅ Error message shown
- ✅ Offer status changes to `'expired'`

---

## Messaging System

### 10.1 Access Messages Page

**Test Steps:**

1. Login as graduate or company
2. Navigate to `/messages`

**Expected Results:**

- ✅ Messages page loads
- ✅ Conversation list displayed (if any)
- ✅ Can see conversations with:
  - Other party name
  - Last message preview
  - Timestamp
  - Unread indicator (if unread)

### 10.2 Start Conversation

**Test Steps:**

1. From candidate preview (company) or company preview (graduate), click "Chat"
2. Navigate to messages page
3. Conversation should be created/opened

**Expected Results:**

- ✅ Conversation created if doesn't exist
- ✅ Conversation opened in messages page
- ✅ Can send messages
- ✅ Messages appear in real-time (if WebSocket implemented)

### 10.3 Send Text Message

**Test Steps:**

1. Open conversation
2. Type message in input field
3. Press Enter or click "Send"

**Expected Results:**

- ✅ Message sent
- ✅ Message appears in chat
- ✅ Timestamp shown
- ✅ Receiver receives notification
- ✅ Message marked as unread for receiver

### 10.4 Send Offer Message

**Test Steps:**

1. Company accepts application (offer automatically sent)
2. Check messages page

**Expected Results:**

- ✅ Offer message appears in chat
- ✅ Offer details displayed
- ✅ Download button available
- ✅ Message type: `'offer'`

### 10.5 Send File Message

**Test Steps:**

1. Open conversation
2. Click "Attach File" or file upload button
3. Select file (PDF, image, etc.)
4. Upload

**Expected Results:**

- ✅ File uploaded to Cloudinary
- ✅ File message appears in chat
- ✅ File downloadable
- ✅ File name displayed
- ✅ Message type: `'file'`

### 10.6 Read Receipts

**Test Steps:**

1. Send message as User A
2. Login as User B
3. Open conversation
4. View message

**Expected Results:**

- ✅ Message marked as read
- ✅ `read: true` in database
- ✅ `readAt` timestamp set
- ✅ Read indicator shown to sender (if implemented)

### 10.7 Message Notifications

**Test Steps:**

1. User A sends message to User B
2. User B is logged in (different tab/browser)

**Expected Results:**

- ✅ User B receives in-app notification
- ✅ Notification appears in notifications list
- ✅ Unread message count updated
- ✅ Email notification sent (if configured)

---

## Notifications

### 11.1 View Notifications

**Test Steps:**

1. Login as any user
2. Navigate to `/notifications`
3. View notification list

**Expected Results:**

- ✅ Notifications listed
- ✅ Notifications sorted by date (newest first)
- ✅ Notification types displayed:
  - Application received
  - Application accepted/rejected
  - Interview scheduled
  - Offer sent
  - Offer accepted/rejected
  - Message received
- ✅ Unread notifications highlighted
- ✅ Can mark as read

### 11.2 Notification Types

**Test Scenarios:**

**Graduate Notifications:**

- ✅ Application accepted → Offer sent notification
- ✅ Interview scheduled → Interview notification
- ✅ Offer accepted confirmation
- ✅ Message received

**Company Notifications:**

- ✅ New application received
- ✅ Interview reminder (if implemented)
- ✅ Offer signed → Notification
- ✅ Offer accepted → Notification
- ✅ Message received

### 11.3 Mark Notification as Read

**Test Steps:**

1. View notifications
2. Click on unread notification
3. Or click "Mark all as read"

**Expected Results:**

- ✅ Notification marked as read
- ✅ Unread count updated
- ✅ Notification no longer highlighted
- ✅ `read: true` in database

### 11.4 Email Notifications

**Test Steps:**

1. Trigger notification event (e.g., application accepted)
2. Check email inbox

**Expected Results:**

- ✅ Email sent to user
- ✅ Email contains relevant information
- ✅ Email has clear call-to-action
- ✅ Email is properly formatted

---

## Profile Management

### 12.1 View Graduate Profile

**Test Steps:**

1. Login as graduate
2. Navigate to `/graduate/profile`

**Expected Results:**

- ✅ Profile information displayed:
  - Personal information
  - Education
  - Experience (with salary per annum)
  - Skills
  - CV download link
  - Assessment rank
- ✅ Can edit profile
- ✅ Changes saved

### 12.2 Edit Graduate Profile

**Test Steps:**

1. Navigate to profile page
2. Click "Edit" button
3. Modify fields
4. Click "Save"

**Expected Results:**

- ✅ Changes saved to database
- ✅ Profile updated
- ✅ Changes reflected immediately
- ✅ Success message shown

### 12.3 View Company Profile

**Test Steps:**

1. Login as company
2. Navigate to `/company/profile`

**Expected Results:**

- ✅ Company information displayed:
  - Company name
  - Industry
  - Size
  - Website
  - Description
  - Logo
- ✅ Can edit profile

### 12.4 Edit Company Profile

**Test Steps:**

1. Navigate to company profile
2. Click "Edit"
3. Modify fields
4. Upload new logo (optional)
5. Click "Save"

**Expected Results:**

- ✅ Changes saved
- ✅ Logo updated (if changed)
- ✅ Profile updated
- ✅ Success message shown

---

## Admin Features

### 13.1 Admin Dashboard

**Test Steps:**

1. Login as admin
2. Navigate to `/admin`

**Expected Results:**

- ✅ Admin dashboard loads
- ✅ Statistics displayed:
  - Total graduates
  - Total companies
  - Total jobs
  - Total applications
- ✅ Quick access to:
  - Graduates list
  - Companies list
  - Jobs list

### 13.2 View Graduates (Admin)

**Test Steps:**

1. Navigate to `/admin/graduates`
2. View graduate list

**Expected Results:**

- ✅ All graduates listed
- ✅ Can filter/search
- ✅ Can view individual profiles
- ✅ Can see assessment scores
- ✅ Can see application status

### 13.3 View Companies (Admin)

**Test Steps:**

1. Navigate to `/companies` or `/admin/companies`
2. View company list

**Expected Results:**

- ✅ All companies listed
- ✅ Can filter/search
- ✅ Can view company profiles
- ✅ Can see job postings
- ✅ Can see candidate applications

### 13.4 View Jobs (Admin)

**Test Steps:**

1. Navigate to `/admin/jobs`
2. View job list

**Expected Results:**

- ✅ All jobs listed
- ✅ Can filter by:
  - Company
  - Status (active/inactive)
  - Job type
- ✅ Can view job details
- ✅ Can see applications for each job

### 13.5 Admin Authorization

**Test Steps:**

1. Try to access `/admin` as non-admin user

**Expected Results:**

- ✅ Access denied
- ✅ Redirected to appropriate page
- ✅ Error message shown
- ✅ 403 Forbidden response

---

## Edge Cases & Error Handling

### 14.1 Network Errors

**Test Scenarios:**

- ❌ API request fails → Show error message, retry option
- ❌ Slow network → Show loading indicators
- ❌ Timeout → Show timeout error

### 14.2 Session Expiration

**Test Steps:**

1. Login
2. Wait for session to expire (or manually expire)
3. Try to perform action

**Expected Results:**

- ✅ Redirected to login page
- ✅ Error message: "Session expired"
- ✅ Can login again
- ✅ Refresh token used (if implemented)

### 14.3 Invalid Data

**Test Scenarios:**

- ❌ Submit form with invalid data → Show validation errors
- ❌ Upload invalid file type → Show error
- ❌ Enter SQL injection attempt → Sanitized/rejected
- ❌ Enter XSS attempt → Sanitized/rejected

### 14.4 Concurrent Actions

**Test Scenarios:**

- ✅ Multiple users apply to same job → All applications created
- ✅ Company accepts application while graduate viewing → Status updates
- ✅ Interview scheduled while candidate viewing profile → Notification sent

### 14.5 Data Consistency

**Test Scenarios:**

- ✅ Delete job → Applications remain, but job marked inactive
- ✅ Deactivate company → Jobs become inactive
- ✅ Graduate deletes profile → Applications remain (soft delete if implemented)

### 14.6 Performance Testing

**Test Scenarios:**

- ✅ Load 100+ candidates → Pagination works
- ✅ Load 50+ messages → Messages load efficiently
- ✅ Search with large dataset → Search is fast
- ✅ Generate assessment with many skills → Questions generated in reasonable time

### 14.7 Browser Compatibility

**Test Scenarios:**

- ✅ Test on Chrome → All features work
- ✅ Test on Firefox → All features work
- ✅ Test on Safari → All features work
- ✅ Test on mobile browsers → Responsive design works

---

## Testing Checklist Summary

### Pre-Deployment Checklist

- [ ] All registration flows tested
- [ ] Email verification working
- [ ] Onboarding flows complete
- [ ] Assessment scoring accurate
- [ ] Job posting and editing working
- [ ] Matching algorithm functional
- [ ] Application flow end-to-end
- [ ] Interview scheduling with conflict prevention
- [ ] Offer creation and acceptance flow
- [ ] Messaging system functional
- [ ] Notifications working (in-app and email)
- [ ] Profile management working
- [ ] Admin features accessible only to admins
- [ ] Error handling tested
- [ ] Edge cases covered
- [ ] Performance acceptable
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness checked

### Critical Paths to Test

1. **Graduate Journey**: Register → Onboard → Assessment → Explore → Apply → Interview → Accept Offer → Hired
2. **Company Journey**: Register → Onboard → Post Job → View Candidates → Accept → Send Offer → Receive Signed Offer → Hire
3. **Offer Flow**: Accept Application → Generate Offer PDF → Send via Chat/Email → Download → Sign → Upload → Accept → Job Inactive
4. **Interview Flow**: Schedule Interview → Send Notifications → Join Interview → Complete Interview → Auto-Move to Past
5. **Assessment Flow**: Start Assessment → Generate Questions → Answer Questions → Calculate Score → Assign Rank → Redirect Based on Score

---

## Additional Testing Scenarios

### 15.1 API Endpoint Testing

#### 15.1.1 Authentication Endpoints

**Test Endpoints:**

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/verify-email`

**Test Cases:**

- ✅ Valid registration request returns 201
- ✅ Invalid email format returns 400
- ✅ Duplicate email returns 400
- ✅ Password < 8 characters returns 400
- ✅ Valid login returns 200 with tokens
- ✅ Invalid credentials returns 401
- ✅ Refresh token works correctly
- ✅ Expired token returns 401

#### 15.1.2 Graduate Endpoints

**Test Endpoints:**

- `GET /api/graduates/profile`
- `POST /api/graduates/profile`
- `GET /api/graduates/assessment/questions`
- `POST /api/graduates/assessment/submit`
- `GET /api/graduates/jobs/available`
- `POST /api/graduates/applications`
- `GET /api/graduates/applications`
- `GET /api/graduates/interviews`
- `GET /api/graduates/offers/:applicationId`
- `POST /api/graduates/offers/:offerId/upload-signed`
- `POST /api/graduates/offers/:offerId/accept`
- `POST /api/graduates/offers/:offerId/reject`

**Test Cases:**

- ✅ Get profile returns 200 with correct data
- ✅ Update profile returns 200
- ✅ Assessment questions generated successfully
- ✅ Assessment submission calculates score correctly
- ✅ Available jobs filtered correctly
- ✅ Application creation works
- ✅ Interviews retrieved with correct status
- ✅ Offer retrieval works
- ✅ Signed offer upload works
- ✅ Offer acceptance updates status correctly

#### 15.1.3 Company Endpoints

**Test Endpoints:**

- `GET /api/companies/profile`
- `POST /api/companies/profile`
- `POST /api/companies/jobs`
- `GET /api/companies/jobs`
- `PUT /api/companies/jobs/:id`
- `GET /api/companies/candidates`
- `PUT /api/companies/applications/:id/status`
- `POST /api/companies/interviews`
- `GET /api/companies/interviews`

**Test Cases:**

- ✅ Get company profile returns 200
- ✅ Create job returns 201
- ✅ Update job returns 200
- ✅ Get candidates with filters works
- ✅ Update application status triggers offer creation
- ✅ Schedule interview validates conflicts
- ✅ Get interviews categorizes correctly

#### 15.1.4 Message Endpoints

**Test Endpoints:**

- `GET /api/messages/conversations`
- `GET /api/messages/:conversationId`
- `POST /api/messages`
- `PUT /api/messages/:messageId/read`

**Test Cases:**

- ✅ Get conversations returns list
- ✅ Get messages for conversation works
- ✅ Send message creates record
- ✅ Mark message as read updates status

### 15.2 Database Testing

#### 15.2.1 Data Integrity

**Test Scenarios:**

- ✅ User deletion cascades correctly (or soft delete)
- ✅ Application references remain valid
- ✅ Interview references remain valid
- ✅ Offer references remain valid
- ✅ Message references remain valid
- ✅ Foreign key constraints work

#### 15.2.2 Data Validation

**Test Scenarios:**

- ✅ Required fields enforced
- ✅ Email uniqueness enforced
- ✅ Enum values validated
- ✅ Date ranges validated
- ✅ Numeric ranges validated

#### 15.2.3 Index Performance

**Test Scenarios:**

- ✅ User email lookup is fast
- ✅ Application queries by status are fast
- ✅ Interview queries by date are fast
- ✅ Message queries by conversation are fast

### 15.3 Security Testing

#### 15.3.1 Authentication Security

**Test Scenarios:**

- ✅ Passwords are hashed (not plain text)
- ✅ JWT tokens are signed correctly
- ✅ Refresh tokens are rotated
- ✅ Session tokens expire correctly
- ✅ Password reset tokens expire

#### 15.3.2 Authorization Testing

**Test Scenarios:**

- ✅ Graduate cannot access company routes
- ✅ Company cannot access graduate routes
- ✅ Unauthenticated users cannot access protected routes
- ✅ Users cannot access other users' data
- ✅ Admin-only routes are protected

#### 15.3.3 Input Validation

**Test Scenarios:**

- ✅ SQL injection attempts are blocked
- ✅ XSS attempts are sanitized
- ✅ File uploads are validated
- ✅ Email format is validated
- ✅ URL format is validated

#### 15.3.4 Rate Limiting

**Test Scenarios:**

- ✅ Too many login attempts are rate limited
- ✅ Too many registration attempts are rate limited
- ✅ API endpoints respect rate limits
- ✅ Rate limit headers are returned

### 15.4 Integration Testing

#### 15.4.1 AI Service Integration

**Test Scenarios:**

- ✅ Assessment question generation works
- ✅ Profile embedding generation works
- ✅ Matching algorithm works
- ✅ Feedback generation works
- ✅ AI service errors are handled gracefully

#### 15.4.2 Cloudinary Integration

**Test Scenarios:**

- ✅ CV upload works
- ✅ Offer PDF upload works
- ✅ Signed offer upload works
- ✅ File retrieval works
- ✅ Invalid file types are rejected

#### 15.4.3 Email Service Integration

**Test Scenarios:**

- ✅ Verification emails are sent
- ✅ Password reset emails are sent
- ✅ Offer notification emails are sent
- ✅ Interview notification emails are sent
- ✅ Email templates render correctly

### 15.5 UI/UX Testing

#### 15.5.1 Responsive Design

**Test Scenarios:**

- ✅ Desktop view (1920x1080) works correctly
- ✅ Tablet view (768x1024) works correctly
- ✅ Mobile view (375x667) works correctly
- ✅ Navigation is accessible on all screen sizes
- ✅ Forms are usable on mobile

#### 15.5.2 Accessibility

**Test Scenarios:**

- ✅ Keyboard navigation works
- ✅ Screen reader compatibility
- ✅ Color contrast meets WCAG standards
- ✅ Alt text for images
- ✅ Form labels are associated

#### 15.5.3 User Experience

**Test Scenarios:**

- ✅ Loading states are shown
- ✅ Error messages are clear
- ✅ Success messages are shown
- ✅ Navigation is intuitive
- ✅ Forms have proper validation feedback

### 15.6 Performance Testing

#### 15.6.1 Load Testing

**Test Scenarios:**

- ✅ 100 concurrent users can register
- ✅ 50 concurrent users can login
- ✅ 1000 candidates can be listed (with pagination)
- ✅ 500 messages can be loaded
- ✅ Assessment generation completes in < 10 seconds

#### 15.6.2 Stress Testing

**Test Scenarios:**

- ✅ System handles 1000+ applications
- ✅ System handles 500+ interviews
- ✅ System handles 200+ active conversations
- ✅ Database queries remain fast under load

### 15.7 Regression Testing

#### 15.7.1 Critical Functionality

**After each deployment, verify:**

- ✅ Registration still works
- ✅ Login still works
- ✅ Assessment scoring is accurate
- ✅ Offer generation works
- ✅ Interview scheduling works
- ✅ Message sending works

#### 15.7.2 Data Migration

**Test Scenarios:**

- ✅ Existing data is preserved
- ✅ Data format changes are handled
- ✅ Schema migrations work
- ✅ Rollback procedures work

### 15.8 Browser-Specific Testing

#### 15.8.1 Chrome/Chromium

**Test Scenarios:**

- ✅ All features work
- ✅ No console errors
- ✅ Performance is acceptable
- ✅ Extensions don't interfere

#### 15.8.2 Firefox

**Test Scenarios:**

- ✅ All features work
- ✅ CSS renders correctly
- ✅ JavaScript executes correctly
- ✅ No compatibility issues

#### 15.8.3 Safari

**Test Scenarios:**

- ✅ All features work
- ✅ Date pickers work
- ✅ File uploads work
- ✅ No WebKit-specific issues

#### 15.8.4 Edge

**Test Scenarios:**

- ✅ All features work
- ✅ No Microsoft-specific issues
- ✅ Performance is acceptable

### 15.9 Mobile Testing

#### 15.9.1 iOS Safari

**Test Scenarios:**

- ✅ Responsive design works
- ✅ Touch interactions work
- ✅ Forms are usable
- ✅ File uploads work (if supported)

#### 15.9.2 Android Chrome

**Test Scenarios:**

- ✅ Responsive design works
- ✅ Touch interactions work
- ✅ Forms are usable
- ✅ File uploads work

### 15.10 End-to-End User Journeys

#### 15.10.1 Complete Graduate Journey

**Test Steps:**

1. Register as graduate
2. Verify email
3. Complete onboarding (all steps)
4. Complete assessment (score >= 60)
5. View matched jobs on dashboard
6. Explore companies
7. Apply for a job
8. Receive interview invitation
9. Attend interview
10. Receive offer
11. Download offer
12. Sign and upload offer
13. Accept offer
14. Verify hired status

**Expected Results:**

- ✅ All steps complete successfully
- ✅ No errors encountered
- ✅ All notifications received
- ✅ Status updates correctly

#### 15.10.2 Complete Company Journey

**Test Steps:**

1. Register as company
2. Verify email
3. Complete onboarding (company info + job posting)
4. View matched candidates
5. Preview candidate profile
6. Accept candidate application
7. Verify offer is sent
8. Schedule interview with another candidate
9. Receive signed offer
10. Receive offer acceptance
11. Verify job is inactive
12. Verify candidate is hired

**Expected Results:**

- ✅ All steps complete successfully
- ✅ No errors encountered
- ✅ All notifications sent
- ✅ Status updates correctly

### 15.11 Error Recovery Testing

#### 15.11.1 Network Failures

**Test Scenarios:**

- ✅ Offline mode handling
- ✅ Network timeout handling
- ✅ Partial request failures
- ✅ Retry mechanisms work

#### 15.11.2 Server Errors

**Test Scenarios:**

- ✅ 500 errors are handled gracefully
- ✅ 503 errors show appropriate message
- ✅ Database connection errors are handled
- ✅ Service unavailable errors are handled

#### 15.11.3 Data Loss Prevention

**Test Scenarios:**

- ✅ Form data is preserved on refresh
- ✅ Draft messages are saved
- ✅ Upload progress is preserved
- ✅ Session data is maintained

---

## Test Data Management

### Test Accounts Setup

**Graduate Test Accounts:**

- `graduate.test1@example.com` - New graduate (not onboarded)
- `graduate.test2@example.com` - Onboarded, assessment pending
- `graduate.test3@example.com` - Assessment completed (Rank A)
- `graduate.test4@example.com` - Assessment completed (Rank B)
- `graduate.test5@example.com` - Assessment failed (Rank D, needs retake)

**Company Test Accounts:**

- `company.test1@example.com` - New company (not onboarded)
- `company.test2@example.com` - Onboarded, no jobs posted
- `company.test3@example.com` - Active with jobs posted
- `company.test4@example.com` - With active interviews

**Admin Test Account:**

- `admin.test@example.com` - Full admin access

### Test Data Cleanup

**Before each test run:**

- Clear test user accounts (if automated)
- Clear test applications
- Clear test interviews
- Clear test offers
- Clear test messages

**After each test run:**

- Archive test data
- Generate test reports
- Document any issues found

---

## Automated Testing

### Unit Tests

**Coverage Areas:**

- Utility functions
- Validation functions
- Business logic functions
- Helper functions

### Integration Tests

**Coverage Areas:**

- API endpoints
- Database operations
- External service integrations
- Authentication flows

### E2E Tests (Playwright)

**Critical Paths to Automate:**

1. Graduate registration and onboarding
2. Company registration and onboarding
3. Assessment submission
4. Job application flow
5. Interview scheduling
6. Offer acceptance flow

---

## Bug Reporting Template

When reporting bugs, include:

1. **Title**: Clear, concise description
2. **Steps to Reproduce**: Detailed step-by-step
3. **Expected Result**: What should happen
4. **Actual Result**: What actually happened
5. **Environment**: Browser, OS, version
6. **Screenshots**: If applicable
7. **Console Errors**: Any JavaScript errors
8. **Network Logs**: Failed API requests
9. **Priority**: Critical, High, Medium, Low
10. **Severity**: Blocks feature, Minor issue, etc.

---

## Testing Schedule

### Pre-Release Testing

**Week 1: Core Functionality**

- Registration and authentication
- Onboarding flows
- Assessment system

**Week 2: Main Features**

- Job posting and applications
- Interview management
- Offer management

**Week 3: Supporting Features**

- Messaging system
- Notifications
- Profile management

**Week 4: Polish & Edge Cases**

- Error handling
- Performance testing
- Browser compatibility
- Security testing

### Post-Release Testing

**Daily:**

- Smoke tests on critical paths
- Monitor error logs
- Check user-reported issues

**Weekly:**

- Full regression test suite
- Performance monitoring
- Security audit

---

## Conclusion

This testing guideline provides comprehensive coverage of all features and functionality in the Talent Hub platform. Follow these guidelines to ensure:

- ✅ All features work as expected
- ✅ User journeys are smooth
- ✅ Edge cases are handled
- ✅ Security is maintained
- ✅ Performance is acceptable
- ✅ Compatibility is verified

**Remember**: Testing is an ongoing process. Update this document as new features are added or existing features are modified.

---

**Last Updated**: [Current Date]
**Version**: 1.0
**Maintained By**: Development Team
