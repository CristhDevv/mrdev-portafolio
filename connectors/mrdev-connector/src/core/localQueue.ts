import fs from 'node:fs';
import path from 'node:path';
import { getConfigDir } from '../config/identityStore.js';

export interface PendingAck {
  id: string;
  method: string;
  urlPath: string;
  body: unknown;
  createdAt: string;
}

export class LocalQueue {
  private readonly queueFile = path.join(getConfigDir(), 'pending-acks.json');

  enqueue(item: PendingAck): void {
    const list = this.readAll();
    list.push(item);
    fs.mkdirSync(path.dirname(this.queueFile), { recursive: true });
    fs.writeFileSync(this.queueFile, JSON.stringify(list, null, 2));
  }

  readAll(): PendingAck[] {
    if (!fs.existsSync(this.queueFile)) return [];
    try {
      return JSON.parse(fs.readFileSync(this.queueFile, 'utf8')) as PendingAck[];
    } catch {
      return [];
    }
  }

  replaceAll(items: PendingAck[]): void {
    fs.mkdirSync(path.dirname(this.queueFile), { recursive: true });
    fs.writeFileSync(this.queueFile, JSON.stringify(items, null, 2));
  }
}
