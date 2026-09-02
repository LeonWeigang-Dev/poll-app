import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Poll } from '../../../core/models/poll.model';

@Component({
  selector: 'app-survey-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './survey-card.html',
  styleUrl: './survey-card.scss',
})
export class SurveyCardComponent {
  readonly poll = input.required<Poll>();
  readonly highlight = input(false);
  readonly past = input(false);

  daysLabel(): string {
    const endDate = this.poll().endDate;
    if (!endDate) return 'No deadline';
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
    return days <= 0 ? 'Ended' : `Ends in ${days} day${days === 1 ? '' : 's'}`;
  }
}
