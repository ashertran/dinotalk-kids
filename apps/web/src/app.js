// ================= 1. CONFIG =================
const IS_LOCALHOST =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const DEFAULT_API_BASE = IS_LOCALHOST ? "http://localhost:4000" : window.location.origin;

const AI_CONFIG = {
  API_BASE: DEFAULT_API_BASE,
  PROXY_URL: `${DEFAULT_API_BASE}/api/agent/chat`,
  FALLBACK_PROXY_URL: "https://rough-fog-375c.ashertran0710.workers.dev",
  TURN_SERVERS: []
};

const SKILL_META = {
  like_dislike: { label: "Biểu đạt Sở thích & Cảm xúc (like, love, enjoy)", cefr: "A0" },
  has_have: { label: "Sở hữu & Miêu tả Đặc điểm (have / has)", cefr: "A1" },
  present_continuous: { label: "Tường thuật Hành động đang diễn ra (am/is/are + V-ing)", cefr: "A1" },
  past_simple: { label: "Kể chuyện & Trải nghiệm đã qua (Past Simple)", cefr: "A2" },
  articles: { label: "Phản xạ Mạo từ & Nối âm tự nhiên (a / an)", cefr: "A0" }
};

// ================= 2. DICTIONARY & I18N =================
const MINI_DICT = {
  hello: "xin chào", hi: "chào", welcome: "chào mừng", pizza: "bánh pizza", cheese: "phô mai",
  frog: "con ếch", banana: "quả chuối", ice: "đá/kem", cream: "kem", sweet: "ngọt",
  like: "thích", love: "yêu thích", eat: "ăn", eating: "đang ăn", drink: "đồ uống / uống",
  juice: "nước ép", milk: "sữa", orange: "quả cam / màu cam", cold: "lạnh", yummy: "ngon tuyệt",
  pet: "thú cưng", monster: "quái vật nhỏ", eye: "mắt", eyes: "đôi mắt", big: "to lớn",
  small: "nhỏ nhắn", long: "dài", tail: "cái đuôi", purple: "màu tím", green: "màu xanh lá",
  blue: "màu xanh dương", red: "màu đỏ", yellow: "màu vàng", pink: "màu hồng", bright: "rực rỡ",
  fly: "bay", dance: "nhảy múa", dancing: "đang nhảy", sing: "ca hát", song: "bài hát", songs: "những bài hát",
  jump: "bật nhảy", sleep: "ngủ", bed: "chiếc giường", sofa: "ghế sô-pha", night: "ban đêm",
  space: "vũ trụ", moon: "mặt trăng", mars: "sao Hỏa", planet: "hành tinh", star: "ngôi sao", stars: "những ngôi sao",
  rocket: "tên lửa", alien: "bạn ngoài hành tinh", floating: "đang bay lơ lửng", wearing: "đang mặc/đội",
  boots: "đôi ủng", shoes: "đôi giày", snacks: "đồ ăn vặt", school: "trường học",
  yesterday: "hôm qua", monkey: "chú khỉ", went: "đã đi", saw: "đã nhìn thấy", ate: "đã ăn",
  played: "đã chơi", game: "trò chơi", games: "các trò chơi", football: "đá bóng", happy: "hạnh phúc, vui vẻ",
  cat: "chú mèo", dog: "chú cún", dragon: "chú rồng", dino: "khủng long", lion: "sư tử",
  funny: "hài hước", silly: "ngộ nghĩnh", crazy: "độc lạ", cool: "cực ngầu", awesome: "tuyệt đỉnh",
  what: "cái gì", where: "ở đâu", how: "như thế nào", why: "vì sao", who: "ai",
  many: "nhiều", today: "hôm nay", friend: "người bạn", friends: "những người bạn",
  can: "có thể", have: "có", has: "có (ngôi 3 số ít)", is: "là / đang", am: "là / đang", are: "là / đang",
  my: "của mình", your: "của bạn", you: "bạn", we: "chúng mình", they: "họ / chúng",
  yes: "đúng vậy", no: "không", very: "rất", super: "siêu cấp", giant: "khổng lồ",
  pancakes: "bánh kếp", noodles: "mì sợi", apple: "quả táo", apples: "những quả táo",
  chocolate: "sô-cô-la", trick: "tuyệt chiêu", color: "màu sắc", window: "cửa sổ",
  imagine: "hãy tưởng tượng", guess: "đoán xem", tell: "kể cho", more: "thêm nữa",
  because: "bởi vì", under: "ở dưới", on: "ở trên", with: "cùng với", about: "về",
  magic: "phép thuật", treasure: "kho báu", superpower: "siêu năng lực", adventure: "chuyến phiêu lưu",
  secret: "bí mật", build: "xây dựng", invent: "phát minh", discover: "khám phá"
};

const I18N = {
  vi: {
    tab_chat: "💬 Trò Chuyện", tab_race: "🏆 Thi Đua", tab_topics: "✨ Sáng Tạo Chủ Đề", tab_parent: "📊 Phụ Huynh",
    btn_login_short: "Đăng nhập", btn_account: "🔐 Tài khoản", btn_refresh: "🔄 Làm mới", btn_logout: "🚪 Thoát", btn_close: "Đóng",
    auth_modal_title: "Tài Khoản Phụ Huynh & Hồ Sơ Bé",
    auth_modal_desc: "Đăng nhập để lưu tiến độ học vào PostgreSQL, kích hoạt RAG nhớ lỗi ngữ pháp của riêng bé và xem báo cáo Phụ huynh!",
    auth_tab_login: "🔑 Đăng Nhập", auth_tab_register: "✨ Tạo Tài Khoản Mới",
    kpi_speak: "🎤 Lượt Luyện Nói (7 ngày)", kpi_hint: "💡 Tỷ Lệ Bấm Gợi Ý",
    kpi_lookup: "📖 Tra Từ & Dịch Câu", kpi_cefr: "🧠 Trình Độ & Điều Phối AI",
    dash_mastery_title: "🎯 Mức Thành Thạo Ngữ Pháp (Spaced Repetition)",
    dash_events_title: "🕒 Nhật Ký Hành Vi Học & Agent Harness Gần Đây",
    mode_ai: "🦖 Bạn Thân Bobo AI", mode_online: "👫 Giao Lưu Với Bạn", btn_spark: "Tình huống bất ngờ",
    auto_mic: "Tự nghe:", auto_on: "ON", auto_off: "OFF",
    cam_modal_title: "Cho Phép Camera & Micro!",
    cam_modal_desc: "Để bé nói tiếng Anh và gọi Video thấy mặt bạn bè, hãy bấm nút bên dưới rồi chọn \"Cho phép (Allow)\" nhé!",
    cam_btn_allow: "✅ Bật & Kiểm Tra Camera", cam_btn_later: "Để Sau",
    cam_status_ok: "🟢 Camera & Micro đã sẵn sàng!",
    cam_status_denied: "🔴 Camera đang bị chặn! Hãy bấm vào biểu tượng ổ khóa trên thanh địa chỉ web để mở lại quyền Camera.",
    cam_status_no_https: "⚠️ Link chưa có HTTPS hoặc trình duyệt Zalo/FB chặn Camera. Hãy mở bằng Chrome/Safari!",
    cam_you_label: "📹 Bạn (Gửi sang đối phương)", cam_friend_label: "Hiển thị bên bạn", btn_flip_cam: "🔄 Đổi Cam",
    room_title: "🌐 Phòng Bạn Bè (4 Số)", btn_create_room: "🏠 Tạo Phòng", btn_join_room: "🚪 Vào",
    room_code_label: "Mã phòng:", btn_leave_room: "🚪 Rời Phòng",
    btn_video_call: "📹 Gọi Video", btn_invite_race: "🏆 Mời Thi Đua!", btn_end_call: "📵 Tắt Video",
    incoming_call_title: "Cuộc Gọi Video Đến!", incoming_call_msg: "đang gọi Video cho bạn!",
    btn_answer_call: "✅ Nghe Máy", btn_reject_call: "❌ Từ Chối",
    vid_ringing: "🟡 Đang đổ chuông chờ bạn nghe máy...", vid_connecting: "🟡 Đang kết nối hình ảnh...",
    vid_connected: "🟢 Video 2 chiều đã kết nối!", vid_failed: "⚠️ Mạng 4G/WiFi đang chặn kết nối Video trực tiếp.",
    vid_rejected: "😅 Bạn đang bận, không nghe máy được!",
    btn_speak_big: "BẤM ĐỂ NÓI BẤT CỨ ĐIỀU GÌ BÉ THÍCH", btn_hint: "Gợi ý ý tưởng", btn_send: "Gửi 🚀",
    input_ph: "Trò chuyện tự do bằng tiếng Anh, hoặc bảo 'Mình muốn nói về...' để đổi bối cảnh!", nick_ph: "Tên bé",
    tool_trans: "🇻🇳 Dịch nghĩa", tool_gram: "🧠 Hiểu sâu", tool_hint: "💡 Gợi ý đáp",
    status_idle: "⚪ Chưa vào phòng", status_creating: "🟡 Đang mở phòng...",
    status_waiting: "🟡 Đọc cho bạn mã ", status_joining: "🟡 Đang vào phòng ",
    status_connected: "🟢 Đang chơi cùng ", status_notfound: "⚠️ Chưa thấy chủ phòng mã ",
    status_left: "🔴 Bạn đã rời phòng", friend_left_msg: "đã rời phòng.",
    race_welcome_title: "Đấu Trường Phản Xạ Tiếng Anh!",
    race_welcome_desc_solo: "Hiểu bản chất câu và nói thật tự nhiên để về đích trước Bobo nhé!",
    race_welcome_desc_online: "Đã kết nối với bạn! Bấm mời bạn thi đua xem ai phản xạ nhanh hơn!",
    race_start_solo: "🚀 ĐUA VỚI BOBO!", race_invite_btn: "🏆 MỜI BẠN THI ĐUA!",
    race_waiting_accept: "⏳ Đang chờ bạn đồng ý lời mời...", btn_cancel: "Hủy",
    race_declined: "😅 Bạn đang bận, lát nữa mời lại nhé!",
    race_speak_btn: "🎤 Nói Ngay!", race_hear_btn: "🔊 Nghe Mẫu",
    race_win: "🏆 BẠN VỀ ĐÍCH TRƯỚC! (+5 ⭐)", race_tie: "🤝 HÒA NHAU CỰC ĐỈNH! (+3 ⭐)",
    race_lose: "💪 SUÝT THẮNG RỒI! THỬ LẠI NHÉ!", race_again: "🔄 ĐUA LẠI",
    invite_title: "Lời Mời Thi Đua!", invite_msg: "mời bạn thi đua Tiếng Anh! Chơi không?",
    btn_accept_race: "✅ Chơi Luôn!", btn_decline_race: "❌ Để Sau",
    create_title: "✨ Tạo Thế Giới Trò Chuyện Bé Yêu Thích",
    create_name_lbl: "1. Bé muốn trò chuyện hoặc đóng vai về chủ đề gì? (VD: Minecraft, Công chúa, Khủng long, Đá bóng...)",
    create_grammar_lbl: "2. Hướng tiếp thu ngữ pháp tự nhiên",
    create_kw_lbl: "3. Chi tiết hoặc nhân vật bé muốn đưa vào (không bắt buộc)",
    btn_create_topic: "✨ Khám Phá Ngay Cùng Bobo!", my_topics_lbl: "📚 Chủ Đề Bé Đã Tạo",
    no_custom: "Chưa có chủ đề tự tạo nào.", use_topic: "▶ Trò chuyện",
    btn_delete: "🗑️ Xóa", btn_delete_all: "🗑️ Xóa tất cả",
    confirm_delete_all: "Xóa toàn bộ chủ đề tự tạo nhé?"
  },
  en: {
    tab_chat: "💬 Free Talk", tab_race: "🏆 Race", tab_topics: "✨ Create World", tab_parent: "📊 Parents",
    btn_login_short: "Login", btn_account: "🔐 Account", btn_refresh: "🔄 Refresh", btn_logout: "🚪 Logout", btn_close: "Close",
    auth_modal_title: "Parent Account & Kid Profile",
    auth_modal_desc: "Sign in to sync learning behavior with PostgreSQL + pgvector RAG and view the Parent Analytics Dashboard!",
    auth_tab_login: "🔑 Sign In", auth_tab_register: "✨ Create Account",
    kpi_speak: "🎤 Speak Attempts (7d)", kpi_hint: "💡 Hint Dependency",
    kpi_lookup: "📖 Word & Sentence Lookups", kpi_cefr: "🧠 CEFR & AI Adaptation",
    dash_mastery_title: "🎯 Grammar Skill Mastery (Spaced Repetition)",
    dash_events_title: "🕒 Recent Learning Behavior & Agent Harness Logs",
    mode_ai: "🦖 Bobo AI Playmate", mode_online: "👫 Play with Friend", btn_spark: "Surprise Scenario",
    auto_mic: "Auto-Mic:", auto_on: "ON", auto_off: "OFF",
    cam_modal_title: "Allow Camera & Mic!",
    cam_modal_desc: "To speak English and video call your friends, tap the button below and choose \"Allow\"!",
    cam_btn_allow: "✅ Enable & Test Camera", cam_btn_later: "Later",
    cam_status_ok: "🟢 Camera & Mic are ready!",
    cam_status_denied: "🔴 Camera is blocked! Tap the lock icon in your address bar to allow Camera access.",
    cam_status_no_https: "⚠️ Non-HTTPS link or in-app browser blocked Camera. Open in Chrome or Safari!",
    cam_you_label: "📹 You (Sent to friend)", cam_friend_label: "On your screen", btn_flip_cam: "🔄 Flip Cam",
    room_title: "🌐 Friend Room (4 Digits)", btn_create_room: "🏠 Create", btn_join_room: "🚪 Join",
    room_code_label: "Room code:", btn_leave_room: "🚪 Leave Room",
    btn_video_call: "📹 Video Call", btn_invite_race: "🏆 Challenge!", btn_end_call: "📵 End Video",
    incoming_call_title: "Incoming Video Call!", incoming_call_msg: "is calling you!",
    btn_answer_call: "✅ Answer", btn_reject_call: "❌ Decline",
    vid_ringing: "🟡 Ringing friend...", vid_connecting: "🟡 Connecting video...",
    vid_connected: "🟢 Dual Video Connected!", vid_failed: "⚠️ Network NAT blocked direct video.",
    vid_rejected: "😅 Friend declined the video call!",
    btn_speak_big: "TAP TO TALK ABOUT ANYTHING YOU LOVE", btn_hint: "Idea Sparks", btn_send: "Send 🚀",
    input_ph: "Chat freely in English, or say 'Let's talk about...' to switch worlds!", nick_ph: "Name",
    tool_trans: "🇻🇳 Meaning", tool_gram: "🧠 Deep Grammar", tool_hint: "💡 Ideas",
    status_idle: "⚪ Not in a room", status_creating: "🟡 Opening room...",
    status_waiting: "🟡 Share code ", status_joining: "🟡 Joining room ",
    status_connected: "🟢 Playing with ", status_notfound: "⚠️ Waiting for host of ",
    status_left: "🔴 Left the room", friend_left_msg: "left the room.",
    race_welcome_title: "English Superstar Race!",
    race_welcome_desc_solo: "Answer fast & speak naturally to beat Bobo to the finish!",
    race_welcome_desc_online: "Connected with friend! Send a challenge to race live!",
    race_start_solo: "🚀 RACE BOBO!", race_invite_btn: "🏆 INVITE FRIEND TO RACE!",
    race_waiting_accept: "⏳ Waiting for friend to accept...", btn_cancel: "Cancel",
    race_declined: "😅 Friend is busy right now!",
    race_speak_btn: "🎤 Speak Now!", race_hear_btn: "🔊 Hear",
    race_win: "🏆 YOU WIN THE TROPHY! (+5 ⭐)", race_tie: "🤝 SUPER TIE! (+3 ⭐)",
    race_lose: "💪 ALMOST! TRY AGAIN!", race_again: "🔄 RACE AGAIN",
    invite_title: "Race Challenge!", invite_msg: "invites you to an English Race! Ready?",
    btn_accept_race: "✅ Let's Play!", btn_decline_race: "❌ Later",
    create_title: "✨ Create Your Adventure World",
    create_name_lbl: "1. What world or topic do you want to explore? (e.g., Minecraft, Dragons, Football...)",
    create_grammar_lbl: "2. Natural grammar focus",
    create_kw_lbl: "3. Fun details or characters (optional)",
    btn_create_topic: "✨ Start Adventure!", my_topics_lbl: "📚 Your Custom Worlds",
    no_custom: "No custom worlds yet.", use_topic: "▶ Explore",
    btn_delete: "🗑️ Delete", btn_delete_all: "🗑️ Delete All",
    confirm_delete_all: "Delete all custom worlds?"
  }
};

