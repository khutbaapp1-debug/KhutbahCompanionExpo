export type PrayerFlowRecitation = {
  arabic: string;
  transliteration: string;
  meaning: string;
  name: string;
  label?: string;
};

export type PrayerFlowCard = {
  number: number;
  title: string;
  description: string;
  recitations?: PrayerFlowRecitation[];
  note?: string;
  image?: number | null;
};

export type PrayerType = "2rakat" | "4rakat" | "maghrib" | "witr";

const STEP_IMAGES = {
  standing: require("../../assets/images/salah/salah-standing.jpg"),
  takbir: require("../../assets/images/salah/salah-takbir.jpg"),
  qiyam: require("../../assets/images/salah/salah-qiyam.jpg"),
  ruku: require("../../assets/images/salah/salah-ruku.jpg"),
  sujood: require("../../assets/images/salah/salah-sujood.jpg"),
  jalsa: require("../../assets/images/salah/salah-jalsa.jpg"),
  tashahhud: require("../../assets/images/salah/salah-tashahhud-finger.jpg"),
  salamRight: require("../../assets/images/salah/salah-salam-right.jpg"),
  salamLeft: require("../../assets/images/salah/salah-salam-left.jpg"),
} as const;

function pickStepImage(title: string): number | null {
  // Pre-prayer steps — no posture image
  if (title.includes("Wudu")) return null;
  if (title.includes("Facing") || title.includes("Qibla")) return null;

  // Intention
  if (title.includes("Niyyah") || title.includes("Intention")) return STEP_IMAGES.standing;

  // Opening takbir
  if (title.includes("Takbir al-Ihram") || title.includes("Opening Takbir")) return STEP_IMAGES.takbir;

  // I'tidal — must come BEFORE the generic "Standing" branch
  if (title.includes("I'tidal") || title.includes("Standing After Ruku")) return STEP_IMAGES.standing;

  // Ruku
  if (title.includes("Ruku'") || title.includes("Bowing")) return STEP_IMAGES.ruku;

  // Sujood (first/second)
  if (title.includes("Sujood (First") || title.includes("First Prostration")) return STEP_IMAGES.sujood;
  if (title.includes("Sujood (Second") || title.includes("Second Prostration")) return STEP_IMAGES.sujood;

  // Jalsah
  if (title.includes("Jalsah") || title.includes("Sitting Briefly")) return STEP_IMAGES.jalsa;

  // Tashahhud
  if (title.includes("Tashahhud") || title.includes("Attahiyyat") || title.includes("At-Tahiyyat")) return STEP_IMAGES.tashahhud;

  // Tasleem (closing)
  if (title.includes("Tasleem") || title.includes("Closing the Prayer")) return STEP_IMAGES.salamRight;

  // Qiyam / Standing (general — "Standing After Ruku'" was already handled above)
  if (title.includes("Qiyam") || title.includes("Standing")) return STEP_IMAGES.qiyam;

  return null;
}

function withImages(cards: PrayerFlowCard[]): PrayerFlowCard[] {
  return cards.map((c) => ({ ...c, image: pickStepImage(c.title) }));
}

const BISMILLAH: PrayerFlowRecitation = {
  name: "Bismillah",
  arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  transliteration: "Bismillahir-Rahmanir-Raheem.",
  meaning: "In the name of Allah, the Most Gracious, the Most Merciful.",
};

const SURAH_FATIHAH: PrayerFlowRecitation = {
  name: "Surah al-Fatihah",
  arabic:
    "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ۝ الرَّحْمَٰنِ الرَّحِيمِ ۝ مَالِكِ يَوْمِ الدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ۝ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
  transliteration:
    "Bismillahir-Rahmanir-Raheem. Alhamdu lillahi Rabbil-'alameen. Ar-Rahmanir-Raheem. Maliki yawmid-deen. Iyyaka na'budu wa iyyaka nasta'een. Ihdinas-sirata-l-mustaqeem. Sirata-l-ladheena an'amta 'alayhim. Ghayril-maghdoobi 'alayhim wa lad-dalleen. Ameen.",
  meaning:
    "In the name of Allah, the Most Gracious, the Most Merciful. Praise be to Allah, Lord of all the worlds. The Most Gracious, the Most Merciful. Master of the Day of Judgement. You alone we worship, and You alone we ask for help. Guide us to the straight path — the path of those upon whom You have bestowed favor, not of those who have evoked anger, nor of those who are astray. Ameen.",
};

