// Deterministic Mission Engine for World 1: The Magic Garden — "The Missing Puppy"
// Zero external AI credentials required. Used by both server API & automated tests.

export const MISSING_PUPPY_STAGES = Object.freeze([
  {
    step: 0,
    id: "garden_gate",
    title: "The Garden Gate",
    titleVi: "Cổng Khu Vườn Phép Thuật",
    targetPhrase: "Where is Milo? Go left!",
    goalKeywords: ["where", "milo", "puppy", "dog", "left", "go", "let's go", "lets go", "path", "flower", "meadow"],
    requiredHotspot: "left_path",
    mapScoutClue: "Your map shows TWO paths: Left to the Rainbow Meadow, Right to the Rocky Hill.",
    clueSpotterClue: "Your Paw-Print Lens spots fresh muddy paw prints turning LEFT!",
    chickyPrompt: "Hi explorers! Milo ran into the Magic Garden! Ask your buddy where to go — Left or Right?",
    chickyPromptVi: "Chào hai nhà thám hiểm! Cún Milo chạy vào Khu Vườn rồi! Hỏi bạn xem tụi mình đi trái (left) hay phải (right) nhé!",
    buddyOpeningAsSpotter: "Ooh! I see tiny paw prints on my lens! They go LEFT! Ready? Say 'Go left!' or 'Let's go!'",
    buddyOpeningAsScout: "I have the garden map! There is a LEFT path and a RIGHT path. Where is Milo? What do you see?",
    hints: {
      0: {
        visualTip: "Look at the glowing LEFT arrow signpost in the garden!",
        chickyState: "pointing",
        phrases: []
      },
      1: {
        visualTip: "Tap or say one of these friendly phrases:",
        chickyState: "hinting",
        phrases: ["Where is Milo?", "Go left!", "Let's go!"]
      },
      2: {
        visualTip: "Finish the sentence:",
        chickyState: "hinting",
        phrases: ["Where is ___? (Milo)", "Go ___! (left)", "Let's ___! (go)"]
      },
      3: {
        visualTip: "Tell your buddy in your own words which path to take!",
        chickyState: "listening",
        phrases: []
      }
    },
    successReply: "Woohoo! Let's go left to the Rainbow Flower Bush together!",
    successReplyVi: "Hoan hô! Tụi mình cùng đi sang trái tới Bụi Hoa Cầu Vồng nhé!",
    buddySuccess: "Yay! Great teamwork! Let's follow the paw prints left!"
  },
  {
    step: 1,
    id: "flower_bush",
    title: "Rainbow Flower Bush",
    titleVi: "Bụi Hoa Cầu Vồng",
    targetPhrase: "I see a blue collar!",
    goalKeywords: ["see", "collar", "blue", "butterfly", "flower", "bush", "tree", "look", "milo", "clue", "sparkle"],
    requiredHotspot: "blue_collar",
    mapScoutClue: "You see the Rainbow Flower Bush and the Big Oak Tree on the garden map.",
    clueSpotterClue: "Your lens spots Milo's sparkling BLUE COLLAR tucked in the Rainbow Bush!",
    chickyPrompt: "Look closely near the Rainbow Flower Bush! What clue do you see?",
    chickyPromptVi: "Nhìn kỹ quanh Bụi Hoa Cầu Vồng kìa! Bé nhìn thấy manh mối gì thế?",
    buddyOpeningAsSpotter: "Wait! Something shiny is in the flowers! It is Milo's BLUE COLLAR! Tell me 'I see a blue collar!' and tap it!",
    buddyOpeningAsScout: "We are at the Rainbow Flower Bush! What do you see on your Clue Lens?",
    hints: {
      0: {
        visualTip: "Watch for the sparkling blue collar shining in the flowers!",
        chickyState: "pointing",
        phrases: []
      },
      1: {
        visualTip: "Try saying or tapping one of these:",
        chickyState: "hinting",
        phrases: ["I see a blue collar!", "Where is Milo?", "Let's look near the tree!"]
      },
      2: {
        visualTip: "Complete the clue:",
        chickyState: "hinting",
        phrases: ["I see a ___ ___! (blue collar)", "Look near the ___! (tree)"]
      },
      3: {
        visualTip: "Describe the shiny clue you spotted to your buddy!",
        chickyState: "listening",
        phrases: []
      }
    },
    successReply: "Awesome eyes! You found Milo's blue collar! Now let's check the Big Oak Tree!",
    successReplyVi: "Mắt tinh quá! Tìm thấy chiếc vòng cổ xanh của Milo rồi! Tới Cây Sồi Lớn thôi!",
    buddySuccess: "Yes! That's Milo's blue collar! Look, paw prints go toward the big tree!"
  },
  {
    step: 2,
    id: "whispering_oak",
    title: "The Whispering Oak",
    titleVi: "Cây Sồi Thì Thầm",
    targetPhrase: "Behind the tree! Go right!",
    goalKeywords: ["behind", "tree", "oak", "bone", "toy", "right", "bridge", "dog", "puppy", "look", "let's go", "lets go"],
    requiredHotspot: "oak_tree",
    mapScoutClue: "The Big Oak Tree stands beside the Wooden Bridge going RIGHT to the Gazebo.",
    clueSpotterClue: "Milo's yellow toy bone is BEHIND the tree, and fresh tracks cross RIGHT over the bridge!",
    chickyPrompt: "Listen! Something is hiding BEHIND the big oak tree! Tell your buddy where to look!",
    chickyPromptVi: "Nghe kìa! Có món đồ đang trốn phía SAU cái cây (behind the tree)! Nói bạn cùng nhìn nhé!",
    buddyOpeningAsSpotter: "Ooh! My Clue Lens sees Milo's toy bone BEHIND the tree, and tracks going RIGHT! Say 'Behind the tree!' or 'Go right!'",
    buddyOpeningAsScout: "Here is the giant Oak Tree and a bridge to the right! Where should we look?",
    hints: {
      0: {
        visualTip: "Tap behind the Big Oak Tree where the golden bone glows!",
        chickyState: "pointing",
        phrases: []
      },
      1: {
        visualTip: "Tap or say a helpful clue:",
        chickyState: "hinting",
        phrases: ["Behind the tree!", "I see a bone behind the tree!", "Go right! Let's go!"]
      },
      2: {
        visualTip: "Fill in the missing word:",
        chickyState: "hinting",
        phrases: ["Look ___ the tree! (behind)", "Go ___ across the bridge! (right)"]
      },
      3: {
        visualTip: "Tell your buddy where the bone is and which way to go!",
        chickyState: "listening",
        phrases: []
      }
    },
    successReply: "Brilliant teamwork! You found the toy bone behind the tree! Let's go right over the bridge!",
    successReplyVi: "Phối hợp tuyệt vời! Tìm thấy khúc xương đồ chơi sau gốc cây rồi! Cùng đi sang phải qua cầu gỗ nhé!",
    buddySuccess: "Woohoo! I hear a happy 'Woof! Woof!' across the bridge! Let's go right!"
  },
  {
    step: 3,
    id: "cozy_gazebo",
    title: "The Cozy Gazebo",
    titleVi: "Chòi Vườn Ấm Áp",
    targetPhrase: "I see Milo! Let's go!",
    goalKeywords: ["milo", "see", "dog", "puppy", "bush", "behind", "found", "here", "hello", "hi", "let's go", "lets go", "yay"],
    requiredHotspot: "milo_bush",
    mapScoutClue: "Look beside the Cozy Gazebo — the berry bush is wiggling!",
    clueSpotterClue: "Two floppy puppy ears are peeking out! It's MILO!",
    chickyPrompt: "Woof, woof! Do you see two floppy ears wiggling behind the bush? Call out to Milo!",
    chickyPromptVi: "Gâu gâu! Bé thấy đôi tai cún vẫy vẫy sau bụi cây kìa! Gọi to 'I see Milo!' nhé!",
    buddyOpeningAsSpotter: "Look! Floppy ears behind the berry bush! Tell me 'I see Milo!' and tap the wiggling bush!",
    buddyOpeningAsScout: "The berry bush near the gazebo is wiggling! Is that Milo? Tell me what you see!",
    hints: {
      0: {
        visualTip: "Tap the wiggling berry bush next to the Cozy Gazebo!",
        chickyState: "pointing",
        phrases: []
      },
      1: {
        visualTip: "Call out to rescue Milo:",
        chickyState: "hinting",
        phrases: ["I see Milo!", "He is behind the bush!", "Hello Milo! Let's go!"]
      },
      2: {
        visualTip: "Say the rescue phrase:",
        chickyState: "hinting",
        phrases: ["I ___ Milo! (see)", "Milo is ___ the bush! (behind)"]
      },
      3: {
        visualTip: "Cheer and tell your buddy where Milo is hiding!",
        chickyState: "listening",
        phrases: []
      }
    },
    successReply: "YAY! You found Milo together! Milo is wagging his tail so happily!",
    successReplyVi: "HOAN HÔ! Hai bạn đã tìm thấy Milo rồi! Milo vẫy đuôi mừng rỡ quá trời luôn!",
    buddySuccess: "WE DID IT! High-five! Milo is so happy to see us!"
  }
]);

