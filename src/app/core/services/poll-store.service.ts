import { Injectable, computed, inject, signal } from '@angular/core';
import { CreatePollInput, Poll } from '../models/poll.model';
import { PollRepository } from './poll.repository';

@Injectable({ providedIn: 'root' })
export class PollStoreService {
  private readonly repo = inject(PollRepository);
  readonly polls = signal<Poll[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly selectedCategory = signal('All');
  readonly showPast = signal(false);

  readonly categories = computed(() => {
    const visible = this.polls().filter((poll) => this.isPast(poll) === this.showPast());
    return ['All', ...new Set(visible.map((poll) => poll.category))];
  });

  readonly filteredPolls = computed(() => this.polls().filter((poll) =>
    this.matchesStatus(poll) && this.matchesCategory(poll)
  ));

  readonly endingSoon = computed(() => this.polls()
    .filter((poll) => !this.isPast(poll) && this.hoursToEnd(poll) <= 72)
    .sort((a, b) => this.dateValue(a.endDate) - this.dateValue(b.endDate))
    .slice(0, 3));

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try { this.polls.set(await this.repo.getPolls()); }
    catch (error) { this.error.set(this.message(error)); }
    finally { this.loading.set(false); }
  }

  async getPoll(id: string): Promise<Poll | null> {
    try { return await this.repo.getPoll(id); }
    catch (error) { this.error.set(this.message(error)); return null; }
  }

  async create(input: CreatePollInput): Promise<Poll | null> {
    try {
      const poll = await this.repo.createPoll(input);
      this.polls.update((polls) => [poll, ...polls]);
      return poll;
    } catch (error) {
      this.error.set(this.message(error));
      return null;
    }
  }

  setCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  setPast(showPast: boolean): void {
    this.showPast.set(showPast);
    this.selectedCategory.set('All');
  }

  private matchesStatus(poll: Poll): boolean {
    return this.isPast(poll) === this.showPast();
  }

  private matchesCategory(poll: Poll): boolean {
    return this.selectedCategory() === 'All' || poll.category === this.selectedCategory();
  }

  private isPast(poll: Poll): boolean {
    return !!poll.endDate && new Date(poll.endDate).getTime() < Date.now();
  }

  private hoursToEnd(poll: Poll): number {
    return poll.endDate ? (new Date(poll.endDate).getTime() - Date.now()) / 3_600_000 : Infinity;
  }

  private dateValue(date: string | null): number {
    return date ? new Date(date).getTime() : Number.MAX_SAFE_INTEGER;
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'Something went wrong.';
  }
}
