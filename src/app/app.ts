import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { HeaderComponent } from './layout/header/header';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  readonly darkShell = signal(true);

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.syncShell());
    this.syncShell();
  }

  private syncShell(): void {
    this.darkShell.set(this.router.url === '/' || this.router.url === '');
  }
}
