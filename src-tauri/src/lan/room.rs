//! The state of one phone-buzzer room, free of any networking so it can be tested alone.
//!
//! The stage pushes who plays and what the phones should show; phones join, claim a
//! player, buzz, bet and answer. Every mutation bumps `version`, which long polls wait on.

use std::collections::{BTreeMap, HashMap, HashSet};
use std::net::IpAddr;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

pub const MAX_CLIENTS: usize = 32;
pub const MAX_NAME_CHARS: usize = 24;
pub const MAX_ANSWER_CHARS: usize = 200;
/// Players a room may grow to by phones joining under new names.
pub const MAX_PLAYERS: usize = 12;
/// A phone polls at least this often while its page is open.
pub const ONLINE_WINDOW: Duration = Duration::from_secs(35);
/// A full room makes way for phones silent this long.
const EVICT_AFTER: Duration = Duration::from_secs(120);
/// Wrong room codes one address may try before it is shut out until the server restarts.
const MAX_CODE_FAILURES: u32 = 30;

/// One competitor as the stage sees them.
#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct RosterEntry {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub score: i64,
}

/// What the final round asks of phones.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum FinalMode {
    Bet,
    Answer,
}

/// What the stage tells the room; pushed whenever players or the phase change.
#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StageInfo {
    #[serde(default)]
    pub title: String,
    pub roster: Vec<RosterEntry>,
    /// Phones may add new players by name; only while the stage sets up players.
    #[serde(default)]
    pub allow_join: bool,
    #[serde(default)]
    pub final_mode: Option<FinalMode>,
    /// Final round: the highest bet each playing competitor may make. Absent ones sit it out.
    #[serde(default)]
    pub caps: HashMap<String, i64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum BuzzState {
    Closed,
    Open,
    Locked,
}

/// Why a phone's request was turned down; also the `error` code the phone page reads.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Reject {
    Disabled,
    UnknownClient,
    Full,
    BadName,
    JoinClosed,
    NoSuchPlayer,
    NotBound,
    NotOpen,
    Excluded,
    NotEligible,
}

impl Reject {
    pub fn code(self) -> &'static str {
        match self {
            Reject::Disabled => "disabled",
            Reject::UnknownClient => "unknown-client",
            Reject::Full => "full",
            Reject::BadName => "bad-name",
            Reject::JoinClosed => "join-closed",
            Reject::NoSuchPlayer => "no-such-player",
            Reject::NotBound => "not-bound",
            Reject::NotOpen => "not-open",
            Reject::Excluded => "excluded",
            Reject::NotEligible => "not-eligible",
        }
    }

    pub fn status(self) -> u16 {
        match self {
            Reject::Disabled | Reject::NoSuchPlayer => 404,
            Reject::UnknownClient => 401,
            Reject::Full => 503,
            Reject::BadName => 400,
            Reject::JoinClosed => 403,
            Reject::NotBound | Reject::NotOpen | Reject::Excluded | Reject::NotEligible => 409,
        }
    }
}

struct Client {
    player_id: Option<String>,
    last_seen: Instant,
}

#[derive(Default)]
struct Buzz {
    key: Option<String>,
    open: bool,
    order: Vec<String>,
    excluded: Vec<String>,
}

impl Buzz {
    fn state(&self) -> BuzzState {
        if !self.order.is_empty() {
            BuzzState::Locked
        } else if self.open {
            BuzzState::Open
        } else {
            BuzzState::Closed
        }
    }
}

/// A player created by a phone joining under a new name; the stage adds them to the game.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NewPlayer {
    pub player_id: String,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuzzStatus {
    pub state: BuzzState,
    /// Player ids in the order they pressed; the first one answers.
    pub order: Vec<String>,
    pub excluded: Vec<String>,
}

