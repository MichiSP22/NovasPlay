import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';

import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  it('should allow server-side rendering to continue', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));

    expect(result).toBeTrue();
  });
});
