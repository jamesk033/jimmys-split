/**
 * Daily Bible verse (KJV). Shared rules with the TradingView indicator and the other Jimmy site,
 * so all three show the exact same verse on the same day. Do not edit, reorder, add or remove verses.
 *
 * - 90 verses, index 0 = verse #1.
 * - Date taken in America/New_York; the verse changes at midnight there.
 * - dayNumber = floor(Date.UTC(y, m - 1, d) / 86400000); index = dayNumber % 90.
 *
 * Each entry is one string: the verse text, a newline, then the reference with (KJV).
 */
export const VERSE_TZ = "America/New_York";

export const VERSES: string[] = [
  "I can do all things through Christ which strengtheneth me.\nPhilippians 4:13 (KJV)",
  "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.\nIsaiah 40:31 (KJV)",
  "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.\nJoshua 1:9 (KJV)",
  "Commit thy works unto the LORD, and thy thoughts shall be established.\nProverbs 16:3 (KJV)",
  "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.\nJeremiah 29:11 (KJV)",
  "But thou shalt remember the LORD thy God: for it is he that giveth thee power to get wealth.\nDeuteronomy 8:18 (KJV)",
  "He becometh poor that dealeth with a slack hand: but the hand of the diligent maketh rich.\nProverbs 10:4 (KJV)",
  "Wealth gotten by vanity shall be diminished: but he that gathereth by labour shall increase.\nProverbs 13:11 (KJV)",
  "The thoughts of the diligent tend only to plenteousness; but of every one that is hasty only to want.\nProverbs 21:5 (KJV)",
  "And let us not be weary in well doing: for in due season we shall reap, if we faint not.\nGalatians 6:9 (KJV)",
  "Blessed is the man that endureth temptation: for when he is tried, he shall receive the crown of life, which the Lord hath promised to them that love him.\nJames 1:12 (KJV)",
  "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.\n2 Timothy 1:7 (KJV)",
  "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.\nIsaiah 41:10 (KJV)",
  "The LORD is my strength and my shield; my heart trusted in him, and I am helped.\nPsalm 28:7 (KJV)",
  "Delight thyself also in the LORD; and he shall give thee the desires of thine heart.\nPsalm 37:4 (KJV)",
  "Commit thy way unto the LORD; trust also in him; and he shall bring it to pass.\nPsalm 37:5 (KJV)",
  "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.\nProverbs 3:5-6 (KJV)",
  "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.\nMatthew 6:33 (KJV)",
  "But my God shall supply all your need according to his riches in glory by Christ Jesus.\nPhilippians 4:19 (KJV)",
  "Know ye not that they which run in a race run all, but one receiveth the prize? So run, that ye may obtain.\n1 Corinthians 9:24 (KJV)",
  "Know ye not that your body is the temple of the Holy Ghost which is in you? Therefore glorify God in your body, and in your spirit, which are God's.\n1 Corinthians 6:19-20 (KJV)",
  "Beloved, I wish above all things that thou mayest prosper and be in health, even as thy soul prospereth.\n3 John 1:2 (KJV)",
  "Seest thou a man diligent in his business? he shall stand before kings; he shall not stand before mean men.\nProverbs 22:29 (KJV)",
  "And whatsoever ye do, do it heartily, as to the Lord, and not unto men.\nColossians 3:23 (KJV)",
  "Whatsoever thy hand findeth to do, do it with thy might.\nEcclesiastes 9:10 (KJV)",
  "I have fought a good fight, I have finished my course, I have kept the faith.\n2 Timothy 4:7 (KJV)",
  "Neither be ye sorry; for the joy of the LORD is your strength.\nNehemiah 8:10 (KJV)",
  "God is our refuge and strength, a very present help in trouble.\nPsalm 46:1 (KJV)",
  "It is God that girdeth me with strength, and maketh my way perfect.\nPsalm 18:32 (KJV)",
  "My flesh and my heart faileth: but God is the strength of my heart, and my portion for ever.\nPsalm 73:26 (KJV)",
  "He giveth power to the faint; and to them that have no might he increaseth strength.\nIsaiah 40:29 (KJV)",
  "My grace is sufficient for thee: for my strength is made perfect in weakness.\n2 Corinthians 12:9 (KJV)",
  "Finally, my brethren, be strong in the Lord, and in the power of his might.\nEphesians 6:10 (KJV)",
  "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.\nRomans 8:28 (KJV)",
  "What shall we then say to these things? If God be for us, who can be against us?\nRomans 8:31 (KJV)",
  "And be not conformed to this world: but be ye transformed by the renewing of your mind.\nRomans 12:2 (KJV)",
  "Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.\n2 Corinthians 5:17 (KJV)",
  "Forgetting those things which are behind, and reaching forth unto those things which are before, I press toward the mark for the prize of the high calling of God in Christ Jesus.\nPhilippians 3:13-14 (KJV)",
  "Being confident of this very thing, that he which hath begun a good work in you will perform it until the day of Jesus Christ.\nPhilippians 1:6 (KJV)",
  "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend.\nProverbs 27:17 (KJV)",
  "For a just man falleth seven times, and riseth up again.\nProverbs 24:16 (KJV)",
  "In all labour there is profit: but the talk of the lips tendeth only to penury.\nProverbs 14:23 (KJV)",
  "The soul of the sluggard desireth, and hath nothing: but the soul of the diligent shall be made fat.\nProverbs 13:4 (KJV)",
  "Honour the LORD with thy substance, and with the firstfruits of all thine increase: So shall thy barns be filled with plenty.\nProverbs 3:9-10 (KJV)",
  "He that is faithful in that which is least is faithful also in much.\nLuke 16:10 (KJV)",
  "For which of you, intending to build a tower, sitteth not down first, and counteth the cost, whether he have sufficient to finish it?\nLuke 14:28 (KJV)",
  "The rich ruleth over the poor, and the borrower is servant to the lender.\nProverbs 22:7 (KJV)",
  "Give a portion to seven, and also to eight; for thou knowest not what evil shall be upon the earth.\nEcclesiastes 11:2 (KJV)",
  "There is treasure to be desired and oil in the dwelling of the wise; but a foolish man spendeth it up.\nProverbs 21:20 (KJV)",
  "Without counsel purposes are disappointed: but in the multitude of counsellors they are established.\nProverbs 15:22 (KJV)",
  "A man's heart deviseth his way: but the LORD directeth his steps.\nProverbs 16:9 (KJV)",
  "He that is slow to anger is better than the mighty; and he that ruleth his spirit than he that taketh a city.\nProverbs 16:32 (KJV)",
  "He that hath no rule over his own spirit is like a city that is broken down, and without walls.\nProverbs 25:28 (KJV)",
  "For bodily exercise profiteth little: but godliness is profitable unto all things.\n1 Timothy 4:8 (KJV)",
  "And he shall be like a tree planted by the rivers of water, that bringeth forth his fruit in his season; his leaf also shall not wither; and whatsoever he doeth shall prosper.\nPsalm 1:3 (KJV)",
  "For then thou shalt make thy way prosperous, and then thou shalt have good success.\nJoshua 1:8 (KJV)",
  "This is the day which the LORD hath made; we will rejoice and be glad in it.\nPsalm 118:24 (KJV)",
  "His compassions fail not. They are new every morning: great is thy faithfulness.\nLamentations 3:22-23 (KJV)",
  "With men this is impossible; but with God all things are possible.\nMatthew 19:26 (KJV)",
  "If thou canst believe, all things are possible to him that believeth.\nMark 9:23 (KJV)",
  "Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you.\nMatthew 7:7 (KJV)",
  "Now faith is the substance of things hoped for, the evidence of things not seen.\nHebrews 11:1 (KJV)",
  "If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.\nJames 1:5 (KJV)",
  "My brethren, count it all joy when ye fall into divers temptations; Knowing this, that the trying of your faith worketh patience.\nJames 1:2-3 (KJV)",
  "The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?\nPsalm 27:1 (KJV)",
  "I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD, which made heaven and earth.\nPsalm 121:1-2 (KJV)",
  "Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.\nIsaiah 26:3 (KJV)",
  "Be strong and of a good courage, fear not: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee.\nDeuteronomy 31:6 (KJV)",
  "Watch ye, stand fast in the faith, quit you like men, be strong.\n1 Corinthians 16:13 (KJV)",
  "Be ye stedfast, unmoveable, always abounding in the work of the Lord, forasmuch as ye know that your labour is not in vain in the Lord.\n1 Corinthians 15:58 (KJV)",
  "For ye have need of patience, that, after ye have done the will of God, ye might receive the promise.\nHebrews 10:36 (KJV)",
  "Be ye strong therefore, and let not your hands be weak: for your work shall be rewarded.\n2 Chronicles 15:7 (KJV)",
  "Keep thy heart with all diligence; for out of it are the issues of life.\nProverbs 4:23 (KJV)",
  "A merry heart doeth good like a medicine: but a broken spirit drieth the bones.\nProverbs 17:22 (KJV)",
  "The blessing of the LORD, it maketh rich, and he addeth no sorrow with it.\nProverbs 10:22 (KJV)",
  "He that loveth silver shall not be satisfied with silver; nor he that loveth abundance with increase.\nEcclesiastes 5:10 (KJV)",
  "For the love of money is the root of all evil.\n1 Timothy 6:10 (KJV)",
  "Be content with such things as ye have: for he hath said, I will never leave thee, nor forsake thee.\nHebrews 13:5 (KJV)",
  "Be of good courage, and he shall strengthen your heart, all ye that hope in the LORD.\nPsalm 31:24 (KJV)",
  "The LORD is my strength and song, and he is become my salvation.\nExodus 15:2 (KJV)",
  "The LORD God is my strength, and he will make my feet like hinds' feet, and he will make me to walk upon mine high places.\nHabakkuk 3:19 (KJV)",
  "When I fall, I shall arise; when I sit in darkness, the LORD shall be a light unto me.\nMicah 7:8 (KJV)",
  "Though thy beginning was small, yet thy latter end should greatly increase.\nJob 8:7 (KJV)",
  "And establish thou the work of our hands upon us; yea, the work of our hands establish thou it.\nPsalm 90:17 (KJV)",
  "The hand of the diligent shall bear rule: but the slothful shall be under tribute.\nProverbs 12:24 (KJV)",
  "A faithful man shall abound with blessings: but he that maketh haste to be rich shall not be innocent.\nProverbs 28:20 (KJV)",
  "The LORD is my shepherd; I shall not want.\nPsalm 23:1 (KJV)",
  "Behold, I will do a new thing; now it shall spring forth; I will even make a way in the wilderness, and rivers in the desert.\nIsaiah 43:19 (KJV)",
  "For which cause we faint not; but though our outward man perish, yet the inward man is renewed day by day.\n2 Corinthians 4:16 (KJV)",
  "Not slothful in business; fervent in spirit; serving the Lord.\nRomans 12:11 (KJV)",
];

export const VERSE_COUNT = 90;

/** Today's date in New York as YYYY-MM-DD. */
export function verseDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: VERSE_TZ }).format(now);
}

/** Index into VERSES for a YYYY-MM-DD date (New York calendar day). */
export function verseIndex(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const dayNumber = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  return dayNumber % VERSE_COUNT;
}

/** Today's verse split into text and "Reference (KJV)". */
export function verseOfDay(now: Date = new Date()): { index: number; text: string; reference: string } {
  const index = verseIndex(verseDate(now));
  const [text, reference] = VERSES[index].split("\n");
  return { index, text, reference };
}
