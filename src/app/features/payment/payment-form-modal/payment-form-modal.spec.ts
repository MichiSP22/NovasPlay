import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentFormModal } from './payment-form-modal';

describe('PaymentFormModal', () => {
  let component: PaymentFormModal;
  let fixture: ComponentFixture<PaymentFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentFormModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentFormModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
