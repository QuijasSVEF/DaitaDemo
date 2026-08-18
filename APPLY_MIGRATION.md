# How to Apply College Mentor System Migration

The database schema for the College Mentor Portal has been created but needs to be applied to your Supabase database. Credentials come from environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

## Option 1: Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard: https://app.supabase.com/project/<your-project-ref>
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of: `supabase/migrations/20251007190000_college_mentor_system.sql`
5. Paste into the SQL Editor
6. Click **Run** button
7. Wait for success message

## Option 2: Using the Supabase CLI

If you have the Supabase CLI installed and linked to your project:

```bash
npx supabase db push
```

## What This Migration Creates

### Tables:
- `college_mentors` - Mentor accounts
- `mentor_groups` - Student groups for tutoring
- `mentor_group_assignments` - Links mentors to groups
- `mentor_group_students` - Links students to groups
- `mentor_sessions` - Records tutoring sessions

### Security:
- Row Level Security (RLS) policies for all tables
- Authentication function: `authenticate_college_mentor()`

### Indexes:
- Performance indexes on all key columns

## Verify Migration Success

After running the migration, verify it worked:

1. In Supabase Dashboard, go to **Table Editor**
2. You should see the new tables: `college_mentors`, `mentor_groups`, etc.
3. Click on `college_mentors` to confirm the table structure

## Create Your First Mentor (Optional)

After migration, you can create a test mentor account using SQL:

```sql
INSERT INTO college_mentors (email, full_name, password_hash)
VALUES (
  'mentor@test.com',
  'Test Mentor',
  crypt('password123', gen_salt('bf'))
);
```

Then login with:
- Email: mentor@test.com
- Password: password123

## Troubleshooting

**Error: "relation already exists"**
- This is normal if tables already exist
- The migration uses `IF NOT EXISTS` so it's safe to re-run

**Error: "permission denied"**
- Make sure you're using a service role key or are logged in as project owner
- Check your Supabase project permissions

**Error: "function crypt does not exist"**
- Run: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
- This should already be enabled in your Supabase project

## Next Steps

Once the migration is applied successfully:

1. Login to Admin Portal
2. Go to "College Mentors" tab
3. Create mentor accounts
4. Mentors can login at the start page → "I'm a College Mentor"