// Hệ thống Chủ đề Mở (Open-World Roleplay & Socratic Discovery) — Không rập khuôn
const BUILTIN_TOPICS = [
  {
    id: "free_discovery",
    label: "🌟 Trò Chuyện Tự Do",
    grammarName: "Phản xạ Tự Nhiên & Mở rộng ý",
    example: "\"Let's talk about anything! What makes you happy today?\"",
    opener: "Hey friend! 🦖 I'm Bobo! We can talk about ANYTHING you love—games, animals, superpowers, or funny stories! What are you excited about today?",
    openerVi: "Chào bạn thân! 🦖 Mình là Bobo đây! Tụi mình có thể nói về BẤT CỨ ĐIỀU GÌ bạn thích—trò chơi, thú cưng, siêu năng lực hay chuyện vui! Hôm nay điều gì làm bạn hào hứng nhất?",
    openerGram: "🧠 Hiểu sâu: Thay vì học thuộc lòng, bạn chỉ cần nói ra ý nghĩ của mình (VD: 'I love...', 'Today I...', 'Let's imagine...'). Bobo sẽ tự động bắt nhịp theo câu chuyện của bạn!",
    initialHints: ["I want to talk about my favorite game!", "Imagine we find a baby dragon!", "What do you like doing, Bobo?"],
    targets: ["like", "love", "have", "can", "am", "is", "are", "went", "saw"]
  },
  {
    id: "pizza",
    label: "🍕 Tiệm Bếp Phép Thuật",
    grammarName: "Sở thích & Sáng tạo (like / would like / make)",
    example: "\"I'm making a rainbow pizza with sweet mango!\"",
    opener: "Welcome to our Magic Kitchen! 👨‍🍳🍕 Today we can invent the craziest food in the world! If you were the chef, what secret ingredient would you put in our dish?",
    openerVi: "Chào mừng đến Căn Bếp Phép Thuật! 👨‍🍳🍕 Hôm nay tụi mình có thể phát minh ra món ăn độc lạ nhất thế giới! Nếu bạn là bếp trưởng, bạn sẽ cho nguyên liệu bí mật gì vào món ăn?",
    openerGram: "🧠 Hiểu sâu: Khi nói về sở thích thật sự của mình, dùng 'I like / I love...'. Khi muốn thêm thắt ý tưởng sáng tạo, thử nối thêm 'with...' (cùng với) hoặc 'because...' (bởi vì)!",
    initialHints: ["I want to make a chocolate pizza!", "Let's put flying marshmallows on top!", "What is your favorite food, Bobo?"],
    targets: ["like", "love", "make", "with", "sweet", "yummy"]
  },
  {
    id: "pet",
    label: "🦖 Bảo Tàng Sinh Vật Lạ",
    grammarName: "Miêu tả & Năng lực (has / have / can)",
    example: "\"My dragon has glowing wings and can turn invisible!\"",
    opener: "Rawr! 🦖 You just found a mysterious glowing egg in the forest, and it's hatching right now! What kind of creature is coming out, and what special power does it have?",
    openerVi: "Gừ! 🦖 Bạn vừa tìm thấy một quả trứng phát sáng bí ẩn trong rừng, và nó đang nở ngay lúc này! Sinh vật gì đang bước ra, và nó có năng lực đặc biệt gì thế?",
    openerGram: "🧠 Hiểu sâu: Khi miêu tả 1 người bạn hay 1 sinh vật (It / My pet), nó đi một mình nên động từ sở hữu mang chữ 's' -> 'It has...' (Nó có), kết hợp với 'It can + động từ' (Nó có thể làm gì)!",
    initialHints: ["It is a tiny dragon that can breathe ice!", "My creature has three eyes and can fly!", "Can your dinosaur talk, Bobo?"],
    targets: ["has", "have", "can", "wings", "magic"]
  },
  {
    id: "space",
    label: "🚀 Du Hành Đa Vũ Trụ",
    grammarName: "Hành động sống động (am / is / are + V-ing)",
    example: "\"We are landing on a planet made of crystal!\"",
    opener: "3... 2... 1... Warp speed! 🚀✨ Look out the spaceship window—we are flying past a glowing purple planet! What is happening out there right now?",
    openerVi: "3... 2... 1... Bật tốc độ ánh sáng! 🚀✨ Nhìn ra cửa sổ tàu vũ trụ kìa—tụi mình đang bay ngang qua một hành tinh màu tím phát sáng! Chuyện gì đang diễn ra ngoài đó thế?",
    openerGram: "🧠 Hiểu sâu: Bộ đôi [am/is/are + V-ing] giống như bạn đang cầm máy quay trực tiếp: mọi thứ ĐANG chuyển động ngay trước mắt (We are flying, The alien is waving)!",
    initialHints: ["Friendly aliens are waving at us!", "I am putting on my jetpack to explore!", "Where are we flying next, Captain Bobo?"],
    targets: ["am", "is", "are", "flying", "looking", "exploring"]
  },
  {
    id: "school",
    label: "🕵️ Kể Chuyện & Bí Ẩn",
    grammarName: "Kể lại Trải nghiệm & Câu chuyện (Past & Story)",
    example: "\"Yesterday I discovered a secret door at school!\"",
    opener: "Psst! Detective Bobo here! 🕵️‍♂️🔍 Every day has a fun story or a cool mystery. Did anything funny, surprising, or awesome happen to you recently?",
    openerVi: "Suỵt! Thám tử Bobo nghe đây! 🕵️‍♂️🔍 Mỗi ngày đều có một câu chuyện vui hoặc điều bất ngờ. Gần đây có chuyện gì hài hước hay thú vị xảy ra với bạn không?",
    openerGram: "🧠 Hiểu sâu: Khi kể lại một kỷ niệm đã diễn ra (Yesterday / Today), tiếng Anh dùng động từ quá khứ (went, saw, ate, played, found) như dấu mốc thời gian giúp người nghe hình dung câu chuyện!",
    initialHints: ["Yesterday I played an awesome game with my friends!", "I saw something super funny today!", "Tell me a funny story about you, Bobo!"],
    targets: ["went", "saw", "ate", "played", "found", "was"]
  }
];

// Kho Tình Huống Nhập Vai Bất Ngờ (Cho nút 🎲 Tình huống bất ngờ)
const SURPRISE_SCENARIOS = [
  {
    title: "🎒 Chiếc Balô Bay Tàng Hình",
    grammarFocus: "Tưởng tượng & Khả năng (can / will / going to)",
    example: "\"If I fly to the clouds, I can touch a rainbow!\"",
    opener: "Whoa! 🎒✨ You just opened your backpack and found a red button that says 'FLY MODE'! When you press it, where is the very first place you want to fly to?",
    openerVi: "Chà! 🎒✨ Bạn vừa mở balô ra và thấy một nút bấm màu đỏ ghi 'CHẾ ĐỘ BAY'! Khi bấm nút đó, nơi đầu tiên bạn muốn bay tới là đâu?",
    openerGram: "🧠 Hiểu sâu: Dùng 'I want to fly to...' (Mình muốn bay tới...) hoặc 'I can see...' (Mình có thể nhìn thấy...) để vẽ ra hành trình trên bầu trời nhé!",
    hints: ["I want to fly to the top of a snowy mountain!", "I will fly to school and surprise my friends!", "Would you fly with me, Bobo?"]
  },
  {
    title: "🍦 Tiệm Kem Trên Sao Hỏa",
    grammarFocus: "Giao tiếp & Miêu tả sáng tạo",
    example: "\"This anti-gravity ice cream floats into your mouth!\"",
    opener: "Ding-aling! 🍦🪐 Welcome to our Mars Ice Cream Truck! Every flavor here has a magical effect—one makes you jump 10 meters high, and one lets you speak animal language! Which flavor do you choose?",
    openerVi: "Kính coong! 🍦🪐 Chào mừng đến Xe Kem Sao Hỏa! Mỗi vị kem ở đây đều có phép thuật—một vị giúp bạn nhảy cao 10 mét, một vị giúp bạn nói chuyện với thú cưng! Bạn chọn vị nào?",
    openerGram: "🧠 Hiểu sâu: Khi chọn lựa và giải thích lý do, câu nói sẽ cực kỳ thuyết phục nếu bạn ghép 'I choose... because I want to...!' (Mình chọn... bởi vì mình muốn...!).",
    hints: ["I choose the animal language flavor so I can talk to dogs!", "I want the jumping ice cream to touch the moon!", "Can we mix both flavors together?"]
  },
  {
    title: "🏰 Giải Cứu Vương Quốc Đồ Chơi",
    grammarFocus: "Hành động & Phối hợp (Let's / We are + V-ing)",
    example: "\"Let's build a giant bridge with Lego blocks!\"",
    opener: "Alert! 🏰🧸 At midnight, all your toys just woke up and asked for your help! A giant pillow mountain is blocking their castle door! How should we help them?",
    openerVi: "Báo động! 🏰🧸 Lúc nửa đêm, tất cả đồ chơi của bạn vừa thức dậy và nhờ bạn giúp! Một ngọn núi gối khổng lồ đang chắn ngang cửa lâu đài! Tụi mình giúp chúng bằng cách nào đây?",
    openerGram: "🧠 Hiểu sâu: Khi cùng đồng đội lập kế hoạch, dùng 'Let's + hành động' (Cùng làm... nhé!) hoặc 'We can use...' (Chúng mình có thể dùng...)!",
    hints: ["Let's use a toy crane to move the pillows!", "We can climb over the pillow mountain!", "I will call my robot toy to help!"]
  },
  {
    id: "time_machine",
    title: "⏳ Cỗ Máy Thời Gian Khủng Long",
    grammarFocus: "Quan sát & Quá khứ / Hiện tại",
    example: "\"Look! A baby Triceratops is eating giant leaves!\"",
    opener: "Bzzz-POP! ⏳🌴 Our time machine just landed 65 million years ago! I hear giant footsteps shaking the ground... Quick, hide behind that giant fern! What do you see?",
    openerVi: "Bíp-BÙM! ⏳🌴 Cỗ máy thời gian vừa đưa tụi mình về 65 triệu năm trước! Mình nghe tiếng bước chân khổng lồ làm rung mặt đất... Nhanh nấp sau bụi dương xỉ kìa! Bạn nhìn thấy gì?",
    openerGram: "🧠 Hiểu sâu: Dùng 'I see a...' (Mình thấy một...) kết hợp với động từ đuôi '-ing' (VD: 'I see a dinosaur eating leaves') để miêu tả cảnh vật sống động như phim!",
    hints: ["I see a friendly T-Rex looking for snacks!", "Two baby dinosaurs are playing in the river!", "Let's take a photo and give it a banana!"]
  }
];

const RACE_POOL = [
  { type: "quiz", q: "Which sentence sounds natural & correct? 🌟", opts: ["My dog have big ears.", "My dog has big ears.", "My dog having big ears."], ans: 1, skill: "has_have" },
  { type: "quiz", q: "Look out the window! The alien ____ dancing! 👽", opts: ["am", "are", "is"], ans: 2, skill: "present_continuous" },
  { type: "speak", q: "Say this naturally out loud! 🎤", target: "I love exploring new worlds", skill: "like_dislike" },
  { type: "quiz", q: "Pick the natural English sentence: 🍦", opts: ["I likes chocolate ice cream!", "I like chocolate ice cream!", "I liking chocolate ice cream!"], ans: 1, skill: "like_dislike" },
  { type: "quiz", q: "Yesterday we ____ a funny monkey at the park! 🐒", opts: ["saw", "see", "seeing"], ans: 0, skill: "past_simple" },
  { type: "speak", q: "Say this out loud! 🎤", target: "My dragon can fly super fast", skill: "has_have" },
  { type: "quiz", q: "Two astronauts ____ floating in space! 🚀", opts: ["is", "am", "are"], ans: 2, skill: "present_continuous" },
  { type: "quiz", q: "I found ____ awesome orange crystal! 💎", opts: ["a", "an", "two"], ans: 1, skill: "articles" }
];

// ================= 3. STATE & PERSISTENCE =================
function createDefaultLocalBehavior() {
  return {
    speakAttempts: 0,
    hintsUsed: 0,
    wordLookups: 0,
    transClicked: 0,
    raceAnswers: 0,
    grammarOk: 0,
    grammarError: 0,
    skills: {
      like_dislike: { skill_tag: "like_dislike", mastery_score: 40, correct_count: 0, error_count: 0 },
      has_have: { skill_tag: "has_have", mastery_score: 35, correct_count: 0, error_count: 0 },
      present_continuous: { skill_tag: "present_continuous", mastery_score: 30, correct_count: 0, error_count: 0 },
      past_simple: { skill_tag: "past_simple", mastery_score: 25, correct_count: 0, error_count: 0 },
      articles: { skill_tag: "articles", mastery_score: 35, correct_count: 0, error_count: 0 }
    },
    events: []
  };
}

let save = {
  stars: 0,
  lang: "vi",
  customTopics: [],
  camCheckedOnce: false,
  apiBase: AI_CONFIG.API_BASE,
  authToken: null,
  account: null,
  kidProfile: { nickname: "Minh", age_band: "6-8", cefr_level: "A0", avatar: "🦖" },
  localBehavior: createDefaultLocalBehavior()
};

try {
  const raw = localStorage.getItem("dinotalk_v6");
  if (raw) {
    const parsed = JSON.parse(raw);
    save = {
      ...save,
      ...parsed,
      kidProfile: { ...save.kidProfile, ...(parsed.kidProfile || {}) },
      localBehavior: {
        ...createDefaultLocalBehavior(),
        ...(parsed.localBehavior || {}),
        skills: {
          ...createDefaultLocalBehavior().skills,
          ...((parsed.localBehavior && parsed.localBehavior.skills) || {})
        }
      }
    };
  }
  if (!Array.isArray(save.customTopics)) save.customTopics = [];
  if (!Array.isArray(save.localBehavior.events)) save.localBehavior.events = [];
} catch (e) {}

if (save.apiBase) {
  AI_CONFIG.API_BASE = save.apiBase.replace(/\/+$/, "");
  AI_CONFIG.PROXY_URL = `${AI_CONFIG.API_BASE}/api/agent/chat`;
}

