import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Poll } from '../../core/models/poll.model';
import { PollRepository } from '../../core/services/poll.repository';
import { VoterIdService } from '../../core/services/voter-id.service';
import { ResultsPanelComponent } from '../../shared/components/results-panel/results-panel';

@Component({
  selector: 'app-survey-detail', standalone: true, imports: [RouterLink, ResultsPanelComponent],
  templateUrl: './survey-detail.html', styleUrl: './survey-detail.scss'
})
export class SurveyDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly repo = inject(PollRepository);
  private readonly destroyRef = inject(DestroyRef);
  private readonly voter = inject(VoterIdService);
  readonly poll = signal<Poll | null>(null);
  readonly selected = signal<Record<string, string>>({});
  readonly submitted = signal<Record<string, boolean>>({});
  readonly loading = signal(true);
  readonly error = signal('');
  readonly isPast = signal(false);
  private channel: RealtimeChannel | null = null;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => void this.load(params.get('id')));
    this.destroyRef.onDestroy(() => void this.repo.removeChannel(this.channel));
  }

  optionSelected(questionId: string, optionId: string): boolean { return this.selected()[questionId] === optionId; }
  isSubmitted(questionId: string): boolean { return !!this.submitted()[questionId]; }
  select(questionId: string, optionId: string): void {
    if (this.isPast() || this.isSubmitted(questionId)) return;
    this.selected.update((state) => ({ ...state, [questionId]: optionId }));
  }

  async submit(questionId: string): Promise<void> {
    const optionId = this.selected()[questionId];
    const poll = this.poll();
    if (!optionId || !poll) return;
    const ok = await this.repo.vote(poll.id, questionId, optionId, this.voter.getId());
    if (ok) this.submitted.update((state) => ({ ...state, [questionId]: true }));
    if (ok) await this.refresh();
  }

  private async load(id: string | null): Promise<void> {
    if (!id) return;
    this.loading.set(true);
    try { this.poll.set(await this.repo.getPoll(id)); this.isPast.set(this.checkPast()); this.subscribe(id); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not load survey.'); }
    finally { this.loading.set(false); }
  }

  private async refresh(): Promise<void> { const current = this.poll(); if (current) this.poll.set(await this.repo.getPoll(current.id)); }
  private subscribe(id: string): void { this.channel = this.repo.subscribeToVotes(id, () => void this.refresh()); }
  private checkPast(): boolean { const date = this.poll()?.endDate; return !!date && new Date(date).getTime() < Date.now(); }
}
