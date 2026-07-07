import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, forwardRef, Input, Output, computed, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-cyber-datepicker, app-cyber-date-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cyber-datepicker.html',
  styleUrl: './cyber-datepicker.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CyberDatepicker),
      multi: true
    }
  ]
})
export class CyberDatepicker implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Selecciona una fecha';
  @Input() min = '1900-01-01';
  @Input() max = '2099-12-31';
  @Input() id = '';
  @Input() name = '';
  @Input() required = false;
  @Input() cssClass = '';
  @Output() dateChange = new EventEmitter<string>();
  @Output() selectedDateChange = new EventEmitter<string>();
  @Output() valueChange = new EventEmitter<string>();

  @Input() set minDate(value: string | Date | null) {
    const normalized = this.normalizeValue(value);
    if (normalized) this.min = normalized;
  }

  @Input() set maxDate(value: string | Date | null) {
    const normalized = this.normalizeValue(value);
    if (normalized) this.max = normalized;
  }

  @Input() set date(value: string | Date | null) {
    this.setInternalValue(this.normalizeValue(value), false);
  }

  @Input() set selectedDate(value: string | Date | null) {
    this.setInternalValue(this.normalizeValue(value), false);
  }

  @Input() set value(value: string | Date | null) {
    this.setInternalValue(this.normalizeValue(value), false);
  }

  @Input() set disabled(value: boolean | string) {
    this.isDisabled.set(value === true || value === 'true');
  }

  currentValue = signal('');
  selectedYear = signal('');
  selectedMonth = signal('');
  selectedDay = signal('');
  isDisabled = signal(false);
  showPicker = signal(false);
  calendarView = signal(new Date());
  weekDays = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];

  monthOptions = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ];

  yearOptions = computed(() => {
    const minYear = this.extractYear(this.min, 1900);
    const maxYear = this.extractYear(this.max, 2099);
    const selected = Number(this.selectedYear());
    const selectedYear = Number.isFinite(selected) && selected > 0 ? selected : minYear;
    const from = Math.min(minYear, maxYear, selectedYear);
    const to = Math.max(minYear, maxYear, selectedYear);
    const years: number[] = [];

    for (let year = to; year >= from; year--) {
      years.push(year);
    }

    return years;
  });

  dayOptions = computed(() => {
    const year = Number(this.selectedYear()) || 2000;
    const month = Number(this.selectedMonth()) || 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => String(index + 1).padStart(2, '0'));
  });

  calendarDays = computed(() => {
    const view = this.calendarView();
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstDay = new Date(year, month, 1);
    const start = new Date(year, month, 1 - firstDay.getDay());
    const selected = this.currentValue();

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const value = this.toDateValue(date);
      return {
        day: date.getDate(),
        value,
        inMonth: date.getMonth() === month,
        isSelected: value === selected
      };
    });
  });

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | Date | null): void {
    this.setInternalValue(this.normalizeValue(value), false);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  updateValue(value: string) {
    this.setInternalValue(value, true);
  }

  togglePicker(event?: Event) {
    event?.stopPropagation();
    if (this.isDisabled()) return;
    this.syncCalendarToValue();
    this.showPicker.update((value) => !value);
  }

  previousMonth() {
    const view = this.calendarView();
    this.calendarView.set(new Date(view.getFullYear(), view.getMonth() - 1, 1));
  }

  nextMonth() {
    const view = this.calendarView();
    this.calendarView.set(new Date(view.getFullYear(), view.getMonth() + 1, 1));
  }

  changeCalendarYear(year: string | number) {
    const view = this.calendarView();
    this.calendarView.set(new Date(Number(year), view.getMonth(), 1));
  }

  selectDate(value: string) {
    this.setInternalValue(value, true);
    this.showPicker.set(false);
    this.markTouched();
  }

  clearDate(event?: Event) {
    event?.stopPropagation();
    this.setInternalValue('', true);
    this.markTouched();
  }

  displayLabel() {
    const value = this.currentValue();
    if (!value) return this.placeholder;
    const [year, month, day] = value.split('-');
    return `${day} / ${month} / ${year}`;
  }

  calendarMonthName() {
    return this.monthOptions[this.calendarView().getMonth()]?.label || '';
  }

  updateDatePart(part: 'year' | 'month' | 'day', value: string) {
    if (part === 'year') this.selectedYear.set(value);
    if (part === 'month') this.selectedMonth.set(value);
    if (part === 'day') this.selectedDay.set(value);

    const lastDay = this.dayOptions()[this.dayOptions().length - 1] || '';
    if (this.selectedDay() && lastDay && Number(this.selectedDay()) > Number(lastDay)) {
      this.selectedDay.set(lastDay);
    }

    if (!this.selectedYear() || !this.selectedMonth() || !this.selectedDay()) {
      this.setInternalValue('', true, false);
      return;
    }

    this.setInternalValue(`${this.selectedYear()}-${this.selectedMonth()}-${this.selectedDay()}`, true, false);
  }

  markTouched() {
    this.onTouched();
  }

  @HostListener('document:click')
  closePicker() {
    this.showPicker.set(false);
  }

  private setInternalValue(value: string, emit: boolean, syncParts = true) {
    this.currentValue.set(value);

    if (syncParts) {
      const parts = value ? value.split('-') : [];
      this.selectedYear.set(parts[0] || '');
      this.selectedMonth.set(parts[1] || '');
      this.selectedDay.set(parts[2] || '');
      this.syncCalendarToValue();
    }

    if (!emit) return;

    this.onChange(value);
    this.dateChange.emit(value);
    this.selectedDateChange.emit(value);
    this.valueChange.emit(value);
  }

  private normalizeValue(value: string | Date | null): string {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return value.slice(0, 10);
  }

  private extractYear(value: string, fallback: number): number {
    const year = Number((value || '').slice(0, 4));
    return Number.isFinite(year) && year > 0 ? year : fallback;
  }

  private syncCalendarToValue() {
    const value = this.currentValue();
    if (value) {
      const [year, month] = value.split('-').map(Number);
      if (year && month) {
        this.calendarView.set(new Date(year, month - 1, 1));
        return;
      }
    }

    const today = new Date();
    const year = this.clamp(today.getFullYear(), this.extractYear(this.min, 1900), this.extractYear(this.max, 2099));
    this.calendarView.set(new Date(year, today.getMonth(), 1));
  }

  private toDateValue(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }
}

export {
  CyberDatepicker as CyberDatepickerComponent,
  CyberDatepicker as CyberDatePicker,
  CyberDatepicker as CyberDatePickerComponent
};
