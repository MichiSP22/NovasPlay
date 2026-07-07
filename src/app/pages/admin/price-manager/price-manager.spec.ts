import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PriceManager } from './price-manager';

describe('PriceManager', () => {
  let component: PriceManager;
  let fixture: ComponentFixture<PriceManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriceManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PriceManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
