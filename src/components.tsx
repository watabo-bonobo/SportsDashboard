import type { Broadcast, SportEvent } from './types';
import {
  eventTitle,
  formatDate,
  formatPeriod,
  formatTime,
  googleCalendarUrl,
  relativeDay,
  SPORT_ICON,
  SPORT_LABEL,
  startDateKey,
} from './schedule';

const KIND_LABEL: Record<Broadcast['kind'], string> = { tv: '地上波', bs: 'BS/CS', net: '配信' };

function Broadcasts({ items }: { items?: Broadcast[] }) {
  if (!items?.length) return <span className="bc-none">放送・配信 未定</span>;
  return (
    <ul className="bcs">
      {items.map((b) => {
        const label = (
          <>
            <span className="bc-kind">{KIND_LABEL[b.kind]}</span>
            {b.name}
          </>
        );
        return (
          <li key={b.name} className={`bc bc-${b.kind}`} title={b.note}>
            {b.url ? (
              <a href={b.url} target="_blank" rel="noreferrer">
                {label}
              </a>
            ) : (
              label
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Competition({ event }: { event: SportEvent }) {
  return (
    <span className={`comp sport-${event.sport}`}>
      <span aria-label={SPORT_LABEL[event.sport]}>{SPORT_ICON[event.sport]}</span>
      {event.competition}
      {event.round && <span className="round">{event.round}</span>}
    </span>
  );
}

function SourceLink({ event }: { event: SportEvent }) {
  if (!event.source) return null;
  return (
    <a className="src" href={event.source} target="_blank" rel="noreferrer" title="情報の出典">
      出典
    </a>
  );
}

export function EventRow({ event }: { event: SportEvent }) {
  const when = event.end ? formatPeriod(event) : formatTime(event);
  return (
    <article className={`row${event.featured ? ' is-featured' : ''}`}>
      <div className="when">{when}</div>
      <div className="body">
        <Competition event={event} />
        <div className="match">{eventTitle(event)}</div>
        {event.venue && <div className="venue">{event.venue}</div>}
        {event.broadcasts?.some((b) => b.note) && (
          <div className="notes">
            {event.broadcasts
              .filter((b) => b.note)
              .map((b) => `${b.name}: ${b.note}`)
              .join(' ／ ')}
          </div>
        )}
      </div>
      <div className="side">
        <Broadcasts items={event.broadcasts} />
        <div className="links">
          <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer" title="Googleカレンダーに追加">
            ＋カレンダー
          </a>
          <SourceLink event={event} />
        </div>
      </div>
    </article>
  );
}

export function ResultRow({ event, now }: { event: SportEvent; now: Date }) {
  const r = event.result;
  return (
    <article className={`result${event.featured ? ' is-featured' : ''}`}>
      <div className="result-meta">
        <span>{formatDate(startDateKey(event))}</span>
        <span className="rel">{relativeDay(event.end ?? startDateKey(event), now)}</span>
        <Competition event={event} />
      </div>
      {event.home && event.away ? (
        <div className="score">
          <span className="team home">{event.home}</span>
          <span className="pts">{r ? `${r.home} - ${r.away}` : '－'}</span>
          <span className="team away">{event.away}</span>
        </div>
      ) : (
        <div className="match">{eventTitle(event)}</div>
      )}
      <div className="result-foot">
        {r?.note && <span className="result-note">{r.note}</span>}
        {!r && <span className="result-note muted">結果未入力</span>}
        <SourceLink event={event} />
      </div>
    </article>
  );
}

export function FeaturedCard({ event, now }: { event: SportEvent; now: Date }) {
  const date = startDateKey(event);
  return (
    <article className={`card sport-${event.sport}`}>
      <div className="card-top">
        <span className="card-sport">
          {SPORT_ICON[event.sport]} {SPORT_LABEL[event.sport]}
        </span>
        <span className="countdown">{relativeDay(date, now)}</span>
      </div>
      <div className="card-match">{eventTitle(event)}</div>
      <div className="card-when">
        {event.end ? formatPeriod(event) : `${formatDate(date)} ${formatTime(event)}`}
        {event.venue && ` ・ ${event.venue}`}
      </div>
      <div className="card-comp">
        {event.competition}
        {event.round && ` ${event.round}`}
      </div>
      <Broadcasts items={event.broadcasts} />
    </article>
  );
}
