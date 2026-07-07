import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoinFormModal } from './coin-form-modal';

describe('CoinFormModal', () => {
  let component: CoinFormModal;
  let fixture: ComponentFixture<CoinFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoinFormModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoinFormModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
