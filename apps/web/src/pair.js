// ==========================================================================
// CHICKEN TALK — Pair Room (4-Digit Code), WebRTC 1-Screen Split Video/Voice
// Call, Live Pair Co-op Mission Sync & Chicky Buddy Race Game!
// Transport: MQTT over WSS (cross-device Internet) + BroadcastChannel
// (instant same-device multi-tab fallback) with msgId deduplication.
// ==========================================================================

(function () {
  const myClientId = "ct_" + Math.random().toString(36).slice(2, 10);
  const MQTT_BROKERS = [
    "wss://broker.emqx.io:8084/mqtt",
    "wss://broker.hivemq.com:8884/mqtt"
  ];

  const seenMsgIds = new Set();
  let mqttClient = null;
  let localBus = null;
  let activeConnToken = 0;
  let joinRetryTimer = null;

  const pairState = {
    code: "",
    topic: "",
    isHost: false,
    connected: false,
    friendNick: "Friend",
    friendAvatar: "🐰",
    callActive: false,
    callKind: "video", // video | audio
    callCompact: false
  };

  // WebRTC state
  let rtcPc = null;
  let localStream = null;
  let remoteStream = null;
  let pendingCandidates = [];
  let incomingOffer = null; // { sdp, from, kind }
  let micEnabled = true;
  let camEnabled = true;
  let currentFacingMode = "user";

  // Pair Mission Invite state
  let pendingMissionInvite = null;

  // Chicky Buddy Race state
  const RACE_POOL = [
    { type: "quiz", q: "Where is Milo hiding? Look ____ the tree! 🌳", opts: ["behind", "eating", "flying"], ans: 0, skill: "articles" },
    { type: "quiz", q: "Which sentence sounds natural & correct? 🐶", opts: ["Milo have a blue collar.", "Milo has a blue collar.", "Milo having a blue collar."], ans: 1, skill: "has_have" },
    { type: "speak", q: "Say this out loud to cheer your buddy! 🎤", target: "Where is Milo Let's go left", skill: "like_dislike" },
    { type: "quiz", q: "Pick the natural English sentence: 🐥", opts: ["I likes yellow flowers!", "I like yellow flowers!", "I liking yellow flowers!"], ans: 1, skill: "like_dislike" },
    { type: "quiz", q: "Look! The yellow butterfly ____ flying! 🦋", opts: ["am", "are", "is"], ans: 2, skill: "present_continuous" },
    { type: "speak", q: "Say this out loud clearly! 🎤", target: "I see a blue collar behind the tree", skill: "has_have" },
    { type: "quiz", q: "Can I have ____ apple, please? 🍎", opts: ["a", "an", "two"], ans: 1, skill: "articles" },
    { type: "quiz", q: "Yesterday we ____ Milo in the Magic Garden! 🌿", opts: ["found", "find", "finding"], ans: 0, skill: "past_simple" }
  ];

  let raceQuestions = [];
  let pendingInviteDeck = null;
  let raceIdx = 0;
  let raceMyScore = 0;
  let raceRivalScore = 0;
  let raceStreak = 0;
  let raceTimer = null;
  let raceCountdownTimer = null;
  let raceTimeLeft = 15;
  let raceLocked = false;
  let raceFinished = false;
  let raceQuestionStartAt = 0;
  let raceListening = false;
  let raceRecognition = null;

  function getLang() {
    return (window.ChickenApp && window.ChickenApp.getLang()) || "vi";
  }

  function getMyNick() {
    const inp = document.getElementById("pairNickInput");
    return (inp && inp.value.trim()) || window.ChickenApp?.getKidProfile()?.nickname || "Minh";
  }

  function getMyAvatar() {
    return window.ChickenApp?.getKidProfile()?.avatar || "🐥";
  }

  function playTone(f, d) { window.ChickenApp?.playTone?.(f, d); }
  function playFanfare() { window.ChickenApp?.playFanfare?.(); }
  function speak(txt, opts) { window.ChickenApp?.speakVoice?.(txt, opts); }

  function setPairStatus(text, tone = "warn") {
    const el = document.getElementById("pairStatusText");
    if (el) {
      el.textContent = text;
      el.className = `pair-status-badge tone-${tone}`;
    }
    const headerPill = document.getElementById("headerPairLivePill");
    if (headerPill) {
      headerPill.classList.toggle("hidden", !pairState.connected);
      if (pairState.connected) {
        headerPill.textContent = `🟢 ${pairState.friendAvatar} ${pairState.friendNick} (#${pairState.code})`;
      }
    }
  }

  function updatePairControlsUI() {
    const inRoom = Boolean(pairState.code);
    document.getElementById("pairJoinRow")?.classList.toggle("hidden", inRoom);
    document.getElementById("pairInRoomRow")?.classList.toggle("hidden", !inRoom);
    document.getElementById("pairConnectedActions")?.classList.toggle("hidden", !pairState.connected);
    const codeBox = document.getElementById("pairRoomCodeDisplay");
    if (codeBox) codeBox.textContent = pairState.code || "----";

    const remoteLbl = document.getElementById("remoteVideoLabel");
    if (remoteLbl) {
      remoteLbl.textContent = `📹 ${pairState.friendAvatar} ${pairState.friendNick}`;
    }
    const localLbl = document.getElementById("localCamTag");
    if (localLbl) {
      localLbl.textContent = `📹 ${getMyAvatar()} ${getMyNick()} (${getLang() === "vi" ? "Bạn" : "You"})`;
    }
    const lobbyLiveCard = document.getElementById("lobbyLivePairBanner");
    if (lobbyLiveCard) {
      lobbyLiveCard.classList.toggle("hidden", !pairState.connected);
      const txt = document.getElementById("lobbyLivePairText");
      if (txt && pairState.connected) {
        txt.textContent = getLang() === "vi"
          ? `🟢 Đang ghép cặp trực tiếp với ${pairState.friendAvatar} ${pairState.friendNick} (Phòng #${pairState.code})! Bấm để cùng tìm Milo ngay!`
          : `🟢 Paired live with ${pairState.friendAvatar} ${pairState.friendNick} (Room #${pairState.code})! Ready to find Milo together!`;
      }
    }
  }

  function appendPairChat(cls, sender, text) {
    const box = document.getElementById("pairChatBox");
    if (!box) return;
    const empty = box.querySelector(".pair-empty-note");
    if (empty) empty.remove();

    const wrap = document.createElement("div");
    wrap.className = `msg-wrap ${cls}`;
    const bubble = document.createElement("div");
    bubble.className = `msg ${cls}`;

    const meta = document.createElement("div");
    meta.className = "msg-meta";
    meta.textContent = sender;
    bubble.appendChild(meta);

    const body = document.createElement("div");
    body.textContent = text;
    bubble.appendChild(body);
    wrap.appendChild(bubble);

    if (cls === "other" && !sender.startsWith("🌐")) {
      const tools = document.createElement("div");
      tools.className = "msg-tools";
      const hear = document.createElement("button");
      hear.type = "button";
      hear.className = "msg-tool-btn";
      hear.textContent = "🔊 Hear";
      hear.onclick = () => speak(text, { pitch: 1.2 });
      tools.appendChild(hear);
      wrap.appendChild(tools);
    }

    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  }

  function showPairReactionBurst(emoji, fromName) {
    const toast = document.getElementById("pairReactionToast");
    if (!toast) return;
    toast.textContent = `${emoji} ${fromName} sent ${emoji}!`;
    toast.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.add("hidden"), 2400);
  }

  // ================= 1. TRANSPORT: MQTT + LOCAL BROADCASTCHANNEL =================
  function cleanupTransport() {
    activeConnToken++;
    clearInterval(joinRetryTimer);
    if (mqttClient) {
      try { mqttClient.removeAllListeners(); mqttClient.end(true); } catch {}
      mqttClient = null;
    }
    if (localBus) {
      try { localBus.close(); } catch {}
      localBus = null;
    }
  }

  function publishRoom(payload) {
    if (!pairState.code) return;
    const msgId = myClientId + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    const envelope = { ...payload, senderId: myClientId, msgId };
    seenMsgIds.add(msgId);

    if (localBus) {
      try { localBus.postMessage(envelope); } catch {}
    }
    if (mqttClient && mqttClient.connected && pairState.topic) {
      try { mqttClient.publish(pairState.topic, JSON.stringify(envelope)); } catch {}
    }
  }

  function handleIncomingRoomData(data) {
    if (!data || data.senderId === myClientId) return;
    if (data.msgId) {
      if (seenMsgIds.has(data.msgId)) return;
      seenMsgIds.add(data.msgId);
      if (seenMsgIds.size > 400) seenMsgIds.delete(seenMsgIds.values().next().value);
    }

    const myNick = getMyNick();
    const myAv = getMyAvatar();

    if (data.type === "join") {
      onFriendConnected(data.nick, data.avatar);
      publishRoom({ type: "welcome", nick: myNick, avatar: myAv });
    } else if (data.type === "welcome") {
      clearInterval(joinRetryTimer);
      onFriendConnected(data.nick, data.avatar);
    } else if (data.type === "bye") {
      pairState.connected = false;
      endCall(false);
      updatePairControlsUI();
      setPairStatus(`🔴 ${data.nick || pairState.friendNick} ${getLang() === "vi" ? "đã rời phòng" : "left the room"}`, "danger");
      appendPairChat("other", "🌐 Pair Room", `👋 ${data.nick || pairState.friendNick} left the room.`);
    } else if (data.type === "chat") {
      appendPairChat("other", `${data.avatar || pairState.friendAvatar} ${data.sender || pairState.friendNick}`, data.text);
      playTone(640, 0.08);
      speak(data.text, { pitch: 1.25 });
    } else if (data.type === "reaction") {
      showPairReactionBurst(data.emoji, data.sender || pairState.friendNick);
      playTone(760, 0.09);
    } else if (data.type === "mission_invite") {
      pendingMissionInvite = data;
      const txt = document.getElementById("pairMissionInviteText");
      if (txt) {
        txt.textContent = getLang() === "vi"
          ? `🐶 ${data.from || pairState.friendNick} mời bạn cùng ghép cặp tìm Cún Milo (Vai của bạn: 🔎 Clue Spotter)!`
          : `🐶 ${data.from || pairState.friendNick} invites you to find Milo together (Your role: 🔎 Clue Spotter)!`;
      }
      document.getElementById("pairMissionInviteModal")?.classList.remove("hidden");
      playFanfare();
    } else if (data.type === "mission_accept") {
      startLivePairMissionAs("map_scout");
    } else if (data.type === "mission_decline") {
      appendPairChat("other", "🌐 Pair Room", `😅 ${pairState.friendNick} wants to play Milo a bit later.`);
    } else if (data.type === "mission_action") {
      window.ChickenMission?.receivePeerAction?.(data);
    } else if (data.type === "race_invite") {
      pendingInviteDeck = data.deck;
      const txt = document.getElementById("raceInviteText");
      if (txt) {
        txt.textContent = getLang() === "vi"
          ? `🏁 ${data.from || pairState.friendNick} mời bạn Đua Tiếng Anh Theo Cặp! Chơi luôn không?`
          : `🏁 ${data.from || pairState.friendNick} invites you to a Chicky Buddy Race! Ready?`;
      }
      document.getElementById("raceInviteModal")?.classList.remove("hidden");
      playFanfare();
    } else if (data.type === "race_accept") {
      window.ChickenApp?.showScreen("race");
      startCountdownAndRace(pendingInviteDeck);
    } else if (data.type === "race_decline") {
      if (!document.getElementById("screenRace")?.classList.contains("hidden")) renderRaceWelcome();
      appendPairChat("other", "🌐 Pair Room", `😅 ${pairState.friendNick} is busy right now!`);
    } else if (data.type === "race_score") {
      raceRivalScore = Number(data.score || 0);
      updateRaceTrackUI();
    } else if (data.type === "rtc_offer") {
      handleIncomingOffer(data.sdp, data.from, data.kind || "video");
    } else if (data.type === "rtc_answer") {
      handleRtcAnswer(data.sdp);
    } else if (data.type === "rtc_ice") {
      handleRtcIce(data.candidate);
    } else if (data.type === "rtc_reject") {
      endCall(false);
      appendPairChat("other", "🌐 Call", `😅 ${pairState.friendNick} declined the call.`);
    } else if (data.type === "rtc_end") {
      endCall(false);
    }
  }

  function connectRoom(code, asHost, brokerIdx = 0) {
    cleanupTransport();
    seenMsgIds.clear();
    const myToken = activeConnToken;

    pairState.code = code;
    pairState.topic = `chickentalk/v1/pair/${code}`;
    pairState.isHost = asHost;
    pairState.connected = false;
    updatePairControlsUI();

    setPairStatus(
      asHost
        ? (getLang() === "vi" ? `🟡 Đọc cho bạn mã phòng ${code}...` : `🟡 Share code ${code} with your buddy...`)
        : (getLang() === "vi" ? `🟡 Đang vào phòng ${code}...` : `🟡 Joining room ${code}...`),
      "warn"
    );

    // 1. Instant same-device BroadcastChannel (works across tabs even offline!)
    if (typeof BroadcastChannel !== "undefined") {
      localBus = new BroadcastChannel(`chickentalk_pair_${code}`);
      localBus.onmessage = ev => {
        if (myToken !== activeConnToken) return;
        handleIncomingRoomData(ev.data);
      };
      if (!asHost) {
        setTimeout(() => {
          if (myToken === activeConnToken && !pairState.connected) {
            publishRoom({ type: "join", nick: getMyNick(), avatar: getMyAvatar() });
          }
        }, 120);
      }
    }

    // 2. Cross-device MQTT over WSS
    if (typeof mqtt === "undefined") {
      appendPairChat("other", "🌐 Pair Room", "ℹ️ Local multi-tab sync active (open a second tab to test pairing offline!).");
      return;
    }

    let connectedOnce = false;
    const client = mqtt.connect(MQTT_BROKERS[brokerIdx], {
      clientId: myClientId + "_" + Math.floor(Math.random() * 999),
      clean: true,
      connectTimeout: 5500,
      reconnectPeriod: 0
    });
    mqttClient = client;

    const fallbackTimer = setTimeout(() => {
      if (myToken !== activeConnToken) return;
      if (!connectedOnce && brokerIdx + 1 < MQTT_BROKERS.length) {
        connectRoom(code, asHost, brokerIdx + 1);
      }
    }, 5600);

    client.on("connect", () => {
      if (myToken !== activeConnToken) return;
      connectedOnce = true;
      clearTimeout(fallbackTimer);
      client.subscribe(pairState.topic, err => {
        if (err || myToken !== activeConnToken) return;
        if (asHost) {
          setPairStatus(
            getLang() === "vi" ? `🟡 Phòng #${code} đã mở! Chờ bạn nhập mã...` : `🟡 Room #${code} ready! Share code with buddy...`,
            "warn"
          );
          playTone(660, 0.08);
        } else {
          publishRoom({ type: "join", nick: getMyNick(), avatar: getMyAvatar() });
          let tries = 0;
          joinRetryTimer = setInterval(() => {
            if (myToken !== activeConnToken || pairState.connected || tries >= 5) {
              clearInterval(joinRetryTimer);
              if (myToken === activeConnToken && !pairState.connected) {
                setPairStatus(
                  getLang() === "vi" ? `⚠️ Chưa thấy chủ phòng #${code} (kiểm tra lại mã)` : `⚠️ Waiting for host of #${code}`,
                  "warn"
                );
              }
              return;
            }
            tries++;
            publishRoom({ type: "join", nick: getMyNick(), avatar: getMyAvatar() });
          }, 1600);
        }
      });
    });

    client.on("message", (_topic, message) => {
      if (myToken !== activeConnToken) return;
      try {
        const parsed = JSON.parse(message.toString());
        handleIncomingRoomData(parsed);
      } catch {}
    });
  }

  function onFriendConnected(nick, avatar) {
    pairState.connected = true;
    pairState.friendNick = nick || "Friend";
    pairState.friendAvatar = avatar || "🐰";
    setPairStatus(
      getLang() === "vi"
        ? `🟢 Đã ghép cặp cùng ${pairState.friendAvatar} ${pairState.friendNick}!`
        : `🟢 Paired live with ${pairState.friendAvatar} ${pairState.friendNick}!`,
      "ok"
    );
    updatePairControlsUI();
    appendPairChat(
      "other",
      "🌐 Pair Room",
      getLang() === "vi"
        ? `🎉 ${pairState.friendAvatar} ${pairState.friendNick} đã vào phòng #${pairState.code}! Bấm gọi Video/Thoại, Tìm Milo 2 người hoặc Đua Vui ngay!`
        : `🎉 ${pairState.friendAvatar} ${pairState.friendNick} joined room #${pairState.code}! Start a Call, Find Milo together, or Race!`
    );
    const rivalLbl = document.getElementById("raceRivalLabel");
    if (rivalLbl) rivalLbl.textContent = `${pairState.friendAvatar} ${pairState.friendNick}`;
    playFanfare();
  }

  function createRoom() {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    connectRoom(code, true, 0);
  }

  function joinRoom() {
    const code = (document.getElementById("pairJoinCodeInput")?.value || "").trim();
    if (!/^\d{4}$/.test(code)) {
      alert(getLang() === "vi" ? "Hãy nhập đúng mã phòng gồm 4 chữ số nhé!" : "Please enter a 4-digit room code!");
      return;
    }
    connectRoom(code, false, 0);
  }

  function copyRoomCode() {
    if (!pairState.code) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pairState.code).catch(() => {});
    }
    playTone(720, 0.08);
    appendPairChat("other", "🌐 Pair Room", `📋 Copied room code: ${pairState.code}`);
  }

  function leaveRoom() {
    if (pairState.code) {
      publishRoom({ type: "bye", nick: getMyNick() });
    }
    endCall(false);
    cleanupTransport();
    pairState.code = "";
    pairState.topic = "";
    pairState.connected = false;
    updatePairControlsUI();
    document.getElementById("raceInviteModal")?.classList.add("hidden");
    document.getElementById("pairMissionInviteModal")?.classList.add("hidden");
    document.getElementById("incomingCallModal")?.classList.add("hidden");
    setPairStatus(getLang() === "vi" ? "⚪ Chưa vào phòng cặp" : "⚪ Not in a pair room", "idle");
    playTone(420, 0.09);
  }

  function sendPairChat(presetText = null) {
    const inp = document.getElementById("pairChatInput");
    const txt = (presetText !== null ? String(presetText) : (inp?.value || "")).trim();
    if (!txt) return;
    if (presetText === null && inp) {
      if (window.ChickenApp?.resetChatInputSafely) window.ChickenApp.resetChatInputSafely(inp);
      else inp.value = "";
    }
    appendPairChat("me", `${getMyAvatar()} ${getMyNick()}`, txt);
    if (pairState.connected) {
      publishRoom({ type: "chat", sender: getMyNick(), avatar: getMyAvatar(), text: txt });
    } else {
      setTimeout(() => {
        appendPairChat("other", "🐥 Chicky", `Nice phrase: "${txt}"! Create or join a 4-digit room to send this live to your buddy!`);
      }, 280);
    }
    window.ChickenApp?.addAdventureStars?.(1);
    window.ChickenApp?.trackEvent?.("speak_attempt", { metadata: { source: "pair_chat", text: txt.slice(0, 60) } });
  }

  function sendPairReaction(emoji) {
    showPairReactionBurst(emoji, getMyNick());
    playTone(760, 0.08);
    if (pairState.connected) {
      publishRoom({ type: "reaction", emoji, sender: getMyNick() });
    }
  }

  // ================= 2. LIVE PAIR CO-OP MISSION (FIND MILO 2 PLAYERS) =================
  function invitePairMission() {
    if (!pairState.connected) {
      window.ChickenApp?.openLobbyForMissingPuppy?.();
      return;
    }
    publishRoom({ type: "mission_invite", from: getMyNick(), avatar: getMyAvatar() });
    appendPairChat(
      "other",
      "🌐 Pair Room",
      getLang() === "vi"
        ? `📨 Đã mời ${pairState.friendNick} cùng tìm Cún Milo (2 Người)! Đang chờ bạn đồng ý...`
        : `📨 Invited ${pairState.friendNick} to Find Milo together! Waiting for buddy...`
    );
    playTone(680, 0.09);
  }

  function acceptMissionInvite() {
    document.getElementById("pairMissionInviteModal")?.classList.add("hidden");
    publishRoom({ type: "mission_accept" });
    startLivePairMissionAs("clue_spotter");
  }

  function declineMissionInvite() {
    document.getElementById("pairMissionInviteModal")?.classList.add("hidden");
    pendingMissionInvite = null;
    publishRoom({ type: "mission_decline" });
  }

  function startLivePairMissionAs(role) {
    window.ChickenMission?.startMission?.({
      mode: "live_pair",
      pairCode: pairState.code,
      buddy: {
        id: "pair_" + pairState.code,
        name: pairState.friendNick,
        avatar: pairState.friendAvatar,
        isDemoBot: false
      },
      role,
      hintLevel: 1
    });
  }

  function broadcastMissionAction(payload) {
    if (!pairState.connected) return;
    publishRoom({
      type: "mission_action",
      from: getMyNick(),
      avatar: getMyAvatar(),
      ...payload
    });
  }

  // ================= 3. WEBRTC 1-SCREEN SPLIT VIDEO & VOICE CALL =================
  function getIceServers() {
    return [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" }
    ];
  }

  function updateCamHeaderBadge(state) {
    const btn = document.getElementById("camCheckBtn");
    if (!btn) return;
    btn.classList.remove("cam-ok", "cam-warn");
    if (state === "granted") {
      btn.textContent = "📷 ✓";
      btn.classList.add("cam-ok");
    } else if (state === "denied") {
      btn.textContent = "📷 ✕";
      btn.classList.add("cam-warn");
    } else {
      btn.textContent = "📷";
    }
  }

  function openCamPermModal(reason = "prompt") {
    const resEl = document.getElementById("camTestResult");
    if (resEl) {
      resEl.textContent = "";
      if (reason === "denied") {
        resEl.style.color = "var(--ct-danger)";
        resEl.textContent = getLang() === "vi"
          ? "🔴 Camera/Micro đang bị chặn! Hãy bấm biểu tượng ổ khóa trên thanh địa chỉ web để mở quyền nhé."
          : "🔴 Camera/Mic is blocked! Tap the lock icon in your address bar to allow access.";
      } else if (reason === "no_https") {
        resEl.style.color = "var(--ct-warn)";
        resEl.textContent = getLang() === "vi"
          ? "⚠️ Trình duyệt cần HTTPS (hoặc localhost) để bật Camera & Micro."
          : "⚠️ HTTPS (or localhost) is required for Camera & Mic.";
      }
    }
    document.getElementById("camPermModal")?.classList.remove("hidden");
  }

  async function requestCameraPermission() {
    const resEl = document.getElementById("camTestResult");
    const btn = document.getElementById("camAllowBtn");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      openCamPermModal("no_https");
      return;
    }
    if (btn) btn.disabled = true;
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
      st.getTracks().forEach(tr => tr.stop());
      updateCamHeaderBadge("granted");
      if (resEl) {
        resEl.style.color = "var(--ct-success)";
        resEl.textContent = getLang() === "vi" ? "🟢 Camera & Micro đã sẵn sàng gọi cặp!" : "🟢 Camera & Mic are ready!";
      }
      playFanfare();
      setTimeout(() => document.getElementById("camPermModal")?.classList.add("hidden"), 850);
    } catch {
      updateCamHeaderBadge("denied");
      if (resEl) {
        resEl.style.color = "var(--ct-danger)";
        resEl.textContent = getLang() === "vi"
          ? "🔴 Chưa cấp quyền Camera/Mic — vẫn có thể gọi thoại hoặc nhắn tin cặp bình thường!"
          : "🔴 Camera/Mic denied — you can still chat and play in Pair Room!";
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function tryPlayRemoteVideo() {
    const rv = document.getElementById("remoteVideo");
    const unmuteBtn = document.getElementById("unmuteVideoBtn");
    if (!rv || !rv.srcObject) return;
    rv.setAttribute("playsinline", "true");
    rv.setAttribute("webkit-playsinline", "true");
    const p = rv.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        if (!rv.muted && unmuteBtn) unmuteBtn.classList.add("hidden");
      }).catch(() => {
        rv.muted = true;
        rv.play().catch(() => {});
        unmuteBtn?.classList.remove("hidden");
      });
    }
  }

  function unmuteRemoteVideo() {
    const rv = document.getElementById("remoteVideo");
    if (!rv) return;
    rv.muted = false;
    rv.play().catch(() => {});
    document.getElementById("unmuteVideoBtn")?.classList.add("hidden");
  }

  async function getMediaSafe(kind = "video") {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      openCamPermModal("no_https");
      return null;
    }
    if (localStream) return localStream;

    const wantVideo = kind === "video";
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: wantVideo ? { facingMode: currentFacingMode, width: { ideal: 640 }, height: { ideal: 480 } } : false,
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      updateCamHeaderBadge("granted");
    } catch {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      } catch {
        updateCamHeaderBadge("denied");
        openCamPermModal("denied");
        return null;
      }
    }

    micEnabled = true;
    camEnabled = localStream.getVideoTracks().length > 0;
    const lv = document.getElementById("localVideo");
    if (lv) {
      lv.srcObject = localStream;
      lv.muted = true;
      lv.play().catch(() => {});
    }

    pairState.callActive = true;
    pairState.callKind = camEnabled ? "video" : "audio";
    const dock = document.getElementById("pairCallDock");
    if (dock) {
      dock.classList.remove("hidden");
      dock.classList.toggle("audio-only", !camEnabled);
    }
    updatePairControlsUI();
    updateMediaBtns();
    return localStream;
  }

  function createPeerConnection() {
    if (rtcPc) rtcPc.close();
    rtcPc = new RTCPeerConnection({ iceServers: getIceServers(), iceCandidatePoolSize: 4 });
    remoteStream = null;

    const rv = document.getElementById("remoteVideo");
    if (rv) {
      rv.srcObject = null;
      rv.muted = false;
    }

    if (localStream) {
      localStream.getTracks().forEach(tr => rtcPc.addTrack(tr, localStream));
    }

    rtcPc.ontrack = ev => {
      if (!rv) return;
      if (ev.streams && ev.streams[0]) {
        if (rv.srcObject !== ev.streams[0]) rv.srcObject = ev.streams[0];
      } else if (ev.track) {
        if (!remoteStream) remoteStream = new MediaStream();
        remoteStream.addTrack(ev.track);
        if (rv.srcObject !== remoteStream) rv.srcObject = remoteStream;
      }
      if (ev.track) ev.track.onunmute = () => tryPlayRemoteVideo();
      document.getElementById("pairCallDock")?.classList.remove("hidden");
      tryPlayRemoteVideo();
    };

    rtcPc.oniceconnectionstatechange = () => {
      const st = rtcPc ? rtcPc.iceConnectionState : "";
      const txt = document.getElementById("videoStatusText");
      if (!txt) return;
      if (st === "connected" || st === "completed") {
        txt.textContent = getLang() === "vi" ? "🟢 Cuộc gọi 2 chiều đã kết nối!" : "🟢 Pair Call Connected!";
        tryPlayRemoteVideo();
      } else if (st === "failed" || st === "disconnected") {
        txt.textContent = getLang() === "vi" ? "⚠️ Mạng đang chặn kết nối trực tiếp (thử WiFi cùng mạng)." : "⚠️ Direct connection interrupted.";
      } else if (st === "checking") {
        txt.textContent = getLang() === "vi" ? "🟡 Đang kết nối âm thanh & hình ảnh..." : "🟡 Connecting call...";
      }
    };

    rtcPc.onicecandidate = ev => {
      if (ev.candidate) {
        publishRoom({
          type: "rtc_ice",
          candidate: {
            candidate: ev.candidate.candidate,
            sdpMid: ev.candidate.sdpMid,
            sdpMLineIndex: ev.candidate.sdpMLineIndex
          }
        });
      }
    };
  }

  async function startCall(kind = "video") {
    if (!pairState.connected) {
      alert(getLang() === "vi" ? "Hãy tạo hoặc vào chung phòng 4 số với bạn trước khi gọi nhé!" : "Join a 4-digit pair room with a buddy first!");
      return;
    }
    if (rtcPc) {
      endCall(true);
      return;
    }

    // Respect Parent Space video call toggle if disabled -> fall back cleanly to Audio-Only
    const allowVideo = window.ChickenApp?.isPairVideoAllowed?.() !== false;
    const effectiveKind = kind === "video" && allowVideo ? "video" : "audio";

    pendingCandidates = [];
    const stream = await getMediaSafe(effectiveKind);
    if (!stream) return;

    const txt = document.getElementById("videoStatusText");
    if (txt) {
      txt.textContent = effectiveKind === "video"
        ? (getLang() === "vi" ? `🟡 Đang gọi Video tới ${pairState.friendNick}...` : `🟡 Video calling ${pairState.friendNick}...`)
        : (getLang() === "vi" ? `🟡 Đang gọi Thoại tới ${pairState.friendNick}...` : `🟡 Voice calling ${pairState.friendNick}...`);
    }

    createPeerConnection();
    const offer = await rtcPc.createOffer();
    await rtcPc.setLocalDescription(offer);
    publishRoom({
      type: "rtc_offer",
      sdp: { type: offer.type, sdp: offer.sdp },
      from: getMyNick(),
      kind: effectiveKind
    });
  }

  function handleIncomingOffer(sdp, callerName, kind) {
    incomingOffer = { sdp, from: callerName || pairState.friendNick, kind: kind || "video" };
    const txt = document.getElementById("incomingCallText");
    if (txt) {
      const icon = kind === "audio" ? "📞" : "📹";
      txt.textContent = getLang() === "vi"
        ? `${icon} ${incomingOffer.from} đang gọi ${kind === "audio" ? "Thoại" : "Video"} cho bạn!`
        : `${icon} ${incomingOffer.from} is calling you (${kind})!`;
    }
    document.getElementById("incomingCallModal")?.classList.remove("hidden");
    playFanfare();
  }

  async function acceptIncomingCall() {
    document.getElementById("incomingCallModal")?.classList.add("hidden");
    if (!incomingOffer) return;
    const { sdp, kind } = incomingOffer;
    incomingOffer = null;

    const allowVideo = window.ChickenApp?.isPairVideoAllowed?.() !== false;
    const stream = await getMediaSafe(kind === "video" && allowVideo ? "video" : "audio");
    if (!stream) {
      publishRoom({ type: "rtc_reject" });
      pendingCandidates = [];
      return;
    }

    const txt = document.getElementById("videoStatusText");
    if (txt) txt.textContent = getLang() === "vi" ? "🟡 Đang kết nối..." : "🟡 Connecting...";

    createPeerConnection();
    await rtcPc.setRemoteDescription(new RTCSessionDescription(sdp));
    for (const c of pendingCandidates) {
      try { await rtcPc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    pendingCandidates = [];

    const ans = await rtcPc.createAnswer();
    await rtcPc.setLocalDescription(ans);
    publishRoom({ type: "rtc_answer", sdp: { type: ans.type, sdp: ans.sdp } });
    tryPlayRemoteVideo();
  }

  function rejectIncomingCall() {
    document.getElementById("incomingCallModal")?.classList.add("hidden");
    incomingOffer = null;
    pendingCandidates = [];
    publishRoom({ type: "rtc_reject" });
  }

  async function handleRtcAnswer(sdp) {
    if (!rtcPc) return;
    await rtcPc.setRemoteDescription(new RTCSessionDescription(sdp));
    for (const c of pendingCandidates) {
      try { await rtcPc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    pendingCandidates = [];
    tryPlayRemoteVideo();
  }

  async function handleRtcIce(c) {
    if (!c || !c.candidate) return;
    if (!rtcPc || !rtcPc.remoteDescription) {
      pendingCandidates.push(c);
      return;
    }
    try { await rtcPc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
  }

  async function switchCamera() {
    if (!localStream || !localStream.getVideoTracks().length) return;
    currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
    try {
      const ns = await navigator.mediaDevices.getUserMedia({ video: { facingMode: currentFacingMode }, audio: false });
      const newTrack = ns.getVideoTracks()[0];
      const oldTrack = localStream.getVideoTracks()[0];
      if (oldTrack) { localStream.removeTrack(oldTrack); oldTrack.stop(); }
      localStream.addTrack(newTrack);
      const lv = document.getElementById("localVideo");
      if (lv) {
        lv.style.transform = currentFacingMode === "user" ? "scaleX(-1)" : "none";
        lv.srcObject = localStream;
      }
      if (rtcPc) {
        const sender = rtcPc.getSenders().find(s => s.track && s.track.kind === "video");
        if (sender) await sender.replaceTrack(newTrack);
      }
    } catch {
      currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
    }
  }

  function toggleMediaTrack(kind) {
    if (!localStream) return;
    if (kind === "audio") {
      micEnabled = !micEnabled;
      localStream.getAudioTracks().forEach(tr => (tr.enabled = micEnabled));
    } else {
      camEnabled = !camEnabled;
      localStream.getVideoTracks().forEach(tr => (tr.enabled = camEnabled));
    }
    updateMediaBtns();
  }

  function updateMediaBtns() {
    const mBtn = document.getElementById("toggleMicTrackBtn");
    const cBtn = document.getElementById("toggleCamTrackBtn");
    if (mBtn) mBtn.textContent = micEnabled ? "🎤 Mic ON" : "🔇 Mic OFF";
    if (cBtn) cBtn.textContent = camEnabled ? "📷 Cam ON" : "🚫 Cam OFF";
  }

  function toggleCallCompact() {
    pairState.callCompact = !pairState.callCompact;
    const dock = document.getElementById("pairCallDock");
    if (dock) dock.classList.toggle("compact", pairState.callCompact);
    const btn = document.getElementById("toggleCompactCallBtn");
    if (btn) btn.textContent = pairState.callCompact ? "⤢ Phóng to" : "⤡ Thu gọn";
  }

  function endCall(notify = false) {
    if (notify && pairState.connected) publishRoom({ type: "rtc_end" });
    incomingOffer = null;
    pendingCandidates = [];
    remoteStream = null;
    pairState.callActive = false;
    if (rtcPc) { rtcPc.close(); rtcPc = null; }
    if (localStream) { localStream.getTracks().forEach(tr => tr.stop()); localStream = null; }
    const lv = document.getElementById("localVideo");
    const rv = document.getElementById("remoteVideo");
    if (lv) lv.srcObject = null;
    if (rv) rv.srcObject = null;
    document.getElementById("unmuteVideoBtn")?.classList.add("hidden");
    document.getElementById("pairCallDock")?.classList.add("hidden");
    document.getElementById("incomingCallModal")?.classList.add("hidden");
  }

  // ================= 4. CHICKY BUDDY RACE (SOLO OR LIVE PAIR) =================
  function updateRaceTrackUI() {
    const mySc = document.getElementById("raceMyScore");
    const rvSc = document.getElementById("raceRivalScore");
    const myRun = document.getElementById("raceMyRunner");
    const rvRun = document.getElementById("raceRivalRunner");
    if (mySc) mySc.textContent = raceMyScore;
    if (rvSc) rvSc.textContent = raceRivalScore;
    const maxPts = Math.max(100, raceQuestions.length * 20);
    if (myRun) myRun.style.left = Math.min(88, 2 + Math.round((raceMyScore / maxPts) * 86)) + "%";
    if (rvRun) rvRun.style.left = Math.min(88, 2 + Math.round((raceRivalScore / maxPts) * 86)) + "%";
  }

  function renderRaceWelcome() {
    clearInterval(raceTimer);
    clearInterval(raceCountdownTimer);
    raceQuestions = [];
    raceMyScore = 0;
    raceRivalScore = 0;

    const myLbl = document.getElementById("raceMyLabel");
    const rvLbl = document.getElementById("raceRivalLabel");
    const myRun = document.getElementById("raceMyRunner");
    const rvRun = document.getElementById("raceRivalRunner");
    if (myLbl) myLbl.textContent = `${getMyAvatar()} ${getMyNick()}`;
    if (rvLbl) rvLbl.textContent = pairState.connected ? `${pairState.friendAvatar} ${pairState.friendNick}` : "🐥 Chicky";
    if (myRun) myRun.textContent = getMyAvatar();
    if (rvRun) rvRun.textContent = pairState.connected ? pairState.friendAvatar : "🐥";
    updateRaceTrackUI();

    const isVi = getLang() === "vi";
    const stage = document.getElementById("raceStage");
    if (!stage) return;
    stage.innerHTML = `
      <div style="font-size:3rem;">🏁🐥</div>
      <h2 style="margin:6px 0;">${isVi ? "Đường Đua Vui Tiếng Anh Theo Cặp!" : "Chicky Buddy English Sprint!"}</h2>
      <p style="color:var(--ct-ink-soft); font-weight:700; max-width:520px; margin:0 auto 14px;">
        ${pairState.connected
          ? (isVi ? `🟢 Đã kết nối cùng ${pairState.friendAvatar} ${pairState.friendNick}! Mời bạn cùng thi phản xạ tiếng Anh ngay nào!` : `🟢 Paired with ${pairState.friendAvatar} ${pairState.friendNick}! Invite your buddy to sprint together!`)
          : (isVi ? "Luyện phản xạ tiếng Anh cùng Chicky, hoặc mở Phòng 4 Số để rủ bạn thật đua trực tiếp!" : "Practice English sprints with Chicky, or open a 4-Digit Pair Room to race a buddy live!")
        }
      </p>
      <div class="row center">
        ${pairState.connected
          ? `<button type="button" class="btn btn-yellow btn-xl" onclick="window.ChickenPair.sendRaceInvite()">🏁 ${isVi ? "Mời Bạn Đua Ngay!" : "Invite Buddy to Race!"}</button>`
          : `<button type="button" class="btn btn-yellow btn-xl" onclick="window.ChickenPair.startSoloRace()">🚀 ${isVi ? "Chơi Cùng Chicky!" : "Play with Chicky!"}</button>
             <button type="button" class="btn btn-sky" onclick="window.ChickenApp.navigate('pair')">👫 ${isVi ? "Vào Phòng Cặp 4 Số" : "Open 4-Digit Pair Room"}</button>`
        }
      </div>
    `;
  }

  function sendRaceInvite() {
    if (!pairState.connected) {
      window.ChickenApp?.showScreen("race");
      startSoloRace();
      return;
    }
    pendingInviteDeck = [...RACE_POOL].sort(() => Math.random() - 0.5).slice(0, 6);
    publishRoom({ type: "race_invite", from: getMyNick(), deck: pendingInviteDeck });
    window.ChickenApp?.showScreen("race");
    const stage = document.getElementById("raceStage");
    if (stage) {
      stage.innerHTML = `
        <div style="font-size:2.8rem;">📨✨</div>
        <h3>${getLang() === "vi" ? `⏳ Đang chờ ${pairState.friendNick} đồng ý lời mời đua...` : `⏳ Waiting for ${pairState.friendNick} to accept...`}</h3>
        <button type="button" class="btn btn-soft" onclick="window.ChickenPair.renderRaceWelcome()">Cancel</button>
      `;
    }
  }

  function acceptRaceInvite() {
    document.getElementById("raceInviteModal")?.classList.add("hidden");
    publishRoom({ type: "race_accept" });
    window.ChickenApp?.showScreen("race");
    startCountdownAndRace(pendingInviteDeck || [...RACE_POOL].slice(0, 6));
  }

  function declineRaceInvite() {
    document.getElementById("raceInviteModal")?.classList.add("hidden");
    publishRoom({ type: "race_decline" });
  }

  function startSoloRace() {
    startCountdownAndRace([...RACE_POOL].sort(() => Math.random() - 0.5).slice(0, 6));
  }

  function startCountdownAndRace(deck) {
    clearInterval(raceCountdownTimer);
    let count = 3;
    const renderCount = () => {
      const st = document.getElementById("raceStage");
      if (st) st.innerHTML = `<div style="font-family:var(--font-display); font-size:4rem; font-weight:700; color:var(--ct-coral-deep);">${count > 0 ? count : "GO! 🐣"}</div>`;
      playTone(count > 0 ? 520 : 880, 0.14);
    };
    renderCount();
    raceCountdownTimer = setInterval(() => {
      count--;
      if (count < 0) {
        clearInterval(raceCountdownTimer);
        raceQuestions = deck;
        raceIdx = 0;
        raceMyScore = 0;
        raceRivalScore = 0;
        raceStreak = 0;
        raceFinished = false;
        updateRaceTrackUI();
        renderRaceQuestion();
      } else {
        renderCount();
      }
    }, 700);
  }

  function botScoreStep() {
    if (!pairState.connected && Math.random() > 0.38) {
      raceRivalScore += 12;
      updateRaceTrackUI();
    }
  }

  function addRaceScore(pts) {
    raceMyScore += pts;
    updateRaceTrackUI();
    if (pairState.connected) publishRoom({ type: "race_score", score: raceMyScore });
  }

  function renderRaceQuestion() {
    clearInterval(raceTimer);
    if (raceIdx >= raceQuestions.length) {
      finishRace();
      return;
    }
    raceLocked = false;
    raceQuestionStartAt = Date.now();
    const item = raceQuestions[raceIdx];
    const st = document.getElementById("raceStage");
    if (!st) return;

    const streakHtml = raceStreak >= 2 ? `<span class="demo-tag">🔥 x${raceStreak}</span>` : "";

    if (item.type === "quiz") {
      st.innerHTML = `
        <div class="row center" style="font-weight:800; color:var(--ct-sky-deep); margin-bottom:8px;">
          <span>${raceIdx + 1} / ${raceQuestions.length}</span> ${streakHtml}
        </div>
        <h3 style="margin:0 0 12px; font-size:1.25rem;">${item.q}</h3>
        <div class="opt-list">
          ${item.opts.map((o, i) => `<button type="button" class="opt-btn" onclick="window.ChickenPair.pickRaceOpt(${i}, this)">${["A", "B", "C"][i]}. ${o}</button>`).join("")}
        </div>
        <div id="raceMsg" style="margin-top:12px; font-weight:800;"></div>
      `;
    } else {
      st.innerHTML = `
        <div class="row center" style="font-weight:800; color:var(--ct-sky-deep); margin-bottom:8px;">
          <span>${raceIdx + 1} / ${raceQuestions.length}</span> ${streakHtml}
        </div>
        <h3 style="margin:0 0 10px;">${item.q}</h3>
        <div style="font-family:var(--font-display); font-size:1.3rem; font-weight:600; background:var(--ct-yellow-light); color:var(--ct-yellow-ink); padding:14px 18px; border-radius:18px; margin-bottom:14px;">
          "${item.target}"
        </div>
        <div class="row center">
          <button type="button" class="btn btn-soft" onclick="window.ChickenApp.speakVoice('${item.target.replace(/'/g, "\\'")}')">🔊 Hear</button>
          <button type="button" class="btn btn-coral" id="raceMicBtn" onclick="window.ChickenPair.toggleRaceMic()">🎤 Speak Now!</button>
          <button type="button" class="btn btn-mint" onclick="window.ChickenPair.completeRaceSpeakTap()">💬 Tap Said It!</button>
        </div>
        <div id="raceMsg" style="margin-top:12px; font-weight:800;"></div>
      `;
      speak(item.target, { pitch: 1.15 });
    }

    raceTimeLeft = 15;
    const bar = document.getElementById("raceTimerBar");
    if (bar) bar.style.width = "100%";
    raceTimer = setInterval(() => {
      raceTimeLeft -= 0.25;
      if (bar) bar.style.width = Math.max(0, (raceTimeLeft / 15) * 100) + "%";
      if (raceTimeLeft <= 0) {
        clearInterval(raceTimer);
        if (!raceLocked) {
          raceLocked = true;
          raceStreak = 0;
          botScoreStep();
          setTimeout(() => { raceIdx++; renderRaceQuestion(); }, 950);
        }
      }
    }, 250);
  }

  function pickRaceOpt(idx, btn) {
    if (raceLocked) return;
    raceLocked = true;
    clearInterval(raceTimer);
    const item = raceQuestions[raceIdx];
    const all = document.querySelectorAll(".opt-btn");
    const isCorrect = idx === item.ans;

    window.ChickenApp?.trackEvent?.("race_answer", {
      skillTag: item.skill || null,
      isCorrect,
      metadata: { q: item.q, latencyMs: Date.now() - raceQuestionStartAt }
    });

    if (isCorrect) {
      btn.classList.add("correct");
      raceStreak++;
      const pts = Math.max(10, Math.round(raceTimeLeft + 5)) + (raceStreak >= 2 ? 5 : 0);
      addRaceScore(pts);
      window.ChickenApp?.addAdventureStars?.(1);
      playFanfare();
      const msg = document.getElementById("raceMsg");
      if (msg) msg.innerHTML = `<span style="color:var(--ct-success);">+${pts} pts! Great job! 🎉</span>`;
    } else {
      raceStreak = 0;
      btn.classList.add("wrong");
      if (all[item.ans]) all[item.ans].classList.add("correct");
      playTone(260, 0.16);
      const msg = document.getElementById("raceMsg");
      if (msg) msg.innerHTML = `<span style="color:var(--ct-yellow-ink);">💡 Good try! Look at the green answer!</span>`;
    }
    botScoreStep();
    setTimeout(() => { raceIdx++; renderRaceQuestion(); }, 1200);
  }

  function completeRaceSpeakTap() {
    if (raceLocked) return;
    raceLocked = true;
    clearInterval(raceTimer);
    const item = raceQuestions[raceIdx];
    speak(item.target, { pitch: 1.18 });
    raceStreak++;
    const pts = Math.max(12, Math.round(raceTimeLeft + 6));
    addRaceScore(pts);
    window.ChickenApp?.addAdventureStars?.(2);
    playFanfare();
    const msg = document.getElementById("raceMsg");
    if (msg) msg.innerHTML = `<span style="color:var(--ct-success);">🌟 "${item.target}" (+${pts} pts!)</span>`;
    botScoreStep();
    setTimeout(() => { raceIdx++; renderRaceQuestion(); }, 1150);
  }

  function toggleRaceMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      completeRaceSpeakTap();
      return;
    }
    if (raceListening && raceRecognition) {
      raceRecognition.stop();
      return;
    }
    raceRecognition = new SR();
    raceRecognition.lang = "en-US";
    raceRecognition.interimResults = false;
    raceListening = true;
    const btn = document.getElementById("raceMicBtn");
    if (btn) btn.textContent = "👂 Listening...";

    raceRecognition.onresult = e => {
      if (raceLocked) return;
      raceLocked = true;
      clearInterval(raceTimer);
      const spoken = e.results?.[0]?.[0]?.transcript || "";
      const item = raceQuestions[raceIdx];
      const words = item.target.toLowerCase().split(/\s+/);
      const hits = words.filter(w => spoken.toLowerCase().includes(w)).length;
      const isCorrect = hits >= Math.ceil(words.length * 0.45);
      if (isCorrect) {
        raceStreak++;
        const pts = Math.max(14, Math.round(raceTimeLeft + 8));
        addRaceScore(pts);
        window.ChickenApp?.addAdventureStars?.(2);
        playFanfare();
        document.getElementById("raceMsg").innerHTML = `<span style="color:var(--ct-success);">🌟 "${spoken}" (+${pts} pts!)</span>`;
      } else {
        raceStreak = 0;
        document.getElementById("raceMsg").innerHTML = `<span style="color:var(--ct-yellow-ink);">🎤 Nice try: "${spoken}"!</span>`;
      }
      botScoreStep();
      setTimeout(() => { raceIdx++; renderRaceQuestion(); }, 1250);
    };
    raceRecognition.onend = () => {
      raceListening = false;
      const b = document.getElementById("raceMicBtn");
      if (b) b.textContent = "🎤 Speak Now!";
    };
    try { raceRecognition.start(); } catch {}
  }

  function finishRace() {
    clearInterval(raceTimer);
    if (raceFinished) return;
    raceFinished = true;
    const isVi = getLang() === "vi";
    let title = isVi ? "💛 Chơi Quá Giỏi! Thử Lại Nhé!" : "💛 Great Effort! Play Again!";
    if (raceMyScore > raceRivalScore) {
      title = isVi ? "🏆 BẠN VỀ ĐÍCH TRƯỚC! (+5 ⭐)" : "🏆 YOU FINISHED FIRST! (+5 ⭐)";
      window.ChickenApp?.addAdventureStars?.(5);
      window.ChickenApp?.launchConfetti?.();
      playFanfare();
    } else if (raceMyScore === raceRivalScore) {
      title = isVi ? "🤝 HÒA NHAU CỰC ĐỈNH! (+3 ⭐)" : "🤝 AWESOME TIE! (+3 ⭐)";
      window.ChickenApp?.addAdventureStars?.(3);
      playFanfare();
    } else {
      window.ChickenApp?.addAdventureStars?.(2);
    }

    const st = document.getElementById("raceStage");
    if (st) {
      st.innerHTML = `
        <div style="font-size:3.2rem;">${raceMyScore >= raceRivalScore ? "🏆🐣🎉" : "🐥💪✨"}</div>
        <h2 style="margin:6px 0;">${title}</h2>
        <p style="font-family:var(--font-display); font-size:1.3rem; font-weight:700;">${raceMyScore} vs ${raceRivalScore}</p>
        <div class="row center">
          <button type="button" class="btn btn-yellow btn-xl" onclick="${pairState.connected ? "window.ChickenPair.sendRaceInvite()" : "window.ChickenPair.startSoloRace()"}">🔄 ${isVi ? "Đua Lại" : "Play Again"}</button>
          ${pairState.connected ? `<button type="button" class="btn btn-mint" onclick="window.ChickenPair.invitePairMission()">🐶 ${isVi ? "Cùng Tìm Milo!" : "Find Milo Together!"}</button>` : ""}
        </div>
      `;
    }
  }

  window.ChickenPair = {
    state: pairState,
    createRoom,
    joinRoom,
    copyRoomCode,
    leaveRoom,
    sendPairChat,
    sendPairReaction,
    invitePairMission,
    acceptMissionInvite,
    declineMissionInvite,
    broadcastMissionAction,
    startCall,
    acceptIncomingCall,
    rejectIncomingCall,
    switchCamera,
    toggleMediaTrack,
    toggleCallCompact,
    unmuteRemoteVideo,
    endCall,
    openCamPermModal,
    requestCameraPermission,
    renderRaceWelcome,
    startSoloRace,
    sendRaceInvite,
    acceptRaceInvite,
    declineRaceInvite,
    pickRaceOpt,
    completeRaceSpeakTap,
    toggleRaceMic,
    updatePairControlsUI
  };
})();
