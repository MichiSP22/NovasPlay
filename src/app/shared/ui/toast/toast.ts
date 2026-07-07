import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { NotificationService } from './notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule], 
  templateUrl: './toast.html',
  styleUrl: './toast.css'
})
export class ToastComponent {

  public notificationService = inject(NotificationService); 
  private pausedToasts = new Set<number>();

  isPaused(toastId: number): boolean {
    return this.pausedToasts.has(toastId);
  }

  onToastMouseEnter(toastId: number) {
    this.pausedToasts.add(toastId);
    this.notificationService.pauseToast(toastId);
  }

  onToastMouseLeave(toastId: number) {
    this.pausedToasts.delete(toastId);
    this.notificationService.resumeToast(toastId);
  }
}
