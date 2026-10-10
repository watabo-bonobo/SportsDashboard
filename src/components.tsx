import type { Broadcast, FormResult, Sport, SportEvent, StandingRow, Standings } from './types';
import type { Side } from './schedule';
import {
  eventTitle,
  formatDate,
  formatPeriod,
  formatTime,
  googleCalendarUrl,
  JAPAN,
  sideOutcome,
  relativeDay,
  SPORT_LABEL,
  startDateKey,
} from './schedule';
import type { Outcome, Summary } from './schedule';

const KIND_LABEL: Record<Broadcast['kind'], string> = { tv: '地上波', bs: 'BS/CS', net: '配信' };
const OUTCOME_LABEL: Record<Outcome, string> = { win: '勝', draw: '分', loss: '敗' };

export function SportTag({ sport }: { sport: Sport }) {
  return <span className={`tag sport-${sport}`}>{SPORT_LABEL[sport]}</span>;
}

function Broadcasts({ items }: { items?: Broadcast[] }) {
  if (!items?.length) return <p className="bc-none">放送・配信：未定</p>;
  return (
    <ul className="bcs" aria-label="放送・配信">
      {items.map((b) => (
        <li key={b.name} className={`bc bc-${b.kind}`} title={b.note}>
          <span className="bc-kind">{KIND_LABEL[b.kind]}</span>
          {b.url ? (
            <a href={b.url} target="_blank" rel="noreferrer">
              {b.name}
            </a>
          ) : (
            b.name
          )}
        </li>
      ))}
    </ul>
  );
}

function Links({ event }: { event: SportEvent }) {
  return (
    <div className="links">
      <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer">
        カレンダーに追加
      </a>
      {event.source && (
        <a href={event.source} target="_blank" rel="noreferrer">
          出典
        </a>
      )}
    </div>
  );
}

export function SummaryBar({ summary, side = JAPAN }: { summary: Summary; side?: Side }) {
  const { win, draw, loss } = summary.record;
  const items = [
    { label: '今日の試合・大会', value: summary.today, unit: '件' },
    { label: '今後7日間', value: summary.week, unit: '件' },
    { label: 'うち地上波で見られる', value: summary.freeTv, unit: '件' },
  ];
  return (
    <section className="summary" aria-label="概要">
      {items.map((it) => (
        <div className="stat" key={it.label}>
          <p className="stat-label">{it.label}</p>
          <p className="stat-value">
            {it.value}
            <span className="stat-unit">{it.unit}</span>
          </p>
        </div>
      ))}
      <div className="stat">
        <p className="stat-label">{side === JAPAN ? '日本代表' : side.label} 直近30日の成績</p>
        <p className="stat-value">
          {win}
          <span className="stat-unit">勝</span>
          {draw}
          <span className="stat-unit">分</span>
          {loss}
          <span className="stat-unit">敗</span>
        </p>
      </div>
    </section>
  );
}

export function EventRow({ event }: { event: SportEvent }) {
  return (
    <article className={`row${event.featured ? ' is-featured' : ''}`}>
      <p className="when">{event.end ? formatPeriod(event) : formatTime(event)}</p>
      <div className="body">
        <p className="meta">
          <SportTag sport={event.sport} />
          <span>
            {event.competition}
            {event.round && ` ${event.round}`}
          </span>
        </p>
        <h4 className="match">{eventTitle(event)}</h4>
        {event.venue && <p className="venue">{event.venue}</p>}
        {event.note && <p className="note">{event.note}</p>}
      </div>
      <div className="side">
        <Broadcasts items={event.broadcasts} />
        <Links event={event} />
      </div>
    </article>
  );
}

