/*
  # Fix function search paths to include extensions schema

  The previous migration set search_path = public on all functions,
  but pgcrypto (crypt, gen_salt, etc.) is installed in the extensions schema.
  Functions that use crypt() broke because they can no longer find it.

  This updates all public functions to include both public and extensions schemas.
*/

DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prokind = 'f'
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, extensions', func_record.proname, func_record.args);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not alter function %.%(%): %', 'public', func_record.proname, func_record.args, SQLERRM;
    END;
  END LOOP;
END $$;