let authMode = "login";
let chatMode = "ai";
let currentTopicId = "free_discovery";
let soundOn = true;
let autoMic = false;
let turnIdx = 0;
let surpriseIdx = 0;
let aiHistory = [];
let currentDynamicHints = [];
let hintsVisible = false;
let isListening = false;
let recognition = null;
let micContext = "chat";
let lastPromptShownAt = Date.now();

const seenMsgIds = new Set();
let lastSentKey = "", lastSentTime = 0;

const myClientId = "kid_" + Math.random().toString(36).slice(2, 10);
const MQTT_BROKERS = ["wss://broker.emqx.io:8084/mqtt", "wss://broker.hivemq.com:8884/mqtt"];
let mqttClient = null, activeConnToken = 0, currentRoomTopic = "", currentRoomCode = "", roomConnected = false, friendNick = "Friend", joinRetryTimer = null;

let rtcPc = null, localStream = null, remoteStream = null, pendingCandidates = [], incomingOfferSdp = null;
let micEnabled = true, camEnabled = true, currentFacingMode = "user";

let raceQuestions = [], pendingInviteDeck = null;
let raceIdx = 0, raceMyScore = 0, raceRivalScore = 0, raceStreak = 0;
let raceTimer = null, raceCountdownTimer = null, raceTimeLeft = 15, raceLocked = false, raceFinished = false, raceQuestionStartAt = 0;

function persist() {
  try { localStorage.setItem("dinotalk_v6", JSON.stringify(save)); } catch (e) {}
  const sc = document.getElementById("starCount");
  if (sc) sc.textContent = save.stars;
  updateAuthProfileUI();
}
function t(k) { return (I18N[save.lang] && I18N[save.lang][k]) || k; }

// ================= 4. AUTH & BEHAVIOR TRACKING ENGINE =================
function updateAuthProfileUI() {
  const btn = document.getElementById("authProfileBtn");
  const lbl = document.getElementById("authProfileLabel");
  if (!btn || !lbl) return;
  if (save.authToken && save.kidProfile) {
    btn.classList.add("logged-in");
    lbl.textContent = `${save.kidProfile.nickname || "Minh"} (${save.kidProfile.cefr_level || "A0"})`;
  } else {
    btn.classList.remove("logged-in");
    lbl.textContent = t("btn_login_short");
  }
}

function openAuthModal() {
  const modal = document.getElementById("authModal");
  const resEl = document.getElementById("authResultMsg");
  const apiInp = document.getElementById("authApiUrlInput");
  if (resEl) resEl.textContent = "";
  if (apiInp) apiInp.value = save.apiBase || AI_CONFIG.API_BASE;
  if (save.account && save.account.email) {
    document.getElementById("authEmailInput").value = save.account.email;
  }
  switchAuthMode(save.authToken ? "login" : authMode);
  modal.classList.remove("hidden");
  playTone(600, 0.07);
}

function closeAuthModal() {
  document.getElementById("authModal").classList.add("hidden");
}

function switchAuthMode(mode) {
  authMode = mode;
  document.getElementById("authTabLogin").classList.toggle("active", mode === "login");
  document.getElementById("authTabRegister").classList.toggle("active", mode === "register");
  document.getElementById("authRegisterFields").classList.toggle("hidden", mode !== "register");
  const submitBtn = document.getElementById("authSubmitBtn");
  if (submitBtn) {
    submitBtn.textContent = mode === "register"
      ? (save.lang === "vi" ? "✨ Đăng Ký & Tạo Hồ Sơ Bé" : "✨ Register & Create Kid Profile")
      : (save.lang === "vi" ? "🚀 Đăng Nhập Ngay" : "🚀 Sign In Now");
  }
}

