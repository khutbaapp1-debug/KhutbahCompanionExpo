export type WuduRecitation = {
  arabic: string;
  transliteration: string;
  meaning: string;
  name: string;
};

export type WuduStep = {
  number: number;
  title: string;
  description: string;
  recitations?: WuduRecitation[];
  note?: string;
};

export const wuduSteps: WuduStep[] = [
  {
    number: 1,
    title: "Niyyah (Intention)",
    description:
      "Make the intention in your heart that you are about to perform wudu (ablution) in preparation for prayer. The intention does not need to be spoken aloud — it is an act of the heart.",
  },
  {
    number: 2,
    title: "Bismillah",
    description:
      "Begin by saying 'Bismillah' (In the name of Allah) before letting water touch your body.",
    recitations: [
      {
        name: "Bismillah",
        arabic: "بِسْمِ اللَّهِ",
        transliteration: "Bismillah",
        meaning: "In the name of Allah.",
      },
    ],
  },
  {
    number: 3,
    title: "Wash the Hands",
    description:
      "Wash your right hand up to the wrist, then your left hand. Repeat this three times. Make sure water reaches between the fingers, and that no part of the hands is left dry.",
  },
  {
    number: 4,
    title: "Rinse the Mouth (Madmadah)",
    description:
      "Using your right hand, bring water to your mouth, gargle and swirl it around, then spit it out. Repeat this three times.",
    note: "If fasting, rinse gently without gargling so water does not reach the throat.",
  },
  {
    number: 5,
    title: "Cleanse the Nose (Istinshaq)",
    description:
      "Using your right hand, take water and draw it up into your nostrils. Then use your left hand to blow the water out. Repeat this three times.",
    note: "If fasting, draw water in gently — avoid letting it go deep into the nose.",
  },
  {
    number: 6,
    title: "Wash the Face",
    description:
      "Using both hands, wash your face thoroughly — from the top of your forehead down to the bottom of your chin, and from one earlobe to the other. Repeat this three times. Make sure no part of your face stays dry.",
    note: "If you have a beard, run wet fingers through it to ensure the water reaches the skin underneath where possible.",
  },
  {
    number: 7,
    title: "Wash the Arms",
    description:
      "Cup water in your hand and let it run down your right arm, washing from the fingertips up to and including the elbow. Then do the same with your left arm. Repeat this three times. Make sure water reaches any skin beneath rings or watches.",
  },
  {
    number: 8,
    title: "Wipe the Head, Ears, and Neck (Masah)",
    description:
      "Wet both hands with fresh water. Place your palms flat on the front of your head, then move them back over your head to the nape of your neck. Using the back of your hands, bring them forward from the nape to where you started.\n\nWithout re-wetting, use your index fingers to wipe the inside of your ears, and your thumbs to wipe behind your ears. Then, with the backs of your middle fingers, wipe the back of your neck once. This is all done once.",
  },
  {
    number: 9,
    title: "Wash the Feet",
    description:
      "Wash your right foot from the toes up to and including the ankle, then wash your left foot in the same way. Repeat this three times. Use the little finger of your left hand to run between each toe, making sure water reaches the skin in between.",
  },
  {
    number: 10,
    title: "Closing Dua",
    description:
      "Once you have completed all the previous steps, your wudu is done. Recite the closing dua to seal it.",
    recitations: [
      {
        name: "Shahada after Wudu",
        arabic:
          "أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
        transliteration:
          "Ash-hadu an la ilaha illa Allah, wahdahu la sharika lah, wa ash-hadu anna Muhammadan abduhu wa rasuluh.",
        meaning:
          "I bear witness that there is no god but Allah, alone, with no partner, and I bear witness that Muhammad is His servant and messenger.",
      },
      {
        name: "Closing Dua",
        arabic:
          "اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ، وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ",
        transliteration:
          "Allahumma j'alni minat-tawwabeen, waj'alni minal-mutatahhireen.",
        meaning:
          "O Allah, make me among those who repent, and make me among those who purify themselves.",
      },
    ],
  },
];
