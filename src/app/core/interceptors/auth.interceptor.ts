import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const userLanguage =
    typeof navigator !== 'undefined' && navigator.language
      ? navigator.language
      : 'es';
  const userTimeZone =
    typeof Intl !== 'undefined' && Intl.DateTimeFormat
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC';

  const headersToSet: Record<string, string> = {
    'Accept-Language': userLanguage,
    'Time-Zone': userTimeZone,
  };
  const authReq = req.clone({
    setHeaders: headersToSet,
  });

  return next(authReq);
};
