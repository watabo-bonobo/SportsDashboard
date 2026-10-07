import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EventData, Sport } from './types';
import { buildBoard, buildSummary, formatClock, formatDate, jstDateKey, relativeDay, SPORT_LABEL } from './schedule';
import { validateEventData } from './validate';
import { EventRow, FeaturedCard, ResultRow, StandingsTable, SummaryBar } from './components';

const SPORTS: Sport[] = ['soccer', 'baseball', 'volleyball', 'basketball', 'handball', 'tabletennis'];
const PREFS_KEY = 'sports-dashboard:prefs';

type SportFilter = Sport | 'all';

interface Prefs {
  sport: SportFilter;
  featuredOnly: boolean;
}

const DEFAULT_PREFS: Prefs = { sport: 'all', featuredOnly: false };

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Prefs>;
      const sport = saved.sport && (saved.sport === 'all' || SPORTS.includes(saved.sport)) ? saved.sport : 'all';
      return { sport, featuredOnly: Boolean(saved.featuredOnly) };
    }
  } catch {
    // localStorage が使えない環境でも既定値で動く
  }
  return DEFAULT_PREFS;
}

/** ?now=2026-10-07 で「今日」を差し替えられる（表示確認用） */
function currentTime(): Date {
  const param = new URLSearchParams(location.search).get('now');
  if (param) {
    const d = new Date(param.includes('T') ? param : `${param}T12:00:00+09:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export default function App() {
  const [data, setData] = useState<EventData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [now, setNow] = useState(currentTime);

  const [rightTab, setRightTab] = useState<'results' | 'standings'>('results');
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  // 最新の events.json を取り直す（更新ボタンからも呼ぶ）
  const load = useCallback(() => {
    setLoading(true);
    // キャッシュに古いファイルが残っていても確実に最新を取るため、クエリを付ける
    fetch(`${import.meta.env.BASE_URL}data/events.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<EventData>;
      })
      .then((d) => {
        const problems = validateEventData(d);
        if (problems.length) console.warn('events.json に問題があります:\n' + problems.join('\n'));
        setData(d);
        setError(null);
        setFetchedAt(new Date());
        setNow(currentTime());
      })
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  // 日付が変わったら表示を更新
  useEffect(() => {
    const t = setInterval(() => setNow(currentTime()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // 保存できなくても動作には影響しない
    }
  }, [prefs]);

  const visible = useMemo(() => {
    if (!data) return null;
    return data.events.filter(
      (e) => (prefs.sport === 'all' || e.sport === prefs.sport) && (!prefs.featuredOnly || e.featured),
    );
  }, [data, prefs]);
  const standings = useMemo(
    () => (data?.standings ?? []).filter((t) => prefs.sport === 'all' || t.sport === prefs.sport),
    [data, prefs.sport],
  );
  const board = useMemo(() => (visible ? buildBoard(visible, now) : null), [visible, now]);
  const summary = useMemo(() => (visible ? buildSummary(visible, now) : null), [visible, now]);

  const today = jstDateKey(now);
  const filters: { key: SportFilter; label: string }[] = [
    { key: 'all', label: 'すべて' },
    ...SPORTS.map((sp) => ({ key: sp, label: SPORT_LABEL[sp] })),
  ];

  return (
    <div className="app">
      <header className="header">
        <div className="title">
          <h1>スポーツ観戦ダッシュボード</h1>
          <p className="lead">日本代表・Jリーグ・プロ野球・メジャー・バレー・バスケ・ハンドボール・卓球の予定、放送・配信、結果をまとめて確認できます。</p>
        </div>
        <div className="freshness">
          <p>
            <span className="label">今日</span>
            {formatDate(today)}
          </p>
          <p>
            <span className="label">データ更新</span>
            {data?.updatedAt ?? '―'}
          </p>
          <button type="button" className="refresh" onClick={load} disabled={loading}>
            <span className={loading ? 'spin' : undefined} aria-hidden="true">
              ↻
            </span>
            {loading ? '更新中…' : '最新に更新'}
          </button>
          <p className="fetched" aria-live="polite">
            {fetchedAt && !loading ? `${formatClock(fetchedAt)} に読み込みました` : ''}
          </p>
        </div>
      </header>

      <nav className="filters" aria-label="絞り込み">
        <div className="segmented" role="group" aria-label="競技">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={prefs.sport === f.key}
              onClick={() => setPrefs((p) => ({ ...p, sport: f.key }))}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={prefs.featuredOnly}
            onChange={(e) => setPrefs((p) => ({ ...p, featuredOnly: e.target.checked }))}
          />
          日本代表・注目のみ表示
        </label>
      </nav>

      {error && <p className="notice">データを読み込めませんでした（{error}）。時間をおいて「最新に更新」を押してください。</p>}
      {!board && !error && <p className="notice">読み込み中…</p>}

      {board && summary && (
        <>
          <SummaryBar summary={summary} />
          <nav className="jump" aria-label="ページ内の移動">
            <a href="#h-upcoming">これからの予定へ</a>
            <a href="#h-results">結果・順位表へ</a>
          </nav>

          <main className="grid">
            <section className="panel area-next" aria-labelledby="h-next">
              <h2 id="h-next" className="panel-title">
                次の注目試合・大会<span className="count">競技ごと</span>
              </h2>
              <div className="panel-body featured">
                {board.nextFeatured.length === 0 && <p className="empty">予定されている注目試合はありません</p>}
                {board.nextFeatured.map((e) => (
                  <FeaturedCard key={e.id} event={e} now={now} />
                ))}
              </div>
            </section>

            <section className="panel area-upcoming" aria-labelledby="h-upcoming">
              <h2 id="h-upcoming" className="panel-title">
                これからの予定<span className="count">{board.upcoming.reduce((n, g) => n + g.events.length, board.ongoing.length)}件</span>
              </h2>
              <div className="panel-body">
                {board.ongoing.length > 0 && (
                  <div className="day">
                    <h3 className="day-head is-today">開催中・本日</h3>
                    {board.ongoing.map((e) => (
                      <EventRow key={e.id} event={e} />
                    ))}
                  </div>
                )}
                {board.upcoming.length === 0 && board.ongoing.length === 0 && <p className="empty">予定はありません</p>}
                {board.upcoming.map((g) => (
                  <div className="day" key={g.date}>
                    <h3 className={`day-head${g.date === today ? ' is-today' : ''}`}>
                      {formatDate(g.date)}
                      <span className="rel">{relativeDay(g.date, now)}</span>
                    </h3>
                    {g.events.map((e) => (
                      <EventRow key={e.id} event={e} />
                    ))}
                  </div>
                ))}
              </div>
            </section>

            <section className="panel area-results" aria-labelledby="h-results">
              <div className="panel-title tabs" role="tablist" aria-label="結果と順位表">
                <h2 id="h-results" className="visually-hidden">
                  最近の結果・順位表
                </h2>
                <button
                  type="button"
                  role="tab"
                  id="tab-results"
                  aria-selected={rightTab === 'results'}
                  aria-controls="tabpanel-right"
                  onClick={() => setRightTab('results')}
                >
                  最近の結果<span className="count">{board.results.length}件</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-standings"
                  aria-selected={rightTab === 'standings'}
                  aria-controls="tabpanel-right"
                  onClick={() => setRightTab('standings')}
                >
                  順位表<span className="count">{standings.length}表</span>
                </button>
              </div>
              <div
                className="panel-body"
                id="tabpanel-right"
                role="tabpanel"
                aria-labelledby={rightTab === 'results' ? 'tab-results' : 'tab-standings'}
              >
                {rightTab === 'results' ? (
                  <>
                    <p className="panel-note">直近30日</p>
                    {board.results.length === 0 && <p className="empty">直近30日の結果はありません</p>}
                    {board.results.map((e) => (
                      <ResultRow key={e.id} event={e} now={now} />
                    ))}
                  </>
                ) : (
                  <>
                    {standings.length === 0 && <p className="empty">この競技の順位表はありません</p>}
                    {standings.map((t) => (
                      <StandingsTable key={t.id} table={t} />
                    ))}
                  </>
                )}
              </div>
            </section>
          </main>
        </>
      )}

      <footer className="footer">
        <p>
          情報元：JFA、Ｊリーグ公式、NPB、MLB、日本バレーボール協会、リーグＨ、テレ東卓球NEWS ほか報道・公式発表。1時間ごとに自動で集めています。
        </p>
        <p>放送・配信予定は変更されることがあります。最新の情報は各公式サイトでご確認ください。</p>
      </footer>
    </div>
  );
}
