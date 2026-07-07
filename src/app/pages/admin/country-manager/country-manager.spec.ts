import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CountryManager } from './country-manager';

describe('CountryManager', () => {
  let component: CountryManager;
  let fixture: ComponentFixture<CountryManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountryManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CountryManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
