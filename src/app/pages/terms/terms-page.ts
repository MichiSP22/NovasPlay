import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { TermsBodyComponent } from './terms-body';

@Component({
  selector: 'app-terms-page',
  standalone: true,
  imports: [TermsBodyComponent],
  template: `
    <div class="terms-page-wrapper">
      <div class="terms-topbar">
        <div class="topbar-brand">
          <span class="brand-dot"></span>
          <span>NeoCharge</span>
        </div>
        <button class="back-btn" (click)="goBack()">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Volver
        </button>
      </div>
      <div class="terms-scroll">
        <app-terms-body></app-terms-body>
      </div>
    </div>
  `,
  styles: [`
    .terms-page-wrapper {
      min-height: 100vh;
      background: #070711;
      color: #c9d1e0;
      font-family: 'Plus Jakarta Sans', sans-serif;
      display: flex;
      flex-direction: column;
    }
    .terms-topbar {
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 32px;
      background: rgba(7, 7, 17, 0.95);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(0, 212, 255, 0.15);
    }
    .topbar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'Orbitron', sans-serif;
      font-weight: 700;
      font-size: 1.1rem;
      color: #fff;
      letter-spacing: 1px;
    }
    .brand-dot {
      width: 10px; height: 10px;
      background: #00d4ff;
      border-radius: 50%;
      box-shadow: 0 0 10px #00d4ff;
    }
    .back-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      color: #fff;
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .back-btn:hover {
      background: rgba(0, 212, 255, 0.1);
      border-color: #00d4ff;
      color: #00d4ff;
    }
    .terms-scroll {
      flex: 1;
      overflow-y: auto;
    }
  `]
})
export class TermsPageComponent {
  constructor(private location: Location) {}
  goBack() { this.location.back(); }
}