async function submitAuthForm() {
  const email = document.getElementById("authEmailInput").value.trim();
  const password = document.getElementById("authPasswordInput").value;
  const kidNickname = document.getElementById("authKidNickInput").value.trim() || "Minh";
  const ageBand = document.getElementById("authAgeBandSelect").value;
  const cefrLevel = document.getElementById("authCefrSelect").value;
  const apiUrl = (document.getElementById("authApiUrlInput").value.trim() || "http://localhost:4000").replace(/\/+$/, "");

  const resEl = document.getElementById("authResultMsg");
  const btn = document.getElementById("authSubmitBtn");

  if (!email || !password) {
    resEl.style.color = "#dc2626";
    resEl.textContent = save.lang === "vi" ? "⚠️ Vui lòng nhập đầy đủ Email và Mật khẩu!" : "⚠️ Please enter both email and password!";
    return;
  }

  save.apiBase = apiUrl;
  AI_CONFIG.API_BASE = apiUrl;
  AI_CONFIG.PROXY_URL = `${apiUrl}/api/agent/chat`;

  btn.disabled = true;
  resEl.style.color = "#0284c7";
  resEl.textContent = save.lang === "vi" ? "⏳ Đang kết nối tới DinoTalk Backend..." : "⏳ Connecting to DinoTalk Backend...";

  const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
  const payload = authMode === "register"
    ? { email, password, kidNickname, ageBand, cefrLevel }
    : { email, password };

  try {
    const res = await fetch(`${apiUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("STATIC_HOST_FALLBACK");
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "AUTH_FAILED");
    }

    const kid = data.activeKid || data.kid || { nickname: kidNickname, age_band: ageBand, cefr_level: cefrLevel };
    save.authToken = data.token;
    save.account = data.account || { email };
    save.kidProfile = {
      id: kid.id,
      nickname: kid.nickname || kidNickname,
      age_band: kid.age_band || ageBand,
      cefr_level: kid.cefr_level || cefrLevel,
      avatar: kid.avatar || "🦖"
    };
    if (typeof kid.stars === "number") save.stars = Math.max(save.stars, kid.stars);
    const nickInp = document.getElementById("myNickInput");
    if (nickInp && save.kidProfile.nickname) nickInp.value = save.kidProfile.nickname;

    persist();
    playFanfare();
    resEl.style.color = "#16a34a";
    resEl.textContent = save.lang === "vi"
      ? `🟢 Đăng nhập thành công! Xin chào bé ${save.kidProfile.nickname}!`
      : `🟢 Signed in! Welcome ${save.kidProfile.nickname}!`;

    setTimeout(() => {
      closeAuthModal();
      if (!document.getElementById("screenParent").classList.contains("hidden")) {
        refreshParentDashboard();
      }
    }, 750);
  } catch (err) {
    const isNetworkOrStatic =
      err.message === "STATIC_HOST_FALLBACK" ||
      err.message === "Failed to fetch" ||
      err.name === "TypeError";

    if (isNetworkOrStatic) {
      // Tự động lưu Hồ sơ Phụ huynh & Bé trên trình duyệt khi chạy trên Netlify Static / Offline
      save.authToken = "netlify_local_" + Date.now();
      save.account = { email };
      save.kidProfile = {
        id: "local_kid_" + Date.now(),
        nickname: authMode === "register" ? kidNickname : (save.kidProfile?.nickname || "Minh"),
        age_band: authMode === "register" ? ageBand : (save.kidProfile?.age_band || "6-8"),
        cefr_level: authMode === "register" ? cefrLevel : (save.kidProfile?.cefr_level || "A0"),
        avatar: "🦖"
      };
      const nickInp = document.getElementById("myNickInput");
      if (nickInp && save.kidProfile.nickname) nickInp.value = save.kidProfile.nickname;
      persist();
      playFanfare();
      resEl.style.color = "#059669";
      resEl.textContent = save.lang === "vi"
        ? `🟢 Đã kích hoạt hồ sơ bé ${save.kidProfile.nickname} (Chế độ Cloud/Netlify)!`
        : `🟢 Activated profile for ${save.kidProfile.nickname} (Cloud/Netlify Mode)!`;
      setTimeout(() => {
        closeAuthModal();
        if (!document.getElementById("screenParent").classList.contains("hidden")) {
          refreshParentDashboard();
        }
      }, 800);
      return;
    }

    resEl.style.color = "#dc2626";
    resEl.textContent = `🔴 ${err.message}`;
  } finally {
    btn.disabled = false;
  }
}

function logoutParent() {
  save.authToken = null;
  save.account = null;
  persist();
  refreshParentDashboard();
  playTone(440, 0.08);
}

function detectLocalGrammarSignals(text) {
  const low = text.toLowerCase();
  const signals = [];
  if (/\bi has\b/.test(low)) signals.push({ skill: "has_have", ok: false });
  if (/\b(he|she|it) have\b/.test(low)) signals.push({ skill: "has_have", ok: false });
  if (/\bi likes\b/.test(low)) signals.push({ skill: "like_dislike", ok: false });
  if (/\bi is\b/.test(low)) signals.push({ skill: "present_continuous", ok: false });
  if (/\ba (apple|orange|alien|elephant|ice)\b/.test(low)) signals.push({ skill: "articles", ok: false });

  if (/\bi have\b|\b(he|she|it) has\b/.test(low)) signals.push({ skill: "has_have", ok: true });
  if (/\bi (like|don't like|love)\b/.test(low)) signals.push({ skill: "like_dislike", ok: true });
  if (/\b(am|is|are) \w+ing\b/.test(low)) signals.push({ skill: "present_continuous", ok: true });
  if (/\b(yesterday|went|saw|ate|played|found)\b/.test(low)) signals.push({ skill: "past_simple", ok: true });
  if (/\ban (apple|orange|alien|elephant|ice)\b/.test(low)) signals.push({ skill: "articles", ok: true });
  return signals;
}

async function trackBehaviorEvent(eventType, { skillTag = null, isCorrect = null, latencyMs = null, metadata = {} } = {}) {
  const lb = save.localBehavior || createDefaultLocalBehavior();
  if (eventType === "speak_attempt") lb.speakAttempts = (lb.speakAttempts || 0) + 1;
  if (eventType === "hint_used") lb.hintsUsed = (lb.hintsUsed || 0) + 1;
  if (eventType === "word_lookup") lb.wordLookups = (lb.wordLookups || 0) + 1;
  if (eventType === "trans_clicked") lb.transClicked = (lb.transClicked || 0) + 1;
  if (eventType === "race_answer") lb.raceAnswers = (lb.raceAnswers || 0) + 1;
  if (eventType === "grammar_ok") lb.grammarOk = (lb.grammarOk || 0) + 1;
  if (eventType === "grammar_error") lb.grammarError = (lb.grammarError || 0) + 1;

  if (skillTag && isCorrect !== null && isCorrect !== undefined) {
    if (!lb.skills[skillTag]) {
      lb.skills[skillTag] = { skill_tag: skillTag, mastery_score: 30, correct_count: 0, error_count: 0 };
    }
    const sk = lb.skills[skillTag];
    const delta = isCorrect ? 8 : -10;
    sk.mastery_score = Math.max(0, Math.min(100, (sk.mastery_score || 30) + delta));
    if (isCorrect) sk.correct_count = (sk.correct_count || 0) + 1;
    else sk.error_count = (sk.error_count || 0) + 1;
  }

  lb.events.unshift({
    event_type: eventType,
    skill_tag: skillTag,
    is_correct: isCorrect,
    latency_ms: latencyMs,
    metadata,
    created_at: new Date().toISOString()
  });
  if (lb.events.length > 25) lb.events = lb.events.slice(0, 25);
  save.localBehavior = lb;
  persist();

  if (save.authToken) {
    try {
      await fetch(`${AI_CONFIG.API_BASE}/api/behavior/event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${save.authToken}`
        },
        body: JSON.stringify({ eventType, skillTag, isCorrect, latencyMs, metadata })
      });
    } catch (e) {}
  }
}

async function refreshParentDashboard() {
  const statusEl = document.getElementById("dashBackendStatus");
  const logoutBtn = document.getElementById("dashLogoutBtn");
  const syncEl = document.getElementById("dashLastSync");

  let snapshot = null;
  let fromBackend = false;

  if (save.authToken) {
    logoutBtn.classList.remove("hidden");
    try {
      const res = await fetch(`${AI_CONFIG.API_BASE}/api/behavior/summary`, {
        headers: { "Authorization": `Bearer ${save.authToken}` }
      });
      if (res.ok) {
        snapshot = await res.json();
        fromBackend = true;
      }
    } catch (e) {}
  } else {
    logoutBtn.classList.add("hidden");
  }

  if (!snapshot) {
    const lb = save.localBehavior || createDefaultLocalBehavior();
    const skillArr = Object.values(lb.skills || {}).sort((a, b) => a.mastery_score - b.mastery_score);
    const speakAttempts = lb.speakAttempts || 0;
    const hintsUsed = lb.hintsUsed || 0;
    const hintDependency = speakAttempts > 0 ? +(hintsUsed / speakAttempts).toFixed(2) : 0;
    snapshot = {
      kid: {
        nickname: save.kidProfile?.nickname || document.getElementById("myNickInput")?.value || "Minh",
        age_band: save.kidProfile?.age_band || "6-8",
        cefr_level: save.kidProfile?.cefr_level || "A0",
        stars: save.stars,
        avatar: save.kidProfile?.avatar || "🦖"
      },
      weakSkills: skillArr.slice(0, 3),
      allSkills: skillArr,
      speakAttempts,
      hintsUsed,
      hintDependency,
      recentLookups: lb.wordLookups || 0,
      transClicked: lb.transClicked || 0,
      raceAnswers: lb.raceAnswers || 0,
      grammarOk: lb.grammarOk || 0,
      grammarError: lb.grammarError || 0,
      shouldSimplify: hintDependency > 0.5 || (save.kidProfile?.cefr_level || "A0") === "A0",
      recentEvents: lb.events || [],
      recentTraces: []
    };
  } else if (snapshot.kid) {
    save.kidProfile = { ...save.kidProfile, ...snapshot.kid };
    if (typeof snapshot.kid.stars === "number") save.stars = Math.max(save.stars, snapshot.kid.stars);
    persist();
  }

  const kid = snapshot.kid || {};
  document.getElementById("dashKidAvatar").textContent = kid.avatar || "🦖";
  document.getElementById("dashKidTitle").textContent =
    `Hồ sơ Bé: ${kid.nickname || "Minh"} (${kid.age_band || "6-8"} tuổi • ⭐ ${save.stars})`;
  statusEl.style.color = fromBackend ? "#059669" : "#d97706";
  statusEl.textContent = fromBackend
    ? `🟢 Đã đồng bộ PostgreSQL + pgvector (${save.account?.email || "Parent"})`
    : (save.authToken
        ? `🟠 Chưa kết nối được ${AI_CONFIG.API_BASE} — Đang hiển thị dữ liệu Local`
        : `🟡 Chế độ Local (Bấm "🔐 Tài khoản" để đăng nhập PostgreSQL Backend)`);
  if (syncEl) {
    syncEl.textContent = fromBackend ? "Đồng bộ trực tiếp từ PostgreSQL" : "Tracking trực tiếp trên trình duyệt";
  }

  const speakCount = Number(snapshot.speakAttempts || 0);
  const hintsUsed = Number(snapshot.hintsUsed || 0);
  const hintRatePct = Math.round((Number(snapshot.hintDependency || 0)) * 100);
  const lookups = Number(snapshot.recentLookups || 0);
  const transClicks = Number(snapshot.transClicked || 0);
  const gOk = Number(snapshot.grammarOk || 0);
  const gErr = Number(snapshot.grammarError || 0);

  document.getElementById("dashSpeakCount").textContent = speakCount;
  document.getElementById("dashGrammarAcc").textContent =
    (gOk + gErr) > 0 ? `✅ ${gOk} câu chuẩn • 💡 ${gErr} câu đã chỉnh tự nhiên` : "Hãy nói tiếng Anh cùng Bobo nhé!";

  document.getElementById("dashHintRate").textContent = `${hintRatePct}%`;
  document.getElementById("dashHintDetail").textContent = `${hintsUsed} lần bấm Gợi ý / ${speakCount} lượt nói`;

  document.getElementById("dashLookupCount").textContent = lookups + transClicks;
  document.getElementById("dashLookupDetail").textContent = `${lookups} tra từ • ${transClicks} dịch câu`;

  document.getElementById("dashCefrBadge").textContent = `CEFR ${kid.cefr_level || "A0"}`;
  document.getElementById("dashAdaptiveNote").textContent = snapshot.shouldSimplify
    ? "🤖 Socratic AI: Gợi mở câu ngắn tự nhiên (A0-A1)"
    : "🤖 Socratic AI: Mở rộng phản xạ câu chuyện (A1-A2)";

  const skillsMap = { ...createDefaultLocalBehavior().skills };
  (snapshot.allSkills || snapshot.weakSkills || []).forEach(s => {
    skillsMap[s.skill_tag] = { ...skillsMap[s.skill_tag], ...s };
  });
  const skillsList = Object.values(skillsMap).sort((a, b) => a.mastery_score - b.mastery_score);

  const weakSummaryEl = document.getElementById("dashWeakSummary");
  const weakest = skillsList[0];
  if (weakest) {
    const meta = SKILL_META[weakest.skill_tag] || { label: weakest.skill_tag };
    weakSummaryEl.textContent = `📌 Trọng tâm lồng ghép: ${meta.label.split(" (")[0]} (${weakest.mastery_score}%)`;
  }

  const skillListEl = document.getElementById("dashSkillList");
  skillListEl.innerHTML = "";
  skillsList.forEach(sk => {
    const meta = SKILL_META[sk.skill_tag] || { label: sk.skill_tag, cefr: "A1" };
    const score = Math.max(0, Math.min(100, Number(sk.mastery_score || 30)));
    const barColor = score >= 70 ? "#10b981" : score >= 45 ? "#3b82f6" : "#f59e0b";
    const item = document.createElement("div");
    item.className = "skill-item";
    item.innerHTML = `
      <div class="skill-header">
        <span class="skill-name">[${meta.cefr}] ${meta.label}</span>
        <span class="skill-meta">Thấm nhuần: <b>${score}%</b> (Đúng: ${sk.correct_count || 0} • Cần nhắc: ${sk.error_count || 0})</span>
      </div>
      <div class="skill-bar-track">
        <div class="skill-bar-fill" style="width:${score}%; background:${barColor};"></div>
      </div>
    `;
    skillListEl.appendChild(item);
  });

  const eventListEl = document.getElementById("dashEventList");
  eventListEl.innerHTML = "";
  const events = snapshot.recentEvents || [];
  if (events.length === 0) {
    eventListEl.innerHTML = `<div style="color:var(--muted); font-size:0.88rem;">Chưa có sự kiện nào. Khi bé trò chuyện, bấm Gợi ý, tra từ hoặc chơi Thi Đua, hệ thống sẽ ghi nhận tại đây!</div>`;
    return;
  }

  const eventLabels = {
    speak_attempt: "🎤 Bé trò chuyện tiếng Anh",
    grammar_ok: "✅ Phản xạ cấu trúc ngữ pháp tự nhiên",
    grammar_error: "💡 AI Recast — Nhắc khéo lỗi ngữ pháp trong ngữ cảnh",
    hint_used: "💡 Bé mở Gợi ý ý tưởng",
    word_lookup: "🔊 Bé chạm tra nghĩa từ vựng",
    trans_clicked: "🇻🇳 Bé xem nghĩa tiếng Việt của câu",
    race_answer: "🏆 Bé phản xạ trong phần Thi Đua",
    topic_switch: "✨ Chuyển đổi thế giới câu chuyện"
  };

  events.slice(0, 12).forEach(ev => {
    const row = document.createElement("div");
    row.className = "event-item";
    const label = eventLabels[ev.event_type] || ev.event_type;
    let detail = "";
    const meta = typeof ev.metadata === "string" ? JSON.parse(ev.metadata || "{}") : (ev.metadata || {});
    if (ev.skill_tag) detail += ` [${ev.skill_tag}]`;
    if (meta.word) detail += ` "${meta.word}"`;
    if (meta.text) detail += ` "${meta.text}"`;
    if (meta.topicId) detail += ` (${meta.topicId})`;

    const tagClass = ev.is_correct === true ? "ok" : ev.is_correct === false ? "err" : "info";
    const tagText = ev.is_correct === true ? "TỰ NHIÊN" : ev.is_correct === false ? "CẦN ÔN" : (ev.latency_ms ? `${ev.latency_ms}ms` : "EVENT");

    row.innerHTML = `
      <div><span>${label}</span><span style="color:var(--muted);">${detail}</span></div>
      <span class="event-tag ${tagClass}">${tagText}</span>
    `;
    eventListEl.appendChild(row);
  });
}

// ================= 5. FIRST-OPEN CAMERA PERMISSION CHECK =================
async function checkCameraOnStartup() {
  const btn = document.getElementById("camCheckBtn");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    btn.textContent = "📷 ✕";
    btn.classList.add("cam-warn");
    if (!save.camCheckedOnce) openCamPermModal(false, "no_https");
    return;
  }

  let permState = "unknown";
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const res = await navigator.permissions.query({ name: "camera" });
      permState = res.state;
      res.onchange = () => updateCamBadge(res.state);
    }
  } catch (e) {}

  updateCamBadge(permState);

  if (permState === "granted") {
    save.camCheckedOnce = true;
    persist();
  } else if (permState === "denied") {
    openCamPermModal(false, "denied");
  } else if (!save.camCheckedOnce) {
    openCamPermModal(false, "prompt");
  }
}

function updateCamBadge(state) {
  const btn = document.getElementById("camCheckBtn");
  btn.classList.remove("cam-ok", "cam-warn");
  if (state === "granted") {
    btn.textContent = "📷 ✓";
    btn.classList.add("cam-ok");
  } else if (state === "denied") {
    btn.textContent = "📷 ✕";
    btn.classList.add("cam-warn");
  } else {
    btn.textContent = "📷 ?";
  }
}

function openCamPermModal(manual = false, reason = "prompt") {
  const resEl = document.getElementById("camTestResult");
  resEl.textContent = "";
  resEl.style.color = "var(--text)";
  if (reason === "denied") {
    resEl.style.color = "#dc2626";
    resEl.textContent = t("cam_status_denied");
  } else if (reason === "no_https") {
    resEl.style.color = "#d97706";
    resEl.textContent = t("cam_status_no_https");
  }
  document.getElementById("camPermModal").classList.remove("hidden");
  if (manual) playTone(600, 0.08);
}

async function requestCameraPermission() {
  const resEl = document.getElementById("camTestResult");
  const allowBtn = document.getElementById("camAllowBtn");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    resEl.style.color = "#d97706";
    resEl.textContent = t("cam_status_no_https");
    return;
  }

  allowBtn.disabled = true;
  try {
    const testStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
    testStream.getTracks().forEach(tr => tr.stop());
    save.camCheckedOnce = true;
    persist();
    updateCamBadge("granted");
    resEl.style.color = "#16a34a";
    resEl.textContent = t("cam_status_ok");
    playFanfare();
    setTimeout(() => document.getElementById("camPermModal").classList.add("hidden"), 900);
  } catch (err) {
    updateCamBadge("denied");
    resEl.style.color = "#dc2626";
    resEl.textContent = t("cam_status_denied");
  } finally {
    allowBtn.disabled = false;
  }
}

function dismissCamPermModal() {
  save.camCheckedOnce = true;
  persist();
  document.getElementById("camPermModal").classList.add("hidden");
}

// ================= 6. LANGUAGE, AUDIO & TABS =================
function setLang(lang) {
  save.lang = lang; persist();
  document.getElementById("langBtnVi").classList.toggle("active", lang === "vi");
  document.getElementById("langBtnEn").classList.toggle("active", lang === "en");
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const k = el.getAttribute("data-i18n");
    if (I18N[lang][k]) el.textContent = I18N[lang][k];
  });
  document.getElementById("textInput").placeholder = t("input_ph");
  document.getElementById("myNickInput").placeholder = t("nick_ph");
  updateAuthProfileUI();
  updateAutoMicBtn();
  updateRemoteCamLabel();
  if (!roomConnected && !currentRoomCode) document.getElementById("onlineStatus").textContent = t("status_idle");
  renderCustomTopicsList();
  if (!document.getElementById("screenRace").classList.contains("hidden") && raceQuestions.length === 0) renderRaceWelcome();
  if (!document.getElementById("screenParent").classList.contains("hidden")) refreshParentDashboard();
}

function updateRemoteCamLabel() {
  document.getElementById("remoteVideoLabel").textContent = `📹 ${friendNick} (${t("cam_friend_label")})`;
}

function toggleAutoMic() { autoMic = !autoMic; updateAutoMicBtn(); playTone(620, 0.07); }
function updateAutoMicBtn() {
  const b = document.getElementById("autoMicBtn");
  b.classList.toggle("on", autoMic);
  b.innerHTML = `🎙️ ${t("auto_mic")} <b>${autoMic ? t("auto_on") : t("auto_off")}</b>`;
}

let audioCtx = null;
function playTone(freq = 540, dur = 0.09) {
  if (!soundOn) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.4, audioCtx.currentTime + dur);
  g.gain.setValueAtTime(0.14, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + dur);
  osc.connect(g); g.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + dur);
}
function playFanfare() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => playTone(f, 0.13), i * 100)); }

function speakText(txt, rate = 0.94, triggerAutoMic = false) {
  if (!soundOn || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const clean = txt.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "");
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = "en-US"; u.pitch = 1.15; u.rate = rate;
  if (triggerAutoMic && autoMic && chatMode === "ai") {
    u.onend = () => {
      if (autoMic && !isListening && !document.getElementById("screenChat").classList.contains("hidden")) {
        try { toggleMic("chat"); } catch (e) {}
      }
    };
  }
  window.speechSynthesis.speak(u);
}

function toggleSound() {
  soundOn = !soundOn;
  document.getElementById("soundBtn").textContent = soundOn ? "🔊" : "🔇";
  if (!soundOn && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

function launchConfetti() {
  const cols = ["#2563eb", "#f43f5e", "#10b981", "#f59e0b", "#7c3aed"];
  for (let i = 0; i < 36; i++) {
    const d = document.createElement("div"); d.className = "confetti";
    d.style.left = Math.random() * 100 + "vw"; d.style.background = cols[i % cols.length];
    d.style.animationDuration = (1.1 + Math.random()) + "s";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2200);
  }
}

function switchTab(tab) {
  if (tab !== "race") { clearInterval(raceTimer); clearInterval(raceCountdownTimer); }
  ["chat", "race", "topics", "parent"].forEach(n => {
    const cap = n.charAt(0).toUpperCase() + n.slice(1);
    const tabBtn = document.getElementById("tab" + cap);
    const scr = document.getElementById("screen" + cap);
    if (tabBtn) tabBtn.classList.toggle("active", n === tab);
    if (scr) scr.classList.toggle("hidden", n !== tab);
  });
  if (tab === "race" && raceQuestions.length === 0) renderRaceWelcome();
  if (tab === "topics") renderCustomTopicsList();
  if (tab === "parent") refreshParentDashboard();
  playTone(580);
}

// ================= 7. SOCRATIC CHAT, DEEP GRAMMAR & NATURAL ACQUISITION =================
function translateWordsLocally(text, extraVocab = {}) {
  const tokens = text.toLowerCase().replace(/[^a-z\s']/g, " ").split(/\s+/).filter(Boolean);
  const pairs = [], seen = new Set();
  tokens.forEach(w => {
    if (seen.has(w)) return;
    const mean = extraVocab[w] || MINI_DICT[w];
    if (mean) { seen.add(w); pairs.push(`<b>${w}</b> = ${mean}`); }
  });
  return pairs.length > 0 ? "📖 Từ vựng trong câu: " + pairs.join(" • ") : "📖 Chạm trực tiếp vào từng từ tiếng Anh trên câu để nghe phát âm & xem nghĩa!";
}

// Giải thích bản chất ngữ pháp theo tư duy hình ảnh (Deep Mental Models)
function explainGrammarLocally(text) {
  const low = text.toLowerCase();
  if (/\b(am|is|are)\s+\w+ing\b/.test(low)) {
    return "🧠 <b>Hiểu sâu (Hiện tại tiếp diễn)</b>: Bộ đôi <code>am/is/are + V-ing</code> giống như ống kính máy quay đang ghi lại một hành động <b>đang chuyển động ngay trước mắt</b>!";
  }
  if (/\b(went|saw|ate|played|found|discovered|did|was|were)\b/.test(low)) {
    return "🧠 <b>Hiểu sâu (Kể chuyện đã qua)</b>: Động từ quá khứ (<code>went, saw, ate, played</code>) đóng vai trò như một 'dấu mộc thời gian' báo cho người nghe biết sự việc đã hoàn tất trong quá khứ.";
  }
  if (/\b(has|have)\b/.test(low)) {
    return "🧠 <b>Hiểu sâu (have vs has)</b>: <code>I / You / We / They</code> đi đông hoặc ngôi thứ nhất nên dùng <code>have</code>; còn khi nói về 1 người/1 vật (<code>He / She / It</code>) thì động từ thích thêm chữ 's' thành <code>has</code>!";
  }
  if (/\bcan\s+\w+/.test(low)) {
    return "🧠 <b>Hiểu sâu (Năng lực với can)</b>: Sau <code>can</code> (có thể), động từ luôn giữ nguyên gốc tự nhiên nhất (<code>can fly, can swim</code>) dù chủ ngữ là ai!";
  }
  if (/\b(like|love|enjoy|prefer)\b/.test(low)) {
    return "🧠 <b>Hiểu sâu (Chia sẻ cảm xúc)</b>: Dùng <code>I like / I love...</code> để bộc lộ điều mình yêu thích, và nối thêm <code>because...</code> để giải thích lý do làm câu nói sâu sắc hơn!";
  }
  if (/\b(what|where|why|how|who|which)\b/.test(low)) {
    return "🧠 <b>Hiểu sâu (Câu hỏi mở Wh-)</b>: Đặt từ để hỏi (<code>What, Where, Why, How</code>) ở đầu câu giúp khơi gợi trí tưởng tượng và mở rộng câu chuyện!";
  }
  return "🧠 <b>Hiểu sâu (Cấu trúc tự nhiên)</b>: Tiếng Anh giao tiếp luôn đặt <b>[Ai/Cái gì] + [Làm hành động gì] + [Chi tiết mở rộng]</b> giúp người nghe hình dung ngay bức tranh trong đầu!";
}

function updateDynamicGrammarSpotlight(sentence, customNote = "") {
  const titleEl = document.getElementById("grammarTitle");
  const exEl = document.getElementById("grammarExample");
  if (!titleEl || !exEl) return;

  const low = (sentence || "").toLowerCase();
  if (/\b(am|is|are)\s+\w+ing\b/.test(low)) {
    titleEl.textContent = "Đang diễn ra (am/is/are + V-ing)";
  } else if (/\b(went|saw|ate|played|found|was|were)\b/.test(low)) {
    titleEl.textContent = "Kể chuyện đã qua (Past Story)";
  } else if (/\b(has|have)\b/.test(low)) {
    titleEl.textContent = "Miêu tả sở hữu (have / has)";
  } else if (/\bcan\s+\w+/.test(low)) {
    titleEl.textContent = "Khả năng & Siêu năng lực (can + V)";
  } else if (/\b(like|love|want|choose)\b/.test(low)) {
    titleEl.textContent = "Bộc lộ sở thích & Ý muốn";
  } else {
    titleEl.textContent = getCurrentTopic().grammarName;
  }

  const cleanQuote = (sentence || "").split(/(?<=[.!?])\s+/)[0] || sentence;
  exEl.textContent = `"${cleanQuote.slice(0, 75)}"`;
}

function showWordLookup(word, extraVocab = {}) {
  const clean = word.toLowerCase().replace(/[^a-z']/g, "");
  if (!clean) return;
  speakText(clean, 0.82, false);
  const mean = extraVocab[clean] || MINI_DICT[clean];
  const toast = document.getElementById("wordToast");
  document.getElementById("wordToastText").innerHTML = mean
    ? `🔊 <b>"${clean}"</b> = ${mean}`
    : `🔊 <b>"${clean}"</b> — ${save.lang === "vi" ? "Bấm '🇻🇳 Dịch nghĩa' dưới câu để hiểu toàn bộ ngữ cảnh nhé!" : "Tap Meaning below the bubble!"}`;
  toast.style.display = "flex";
  playTone(680, 0.07);
  trackBehaviorEvent("word_lookup", { metadata: { word: clean } });
}

function getAllTopics() { return [...BUILTIN_TOPICS, ...save.customTopics]; }
function getCurrentTopic() { return getAllTopics().find(x => String(x.id) === String(currentTopicId)) || BUILTIN_TOPICS[0]; }

function renderTopicBar() {
  const bar = document.getElementById("topicBar"); bar.innerHTML = "";
  const customIds = new Set(save.customTopics.map(c => String(c.id)));
  getAllTopics().forEach(tp => {
    const pill = document.createElement("div");
    pill.className = `topic-pill ${String(tp.id) === String(currentTopicId) ? "active" : ""}`;
    const lbl = document.createElement("span"); lbl.textContent = tp.label;
    pill.onclick = () => selectTopic(tp.id, true);
    pill.appendChild(lbl);
    if (customIds.has(String(tp.id))) {
      const del = document.createElement("button");
      del.className = "pill-del"; del.type = "button"; del.textContent = "✕";
      del.onclick = e => { e.stopPropagation(); deleteCustomTopic(tp.id); };
      pill.appendChild(del);
    }
    bar.appendChild(pill);
  });
  const addBtn = document.createElement("button");
  addBtn.className = "topic-pill add-topic";
  addBtn.textContent = "+ Chủ đề mới"; addBtn.onclick = () => switchTab("topics");
  bar.appendChild(addBtn);
}

function setDynamicHints(hints) {
  currentDynamicHints = Array.isArray(hints) ? hints.filter(Boolean).slice(0, 3) : [];
  hintsVisible = false; renderDynamicHints();
}
function toggleDynamicHints() {
  if (currentDynamicHints.length === 0) return;
  hintsVisible = !hintsVisible; renderDynamicHints(); playTone(620, 0.06);
  if (hintsVisible) trackBehaviorEvent("hint_used", { metadata: { topicId: currentTopicId } });
}
function renderDynamicHints() {
  const row = document.getElementById("dynamicHintsRow"); row.innerHTML = "";
  if (!hintsVisible || currentDynamicHints.length === 0) { row.classList.add("hidden"); return; }
  row.classList.remove("hidden");
  currentDynamicHints.forEach(txt => {
    const b = document.createElement("button"); b.className = "hint-chip"; b.textContent = "💬 " + txt;
    b.onclick = () => { hintsVisible = false; renderDynamicHints(); handleChatInput(txt, "hint"); };
    row.appendChild(b);
  });
}

// Nút 🎲 Đổi Tình Huống Bất Ngờ (Không bao giờ nhàm chán hay rập khuôn)
function sparkRandomScenario() {
  const sc = SURPRISE_SCENARIOS[surpriseIdx % SURPRISE_SCENARIOS.length];
  surpriseIdx++;
  aiHistory = [];
  lastPromptShownAt = Date.now();

  document.getElementById("grammarTitle").textContent = sc.grammarFocus;
  document.getElementById("grammarExample").textContent = sc.example;
  setDynamicHints(sc.hints);

  addChatMsg("other", `🦖 Bobo (${sc.title})`, sc.opener, {
    vi: sc.openerVi,
    gram: sc.openerGram,
    hints: sc.hints
  });
  speakText(sc.opener, 0.94, false);
  playFanfare();
  trackBehaviorEvent("topic_switch", { metadata: { topicId: "surprise_scenario", label: sc.title } });
}

function selectTopic(id, syncPeer = false) {
  const prevTopic = currentTopicId;
  currentTopicId = id; turnIdx = 0; aiHistory = [];
  lastPromptShownAt = Date.now();
  renderTopicBar();
  const tp = getCurrentTopic();
  document.getElementById("grammarTitle").textContent = tp.grammarName;
  document.getElementById("grammarExample").textContent = tp.example;
  document.getElementById("feedbackBanner").style.display = "none";
  document.getElementById("wordToast").style.display = "none";
  setDynamicHints(tp.initialHints || ["Let's imagine something fun!", "What do you think, Bobo?"]);
  document.getElementById("chatBox").innerHTML = "";

  if (syncPeer && prevTopic !== id) {
    trackBehaviorEvent("topic_switch", { metadata: { topicId: id, label: tp.label } });
  }

  if (chatMode === "ai") {
    addChatMsg("other", "🦖 Bobo", tp.opener, {
      vi: tp.openerVi || translateWordsLocally(tp.opener),
      gram: tp.openerGram || explainGrammarLocally(tp.opener),
      hints: tp.initialHints
    });
    speakText(tp.opener, 0.94, false);
  } else {
    addChatMsg("other", "🌐 Room", `${tp.label} — ${tp.opener}`, {
      vi: tp.openerVi || translateWordsLocally(tp.opener),
      gram: tp.openerGram || explainGrammarLocally(tp.opener),
      hints: tp.initialHints
    });
    if (syncPeer && roomConnected) publishRoom({ type: "sync_topic", topic: tp });
  }
}

function speakGrammar() {
  const ex = document.getElementById("grammarExample")?.textContent || getCurrentTopic().example;
  speakText(ex.replace(/"/g, ""));
}

function setChatMode(m) {
  chatMode = m;
  document.getElementById("modeAiBtn").classList.toggle("active", m === "ai");
  document.getElementById("modeOnlineBtn").classList.toggle("active", m === "online");
  document.getElementById("onlinePanel").classList.toggle("hidden", m !== "online");
  document.getElementById("autoMicBtn").classList.toggle("hidden", m !== "ai");
  document.getElementById("sparkScenarioBtn").classList.toggle("hidden", m !== "ai");
  selectTopic(currentTopicId);
}

function addChatMsg(cls, sender, text, meta = {}) {
  const box = document.getElementById("chatBox");
  const wrap = document.createElement("div");
  wrap.className = `msg-wrap ${cls}`;
  if (meta.id) wrap.id = meta.id;

  const bubble = document.createElement("div");
  bubble.className = `msg ${cls}`;
  const senderEl = document.createElement("div");
  senderEl.className = "msg-meta"; senderEl.textContent = sender;
  bubble.appendChild(senderEl);

  const textContainer = document.createElement("div");
  text.split(/([A-Za-z']+)/).forEach(part => {
    if (/^[A-Za-z']+$/.test(part) && part.length >= 2) {
      const span = document.createElement("span");
      span.className = "word-tok"; span.textContent = part;
      span.onclick = e => { e.stopPropagation(); showWordLookup(part, meta.vocab || {}); };
      textContainer.appendChild(span);
    } else textContainer.appendChild(document.createTextNode(part));
  });
  bubble.appendChild(textContainer);

  const transBox = document.createElement("div"); transBox.className = "msg-extra trans hidden";
  const gramBox = document.createElement("div"); gramBox.className = "msg-extra gram hidden";
  bubble.appendChild(transBox); bubble.appendChild(gramBox);
  wrap.appendChild(bubble);

  if (!meta.isLoading) {
    const tools = document.createElement("div"); tools.className = "msg-tools";
    const hearBtn = document.createElement("button"); hearBtn.className = "msg-tool-btn"; hearBtn.textContent = "🔊 Nghe";
    hearBtn.onclick = () => speakText(text, 0.9, false);
    tools.appendChild(hearBtn);

    const transBtn = document.createElement("button"); transBtn.className = "msg-tool-btn"; transBtn.textContent = t("tool_trans");
    transBtn.onclick = () => {
      const isHidden = transBox.classList.contains("hidden");
      transBox.innerHTML = meta.vi ? `🇻🇳 ${meta.vi}` : translateWordsLocally(text, meta.vocab || {});
      transBox.classList.toggle("hidden", !isHidden); transBtn.classList.toggle("active", isHidden);
      if (isHidden) trackBehaviorEvent("trans_clicked", { metadata: { text: text.slice(0, 60) } });
    };
    tools.appendChild(transBtn);

    const gramBtn = document.createElement("button"); gramBtn.className = "msg-tool-btn"; gramBtn.textContent = t("tool_gram");
    gramBtn.onclick = () => {
      const isHidden = gramBox.classList.contains("hidden");
      gramBox.innerHTML = meta.gram || explainGrammarLocally(text);
      gramBox.classList.toggle("hidden", !isHidden); gramBtn.classList.toggle("active", isHidden);
    };
    tools.appendChild(gramBtn);

    if (cls === "other" && Array.isArray(meta.hints) && meta.hints.length > 0) {
      const hintBtn = document.createElement("button"); hintBtn.className = "msg-tool-btn"; hintBtn.textContent = t("tool_hint");
      hintBtn.onclick = () => {
        currentDynamicHints = meta.hints;
        hintsVisible = true;
        renderDynamicHints();
        playTone(640, 0.06);
        trackBehaviorEvent("hint_used", { metadata: { source: "bubble_hint", topicId: currentTopicId } });
      };
      tools.appendChild(hintBtn);
    }
    wrap.appendChild(tools);
  }

  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}

function addStars(n) { save.stars += n; persist(); playTone(780, 0.11); }

// Phản hồi ngữ pháp sâu sắc, nhẹ nhàng (Natural Recast Insight)
function checkLocalGrammar(sentence) {
  const low = sentence.toLowerCase(), banner = document.getElementById("feedbackBanner");
  let tip = "";
  if (/\bi has\b/.test(low)) {
    tip = "💡 <b>Hiểu sâu</b>: <code>I</code> (bản thân mình) luôn đi với <b>I have...</b> (Còn <code>has</code> dành riêng cho 1 người/vật khác như He/She/It nhé!)";
  } else if (/\b(he|she|it) have\b/.test(low)) {
    tip = "💡 <b>Hiểu sâu</b>: Khi kể về 1 bạn (<code>he/she/it</code>), động từ thích thêm chữ 's' nên mình nói <b>has</b> nhé!";
  } else if (/\bi likes\b/.test(low)) {
    tip = "💡 <b>Hiểu sâu</b>: Đi cùng <code>I</code>, động từ giữ nguyên dạng tự nhiên là <b>I like...</b> (không cần thêm 's')!";
  } else if (/\bi is\b/.test(low)) {
    tip = "💡 <b>Hiểu sâu</b>: <code>I</code> có người bạn đồng hành duy nhất là <b>I am...</b>!";
  } else if (/\ba (apple|orange|alien|elephant|ice)\b/.test(low)) {
    tip = "💡 <b>Hiểu sâu</b>: Trước nguyên âm (a, e, i, o, u), dùng <b>an</b> (VD: <i>an apple</i>) để đọc nối âm thật mượt mà!";
  }

  if (tip) {
    addStars(1);
    banner.style.background = "#fffbeb"; banner.style.borderColor = "#fde68a"; banner.style.color = "#92400e";
    banner.innerHTML = tip + " (+1 ⭐)";
  } else {
    const wordsCount = sentence.trim().split(/\s+/).length;
    const bonus = wordsCount >= 5 ? 2 : 1;
    addStars(bonus);
    banner.style.background = "#f0fdf4"; banner.style.borderColor = "#86efac"; banner.style.color = "#166534";
    banner.innerHTML = (wordsCount >= 5
      ? "🌟 Câu tiếng Anh diễn đạt trọn vẹn và rất tự nhiên!"
      : "🎉 Phản xạ tốt lắm! Cứ tự nhiên mở rộng câu chuyện nhé!") + ` (+${bonus} ⭐)`;
  }
  banner.style.display = "block";
  return tip || explainGrammarLocally(sentence);
}

function detectTopicRequest(text) {
  const m = text.match(/(?:muốn nói về|nói về chủ đề|tạo chủ đề|đổi chủ đề|chủ đề mới|nói chuyện về|talk about|switch topic to|change topic to|new topic)\s+(.+)/i);
  if (!m) return null;
  const cleaned = m[1].replace(/[?!.]+$/g, "").replace(/\s+(đi|nhé|nha|please|now)$/i, "").trim();
  return (cleaned.length >= 2 && cleaned.length <= 45) ? cleaned : null;
}

// Bộ não phản hồi Socratic thông minh khi Offline (Bắt đúng ý của bé, Recast tự nhiên, không bao giờ lặp câu vô nghĩa)
function buildFlexibleOfflineReply(userText) {
  const low = userText.toLowerCase().trim();

  // 1. Natural Recast khi bé nói "I has..." hoặc "I likes..."
  if (/\bi has\s+(.+)/i.test(userText)) {
    const item = userText.match(/\bi has\s+(.+)/i)[1].replace(/[.!?]+$/, "");
    return {
      reply: `Whoa, you HAVE ${item}! 🤩 That sounds awesome! What is the coolest thing you can do with ${item}?`,
      vi: `Chà, bạn CÓ ${item} hả! Nghe tuyệt quá! Điều ngầu nhất bạn có thể làm cùng ${item} là gì?`,
      gram: "🧠 <b>Natural Recast</b>: Bobo vừa nhấn mạnh <b>'you HAVE...'</b> để bạn ngấm tự nhiên cách dùng <code>have</code> với <code>I / You</code>!",
      hints: [`I can play with it every day!`, `It has a secret power!`, `Do you want to see it, Bobo?`]
    };
  }
  if (/\bi likes\s+(.+)/i.test(userText)) {
    const item = userText.match(/\bi likes\s+(.+)/i)[1].replace(/[.!?]+$/, "");
    return {
      reply: `Aha, you LIKE ${item}! 🌟 I love ${item} too! What makes ${item} so special to you?`,
      vi: `À há, bạn THÍCH ${item}! Mình cũng mê ${item} lắm! Điều gì làm ${item} đặc biệt với bạn vậy?`,
      gram: "🧠 <b>Natural Recast</b>: Với <code>I / You</code>, động từ nguyên mẫu <b>like / love</b> nghe tự nhiên và chuẩn xác nhất!",
      hints: [`Because it is super exciting!`, `Because I play it with my friends!`, `What else do you love, Bobo?`]
    };
  }

  // 2. Khi bé đặt câu hỏi cho Bobo
  if (low.includes("?") || /\b(what about you|do you|can you|are you|how old|what is your|who are)\b/.test(low)) {
    return {
      reply: `Ooh, great question! 🦖 I'm a curious dinosaur who loves inventing flying skateboards and eating mango ice cream! If we team up today, what should we build together?`,
      vi: `Ồ, câu hỏi hay tuyệt! Mình là chú khủng long tò mò mê chế tạo ván trượt bay và ăn kem xoài! Nếu tụi mình lập đội hôm nay, tụi mình nên cùng chế tạo cái gì nhỉ?`,
      gram: "🧠 <b>Hiểu sâu</b>: Khi bạn hỏi <code>Do you...? / What about you?</code>, bạn đang làm chủ cuộc hội thoại song phương như người bản xứ!",
      hints: [`Let's build a giant robot!`, `Let's make a flying car!`, `Can your skateboard go to space?`]
    };
  }

  // 3. Khi bé bày tỏ ý không thích / phủ định
  if (/\b(no|don't|not|hate|boring|yuck|never)\b/.test(low)) {
    return {
      reply: `Haha, fair enough! 😆 Everyone has different tastes! So if we change the plan right now, what would make it 10 times more fun for you?`,
      vi: `Haha, chuẩn luôn! Mỗi người đều có sở thích riêng mà! Vậy nếu tụi mình đổi kế hoạch ngay bây giờ, điều gì sẽ làm nó vui gấp 10 lần với bạn?`,
      gram: "🧠 <b>Hiểu sâu</b>: Biết nói <code>No / I don't like...</code> để bảo vệ ý kiến cá nhân là bước rất quan trọng khi giao tiếp phản xạ!",
      hints: [`Let's talk about video games instead!`, `I prefer super fast cars and dinosaurs!`, `Surprise me with a funny story, Bobo!`]
    };
  }

  // 4. Bắt từ khóa nội dung trong câu của bé để hỏi sâu theo ngữ cảnh (Socratic Follow-up)
  const stopWords = new Set(["that", "this", "with", "have", "like", "love", "very", "want", "think", "about", "really", "because", "today", "yesterday", "going", "playing"]);
  const contentWords = userText
    .replace(/[^a-zA-Z\s']/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWords.has(w.toLowerCase()));
  const topicKeyword = contentWords.length > 0 ? contentWords[contentWords.length - 1] : null;

  if (topicKeyword) {
    const templates = [
      {
        reply: `Ooh, "${topicKeyword}"! 🤩 Imagine "${topicKeyword}" suddenly got a magical upgrade—what amazing thing could it do next?`,
        vi: `Ồ, "${topicKeyword}"! Hãy tưởng tượng "${topicKeyword}" đột nhiên được nâng cấp phép thuật—nó sẽ làm được điều kỳ diệu gì tiếp theo?`,
        gram: `🧠 <b>Hiểu sâu</b>: Mở rộng ý từ <b>"${topicKeyword}"</b> bằng cấu trúc <code>It can...</code> hoặc <code>It would...</code> giúp bạn phát triển trí tưởng tượng bằng tiếng Anh!`,
        hints: [`It can fly and glow in the dark!`, `It helps me finish my homework fast!`, `What would you do with ${topicKeyword}, Bobo?`]
      },
      {
        reply: `That's so interesting! 🌟 Why do you think "${topicKeyword}" is so cool, and who would you share it with?`,
        vi: `Thú vị thật đấy! Tại sao bạn thấy "${topicKeyword}" ngầu đến vậy, và bạn muốn chia sẻ nó với ai nhất?`,
        gram: `🧠 <b>Hiểu sâu</b>: Khi trả lời câu hỏi <b>Why</b> (Tại sao) và <b>Who</b> (Ai), bạn đang tập nối câu dài bằng <code>because...</code> và <code>with my...</code>!`,
        hints: [`Because it is super fun with my best friend!`, `I would share it with my family!`, `Have you ever seen ${topicKeyword}, Bobo?`]
      }
    ];
    const picked = templates[turnIdx % templates.length];
    turnIdx++;
    return picked;
  }

  return {
    reply: `I love how you said that! 🦖✨ Let's take our story one step further—what happens next in your imagination?`,
    vi: `Mình rất thích cách bạn diễn đạt câu vừa rồi! Hãy đưa câu chuyện đi xa thêm một bước nữa—chuyện gì xảy ra tiếp theo trong trí tưởng tượng của bạn?`,
    gram: explainGrammarLocally(userText),
    hints: [`Suddenly we discover a secret treasure!`, `Let's switch to a new adventure!`, `Ask me a riddle, Bobo!`]
  };
}

function sendChat() {
  const inp = document.getElementById("textInput"), v = inp.value.trim();
  if (!v) return;
  inp.value = "";
  handleChatInput(v, "text");
}

async function handleChatInput(text, inputMode = "voice") {
  const now = Date.now();
  if (text === lastSentKey && now - lastSentTime < 600) return;
  lastSentKey = text; lastSentTime = now;
  const latencyMs = Math.min(30000, Math.max(200, now - lastPromptShownAt));
  hintsVisible = false; renderDynamicHints();

  const localSignals = detectLocalGrammarSignals(text);
  const lb = save.localBehavior || createDefaultLocalBehavior();
  lb.speakAttempts = (lb.speakAttempts || 0) + 1;
  lb.events.unshift({
    event_type: "speak_attempt",
    latency_ms: latencyMs,
    metadata: { inputMode, text: text.slice(0, 60) },
    created_at: new Date().toISOString()
  });
  localSignals.forEach(sig => {
    if (!lb.skills[sig.skill]) lb.skills[sig.skill] = { skill_tag: sig.skill, mastery_score: 30, correct_count: 0, error_count: 0 };
    const sk = lb.skills[sig.skill];
    sk.mastery_score = Math.max(0, Math.min(100, sk.mastery_score + (sig.ok ? 8 : -10)));
    if (sig.ok) { sk.correct_count++; lb.grammarOk = (lb.grammarOk || 0) + 1; }
    else { sk.error_count++; lb.grammarError = (lb.grammarError || 0) + 1; }
    lb.events.unshift({
      event_type: sig.ok ? "grammar_ok" : "grammar_error",
      skill_tag: sig.skill,
      is_correct: sig.ok,
      metadata: { text: text.slice(0, 60) },
      created_at: new Date().toISOString()
    });
  });
  if (lb.events.length > 25) lb.events = lb.events.slice(0, 25);
  save.localBehavior = lb;
  persist();

  if (chatMode === "ai") {
    const requestedTopic = detectTopicRequest(text);
    if (requestedTopic && !save.authToken) {
      addChatMsg("me", save.lang === "vi" ? "Bạn" : "You", text);
      const tid = "think-" + Date.now();
      addChatMsg("other", "🦖 Bobo", `✨ Đang mở thế giới chủ đề "${requestedTopic}"...`, { id: tid, isLoading: true });
      const newTp = await createTopicObject(requestedTopic, "free", "");
      const el = document.getElementById(tid); if (el) el.remove();
      save.customTopics.unshift(newTp); persist();
      currentTopicId = newTp.id; turnIdx = 0; aiHistory = []; renderTopicBar();
      document.getElementById("grammarTitle").textContent = newTp.grammarName;
      document.getElementById("grammarExample").textContent = newTp.example;
      setDynamicHints(newTp.initialHints);
      addChatMsg("other", "🦖 Bobo", newTp.opener, {
        vi: newTp.openerVi || translateWordsLocally(newTp.opener),
        gram: newTp.openerGram || explainGrammarLocally(newTp.opener),
        hints: newTp.initialHints
      });
      speakText(newTp.opener, 0.94, true); addStars(2);
      lastPromptShownAt = Date.now();
      return;
    }

    const kidGram = checkLocalGrammar(text);
    addChatMsg("me", save.lang === "vi" ? "Bạn" : "You", text, { gram: kidGram });

    if (AI_CONFIG.PROXY_URL) {
      const tid = "think-" + Date.now();
      addChatMsg("other", "🦖 Bobo", "💭 Bobo đang nghĩ câu chuyện hay cho bạn...", { id: tid, isLoading: true });
      const res = await callAiProxyChat(text, inputMode, latencyMs);
      const el = document.getElementById(tid); if (el) el.remove();
      if (res && res.reply) {
        if (res.newTopic && res.newTopic.label) {
          const nt = {
            id: "c_" + Date.now(), label: "✨ " + res.newTopic.label,
            grammarName: res.newTopic.grammarName || "Phản xạ Tự Nhiên",
            example: res.newTopic.example || `"Let's explore ${res.newTopic.label}!"`,
            opener: res.reply, initialHints: res.suggestions || ["That sounds awesome!"], turns: [], targets: ["like", "is", "can"]
          };
          save.customTopics.unshift(nt); persist(); currentTopicId = nt.id; renderTopicBar();
        }
        if (typeof res.totalStars === "number") {
          save.stars = Math.max(save.stars, res.totalStars);
        }
        if (res.cefrLevel && save.kidProfile) {
          save.kidProfile.cefr_level = res.cefrLevel;
        }
        persist();

        updateDynamicGrammarSpotlight(res.reply, res.sentenceGrammar);

        const hints = res.suggestions || ["That is super cool!", "Tell me more, Bobo!", "Let's imagine what happens next!"];
        addChatMsg("other", "🦖 Bobo AI", res.reply, {
          vi: res.translationVi || translateWordsLocally(res.reply, res.vocab || {}),
          gram: res.sentenceGrammar || explainGrammarLocally(res.reply),
          vocab: res.vocab || {}, hints
        });
        speakText(res.reply, 0.94, true); setDynamicHints(hints);
        const banner = document.getElementById("feedbackBanner"); banner.style.display = "block";
        banner.style.background = "#f5f3ff"; banner.style.borderColor = "#c4b5fd"; banner.style.color = "#4c1d95";
        const pts = res.bonusStars === 2 ? 2 : 1; addStars(pts);
        banner.innerHTML = `${res.grammarTip || "🌟 Diễn đạt tự nhiên lắm!"} (+${pts} ⭐)`;
        lastPromptShownAt = Date.now();
        return;
      }
    }

    setTimeout(() => {
      const flex = buildFlexibleOfflineReply(text);
      updateDynamicGrammarSpotlight(flex.reply);
      addChatMsg("other", "🦖 Bobo", flex.reply, { vi: flex.vi, gram: flex.gram, hints: flex.hints });
      speakText(flex.reply, 0.94, true); setDynamicHints(flex.hints);
      lastPromptShownAt = Date.now();
    }, 380);
  } else {
    const nick = document.getElementById("myNickInput").value.trim() || "Me";
    const kidGram = checkLocalGrammar(text);
    addChatMsg("me", nick, text, { gram: kidGram });
    publishRoom({ type: "chat", sender: nick, text });
  }
}

// ================= 8. MQTT ONLINE ROOM =================
function cleanupMqtt() {
  activeConnToken++; clearInterval(joinRetryTimer);
  if (mqttClient) { try { mqttClient.removeAllListeners(); mqttClient.end(true); } catch (e) {} mqttClient = null; }
}

function publishRoom(payload) {
  if (!mqttClient || !mqttClient.connected || !currentRoomTopic) return;
  const msgId = myClientId + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  mqttClient.publish(currentRoomTopic, JSON.stringify({ ...payload, senderId: myClientId, msgId }));
}

function connectRoomMqtt(code, asHost, brokerIdx = 0) {
  if (typeof mqtt === "undefined") { alert("Need Internet!"); return; }
  cleanupMqtt(); seenMsgIds.clear();
  const myToken = activeConnToken;
  currentRoomCode = code; currentRoomTopic = `dinotalk/v6/room/${code}`; roomConnected = false;

  document.getElementById("roomJoinControls").classList.add("hidden");
  document.getElementById("inRoomRow").classList.remove("hidden");
  document.getElementById("myRoomCode").textContent = code;
  const statusEl = document.getElementById("onlineStatus");
  statusEl.style.color = "#d97706";
  statusEl.textContent = asHost ? t("status_creating") : t("status_joining") + code;

  let connectedOnce = false;
  const client = mqtt.connect(MQTT_BROKERS[brokerIdx], {
    clientId: myClientId + "_" + Math.floor(Math.random() * 999),
    clean: true, connectTimeout: 5000, reconnectPeriod: 0
  });
  mqttClient = client;

  const fallbackTimer = setTimeout(() => {
    if (myToken !== activeConnToken) return;
    if (!connectedOnce && brokerIdx + 1 < MQTT_BROKERS.length) connectRoomMqtt(code, asHost, brokerIdx + 1);
  }, 5200);

  client.on("connect", () => {
    if (myToken !== activeConnToken) return;
    connectedOnce = true; clearTimeout(fallbackTimer);
    client.subscribe(currentRoomTopic, err => {
      if (err || myToken !== activeConnToken) return;
      const myNick = document.getElementById("myNickInput").value.trim() || "Friend";
      if (asHost) { statusEl.textContent = t("status_waiting") + code; playTone(650); }
      else {
        publishRoom({ type: "join", nick: myNick });
        let tries = 0;
        joinRetryTimer = setInterval(() => {
          if (myToken !== activeConnToken || roomConnected || tries >= 4) {
            clearInterval(joinRetryTimer);
            if (myToken === activeConnToken && !roomConnected) { statusEl.style.color = "#dc2626"; statusEl.textContent = t("status_notfound") + code; }
            return;
          }
          tries++; publishRoom({ type: "join", nick: myNick });
        }, 1800);
      }
    });
  });

  client.on("message", (topic, message) => {
    if (myToken !== activeConnToken) return;
    let data; try { data = JSON.parse(message.toString()); } catch (e) { return; }
    if (!data || data.senderId === myClientId) return;
    if (data.msgId) {
      if (seenMsgIds.has(data.msgId)) return;
      seenMsgIds.add(data.msgId);
      if (seenMsgIds.size > 300) seenMsgIds.delete(seenMsgIds.values().next().value);
    }

    const myNick = document.getElementById("myNickInput").value.trim() || "Friend";
    if (data.type === "join") {
      onFriendConnected(data.nick);
      publishRoom({ type: "welcome", nick: myNick, topic: getCurrentTopic() });
    } else if (data.type === "welcome") {
      clearInterval(joinRetryTimer);
      onFriendConnected(data.nick);
      if (data.topic) syncReceivedTopic(data.topic);
    } else if (data.type === "bye") {
      roomConnected = false; endVideoCall(false);
      document.getElementById("connectedActionsRow").classList.add("hidden");
      statusEl.style.color = "#dc2626";
      statusEl.textContent = `🔴 ${data.nick || friendNick} ${t("friend_left_msg")}`;
      addChatMsg("other", "🌐 Room", `👋 ${data.nick || friendNick} ${t("friend_left_msg")}`);
    } else if (data.type === "chat") {
      const hints = ["Nice! I love that idea!", "Haha, really? Why?", "What should we do next?"];
      addChatMsg("other", data.sender, data.text, { hints });
      playTone(620); speakText(data.text, 0.94, false);
      setDynamicHints(hints);
    } else if (data.type === "sync_topic" && data.topic) {
      syncReceivedTopic(data.topic);
    } else if (data.type === "race_invite") {
      pendingInviteDeck = data.deck;
      document.getElementById("inviteText").textContent = `⚡ ${data.from || friendNick} ${t("invite_msg")}`;
      document.getElementById("inviteModal").classList.remove("hidden");
      playFanfare();
    } else if (data.type === "race_accept") {
      switchTab("race"); startCountdownAndRace(pendingInviteDeck);
    } else if (data.type === "race_decline") {
      if (!document.getElementById("screenRace").classList.contains("hidden")) renderRaceWelcome();
      alert(t("race_declined"));
    } else if (data.type === "race_score") {
      raceRivalScore = data.score; updateRaceTrackUI();
    } else if (data.type === "rtc_offer") handleIncomingOffer(data.sdp, data.from);
    else if (data.type === "rtc_answer") handleRtcAnswer(data.sdp);
    else if (data.type === "rtc_ice") handleRtcIce(data.candidate);
    else if (data.type === "rtc_reject") { endVideoCall(false); alert(t("vid_rejected")); }
    else if (data.type === "rtc_end") endVideoCall(false);
  });
}

function onFriendConnected(nick) {
  roomConnected = true; friendNick = nick || "Friend";
  const statusEl = document.getElementById("onlineStatus");
  statusEl.style.color = "#059669"; statusEl.textContent = t("status_connected") + friendNick + "!";
  document.getElementById("connectedActionsRow").classList.remove("hidden");
  updateRemoteCamLabel();
  document.getElementById("raceRivalLabel").textContent = "👧 " + friendNick;
  playFanfare();
}

function leaveRoom() {
  const myNick = document.getElementById("myNickInput").value.trim() || "Friend";
  if (mqttClient && mqttClient.connected) publishRoom({ type: "bye", nick: myNick });
  endVideoCall(false); cleanupMqtt(); roomConnected = false; currentRoomCode = ""; currentRoomTopic = "";
  document.getElementById("inRoomRow").classList.add("hidden");
  document.getElementById("connectedActionsRow").classList.add("hidden");
  document.getElementById("roomJoinControls").classList.remove("hidden");
  document.getElementById("inviteModal").classList.add("hidden");
  document.getElementById("incomingCallModal").classList.add("hidden");
  const statusEl = document.getElementById("onlineStatus");
  statusEl.style.color = "#64748b"; statusEl.textContent = t("status_left");
  playTone(400, 0.1);
}

function syncReceivedTopic(tp) {
  if (!getAllTopics().some(x => String(x.id) === String(tp.id))) { save.customTopics.push(tp); persist(); }
  selectTopic(tp.id, false);
}

function createRoom() { connectRoomMqtt(Math.floor(1000 + Math.random() * 9000).toString(), true, 0); }
function joinRoom() {
  const code = document.getElementById("joinCodeInput").value.trim();
  if (!/^\d{4}$/.test(code)) { alert(save.lang === "vi" ? "Nhập đúng mã 4 số!" : "Enter 4 digits!"); return; }
  connectRoomMqtt(code, false, 0);
}

// ================= 9. 1-SCREEN SPLIT CAMERA & WEBRTC (FIXED MOBILE/WAP) =================
function getIceServers() {
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    ...(AI_CONFIG.TURN_SERVERS || [])
  ];
}

function tryPlayRemoteVideo() {
  const rv = document.getElementById("remoteVideo");
  const unmuteBtn = document.getElementById("unmuteVideoBtn");
  if (!rv || !rv.srcObject) return;

  rv.setAttribute("playsinline", "true");
  rv.setAttribute("webkit-playsinline", "true");

  const playPromise = rv.play();
  if (playPromise && typeof playPromise.then === "function") {
    playPromise.then(() => {
      if (!rv.muted && unmuteBtn) unmuteBtn.classList.add("hidden");
    }).catch(() => {
      rv.muted = true;
      rv.play().catch(() => {});
      if (unmuteBtn) unmuteBtn.classList.remove("hidden");
    });
  }
}

function unmuteRemoteVideo() {
  const rv = document.getElementById("remoteVideo");
  const unmuteBtn = document.getElementById("unmuteVideoBtn");
  if (!rv) return;
  rv.muted = false;
  rv.play().catch(() => {});
  if (unmuteBtn) unmuteBtn.classList.add("hidden");
}

async function getMediaSafe() {
  if (isListening && recognition) { try { recognition.stop(); } catch (e) {} }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    openCamPermModal(true, "no_https");
    return null;
  }
  if (localStream) return localStream;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode, width: { ideal: 640 }, height: { ideal: 480 } },
      audio: { echoCancellation: true, noiseSuppression: true }
    });
    updateCamBadge("granted");
  } catch (e1) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      updateCamBadge("granted");
    } catch (e2) {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      } catch (err) {
        updateCamBadge("denied");
        openCamPermModal(true, "denied");
        return null;
      }
    }
  }

  micEnabled = true;
  camEnabled = localStream.getVideoTracks().length > 0;
  const lv = document.getElementById("localVideo");
  lv.srcObject = localStream;
  lv.setAttribute("playsinline", "true");
  lv.setAttribute("webkit-playsinline", "true");
  lv.muted = true;
  lv.play().catch(() => {});

  document.getElementById("videoStage").classList.remove("hidden");
  updateMediaBtns();
  return localStream;
}

