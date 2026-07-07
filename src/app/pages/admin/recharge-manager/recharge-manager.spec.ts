import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RechargeManager } from './recharge-manager';

describe('RechargeManager', () => {
  let component: RechargeManager;
  let fixture: ComponentFixture<RechargeManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RechargeManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RechargeManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
