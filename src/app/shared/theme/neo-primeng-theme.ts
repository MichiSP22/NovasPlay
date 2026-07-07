import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const NeoPrimePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
      950: '#2e1065'
    },
    colorScheme: {
      dark: {
        surface: {
          0: '#04050e',
          50: '#0b0d1a',
          100: '#12152a',
          200: '#1a1f38',
          300: '#252c4b',
          400: '#303962',
          500: '#3b4778',
          600: '#4c5a92',
          700: '#5f71ac',
          800: '#7a8ec4',
          900: '#a0b1dd',
          950: '#d8e2f7'
        }
      }
    }
  }
});

