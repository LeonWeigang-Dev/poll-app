import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Poll } from '../../../core/models/poll.model';

@Component({
  selector: 'app-survey-card', standalone: true, imports: [RouterLink],
  templateUrl: './survey-card.html', styleUrl: './survey-card.scss'
})
export class SurveyCardComponent {
  readonly poll = input.required<Poll>();
  readonly highlight = input(false);
  readonly past = input(false);

  daysLabel(): string {
    const date = this.poll().deadline;
    if (!date) return 'No deadline';
    const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
    return days <= 0 ? 'Ended' : `Ends in ${days} day${days === 1 ? '' : 's'}`;
  }
}
