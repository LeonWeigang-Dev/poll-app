import { Injectable, computed, inject, signal } from '@angular/core';
import { CreatePollInput, Poll } from '../models/poll.model';
import { PollRepository, VoteSelection } from './poll.repository';
import { VoterIdService } from './voter-id.service';

@Injectable({ providedIn: 'root' })
export class PollStoreService {
  private readonly repo = inject(PollRepository);
  private readonly voter = inject(VoterIdService);
  readonly polls = signal<Poll[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly selectedCategory = signal('All');
  readonly showPast = signal(false);
  readonly categories = computed(() => this.buildCategories());
  readonly filteredPolls = computed(() => this.getFilteredPolls());
  readonly endingSoon = computed(() => this.getEndingSoon());

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try { this.polls.set(await this.repo.getPolls()); }
    catch (error) { this.error.set(this.message(error)); }
    finally { this.loading.set(false); }
  }

  async getPoll(): Promise<Poll[]> {
    return await this.repo.getPolls();
  }

  async create(input: CreatePollInput): Promise<Poll | null> {
    try { return await this.createPoll(input); }
    catch (error) { this.error.set(this.message(error)); return null; }
  }

  async submitVotes(surveyId: string, selections: VoteSelection[]): Promise<boolean> {
    try { await this.repo.submitVotes(surveyId, selections, this.voter.getId()); return true; }
    catch (error) { this.error.set(this.message(error)); return false; }
  }

  setCategory(category: string): void { this.selectedCategory.set(category); }
  setPast(showPast: boolean): void { this.showPast.set(showPast); this.selectedCategory.set('All'); }
  clearError(): void { this.error.set(''); }

  private async createPoll(input: CreatePollInput): Promise<Poll> {
    const poll = await this.repo.createPoll(input);
    this.polls.update((polls) => [poll, ...polls]);
    return poll;
  }

  private buildCategories(): string[] {
    return ['All', ...new Set(this.polls().map((poll) => poll.category))];
  }

  private getFilteredPolls(): Poll[] {
    return this.polls().filter((poll) => this.matchesStatus(poll) && this.matchesCategory(poll));
  }

  private getEndingSoon(): Poll[] {
    return this.polls()
      .filter((poll) => !this.isPast(poll) && this.hoursToEnd(poll) <= 72)
      .sort((a, b) => this.dateValue(a.endDate) - this.dateValue(b.endDate))
      .slice(0, 3);
  }

  private matchesStatus(poll: Poll): boolean { return this.isPast(poll) === this.showPast(); }
  private matchesCategory(poll: Poll): boolean { return this.selectedCategory() === 'All' || poll.category === this.selectedCategory(); }
  private isPast(poll: Poll): boolean { return !!poll.endDate && new Date(poll.endDate).getTime() < Date.now(); }
  private hoursToEnd(poll: Poll): number { return poll.endDate ? (new Date(poll.endDate).getTime() - Date.now()) / 3_600_000 : Infinity; }
  private dateValue(date: string | null): number { return date ? new Date(date).getTime() : Number.MAX_SAFE_INTEGER; }
  private message(error: unknown): string { return error instanceof Error ? error.message : 'Something went wrong.'; }
}
