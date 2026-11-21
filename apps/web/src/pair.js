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
  let mqttOutbox = [];
  let localBus = null;
  let activeConnToken = 0;
  let joinRetryTimer = null;

  const CRITICAL_SIGNAL_TYPES = new Set([
    "join", "welcome", "rtc_offer", "rtc_reoffer", "rtc_ringing", "rtc_answer",
    "rtc_answer_ack", "rtc_ice", "rtc_ice_batch", "rtc_reject", "rtc_end"
  ]);
  const QOS1_SIGNAL_TYPES = new Set([
    "join", "welcome", "rtc_offer", "rtc_reoffer", "rtc_ringing", "rtc_answer",
    "rtc_answer_ack", "rtc_ice_batch", "rtc_reject", "rtc_end"
  ]);

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
  let localIceCandidates = [];
  let remoteIceCount = 0;
  let localRelayCount = 0;
  let remoteRelayCount = 0;
  let seenIceKeys = new Set();
  let incomingOffer = null; // { sdp, from, kind, callId, senderId }
  let peerClientId = "";
  let currentCallId = "";
  let lastSentOfferPayload = null;
  let lastSentAnswerPayload = null;
  let offerAcked = false;
  let answerAcked = false;
  let offerRetryTimer = null;
  let answerRetryTimer = null;
  let iceResendTimer = null;
  let micEnabled = true;
  let camEnabled = true;
  let hasRemoteVideo = false;
  let isCallOfferer = false;
  let iceRestartAttempted = false;
  let remotePlaySeq = 0;
  let autoUnmuteAttempted = false;
  let callWatchdogTimer = null;
  let cachedIceServers = null;
  let iceServersPromise = null;
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
    mqttOutbox = [];
    if (mqttClient) {
      try { mqttClient.removeAllListeners(); mqttClient.end(true); } catch {}
      mqttClient = null;
    }
    if (localBus) {
      try { localBus.close(); } catch {}
      localBus = null;
    }
  }

  function flushMqttOutbox() {
    if (!mqttClient || !mqttClient.connected || !pairState.topic || !mqttOutbox.length) return;
    const queued = mqttOutbox.splice(0, mqttOutbox.length);
    for (const item of queued) {
      try {
        mqttClient.publish(pairState.topic, JSON.stringify(item.envelope), { qos: item.qos });
      } catch {}
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
    const qos = QOS1_SIGNAL_TYPES.has(payload.type) ? 1 : 0;
    if (mqttClient && mqttClient.connected && pairState.topic) {
      try { mqttClient.publish(pairState.topic, JSON.stringify(envelope), { qos }); } catch {}
    } else if (CRITICAL_SIGNAL_TYPES.has(payload.type) && pairState.topic) {
      // Buffer signaling messages if mobile browser temporarily suspended WebSocket (e.g. during Camera permission dialog)
      mqttOutbox.push({ envelope, qos });
      if (mqttOutbox.length > 60) mqttOutbox.shift();
      if (mqttClient && !mqttClient.connected && typeof mqttClient.reconnect === "function") {
        try { mqttClient.reconnect(); } catch {}
      }
    }
  }

  function handleIncomingRoomData(data) {
    if (!data || data.senderId === myClientId) return;
    if (data.msgId) {
      if (seenMsgIds.has(data.msgId)) return;
      seenMsgIds.add(data.msgId);
      if (seenMsgIds.size > 400) seenMsgIds.delete(seenMsgIds.values().next().value);
    }

    if (data.senderId) peerClientId = data.senderId;

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
      handleIncomingOffer(data.sdp, data.from, data.kind || "video", data.callId || "", data.senderId || "");
    } else if (data.type === "rtc_ringing") {
      if (!data.callId || data.callId === currentCallId) {
        offerAcked = true;
        clearInterval(offerRetryTimer);
        const txt = document.getElementById("videoStatusText");
        if (txt && rtcPc && rtcPc.signalingState === "have-local-offer") {
          txt.textContent = getLang() === "vi"
            ? `🔔 Đang đổ chuông trên máy ${pairState.friendNick}...`
            : `🔔 Ringing on ${pairState.friendNick}'s device...`;
        }
        updateCallDiag();
      }
    } else if (data.type === "rtc_reoffer") {
      handleRtcReoffer(data.sdp, data.callId || "");
    } else if (data.type === "rtc_answer") {
      handleRtcAnswer(data.sdp, data.callId || "");
    } else if (data.type === "rtc_answer_ack") {
      if (!data.callId || data.callId === currentCallId) {
        answerAcked = true;
        clearInterval(answerRetryTimer);
        updateCallDiag();
      }
    } else if (data.type === "rtc_ice") {
      handleRtcIce(data.candidate);
    } else if (data.type === "rtc_ice_batch") {
      handleRtcIceBatch(data.candidates);
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
      keepalive: 20,
      connectTimeout: 7500,
      reconnectPeriod: 2500
    });
    mqttClient = client;

    const fallbackTimer = setTimeout(() => {
      if (myToken !== activeConnToken) return;
      if (!connectedOnce && brokerIdx + 1 < MQTT_BROKERS.length) {
        connectRoom(code, asHost, brokerIdx + 1);
      }
    }, 7800);

    client.on("connect", () => {
      if (myToken !== activeConnToken) return;
      const isReconnect = connectedOnce;
      connectedOnce = true;
      clearTimeout(fallbackTimer);
      client.subscribe(pairState.topic, { qos: 1 }, err => {
        if (err || myToken !== activeConnToken) return;
        flushMqttOutbox();
        if (isReconnect) {
          if (pairState.callActive) {
            if (isCallOfferer && !offerAcked && lastSentOfferPayload) {
              publishRoom(lastSentOfferPayload);
            }
            if (!isCallOfferer && !answerAcked && lastSentAnswerPayload) {
              publishRoom(lastSentAnswerPayload);
            }
            if (localIceCandidates.length > 0) {
              publishRoom({ type: "rtc_ice_batch", candidates: localIceCandidates });
            }
          }
          return;
        }
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

  // Resume MQTT + signaling + remote video cleanly when iPhone/iPad returns from Camera permission dialog or app switch
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) return;
      if (pairState.code && mqttClient && !mqttClient.connected && typeof mqttClient.reconnect === "function") {
        try { mqttClient.reconnect(); } catch {}
      }
      if (pairState.callActive) {
        const lv = document.getElementById("localVideo");
        if (lv && lv.srcObject && lv.paused) lv.play().catch(() => {});
        tryPlayRemoteVideo(false);
        // Replay unacknowledged offer/answer + ICE candidates in case iOS suspended WebSocket during Camera prompt!
        setTimeout(() => {
          if (!pairState.callActive) return;
          if (isCallOfferer && !offerAcked && lastSentOfferPayload) publishRoom(lastSentOfferPayload);
          if (!isCallOfferer && !answerAcked && lastSentAnswerPayload) publishRoom(lastSentAnswerPayload);
          if (localIceCandidates.length > 0 && rtcPc && rtcPc.iceConnectionState !== "connected" && rtcPc.iceConnectionState !== "completed") {
            publishRoom({ type: "rtc_ice_batch", candidates: localIceCandidates });
          }
        }, 400);
      }
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
    loadIceServers().catch(() => {});
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
  function getDefaultIceServers() {
    const custom = Array.isArray(window.CHICKENTALK_TURN_SERVERS) ? window.CHICKENTALK_TURN_SERVERS : [];
    return [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" },
      { urls: "stun:stun.relay.metered.ca:80" },
      ...custom,
      // Split UDP & TCP TURN into separate entries (avoids WebKit stalling if one transport fails or returns 401)
      {
        urls: "turn:turn.evan-brass.net:3478?transport=udp",
        username: "user",
        credential: "password"
      },
      {
        urls: "turn:turn.evan-brass.net:3478?transport=tcp",
        username: "user",
        credential: "password"
      }
    ];
  }

  function loadIceServers() {
    if (cachedIceServers) return Promise.resolve(cachedIceServers);
    if (iceServersPromise) return iceServersPromise;
    const fallback = getDefaultIceServers();
    const apiBase = window.ChickenApp?.getApiBase?.() || "";
    if (!apiBase) {
      cachedIceServers = fallback;
      return Promise.resolve(cachedIceServers);
    }
    iceServersPromise = (async () => {
      try {
        const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timer = ctrl ? setTimeout(() => ctrl.abort(), 1600) : null;
        const res = await fetch(`${apiBase}/api/rtc/ice`, ctrl ? { signal: ctrl.signal } : undefined);
        if (timer) clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.iceServers) && data.iceServers.length > 0) {
            const custom = Array.isArray(window.CHICKENTALK_TURN_SERVERS) ? window.CHICKENTALK_TURN_SERVERS : [];
            cachedIceServers = [...data.iceServers, ...custom];
            return cachedIceServers;
          }
        }
      } catch {}
      cachedIceServers = fallback;
      return cachedIceServers;
    })();
    return iceServersPromise;
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
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" } }, audio: true });
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
          ? "🔴 Chưa cấp quyền Camera/Mic — vẫn có thể gọi thoại hoặc xem video từ bạn bình thường!"
          : "🔴 Camera/Mic denied — you can still chat and view your buddy's video!";
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function primeVideoElement(videoEl, muted) {
    if (!videoEl) return;
    videoEl.playsInline = true;
    videoEl.autoplay = true;
    videoEl.setAttribute("playsinline", "");
    videoEl.setAttribute("webkit-playsinline", "");
    videoEl.muted = Boolean(muted);
    if (muted) videoEl.setAttribute("muted", "");
    else videoEl.removeAttribute("muted");
  }

  function updateCallDiag() {
    const diagEl = document.getElementById("callDiagText");
    if (!diagEl) return;
    if (!pairState.callActive) {
      diagEl.textContent = "";
      return;
    }
    const rv = document.getElementById("remoteVideo");
    const sig = rtcPc ? rtcPc.signalingState : "init";
    const ice = rtcPc ? rtcPc.iceConnectionState : "new";
    const vidInfo = rv && rv.videoWidth > 0 ? `${rv.videoWidth}x${rv.videoHeight}` : (hasRemoteVideo ? "track-live" : "waiting");
    const relayInfo = (localRelayCount > 0 || remoteRelayCount > 0) ? ` • relay:L${localRelayCount}/R${remoteRelayCount}` : "";
    diagEl.textContent = `sig:${sig} • ice:${ice} • cand:L${localIceCandidates.length}/R${remoteIceCount}${relayInfo} • vid:${vidInfo}`;
  }

  function syncCallDockVisibility() {
    const dock = document.getElementById("pairCallDock");
    const lv = document.getElementById("localVideo");
    const rv = document.getElementById("remoteVideo");
    const localPane = document.getElementById("localCamPane");
    const remotePane = document.getElementById("remoteCamPane");
    const localPh = document.getElementById("localCamPlaceholder");
    const remotePh = document.getElementById("remoteCamPlaceholder");

    const localHasLiveVideo = Boolean(
      camEnabled && localStream && localStream.getVideoTracks().some(tr => tr.readyState === "live" && tr.enabled)
    );
    const remoteHasLiveVideo = Boolean(
      hasRemoteVideo && remoteStream && remoteStream.getVideoTracks().some(tr => tr.readyState === "live")
    );
    // On iOS/iPadOS Safari, readyState >= 2 or !paused with active video track means frames are decoding
    const remoteRendered = Boolean(
      remoteHasLiveVideo && rv && (rv.videoWidth > 0 || rv.readyState >= 2 || (!rv.paused && rv.currentTime > 0))
    );
    const localRendered = Boolean(localHasLiveVideo && lv && (lv.videoWidth > 0 || lv.readyState >= 2));

    if (dock && (pairState.callActive || remoteHasLiveVideo)) {
      dock.classList.remove("hidden");
      // NEVER hide .split-camera-screen when call is video or peer is sending video!
      const pureAudio = pairState.callKind === "audio" && !localHasLiveVideo && !remoteHasLiveVideo;
      dock.classList.toggle("audio-only", pureAudio);
    }
    if (localPane) localPane.classList.toggle("has-video", localRendered);
    if (remotePane) remotePane.classList.toggle("has-video", remoteRendered);

    if (localPh && !localRendered) {
      localPh.textContent = localHasLiveVideo
        ? (getLang() === "vi" ? "📷 Đang mở camera của bạn..." : "📷 Starting your camera...")
        : (getLang() === "vi" ? "🎤 Chỉ bật Mic (không dùng Cam)" : "🎤 Audio-only (Camera off)");
    }
    if (remotePh && !remoteRendered) {
      remotePh.textContent = remoteHasLiveVideo
        ? (getLang() === "vi" ? "📡 Đang tải hình ảnh từ bạn..." : "📡 Loading buddy's video...")
        : (getLang() === "vi" ? `⏳ Đang chờ video từ ${pairState.friendNick}...` : `⏳ Waiting for ${pairState.friendNick}'s video...`);
    }
    updateCallDiag();
  }

  function tryAutoUnmuteRemote() {
    if (autoUnmuteAttempted) return;
    const rv = document.getElementById("remoteVideo");
    const unmuteBtn = document.getElementById("unmuteVideoBtn");
    if (!rv || !rv.srcObject || !rv.muted) return;
    autoUnmuteAttempted = true;

    rv.muted = false;
    rv.removeAttribute("muted");
    const p = rv.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        unmuteBtn?.classList.add("hidden");
      }).catch(() => {
        // iOS Safari requires a tap to unmute audio -> keep video playing visibly muted & show button!
        rv.muted = true;
        rv.setAttribute("muted", "");
        rv.play().catch(() => {});
        unmuteBtn?.classList.remove("hidden");
      });
    }
  }

  function tryPlayRemoteVideo(forceUnmute = false) {
    const rv = document.getElementById("remoteVideo");
    const unmuteBtn = document.getElementById("unmuteVideoBtn");
    const playOv = document.getElementById("remotePlayOverlay");
    if (!rv || !rv.srcObject) return;

    const seq = ++remotePlaySeq;
    rv.playsInline = true;
    rv.autoplay = true;
    rv.setAttribute("playsinline", "");
    rv.setAttribute("webkit-playsinline", "");

    if (forceUnmute) {
      rv.muted = false;
      rv.removeAttribute("muted");
    } else if (!autoUnmuteAttempted) {
      // CRITICAL iOS/iPadOS WebKit fix: start playback muted so remote video ALWAYS renders immediately!
      rv.muted = true;
      rv.setAttribute("muted", "");
    }

    const p = rv.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        if (seq !== remotePlaySeq) return;
        playOv?.classList.add("hidden");
        syncCallDockVisibility();
        if (!forceUnmute && rv.muted) {
          unmuteBtn?.classList.remove("hidden");
          // Gently attempt auto-unmute once frames are flowing (succeeds on desktop & iOS after mic grant)
          setTimeout(() => tryAutoUnmuteRemote(), 350);
        } else if (!rv.muted) {
          unmuteBtn?.classList.add("hidden");
        }
      }).catch(err => {
        if (seq !== remotePlaySeq) return;
        if (err && err.name === "AbortError") {
          setTimeout(() => tryPlayRemoteVideo(forceUnmute), 220);
          return;
        }
        // Autoplay policy block on iOS Safari / Mobile Chrome -> force muted so VIDEO renders immediately!
        rv.muted = true;
        rv.setAttribute("muted", "");
        unmuteBtn?.classList.remove("hidden");
        const pMuted = rv.play();
        if (pMuted && typeof pMuted.then === "function") {
          pMuted.then(() => {
            playOv?.classList.add("hidden");
            syncCallDockVisibility();
          }).catch(() => {
            // Even muted autoplay blocked (e.g. iOS Low Power Mode) -> show tap-to-play overlay directly on video
            playOv?.classList.remove("hidden");
            syncCallDockVisibility();
          });
        }
      });
    } else {
      syncCallDockVisibility();
    }
  }

  function unmuteRemoteVideo() {
    const rv = document.getElementById("remoteVideo");
    if (!rv) return;
    rv.playsInline = true;
    rv.muted = false;
    rv.removeAttribute("muted");
    document.getElementById("unmuteVideoBtn")?.classList.add("hidden");
    document.getElementById("remotePlayOverlay")?.classList.add("hidden");
    const p = rv.play();
    if (p && typeof p.then === "function") {
      p.then(() => syncCallDockVisibility()).catch(() => {
        // Fallback: if audio still fails, ensure video plays muted
        rv.muted = true;
        rv.setAttribute("muted", "");
        rv.play().catch(() => {});
        document.getElementById("unmuteVideoBtn")?.classList.remove("hidden");
      });
    }
  }

  function hasLiveLocalTracks(wantVideo) {
    if (!localStream) return false;
    const live = localStream.getTracks().filter(tr => tr.readyState === "live");
    if (!live.length) return false;
    if (wantVideo && !live.some(tr => tr.kind === "video")) return false;
    return true;
  }

  async function getMediaSafe(kind = "video", allowReceiveOnly = false) {
    const wantVideo = kind === "video";
    if (hasLiveLocalTracks(wantVideo)) {
      syncCallDockVisibility();
      return localStream;
    }
    if (localStream) {
      localStream.getTracks().forEach(tr => { try { tr.stop(); } catch {} });
      localStream = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (allowReceiveOnly) {
        localStream = new MediaStream();
        appendPairChat(
          "other",
          "🌐 Call",
          getLang() === "vi"
            ? "ℹ️ Mở bằng HTTPS để bật camera của bạn — vẫn đang kết nối để xem video từ bạn đồng hành!"
            : "ℹ️ HTTPS is needed for your own camera — still connecting to watch your buddy's video!"
        );
      } else {
        openCamPermModal("no_https");
        return null;
      }
    } else {
      // Cascading constraints: desktop webcams & mobile browsers vary widely on facingMode/resolution
      const attempts = wantVideo
        ? [
            {
              video: {
                facingMode: { ideal: currentFacingMode },
                width: { ideal: 640, max: 1280 },
                height: { ideal: 480, max: 720 },
                frameRate: { ideal: 24, max: 30 }
              },
              audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            },
            { video: true, audio: true },
            { video: true, audio: false },
            { video: false, audio: true }
          ]
        : [
            { video: false, audio: { echoCancellation: true, noiseSuppression: true } },
            { video: false, audio: true }
          ];

      for (const constraints of attempts) {
        try {
          localStream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch {}
      }

      if (localStream) {
        updateCamHeaderBadge("granted");
      } else if (allowReceiveOnly) {
        updateCamHeaderBadge("denied");
        localStream = new MediaStream();
        appendPairChat(
          "other",
          "🌐 Call",
          getLang() === "vi"
            ? "ℹ️ Không mở được Camera/Mic trên máy này — đang kết nối chế độ chỉ xem & nghe video từ bạn!"
            : "ℹ️ Local Camera/Mic unavailable — connecting in receive-only mode so you can still see & hear your buddy!"
        );
      } else {
        updateCamHeaderBadge("denied");
        openCamPermModal("denied");
        return null;
      }
    }

    micEnabled = localStream.getAudioTracks().length > 0;
    camEnabled = localStream.getVideoTracks().length > 0;

    pairState.callActive = true;
    pairState.callKind = wantVideo ? "video" : "audio";
    // Reveal dock BEFORE attaching video streams (critical for iOS Safari WebKit!)
    syncCallDockVisibility();

    const lv = document.getElementById("localVideo");
    if (lv) {
      primeVideoElement(lv, true);
      lv.srcObject = camEnabled ? localStream : null;
      lv.onloadedmetadata = () => {
        lv.play().catch(() => {});
        syncCallDockVisibility();
      };
      lv.onplaying = () => syncCallDockVisibility();
      if (camEnabled) lv.play().catch(() => {});
    }

    updatePairControlsUI();
    updateMediaBtns();
    syncCallDockVisibility();
    return localStream;
  }

  async function attachLocalTracksToPeer(pc, stream, asOfferer, wantVideo) {
    const audioTrack = stream ? stream.getAudioTracks().find(t => t.readyState === "live") : null;
    const videoTrack = wantVideo && stream ? stream.getVideoTracks().find(t => t.readyState === "live") : null;

    if (asOfferer) {
      if (audioTrack) pc.addTrack(audioTrack, stream);
      else pc.addTransceiver("audio", { direction: "recvonly" });

      if (wantVideo) {
        if (videoTrack) pc.addTrack(videoTrack, stream);
        else pc.addTransceiver("video", { direction: "recvonly" });
      }
      return;
    }

    // Answerer (called AFTER setRemoteDescription):
    // Bind directly onto the remote offer's Unified Plan transceivers (prevents iOS/iPadOS Safari
    // from creating unmatched extra m-lines or leaving the video transceiver stuck at recvonly!)
    const transceivers = typeof pc.getTransceivers === "function" ? pc.getTransceivers() : [];
    const bindTrackToTransceiver = async (kind, track) => {
      if (!track) return;
      const match = transceivers.find(
        t => (t.receiver?.track?.kind === kind || t.sender?.track?.kind === kind) && t.direction !== "stopped"
      );
      if (match && match.sender) {
        try {
          await match.sender.replaceTrack(track);
          if (typeof match.sender.setStreams === "function" && stream) {
            try { match.sender.setStreams(stream); } catch {}
          }
          match.direction = "sendrecv";
          return;
        } catch {}
      }
      pc.addTrack(track, stream);
    };

    await bindTrackToTransceiver("audio", audioTrack);
    await bindTrackToTransceiver("video", videoTrack);
  }

  async function reportConnectionTransport(pc) {
    if (!pc || typeof pc.getStats !== "function") return;
    try {
      const stats = await pc.getStats();
      let selectedPair = null;
      stats.forEach(report => {
        if (report.type === "transport" && report.selectedCandidatePairId) {
          selectedPair = stats.get(report.selectedCandidatePairId);
        }
        if (!selectedPair && report.type === "candidate-pair" && (report.selected || report.nominated) && report.state === "succeeded") {
          selectedPair = report;
        }
      });
      if (!selectedPair) return;
      const localCand = stats.get(selectedPair.localCandidateId);
      const remoteCand = stats.get(selectedPair.remoteCandidateId);
      const isRelay = localCand?.candidateType === "relay" || remoteCand?.candidateType === "relay";
      const txt = document.getElementById("videoStatusText");
      if (txt) {
        if (isRelay) {
          txt.textContent = getLang() === "vi" ? "🟢 Cuộc gọi 2 chiều đã kết nối (TURN Relay)!" : "🟢 Pair Call Connected (TURN Relay)!";
        } else {
          txt.textContent = getLang() === "vi" ? "🟢 Cuộc gọi 2 chiều đã kết nối!" : "🟢 Pair Call Connected!";
        }
      }
    } catch {}
  }

  function clearSignalRetryTimers() {
    clearInterval(offerRetryTimer);
    clearInterval(answerRetryTimer);
    clearInterval(iceResendTimer);
    offerRetryTimer = null;
    answerRetryTimer = null;
    iceResendTimer = null;
  }

  function startOfferRetry(payload) {
    clearInterval(offerRetryTimer);
    lastSentOfferPayload = payload;
    offerAcked = false;
    let tries = 0;
    offerRetryTimer = setInterval(() => {
      if (!pairState.callActive || offerAcked || !rtcPc || rtcPc.signalingState !== "have-local-offer" || tries >= 6) {
        clearInterval(offerRetryTimer);
        offerRetryTimer = null;
        return;
      }
      tries++;
      publishRoom(payload);
    }, 2400);
  }

  function startAnswerRetry(payload) {
    clearInterval(answerRetryTimer);
    lastSentAnswerPayload = payload;
    answerAcked = false;
    let tries = 0;
    answerRetryTimer = setInterval(() => {
      if (!pairState.callActive || answerAcked || !rtcPc || tries >= 6) {
        clearInterval(answerRetryTimer);
        answerRetryTimer = null;
        return;
      }
      if (rtcPc.iceConnectionState === "connected" || rtcPc.iceConnectionState === "completed") {
        answerAcked = true;
        clearInterval(answerRetryTimer);
        answerRetryTimer = null;
        return;
      }
      tries++;
      publishRoom(payload);
      if (localIceCandidates.length > 0) {
        publishRoom({ type: "rtc_ice_batch", candidates: localIceCandidates });
      }
    }, 2000);
  }

  function startIceResendBurst() {
    clearInterval(iceResendTimer);
    let bursts = 0;
    iceResendTimer = setInterval(() => {
      if (!pairState.callActive || !rtcPc || bursts >= 4) {
        clearInterval(iceResendTimer);
        iceResendTimer = null;
        return;
      }
      if (rtcPc.iceConnectionState === "connected" || rtcPc.iceConnectionState === "completed") {
        clearInterval(iceResendTimer);
        iceResendTimer = null;
        return;
      }
      bursts++;
      if (localIceCandidates.length > 0) {
        publishRoom({ type: "rtc_ice_batch", candidates: localIceCandidates });
      }
    }, 1800);
  }

  function isPolitePeer(remoteSenderId) {
    const other = remoteSenderId || peerClientId;
    if (other && other !== myClientId) return myClientId < other;
    return !pairState.isHost;
  }

  function startCallWatchdog() {
    clearInterval(callWatchdogTimer);
    let ticks = 0;
    callWatchdogTimer = setInterval(() => {
      if (!rtcPc || !pairState.callActive) {
        clearInterval(callWatchdogTimer);
        return;
      }
      ticks++;
      const rv = document.getElementById("remoteVideo");
      const iceState = rtcPc.iceConnectionState;

      // Keep nudging remote video if stream arrived but iOS/iPadOS Safari paused it
      if (hasRemoteVideo && rv && rv.srcObject && (rv.paused || rv.videoWidth === 0)) {
        tryPlayRemoteVideo(false);
      }
      syncCallDockVisibility();

      // At ~9s if still not connected -> show Reconnect button and auto-trigger ICE restart once (offerer)
      if (ticks === 6 && iceState !== "connected" && iceState !== "completed") {
        document.getElementById("reconnectCallBtn")?.classList.remove("hidden");
        if (isCallOfferer && !iceRestartAttempted && rtcPc.remoteDescription) {
          triggerIceRestart();
        } else if (isCallOfferer && !rtcPc.remoteDescription && lastSentOfferPayload) {
          publishRoom(lastSentOfferPayload);
        }
      }
      if (ticks >= 24) clearInterval(callWatchdogTimer);
    }, 1500);
  }

  function createPeerConnection(iceServers, { forceRelay = false } = {}) {
    if (rtcPc) {
      try { rtcPc.close(); } catch {}
    }
    clearInterval(callWatchdogTimer);
    localIceCandidates = [];
    remoteIceCount = 0;
    localRelayCount = 0;
    remoteRelayCount = 0;
    seenIceKeys.clear();
    hasRemoteVideo = false;
    iceRestartAttempted = false;
    autoUnmuteAttempted = false;
    remoteStream = new MediaStream();

    const rtcCfg = {
      iceServers: iceServers || getDefaultIceServers(),
      iceCandidatePoolSize: 4,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require"
    };
    if (forceRelay) rtcCfg.iceTransportPolicy = "relay";
    rtcPc = new RTCPeerConnection(rtcCfg);

    const rv = document.getElementById("remoteVideo");
    if (rv) {
      // CRITICAL iOS/iPadOS Safari fix: prime muted=true so incoming remote video frames paint IMMEDIATELY!
      primeVideoElement(rv, true);
      rv.onloadedmetadata = () => {
        syncCallDockVisibility();
        tryPlayRemoteVideo(false);
      };
      rv.onloadeddata = () => {
        syncCallDockVisibility();
        tryPlayRemoteVideo(false);
      };
      rv.oncanplay = () => {
        syncCallDockVisibility();
        tryPlayRemoteVideo(false);
      };
      rv.onplaying = () => {
        document.getElementById("remotePlayOverlay")?.classList.add("hidden");
        syncCallDockVisibility();
      };
      rv.ontimeupdate = () => {
        if (rv.videoWidth > 0 && !document.getElementById("remoteCamPane")?.classList.contains("has-video")) {
          syncCallDockVisibility();
        }
      };
      rv.onresize = () => syncCallDockVisibility();
    }

    rtcPc.ontrack = ev => {
      if (!rv) return;
      let addedNewVideoTrack = false;
      // Prefer native WebRTC stream when provided, while tracking newly arrived video tracks for iOS Safari decoder wake-up
      if (ev.streams && ev.streams[0]) {
        const prevSame = rv.srcObject === ev.streams[0];
        remoteStream = ev.streams[0];
        for (const tr of remoteStream.getTracks()) {
          if (tr.kind === "video") {
            hasRemoteVideo = true;
            if (prevSame && ev.track && ev.track.kind === "video") addedNewVideoTrack = true;
          }
          tr.onunmute = () => {
            if (tr.kind === "video") hasRemoteVideo = true;
            syncCallDockVisibility();
            tryPlayRemoteVideo(false);
          };
          tr.onended = () => {
            hasRemoteVideo = remoteStream.getVideoTracks().some(t => t.readyState === "live");
            syncCallDockVisibility();
          };
        }
      } else if (ev.track) {
        if (!remoteStream) remoteStream = new MediaStream();
        if (!remoteStream.getTracks().some(x => x.id === ev.track.id)) {
          remoteStream.addTrack(ev.track);
          if (ev.track.kind === "video") addedNewVideoTrack = true;
        }
        if (ev.track.kind === "video") hasRemoteVideo = true;
        ev.track.onunmute = () => {
          if (ev.track.kind === "video") hasRemoteVideo = true;
          syncCallDockVisibility();
          tryPlayRemoteVideo(false);
        };
        ev.track.onended = () => {
          hasRemoteVideo = remoteStream.getVideoTracks().some(t => t.readyState === "live");
          syncCallDockVisibility();
        };
      }

      // Ensure dock is visible BEFORE attaching srcObject (crucial on iOS/iPadOS Safari!)
      syncCallDockVisibility();
      if (addedNewVideoTrack && rv.srcObject === remoteStream) {
        remoteStream = new MediaStream(remoteStream.getTracks());
        rv.srcObject = remoteStream;
      } else if (rv.srcObject !== remoteStream) {
        rv.srcObject = remoteStream;
      }
      tryPlayRemoteVideo(false);
    };

    const handleConnUpdate = () => {
      if (!rtcPc) return;
      const ice = rtcPc.iceConnectionState;
      const conn = rtcPc.connectionState || "";
      const txt = document.getElementById("videoStatusText");

      if (ice === "connected" || ice === "completed" || conn === "connected") {
        answerAcked = true;
        offerAcked = true;
        clearSignalRetryTimers();
        document.getElementById("reconnectCallBtn")?.classList.add("hidden");
        if (txt) txt.textContent = getLang() === "vi" ? "🟢 Cuộc gọi 2 chiều đã kết nối!" : "🟢 Pair Call Connected!";
        reportConnectionTransport(rtcPc);
        tryPlayRemoteVideo(false);
        syncCallDockVisibility();
      } else if (ice === "failed" || conn === "failed") {
        document.getElementById("reconnectCallBtn")?.classList.remove("hidden");
        if (txt) {
          txt.textContent = getLang() === "vi"
            ? "🟡 Đang tự động kết nối lại qua máy chủ chuyển tiếp..."
            : "🟡 Reconnecting via TURN relay...";
        }
        if (!iceRestartAttempted && rtcPc.remoteDescription) {
          triggerIceRestart();
        } else if (txt) {
          txt.textContent = getLang() === "vi"
            ? "⚠️ Mạng đang chặn P2P — bấm '🔄 Kết nối lại' nhé!"
            : "⚠️ Network blocked P2P — tap '🔄 Reconnect'!";
        }
      } else if (ice === "disconnected") {
        document.getElementById("reconnectCallBtn")?.classList.remove("hidden");
        if (txt) txt.textContent = getLang() === "vi" ? "🟡 Kết nối tạm gián đoạn, đang chờ phục hồi..." : "🟡 Connection interrupted, recovering...";
        setTimeout(() => {
          if (rtcPc && rtcPc.iceConnectionState === "disconnected" && isCallOfferer && !iceRestartAttempted) {
            triggerIceRestart();
          }
        }, 3500);
      } else if (ice === "checking") {
        if (txt) txt.textContent = getLang() === "vi" ? "🟡 Đang kết nối âm thanh & hình ảnh..." : "🟡 Connecting audio & video...";
      }
      updateCallDiag();
    };

    rtcPc.oniceconnectionstatechange = handleConnUpdate;
    rtcPc.onconnectionstatechange = handleConnUpdate;
    rtcPc.onsignalingstatechange = () => updateCallDiag();

    rtcPc.onicecandidate = ev => {
      if (ev.candidate && ev.candidate.candidate) {
        const candStr = ev.candidate.candidate;
        if (candStr.includes(" typ relay")) localRelayCount++;
        const candObj = {
          candidate: candStr,
          sdpMid: ev.candidate.sdpMid,
          sdpMLineIndex: ev.candidate.sdpMLineIndex
        };
        localIceCandidates.push(candObj);
        publishRoom({ type: "rtc_ice", candidate: candObj });
        updateCallDiag();
      } else if (!ev.candidate && localIceCandidates.length > 0) {
        // Gathering complete -> send reliable QoS 1 batch so mobile peer never misses any ICE candidate
        publishRoom({ type: "rtc_ice_batch", candidates: localIceCandidates });
        updateCallDiag();
      }
    };
  }

  async function triggerIceRestart() {
    if (!rtcPc || !pairState.connected) return;
    if (rtcPc.signalingState !== "stable") return;
    iceRestartAttempted = true;
    localIceCandidates = [];
    localRelayCount = 0;
    try {
      const offer = await rtcPc.createOffer({ iceRestart: true });
      await rtcPc.setLocalDescription(offer);
      publishRoom({
        type: "rtc_reoffer",
        callId: currentCallId,
        sdp: { type: offer.type, sdp: offer.sdp }
      });
      startIceResendBurst();
      updateCallDiag();
    } catch {}
  }

  async function reconnectCall() {
    if (!pairState.connected) return;
    if (!rtcPc) {
      startCall(pairState.callKind || "video");
      return;
    }
    const txt = document.getElementById("videoStatusText");
    if (txt) txt.textContent = getLang() === "vi" ? "🔄 Đang kết nối lại video..." : "🔄 Reconnecting video...";
    iceRestartAttempted = false;
    if (rtcPc.signalingState === "stable") {
      await triggerIceRestart();
    } else if (isCallOfferer && lastSentOfferPayload) {
      publishRoom(lastSentOfferPayload);
      if (localIceCandidates.length > 0) publishRoom({ type: "rtc_ice_batch", candidates: localIceCandidates });
    } else if (!isCallOfferer && lastSentAnswerPayload) {
      publishRoom(lastSentAnswerPayload);
      if (localIceCandidates.length > 0) publishRoom({ type: "rtc_ice_batch", candidates: localIceCandidates });
    }
    tryPlayRemoteVideo(false);
    updateCallDiag();
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

    // Prime video elements synchronously inside the user tap gesture (unlocks iOS/iPadOS Safari playback!)
    currentCallId = "call_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    pairState.callActive = true;
    pairState.callKind = effectiveKind;
    isCallOfferer = true;
    pendingCandidates = [];
    syncCallDockVisibility();
    primeVideoElement(document.getElementById("localVideo"), true);
    primeVideoElement(document.getElementById("remoteVideo"), true);

    const [iceServers, stream] = await Promise.all([
      loadIceServers(),
      getMediaSafe(effectiveKind, true)
    ]);
    if (!stream) {
      endCall(false);
      return;
    }

    const txt = document.getElementById("videoStatusText");
    if (txt) {
      txt.textContent = effectiveKind === "video"
        ? (getLang() === "vi" ? `🟡 Đang gọi Video tới ${pairState.friendNick}...` : `🟡 Video calling ${pairState.friendNick}...`)
        : (getLang() === "vi" ? `🟡 Đang gọi Thoại tới ${pairState.friendNick}...` : `🟡 Voice calling ${pairState.friendNick}...`);
    }

    createPeerConnection(iceServers);
    await attachLocalTracksToPeer(rtcPc, stream, true, effectiveKind === "video");

    const offer = await rtcPc.createOffer();
    await rtcPc.setLocalDescription(offer);
    const offerPayload = {
      type: "rtc_offer",
      callId: currentCallId,
      sdp: { type: offer.type, sdp: offer.sdp },
      from: getMyNick(),
      kind: effectiveKind
    };
    publishRoom(offerPayload);
    startOfferRetry(offerPayload);
    startIceResendBurst();
    startCallWatchdog();
    updateCallDiag();
  }

  async function acceptCollidingOffer(sdp, kind, callId) {
    // Perfect Negotiation: polite peer seamlessly switches from simultaneous outgoing offer to answering peer's offer!
    clearSignalRetryTimers();
    currentCallId = callId || currentCallId;
    isCallOfferer = false;
    const allowVideo = window.ChickenApp?.isPairVideoAllowed?.() !== false;
    const effectiveKind = kind === "video" && allowVideo ? "video" : "audio";
    const [iceServers, stream] = await Promise.all([
      loadIceServers(),
      getMediaSafe(effectiveKind, true)
    ]);
    if (!stream) return;

    createPeerConnection(iceServers);
    await rtcPc.setRemoteDescription(new RTCSessionDescription(sdp));
    await attachLocalTracksToPeer(rtcPc, stream, false, effectiveKind === "video");

    const buffered = pendingCandidates.splice(0, pendingCandidates.length);
    for (const c of buffered) {
      const key = `${c.sdpMid || ""}|${c.sdpMLineIndex ?? ""}|${c.candidate}`;
      seenIceKeys.add(key);
      try { await rtcPc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }

    const ans = await rtcPc.createAnswer();
    await rtcPc.setLocalDescription(ans);
    const ansPayload = {
      type: "rtc_answer",
      callId: currentCallId,
      sdp: { type: ans.type, sdp: ans.sdp }
    };
    publishRoom(ansPayload);
    startAnswerRetry(ansPayload);
    startIceResendBurst();
    tryPlayRemoteVideo(false);
    startCallWatchdog();
    updateCallDiag();
  }

  function handleIncomingOffer(sdp, callerName, kind, callId = "", senderId = "") {
    // Ignore duplicate retries of the exact same call offer while already handling it
    if (callId && callId === currentCallId && rtcPc && pairState.callActive && !isCallOfferer) {
      // Peer didn't receive our answer yet -> immediately resend our answer + ICE!
      if (lastSentAnswerPayload) publishRoom(lastSentAnswerPayload);
      if (localIceCandidates.length > 0) publishRoom({ type: "rtc_ice_batch", candidates: localIceCandidates });
      return;
    }
    // Ignore duplicate retry while incoming modal is already shown for this callId
    if (callId && incomingOffer && incomingOffer.callId === callId) {
      publishRoom({ type: "rtc_ringing", callId });
      return;
    }

    // Glare check: both iPhone & iPad tapped "Gọi Video" simultaneously!
    if (rtcPc && pairState.callActive) {
      if (rtcPc.signalingState === "have-local-offer") {
        if (isPolitePeer(senderId)) {
          acceptCollidingOffer(sdp, kind, callId);
        } else if (lastSentOfferPayload) {
          // Impolite peer wins glare -> remind polite peer of our offer
          publishRoom(lastSentOfferPayload);
        }
        return;
      }
      handleRtcReoffer(sdp, callId);
      return;
    }

    incomingOffer = { sdp, from: callerName || pairState.friendNick, kind: kind || "video", callId, senderId };
    if (callId) publishRoom({ type: "rtc_ringing", callId });

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
    const { sdp, kind, callId } = incomingOffer;
    incomingOffer = null;
    currentCallId = callId || ("call_" + Date.now());

    const allowVideo = window.ChickenApp?.isPairVideoAllowed?.() !== false;
    const effectiveKind = kind === "video" && allowVideo ? "video" : "audio";

    // Prime video elements synchronously inside the Accept tap gesture (critical on iOS/iPadOS Safari!)
    pairState.callActive = true;
    pairState.callKind = effectiveKind;
    isCallOfferer = false;
    syncCallDockVisibility();
    primeVideoElement(document.getElementById("localVideo"), true);
    primeVideoElement(document.getElementById("remoteVideo"), true);

    const txt = document.getElementById("videoStatusText");
    if (txt) txt.textContent = getLang() === "vi" ? "🟡 Đang kết nối video & âm thanh..." : "🟡 Connecting video & audio...";

    const [iceServers, stream] = await Promise.all([
      loadIceServers(),
      getMediaSafe(effectiveKind, true)
    ]);
    if (!stream) {
      publishRoom({ type: "rtc_reject" });
      endCall(false);
      return;
    }

    createPeerConnection(iceServers);
    // W3C Unified Plan + iOS WebKit order: setRemoteDescription FIRST, then bind tracks onto offer's transceivers!
    await rtcPc.setRemoteDescription(new RTCSessionDescription(sdp));
    await attachLocalTracksToPeer(rtcPc, stream, false, effectiveKind === "video");

    const buffered = pendingCandidates.splice(0, pendingCandidates.length);
    for (const c of buffered) {
      const key = `${c.sdpMid || ""}|${c.sdpMLineIndex ?? ""}|${c.candidate}`;
      seenIceKeys.add(key);
      try { await rtcPc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }

    const ans = await rtcPc.createAnswer();
    await rtcPc.setLocalDescription(ans);
    const ansPayload = {
      type: "rtc_answer",
      callId: currentCallId,
      sdp: { type: ans.type, sdp: ans.sdp }
    };
    publishRoom(ansPayload);
    startAnswerRetry(ansPayload);
    startIceResendBurst();
    tryPlayRemoteVideo(false);
    startCallWatchdog();
    updateCallDiag();
  }

  async function handleRtcReoffer(sdp, callId = "") {
    if (!rtcPc || !sdp) return;
    try {
      if (rtcPc.signalingState !== "stable") {
        try { await rtcPc.setLocalDescription({ type: "rollback" }); } catch {}
      }
      await rtcPc.setRemoteDescription(new RTCSessionDescription(sdp));
      const buffered = pendingCandidates.splice(0, pendingCandidates.length);
      for (const c of buffered) {
        try { await rtcPc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }
      const ans = await rtcPc.createAnswer();
      await rtcPc.setLocalDescription(ans);
      const ansPayload = {
        type: "rtc_answer",
        callId: callId || currentCallId,
        sdp: { type: ans.type, sdp: ans.sdp }
      };
      publishRoom(ansPayload);
      startAnswerRetry(ansPayload);
      tryPlayRemoteVideo(false);
      updateCallDiag();
    } catch {}
  }

  function rejectIncomingCall() {
    document.getElementById("incomingCallModal")?.classList.add("hidden");
    incomingOffer = null;
    pendingCandidates = [];
    publishRoom({ type: "rtc_reject" });
  }

  async function handleRtcAnswer(sdp, callId = "") {
    if (!rtcPc || !sdp) return;
    // Always acknowledge receipt so Callee stops retrying rtc_answer!
    publishRoom({ type: "rtc_answer_ack", callId: callId || currentCallId });
    offerAcked = true;
    clearInterval(offerRetryTimer);

    if (rtcPc.signalingState !== "have-local-offer") {
      // Already applied answer -> just replay ICE candidates in case callee missed any!
      if (localIceCandidates.length > 0 && rtcPc.iceConnectionState !== "connected" && rtcPc.iceConnectionState !== "completed") {
        publishRoom({ type: "rtc_ice_batch", candidates: localIceCandidates });
      }
      return;
    }
    try {
      await rtcPc.setRemoteDescription(new RTCSessionDescription(sdp));
      const buffered = pendingCandidates.splice(0, pendingCandidates.length);
      for (const c of buffered) {
        try { await rtcPc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }
      // Replay all gathered ICE candidates reliably once callee has answered (fixes missed candidates during iOS permission popup!)
      if (localIceCandidates.length > 0) {
        publishRoom({ type: "rtc_ice_batch", candidates: localIceCandidates });
      }
      tryPlayRemoteVideo(false);
      updateCallDiag();
    } catch {}
  }

  async function handleRtcIce(c) {
    if (!c || !c.candidate) return;
    const key = `${c.sdpMid || ""}|${c.sdpMLineIndex ?? ""}|${c.candidate}`;
    if (seenIceKeys.has(key)) return;
    seenIceKeys.add(key);
    remoteIceCount++;
    if (String(c.candidate).includes(" typ relay")) remoteRelayCount++;

    if (!rtcPc || !rtcPc.remoteDescription) {
      pendingCandidates.push(c);
      updateCallDiag();
      return;
    }
    try { await rtcPc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    updateCallDiag();
  }

  async function handleRtcIceBatch(candidates) {
    if (!Array.isArray(candidates)) return;
    for (const c of candidates) {
      await handleRtcIce(c);
    }
  }

  async function switchCamera() {
    if (!localStream || !localStream.getVideoTracks().length) return;
    const prevFacing = currentFacingMode;
    currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
    const oldTrack = localStream.getVideoTracks()[0];
    // On mobile phones (Android/iOS), stopping the old camera track FIRST avoids NotReadableError when opening the other lens!
    if (oldTrack) {
      try { oldTrack.stop(); } catch {}
      localStream.removeTrack(oldTrack);
    }
    try {
      let ns;
      try {
        ns = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: currentFacingMode }, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
      } catch {
        ns = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: currentFacingMode }, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
      }
      const newTrack = ns.getVideoTracks()[0];
      localStream.addTrack(newTrack);
      const lv = document.getElementById("localVideo");
      if (lv) {
        lv.style.transform = currentFacingMode === "user" ? "scaleX(-1)" : "none";
        lv.srcObject = localStream;
        lv.play().catch(() => {});
      }
      if (rtcPc) {
        const videoSender =
          rtcPc.getTransceivers?.().find(t => t.receiver?.track?.kind === "video" || t.sender?.track?.kind === "video")?.sender ||
          rtcPc.getSenders().find(s => s.track?.kind === "video");
        if (videoSender) await videoSender.replaceTrack(newTrack);
      }
      syncCallDockVisibility();
    } catch {
      currentFacingMode = prevFacing;
      try {
        const restore = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: prevFacing } }, audio: false });
        const tr = restore.getVideoTracks()[0];
        if (tr) {
          localStream.addTrack(tr);
          const lv = document.getElementById("localVideo");
          if (lv) { lv.srcObject = localStream; lv.play().catch(() => {}); }
          const videoSender = rtcPc?.getTransceivers?.().find(t => t.receiver?.track?.kind === "video")?.sender;
          if (videoSender) await videoSender.replaceTrack(tr);
        }
      } catch {}
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
      syncCallDockVisibility();
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
    clearInterval(callWatchdogTimer);
    clearSignalRetryTimers();
    incomingOffer = null;
    currentCallId = "";
    lastSentOfferPayload = null;
    lastSentAnswerPayload = null;
    offerAcked = false;
    answerAcked = false;
    pendingCandidates = [];
    localIceCandidates = [];
    remoteIceCount = 0;
    localRelayCount = 0;
    remoteRelayCount = 0;
    seenIceKeys.clear();
    remoteStream = null;
    hasRemoteVideo = false;
    isCallOfferer = false;
    iceRestartAttempted = false;
    autoUnmuteAttempted = false;
    remotePlaySeq++;
    pairState.callActive = false;
    if (rtcPc) { try { rtcPc.close(); } catch {} rtcPc = null; }
    if (localStream) { localStream.getTracks().forEach(tr => { try { tr.stop(); } catch {} }); localStream = null; }
    const lv = document.getElementById("localVideo");
    const rv = document.getElementById("remoteVideo");
    if (lv) lv.srcObject = null;
    if (rv) rv.srcObject = null;
    const diagEl = document.getElementById("callDiagText");
    if (diagEl) diagEl.textContent = "";
    document.getElementById("localCamPane")?.classList.remove("has-video");
    document.getElementById("remoteCamPane")?.classList.remove("has-video");
    document.getElementById("unmuteVideoBtn")?.classList.add("hidden");
    document.getElementById("remotePlayOverlay")?.classList.add("hidden");
    document.getElementById("reconnectCallBtn")?.classList.add("hidden");
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
    reconnectCall,
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
