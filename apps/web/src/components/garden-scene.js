// ==========================================================================
// THE MAGIC GARDEN — Interactive 2.5D SVG Scene for "The Missing Puppy"
// Supports dual Information Gap views (Map Scout vs Clue Spotter + Peek),
// animated explorer positions, glowing hotspots, and Milo's rescue reveal!
// ==========================================================================

(function () {
  // Explorer positions across the 4 stages of The Magic Garden
  const EXPLORER_COORDS = [
    { you: { x: 112, y: 274 }, buddy: { x: 162, y: 282 } }, // Stage 0: Garden Gate
    { you: { x: 240, y: 230 }, buddy: { x: 288, y: 242 } }, // Stage 1: Rainbow Flower Bush
    { you: { x: 430, y: 222 }, buddy: { x: 478, y: 234 } }, // Stage 2: Whispering Oak
    { you: { x: 604, y: 228 }, buddy: { x: 650, y: 240 } }  // Stage 3: Cozy Gazebo (Milo!)
  ];

  function renderMagicGarden({
    stageIndex = 0,
    role = "map_scout",
    peekPartner = false,
    foundClues = [],
    miloRescued = false,
    kidAvatar = "🐥",
    buddyAvatar = "🐰",
    buddyName = "Luna"
  } = {}) {
    const idx = Math.max(0, Math.min(3, stageIndex));
    const pos = EXPLORER_COORDS[idx];
    const showMapOverlay = role === "map_scout" || peekPartner;
    const showClueLens = role === "clue_spotter" || peekPartner;

    const hasCollar = foundClues.includes("blue_collar") || idx >= 2;
    const hasBone = foundClues.includes("oak_tree") || idx >= 3;

    const activeHotspot =
      idx === 0 ? "left_path" : idx === 1 ? "blue_collar" : idx === 2 ? "oak_tree" : "milo_bush";

    return `
      <svg viewBox="0 0 760 360" class="garden-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Magic Garden interactive map">
        <defs>
          <linearGradient id="mgSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#BEE9FF"/>
            <stop offset="58%" stop-color="#E7F7FF"/>
            <stop offset="100%" stop-color="#FFF9E8"/>
          </linearGradient>
          <linearGradient id="mgHillBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#BDEFD9"/>
            <stop offset="100%" stop-color="#8FD9BC"/>
          </linearGradient>
          <linearGradient id="mgHillFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#A8E6CF"/>
            <stop offset="100%" stop-color="#7BCBA9"/>
          </linearGradient>
          <linearGradient id="mgPath" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#FFF2CC"/>
            <stop offset="100%" stop-color="#F7DC94"/>
          </linearGradient>
          <linearGradient id="mgPond" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#9DE0FF"/>
            <stop offset="100%" stop-color="#5DBCEB"/>
          </linearGradient>
        </defs>

        <!-- Sky background -->
        <rect x="0" y="0" width="760" height="360" rx="24" fill="url(#mgSky)"/>

        <!-- Smiling warm golden sun -->
        <g class="garden-sun">
          <circle cx="88" cy="64" r="34" fill="#FFE680" opacity="0.45"/>
          <circle cx="88" cy="64" r="24" fill="#FFD54F"/>
          <circle cx="81" cy="61" r="2.2" fill="#7A4F07"/>
          <circle cx="95" cy="61" r="2.2" fill="#7A4F07"/>
          <path d="M82 68 Q88 73 94 68" fill="none" stroke="#7A4F07" stroke-width="2" stroke-linecap="round"/>
        </g>

        <!-- Soft drifting clouds -->
        <g class="garden-cloud cloud-1" opacity="0.92">
          <ellipse cx="220" cy="58" rx="34" ry="15" fill="#FFFFFF"/>
          <circle cx="204" cy="52" r="14" fill="#FFFFFF"/>
          <circle cx="226" cy="48" r="17" fill="#FFFFFF"/>
        </g>
        <g class="garden-cloud cloud-2" opacity="0.88">
          <ellipse cx="560" cy="54" rx="38" ry="15" fill="#FFFFFF"/>
          <circle cx="545" cy="48" r="15" fill="#FFFFFF"/>
          <circle cx="570" cy="46" r="18" fill="#FFFFFF"/>
        </g>

        <!-- Distant soft mint hills -->
        <path d="M0 215 Q170 135 370 198 T760 184 L760 360 L0 360 Z" fill="url(#mgHillBack)"/>
        <path d="M0 242 Q230 188 460 225 T760 215 L760 360 L0 360 Z" fill="url(#mgHillFront)"/>

        <!-- Winding golden storybook footpath -->
        <path d="M90 358 Q135 285 230 250 Q335 215 445 238 Q545 262 630 236"
              fill="none" stroke="url(#mgPath)" stroke-width="38" stroke-linecap="round"/>
        <path d="M90 358 Q135 285 230 250 Q335 215 445 238 Q545 262 630 236"
              fill="none" stroke="#EBC872" stroke-width="38" stroke-linecap="round" stroke-dasharray="2 16" opacity="0.35"/>

        <!-- Sparkling Pond + Wooden Bridge -->
        <ellipse cx="520" cy="276" rx="74" ry="30" fill="url(#mgPond)" stroke="#FFFFFF" stroke-width="3" opacity="0.9"/>
        <ellipse cx="502" cy="270" rx="18" ry="5" fill="#FFFFFF" opacity="0.45"/>
        <!-- Wooden Bridge -->
        <g class="garden-bridge">
          <path d="M472 246 Q522 222 572 246 L572 264 Q522 242 472 264 Z" fill="#D99B58" stroke="#9B642A" stroke-width="2.5"/>
          <line x1="490" y1="240" x2="490" y2="257" stroke="#9B642A" stroke-width="2.4"/>
          <line x1="512" y1="234" x2="512" y2="252" stroke="#9B642A" stroke-width="2.4"/>
          <line x1="534" y1="234" x2="534" y2="252" stroke="#9B642A" stroke-width="2.4"/>
          <line x1="554" y1="240" x2="554" y2="257" stroke="#9B642A" stroke-width="2.4"/>
        </g>

        <!-- ============ HOTSPOT 1: GARDEN GATE SIGNPOST (LEFT PATH) ============ -->
        <g class="garden-hotspot ${activeHotspot === "left_path" ? "is-active" : ""}"
           data-hotspot="left_path" tabindex="0" role="button" aria-label="Go Left Path Signpost"
           onclick="window.ChickenMission && window.ChickenMission.tapHotspot('left_path')">
          <rect x="148" y="182" width="12" height="72" rx="5" fill="#B57B42" stroke="#7D4E20" stroke-width="2"/>
          <path d="M104 192 L166 192 L166 218 L104 218 L90 205 Z" fill="#FFD54F" stroke="#C98A12" stroke-width="2.5"/>
          <text x="132" y="210" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="13" font-weight="700" fill="#4A3208">⬅ LEFT</text>
          ${showMapOverlay ? `
            <rect x="86" y="160" width="96" height="22" rx="11" fill="#73C9F5" stroke="#FFFFFF" stroke-width="2"/>
            <text x="134" y="175" text-anchor="middle" font-family="Nunito, sans-serif" font-size="10.5" font-weight="800" fill="#0E3B56">🗺️ Flower Path</text>
          ` : ""}
        </g>

        <!-- ============ HOTSPOT 2: RAINBOW FLOWER BUSH + BLUE COLLAR ============ -->
        <g class="garden-hotspot ${activeHotspot === "blue_collar" ? "is-active" : ""}"
           data-hotspot="blue_collar" tabindex="0" role="button" aria-label="Rainbow Flower Bush with Milo's Blue Collar"
           onclick="window.ChickenMission && window.ChickenMission.tapHotspot('blue_collar')">
          <ellipse cx="268" cy="196" rx="52" ry="30" fill="#5CC48F" stroke="#369365" stroke-width="2.5"/>
          <circle cx="242" cy="186" r="22" fill="#72D4A1"/>
          <circle cx="272" cy="176" r="24" fill="#7EE0AD"/>
          <circle cx="298" cy="188" r="20" fill="#63C894"/>
          <!-- Colorful flowers -->
          <circle cx="242" cy="188" r="7" fill="#FF986A"/><circle cx="242" cy="188" r="3" fill="#FFF3C4"/>
          <circle cx="272" cy="172" r="7.5" fill="#FFD54F"/><circle cx="272" cy="172" r="3" fill="#FFFFFF"/>
          <circle cx="297" cy="190" r="7" fill="#73C9F5"/><circle cx="297" cy="190" r="3" fill="#FFF3C4"/>

          <!-- Blue puppy collar clue (bright for Clue Spotter or when active/found) -->
          <g opacity="${showClueLens || idx >= 1 ? "1" : "0.38"}">
            <ellipse cx="268" cy="204" rx="14" ry="8" fill="none" stroke="#2D9CDB" stroke-width="5"/>
            <circle cx="268" cy="212" r="4.5" fill="#FFD54F" stroke="#C98A12" stroke-width="1.5"/>
            ${hasCollar ? `<text x="268" y="156" text-anchor="middle" font-size="16">✅</text>` : ""}
          </g>

          <!-- Fluttering yellow butterfly -->
          <g class="garden-butterfly">
            <ellipse cx="288" cy="148" rx="7" ry="5" transform="rotate(-24 288 148)" fill="#FFD54F"/>
            <ellipse cx="298" cy="148" rx="7" ry="5" transform="rotate(24 298 148)" fill="#FF986A"/>
            <circle cx="293" cy="149" r="2.2" fill="#4A3208"/>
          </g>
        </g>

        <!-- ============ HOTSPOT 3: THE WHISPERING OAK TREE + TOY BONE BEHIND IT ============ -->
        <g class="garden-hotspot ${activeHotspot === "oak_tree" ? "is-active" : ""}"
           data-hotspot="oak_tree" tabindex="0" role="button" aria-label="Look Behind the Big Oak Tree"
           onclick="window.ChickenMission && window.ChickenMission.tapHotspot('oak_tree')">
          <!-- Milo's toy bone peeking BEHIND the tree trunk -->
          <g opacity="${showClueLens || idx >= 2 ? "1" : "0.35"}">
            <rect x="444" y="198" width="22" height="8" rx="4" fill="#FFFDF5" stroke="#D4A359" stroke-width="2"/>
            <circle cx="445" cy="198" r="4.5" fill="#FFFDF5" stroke="#D4A359" stroke-width="1.8"/>
            <circle cx="445" cy="206" r="4.5" fill="#FFFDF5" stroke="#D4A359" stroke-width="1.8"/>
            <circle cx="466" cy="198" r="4.5" fill="#FFFDF5" stroke="#D4A359" stroke-width="1.8"/>
            <circle cx="466" cy="206" r="4.5" fill="#FFFDF5" stroke="#D4A359" stroke-width="1.8"/>
          </g>
          <!-- Tree trunk -->
          <path d="M402 222 Q410 175 406 142 L438 142 Q434 175 446 222 Z" fill="#A97142" stroke="#734824" stroke-width="2.5"/>
          <!-- Lush leafy canopy -->
          <circle cx="422" cy="112" r="44" fill="#4DB882" stroke="#2F8D5E" stroke-width="2.5"/>
          <circle cx="386" cy="126" r="30" fill="#5DC992"/>
          <circle cx="458" cy="126" r="30" fill="#5DC992"/>
          <circle cx="422" cy="88" r="32" fill="#71D9A2"/>
          ${hasBone ? `<text x="424" y="78" text-anchor="middle" font-size="18">🦴✅</text>` : ""}
          ${showMapOverlay ? `
            <rect x="372" y="138" width="102" height="22" rx="11" fill="#FFF3C4" stroke="#E5A91A" stroke-width="2"/>
            <text x="423" y="153" text-anchor="middle" font-family="Nunito, sans-serif" font-size="10.5" font-weight="800" fill="#4A3208">🌳 Big Oak Tree</text>
          ` : ""}
        </g>

        <!-- ============ HOTSPOT 4: COZY GAZEBO & MILO'S BERRY BUSH ============ -->
        <g class="garden-hotspot ${activeHotspot === "milo_bush" ? "is-active" : ""}"
           data-hotspot="milo_bush" tabindex="0" role="button" aria-label="Berry Bush where Milo is hiding"
           onclick="window.ChickenMission && window.ChickenMission.tapHotspot('milo_bush')">
          <!-- Cozy Gazebo -->
          <path d="M582 140 L654 102 L726 140 Z" fill="#FF986A" stroke="#D46535" stroke-width="2.8" stroke-linejoin="round"/>
          <rect x="602" y="140" width="10" height="66" fill="#FFF3D6" stroke="#C9A86A" stroke-width="2"/>
          <rect x="696" y="140" width="10" height="66" fill="#FFF3D6" stroke="#C9A86A" stroke-width="2"/>
          <rect x="594" y="198" width="120" height="12" rx="6" fill="#E3B979" stroke="#A67C3D" stroke-width="2"/>

          <!-- Wiggling Berry Bush -->
          <g class="${idx === 3 && !miloRescued ? "garden-wiggle" : ""}">
            <ellipse cx="672" cy="204" rx="42" ry="26" fill="#52BA85" stroke="#2D8B5B" stroke-width="2.5"/>
            <circle cx="654" cy="194" r="19" fill="#67CE9A"/>
            <circle cx="690" cy="196" r="18" fill="#67CE9A"/>
            <circle cx="654" cy="194" r="4" fill="#FF986A"/>
            <circle cx="688" cy="190" r="4" fill="#FF986A"/>
            <circle cx="672" cy="204" r="4" fill="#FFD54F"/>
          </g>

          <!-- Cute Milo Puppy (peeks floppy ears at Stage 3, jumps out happily when rescued!) -->
          <g class="milo-puppy ${miloRescued ? "milo-rescued" : ""}" opacity="${miloRescued || idx === 3 || showClueLens ? "1" : "0.18"}"
             transform="translate(${miloRescued ? "650, 146" : "652, 166"})">
            <!-- Floppy ears -->
            <ellipse cx="4" cy="18" rx="8" ry="14" transform="rotate(20 4 18)" fill="#9E6234"/>
            <ellipse cx="36" cy="18" rx="8" ry="14" transform="rotate(-20 36 18)" fill="#9E6234"/>
            <!-- Puppy head -->
            <circle cx="20" cy="18" r="16" fill="#E6B17A" stroke="#9E6234" stroke-width="2"/>
            <!-- Cute eye patch -->
            <circle cx="14" cy="16" r="6" fill="#B57542" opacity="0.55"/>
            <!-- Happy eyes -->
            <circle cx="14" cy="16" r="2.6" fill="#2D241E"/>
            <circle cx="26" cy="16" r="2.6" fill="#2D241E"/>
            <circle cx="13" cy="15" r="0.9" fill="#FFFFFF"/>
            <circle cx="25" cy="15" r="0.9" fill="#FFFFFF"/>
            <!-- Nose & smile -->
            <ellipse cx="20" cy="21" rx="3.4" ry="2.4" fill="#2D241E"/>
            <path d="M16 25 Q20 29 24 25" fill="none" stroke="#5A3316" stroke-width="1.8" stroke-linecap="round"/>
            ${miloRescued ? `<text x="20" y="-6" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="14" font-weight="700" fill="#E06D3B">Woof! 💖</text>` : ""}
          </g>
        </g>

        <!-- ============ CLUE SPOTTER PAW-PRINT TRAIL ============ -->
        ${showClueLens ? `
          <g class="garden-paw-trail">
            <text x="172" y="255" font-size="16" opacity="0.9">🐾</text>
            <text x="208" y="242" font-size="16" opacity="0.9">🐾</text>
            <text x="330" y="226" font-size="16" opacity="${idx >= 1 ? "0.9" : "0.45"}">🐾</text>
            <text x="380" y="222" font-size="16" opacity="${idx >= 1 ? "0.9" : "0.45"}">🐾</text>
            <text x="515" y="246" font-size="16" opacity="${idx >= 2 ? "0.95" : "0.35"}">🐾</text>
            <text x="580" y="236" font-size="16" opacity="${idx >= 2 ? "0.95" : "0.35"}">🐾</text>
          </g>
        ` : ""}

        <!-- ============ ANIMATED EXPLORER TOKENS (YOU + BUDDY) ============ -->
        <g class="garden-explorer explorer-you" transform="translate(${pos.you.x}, ${pos.you.y})">
          <circle cx="0" cy="0" r="22" fill="#FFD54F" stroke="#FFFFFF" stroke-width="3.5"/>
          <text x="0" y="7" text-anchor="middle" font-size="21">${kidAvatar}</text>
          <rect x="-24" y="22" width="48" height="17" rx="8.5" fill="#2D241E"/>
          <text x="0" y="34" text-anchor="middle" font-family="Nunito, sans-serif" font-size="10" font-weight="800" fill="#FFFFFF">YOU</text>
        </g>

        <g class="garden-explorer explorer-buddy" transform="translate(${pos.buddy.x}, ${pos.buddy.y})">
          <circle cx="0" cy="0" r="22" fill="#73C9F5" stroke="#FFFFFF" stroke-width="3.5"/>
          <text x="0" y="7" text-anchor="middle" font-size="21">${buddyAvatar}</text>
          <rect x="-28" y="22" width="56" height="17" rx="8.5" fill="#0E3B56"/>
          <text x="0" y="34" text-anchor="middle" font-family="Nunito, sans-serif" font-size="10" font-weight="800" fill="#FFFFFF">${buddyName}</text>
        </g>

        <!-- Role Indicator Badge on Scene -->
        <g transform="translate(16, 16)">
          <rect x="0" y="0" width="${peekPartner ? 236 : 190}" height="32" rx="16" fill="rgba(255,255,255,0.92)" stroke="#F0E3C4" stroke-width="2"/>
          <text x="14" y="21" font-family="Nunito, sans-serif" font-size="12" font-weight="800" fill="#2D241E">
            ${peekPartner ? "👀 Split-Clue Preview (Demo)" : (role === "map_scout" ? "🗺️ View: Map Scout" : "🔎 View: Clue Spotter")}
          </text>
        </g>
      </svg>
    `;
  }

  window.MagicGardenScene = {
    render: renderMagicGarden
  };
})();
