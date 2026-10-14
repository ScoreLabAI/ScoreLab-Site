-- Prevent users from escalating their own role or access tier
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if the caller is an admin
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Block changes to protected fields by non-admins
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Not authorized to change role';
  END IF;

  IF NEW.access_type IS DISTINCT FROM OLD.access_type THEN
    RAISE EXCEPTION 'Not authorized to change access tier';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_privilege_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_privilege_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_privilege_escalation();