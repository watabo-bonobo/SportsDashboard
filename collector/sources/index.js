import * as jfa from './jfa-samuraiblue.js';
import * as jleague from './jleague.js';
import * as jva from './jva.js';
import * as tabletennis from './tvtokyo-tabletennis.js';

// バスケ日本代表（JBA）はサイト側で自動取得が拒否されるため、public/data/events.json に手で書く
export const SOURCES = [jfa, jleague, jva, tabletennis];