export function ResultRow({ event, now, side = JAPAN }: { event: SportEvent; now: Date; side?: Side }) {
  const r = event.result;
  const outcome = sideOutcome(event, side);
  const endKey = event.end ?? startDateKey(event);
  return (
    <article className={`result${event.featured ? ' is-featured' : ''}`}>
      <p className="meta">
        <SportTag sport={event.sport} />
        <span>
          {formatDate(endKey)}（{relativeDay(endKey, now)}）
        </span>
        <span className="muted">
          {event.competition}
          {event.round && ` ${event.round}`}
        </span>
      </p>
      {event.home && event.away ? (
        <div className="score">
          <span className="team home">{event.home}</span>
          <span className="pts">{r ? `${r.home} - ${r.away}` : '―'}</span>
          <span className="team away">{event.away}</span>
        </div>
      ) : (
        <h4 className="match">{eventTitle(event)}</h4>
      )}
      {event.note && <p className="note">{event.note}</p>}
      <div className="result-foot">
        {outcome && <span className={`outcome outcome-${outcome}`}>{side.label} {OUTCOME_LABEL[outcome]}</span>}
        {r?.note && <span>{r.note}</span>}
        {!r && <span className="muted">{event.home ? '結果は未反映です' : '大会終了'}</span>}
        {event.source && (
          <a className="push-right" href={event.source} target="_blank" rel="noreferrer">
            出典
          </a>
        )}
      </div>
    </article>
  );
}

export function FeaturedCard({ event, now }: { event: SportEvent; now: Date }) {
  const date = startDateKey(event);
  return (
    <article className={`card sport-${event.sport}`}>
      <p className="meta">
        <SportTag sport={event.sport} />
        <span className="countdown">{relativeDay(date, now)}</span>
      </p>
      <h3 className="card-match">{eventTitle(event)}</h3>
      <p className="card-when">{event.end ? formatPeriod(event) : `${formatDate(date)} ${formatTime(event)}`}</p>
      <p className="card-sub" title={event.competition}>
        {event.competition}
        {event.round && ` ${event.round}`}
      </p>
      {event.venue && (
        <p className="card-sub" title={event.venue}>
          {event.venue}
        </p>
      )}
      {event.note && (
        <p className="card-sub note" title={event.note}>
          {event.note}
        </p>
      )}
      <Broadcasts items={event.broadcasts} />
    </article>
  );
}

