import { Component, computed, input } from '@angular/core';
import { PollQuestion } from '../../../core/models/poll.model';

@Component({
  selector: 'app-results-panel',
  standalone: true,
  templateUrl: './results-panel.html',
  styleUrl: './results-panel.scss',
})
export class ResultsPanelComponent {
  readonly questions = input.required<PollQuestion[]>();
  readonly hasResults = computed(() => this.questions().some((question) => this.total(question) > 0));

  total(question: PollQuestion): number {
    return question.answers.reduce((sum, answer) => sum + answer.votes, 0);
  }

  percent(question: PollQuestion, votes: number): number {
    const total = this.total(question);
    return total ? Math.round((votes / total) * 100) : 0;
  }
}
