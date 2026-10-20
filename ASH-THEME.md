# Appearance settings for EchoChamber

Open EchoChamber Settings → 配色 (also available in the extension settings). Default mode follows the current SillyTavern theme, including a matching fallback for the existing Stray Birds custom-CSS theme. Changes to theme tokens, custom CSS and theme selection update the palette automatically.

Manual mode offers panel, card/input, text, secondary text, button/accent, border and audience-name colors. Color changes apply immediately and are saved with the existing discord_chat extension settings, preserving API settings, prompts and chat metadata. Switching modes preserves the manual palette. Copy current theme colors seeds manual mode; Reset manual colors restores the companion defaults. User-configured own-avatar colors remain intact. Existing opacity remains active.

Implementation: appearance.js is loaded from the extension URL and initialized after loadSettings. CSS is scoped by body[data-ec-colors]; theme changes and newly opened settings modals are observed. Color values are validated before use. Upstream author and license are retained. Browser checks cover light/dark theme updates, manual edits, save serialization, switching modes, copy/reset, contrast and opacity.

Phone backups are under ~/artifacts/echochamber-theme/. Restore the previous plugin commit to undo this feature.
