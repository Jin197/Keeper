#!/usr/bin/env node
/**
 * Setup RLS test users inside Supabase and append their credentials to .env.local
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase renamed the backend key in 2026 (sb_secret_… / SUPABASE_SECRET_KEY).
// Accept either name so revoking the legacy service_role JWT does not break this.
const SVC = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SVC) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(URL, SVC, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const userA = {
  email: 'audit_user_a@velocewealth.local',
  password: 'AuditUserAPass123!'
};

const userB = {
  email: 'audit_user_b@velocewealth.local',
  password: 'AuditUserBPass123!'
};

async function getOrCreateUser(userData) {
  console.log(`Checking if user ${userData.email} exists...`);
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  const existing = users.find(u => u.email === userData.email);
  if (existing) {
    console.log(`User ${userData.email} already exists.`);
    return existing;
  }

  console.log(`Creating user ${userData.email}...`);
  const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true
  });

  if (createError) {
    throw new Error(`Failed to create user ${userData.email}: ${createError.message}`);
  }

  console.log(`User ${userData.email} created successfully.`);
  return user;
}

async function run() {
  try {
    const createdA = await getOrCreateUser(userA);
    const createdB = await getOrCreateUser(userB);

    // Read current .env.local
    const envPath = path.resolve(process.cwd(), '.env.local');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    const newVars = {
      SUPABASE_TEST_USER_A_EMAIL: userA.email,
      SUPABASE_TEST_USER_A_PASSWORD: userA.password,
      SUPABASE_TEST_USER_B_EMAIL: userB.email,
      SUPABASE_TEST_USER_B_PASSWORD: userB.password
    };

    let modifiedContent = envContent;
    let envUpdated = false;

    for (const [key, value] of Object.entries(newVars)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(modifiedContent)) {
        // If it exists but might be different, replace it or keep it (replace to be sure)
        modifiedContent = modifiedContent.replace(regex, `${key}=${value}`);
      } else {
        // Append
        modifiedContent += `\n${key}=${value}`;
      }
      envUpdated = true;
    }

    if (envUpdated) {
      fs.writeFileSync(envPath, modifiedContent, 'utf8');
      console.log('Successfully updated .env.local with test user credentials.');
    }

    console.log('Setup finished successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
}

run();
