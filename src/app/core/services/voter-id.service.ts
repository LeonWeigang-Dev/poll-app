import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class VoterIdService {
  private readonly voterKey = 'poll-app-voter-id';
  private readonly voteKeyPrefix = 'poll-app-voted-';

  getId(): string {
    const storedId = localStorage.getItem(this.voterKey);
    if (storedId) return storedId;
    return this.createId();
  }

  hasVoted(surveyId: string): boolean {
    return localStorage.getItem(this.voteKey(surveyId)) === 'true';
  }

  markVoted(surveyId: string): void {
    localStorage.setItem(this.voteKey(surveyId), 'true');
  }

  private createId(): string {
    const id = crypto.randomUUID();
    localStorage.setItem(this.voterKey, id);
    return id;
  }

  private voteKey(surveyId: string): string {
    return `${this.voteKeyPrefix}${surveyId}`;
  }
}
