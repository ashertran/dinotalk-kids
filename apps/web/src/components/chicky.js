// ==========================================================================
// CHICKY — Original Animated SVG Mascot for Chicken Talk
// States: idle | greeting | talking | listening | thinking | pointing |
//         celebrating | hinting | goodbye
// ==========================================================================

(function () {
  const VALID_STATES = new Set([
    "idle",
    "greeting",
    "talking",
    "listening",
    "thinking",
    "pointing",
    "celebrating",
    "hinting",
    "goodbye"
  ]);

  let uidCounter = 0;

  function renderChickySVG({ size = "md", state = "idle", id = "" } = {}) {
    const safeState = VALID_STATES.has(state) ? state : "idle";
    const uid = ++uidCounter;
    const sizeClass = `chicky-size-${size}`;
    const idAttr = id ? `id="${id}"` : "";

    return `
      <div ${idAttr} class="chicky-mascot ${sizeClass} chicky--${safeState}" data-chicky-state="${safeState}" role="img" aria-label="Chicky the baby chicken (${safeState})">
        <svg viewBox="0 0 160 160" class="chicky-svg" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="chickyFeather_${uid}" x1="0.2" y1="0" x2="0.85" y2="1">
              <stop offset="0%" stop-color="#FFF59D"/>
              <stop offset="52%" stop-color="#FFD54F"/>
              <stop offset="100%" stop-color="#F9B928"/>
            </linearGradient>
            <linearGradient id="chickyWing_${uid}" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#FFE082"/>
              <stop offset="100%" stop-color="#F7B724"/>
            </linearGradient>
          </defs>

          <!-- Soft ground shadow -->
          <ellipse class="chicky-shadow" cx="80" cy="144" rx="34" ry="8" fill="#E3CFA0" opacity="0.65"/>

          <!-- Listening sound-wave rings -->
          <g class="chicky-fx chicky-fx-waves">
            <path d="M24 72 Q16 84 24 96" fill="none" stroke="#73C9F5" stroke-width="4" stroke-linecap="round"/>
            <path d="M14 64 Q4 84 14 104" fill="none" stroke="#73C9F5" stroke-width="3.2" stroke-linecap="round" opacity="0.65"/>
            <path d="M136 72 Q144 84 136 96" fill="none" stroke="#73C9F5" stroke-width="4" stroke-linecap="round"/>
            <path d="M146 64 Q156 84 146 104" fill="none" stroke="#73C9F5" stroke-width="3.2" stroke-linecap="round" opacity="0.65"/>
          </g>

          <!-- Thinking floating bubbles -->
          <g class="chicky-fx chicky-fx-think">
            <circle cx="122" cy="36" r="4.5" fill="#73C9F5"/>
            <circle cx="134" cy="24" r="6.5" fill="#A8E6CF"/>
            <circle cx="147" cy="16" r="4" fill="#FFD54F"/>
          </g>

          <!-- Hinting glowing idea sparkle -->
          <g class="chicky-fx chicky-fx-hint">
            <circle cx="124" cy="30" r="14" fill="#FFF3C4" stroke="#FFD54F" stroke-width="3"/>
            <path d="M124 22 L124 31 M124 35 L124 37" stroke="#E06D3B" stroke-width="3.4" stroke-linecap="round"/>
            <path d="M124 10 L124 14 M106 20 L110 23 M142 20 L138 23" stroke="#F59E0B" stroke-width="2.6" stroke-linecap="round"/>
          </g>

          <!-- Celebrating sparkles & stars -->
          <g class="chicky-fx chicky-fx-celebrate">
            <path d="M26 30 L29 38 L37 41 L29 44 L26 52 L23 44 L15 41 L23 38 Z" fill="#FFD54F"/>
            <path d="M134 26 L136.5 33 L143.5 35.5 L136.5 38 L134 45 L131.5 38 L124.5 35.5 L131.5 33 Z" fill="#FF986A"/>
            <circle cx="44" cy="20" r="5" fill="#73C9F5"/>
            <circle cx="118" cy="18" r="5" fill="#A8E6CF"/>
          </g>

          <!-- Main animated Chicky body group -->
          <g class="chicky-whole">
            <!-- Feet -->
            <g class="chicky-feet">
              <path d="M64 126 L64 138 M57 138 L70 138 M64 138 L59 142" stroke="#FF8A4C" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M96 126 L96 138 M90 138 L103 138 M96 138 L101 142" stroke="#FF8A4C" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
            </g>

            <!-- Left wing -->
            <g class="chicky-wing-left">
              <path d="M40 82 C21 82, 16 105, 32 112 C42 116, 48 104, 46 92 Z" fill="url(#chickyWing_${uid})" stroke="#E39D20" stroke-width="2.4" stroke-linejoin="round"/>
            </g>

            <!-- Right wing (waves, points, claps) -->
            <g class="chicky-wing-right">
              <path d="M120 82 C139 82, 144 105, 128 112 C118 116, 112 104, 114 92 Z" fill="url(#chickyWing_${uid})" stroke="#E39D20" stroke-width="2.4" stroke-linejoin="round"/>
            </g>

            <!-- Fluffy head feather tuft -->
            <g class="chicky-tuft">
              <path d="M72 34 C68 18, 82 14, 82 30 C86 17, 98 22, 90 35 C96 29, 102 35, 93 41 Z" fill="#FFD54F" stroke="#E39D20" stroke-width="2.3" stroke-linejoin="round"/>
            </g>

            <!-- Rounded baby chicken silhouette -->
            <ellipse cx="80" cy="84" rx="44" ry="45" fill="url(#chickyFeather_${uid})" stroke="#E39D20" stroke-width="2.6"/>

            <!-- Soft fluffy tummy highlight -->
            <ellipse cx="80" cy="100" rx="26" ry="20" fill="#FFF9DC" opacity="0.72"/>

            <!-- Cute explorer scarf (sky blue + mint detail) -->
            <path d="M47 104 Q80 116 113 104 Q108 116 80 120 Q52 116 47 104 Z" fill="#73C9F5" stroke="#2D9CDB" stroke-width="1.8"/>
            <path d="M90 112 L98 124 L86 125 L82 114 Z" fill="#A8E6CF" stroke="#3DA37D" stroke-width="1.6" stroke-linejoin="round"/>

            <!-- Large expressive eyes -->
            <g class="chicky-eyes">
              <ellipse cx="63" cy="73" rx="8.2" ry="9" fill="#2D241E"/>
              <ellipse cx="97" cy="73" rx="8.2" ry="9" fill="#2D241E"/>
              <circle cx="60" cy="69.5" r="3.1" fill="#FFFFFF"/>
              <circle cx="94" cy="69.5" r="3.1" fill="#FFFFFF"/>
              <circle cx="65.8" cy="76.2" r="1.4" fill="#FFFFFF"/>
              <circle cx="99.8" cy="76.2" r="1.4" fill="#FFFFFF"/>
            </g>

            <!-- Soft rosy coral cheeks -->
            <ellipse cx="48" cy="85" rx="8" ry="5" fill="#FF986A" opacity="0.52"/>
            <ellipse cx="112" cy="85" rx="8" ry="5" fill="#FF986A" opacity="0.52"/>

            <!-- Animated tiny orange beak -->
            <g class="chicky-beak">
              <path class="chicky-beak-top" d="M71 82 Q80 76 89 82 Q80 88 71 82 Z" fill="#FF986A" stroke="#D96528" stroke-width="1.8" stroke-linejoin="round"/>
              <path class="chicky-beak-bottom" d="M73 83 Q80 95 87 83 Z" fill="#FF7E47" stroke="#D96528" stroke-width="1.8" stroke-linejoin="round"/>
            </g>
          </g>
        </svg>
      </div>
    `;
  }

  function setChickyState(target, state) {
    const el = typeof target === "string" ? document.getElementById(target) : target;
    if (!el) return;
    const safeState = VALID_STATES.has(state) ? state : "idle";
    VALID_STATES.forEach(s => el.classList.remove(`chicky--${s}`));
    el.classList.add(`chicky--${safeState}`);
    el.setAttribute("data-chicky-state", safeState);
    el.setAttribute("aria-label", `Chicky the baby chicken (${safeState})`);
  }

  window.ChickenMascot = {
    STATES: [...VALID_STATES],
    render: renderChickySVG,
    setState: setChickyState
  };
})();
