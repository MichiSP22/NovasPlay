import { Component, Output, EventEmitter, inject, signal, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { UserService, User } from '../../entities/user';
import { CountryService, Country } from '../../entities/country';
import { ApiService } from '../../core/http/api.service';
import { NotificationService } from '../../shared/ui/toast/notification.service';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { CartService } from '../../core/state/cart.service';
import { ResponsiveService } from '../../core/platform/responsive.service';
import { NoCachePipe } from '../../shared/pipes/no-cache.pipe';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, NoCachePipe],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  @Output() onOpenAuth = new EventEmitter<'login' | 'register'>();
  private router = inject(Router);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private countryService = inject(CountryService);
  private apiService = inject(ApiService);
  private notify = inject(NotificationService);
  public cartService = inject(CartService);
  private responsiveService = inject(ResponsiveService);

  hasToken = signal<boolean>(false);
  currentUser = signal<User | null>(null);
  userInitial = signal<string>('');
  isDropdownOpen = signal<boolean>(false);
  isCartOpen = signal<boolean>(false);
  isMobileMenuOpen = signal<boolean>(false);
  isContactModalOpen = signal(false);
  isSubjectMenuOpen = signal(false);
  isCountryMenuOpen = signal(false);
  countries = signal<Country[]>([]);
  selectedCountry = signal<Country | null>(null);
  headerSearch = signal('');
  contactSubjects = [
    'Problema con mi pago',
    'Recarga no recibida',
    'Duda sobre un producto',
    'Otro motivo'
  ];
  
  // Formulario de contacto
  contactData = {
    subject: '',
    message: ''
  };
  
  isSubmittingContact = signal(false);
  

  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }

  toggleContactModal() {
    this.isContactModalOpen.update(val => !val);
    this.isSubjectMenuOpen.set(false);
    if (this.isContactModalOpen()) {
      this.isMobileMenuOpen.set(false);
      this.contactData = { subject: '', message: '' }; // Resetear al cerrar
    }
  }

  toggleSubjectMenu() {
    if (this.isSubmittingContact()) return;
    this.isSubjectMenuOpen.update(val => !val);
  }

  selectContactSubject(subject: string) {
    this.contactData.subject = subject;
    this.isSubjectMenuOpen.set(false);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(val => !val);
    if (this.isMobileMenuOpen()) {
      this.isCartOpen.set(false);
      this.isDropdownOpen.set(false);
      this.isCountryMenuOpen.set(false);
    }
  }

  toggleCountryMenu() {
    this.isCountryMenuOpen.update(val => !val);
    if (this.isCountryMenuOpen()) {
      this.isCartOpen.set(false);
      this.isDropdownOpen.set(false);
    }
  }

  selectCountry(country: Country) {
    this.selectedCountry.set(country);
    this.isCountryMenuOpen.set(false);
    if (this.responsiveService.isBrowser) {
      localStorage.setItem('novasplay_country_iso', country.isoCode);
      window.dispatchEvent(new CustomEvent('novasplay:country-changed', {
        detail: { isoCode: country.isoCode, country }
      }));
    }
  }

  getCountryLabel(country: Country | null): string {
    if (!country) return 'Global';
    return country.isoCode === 'GL' ? 'Global' : country.isoCode.toUpperCase();
  }

  getCountryName(country: Country | null): string {
    return country?.name || 'Global';
  }

  getCountryFlagUrl(country: Country | null): string {
    if (!country || country.isoCode === 'GL') return '';
    return country.imageInfo?.iconURL || country.imageInfo?.imageURL || '';
  }

  onCountryFlagError(event: Event) {
    const image = event.target as HTMLImageElement;
    image.closest('.country-flag-shell')?.classList.add('flag-error');
  }

  submitHeaderSearch(event?: Event) {
    if (event) event.preventDefault();
    const term = this.headerSearch().trim();

    const dispatchSearch = () => {
      this.responsiveService.run(() => {
        window.dispatchEvent(new CustomEvent('novasplay:catalog-search', { detail: term }));
        document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };

    this.isMobileMenuOpen.set(false);
    this.isCountryMenuOpen.set(false);

    if (this.router.url === '/' || this.router.url.startsWith('/?') || this.router.url.startsWith('/#')) {
      dispatchSearch();
      return;
    }

    this.router.navigate(['/']).then(() => {
      this.responsiveService.run(() => window.setTimeout(dispatchSearch, 120));
    });
  }

  enviarContacto(event: Event) {
    event.preventDefault();
    
    if (!this.hasToken()) {
      this.notify.show('error', 'Debes iniciar sesión para poder enviar un mensaje.');
      return;
    }

    if (!this.contactData.subject || !this.contactData.message) {
      this.notify.show('error', 'Por favor completa todos los campos');
      return;
    }

    this.isSubmittingContact.set(true);

    this.apiService.sendContactMessage(this.contactData).subscribe({
      next: () => {
        this.notify.show('success', '¡Mensaje enviado con éxito! Nos contactaremos contigo pronto.');
        this.isContactModalOpen.set(false);
        this.contactData = { subject: '', message: '' };
      },
      error: () => {
        this.notify.show('error', 'Ocurrió un error al enviar el mensaje. Inténtalo de nuevo.');
      },
      complete: () => {
        this.isSubmittingContact.set(false);
      }
    });
  }
  
  goToAdminPanel() {
    this.closeDropdown();
    this.router.navigate(['/admin']); 
  }

  ngOnInit() {
    this.checkToken();
    this.loadCountries();
    this.authService.authChanged.subscribe(() => {
      this.checkToken();
    });
  }

  loadCountries() {
    if (!this.responsiveService.isBrowser) return;

    const fallbackCountries: Country[] = [
      { id: 0, name: 'Global', isoCode: 'GL' },
      { id: 1, name: 'Venezuela', isoCode: 'VE' },
      { id: 2, name: 'Colombia', isoCode: 'CO' },
      { id: 3, name: 'Peru', isoCode: 'PE' },
      { id: 4, name: 'Chile', isoCode: 'CL' },
      { id: 5, name: 'Argentina', isoCode: 'AR' },
      { id: 6, name: 'Estados Unidos', isoCode: 'US' }
    ];

    const savedIso = localStorage.getItem('novasplay_country_iso');

    this.countryService.search({ pageNumber: 1, pageSize: 100, orderByField: 'Name' }).subscribe({
      next: (res) => {
        const items = (res?.value?.items || []) as any[];
        const mapped = items.map(item => {
          const imageURL = this.normalizeAssetUrl(
            item.imageInfo?.imageURL ||
            item.ImageInfo?.ImageURL ||
            item.imageURL ||
            item.ImageURL ||
            item.imageUrl ||
            ''
          );
          const iconURL = this.normalizeAssetUrl(
            item.imageInfo?.iconURL ||
            item.ImageInfo?.IconURL ||
            item.iconURL ||
            item.IconURL ||
            item.iconUrl ||
            ''
          );

          return {
            id: item.id ?? item.Id,
            name: item.name ?? item.Name,
            isoCode: (item.isoCode ?? item.IsoCode ?? '').toString().toUpperCase(),
            imageInfo: imageURL || iconURL ? { imageURL, iconURL } : undefined
          };
        }).filter(country => country.name && country.isoCode);

        const available = mapped.length ? [{ id: 0, name: 'Global', isoCode: 'GL' }, ...mapped] : fallbackCountries;
        this.countries.set(available);
        this.selectedCountry.set(available.find(country => country.isoCode === savedIso) || available[0]);
      },
      error: () => {
        this.countries.set(fallbackCountries);
        this.selectedCountry.set(fallbackCountries.find(country => country.isoCode === savedIso) || fallbackCountries[0]);
      }
    });
  }

  private normalizeAssetUrl(value: string): string {
    let cleanUrl = (value || '').trim();
    if (!cleanUrl) return '';

    cleanUrl = cleanUrl.replace(/^https?:\/\/(https?:\/\/)?/, 'https://');
    if (cleanUrl.startsWith('https//')) cleanUrl = 'https://' + cleanUrl.slice(7);
    cleanUrl = cleanUrl.replace('.dev//', '.dev/');

    return cleanUrl;
  }

  checkToken() {
    if (this.responsiveService.isBrowser) {
      // Prioridad 1: localStorage (Evita restricciones de dominio/HttpOnly en Cloudflare)
      let token = localStorage.getItem('CookieTokenClaims');
      
      // Prioridad 2: Cookie nativa (Retrocompatibilidad o localhost)
      if (!token) {
        token = this.getCookie('CookieTokenClaims');
      }
      
      // Prioridad 3: localStorage 'token' (Legacy)
      if (!token) {
        token = localStorage.getItem('token');
      }
      
      if (token) {
        this.hasToken.set(true);
        this.userService.getMe().subscribe({
          next: (res) => {
            if (res.success && res.value) {
              this.currentUser.set(res.value);
              this.userInitial.set(res.value.firstName ? res.value.firstName.charAt(0).toUpperCase() : 'U');
            }
          },
          error: () => {
             // En lugar de hacer un logout forzado, solo desmarcamos visualmente la sesión.
             this.hasToken.set(false);
             this.currentUser.set(null);
          }
        });
      } else {
        this.hasToken.set(false);
      }
    }
  }

  toggleDropdown() {
    this.isDropdownOpen.set(!this.isDropdownOpen());
    if (this.isDropdownOpen()) {
      this.isCartOpen.set(false);
      this.isMobileMenuOpen.set(false);
      this.isCountryMenuOpen.set(false);
    }
  }

  closeDropdown() {
    this.isDropdownOpen.set(false);
  }

  getAccountName(): string {
    const user = this.currentUser();
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    return fullName || user?.email || 'Mi cuenta';
  }

  getRoleLabel(): string {
    const role = this.currentUser()?.role;
    if (role === 'Root') return 'Root';
    if (role === 'Administrator') return 'Admin';
    if (role === 'Support') return 'Soporte';
    return 'Cliente';
  }

  canAccessAdmin(): boolean {
    return ['Administrator', 'Root', 'Support'].includes(this.currentUser()?.role || '');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const targetElement = event.target as HTMLElement;
    if (
      targetElement &&
      !targetElement.closest('.cart-dropdown-container') &&
      !targetElement.closest('.cart-drawer-panel')
    ) {
      this.isCartOpen.set(false);
    }
    if (targetElement && !targetElement.closest('.nav-links-container') && !targetElement.closest('.menu-toggle-btn')) {
      this.isMobileMenuOpen.set(false);
    }
    if (targetElement && !targetElement.closest('.contact-subject-picker')) {
      this.isSubjectMenuOpen.set(false);
    }
    if (targetElement && !targetElement.closest('.country-selector')) {
      this.isCountryMenuOpen.set(false);
    }
    if (targetElement && !targetElement.closest('.profile-dropdown-container')) {
      this.isDropdownOpen.set(false);
    }
  }

  toggleCart() {
    this.isCartOpen.set(!this.isCartOpen());
    if (this.isCartOpen()) {
      this.closeDropdown();
      this.isMobileMenuOpen.set(false);
      this.isCountryMenuOpen.set(false);
    }
  }

  closeCart() {
    this.isCartOpen.set(false);
  }
  processCart() {
    this.isCartOpen.set(false);

    if (!this.authService.hasSession()) {
      this.authService.openAuth(
        'register',
        'Crea tu cuenta para finalizar esta compra. Tu carrito sigue guardado y avanzaras al pago al iniciar sesion.',
        '/cart-checkout'
      );
      return;
    }

    this.router.navigate(['/cart-checkout']);
  }
  goHomeTop(event?: Event) {
    if (event) event.preventDefault();
    this.isMobileMenuOpen.set(false);
    this.isCartOpen.set(false);

    if (this.router.url === '/' || this.router.url.startsWith('/?') || this.router.url.startsWith('/#')) {
      this.responsiveService.run(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      return;
    }

    this.router.navigate(['/']).then(() => {
      setTimeout(() => {
        this.responsiveService.run(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }, 50);
    });
  }

  openAuth(mode: 'login' | 'register') {
    this.onOpenAuth.emit(mode);
  }

  goToProfile() {
    this.closeDropdown();
    this.router.navigate(['/profile'], { queryParams: { tab: 'datos' } });
  }

  goToOrders() {
    this.closeDropdown();
    this.router.navigate(['/profile'], { queryParams: { tab: 'ordenes' } });
  }

 logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.limpiarSesion();
      },
      error: (err) => {
        console.error('Error al cerrar sesión en el servidor', err);
        this.limpiarSesion();
      }
    });
  }

  
  private limpiarSesion() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('CookieTokenClaims');
    }
    this.hasToken.set(false);
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  scrollToCatalog() {
    const element = document.getElementById('catalog-section');
    
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.isMobileMenuOpen.set(false);
    } else {
      this.router.navigate(['/']).then(() => {
        setTimeout(() => {
          const newElement = document.getElementById('catalog-section');
          if (newElement) {
            newElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      });
    }
  }
}
