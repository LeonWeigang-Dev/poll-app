import { Injectable, signal } from '@angular/core';

export interface ToastState {
  message: string;
  visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toast = signal<ToastState>({ message: '', visible: false });
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Displays a toast message for a limited time.
   * @param message - The message to display.
   */
  show(message: string): void {
    this.clearTimer();
    this.toast.set({ message, visible: true });
    this.timeoutId = setTimeout(() => this.hide(), 3500);
  }

  /**
   * Hides the current toast message.
   */
  hide(): void {
    this.clearTimer();
    this.toast.update((toast) => ({ ...toast, visible: false }));
  }

  /**
   * Clears the active toast timer.
   */
  private clearTimer(): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }
}