import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CreateSurveyComponent } from './features/create-survey/create-survey';
import { HeaderComponent } from './layout/header/header';
import { PollStoreService } from './core/services/poll-store.service';
import { ToastService } from './core/services/toast.service';
import { UiStateService } from './core/services/ui-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, CreateSurveyComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly ui = inject(UiStateService);
  readonly toast = inject(ToastService);
  readonly store = inject(PollStoreService);

  onPublished(): void {
    this.ui.closeCreateSurvey();
    this.store.clearError();
    this.toast.show('Your survey is now published');
  }
}
