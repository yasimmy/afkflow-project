/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Manrope', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Backgrounds
        bg: {
          primary:   '#0B0B0F',
          secondary: '#0E0E15',
          card:      '#151520',
          hover:     '#1C1C2A',
        },
        // Borders
        border: 'rgba(255,255,255,0.06)',
        // Text
        text: {
          primary:   '#FFFFFF',
          secondary: '#A7A7B4',
          muted:     '#666673',
        },
        // Accent
        accent: {
          DEFAULT: '#7C5CFF',
          light:   '#9B7BFF',
          dim:     'rgba(124,92,255,0.15)',
        },
        // Status
        success: '#22C55E',
        warning: '#F59E0B',
        danger:  '#EF4444',
      },
      borderRadius: {
        DEFAULT: '12px',
        sm:  '8px',
        md:  '12px',
        lg:  '16px',
        xl:  '20px',
      },
      boxShadow: {
        card:   '0 2px 12px rgba(0,0,0,0.4)',
        modal:  '0 8px 48px rgba(0,0,0,0.6)',
        glow:   '0 0 20px rgba(124,92,255,0.3)',
        'glow-sm': '0 0 10px rgba(124,92,255,0.2)',
      },
    },
  },
  plugins: [],
};
