// ============================================================
// Cesa's Table — Main Application Logic
// ============================================================

const LOG = '[CT]';

// ── Supabase Config ─────────────────────────────────────────
const SUPABASE_URL = 'https://pucavnfdebaipwklpoaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Y2F2bmZkZWJhaXB3a2xwb2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTMwNjAsImV4cCI6MjA4ODQ4OTA2MH0.58yrYYexC8mdtRkzIWInk38tteQ_z8uNTC-ctNs07rs';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── App State ───────────────────────────────────────────────
let currentUser = null;
let userProfile = null;
let recipes = [];
let currentRecipe = null;    // recipe being viewed/edited
let editingRecipeId = null;  // null = adding new, uuid = editing existing
let activeFilters = { cuisine: [], meal_type: [], protein: [] };
let searchQuery = '';

// ── DOM References ──────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ── Initialization ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  console.log(`${LOG} App starting`);
  try {
    registerServiceWorker();
    bindEvents();
    await restoreSession();
    handleShareTarget();
  } catch (err) {
    console.error(`${LOG} Init error:`, err);
    // Make sure login screen is visible even if init fails
    showScreen('screen-login');
  }
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log(`${LOG} Service worker registered`))
      .catch(err => console.error(`${LOG} SW registration failed:`, err));
  }
}

// Check if app was opened via Web Share Target
function handleShareTarget() {
  const params = new URLSearchParams(window.location.search);
  const sharedUrl = params.get('shared_url') || params.get('url') || params.get('shared_text');
  if (sharedUrl && currentUser) {
    // Clean the URL from the address bar
    window.history.replaceState({}, '', window.location.pathname);
    showRecipeForm();
    $('#form-source-url').value = sharedUrl;
    showToast('URL received — tap Import to parse it');
  }
}

// ── Auth ────────────────────────────────────────────────────

async function restoreSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    currentUser = session.user;
    console.log(`${LOG} Session restored: ${currentUser.email}`);
    await onSignedIn();
  } else {
    console.log(`${LOG} No existing session`);
    // If coming from email confirmation link, Supabase adds tokens to the URL hash
    // Auto-detect and let onAuthStateChange handle it
    if (window.location.hash.includes('access_token')) {
      console.log(`${LOG} Email confirmation redirect detected`);
      // Supabase will fire SIGNED_IN via onAuthStateChange
    }
    showScreen('screen-login');
  }
}

sb.auth.onAuthStateChange(async (event, session) => {
  console.log(`${LOG} Auth event: ${event}`);
  if (event === 'SIGNED_IN' && session) {
    currentUser = session.user;
    // If this was triggered by email confirmation redirect, auto-login
    if (window.location.hash.includes('access_token')) {
      window.location.hash = '';
      await onSignedIn();
    }
  } else if (event === 'SIGNED_OUT') {
    currentUser = null;
    userProfile = null;
    recipes = [];
    showScreen('screen-login');
    $('#tab-bar').classList.add('hidden');
  }
});

async function handleAuth(e) {
  e.preventDefault();
  const email = $('#auth-email').value.trim();
  const password = $('#auth-password').value;
  const isSignup = $('#auth-submit-btn').textContent === 'Sign Up';
  const errorEl = $('#auth-error');
  errorEl.classList.add('hidden');

  try {
    if (isSignup) {
      const displayName = $('#auth-display-name').value.trim();
      console.log(`${LOG} Signing up: ${email}`);
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: displayName || email.split('@')[0] } }
      });
      if (error) throw error;
      showToast('Check your email to confirm your account');
    } else {
      console.log(`${LOG} Signing in: ${email}`);
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      currentUser = data.user;
      await onSignedIn();
    }
  } catch (err) {
    console.error(`${LOG} Auth error:`, err.message);
    errorEl.textContent = getAuthErrorMessage(err);
    errorEl.classList.remove('hidden');
  }
}

function toggleAuthMode() {
  const isLogin = $('#auth-submit-btn').textContent === 'Log In';
  if (isLogin) {
    $('#auth-submit-btn').textContent = 'Sign Up';
    $('#signup-fields').classList.remove('hidden');
    $('#auth-toggle-text').textContent = 'Already have an account?';
    $('#auth-toggle-btn').textContent = 'Log In';
  } else {
    $('#auth-submit-btn').textContent = 'Log In';
    $('#signup-fields').classList.add('hidden');
    $('#auth-toggle-text').textContent = "Don't have an account?";
    $('#auth-toggle-btn').textContent = 'Sign Up';
  }
  $('#auth-error').classList.add('hidden');
}