const SURAH_IKHLAS: PrayerFlowRecitation = {
  name: "Surah al-Ikhlas",
  arabic:
    "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ",
  transliteration:
    "Bismillahir-Rahmanir-Raheem. Qul huwa Allahu ahad. Allahu-s-samad. Lam yalid wa lam yulad. Wa lam yakun lahu kufuwan ahad.",
  meaning:
    "In the name of Allah, the Most Gracious, the Most Merciful. Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born. Nor is there to Him any equivalent.",
};

const TASBIH_RUKU: PrayerFlowRecitation = {
  name: "Tasbih of Ruku'",
  arabic: "سُبْحَانَ رَبِّيَ الْعَظِيمِ",
  transliteration: "Subhana Rabbiyal-'Adheem.",
  meaning: "Glory is to my Lord, the Most Great.",
};

const TASBIH_SUJOOD: PrayerFlowRecitation = {
  name: "Tasbih of Sujood",
  arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَىٰ",
  transliteration: "Subhana Rabbiyal-A'la.",
  meaning: "Glory is to my Lord, the Most High.",
};

const JALSAH_DUA: PrayerFlowRecitation = {
  name: "Brief Dua of Jalsah",
  arabic: "رَبِّ اغْفِرْ لِي",
  transliteration: "Rabbighfir lee.",
  meaning: "O my Lord, forgive me.",
};

const TASHAHHUD_RECITATION: PrayerFlowRecitation = {
  name: "Tashahhud (At-tahiyyat)",
  arabic:
    "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَىٰ عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
  transliteration:
    "At-tahiyyatu lillahi was-salawatu wat-tayyibat. As-salamu 'alayka ayyuhan-Nabiyyu wa rahmatullahi wa barakatuh. As-salamu 'alayna wa 'ala 'ibadillahis-saliheen. Ash-hadu an la ilaha illa Allah, wa ash-hadu anna Muhammadan abduhu wa rasuluh.",
  meaning:
    "All compliments, prayers, and pure words are for Allah. Peace be upon you, O Prophet, and the mercy of Allah and His blessings. Peace be upon us and upon the righteous servants of Allah. I bear witness that there is no god but Allah, and I bear witness that Muhammad is His servant and messenger.",
};

const DUROOD_RECITATION: PrayerFlowRecitation = {
  name: "Durood (Salawat upon the Prophet ﷺ)",
  label: "Then recite the Durood",
  arabic:
    "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ ۝ اللَّهُمَّ بَارِكْ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ",
  transliteration:
    "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammad, kama sallayta 'ala Ibrahima wa 'ala ali Ibraheem, innaka Hameedun Majeed. Allahumma barik 'ala Muhammadin wa 'ala ali Muhammad, kama barakta 'ala Ibrahima wa 'ala ali Ibraheem, innaka Hameedun Majeed.",
  meaning:
    "O Allah, send Your prayers upon Muhammad and the family of Muhammad, as You sent prayers upon Ibrahim and the family of Ibrahim. Indeed You are Praiseworthy, Glorious. O Allah, send Your blessings upon Muhammad and the family of Muhammad, as You sent blessings upon Ibrahim and the family of Ibrahim. Indeed You are Praiseworthy, Glorious.",
};

const PERSONAL_DUA_RECITATION: PrayerFlowRecitation = {
  name: "Personal Dua",
  label: "End with a brief personal dua, for example:",
  arabic:
    "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
  transliteration:
    "Rabbana atina fid-dunya hasanah, wa fil-akhirati hasanah, wa qina 'adhaban-naar.",
  meaning:
    "Our Lord, grant us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.",
};

