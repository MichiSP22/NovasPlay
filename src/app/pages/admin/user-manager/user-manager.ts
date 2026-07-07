import { Component, OnInit, OnChanges, SimpleChanges, inject, signal, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, User } from '../../../entities/user';
import { Output, EventEmitter } from '@angular/core';
import { SearchRequest } from '../../../core/http/http.models';
import { ResponsiveService } from '../../../core/platform/responsive.service';
import { NotificationService } from '../../../shared/ui/toast/notification.service';
import { FormsModule } from '@angular/forms';
import { Subject, Observable, forkJoin, debounceTime } from 'rxjs';

@Component({
  selector: 'app-user-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-manager.html',
  styleUrl: './user-manager.css'
})
export class UserManagerComponent implements OnInit, OnChanges {
  private userService = inject(UserService);
  private responsiveService = inject(ResponsiveService);
  private notify = inject(NotificationService);

  users = signal<User[]>([]);
  loading = signal<boolean>(false);
  currentUser = signal<User | null>(null);

  // Custom confirm modal state
  showConfirmModal = signal<boolean>(false);
  confirmAction = signal<'ban' | 'unban' | 'assignSupport' | 'removeSupport' | null>(null);
  userToPerformAction = signal<User | null>(null);

  @Output() viewOrders = new EventEmitter<string>();
  @Input() filterName: { firstName: string, lastName: string } | null = null;

  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Filtro de búsqueda local
  searchTerm: string = '';
  private filterSubject = new Subject<void>();

  constructor() {
    this.filterSubject.pipe(debounceTime(350)).subscribe(() => {
      this.currentPage.set(1);
      this.loadUsers();
    });
  }

  ngOnInit() {
    this.updatePageSize(false);
    if (this.responsiveService.isBrowser) {
      // Obtener usuario actual para roles
      this.userService.getMe().subscribe({
        next: (res) => {
          if (res.success && res.value) {
            this.currentUser.set(res.value);
          }
        }
      });

      // Si viene con filtro externo, aplicarlo
      if (this.filterName) {
        this.searchTerm = [this.filterName.firstName, this.filterName.lastName].filter(Boolean).join(' ').trim();
      }
      this.loadUsers();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['filterName'] && !changes['filterName'].firstChange) {
      if (this.filterName) {
        this.searchTerm = [this.filterName.firstName, this.filterName.lastName].filter(Boolean).join(' ').trim();
      } else {
        this.searchTerm = '';
      }
      this.currentPage.set(1);
      this.loadUsers();
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.responsiveService.run(() => this.updatePageSize(true));
  }

  updatePageSize(reload: boolean) {
    const width = this.responsiveService.screenWidth();
    let newSize = 15;
    if (width < 768) newSize = 5;
    else if (width < 1024) newSize = 10;

    if (this.pageSize() !== newSize) {
      this.pageSize.set(newSize);
      this.currentPage.set(1);
      if (reload) this.loadUsers();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadUsers();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadUsers();
    }
  }

  onFilterChange() {
    // Si el usuario edita manualmente, limpiar el filtro de navegación
    this.filterName = null;
    this.filterSubject.next();
  }

  isHighlighted(usr: User): boolean {
    if (!this.searchTerm.trim()) return false;
    const term = this.searchTerm.trim().toLowerCase();
    const fullName = `${usr.firstName || ''} ${usr.lastName || ''}`.toLowerCase();
    return fullName.includes(term);
  }

  clearSearch() {
    this.searchTerm = '';
    this.filterName = null;
    this.currentPage.set(1);
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);

    const hasSearch = !!(this.searchTerm.trim() ||
      (this.filterName && (this.filterName.firstName || this.filterName.lastName)));

    if (hasSearch) {
      // El backend ignora Filters y tiene max pageSize=100.
      // Traemos todas las páginas para filtrar localmente.
      this.fetchAllUsersAndFilter();
    } else {
      this.fetchPagedUsers();
    }
  }

