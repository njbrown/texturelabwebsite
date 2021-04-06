module.exports = {
  purge: [],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        ui: {
          background: 'var(--color-ui-background)',
          sidebar: 'var(--color-ui-sidebar)',
          typo: 'var(--color-ui-typo)',
          primary: 'var(--color-ui-primary)',
          border: 'var(--color-ui-border)'
        }
      },
      spacing: {
        sm: '24rem'
      },
      screens: {
        "2xl": '1400px'
      }
    },
    container: {
      center: true,
      padding: '1rem'
    }
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
