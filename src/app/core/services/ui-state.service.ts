import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  readonly createSurveyOpen = signal(false);

  openCreateSurvey(): void {
    this.createSurveyOpen.set(true);
  }

  closeCreateSurvey(): void {
    this.createSurveyOpen.set(false);
  }
}