/// What the app sees of the room.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LanStatus {
    /// Phones online per player id.
    pub phones: BTreeMap<String, u32>,
    pub buzz: BuzzStatus,
    pub bets: BTreeMap<String, i64>,
    pub answers: BTreeMap<String, String>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SeatView {
    pub id: String,
    pub name: String,
    pub score: i64,
    pub phones: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MeView {
    pub player_id: String,
    pub name: String,
    pub score: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhoneBuzz {
    pub state: BuzzState,
    /// 1-based place in the order, once this phone's player has pressed.
    pub position: Option<usize>,
    pub excluded: bool,
    pub winner: Option<String>,
}

/// Everything one phone renders, tailored to the player it holds.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhoneView {
    pub v: u64,
    pub enabled: bool,
    pub title: String,
    pub allow_join: bool,
    pub roster: Vec<SeatView>,
    pub me: Option<MeView>,
    /// The token was given out by an earlier run of the server, or the phone was dropped.
    pub reset: bool,
    pub buzz: PhoneBuzz,
    pub final_mode: Option<FinalMode>,
    /// Final round: the most this phone's player may bet; absent when they sit it out.
    pub cap: Option<i64>,
    pub bet: Option<i64>,
    pub answer: Option<String>,
}

/// Counts wrong room codes per address, so the 4-digit code can't simply be swept.
#[derive(Default)]
pub struct CodeGuard {
    failures: HashMap<IpAddr, u32>,
}

impl CodeGuard {
    /// Reports whether the address may still try codes.
    pub fn allowed(&self, ip: IpAddr) -> bool {
        self.failures.get(&ip).copied().unwrap_or(0) < MAX_CODE_FAILURES
    }

    pub fn fail(&mut self, ip: IpAddr) {
        *self.failures.entry(ip).or_default() += 1;
    }
}

/// Trims, drops control and formatting characters, collapses whitespace and cuts to
/// `MAX_NAME_CHARS`. None when nothing printable is left.
pub fn sanitize_name(raw: &str) -> Option<String> {
    let cleaned: String = raw
        .chars()
        .map(|c| if c.is_whitespace() { ' ' } else { c })
        .filter(|c| !c.is_control() && !is_invisible(*c))
        .collect();
    let name: String = cleaned.split_whitespace().collect::<Vec<_>>().join(" ").chars().take(MAX_NAME_CHARS).collect();
    let name = name.trim_end().to_string();
    (!name.is_empty()).then_some(name)
}

/// Like `sanitize_name`, but keeps line breaks and allows `MAX_ANSWER_CHARS`.
pub fn sanitize_answer(raw: &str) -> String {
    let text: String = raw
        .chars()
        .filter(|c| *c == '\n' || (!c.is_control() && !is_invisible(*c)))
        .take(MAX_ANSWER_CHARS)
        .collect();
    text.trim().to_string()
}

// bidi overrides and zero-width characters can make one name pass for another
fn is_invisible(c: char) -> bool {
    matches!(c, '\u{200B}'..='\u{200F}' | '\u{202A}'..='\u{202E}' | '\u{2060}'..='\u{2069}' | '\u{FEFF}')
}

pub struct Room {
    code: String,
    version: u64,
    enabled: bool,
    stage: StageInfo,
    /// Players created by phones that the stage has not pushed back yet.
    pending: Vec<RosterEntry>,
    clients: HashMap<String, Client>,
    buzz: Buzz,
    bets: BTreeMap<String, i64>,
    answers: BTreeMap<String, String>,
}

impl Room {
    pub fn new(code: String) -> Self {
        Room {
            code,
            version: 1,
            enabled: false,
            stage: StageInfo::default(),
            pending: Vec::new(),
            clients: HashMap::new(),
            buzz: Buzz::default(),
            bets: BTreeMap::new(),
            answers: BTreeMap::new(),
        }
    }

    pub fn code(&self) -> &str {
        &self.code
    }

    pub fn version(&self) -> u64 {
        self.version
    }

    pub fn check_code(&self, code: &str) -> bool {
        code == self.code
    }

    fn bump(&mut self) {
        self.version += 1;
    }

    /// Turns the buzzers on or off; off forgets every phone and everything they sent.
    pub fn set_enabled(&mut self, on: bool) {
        if !on {
            let code = std::mem::take(&mut self.code);
            let version = self.version;
            *self = Room::new(code);
            self.version = version;
        }
        self.enabled = on;
        self.bump();
    }

    pub fn enabled(&self) -> bool {
        self.enabled
    }

    fn roster(&self) -> impl Iterator<Item = &RosterEntry> {
        self.stage.roster.iter().chain(self.pending.iter())
    }

    fn seat(&self, player_id: &str) -> Option<&RosterEntry> {
        self.roster().find(|p| p.id == player_id)
    }

    /// Takes in what the stage shows. Phones bound to a player the stage dropped go back to
    /// picking one; entering the final's bets starts its bets and answers afresh.
    pub fn set_stage(&mut self, info: StageInfo) {
        let ids: HashSet<&str> = info.roster.iter().map(|p| p.id.as_str()).collect();
        self.pending.retain(|p| !ids.contains(p.id.as_str()));
        let known: HashSet<String> = info.roster.iter().chain(self.pending.iter()).map(|p| p.id.clone()).collect();
        for client in self.clients.values_mut() {
            if client.player_id.as_ref().is_some_and(|id| !known.contains(id)) {
                client.player_id = None;
            }
        }
        if info.final_mode == Some(FinalMode::Bet) && self.stage.final_mode != Some(FinalMode::Bet) {
            self.bets.clear();
            self.answers.clear();
        }
        self.stage = info;
        self.bump();
    }

    /// Lets the phone with this token in, or reports it unknown. Marks it as seen.
    pub fn touch(&mut self, token: &str, now: Instant) -> bool {
        match self.clients.get_mut(token) {
            Some(c) => {
                c.last_seen = now;
                true
            }
            None => false,
        }
    }

    fn make_room(&mut self, now: Instant) -> Result<(), Reject> {
        if self.clients.len() < MAX_CLIENTS {
            return Ok(());
        }
        let stale = self
            .clients
            .iter()
            .filter(|(_, c)| now.duration_since(c.last_seen) >= EVICT_AFTER)
            .min_by_key(|(_, c)| c.last_seen)
            .map(|(token, _)| token.clone());
        match stale {
            Some(token) => {
                self.clients.remove(&token);
                Ok(())
            }
            None => Err(Reject::Full),
        }
    }

    fn bind(&mut self, token: String, player_id: String, now: Instant) -> Result<(), Reject> {
        if !self.clients.contains_key(&token) {
            self.make_room(now)?;
        }
        self.clients.insert(token, Client { player_id: Some(player_id), last_seen: now });
        self.bump();
        Ok(())
    }

    /// A phone joins under a name. A name already on the roster takes that seat; a new one
    /// becomes the player `new_id` while the stage allows joining.
    pub fn join(&mut self, token: String, raw_name: &str, new_id: String, now: Instant) -> Result<Option<NewPlayer>, Reject> {
        if !self.enabled {
            return Err(Reject::Disabled);
        }
        let name = sanitize_name(raw_name).ok_or(Reject::BadName)?;
        let lower = name.to_lowercase();
        let existing = self.roster().find(|p| p.name.trim().to_lowercase() == lower).map(|p| p.id.clone());
        if let Some(id) = existing {
            self.bind(token, id, now)?;
            return Ok(None);
        }
        if !self.stage.allow_join || self.roster().count() >= MAX_PLAYERS {
            return Err(Reject::JoinClosed);
        }
        self.bind(token, new_id.clone(), now)?;
        self.pending.push(RosterEntry { id: new_id.clone(), name: name.clone(), score: 0 });
        Ok(Some(NewPlayer { player_id: new_id, name }))
    }

    /// A phone takes an existing seat. Several phones may hold one seat, e.g. one team.
    pub fn claim(&mut self, token: String, player_id: &str, now: Instant) -> Result<(), Reject> {
        if !self.enabled {
            return Err(Reject::Disabled);
        }
        if self.seat(player_id).is_none() {
            return Err(Reject::NoSuchPlayer);
        }
        self.bind(token, player_id.to_string(), now)
    }

    /// The phone gives up its seat to pick another one.
    pub fn leave(&mut self, token: &str) {
        if let Some(c) = self.clients.get_mut(token) {
            c.player_id = None;
            self.bump();
        }
    }

    fn bound(&self, token: &str) -> Result<String, Reject> {
        if !self.enabled {
            return Err(Reject::Disabled);
        }
        let client = self.clients.get(token).ok_or(Reject::UnknownClient)?;
        client.player_id.clone().ok_or(Reject::NotBound)
    }

    /// Opens the buttons for the question `key`; a different key than before starts afresh.
    pub fn arm(&mut self, key: &str) {
        if self.buzz.key.as_deref() == Some(key) && self.buzz.open {
            return;
        }
        if self.buzz.key.as_deref() != Some(key) {
            self.buzz = Buzz { key: Some(key.to_string()), ..Buzz::default() };
        }
        self.buzz.open = true;
        self.bump();
    }

    /// Stops taking presses; the order so far stays for the host to see.
    pub fn close_buzz(&mut self) {
        if self.buzz.open {
            self.buzz.open = false;
            self.bump();
        }
    }

    /// Opens the buttons again after an answer, optionally shutting out whoever answered.
    pub fn reopen(&mut self, exclude_winner: bool) {
        if self.buzz.key.is_none() {
            return;
        }
        if exclude_winner && let Some(winner) = self.buzz.order.first().cloned() && !self.buzz.excluded.contains(&winner) {
            self.buzz.excluded.push(winner);
        }
        self.buzz.order.clear();
        self.buzz.open = true;
        self.bump();
    }

    /// Records a press. The first one while open wins and locks the buttons; later ones
    /// still queue up behind it. Returns the 1-based place in the order.
    pub fn buzz(&mut self, token: &str) -> Result<usize, Reject> {
        let player_id = self.bound(token)?;
        if self.buzz.excluded.contains(&player_id) {
            return Err(Reject::Excluded);
        }
        if let Some(i) = self.buzz.order.iter().position(|id| *id == player_id) {
            return Ok(i + 1);
        }
        if !self.buzz.open {
            return Err(Reject::NotOpen);
        }
        self.buzz.order.push(player_id);
        self.bump();
        Ok(self.buzz.order.len())
    }

    fn cap(&self, player_id: &str) -> Option<i64> {
        self.stage.caps.get(player_id).copied().filter(|c| *c > 0)
    }

    /// Takes a final bet, cut down to what the player has. Returns the bet as recorded.
    pub fn bet(&mut self, token: &str, amount: i64) -> Result<i64, Reject> {
        let player_id = self.bound(token)?;
        if self.stage.final_mode != Some(FinalMode::Bet) {
            return Err(Reject::NotOpen);
        }
        let cap = self.cap(&player_id).ok_or(Reject::NotEligible)?;
        let bet = amount.clamp(0, cap);
        self.bets.insert(player_id, bet);
        self.bump();
        Ok(bet)
    }

    /// Takes a final answer; a later one from the same player replaces it.
    pub fn answer(&mut self, token: &str, text: &str) -> Result<(), Reject> {
        let player_id = self.bound(token)?;
        if self.stage.final_mode != Some(FinalMode::Answer) {
            return Err(Reject::NotOpen);
        }
        self.cap(&player_id).ok_or(Reject::NotEligible)?;
        let text = sanitize_answer(text);
        if text.is_empty() {
            self.answers.remove(&player_id);
        } else {
            self.answers.insert(player_id, text);
        }
        self.bump();
        Ok(())
    }

    fn phones(&self, now: Instant) -> BTreeMap<String, u32> {
        let mut phones = BTreeMap::new();
        for c in self.clients.values() {
            if let Some(id) = &c.player_id
                && now.duration_since(c.last_seen) < ONLINE_WINDOW
            {
                *phones.entry(id.clone()).or_default() += 1;
            }
        }
        phones
    }

    pub fn status(&self, now: Instant) -> LanStatus {
        LanStatus {
            phones: self.phones(now),
            buzz: BuzzStatus {
                state: self.buzz.state(),
                order: self.buzz.order.clone(),
                excluded: self.buzz.excluded.clone(),
            },
            bets: self.bets.clone(),
            answers: self.answers.clone(),
        }
    }

    /// What the phone with `token` shows; an unknown or missing token gets the seat picker.
    pub fn view(&self, token: Option<&str>, now: Instant) -> PhoneView {
        let client = token.and_then(|t| self.clients.get(t));
        let phones = self.phones(now);
        let me = client
            .and_then(|c| c.player_id.as_deref())
            .and_then(|id| self.seat(id))
            .map(|p| MeView { player_id: p.id.clone(), name: p.name.clone(), score: p.score });
        let my_id = me.as_ref().map(|m| m.player_id.as_str());
        let winner = self.buzz.order.first().and_then(|id| self.seat(id)).map(|p| p.name.clone());
        PhoneView {
            v: self.version,
            enabled: self.enabled,
            title: self.stage.title.clone(),
            allow_join: self.stage.allow_join && self.roster().count() < MAX_PLAYERS,
            roster: self
                .roster()
                .map(|p| SeatView {
                    id: p.id.clone(),
                    name: p.name.clone(),
                    score: p.score,
                    phones: phones.get(&p.id).copied().unwrap_or(0),
                })
                .collect(),
            reset: token.is_some_and(|t| !t.is_empty()) && client.is_none(),
            buzz: PhoneBuzz {
                state: self.buzz.state(),
                position: my_id.and_then(|id| self.buzz.order.iter().position(|o| o == id)).map(|i| i + 1),
                excluded: my_id.is_some_and(|id| self.buzz.excluded.iter().any(|e| e == id)),
                winner,
            },
            final_mode: self.stage.final_mode,
            cap: my_id.and_then(|id| self.cap(id)),
            bet: my_id.and_then(|id| self.bets.get(id).copied()),
            answer: my_id.and_then(|id| self.answers.get(id).cloned()),
            me,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roster() -> Vec<RosterEntry> {
        vec![
            RosterEntry { id: "a".into(), name: "Аня".into(), score: 300 },
            RosterEntry { id: "b".into(), name: "Боря".into(), score: 0 },
            RosterEntry { id: "c".into(), name: "Вера".into(), score: -100 },
        ]
    }

    fn room() -> (Room, Instant) {
        let mut room = Room::new("1234".into());
        room.set_enabled(true);
        room.set_stage(StageInfo { roster: roster(), ..StageInfo::default() });
        let now = Instant::now();
        for (token, id) in [("ta", "a"), ("tb", "b"), ("tc", "c")] {
            room.claim(token.into(), id, now).unwrap();
        }
        (room, now)
    }

    #[test]
    fn checks_the_room_code() {
        let room = Room::new("0420".into());
        assert!(room.check_code("0420"));
        assert!(!room.check_code("420"));
        assert!(!room.check_code(""));
    }

    #[test]
    fn code_guard_shuts_out_after_too_many_misses() {
        let mut guard = CodeGuard::default();
        let ip: IpAddr = "192.168.1.5".parse().unwrap();
        for _ in 0..MAX_CODE_FAILURES {
            assert!(guard.allowed(ip));
            guard.fail(ip);
        }
        assert!(!guard.allowed(ip));
        assert!(guard.allowed("192.168.1.6".parse().unwrap()));
    }

    #[test]
    fn sanitizes_names() {
        assert_eq!(sanitize_name("  Аня  "), Some("Аня".into()));
        assert_eq!(sanitize_name("a\u{202E}b\u{200B}c\n\td"), Some("abc d".into()));
        assert_eq!(sanitize_name("x".repeat(40).as_str()).unwrap().chars().count(), MAX_NAME_CHARS);
        assert_eq!(sanitize_name("Ж".repeat(30).as_str()).unwrap().chars().count(), MAX_NAME_CHARS);
        assert_eq!(sanitize_name(" \u{0007}\u{200B} "), None);
        assert_eq!(sanitize_name(""), None);
    }

    #[test]
    fn first_buzz_wins_and_later_ones_queue() {
        let (mut room, _) = room();
        assert_eq!(room.buzz("ta"), Err(Reject::NotOpen));
        room.arm("q1");
        assert_eq!(room.buzz("tb"), Ok(1));
        assert_eq!(room.status(Instant::now()).buzz.state, BuzzState::Locked);
        assert_eq!(room.buzz("ta"), Ok(2));
        assert_eq!(room.buzz("tb"), Ok(1), "a second press keeps the first place");
        assert_eq!(room.buzz("tc"), Ok(3));
        assert_eq!(room.status(Instant::now()).buzz.order, ["b", "a", "c"]);
        assert_eq!(room.buzz("nobody"), Err(Reject::UnknownClient));
    }

    #[test]
    fn one_seat_buzzes_once_from_several_phones() {
        let (mut room, now) = room();
        room.claim("ta2".into(), "a", now).unwrap();
        room.arm("q1");
        assert_eq!(room.buzz("ta2"), Ok(1));
        assert_eq!(room.buzz("ta"), Ok(1));
        assert_eq!(room.status(now).buzz.order, ["a"]);
        assert_eq!(room.status(now).phones["a"], 2);
    }

    #[test]
    fn reopen_excludes_who_answered_wrong() {
        let (mut room, _) = room();
        room.arm("q1");
        room.buzz("ta").unwrap();
        room.buzz("tb").unwrap();
        room.reopen(true);
        assert_eq!(room.status(Instant::now()).buzz.state, BuzzState::Open);
        assert_eq!(room.buzz("ta"), Err(Reject::Excluded));
        assert_eq!(room.buzz("tb"), Ok(1));
        room.reopen(true);
        assert_eq!(room.buzz("tb"), Err(Reject::Excluded));
        assert_eq!(room.status(Instant::now()).buzz.excluded, ["a", "b"]);
        room.reopen(false);
        assert_eq!(room.buzz("tc"), Ok(1));
        assert_eq!(room.status(Instant::now()).buzz.excluded, ["a", "b"], "a plain reopen shuts out nobody new");
    }

    #[test]
    fn a_new_question_starts_afresh_and_closing_keeps_the_order() {
        let (mut room, _) = room();
        room.arm("q1");
        room.buzz("ta").unwrap();
        room.reopen(true);
        room.close_buzz();
        assert_eq!(room.buzz("tb"), Err(Reject::NotOpen));
        room.arm("q1");
        assert_eq!(room.buzz("ta"), Err(Reject::Excluded), "re-arming the same question keeps exclusions");
        room.buzz("tb").unwrap();
        room.close_buzz();
        assert_eq!(room.status(Instant::now()).buzz.order, ["b"]);
        room.arm("q2");
        let status = room.status(Instant::now());
        assert!(status.buzz.order.is_empty() && status.buzz.excluded.is_empty());
        assert_eq!(room.buzz("ta"), Ok(1));
    }

    #[test]
    fn bets_are_capped_by_score_and_only_for_eligible_players() {
        let (mut room, _) = room();
        let caps = HashMap::from([("a".to_string(), 300)]);
        assert_eq!(room.bet("ta", 100), Err(Reject::NotOpen));
        room.set_stage(StageInfo { roster: roster(), final_mode: Some(FinalMode::Bet), caps: caps.clone(), ..StageInfo::default() });
        assert_eq!(room.bet("ta", 5000), Ok(300));
        assert_eq!(room.bet("ta", -20), Ok(0));
        assert_eq!(room.bet("ta", 150), Ok(150));
        assert_eq!(room.bet("tb", 10), Err(Reject::NotEligible));
        assert_eq!(room.bet("tc", 10), Err(Reject::NotEligible));
        assert_eq!(room.status(Instant::now()).bets, BTreeMap::from([("a".to_string(), 150)]));

        room.set_stage(StageInfo { roster: roster(), final_mode: Some(FinalMode::Answer), caps, ..StageInfo::default() });
        assert_eq!(room.bet("ta", 100), Err(Reject::NotOpen));
        room.answer("ta", "  Пушкин \u{202E} ").unwrap();
        assert_eq!(room.answer("tb", "x"), Err(Reject::NotEligible));
        assert_eq!(room.status(Instant::now()).answers["a"], "Пушкин");
        assert_eq!(room.view(Some("ta"), Instant::now()).bet, Some(150));

        room.set_stage(StageInfo { roster: roster(), ..StageInfo::default() });
        assert_eq!(room.status(Instant::now()).answers.len(), 1, "answers outlive the answer phase for judging");
    }

    #[test]
    fn answers_are_cut_to_length() {
        let (mut room, _) = room();
        let caps = HashMap::from([("a".to_string(), 300)]);
        room.set_stage(StageInfo { roster: roster(), final_mode: Some(FinalMode::Answer), caps, ..StageInfo::default() });
        room.answer("ta", &"я".repeat(500)).unwrap();
        assert_eq!(room.status(Instant::now()).answers["a"].chars().count(), MAX_ANSWER_CHARS);
    }

    #[test]
    fn joining_by_name_takes_a_matching_seat_or_adds_a_player() {
        let mut room = Room::new("1234".into());
        let now = Instant::now();
        assert_eq!(room.join("t1".into(), "Аня", "new1".into(), now), Err(Reject::Disabled));
        room.set_enabled(true);
        room.set_stage(StageInfo { roster: roster(), ..StageInfo::default() });
        assert_eq!(room.join("t1".into(), " аня ", "new1".into(), now), Ok(None));
        assert_eq!(room.view(Some("t1"), now).me.unwrap().player_id, "a");
        assert_eq!(room.join("t2".into(), "Гоша", "new2".into(), now), Err(Reject::JoinClosed));
        assert_eq!(room.join("t2".into(), "  ", "new2".into(), now), Err(Reject::BadName));

        room.set_stage(StageInfo { roster: roster(), allow_join: true, ..StageInfo::default() });
        let joined = room.join("t2".into(), "Гоша", "new2".into(), now).unwrap();
        assert_eq!(joined, Some(NewPlayer { player_id: "new2".into(), name: "Гоша".into() }));
        // the stage has not pushed the new player back yet: the phone keeps its seat
        room.set_stage(StageInfo { roster: roster(), allow_join: true, ..StageInfo::default() });
        assert_eq!(room.view(Some("t2"), now).me.unwrap().name, "Гоша");
        let mut with_new = roster();
        with_new.push(RosterEntry { id: "new2".into(), name: "Гоша".into(), score: 0 });
        room.set_stage(StageInfo { roster: with_new, allow_join: true, ..StageInfo::default() });
        assert_eq!(room.view(Some("t2"), now).roster.len(), 4);
        // now the stage removes them: the phone goes back to picking a seat
        room.set_stage(StageInfo { roster: roster(), allow_join: true, ..StageInfo::default() });
        assert_eq!(room.view(Some("t2"), now).me, None);
        assert_eq!(room.buzz("t2"), Err(Reject::NotBound));
    }

    #[test]
    fn claim_needs_a_real_seat_and_leave_frees_it() {
        let (mut room, now) = room();
        assert_eq!(room.claim("tx".into(), "zzz", now), Err(Reject::NoSuchPlayer));
        room.leave("ta");
        assert_eq!(room.view(Some("ta"), now).me, None);
        assert!(!room.view(Some("ta"), now).reset);
        assert!(room.view(Some("forgotten"), now).reset);
    }

    #[test]
    fn caps_clients_and_evicts_only_silent_ones() {
        let mut room = Room::new("1234".into());
        room.set_enabled(true);
        room.set_stage(StageInfo { roster: roster(), ..StageInfo::default() });
        let start = Instant::now();
        for i in 0..MAX_CLIENTS {
            room.claim(format!("t{i}"), "a", start).unwrap();
        }
        assert_eq!(room.claim("extra".into(), "a", start), Err(Reject::Full));
        assert_eq!(room.claim("t0".into(), "b", start), Ok(()), "a known phone may switch seats");
        let later = start + EVICT_AFTER;
        for i in 1..MAX_CLIENTS {
            room.touch(&format!("t{i}"), later);
        }
        assert_eq!(room.claim("extra".into(), "a", later), Ok(()));
        assert!(!room.touch("t0", later), "the silent phone made way");
    }

    #[test]
    fn phones_count_only_while_polling() {
        let (room, now) = room();
        assert_eq!(room.status(now).phones.len(), 3);
        assert!(room.status(now + ONLINE_WINDOW).phones.is_empty());
    }

    #[test]
    fn disabling_forgets_phones_but_keeps_code_and_version_rising() {
        let (mut room, now) = room();
        let before = room.version();
        room.set_enabled(false);
        assert!(room.version() > before);
        assert_eq!(room.code(), "1234");
        assert!(!room.touch("ta", now));
        assert_eq!(room.buzz("ta"), Err(Reject::Disabled));
    }
}
