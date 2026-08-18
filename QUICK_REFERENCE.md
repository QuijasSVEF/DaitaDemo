# Database Schema Quick Reference

## Quick Stats
- **Total Tables**: 31
- **Total Functions**: 17+
- **Total Indexes**: 40+
- **Extensions**: 1 (pgcrypto)

## Table Categories

### Core Application (11 tables)
1. `teachers` - Teacher accounts
2. `students` - Student records
3. `exit_tickets` - Assessments
4. `lesson_plans` - Personalized lesson plans
5. `group_lesson_plans` - Group lesson plans
6. `weekly_groups` - Weekly student groupings
7. `quiz_templates` - Quiz templates
8. `quiz_questions` - Quiz questions
9. `quiz_attempts` - Quiz results
10. `ca_standards` - CA Math standards
11. `standards_alignments` - Student standard proficiency

### Admin System (7 tables)
12. `admin_users` - Admin accounts
13. `admin_sessions` - Admin sessions
14. `admin_audit_logs` - Audit trail
15. `teacher_accounts` - Legacy teacher accounts
16. `teacher_sessions` - Teacher sessions
17. `password_reset_requests` - Password resets
18. `school_districts` - School districts

### College Mentor System (6 tables)
19. `college_mentors` - College mentor accounts
20. `mentor_groups` - Mentor student groups
21. `mentor_group_assignments` - Mentor-to-group links
22. `mentor_group_students` - Students in groups
23. `mentor_sessions` - Tutoring sessions
24. `mentor_teacher_assignments` - Mentor-to-teacher links

### Coach System (5 tables)
25. `coaches` - Coach accounts
26. `coach_teacher_assignments` - Coach-to-teacher links
27. `coach_notes` - Coach notes
28. `coach_tags` - Coach tags
29. `coaching_goals` - Coaching goals

### Analytics (2 tables)
30. `classroom_analytics` - Analytics data
31. `analytics_error_logs` - Error logs

## Key Relationships

```
teachers (1) ----< (N) students
teachers (1) ----< (N) lesson_plans
teachers (1) ----< (N) exit_tickets
teachers (1) ----< (N) quiz_templates
teachers (1) ----< (N) quiz_attempts
teachers (N) >---- (1) school_districts

students (N) >---- (1) teachers
students (1) ----< (N) exit_tickets
students (1) ----< (N) lesson_plans

exit_tickets (1) ----< (1) lesson_plans

quiz_templates (1) ----< (N) quiz_questions
quiz_templates (1) ----< (N) quiz_attempts

ca_standards (1) ----< (N) standards_alignments

college_mentors (N) >----< (N) mentor_groups (via mentor_group_assignments)
mentor_groups (1) ----< (N) mentor_group_students
mentor_groups (1) ----< (N) mentor_sessions
college_mentors (N) >----< (N) teachers (via mentor_teacher_assignments)

coaches (N) >----< (N) teachers (via coach_teacher_assignments)
coaches (1) ----< (N) coach_notes
coaches (1) ----< (N) coach_tags
coaches (1) ----< (N) coaching_goals
```

## Critical Functions

### Authentication
- `handle_teacher_login(username, password, remember_me)` → jsonb
- `authenticate_college_mentor(email, password)` → TABLE(success, message, mentor)
- `authenticate_coach(email, password)` → json
- `reset_teacher_password(username)` → jsonb
- `update_teacher_password(username, new_password, temp_password)` → jsonb

### Lesson Generation
- `generate_ai_lesson_plan(grade_level, last_lesson, struggled_areas, teacher_username, student_id, exit_ticket_id)` → jsonb

### Validation
- `verify_teacher_username(username)` → boolean
- `verify_teacher_status(username)` → boolean

### Session Management
- `create_teacher_session(teacher_id, user_agent, ip_address)` → text
- `validate_teacher_session(session_token, teacher_id)` → boolean
- `cleanup_expired_sessions()` → void

## Common Queries

### Get all students for a teacher
```sql
SELECT * FROM students WHERE teacher_username = 'username';
```

### Get recent lesson plans
```sql
SELECT * FROM lesson_plans
WHERE teacher_username = 'username'
ORDER BY created_at DESC
LIMIT 10;
```

### Get student's quiz performance
```sql
SELECT qa.*, qt.title, qt.topic
FROM quiz_attempts qa
JOIN quiz_templates qt ON qa.template_id = qt.id
WHERE qa.student_id = 123
ORDER BY qa.completed_at DESC;
```

### Get mentor's assigned groups
```sql
SELECT mg.*
FROM mentor_groups mg
JOIN mentor_group_assignments mga ON mga.group_id = mg.id
WHERE mga.mentor_id = 'mentor-uuid';
```

### Get coach's assigned teachers
```sql
SELECT t.*
FROM teachers t
JOIN coach_teacher_assignments cta ON cta.teacher_username = t.username
WHERE cta.coach_id = 'coach-uuid';
```

## Security Notes

1. **All tables have RLS enabled**
2. **Password hashing**: Uses bcrypt via pgcrypto (crypt + gen_salt)
3. **Session tokens**: 64-character hex strings
4. **Account locking**: 5 failed login attempts
5. **Function security**: All use `SECURITY DEFINER` with `SET search_path = public, extensions`

## Data Types

### Common Patterns
- **IDs**: `uuid` with `gen_random_uuid()`
- **Timestamps**: `timestamptz` with `DEFAULT now()`
- **Arrays**: `text[]`, `integer[]`
- **JSON**: `jsonb` for structured data
- **Enums**: Implemented via CHECK constraints

### Lesson Plan Structure (jsonb)
```json
{
  "objective": "string",
  "engagement": ["string"],
  "representation": ["string"],
  "action_expression": ["string"],
  "wrapup": ["string"],
  "duration": 25,
  "dok_levels": {
    "engagement": 1,
    "representation": 2,
    "action_expression": 3,
    "wrapup": 2
  },
  "aligned_standards": [],
  "detailed_activities": {}
}
```

## File Locations

- **Schema Script**: `complete_schema_reconstruction.sql`
- **Full Documentation**: `SCHEMA_SUMMARY.md`
- **Quick Reference**: `QUICK_REFERENCE.md` (this file)
- **Migrations**: `supabase/migrations/` (100+ files)

## Restoration Steps

1. Create empty database
2. Run: `psql -U postgres -d dbname -f complete_schema_reconstruction.sql`
3. Verify tables: `\dt` in psql
4. Verify functions: `\df` in psql
5. Verify policies: `SELECT * FROM pg_policies;`

## Extensions Required

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

## Important Notes

1. **Teacher accounts exist in TWO tables**: `teachers` and `teacher_accounts` (legacy)
2. **Coaches use custom auth**, not Supabase Auth (hence public RLS policies)
3. **CA Standards are pre-populated** via large migration files
4. **UDL framework** used for lesson plans (Engagement, Representation, Action/Expression, Wrap-up)
5. **Quiz system is template-based** for reusability
6. **Mentor sessions track tutoring time** with resource usage
