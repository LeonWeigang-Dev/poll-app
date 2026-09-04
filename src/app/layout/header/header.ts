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

  isHome(): boolean {
    return this.router.url === '/' || this.router.url === '';
  }

  isSurveyDetail(): boolean {
    return this.router.url.startsWith('/survey/');
  }
}
