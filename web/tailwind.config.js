/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ported verbatim from the `tailwind.config = {...}` block that used to sit
 * inline in index.html alongside the cdn.tailwindcss.com script tag.
 *
 * Why this file exists: the CDN build compiles CSS in the browser on every
 * page load by watching the DOM. That made the whole app depend on reaching a
 * third-party host at render time: a CDN hiccup meant an unstyled dashboard.
 *
 * `content` deliberately includes constants.ts: the theme definitions there
 * hold complete class strings (`bg-zinc-900/40`, `border-amber-900/30`) that
 * never appear in any JSX, so the scanner has to read that file to emit them.
 */

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  // Top-level glob only (`./*`), so node_modules and dist are never walked.
  content: [
    './index.html',
    './*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      /*
        SimonBot's colours, from its avatar. Every screen came over from
        SimonSays written in rose (its accent) and zinc (its greys), so the two
        are redefined here rather than rewritten across hundreds of files:
        rose is the heart's leaf green, zinc greys lean towards the outline's plum.
      */
      colors: {
        rose: {
          50: '#F2F9EE', 100: '#E1F2D8', 200: '#C9ECB4', 300: '#B8E99C', 400: '#84C765',
          500: '#5FA647', 600: '#4F9140', 700: '#3F7335', 800: '#345C2E', 900: '#2C4C28', 950: '#142A12',
        },
        zinc: {
          50: '#FAF7FB', 100: '#F3EEF5', 200: '#E3DBE7', 300: '#CBBFD1', 400: '#A394AA', 500: '#7B6B83',
          600: '#5A4B61', 700: '#42344A', 800: '#2C2032', 900: '#1C1121', 950: '#0F0913',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'glitch': 'glitch 4s infinite',
        'drip': 'drip 3s infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // Entrances.
        'pop-in': 'popIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'zoom-in': 'zoomIn 0.4s ease-out',
        'slide-down': 'slideDown 0.45s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glitch: {
          '0%': { textShadow: '0 0 0 transparent', transform: 'translate(0)' },
          '2%': { textShadow: '-2px 0 #ff0000, 2px 0 #00ffff', transform: 'translate(-2px, 1px)' },
          '4%': { textShadow: '2px 0 #ff0000, -2px 0 #00ffff', transform: 'translate(2px, -1px)' },
          '6%': { textShadow: '0 0 0 transparent', transform: 'translate(0)' },
          '100%': { textShadow: '0 0 0 transparent', transform: 'translate(0)' },
        },
        drip: {
          '0%, 100%': { textShadow: '0 0 2px #7f1d1d' },
          '50%': { textShadow: '0 4px 8px #ef4444' },
        },
        popIn: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        zoomIn: {
          '0%': { transform: 'scale(1.35)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-28px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
