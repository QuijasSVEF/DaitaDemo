# Apply Mentor-Teacher Assignments Migration

A new database table is needed to support assigning mentors directly to teachers. Credentials come from environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

## Steps to Apply

### Option 1: Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard: https://app.supabase.com/project/<your-project-ref>
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of: `supabase/migrations/20251007200000_add_mentor_teacher_assignments.sql`
5. Paste into the SQL Editor
6. Click **Run** button
7. Wait for success message

### Option 2: Using Supabase CLI

```bash
npx supabase db push
```

## What This Migration Creates

### New Table: `mentor_teacher_assignments`

This table links college mentors directly to teachers:
- `id` (uuid, primary key)
- `mentor_id` (uuid, references college_mentors)
- `teacher_username` (text, references teachers)
- `assigned_by` (text, default 'admin')
- `assigned_at` (timestamptz)
- `status` (text, 'active' or 'inactive')
- `notes` (text, optional)

### New Workflow

**Before:** Admin assigns mentor → specific group
**Now:** Admin assigns mentor → teacher, then teacher assigns mentor → groups in their portal

### Security

- Row Level Security enabled
- Policies allow authenticated users to manage assignments
- Unique constraint prevents duplicate mentor-teacher pairs

## Verification

After running the migration, verify in Supabase:

1. Go to **Table Editor**
2. Look for `mentor_teacher_assignments` table
3. Confirm columns match the schema above

## Next Steps

Once applied:
1. Admin can assign mentors to teachers
2. Teachers will see their assigned mentors in their portal
3. Teachers manage which groups the mentors work with