function getAuthErrorMessage(error) {
  const msg = error?.message || '';
  if (msg.includes('Invalid login credentials')) return 'Wrong email or password.';
  if (msg.includes('Email not confirmed')) return 'Check your email to confirm your account.';
  if (msg.includes('User already registered')) return 'An account with this email already exists.';
  if (msg.includes('Password should be')) return 'Password must be at least 6 characters.';
  if (msg.includes('rate limit')) return 'Too many attempts. Please wait a moment.';
  return msg || 'Something went wrong. Please try again.';
}

async function signOut() {
  console.log(`${LOG} Signing out`);
  await sb.auth.signOut();
}

// ── Post-Login Setup ────────────────────────────────────────

async function onSignedIn() {
  console.log(`${LOG} Signed in: ${currentUser.email}`);
  $('#tab-bar').classList.remove('hidden');
  await loadProfile();
  await loadRecipes();
  showScreen('screen-recipes');
}

async function loadProfile() {
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (error) {
    console.error(`${LOG} Profile load error:`, error.message);
    return;
  }
  userProfile = data;
  console.log(`${LOG} Profile loaded: ${userProfile.display_name}`);

  // Populate settings screen
  $('#settings-email').value = userProfile.email || currentUser.email;
  $('#settings-display-name').value = userProfile.display_name || '';
  renderExclusions();
  renderFamilyMembers();
}

// ── Navigation ──────────────────────────────────────────────

function showScreen(screenId) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  const screen = $(`#${screenId}`);
  if (screen) {
    screen.classList.add('active');
    screen.classList.remove('hidden');
  }

  // Update tab bar active state
  $$('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === screenId);
  });

}

function handleTabClick(e) {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  const screenId = btn.dataset.screen;
  if (screenId) showScreen(screenId);
}

// ── Recipes: Load & Render ──────────────────────────────────

async function loadRecipes() {
  console.log(`${LOG} Loading recipes...`);
  const { data, error } = await sb
    .from('recipes')
    .select('*')
    .eq('owner_id', currentUser.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`${LOG} Recipe load error:`, error.message);
    showToast('Failed to load recipes', 'error');
    return;
  }

  recipes = data || [];
  console.log(`${LOG} Loaded ${recipes.length} recipes`);
  renderRecipeGrid();
}

