/**
 * Layout configuration constants.
 * Shared thresholds and spacing values used across components.
 */

/**
 * Content visibility thresholds for progressive card collapse.
 * As cards get shorter (due to timeline density), content is hidden progressively.
 */
export const CARD_HEIGHT_THRESHOLDS = {
  /** Just title + time */
  minimal: 48,
  /** + energy badge/indicator */
  compact: 64,
  /** + priority indicator / location */
  normal: 80,
  /** All content with comfortable spacing */
  expanded: 96,
} as const;

export type CardHeightThreshold = keyof typeof CARD_HEIGHT_THRESHOLDS;
