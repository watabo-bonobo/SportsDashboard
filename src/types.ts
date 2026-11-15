export type Sport = 'soccer' | 'baseball' | 'volleyball' | 'basketball' | 'handball' | 'tabletennis';

/** tv: 地上波 / bs: BS・CS / net: ネット配信 */
export type BroadcastKind = 'tv' | 'bs' | 'net';

export interface Broadcast {
  name: string;
  kind: BroadcastKind;
  url?: string;
  /** 「録画」「ハイライト」「日本戦のみ」などの補足 */
  note?: string;
}

export interface Result {
  home: number;
  away: number;
  /** PK や延長、セットスコアなどの補足 */
  note?: string;
}

/** 得点（サッカー）。minute は "45+6'" のような表記のまま */
export interface Goal {
  side: 'home' | 'away';
  player: string;
  minute: string;
}

export interface SportEvent {
  id: string;
  sport: Sport;
  /** 大会・リーグ名（例: 明治安田J1リーグ） */
  competition: string;
  /** 節・ラウンド（例: 第9節、準決勝） */
  round?: string;
  /** 対戦形式の試合 */
  home?: string;
  away?: string;
  /** 大会形式（卓球のWTTなど）の場合の表示名 */
  title?: string;
  /**
   * 開始日時。時刻が決まっていれば "2026-10-10T14:00:00+09:00"、
   * 未定なら日付のみ "2026-11-26"。
   */
  start: string;
  /** 複数日にわたる大会の最終日（日付のみ） */
  end?: string;
  venue?: string;
  /** 補足（MLB の試合に出る日本人選手など） */
  note?: string;
  broadcasts?: Broadcast[];
  result?: Result;
  /** 得点者（鹿島と日本代表の試合だけ） */
  goals?: Goal[];
  /** 日本代表の試合など、強調表示したいもの */
  featured?: boolean;
  /** 情報の出典 URL */
  source?: string;
}

export interface StandingRow {
  rank: number;
  team: string;
  played?: number;
  win: number;
  draw?: number;
  loss: number;
  /** サッカーの勝点 */
  points?: number;
  /** サッカーの得失点差 */
  diff?: number;
  /** 野球のゲーム差（首位は "-"） */
  gb?: string;
  /** 補足（MLB の日本人選手など）。あれば行を強調する */
  note?: string;
  /** 直近の試合（古い順、最大5試合）。J1 のみ */
  form?: FormResult[];
  /** 第1節からの各節終了時点の順位（その節に試合が無い場合は null）。J1 のみ */
  ranks?: (number | null)[];
}

export interface FormResult {
  /** "YYYY-MM-DD" */
  date: string;
  opponent: string;
  /** ホームゲームか */
  home: boolean;
  /** 自チームの得点-相手の得点 */
  score: string;
  outcome: 'win' | 'draw' | 'loss';
}

export interface Standings {
  id: string;
  sport: Sport;
  /** 表の名前（例: 明治安田J1リーグ、セ・リーグ） */
  title: string;
  rows: StandingRow[];
  source?: string;
}

/** 鹿島の選手。成績は今季 J1（出場・得点・アシスト・警告・退場） */
export interface SquadPlayer {
  id: string;
  number?: number;
  position: 'GK' | 'DF' | 'MF' | 'FW';
  name: string;
  /** Ｊリーグ公式の選手ページ */
  url: string;
  apps: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  /** 最後に出場した日（全大会）"YYYY-MM-DD" */
  lastPlayed?: string;
  statsAt?: string;
}

/** national: 代表招集 / injury: 負傷 / suspension: 出場停止 */
export type AbsenceKind = 'national' | 'injury' | 'suspension';

export interface Absence {
  kind: AbsenceKind;
  player: string;
  playerId?: string;
  /** 代表チーム名、診断名と治療期間、停止になる試合など */
  detail: string;
  /** 始まり（負傷した日、代表活動の初日）"YYYY-MM-DD" */
  from?: string;
  /** 終わり（代表活動の最終日、停止になる最後の試合の日）"YYYY-MM-DD" */
  until?: string;
  /** 発表日 "YYYY-MM-DD" */
  announced?: string;
  source?: string;
}

export interface Squad {
  updatedAt?: string;
  players: SquadPlayer[];
  /** いま出られない選手（終わったものは収集時に外してある） */
  absences: Absence[];
  source?: string;
  /** 収集用（読み終えたお知らせ） */
  checked?: string[];
}

export interface EventData {
  updatedAt: string;
  events: SportEvent[];
  /** 順位表（自動収集。なければ表示しない） */
  standings?: Standings[];
  /** 鹿島のメンバーと不在（自動収集。なければ表示しない） */
  kashima?: Squad;
}