function renderRecipeGrid() {
  const grid = $('#recipe-grid');
  const empty = $('#recipes-empty');
  const filtered = getFilteredRecipes();

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  grid.innerHTML = filtered.map(recipe => `
    <div class="recipe-card" data-id="${recipe.id}">
      <div class="card-image">
        ${recipe.image_url
          ? `<img src="${escapeHtml(recipe.image_url)}" alt="${escapeHtml(recipe.title)}" loading="lazy">`
          : `<div class="image-placeholder"></div>`
        }
      </div>
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(recipe.title)}</h3>
        <div class="card-meta">
          ${recipe.prep_time_min || recipe.cook_time_min
            ? `<span>${formatTime(recipe.prep_time_min, recipe.cook_time_min)}</span>`
            : ''}
          ${recipe.difficulty ? `<span>${recipe.difficulty}</span>` : ''}
          ${recipe.estimated_cost ? `<span>${recipe.estimated_cost}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function getFilteredRecipes() {
  return recipes.filter(r => {
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const searchable = [r.title, r.description, ...(r.cuisine || []), ...(r.meal_type || []), ...(r.protein || []), ...(r.tags || [])].join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    // Chip filters
    if (activeFilters.cuisine.length && !activeFilters.cuisine.some(c => (r.cuisine || []).includes(c))) return false;
    if (activeFilters.meal_type.length && !activeFilters.meal_type.some(m => (r.meal_type || []).includes(m))) return false;
    if (activeFilters.protein.length && !activeFilters.protein.some(p => (r.protein || []).includes(p))) return false;
    return true;
  });
}

// ── Recipe Detail ───────────────────────────────────────────

async function showRecipeDetail(recipeId) {
  const recipe = recipes.find(r => r.id === recipeId);
  if (!recipe) return;
  currentRecipe = recipe;

  // Load ingredients
  const { data: ingredients } = await sb
    .from('ingredients')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('sort_order', { ascending: true });

  // Populate detail screen
  $('#detail-title').textContent = recipe.title;
  $('#detail-description').textContent = recipe.description || '';
  $('#detail-description').classList.toggle('hidden', !recipe.description);

  // Image
  const imgEl = $('#detail-image');
  if (recipe.image_url) {
    imgEl.innerHTML = `<img src="${escapeHtml(recipe.image_url)}" alt="${escapeHtml(recipe.title)}">`;
  } else {
    imgEl.innerHTML = '<div class="image-placeholder"></div>';
  }

  // Meta
  setMetaValue('#detail-prep-time', recipe.prep_time_min ? `${recipe.prep_time_min}m` : null);
  setMetaValue('#detail-cook-time', recipe.cook_time_min ? `${recipe.cook_time_min}m` : null);
  setMetaValue('#detail-servings', recipe.servings);
  setMetaValue('#detail-difficulty', recipe.difficulty);
  setMetaValue('#detail-cost', recipe.estimated_cost);

  // Tags
  const allTags = [...(recipe.cuisine || []), ...(recipe.meal_type || []), ...(recipe.protein || []), ...(recipe.tags || []), ...(recipe.holidays || [])];
  $('#detail-tags').innerHTML = allTags.map(t => `<span class="chip chip-sm">${escapeHtml(t)}</span>`).join('');

  // Source URL
  const sourceEl = $('#detail-source');
  if (recipe.source_url) {
    $('#detail-source-link').href = recipe.source_url;
    sourceEl.classList.remove('hidden');
  } else {
    sourceEl.classList.add('hidden');
  }

  // Ingredients
  const ingredientsList = $('#detail-ingredients');
  ingredientsList.innerHTML = (ingredients || []).map(ing => {
    const qty = ing.quantity ? `${ing.quantity} ` : '';
    const unit = ing.unit ? `${ing.unit} ` : '';
    const notes = ing.notes ? ` (${ing.notes})` : '';
    const optional = ing.optional ? ' <em>optional</em>' : '';
    return `<li class="ingredient-item">${qty}${unit}${escapeHtml(ing.name)}${notes}${optional}</li>`;
  }).join('');

  // Instructions
  const instructionsEl = $('#detail-instructions');
  if (recipe.instructions) {
    // Split by newlines to create numbered steps
    const steps = recipe.instructions.split('\n').filter(s => s.trim());
    instructionsEl.innerHTML = steps.map((step, i) => `<div class="instruction-step"><span class="step-number">${i + 1}</span><p class="step-text">${escapeHtml(step.trim())}</p></div>`).join('');
  } else {
    instructionsEl.innerHTML = '<p class="text-muted">No instructions added yet.</p>';
  }

  // Notes
  if (recipe.notes) {
    $('#detail-notes').textContent = recipe.notes;
    $('#detail-notes-section').classList.remove('hidden');
  } else {
    $('#detail-notes-section').classList.add('hidden');
  }

  // Check food exclusions
  checkExclusions(ingredients || []);

  showScreen('screen-recipe-detail');
}

function setMetaValue(selector, value) {
  const el = $(selector);
  const valueEl = el.querySelector('.meta-value');
  if (value) {
    valueEl.textContent = value;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

function checkExclusions(ingredients) {
  if (!userProfile?.food_exclusions?.length) return;
  const excluded = userProfile.food_exclusions.map(e => e.toLowerCase());
  const warnings = ingredients.filter(ing => excluded.some(ex => ing.name.toLowerCase().includes(ex)));
  if (warnings.length > 0) {
    showToast(`Warning: contains ${warnings.map(w => w.name).join(', ')}`, 'warning');
  }
}

// ── Recipe Form (Add/Edit) ──────────────────────────────────

function showRecipeForm(recipeId) {
  editingRecipeId = recipeId || null;
  const form = $('#recipe-form');
  form.reset();

  // Clear all chip selections
  $$('#recipe-form .chip').forEach(c => c.classList.remove('active'));

  // Clear ingredient list
  $('#ingredient-list').innerHTML = '';

  if (editingRecipeId) {
    $('#form-title').textContent = 'Edit Recipe';
    populateFormForEdit(editingRecipeId);
  } else {
    $('#form-title').textContent = 'Add Recipe';
    addIngredientRow(); // start with one empty row
  }

  showScreen('screen-recipe-form');
}

async function populateFormForEdit(recipeId) {
  const recipe = recipes.find(r => r.id === recipeId);
  if (!recipe) return;

  $('#form-source-url').value = recipe.source_url || '';
  $('#form-recipe-title').value = recipe.title;
  $('#form-description').value = recipe.description || '';
  $('#form-prep-time').value = recipe.prep_time_min || '';
  $('#form-cook-time').value = recipe.cook_time_min || '';
  $('#form-rest-time').value = recipe.rest_time_min || '';
  $('#form-servings').value = recipe.servings || '';
  $('#form-difficulty').value = recipe.difficulty || '';
  $('#form-cost').value = recipe.estimated_cost || '';
  $('#form-visibility').value = recipe.visibility || 'private';
  $('#form-instructions').value = recipe.instructions || '';
  $('#form-notes').value = recipe.notes || '';

  // Set chip selections
  setChips('#form-cuisine-chips', recipe.cuisine);
  setChips('#form-meal-type-chips', recipe.meal_type);
  setChips('#form-protein-chips', recipe.protein);
  setChips('#form-tag-chips', recipe.tags);
  setChips('#form-holiday-chips', recipe.holidays);

  // Load and populate ingredients
  const { data: ingredients } = await sb
    .from('ingredients')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('sort_order', { ascending: true });

  (ingredients || []).forEach(ing => {
    addIngredientRow(ing);
  });

  if (!ingredients?.length) addIngredientRow();
}

function setChips(containerSelector, values) {
  if (!values?.length) return;
  const container = $(containerSelector);
  container.querySelectorAll('.chip').forEach(chip => {
    chip.classList.toggle('active', values.includes(chip.dataset.value));
  });
}

function getSelectedChips(containerSelector) {
  return Array.from($$(containerSelector + ' .chip.active')).map(c => c.dataset.value);
}

// ── Ingredient Rows ─────────────────────────────────────────

function addIngredientRow(ingredient) {
  const template = $('#ingredient-row-template');
  const row = template.content.cloneNode(true);
  const rowEl = row.querySelector('.ingredient-row');

  if (ingredient) {
    rowEl.querySelector('.ingredient-name').value = ingredient.name || '';
    rowEl.querySelector('.ingredient-qty').value = ingredient.quantity || '';
    rowEl.querySelector('.ingredient-unit').value = ingredient.unit || '';
    rowEl.querySelector('.ingredient-section').value = ingredient.store_section || '';
    rowEl.querySelector('.ingredient-optional').checked = ingredient.optional || false;
    rowEl.querySelector('.ingredient-notes').value = ingredient.notes || '';
  }

  rowEl.querySelector('.btn-remove-ingredient').addEventListener('click', () => {
    rowEl.remove();
  });

  $('#ingredient-list').appendChild(row);
}

function addCustomTag() {
  const input = $('#form-custom-tag');
  const value = input.value.trim().toLowerCase().replace(/\s+/g, '-');
  if (!value) return;

  const container = $('#form-tag-chips');
  // Don't add if it already exists
  if (container.querySelector(`[data-value="${value}"]`)) {
    container.querySelector(`[data-value="${value}"]`).classList.add('active');
    input.value = '';
    return;
  }

  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip active';
  chip.dataset.value = value;
  chip.textContent = input.value.trim();
  chip.addEventListener('click', () => chip.classList.toggle('active'));
  container.appendChild(chip);
  input.value = '';
}

function collectIngredients() {
  const rows = $$('#ingredient-list .ingredient-row');
  const ingredients = [];
  rows.forEach((row, i) => {
    const name = row.querySelector('.ingredient-name').value.trim();
    if (!name) return;
    ingredients.push({
      name,
      quantity: parseFloat(row.querySelector('.ingredient-qty').value) || null,
      unit: row.querySelector('.ingredient-unit').value.trim() || null,
      store_section: row.querySelector('.ingredient-section').value || null,
      optional: row.querySelector('.ingredient-optional').checked,
      notes: row.querySelector('.ingredient-notes').value.trim() || null,
      sort_order: i
    });
  });
  return ingredients;
}

// ── Save Recipe ─────────────────────────────────────────────

async function saveRecipe() {
  const title = $('#form-recipe-title').value.trim();
  if (!title) {
    showToast('Recipe title is required', 'error');
    return;
  }

  const saveBtn = $('#form-save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  const recipeData = {
    owner_id: currentUser.id,
    title,
    description: $('#form-description').value.trim() || null,
    source_url: $('#form-source-url').value.trim() || null,
    cuisine: getSelectedChips('#form-cuisine-chips'),
    meal_type: getSelectedChips('#form-meal-type-chips'),
    protein: getSelectedChips('#form-protein-chips'),
    tags: getSelectedChips('#form-tag-chips'),
    holidays: getSelectedChips('#form-holiday-chips'),
    prep_time_min: parseInt($('#form-prep-time').value) || null,
    cook_time_min: parseInt($('#form-cook-time').value) || null,
    rest_time_min: parseInt($('#form-rest-time').value) || null,
    servings: parseInt($('#form-servings').value) || null,
    difficulty: $('#form-difficulty').value || null,
    estimated_cost: $('#form-cost').value || null,
    visibility: $('#form-visibility').value || 'private',
    instructions: $('#form-instructions').value.trim() || null,
    notes: $('#form-notes').value.trim() || null
  };

  const ingredients = collectIngredients();

  try {
    let recipeId;

    if (editingRecipeId) {
      // Update existing recipe
      console.log(`${LOG} Updating recipe: ${editingRecipeId}`);
      const { error } = await sb
        .from('recipes')
        .update(recipeData)
        .eq('id', editingRecipeId);
      if (error) throw error;
      recipeId = editingRecipeId;

      // Delete old ingredients and re-insert
      await sb.from('ingredients').delete().eq('recipe_id', recipeId);
    } else {
      // Insert new recipe
      console.log(`${LOG} Creating recipe: ${title}`);
      const { data, error } = await sb
        .from('recipes')
        .insert(recipeData)
        .select()
        .single();
      if (error) throw error;
      recipeId = data.id;
    }

    // Insert ingredients
    if (ingredients.length > 0) {
      const ingredientRows = ingredients.map(ing => ({ ...ing, recipe_id: recipeId }));
      const { error: ingError } = await sb.from('ingredients').insert(ingredientRows);
      if (ingError) throw ingError;
    }

    console.log(`${LOG} Recipe saved: ${recipeId}`);
    showToast(editingRecipeId ? 'Recipe updated' : 'Recipe added');

    await loadRecipes();
    showScreen('screen-recipes');
  } catch (err) {
    console.error(`${LOG} Save error:`, err.message);
    showToast('Failed to save recipe: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

// ── Delete Recipe ───────────────────────────────────────────

async function deleteRecipe() {
  if (!currentRecipe) return;
  if (!confirm(`Delete "${currentRecipe.title}"? This can be undone.`)) return;

  try {
    console.log(`${LOG} Soft-deleting recipe: ${currentRecipe.id}`);
    const { error } = await sb
      .from('recipes')
      .update({ is_deleted: true })
      .eq('id', currentRecipe.id);
    if (error) throw error;

    showToast('Recipe deleted');
    await loadRecipes();
    showScreen('screen-recipes');
  } catch (err) {
    console.error(`${LOG} Delete error:`, err.message);
    showToast('Failed to delete recipe', 'error');
  }
}

// ── Settings ────────────────────────────────────────────────

async function saveDisplayName() {
  const name = $('#settings-display-name').value.trim();
  if (!name) return;

  const { error } = await sb
    .from('profiles')
    .update({ display_name: name })
    .eq('id', currentUser.id);

  if (error) {
    showToast('Failed to save name', 'error');
  } else {
    userProfile.display_name = name;
    showToast('Name updated');
  }
}

async function addExclusion() {
  const input = $('#settings-exclusion-input');
  const value = input.value.trim().toLowerCase();
  if (!value) return;

  const exclusions = [...(userProfile.food_exclusions || []), value];
  const { error } = await sb
    .from('profiles')
    .update({ food_exclusions: exclusions })
    .eq('id', currentUser.id);

  if (error) {
    showToast('Failed to add exclusion', 'error');
  } else {
    userProfile.food_exclusions = exclusions;
    input.value = '';
    renderExclusions();
  }
}

async function removeExclusion(value) {
  const exclusions = (userProfile.food_exclusions || []).filter(e => e !== value);
  const { error } = await sb
    .from('profiles')
    .update({ food_exclusions: exclusions })
    .eq('id', currentUser.id);

  if (!error) {
    userProfile.food_exclusions = exclusions;
    renderExclusions();
  }
}

function renderExclusions() {
  const list = $('#exclusion-list');
  const exclusions = userProfile?.food_exclusions || [];
  list.innerHTML = exclusions.map(e => `
    <span class="tag">
      ${escapeHtml(e)}
      <button type="button" class="tag-remove" data-value="${escapeHtml(e)}" aria-label="Remove">&times;</button>
    </span>
  `).join('');

  list.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', () => removeExclusion(btn.dataset.value));
  });
}

async function addFamilyMember() {
  const input = $('#settings-family-input');
  const value = input.value.trim();
  if (!value) return;

  const members = [...(userProfile.family_members || []), value];
  const { error } = await sb
    .from('profiles')
    .update({ family_members: members })
    .eq('id', currentUser.id);

  if (error) {
    showToast('Failed to add family member', 'error');
  } else {
    userProfile.family_members = members;
    input.value = '';
    renderFamilyMembers();
  }
}

async function removeFamilyMember(value) {
  const members = (userProfile.family_members || []).filter(m => m !== value);
  const { error } = await sb
    .from('profiles')
    .update({ family_members: members })
    .eq('id', currentUser.id);

  if (!error) {
    userProfile.family_members = members;
    renderFamilyMembers();
  }
}

function renderFamilyMembers() {
  const list = $('#family-member-list');
  const members = userProfile?.family_members || [];
  list.innerHTML = members.map(m => `
    <span class="tag">
      ${escapeHtml(m)}
      <button type="button" class="tag-remove" data-value="${escapeHtml(m)}" aria-label="Remove">&times;</button>
    </span>
  `).join('');

  list.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFamilyMember(btn.dataset.value));
  });
}

async function sendInvite() {
  const input = $('#settings-invite-email');
  const email = input.value.trim();
  if (!email) return;

  const statusEl = $('#settings-invite-status');
  try {
    await sb.from('app_invites').insert({
      inviter_id: currentUser.id,
      invited_email: email,
      status: 'sent'
    });
    input.value = '';
    statusEl.textContent = `Invite sent to ${email}`;
    statusEl.classList.remove('hidden');
    showToast('Invite sent');
  } catch (err) {
    statusEl.textContent = 'Failed to send invite';
    statusEl.classList.remove('hidden');
  }
}

// ── Filter & Search ─────────────────────────────────────────

function handleFilterChip(e) {
  const chip = e.target.closest('.chip');
  if (!chip) return;

  // In recipe form, toggle selection
  const chipSelect = chip.closest('.chip-select');
  if (chipSelect) {
    chip.classList.toggle('active');
    return;
  }

  // In filter bar, toggle and re-render
  const group = chip.closest('.chip-group');
  if (!group) return;

  chip.classList.toggle('active');
  const filterType = group.dataset.filter;
  activeFilters[filterType] = Array.from(group.querySelectorAll('.chip.active')).map(c => c.dataset.value);
  renderRecipeGrid();
}

function handleSearch(e) {
  searchQuery = e.target.value.trim();
  renderRecipeGrid();
}

// ── URL Import ──────────────────────────────────────────────

async function importFromUrl() {
  const url = $('#form-source-url').value.trim();
  if (!url) {
    showToast('Enter a URL first', 'error');
    return;
  }

  const statusEl = $('#form-import-status');
  statusEl.textContent = 'Importing recipe...';
  statusEl.classList.remove('hidden');
  $('#form-import-url-btn').disabled = true;

  try {
    // Use a CORS proxy to fetch the page
    // In production, this would be a Supabase Edge Function
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Failed to fetch URL');
    const html = await response.text();

    // Try Schema.org JSON-LD extraction
    const recipe = extractSchemaOrg(html);
    if (recipe) {
      populateFormFromImport(recipe);
      statusEl.textContent = 'Recipe imported successfully!';
      showToast('Recipe data imported');
    } else {
      statusEl.textContent = 'Could not extract recipe data. Try entering manually.';
      showToast('No recipe data found at that URL', 'warning');
    }
  } catch (err) {
    console.error(`${LOG} Import error:`, err.message);
    statusEl.textContent = 'Import failed. Try entering the recipe manually.';
    showToast('Import failed', 'error');
  } finally {
    $('#form-import-url-btn').disabled = false;
  }
}

function extractSchemaOrg(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Look for JSON-LD script tags with Recipe schema
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      let data = JSON.parse(script.textContent);
      // Handle @graph arrays
      if (data['@graph']) data = data['@graph'];
      if (Array.isArray(data)) {
        const recipe = data.find(item => item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe')));
        if (recipe) return parseSchemaRecipe(recipe);
      } else if (data['@type'] === 'Recipe' || (Array.isArray(data['@type']) && data['@type'].includes('Recipe'))) {
        return parseSchemaRecipe(data);
      }
    } catch (e) { /* skip invalid JSON */ }
  }
  return null;
}

function parseSchemaRecipe(schema) {
  return {
    title: schema.name || '',
    description: schema.description || '',
    image_url: typeof schema.image === 'string' ? schema.image : schema.image?.url || (Array.isArray(schema.image) ? schema.image[0] : null),
    prep_time_min: parseDuration(schema.prepTime),
    cook_time_min: parseDuration(schema.cookTime),
    servings: parseInt(schema.recipeYield) || null,
    instructions: parseInstructions(schema.recipeInstructions),
    ingredients: parseIngredients(schema.recipeIngredient),
    cuisine: schema.recipeCuisine ? (Array.isArray(schema.recipeCuisine) ? schema.recipeCuisine : [schema.recipeCuisine]) : [],
    category: schema.recipeCategory ? (Array.isArray(schema.recipeCategory) ? schema.recipeCategory : [schema.recipeCategory]) : []
  };
}

function parseDuration(iso) {
  if (!iso) return null;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return null;
  return (parseInt(match[1] || 0) * 60) + parseInt(match[2] || 0);
}

function parseInstructions(instructions) {
  if (!instructions) return '';
  if (typeof instructions === 'string') return instructions;
  if (Array.isArray(instructions)) {
    return instructions.map(step => {
      if (typeof step === 'string') return step;
      return step.text || step.name || '';
    }).filter(Boolean).join('\n');
  }
  return '';
}

function parseIngredients(ingredients) {
  if (!ingredients || !Array.isArray(ingredients)) return [];
  return ingredients.map((ing, i) => {
    const raw = typeof ing === 'string' ? ing : ing.name || '';
    const parsed = parseIngredientString(raw);
    return { ...parsed, sort_order: i };
  });
}

// Parse "2 cups all-purpose flour" → { quantity: 2, unit: "cups", name: "all-purpose flour" }
function parseIngredientString(str) {
  const result = { name: str.trim(), quantity: null, unit: null, notes: null };
  if (!str) return result;

  // Extract parenthetical notes: "diced", "room temperature", etc.
  let text = str.trim();
  const notesMatch = text.match(/,\s*(.+)$/);
  if (notesMatch) {
    result.notes = notesMatch[1].trim();
    text = text.slice(0, notesMatch.index).trim();
  }

  // Known units (ordered longest first to match "fl oz" before "oz")
  const unitPatterns = [
    'tablespoons?', 'teaspoons?', 'fl oz', 'fluid ounces?',
    'pounds?', 'ounces?', 'cups?', 'quarts?', 'pints?', 'gallons?',
    'liters?', 'milliliters?', 'grams?', 'kilograms?',
    'tbsp', 'tsp', 'oz', 'lbs?', 'kg', 'ml', 'g',
    'cloves?', 'slices?', 'pieces?', 'bunche?s?', 'cans?',
    'packages?', 'pinch(?:es)?', 'dash(?:es)?', 'heads?', 'stalks?',
    'sprigs?', 'handfuls?', 'sticks?', 'whole', 'large', 'medium', 'small'
  ];
  const unitRegex = new RegExp(`^(${unitPatterns.join('|')})\\b\\s*`, 'i');

  // Match quantity at the start: whole numbers, decimals, fractions, mixed numbers
  // Handles: "2", "1.5", "1/2", "1 1/2", "½"
  const unicodeFractions = { '\u00BC': 0.25, '\u00BD': 0.5, '\u00BE': 0.75, '\u2153': 1/3, '\u2154': 2/3, '\u215B': 0.125, '\u215C': 0.375, '\u215D': 0.625, '\u215E': 0.875 };
  const qtyMatch = text.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*|[¼½¾⅓⅔⅛⅜⅝⅞])\s*/);

  if (qtyMatch) {
    const qtyStr = qtyMatch[1].trim();
    // Parse the quantity
    if (unicodeFractions[qtyStr]) {
      result.quantity = unicodeFractions[qtyStr];
    } else if (qtyStr.includes('/')) {
      // Handle "1 1/2" or "1/2"
      const parts = qtyStr.split(/\s+/);
      if (parts.length === 2) {
        const [num, den] = parts[1].split('/');
        result.quantity = parseInt(parts[0]) + parseInt(num) / parseInt(den);
      } else {
        const [num, den] = parts[0].split('/');
        result.quantity = parseInt(num) / parseInt(den);
      }
    } else {
      result.quantity = parseFloat(qtyStr);
    }

    text = text.slice(qtyMatch[0].length).trim();

    // Try to match a unit after the quantity
    // Also handle "(15 oz)" container patterns
    const containerMatch = text.match(/^\([\d.]+\s*(?:oz|ounce|fl oz)\)\s*/i);
    if (containerMatch) {
      // Keep container info in notes: "(15 oz)"
      result.notes = result.notes ? containerMatch[0].trim() + ', ' + result.notes : containerMatch[0].trim();
      text = text.slice(containerMatch[0].length).trim();
    }

    const unitMatch = text.match(unitRegex);
    if (unitMatch) {
      result.unit = normalizeUnit(unitMatch[1]);
      text = text.slice(unitMatch[0].length).trim();
      // Remove "of" after unit: "cups of flour" → "flour"
      text = text.replace(/^of\s+/i, '');
    }
  }

  result.name = text || result.name;
  return result;
}

