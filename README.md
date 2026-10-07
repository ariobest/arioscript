# Ario Script Hub

Build a modern, premium dark website called "ARIO SCRIPTS".







IMPORTANT:



This is a script database website. Do NOT add user script submissions, developer submissions, public upload forms, or creator upload systems. Only admins can add and manage scripts.







DESIGN:



- Dark/black premium UI



- Midnight blue accents



- Glassmorphism cards



- Smooth animations



- Rounded cards



- Thin borders



- Soft shadows



- Modern responsive design



- Mobile-first



- Clean and simple



- Use Lucide icons



- Make it look like a professional script platform, NOT a generic Bootstrap website







PUBLIC WEBSITE:







Homepage:



- ARIO SCRIPTS branding



- Search bar



- Featured Scripts



- Trending Scripts



- Recently Added



- Most Downloaded



- Most Viewed



- Most Copied



- Popular Games



- Categories



- Website statistics



- Discord/YouTube/Telegram/social links



- Random Script button







Script cards should show:



- Thumbnail



- Script name



- Game



- Category



- Status



- Views



- Downloads



- Copies



- Favorites



- Badges



- Featured/Verified indicators







SCRIPT PAGES:



Each script gets:



- /scripts/[slug]



- Script name



- Game



- Category



- Description



- Thumbnail



- Tags



- Version



- Updated date



- Working status



- Views



- Downloads



- Copies



- Favorites



- YouTube showcase



- Lua code viewer



- Copy button



- Download .lua button



- Share button



- Favorite button



- Report button







CODE VIEWER:



- Beautiful terminal/macOS style



- Red/yellow/green dots



- "Lua" label



- Copy button



- Copied notification



- Preserve script code exactly



- Download as .lua







SEARCH:



Allow searching by:



- Script name



- Game



- Category



- Tags







Filters:



- Newest



- Most viewed



- Most downloaded



- Most copied



- Most favorited



- Featured



- Working







GAMES:



Create a games directory showing games and their scripts.







CATEGORIES:



Create categories such as:



- Combat



- Automation



- ESP



- Farming



- Teleport



- Utilities



- UI



- Misc







FAVORITES:



Users can favorite scripts and see their favorites.







USER SYSTEM:



Users can have accounts and profiles.







Show users with:



- Username



- Avatar



- Join date



- Favorite scripts



- Badges







BADGES:



Create a flexible badge system.



Users can have multiple custom badges.



Examples:



- Verified



- OG



- VIP



- Supporter



- Developer



- Moderator



- Admin



- Custom badges







Admins must be able to create completely custom badges with:



- Badge name



- Badge icon



- Badge color



- Badge description







Admins can give/remove any badge from any user.







LEADERBOARDS:



Create:



- Most viewed scripts



- Most downloaded



- Most copied



- Most favorited



- Popular users







REPORT SYSTEM:



Users can report scripts.



Admins can view and manage reports.







ADMIN PANEL:



Create a private /admin route.







When someone visits /admin, show an Admin Login page first.







Only authorized admins can access the Admin Panel.







After login, create a powerful dashboard with:







Dashboard:



- Total users



- Online users



- Total scripts



- Total views



- Total downloads



- Total copies



- Total favorites



- Total reports



- Recent activity



- Website statistics



- Charts/graphs







SCRIPT MANAGEMENT:



- Add script



- Edit script



- Delete script



- Archive script



- Publish/unpublish



- Feature/unfeature



- Verify/unverify



- Change status



- Change version



- Upload/change thumbnail



- Add YouTube showcase



- Manage categories



- Manage tags







ADD SCRIPT FORM:



- Script name



- Game name



- Description



- Category



- Tags



- Lua code



- Image upload



- YouTube URL



- Version



- Working status



- Featured toggle



- Verified toggle



- Download enabled toggle







USER MANAGEMENT:



Create a full Users page where admins can see users in a table.







Show:



- Avatar



- Username



- Email



- Join date



- Last active



- Online/offline status



- Number of favorites



- Badges



- Account status







Admin actions:



- View user



- Edit user



- Give badge



- Remove badge



- Ban user



- Unban user



- Disable account



- Enable account



- Change role







USER PROFILE ADMIN VIEW:



When admin opens a user:



- Profile information



- Activity



- Favorites



- Reports



- Badges



- Login/activity history



- Account status



- Admin actions







ROLES:



- User



- Moderator



- Admin







BADGE MANAGEMENT:



Create an entire Admin > Badges section.







Admins can:



- Create badge



- Edit badge



- Delete badge



- Give badge to users



- Remove badge



- Search users



- See which users have each badge







REPORT MANAGEMENT:



Admin can:



- View reports



- Open report



- See reported script



- See reporting user



- Resolve report



- Dismiss report



- Remove/archive reported script







ADMIN LOGS:



Log important admin actions:



- Added script



- Edited script



- Deleted script



- Banned user



- Gave badge



- Removed badge



- Changed settings



- Changed roles







SITE SETTINGS:



Admin can change:



- Site name



- Description



- Logo



- Favicon



- Discord URL



- YouTube URL



- Telegram URL



- Support URL



- Maintenance mode



- Registration enabled/disabled



- Default accent color







ANALYTICS:



Show:



