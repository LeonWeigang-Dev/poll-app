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

  deadlineLabel(): string {
    const date = this.poll().endDate;
    return date ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date)) : 'No deadline';
  }

  relativeLabel(): string {
    const date = this.poll().endDate;
    if (!date) return 'Open-ended';
    const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
    return days <= 0 ? 'Ended' : days === 1 ? 'Ends tomorrow' : `Ends in ${days} days`;
  }
}
