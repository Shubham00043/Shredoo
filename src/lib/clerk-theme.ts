/**
 * SHREDoo Signature Dark Lounge Clerk Theme
 * Enforces pure charcoal (#15171e), warm amber (#d97706), and crisp white (#f3f4f6)
 * across all Clerk components, popovers, modals, and buttons.
 *
 * Fully compliant with Clerk Core 3 appearance API (valid style properties without !important).
 */
export const loungeClerkTheme = {
  variables: {
    colorPrimary: '#d97706',
    colorPrimaryForeground: '#ffffff',
    colorBackground: '#15171e',
    colorNeutral: '#f3f4f6',
    colorForeground: '#f3f4f6',
    colorText: '#f3f4f6',
    colorTextSecondary: '#949aa5',
    colorInputBackground: '#0c0e12',
    colorInputText: '#f3f4f6',
    colorInputForeground: '#f3f4f6',
    colorShimmer: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '1rem',
  },
  elements: {
    // Trigger button box in navbar
    userButtonAvatarBox: 'w-8 h-8 rounded-xl border border-[#282c37]',
    userButtonOuterIdentifier: 'text-xs font-semibold pl-1 text-[#f3f4f6]',
    userButtonBox:
      'flex-row-reverse gap-2 p-1 pl-3 rounded-xl bg-[#1b1e26] hover:bg-[#222631] border border-[#282c37] transition',

    // Top-level popover containers
    userButtonPopoverRootBox: {
      backgroundColor: '#15171e',
    },
    userButtonPopoverCard: {
      backgroundColor: '#15171e',
      border: '1px solid #282c37',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 8px 10px -6px rgba(0, 0, 0, 0.8)',
      borderRadius: '1.25rem',
      color: '#f3f4f6',
      overflow: 'hidden',
    },
    userButtonPopoverMain: {
      backgroundColor: '#15171e',
    },
    userPreview: {
      backgroundColor: '#15171e',
      borderBottom: '1px solid #282c37',
    },
    userPreviewMainIdentifier: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: '0.875rem',
    },
    userPreviewSecondaryIdentifier: {
      color: '#949aa5',
      fontSize: '0.75rem',
    },
    userButtonPopoverActions: {
      backgroundColor: '#15171e',
    },
    userButtonPopoverActionButton: {
      color: '#f3f4f6',
      backgroundColor: 'transparent',
      borderRadius: '0.75rem',
      padding: '0.625rem 0.875rem',
    },
    userButtonPopoverActionButtonText: {
      color: '#f3f4f6',
      fontSize: '0.8125rem',
      fontWeight: '500',
    },
    userButtonPopoverActionButtonIconBox: {
      color: '#d97706',
    },
    userButtonPopoverActionButtonIcon: {
      color: '#d97706',
      opacity: '1',
    },
    userButtonPopoverFooter: {
      backgroundColor: '#1b1e26',
      borderTop: '1px solid #282c37',
    },
    userButtonPopoverFooterPagesLink: {
      color: '#949aa5',
    },

    // Modal & Dialog general
    card: {
      backgroundColor: '#15171e',
      border: '1px solid #282c37',
      borderRadius: '1.25rem',
      color: '#f3f4f6',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)',
    },
    headerTitle: {
      color: '#ffffff',
      fontWeight: '700',
    },
    headerSubtitle: {
      color: '#949aa5',
    },
    socialButtonsBlockButton: {
      backgroundColor: '#1b1e26',
      border: '1px solid #282c37',
      color: '#f3f4f6',
      borderRadius: '0.75rem',
    },
    socialButtonsBlockButtonText: {
      color: '#f3f4f6',
      fontWeight: '600',
    },
    formButtonPrimary: {
      backgroundColor: '#d97706',
      color: '#ffffff',
      borderRadius: '0.75rem',
      fontWeight: '600',
    },
    formFieldInput: {
      backgroundColor: '#0c0e12',
      border: '1px solid #282c37',
      color: '#f3f4f6',
      borderRadius: '0.75rem',
    },
    footerActionLink: {
      color: '#d97706',
    },
    modalContent: {
      backgroundColor: '#15171e',
      border: '1px solid #282c37',
      borderRadius: '1.25rem',
      color: '#f3f4f6',
    },
    modalBackdrop: {
      backgroundColor: 'rgba(12, 14, 18, 0.85)',
      backdropFilter: 'blur(8px)',
    },
    navbar: {
      backgroundColor: '#101217',
      borderRight: '1px solid #282c37',
    },
    scrollBox: {
      backgroundColor: '#15171e',
      color: '#f3f4f6',
    },
  },
};
