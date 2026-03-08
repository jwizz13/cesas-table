# Cesa's Table — Meal Planning & Recipe Management App

> A PWA for the Sheibley family to manage recipes, plan weekly meals, generate shopping lists, and get schedule-aware cooking suggestions. Community features let users share recipes, upvote, review, and discover top-rated dishes. Potluck links bring in new users organically.

---

## Quick Context

Analisa (Jesse's wife) needs a recipe + meal planning app that works on MacBook and iPhone. The core value: **recipes that fit your schedule.** Some days she has time for a slow braise, other days she needs 20-minute dinners. The app learns the family's preferences, tracks what they've made recently, and suggests meals that fit available time windows.

The secondary value: **making it easy.** Easy to add recipes (paste a URL, share from Safari, print a PDF to Google Drive). Easy to plan (Sunday night session, fill the week, get one shopping list). Easy to shop (buyable quantities, grouped by store section, works offline in the grocery store).

The third value: **community.** Share recipes publicly, discover top-rated dishes from other users, read reviews from people who actually made the dish. The more people use it, the better it gets.

**Users:** Analisa (primary), Jesse, friends/family they invite, potluck guests (no account needed)
**Hosting:** GitHub Pages (push to `main` = deploy)
**Backend:** Supabase (PostgreSQL + RLS + Edge Functions)
**Auth:** Supabase email/password (invite-only for full access, no account needed for potluck participation)
**PWA:** Installable on iPhone + MacBook, offline-capable

---

## Three Planning Modes

### 1. Weekly Planning (day-to-day + holiday-aware)
Analisa's core workflow. Sunday night: enter time availability for the week, get suggestions, fill the planner, generate one shopping list, done. When a holiday week comes up (Thanksgiving, Christmas, Easter), the app automatically surfaces holiday recipes alongside regular suggestions. Holiday recipes are a first-class concept — tagged and filterable — but they live inside the same weekly planner. No separate "holiday mode" needed for routine holidays.

### 2. Group Events (trips, reunions, multi-day gatherings)
For planned multi-day events: Lake Tahoe trip, beach week, family reunion, Christmas week at the cabin. The organizer creates the event, invites collaborators (app users). Each person claims nights and picks recipes. Everyone sees the full menu. One aggregated shopping list + beverage section. Prep timeline for complex events (reverse-engineered from serve times). Shop before the trip.

### 3. Potluck (the growth engine)
The organizer creates a structure: "5 main courses, 10 appetizers, 5 desserts, 3 salads, drinks." Shares a link. **Anyone can participate — no account required.** Guests see what's been claimed, what course types are still available, and claim a slot by typing what they're bringing. No more "we have 12 pasta salads and no dessert."

App users get the full experience: pick from their saved recipes, see ratings, auto-populate details. Non-users just type a dish name and pick a course type — zero friction.

**The viral loop:** Every potluck guest sees the app in action. At the bottom: "Made with Cesa's Table — Plan your meals, build your recipe book, never wonder what's for dinner. Sign up free." They sign up, start adding recipes, host their own potluck, invite their friends. Organic growth from real utility.

Works for dinner parties too — host sets the structure, guests fill slots.

---

## Feature Set

### Phase 1: Foundation + Recipe Management (MVP)
**Goal:** Working app where Analisa can add recipes easily, browse/search them, and generate a shopping list.

1. **Recipe CRUD** — Add, edit, delete (soft-delete) recipes with rich metadata
2. **Three ways to add recipes:**
   - **Paste a URL** — App fetches the page, extracts Schema.org recipe data (structured data most recipe sites embed), auto-fills the form. Falls back to Claude Haiku extraction if no structured data found.
   - **Share from Safari/Chrome (iPhone)** — PWA registers as a Web Share Target. Browsing a recipe? Hit Share > "Cesa's Table" and the URL is captured and parsed automatically. Requires PWA to be installed (added to home screen).
   - **Type it in** — Manual entry form for family recipes, cookbook recipes, etc.
3. **Flexible categorization & search** — Filter/search by any combination of:
   - Cuisine (Italian, Mexican, Thai, American, etc.)
   - Meal type (dinner, lunch, breakfast, snack, appetizer, side, dessert)
   - Protein (chicken, beef, pork, fish, vegetarian, vegan)
   - Tags — pre-seeded + user-defined (quick, kid-friendly, date-night, camping, fancy/impress-friends, make-ahead, one-pot, grilling)
   - Holidays (Thanksgiving, Christmas, Easter, 4th of July, etc.)
   - Prep time, cook time, difficulty, cost
   - Who likes it (family member ratings)
4. **Shopping list per recipe** — Ingredients grouped by store section, with quantities in buyable increments
5. **Food exclusions** — Per-user "never include" list (e.g., Analisa: bell peppers). Warning badges on recipes that contain excluded ingredients.
6. **Auth + invite system** — Email/password login, invite-only signup (like HoldPoint), email notification to Jesse when someone new joins
7. **Settings** — Profile, food exclusions, notification preferences, invite friends

### Phase 2: Weekly Meal Planning + Aggregated Shopping
**Goal:** Analisa's Sunday night planning session — fill the week, generate one shopping list, done.

8. **Weekly meal planner** — Calendar-style grid (Mon-Sun). Add recipes to day/meal slots (breakfast, lunch, dinner, snack). Drag to rearrange. Holiday-aware: surfaces tagged holiday recipes during holiday weeks.
9. **Aggregated shopping list** — Combine ingredients across all planned meals for the week. Smart merging:
   - Same ingredient + compatible units = combined ("2 cups + 1 cup flour = 3 cups flour")
   - Same ingredient + incompatible units = both listed
   - **Buyable quantities** — Round up to real purchase sizes ("3.2 lbs chicken" -> "3.5 lbs chicken breast")
   - "Already have" toggle — mark pantry staples you don't need to buy
   - Grouped by store section (produce, dairy, meat, pantry, frozen, bakery, beverages)
   - **Works offline** — cached in localStorage, syncs when back online. Essential for grocery store.
10. **Cooking time calculator** — "If we want to eat at 6:30, when do we start?" Accounts for:
    - Active prep time
    - Passive time (marinating, rising — can overlap with other tasks)
    - Cook time (oven, stovetop)
    - Rest time (meat resting, cooling)
    - Buffer (5 min default — plating, table setting)
    - Example: "Eat at 6:30 PM -> Start prep at 4:45 PM (1h 45min total)"
11. **Cooking alerts** — Browser/PWA notification when it's time to start cooking (based on planned mealtime minus total time needed)

### Phase 3: Smart Suggestions + History
**Goal:** The app knows what you like, what you've made recently, and what fits your schedule.

12. **Weekly schedule input** — Analisa enters available prep/cooking time per day:
    - Quick presets: "busy" (30 min), "medium" (1 hr), "lots of time" (2+ hrs)
    - Or exact minutes: morning prep, afternoon cooking, evening cooking
    - Notes ("kids activities until 5", "working late")
13. **Smart suggestions** — For each unfilled day, recommend 3-5 recipes scored by:
    - **Time fit:** Does prep+cook fit the available windows? Can prep happen in morning and cook in evening?
    - **Recency:** When was it last made? Prefer variety.
    - **Ratings:** Higher-rated dishes rank higher (family ratings + community rating)
    - **Prep-ahead:** If morning time available but not evening, suggest prep-ahead dishes
    - **Diversity:** Don't suggest chicken 4 nights in a row. Mix cuisines.
    - Shows last-made date and family rating for each suggestion
14. **Cook log** — After making a dish, log: actual prep time, actual cook time, notes
15. **Family ratings with next-day reminder** —
    - The day after a cook_log entry, push a notification: "How was last night's Chicken Tikka Masala?"
    - Tap opens a quick rating screen: each family member's name with a horizontal **1-10 slider**
    - Family members configured once in profile settings (e.g., "Jesse", "Analisa", "Kids") — no re-entering each time
    - Takes 10 seconds, no typing required
    - If not rated, one gentle follow-up reminder. Then stop.
    - Ratings power the suggestion engine: "Jesse: 9, Analisa: 7, Kids: 4"
16. **Actual vs advertised time** — Track real times and show divergence ("Recipe says 30 min prep — you averaged 52 min")

### Phase 4: Group Events + Potluck
**Goal:** Collaborative meal planning for trips, holidays, and gatherings. Potluck as the growth engine.

17. **Group event planner** — Create a named multi-day event (e.g., "Lake Tahoe Aug 2026", "Christmas Week"):
    - Invite collaborators (app users)
    - Each person claims nights/meals and picks recipes
    - Full event menu visible to all collaborators
    - Aggregated shopping list for the entire event
    - Beverage planning: wine, cocktails, mixers, beer — adjustable, included in shopping list
18. **Prep timeline** — For big events: what to prep and when, reverse-engineered from serve times.
    - "Wednesday: brine turkey, make cranberry sauce"
    - "Thursday AM: prep stuffing, peel potatoes"
    - "Thursday 2PM: turkey in oven"
    - Assign prep tasks to specific people
    - Checkable progress
19. **Potluck mode** — Organizer creates a structure with course slots:
    - Define categories and quantities: "5 main courses, 10 appetizers, 5 desserts, 3 salads, drinks"
    - Generate a shareable link (no account required to participate)
    - Guests visit the link, see what's claimed and what's still available
    - **App users:** Pick from their saved recipes, full details auto-populated
    - **Non-users:** Type dish name, pick course type, optionally add details. Zero friction.
    - Live view: everyone sees the full menu and remaining open slots
    - Signup CTA for non-users: "Made with Cesa's Table — Sign up free"
    - Works for dinner parties too — host sets structure, guests fill slots

### Phase 5: Community + Recipe Book
**Goal:** Public recipe sharing, community ratings/reviews, discovery, and curated collections.

20. **Recipe visibility levels:**
    - **Private** (default) — Only you see it
    - **Shared** — Specific friends you choose can see it
    - **Public** — All app users can browse, upvote, and review it
21. **Upvotes** — One-tap thumbs up on public recipes. No downvotes (keeps it positive). Shows total count: "342 people saved this"
22. **Community reviews** — Written reviews with 1-5 star rating on public recipes (simpler scale than family's 1-10 — quick public feedback vs detailed family tracking):
    - "Made this for Thanksgiving, doubled the garlic, incredible."
    - **"Tried It" verified badge** — Users who logged the recipe in their cook_log get a verified badge on their review. Separates "looks good" upvotes from "I actually made this" reviews.
    - Review includes: star rating, text, optional photo, verified/unverified badge
23. **Community rankings** — Public recipes ranked by upvotes + review scores. Browse "Top Rated" filtered by:
    - Cuisine (Top Italian, Top Thai, Top Mexican...)
    - Meal type (Top Dinners, Top Appetizers, Top Desserts...)
    - Protein (Top Chicken, Top Vegetarian...)
    - Tags (Top Quick Meals, Top Camping Recipes, Top Date Night...)
    - Time period (All Time, This Month, This Week)
24. **Discovery — three recipe views:**
    - **My Recipes** — your personal collection (default view)
    - **Community** — public recipes from all users, sortable by: top rated, most saved, newest, trending
    - **Friends** — recipes shared with you by people you follow
25. **Save to My Recipes** — See a community recipe you like? One tap to save a copy to your collection. Now it's in your planner, your suggestions, your shopping lists. Original author credited.
26. **Recipe book** — Curated collections (e.g., "Weeknight Dinners", "Camping Recipes", "Holiday Classics"). Browsable, printable/exportable. Can include your own recipes + saved community recipes.
27. **Friend activity feed** — Opt-in: see what friends are cooking, their ratings, new recipes they've published, reviews they've written

### Phase 6: Google Drive Import
**Goal:** Print-to-folder recipe capture, like the bookkeeping automation.

28. **Google Drive folder watch** — Designate a Google Drive folder. Print a recipe webpage as PDF, save it there. Automation detects the new file.
29. **Recipe OCR/parser** — Claude Haiku extracts structured recipe data from:
    - PDFs (printed web pages, cookbook scans)
    - Images (photos of cookbook pages, handwritten recipe cards)
    - Text files
    - Parsed data creates a draft recipe for review/edit before saving

---

## Architecture

### Tech Stack
- **Frontend:** Vanilla JavaScript (no framework, no build step — edit, push, live)
- **Styling:** CSS with variables, mobile-first, iOS safe-area handling
- **Backend:** Supabase (PostgreSQL + Row-Level Security)
- **Auth:** Supabase email/password with invite system
- **Hosting:** GitHub Pages (push to `main` = deploy)
- **PWA:** Service worker (cache-first assets, network-only API), manifest, installable
- **Notifications:** Notification API (cooking alerts), email via Supabase Edge Function + Resend
- **Recipe parsing:** Schema.org JSON-LD extraction for URLs, Claude Haiku fallback
- **OCR (Phase 6):** Claude Haiku for recipe image/PDF parsing via Google Drive watcher

### File Structure
```
cesas-table/
  index.html              <- Single HTML file, all screens
  css/
    styles.css            <- CSS variables, mobile-first, iOS safe areas
  js/
    app.js                <- Application logic (auth, navigation, state, recipe CRUD)
    data.js               <- Unit conversions, store sections, cuisine/protein lists, presets
    recipe-parser.js      <- URL fetching + Schema.org extraction + Haiku fallback
  sw.js                   <- Service worker (cache-first assets, network API)
  manifest.json           <- PWA manifest (includes share_target)
  assets/
    icon-192.png
    icon-512.png
    apple-touch-icon.png
  supabase-schema.sql     <- Database schema
  supabase/
    functions/
      send-invite/index.ts       <- Invite emails via Resend
      signup-notify/index.ts     <- Email Jesse on new signups
      parse-recipe-url/index.ts  <- Server-side URL fetch + parse (avoids CORS)
  CLAUDE.md               <- This file
```

### Database Schema (Supabase)

```sql
-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  email text,
  display_name text,
  family_members text[],         -- ["Jesse", "Analisa", "Kids"] — used for rating sliders
  food_exclusions text[],        -- ["bell peppers", "cilantro"]
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Follow relationships (for friend activity feed + shared recipes)
CREATE TABLE follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES profiles ON DELETE CASCADE,
  following_id uuid REFERENCES profiles ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- ============================================================
-- RECIPES & INGREDIENTS
-- ============================================================

CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles,
  title text NOT NULL,
  description text,
  source_url text,                -- original URL if imported from web
  source_note text,               -- "Grandma's cookbook", "NYT Cooking", etc.
  forked_from uuid REFERENCES recipes, -- if saved from community, credit original
  cuisine text[],                 -- ["Italian", "Mexican"]
  meal_type text[],               -- ["dinner", "lunch", "breakfast", "snack", "appetizer", "side", "dessert"]
  protein text[],                 -- ["chicken", "beef", "vegetarian"]
  tags text[],                    -- ["quick", "camping", "fancy", "make-ahead", "one-pot"]
  holidays text[],                -- ["thanksgiving", "christmas", "easter"]
  prep_time_min int,              -- advertised prep time
  cook_time_min int,              -- advertised cook time
  rest_time_min int DEFAULT 0,    -- resting/cooling/marinating time
  passive_time_min int DEFAULT 0, -- time food cooks unattended (oven, slow cooker)
  actual_prep_min int,            -- real prep time (avg from cook_log)
  actual_cook_min int,            -- real cook time (avg from cook_log)
  prep_ahead boolean DEFAULT false, -- can prep the night/morning before?
  active_cook boolean DEFAULT true, -- requires active attention while cooking?
  estimated_cost text,            -- "$", "$$", "$$$"
  servings int,
  difficulty text,                -- "easy", "medium", "hard"
  visibility text DEFAULT 'private', -- "private", "shared", "public"
  is_deleted boolean DEFAULT false,  -- soft delete
  image_url text,
  instructions text,              -- step-by-step (markdown)
  notes text,
  last_cooked_at date,            -- denormalized for fast sorting
  avg_family_rating decimal,      -- denormalized: avg of family ratings (1-10 scale)
  upvote_count int DEFAULT 0,     -- denormalized: total community upvotes
  avg_community_rating decimal,   -- denormalized: avg of community reviews
  community_review_count int DEFAULT 0, -- denormalized: number of reviews
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes ON DELETE CASCADE,
  name text NOT NULL,
  quantity decimal,
  unit text,                      -- "cups", "tbsp", "lbs", "whole", "cloves"
  store_section text,             -- "produce", "dairy", "meat", "pantry", "frozen", "bakery", "beverages"
  optional boolean DEFAULT false,
  sort_order int,
  notes text                      -- "diced", "room temperature", "bone-in"
);

-- ============================================================
-- COMMUNITY: UPVOTES & REVIEWS
-- ============================================================

-- Upvotes (one per user per recipe)
CREATE TABLE upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes ON DELETE CASCADE,
  user_id uuid REFERENCES profiles ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(recipe_id, user_id)
);

-- Community reviews (written review + star rating on public recipes)
CREATE TABLE community_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes ON DELETE CASCADE,
  user_id uuid REFERENCES profiles ON DELETE CASCADE,
  rating int CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  photo_url text,                 -- optional photo of their version
  is_verified boolean DEFAULT false, -- true if user has this recipe in their cook_log
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- WEEKLY MEAL PLANNING
-- ============================================================

CREATE TABLE meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles,
  week_start date NOT NULL,       -- Monday of the planned week
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE meal_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES meal_plans ON DELETE CASCADE,
  recipe_id uuid REFERENCES recipes,
  day_of_week int,                -- 0=Mon ... 6=Sun
  meal_slot text,                 -- "breakfast", "lunch", "dinner", "snack"
  target_eat_time time,           -- "18:30"
  servings_override int,
  sort_order int
);

-- ============================================================
-- WEEKLY SCHEDULE (available cooking time)
-- ============================================================

CREATE TABLE weekly_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles,
  week_start date,
  day_of_week int,                -- 0=Mon ... 6=Sun
  morning_prep_min int DEFAULT 0,
  afternoon_cook_min int DEFAULT 0,
  evening_cook_min int DEFAULT 0,
  notes text
);

-- ============================================================
-- COOKING HISTORY & FAMILY RATINGS
-- ============================================================

CREATE TABLE cook_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes,
  user_id uuid REFERENCES profiles,
  cooked_date date NOT NULL,
  actual_prep_min int,
  actual_cook_min int,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Family ratings (private, per household member, tied to a cook_log entry)
-- Next-day notification prompts user to rate via 1-10 sliders per family member
CREATE TABLE family_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes,
  cook_log_id uuid REFERENCES cook_log,
  rater_name text NOT NULL,       -- "Jesse", "Analisa", "Kids" (from profile.family_members)
  rating int CHECK (rating >= 1 AND rating <= 10),  -- 1-10 scale via horizontal slider
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- GROUP EVENTS (trips, reunions, holiday gatherings)
-- ============================================================

CREATE TABLE event_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles,
  title text NOT NULL,            -- "Lake Tahoe Aug 2026", "Thanksgiving 2026"
  event_type text NOT NULL,       -- "group_trip", "potluck"
  start_date date NOT NULL,
  end_date date NOT NULL,
  description text,
  share_token text UNIQUE,        -- for shareable potluck links (no auth required)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE event_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES event_plans ON DELETE CASCADE,
  user_id uuid REFERENCES profiles,
  role text DEFAULT 'contributor', -- "owner", "contributor"
  created_at timestamptz DEFAULT now()
);

-- Group event meals (who's cooking what, which night)
CREATE TABLE event_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES event_plans ON DELETE CASCADE,
  recipe_id uuid REFERENCES recipes,
  plan_date date NOT NULL,
  meal_slot text,                 -- "breakfast", "lunch", "dinner", "snack", "appetizer", "dessert"
  assigned_to uuid REFERENCES profiles,
  target_eat_time time,
  servings_override int,
  sort_order int
);

-- Prep timeline for multi-day events
CREATE TABLE event_prep_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES event_plans ON DELETE CASCADE,
  recipe_id uuid REFERENCES recipes,
  description text NOT NULL,      -- "Brine turkey", "Make cranberry sauce"
  prep_date date NOT NULL,
  prep_time time,                 -- "09:00"
  duration_min int,
  assigned_to uuid REFERENCES profiles,
  completed boolean DEFAULT false,
  sort_order int
);

-- Beverage planning for events
CREATE TABLE event_beverages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES event_plans ON DELETE CASCADE,
  beverage_type text,             -- "red wine", "white wine", "beer", "cocktail", "mixer", "non-alcoholic"
  name text,                      -- "Pinot Noir", "Margarita mix"
  quantity text,                  -- "2 bottles", "1 case", "1 handle"
  notes text,
  sort_order int
);

-- ============================================================
-- POTLUCK (open participation, no account required)
-- ============================================================

-- Potluck course slots (organizer defines structure)
CREATE TABLE potluck_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES event_plans ON DELETE CASCADE,
  course_type text NOT NULL,      -- "main course", "appetizer", "dessert", "salad", "side", "drinks"
  max_count int NOT NULL,         -- how many of this course type (e.g., 5 mains)
  sort_order int
);

-- Potluck claims (guests claim slots — works with or without account)
CREATE TABLE potluck_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid REFERENCES potluck_slots ON DELETE CASCADE,
  event_id uuid REFERENCES event_plans ON DELETE CASCADE,
  -- Authenticated user (full experience)
  user_id uuid REFERENCES profiles,
  recipe_id uuid REFERENCES recipes,
  -- Non-authenticated guest (minimal info)
  guest_name text,                -- "Uncle Mike"
  guest_email text,               -- optional, for notifications
  dish_name text,                 -- "Famous BBQ Ribs"
  dish_description text,          -- "Slow-smoked St. Louis style, serves 8"
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- SHOPPING LISTS
-- ============================================================

CREATE TABLE shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles,
  plan_id uuid REFERENCES meal_plans,
  event_id uuid REFERENCES event_plans,
  title text,                     -- "Week of Mar 10" or "Lake Tahoe Trip"
  generated_at timestamptz DEFAULT now(),
  completed boolean DEFAULT false
);

CREATE TABLE shopping_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES shopping_lists ON DELETE CASCADE,
  ingredient_name text,
  total_quantity decimal,
  unit text,
  store_section text,
  checked boolean DEFAULT false,
  already_have boolean DEFAULT false, -- pantry staples user doesn't need to buy
  from_recipes text[],            -- which recipes need this ingredient
  sort_order int
);

-- ============================================================
-- SOCIAL: SHARING, COLLECTIONS, INVITES
-- ============================================================

CREATE TABLE app_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid REFERENCES profiles,
  invited_email text,
  status text DEFAULT 'pending',  -- pending, accepted, expired
  created_at timestamptz DEFAULT now()
);

CREATE TABLE recipe_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes,
  shared_by uuid REFERENCES profiles,
  shared_with uuid REFERENCES profiles,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles,
  title text NOT NULL,            -- "Weeknight Dinners", "Camping Recipes"
  description text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE collection_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES collections ON DELETE CASCADE,
  recipe_id uuid REFERENCES recipes,
  sort_order int
);
```

### Screens
1. **Login / Signup** — Email/password, invite-only (or via potluck CTA)
2. **Recipe List (Home)** — Three views: My Recipes, Community (public, ranked), Friends (shared with you). Searchable/filterable grid with cover images. Filter chips for cuisine, meal, protein, tags, holidays, time.
3. **Recipe Detail** — Full view: ingredients, instructions, family ratings, community rating + reviews, upvote count, last cooked, timing (advertised vs actual), notes. "Save to My Recipes" button on community recipes.
4. **Add/Edit Recipe** — URL paste (auto-fills via Schema.org), Safari share, manual entry, dynamic ingredient list, visibility toggle (private/shared/public)
5. **Weekly Planner** — Calendar grid, Mon-Sun. Tap a slot to browse/search recipes (own + saved community). Holiday-aware suggestions. Drag to rearrange.
6. **Shopping List** — Aggregated ingredients grouped by store section. Checkable. Buyable quantities. "Already have" toggle. Works offline.
7. **Schedule** — Weekly time availability input per day (presets or exact minutes)
8. **Suggestions** — Based on schedule + history + ratings + diversity. Shows reasoning. Can suggest top community recipes too.
9. **Group Event** — Create multi-day event. Invite collaborators. Claim nights. Full menu + shopping + beverages + prep timeline.
10. **Potluck** — Create structure (course slots). Share link. Live view of claims + open slots. No account required to participate.
11. **Recipe Book** — Collections view. Curated, browsable, printable. Mix of own + saved community recipes.
12. **Community Rankings** — Top rated recipes by cuisine, meal type, protein, tags. Filterable by time period (all time, this month, this week).
13. **Settings** — Profile, food exclusions, notification preferences, invite friends

### Navigation
Bottom tab bar (mobile) / sidebar (desktop):
- **Recipes** — My Recipes / Community / Friends (tab switcher at top)
- **Plan** — weekly planner + events + potlucks
- **Shop** — shopping list (weekly or event)
- **Profile** — settings, exclusions, collections, invites

---

## Recipe Import — Three Paths

### 1. Paste a URL (Phase 1)
```
User pastes URL -> Supabase Edge Function fetches page (avoids CORS)
  -> Extract Schema.org JSON-LD recipe data (90% of recipe sites have this)
  -> If no structured data: send HTML to Claude Haiku for extraction
  -> Return: title, ingredients, instructions, times, servings, image
  -> Pre-fill Add Recipe form -> User reviews/edits -> Save
```

### 2. Share from Safari (Phase 1)
PWA registers as a Web Share Target in `manifest.json`. User browses a recipe -> Share -> "Cesa's Table" -> App opens with URL pre-loaded -> Same parse flow as paste. Requires PWA installed (added to home screen).

### 3. Print PDF to Google Drive (Phase 6)
```
User prints webpage as PDF -> Saves to designated Google Drive folder
  -> Watcher detects new file (same pattern as tax inbox automation)
  -> Claude Haiku OCR/extracts recipe data from PDF
  -> Creates draft recipe in Supabase (status: "review")
  -> Notification: "New recipe imported — review and confirm"
  -> User opens app, reviews/edits, saves
```

---

## Design Decisions

### Ease of Use is Everything
The #1 design principle. If adding a recipe takes more than 30 seconds (for a URL) or 3 minutes (manual entry), we've failed. The UI should:
- Auto-fill everything possible from URLs
- Remember common values (default servings, preferred store sections)
- Make categorization fast (tap chips, not fill text fields)
- Never require fields that aren't essential (only title + ingredients are required)

### Two Rating Systems — Family vs Community
These serve different purposes and stay separate:
- **Family ratings** (Phase 3) — Private. 1-10 scale via slider, per household member ("Jesse: 9, Analisa: 7, Kids: 4"). Prompted via next-day notification after cooking. Family members configured once in profile. Powers the suggestion engine for YOUR family's preferences.
- **Community ratings** (Phase 5) — Public. 1-5 stars + written reviews on public recipes. Powers discovery and ranking for ALL users.

Both show on the recipe detail screen but are clearly distinct: "Your Family: 7.8 avg" vs "Community: 4.7 (128 reviews)"

### Next-Day Rating Reminder
The day after you log a cook_log entry, you get a push notification: "How was last night's Chicken Tikka Masala?" Tap it, and you get a quick screen showing each family member's name (pulled from your profile) with a horizontal 1-10 slider. Takes 10 seconds, no typing. If not rated, one gentle follow-up the next day. Then it stops — no nagging. This is how we build the rating dataset that makes suggestions actually useful.

### Verified "Tried It" Badge
Community reviews from users who have the recipe in their cook_log get a verified badge. This separates:
- "Looks delicious!" (unverified — maybe just upvote instead)
- "Made this last Tuesday, doubled the garlic, family loved it" (verified — actually cooked it)

Verified reviews carry more weight in ranking algorithms.

### Recipe Forking (Save to My Recipes)
When you save a community recipe, you get your own copy (a "fork"). You can modify it — adjust ingredients, change instructions, add notes — without affecting the original. The original author is credited via `forked_from`. This means:
- Your modifications don't change someone else's recipe
- You can customize saved recipes for your family (swap bell peppers, adjust spice levels)
- The original author sees how many people forked their recipe (social proof)

### Buyable Shopping Quantities
Nobody buys "0.33 cups of sour cream." The shopping list should round to buyable increments:
- Dairy: nearest container size (8oz, 16oz, 32oz)
- Produce: nearest whole unit or common weight (1 lb, 2 lbs)
- Meat: nearest half-pound
- Pantry staples: flag "you probably have this" vs "need to buy"
- "Already have" toggle to remove items from the buy list

### Tags are Flexible and User-Defined
Pre-seeded with common tags (quick, camping, fancy, make-ahead, one-pot, grilling, kid-friendly, date-night) but users can add any tag. Tags power the filter/search — the more tags, the better suggestions work.

### Holiday Recipes — First-Class but Not Separate
Holidays are a first-class field on recipes, not just a generic tag. A recipe marked "thanksgiving" surfaces automatically in:
- The holiday filter on the recipe list
- Weekly planner suggestions during Thanksgiving week
- Event planning when creating a Thanksgiving event

But holidays live INSIDE the weekly planner — no separate holiday mode. Thanksgiving week is just a week with holiday-tagged suggestions.

### Potluck — The Growth Engine
The potluck is the only feature that works without an account. This is intentional:
1. Organizer (account holder) creates the potluck structure
2. Shares a link — social media, group chat, email
3. Guests click, see the clean interface, claim a dish
4. Guests see: "Made with Cesa's Table" + signup CTA
5. Some sign up -> build their recipe book -> host their own potluck -> invite their friends
6. Organic growth from real utility, not ads or spam

### Suggestion Engine — Sunday Night Workflow
Analisa's weekly flow:
1. Open app -> Plan tab -> This week
2. Enter time availability per day (quick presets or exact minutes)
3. Tap "Suggest" on each empty day
4. See 3-5 recipes that fit, with: name, time, last made, family rating, cuisine
5. Can also browse top community recipes that fit the time window
6. Tap to add, or swipe for next suggestion
7. Once week is filled -> tap "Generate Shopping List"
8. Shopping list ready, grouped by store section, buyable quantities

### Offline-First for Shopping
The shopping list MUST work offline. Grocery stores have terrible signal.
- Cache active shopping list in localStorage
- Check/uncheck items offline, sync to Supabase when back online
- Visual indicator: "offline mode" badge

---

## Growth Strategy

```
Potluck link shared (social media, group chat, email)
    |
    v
Guest claims a dish (no account needed)
    |
    v
Sees the app in action + clean signup CTA
    |
    v
Signs up -> Adds recipes -> Makes some public
    |
    v
Community grows -> Better rankings -> More discovery value
    |
    v
Hosts their own potluck -> Shares link
    |
    v
New guests -> New signups -> More recipes -> Repeat
```

Two growth loops:
1. **Potluck viral loop** — Every gathering is a distribution event
2. **Community content loop** — More users = more public recipes = better rankings = more value for everyone = more users

---

## Key Differences from HoldPoint

| Aspect | HoldPoint | Cesa's Table |
|--------|-----------|-------------------|
| Data complexity | Simple (routines, sessions) | Complex (recipes, ingredients, plans, ratings, events, reviews) |
| Data ownership | Per-user only | Private + shared + public + community |
| Multi-user | Solo | Family, friends, community, anonymous potluck guests |
| Auth model | Invite-only | Invite-only + no-account potluck + community discovery |
| Content model | Fixed routines | User-generated + community-ranked |
| Offline needs | Timer must work offline | Shopping list + recipe browsing offline |
| External integrations | None | URL parsing, Google Drive import, cooking notifications |
| Growth model | Word of mouth only | Potluck viral loop + community content loop |
| Primary device | iPhone (during workout) | iPhone (cooking/shopping) + MacBook (planning) |

---

## Current State

**Last Updated:** Mar 7, 2026 (evening)
**Status:** Phase 1 MVP deployed and live.

**Live URL:** https://jwizz13.github.io/cesas-table/
**GitHub:** https://github.com/jwizz13/cesas-table
**Supabase Project ID:** pucavnfdebaipwklpoaa

### What's Working
- Auth (login/signup) — Jesse has an account and can log in
- Recipe CRUD — add, edit, soft-delete recipes with full metadata
- Search and filter chips (cuisine, meal type, protein) — stacked rows
- URL import with Schema.org JSON-LD extraction
- Custom tag creation in recipe form
- Settings (display name, food exclusions, family members, invite friends)
- Service worker caching (cache-first app shell, network-only Supabase API)
- PWA manifest with share target
- GitHub Pages deployment (push to main = deploy)

### What Was Done This Session
1. Built the entire Phase 1 app from scratch (HTML, CSS, JS, data, SW, manifest, Supabase schema)
2. Debugged and fixed: Supabase CDN naming conflict (`supabase` → `sb`), service worker caching stale files, Safari HTTPS issues, email confirmation redirect loop, toast class mismatch, search icon class mismatch, manifest icon filenames, GitHub Pages relative paths
3. Extensive CSS styling: mobile-first design with terracotta/sage palette, horizontal recipe cards, stacked filter chips, instruction step numbers hanging left, recipe detail layout with back arrow offset
4. Deployed to GitHub Pages, enabled Pages via API
5. Supabase Site URL + Redirect URLs configured for GitHub Pages

### Known Issues / Next Steps
- **Service worker caching is aggressive.** Users may need to unregister SW + clear caches to see updates. Consider switching to network-first for app shell during active development, or adding an update prompt.
- **Duplicate recipe** — Jesse added the same recipe twice during testing. Should delete the duplicate.
- **Email confirmation is OFF** for development. Must re-enable before sharing with others (Supabase → Authentication → Providers → Email → "Confirm email").
- **Supabase anon key is in source code.** This is normal for Supabase (RLS protects data), but worth noting. The key is: `eyJhbGci...07rs` (committed to public repo — this is the intended pattern per Supabase docs, RLS is the security layer).
- **Edge Functions not deployed yet:** `send-invite` and `signup-notify` (email notifications). Invites currently just create a DB record, no email sent.
- **No recipe-parser.js yet** — URL import uses inline Schema.org extraction in app.js. Claude Haiku fallback for sites without structured data is planned but not built.
- **Icons are solid-color placeholders** — need real app icons designed.
- **CSS class mismatch cleanup** — old `.recipe-card-image`, `.recipe-card-body` etc. rules in CSS are dead code (JS uses `.card-image`, `.card-body`). Should clean up.

### Design Decisions Made With Jesse
- Horizontal recipe cards (small 48px thumbnail left, text right) — not a grid
- Filter chips stacked vertically by category (cuisine, meal type, protein) with spacing
- + button in header row next to "My Recipes" (not a FAB)
- Instruction step numbers hang left of content with 40px offset and 16px gap
- Back arrow on detail screen hangs left of content block
- Meta items (Servings, Prep, etc.) are inline — "Servings 6" not stacked
- Meta labels same color as values (not muted)
- No image placeholder icons — just gradient blocks
- Recipe card titles use smaller font (font-sm, 13px)
- Tagline: "Meal planning for family and friends"

### BEFORE SHARING WITH OTHERS CHECKLIST
- [ ] Turn email confirmation back ON in Supabase (Authentication → Providers → Email → "Confirm email")
- [ ] Delete duplicate test recipe from database
- [x] Clean up dead CSS rules
- [ ] Generate proper app icons (not solid-color placeholders)
- [ ] Test full recipe CRUD flow end-to-end on live site
- [ ] Test on iPhone Safari (PWA install, auth, recipe add)

---

## Rules

1. **No build step.** Vanilla JS, CSS, HTML. Push to main = deploy.
2. **Supabase for all persistent data.** localStorage only for offline cache and session state.
3. **Mobile-first design.** iPhone is the primary cooking/shopping device.
4. **Invite-only auth** for full access. Potluck participation is the exception — no account required.
5. **iOS PWA patterns.** forceSaveAllState on lifecycle events, wake lock during cooking, careful localStorage.
6. **Ease of use above all.** If it's not easy, Analisa won't use it. Minimum friction for every action.
7. **Recipe data is sacred.** Soft-delete only. Never lose a recipe.
8. **Offline shopping.** Shopping list must work without signal.
9. **Potluck = growth.** Every potluck link is a signup funnel. Keep the non-user experience clean and appealing.
10. **Two rating systems.** Family ratings (private, 1-10 slider, next-day reminder, powers suggestions) and community ratings (public, 1-5 stars, powers rankings). Never mix them.
11. **Ratings should be effortless.** Next-day notification + slider UI = 10 seconds. If it takes longer, people won't do it and the suggestion engine has no data.

---

## Don't Waste Time On
- **Safari localhost testing** — Safari's HTTPS-Only mode blocks localhost HTTP. Use Chrome for local dev, or test on the live GitHub Pages URL.
- **Supabase CDN short URL** — Must use full UMD path `@supabase/supabase-js@2/dist/umd/supabase.min.js`. We downloaded it locally as `js/supabase.min.js` instead.
- **Naming the Supabase client `supabase`** — CDN creates a global `var supabase`. Our client MUST be named `sb`. This is documented in `supabase-templates`.
- **Service worker quick fixes** — When debugging CSS/JS changes not appearing, the SW is almost always the cause. Bump CACHE_NAME, or better: unregister SW + clear caches via DevTools console: `navigator.serviceWorker.getRegistrations().then(r => r.forEach(sw => sw.unregister())); caches.keys().then(k => k.forEach(c => caches.delete(c)));`

## Tech Debt & Known Issues
- ~~Dead CSS rules~~ — cleaned up (removed ~280 lines of unused rules: FAB, tab-bar-item, header/header-action, login-card, settings-item, toggle, toast-container, instruction-list, detail-tags, ingredient-checkbox, app-content/container)
- SW cache version is at v24 — consider resetting to v1 after stabilizing
- `allorigins.win` CORS proxy used for URL import — fragile, should be replaced with Supabase Edge Function

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-03-07 | 0.1.0 | Phase 1 MVP deployed. Auth, recipe CRUD, search/filter, URL import, settings. Live on GitHub Pages. |
| 2026-03-07 | 0.0.0 | Project plan created. CLAUDE.md written. |
