import { Component, input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'neo-stat-card',
  standalone: true,
  imports: [CardModule, TagModule],
  templateUrl: './neo-stat-card.html',
  styleUrl: './neo-stat-card.css'
})
export class NeoStatCardComponent {
  title = input.required<string>();
  value = input.required<string | number>();
  subtitle = input<string>('');
  trend = input<string>('');
}

