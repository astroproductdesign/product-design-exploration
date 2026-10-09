/* Systema CNY Challenge — configuration and static content */
window.S = window.S || {};

S.CFG = {
  STORE_KEY: 'systema_cny_v1',
  FESTIVAL_DAYS: 15,
  SMILE_MS: 60000,        // Game 1 session length
  ROUND_MS: 60000,        // Game 2 round length (fixed; difficulty rises via speed)
  ROUND_SPEEDS: [1, 1.5, 2],
  // Production: replace with the real CNY window, e.g. {start:'2027-02-06', end:'2027-02-20'}.
  // For the prototype the window is pinned to first launch so the countdown is always live.
  FESTIVAL_FIXED: null,
  VOUCHER_TIERS: [
    { badges: 3, code: 'CNYFRESH10', label: 'RM10 off any Systema pack' },
    { badges: 5, code: 'CNYFRESH20', label: 'RM20 off any Systema pack' },
    { badges: 7, code: 'CNYFRESH30', label: 'RM30 off any Systema pack' }
  ]
};

/* ---- Game 1 · Smile Swipe tuning ----------------------------------------
   One "swipe" = one entry of the brush across a tooth. STAIN values are how many
   swipes that tooth type needs before its surface is clear; ITEM_CLEAR is the extra
   passes needed to brush a revealed food item away. All tunable, none hardcoded
   per individual tooth. */
S.SMILE = {
  ROW_LAYOUT: ['molar','premolar','canine','lateral','incisor','incisor','lateral','canine','premolar','molar'],
  STAIN:  { incisor: 3.5, lateral: 3, canine: 1.5, premolar: 2.5, molar: 4 },
  WIDTH:  { incisor: 1.15, lateral: 1,  canine: .85, premolar: 1,  molar: 1.3 },
  ITEM_CLEAR: 2,
  HIDDEN_ITEMS: 8,
  COMBO_WINDOW: 1700
};

S.GAMES = {
  smile:      { id:'smile',      name:'Smile Swipe',          hook:'60 sec · reach 100% shine',      route:'#/game/smile',      accent:'#3d9da1' },
  gathering:  { id:'gathering',  name:'Gathering Readiness',  hook:'3 rounds · defend after the treats', route:'#/game/gathering', accent:'#C8102E' },
  fresh:      { id:'fresh',      name:'Say It Fresh',         hook:'Say the greeting, keep it bright', route:'#/game/fresh',      accent:'#D4A017' }
};
S.GAME_ORDER = ['smile','gathering','fresh'];

/* 春联 badges — char shows on the tag, phrase + meaning show on reveal and share */
S.BADGES = [
  { id:'perfectShine', game:'smile',     char:'皓', phrase:'齿如皓月', pinyin:'chǐ rú hào yuè', meaning:'Teeth like a bright moon', name:'Perfect Shine',     how:'Reach 100% cleanliness' },
  { id:'streakKeeper', game:'smile',     char:'財', phrase:'恭喜发财', pinyin:'gōng xǐ fā cái', meaning:'Wishing you prosperity',   name:'Streak Keeper',     how:'Play 3 days in a row' },
  { id:'zeroSugar',    game:'gathering', char:'順', phrase:'万事如意', pinyin:'wàn shì rú yì',  meaning:'May all go as you wish',   name:'Zero Sugar Round',  how:'Finish with Sugar at 20% or less' },
  { id:'perfectDodge', game:'gathering', char:'昇', phrase:'步步高升', pinyin:'bù bù gāo shēng',meaning:'Rising step by step',      name:'Perfect Dodge',     how:'Clear a full round without catching a snack' },
  { id:'sayItFresh',   game:'fresh',     char:'笑', phrase:'笑口常开', pinyin:'xiào kǒu cháng kāi', meaning:'May your smile never fade', name:'Say It Fresh', how:'Pass all 3 rounds' },
  { id:'firstTake',    game:'fresh',     char:'成', phrase:'心想事成', pinyin:'xīn xiǎng shì chéng', meaning:'May your wishes come true', name:'First Take',  how:'Pass all 3 rounds on the first attempt' },
  { id:'cnyChampion',  game:'all',       char:'餘', phrase:'年年有余', pinyin:'nián nián yǒu yú', meaning:'Abundance year after year', name:'CNY Champion', how:'Play all three games at least once', bonus:true }
];
S.badgeById = function (id) { return S.BADGES.filter(function (b) { return b.id === id; })[0]; };

S.AVATARS = [
  { id:'lantern',    label:'Lantern' },
  { id:'redpacket',  label:'Red packet' },
  { id:'mandarin',   label:'Mandarin orange' },
  { id:'firecracker',label:'Firecrackers' },
  { id:'ingot',      label:'Gold ingot' },
  { id:'blossom',    label:'Plum blossom' },
  { id:'brush',      label:'Systema toothbrush' },
  { id:'tube',       label:'Systema toothpaste' }
];

