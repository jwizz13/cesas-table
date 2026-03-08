-- ============================================================
-- Cesa's Table — Phase 1 Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor → New Query)
-- ============================================================

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text,
  display_name text,
  family_members text[],         -- ["Jesse", "Analisa", "Kids"] for rating sliders
  food_exclusions text[],        -- ["bell peppers", "cilantro"]
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (for the auto-trigger)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 3. AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. RECIPES
-- ============================================================

CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  source_url text,
  source_note text,
  forked_from uuid REFERENCES recipes,
  cuisine text[],
  meal_type text[],
  protein text[],
  tags text[],
  holidays text[],
  prep_time_min int,
  cook_time_min int,
  rest_time_min int DEFAULT 0,
  passive_time_min int DEFAULT 0,
  actual_prep_min int,
  actual_cook_min int,
  prep_ahead boolean DEFAULT false,
  active_cook boolean DEFAULT true,
  estimated_cost text,
  servings int,
  difficulty text,
  visibility text DEFAULT 'private',
  is_deleted boolean DEFAULT false,
  image_url text,
  instructions text,
  notes text,
  last_cooked_at date,
  avg_family_rating decimal,
  upvote_count int DEFAULT 0,
  avg_community_rating decimal,
  community_review_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Owner can do everything with their own recipes
CREATE POLICY "Users can CRUD own recipes"
  ON recipes FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Anyone can read public recipes (non-deleted)
CREATE POLICY "Public recipes are readable"
  ON recipes FOR SELECT
  USING (visibility = 'public' AND is_deleted = false);

CREATE TRIGGER set_updated_at_recipes
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. INGREDIENTS
-- ============================================================

CREATE TABLE ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes ON DELETE CASCADE,
  name text NOT NULL,
  quantity decimal,
  unit text,
  store_section text,
  optional boolean DEFAULT false,
  sort_order int,
  notes text
);

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

-- Ingredients follow the recipe's access: owner can CRUD
CREATE POLICY "Users can CRUD ingredients on own recipes"
  ON ingredients FOR ALL
  USING (
    recipe_id IN (SELECT id FROM recipes WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    recipe_id IN (SELECT id FROM recipes WHERE owner_id = auth.uid())
  );

-- Ingredients on public recipes are readable
CREATE POLICY "Public recipe ingredients are readable"
  ON ingredients FOR SELECT
  USING (
    recipe_id IN (SELECT id FROM recipes WHERE visibility = 'public' AND is_deleted = false)
  );

-- ============================================================
-- 6. APP INVITES
-- ============================================================

CREATE TABLE app_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid REFERENCES profiles ON DELETE CASCADE,
  invited_email text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own invites"
  ON app_invites FOR SELECT
  USING (auth.uid() = inviter_id);

CREATE POLICY "Users can create invites"
  ON app_invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

-- ============================================================
-- 7. INDEXES
-- ============================================================

CREATE INDEX idx_recipes_owner ON recipes(owner_id);
CREATE INDEX idx_recipes_visibility ON recipes(visibility) WHERE is_deleted = false;
CREATE INDEX idx_recipes_created ON recipes(created_at DESC);
CREATE INDEX idx_ingredients_recipe ON ingredients(recipe_id);
CREATE INDEX idx_invites_email ON app_invites(invited_email);
