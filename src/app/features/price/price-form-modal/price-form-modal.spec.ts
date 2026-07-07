import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PriceFormModal } from './price-form-modal';

describe('PriceFormModal', () => {
  let component: PriceFormModal;
  let fixture: ComponentFixture<PriceFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriceFormModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PriceFormModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
