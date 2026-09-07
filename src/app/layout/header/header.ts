import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent {
  private readonly router = inject(Router);

  /**
   * Checks whether the current route is the home page.
   * @returns Whether the current route is the home page.
   */
  isHome(): boolean {
    return this.router.url === '/' || this.router.url === '';
  }

  /**
   * Checks whether the current route shows a survey detail page.
   * @returns Whether a survey detail route is active.
   */
  isSurveyDetail(): boolean {
    return this.router.url.startsWith('/survey/');
  }
}