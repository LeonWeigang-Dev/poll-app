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

  /**
   * Loads all surveys into the store.
   */
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.polls.set(await this.repo.getPolls());
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Retrieves the current surveys from the repository.
   * @returns The available surveys.
   */
  async getPoll(): Promise<Poll[]> {
    return await this.repo.getPolls();
  }

  /**
   * Creates a survey and updates the store.
   * @param input - The survey data to create.
   * @returns The created survey or null when creation fails.
   */
  async create(input: CreatePollInput): Promise<Poll | null> {
    try {
      return await this.createPoll(input);
    } catch (error) {
      this.error.set(this.message(error));
      return null;
    }
  }

  /**
   * Submits all selected answers for a survey.
   * @param surveyId - The survey identifier.
   * @param selections - The selected options grouped by question.
   * @returns Whether the submission succeeded.
   */
  async submitVotes(surveyId: string, selections: VoteSelection[]): Promise<boolean> {
    try {
      await this.repo.submitVotes(surveyId, selections, this.voter.getId());
      return true;
    } catch (error) {
      this.error.set(this.message(error));
      return false;
    }
  }

  /**
   * Changes the active category filter.
   * @param category - The category to select.
   */
  setCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  /**
   * Changes the visible survey status and resets the category filter.
   * @param showPast - Whether past surveys should be shown.
   */
  setPast(showPast: boolean): void {
    this.showPast.set(showPast);
    this.selectedCategory.set('All');
  }

  /**
   * Clears the current store error.
   */
  clearError(): void {
    this.error.set('');
  }

  /**
   * Creates a survey through the repository and prepends it to the store.
   * @param input - The survey data to create.
   * @returns The created survey.
   */
  private async createPoll(input: CreatePollInput): Promise<Poll> {
    const poll = await this.repo.createPoll(input);
    this.polls.update((polls) => [poll, ...polls]);
    return poll;
  }

  /**
   * Builds the available category list from the surveys.
   * @returns The category list including the All option.
   */
  private buildCategories(): string[] {
    return ['All', ...new Set(this.polls().map((poll) => poll.category))];
  }

  /**
   * Filters surveys by status and category.
   * @returns The surveys matching the active filters.
   */
  private getFilteredPolls(): Poll[] {
    return this.polls().filter((poll) => this.matchesStatus(poll) && this.matchesCategory(poll));
  }

  /**
   * Returns the three active surveys ending soonest within 72 hours.
   * @returns The surveys that are ending soon.
   */
  private getEndingSoon(): Poll[] {
    return this.polls()
      .filter((poll) => !this.isPast(poll) && this.hoursToEnd(poll) <= 72)
      .sort((a, b) => this.dateValue(a.endDate) - this.dateValue(b.endDate))
      .slice(0, 3);
  }

  /**
   * Checks whether a survey matches the active status filter.
   * @param poll - The survey to inspect.
   * @returns Whether the survey matches the selected status.
   */
  private matchesStatus(poll: Poll): boolean {
    return this.isPast(poll) === this.showPast();
  }

  /**
   * Checks whether a survey matches the selected category.
   * @param poll - The survey to inspect.
   * @returns Whether the survey matches the selected category.
   */
  private matchesCategory(poll: Poll): boolean {
    return this.selectedCategory() === 'All' || poll.category === this.selectedCategory();
  }

  /**
   * Checks whether a survey has passed its deadline.
   * @param poll - The survey to inspect.
   * @returns Whether the survey has ended.
   */
  private isPast(poll: Poll): boolean {
    return !!poll.endDate && new Date(poll.endDate).getTime() < Date.now();
  }

  /**
   * Calculates the remaining hours until a survey ends.
   * @param poll - The survey to inspect.
   * @returns The remaining hours.
   */
  private hoursToEnd(poll: Poll): number {
    return poll.endDate ? (new Date(poll.endDate).getTime() - Date.now()) / 3_600_000 : Infinity;
  }

  /**
   * Converts a deadline into a sortable timestamp.
   * @param date - The deadline to convert.
   * @returns The timestamp or the maximum safe integer.
   */
  private dateValue(date: string | null): number {
    return date ? new Date(date).getTime() : Number.MAX_SAFE_INTEGER;
  }

  /**
   * Converts an unknown error into a user-facing message.
   * @param error - The caught error value.
   * @returns The readable error message.
   */
  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'Something went wrong.';
  }
}