- Views over time



- Downloads over time



- Copies over time



- New users



- Popular scripts



- Popular games



- Popular categories







ANNOUNCEMENTS:



Admin can create/delete announcements displayed on the homepage.







IMPORTANT SECURITY:



- Protect /admin with real authentication



- Never expose admin credentials in frontend code



- Use secure server-side authentication



- Users must NOT be able to access admin functions



- Use proper database permissions/RLS if using Supabase



- Validate all admin actions server-side







DATABASE:



Create all required database tables and relationships for:



- users/profiles



- scripts



- categories



- favorites



- reports



- badges



- user_badges



- admin_logs



- announcements



- site_settings



- script statistics







Make everything fully functional, not just visual mockups.







The final website should feel like a real production-ready ARIO SCRIPTS platform with a powerful admin system while keeping the public website simple and clean add 30 themes.



IMPORTANT: ALL STATISTICS MUST BE REAL AND CONNECTED TO SUPABASE.







Do NOT use fake, hardcoded, randomly generated, or placeholder statistics.







Use Supabase PostgreSQL as the real database and create all required tables automatically.







SUPABASE DATABASE TABLES:







1. profiles



- id



- username



- email



- avatar_url



- role



- is_banned



- is_online



- last_seen



- created_at







2. scripts



- id



- name



- slug



- game_name



- description



- category_id



- code



- image_url



- youtube_url



- version



- status



- featured



- verified



- downloads



- copies



- views



- created_at



- updated_at







3. categories



- id



- name



- slug



- description



- created_at







4. favorites



- id



- user_id



- script_id



- created_at







5. reports



- id



- user_id



- script_id



- reason



- description



- status



- created_at



- resolved_at







6. badges



- id



- name



- description



- icon



- color



- created_at







7. user_badges



- id



- user_id



- badge_id



- assigned_by



- created_at







8. admin_logs



- id



- admin_id



- action



- target_type



- target_id



- details



- created_at







9. announcements



- id



- title



- content



- active



- created_at







10. site_settings



- id



- site_name



- description



- logo_url



- favicon_url



- discord_url



- youtube_url



- telegram_url



- support_url



- maintenance_mode



- registration_enabled



- updated_at







11. script_events



Use this table for REAL analytics.







Fields:



- id



- script_id



- event_type



- user_id



- session_id



- created_at







event_type values:



- view



- copy



- download



- favorite



- share







REAL STATISTICS:







Every time somebody opens a script:



→ record a "view" event in script_events.







Every time somebody presses Copy:



→ record a "copy" event.







Every time somebody downloads:



→ record a "download" event.







Every time somebody favorites:



→ record a "favorite" event.







Every time somebody shares:



→ record a "share" event.







Do NOT simply increment fake numbers on the frontend.







Use Supabase database queries/functions to calculate real statistics.







PUBLIC SCRIPT STATISTICS:



Display:



- Real views



- Real copies



- Real downloads



- Real favorites



- Real shares







HOMEPAGE STATISTICS:



Calculate from Supabase:



- Total scripts



- Total users



- Total views



- Total copies



- Total downloads



- Total favorites







TRENDING:



Calculate trending scripts using recent real events.







MOST VIEWED:



Sort scripts using real view events.







MOST DOWNLOADED:



Sort using real download events.







MOST COPIED:



Sort using real copy events.







MOST FAVORITED:



Sort using real favorites.







ADMIN ANALYTICS:



Create a real analytics dashboard using Supabase data.







Show:



- Total users



- Total scripts



- Total views



- Total copies



- Total downloads



- Total favorites



- Total reports







Charts:



- Views over time



- Downloads over time



- Copies over time



- New users over time



- New scripts over time







Allow:



- Last 24 hours



- Last 7 days



- Last 30 days



- Last 90 days



- All time







SCRIPT ANALYTICS:



When admin opens a script in the Admin Panel, show:



- Total views



- Total copies



- Total downloads



- Total favorites



- Total shares



- Views today



- Views this week



- Views this month







USER ANALYTICS:



Show:



- Total users



- New users today



- New users this week



- New users this month



- Active users



- Banned users







ONLINE USERS:



Use last_seen/activity data to determine online users.







For example:



A user is considered online if their last activity was within the last 5 minutes.







Do not display fake online users.







SECURITY:



Use Supabase Row Level Security.







Normal users can:



- View published scripts



- Favorite scripts



- Report scripts



- Update their own profile







Admins can:



- Add/edit/delete scripts



- Manage users



- Manage badges



- Manage reports



- Manage categories



- Manage announcements



- Change site settings



- View analytics



- View admin logs







IMPORTANT:



Create the Supabase SQL schema, relationships, indexes, RLS policies, and required database functions.







Use secure database functions/RPC where appropriate for:



- Recording script events



- Incrementing statistics



- Preventing duplicate events where necessary



- Calculating analytics







Do not expose service-role keys in frontend code.







The website must read and write the actual Supabase database.







When I add a script from /admin, it must actually appear on the public website.







When a user views/copies/downloads/favorites a script, the real database statistics must update.







When I open /admin, the dashboard must show the actual current database statistics.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://arioscript.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e0c70c83-40aa-45ef-90c0-c486a1866eb9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