async function switchCamera() {
  if (!localStream) return;
  currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
  try {
    const newCamStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode },
      audio: false
    });
    const newTrack = newCamStream.getVideoTracks()[0];
    const oldTrack = localStream.getVideoTracks()[0];
    if (oldTrack) { localStream.removeTrack(oldTrack); oldTrack.stop(); }
    localStream.addTrack(newTrack);
    const lv = document.getElementById("localVideo");
    lv.style.transform = currentFacingMode === "user" ? "scaleX(-1)" : "none";
    lv.srcObject = localStream;
    lv.play().catch(() => {});
    if (rtcPc) {
      const sender = rtcPc.getSenders().find(s => s.track && s.track.kind === "video");
      if (sender) await sender.replaceTrack(newTrack);
    }
    playTone(640, 0.08);
  } catch (e) {
    currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
  }
}

function createPeerConnection() {
  if (rtcPc) rtcPc.close();
  rtcPc = new RTCPeerConnection({
    iceServers: getIceServers(),
    iceCandidatePoolSize: 4
  });
  remoteStream = null;

  const rv = document.getElementById("remoteVideo");
  rv.srcObject = null;
  rv.muted = false;
  rv.setAttribute("playsinline", "true");
  rv.setAttribute("webkit-playsinline", "true");

  if (localStream) {
    localStream.getTracks().forEach(tr => rtcPc.addTrack(tr, localStream));
  }

  rtcPc.ontrack = ev => {
    if (ev.streams && ev.streams[0]) {
      if (rv.srcObject !== ev.streams[0]) {
        rv.srcObject = ev.streams[0];
      }
    } else if (ev.track) {
      if (!remoteStream) remoteStream = new MediaStream();
      remoteStream.addTrack(ev.track);
      if (rv.srcObject !== remoteStream) rv.srcObject = remoteStream;
    }

    if (ev.track) {
      ev.track.onunmute = () => tryPlayRemoteVideo();
    }
    document.getElementById("videoStage").classList.remove("hidden");
    tryPlayRemoteVideo();
  };

  rtcPc.oniceconnectionstatechange = () => {
    const st = rtcPc ? rtcPc.iceConnectionState : "";
    const txt = document.getElementById("videoStatusText");
    if (st === "connected" || st === "completed") {
      txt.textContent = t("vid_connected");
      txt.style.color = "#4ade80";
      tryPlayRemoteVideo();
    } else if (st === "failed" || st === "disconnected") {
      txt.textContent = t("vid_failed");
      txt.style.color = "#fbbf24";
    } else if (st === "checking") {
      txt.textContent = t("vid_connecting");
      txt.style.color = "#e2e8f0";
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

async function startVideoCall() {
  if (!roomConnected) return;
  if (rtcPc) { endVideoCall(true); return; }
  pendingCandidates = [];
  const stream = await getMediaSafe();
  if (!stream) return;

  const txt = document.getElementById("videoStatusText");
  txt.textContent = stream.getVideoTracks().length > 0
    ? t("vid_ringing")
    : "⚠️ Thiết bị không có Camera (chỉ gọi tiếng)...";
  txt.style.color = "#fde047";

  createPeerConnection();
  const offer = await rtcPc.createOffer();
  await rtcPc.setLocalDescription(offer);
  const myNick = document.getElementById("myNickInput").value.trim() || "Friend";
  publishRoom({
    type: "rtc_offer",
    sdp: { type: offer.type, sdp: offer.sdp },
    from: myNick
  });
}

function handleIncomingOffer(sdp, callerName) {
  incomingOfferSdp = sdp;
  document.getElementById("incomingCallText").textContent = `📹 ${callerName || friendNick} ${t("incoming_call_msg")}`;
  document.getElementById("incomingCallModal").classList.remove("hidden");
  playFanfare();
}

async function acceptIncomingCall() {
  document.getElementById("incomingCallModal").classList.add("hidden");
  if (!incomingOfferSdp) return;

  const rv = document.getElementById("remoteVideo");
  if (rv) { rv.muted = false; }

  const stream = await getMediaSafe();
  if (!stream) {
    publishRoom({ type: "rtc_reject" });
    incomingOfferSdp = null;
    pendingCandidates = [];
    return;
  }

  document.getElementById("videoStatusText").textContent = t("vid_connecting");
  document.getElementById("videoStatusText").style.color = "#e2e8f0";

  createPeerConnection();
  await rtcPc.setRemoteDescription(new RTCSessionDescription(incomingOfferSdp));
  incomingOfferSdp = null;

  for (const c of pendingCandidates) {
    try { await rtcPc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
  }
  pendingCandidates = [];

  const ans = await rtcPc.createAnswer();
  await rtcPc.setLocalDescription(ans);
  publishRoom({
    type: "rtc_answer",
    sdp: { type: ans.type, sdp: ans.sdp }
  });
  tryPlayRemoteVideo();
}

function rejectIncomingCall() {
  document.getElementById("incomingCallModal").classList.add("hidden");
  incomingOfferSdp = null;
  pendingCandidates = [];
  publishRoom({ type: "rtc_reject" });
}

async function handleRtcAnswer(sdp) {
  if (!rtcPc) return;
  document.getElementById("videoStatusText").textContent = t("vid_connecting");
  await rtcPc.setRemoteDescription(new RTCSessionDescription(sdp));
  for (const c of pendingCandidates) {
    try { await rtcPc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
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
  try { await rtcPc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
}

function toggleMediaTrack(kind) {
  if (!localStream) return;
  if (kind === "audio") {
    micEnabled = !micEnabled;
    localStream.getAudioTracks().forEach(tr => tr.enabled = micEnabled);
  } else {
    camEnabled = !camEnabled;
    localStream.getVideoTracks().forEach(tr => tr.enabled = camEnabled);
  }
  updateMediaBtns();
}

function updateMediaBtns() {
  document.getElementById("toggleMicTrackBtn").textContent = micEnabled ? "🎤 Mic ON" : "🔇 Mic OFF";
  document.getElementById("toggleCamTrackBtn").textContent = camEnabled ? "📷 Cam ON" : "🚫 Cam OFF";
}

function endVideoCall(notify = false) {
  if (notify && roomConnected) publishRoom({ type: "rtc_end" });
  incomingOfferSdp = null;
  pendingCandidates = [];
  remoteStream = null;
  if (rtcPc) { rtcPc.close(); rtcPc = null; }
  if (localStream) { localStream.getTracks().forEach(tr => tr.stop()); localStream = null; }
  const lv = document.getElementById("localVideo");
  const rv = document.getElementById("remoteVideo");
  if (lv) lv.srcObject = null;
  if (rv) rv.srcObject = null;
  const unmuteBtn = document.getElementById("unmuteVideoBtn");
  if (unmuteBtn) unmuteBtn.classList.add("hidden");
  document.getElementById("videoStage").classList.add("hidden");
  document.getElementById("incomingCallModal").classList.add("hidden");
}

// ================= 10. RACE GAME SHOW =================
function updateRaceTrackUI() {
  document.getElementById("raceMyScore").textContent = raceMyScore;
  document.getElementById("raceRivalScore").textContent = raceRivalScore;
  const maxPts = Math.max(100, raceQuestions.length * 20);
  document.getElementById("raceMyRunner").style.left = Math.min(88, 2 + Math.round((raceMyScore / maxPts) * 86)) + "%";
  document.getElementById("raceRivalRunner").style.left = Math.min(88, 2 + Math.round((raceRivalScore / maxPts) * 86)) + "%";
}

function renderRaceWelcome() {
  clearInterval(raceTimer); clearInterval(raceCountdownTimer);
  raceQuestions = []; raceMyScore = 0; raceRivalScore = 0;
  document.getElementById("raceMyLabel").textContent = "🧒 " + (document.getElementById("myNickInput").value.trim() || "Bạn");
  document.getElementById("raceRivalLabel").textContent = roomConnected ? ("👧 " + friendNick) : "🦖 Bobo";
  document.getElementById("raceRivalRunner").textContent = roomConnected ? "👧" : "🦖";
  updateRaceTrackUI();

  document.getElementById("raceStage").innerHTML = `
    <div style="font-size:3rem;">🏆🏁</div>
    <h2 style="margin:8px 0;">${t("race_welcome_title")}</h2>
    <p style="color:var(--muted); font-weight:700;">${roomConnected ? t("race_welcome_desc_online") : t("race_welcome_desc_solo")}</p>
    <div class="row center" style="margin-top:12px;">
      ${roomConnected
        ? `<button class="btn btn-yellow btn-lg" onclick="sendRaceInvite()">${t("race_invite_btn")}</button>`
        : `<button class="btn btn-blue btn-lg" onclick="startSoloRace()">${t("race_start_solo")}</button>`
      }
    </div>
  `;
}

function sendRaceInvite() {
  if (!roomConnected) { switchTab("race"); startSoloRace(); return; }
  pendingInviteDeck = [...RACE_POOL].sort(() => Math.random() - 0.5).slice(0, 6);
  const myNick = document.getElementById("myNickInput").value.trim() || "Friend";
  publishRoom({ type: "race_invite", from: myNick, deck: pendingInviteDeck });
  switchTab("race");
  document.getElementById("raceStage").innerHTML = `
    <div style="font-size:2.8rem;">📨✨</div>
    <h3>${t("race_waiting_accept")}</h3>
    <button class="btn btn-soft" onclick="renderRaceWelcome()">${t("btn_cancel")}</button>
  `;
}
function acceptRaceInvite() { document.getElementById("inviteModal").classList.add("hidden"); publishRoom({ type: "race_accept" }); switchTab("race"); startCountdownAndRace(pendingInviteDeck); }
function declineRaceInvite() { document.getElementById("inviteModal").classList.add("hidden"); publishRoom({ type: "race_decline" }); }
function startSoloRace() { startCountdownAndRace([...RACE_POOL].sort(() => Math.random() - 0.5).slice(0, 6)); }

function startCountdownAndRace(deck) {
  clearInterval(raceCountdownTimer);
  let count = 3;
  const renderCount = () => {
    document.getElementById("raceStage").innerHTML = `<div style="font-size:4rem; font-weight:800; color:var(--purple);">${count > 0 ? count : "GO! 🚀"}</div>`;
    playTone(count > 0 ? 520 : 880, 0.14);
  };
  renderCount();
  raceCountdownTimer = setInterval(() => {
    count--; if (count < 0) { clearInterval(raceCountdownTimer); beginRaceWithQuestions(deck); } else renderCount();
  }, 750);
}

function beginRaceWithQuestions(deck) {
  raceQuestions = deck; raceIdx = 0; raceMyScore = 0; raceRivalScore = 0; raceStreak = 0; raceFinished = false;
  updateRaceTrackUI(); renderRaceQuestion();
}

function renderRaceQuestion() {
  clearInterval(raceTimer);
  if (raceIdx >= raceQuestions.length) { finishRace(); return; }
  raceLocked = false;
  raceQuestionStartAt = Date.now();
  const item = raceQuestions[raceIdx], st = document.getElementById("raceStage");
  const streakHtml = raceStreak >= 2 ? `<span style="background:#fef3c7; color:#b45309; padding:3px 10px; border-radius:999px;">🔥 x${raceStreak}</span>` : "";

  if (item.type === "quiz") {
    st.innerHTML = `
      <div class="row center" style="font-weight:800; color:var(--purple); margin-bottom:8px;"><span>${raceIdx + 1} / ${raceQuestions.length}</span> ${streakHtml}</div>
      <h3 style="margin:0 0 10px; font-size:1.2rem;">${item.q}</h3>
      <div class="opt-list">${item.opts.map((o, i) => `<button class="opt-btn" onclick="pickRaceOpt(${i}, this)">${["A","B","C"][i]}. ${o}</button>`).join("")}</div>
      <div id="raceMsg" style="margin-top:12px; font-weight:800;"></div>
    `;
  } else {
    st.innerHTML = `
      <div class="row center" style="font-weight:800; color:var(--purple); margin-bottom:8px;"><span>${raceIdx + 1} / ${raceQuestions.length}</span> ${streakHtml}</div>
      <h3 style="margin:0 0 10px;">${item.q}</h3>
      <div style="font-size:1.3rem; font-weight:800; background:#f5f3ff; color:#4c1d95; padding:14px; border-radius:16px; margin-bottom:14px;">"${item.target}"</div>
      <div class="row center">
        <button class="btn btn-soft" onclick="speakText('${item.target}')">${t("race_hear_btn")}</button>
        <button class="btn btn-coral" id="raceMicBtn" onclick="toggleMic('race')">${t("race_speak_btn")}</button>
      </div>
      <div id="raceMsg" style="margin-top:12px; font-weight:800;"></div>
    `;
    speakText(item.target);
  }

  raceTimeLeft = 15;
  document.getElementById("raceTimerBar").style.width = "100%";
  raceTimer = setInterval(() => {
    raceTimeLeft -= 0.25;
    document.getElementById("raceTimerBar").style.width = Math.max(0, (raceTimeLeft / 15) * 100) + "%";
    if (raceTimeLeft <= 0) {
      clearInterval(raceTimer);
      if (!raceLocked) { raceLocked = true; raceStreak = 0; botScoreStep(); setTimeout(() => { raceIdx++; renderRaceQuestion(); }, 1000); }
    }
  }, 250);
}

function botScoreStep() { if (!roomConnected && Math.random() > 0.35) { raceRivalScore += 12; updateRaceTrackUI(); } }
function addRaceScore(pts) { raceMyScore += pts; updateRaceTrackUI(); if (roomConnected) publishRoom({ type: "race_score", score: raceMyScore }); }

function pickRaceOpt(idx, btn) {
  if (raceLocked) return; raceLocked = true; clearInterval(raceTimer);
  const item = raceQuestions[raceIdx], all = document.querySelectorAll(".opt-btn");
  const isCorrect = idx === item.ans;
  const latencyMs = Date.now() - raceQuestionStartAt;

  trackBehaviorEvent("race_answer", {
    skillTag: item.skill || null,
    isCorrect,
    latencyMs,
    metadata: { q: item.q }
  });

  if (isCorrect) {
    btn.classList.add("correct"); raceStreak++;
    const pts = Math.max(10, Math.round(raceTimeLeft + 5)) + (raceStreak >= 2 ? 5 : 0);
    addRaceScore(pts); addStars(1); playFanfare();
    document.getElementById("raceMsg").innerHTML = `<span style="color:#059669;">+${pts} pts! 🎉</span>`;
  } else {
    raceStreak = 0; btn.classList.add("wrong"); all[item.ans].classList.add("correct"); playTone(210, 0.22);
  }
  botScoreStep();
  setTimeout(() => { raceIdx++; renderRaceQuestion(); }, 1250);
}

function finishRace() {
  clearInterval(raceTimer); if (raceFinished) return; raceFinished = true;
  let title = t("race_lose");
  if (raceMyScore > raceRivalScore) { title = t("race_win"); addStars(5); launchConfetti(); playFanfare(); }
  else if (raceMyScore === raceRivalScore) { title = t("race_tie"); addStars(3); playFanfare(); }
  document.getElementById("raceStage").innerHTML = `
    <div style="font-size:3.3rem;">${raceMyScore >= raceRivalScore ? "🏆🎊" : "🦖💪"}</div>
    <h2>${title}</h2>
    <p style="font-weight:800; font-size:1.2rem;">${raceMyScore} vs ${raceRivalScore}</p>
    <button class="btn btn-blue" onclick="${roomConnected ? "sendRaceInvite()" : "startSoloRace()"}">${t("race_again")}</button>
  `;
}

// ================= 11. CUSTOM TOPICS =================
async function createTopicObject(name, gram = "free", kw = "") {
  const gramMap = {
    like: { name: "Cảm xúc & Sở thích tự nhiên", ex: `"I really love ${name} because it's exciting!"`, hints: [`I love ${name} so much!`, `What is your favorite thing about ${name}, Bobo?`], targets: ["like", "love", "because"] },
    can: { name: "Đặc điểm & Siêu năng lực (has / can)", ex: `"In ${name}, we can do amazing tricks!"`, hints: [`It has a secret power!`, `We can fly and explore together!`], targets: ["has", "have", "can"] },
    ing: { name: "Hành động sống động (am/is/are + V-ing)", ex: `"We are exploring the world of ${name}!"`, hints: [`I am building something cool in ${name}!`, `Look! Something magical is happening!`], targets: ["am", "is", "are", "ing"] },
    past: { name: "Kể chuyện & Trải nghiệm (Past & Story)", ex: `"Yesterday I had an awesome adventure with ${name}!"`, hints: [`Yesterday I discovered something cool about ${name}!`, `It was the best day ever!`], targets: ["went", "saw", "was", "played"] },
    free: { name: "Phản xạ Tự Do & Mở rộng ý", ex: `"Let's imagine an adventure with ${name}!"`, hints: [`I have a cool idea about ${name}!`, `Imagine we are inside ${name} right now!`, `What do you think about ${name}, Bobo?`], targets: ["is", "like", "have", "can"] }
  };
  const g = gramMap[gram] || gramMap.free;

  let topicObj = {
    id: "c_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    label: "✨ " + name, grammarName: g.name, example: g.ex,
    opener: `Whoa, ${name}! 🤩🦖 ${kw ? `(With ${kw}!) ` : ""}Imagine you and I just stepped into the world of ${name} right now—what is the first cool thing we do?`,
    openerVi: `Chà, ${name}! 🤩🦖 Hãy tưởng tượng bạn và mình vừa bước vào thế giới của ${name} ngay lúc này—điều ngầu đầu tiên tụi mình sẽ làm là gì?`,
    openerGram: `🧠 <b>Hiểu sâu</b>: Trong thế giới "${name}", bạn cứ thoải mái nói ý tưởng của mình, Bobo sẽ cùng bạn phát triển câu chuyện!`,
    initialHints: g.hints,
    turns: [],
    targets: g.targets
  };

  const aiTopic = await callAiProxyTopic(name, g.name, kw);
  if (aiTopic && aiTopic.opener) topicObj = { ...topicObj, ...aiTopic, id: topicObj.id, label: "✨ " + name, grammarName: g.name };
  return topicObj;
}

async function createCustomTopic() {
  const name = document.getElementById("customTopicName").value.trim();
  const gram = document.getElementById("customGrammar").value;
  const kw = document.getElementById("customKeywords").value.trim();
  if (!name) { alert(save.lang === "vi" ? "Hãy nhập tên thế giới hoặc chủ đề bé thích nhé!" : "Please enter a topic name!"); return; }

  const btn = document.getElementById("createTopicBtn"); btn.disabled = true; btn.textContent = "⏳...";
  const topicObj = await createTopicObject(name, gram, kw);

  save.customTopics.unshift(topicObj); persist();
  btn.disabled = false; btn.textContent = t("btn_create_topic");
  document.getElementById("customTopicName").value = "";
  document.getElementById("customKeywords").value = "";
  renderCustomTopicsList(); renderTopicBar();
  selectTopic(topicObj.id, true); switchTab("chat");
}

function renderCustomTopicsList() {
  const list = document.getElementById("customTopicList");
  const delAllBtn = document.getElementById("deleteAllTopicsBtn");
  list.innerHTML = "";
  if (save.customTopics.length === 0) {
    delAllBtn.classList.add("hidden");
    list.innerHTML = `<div style="color:var(--muted); font-size:0.9rem;">${t("no_custom")}</div>`;
    return;
  }
  delAllBtn.classList.remove("hidden");
  save.customTopics.forEach(tp => {
    const row = document.createElement("div"); row.className = "custom-item";
    const info = document.createElement("div");
    const titleEl = document.createElement("strong"); titleEl.textContent = tp.label;
    const gramEl = document.createElement("span"); gramEl.style.cssText = "color:var(--muted);font-size:0.84rem;"; gramEl.textContent = " (" + tp.grammarName + ")";
    info.appendChild(titleEl); info.appendChild(gramEl);

    const actions = document.createElement("div"); actions.className = "row";
    const useBtn = document.createElement("button"); useBtn.className = "btn btn-blue btn-sm";
    useBtn.textContent = t("use_topic");
    useBtn.onclick = () => { selectTopic(tp.id, true); switchTab("chat"); };

    const delBtn = document.createElement("button"); delBtn.className = "btn btn-coral btn-sm";
    delBtn.textContent = t("btn_delete");
    delBtn.onclick = () => deleteCustomTopic(tp.id);

    actions.appendChild(useBtn); actions.appendChild(delBtn);
    row.appendChild(info); row.appendChild(actions);
    list.appendChild(row);
  });
}

function deleteCustomTopic(id) {
  save.customTopics = save.customTopics.filter(x => String(x.id) !== String(id));
  const wasCurrent = String(currentTopicId) === String(id);
  if (wasCurrent) currentTopicId = BUILTIN_TOPICS[0].id;
  persist(); renderCustomTopicsList(); renderTopicBar();
  if (wasCurrent) selectTopic(BUILTIN_TOPICS[0].id, false);
  playTone(420, 0.08);
}

function deleteAllCustomTopics() {
  if (!confirm(t("confirm_delete_all"))) return;
  const hadCurrent = save.customTopics.some(x => String(x.id) === String(currentTopicId));
  save.customTopics = [];
  if (hadCurrent) currentTopicId = BUILTIN_TOPICS[0].id;
  persist(); renderCustomTopicsList(); renderTopicBar();
  if (hadCurrent) selectTopic(BUILTIN_TOPICS[0].id, false);
}

// ================= 12. AI ORCHESTRATOR PROXY & VOICE RECOGNITION =================
async function callAiProxyChat(userText, inputMode = "voice", latencyMs = null) {
  const tp = getCurrentTopic();

  // 1. Call Production Backend (/api/agent/chat) with JWT Authorization if logged in
  if (save.authToken && AI_CONFIG.PROXY_URL) {
    try {
      const res = await fetch(AI_CONFIG.PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${save.authToken}`
        },
        body: JSON.stringify({
          topicId: tp.id,
          topicTitle: tp.label,
          grammarTarget: tp.grammarName,
          userText,
          inputMode,
          latencyMs
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.reply) {
          aiHistory.push({ role: "user", parts: [{ text: userText }] }, { role: "model", parts: [{ text: data.reply }] });
          return data;
        }
      } else {
        console.warn(`[Bobo] Backend trả HTTP ${res.status} → dùng Cloudflare Worker (không có Gemini key + RAG của .env)`);
      }
    } catch (e) {
      console.warn(`[Bobo] Không gọi được backend ${AI_CONFIG.PROXY_URL}: ${e.message} → dùng Cloudflare Worker`);
    }
  } else {
    console.warn("[Bobo] Chưa đăng nhập → bỏ qua backend (Gemini key + RAG của .env), gọi thẳng Cloudflare Worker");
  }

  // 2. Fallback to Cloudflare Worker Proxy with Socratic & Deep Natural Learning instructions
  if (AI_CONFIG.FALLBACK_PROXY_URL) {
    try {
      const res = await fetch(AI_CONFIG.FALLBACK_PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          topic: `${tp.label} (Open-ended Socratic Roleplay — Follow the child's topic freely! If they make a grammar mistake, recast it naturally in your reply)`,
          grammar: `${tp.grammarName} (Explain the deep mental intuition in Vietnamese in sentenceGrammar, never use rigid formulaic drills)`,
          lang: save.lang,
          history: aiHistory.slice(-8),
          userText
        })
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.reply) {
        aiHistory.push({ role: "user", parts: [{ text: userText }] }, { role: "model", parts: [{ text: data.reply }] });
      }
      return data;
    } catch (e) { return null; }
  }
  return null;
}

async function callAiProxyTopic(name, grammar, kw) {
  if (!AI_CONFIG.FALLBACK_PROXY_URL) return null;
  try {
    const res = await fetch(AI_CONFIG.FALLBACK_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "topic", name, grammar, keywords: kw })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

function toggleMic(ctx) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert("Use Google Chrome or Safari/Edge for voice!"); return; }
  if (isListening && recognition) { recognition.stop(); return; }

  micContext = ctx;
  recognition = new SR();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let sessionHandled = false;
  const btn = ctx === "chat" ? document.getElementById("micBtn") : document.getElementById("raceMicBtn");
  isListening = true;
  if (btn) { btn.classList.add("listening"); btn.textContent = "👂 Đang nghe bé nói..."; }
  playTone(500);

  recognition.onresult = e => {
    if (sessionHandled) return;
    sessionHandled = true;
    const spoken = e.results[0][0].transcript;
    if (micContext === "chat") {
      handleChatInput(spoken, "voice");
    } else if (micContext === "race" && !raceLocked) {
      raceLocked = true; clearInterval(raceTimer);
      const item = raceQuestions[raceIdx];
      const words = item.target.toLowerCase().split(/\s+/);
      const hits = words.filter(w => spoken.toLowerCase().includes(w)).length;
      const isCorrect = hits >= Math.ceil(words.length * 0.5);
      const latencyMs = Date.now() - raceQuestionStartAt;

      trackBehaviorEvent("race_answer", {
        skillTag: item.skill || null,
        isCorrect,
        latencyMs,
        metadata: { target: item.target, spoken }
      });

      if (isCorrect) {
        raceStreak++;
        const pts = Math.max(12, Math.round(raceTimeLeft + 8)) + (raceStreak >= 2 ? 5 : 0);
        addRaceScore(pts); addStars(2); playFanfare();
        document.getElementById("raceMsg").innerHTML = `<span style="color:#059669;">🌟 "${spoken}" (+${pts} pts!)</span>`;
      } else {
        raceStreak = 0; playTone(210, 0.2);
        document.getElementById("raceMsg").innerHTML = `<span style="color:#dc2626;">🎤 "${spoken}"</span>`;
      }
      botScoreStep();
      setTimeout(() => { raceIdx++; renderRaceQuestion(); }, 1300);
    }
  };

  recognition.onerror = () => {};
  recognition.onend = () => {
    isListening = false;
    const b1 = document.getElementById("micBtn");
    if (b1) { b1.classList.remove("listening"); b1.innerHTML = `🎤 <span>${t("btn_speak_big")}</span>`; }
    const b2 = document.getElementById("raceMicBtn");
    if (b2) { b2.classList.remove("listening"); b2.textContent = t("race_speak_btn"); }
  };
  recognition.start();
}

// ================= 13. INIT =================
if (save.kidProfile && save.kidProfile.nickname) {
  const nickInp = document.getElementById("myNickInput");
  if (nickInp) nickInp.value = save.kidProfile.nickname;
}
persist();
setLang(save.lang || "vi");
selectTopic("free_discovery");
checkCameraOnStartup();
