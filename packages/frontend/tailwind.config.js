/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Ensure touch-friendly sizes
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      // Mobile-first breakpoints
      screens: {
        xs: '475px',
        // sm: '640px', // default
        // md: '768px', // default
        // lg: '1024px', // default
        // xl: '1280px', // default
        // '2xl': '1536px', // default
      },
      // Safe area insets for mobile devices
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