const DUA_QUNOOT: PrayerFlowRecitation = {
  name: "Dua Qunoot",
  arabic:
    "اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ، وَعَافِنِي فِيمَنْ عَافَيْتَ، وَتَوَلَّنِي فِيمَنْ تَوَلَّيْتَ، وَبَارِكْ لِي فِيمَا أَعْطَيْتَ، وَقِنِي شَرَّ مَا قَضَيْتَ، إِنَّكَ تَقْضِي وَلَا يُقْضَىٰ عَلَيْكَ، وَإِنَّهُ لَا يَذِلُّ مَنْ وَالَيْتَ، وَلَا يَعِزُّ مَنْ عَادَيْتَ، تَبَارَكْتَ رَبَّنَا وَتَعَالَيْتَ",
  transliteration:
    "Allahumma ihdini feeman hadayt, wa 'afini feeman 'afayt, wa tawallani feeman tawallayt, wa barik li feema a'tayt, wa qini sharra ma qadayt, innaka taqdi wa la yuqda 'alayk, wa innahu la yadhillu man walayt, wa la ya'izzu man 'adayt, tabarakta Rabbana wa ta'alayt.",
  meaning:
    "O Allah, guide me among those You have guided, grant me wellbeing among those You have granted wellbeing, take me into Your protection among those You have protected, bless what You have given me, and protect me from the evil that You have decreed. For verily You decree and none can overrule You. He whom You have befriended is never humiliated, and he whom You have set Yourself against is never honored. Blessed are You, our Lord, and Exalted.",
};

const SALAM_TASLEEM: PrayerFlowRecitation = {
  name: "Salam (Tasleem)",
  label: "Said twice — once to the right, once to the left",
  arabic: "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ",
  transliteration: "As-salamu 'alaykum wa rahmat-Ullah.",
  meaning: "Peace and the mercy of Allah be upon you.",
};

const QIYAM_RECITE_NOTE =
  "Recite silently. If you are leading the prayer in congregation, recite Surah al-Fatihah and the surah aloud during Fajr, Maghrib, and the first two rakat of Isha.";

const FINAL_TASHAHHUD_NOTE =
  "When you reach \"La ilaha illa Allah\" in the Tashahhud, raise the index finger of your right hand (other fingers gently closed into a fist), then lower it.";

const itidalRecitations: PrayerFlowRecitation[] = [
  {
    name: "Sami'-Allahu liman hamidah",
    label: "As you rise",
    arabic: "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ",
    transliteration: "Sami'-Allahu liman hamidah.",
    meaning: "Allah hears the one who praises Him.",
  },
  {
    name: "Rabbana lakal hamd",
    label: "Once standing upright",
    arabic: "رَبَّنَا لَكَ الْحَمْدُ",
    transliteration: "Rabbana lakal hamd.",
    meaning: "Our Lord, all praise is due to You.",
  },
];

const finalTashahhudRecitations: PrayerFlowRecitation[] = [
  TASHAHHUD_RECITATION,
  DUROOD_RECITATION,
  PERSONAL_DUA_RECITATION,
];

const FINAL_TASHAHHUD_DESCRIPTION =
  "Sit in the same position as Jalsah — left foot folded under the body, right foot upright with toes curled forward. Place your hands flat on your thighs, just above the knees. Now recite the following, in order:";

const RUKU_DESCRIPTION =
  "Saying \"Allahu Akbar,\" bow forward at the waist. Place your hands firmly on your knees with fingers spread, and keep your back flat — parallel to the ground. Your gaze stays on the spot where your forehead will rest in prostration. Recite the following at least three times:";

const ITIDAL_DESCRIPTION =
  "As you rise from Ruku', say the first phrase below. Stand fully upright with your hands at your sides, then say the second phrase. This is a brief moment — do not linger.";

const FIRST_SUJOOD_DESCRIPTION =
  "Saying \"Allahu Akbar,\" lower yourself to the ground in prostration. Seven body parts must touch the floor: forehead, nose, both palms, both knees, and the toes of both feet (curled forward toward the qibla). Place your palms on the ground beside your head, with elbows lifted away from your sides. Recite the following at least three times:";

const JALSAH_DESCRIPTION =
  "Saying \"Allahu Akbar,\" rise from prostration into a sitting position. Sit on the flat of your left foot, with your right foot upright — toes curled forward toward the qibla. Place your palms flat on your thighs, just above the knees. Briefly recite the following before returning to prostration:";