/* Recommended product on the results screen — matched to how the session actually went */
S.PRODUCTS = {
  clean3d:   { name:'Systema 3D Clean',        line:'Enhanced Clean',  why:'You cleared every surface and kept the streak going. A 3D head is built to hold that coverage at speed.' },
  charcoal:  { name:'Systema Active Charcoal', line:'Essential Clean', why:'You found every treat hiding on your teeth. Charcoal bristles are made for what festive snacking leaves behind.' },
  ultraWhite:{ name:'Systema 3D Ultra White',  line:'Enhanced Clean',  why:'Full marks on shine. The whitening head keeps a smile camera-ready through fifteen days of photos.' },
  gum:       { name:'Systema Ultra Dense Gum', line:'Enhanced Clean',  why:'The clock beat you this round. Ultra-dense filaments do more per stroke, especially along the gumline.' },
  sensitive: { name:'Systema Sensitive',       line:'Special Needs',   why:'Start gentle and build the habit back up — soft tapered bristles make a daily routine easy to keep.' }
};
S.recommend = function (game, best, discoveries) {
  var P = S.PRODUCTS;
  if (!best) return P.sensitive;
  if (game === 'smile') {
    var clean = best.cleanliness || 0, combo = best.combo || 0;
    var found = (discoveries || best.discoveries || []).length;
    if (found >= 8) return P.charcoal;
    if (clean >= 100 && combo >= 10) return P.clean3d;
    if (clean >= 100) return P.ultraWhite;
    if (clean >= 70) return P.gum;
    return P.sensitive;
  }
  if (game === 'gathering') {
    var c = best.cleanliness || 0;
    if (c >= 80) return P.clean3d;
    if (c >= 50) return P.charcoal;
    return P.gum;
  }
  return (best.passes || 0) >= 3 ? P.ultraWhite : P.sensitive;
};

S.PHRASES = [
  { zh:'恭喜发财', py:'gōng xǐ fā cái', en:'Wishing you prosperity', ms:'Semoga murah rezeki', hold:1.2 },
  { zh:'万事如意', py:'wàn shì rú yì',  en:'May all go as you wish', ms:'Semoga semuanya lancar', hold:1.2 },
  { zh:'笑口常开', py:'xiào kǒu cháng kāi', en:'May your smile never fade', ms:'Semoga sentiasa ceria', hold:1.4 }
];

S.GREETINGS = {
  smile:     { zh:'新年到，笑容也要亮起来', en:'May your new year — and your smile — shine bright.' },
  gathering: { zh:'吃得开心，笑得放心',     en:'Enjoy every treat — Systema handles the rest.' },
  fresh:     { zh:'开口说吉祥，笑口常开',   en:'Say it bright, smile all year.' }
};

/* Mock leaderboard pools — no backend; the player is inserted live by score */
S.LEADERS = {
  smile: {
    daily:    [['LanternQueen',38200],['AhBoy88',40100],['Farah_R',42600],['TeaTimeTan',45300],['GoldenSmile',47800],['RayaReady',50400],['MeiMei_2026',53100],['ClementineC',56900],['JuniorLim',61200]],
    festival: [['LanternQueen',35400],['GoldenSmile',36800],['AhBoy88',38900],['Farah_R',40200],['SitiNur',41700],['TeaTimeTan',43500],['MeiMei_2026',46000],['RayaReady',48800],['ClementineC',52300],['JuniorLim',58100]]
  },
  gathering: {
    daily:    [['GoldenSmile',96],['Farah_R',94],['LanternQueen',91],['AhBoy88',88],['SitiNur',85],['TeaTimeTan',81],['MeiMei_2026',78],['RayaReady',74],['ClementineC',69]],
    festival: [['Farah_R',98],['GoldenSmile',97],['LanternQueen',95],['SitiNur',92],['AhBoy88',90],['TeaTimeTan',86],['JuniorLim',83],['MeiMei_2026',79],['RayaReady',76],['ClementineC',71]]
  },
  fresh: {
    daily:    [['MeiMei_2026',9800],['SitiNur',11200],['LanternQueen',12400],['AhBoy88',13600],['Farah_R',14900],['GoldenSmile',16100],['TeaTimeTan',17800],['RayaReady',19400],['JuniorLim',21000]],
    festival: [['MeiMei_2026',9100],['LanternQueen',10300],['SitiNur',10900],['Farah_R',12000],['AhBoy88',12800],['GoldenSmile',14200],['TeaTimeTan',15600],['ClementineC',17100],['RayaReady',18700],['JuniorLim',20500]]
  }
};
/* lower-is-better for time-based boards */
S.LEADER_META = {
  smile:     { unit:'time', better:'lower' },
  gathering: { unit:'pct',  better:'higher' },
  fresh:     { unit:'time', better:'lower' }
};

S.PROFANITY = ['fuck','shit','bitch','cunt','asshole','bastard','dick','pussy','nigger','faggot','whore','slut','babi','pukimak','sohai','cibai','kanine','lanjiao','puki'];