const UNSAFE_WORDS = /\b(kill|murder|weapon|gun|bomb|drugs|hate|stupid|shut up|idiot)\b/i;

/**
 * Gentle Recasting & Mission Utterance Evaluator
 * Never shames the child; recasts partial phrases warmly into natural English.
 */
export function evaluateMissionUtterance({ stageIndex = 0, utterance = "", hintLevel = 1 }) {
  const stage = MISSING_PUPPY_STAGES[Math.max(0, Math.min(MISSING_PUPPY_STAGES.length - 1, stageIndex))];
  const raw = String(utterance || "").trim();
  const low = raw.toLowerCase();

  if (UNSAFE_WORDS.test(low)) {
    return {
      matched: false,
      recast: null,
      chickyState: "greeting",
      chickyReply: "Let's use kind explorer words to help Milo! Try saying: '" + stage.targetPhrase + "'",
      chickyReplyVi: "Tụi mình dùng lời nói thật dịu dàng để tìm cún Milo nhé! Thử nói: '" + stage.targetPhrase + "'",
      phrasePracticed: null,
      safeFlag: "redirected_kindness"
    };
  }

  // Gentle recasting examples (implicit language acquisition — never scold!)
  if (/\bdog\s+tree\b|\bpuppy\s+tree\b|\btree\s+dog\b/i.test(low)) {
    return {
      matched: true,
      recast: "Is the dog near the tree? Let's look behind the tree!",
      chickyState: "celebrating",
      chickyReply: "Ooh, is the dog near the tree? Let's look behind the tree together!",
      chickyReplyVi: "Ồ, chú cún ở gần cái cây hả? Cùng nhìn phía sau cái cây (behind the tree) nhé!",
      phrasePracticed: "Behind the tree!",
      safeFlag: null
    };
  }

  if (/\bi sees\b/i.test(low)) {
    return {
      matched: true,
      recast: "Yes! I see it too!",
      chickyState: "celebrating",
      chickyReply: `Yes! You SEE it too! ${stage.successReply}`,
      chickyReplyVi: `Đúng rồi! Bạn nhìn thấy (I see) rồi đó! ${stage.successReplyVi}`,
      phrasePracticed: stage.targetPhrase,
      safeFlag: null
    };
  }

  if (/\bwhere\s+(dog|puppy|milo)\b/i.test(low) && !/\bwhere\s+is\b/i.test(low)) {
    return {
      matched: true,
      recast: "Where is Milo?",
      chickyState: "celebrating",
      chickyReply: `Great asking! "Where is Milo?" ${stage.successReply}`,
      chickyReplyVi: `Hỏi hay quá! "Where is Milo?" — ${stage.successReplyVi}`,
      phrasePracticed: "Where is Milo?",
      safeFlag: null
    };
  }

  const matched = stage.goalKeywords.some(kw => low.includes(kw));

  if (matched) {
    return {
      matched: true,
      recast: null,
      chickyState: "celebrating",
      chickyReply: stage.successReply,
      chickyReplyVi: stage.successReplyVi,
      phrasePracticed: stage.targetPhrase,
      safeFlag: null
    };
  }

  // Encouraging gentle scaffold if off-target (never says "Wrong!")
  const adaptive = getAdaptiveHint(stageIndex, Math.min(2, Math.max(1, hintLevel)));
  return {
    matched: false,
    recast: stage.targetPhrase,
    chickyState: "hinting",
    chickyReply: `Good try, explorer! Try telling your buddy: "${stage.targetPhrase}"`,
    chickyReplyVi: `Cố gắng tốt lắm nhà thám hiểm ơi! Thử nói với bạn: "${stage.targetPhrase}" nhé!`,
    hint: adaptive,
    phrasePracticed: null,
    safeFlag: null
  };
}

export function getAdaptiveHint(stageIndex = 0, level = 1) {
  const stage = MISSING_PUPPY_STAGES[Math.max(0, Math.min(MISSING_PUPPY_STAGES.length - 1, stageIndex))];
  const clampedLevel = [0, 1, 2, 3].includes(Number(level)) ? Number(level) : 1;
  return {
    stageId: stage.id,
    level: clampedLevel,
    ...stage.hints[clampedLevel]
  };
}

/**
 * Verifies a child can only join a buddy session with a parent-approved buddy or clearly marked demo bot.
 */
export function validateBuddyAccess({ buddyId, approvedBuddies = [] }) {
  const found = approvedBuddies.find(b => b && b.id === buddyId && b.approved === true);
  if (!found) {
    return {
      allowed: false,
      reason: "BUDDY_NOT_APPROVED",
      message: "Only parent-approved buddies can join a private room."
    };
  }
  return {
    allowed: true,
    isSimulatedDemo: Boolean(found.isDemoBot),
    buddy: found
  };
}
