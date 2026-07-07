import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductFormModal } from './product-form-modal';

describe('ProductFormModal', () => {
  let component: ProductFormModal;
  let fixture: ComponentFixture<ProductFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductFormModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductFormModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
