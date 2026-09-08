import { Component, DestroyRef, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { DatePipe, Location } from '@angular/common';
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
export class SurveyDetailComponent implements OnInit, OnDestroy {
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
  private location: Location = inject(Location);

  /**
   * Controls the visibility state of the results panel in the mobile view (from 1024px).
   * @default false
   */
  readonly resultsOpen = signal(false);

  /**
   * Generates a temporary copy of the survey data (Questions and Answers),
   * where currently selected answers are locally added to the existing votes.
   * This creates a live-result effect without hitting the database before the final submit.
   */
  readonly liveQuestions = computed<PollQuestion[]>(() => {
    const currentPoll = this.poll();
    if (!currentPoll) return [];

    return currentPoll.questions.map((q) => {
      const updatedAnswers = q.answers.map((a) => {
        const isSelected = this.optionSelected(q.id, a.id);
        return {
          ...a,
          votes: a.votes + (isSelected ? 1 : 0),
        };
      });
      return { ...q, answers: updatedAnswers };
    });
  });

  /**
   * Registers route loading and realtime channel cleanup.
   */
  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => void this.load(params.get('id')));
    this.destroyRef.onDestroy(() => void this.repo.removeChannel(this.channel));
  }

  /**
   * Lifecycle hook that is called after data-bound properties are initialized.
   * Adds the 'survey-detail-page-active' class to the <body> to swap header logo and background color via CSS.
   */
  ngOnInit(): void {
    document.body.classList.add('survey-detail-page-active');
  }

  /**
   * Navigates back to the previous page in the browser history.
   * If no history is available, it navigates to the root route.
   * This method is triggered by the "Back" button in the survey detail view.
   */
  goBack() {
  this.location.back();
}

  /**
   * Lifecycle hook that is called when the component is destroyed.
   * Removes the 'survey-detail-page-active' class from the <body> to restore global header styles.
   */
  ngOnDestroy(): void {
    document.body.classList.remove('survey-detail-page-active');
  }

  /**
   * Toggles the visibility of the results panel in the mobile view.
   * Triggered by the "Open/Close results" button.
   */
  toggleResults(): void {
    this.resultsOpen.update((open) => !open);
  }

  /**
   * Opens the create survey dialog.
   */
  openCreate(): void {
    this.ui.openCreateSurvey();
  }

  /**
   * Checks whether an option is currently selected.
   * @param questionId - The question identifier.
   * @param optionId - The option identifier.
   * @returns Whether the option is selected.
   */
  optionSelected(questionId: string, optionId: string): boolean {
    return this.selected()[questionId]?.includes(optionId) ?? false;
  }

  /**
   * Updates the selected answer for a question.
   * @param question - The question being answered.
   * @param optionId - The selected option identifier.
   */
  select(question: PollQuestion, optionId: string): void {
    if (this.isLocked()) return;
    this.selected.update((state) => this.nextSelection(state, question, optionId));
  }

  /**
   * Checks whether every question has at least one selected option.
   * @returns Whether all questions are answered.
   */
  allQuestionsAnswered(): boolean {
    const questions = this.poll()?.questions ?? [];
    return questions.length > 0 && questions.every((question) => this.selected()[question.id]?.length);
  }

  /**
   * Submits the selected answers when the survey is ready.
   */
  async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.saving.set(true);
    this.error.set('');
    const success = await this.store.submitVotes(this.poll()!.id, this.selections());
    this.finishSubmit(success);
  }

  /**
   * Calculates the next selection state for one question.
   * @param state - The current selection state.
   * @param question - The question being answered.
   * @param optionId - The selected option identifier.
   * @returns The updated selection state.
   */
  private nextSelection(
    state: Record<string, string[]>,
    question: PollQuestion,
    optionId: string,
  ): Record<string, string[]> {
    const current = state[question.id] ?? [];
    const next = question.allowMultiple ? this.toggle(current, optionId) : [optionId];
    return { ...state, [question.id]: next };
  }

  /**
   * Toggles one option inside a selection list.
   * @param values - The current option identifiers.
   * @param value - The option identifier to toggle.
   * @returns The updated option identifiers.
   */
  private toggle(values: string[], value: string): string[] {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  }

  /**
   * Finalizes a successful or failed vote submission.
   * @param success - Whether the vote submission succeeded.
   */
  private finishSubmit(success: boolean): void {
    this.saving.set(false);
    if (!success) return;
    this.voter.markVoted(this.poll()!.id);
    this.voted.set(true);
    void this.refresh();
  }

  /**
   * Determines whether the vote form can be submitted.
   * @returns Whether submission is currently allowed.
   */
  private canSubmit(): boolean {
    return !this.isLocked() && !this.saving() && this.allQuestionsAnswered();
  }

  /**
   * Checks whether the current survey is locked for editing.
   * @returns Whether the survey cannot be answered.
   */
  private isLocked(): boolean {
    return this.isPast() || this.voted();
  }

  /**
   * Converts current selections into repository input.
   * @returns The selected options grouped by question.
   */
  private selections(): VoteSelection[] {
    return (this.poll()?.questions ?? []).map((question) => ({
      questionId: question.id,
      optionIds: this.selected()[question.id] ?? [],
    }));
  }

  /**
   * Loads the survey for the current route identifier.
   * @param id - The survey identifier.
   */
  private async load(id: string | null): Promise<void> {
    if (!id) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await this.loadPoll(id);
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Loads the survey and starts its realtime subscription.
   * @param id - The survey identifier.
   */
  private async loadPoll(id: string): Promise<void> {
    const poll = await this.repo.getPoll(id);
    this.poll.set(poll);
    this.voted.set(this.voter.hasVoted(id));
    this.isPast.set(this.checkPast(poll));
    this.subscribe(id);
  }

  /**
   * Refreshes the currently displayed survey.
   */
  private async refresh(): Promise<void> {
    const current = this.poll();
    if (current) this.poll.set(await this.repo.getPoll(current.id));
  }

  /**
   * Creates a realtime subscription for survey votes.
   * @param id - The survey identifier.
   */
  private subscribe(id: string): void {
    void this.repo.removeChannel(this.channel);
    this.channel = this.repo.subscribeToVotes(id, () => void this.refresh());
  }

  /**
   * Checks whether the survey deadline has passed.
   * @param poll - The survey to inspect.
   * @returns Whether the survey has ended.
   */
  private checkPast(poll: Poll | null): boolean {
    return !!poll?.endDate && new Date(poll.endDate).getTime() < Date.now();
  }

  /**
   * Converts an unknown error into a readable message.
   * @param error - The caught error value.
   * @returns The user-facing error message.
   */
  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'Could not load the survey.';
  }
}