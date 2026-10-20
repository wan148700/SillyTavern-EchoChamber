# Stray Birds companion palette

This fork adds an opt-in companion palette for 绾绾's Stray Birds theme, detected through body[data-ash-bird-compact="true"] from the existing phone theme compatibility script. Other themes retain the upstream colors.

The palette styles the comment panel, random audience identities, reply input, settings card, and style editor in fog white, sage, slate blue and mauve. User-configured avatar colors remain intact. EchoChamber opacity is passed through --ec-panel-opacity in its existing initialization and slider paths; no API, prompts, chat, generation or event behavior changes.

Restore the previous commit's style.css and index.js to undo. Keep the upstream license and author attribution. Browser checks cover text contrast, settings surfaces, opacity changes, and disabling the palette when switching themes.
