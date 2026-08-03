# Complete Database Schema Summary

This document provides a comprehensive overview of the entire database schema reconstructed from migration files.

## Table of Contents
1. [Extensions](#extensions)
2. [Core Tables](#core-tables)
3. [Admin Tables](#admin-tables)
4. [College Mentor System](#college-mentor-system)
5. [Coach System](#coach-system)
6. [Analytics](#analytics)
7. [Functions](#functions)
8. [RLS Policies](#rls-policies)
9. [Indexes](#indexes)
10. [Triggers](#triggers)

---

## Extensions

- **pgcrypto**: Used for password hashing (crypt, gen_salt functions)

---

## Core Tables

### 1. **teachers**
Primary table for teacher accounts and authentication.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `username` (text, unique, NOT NULL): Username for login
- `name` (text, NOT NULL): Full name
- `email` (text, unique): Email address
- `password_hash` (text): Hashed password using bcrypt
- `temp_password` (boolean): Whether using temporary password
- `password_last_changed` (timestamptz): Last password change timestamp
- `account_locked` (boolean): Account lock status
- `failed_login_attempts` (integer): Failed login counter
- `last_failed_login` (timestamptz): Last failed login attempt
- `account_status` (text): Status (active, inactive, suspended)
- `last_login` (timestamptz): Last successful login
- `login_count` (integer): Total login count
- `district_id` (uuid, FK): Reference to school_districts
- `created_at`, `updated_at` (timestamptz): Timestamps
- `updated_by` (uuid, FK): Last admin who updated

**Indexes:**
- `idx_teachers_username`
- `idx_teachers_email`
- `idx_teachers_district`
- `idx_teachers_updated_by`

**RLS:** Enabled with policies for teacher self-management

---

### 2. **students**
Student records linked to teachers.

**Columns:**
- `id` (integer, PK): Student ID number
- `grade_level` (text, NOT NULL): Grade level
- `subject` (text, NOT NULL): Subject area
- `teacher_username` (text, FK, NOT NULL): Associated teacher
- `emoji` (text): Student avatar emoji
- `is_active` (boolean): Active status
- `created_at` (timestamptz): Creation timestamp

**Indexes:**
- `idx_students_teacher`
- `idx_students_id`

**RLS:** Teachers can manage their own students, public read access

---

### 3. **exit_tickets**
Assessment/quiz results for students.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `student_id` (integer, NOT NULL): Student ID
- `teacher_username` (text, FK, NOT NULL): Teacher username
- `score` (integer, NOT NULL): Points scored
- `total_questions` (integer, NOT NULL): Total questions
- `struggled_areas` (text[]): Array of struggle topics
- `last_lesson` (text): Description of last lesson
- `created_at` (timestamptz): Assessment timestamp

**Indexes:**
- `idx_exit_tickets_student`
- `idx_exit_tickets_teacher`
- `idx_exit_tickets_created`

**RLS:** Teachers manage their own, public insert

---

### 4. **lesson_plans**
Personalized UDL (Universal Design for Learning) lesson plans.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `student_id` (integer, NOT NULL): Student ID
- `teacher_username` (text, FK, NOT NULL): Teacher username
- `objective` (text, NOT NULL): Lesson objective
- `engagement` (text[], NOT NULL): Engagement activities
- `representation` (text[], NOT NULL): Representation activities
- `action_expression` (text[], NOT NULL): Action/Expression activities
- `wrapup` (text[], NOT NULL): Wrap-up activities
- `duration` (integer, NOT NULL): Duration in minutes (default 25)
- `detailed_activities` (jsonb): Detailed activity breakdown
- `aligned_standards` (jsonb): Aligned CA standards
- `dok_levels` (jsonb): Depth of Knowledge levels for each phase
- `exit_ticket_id` (uuid, FK): Associated exit ticket
- `created_at`, `updated_at` (timestamptz): Timestamps

**Indexes:**
- `idx_lesson_plans_student`
- `idx_lesson_plans_teacher`
- `idx_lesson_plans_exit_ticket`

**RLS:** Public access

---

### 5. **group_lesson_plans**
Lesson plans for groups of students.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `group_id` (text, NOT NULL): Group identifier
- `teacher_username` (text, FK, NOT NULL): Teacher username
- `lesson_plan` (jsonb, NOT NULL): Lesson plan structure
- `student_ids` (integer[], NOT NULL): Array of student IDs
- `focus_areas` (text[], NOT NULL): Focus areas
- `unique_id` (text, NOT NULL): Unique group identifier
- `created_at` (timestamptz): Creation timestamp

**RLS:** Public access

---

### 6. **weekly_groups**
Weekly grouping of students for instruction.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `teacher_username` (text, FK, NOT NULL): Teacher username
- `group_name` (text, NOT NULL): Group name
- `student_ids` (integer[], NOT NULL): Student IDs in group
- `lesson_plan_id` (uuid, FK): Associated lesson plan
- `created_at`, `updated_at` (timestamptz): Timestamps

**Indexes:**
- `idx_weekly_groups_lesson_plan_id`

**RLS:** Teachers can manage

---

### 7. **quiz_templates**
Templates for generating quizzes.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `title` (text, NOT NULL): Quiz title
- `description` (text): Quiz description
- `grade_level` (text, NOT NULL): Target grade level
- `topic` (text, NOT NULL): Main topic
- `subtopics` (text[]): Subtopics covered
- `num_questions` (integer, NOT NULL): Number of questions (default 5)
- `is_active` (boolean): Active status (default true)
- `teacher_username` (text, FK): Creating teacher
- `created_at`, `updated_at` (timestamptz): Timestamps

**Indexes:**
- `idx_quiz_templates_template_id`

**RLS:** Public read, teachers manage by username

---

### 8. **quiz_questions**
Questions for quiz templates.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `template_id` (uuid, FK, NOT NULL): Associated template
- `question_text` (text, NOT NULL): Question text
- `question_type` (text, NOT NULL): Type (multiple_choice, true_false, short_answer)
- `correct_answer` (text, NOT NULL): Correct answer
- `incorrect_answers` (text[]): Distractors
- `explanation` (text): Answer explanation
- `difficulty` (text): Difficulty level (easy, medium, hard)
- `subtopic` (text): Specific subtopic
- `created_at` (timestamptz): Creation timestamp

**Indexes:**
- `idx_quiz_questions_template_id`

**RLS:** Teachers can manage

---

### 9. **quiz_attempts**
Student quiz attempt records.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `template_id` (uuid, FK, NOT NULL): Quiz template
- `student_id` (integer, NOT NULL): Student ID
- `teacher_username` (text, FK, NOT NULL): Teacher username
- `score` (integer, NOT NULL): Points scored
- `total_questions` (integer, NOT NULL): Total questions
- `answers` (jsonb, NOT NULL): Student answers
- `duration` (integer): Time taken in seconds
- `start_time` (timestamptz): Start time
- `completion_time` (timestamptz): Completion time
- `completed_at` (timestamptz): Default now
- `created_at` (timestamptz): Creation timestamp

**Indexes:**
- `idx_quiz_attempts_student_created`
- `idx_quiz_attempts_template_id`

**RLS:** Teachers manage their own, public insert

---

### 10. **ca_standards**
California Common Core Mathematics Standards.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `grade_level` (text, NOT NULL): Grade level
- `subject` (text, NOT NULL): Subject (typically Mathematics)
- `standard_code` (text, unique, NOT NULL): Standard code (e.g., "3.OA.A.1")
- `domain` (text): Domain name
- `cluster` (text): Cluster description
- `description` (text, NOT NULL): Full standard description
- `created_at` (timestamptz): Creation timestamp

**Indexes:**
- `idx_ca_standards_grade_subject`

**RLS:** Public read access

**Notes:**
- Populated with K-12 CA Math standards via migrations
- Used for lesson plan alignment

---

### 11. **standards_alignments**
Tracks student proficiency on specific standards.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `student_id` (integer, NOT NULL): Student ID
- `teacher_username` (text, FK, NOT NULL): Teacher username
- `standard_id` (uuid, FK, NOT NULL): CA standard reference
- `proficiency_level` (text): Level (not_started, developing, proficient, advanced)
- `last_assessed` (timestamptz): Last assessment date
- `created_at` (timestamptz): Creation timestamp

**Indexes:**
- `idx_standards_alignments_standard_id`
- `idx_standards_alignments_student_teacher`

**RLS:** Public access

---

## Admin Tables

### 12. **admin_users**
Administrator accounts.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `email` (text, unique, NOT NULL): Admin email
- `password_hash` (text, NOT NULL): Hashed password
- `full_name` (text, NOT NULL): Full name
- `role` (text, NOT NULL): Role (admin, super_admin)
- `is_active` (boolean): Active status
- `created_at` (timestamptz): Creation timestamp
- `last_login` (timestamptz): Last login time

**RLS:** Admin users can manage all data

---

### 13. **admin_sessions**
Admin authentication sessions.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `admin_id` (uuid, FK, NOT NULL): Admin user ID
- `session_token` (text, unique, NOT NULL): Session token
- `expires_at` (timestamptz, NOT NULL): Expiration time
- `created_at` (timestamptz): Creation timestamp
- `last_activity` (timestamptz): Last activity time

**Indexes:**
- `idx_admin_sessions_admin_id`

**RLS:** Admins manage their own sessions

---

### 14. **admin_audit_logs**
Audit trail for all administrative actions.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `admin_id` (uuid): Admin performing action (NULL for system)
- `action` (text, NOT NULL): Action performed
- `target_type` (text): Type of target (teacher, student, etc.)
- `target_id` (text): Target identifier
- `details` (jsonb): Additional details
- `ip_address` (inet): IP address
- `created_at` (timestamptz): Timestamp

**RLS:** Public read for auditing

---

### 15. **teacher_accounts** (Legacy)
Legacy teacher account table (may be merged with teachers).

**Columns:**
- `id` (uuid, PK): Unique identifier
- `username` (text, unique, NOT NULL): Username
- `email` (text, unique, NOT NULL): Email
- `full_name` (text, NOT NULL): Full name
- `password_hash` (text, NOT NULL): Hashed password
- `temp_password` (boolean): Temp password flag
- `password_last_changed` (timestamptz): Last change
- `account_locked` (boolean): Lock status
- `failed_login_attempts` (integer): Failed attempts
- `last_failed_login` (timestamptz): Last failed attempt
- `last_login` (timestamptz): Last login
- `login_count` (integer): Total logins
- `created_at` (timestamptz): Creation time
- `created_by` (uuid, FK): Creating admin

**Indexes:**
- `idx_teacher_accounts_created_by`

**RLS:** Public access

---

### 16. **teacher_sessions**
Teacher authentication sessions.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `teacher_id` (uuid, FK): Teacher ID
- `session_token` (text, unique, NOT NULL): Session token
- `expires_at` (timestamptz, NOT NULL): Expiration
- `created_at` (timestamptz): Creation time
- `last_activity` (timestamptz): Last activity
- `user_agent` (text): Browser user agent
- `ip_address` (text): IP address

**Indexes:**
- `idx_teacher_sessions_teacher_id`

**RLS:** Teachers access their own

---

### 17. **password_reset_requests**
Password reset token management.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `teacher_id` (uuid, FK): Teacher account
- `token` (text, unique, NOT NULL): Reset token
- `expires_at` (timestamptz, NOT NULL): Expiration
- `used` (boolean): Whether used
- `created_at` (timestamptz): Creation time

**Indexes:**
- `idx_password_reset_requests_teacher_id`

**RLS:** Teachers access their own

---

### 18. **school_districts**
School district management.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `name` (text, unique, NOT NULL): District name
- `code` (text, unique, NOT NULL): District code
- `created_at` (timestamptz): Creation time
- `created_by` (uuid, FK): Creating admin

**Indexes:**
- `idx_school_districts_created_by`

**RLS:** Admin users manage

---

## College Mentor System

### 19. **college_mentors**
College student mentors who tutor K-12 students.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `email` (text, unique, NOT NULL): Email address
- `full_name` (text, NOT NULL): Full name
- `password_hash` (text, NOT NULL): Hashed password
- `phone` (text): Phone number
- `university` (text): University name
- `major` (text): Major/field of study
- `account_status` (text, NOT NULL): Status (active, inactive, suspended)
- `account_locked` (boolean, NOT NULL): Lock status
- `failed_login_attempts` (integer, NOT NULL): Failed attempts
- `last_login` (timestamptz): Last login
- `created_at`, `updated_at` (timestamptz): Timestamps

**Indexes:**
- `idx_college_mentors_email`

**RLS:** Public view and manage

---

### 20. **mentor_groups**
Groups of students assigned to mentors.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `name` (text, NOT NULL): Group name
- `teacher_username` (text, FK, NOT NULL): Owning teacher
- `description` (text): Description
- `grade_level` (text): Grade level
- `subject` (text, NOT NULL): Subject (default Mathematics)
- `status` (text, NOT NULL): Status (active, inactive, archived)
- `created_at`, `updated_at` (timestamptz): Timestamps

**RLS:** Public view and manage

---

### 21. **mentor_group_assignments**
Links mentors to groups.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `mentor_id` (uuid, FK, NOT NULL): College mentor
- `group_id` (uuid, FK, NOT NULL): Mentor group
- `assigned_at` (timestamptz, NOT NULL): Assignment time
- `assigned_by` (text): Assigning user
- **UNIQUE(mentor_id, group_id)**

**Indexes:**
- `idx_mentor_assignments_mentor`
- `idx_mentor_assignments_group`

**RLS:** Public view and manage

---

### 22. **mentor_group_students**
Students in mentor groups.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `group_id` (uuid, FK, NOT NULL): Mentor group
- `student_id` (integer, NOT NULL): Student ID
- `added_at` (timestamptz, NOT NULL): Addition time
- **UNIQUE(group_id, student_id)**

**Indexes:**
- `idx_mentor_students_group`

**RLS:** Public view and manage

---

### 23. **mentor_sessions**
Tutoring session records.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `mentor_id` (uuid, FK, NOT NULL): College mentor
- `group_id` (uuid, FK, NOT NULL): Group tutored
- `session_date` (date, NOT NULL): Session date (default current_date)
- `used_lesson_plan` (boolean, NOT NULL): Whether lesson plan was used
- `lesson_plan_comments` (text): Comments on lesson plan
- `curriculum_feedback` (text): Curriculum feedback
- `tutoring_minutes` (integer, NOT NULL): Minutes spent (0-480)
- `attendance_notes` (text): Attendance notes
- `resource` (text): Resource used
- `created_at`, `updated_at` (timestamptz): Timestamps

**Indexes:**
- `idx_mentor_sessions_mentor`
- `idx_mentor_sessions_group`

**RLS:** Public view, mentors create and update

---

### 24. **mentor_teacher_assignments**
Direct mentor-to-teacher assignments.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `mentor_id` (uuid, FK, NOT NULL): College mentor
- `teacher_username` (text, FK, NOT NULL): Teacher
- `assigned_by` (text): Assigner (default 'admin')
- `assigned_at` (timestamptz, NOT NULL): Assignment time
- `status` (text, NOT NULL): Status (active, inactive)
- `notes` (text): Additional notes
- **UNIQUE(mentor_id, teacher_username)**

**Indexes:**
- `idx_mentor_teacher_assignments_mentor`
- `idx_mentor_teacher_assignments_teacher`

**RLS:** Public view and manage

---

## Coach System

### 25. **coaches**
Instructional coaches who support teachers.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `email` (text, unique, NOT NULL): Email
- `password_hash` (text, NOT NULL): Hashed password
- `full_name` (text, NOT NULL): Full name
- `created_at` (timestamptz): Creation time
- `last_login` (timestamptz): Last login
- `account_locked` (boolean): Lock status

**RLS:** Public view and manage

---

### 26. **coach_teacher_assignments**
Links coaches to teachers they support.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `coach_id` (uuid, FK): Coach
- `teacher_username` (text, FK): Teacher
- `created_at` (timestamptz): Assignment time
- **UNIQUE(coach_id, teacher_username)**

**Indexes:**
- `idx_coach_teacher_assignments_teacher_username`

**RLS:** Public read access

---

### 27. **coach_notes**
Coach notes on teachers/mentors.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `coach_id` (uuid, FK, NOT NULL): Coach
- `target_type` (text, NOT NULL): Type (teacher, mentor)
- `target_id` (text, NOT NULL): Target identifier
- `content` (text, NOT NULL): Note content
- `created_at`, `updated_at` (timestamptz): Timestamps

**Indexes:**
- `idx_coach_notes_coach_id`
- `idx_coach_notes_target`

**RLS:** Public CRUD

---

### 28. **coach_tags**
Tags for organizing teachers/mentors.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `coach_id` (uuid, FK, NOT NULL): Coach
- `target_type` (text, NOT NULL): Type (teacher, mentor)
- `target_id` (text, NOT NULL): Target identifier
- `tag` (text, NOT NULL): Tag text
- `created_at` (timestamptz): Creation time

**Indexes:**
- `idx_coach_tags_coach_id`
- `idx_coach_tags_target`

**RLS:** Public read, insert, delete

---

### 29. **coaching_goals**
Goals set for teachers/mentors.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `coach_id` (uuid, FK, NOT NULL): Coach
- `target_type` (text, NOT NULL): Type (teacher, mentor)
- `target_id` (text, NOT NULL): Target identifier
- `title` (text, NOT NULL): Goal title
- `description` (text): Goal description
- `status` (text, NOT NULL): Status (active, completed, cancelled)
- `due_date` (date): Due date
- `created_at`, `updated_at` (timestamptz): Timestamps

**Indexes:**
- `idx_coaching_goals_coach_id`
- `idx_coaching_goals_target`
- `idx_coaching_goals_status`

**RLS:** Public CRUD

---

## Analytics

### 30. **classroom_analytics**
Aggregated classroom analytics data.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `teacher_username` (text, FK, NOT NULL): Teacher
- `analytics_data` (jsonb, NOT NULL): Analytics payload
- `period_start` (date, NOT NULL): Period start date
- `period_end` (date, NOT NULL): Period end date
- `created_at` (timestamptz): Creation time

**RLS:** Teachers can manage

---

### 31. **analytics_error_logs**
Error logging for analytics functions.

**Columns:**
- `id` (uuid, PK): Unique identifier
- `function_name` (text, NOT NULL): Function that errored
- `error_message` (text, NOT NULL): Error message
- `error_details` (jsonb): Additional error details
- `parameters` (jsonb): Function parameters
- `created_at` (timestamptz): Error time

**RLS:** Admins can read

---

## Functions

### Authentication Functions

1. **handle_teacher_login(p_username, p_password, p_remember_me)**
   - Authenticates teacher login
   - Handles password hashing with bcrypt
   - Tracks failed login attempts
   - Locks account after 5 failed attempts
   - Returns success status and teacher info

2. **reset_teacher_password(p_username)**
   - Generates temporary password
   - Hashes and stores password
   - Unlocks account
   - Logs password reset
   - Returns temp password

3. **update_teacher_password(p_username, p_new_password, p_temp_password)**
   - Updates teacher password
   - Hashes new password with bcrypt
   - Updates temp password flag
   - Logs password change
   - Returns success status

4. **authenticate_college_mentor(p_email, p_password)**
   - Authenticates college mentor login
   - Similar to teacher login with account locking
   - Returns mentor info on success

5. **authenticate_coach(p_email, p_password)**
   - Authenticates coach login
   - Returns coach info on success

### Validation Functions

6. **verify_teacher_username(p_username)**
   - Validates teacher exists and is active
   - Returns boolean

7. **verify_teacher_status(p_username)**
   - Checks teacher account status
   - Returns boolean

### Lesson Plan Functions

8. **generate_ai_lesson_plan(p_grade_level, p_last_lesson, p_struggled_areas, p_teacher_username, p_student_id, p_exit_ticket_id)**
   - Generates personalized UDL lesson plan
   - Uses student struggle areas and quiz performance
   - Aligns to CA standards
   - Returns jsonb lesson plan structure

### Session Management Functions

9. **create_teacher_session(p_teacher_id, p_user_agent, p_ip_address)**
   - Creates authenticated session
   - Generates session token
   - Returns token

10. **validate_teacher_session(p_session_token, p_teacher_id)**
    - Validates session is active
    - Updates last activity
    - Returns boolean

11. **cleanup_expired_sessions()**
    - Removes expired sessions
    - Runs on schedule

### Analytics Functions

12. **get_system_analytics(p_district_id)**
    - Returns system-wide statistics
    - Filters by district if provided

13. **get_teacher_performance(p_district_id)**
    - Returns teacher performance metrics
    - Includes student improvement

14. **get_student_progress(p_district_id)**
    - Returns student progress data
    - Shows improvement over time

### Other Functions

15. **create_school_district(p_name, p_code)**
    - Creates new school district
    - Logs creation
    - Returns district_id

16. **update_teacher_district(p_username, p_district_id)**
    - Assigns teacher to district
    - Logs update

17. **log_analytics_error(...)**
    - Logs analytics function errors
    - Silent failure to prevent breaking main functions

---

## RLS Policies

All tables have Row Level Security enabled. Key policies:

### Teachers & Students
- Teachers can manage their own students
- Public read access for students
- Teachers can view/edit their own data

### Exit Tickets & Assessments
- Teachers manage their own exit tickets
- Public insert for anonymous submissions
- Teachers manage quiz attempts

### Lesson Plans
- Public access (for mentor/coach viewing)

### Quiz System
- Public read for templates
- Teachers manage templates by username
- Public insert for attempts

### Admin System
- Admins have full access
- Audit logs have public read
- Sessions restricted to owner

### College Mentor System
- Public view and manage policies
- Mentors can view assigned groups
- Teachers can manage their groups

### Coach System
- Public CRUD on most tables
- Coaches use custom auth (not Supabase Auth)

---

## Indexes

Total: 40+ indexes for performance

Key indexes include:
- Foreign key columns
- Lookup columns (username, email, student_id)
- Timestamp columns for sorting
- Composite indexes for common queries

---

## Triggers

Currently no triggers are defined in the migrations. Auto-update triggers for `updated_at` columns could be added.

---

## Notes

1. **Authentication**: Uses pgcrypto (bcrypt) for password hashing
2. **Multi-tenancy**: Teachers/districts provide data isolation
3. **RLS**: Extensive use of Row Level Security for data protection
4. **Search Path**: All functions use `SET search_path = public, extensions`
5. **Standards**: CA Common Core Math standards are pre-populated
6. **Lesson Plans**: UDL (Universal Design for Learning) framework
7. **Quiz System**: Flexible template-based system
8. **Mentor System**: College students tutoring K-12 students
9. **Coach System**: Instructional coaches supporting teachers

---

## Migration File Count

Total migrations: 100+ files
Date range: 2025-04-01 to 2026-02-06

---

## Reconstruction Script

The complete schema can be reconstructed using:
```bash
psql -U postgres -d your_database -f complete_schema_reconstruction.sql
```

This will create all tables, indexes, policies, and functions in the correct order.
