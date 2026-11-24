import os from 'node:os';

export function collectMachineResources() {
  const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
  const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
  const usedMemMb = Math.max(0, totalMemMb - freeMemMb);
  const load = os.loadavg()[0] ?? 0;
  const cpuCount = Math.max(1, os.cpus().length);
  const cpuPercent = Math.min(100, Math.round((load / cpuCount) * 1000) / 10);

  return {
    cpu_percent: cpuPercent,
    ram_used_mb: usedMemMb,
    ram_total_mb: totalMemMb,
  };
}
