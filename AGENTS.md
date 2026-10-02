<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Decisions
- tsconfig relaxes exactOptionalPropertyTypes/noImplicitReturns/noUncheckedIndexedAccess: TanStack + Supabase generated types make the strictest flags impractical across the app.
- Script thumbnails live in a private "thumbnails" bucket and are referenced by long-lived signed URLs, because public buckets are blocked in this workspace.
- The first account that signs up is granted the admin role automatically; later signups are normal users.
- Profile images are uploaded only through an authenticated server function after AI review; no direct avatar bucket writes, because unsafe images must never be published before moderation.
- Site imagery uses the private site-media bucket with long-lived signed URLs, because public buckets are blocked.
- Script loader commands derive from an optional admin-managed HTTPS raw URL, never from fetched remote code, because remote file contents can change outside the site.
- Assistant model and Roblox UI library selection is validated inside the admin-only server function, because browser choices must not authorize arbitrary gateway models or prompts.
- UI sounds and background preferences remain local to each browser, because these are personal appearance choices rather than shared site settings.
