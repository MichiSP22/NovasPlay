import { Component, Input, Output, EventEmitter, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { TermsModalComponent } from '../terms-modal/terms-modal';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../shared/ui/toast/notification.service';
import { RegisterRequest, LoginRequest } from '../../../core/auth/auth.model';
import { GenericResponse } from '../../../core/http/http.models';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Country {
  name: string;
  code: string;
  flag: string;
}

interface CalendarDay {
  day: number;
  value: string;
  inMonth: boolean;
  isSelected: boolean;
}

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TermsModalComponent],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth implements OnInit {
  private fb = inject(FormBuilder);
  private cd = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  authNotice = this.authService.authModalNotice;

  isRecoveryMode = false;
  recoveryStep = 1;
  showTermsModal = false;
  showCountryList = false;
  showPassword = false;
  showConfirmPassword = false;
  showBirthdayPicker = false;

  searchQuery = '';
  filteredCountries: Country[] = [];
  allCountries: Country[] = [];
  defaultCountry: Country = { code: '+58', flag: 'https://flagcdn.com/w40/ve.png', name: 'Venezuela' };
  calendarView = new Date(new Date().getFullYear() - 16, new Date().getMonth(), 1);
  readonly weekDays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

  readonly birthdayMonthOptions = [
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
    { value: '12', label: 'Diciembre' },
  ];

  @Input() isLogin = true;
  @Output() onClose = new EventEmitter<void>();

  authForm: FormGroup;

  constructor() {
    this.authForm = this.fb.group({
      firstName: [''],
      lastName: [''],
      username: [''],
      password: [''],
      confirmPassword: [''],
      email: [''],
      recoveryCode: [''],
      countryPrefix: ['+58'],
      phone: [''],
      birthday: [''],
      rememberMe: [false],
      acceptTerms: [false],
    });
  }

  ngOnInit() {
    this.loadCountries();
    this.updateValidators();
  }

  openTermsModal(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.showTermsModal = true;
  }

  private loadCountries() {
    fetch('https://restcountries.com/v3.1/all?fields=name,idd,flags')
      .then((res) => res.json())
      .then((data) => {
        this.allCountries = data
          .filter((c: any) => c.idd.root)
          .map((c: any) => ({
            name: c.name.common,
            code: (c.idd.root || '') + (c.idd.suffixes ? c.idd.suffixes[0] : ''),
            flag: c.flags.png,
          }))
          .sort((a: Country, b: Country) => a.name.localeCompare(b.name));

        this.filteredCountries = [...this.allCountries];
        this.cd.detectChanges();
      })
      .catch(() => {
        this.allCountries = [this.defaultCountry];
        this.filteredCountries = [this.defaultCountry];
      });
  }

  toggleCountryList() {
    this.showCountryList = !this.showCountryList;
    this.showBirthdayPicker = false;
    if (!this.showCountryList) {
      this.searchQuery = '';
      this.filteredCountries = [...this.allCountries];
    }
  }

  filterCountries() {
    const query = this.searchQuery.toLowerCase();
    this.filteredCountries = this.allCountries.filter(
      (country) => country.name.toLowerCase().includes(query) || country.code.includes(query)
    );
  }

  selectCountry(country: Country) {
    this.authForm.get('countryPrefix')?.setValue(country.code);
    this.showCountryList = false;
    this.searchQuery = '';
    this.filteredCountries = [...this.allCountries];
  }

  private updateValidators() {
    const controls = this.authForm.controls;
    Object.keys(controls).forEach((key) => controls[key].clearValidators());

    if (this.isRecoveryMode) {
      if (this.recoveryStep === 1) {
        controls['email'].setValidators([Validators.required, Validators.email]);
      } else if (this.recoveryStep === 2) {
        controls['recoveryCode'].setValidators([Validators.required]);
      } else if (this.recoveryStep === 3) {
        controls['password'].setValidators([Validators.required]);
        controls['confirmPassword'].setValidators([Validators.required]);
      }
    } else if (this.isLogin) {
      controls['username'].setValidators([Validators.required]);
      controls['password'].setValidators([Validators.required]);
    } else {
      ['firstName', 'lastName', 'username', 'password', 'confirmPassword', 'phone', 'birthday'].forEach((key) => {
        controls[key].setValidators([Validators.required]);
      });
      controls['email'].setValidators([Validators.required, Validators.email]);
      controls['acceptTerms'].setValidators([Validators.requiredTrue]);
    }

    Object.keys(controls).forEach((key) => controls[key].updateValueAndValidity({ emitEvent: false }));
  }

  toggleMode() {
    this.isRecoveryMode = false;
    this.recoveryStep = 1;
    this.isLogin = !this.isLogin;
    this.showBirthdayPicker = false;
    this.authForm.reset({ countryPrefix: '+58', rememberMe: false, acceptTerms: false });
    this.updateValidators();
    this.cd.detectChanges();
  }

  forgotPassword() {
    this.isRecoveryMode = true;
    this.recoveryStep = 1;
    this.isLogin = false;
    this.showBirthdayPicker = false;
    this.authForm.reset({ countryPrefix: '+58', rememberMe: false });
    this.updateValidators();
  }

  get birthdayYearOptions() {
    const maxYear = new Date().getFullYear() - 16;
    return Array.from({ length: maxYear - 1900 + 1 }, (_, index) => String(maxYear - index));
  }

  get birthdayLabel() {
    const value = this.authForm.get('birthday')?.value;
    if (!value) return 'dd / mm / aaaa';
    const [year, month, day] = String(value).split('-');
    return `${day} / ${month} / ${year}`;
  }

  get calendarMonthName() {
    return this.birthdayMonthOptions[this.calendarView.getMonth()]?.label || '';
  }

  get calendarDays(): CalendarDay[] {
    const year = this.calendarView.getFullYear();
    const month = this.calendarView.getMonth();
    const firstDay = new Date(year, month, 1);
    const start = new Date(year, month, 1 - firstDay.getDay());
    const selected = this.authForm.get('birthday')?.value;

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const value = this.toDateValue(date);
      return {
        day: date.getDate(),
        value,
        inMonth: date.getMonth() === month,
        isSelected: value === selected,
      };
    });
  }

  toggleBirthdayPicker(event?: Event) {
    event?.stopPropagation();
    this.showCountryList = false;
    this.showBirthdayPicker = !this.showBirthdayPicker;
    if (this.showBirthdayPicker) this.syncCalendarToBirthday();
  }

  previousMonth() {
    this.calendarView = new Date(this.calendarView.getFullYear(), this.calendarView.getMonth() - 1, 1);
  }

  nextMonth() {
    this.calendarView = new Date(this.calendarView.getFullYear(), this.calendarView.getMonth() + 1, 1);
  }

  changeCalendarYear(year: string) {
    this.calendarView = new Date(Number(year), this.calendarView.getMonth(), 1);
  }

  selectBirthday(value: string) {
    this.authForm.get('birthday')?.setValue(value);
    this.authForm.get('birthday')?.markAsTouched();
    this.showBirthdayPicker = false;
  }

  clearBirthday(event?: Event) {
    event?.stopPropagation();
    this.authForm.get('birthday')?.setValue('');
    this.authForm.get('birthday')?.markAsTouched();
  }

  private syncCalendarToBirthday() {
    const value = this.authForm.get('birthday')?.value;
    if (!value) return;
    const [year, month] = String(value).split('-').map(Number);
    if (year && month) this.calendarView = new Date(year, month - 1, 1);
  }

  private toDateValue(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  submit() {
    if (this.authForm.invalid) {
      this.authForm.markAllAsTouched();
      this.notify.show('error', 'Por favor, rellena los campos requeridos');
      return;
    }

    const val = this.authForm.value;

    if (this.isRecoveryMode) {
      this.handleRecovery(val);
      return;
    }

    if (this.isLogin) {
      const loginData: LoginRequest = {
        identifier: val.username,
        password: val.password,
        refreshToken: val.rememberMe,
      };

      this.authService.login(loginData).subscribe({
        next: (response: GenericResponse<string>) => {
          const token = response?.value;
          if (token) {
            localStorage.setItem('token', token);
            localStorage.setItem('CookieTokenClaims', token);
          }
          const returnPath = this.authService.consumeAuthReturnPath();
          this.close();
          this.authService.authChanged.next();
          if (returnPath) {
            this.router.navigateByUrl(returnPath);
          }
        },
        error: () => {},
      });
    } else {
      if (val.password !== val.confirmPassword) {
        this.notify.show('error', 'Las contrasenas no coinciden');
        return;
      }

      const registerData: RegisterRequest = {
        firstName: val.firstName,
        lastName: val.lastName,
        phone: `${val.countryPrefix} ${val.phone}`,
        birth: val.birthday ? new Date(val.birthday).toISOString().split('T')[0] : '',
        username: val.username,
        email: val.email,
        password: val.password,
        suscribedToNewsletter: true,
      };

      this.authService.register(registerData).subscribe({
        next: () => {
          this.toggleMode();
        },
        error: () => {},
      });
    }
  }

  private handleRecovery(val: any) {
    if (this.recoveryStep === 1) {
      this.authService.forgotPassword(val.email).subscribe({
        next: () => {
          this.recoveryStep = 2;
          this.updateValidators();
        },
        error: () => {},
      });
    } else if (this.recoveryStep === 2) {
      this.authService.resetPassword(val.recoveryCode).subscribe({
        next: () => {
          this.recoveryStep = 3;
          this.updateValidators();
        },
        error: () => {},
      });
    } else if (this.recoveryStep === 3) {
      if (val.password !== val.confirmPassword) {
        this.notify.show('error', 'Las contrasenas no coinciden');
        return;
      }

      this.authService.setLostPassword(val.password).subscribe({
        next: () => {
          this.notify.show('success', 'Contrasena restablecida correctamente');
          this.toggleMode();
        },
        error: () => {},
      });
    }
  }

  getSelectedCountry(): Country {
    const prefix = this.authForm.get('countryPrefix')?.value;
    return this.allCountries.find((c) => c.code === prefix) || this.defaultCountry;
  }

  loginWithGoogle() {
    this.authService.loginWithGoogle();
  }

  close() {
    this.onClose.emit();
  }
}
