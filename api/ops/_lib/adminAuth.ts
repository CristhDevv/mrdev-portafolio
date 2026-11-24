import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from './supabaseAdmin.js';

export interface AuthenticatedAdmin {
  userId: string;
  email: string;
}

export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse,
): Promise<AuthenticatedAdmin | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing bearer token' });
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Empty bearer token' });
    return null;
  }

  const ownerEmail = process.env.OPS_OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerEmail) {
    res.status(500).json({ error: 'SERVER_MISCONFIGURED', message: 'OPS_OWNER_EMAIL not configured' });
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user || !data.user.email) {
    res.status(401).json({ error: 'INVALID_TOKEN', message: 'Invalid or expired session token' });
    return null;
  }

  if (data.user.email.toLowerCase() !== ownerEmail) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Account is not authorized for Ops Center' });
    return null;
  }

  return {
    userId: data.user.id,
    email: data.user.email,
  };
}