function normalizeUnit(unit) {
  const u = unit.toLowerCase();
  const map = {
    'tablespoon': 'tbsp', 'tablespoons': 'tbsp',
    'teaspoon': 'tsp', 'teaspoons': 'tsp',
    'ounce': 'oz', 'ounces': 'oz', 'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz',
    'pound': 'lbs', 'pounds': 'lbs', 'lb': 'lbs',
    'cup': 'cups',
    'gram': 'grams', 'kilogram': 'kg', 'kilograms': 'kg',
    'milliliter': 'ml', 'milliliters': 'ml',
    'liter': 'liters',
    'clove': 'cloves', 'slice': 'slices', 'piece': 'pieces',
    'bunch': 'bunches', 'can': 'cans', 'package': 'packages',
    'pinch': 'pinch', 'pinches': 'pinch',
    'dash': 'dash', 'dashes': 'dash',
    'head': 'heads', 'stalk': 'stalks', 'sprig': 'sprigs',
    'handful': 'handfuls', 'stick': 'sticks',
  };
  return map[u] || u;
}

function populateFormFromImport(recipe) {
  if (recipe.title) $('#form-recipe-title').value = recipe.title;
  if (recipe.description) $('#form-description').value = recipe.description;
  if (recipe.prep_time_min) $('#form-prep-time').value = recipe.prep_time_min;
  if (recipe.cook_time_min) $('#form-cook-time').value = recipe.cook_time_min;
  if (recipe.servings) $('#form-servings').value = recipe.servings;
  if (recipe.instructions) $('#form-instructions').value = recipe.instructions;

  // Set cuisine chips if they match
  if (recipe.cuisine?.length) setChips('#form-cuisine-chips', recipe.cuisine.map(c => c.toLowerCase()));
  if (recipe.category?.length) setChips('#form-meal-type-chips', recipe.category.map(c => c.toLowerCase()));

  // Populate ingredients
  $('#ingredient-list').innerHTML = '';
  if (recipe.ingredients?.length) {
    recipe.ingredients.forEach(ing => addIngredientRow(ing));
  } else {
    addIngredientRow();
  }
}

