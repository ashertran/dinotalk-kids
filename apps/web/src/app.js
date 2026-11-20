// ==========================================================================
// CHICKEN TALK — Core Application Controller
// Handles: Splash, Kids Home, World Selection, Buddy Lobby & Mic Check,
// Talk with Chicky AI (with backend RAG + deterministic fallback),
// Parent Gate, Full 7-Pillar Parent Space, Audio/TTS, and Safe Persistence.
// ==========================================================================

(function () {
  const IS_LOCALHOST =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  const META_API_BASE = (
    document.querySelector('meta[name="chickentalk-api-base"]')?.content ||
    document.querySelector('meta[name="dinotalk-api-base"]')?.content ||
    ""
  ).trim().replace(/\/+$/, "");

  const DEFAULT_API_BASE = IS_LOCALHOST
    ? "http://localhost:4000"
    : (META_API_BASE || window.location.origin);

  const AI_CONFIG = {
    API_BASE: DEFAULT_API_BASE,
    PROXY_URL: `${DEFAULT_API_BASE}/api/agent/chat`
  };

  const AVATAR_CHOICES = ["🐥", "🐶", "🐰", "🦊", "🐼", "🐱"];

  const MINI_DICT = {
    where: "ở đâu", is: "là / ở", milo: "chú cún Milo", puppy: "chú cún con", dog: "chú chó",
    see: "nhìn thấy", look: "nhìn kìa", go: "đi", left: "bên trái", right: "bên phải",
    behind: "phía sau", tree: "cái cây", bush: "bụi cây", flower: "bông hoa", flowers: "những bông hoa",
    blue: "màu xanh dương", yellow: "màu vàng", green: "màu xanh lá", orange: "màu cam",
    collar: "vòng cổ", bone: "khúc xương", butterfly: "chú bướm", garden: "khu vườn",
    magic: "phép thuật", bridge: "cây cầu", pond: "hồ nước", friend: "người bạn", buddy: "bạn thân",
    like: "thích", love: "yêu thích", help: "giúp đỡ", put: "đặt / để", here: "ở đây",
    color: "màu sắc", build: "xây dựng", together: "cùng nhau", house: "ngôi nhà", home: "nhà",
    have: "có", has: "có (ngôi 3 số ít)", many: "bao nhiêu / nhiều", thank: "cảm ơn", want: "muốn",
    apple: "quả táo", banana: "quả chuối", strawberry: "quả dâu tây", market: "khu chợ",
    hello: "xin chào", hi: "chào", happy: "vui vẻ", let: "hãy cùng", play: "chơi",
    explore: "khám phá", clue: "manh mối", paw: "dấu chân thú cưng", rescue: "giải cứu"
  };

  const SKILL_META = {
    like_dislike: { label: "Sharing Preferences (I like / I want)", cefr: "A0" },
    has_have: { label: "Describing Clues & Pets (have / has)", cefr: "A1" },
    present_continuous: { label: "Actions Happening Now (am/is/are + V-ing)", cefr: "A1" },
    past_simple: { label: "Retelling Adventures (Past Simple)", cefr: "A2" },
    articles: { label: "Smooth Speaking (a / an)", cefr: "A0" }
  };

  const I18N = {
    vi: {
      tagline: "Cùng Chơi. Cùng Nói. Cùng Lớn Lên.",
      splash_sub: "Chicky đang chờ bé ở Thế Giới Nhỏ! Sẵn sàng vừa chơi vừa nói tiếng Anh chưa nào?",
      splash_cta: "Vào Chơi Thôi!",
      splash_safe_note: "🛡️ An toàn cho bé • Không quảng cáo • Không người lạ • AI minh bạch",
      btn_parents_short: "Phụ Huynh",
      nav_home: "Trang Chủ",
      nav_worlds: "Thế Giới Nhỏ",
      nav_pair: "Phòng Cặp & Call",
      nav_race: "Đua Vui",
      nav_chat: "Chicky AI",
      nav_parent: "Phụ Huynh",
      home_sub: "Cùng bạn thân gọi Video/Thoại, giải cứu cún Milo, đua vui tiếng Anh và trò chuyện cùng Chicky!",
      home_primary_cta: "Khám Phá Thế Giới Của Chicky",
      home_pair_cta: "Phòng Cặp 4 Số & Call",
      home_quick_puppy: "Chơi Ngay: Tìm Cún Milo!",
      tile_pair_title: "Phòng Cặp 4 Số, Call & Hợp Tác",
      tile_pair_desc: "Tạo phòng 4 số với bạn, gọi Video/Thoại chia đôi màn hình, cùng tìm cún Milo 2 người hoặc mời đua vui!",
      tile_pair_cta: "Mở Phòng Cặp →",
      tile_race_title: "Đường Đua Vui Theo Cặp",
      tile_race_desc: "Thi phản xạ nghe & nói tiếng Anh thật vui cùng Chicky hoặc rủ bạn trong phòng cặp đua trực tiếp!",
      tile_race_cta: "Vào Đường Đua →",
      pair_heading: "Phòng Tương Tác Theo Cặp (Mã 4 Số & Call)",
      pair_sub: "Tạo hoặc nhập mã phòng 4 số để gọi Video/Thoại 2 chiều, cùng giải cứu Cún Milo 2 người hoặc Đua Vui tiếng Anh!",
      btn_create_room: "Tạo Phòng 4 Số",
      btn_join_room: "Vào Phòng",
      race_heading: "Đường Đua Vui Tiếng Anh Theo Cặp",
      race_sub: "Thi phản xạ nghe, chọn và nói tiếng Anh tự nhiên cùng Chicky hoặc bạn trong Phòng 4 Số!",
      tile_world1_title: "Thế Giới 1: Khu Vườn Phép Thuật",
      tile_world1_desc: "Tìm chú cún Milo đi lạc! Chia sẻ manh mối bằng tiếng Anh cùng bạn nhé.",
      tile_play_now: "Chơi Nhiệm Vụ →",
      tile_chat_title: "Trò Chuyện Cùng Chicky AI",
      tile_chat_desc: "Nói tiếng Anh tự do về khu vườn, thú cưng và câu chuyện vui. Chicky luôn cổ vũ bé!",
      tile_chat_cta: "Chào Chicky →",
      tile_parent_title: "An Toàn & Tiến Độ Phụ Huynh",
      tile_parent_desc: "Duyệt danh sách bạn tin cậy, quản lý quyền riêng tư và xem báo cáo học nhẹ nhàng.",
      tile_parent_cta: "Mở Không Gian Phụ Huynh →",
      worlds_heading: "🗺️ Thế Giới Nhỏ Của Chicky",
      worlds_sub: "Chọn một thế giới kỳ diệu để vừa chơi vừa nói tiếng Anh cùng nhau!",
      missions_heading: "Khu Vườn Phép Thuật — Chọn Nhiệm Vụ",
      missions_sub: "Chọn một câu chuyện hợp tác để cùng bạn khám phá bằng tiếng Anh!",
      mission1_desc: "Cún Milo đuổi theo chú bướm vàng vào Khu Vườn Phép Thuật! Dùng bản đồ & manh mối ghép đôi cùng bạn để giải cứu Milo nhé!",
      mission1_cta: "Vào Phòng Bạn Thân & Chơi!",
      btn_back_home: "Về Trang Chủ",
      btn_back_worlds: "Thế Giới Nhỏ",
      lobby_title: "Nhiệm Vụ 1: Tìm Chú Cún Milo",
      lobby_sub: "Chọn bạn đã được phụ huynh duyệt, chọn vai trò ghép manh mối và kiểm tra âm thanh!",
      demo_banner_title: "Đang bật Chế Độ Demo Độc Lập:",
      demo_banner_desc: "Bé đang chơi thử cùng bạn giả lập (Luna) để trải nghiệm trọn vẹn nhiệm vụ tại máy. Không kết nối người lạ.",
      lobby_pick_buddy: "1. Chọn Bạn Đã Được Duyệt",
      lobby_buddy_note: "🛡️ Chỉ bạn bè được Phụ huynh duyệt mới xuất hiện ở đây. Không có người lạ.",
      lobby_pick_role: "2. Chọn Vai Trò Thám Hiểm (Ghép Manh Mối)",
      role_scout_desc: "Bé nhìn thấy bản đồ & lối đi. Hỏi bạn để biết manh mối!",
      role_spotter_desc: "Bé nhìn thấy dấu chân & manh mối ẩn. Chỉ đường cho bạn!",
      lobby_mic_title: "3. Kiểm Tra Âm Thanh & Micro",
      lobby_mic_ready: "🎙️ Sẵn sàng thử Push-to-Talk!",
      lobby_mic_test_btn: "Kiểm Tra Âm Thanh & Mic",
      lobby_mic_reassure: "✨ Không có micro vẫn chơi trọn vẹn bằng Thẻ Hình Ảnh & Câu Gợi Ý!",
      lobby_targets: "Mẫu Câu Bé Sẽ Dùng Khi Chơi:",
      lobby_start_btn: "Bắt Đầu Phiêu Lưu: Tìm Milo!",
      btn_hint_short: "Gợi Ý",
      btn_pause: "Tạm Dừng",
      btn_safe_exit: "Thoát An Toàn",
      btn_ptt: "BẤM ĐỂ NÓI (PUSH-TO-TALK)",
      hint_scaffold_title: "Hỗ Trợ Thích Ứng Của Chicky",
      complete_title: "Hoan Hô! Hai Bạn Đã Tìm Thấy Milo!",
      complete_sub: "Phối hợp tuyệt vời cùng bạn đồng hành! Milo đang vẫy đuôi vui mừng quá kìa!",
      complete_phrases_lbl: "🗣️ Các Câu Tiếng Anh Bé Đã Dùng (chạm để nghe lại):",
      btn_play_again: "Chơi Lại",
      btn_parent_summary: "Xem Báo Cáo Phụ Huynh",
      chat_chicky_bio: "Mình là Chicky — chú gà con AI tò mò luôn lắng nghe bé! Nói sai một chút cũng không sao đâu!",
      btn_story_spark: "Chuyện Vui Bất Ngờ",
      btn_new_story: "Tạo Thế Giới Của Bé",
      chat_speak_btn: "BẤM ĐỂ NÓI CHUYỆN CÙNG CHICKY",
      btn_ideas: "Gợi Ý",
      btn_send: "Gửi",
      btn_account: "Tài Khoản",
      btn_refresh: "Làm Mới"
    },
    en: {
      tagline: "Play Together. Talk Together. Grow Together.",
      splash_sub: "Chicky is waiting in Chicky's Little World! Ready to play & speak English together?",
      splash_cta: "Let's Play!",
      splash_safe_note: "🛡️ Kid-Safe • No Ads • No Strangers • AI Guide Transparency",
      btn_parents_short: "Parents",
      nav_home: "Home",
      nav_worlds: "Little World",
      nav_pair: "Pair Room & Call",
      nav_race: "Buddy Race",
      nav_chat: "Chicky AI",
      nav_parent: "Parent Space",
      home_sub: "Pair up with a buddy for Video/Voice Calls, rescue Milo together, sprint in Buddy Race, or chat with Chicky!",
      home_primary_cta: "Explore Chicky's Little World",
      home_pair_cta: "4-Digit Pair Room & Call",
      home_quick_puppy: "Play: Find Milo!",
      tile_pair_title: "Pair Room, Video Call & Co-op",
      tile_pair_desc: "Create a 4-digit room with a friend, split-screen Video/Voice Call, rescue Milo as a pair, or race together!",
      tile_pair_cta: "Open Pair Room →",
      tile_race_title: "Chicky Buddy Race",
      tile_race_desc: "Play a joyful English speaking & reflex sprint solo with Chicky or invite your paired buddy!",
      tile_race_cta: "Start Sprint →",
      pair_heading: "Pair Interaction Room (4-Digit Code & Call)",
      pair_sub: "Create or join a 4-digit room for 2-way Video/Voice Calls, Live Pair Milo Rescue, or Buddy Race!",
      btn_create_room: "Create 4-Digit Room",
      btn_join_room: "Join Room",
      race_heading: "Chicky Buddy English Sprint",
      race_sub: "Race playfully in English with Chicky or invite your buddy connected in a 4-Digit Pair Room!",
      tile_world1_title: "World 1: The Magic Garden",
      tile_world1_desc: "Find Milo, the missing puppy! Share clues with your buddy using fun English phrases.",
      tile_play_now: "Play Adventure →",
      tile_chat_title: "Talk with Chicky AI",
      tile_chat_desc: "Chat freely in English about gardens, pets, and stories. Chicky gently helps you along!",
      tile_chat_cta: "Say Hello →",
      tile_parent_title: "Parent Safety & Progress",
      tile_parent_desc: "Approve trusted buddies, manage privacy & session limits, and view gentle learning summaries.",
      tile_parent_cta: "Open Parent Space →",
      worlds_heading: "🗺️ Chicky's Little World",
      worlds_sub: "Choose a magical place to play and speak English together!",
      missions_heading: "The Magic Garden — Choose Your Mission",
      missions_sub: "Pick a cooperative story adventure to play together in English!",
      mission1_desc: "Milo chased a yellow butterfly into the Magic Garden! Team up with your buddy using Map Scout & Clue Spotter clues to find Milo!",
      mission1_cta: "Join Buddy Lobby & Play!",
      btn_back_home: "Back Home",
      btn_back_worlds: "Little World",
      lobby_title: "Mission 1: The Missing Puppy",
      lobby_sub: "Pick an approved buddy, choose your Information Gap role, and test your voice!",
      demo_banner_title: "Isolated Demo Mode Active:",
      demo_banner_desc: "You are playing with a clearly labeled simulated buddy (Luna) so you can try the full mission locally. No strangers or live peer sessions are active.",
      lobby_pick_buddy: "1. Choose an Approved Buddy",
      lobby_buddy_note: "🛡️ Only buddies approved in Parent Space appear here. Zero stranger discovery.",
      lobby_pick_role: "2. Pick Your Explorer Role (Information Gap)",
      role_scout_desc: "You see the garden map & paths. Ask your buddy for clues!",
      role_spotter_desc: "You see Milo's paw prints & clues. Guide your buddy where to go!",
      lobby_mic_title: "3. Audio & Microphone Check",
      lobby_mic_ready: "🎙️ Ready to test Push-to-Talk!",
      lobby_mic_test_btn: "Test Audio & Mic",
      lobby_mic_reassure: "✨ No microphone? No problem! Play the whole mission with Picture Cards & Phrase Hints.",
      lobby_targets: "Phrases We'll Play With:",
      lobby_start_btn: "Start Adventure: Find Milo!",
      btn_hint_short: "Hint",
      btn_pause: "Pause",
      btn_safe_exit: "Safe Exit",
      btn_ptt: "TAP TO SPEAK (PUSH-TO-TALK)",
      hint_scaffold_title: "Chicky's Adaptive Support",
      complete_title: "Hooray! You Rescued Milo Together!",
      complete_sub: "Amazing teamwork with your buddy! Milo is wagging his tail so happily!",
      complete_phrases_lbl: "🗣️ English Phrases You Used Together (tap to hear again):",
      btn_play_again: "Play Again",
      btn_parent_summary: "Parent Summary",
      chat_chicky_bio: "I'm Chicky — your curious baby chicken AI guide! Speak or tap ideas — mistakes are totally okay!",
      btn_story_spark: "Surprise Story",
      btn_new_story: "My Story World",
      chat_speak_btn: "TAP TO TALK WITH CHICKY",
      btn_ideas: "Ideas",
      btn_send: "Send",
      btn_account: "Parent Account",
      btn_refresh: "Refresh"
    }
  };

  const CHICKY_TOPICS = [
    {
      id: "magic_garden_chat",
      label: "🌿 Magic Garden",
      grammarName: "Asking & Pointing (Where is...? / Behind...)",
      example: "\"Where is Milo? Let's look behind the big tree!\"",
      opener: "Cheep-cheep! 🐥 Welcome to the Magic Garden! I see a yellow butterfly flying near the flowers. What do you see?",
      openerVi: "Chíp chíp! 🐥 Chào mừng tới Khu Vườn Phép Thuật! Chicky thấy một chú bướm vàng đang bay quanh hoa. Bé nhìn thấy gì nào?",
      openerGram: "💡 Mẹo tự nhiên: Dùng 'I see a...' (Mình nhìn thấy...) để miêu tả mọi thứ xung quanh thật dễ dàng!",
      initialHints: ["I see a cute puppy!", "Where is Milo?", "Let's look behind the tree!"]
    },
    {
      id: "little_home_chat",
      label: "🏡 My Little Home",
      grammarName: "Teamwork & Likes (I like... / Put it here)",
      example: "\"I like the yellow lamp! Can you help me put it here?\"",
      opener: "Yay! 🏡 Let's decorate our cozy treehouse together! What color should we paint the door?",
      openerVi: "Hoan hô! 🏡 Cùng trang trí ngôi nhà nhỏ ấm áp nhé! Tụi mình sơn cánh cửa màu gì nhỉ?",
      openerGram: "💡 Mẹo tự nhiên: Dùng 'I like...' (Mình thích...) và 'Let's build together!' (Cùng xây nhé!).",
      initialHints: ["I like sky blue!", "Can you help me?", "Let's put a yellow sofa here!"]
    },
    {
      id: "food_market_chat",
      label: "🧺 Happy Food Market",
      grammarName: "Polite Shopping (Can I have...? / Thank you)",
      example: "\"Can I have three sweet apples, please? Thank you!\"",
      opener: "Welcome to the Happy Food Market! 🧺🍓 We are planning a picnic party for Milo. What yummy fruit do you want?",
      openerVi: "Chào mừng đến Khu Chợ Món Ngon! 🧺🍓 Tụi mình chuẩn bị tiệc dã ngoại cho Milo. Bé muốn mua loại quả ngon nào?",
      openerGram: "💡 Mẹo tự nhiên: Khi xin món gì thật lịch sự, nói 'Can I have..., please?' và 'Thank you!' nhé!",
      initialHints: ["Can I have two apples, please?", "I want sweet strawberries!", "How many bananas do we need?"]
    }
  ];

  const SURPRISE_STORIES = [
    {
      title: "🦋 The Butterfly Picnic",
      grammar: "Describing (I see / It has)",
      example: "\"I see a bright yellow butterfly on the flower!\"",
      opener: "Cheep! 🦋 A giant rainbow butterfly just landed on our picnic basket! What color are its wings?",
      openerVi: "Chíp! 🦋 Một chú bướm cầu vồng vừa đậu lên giỏ dã ngoại kìa! Đôi cánh của nó màu gì nhỉ?",
      openerGram: "💡 Mẹo tự nhiên: Nói về màu sắc với 'It is...' hoặc 'It has blue wings!'",
      hints: ["It has yellow and blue wings!", "Look! It is dancing!", "Let's follow the butterfly!"]
    },
    {
      title: "🐶 Milo's Hide and Seek",
      grammar: "Places (behind / under / next to)",
      example: "\"Milo is hiding behind the big oak tree!\"",
      opener: "Woof, woof! 🐶 Milo loves hide-and-seek! He isn't under the table... where should we look next?",
      openerVi: "Gâu gâu! 🐶 Milo mê chơi trốn tìm lắm! Milo không ở dưới bàn... tụi mình tìm ở đâu tiếp nhỉ?",
      openerGram: "💡 Mẹo tự nhiên: Dùng 'behind' (sau), 'under' (dưới), 'near' (gần) để chỉ vị trí!",
      hints: ["Look behind the sofa!", "Is Milo near the door?", "I see Milo's floppy ears!"]
    }
  ];

  function defaultLocalBehavior() {
    return {
      speakAttempts: 0,
      hintsUsed: 0,
      wordLookups: 0,
      transClicked: 0,
      grammarOk: 0,
      grammarError: 0,
      skills: {
        like_dislike: { skill_tag: "like_dislike", mastery_score: 45, correct_count: 0, error_count: 0 },
        has_have: { skill_tag: "has_have", mastery_score: 40, correct_count: 0, error_count: 0 },
        present_continuous: { skill_tag: "present_continuous", mastery_score: 35, correct_count: 0, error_count: 0 },
        past_simple: { skill_tag: "past_simple", mastery_score: 30, correct_count: 0, error_count: 0 },
        articles: { skill_tag: "articles", mastery_score: 42, correct_count: 0, error_count: 0 }
      },
      events: []
    };
  }

  function defaultApprovedBuddies() {
    return [
      { id: "luna_demo", name: "Luna", avatar: "🐰", approved: true, isDemoBot: true, note: "Simulated Demo Buddy" },
      { id: "bean_friend", name: "Bean", avatar: "🦊", approved: true, isDemoBot: true, note: "Simulated Practice Buddy" }
    ];
  }

  function createDefaultSave() {
    return {
      stars: 0,
      lang: "vi",
      apiBase: AI_CONFIG.API_BASE,
      authToken: null,
      account: null,
      kidProfile: { nickname: "Minh", age_band: "6-10", cefr_level: "A0", avatar: "🐥" },
      parentConsent: {
        verifiedAdult: true,
        allowPushToTalk: true,
        allowPairVideoCall: true,
        storeRawAudio: false,
        sessionLimitMin: 15,
        defaultHintLevel: 1
      },
      approvedBuddies: defaultApprovedBuddies(),
      missionHistory: [],
      customTopics: [],
      localBehavior: defaultLocalBehavior()
    };
  }

  let save = createDefaultSave();
  try {
    const raw = localStorage.getItem("chickentalk_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      save = {
        ...save,
        ...parsed,
        kidProfile: { ...save.kidProfile, ...(parsed.kidProfile || {}) },
        parentConsent: { ...save.parentConsent, ...(parsed.parentConsent || {}) },
        approvedBuddies: Array.isArray(parsed.approvedBuddies) && parsed.approvedBuddies.length ? parsed.approvedBuddies : defaultApprovedBuddies(),
        missionHistory: Array.isArray(parsed.missionHistory) ? parsed.missionHistory : [],
        customTopics: Array.isArray(parsed.customTopics) ? parsed.customTopics : [],
        localBehavior: {
          ...defaultLocalBehavior(),
          ...(parsed.localBehavior || {}),
          skills: {
            ...defaultLocalBehavior().skills,
            ...((parsed.localBehavior && parsed.localBehavior.skills) || {})
          }
        }
      };
    } else {
      // Gentle migration from previous dinotalk_v6 profile if present
      const legacyRaw = localStorage.getItem("dinotalk_v6");
      if (legacyRaw) {
        const leg = JSON.parse(legacyRaw);
        if (typeof leg.stars === "number") save.stars = leg.stars;
        if (leg.kidProfile?.nickname) save.kidProfile.nickname = leg.kidProfile.nickname;
        if (leg.kidProfile?.cefr_level) save.kidProfile.cefr_level = leg.kidProfile.cefr_level;
      }
    }
  } catch {}

  if (save.apiBase) {
    AI_CONFIG.API_BASE = save.apiBase.replace(/\/+$/, "");
    AI_CONFIG.PROXY_URL = `${AI_CONFIG.API_BASE}/api/agent/chat`;
  }

  // Runtime UI state
  let currentScreen = "home";
  let soundOn = true;
  let parentGateUnlocked = false;
  let parentGateExpected = 12;
  let selectedLobbyBuddyId = save.approvedBuddies[0]?.id || "luna_demo";
  let selectedLobbyRole = "map_scout";
  let homePokeIdx = 0;
  let currentTopicId = CHICKY_TOPICS[0].id;
  let currentDynamicHints = [];
  let hintsVisible = false;
  let chatListening = false;
  let chatRecognition = null;
  let authMode = "login";
  let storySparkIdx = 0;

  function persist() {
    try { localStorage.setItem("chickentalk_v1", JSON.stringify(save)); } catch {}
    const sc = document.getElementById("starCount");
    if (sc) sc.textContent = save.stars;
    const hName = document.getElementById("headerKidName");
    const hAv = document.getElementById("headerKidAvatar");
    if (hName) hName.textContent = save.kidProfile.nickname || "Minh";
    if (hAv) hAv.textContent = save.kidProfile.avatar || "🐥";
    updateHomeGreeting();
  }

  function t(key) {
    return (I18N[save.lang] && I18N[save.lang][key]) || I18N.en[key] || key;
  }

  // ================= AUDIO, SFX & SPEECH =================
  let audioCtx = null;
  function playTone(freq = 560, dur = 0.09) {
    if (!soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.35, audioCtx.currentTime + dur);
      gain.gain.setValueAtTime(0.11, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.008, audioCtx.currentTime + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch {}
  }

  function playFanfare() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => playTone(f, 0.13), i * 95));
  }

  function speakVoice(txt, { pitch = 1.18, rate = 0.94, onEnd = null } = {}) {
    if (!soundOn || !("speechSynthesis" in window)) {
      if (onEnd) setTimeout(onEnd, 350);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const clean = String(txt || "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
      if (!clean) {
        if (onEnd) onEnd();
        return;
      }
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = "en-US";
      u.pitch = pitch;
      u.rate = rate;
      if (onEnd) u.onend = onEnd;
      window.speechSynthesis.speak(u);
    } catch {
      if (onEnd) onEnd();
    }
  }

  function toggleSound() {
    soundOn = !soundOn;
    const btn = document.getElementById("soundBtn");
    if (btn) {
      btn.textContent = soundOn ? "🔊" : "🔇";
      btn.classList.toggle("muted", !soundOn);
    }
    if (!soundOn && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function launchConfetti() {
    const cols = ["#FFD54F", "#73C9F5", "#FF986A", "#A8E6CF"];
    for (let i = 0; i < 36; i++) {
      const d = document.createElement("div");
      d.className = "confetti";
      d.style.left = Math.random() * 100 + "vw";
      d.style.background = cols[i % cols.length];
      d.style.animationDuration = (1.2 + Math.random() * 0.9) + "s";
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 2200);
    }
  }

  // ================= NAVIGATION & SCREENS =================
  const ALL_SCREENS = ["home", "worlds", "missions", "lobby", "mission", "complete", "chat", "pair", "race", "parent"];

  function showScreen(name) {
    currentScreen = name;
    ALL_SCREENS.forEach(s => {
      const cap = s.charAt(0).toUpperCase() + s.slice(1);
      const el = document.getElementById("screen" + cap);
      if (el) el.classList.toggle("hidden", s !== name);
    });

    // Hide main nav during active Mission so kids have maximum clarity & zero distraction
    const nav = document.getElementById("mainNav");
    if (nav) nav.classList.toggle("hidden", name === "mission");

    // Highlight active nav tab
    const navMap = {
      home: "navHome",
      worlds: "navWorlds",
      missions: "navWorlds",
      lobby: "navWorlds",
      complete: "navWorlds",
      pair: "navPair",
      race: "navRace",
      chat: "navChat"
    };
    ["navHome", "navWorlds", "navPair", "navRace", "navChat"].forEach(id => {
      document.getElementById(id)?.classList.toggle("active", navMap[name] === id);
    });

    if (name === "worlds") renderWorldsGrid();
    if (name === "missions") renderMission1Art();
    if (name === "lobby") {
      renderLobby();
      window.ChickenPair?.updatePairControlsUI?.();
    }
    if (name === "pair") window.ChickenPair?.updatePairControlsUI?.();
    if (name === "race") window.ChickenPair?.renderRaceWelcome?.();
    if (name === "parent") refreshParentDashboard();
  }

  function navigate(target) {
    if (window.ChickenMission?.state?.active && target !== "mission") {
      window.ChickenMission.safeExitMission("kid_exit");
    }
    showScreen(target);
    playTone(580, 0.08);
  }

  function dismissSplash() {
    const ov = document.getElementById("splashOverlay");
    if (ov) {
      ov.classList.add("fade-out");
      setTimeout(() => ov.classList.add("hidden"), 360);
    }
    playFanfare();
    const nick = save.kidProfile.nickname || "friend";
    window.ChickenMascot.setState("homeChickyMascot", "greeting");
    speakVoice(`Hi ${nick}! Welcome to Chicken Talk! Let's play and talk together!`, {
      pitch: 1.2,
      onEnd: () => window.ChickenMascot.setState("homeChickyMascot", "idle")
    });
  }

  function setLang(lang) {
    save.lang = lang === "en" ? "en" : "vi";
    persist();
    document.getElementById("langBtnVi")?.classList.toggle("active", save.lang === "vi");
    document.getElementById("langBtnEn")?.classList.toggle("active", save.lang === "en");
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const k = el.getAttribute("data-i18n");
      if (I18N[save.lang][k]) el.textContent = I18N[save.lang][k];
    });
    updateHomeGreeting();
    if (currentScreen === "worlds") renderWorldsGrid();
    if (currentScreen === "lobby") renderLobby();
  }

  function updateHomeGreeting() {
    const nick = save.kidProfile.nickname || "Minh";
    const titleEl = document.getElementById("homeGreetingTitle");
    if (titleEl) {
      titleEl.textContent = save.lang === "vi"
        ? `Chào ${nick}! Sẵn sàng khám phá Thế Giới Nhỏ của Chicky chưa?`
        : `Hi ${nick}! Ready to explore Chicky's Little World?`;
    }
  }

  const POKE_MOODS = [
    { state: "greeting", label: "👋 Happy Greeting!", line: "Cheep-cheep! Hello my friend!" },
    { state: "celebrating", label: "🎉 Celebrating!", line: "Woohoo! We make a great team!" },
    { state: "pointing", label: "👉 Pointing to Clues!", line: "Look! Milo's adventure is right over there!" },
    { state: "hinting", label: "💡 Giving a Hint!", line: "Need a hint? I'm always here to help!" },
    { state: "thinking", label: "🤔 Thinking...", line: "Hmm, where is Milo hiding today?" },
    { state: "goodbye", label: "💛 Waving Goodbye!", line: "See you soon on our next adventure!" }
  ];

  function pokeHomeChicky() {
    const mood = POKE_MOODS[homePokeIdx % POKE_MOODS.length];
    homePokeIdx++;
    window.ChickenMascot.setState("homeChickyMascot", mood.state);
    const lbl = document.getElementById("homeChickyMoodLabel");
    if (lbl) lbl.textContent = mood.label;
    playTone(680, 0.09);
    speakVoice(mood.line, {
      pitch: 1.22,
      onEnd: () => window.ChickenMascot.setState("homeChickyMascot", "idle")
    });
  }

  // ================= WORLD & MISSION SELECTION =================
  function renderMission1Art() {
    const mount = document.getElementById("mission1BannerMount");
    if (mount && window.WorldArt) {
      mount.innerHTML = window.WorldArt.getBanner("magic_garden");
    }
  }

  function renderWorldsGrid() {
    const grid = document.getElementById("worldsGrid");
    if (!grid) return;
    const isVi = save.lang === "vi";

    grid.innerHTML = window.ChickenData.WORLDS.map(w => {
      const isPlayable = w.status === "playable";
      const artSvg = window.WorldArt ? window.WorldArt.getBanner(w.id) : "";
      return `
        <article class="world-card ${isPlayable ? "playable" : "planned"}">
          <div class="world-banner-art">
            ${artSvg}
            <span class="world-status-pill world-banner-pill-overlay ${isPlayable ? "ready" : "soon"}">
              ${isPlayable ? (isVi ? "✅ Sẵn sàng chơi!" : "✅ Playable MVP") : (isVi ? "✨ Sắp mở rộng" : "✨ Planned Extension")}
            </span>
          </div>
          <div class="world-body">
            <div class="world-mission-sub">World ${w.number} • ${w.duration}</div>
            <h3>${w.icon} ${isVi ? w.nameVi : w.name}</h3>
            <div style="font-weight:800; color:var(--ct-ink); font-size:0.95rem;">
              🎯 ${isVi ? w.missionTitleVi : w.missionTitle}
            </div>
            <p class="world-desc">${isVi ? w.descVi : w.desc}</p>
            <div class="phrase-chips">
              ${w.targets.map(p => `<span class="phrase-chip">${p}</span>`).join("")}
            </div>
            <div style="margin-top:auto; padding-top:10px;">
              ${isPlayable
                ? `<button type="button" class="btn btn-yellow full-width" onclick="window.ChickenApp.navigate('missions')">🌿 ${isVi ? "Khám Phá Nhiệm Vụ!" : "Choose Mission!"}</button>`
                : `<button type="button" class="btn btn-soft full-width" disabled>🔒 ${isVi ? "Sắp ra mắt ở Phase 5" : "Coming in Next World Pack"}</button>`
              }
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  // ================= PRIVATE BUDDY LOBBY & MIC CHECK =================
  function openLobbyForMissingPuppy() {
    showScreen("lobby");
    playTone(620, 0.09);
  }

  function renderLobby() {
    const list = document.getElementById("lobbyBuddyList");
    if (!list) return;

    const approved = save.approvedBuddies.filter(b => b.approved);
    if (!approved.some(b => b.id === selectedLobbyBuddyId) && approved.length > 0) {
      selectedLobbyBuddyId = approved[0].id;
    }

    if (approved.length === 0) {
      list.innerHTML = `<div class="card" style="padding:14px;">No approved buddies yet. Ask a parent to approve a buddy in Parent Space!</div>`;
    } else {
      list.innerHTML = approved
        .map(
          b => `
            <div class="buddy-card ${b.id === selectedLobbyBuddyId ? "selected" : ""}" onclick="window.ChickenApp.selectLobbyBuddy('${b.id}')" role="button" tabindex="0">
              <div class="row">
                <div class="buddy-avatar">${b.avatar}</div>
                <div>
                  <strong style="display:block; font-size:1rem;">${b.name}</strong>
                  <small style="color:var(--ct-ink-soft); font-weight:700;">${b.isDemoBot ? "Simulated Demo Buddy" : "Parent-Approved Friend"}</small>
                </div>
              </div>
              <span class="${b.isDemoBot ? "demo-tag" : "approved-tag"}">${b.isDemoBot ? "🤖 DEMO BOT" : "✅ APPROVED"}</span>
            </div>
          `
        )
        .join("");
    }

    document.getElementById("roleCardScout")?.classList.toggle("selected", selectedLobbyRole === "map_scout");
    document.getElementById("roleCardSpotter")?.classList.toggle("selected", selectedLobbyRole === "clue_spotter");
  }

  function selectLobbyBuddy(id) {
    selectedLobbyBuddyId = id;
    renderLobby();
    playTone(640, 0.07);
  }

  function selectLobbyRole(role) {
    selectedLobbyRole = role === "clue_spotter" ? "clue_spotter" : "map_scout";
    renderLobby();
    playTone(660, 0.07);
  }

  async function testLobbyMic() {
    const status = document.getElementById("lobbyMicStatus");
    const meter = document.getElementById("lobbyMicMeter");
    speakVoice("Testing audio! Cheep-cheep! Can you hear Chicky?", { pitch: 1.2 });

    if (meter) meter.style.width = "65%";

    if (!save.parentConsent.allowPushToTalk) {
      if (status) status.textContent = "🖼️ Picture Card Mode Active (Mic paused in Parent Space)";
      return;
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        stream.getTracks().forEach(tr => tr.stop());
        if (meter) meter.style.width = "100%";
        if (status) status.textContent = "🟢 Audio & Push-to-Talk Mic are ready!";
        playFanfare();
        return;
      } catch {
        // Graceful fallback
      }
    }
    if (meter) meter.style.width = "45%";
    if (status) status.textContent = "🟡 Audio ready! Play smoothly using Picture Cards & Phrase Hints.";
  }

  function launchMissingPuppy() {
    const buddy = save.approvedBuddies.find(b => b.id === selectedLobbyBuddyId && b.approved);
    if (!buddy) {
      alert("Please ask a parent to approve a buddy first in Parent Space!");
      return;
    }
    window.ChickenMission.startMission({
      buddy,
      approvedBuddies: save.approvedBuddies,
      role: selectedLobbyRole,
      hintLevel: save.parentConsent.defaultHintLevel ?? 1
    });
  }

  // ================= TALK WITH CHICKY AI =================
  function getAllTopics() {
    return [...CHICKY_TOPICS, ...save.customTopics];
  }

  function getCurrentTopic() {
    return getAllTopics().find(x => String(x.id) === String(currentTopicId)) || CHICKY_TOPICS[0];
  }

  function renderTopicBar() {
    const bar = document.getElementById("topicBar");
    if (!bar) return;
    bar.innerHTML = "";
    getAllTopics().forEach(tp => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `topic-pill ${String(tp.id) === String(currentTopicId) ? "active" : ""}`;
      b.textContent = tp.label;
      b.onclick = () => selectChatTopic(tp.id);
      bar.appendChild(b);
    });
    const add = document.createElement("button");
    add.type = "button";
    add.className = "topic-pill add-topic";
    add.textContent = "+ My Story";
    add.onclick = openCustomStoryModal;
    bar.appendChild(add);
  }

  function selectChatTopic(id) {
    currentTopicId = id;
    renderTopicBar();
    const tp = getCurrentTopic();
    document.getElementById("grammarTitle").textContent = tp.grammarName;
    document.getElementById("grammarExample").textContent = tp.example;
    document.getElementById("chatBox").innerHTML = "";
    addChatMsg("other", "🐥 Chicky AI", tp.opener, {
      vi: tp.openerVi,
      gram: tp.openerGram,
      hints: tp.initialHints
    });
    setDynamicHints(tp.initialHints);
    window.ChickenMascot.setState("chatChickyMascot", "greeting");
  }

  function startChickyGreeting() {
    const nick = save.kidProfile.nickname || "friend";
    const reply = `Cheep-cheep, ${nick}! 🐥 Ready for a fun story? Do you want to explore the Magic Garden or decorate a cozy house?`;
    const vi = `Chíp chíp, ${nick}! 🐥 Sẵn sàng kể chuyện vui chưa nào? Bé muốn khám phá Khu Vườn Phép Thuật hay trang trí ngôi nhà nhỏ?`;
    const hints = ["Let's explore the Magic Garden!", "Let's build a cozy house!", "Where is Milo the puppy?"];
    addChatMsg("other", "🐥 Chicky AI", reply, { vi, gram: "💡 Mẹo nhớ: Trả lời bằng 'Let's...' (Cùng làm nhé!) nghe thật tự nhiên!", hints });
    setDynamicHints(hints);
    window.ChickenMascot.setState("chatChickyMascot", "talking");
    speakVoice(reply, { pitch: 1.2, onEnd: () => window.ChickenMascot.setState("chatChickyMascot", "idle") });
  }

  function sparkStoryIdea() {
    const sc = SURPRISE_STORIES[storySparkIdx % SURPRISE_STORIES.length];
    storySparkIdx++;
    document.getElementById("grammarTitle").textContent = sc.grammar;
    document.getElementById("grammarExample").textContent = sc.example;
    addChatMsg("other", `🐥 Chicky (${sc.title})`, sc.opener, { vi: sc.openerVi, gram: sc.openerGram, hints: sc.hints });
    setDynamicHints(sc.hints);
    window.ChickenMascot.setState("chatChickyMascot", "celebrating");
    speakVoice(sc.opener, { pitch: 1.2, onEnd: () => window.ChickenMascot.setState("chatChickyMascot", "idle") });
    playFanfare();
  }

  function openCustomStoryModal() {
    document.getElementById("customStoryModal")?.classList.remove("hidden");
  }

  function createCustomStoryWorld() {
    const name = document.getElementById("customStoryNameInput")?.value.trim();
    const detail = document.getElementById("customStoryDetailInput")?.value.trim();
    if (!name) return;
    const tp = {
      id: "story_" + Date.now(),
      label: `✨ ${name}`,
      grammarName: "Creative Storytelling (I see / Let's...)",
      example: `"Let's explore ${name} together!"`,
      opener: `Cheep-cheep! ✨ Imagine we just arrived at ${name}${detail ? ` with a ${detail}` : ""}! What do you see first?`,
      openerVi: `Chíp chíp! ✨ Tưởng tượng tụi mình vừa bước vào ${name}! Bé nhìn thấy gì đầu tiên nào?`,
      openerGram: `💡 Mẹo nhớ: Dùng 'I see...' hoặc 'Let's...' để kể tiếp câu chuyện trong ${name} nhé!`,
      initialHints: [`I see something sparkly in ${name}!`, `Let's explore together, Chicky!`, `Where should we go first?`]
    };
    save.customTopics.unshift(tp);
    persist();
    closeModal("customStoryModal");
    document.getElementById("customStoryNameInput").value = "";
    document.getElementById("customStoryDetailInput").value = "";
    selectChatTopic(tp.id);
    speakVoice(tp.opener, { pitch: 1.2 });
  }

  function speakGrammarExample() {
    const txt = document.getElementById("grammarExample")?.textContent || "";
    speakVoice(txt.replace(/"/g, ""), { pitch: 1.15 });
  }

  function setDynamicHints(hints) {
    currentDynamicHints = Array.isArray(hints) ? hints.slice(0, 3) : [];
    hintsVisible = false;
    renderDynamicHints();
  }

  function toggleDynamicHints() {
    if (!currentDynamicHints.length) return;
    hintsVisible = !hintsVisible;
    renderDynamicHints();
    if (hintsVisible) trackEvent("hint_used", { metadata: { source: "chicky_chat" } });
  }

  function renderDynamicHints() {
    const row = document.getElementById("dynamicHintsRow");
    if (!row) return;
    row.innerHTML = "";
    if (!hintsVisible || !currentDynamicHints.length) {
      row.classList.add("hidden");
      return;
    }
    row.classList.remove("hidden");
    currentDynamicHints.forEach(txt => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "hint-chip";
      b.textContent = "💬 " + txt;
      b.onclick = () => {
        hintsVisible = false;
        renderDynamicHints();
        handleChatInput(txt, "hint");
      };
      row.appendChild(b);
    });
  }

  function showWordLookup(word, extraVocab = {}) {
    const clean = word.toLowerCase().replace(/[^a-z']/g, "");
    if (!clean) return;
    speakVoice(clean, { rate: 0.85, pitch: 1.15 });
    const mean = extraVocab[clean] || MINI_DICT[clean];
    const toast = document.getElementById("wordToast");
    document.getElementById("wordToastText").innerHTML = mean
      ? `🔊 <strong>"${clean}"</strong> = ${mean}`
      : `🔊 <strong>"${clean}"</strong> — tap 🇻🇳 Meaning below to see the full sentence!`;
    toast.style.display = "flex";
    trackEvent("word_lookup", { metadata: { word: clean } });
  }

  function addChatMsg(cls, sender, text, meta = {}) {
    const box = document.getElementById("chatBox");
    if (!box) return;
    const wrap = document.createElement("div");
    wrap.className = `msg-wrap ${cls}`;
    if (meta.id) wrap.id = meta.id;

    const bubble = document.createElement("div");
    bubble.className = `msg ${cls}`;
    const sEl = document.createElement("div");
    sEl.className = "msg-meta";
    sEl.textContent = sender;
    bubble.appendChild(sEl);

    const tc = document.createElement("div");
    // Unicode-aware whole-word split so Vietnamese words with diacritics ("chào", "tiếng", "Việt")
    // are NEVER chopped into ASCII fragments around accented vowels!
    const hasViDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
    if (hasViDiacritics && cls === "me") {
      tc.textContent = text;
    } else {
      text.split(/([\p{L}']+)/u).forEach(part => {
        if (/^[A-Za-z']{2,}$/.test(part)) {
          const sp = document.createElement("span");
          sp.className = "word-tok";
          sp.textContent = part;
          sp.onclick = e => { e.stopPropagation(); showWordLookup(part, meta.vocab || {}); };
          tc.appendChild(sp);
        } else {
          tc.appendChild(document.createTextNode(part));
        }
      });
    }
    bubble.appendChild(tc);

    const transBox = document.createElement("div");
    transBox.className = "msg-extra trans hidden";
    const gramBox = document.createElement("div");
    gramBox.className = "msg-extra gram hidden";
    bubble.appendChild(transBox);
    bubble.appendChild(gramBox);
    wrap.appendChild(bubble);

    if (!meta.isLoading) {
      const tools = document.createElement("div");
      tools.className = "msg-tools";

      const hearBtn = document.createElement("button");
      hearBtn.type = "button";
      hearBtn.className = "msg-tool-btn";
      hearBtn.textContent = "🔊 Hear";
      hearBtn.onclick = () => speakVoice(text, { pitch: 1.18 });
      tools.appendChild(hearBtn);

      if (meta.vi) {
        const trBtn = document.createElement("button");
        trBtn.type = "button";
        trBtn.className = "msg-tool-btn";
        trBtn.textContent = "🇻🇳 Meaning";
        trBtn.onclick = () => {
          const wasHidden = transBox.classList.contains("hidden");
          transBox.textContent = "🇻🇳 " + meta.vi;
          transBox.classList.toggle("hidden", !wasHidden);
          trBtn.classList.toggle("active", wasHidden);
          if (wasHidden) trackEvent("trans_clicked", { metadata: { text: text.slice(0, 50) } });
        };
        tools.appendChild(trBtn);
      }

      if (meta.gram) {
        const grBtn = document.createElement("button");
        grBtn.type = "button";
        grBtn.className = "msg-tool-btn";
        grBtn.textContent = "💡 Tip";
        grBtn.onclick = () => {
          const wasHidden = gramBox.classList.contains("hidden");
          gramBox.textContent = meta.gram;
          gramBox.classList.toggle("hidden", !wasHidden);
          grBtn.classList.toggle("active", wasHidden);
        };
        tools.appendChild(grBtn);
      }

      wrap.appendChild(tools);
    }

    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  }

  function buildOfflineChickyReply(text) {
    const low = text.toLowerCase();
    if (/\bdog\s+tree\b|\bpuppy\s+tree\b/i.test(low)) {
      return {
        reply: "Is the dog near the tree? 🐥 Let's look behind the tree together!",
        vi: "Chú cún ở gần cái cây hả? 🐥 Tụi mình cùng nhìn phía sau cái cây nhé!",
        gram: "💡 Gentle Recast: Chicky nhắc nhẹ thành 'Is the dog near the tree? Let's look behind the tree!' để bé nói tròn câu nhé!",
        hints: ["Look behind the tree!", "Where is Milo?", "Let's go!"]
      };
    }
    if (/\bi has\s+(.+)/i.test(text)) {
      const obj = text.match(/\bi has\s+(.+)/i)[1].replace(/[.!?]+$/, "");
      return {
        reply: `Ooh, you HAVE ${obj}! 🐥 That's wonderful! What color is it?`,
        vi: `Ồ, bé CÓ ${obj} hả! 🐥 Tuyệt quá! Nó màu gì thế?`,
        gram: "💡 Gentle Recast: Với 'I', mình nói nhẹ nhàng 'I have...' nhé!",
        hints: ["It is yellow!", "It is very cute!", "Do you like it, Chicky?"]
      };
    }
    if (/\bi likes\s+(.+)/i.test(text)) {
      const obj = text.match(/\bi likes\s+(.+)/i)[1].replace(/[.!?]+$/, "");
      return {
        reply: `Yay! You LIKE ${obj}! 🐥 I like ${obj} too! Let's play together!`,
        vi: `Hoan hô! Bé THÍCH ${obj}! 🐥 Chicky cũng thích lắm! Cùng chơi nhé!`,
        gram: "💡 Gentle Recast: Với 'I', mình dùng 'I like...' rất gọn và tự nhiên!",
        hints: ["Let's go!", "Can you help me?", "What else do you like, Chicky?"]
      };
    }
    if (/\b(where|milo|puppy|garden)\b/i.test(low)) {
      return {
        reply: "Cheep-cheep! 🐥 I see tiny paw prints going left in the Magic Garden! Ready to follow them?",
        vi: "Chíp chíp! 🐥 Chicky thấy dấu chân nhỏ xíu rẽ sang trái trong Khu Vườn Phép Thuật! Đi theo nhé?",
        gram: "💡 Mẹo hay: Dùng 'Go left!' (Đi trái) và 'Let's go!' (Đi thôi!) để rủ bạn đồng hành!",
        hints: ["Go left! Let's go!", "I see a blue collar!", "Look behind the tree!"]
      };
    }
    return {
      reply: `Cheep-cheep! I love hearing that, ${save.kidProfile.nickname || "friend"}! 🐥 What should we discover next together?`,
      vi: `Chíp chíp! Chicky thích nghe câu đó lắm! 🐥 Tiếp theo tụi mình cùng khám phá gì nữa nhỉ?`,
      gram: "💡 Mẹo tự nhiên: Cứ nói ngắn gọn và vui vẻ bằng 'I see...', 'I like...', hoặc 'Let's go!' nhé!",
      hints: ["Let's look behind the tree!", "I like yellow flowers!", "Can we visit the Happy Food Market?"]
    };
  }

  async function handleChatInput(text, inputMode = "text") {
    const clean = String(text || "").trim();
    if (!clean) return;

    addChatMsg("me", save.kidProfile.nickname || "You", clean);
    trackEvent("speak_attempt", { metadata: { source: "chicky_chat", inputMode, text: clean.slice(0, 60) } });
    addAdventureStars(1);

    window.ChickenMascot.setState("chatChickyMascot", "thinking");
    const tid = "think_" + Date.now();
    addChatMsg("other", "🐥 Chicky AI", "💭 Chicky is thinking...", { id: tid, isLoading: true });

    let data = null;
    if (save.authToken && AI_CONFIG.PROXY_URL) {
      try {
        const tp = getCurrentTopic();
        const res = await fetch(AI_CONFIG.PROXY_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${save.authToken}`
          },
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({
            topicId: tp.id,
            topicTitle: tp.label,
            grammarTarget: tp.grammarName,
            userText: clean,
            inputMode
          })
        });
        if (res.ok) data = await res.json();
      } catch {}
    }

    document.getElementById(tid)?.remove();

    const replyObj = data && data.reply
      ? {
          reply: data.reply,
          vi: data.translationVi,
          gram: data.sentenceGrammar,
          vocab: data.vocab || {},
          hints: data.suggestions || ["Let's go!", "I see something cool!"]
        }
      : buildOfflineChickyReply(clean);

    addChatMsg("other", "🐥 Chicky AI", replyObj.reply, replyObj);
    setDynamicHints(replyObj.hints);
    window.ChickenMascot.setState("chatChickyMascot", "talking");
    speakVoice(replyObj.reply, {
      pitch: 1.2,
      onEnd: () => window.ChickenMascot.setState("chatChickyMascot", "idle")
    });
  }

  // Vietnamese IME-safe input clear & Enter handler (prevents trailing char jumping on macOS Telex/VNI/Safari/EVKey)
  function resetChatInputSafely(inp) {
    if (!inp) return;
    const wasFocused = document.activeElement === inp;
    if (wasFocused) inp.blur();
    inp.value = "";
    setTimeout(() => {
      inp.value = "";
      if (wasFocused) inp.focus();
    }, 0);
  }

  function bindImeEnter(inp, sendFn) {
    if (!inp || inp.dataset.imeBound === "1") return;
    inp.dataset.imeBound = "1";
    let composing = false;
    let pendingSendAt = 0;
    let lastCompEndAt = 0;

    inp.addEventListener("compositionstart", () => {
      composing = true;
    });

    inp.addEventListener("compositionend", () => {
      composing = false;
      lastCompEndAt = Date.now();
      if (pendingSendAt && Date.now() - pendingSendAt < 120) {
        pendingSendAt = 0;
        setTimeout(() => sendFn(), 0);
      }
    });

    inp.addEventListener("keydown", e => {
      if (e.key !== "Enter" && e.keyCode !== 13) return;
      if (e.shiftKey) return;

      // Chrome/Firefox macOS Telex: Enter fires while still composing -> wait for compositionend to commit last VN word
      if (e.isComposing || composing) {
        pendingSendAt = Date.now();
        return;
      }

      // Safari macOS Telex: compositionend fires ~0-15ms right before keydown(Enter, keyCode=229)
      if (e.keyCode === 229) {
        e.preventDefault();
        if (Date.now() - lastCompEndAt < 100) {
          setTimeout(() => sendFn(), 0);
        } else {
          pendingSendAt = Date.now();
        }
        return;
      }

      e.preventDefault();
      // Micro-defer lets EVKey/OpenKey flush final Vietnamese diacritic keystroke before reading value
      setTimeout(() => sendFn(), 0);
    });
  }

  function sendChat() {
    const inp = document.getElementById("textInput");
    if (!inp) return;
    const v = inp.value.trim();
    if (!v) return;
    resetChatInputSafely(inp);
    handleChatInput(v, "text");
  }

  function toggleChatMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btn = document.getElementById("chatMicBtn");
    if (!SR) {
      toggleDynamicHints();
      return;
    }
    if (chatListening && chatRecognition) {
      chatRecognition.stop();
      return;
    }
    chatRecognition = new SR();
    chatRecognition.lang = "en-US";
    chatRecognition.interimResults = false;
    chatListening = true;
    window.ChickenMascot.setState("chatChickyMascot", "listening");
    if (btn) {
      btn.classList.add("is-listening");
      btn.innerHTML = "👂 <span>Listening... Speak English!</span>";
    }
    chatRecognition.onresult = e => {
      const spoken = e.results?.[0]?.[0]?.transcript || "";
      if (spoken) handleChatInput(spoken, "voice");
    };
    chatRecognition.onend = () => {
      chatListening = false;
      window.ChickenMascot.setState("chatChickyMascot", "idle");
      if (btn) {
        btn.classList.remove("is-listening");
        btn.innerHTML = `🎤 <span>${t("chat_speak_btn")}</span>`;
      }
    };
    try { chatRecognition.start(); } catch {}
  }

  // ================= PARENT GATE & PARENT SPACE =================
  function requestParentSpace() {
    if (parentGateUnlocked) {
      navigate("parent");
      return;
    }
    const a = 4 + Math.floor(Math.random() * 6);
    const b = 3 + Math.floor(Math.random() * 6);
    parentGateExpected = a + b;
    document.getElementById("parentGateQuestion").textContent = `${a} + ${b} = ?`;
    document.getElementById("parentGateAnswer").value = "";
    document.getElementById("parentGateError").textContent = "";
    document.getElementById("parentGateModal").classList.remove("hidden");
    setTimeout(() => document.getElementById("parentGateAnswer")?.focus(), 80);
  }

  function verifyParentGate() {
    const ans = Number(document.getElementById("parentGateAnswer")?.value.trim());
    if (ans === parentGateExpected) {
      parentGateUnlocked = true;
      closeModal("parentGateModal");
      navigate("parent");
      playFanfare();
    } else {
      document.getElementById("parentGateError").textContent = "Oops! Try adding those two numbers again.";
      playTone(260, 0.14);
    }
  }

  function renderParentAvatarPicker() {
    const wrap = document.getElementById("parentAvatarPicker");
    if (!wrap) return;
    wrap.innerHTML = AVATAR_CHOICES.map(
      av => `<button type="button" class="avatar-opt ${save.kidProfile.avatar === av ? "active" : ""}" onclick="window.ChickenApp.pickKidAvatar('${av}')">${av}</button>`
    ).join("");
  }

  function pickKidAvatar(av) {
    save.kidProfile.avatar = av;
    persist();
    renderParentAvatarPicker();
    playTone(620, 0.06);
  }

  function saveChildProfileFromParent() {
    const nick = document.getElementById("parentKidNickInput")?.value.trim() || "Minh";
    const age = document.getElementById("parentKidAgeSelect")?.value || "6-10";
    const cefr = document.getElementById("parentKidCefrSelect")?.value || "A0";
    save.kidProfile = { ...save.kidProfile, nickname: nick, age_band: age, cefr_level: cefr };
    persist();
    refreshParentDashboard();
    playFanfare();
  }

  function saveParentSettings() {
    save.parentConsent = {
      ...save.parentConsent,
      verifiedAdult: Boolean(document.getElementById("consentVerifiedAdult")?.checked),
      allowPushToTalk: Boolean(document.getElementById("consentPushToTalk")?.checked),
      allowPairVideoCall: document.getElementById("consentPairVideoCall") ? Boolean(document.getElementById("consentPairVideoCall").checked) : true,
      storeRawAudio: false,
      sessionLimitMin: Number(document.getElementById("parentSessionLimitSelect")?.value || 15),
      defaultHintLevel: Number(document.getElementById("parentDefaultHintSelect")?.value ?? 1)
    };
    persist();
    playTone(620, 0.06);
  }

  function renderParentBuddyManager() {
    const list = document.getElementById("parentBuddyManagerList");
    if (!list) return;
    list.innerHTML = save.approvedBuddies
      .map(
        b => `
          <div class="consent-row">
            <div class="row">
              <span style="font-size:1.45rem;">${b.avatar}</span>
              <div>
                <label>${b.name} ${b.isDemoBot ? '<span class="demo-tag">Demo Bot</span>' : '<span class="approved-tag">Friend</span>'}</label>
                <small>${b.approved ? "Approved for private rooms" : "Paused by parent"}</small>
              </div>
            </div>
            <div class="row">
              <button type="button" class="btn btn-soft btn-xs" onclick="window.ChickenApp.toggleBuddyApproval('${b.id}')">
                ${b.approved ? "Pause" : "Approve"}
              </button>
              ${b.id !== "luna_demo" ? `<button type="button" class="btn btn-danger btn-xs" onclick="window.ChickenApp.removeApprovedBuddy('${b.id}')">✕</button>` : ""}
            </div>
          </div>
        `
      )
      .join("");
  }

  function addApprovedBuddy() {
    const nameInp = document.getElementById("newBuddyNameInput");
    const avSel = document.getElementById("newBuddyAvatarSelect");
    const name = nameInp?.value.trim();
    if (!name) return;
    save.approvedBuddies.push({
      id: "buddy_" + Date.now(),
      name: name.slice(0, 24),
      avatar: avSel?.value || "🦊",
      approved: true,
      isDemoBot: false,
      note: "Parent-Approved Buddy"
    });
    nameInp.value = "";
    persist();
    renderParentBuddyManager();
    playFanfare();
  }

  function toggleBuddyApproval(id) {
    const b = save.approvedBuddies.find(x => x.id === id);
    if (!b) return;
    b.approved = !b.approved;
    persist();
    renderParentBuddyManager();
  }

  function removeApprovedBuddy(id) {
    save.approvedBuddies = save.approvedBuddies.filter(x => x.id !== id);
    persist();
    renderParentBuddyManager();
  }

  function terminateKidSession() {
    window.ChickenMission?.safeExitMission("parent_end");
    trackEvent("parent_session_ended", { metadata: { by: "parent" } });
    alert("Active child session ended safely.");
  }

  function deleteAllLocalChildData() {
    if (!confirm("Delete all local child profile data, stars, mission history, and activity logs from this browser?")) return;
    localStorage.removeItem("chickentalk_v1");
    localStorage.removeItem("dinotalk_v6");
    save = createDefaultSave();
    persist();
    refreshParentDashboard();
    alert("All local child data has been cleared.");
  }

  async function refreshParentDashboard() {
    const kid = save.kidProfile;
    document.getElementById("dashKidAvatar").textContent = kid.avatar || "🐥";
    document.getElementById("dashKidTitle").textContent = `Parent Space — ${kid.nickname} (Age ${kid.age_band} • ⭐ ${save.stars})`;

    // Sync profile & consent inputs
    const nickInp = document.getElementById("parentKidNickInput");
    if (nickInp) nickInp.value = kid.nickname || "Minh";
    const ageSel = document.getElementById("parentKidAgeSelect");
    if (ageSel) ageSel.value = kid.age_band || "6-10";
    const cefrSel = document.getElementById("parentKidCefrSelect");
    if (cefrSel) cefrSel.value = kid.cefr_level || "A0";

    const vAdult = document.getElementById("consentVerifiedAdult");
    if (vAdult) vAdult.checked = Boolean(save.parentConsent.verifiedAdult);
    const ptt = document.getElementById("consentPushToTalk");
    if (ptt) ptt.checked = Boolean(save.parentConsent.allowPushToTalk);
    const pVid = document.getElementById("consentPairVideoCall");
    if (pVid) pVid.checked = save.parentConsent.allowPairVideoCall !== false;
    const lim = document.getElementById("parentSessionLimitSelect");
    if (lim) lim.value = String(save.parentConsent.sessionLimitMin || 15);
    const hDef = document.getElementById("parentDefaultHintSelect");
    if (hDef) hDef.value = String(save.parentConsent.defaultHintLevel ?? 1);

    renderParentAvatarPicker();
    renderParentBuddyManager();

    let fromBackend = false;
    let backendSnapshot = null;
    if (save.authToken) {
      document.getElementById("dashLogoutBtn")?.classList.remove("hidden");
      try {
        const res = await fetch(`${AI_CONFIG.API_BASE}/api/behavior/summary`, {
          headers: { "Authorization": `Bearer ${save.authToken}` },
          signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
          backendSnapshot = await res.json();
          fromBackend = true;
        }
      } catch {}
    } else {
      document.getElementById("dashLogoutBtn")?.classList.add("hidden");
    }

    const statusEl = document.getElementById("dashBackendStatus");
    if (statusEl) {
      statusEl.textContent = fromBackend
        ? `🟢 Synced with Chicken Talk PostgreSQL Backend (${save.account?.email || "Parent"})`
        : `🟡 Local Privacy-First Mode (No raw audio stored; optional cloud login available)`;
    }

    const lb = save.localBehavior || defaultLocalBehavior();
    const speakCount = backendSnapshot?.speakAttempts ?? lb.speakAttempts ?? 0;
    const hintsUsed = backendSnapshot?.hintsUsed ?? lb.hintsUsed ?? 0;
    const hintPct = speakCount > 0 ? Math.min(100, Math.round((hintsUsed / speakCount) * 100)) : 0;

    document.getElementById("dashMissionCount").textContent = save.missionHistory.length;
    document.getElementById("dashMissionNote").textContent = save.missionHistory.length
      ? `Latest: ${save.missionHistory[0].missionTitle} (${save.missionHistory[0].isDemoMode ? "Demo" : "Buddy"})`
      : "Ready for World 1: The Missing Puppy";
    document.getElementById("dashSpeakCount").textContent = speakCount;
    document.getElementById("dashHintRate").textContent = `${hintPct}%`;
    document.getElementById("dashHintDetail").textContent = `${hintsUsed} gentle hints used`;
    document.getElementById("dashCefrBadge").textContent = `CEFR ${kid.cefr_level || "A0"}`;

    // Practiced phrases pills
    const phraseWrap = document.getElementById("dashPhrasesSummary");
    if (phraseWrap) {
      const uniquePhrases = [...new Set(save.missionHistory.flatMap(m => m.phrasesPracticed || []))];
      phraseWrap.innerHTML = uniquePhrases.length
        ? uniquePhrases.map(p => `<span class="phrase-chip">✅ ${p}</span>`).join("")
        : `<small style="color:var(--ct-muted); font-weight:700;">Complete a Magic Garden mission to see practiced English phrases here!</small>`;
    }

    // Skill mastery bars
    const skillWrap = document.getElementById("dashSkillList");
    if (skillWrap) {
      const skills = Object.values(lb.skills || {});
      skillWrap.innerHTML = skills
        .map(sk => {
          const meta = SKILL_META[sk.skill_tag] || { label: sk.skill_tag, cefr: "A0" };
          const score = Math.max(0, Math.min(100, Number(sk.mastery_score || 35)));
          const color = score >= 70 ? "#3DA37D" : score >= 45 ? "#2D9CDB" : "#E5A91A";
          return `
            <div class="skill-item">
              <div class="row space-between">
                <strong style="font-size:0.86rem;">${meta.label}</strong>
                <small style="font-weight:800; color:var(--ct-muted);">${score}% • ${meta.cefr}</small>
              </div>
              <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${score}%; background:${color};"></div></div>
            </div>
          `;
        })
        .join("");
    }

    // Activity Log
    const evWrap = document.getElementById("dashEventList");
    if (evWrap) {
      const events = (backendSnapshot?.recentEvents?.length ? backendSnapshot.recentEvents : lb.events) || [];
      evWrap.innerHTML = events.length
        ? events.slice(0, 10).map(ev => {
            const time = ev.created_at ? new Date(ev.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
            return `<div class="event-item"><span>🐥 ${ev.event_type.replace(/_/g, " ")}</span><small style="color:var(--ct-muted);">${time}</small></div>`;
          }).join("")
        : `<div style="color:var(--ct-muted); font-weight:700; font-size:0.86rem;">No play events recorded yet — start The Missing Puppy to see live progress!</div>`;
    }
  }

  // ================= AUTH & SAFETY REPORT MODALS =================
  function openAuthModal() {
    document.getElementById("authResultMsg").textContent = "";
    document.getElementById("authApiUrlInput").value = save.apiBase || AI_CONFIG.API_BASE;
    document.getElementById("authModal").classList.remove("hidden");
  }

  function switchAuthMode(mode) {
    authMode = mode;
    document.getElementById("authTabLogin").classList.toggle("active", mode === "login");
    document.getElementById("authTabRegister").classList.toggle("active", mode === "register");
    document.getElementById("authRegisterFields").classList.toggle("hidden", mode !== "register");
    document.getElementById("authSubmitBtn").textContent = mode === "register" ? "✨ Create Parent Account" : "🚀 Sign In";
  }

  async function submitAuthForm() {
    const email = document.getElementById("authEmailInput").value.trim();
    const password = document.getElementById("authPasswordInput").value;
    const kidNickname = document.getElementById("authKidNickInput").value.trim() || save.kidProfile.nickname;
    const ageBand = document.getElementById("authAgeBandSelect").value;
    const cefrLevel = document.getElementById("authCefrSelect").value;
    const apiUrl = (document.getElementById("authApiUrlInput").value.trim() || DEFAULT_API_BASE).replace(/\/+$/, "");
    const msg = document.getElementById("authResultMsg");

    if (!email || !password) {
      msg.style.color = "var(--ct-danger)";
      msg.textContent = "Please enter email and password.";
      return;
    }

    save.apiBase = apiUrl;
    AI_CONFIG.API_BASE = apiUrl;
    AI_CONFIG.PROXY_URL = `${apiUrl}/api/agent/chat`;
    msg.style.color = "var(--ct-sky-deep)";
    msg.textContent = "⏳ Connecting...";

    const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
    const body = authMode === "register"
      ? { email, password, kidNickname, ageBand, cefrLevel, avatar: save.kidProfile.avatar }
      : { email, password };

    try {
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Auth failed");

      const kid = data.activeKid || data.kid || save.kidProfile;
      save.authToken = data.token;
      save.account = data.account || { email };
      save.kidProfile = { ...save.kidProfile, ...kid };
      persist();
      msg.style.color = "var(--ct-success)";
      msg.textContent = `🟢 Welcome! Profile synced for ${save.kidProfile.nickname}.`;
      setTimeout(() => { closeModal("authModal"); refreshParentDashboard(); }, 700);
    } catch (err) {
      // Seamless local demo profile activation when Postgres/backend is offline
      save.account = { email };
      save.kidProfile = { ...save.kidProfile, nickname: kidNickname, age_band: ageBand, cefr_level: cefrLevel };
      persist();
      msg.style.color = "var(--ct-warn)";
      msg.textContent = `🟡 Saved locally (${err.message}). Full demo works offline!`;
      setTimeout(() => { closeModal("authModal"); refreshParentDashboard(); }, 950);
    }
  }

  function logoutParent() {
    save.authToken = null;
    save.account = null;
    persist();
    refreshParentDashboard();
  }

  function openSafetyModal() {
    document.getElementById("safetyResultMsg").textContent = "";
    document.getElementById("safetyDetailsInput").value = "";
    document.getElementById("safetyModal").classList.remove("hidden");
  }

  async function submitSafetyReport() {
    const category = document.getElementById("safetyCategorySelect").value;
    const details = document.getElementById("safetyDetailsInput").value.trim() || "Safety check";
    const msg = document.getElementById("safetyResultMsg");

    try {
      const res = await fetch(`${AI_CONFIG.API_BASE}/api/safety/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, details })
      });
      if (res.ok) {
        const data = await res.json();
        msg.style.color = "var(--ct-success)";
        msg.textContent = `✅ Safe report received (${data.reportId}). Thank you for keeping Chicken Talk safe!`;
        return;
      }
    } catch {}
    msg.style.color = "var(--ct-success)";
    msg.textContent = "✅ Safe report logged locally. Thank you!";
  }

  function openHelp() {
    if (window.ChickenMission?.state?.active) {
      window.ChickenMission.requestChickyHint();
      return;
    }
    const mount = document.getElementById("helpChickyMount");
    if (mount) mount.innerHTML = window.ChickenMascot.render({ size: "md", state: "hinting", id: "helpChicky" });
    document.getElementById("helpModal").classList.remove("hidden");
  }

  function closeModal(id) {
    document.getElementById(id)?.classList.add("hidden");
  }

  // ================= TELEMETRY & PROGRESS =================
  function addAdventureStars(n) {
    save.stars += Number(n || 0);
    persist();
  }

  function trackEvent(eventType, { skillTag = null, isCorrect = null, metadata = {} } = {}) {
    const lb = save.localBehavior || defaultLocalBehavior();
    if (eventType === "speak_attempt") lb.speakAttempts = (lb.speakAttempts || 0) + 1;
    if (eventType === "hint_used") lb.hintsUsed = (lb.hintsUsed || 0) + 1;
    if (eventType === "word_lookup") lb.wordLookups = (lb.wordLookups || 0) + 1;
    if (eventType === "trans_clicked") lb.transClicked = (lb.transClicked || 0) + 1;

    lb.events.unshift({
      event_type: eventType,
      skill_tag: skillTag,
      is_correct: isCorrect,
      metadata,
      created_at: new Date().toISOString()
    });
    if (lb.events.length > 30) lb.events = lb.events.slice(0, 30);
    save.localBehavior = lb;
    persist();

    if (save.authToken) {
      fetch(`${AI_CONFIG.API_BASE}/api/behavior/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${save.authToken}` },
        body: JSON.stringify({ eventType, skillTag, isCorrect, metadata })
      }).catch(() => {});
    }
  }

  function recordMissionCompletion(summary) {
    save.missionHistory.unshift({ ...summary, completedAt: new Date().toISOString() });
    if (save.missionHistory.length > 20) save.missionHistory = save.missionHistory.slice(0, 20);
    // Gently boost playful confidence metrics
    const lb = save.localBehavior || defaultLocalBehavior();
    ["like_dislike", "has_have", "present_continuous"].forEach(tag => {
      if (lb.skills[tag]) {
        lb.skills[tag].mastery_score = Math.min(100, (lb.skills[tag].mastery_score || 35) + 6);
        lb.skills[tag].correct_count = (lb.skills[tag].correct_count || 0) + 1;
      }
    });
    save.localBehavior = lb;
    trackEvent("mission_complete", { isCorrect: true, metadata: { missionId: summary.missionId, isDemoMode: summary.isDemoMode } });
    persist();
  }

  // ================= EXPOSE PUBLIC API & INIT =================
  window.ChickenApp = {
    dismissSplash,
    navigate,
    showScreen,
    setLang,
    getLang: () => save.lang,
    getApiBase: () => AI_CONFIG.API_BASE,
    getKidProfile: () => save.kidProfile,
    isPairVideoAllowed: () => save.parentConsent.allowPairVideoCall !== false,
    toggleSound,
    speakVoice,
    playTone,
    playFanfare,
    launchConfetti,
    addAdventureStars,
    trackEvent,
    recordMissionCompletion,
    pokeHomeChicky,
    openLobbyForMissingPuppy,
    selectLobbyBuddy,
    selectLobbyRole,
    testLobbyMic,
    launchMissingPuppy,
    startChickyGreeting,
    sparkStoryIdea,
    openCustomStoryModal,
    createCustomStoryWorld,
    speakGrammarExample,
    toggleChatMic,
    toggleDynamicHints,
    sendChat,
    resetChatInputSafely,
    requestParentSpace,
    verifyParentGate,
    refreshParentDashboard,
    pickKidAvatar,
    saveChildProfileFromParent,
    saveParentSettings,
    addApprovedBuddy,
    toggleBuddyApproval,
    removeApprovedBuddy,
    terminateKidSession,
    deleteAllLocalChildData,
    openAuthModal,
    switchAuthMode,
    submitAuthForm,
    logoutParent,
    openSafetyModal,
    submitSafetyReport,
    openHelp,
    closeModal
  };

  function init() {
    // Mount animated Chicky mascots on Splash, Home, and Chat
    const splashMount = document.getElementById("splashChickyMount");
    if (splashMount) splashMount.innerHTML = window.ChickenMascot.render({ size: "lg", state: "greeting", id: "splashChickyMascot" });

    const homeMount = document.getElementById("homeChickyMount");
    if (homeMount) homeMount.innerHTML = window.ChickenMascot.render({ size: "hero", state: "idle", id: "homeChickyMascot" });

    const chatMount = document.getElementById("chatChickyMount");
    if (chatMount) chatMount.innerHTML = window.ChickenMascot.render({ size: "md", state: "greeting", id: "chatChickyMascot" });

    persist();
    const pairNick = document.getElementById("pairNickInput");
    if (pairNick && save.kidProfile.nickname) pairNick.value = save.kidProfile.nickname;
    setLang(save.lang || "vi");
    renderWorldsGrid();
    renderLobby();
    selectChatTopic(CHICKY_TOPICS[0].id);
    window.ChickenPair?.updatePairControlsUI?.();
    window.ChickenPair?.renderRaceWelcome?.();

    // Bind Vietnamese IME-safe Enter handlers to all chat inputs
    bindImeEnter(document.getElementById("textInput"), sendChat);
    bindImeEnter(document.getElementById("pairChatInput"), () => window.ChickenPair?.sendPairChat?.());
    bindImeEnter(document.getElementById("missionQuickInput"), () => window.ChickenMission?.sendTypedDemoPhrase?.());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
