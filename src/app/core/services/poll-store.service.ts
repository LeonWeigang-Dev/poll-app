import { Injectable, computed, inject, signal } from '@angular/core';
import { CreatePollInput, Poll } from '../models/poll.model';
import { PollRepository } from './poll.repository';
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
  readonly categories = computed(() => ['All', ...new Set(this.polls().map((poll) => poll.category))]);

  readonly filteredPolls = computed(() => this.polls().filter((poll) =>
    this.matchesStatus(poll) && this.matchesCategory(poll)
  ));

  readonly endingSoon = computed(() => this.polls().filter((poll) =>
    !this.isPast(poll) && this.hoursToEnd(poll) <= 72
  ).sort((a, b) => this.dateValue(a.endDate) - this.dateValue(b.endDate)).slice(0, 3));

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try { this.polls.set(await this.repo.getPolls()); } catch (error) { this.error.set(this.message(error)); }
    finally { this.loading.set(false); }
  }

  async getPoll(id: string): Promise<Poll | null> {
    try { return await this.repo.getPoll(id); } catch (error) { this.error.set(this.message(error)); return null; }
  }

  async create(input: CreatePollInput): Promise<Poll | null> {
    try { const poll = await this.repo.createPoll(input); this.polls.update((polls) => [poll, ...polls]); return poll; }
    catch (error) { this.error.set(this.message(error)); return null; }
  }

  async vote(surveyId: string, questionId: string, optionId: string): Promise<boolean> {
    try { this.addVoteLocally(surveyId, questionId, optionId); return true; }
    catch (error) { this.error.set(this.message(error)); return false; }
  }

  setCategory(category: string): void { this.selectedCategory.set(category); }
  setPast(showPast: boolean): void { this.showPast.set(showPast); this.selectedCategory.set('All'); }
  addVoteLocally(surveyId: string, questionId: string, optionId: string): void {
    this.polls.update((polls) => polls.map((poll) => poll.id === surveyId ? this.withAddedVote(poll, questionId, optionId) : poll));
  }

  private withAddedVote(poll: Poll, questionId: string, optionId: string): Poll {
    return {
      ...poll, questions: poll.questions.map((question) => question.id !== questionId ? question : {
        ...question, answers: question.answers.map((answer) => answer.id === optionId ? { ...answer, votes: answer.votes + 1 } : answer),
      })
    };
  }

  private matchesStatus(poll: Poll): boolean { return this.isPast(poll) === this.showPast(); }
  private matchesCategory(poll: Poll): boolean { return this.selectedCategory() === 'All' || poll.category === this.selectedCategory(); }
  private isPast(poll: Poll): boolean { return !!poll.endDate && new Date(poll.endDate).getTime() < Date.now(); }
  private hoursToEnd(poll: Poll): number { return poll.endDate ? (new Date(poll.endDate).getTime() - Date.now()) / 3_600_000 : Number.POSITIVE_INFINITY; }
  private dateValue(date: string | null): number { return date ? new Date(date).getTime() : Number.MAX_SAFE_INTEGER; }
  private message(error: unknown): string { return error instanceof Error ? error.message : 'Something went wrong.'; }
}