export function StandingsTable({ table, side }: { table: Standings; side?: Side }) {
  const soccer = table.rows.some((r) => r.points !== undefined);
  const withForm = table.rows.some((r) => r.form?.length);
  return (
    <section className="standings" aria-label={`${table.title} 順位表`}>
      <h3 className="standings-title">
        <SportTag sport={table.sport} />
        <span>{table.title}</span>
        {table.source && (
          <a className="push-right" href={table.source} target="_blank" rel="noreferrer">
            出典
          </a>
        )}
      </h3>
      <table>
        <thead>
          <tr>
            <th scope="col">順位</th>
            <th scope="col" className="team-col">
              チーム
            </th>
            <th scope="col">試合</th>
            <th scope="col">勝</th>
            {soccer && <th scope="col">分</th>}
            <th scope="col">敗</th>
            {soccer ? (
              <>
                <th scope="col">差</th>
                <th scope="col">勝点</th>
              </>
            ) : (
              <th scope="col">差</th>
            )}
            {withForm && (
              <th scope="col" className="form-col">
                直近5試合
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.team} className={r.note || side?.is(r.team) ? 'is-featured' : undefined}>
              <td>{r.rank}</td>
              <th scope="row" className="team-col">
                {r.team}
                {r.note && <span className="row-note">{r.note}</span>}
              </th>
              <td>{r.played ?? '―'}</td>
              <td>{r.win}</td>
              {soccer && <td>{r.draw ?? 0}</td>}
              <td>{r.loss}</td>
              {soccer ? (
                <>
                  <td>{r.diff !== undefined && r.diff > 0 ? `+${r.diff}` : (r.diff ?? '―')}</td>
                  <td className="pts-col">{r.points}</td>
                </>
              ) : (
                <td>{r.gb ?? '―'}</td>
              )}
              {withForm && (
                <td className="form-col">
                  <FormBadges form={r.form} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {withForm && <p className="standings-note">直近5試合は左が古く、右が最新です。</p>}
    </section>
  );
}

/** "10/9 G大阪(H) 2-0 勝" */
function formText(f: FormResult): string {
  return `${formatDate(f.date)} ${f.opponent}(${f.home ? 'H' : 'A'}) ${f.score} ${OUTCOME_LABEL[f.outcome]}`;
}

/** 直近の勝敗。色だけに頼らず「勝・分・敗」の文字で示す（古い順に左から） */
export function FormBadges({ form }: { form?: FormResult[] }) {
  if (!form?.length) return <span className="form-none">―</span>;
  return (
    <span className="form" role="list" aria-label="直近の試合（古い順）">
      {form.map((f) => (
        <span key={f.date + f.opponent} role="listitem" className={`form-badge form-${f.outcome}`} title={formText(f)} aria-label={formText(f)}>
          {OUTCOME_LABEL[f.outcome]}
        </span>
      ))}
    </span>
  );
}

/** 鹿島など、応援クラブの調子（順位・直近5試合・順位の推移） */
export function TeamFormCard({ row, label }: { row: StandingRow; label: string }) {
  const ranks = row.ranks ?? [];
  const last = [...ranks].reverse().find((r) => r !== null) ?? row.rank;
  const prevIdx = ranks.length - 2;
  const prev = prevIdx >= 0 ? ranks[prevIdx] : null;
  const move = prev !== null && prev !== undefined ? prev - last : 0;
  return (
    <article className="card team-form sport-soccer">
      <p className="meta">
        <SportTag sport="soccer" />
        <span>{label}の調子（J1）</span>
      </p>
      <p className="team-form-rank">
        <span className="big">{row.rank}</span>位
        <span className="team-form-sub">
          勝点{row.points}・{row.win}勝{row.draw ?? 0}分{row.loss}敗
          {move !== 0 && <span className={move > 0 ? 'up' : 'down'}>{move > 0 ? `前節から${move}つ上昇` : `前節から${-move}つ下降`}</span>}
        </span>
      </p>
      {row.form?.length ? (
        <>
          <h4 className="team-form-head">直近5試合（新しい順）</h4>
          <ul className="team-form-list">
            {[...row.form].reverse().map((f) => (
              <li key={f.date + f.opponent}>
                <span className={`form-badge form-${f.outcome}`} aria-hidden="true">
                  {OUTCOME_LABEL[f.outcome]}
                </span>
                <span className="when">{formatDate(f.date)}</span>
                <span>
                  {f.opponent}
                  <span className="ha">{f.home ? 'ホーム' : 'アウェー'}</span>
                </span>
                <span className="team-form-score">{f.score}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {ranks.filter((r) => r !== null).length >= 2 && (
        <>
          <h4 className="team-form-head">順位の推移（節ごと）</h4>
          <RankChart ranks={ranks} teams={20} />
        </>
      )}
    </article>
  );
}

/** 節ごとの順位の折れ線。上が1位。値は点の横に出さず、最新だけ数字で示す */
export function RankChart({ ranks, teams }: { ranks: (number | null)[]; teams: number }) {
  // カードの幅（約240px）に合わせた座標。文字が小さくなりすぎないよう、表示幅に近い大きさで描く
  const W = 240;
  const H = 110;
  const pad = { l: 30, r: 30, t: 8, b: 20 };
  const n = ranks.length;
  const x = (i: number) => pad.l + (n === 1 ? 0 : (i * (W - pad.l - pad.r)) / (n - 1));
  const y = (rank: number) => pad.t + ((rank - 1) * (H - pad.t - pad.b)) / (teams - 1);
  const pts = ranks.map((r, i) => (r === null ? null : { i, r, x: x(i), y: y(r) })).filter((p) => p !== null);
  const path = pts.map((p, k) => `${k === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const lastPt = pts[pts.length - 1];
  const desc = pts.map((p) => `第${p.i + 1}節 ${p.r}位`).join('、');
  return (
    <figure className="rank-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`順位の推移: ${desc}`}>
        {[1, 10, teams].map((r) => (
          <g key={r}>
            <line className="grid-line" x1={pad.l} x2={W - pad.r} y1={y(r)} y2={y(r)} />
            <text className="axis" x={pad.l - 6} y={y(r)} dy="0.35em" textAnchor="end">
              {r}位
            </text>
          </g>
        ))}
        {[0, n - 1].map((i) => (
          <text key={i} className="axis" x={x(i)} y={H - 4} textAnchor="middle">
            第{i + 1}節
          </text>
        ))}
        <path className="line" d={path} />
        {pts.map((p) => (
          <circle key={p.i} className="dot" cx={p.x} cy={p.y} r={p === lastPt ? 4.5 : 3}>
            <title>{`第${p.i + 1}節 ${p.r}位`}</title>
          </circle>
        ))}
        {lastPt && (
          <text className="last" x={lastPt.x + 7} y={lastPt.y} dy="0.35em">
            {lastPt.r}位
          </text>
        )}
      </svg>
    </figure>
  );
}
