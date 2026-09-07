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

  /**
   * Calculates the total votes for one question.
   * @param question - The question to inspect.
   * @returns The total number of votes.
   */
  total(question: PollQuestion): number {
    return question.answers.reduce((sum, answer) => sum + answer.votes, 0);
  }

  /**
   * Calculates an option's percentage of all votes.
   * @param question - The question to inspect.
   * @param votes - The option vote count.
   * @returns The rounded percentage.
   */
  percent(question: PollQuestion, votes: number): number {
    const total = this.total(question);
    return total ? Math.round((votes / total) * 100) : 0;
  }

  /**
   * Converts an option index into its alphabetic label.
   * @param index - The zero-based option index.
   * @returns The option letter.
   */
  optionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }
}
