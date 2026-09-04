import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Poll, PollQuestion } from '../../core/models/poll.model';
import { PollRepository, VoteSelection } from '../../core/services/poll.repository';
import { PollStoreService } from '../../core/services/poll-store.service';
import { UiStateService } from '../../core/services/ui-state.service';
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
  private readonly store = inject(PollStoreService);
  private readonly voter = inject(VoterIdService);
  private readonly destroyRef = inject(DestroyRef);
  readonly ui = inject(UiStateService);
  readonly poll = signal<Poll | null>(null);
  readonly selected = signal<Record<string, string[]>>({});
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

  openCreate(): void { this.ui.openCreateSurvey(); }

  optionSelected(questionId: string, optionId: string): boolean {
    return this.selected()[questionId]?.includes(optionId) ?? false;
  }

  select(question: PollQuestion, optionId: string): void {
    if (this.isLocked()) return;
    this.selected.update((state) => this.nextSelection(state, question, optionId));
  }

  allQuestionsAnswered(): boolean {
    const questions = this.poll()?.questions ?? [];
    return questions.length > 0 && questions.every((question) => this.selected()[question.id]?.length);
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.saving.set(true);
    this.error.set('');
    const success = await this.store.submitVotes(this.poll()!.id, this.selections());
    this.finishSubmit(success);
  }


  private nextSelection(
    state: Record<string, string[]>,
    question: PollQuestion,
    optionId: string,
  ): Record<string, string[]> {
    const current = state[question.id] ?? [];
    const next = question.allowMultiple ? this.toggle(current, optionId) : [optionId];
    return { ...state, [question.id]: next };
  }

  private toggle(values: string[], value: string): string[] {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  }

  private finishSubmit(success: boolean): void {
    this.saving.set(false);
    if (!success) return;
    this.voter.markVoted(this.poll()!.id);
    this.voted.set(true);
    void this.refresh();
  }

  private canSubmit(): boolean {
    return !this.isLocked() && !this.saving() && this.allQuestionsAnswered();
  }

  private isLocked(): boolean { return this.isPast() || this.voted(); }

  private selections(): VoteSelection[] {
    return (this.poll()?.questions ?? []).map((question) => ({
      questionId: question.id,
      optionIds: this.selected()[question.id] ?? [],
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
    const poll = await this.repo.getPoll(id);
    this.poll.set(poll);
    this.voted.set(this.voter.hasVoted(id));
    this.isPast.set(this.checkPast(poll));
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

  private checkPast(poll: Poll | null): boolean {
    return !!poll?.endDate && new Date(poll.endDate).getTime() < Date.now();
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'Could not load the survey.';
  }
}
