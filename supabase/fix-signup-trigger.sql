-- Fix signup: profile trigger + grants
-- Run this in Supabase SQL Editor if sign-up fails

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::public.user_role,
      'customer'::public.user_role
    )
  );

  IF COALESCE(NEW.raw_user_meta_data->>'role', 'customer') = 'driver' THEN
    INSERT INTO public.drivers (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'handle_new_user failed: % %', SQLERRM, NEW.raw_user_meta_data;
    RAISE;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Allow authenticated users to read their own profile immediately after signup
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);

-- Ensure function owner can insert regardless of RLS
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, service_role;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT INSERT, SELECT ON TABLE public.drivers TO postgres, service_role;
