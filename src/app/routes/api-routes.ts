export const API_ROUTES = {
  access: {
    register: '/access/register',
    login: '/access/login',
    refresh: '/access/refresh',
    logout: '/access/logout',
    googleLogin: '/access/login-google',
    passwordForgot: '/access/password/forgot',
    passwordReset: '/access/password/reset',
    passwordSetLost: '/access/password/set-lost',
    passwordChange: '/access/password/change',
  },
  category: {
    search: '/category',
    create: '/category',
    update: '/category',
    delete: (categoryId: number | string) => `/category/${categoryId}`,
  },
  coin: {
    search: '/coin',
    create: '/coin',
    update: '/coin',
    delete: (coinId: number | string) => `/coin/${coinId}`,
  },
  companyConfig: {
    root: '/configuration',
  },
  coupon: {
    search: '/coupon',
    create: '/coupon',
    update: (couponId: number | string) => `/coupon/${couponId}`,
    delete: (ids: number[] | number | string) =>
      `/coupon/${Array.isArray(ids) ? ids.join(',') : ids}`,
    preview: '/coupon/preview',
  },
  country: {
    search: '/country',
    create: '/country',
    update: '/country',
    assignCoins: '/country/coins',
    delete: (countryId: number | string) => `/country/${countryId}`,
  },
  dashboard: {
    summary: '/dashboard/summary',
    report: '/dashboard/report',
  },
  order: {
    search: '/order',
    create: '/order',
    changeStatus: '/order',
  },
  payment: {
    search: '/payment',
    create: '/payment',
    update: '/payment',
    searchData: '/payment/data',
    createData: '/payment/data',
    updateData: '/payment/data',
    delete: (paymentId: number | string) => `/payment/${paymentId}`,
    deleteData: (ids: number[] | string) =>
      `/payment/${Array.isArray(ids) ? ids.join(',') : ids}/data`,
  },
  price: {
    search: '/price',
    create: '/price',
    update: '/price',
    delete: (ids: number[] | number | string) =>
      `/price/${Array.isArray(ids) ? ids.join(',') : ids}`,
  },
  product: {
    search: '/product',
    create: '/product',
    update: '/product',
    assignCategories: '/product/categories',
    delete: (productId: number | string) => `/product/${productId}`,
  },
  recharge: {
    search: '/detail',
    create: '/detail',
    update: '/detail',
    delete: (detailId: number | string) => `/detail/${detailId}`,
  },
  user: {
    search: '/user',
    me: '/user/me',
    meImage: '/user/me/image',
    role: (userId: string) => `/user/${userId}/role`,
    support: (userId: string) => `/user/${userId}/support`,
    unban: (userId: string) => `/user/${userId}/unban`,
    ban: (userId: string) => `/user/${userId}/ban`,
  },
} as const;
