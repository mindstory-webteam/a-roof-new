/**
 * Shared settings for the Products → SheetStory hand-off.
 *
 * Products: once its stage is centred, the 3D sheet lifts out of the card and
 * sinks down the screen. SheetStory (z-index above Products) rises over it.
 * SheetStory: from HANDOFF_START its own sheet drops in from the section's top
 * edge, landing when the section reaches the top of the screen.
 */
export const STORY_ID = 'sheet-story';
export const HANDOFF_MEDIA = '(min-width: 900px)'; // desktop only; mobile skips the sink
export const HANDOFF_START = 'top 60%'; // when SheetStory's sheet starts dropping in (desktop)