import { Injectable, signal } from '@angular/core';

export interface ToastState {
  message: string;
  visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toast = signal<ToastState>({ message: '', visible: false });
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  show(message: string): void {
    this.clearTimer();
    this.toast.set({ message, visible: true });
    this.timeoutId = setTimeout(() => this.hide(), 3500);
  }

  hide(): void {
    this.clearTimer();
    this.toast.update((toast) => ({ ...toast, visible: false }));
  }

  private clearTimer(): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }
}
