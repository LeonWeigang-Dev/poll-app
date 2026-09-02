import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-category-filter',
  standalone: true,
  templateUrl: './category-filter.html',
  styleUrl: './category-filter.scss',
})
export class CategoryFilterComponent {
  readonly categories = input.required<string[]>();
  readonly selected = input.required<string>();
  readonly changed = output<string>();

  value(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }
}
