import { dark } from '@clerk/themes'
import type { Theme } from '@/store/appStore'

// Resolved hex values per theme — Clerk's appearance API takes literal
// color strings, not CSS variables, because it applies them as inline
// styles (highest cascade priority, beats both Clerk defaults and our
// global CSS).
const THEME_COLORS: Record<Theme, { accent: string; ink: string; bg: string; surface2: string; faint: string }> = {
  cad:    { accent: '#b44dff', ink: '#e2eaf5', bg: '#07040f', surface2: '#16101e', faint: '#8a9bb8' },
  orbit:  { accent: '#ff6b1a', ink: '#fce8d4', bg: '#0f0800', surface2: '#1a0f08', faint: '#a08a76' },
  brutal: { accent: '#0066ff', ink: '#0a1633', bg: '#f4f8ff', surface2: '#e8eef9', faint: '#6b7a99' },
  liquid: { accent: '#00ff41', ink: '#caffd6', bg: '#020d02', surface2: '#0a1808', faint: '#7ab088' },
  prism:  { accent: '#e0198c', ink: '#3d0a26', bg: '#fff0f8', surface2: '#fce4ed', faint: '#aa6080' },
}

const FONT_MONO =
  '"JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, monospace'

export function buildAuthAppearance(theme: Theme) {
  const c = THEME_COLORS[theme]

  // Helper for translucent layers
  const tint = (color: string, alpha: number) =>
    `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0').slice(0, 2)}`

  return {
    baseTheme: dark,
    variables: {
      colorPrimary: c.accent,
      colorBackground: 'transparent',
      colorText: c.ink,
      colorTextSecondary: c.faint,
      colorInputBackground: tint(c.surface2, 0.55),
      colorInputText: c.ink,
      colorNeutral: c.faint,
      borderRadius: '6px',
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '13px',
    },
    elements: {
      rootBox: { width: '100%' },
      card: {
        width: '100%',
        maxWidth: '100%',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
        padding: 0,
        margin: 0,
      },
      header: { display: 'none' },
      headerTitle: { display: 'none' },
      headerSubtitle: { display: 'none' },
      logoBox: { display: 'none' },
      main: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '14px',
        padding: 0,
      },
      form: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
      },

      // Social buttons (Google, etc.)
      socialButtons: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
      },
      socialButtonsBlockButton: {
        position: 'relative' as const,
        width: '100%',
        height: '44px',
        border: `0.5px solid ${tint(c.accent, 0.22)}`,
        borderRadius: '6px',
        background: tint(c.surface2, 0.55),
        color: c.ink,
        fontFamily: '"Inter", system-ui, sans-serif',
        fontSize: '13px',
        letterSpacing: '0.01em',
        display: 'flex',
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        gap: '10px',
        padding: '0 56px 0 14px',          // right padding leaves room for the "Last used" pill
        overflow: 'hidden',
        transition: 'border-color 0.15s, background 0.15s, transform 0.1s',
        '&:hover': {
          borderColor: tint(c.accent, 0.5),
          background: tint(c.accent, 0.06),
        },
        '&:active': { transform: 'translateY(1px)' },
      },
      socialButtonsBlockButtonText: {
        fontWeight: 500,
        fontSize: '13px',
        letterSpacing: '0.01em',
      },
      socialButtonsProviderIcon: { width: '16px', height: '16px' },

      // "Last used" badge — pinned inside the button on the right edge
      providerLastUsedLabel__google: {
        position: 'absolute' as const,
        right: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        fontFamily: FONT_MONO,
        fontSize: '8.5px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase' as const,
        color: c.accent,
        background: tint(c.accent, 0.14),
        padding: '2px 7px',
        borderRadius: '999px',
        border: `0.5px solid ${tint(c.accent, 0.4)}`,
        whiteSpace: 'nowrap' as const,
        pointerEvents: 'none' as const,
      },
      providerLastUsedLabel: {
        position: 'absolute' as const,
        right: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        fontFamily: FONT_MONO,
        fontSize: '8.5px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase' as const,
        color: c.accent,
        background: tint(c.accent, 0.14),
        padding: '2px 7px',
        borderRadius: '999px',
        border: `0.5px solid ${tint(c.accent, 0.4)}`,
        whiteSpace: 'nowrap' as const,
        pointerEvents: 'none' as const,
      },

      // Divider
      dividerRow: {
        display: 'flex',
        alignItems: 'center' as const,
        gap: '12px',
        margin: '4px 0',
      },
      dividerLine: {
        flex: 1,
        height: '0.5px',
        background: tint(c.accent, 0.18),
      },
      dividerText: {
        fontFamily: FONT_MONO,
        fontSize: '9.5px',
        letterSpacing: '0.22em',
        color: c.faint,
        textTransform: 'uppercase' as const,
      },

      // Inputs
      formFieldRow: { gap: '6px' },
      formField: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '6px',
        width: '100%',
      },
      formFieldLabel: {
        fontFamily: FONT_MONO,
        fontSize: '9.5px',
        letterSpacing: '0.18em',
        color: c.faint,
        textTransform: 'uppercase' as const,
        fontWeight: 500,
      },
      formFieldInput: {
        width: '100%',
        height: '42px',
        padding: '0 12px',
        background: tint(c.surface2, 0.55),
        border: `0.5px solid ${tint(c.accent, 0.22)}`,
        borderRadius: '6px',
        color: c.ink,
        fontFamily: '"Inter", system-ui, sans-serif',
        fontSize: '13px',
        letterSpacing: '0.01em',
        transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
        boxShadow: 'none',
        '&:hover': { borderColor: tint(c.accent, 0.4) },
        '&:focus, &:focus-visible': {
          outline: 'none',
          borderColor: c.accent,
          boxShadow: `0 0 0 3px ${tint(c.accent, 0.18)}`,
        },
        '&::placeholder': { color: c.faint },
      },
      formFieldInputShowPasswordButton: {
        right: '10px',
        color: c.faint,
        '&:hover': { color: c.accent },
      },

      // OTP code inputs
      otpCodeFieldInput: {
        height: '42px',
        background: tint(c.surface2, 0.55),
        border: `0.5px solid ${tint(c.accent, 0.22)}`,
        borderRadius: '6px',
        color: c.ink,
        fontFamily: FONT_MONO,
        '&:focus': {
          outline: 'none',
          borderColor: c.accent,
          boxShadow: `0 0 0 3px ${tint(c.accent, 0.18)}`,
        },
      },

      // Primary submit button
      formButtonPrimary: {
        width: '100%',
        height: '44px',
        marginTop: '6px',
        background: c.accent,
        color: c.bg,
        border: 'none',
        borderRadius: '6px',
        fontFamily: FONT_MONO,
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase' as const,
        cursor: 'pointer',
        boxShadow: `0 4px 14px ${tint(c.accent, 0.3)}`,
        transition: 'box-shadow 0.15s, filter 0.15s, transform 0.1s',
        '&:hover': {
          background: c.accent,
          filter: 'brightness(1.15)',
          boxShadow: `0 6px 22px ${tint(c.accent, 0.55)}`,
        },
        '&:active': { transform: 'translateY(1px)' },
      },
      formButtonPrimary__loading: {
        opacity: 0.7,
        cursor: 'wait',
      },

      // Errors
      formFieldErrorText: {
        fontFamily: FONT_MONO,
        fontSize: '10px',
        letterSpacing: '0.06em',
        color: '#ff6b6b',
      },
      alert: {
        fontFamily: FONT_MONO,
        fontSize: '10.5px',
        letterSpacing: '0.04em',
      },

      // Footer (cross-link)
      footer: {
        background: 'transparent',
        marginTop: '8px',
        padding: 0,
      },
      footerAction: {
        background: 'transparent',
        fontFamily: FONT_MONO,
        fontSize: '10px',
        letterSpacing: '0.1em',
        color: c.faint,
        textAlign: 'center' as const,
      },
      footerActionText: {
        fontFamily: FONT_MONO,
        fontSize: '10px',
        letterSpacing: '0.1em',
        color: c.faint,
        textTransform: 'uppercase' as const,
      },
      footerActionLink: {
        color: c.accent,
        textDecoration: 'none',
        letterSpacing: '0.12em',
        textTransform: 'uppercase' as const,
        fontWeight: 600,
        fontFamily: FONT_MONO,
        marginLeft: '4px',
        '&:hover': { textShadow: `0 0 8px ${c.accent}` },
      },

      // Hide Clerk wordmark + dev-mode pill — we have our own trust row
      badge: { display: 'none' },
      poweredByClerk: { display: 'none' },
      logoImage: { display: 'none' },
    },
  }
}
