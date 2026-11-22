import type { Config } from 'tailwindcss';

/** Design system — charte minérale de L'Atelier de l'Existant */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sauge: { DEFAULT: '#68725E', 50: '#F1F2EE', 100: '#E1E4DB', 200: '#C3C9B8' },
        foret: '#334B3D',
        terre: { DEFAULT: '#B97A5B', 50: '#F7EEE9', 100: '#EEDACE' },
        pierre: { DEFAULT: '#D6C7AF', 50: '#F3EEE6', 100: '#E9E0D2' },
        ivoire: '#F8F5EF',
        charbon: '#2D332F',
        ocre: '#C9A15A',
        p1: '#A8432F', // rouge brique (P1)
        p2: '#B97A5B', // terracotta (P2)
        p3: '#68725E', // sauge (P3)
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Garamond', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        label: ['Montserrat', 'Inter', 'sans-serif'],
      },
      borderWidth: { hair: '0.5pt' },
    },
  },
  plugins: [],
};
export default config;
