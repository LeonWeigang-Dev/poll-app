import { Component, inject, signal } from '@angular/core';
import { CategoryFilterComponent } from '../../shared/components/category-filter/category-filter';
import { SurveyCardComponent } from '../../shared/components/survey-card/survey-card';
import { PollStoreService } from '../../core/services/poll-store.service';
import { CreateSurveyComponent } from '../create-survey/create-survey';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CategoryFilterComponent, SurveyCardComponent, CreateSurveyComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  readonly store = inject(PollStoreService);
  readonly showCreate = signal(false);

  constructor() { void this.store.load(); }

  openCreate(): void { this.showCreate.set(true); }
  closeCreate(): void { this.showCreate.set(false); }

  async created(): Promise<void> {
    this.showCreate.set(false);
    await this.store.load();
  }
}
