import { Component, forwardRef, Input, ElementRef, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cyber-timepicker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cyber-timepicker.html',
  styleUrl: './cyber-timepicker.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CyberTimepickerComponent),
      multi: true
    }
  ]
})
export class CyberTimepickerComponent implements ControlValueAccessor {
  @Input() placeholder = 'Selecciona una hora';
  @Input() cssClass = 'cyber-input'; 
  
  isOpen = signal(false);
  
  value: string = ''; // "HH:mm" format
  currentHour: string = '12';
  currentMinute: string = '00';
  
  hours: string[] = [];
  minutes: string[] = [];
  
  onChange = (val: any) => {};
  onTouched = () => {};

  constructor(private eRef: ElementRef) {
    for (let i = 0; i < 24; i++) {
      this.hours.push(('0' + i).slice(-2));
    }
    for (let i = 0; i < 60; i++) {
      this.minutes.push(('0' + i).slice(-2));
    }
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggle() {
    this.isOpen.update(v => !v);
  }

  selectHour(h: string, e: Event) {
    e.stopPropagation();
    this.currentHour = h;
    this.updateValue();
  }

  selectMinute(m: string, e: Event) {
    e.stopPropagation();
    this.currentMinute = m;
    this.updateValue();
  }

  updateValue() {
    this.value = `${this.currentHour}:${this.currentMinute}`;
    this.onChange(this.value);
  }

  closePopup(e: Event) {
    e.stopPropagation();
    // Al dar "OK" cierra y marca como touched
    this.isOpen.set(false);
    this.onTouched();
  }

  get formattedDisplay(): string {
    return this.value ? this.value : '';
  }

  // --- ControlValueAccessor ---
  writeValue(obj: any): void {
    if (obj && typeof obj === 'string' && obj.includes(':')) {
      this.value = obj;
      const parts = obj.split(':');
      this.currentHour = parts[0];
      this.currentMinute = parts[1];
    } else {
      this.value = '';
      this.currentHour = '12';
      this.currentMinute = '00';
    }
  }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
}
