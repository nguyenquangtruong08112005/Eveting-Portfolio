import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { routing } from './routing';

const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

function isSupportedLocale(locale: string | undefined): locale is string {
  return !!locale && (routing.locales as readonly string[]).includes(locale);
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!isSupportedLocale(locale)) {
    try {
      const cookieLocale = (await cookies()).get(LOCALE_COOKIE_NAME)?.value;
      if (isSupportedLocale(cookieLocale)) {
        locale = cookieLocale;
      }
    } catch {
      // `cookies()` is only available within a request context (e.g. it throws
      // `DYNAMIC_SERVER_USAGE` during static generation); fall back below.
    }
  }

  if (!isSupportedLocale(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
