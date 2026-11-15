/**
 * ZAVIKOO CUSTOM ATELIER — design tokens.
 *
 * Palette is taken from the brand mark itself: stencil black, the sand tee,
 * the olive cargos and the brass-brown cap. Older class names (ink, paper,
 * cream, charcoal, orange, cobalt, lime, lavender) are kept as aliases so
 * every existing page — including account and admin — picks up the new look.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Atelier palette
        cargo: '#14160F',
        'olive-deep': '#1C2016',
        olive: '#3D432F',
        paper: '#ECEAE3',
        chalk: '#F7F6F2',
        sand: '#D8C8A4',
        brass: '#B59A62',
        'brass-deep': '#7E6532',
        stone: '#5B5D50',
        // Legacy aliases (do not remove — used across older pages)
        ink: '#14160F',
        cream: '#F7F6F2',
        charcoal: '#5B5D50',
        orange: '#7E6532',
        cobalt: '#3D432F',
        lime: '#DEDBCF',
        lavender: '#D3D0C3',
      },
      fontFamily: {
        display: ['"Black Ops One"', 'Impact', '"Arial Black"', 'sans-serif'],
        subheading: ['Oswald', '"Arial Narrow"', 'sans-serif'],
        body: ['"Hanken Grotesk"', 'system-ui', '"Segoe UI"', 'sans-serif'],
        label: ['"Hanken Grotesk"', 'system-ui', '"Segoe UI"', 'sans-serif'],
        stencil: ['"Saira Stencil One"', 'Impact', '"Arial Black"', 'sans-serif'],
      },
      borderRadius: { sticker: '999px', card: '2px', tile: '2px' },
      boxShadow: {
        soft: '0 1px 0 rgba(20, 22, 15, 0.04), 0 22px 44px -28px rgba(20, 22, 15, 0.30)',
        lift: '0 36px 70px -34px rgba(20, 22, 15, 0.50)',
      },
      spacing: { gutter: 'clamp(1.25rem, 4.2vw, 3.5rem)' },
      maxWidth: { page: '1400px', prose: '66ch' },
      screens: { sm: '480px', md: '768px', lg: '1024px', xl: '1280px' },
      zIndex: { header: '40', drawer: '50', modal: '60', toast: '70' },
      transitionDuration: { quick: '150ms', base: '250ms', slow: '450ms' },
      transitionTimingFunction: { luxe: 'cubic-bezier(0.2, 0.7, 0.2, 1)' },
    },
  },
  plugins: [],
};
