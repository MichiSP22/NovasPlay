import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderStatusModalComponent } from './order-status-modal';

describe('OrderStatusModalComponent', () => {
  let component: OrderStatusModalComponent;
  let fixture: ComponentFixture<OrderStatusModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderStatusModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderStatusModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
