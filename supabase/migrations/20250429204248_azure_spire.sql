/*
  # Fix Account Locking Function
  
  1. Changes
    - Add proper account locking function
    - Fix status update logic
    - Add audit logging
    
  2. Security
    - Track lock/unlock events
    - Maintain audit trail
*/

-- Function to update teacher account status and locking
CREATE OR REPLACE FUNCTION update_teacher_status(
  p_username TEXT,
  p_account_status TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_exists BOOLEAN;
  v_current_status TEXT;
BEGIN
  -- Check if teacher exists
  SELECT EXISTS (
    SELECT 1 FROM teachers WHERE username = p_username
  ) INTO v_teacher_exists;

  IF NOT v_teacher_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Teacher not found'
    );
  END IF;

  -- Get current status
  SELECT account_status 
  INTO v_current_status
  FROM teachers 
  WHERE username = p_username;

  -- Update account status and lock status
  UPDATE teachers
  SET 
    account_status = p_account_status,
    account_locked = CASE 
      WHEN p_account_status = 'locked' THEN true
      ELSE false
    END,
    -- Reset failed attempts when unlocking
    failed_login_attempts = CASE 
      WHEN p_account_status = 'active' THEN 0
      ELSE failed_login_attempts
    END
  WHERE username = p_username;

  -- Log the status change
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    CASE 
      WHEN p_account_status = 'locked' THEN 'lock_account'
      ELSE 'unlock_account'
    END,
    'teacher',
    p_username,
    jsonb_build_object(
      'timestamp', now(),
      'previous_status', v_current_status,
      'new_status', p_account_status
    ),
    inet_client_addr()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Account %s successfully', 
      CASE 
        WHEN p_account_status = 'locked' THEN 'locked'
        ELSE 'unlocked'
      END
    )
  );
END;
$$;