import type { Broadcast, Sport, SportEvent, Standings } from './types';
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
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