  private fetchPagedUsers() {
    const searchCriteria: Partial<SearchRequest> = {
      pageNumber: this.currentPage(),
      pageSize: this.pageSize(),
      filters: []
    };

    this.userService.search(searchCriteria).subscribe({
      next: (res: any) => {
        if (res?.success && res.value) {
          const rawItems = res.value.items || res.value || [];
          const mapped = this.mapUsers(rawItems);
          this.users.set(mapped);
          this.totalItems.set(res.value.totalItems || mapped.length);
          this.totalPages.set(res.value.totalPages || 1);
        } else {
          this.users.set([]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.users.set([]);
      }
    });
  }

  private fetchAllUsersAndFilter() {
    // Primera petición para saber cuántas páginas hay
    this.userService.search({ pageNumber: 1, pageSize: 100, filters: [] }).subscribe({
      next: (firstRes: any) => {
        if (!firstRes?.success || !firstRes.value) {
          this.users.set([]);
          this.loading.set(false);
          return;
        }

        const firstItems = firstRes.value.items || [];
        const totalPages = firstRes.value.totalPages || 1;

        if (totalPages <= 1) {
          // Solo hay 1 página, filtrar directamente
          this.applyLocalFilter(this.mapUsers(firstItems));
          return;
        }

        // Hay más páginas, traerlas todas en paralelo
        const allMapped = this.mapUsers(firstItems);
        const remaining: Observable<any>[] = [];

        for (let p = 2; p <= totalPages; p++) {
          remaining.push(this.userService.search({ pageNumber: p, pageSize: 100, filters: [] }));
        }

        forkJoin(remaining).subscribe({
          next: (responses: any[]) => {
            for (const res of responses) {
              if (res?.success && res.value) {
                const items = res.value.items || [];
                allMapped.push(...this.mapUsers(items));
              }
            }
            this.applyLocalFilter(allMapped);
          },
          error: () => {
            // Si falla alguna página extra, filtrar con lo que tenemos
            this.applyLocalFilter(allMapped);
          }
        });
      },
      error: () => {
        this.loading.set(false);
        this.users.set([]);
      }
    });
  }

  private mapUsers(rawItems: any[]): User[] {
    return rawItems.map(item => ({
      id: item.UserID || item.Id || item.id || item.userId,
      firstName: item.FirstName || item.firstName || item.name || 'Sin Nombre',
      lastName: item.LastName || item.lastName || '',
      email: item.LoginInfo_Email || item.logininfo_email || 'N/A',
      phone: item.Phone || item.phone || '',
      birth: (item.Birth || item.birth) ? new Date(item.Birth || item.birth).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A',
      role: item.Role || item.role || 'Client',
      isActive: item.IsActive !== undefined ? item.IsActive : (item.isActive !== undefined ? item.isActive : true),
      status: item.LoginInfo_Status !== undefined ? item.LoginInfo_Status : (item.logininfo_status !== undefined ? item.logininfo_status : 0)
    }));
  }

  private applyLocalFilter(allUsers: User[]) {
    let filtered = allUsers;

    if (this.filterName && (this.filterName.firstName || this.filterName.lastName)) {
      filtered = allUsers.filter(u => {
        const firstMatch = !this.filterName!.firstName ||
          (u.firstName || '').toLowerCase().includes(this.filterName!.firstName.toLowerCase());
        const lastMatch = !this.filterName!.lastName ||
          (u.lastName || '').toLowerCase().includes(this.filterName!.lastName.toLowerCase());
        return firstMatch && lastMatch;
      });
    } else if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      filtered = allUsers.filter(u =>
        `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.phone || '').includes(term)
      );
    }

    this.users.set(filtered);
    this.totalItems.set(filtered.length);
    this.totalPages.set(1);
    this.loading.set(false);
  }

  goToOrders(userId: string) {
    this.viewOrders.emit(userId);
  }

  toggleBan(usr: User) {
    const isBanned = usr.status === 3;
    this.confirmAction.set(isBanned ? 'unban' : 'ban');
    this.userToPerformAction.set(usr);
    this.showConfirmModal.set(true);
  }

  toggleSupport(usr: User) {
    const isSupport = usr.role === 'Support';
    this.confirmAction.set(isSupport ? 'removeSupport' : 'assignSupport');
    this.userToPerformAction.set(usr);
    this.showConfirmModal.set(true);
  }

  closeConfirmModal() {
    this.showConfirmModal.set(false);
    this.confirmAction.set(null);
    this.userToPerformAction.set(null);
  }

  executeConfirm() {
    const action = this.confirmAction();
    const usr = this.userToPerformAction();

    if (!action || !usr) {
      this.closeConfirmModal();
      return;
    }

    if (action === 'unban') {
      this.userService.unbanUser(usr.id).subscribe({
        next: (res) => {
          if (res.success) {
            usr.status = 0;
            this.users.update(u => [...u]);
            this.notify.show('success', 'Usuario desbaneado exitosamente');
          } else {
            this.notify.show('error', 'Error al desbanear usuario: ' + (res as any).message);
          }
        },
        error: () => this.notify.show('error', 'Error de red al intentar desbanear')
      });
    } else if (action === 'ban') {
      this.userService.banUser(usr.id).subscribe({
        next: (res) => {
          if (res.success) {
            usr.status = 3;
            this.users.update(u => [...u]);
            this.notify.show('success', 'Usuario baneado exitosamente');
          } else {
            this.notify.show('error', 'Error al banear usuario: ' + (res as any).message);
          }
        },
        error: () => this.notify.show('error', 'Error de red al intentar banear')
      });
    } else if (action === 'removeSupport') {
      this.userService.removeSupport(usr.id).subscribe({
        next: (res) => {
          if (res.success) {
            usr.role = 'Client'; // Actualización optimista
            this.users.update(u => [...u]);
            this.notify.show('success', 'Rol de soporte removido exitosamente');
          } else {
            this.notify.show('error', 'Error al remover rol de soporte');
          }
        },
        error: () => this.notify.show('error', 'Error de red al intentar remover rol de soporte')
      });
    } else if (action === 'assignSupport') {
      this.userService.assignSupport(usr.id).subscribe({
        next: (res) => {
          if (res.success) {
            usr.role = 'Support'; // Actualización optimista
            this.users.update(u => [...u]);
            this.notify.show('success', 'Rol de soporte asignado exitosamente');
          } else {
            this.notify.show('error', 'Error al asignar rol de soporte');
          }
        },
        error: () => this.notify.show('error', 'Error de red al intentar asignar rol de soporte')
      });
    }

    this.closeConfirmModal();
  }
}

