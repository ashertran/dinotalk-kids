// ==========================================================================
// CHICKEN TALK — Bespoke 2D Storybook SVG Cover Illustrations for Worlds 1–3
// ==========================================================================

(function () {
  const WORLD_BANNERS = {
    magic_garden: `
      <svg viewBox="0 0 320 140" class="world-art-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Magic Garden illustration">
        <defs>
          <linearGradient id="wa1Sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#BEE9FF"/>
            <stop offset="100%" stop-color="#FFF9E8"/>
          </linearGradient>
        </defs>
        <rect width="320" height="140" fill="url(#wa1Sky)"/>
        <circle cx="48" cy="36" r="18" fill="#FFD54F"/>
        <ellipse cx="140" cy="34" rx="22" ry="9" fill="#FFFFFF" opacity="0.9"/>
        <path d="M0 95 Q85 58 180 86 T320 78 L320 140 L0 140 Z" fill="#A8E6CF"/>
        <path d="M0 112 Q120 88 220 108 T320 100 L320 140 L0 140 Z" fill="#77CCA8"/>
        <!-- Winding garden path -->
        <path d="M24 140 Q95 108 168 112 T290 104" fill="none" stroke="#FFF1C2" stroke-width="18" stroke-linecap="round"/>
        <!-- Big oak tree -->
        <rect x="218" y="64" width="16" height="44" rx="4" fill="#A97142"/>
        <circle cx="226" cy="52" r="26" fill="#4DB882"/>
        <circle cx="206" cy="60" r="18" fill="#63CD96"/>
        <circle cx="246" cy="60" r="18" fill="#63CD96"/>
        <!-- Rainbow flowers -->
        <circle cx="88" cy="108" r="6" fill="#FF986A"/><circle cx="104" cy="103" r="6" fill="#FFD54F"/><circle cx="120" cy="108" r="6" fill="#73C9F5"/>
        <!-- Cute Milo peeking -->
        <g transform="translate(248, 86)">
          <ellipse cx="3" cy="14" rx="6" ry="10" transform="rotate(18 3 14)" fill="#9E6234"/>
          <ellipse cx="27" cy="14" rx="6" ry="10" transform="rotate(-18 27 14)" fill="#9E6234"/>
          <circle cx="15" cy="14" r="12" fill="#E6B17A" stroke="#9E6234" stroke-width="1.6"/>
          <circle cx="11" cy="13" r="2" fill="#2D241E"/><circle cx="19" cy="13" r="2" fill="#2D241E"/>
          <ellipse cx="15" cy="17" rx="2.6" ry="1.8" fill="#2D241E"/>
        </g>
        <!-- Butterfly -->
        <ellipse cx="154" cy="66" rx="6" ry="4" transform="rotate(-22 154 66)" fill="#FFD54F"/>
        <ellipse cx="163" cy="66" rx="6" ry="4" transform="rotate(22 163 66)" fill="#FF986A"/>
      </svg>
    `,
    my_little_home: `
      <svg viewBox="0 0 320 140" class="world-art-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="My Little Home illustration">
        <rect width="320" height="140" fill="#FFF4CC"/>
        <circle cx="268" cy="36" r="18" fill="#FFD54F"/>
        <path d="M0 105 Q160 88 320 105 L320 140 L0 140 Z" fill="#A8E6CF"/>
        <!-- Cozy cottage -->
        <rect x="96" y="64" width="128" height="62" rx="10" fill="#FFFFFF" stroke="#E5A91A" stroke-width="3"/>
        <path d="M82 68 L160 22 L238 68 Z" fill="#FF986A" stroke="#D46535" stroke-width="3" stroke-linejoin="round"/>
        <!-- Round sky-blue door -->
        <path d="M144 126 L144 92 Q160 82 176 92 L176 126 Z" fill="#73C9F5" stroke="#2D9CDB" stroke-width="2.5"/>
        <circle cx="169" cy="108" r="3" fill="#FFD54F"/>
        <!-- Cozy windows -->
        <rect x="110" y="78" width="22" height="22" rx="6" fill="#FFF3C4" stroke="#E5A91A" stroke-width="2"/>
        <rect x="188" y="78" width="22" height="22" rx="6" fill="#FFF3C4" stroke="#E5A91A" stroke-width="2"/>
        <!-- Chimney puff -->
        <rect x="192" y="28" width="16" height="22" rx="3" fill="#FFD54F" stroke="#E5A91A" stroke-width="2"/>
        <circle cx="204" cy="18" r="6" fill="#FFFFFF" opacity="0.9"/>
        <circle cx="216" cy="12" r="8" fill="#FFFFFF" opacity="0.8"/>
      </svg>
    `,
    happy_food_market: `
      <svg viewBox="0 0 320 140" class="world-art-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Happy Food Market illustration">
        <rect width="320" height="140" fill="#FFEFE4"/>
        <path d="M0 108 L320 108 L320 140 L0 140 Z" fill="#FFF3C4"/>
        <!-- Market stall poles & counter -->
        <rect x="74" y="54" width="10" height="66" rx="4" fill="#C98A46"/>
        <rect x="236" y="54" width="10" height="66" rx="4" fill="#C98A46"/>
        <rect x="64" y="88" width="192" height="36" rx="10" fill="#FFFFFF" stroke="#E5A91A" stroke-width="3"/>
        <!-- Striped coral & cream awning -->
        <path d="M58 58 L72 28 L248 28 L262 58 Z" fill="#FF986A" stroke="#D46535" stroke-width="2.5" stroke-linejoin="round"/>
        <rect x="92" y="29" width="26" height="28" fill="#FFF9E8"/>
        <rect x="146" y="29" width="26" height="28" fill="#FFF9E8"/>
        <rect x="200" y="29" width="26" height="28" fill="#FFF9E8"/>
        <!-- Fruit baskets -->
        <circle cx="108" cy="82" r="10" fill="#FF6B6B"/>
        <circle cx="124" cy="82" r="10" fill="#FF8787"/>
        <ellipse cx="164" cy="82" rx="14" ry="8" fill="#FFD54F" stroke="#E5A91A" stroke-width="1.5"/>
        <circle cx="204" cy="82" r="9" fill="#A8E6CF" stroke="#3DA37D" stroke-width="1.5"/>
        <circle cx="220" cy="82" r="9" fill="#73C9F5" stroke="#2D9CDB" stroke-width="1.5"/>
      </svg>
    `
  };

  function getWorldBannerSVG(worldId) {
    return WORLD_BANNERS[worldId] || WORLD_BANNERS.magic_garden;
  }

  window.WorldArt = {
    getBanner: getWorldBannerSVG
  };
})();