// ── Toast Notifications ─────────────────────────────────────

function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = $('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('visible'));

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Utilities ───────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(prep, cook) {
  const total = (prep || 0) + (cook || 0);
  if (total === 0) return '';
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// ── Event Binding ───────────────────────────────────────────

function bindEvents() {
  // Auth
  $('#auth-form').addEventListener('submit', handleAuth);
  $('#auth-toggle-btn').addEventListener('click', toggleAuthMode);

  // Tab bar
  $('#tab-bar').addEventListener('click', handleTabClick);

  // Recipe list
  $('#recipe-search').addEventListener('input', handleSearch);
  $('#filter-chips').addEventListener('click', handleFilterChip);
  $('#header-add-recipe').addEventListener('click', () => showRecipeForm());
  $('#recipe-grid').addEventListener('click', (e) => {
    const card = e.target.closest('.recipe-card');
    if (card) showRecipeDetail(card.dataset.id);
  });

  // Recipe detail
  $('#detail-back-btn').addEventListener('click', () => showScreen('screen-recipes'));
  $('#detail-edit-btn').addEventListener('click', () => showRecipeForm(currentRecipe?.id));
  $('#detail-delete-btn').addEventListener('click', deleteRecipe);

  // Recipe form
  $('#form-cancel-btn').addEventListener('click', () => {
    if (editingRecipeId) {
      showRecipeDetail(editingRecipeId);
    } else {
      showScreen('screen-recipes');
    }
  });
  $('#form-save-btn').addEventListener('click', saveRecipe);
  $('#form-import-url-btn').addEventListener('click', importFromUrl);
  $('#add-ingredient-btn').addEventListener('click', () => addIngredientRow());

  // Chip selection in recipe form
  $$('.chip-select').forEach(container => {
    container.addEventListener('click', handleFilterChip);
  });

  // Settings
  $('#settings-save-name-btn').addEventListener('click', saveDisplayName);
  $('#settings-add-exclusion-btn').addEventListener('click', addExclusion);
  $('#settings-add-family-btn').addEventListener('click', addFamilyMember);
  $('#settings-invite-btn').addEventListener('click', sendInvite);
  $('#settings-signout-btn').addEventListener('click', signOut);

  // Custom tag
  $('#form-add-tag-btn').addEventListener('click', addCustomTag);
  $('#form-custom-tag').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } });

  // Enter key on settings inputs
  $('#settings-exclusion-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addExclusion(); } });
  $('#settings-family-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addFamilyMember(); } });
  $('#settings-invite-email').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendInvite(); } });
}
