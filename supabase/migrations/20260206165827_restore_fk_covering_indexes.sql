/*
  # Restore FK-covering indexes that were dropped as unused

  Two indexes were reported as unused but are needed to cover foreign key constraints.
  They may not show query usage but are important for FK enforcement performance
  (e.g., during cascading deletes or parent row updates).

  1. Restored Indexes
    - `idx_admin_audit_logs_admin_id` on `admin_audit_logs(admin_id)`
    - `idx_mentor_groups_teacher_username` on `mentor_groups(teacher_username)`
*/

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_mentor_groups_teacher_username ON mentor_groups(teacher_username);
