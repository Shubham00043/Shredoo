import { dark } from '@clerk/themes';

/**
 * SHREDoo Signature Dark Lounge Clerk Theme
 * Enforces pure charcoal (#15171e), warm amber (#d97706), and crisp white (#f3f4f6)
 * across all Clerk components, popovers, modals, and buttons.
 */
export const loungeClerkTheme = {
  ...dark,
  name: 'lounge-dark',
  variables: {
    colorPrimary: '#d97706',
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
    userButtonAvatarBox: 'w-8 h-8 rounded-xl border border-lounge-border',
    userButtonOuterIdentifier: 'text-xs font-semibold pl-1 text-lounge-textPrimary',
    userButtonBox:
      'flex-row-reverse gap-2 p-1 pl-3 rounded-xl bg-lounge-card hover:bg-lounge-cardHover border border-lounge-border transition',

    // Top-level popover containers
    userButtonPopoverRootBox: {
      backgroundColor: '#15171e',
    },
    userButtonPopoverCard: {
      backgroundColor: '#15171e !important',
      backgroundImage: 'none !important',
      border: '1px solid #282c37 !important',
      boxShadow:
        '0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 8px 10px -6px rgba(0, 0, 0, 0.8) !important',
      borderRadius: '1.25rem !important',
      color: '#f3f4f6 !important',
      overflow: 'hidden !important',
    },
    userButtonPopoverMain: {
      backgroundColor: '#15171e !important',
      backgroundImage: 'none !important',
    },
    userPreview: {
      backgroundColor: '#15171e !important',
      backgroundImage: 'none !important',
      borderBottom: '1px solid #282c37 !important',
    },
    userPreviewMainIdentifier: {
      color: '#ffffff !important',
      fontWeight: '700 !important',
      fontSize: '0.875rem !important',
    },
    userPreviewSecondaryIdentifier: {
      color: '#949aa5 !important',
      fontSize: '0.75rem !important',
    },
    userButtonPopoverActions: {
      backgroundColor: '#15171e !important',
      backgroundImage: 'none !important',
    },
    userButtonPopoverActionButton: {
      color: '#f3f4f6 !important',
      backgroundColor: 'transparent !important',
      borderRadius: '0.75rem !important',
      padding: '0.625rem 0.875rem !important',
      transition: 'all 0.15s ease !important',
    },
    userButtonPopoverActionButtonText: {
      color: '#f3f4f6 !important',
      fontSize: '0.8125rem !important',
      fontWeight: '500 !important',
    },
    userButtonPopoverActionButtonIconBox: {
      color: '#d97706 !important',
    },
    userButtonPopoverActionButtonIcon: {
      color: '#d97706 !important',
      opacity: '1 !important',
    },
    userButtonPopoverCustomItemButton: {
      color: '#f3f4f6 !important',
      backgroundColor: 'transparent !important',
      borderRadius: '0.75rem !important',
      padding: '0.625rem 0.875rem !important',
      transition: 'all 0.15s ease !important',
    },
    userButtonPopoverCustomItemButtonText: {
      color: '#f3f4f6 !important',
      fontSize: '0.8125rem !important',
      fontWeight: '500 !important',
    },
    userButtonPopoverCustomItemButtonIconBox: {
      color: '#d97706 !important',
    },
    userButtonPopoverCustomItemButtonIcon: {
      color: '#d97706 !important',
      opacity: '1 !important',
    },
    userButtonPopoverFooter: {
      backgroundColor: '#1b1e26 !important',
      backgroundImage: 'none !important',
      borderTop: '1px solid #282c37 !important',
    },
    userButtonPopoverFooterPagesLink: {
      color: '#949aa5 !important',
    },

    // Modal & Dialog general
    card: {
      backgroundColor: '#15171e !important',
      border: '1px solid #282c37 !important',
      borderRadius: '1.25rem !important',
      color: '#f3f4f6 !important',
    },
    modalContent: {
      backgroundColor: '#15171e !important',
      border: '1px solid #282c37 !important',
      borderRadius: '1.25rem !important',
      color: '#f3f4f6 !important',
    },
    modalBackdrop: {
      backgroundColor: 'rgba(12, 14, 18, 0.85) !important',
      backdropFilter: 'blur(8px) !important',
    },
    navbar: {
      backgroundColor: '#101217 !important',
      borderRight: '1px solid #282c37 !important',
    },
    scrollBox: {
      backgroundColor: '#15171e !important',
      color: '#f3f4f6 !important',
    },
  },
  __type: 'prebuilt_appearance',
};
