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

export interface EventData {
  updatedAt: string;
  events: SportEvent[];
  /** 順位表（自動収集。なければ表示しない） */
  standings?: Standings[];
}
