/*
# Fix group_lesson_plans unique_id default

The `unique_id` column is NOT NULL but has no default. The app code doesn't provide
this value on insert. Adding a default that generates a UUID text value so inserts
succeed without client-side changes.

1. Modified Tables
  - group_lesson_plans: Set default for `unique_id` to gen_random_uuid()::text
*/

ALTER TABLE group_lesson_plans ALTER COLUMN unique_id SET DEFAULT gen_random_uuid()::text;
