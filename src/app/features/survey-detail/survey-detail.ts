import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Poll } from '../../core/models/poll.model';
import { PollRepository, VoteSelection } from '../../core/services/poll.repository';
import { VoterIdService } from '../../core/services/voter-id.service';
import { ResultsPanelComponent } from '../../shared/components/results-panel/results-panel';

@Component({
  selector: 'app-survey-detail',
  standalone: true,
  imports: [RouterLink, ResultsPanelComponent, DatePipe],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
})
export class SurveyDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly repo = inject(PollRepository);
  private readonly voter = inject(VoterIdService);
  private readonly destroyRef = inject(DestroyRef);
  readonly poll = signal<Poll | null>(null);
  readonly selected = signal<Record<string, string>>({});
  readonly voted = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly isPast = signal(false);
  private channel: RealtimeChannel | null = null;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => void this.load(params.get('id')));
    this.destroyRef.onDestroy(() => void this.repo.removeChannel(this.channel));
  }

  optionSelected(questionId: string, optionId: string): boolean {
    return this.selected()[questionId] === optionId;
  }

  select(questionId: string, optionId: string): void {
    if (this.isLocked()) return;
    this.selected.update((state) => ({ ...state, [questionId]: optionId }));
  }

  allQuestionsAnswered(): boolean {
    const questions = this.poll()?.questions ?? [];
    return questions.length > 0 && questions.every((question) => !!this.selected()[question.id]);
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.saving.set(true);
    this.error.set('');
    try { await this.saveVotes(); }
    catch (error) { this.error.set(this.message(error)); }
    finally { this.saving.set(false); }
  }

  statusLabel(): string {
    if (this.isPast()) return 'Survey ended';
    return this.voted() ? 'Your response is recorded' : 'Open for voting';
  }

  private async saveVotes(): Promise<void> {
    const poll = this.poll()!;
    await this.repo.submitVotes(poll.id, this.selections(), this.voter.getId());
    this.voter.markVoted(poll.id);
    this.voted.set(true);
    await this.refresh();
  }

  private canSubmit(): boolean {
    return !this.isLocked() && !this.saving() && this.allQuestionsAnswered();
  }

  private isLocked(): boolean { return this.isPast() || this.voted(); }

  private selections(): VoteSelection[] {
    return (this.poll()?.questions ?? []).map((question) => ({
      questionId: question.id, optionId: this.selected()[question.id],
    }));
  }

  private async load(id: string | null): Promise<void> {
    if (!id) return;
    this.loading.set(true);
    this.error.set('');
    try { await this.loadPoll(id); }
    catch (error) { this.error.set(this.message(error)); }
    finally { this.loading.set(false); }
  }

  private async loadPoll(id: string): Promise<void> {
    this.poll.set(await this.repo.getPoll(id));
    this.voted.set(this.voter.hasVoted(id));
    this.isPast.set(this.checkPast());
    this.subscribe(id);
  }

  private async refresh(): Promise<void> {
    const current = this.poll();
    if (current) this.poll.set(await this.repo.getPoll(current.id));
  }

  private subscribe(id: string): void {
    void this.repo.removeChannel(this.channel);
    this.channel = this.repo.subscribeToVotes(id, () => void this.refresh());
  }

  private checkPast(): boolean {
    const date = this.poll()?.endDate;
    return !!date && new Date(date).getTime() < Date.now();
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'Could not submit the survey.';
  }
}
