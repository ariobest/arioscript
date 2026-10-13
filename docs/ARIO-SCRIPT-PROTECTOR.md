# ARIO API

The new API is a Supabase Edge Function at:

`https://yxbzblbtzqioexszjjkc.supabase.co/functions/v1/ario-api`

## What it does

- Admin/moderator management uses the signed-in Supabase user's Bearer access token and checks `public.user_roles`.
- `GET` without query parameters lists scripts for staff only.
- `POST` creates a script and returns a one-time loader URL.
- `PATCH` enables/disables a script.
- `DELETE` revokes a script.
- Public script delivery requires the exact `id` and 64-character random `token` in the query string.
- Only a SHA-256 token hash is stored in `public.protected_scripts`.
- Source is returned as `text/plain` with caching disabled.

## Deploy it in Supabase

1. Open the Supabase project `yxbzblbtzqioexszjjkc`.
2. Go to **Edge Functions → ario-api → Editor**.
3. Replace the editor code with the contents of `supabase/functions/ario-api/index.ts` from this repository.
4. Deploy the function.
5. In the function settings, turn **Verify JWT** off for this function only. The endpoint performs its own checks: per-script tokens for public loader requests and Supabase session/role checks for management requests.
6. Make sure the function has the built-in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets available. Never put the service-role key in frontend code, public config, Lua, or GitHub.
7. Open the website's Admin → API Manager and create a harmless test script. Save the generated loadstring.

The GitHub/Lovable app deploy does not automatically deploy Supabase Edge Function code. The function itself must be deployed from Supabase.

## Database

This function uses the existing `public.protected_scripts` table defined by `supabase/migrations/20261010170000_protected_scripts.sql`. Do not drop or reset the database. The table must remain inaccessible to `anon` and `authenticated`; the function uses the server-side service-role key.

## Important limitation

A loader has to deliver executable Lua source to the client that runs it. Someone who can run the loader may be able to capture the returned source. Tokens control access and allow revocation; they do not provide unbreakable source secrecy. Keep valuable logic server-side when possible.
