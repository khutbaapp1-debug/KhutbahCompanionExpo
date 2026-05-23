/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // App theme tokens (see EXPO_HANDOFF.md). `primary` exposes a DEFAULT
        // (used by text-primary / bg-primary) plus a lighter container shade.
        primary: {
          DEFAULT: '#0F766E', // teal-700
          container: '#99F6E4',
        },
        secondary: '#4DB6AC', // teal-300
        gold: '#C9A84C', // Quranic verses
        background: {
          light: '#FFFFFF',
          dark: '#121212',
        },
        surface: {
          light: '#F5F5F5',
          dark: '#1E1E1E',
        },
      },
      fontFamily: {
        // UI text — Inter. `font-sans` is the 400 default; weighted variants
        // map to the loaded @expo-google-fonts family names.
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
        'sans-bold': ['Inter_700Bold'],
        // Arabic text — Noto Naskh Arabic.
        arabic: ['NotoNaskhArabic_400Regular'],
        'arabic-bold': ['NotoNaskhArabic_700Bold'],
      },
    },
  },
  plugins: [],
};