const QIYAM_NEXT_RAKAH_DESCRIPTION =
  "Place your right hand over your left, between the chest and navel. Keep your gaze focused on the spot where your forehead will rest in prostration. Recite the following, in order:";

const TASLEEM_RECITATIONS: PrayerFlowRecitation[] = [SALAM_TASLEEM];

const twoRakat: PrayerFlowCard[] = [
  {
    number: 1,
    title: "1. Make Wudu",
    description:
      "Before you can pray, you must perform wudu (ablution). If you have not yet done so, please go to the Wudu tab first.",
  },
  {
    number: 2,
    title: "2. Find a Clean Place and Face the Qibla",
    description:
      "Choose a clean, quiet place to pray. Make sure your body, clothes, and the prayer area are free from impurity. Cover your awrah modestly — for men, at minimum from the navel to the knees; for women, the whole body except the face and hands. Then stand facing the qibla (the direction of the Kaaba in Makkah).",
  },
  {
    number: 3,
    title: "3. Make the Intention (Niyyah)",
    description:
      "In your heart, intend the specific prayer you are about to perform. You can frame your intention naturally — for example: \"I am facing the Kaaba, praying two rakat fard for Fajr. O Allah, forgive any mistakes I may make.\" If you are praying behind an imam in congregation, also include that you are praying behind the imam.\n\nThe intention does not need to be spoken aloud; it is an act of the heart.",
  },
  {
    number: 4,
    title: "4. Takbir al-Ihram (Opening Takbir)",
    description:
      "Stand upright, facing the qibla. Raise both hands and say \"Allahu Akbar\" (Allah is the Greatest). Your prayer has now officially begun. From this point onward, focus only on the prayer — do not speak, eat, or move unnecessarily until you complete the prayer.",
    recitations: [
      {
        name: "Takbir",
        arabic: "اللَّهُ أَكْبَرُ",
        transliteration: "Allahu Akbar",
        meaning: "Allah is the Greatest.",
      },
    ],
  },
  {
    number: 5,
    title: "5. Qiyam (Standing) — Rakah 1",
    description: QIYAM_NEXT_RAKAH_DESCRIPTION,
    recitations: [
      {
        name: "Subhanaka (Opening Dua)",
        label: "Opening dua",
        arabic:
          "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَىٰ جَدُّكَ، وَلَا إِلَٰهَ غَيْرُكَ",
        transliteration:
          "Subhanaka Allahumma wa bihamdika, wa tabarakasmuka, wa ta'ala jadduka, wa la ilaha ghayruka.",
        meaning:
          "O Allah, glory and praise are for You; blessed is Your Name; exalted is Your Majesty; there is no god but You.",
      },
      {
        name: "Ta'awwudh",
        label: "Seeking refuge",
        arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ",
        transliteration: "A'udhu billahi minash-shaytanir-rajeem.",
        meaning: "I seek refuge in Allah from the accursed Shaytan.",
      },
      BISMILLAH,
      SURAH_FATIHAH,
      SURAH_IKHLAS,
    ],
    note: QIYAM_RECITE_NOTE,
  },
  {
    number: 6,
    title: "6. Ruku' (Bowing)",
    description: RUKU_DESCRIPTION,
    recitations: [TASBIH_RUKU],
  },
  {
    number: 7,
    title: "7. I'tidal (Standing After Ruku')",
    description: ITIDAL_DESCRIPTION,
    recitations: itidalRecitations,
  },
  {
    number: 8,
    title: "8. Sujood (First Prostration)",
    description: FIRST_SUJOOD_DESCRIPTION,
    recitations: [TASBIH_SUJOOD],
  },
  {
    number: 9,
    title: "9. Jalsah (Sitting Briefly)",
    description: JALSAH_DESCRIPTION,
    recitations: [JALSAH_DUA],
  },
  {
    number: 10,
    title: "10. Sujood (Second Prostration)",
    description:
      "Saying \"Allahu Akbar,\" return to prostration. The same seven body parts touch the ground: forehead, nose, both palms, both knees, and the curled toes of both feet. Place your palms beside your head as before. Recite the same tasbih at least three times:\n\nThis completes the first rakah. Saying \"Allahu Akbar,\" stand back up to begin Rakah 2.",
    recitations: [TASBIH_SUJOOD],
  },
  {
    number: 11,
    title: "11. Qiyam (Standing) — Rakah 2",
    description: QIYAM_NEXT_RAKAH_DESCRIPTION,
    recitations: [BISMILLAH, SURAH_FATIHAH, SURAH_IKHLAS],
    note: QIYAM_RECITE_NOTE,
  },
  {
    number: 12,
    title: "12. Ruku' (Bowing)",
    description: RUKU_DESCRIPTION,
    recitations: [TASBIH_RUKU],
  },
  {
    number: 13,
    title: "13. I'tidal (Standing After Ruku')",
    description: ITIDAL_DESCRIPTION,
    recitations: itidalRecitations,
  },
  {
    number: 14,
    title: "14. Sujood (First Prostration)",
    description: FIRST_SUJOOD_DESCRIPTION,
    recitations: [TASBIH_SUJOOD],
  },
  {
    number: 15,
    title: "15. Jalsah (Sitting Briefly)",
    description: JALSAH_DESCRIPTION,
    recitations: [JALSAH_DUA],
  },
  {
    number: 16,
    title: "16. Sujood (Second Prostration)",
    description:
      "Saying \"Allahu Akbar,\" return to prostration. The same seven body parts touch the ground: forehead, nose, both palms, both knees, and the curled toes of both feet. Place your palms beside your head as before. Recite the same tasbih at least three times:\n\nThis completes Rakah 2. Saying \"Allahu Akbar,\" sit up for the Tashahhud.",
    recitations: [TASBIH_SUJOOD],
  },
  {
    number: 17,
    title: "17. Final Tashahhud (Sitting)",
    description: FINAL_TASHAHHUD_DESCRIPTION,
    recitations: finalTashahhudRecitations,
    note: FINAL_TASHAHHUD_NOTE,
  },
  {
    number: 18,
    title: "18. Tasleem (Closing the Prayer)",
    description:
      "Remaining in the sitting position, end the prayer by turning your head to the right and saying the salam. Then turn your head to the left and repeat the same words. Your prayer is now complete.\n\nYour 2-rakat prayer is complete. May Allah accept it from you.",
    recitations: TASLEEM_RECITATIONS,
  },
];

