// ==========================================================================
// CHICKEN TALK — Playable Cooperative Mission Controller
// World 1: The Magic Garden — "The Missing Puppy"
// Implements: Chicky Mission Intro, Information Gap dual views, Simulated
// Buddy Demo Mode (explicitly labeled), Push-to-Talk + Picture Cards +
// Level 0-3 Adaptive Hints, Gentle Recasting, Pause/Safe Exit, Celebration.
// ==========================================================================

(function () {
  const missionState = {
    active: false,
    paused: false,
    mode: "demo", // demo | live_pair
    pairCode: "",
    roomId: null,
    stageIndex: 0,
    role: "map_scout", // map_scout | clue_spotter
    peekPartner: false,
    hintLevel: 1, // 0, 1, 2, 3
    buddy: { id: "luna_demo", name: "Luna", avatar: "🐰", isDemoBot: true },
    foundClues: [],
    phrasesPracticed: [],
    recastsReceived: [],
    miloRescued: false,
    stageSpoken: false,
    startedAt: 0,
    sessionTimer: null,
    elapsedSeconds: 0,
    micReady: false
  };

  function getLang() {
    return (window.ChickenApp && window.ChickenApp.getLang()) || "vi";
  }

  function speak(text, { pitch = 1.18, rate = 0.94, onEnd = null } = {}) {
    if (window.ChickenApp && window.ChickenApp.speakVoice) {
      window.ChickenApp.speakVoice(text, { pitch, rate, onEnd });
    }
  }

  function playSfx(kind) {
    if (!window.ChickenApp) return;
    if (kind === "fanfare") window.ChickenApp.playFanfare();
    else if (kind === "sparkle") window.ChickenApp.playTone(760, 0.11);
    else if (kind === "soft") window.ChickenApp.playTone(540, 0.08);
  }

  function currentStage() {
    return window.ChickenData.MISSING_PUPPY_STAGES[missionState.stageIndex];
  }

  function getBuddyVoicePitch() {
    return 1.32; // Distinct cheerful friendly voice for Simulated Buddy Luna
  }

  function updateChicky(state, enText, viText) {
    window.ChickenMascot.setState("missionChickyMascot", state);
    const enEl = document.getElementById("missionChickyEn");
    const viEl = document.getElementById("missionChickyVi");
    if (enEl && enText) enEl.textContent = enText;
    if (viEl && viText !== undefined) viEl.textContent = viText;
  }

  function updateBuddySpeech(text, isThinking = false) {
    const el = document.getElementById("missionBuddySpeech");
    const badge = document.getElementById("missionBuddyStatus");
    if (el) el.textContent = text;
    if (badge) {
      if (missionState.mode === "live_pair") {
        badge.className = "approved-tag";
        badge.textContent = getLang() === "vi"
          ? `🟢 Bạn Thật • Phòng #${missionState.pairCode}`
          : `🟢 Live Buddy • Room #${missionState.pairCode}`;
      } else {
        badge.className = "demo-tag";
        badge.textContent = isThinking
          ? (getLang() === "vi" ? "🤖 Đang lắng nghe... (Demo)" : "🤖 Listening... (Demo)")
          : (getLang() === "vi" ? "🤖 Bạn giả lập • Chế độ Demo" : "🤖 Simulated Buddy • Demo Mode");
      }
    }
  }

  function renderStageUI() {
    const st = currentStage();
    const lang = getLang();
    const kidAvatar = window.ChickenApp?.getKidProfile()?.avatar || "🐥";

    // Progress stepper
    const stepper = document.getElementById("missionStepper");
    if (stepper) {
      stepper.innerHTML = window.ChickenData.MISSING_PUPPY_STAGES.map((s, i) => {
        const cls = i < missionState.stageIndex ? "done" : i === missionState.stageIndex ? "current" : "";
        return `<div class="step-pill ${cls}"><span>${i < missionState.stageIndex ? "✓" : i + 1}</span><small>${lang === "vi" ? s.titleVi.replace(/^\d+\.\s*/, "") : s.title.replace(/^\d+\.\s*/, "")}</small></div>`;
      }).join("");
    }

    // Scene title & Role clue card (Information Gap!)
    const sceneTitle = document.getElementById("missionStageTitle");
    if (sceneTitle) {
      sceneTitle.textContent = lang === "vi" ? st.titleVi : st.title;
    }

    const clueEl = document.getElementById("missionYourClue");
    if (clueEl) {
      const isScout = missionState.role === "map_scout";
      clueEl.innerHTML = `
        <div class="clue-role-tag">${isScout ? "🗺️ Map Scout (Your Info)" : "🔎 Clue Spotter (Your Info)"}</div>
        <div class="clue-role-text">${isScout ? st.mapScoutClue : st.clueSpotterClue}</div>
        ${lang === "vi" ? `<div class="clue-role-vi">${isScout ? st.mapScoutClueVi : st.clueSpotterClueVi}</div>` : ""}
      `;
    }

    // Render 2.5D Interactive Magic Garden Scene
    const gardenWrap = document.getElementById("missionGardenWrap");
    if (gardenWrap) {
      gardenWrap.innerHTML = window.MagicGardenScene.render({
        stageIndex: missionState.stageIndex,
        role: missionState.role,
        peekPartner: missionState.peekPartner,
        foundClues: missionState.foundClues,
        miloRescued: missionState.miloRescued,
        kidAvatar,
        buddyAvatar: missionState.buddy.avatar,
        buddyName: missionState.buddy.name
      });
    }

    // Update Peek button & Role badge
    const peekBtn = document.getElementById("missionPeekBtn");
    if (peekBtn) {
      peekBtn.classList.toggle("active", missionState.peekPartner);
      peekBtn.textContent = missionState.peekPartner
        ? (lang === "vi" ? "👀 Đang xem cả 2 góc nhìn" : "👀 Split-Clue View: ON")
        : (lang === "vi" ? "👀 Xem thử góc nhìn bạn (Demo)" : "👀 Peek Partner Clue (Demo)");
    }

    // Render Picture Action Cards
    const picRow = document.getElementById("missionPictureCards");
    if (picRow) {
      picRow.innerHTML = st.pictureCards
        .map(
          c => `
            <button type="button" class="pic-action-card" onclick="window.ChickenMission.sendPhrase('${c.phrase.replace(/'/g, "\\'")}', 'picture')">
              <span class="pic-card-icon">${c.icon}</span>
              <span class="pic-card-label">${c.label}</span>
            </button>
          `
        )
        .join("");
    }

    // Render Adaptive Hints for current level (0-3)
    renderAdaptiveHints();

    // Update buddy avatar & name
    const bAv = document.getElementById("missionBuddyAvatar");
    const bName = document.getElementById("missionBuddyName");
    if (bAv) bAv.textContent = missionState.buddy.avatar;
    if (bName) bName.textContent = missionState.buddy.name;
  }

  function renderAdaptiveHints() {
    const st = currentStage();
    const lang = getLang();
    const level = missionState.hintLevel;
    const h = st.hints[level] || st.hints[1];

    // Update level selector buttons
    document.querySelectorAll(".hint-lvl-btn").forEach(btn => {
      btn.classList.toggle("active", Number(btn.dataset.level) === level);
    });

    const box = document.getElementById("missionHintContent");
    if (!box) return;

    const tipText = lang === "vi" ? h.tipVi : h.tip;
    if (h.phrases && h.phrases.length > 0) {
      box.innerHTML = `
        <div class="hint-tip-line">💡 <strong>Level ${level}:</strong> ${tipText}</div>
        <div class="hint-phrase-chips">
          ${h.phrases
            .map(p => {
              // Clean fill-in hints so tapping speaks the natural complete target phrase
              const spokenPhrase = p.includes("___") ? st.targetPhrase : p;
              return `<button type="button" class="mission-phrase-chip" onclick="window.ChickenMission.sendPhrase('${spokenPhrase.replace(/'/g, "\\'")}', 'hint')">🗣️ ${p}</button>`;
            })
            .join("")}
        </div>
      `;
    } else {
      box.innerHTML = `
        <div class="hint-tip-line">💡 <strong>Level ${level}:</strong> ${tipText}</div>
      `;
    }
  }

  function setHintLevel(level) {
    missionState.hintLevel = Math.max(0, Math.min(3, Number(level)));
    renderAdaptiveHints();
    window.ChickenMascot.setState("missionChickyMascot", missionState.hintLevel === 0 ? "pointing" : "hinting");
    playSfx("soft");
    window.ChickenApp?.trackEvent("hint_used", { metadata: { mission: "missing_puppy", level: missionState.hintLevel } });
  }

  function requestChickyHint() {
    const st = currentStage();
    // Gently bump from Level 3/0 into Level 1 if child asks Chicky for help
    if (missionState.hintLevel === 3 || missionState.hintLevel === 0) {
      missionState.hintLevel = 1;
      renderAdaptiveHints();
    }
    const hintMsg = `Here is a little tip! Try saying: "${st.targetPhrase}"`;
    const hintVi = `Chicky gợi ý nhỏ nè! Bé thử nói hoặc bấm: "${st.targetPhrase}" nhé!`;
    updateChicky("hinting", hintMsg, hintVi);
    speak(hintMsg, { pitch: 1.2 });
    playSfx("sparkle");
    window.ChickenApp?.trackEvent("hint_used", { metadata: { mission: "missing_puppy", source: "help_btn", stage: st.id } });
  }

  function announceCurrentStage() {
    const st = currentStage();
    const isScout = missionState.role === "map_scout";
    const buddyLine = isScout ? st.buddyAsSpotter : st.buddyAsScout;

    updateChicky("pointing", st.chickyIntro, st.chickyIntroVi);
    updateBuddySpeech(buddyLine, false);
    speak(st.chickyIntro, {
      pitch: 1.2,
      onEnd: () => {
        if (missionState.active && !missionState.paused) {
          window.ChickenMascot.setState("missionChickyMascot", "idle");
        }
      }
    });
  }

  function startMission({ buddy, approvedBuddies = [], role = "map_scout", hintLevel = 1, mode = "demo", pairCode = "" } = {}) {
    missionState.active = true;
    missionState.paused = false;
    missionState.mode = mode === "live_pair" ? "live_pair" : "demo";
    missionState.pairCode = pairCode || "";
    missionState.roomId = null;
    missionState.stageIndex = 0;
    missionState.role = role || "map_scout";
    missionState.peekPartner = false;
    missionState.hintLevel = [0, 1, 2, 3].includes(Number(hintLevel)) ? Number(hintLevel) : 1;
    missionState.buddy = buddy || { id: "luna_demo", name: "Luna", avatar: "🐰", isDemoBot: true };
    missionState.foundClues = [];
    missionState.phrasesPracticed = [];
    missionState.recastsReceived = [];
    missionState.miloRescued = false;
    missionState.stageSpoken = false;
    missionState.startedAt = Date.now();
    missionState.elapsedSeconds = 0;

    // Show quick Call button inside mission top bar when paired live
    document.getElementById("missionPairCallBtn")?.classList.toggle("hidden", missionState.mode !== "live_pair");

    // Register authoritative private room on backend when available (graceful offline fallback)
    const apiBase = window.ChickenApp?.getApiBase?.();
    if (apiBase && window.location.protocol.startsWith("http")) {
      fetch(`${apiBase}/api/rooms/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(2000),
        body: JSON.stringify({
          buddyId: missionState.buddy.id,
          approvedBuddies: approvedBuddies.length ? approvedBuddies : [{ ...missionState.buddy, approved: true }],
          role: missionState.role
        })
      })
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (d?.room?.roomId) missionState.roomId = d.room.roomId; })
        .catch(() => {});
    }

    // Clear any previous timer
    clearInterval(missionState.sessionTimer);
    missionState.sessionTimer = setInterval(() => {
      if (!missionState.active || missionState.paused) return;
      missionState.elapsedSeconds++;
      const el = document.getElementById("missionTimerBadge");
      if (el) {
        const m = String(Math.floor(missionState.elapsedSeconds / 60)).padStart(2, "0");
        const s = String(missionState.elapsedSeconds % 60).padStart(2, "0");
        el.textContent = `⏱️ ${m}:${s}`;
      }
    }, 1000);

    // Mount Chicky SVG inside Mission stage & Intro modal
    const chickyMount = document.getElementById("missionChickyMount");
    if (chickyMount) {
      chickyMount.innerHTML = window.ChickenMascot.render({ size: "md", state: "greeting", id: "missionChickyMascot" });
    }
    const introMount = document.getElementById("missionIntroChickyMount");
    if (introMount) {
      introMount.innerHTML = window.ChickenMascot.render({ size: "lg", state: "greeting", id: "missionIntroChicky" });
    }

    // Show Mission Screen + Intro Story Card first
    window.ChickenApp?.showScreen("mission");
    document.getElementById("missionPauseOverlay")?.classList.add("hidden");
    const introModal = document.getElementById("missionIntroOverlay");
    if (introModal) {
      const buddyNameEl = document.getElementById("introBuddyName");
      if (buddyNameEl) buddyNameEl.textContent = `${missionState.buddy.avatar} ${missionState.buddy.name}`;
      introModal.classList.remove("hidden");
    }

    renderStageUI();
    playSfx("fanfare");
    speak("Hi explorers! Little puppy Milo chased a butterfly into the Magic Garden! Let's work together to find Milo!", { pitch: 1.2 });
  }

  function beginGameplayAfterIntro() {
    document.getElementById("missionIntroOverlay")?.classList.add("hidden");
    playSfx("sparkle");
    announceCurrentStage();
  }

  function showRecastBanner(recastText) {
    const el = document.getElementById("missionRecastBanner");
    if (!el) return;
    if (!recastText) {
      el.classList.add("hidden");
      return;
    }
    el.innerHTML = `✨ <strong>Chicky's Gentle Echo:</strong> "${recastText}"`;
    el.classList.remove("hidden");
  }

  function addSpeechBubbleEcho(phrase, mode) {
    const echo = document.getElementById("missionYouSaid");
    if (!echo) return;
    const icon = mode === "voice" ? "🎤" : mode === "picture" ? "🖼️" : "💬";
    echo.innerHTML = `${icon} <strong>You said:</strong> "${phrase}"`;
    echo.classList.remove("hidden");
  }

  async function sendPhrase(phrase, inputMode = "voice") {
    if (!missionState.active || missionState.paused) return;
    const text = String(phrase || "").trim();
    if (!text) return;

    addSpeechBubbleEcho(text, inputMode);
    updateChicky("thinking", "Ooh, let me listen!", "Chicky đang nghe bé nói nè...");

    // Enforce gameplay action server-side when room exists, else deterministic local engine
    let evalRes = null;
    try {
      const apiBase = window.ChickenApp?.getApiBase?.();
      if (apiBase && window.location.protocol.startsWith("http")) {
        const endpoint = missionState.roomId
          ? `${apiBase}/api/rooms/${encodeURIComponent(missionState.roomId)}/action`
          : `${apiBase}/api/mission/hint`;
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(1800),
          body: JSON.stringify({
            stageIndex: missionState.stageIndex,
            utterance: text,
            hintLevel: missionState.hintLevel
          })
        });
        if (resp.ok) {
          const json = await resp.json();
          evalRes = json.evaluation || json;
        }
      }
    } catch {
      // Seamless local deterministic fallback
    }

    if (!evalRes) {
      evalRes = window.ChickenData.evaluateUtteranceLocal(missionState.stageIndex, text, missionState.hintLevel);
    }

    window.ChickenApp?.trackEvent("speak_attempt", {
      metadata: { mission: "missing_puppy", stage: currentStage().id, inputMode, text: text.slice(0, 60) }
    });

    showRecastBanner(evalRes.recast);
    if (evalRes.recast) {
      missionState.recastsReceived.push({ said: text, recast: evalRes.recast });
    }

    if (evalRes.matched) {
      if (missionState.mode === "live_pair") {
        window.ChickenPair?.broadcastMissionAction?.({
          stageIndex: missionState.stageIndex,
          utterance: text,
          matched: true,
          evalRes
        });
      }
      advanceCurrentStage(evalRes);
    } else {
      if (missionState.mode === "live_pair") {
        window.ChickenPair?.broadcastMissionAction?.({
          stageIndex: missionState.stageIndex,
          utterance: text,
          matched: false
        });
      }
      updateChicky(evalRes.chickyState || "hinting", evalRes.chickyReply, evalRes.chickyReplyVi);
      speak(evalRes.chickyReply, { pitch: 1.2 });
      playSfx("soft");
    }
  }

  function receivePeerAction(data) {
    if (!missionState.active || missionState.mode !== "live_pair") return;
    if (data.utterance) {
      updateBuddySpeech(`🗣️ "${data.utterance}"`, false);
      speak(data.utterance, { pitch: getBuddyVoicePitch() });
    }
    if (data.matched && Number(data.stageIndex) === missionState.stageIndex) {
      const evalRes = data.evalRes || window.ChickenData.evaluateUtteranceLocal(missionState.stageIndex, data.utterance || currentStage().targetPhrase, missionState.hintLevel);
      advanceCurrentStage(evalRes);
    }
  }

  function tapHotspot(hotspotId) {
    if (!missionState.active || missionState.paused) return;
    const st = currentStage();
    if (hotspotId === st.requiredHotspot) {
      // Tapping the glowing clue works seamlessly with picture/audio scaffolding!
      sendPhrase(st.targetPhrase, "picture");
    } else {
      updateChicky(
        "pointing",
        `Ooh, good exploring! Now look at the glowing spot for "${st.targetPhrase}"!`,
        `Khám phá giỏi lắm! Bây giờ thử chạm vào điểm đang phát sáng cho "${st.targetPhrase}" nhé!`
      );
      playSfx("soft");
    }
  }

  function advanceCurrentStage(evalRes) {
    const st = currentStage();
    if (!missionState.foundClues.includes(st.requiredHotspot)) {
      missionState.foundClues.push(st.requiredHotspot);
    }
    const practiced = evalRes.phrasePracticed || st.targetPhrase;
    if (!missionState.phrasesPracticed.includes(practiced)) {
      missionState.phrasesPracticed.push(practiced);
    }

    updateChicky("celebrating", evalRes.chickyReply, evalRes.chickyReplyVi);
    updateBuddySpeech(st.successBuddy, false);
    playSfx("fanfare");
    window.ChickenApp?.addAdventureStars(2);
    window.ChickenApp?.trackEvent("mission_step", {
      isCorrect: true,
      metadata: { mission: "missing_puppy", stage: st.id, phrase: practiced }
    });

    if (missionState.stageIndex >= window.ChickenData.MISSING_PUPPY_STAGES.length - 1) {
      // Rescued Milo!
      missionState.miloRescued = true;
      renderStageUI();
      speak(`${evalRes.chickyReply} ${st.successBuddy}`, { pitch: 1.22 });
      setTimeout(() => completeMission(), 2000);
    } else {
      renderStageUI();
      speak(evalRes.chickyReply, {
        pitch: 1.2,
        onEnd: () => {
          // Simulated buddy cheer right before next stage
          if (missionState.active && !missionState.paused) {
            speak(st.successBuddy, { pitch: getBuddyVoicePitch() });
          }
        }
      });

      setTimeout(() => {
        if (!missionState.active) return;
        missionState.stageIndex++;
        showRecastBanner(null);
        document.getElementById("missionYouSaid")?.classList.add("hidden");
        renderStageUI();
        announceCurrentStage();
      }, 2400);
    }
  }

  function completeMission() {
    missionState.active = false;
    clearInterval(missionState.sessionTimer);

    window.ChickenApp?.addAdventureStars(5);
    window.ChickenApp?.recordMissionCompletion({
      worldId: "magic_garden",
      missionId: "missing_puppy",
      missionTitle: "The Missing Puppy",
      buddyName: missionState.buddy.name,
      isDemoMode: Boolean(missionState.buddy.isDemoBot),
      phrasesPracticed: [...missionState.phrasesPracticed],
      durationSec: missionState.elapsedSeconds,
      badge: window.ChickenData.WORLDS[0].badge
    });

    // Populate celebration screen
    const celebMount = document.getElementById("completeChickyMount");
    if (celebMount) {
      celebMount.innerHTML = window.ChickenMascot.render({ size: "hero", state: "celebrating", id: "completeChickyMascot" });
    }

    const phraseList = document.getElementById("completePhrasesList");
    if (phraseList) {
      const items = missionState.phrasesPracticed.length
        ? missionState.phrasesPracticed
        : ["Where is Milo?", "Go left!", "I see a blue collar!", "Behind the tree!", "I see Milo! Let's go!"];
      phraseList.innerHTML = items
        .map(p => `<button type="button" class="complete-phrase-pill" onclick="window.ChickenApp.speakVoice('${p.replace(/'/g, "\\'")}')">🔊 ${p}</button>`)
        .join("");
    }

    const buddyNote = document.getElementById("completeBuddySummary");
    if (buddyNote) {
      buddyNote.textContent = `${missionState.buddy.avatar} ${missionState.buddy.name}${missionState.buddy.isDemoBot ? " (Simulated Demo Buddy)" : ""}`;
    }

    window.ChickenApp?.showScreen("complete");
    window.ChickenApp?.launchConfetti();
    playSfx("fanfare");
    speak("Hooray! You and your buddy rescued Milo! Amazing English teamwork! See you next adventure!", {
      pitch: 1.2,
      onEnd: () => {
        window.ChickenMascot.setState("completeChickyMascot", "goodbye");
      }
    });
  }

  function togglePeekPartner() {
    missionState.peekPartner = !missionState.peekPartner;
    renderStageUI();
    playSfx("soft");
  }

  function switchRoleInMission() {
    missionState.role = missionState.role === "map_scout" ? "clue_spotter" : "map_scout";
    renderStageUI();
    playSfx("soft");
  }

  function pauseMission() {
    if (!missionState.active) return;
    missionState.paused = true;
    window.speechSynthesis?.cancel();
    const mount = document.getElementById("pauseChickyMount");
    if (mount) mount.innerHTML = window.ChickenMascot.render({ size: "md", state: "idle", id: "pauseChicky" });
    document.getElementById("missionPauseOverlay")?.classList.remove("hidden");
    playSfx("soft");
  }

  function resumeMission() {
    missionState.paused = false;
    document.getElementById("missionPauseOverlay")?.classList.add("hidden");
    playSfx("sparkle");
  }

  function safeExitMission(reason = "kid_exit") {
    const activeRoomId = missionState.roomId;
    missionState.active = false;
    missionState.paused = false;
    missionState.roomId = null;
    clearInterval(missionState.sessionTimer);
    window.speechSynthesis?.cancel();
    if (activeRoomId && window.ChickenApp?.getApiBase?.() && window.location.protocol.startsWith("http")) {
      fetch(`${window.ChickenApp.getApiBase()}/api/rooms/${encodeURIComponent(activeRoomId)}/terminate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      }).catch(() => {});
    }
    document.getElementById("missionPauseOverlay")?.classList.add("hidden");
    document.getElementById("missionIntroOverlay")?.classList.add("hidden");
    if (reason === "parent_end") {
      window.ChickenApp?.showScreen("home");
    } else {
      window.ChickenApp?.showScreen("worlds");
    }
    playSfx("soft");
  }

  function togglePushToTalk() {
    if (!missionState.active || missionState.paused) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const pttBtn = document.getElementById("missionPttBtn");
    if (!SR) {
      // Friendly fallback without error popup: highlight picture cards & phrases!
      updateChicky(
        "hinting",
        "No microphone needed! Tap a Picture Card or Phrase below to speak with your buddy!",
        "Không cần micro cũng chơi được! Bé chạm vào Thẻ Hình Ảnh hoặc Câu Gợi Ý bên dưới nhé!"
      );
      setHintLevel(1);
      return;
    }

    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    updateChicky("listening", "I'm listening! Speak in English!", "Chicky đang lắng nghe bé nói nè!");
    if (pttBtn) {
      pttBtn.classList.add("is-listening");
      pttBtn.innerHTML = "👂 <span>Listening... Speak now!</span>";
    }
    playSfx("soft");

    let handled = false;
    rec.onresult = ev => {
      if (handled) return;
      handled = true;
      const spoken = ev.results?.[0]?.[0]?.transcript || "";
      if (spoken) sendPhrase(spoken, "voice");
    };
    rec.onerror = () => {
      updateChicky("hinting", "I couldn't hear clearly — try again or tap a Picture Card!", "Chicky chưa nghe rõ — bé nói lại hoặc chạm thẻ hình bên dưới nhé!");
    };
    rec.onend = () => {
      if (pttBtn) {
        pttBtn.classList.remove("is-listening");
        pttBtn.innerHTML = `🎤 <span>${getLang() === "vi" ? "BẤM ĐỂ NÓI (PUSH-TO-TALK)" : "TAP TO SPEAK (PUSH-TO-TALK)"}</span>`;
      }
    };
    try {
      rec.start();
    } catch {
      updateChicky("hinting", "Tap any Picture Card or Phrase below to talk!", "Chạm Thẻ Hình Ảnh hoặc Câu Gợi Ý bên dưới nhé!");
    }
  }

  function sendTypedDemoPhrase() {
    const inp = document.getElementById("missionQuickInput");
    if (!inp) return;
    const v = inp.value.trim();
    if (!v) return;
    if (window.ChickenApp?.resetChatInputSafely) window.ChickenApp.resetChatInputSafely(inp);
    else inp.value = "";
    sendPhrase(v, "text");
  }

  window.ChickenMission = {
    state: missionState,
    startMission,
    beginGameplayAfterIntro,
    sendPhrase,
    sendTypedDemoPhrase,
    receivePeerAction,
    tapHotspot,
    setHintLevel,
    requestChickyHint,
    togglePeekPartner,
    switchRoleInMission,
    togglePushToTalk,
    pauseMission,
    resumeMission,
    safeExitMission
  };
})();
