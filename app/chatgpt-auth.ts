import 'server-only';
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users } from '@/db/schema';

const scrypt = promisify(scryptCallback);
const COOKIE_NAME = 'gongyou_session';
const SESSION_SECONDS = 60 * 60 * 24 * 30;

export type ChatGPTUser = { userId: string; displayName: string; email: string; fullName: string | null };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  return value;
}

function sign(value: string) { return createHmac('sha256', secret()).update(value).digest('base64url'); }

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [userId, expiresText, signature] = token.split('.');
  if (!userId || !expiresText || !signature || Number(expiresText) < Date.now()) return null;
  const payload = `${userId}.${expiresText}`; const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const [user] = await getDb().select({ id: users.id, displayName: users.displayName, phone: users.phone, status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.status !== 'active') return null;
  return { userId: user.id, displayName: user.displayName, email: `${user.phone}@phone.local`, fullName: user.displayName };
}

export async function requireChatGPTUser(returnTo: string) { const user = await getChatGPTUser(); if (user) return user; redirect(chatGPTSignInPath(returnTo)); }
export function chatGPTSignInPath(returnTo: string) { return `/login?return_to=${encodeURIComponent(safeReturnTo(returnTo))}`; }
export function chatGPTSignOutPath(returnTo = '/') { return `/api/auth/logout?return_to=${encodeURIComponent(safeReturnTo(returnTo))}`; }

export async function hashPassword(password: string) { const salt = randomBytes(16).toString('hex'); const derived = await scrypt(password, salt, 64) as Buffer; return `${salt}:${derived.toString('hex')}`; }
export async function verifyPassword(password: string, stored: string) { const [salt, hash] = stored.split(':'); if (!salt || !hash) return false; const derived = await scrypt(password, salt, 64) as Buffer; const saved = Buffer.from(hash, 'hex'); return saved.length === derived.length && timingSafeEqual(saved, derived); }

export async function setUserSession(userId: string) {
  const expires = Date.now() + SESSION_SECONDS * 1000; const payload = `${userId}.${expires}`;
  (await cookies()).set(COOKIE_NAME, `${payload}.${sign(payload)}`, { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: SESSION_SECONDS, path: '/' });
}
export async function clearUserSession() { (await cookies()).set(COOKIE_NAME, '', { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: 0, path: '/' }); }
function safeReturnTo(value: string) { return value.startsWith('/') && !value.startsWith('//') ? value : '/'; }