const fourRakat: PrayerFlowCard[] = [
  ...twoRakat.slice(0, 15),
  {
    number: 16,
    title: "16. Sujood (Second Prostration) — End of Rakah 2",
    description:
      "Saying \"Allahu Akbar,\" return to prostration. The same seven body parts touch the ground: forehead, nose, both palms, both knees, and the curled toes of both feet. Place your palms beside your head as before. Recite the same tasbih at least three times:\n\nThis completes Rakah 2. Saying \"Allahu Akbar,\" sit up for the First Tashahhud.",
    recitations: [TASBIH_SUJOOD],
  },
  {
    number: 17,
    title: "17. First Tashahhud (Sitting)",
    description:
      "Sit in the same position as Jalsah — left foot folded under the body, right foot upright with toes curled forward. Place your hands flat on your thighs, just above the knees. Recite the testimony of faith below. Do NOT add the Durood (Salawat) or any personal dua at this sitting — those are reserved for the final Tashahhud.",
    recitations: [TASHAHHUD_RECITATION],
    note: "When you reach \"La ilaha illa Allah\" in the testimony, raise the index finger of your right hand (other fingers gently closed into a fist), then lower it. Once you have lowered your finger and completed the testimony, saying \"Allahu Akbar,\" stand up to begin Rakah 3.",
  },
  {
    number: 18,
    title: "18. Qiyam (Standing) — Rakah 3",
    description:
      "Place your right hand over your left, between the chest and navel. Keep your gaze focused on the spot where your forehead will rest in prostration. In Rakah 3, recite only the Bismillah followed by Surah al-Fatihah — do not add a short surah.",
    recitations: [BISMILLAH, SURAH_FATIHAH],
    note: QIYAM_RECITE_NOTE,
  },
  {
    number: 19,
    title: "19. Ruku' (Bowing)",
    description: RUKU_DESCRIPTION,
    recitations: [TASBIH_RUKU],
  },
  {
    number: 20,
    title: "20. I'tidal (Standing After Ruku')",
    description: ITIDAL_DESCRIPTION,
    recitations: itidalRecitations,
  },
  {
    number: 21,
    title: "21. Sujood (First Prostration)",
    description: FIRST_SUJOOD_DESCRIPTION,
    recitations: [TASBIH_SUJOOD],
  },
  {
    number: 22,
    title: "22. Jalsah (Sitting Briefly)",
    description: JALSAH_DESCRIPTION,
    recitations: [JALSAH_DUA],
  },
  {
    number: 23,
    title: "23. Sujood (Second Prostration)",
    description:
      "Saying \"Allahu Akbar,\" return to prostration. The same seven body parts touch the ground: forehead, nose, both palms, both knees, and the curled toes of both feet. Place your palms beside your head as before. Recite the same tasbih at least three times:\n\nThis completes Rakah 3. Saying \"Allahu Akbar,\" stand back up to begin Rakah 4.",
    recitations: [TASBIH_SUJOOD],
  },
  {
    number: 24,
    title: "24. Qiyam (Standing) — Rakah 4",
    description:
      "Place your right hand over your left, between the chest and navel. Keep your gaze focused on the spot where your forehead will rest in prostration. As in Rakah 3, recite only the Bismillah followed by Surah al-Fatihah — do not add a short surah.",
    recitations: [BISMILLAH, SURAH_FATIHAH],
    note: QIYAM_RECITE_NOTE,
  },
  {
    number: 25,
    title: "25. Ruku' (Bowing)",
    description: RUKU_DESCRIPTION,
    recitations: [TASBIH_RUKU],
  },
  {
    number: 26,
    title: "26. I'tidal (Standing After Ruku')",
    description: ITIDAL_DESCRIPTION,
    recitations: itidalRecitations,
  },
  {
    number: 27,
    title: "27. Sujood (First Prostration)",
    description: FIRST_SUJOOD_DESCRIPTION,
    recitations: [TASBIH_SUJOOD],
  },
  {
    number: 28,
    title: "28. Jalsah (Sitting Briefly)",
    description: JALSAH_DESCRIPTION,
    recitations: [JALSAH_DUA],
  },
  {
    number: 29,
    title: "29. Sujood (Second Prostration)",
    description:
      "Saying \"Allahu Akbar,\" return to prostration. The same seven body parts touch the ground: forehead, nose, both palms, both knees, and the curled toes of both feet. Place your palms beside your head as before. Recite the same tasbih at least three times:\n\nThis completes Rakah 4. Saying \"Allahu Akbar,\" sit up for the Final Tashahhud.",
    recitations: [TASBIH_SUJOOD],
  },
  {
    number: 30,
    title: "30. Final Tashahhud (Sitting)",
    description: FINAL_TASHAHHUD_DESCRIPTION,
    recitations: finalTashahhudRecitations,
    note: FINAL_TASHAHHUD_NOTE,
  },
  {
    number: 31,
    title: "31. Tasleem (Closing the Prayer)",
    description:
      "Remaining in the sitting position, end the prayer by turning your head to the right and saying the salam. Then turn your head to the left and repeat the same words. Your prayer is now complete.\n\nYour 4-rakat prayer is complete. May Allah accept it from you.",
    recitations: TASLEEM_RECITATIONS,
  },
];

