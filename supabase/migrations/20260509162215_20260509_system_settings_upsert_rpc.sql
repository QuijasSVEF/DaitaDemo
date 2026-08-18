/*
  # System Settings Upsert RPC

  1. New Functions
    - `set_system_setting(p_key text, p_value text)` — upserts a row in system_settings.

  2. Security
    - Function runs as SECURITY DEFINER so admin portal (which uses anon key + custom auth) can write.
    - Intended to be called only from the admin portal; the admin portal already validates the admin session before calling this function.
*/

CREATE OR REPLACE FUNCTION public.set_system_setting(p_key text, p_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
BEGIN
  INSERT INTO public.system_settings (key, value, updated_at)
  VALUES (p_key, p_value, now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_system_setting(text, text) TO anon, authenticated;
