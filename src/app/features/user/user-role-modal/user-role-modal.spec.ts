import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserRoleModalComponent } from './user-role-modal';

describe('UserRoleModalComponent', () => {
  let component: UserRoleModalComponent;
  let fixture: ComponentFixture<UserRoleModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserRoleModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserRoleModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