const maghrib: PrayerFlowCard[] = [
  ...fourRakat.slice(0, 22),
  {
    number: 23,
    title: "23. Sujood (Second Prostration)",
    description:
      "Saying \"Allahu Akbar,\" return to prostration. The same seven body parts touch the ground: forehead, nose, both palms, both knees, and the curled toes of both feet. Place your palms beside your head as before. Recite the same tasbih at least three times:\n\nThis completes Rakah 3 — the final rakah of Maghrib. Saying \"Allahu Akbar,\" sit up for the Final Tashahhud.",
    recitations: [TASBIH_SUJOOD],
  },
  {
    number: 24,
    title: "24. Final Tashahhud (Sitting)",
    description: FINAL_TASHAHHUD_DESCRIPTION,
    recitations: finalTashahhudRecitations,
    note: FINAL_TASHAHHUD_NOTE,
  },
  {
    number: 25,
    title: "25. Tasleem (Closing the Prayer)",
    description:
      "Remaining in the sitting position, end the prayer by turning your head to the right and saying the salam. Then turn your head to the left and repeat the same words. Your prayer is now complete.\n\nYour 3-rakat Maghrib prayer is complete. May Allah accept it from you.",
    recitations: TASLEEM_RECITATIONS,
  },
];

const witr: PrayerFlowCard[] = [
  ...twoRakat.slice(0, 15),
  {
    number: 16,
    title: "16. Sujood (Second Prostration)",
    description:
      "Saying \"Allahu Akbar,\" return to prostration. The same seven body parts touch the ground: forehead, nose, both palms, both knees, and the curled toes of both feet. Place your palms beside your head as before. Recite the same tasbih at least three times:\n\nThis completes Rakah 2. **In Witr, you do not sit for a First Tashahhud.** Saying \"Allahu Akbar,\" stand directly to begin Rakah 3.",
    recitations: [TASBIH_SUJOOD],
  },
  {
    number: 17,
    title: "17. Qiyam (Standing) — Rakah 3 with Dua Qunoot",
    description:
      "Place your right hand over your left, between the chest and navel. Keep your gaze focused on the spot where your forehead will rest in prostration. Recite the following, in order:\n\nAfter completing the surah, raise both hands to your ears (as in the opening Takbir) and say \"Allahu Akbar.\" Then place your right hand over your left, between the chest and navel — as in standard Qiyam. Recite Dua Qunoot silently.",
    recitations: [BISMILLAH, SURAH_FATIHAH, SURAH_IKHLAS, DUA_QUNOOT],
    note: "Witr is recited silently.",
  },
  {
    number: 18,
    title: "18. Ruku' (Bowing)",
    description: RUKU_DESCRIPTION,
    recitations: [TASBIH_RUKU],
  },
  {
    number: 19,
    title: "19. I'tidal (Standing After Ruku')",
    description: ITIDAL_DESCRIPTION,
    recitations: itidalRecitations,
  },
  {
    number: 20,
    title: "20. Sujood (First Prostration)",
    description: FIRST_SUJOOD_DESCRIPTION,
    recitations: [TASBIH_SUJOOD],
  },
  {
    number: 21,
    title: "21. Jalsah (Sitting Briefly)",
    description: JALSAH_DESCRIPTION,
    recitations: [JALSAH_DUA],
  },
  {
    number: 22,
    title: "22. Sujood (Second Prostration)",
    description:
      "Saying \"Allahu Akbar,\" return to prostration. The same seven body parts touch the ground: forehead, nose, both palms, both knees, and the curled toes of both feet. Place your palms beside your head as before. Recite the same tasbih at least three times:\n\nThis completes Rakah 3 — the final rakah of Witr. Saying \"Allahu Akbar,\" sit up for the Final Tashahhud.",
    recitations: [TASBIH_SUJOOD],
  },
  {
    number: 23,
    title: "23. Final Tashahhud (Sitting)",
    description: FINAL_TASHAHHUD_DESCRIPTION,
    recitations: finalTashahhudRecitations,
    note: FINAL_TASHAHHUD_NOTE,
  },
  {
    number: 24,
    title: "24. Tasleem (Closing the Prayer)",
    description:
      "Remaining in the sitting position, end the prayer by turning your head to the right and saying the salam. Then turn your head to the left and repeat the same words. Your prayer is now complete.\n\nYour 3-rakat Witr prayer is complete. May Allah accept it from you.",
    recitations: TASLEEM_RECITATIONS,
  },
];

export const prayerFlows: Record<PrayerType, PrayerFlowCard[]> = {
  "2rakat": withImages(twoRakat),
  "4rakat": withImages(fourRakat),
  "maghrib": withImages(maghrib),
  "witr": withImages(witr),
};
