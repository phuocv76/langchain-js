interface PanelToggleIconProps {
  collapsed: boolean;
}

/** Chevron indicating panel expand/collapse direction. */
export const PanelToggleIcon = ({
  collapsed,
}: PanelToggleIconProps): React.JSX.Element => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={
      collapsed
        ? "agent-selector__toggle-icon agent-selector__toggle-icon--collapsed"
        : "agent-selector__toggle-icon"
    }
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);
