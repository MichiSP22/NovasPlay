import { Component, Output, EventEmitter } from '@angular/core';
import { TermsBodyComponent } from '../../../pages/terms/terms-body';

@Component({
  selector: 'app-terms-modal',
  standalone: true,
  imports: [TermsBodyComponent],
  template: `
    <div class="terms-premium-overlay" (click)="close()">
      <div class="terms-premium-card" (click)="$event.stopPropagation()">
        
        <div class="terms-header">
          <div class="header-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="terms-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <h2 class="terms-title">Terminos y Condiciones</h2>
          </div>
          <button class="close-icon-btn" (click)="close()" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="terms-body">
          <app-terms-body></app-terms-body>
        </div>

        <div class="terms-footer">
          <button class="terms-accept-btn" (click)="accept()">
            <span>Aceptar y Continuar</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .terms-premium-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(5, 8, 13, 0.82);
      backdrop-filter: blur(14px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2147483647;
      animation: fadeIn 0.3s ease-out;
      padding: 20px;
    }

    .terms-premium-card {
      background: linear-gradient(180deg, #141a28, #0b0f18);
      width: 100%;
      max-width: 900px;
      height: 85vh;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.11);
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.65);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      font-family: var(--font-body);
      animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .terms-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 28px;
      background: rgba(255, 255, 255, 0.035);
      border-bottom: 1px solid rgba(255, 255, 255, 0.09);
      position: relative;
      z-index: 10;
      flex-shrink: 0;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .terms-icon {
      color: #e7c873;
    }

    .terms-title {
      margin: 0;
      color: white;
      font-family: var(--font-heading);
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .close-icon-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #8b949e;
      width: 38px; height: 38px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .close-icon-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      transform: rotate(90deg);
    }

    .terms-body {
      flex: 1;
      overflow-y: auto;
      background: #080b12;
      scrollbar-width: thin;
      scrollbar-color: #e7c873 rgba(255,255,255,0.05);
    }
    .terms-body::-webkit-scrollbar { width: 5px; }
    .terms-body::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
    .terms-body::-webkit-scrollbar-thumb {
      background: #e7c873;
      border-radius: 10px;
    }

    .terms-footer {
      padding: 18px 28px;
      display: flex;
      justify-content: flex-end;
      background: rgba(255, 255, 255, 0.035);
      border-top: 1px solid rgba(255, 255, 255, 0.09);
      z-index: 10;
      flex-shrink: 0;
    }

    .terms-accept-btn {
      background: linear-gradient(135deg, #79d7cf, #e7c873);
      color: #081018;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 16px 34px rgba(231, 200, 115, 0.18);
      transition: all 0.3s ease;
    }
    .terms-accept-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 18px 42px rgba(231, 200, 115, 0.24);
    }
    .terms-accept-btn:active { transform: translateY(1px); }

    @keyframes fadeIn {
      from { opacity: 0; backdrop-filter: blur(0px); }
      to { opacity: 1; backdrop-filter: blur(8px); }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @media (max-width: 768px) {
      .terms-premium-card { height: 95vh; border-radius: 12px; }
      .terms-header, .terms-footer { padding: 14px 18px; }
      .terms-accept-btn { width: 100%; justify-content: center; }
    }
  `]
})
export class TermsModalComponent {
  @Output() onClose = new EventEmitter<void>();

  close() { this.onClose.emit(); }
  accept() { this.close(); }
}
