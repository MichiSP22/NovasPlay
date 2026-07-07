import { Component, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'neo-button',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './neo-button.html',
  styleUrl: './neo-button.css'
})
export class NeoButtonComponent {
  label = input.required<string>();
  icon = input<string>('');
  severity = input<'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger' | 'contrast'>('primary');
  variant = input<'text' | 'outlined' | 'contained'>('contained');
  rounded = input<boolean>(false);
  disabled = input<boolean>(false);
}

