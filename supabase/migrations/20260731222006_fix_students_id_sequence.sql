/*
# Fix students identity sequence

Resets the students.id identity sequence to start past existing data (max id = 40).
This ensures new student registrations get IDs that don't conflict with existing records.

1. Modified Tables
  - students: Reset identity sequence to 100 to avoid PK conflicts
*/

SELECT setval(pg_get_serial_sequence('students', 'id'), 100, true);
