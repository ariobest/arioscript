# ARIO Script Protector

This repo uses TanStack Start, not a plain Netlify Functions project. The protector should be deployed as a server endpoint and must never put a Supabase service-role key in browser code.

## What this protects

- Public script pages can display an empty/locked view rather than the Lua source.
- Loader URLs can request a script by an opaque ID.
- Server-side authorization can check a per-script token and optional ARIO key validation before returning source.
- Admins can rotate/revoke tokens and disable a script.
- Add rate limits and audit events at the server boundary.

## Important limitation

A loader must receive executable Lua source (or bytecode/payload) to execute it. Anyone who can run that loader can generally capture the returned source. Hiding source in a browser tab is only deterrence, not real DRM. Do not claim that obfuscation makes a script impossible to copy. For stronger protection, keep valuable logic server-side and expose only a narrow authenticated API.

## Required server-only environment

Configure these in the hosting provider's server environment (never as `VITE_*` variables):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not change or remove existing `.env` or `.gitignore` files for this feature.

## Suggested rollout

1. Store protected source in a private table, not a public bucket or public table.
2. Create a random, revocable token per protected script. Store only a cryptographic hash of the token.
3. Make the server endpoint return an empty response for a normal browser visit without a valid token; return Lua as `text/plain` only after server-side checks.
4. Validate any ARIO key server-side. Do not trust a client-provided `valid: true` flag.
5. Add per-token rate limits, expiry/revocation, and access logs.
6. Test the endpoint from a Roblox-compatible HTTP client and a normal browser before publishing loadstrings.

A response that is blank in a browser but returns source to a loader is not secure by itself if both requests use the same public URL. Token validation and server-side authorization are essential.
