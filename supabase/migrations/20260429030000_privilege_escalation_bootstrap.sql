-- The original prevent_privilege_escalation() only allowed an admin caller
-- through, which also blocks direct SQL (the Supabase SQL Editor, migrations,
-- etc.) since auth.uid() is NULL there -- there's no app session to read a
-- JWT from. That blocks the project owner's own direct database access,
-- including promoting the very first admin. The trigger's actual job is to
-- stop an authenticated APP USER from escalating their own role/tier through
-- a client request, not to block direct database administration, so treat a
-- NULL auth.uid() (no app session at all) the same as an admin caller.
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Not authorized to change role';
  END IF;

  IF NEW.access_type IS DISTINCT FROM OLD.access_type THEN
    RAISE EXCEPTION 'Not authorized to change access tier';
  END IF;

  RETURN NEW;
END;
$$;
