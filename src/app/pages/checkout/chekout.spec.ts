import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Chekout } from './chekout';

describe('Chekout', () => {
  let component: Chekout;
  let fixture: ComponentFixture<Chekout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Chekout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Chekout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
