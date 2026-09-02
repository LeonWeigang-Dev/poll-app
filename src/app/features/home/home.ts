import { Component, computed, inject } from '@angular/core';
import { CategoryFilterComponent } from '../../shared/components/category-filter/category-filter';
import { SurveyCardComponent } from '../../shared/components/survey-card/survey-card';
import { PollStoreService } from '../../core/services/poll-store.service';
import { UiStateService } from '../../core/services/ui-state.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CategoryFilterComponent, SurveyCardComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.scss', './../../core/config/_fonts.scss'],
})
export class HomeComponent {
  readonly store = inject(PollStoreService);
  readonly ui = inject(UiStateService);
  readonly selectedTab = computed(() => this.store.showPast() ? 'Past survey' : 'Active survey');
  readonly introText = 'Create and share surveys in minutes – from team events to workplace culture. Collect opinions, engage your audience, and turn feedback into action.';

  constructor() { void this.store.load(); }

  openCreate(): void { this.ui.openCreateSurvey(); }
}
