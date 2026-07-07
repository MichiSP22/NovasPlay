import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RechargeFormModal } from './recharge-form-modal';

describe('RechargeFormModal', () => {
  let component: RechargeFormModal;
  let fixture: ComponentFixture<RechargeFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RechargeFormModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RechargeFormModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
