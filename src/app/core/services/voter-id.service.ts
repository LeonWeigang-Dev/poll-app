import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class VoterIdService {
  private readonly storageKey = 'poll-app-voter-id';

  getId(): string {
    const existing = localStorage.getItem(this.storageKey);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(this.storageKey, id);
    return id;
  }
}
