import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  readonly createSurveyOpen = signal(false);

  /**
   * Opens the create survey dialog.
   */
  openCreateSurvey(): void {
    this.createSurveyOpen.set(true);
  }

  /**
   * Closes the create survey dialog.
   */
  closeCreateSurvey(): void {
    this.createSurveyOpen.set(false);
  }
}