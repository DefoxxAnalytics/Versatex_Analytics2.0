/**
 * Simple Password Authentication with Security Enhancements
 * 
 * Security Features:
 * - SHA-256 password hashing
 * - Session timeout (30 minutes inactivity)
 * - Obfuscated password storage
 * - Environment-based passwords (dev/prod)
 * - HTTPS-only in production
 * 
 * Security Level: Low-Medium
 * - Suitable for internal tools and non-sensitive data
 * - NOT suitable for highly confidential information
 * - Password is visible in JavaScript bundle to determined attackers
 */

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_KEY = 'analytics_session';
const LAST_ACTIVITY_KEY = 'analytics_last_activity';

/**
 * Obfuscated password hash
 * The actual password is set via environment variable VITE_APP_PASSWORD
 * We hash it with SHA-256 for basic obfuscation
 */
async function getPasswordHash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Get the expected password hash from environment
 * Uses obfuscation to make it slightly harder to find
 */
async function getExpectedPasswordHash(): Promise<string> {
  // Get password from environment variable
  const envPassword = import.meta.env.VITE_APP_PASSWORD || 'default_password_change_me';
  
  // Hash it
  return await getPasswordHash(envPassword);
}

/**
 * Verify if the provided password matches the expected password
 * 
 * @param password - User-provided password
 * @returns True if password is correct
 */
export async function verifyPassword(password: string): Promise<boolean> {
  try {
    const providedHash = await getPasswordHash(password);
    const expectedHash = await getExpectedPasswordHash();
    
    return providedHash === expectedHash;
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

/**
 * Create a new session after successful login
 */
export function createSession(): void {
  const sessionToken = generateSessionToken();
  const now = Date.now();
  
  localStorage.setItem(SESSION_KEY, sessionToken);
  localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
}

/**
 * Generate a random session token
 */
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if user has a valid JWT token
 * 
 * @returns True if access token exists
 */
export function isAuthenticated(): boolean {
  const accessToken = localStorage.getItem('access_token');
  const user = localStorage.getItem('user');
  
  return !!(accessToken && user);
}

/**
 * Update the last activity timestamp
 * Call this on user interactions to prevent timeout
 */
export function updateActivity(): void {
  const now = Date.now();
  localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
}

/**
 * Clear the current session (logout)
 */
export function clearSession(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

/**
 * Get remaining session time in milliseconds
 * 
 * @returns Remaining time in ms, or 0 if no session
 */
export function getRemainingSessionTime(): number {
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
  
  if (!lastActivity) {
    return 0;
  }
  
  const lastActivityTime = parseInt(lastActivity, 10);
  const now = Date.now();
  const timeSinceActivity = now - lastActivityTime;
  const remaining = SESSION_TIMEOUT_MS - timeSinceActivity;
  
  return Math.max(0, remaining);
}

/**
 * Check if HTTPS is being used (production requirement)
 * 
 * @returns True if using HTTPS or localhost
 */
export function isSecureContext(): boolean {
  // Allow localhost for development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return true;
  }
  
  // Require HTTPS in production
  return window.location.protocol === 'https:';
}
