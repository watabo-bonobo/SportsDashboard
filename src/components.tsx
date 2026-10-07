import type { Broadcast, SportEvent } from './types';
import {
  eventTitle,
  formatDate,
  formatPeriod,
  formatTime,
  googleCalendarUrl,
  japanOutcome,
  relativeDay,
  SPORT_LABEL,
  startDateKey,
} from './schedule';
import type { Outcome, Summary } from './schedule';

const KIND_LABEL: Record<Broadcast['kind'], string> = { tv: '地上波', bs: 'BS/CS', net: '配信' };
const OUTCOME_LABEL: Record<Outcome, string> = { win: '勝', draw: '分', loss: '敗' };

export function SportTag({ event }: { event: SportEvent }) {
  return <span className={`tag sport-${event.sport}`}>{SPORT_LABEL[event.sport]}</span>;
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

export function SummaryBar({ summary }: { summary: Summary }) {
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
        <p className="stat-label">日本代表 直近30日の成績</p>
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
          <SportTag event={event} />
          <span>
            {event.competition}
            {event.round && ` ${event.round}`}
          </span>
        </p>
        <h4 className="match">{eventTitle(event)}</h4>
        {event.venue && <p className="venue">{event.venue}</p>}
      </div>
      <div className="side">
        <Broadcasts items={event.broadcasts} />
        <Links event={event} />
      </div>
    </article>
  );
}

export function ResultRow({ event, now }: { event: SportEvent; now: Date }) {
  const r = event.result;
  const outcome = japanOutcome(event);
  const endKey = event.end ?? startDateKey(event);
  return (
    <article className={`result${event.featured ? ' is-featured' : ''}`}>
      <p className="meta">
        <SportTag event={event} />
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
      <div className="result-foot">
        {outcome && <span className={`outcome outcome-${outcome}`}>日本 {OUTCOME_LABEL[outcome]}</span>}
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
        <SportTag event={event} />
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
      <Broadcasts items={event.broadcasts} />
    </article>
  );
}
