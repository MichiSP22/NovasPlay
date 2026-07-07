import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';

const HOME_ROUTE = '/';
const CLAIMS_KEY = 'CookieTokenClaims';
const LEGACY_TOKEN_KEY = 'token';
const ROLE_CLAIM_URI = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
const ALLOWED_ADMIN_ROLES = new Set(['administrator', 'admin', 'root', 'support']);
const ROLE_SPLIT_PATTERN = /[,\s;|]+/;

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const getClaims = (): string | null => {
    if (typeof window === 'undefined') {
      return null;
    }

    const claims = localStorage.getItem(CLAIMS_KEY);
    if (claims) {
      return claims;
    }

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${CLAIMS_KEY}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }

    return localStorage.getItem(LEGACY_TOKEN_KEY);
  };

  try {
    let tokenClaims = getClaims();
    if (!tokenClaims) {
      router.navigate([HOME_ROUTE]);
      return false;
    }

    tokenClaims = decodeURIComponent(tokenClaims);

    let jsonString: string;
    if (tokenClaims.includes('.')) {
      const payload = tokenClaims.split('.')[1];
      jsonString = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    } else {
      jsonString = atob(tokenClaims);
    }

    const userData = JSON.parse(jsonString);
    const roleClaim =
      userData.Role ??
      userData.role ??
      userData.roles ??
      userData[ROLE_CLAIM_URI];

    const roleList = (Array.isArray(roleClaim) ? roleClaim : [roleClaim])
      .filter(Boolean)
      .flatMap((r) => String(r).split(ROLE_SPLIT_PATTERN))
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean);

    if (roleList.some((role) => ALLOWED_ADMIN_ROLES.has(role))) {
      return true;
    }

    router.navigate([HOME_ROUTE]);
    return false;
  } catch {
    router.navigate([HOME_ROUTE]);
    return false;
  }
};
