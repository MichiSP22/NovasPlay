export const API_VERSIONS = {
  v1: 'v1',
  v11: 'v1.1',
} as const;

export type ApiVersion = (typeof API_VERSIONS)[keyof typeof API_VERSIONS];
