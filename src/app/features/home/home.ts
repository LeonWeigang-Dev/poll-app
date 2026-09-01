import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PollStoreService } from '../../core/services/poll-store.service';
import { CategoryFilterComponent } from '../../shared/components/category-filter/category-filter';
import { SurveyCardComponent } from '../../shared/components/survey-card/survey-card';
import { CreateSurveyComponent } from '../create-survey/create-survey';

@Component({
  selector: 'app-home', standalone: true, imports: [CategoryFilterComponent, SurveyCardComponent, CreateSurveyComponent],
  templateUrl: './home.html', styleUrl: './home.scss'
})
export class HomeComponent {
  readonly store = inject(PollStoreService);
  readonly router = inject(Router);
  readonly showCreate = signal(false);
  readonly introText = 'Create and share surveys in minutes – from team events to workplace culture. Collect opinions, engage your audience, and turn feedback into action.';
  readonly selectedTab = computed(() => this.store.showPast() ? 'Past survey' : 'Active survey');

  constructor() { void this.store.load(); }

  openCreate(): void { this.showCreate.set(true); }
  closeCreate(): void { this.showCreate.set(false); }
  async created(): Promise<void> { this.showCreate.set(false); await this.store.load(); }
  viewSurvey(id: string): void { void this.router.navigate(['/survey', id]); }
}
