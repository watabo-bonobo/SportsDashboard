import { useEffect, useMemo, useState } from 'react';
import type { EventData, Sport } from './types';
import { buildBoard, formatDate, jstDateKey, relativeDay, SPORT_ICON, SPORT_LABEL } from './schedule';
import { validateEventData } from './validate';
import { EventRow, FeaturedCard, ResultRow } from './components';

const SPORTS: Sport[] = ['soccer', 'volleyball', 'basketball', 'tabletennis'];
const PREFS_KEY = 'sports-dashboard:prefs';

interface Prefs {
  sports: Sport[];
  featuredOnly: boolean;
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { sports: SPORTS, featuredOnly: false, ...JSON.parse(raw) };
  } catch {
    // localStorage が使えない環境でも既定値で動く
  }
  return { sports: SPORTS, featuredOnly: false };
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

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/events.json`, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<EventData>;
      })
      .then((d) => {
        const problems = validateEventData(d);
        if (problems.length) console.warn('events.json に問題があります:\n' + problems.join('\n'));
        setData(d);
      })
      .catch((e: unknown) => setError(String(e)));
  }, []);

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

  const board = useMemo(() => {
    if (!data) return null;
    const visible = data.events.filter(
      (e) => prefs.sports.includes(e.sport) && (!prefs.featuredOnly || e.featured),
    );
    return buildBoard(visible, now);
  }, [data, prefs, now]);

  const toggleSport = (s: Sport) =>
    setPrefs((p) => {
      const next = p.sports.includes(s) ? p.sports.filter((x) => x !== s) : [...p.sports, s];
      return { ...p, sports: next.length ? next : SPORTS };
    });

  const today = jstDateKey(now);

  return (
    <div className="app">
      <header className="header">
        <div className="title">
          <h1>観戦ダッシュボード</h1>
          <span className="today">
            {formatDate(today)}
            {data && <span className="updated"> ・ データ更新 {data.updatedAt}</span>}
          </span>
        </div>
        <nav className="filters" aria-label="絞り込み">
          {SPORTS.map((s) => (
            <button
              key={s}
              type="button"
              className="chip"
              aria-pressed={prefs.sports.includes(s)}
              onClick={() => toggleSport(s)}
            >
              {SPORT_ICON[s]} {SPORT_LABEL[s]}
            </button>
          ))}
          <label className="toggle">
            <input
              type="checkbox"
              checked={prefs.featuredOnly}
              onChange={(e) => setPrefs((p) => ({ ...p, featuredOnly: e.target.checked }))}
            />
            日本代表・注目のみ
          </label>
        </nav>
      </header>

      {error && <p className="notice">データを読み込めませんでした（{error}）</p>}
      {!board && !error && <p className="notice">読み込み中…</p>}

      {board && (
        <>
          {board.nextFeatured.length > 0 && (
            <section className="featured" aria-label="次の日本代表戦・注目イベント">
              {board.nextFeatured.map((e) => (
                <FeaturedCard key={e.id} event={e} now={now} />
              ))}
            </section>
          )}

          <main className="grid">
            <section className="panel">
              <h2>これからの予定</h2>
              {board.ongoing.length > 0 && (
                <div className="day">
                  <h3 className="day-head live">開催中・本日</h3>
                  {board.ongoing.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              )}
              {board.upcoming.length === 0 && board.ongoing.length === 0 && (
                <p className="empty">予定はありません</p>
              )}
              {board.upcoming.map((g) => (
                <div className="day" key={g.date}>
                  <h3 className="day-head">
                    {formatDate(g.date)}
                    <span className="rel">{relativeDay(g.date, now)}</span>
                  </h3>
                  {g.events.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              ))}
            </section>

            <section className="panel">
              <h2>最近の結果</h2>
              {board.results.length === 0 && <p className="empty">直近30日の結果はありません</p>}
              {board.results.map((e) => (
                <ResultRow key={e.id} event={e} now={now} />
              ))}
            </section>
          </main>
        </>
      )}

      <footer className="footer">
        放送・配信予定は変更されることがあります。最新情報は各公式サイトでご確認ください。
      </footer>
    </div>
  );
}
