import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class VoterIdService {
  private readonly voterKey = 'poll-app-voter-id';
  private readonly voteKeyPrefix = 'poll-app-voted-';

  /**
   * Returns the local voter identifier and creates one when needed.
   * @returns The local voter identifier.
   */
  getId(): string {
    const storedId = localStorage.getItem(this.voterKey);
    if (storedId) return storedId;
    return this.createId();
  }

  /**
   * Checks whether a survey was already submitted by this browser.
   * @param surveyId - The survey identifier.
   * @returns Whether the survey was already submitted.
   */
  hasVoted(surveyId: string): boolean {
    return localStorage.getItem(this.voteKey(surveyId)) === 'true';
  }

  /**
   * Marks a survey as submitted by this browser.
   * @param surveyId - The survey identifier.
   */
  markVoted(surveyId: string): void {
    localStorage.setItem(this.voteKey(surveyId), 'true');
  }

  /**
   * Creates and stores a new local voter identifier.
   * @returns The generated voter identifier.
   */
  private createId(): string {
    const id = crypto.randomUUID();
    localStorage.setItem(this.voterKey, id);
    return id;
  }

  /**
   * Builds the local storage key for a survey vote marker.
   * @param surveyId - The survey identifier.
   * @returns The storage key.
   */
  private voteKey(surveyId: string): string {
    return `${this.voteKeyPrefix}${surveyId}`;
  }
}
