// ==========================================================================
// CHICKEN TALK — Worlds Catalog & "The Missing Puppy" Mission Script
// Runs 100% deterministically in browser with zero external AI credentials.
// ==========================================================================

(function () {
  const WORLDS = [
    {
      id: "magic_garden",
      number: 1,
      icon: "🌿",
      themeColor: "mint",
      name: "The Magic Garden",
      nameVi: "Khu Vườn Phép Thuật",
      missionTitle: "The Missing Puppy",
      missionTitleVi: "Tìm Chú Cún Milo",
      status: "playable",
      duration: "10–15 min",
      desc: "Milo chased a butterfly into the Magic Garden! Team up, share clues, and bring Milo home.",
      descVi: "Cún Milo đuổi theo chú bướm vào Khu Vườn Phép Thuật! Cùng bạn chia sẻ manh mối tìm Milo nhé!",
      targets: ["Where is...?", "I see...", "Go left / right", "Behind the tree", "Let's go!"],
      badge: { id: "puppy_rescuers", icon: "🐶", name: "Puppy Rescuers", nameVi: "Đội Giải Cứu Milo" }
    },
    {
      id: "my_little_home",
      number: 2,
      icon: "🏡",
      themeColor: "yellow",
      name: "My Little Home",
      nameVi: "Ngôi Nhà Nhỏ Của Mình",
      missionTitle: "Decorate Together",
      missionTitleVi: "Trang Trí Nhà Ấm Áp",
      status: "planned",
      duration: "10–15 min",
      desc: "Pick cozy colors, arrange furniture, and decorate a dream room together with your buddy.",
      descVi: "Cùng bạn chọn màu sắc, sắp xếp đồ đạc và trang trí căn nhà nhỏ thật xinh!",
      targets: ["I like...", "Can you help me?", "Put it here", "What color?", "Let's build together"],
      badge: { id: "home_builders", icon: "🏡", name: "Cozy Builders", nameVi: "Kiến Trúc Sư Nhí" }
    },
    {
      id: "happy_food_market",
      number: 3,
      icon: "🧺",
      themeColor: "coral",
      name: "Happy Food Market",
      nameVi: "Khu Chợ Món Ngon",
      missionTitle: "Friendship Party Prep",
      missionTitleVi: "Đi Chợ Chuẩn Bị Tiệc",
      status: "planned",
      duration: "10–15 min",
      desc: "Role-play friendly shopping to gather yummy fruits and treats for a garden picnic party!",
      descVi: "Nhập vai đi chợ mua trái cây và đồ ngon để chuẩn bị bữa tiệc tình bạn thật vui!",
      targets: ["Can I have...?", "How many?", "Here you go", "Thank you", "I want..."],
      badge: { id: "party_chefs", icon: "🍓", name: "Party Chefs", nameVi: "Đầu Bếp Tiệc Vui" }
    }
  ];

  const MISSING_PUPPY_STAGES = [
    {
      step: 0,
      id: "garden_gate",
      title: "1. The Garden Gate",
      titleVi: "1. Cổng Khu Vườn",
      targetPhrase: "Where is Milo? Go left!",
      goalKeywords: ["where", "milo", "puppy", "dog", "left", "go", "let's go", "lets go", "path", "flower", "meadow"],
      requiredHotspot: "left_path",
      mapScoutClue: "🗺️ Your Map shows TWO paths: LEFT goes to Rainbow Meadow, RIGHT goes to Rocky Hill.",
      mapScoutClueVi: "🗺️ Bản đồ của bé có 2 lối: Trái (LEFT) tới Bụi Hoa Cầu Vồng, Phải (RIGHT) tới Đồi Đá.",
      clueSpotterClue: "🔎 Your Paw-Print Lens spots fresh puppy paw prints turning LEFT!",
      clueSpotterClueVi: "🔎 Kính lúp phát hiện dấu chân cún mới tinh rẽ sang TRÁI (LEFT)!",
      chickyIntro: "Hi explorers! Milo ran into the Magic Garden! Ask your buddy where to go — Left or Right?",
      chickyIntroVi: "Chào nhà thám hiểm! Milo chạy vào khu vườn rồi! Cùng bạn chọn đường đi sang trái (left) nhé!",
      buddyAsSpotter: "Ooh! My lens sees tiny paw prints going LEFT! Tell me 'Go left!' or 'Let's go!' and tap the LEFT sign!",
      buddyAsScout: "I have the garden map! There is a LEFT path and a RIGHT path. Where is Milo? What do you see?",
      pictureCards: [
        { icon: "❓", label: "Where is Milo?", phrase: "Where is Milo?" },
        { icon: "⬅️", label: "Go left!", phrase: "Go left!" },
        { icon: "🚀", label: "Let's go!", phrase: "Let's go!" }
      ],
      hints: {
        0: { tip: "Look at the glowing LEFT arrow in the garden!", tipVi: "Nhìn mũi tên LEFT đang phát sáng trong vườn kìa!", phrases: [] },
        1: { tip: "Tap or say a friendly phrase:", tipVi: "Chạm hoặc nói câu gợi ý nhé:", phrases: ["Where is Milo?", "Go left!", "Let's go!"] },
        2: { tip: "Finish the phrase:", tipVi: "Điền nốt từ còn thiếu nhé:", phrases: ["Where is ___? (Milo)", "Go ___! (left)", "Let's ___! (go)"] },
        3: { tip: "Tell your buddy in your own words which path to take!", tipVi: "Tự nói bằng lời của bé xem tụi mình đi đường nào nhé!", phrases: [] }
      },
      successChicky: "Woohoo! Let's go left to the Rainbow Flower Bush together!",
      successChickyVi: "Hoan hô! Tụi mình cùng đi sang trái tới Bụi Hoa Cầu Vồng nhé!",
      successBuddy: "Yay! Great teamwork! Follow the paw prints left!"
    },
    {
      step: 1,
      id: "flower_bush",
      title: "2. Rainbow Flower Bush",
      titleVi: "2. Bụi Hoa Cầu Vồng",
      targetPhrase: "I see a blue collar!",
      goalKeywords: ["see", "collar", "blue", "butterfly", "flower", "bush", "tree", "look", "milo", "clue", "sparkle"],
      requiredHotspot: "blue_collar",
      mapScoutClue: "🗺️ Your Map highlights the Rainbow Flower Bush right ahead of the Big Oak Tree.",
      mapScoutClueVi: "🗺️ Bản đồ chỉ Bụi Hoa Cầu Vồng ngay phía trước Cây Sồi Lớn.",
      clueSpotterClue: "🔎 Your Lens spots Milo's shiny BLUE COLLAR twinkling inside the flowers!",
      clueSpotterClueVi: "🔎 Kính lúp thấy chiếc VÒNG CỔ XANH (blue collar) của Milo lấp lánh trong bụi hoa!",
      chickyIntro: "Look closely near the Rainbow Flower Bush! What shiny clue do you see?",
      chickyIntroVi: "Nhìn kỹ quanh Bụi Hoa Cầu Vồng kìa! Bé nhìn thấy manh mối lấp lánh gì thế?",
      buddyAsSpotter: "Whoa! Something blue is sparkling in the flowers! It's Milo's BLUE COLLAR! Say 'I see a blue collar!' or tap it!",
      buddyAsScout: "We're at the Rainbow Flower Bush! What do you see on your Clue Lens?",
      pictureCards: [
        { icon: "🔵", label: "I see a blue collar!", phrase: "I see a blue collar!" },
        { icon: "👀", label: "Look here!", phrase: "I see something!" },
        { icon: "🌳", label: "Near the tree!", phrase: "Look near the tree!" }
      ],
      hints: {
        0: { tip: "Watch for the twinkling blue collar inside the flower bush!", tipVi: "Tìm chiếc vòng cổ màu xanh đang lấp lánh trong bụi hoa nhé!", phrases: [] },
        1: { tip: "Tap or say what you spot:", tipVi: "Chạm hoặc nói điều bé thấy nhé:", phrases: ["I see a blue collar!", "Where is Milo?", "Look near the tree!"] },
        2: { tip: "Complete the clue:", tipVi: "Hoàn thành câu manh mối nhé:", phrases: ["I see a ___ ___! (blue collar)", "Look near the ___! (tree)"] },
        3: { tip: "Describe the sparkling clue to your buddy!", tipVi: "Kể cho bạn nghe manh mối lấp lánh bé thấy nhé!", phrases: [] }
      },
      successChicky: "Awesome eyes! You found Milo's blue collar! Let's check the Big Oak Tree next!",
      successChickyVi: "Mắt tinh quá! Tìm thấy chiếc vòng cổ xanh của Milo rồi! Tới Cây Sồi Lớn thôi!",
      successBuddy: "Yes! That's Milo's collar! Look, paw prints lead to the Big Oak Tree!"
    },
    {
      step: 2,
      id: "whispering_oak",
      title: "3. The Whispering Oak",
      titleVi: "3. Cây Sồi Thì Thầm",
      targetPhrase: "Behind the tree! Go right!",
      goalKeywords: ["behind", "tree", "oak", "bone", "toy", "right", "bridge", "dog", "puppy", "look", "let's go", "lets go"],
      requiredHotspot: "oak_tree",
      mapScoutClue: "🗺️ Your Map shows the Wooden Bridge going RIGHT across the pond to the Cozy Gazebo.",
      mapScoutClueVi: "🗺️ Bản đồ chỉ Cây Cầu Gỗ đi sang PHẢI (RIGHT) qua hồ nước tới Chòi Vườn.",
      clueSpotterClue: "🔎 Your Lens spots Milo's toy bone BEHIND the Big Oak Tree — and tracks going RIGHT!",
      clueSpotterClueVi: "🔎 Kính lúp thấy khúc xương đồ chơi ở SAU cái cây (behind the tree), dấu chân rẽ sang PHẢI!",
      chickyIntro: "Psst! Something is hiding BEHIND the big oak tree! Tell your buddy where to look!",
      chickyIntroVi: "Suỵt! Có món đồ trốn phía SAU cái cây (behind the tree)! Bảo bạn cùng nhìn nhé!",
      buddyAsSpotter: "Aha! Milo's toy bone is BEHIND the tree, and tracks go RIGHT over the bridge! Say 'Behind the tree!' or 'Go right!'",
      buddyAsScout: "Here is the giant Oak Tree and a bridge to the right! Where should we look?",
      pictureCards: [
        { icon: "🌳", label: "Behind the tree!", phrase: "Behind the tree!" },
        { icon: "➡️", label: "Go right!", phrase: "Go right!" },
        { icon: "🦴", label: "I see a bone!", phrase: "I see a bone behind the tree!" }
      ],
      hints: {
        0: { tip: "Check behind the Big Oak Tree trunk where the bone peeks out!", tipVi: "Nhìn phía sau thân Cây Sồi Lớn nơi khúc xương đang ló ra nhé!", phrases: [] },
        1: { tip: "Share the clue with your buddy:", tipVi: "Chia sẻ manh mối cùng bạn nhé:", phrases: ["Behind the tree!", "I see a bone behind the tree!", "Go right! Let's go!"] },
        2: { tip: "Fill in the word:", tipVi: "Điền từ còn thiếu nhé:", phrases: ["Look ___ the tree! (behind)", "Go ___! (right)"] },
        3: { tip: "Tell your buddy where the bone is and which way to cross!", tipVi: "Tự nói cho bạn biết khúc xương ở đâu và đi hướng nào nhé!", phrases: [] }
      },
      successChicky: "Brilliant teamwork! You found the bone behind the tree! Let's go right over the bridge!",
      successChickyVi: "Phối hợp quá đỉnh! Tìm thấy khúc xương sau cây rồi! Cùng đi sang phải qua cầu nhé!",
      successBuddy: "Woohoo! I hear a happy 'Woof! Woof!' across the bridge! Let's go right!"
    },
    {
      step: 3,
      id: "cozy_gazebo",
      title: "4. The Cozy Gazebo",
      titleVi: "4. Chòi Vườn Ấm Áp",
      targetPhrase: "I see Milo! Let's go!",
      goalKeywords: ["milo", "see", "dog", "puppy", "bush", "behind", "found", "here", "hello", "hi", "let's go", "lets go", "yay"],
      requiredHotspot: "milo_bush",
      mapScoutClue: "🗺️ You reached the Cozy Gazebo! The berry bush right beside it is wiggling!",
      mapScoutClueVi: "🗺️ Tới Chòi Vườn rồi! Bụi cây quả mọng bên cạnh đang rung rinh kìa!",
      clueSpotterClue: "🔎 Two floppy puppy ears are peeking behind the bush — it's MILO!",
      clueSpotterClueVi: "🔎 Hai chiếc tai cún đang nhấp nhô sau bụi cây — chính là MILO rồi!",
      chickyIntro: "Woof, woof! Do you see two floppy ears wiggling behind the bush? Call out to Milo!",
      chickyIntroVi: "Gâu gâu! Bé thấy đôi tai cún vẫy vẫy sau bụi cây kìa! Gọi to 'I see Milo!' nhé!",
      buddyAsSpotter: "Look! Floppy ears behind the berry bush! Say 'I see Milo!' or tap the wiggling bush!",
      buddyAsScout: "The berry bush near the gazebo is wiggling! Is that Milo? Tell me what you see!",
      pictureCards: [
        { icon: "🐶", label: "I see Milo!", phrase: "I see Milo!" },
        { icon: "🌿", label: "Behind the bush!", phrase: "He is behind the bush!" },
        { icon: "🎉", label: "Let's go!", phrase: "Hello Milo! Let's go!" }
      ],
      hints: {
        0: { tip: "Tap the wiggling berry bush beside the Cozy Gazebo!", tipVi: "Chạm vào bụi cây đang rung rinh cạnh Chòi Vườn nhé!", phrases: [] },
        1: { tip: "Call out happily to Milo:", tipVi: "Gọi to chào Milo nhé:", phrases: ["I see Milo!", "He is behind the bush!", "Hello Milo! Let's go!"] },
        2: { tip: "Say the rescue sentence:", tipVi: "Nói câu giải cứu Milo nào:", phrases: ["I ___ Milo! (see)", "Milo is ___ the bush! (behind)"] },
        3: { tip: "Cheer and tell your buddy where Milo is!", tipVi: "Reo vui và nói cho bạn biết Milo đang ở đâu nhé!", phrases: [] }
      },
      successChicky: "YAY! You found Milo together! Milo is wagging his tail so happily!",
      successChickyVi: "HOAN HÔ! Hai bạn đã tìm thấy Milo cùng nhau rồi! Milo vẫy đuôi mừng lắm!",
      successBuddy: "WE DID IT! High-five! Milo is so happy to see us!"
    }
  ];

  const UNSAFE_WORDS = /\b(kill|murder|weapon|gun|bomb|drugs|hate|stupid|shut up|idiot)\b/i;

  function evaluateUtteranceLocal(stageIndex, utterance, hintLevel = 1) {
    const stage = MISSING_PUPPY_STAGES[Math.max(0, Math.min(MISSING_PUPPY_STAGES.length - 1, stageIndex))];
    const raw = String(utterance || "").trim();
    const low = raw.toLowerCase();

    if (UNSAFE_WORDS.test(low)) {
      return {
        matched: false,
        recast: null,
        chickyState: "greeting",
        chickyReply: `Let's use kind explorer words to help Milo! Try saying: "${stage.targetPhrase}"`,
        chickyReplyVi: `Tụi mình dùng lời nói thật dịu dàng để tìm Milo nhé! Thử nói: "${stage.targetPhrase}"`,
        phrasePracticed: null
      };
    }

    // Gentle Recasting examples (from Master Prompt Section 6)
    if (/\bdog\s+tree\b|\bpuppy\s+tree\b|\btree\s+dog\b/i.test(low)) {
      return {
        matched: true,
        recast: "Is the dog near the tree? Let's look behind the tree!",
        chickyState: "celebrating",
        chickyReply: "Is the dog near the tree? Let's look behind the tree!",
        chickyReplyVi: "Ồ, chú cún ở gần cái cây hả? Cùng nhìn phía sau cái cây (behind the tree) nhé!",
        phrasePracticed: "Behind the tree!"
      };
    }

    if (/\bi sees\b/i.test(low)) {
      return {
        matched: true,
        recast: "Yes! I see it too!",
        chickyState: "celebrating",
        chickyReply: `Yes! You SEE it too! ${stage.successChicky}`,
        chickyReplyVi: `Đúng rồi! Bé nhìn thấy (I see) rồi đó! ${stage.successChickyVi}`,
        phrasePracticed: stage.targetPhrase
      };
    }

    if (/\bwhere\s+(dog|puppy|milo)\b/i.test(low) && !/\bwhere\s+is\b/i.test(low)) {
      return {
        matched: true,
        recast: "Where is Milo?",
        chickyState: "celebrating",
        chickyReply: `Ooh, "Where is Milo?" — ${stage.successChicky}`,
        chickyReplyVi: `Hỏi hay lắm! "Where is Milo?" — ${stage.successChickyVi}`,
        phrasePracticed: "Where is Milo?"
      };
    }

    const matched = stage.goalKeywords.some(kw => low.includes(kw));
    if (matched) {
      return {
        matched: true,
        recast: null,
        chickyState: "celebrating",
        chickyReply: stage.successChicky,
        chickyReplyVi: stage.successChickyVi,
        phrasePracticed: stage.targetPhrase
      };
    }

    return {
      matched: false,
      recast: stage.targetPhrase,
      chickyState: "hinting",
      chickyReply: `Nice try, explorer! Try telling your buddy: "${stage.targetPhrase}"`,
      chickyReplyVi: `Cố gắng tốt lắm! Thử nói với bạn: "${stage.targetPhrase}" nhé!`,
      phrasePracticed: null
    };
  }

  window.ChickenData = {
    WORLDS,
    MISSING_PUPPY_STAGES,
    evaluateUtteranceLocal
  };
})();
