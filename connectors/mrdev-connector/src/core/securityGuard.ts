import fs from 'node:fs';
import path from 'node:path';

export type CommandRiskLevel = 'low' | 'medium' | 'high' | 'critical';

const CRITICAL_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\bdel\s+\/[sfq]/i,
  /\bformat\s+[a-z]:/i,
  /\bdrop\s+(table|database)\b/i,
  /\bshutdown\b/i,
  /\.ssh[\\/]/i,
];

const HIGH_RISK_PATTERNS = [
  /\bnpm\s+install\b/i,
  /\bgit\s+push\b/i,
  /\bprisma\s+migrate\b/i,
  /\bcurl\b.*\|\s*(sh|bash)/i,
];

export function classifyActionRisk(commandOrText: string): CommandRiskLevel {
  if (CRITICAL_PATTERNS.some((re) => re.test(commandOrText))) return 'critical';
  if (HIGH_RISK_PATTERNS.some((re) => re.test(commandOrText))) return 'high';
  return 'low';
}

export function isPathWithinAllowedRoots(targetPath: string, allowedRoots: string[]): boolean {
  if (allowedRoots.length === 0) return false;

  const resolvedTarget = fs.existsSync(targetPath)
    ? fs.realpathSync(targetPath)
    : path.resolve(targetPath);

  return allowedRoots.some((root) => {
    const resolvedRoot = fs.existsSync(root) ? fs.realpathSync(root) : path.resolve(root);
    const relative = path.relative(resolvedRoot, resolvedTarget);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  });
}

export function isLoopbackUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'ws:' || parsed.protocol === 'wss:') &&
      (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || parsed.hostname === '::1')
    );
  } catch {
    return false;
  }
}
