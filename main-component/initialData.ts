import * as bcrypt from 'bcryptjs';

/**
 * Test User Data
 * 
 * Generated test users for development and testing purposes.
 * Passwords are hashed using bcryptjs with salt rounds = 10 (matching auth integration).
 * 
 * Plain-text passwords (for testing):
 * - alice: password123
 * - bob: bobsecure456
 * - charlie: charlie2024
 * - diana: diana!pass
 * - eve: evetest999
 * - frank: frank_pass
 * - grace: grace2023
 */

// Initial entities data
export const entities: {[k:string]: any} = {
  User: [
  ],
}

// Initial interactions to call (for triggering reactive computations)
export const initialInteractions = [
 
]

// Initial dictionary data
export const dicts: {[k:string]: any} = {}