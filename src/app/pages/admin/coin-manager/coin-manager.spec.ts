import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoinManager } from './coin-manager';

describe('CoinManager', () => {
  let component: CoinManager;
  let fixture: ComponentFixture<CoinManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoinManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoinManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
