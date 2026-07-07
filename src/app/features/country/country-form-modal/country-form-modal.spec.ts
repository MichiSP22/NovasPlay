import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CountryFormModal } from './country-form-modal';

describe('CountryFormModal', () => {
  let component: CountryFormModal;
  let fixture: ComponentFixture<CountryFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountryFormModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CountryFormModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
