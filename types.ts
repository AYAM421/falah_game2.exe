
export type CharacterName = 
  | 'عبدالله' 
  | 'حمزة' 
  | 'الأيهم' 
  | 'عبدالحميد' 
  | 'عبدالوهاب' 
  | 'محمد العزواني' 
  | 'قيس' 
  | 'محمد نبيل' 
  | 'منذر';

export const CHARACTERS: CharacterName[] = [
  'عبدالله', 'حمزة', 'الأيهم', 'عبدالحميد', 'عبدالوهاب', 
  'محمد العزواني', 'قيس', 'محمد نبيل', 'منذر'
];

export interface CharacterStats {
  speed: number;      // Multiplier for movement speed (0.8 to 1.3)
  stamina: number;    // How long they can run (0.5 to 1.5)
  battery: number;    // Battery drain rate (lower is better) (0.8 to 1.5)
  stealth: number;    // Noise reduction multiplier (lower is better)
  description: string;
}

export const CHARACTER_TRAITS: Record<CharacterName, CharacterStats> = {
  'عبدالله': { 
    speed: 1.0, stamina: 1.0, battery: 1.0, stealth: 1.0, 
    description: "متوازن: جيد في كل شيء." 
  },
  'حمزة': { 
    speed: 1.3, stamina: 1.2, battery: 1.5, stealth: 1.2, 
    description: "العداء: سريع جداً لكنه يستهلك البطارية بسرعة." 
  },
  'الأيهم': { 
    speed: 0.9, stamina: 0.8, battery: 0.5, stealth: 1.0, 
    description: "التقني: بطاريته تدوم طويلاً جداً، لكنه بطيء الحركة." 
  },
  'عبدالحميد': { 
    speed: 1.1, stamina: 0.7, battery: 1.0, stealth: 1.0, 
    description: "المغامر: سريع الحركة لكن لياقته تنفد بسرعة." 
  },
  'عبدالوهاب': { 
    speed: 0.9, stamina: 1.0, battery: 1.0, stealth: 0.5, 
    description: "الشبح: خطواته هادئة جداً، يصعب على فلاح سماعه." 
  },
  'محمد العزواني': { 
    speed: 1.05, stamina: 1.1, battery: 0.9, stealth: 1.1, 
    description: "تكتيكي: توازن جيد مع أفضلية بسيطة في البطارية." 
  },
  'قيس': { 
    speed: 1.15, stamina: 1.3, battery: 1.2, stealth: 1.5, 
    description: "المتهور: سريع جداً ولياقته عالية، لكنه مزعج ويجذب الانتباه." 
  },
  'محمد نبيل': { 
    speed: 0.85, stamina: 0.9, battery: 0.7, stealth: 0.8, 
    description: "الحذر: بطيء وحذر، يوفر البطارية ولا يصدر ضجيجاً." 
  },
  'منذر': { 
    speed: 1.0, stamina: 1.5, battery: 1.1, stealth: 0.9, 
    description: "الصمود: لياقة بدنية عالية جداً للركض الطويل." 
  }
};

export interface GameStats {
  level: number;
  timeSurvived: number;
  escapes: number;
}

export type GameState = 'MENU' | 'PLAYING' | 'JUMPSCARE' | 'GAME_OVER' | 'WIN_LEVEL' | 'STRUGGLE';
export type BossType = 'FALAH' | 'SAIF' | 'TRANSFORMING';

export interface Position {
  x: number;
  y: number;
  z: number;
}
