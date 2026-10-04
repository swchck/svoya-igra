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

/// One cell of the board a phone may pick from.
#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardCell {
    pub id: String,
    pub value: i64,
    #[serde(default)]
    pub played: bool,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardTheme {
    pub name: String,
    pub questions: Vec<BoardCell>,
}

/// The round's board while the stage waits for a pick.
#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Board {
    #[serde(default)]
    pub round: String,
    pub themes: Vec<BoardTheme>,
}

/// What the stage tells the room; pushed whenever players or the phase change.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StageInfo {
    #[serde(default)]
    pub title: String,
    pub roster: Vec<RosterEntry>,
    /// Phones may add new players by name; only while the stage sets up players.
    #[serde(default)]
    pub allow_join: bool,
    /// Seats are teams, so each phone also gives its holder's name.
    #[serde(default)]
    pub teams: bool,
    #[serde(default)]
    pub final_mode: Option<FinalMode>,
    /// Final round: the highest bet each playing competitor may make. Absent ones sit it out.
    #[serde(default)]
    pub caps: HashMap<String, i64>,
    /// Present only while the board waits for the next question.
    #[serde(default)]
    pub board: Option<Board>,
    /// Who picks the next question.
    #[serde(default)]
    pub chooser: Option<String>,
    /// Phones may buzz in the hand; a stage that doesn't say leaves it on.
    #[serde(default = "yes")]
    pub vibrate: bool,
}

fn yes() -> bool {
    true
}

impl Default for StageInfo {
    fn default() -> Self {
        Self {
            title: String::new(),
            roster: Vec::new(),
            allow_join: false,
            teams: false,
            final_mode: None,
            caps: HashMap::new(),
            board: None,
            chooser: None,
            vibrate: yes(),
        }
    }
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
    NotYourTurn,
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
            Reject::NotYourTurn => "not-your-turn",
        }
    }

    pub fn status(self) -> u16 {
        match self {
            Reject::Disabled | Reject::NoSuchPlayer => 404,
            Reject::UnknownClient => 401,
            Reject::Full => 503,
            Reject::BadName => 400,
            Reject::JoinClosed => 403,
            Reject::NotBound | Reject::NotOpen | Reject::Excluded | Reject::NotEligible | Reject::NotYourTurn => 409,
        }
    }
}

struct Client {
    player_id: Option<String>,
    /// The person holding the phone, when several share one seat (a team).
    person: Option<String>,
    last_seen: Instant,
}

#[derive(Default)]
struct Buzz {
    key: Option<String>,
    open: bool,
    order: Vec<String>,
    /// Who pressed for each entry of `order`, when their phone has a name.
    by: Vec<Option<String>>,
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

/// A question the chooser picked on their phone; the stage opens it.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Pick {
    pub player_id: String,
    pub question_id: String,
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
    /// The person behind each press in `order`, when their phone gave a name.
    pub by: Vec<Option<String>>,
    pub excluded: Vec<String>,
}

/// What the app sees of the room.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LanStatus {
    /// Phones online per player id.
    pub phones: BTreeMap<String, u32>,
    /// Names given on phones online, per player id.
    pub people: BTreeMap<String, Vec<String>>,
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
    pub person: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhoneBuzz {
    pub state: BuzzState,
    /// 1-based place in the order, once this phone's player has pressed.
    pub position: Option<usize>,
    pub excluded: bool,
    pub winner: Option<String>,
    /// The person on the winning seat who pressed, when their phone has a name.
    pub winner_by: Option<String>,
}

/// Everything one phone renders, tailored to the player it holds.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhoneView {
    pub v: u64,
    pub enabled: bool,
    pub title: String,
    pub allow_join: bool,
    pub teams: bool,
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
    pub board: Option<Board>,
    /// The name of whoever picks the next question, while the board is up.
    pub chooser: Option<String>,
    pub my_turn: bool,
    pub vibrate: bool,
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
    /// Set once the chooser picks, so a double tap can't open two questions before the
    /// stage takes the board down.
    picked: bool,
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
            picked: false,
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
        if info.board != self.stage.board || info.chooser != self.stage.chooser {
            self.picked = false;
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
        let person = self.clients.remove(&token).and_then(|c| c.person);
        self.clients.insert(token, Client { player_id: Some(player_id), person, last_seen: now });
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

    /// Names the person holding the phone; an empty name clears it.
    pub fn set_person(&mut self, token: &str, raw_name: &str) {
        if let Some(c) = self.clients.get_mut(token) {
            c.person = sanitize_name(raw_name);
            self.bump();
        }
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

    /// Ends the question's buzzing: the buttons close and forget who pressed, so phones
    /// don't keep showing the last question's result.
    pub fn close_buzz(&mut self) {
        if self.buzz.key.is_some() || self.buzz.open {
            self.buzz = Buzz::default();
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
        self.buzz.by.clear();
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
        self.buzz.by.push(self.clients.get(token).and_then(|c| c.person.clone()));
        self.bump();
        Ok(self.buzz.order.len())
    }

    /// The chooser picks a question off the board. Only the first pick counts until the
    /// stage pushes its next state.
    pub fn pick(&mut self, token: &str, question_id: &str) -> Result<Pick, Reject> {
        let player_id = self.bound(token)?;
        let board = self.stage.board.as_ref().ok_or(Reject::NotOpen)?;
        if self.stage.chooser.as_deref() != Some(player_id.as_str()) {
            return Err(Reject::NotYourTurn);
        }
        let open = board.themes.iter().flat_map(|t| &t.questions).any(|q| q.id == question_id && !q.played);
        if !open || self.picked {
            return Err(Reject::NotOpen);
        }
        self.picked = true;
        self.bump();
        Ok(Pick { player_id, question_id: question_id.to_string() })
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

    fn people(&self, now: Instant) -> BTreeMap<String, Vec<String>> {
        let mut people: BTreeMap<String, Vec<String>> = BTreeMap::new();
        for c in self.clients.values() {
            if let (Some(id), Some(person)) = (&c.player_id, &c.person)
                && now.duration_since(c.last_seen) < ONLINE_WINDOW
            {
                people.entry(id.clone()).or_default().push(person.clone());
            }
        }
        for names in people.values_mut() {
            names.sort();
        }
        people
    }

    pub fn status(&self, now: Instant) -> LanStatus {
        LanStatus {
            phones: self.phones(now),
            people: self.people(now),
            buzz: BuzzStatus {
                state: self.buzz.state(),
                order: self.buzz.order.clone(),
                by: self.buzz.by.clone(),
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
            .map(|p| MeView {
                player_id: p.id.clone(),
                name: p.name.clone(),
                score: p.score,
                person: client.and_then(|c| c.person.clone()),
            });
        let my_id = me.as_ref().map(|m| m.player_id.as_str());
        let winner = self.buzz.order.first().and_then(|id| self.seat(id)).map(|p| p.name.clone());
        PhoneView {
            v: self.version,
            enabled: self.enabled,
            title: self.stage.title.clone(),
            allow_join: self.stage.allow_join && self.roster().count() < MAX_PLAYERS,
            teams: self.stage.teams,
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
                winner_by: self.buzz.by.first().cloned().flatten(),
            },
            final_mode: self.stage.final_mode,
            cap: my_id.and_then(|id| self.cap(id)),
            bet: my_id.and_then(|id| self.bets.get(id).copied()),
            answer: my_id.and_then(|id| self.answers.get(id).cloned()),
            board: self.stage.board.clone(),
            chooser: self.stage.board.as_ref().and(self.stage.chooser.as_deref()).and_then(|id| self.seat(id)).map(|p| p.name.clone()),
            my_turn: self.stage.board.is_some() && !self.picked && my_id.is_some() && my_id == self.stage.chooser.as_deref(),
            vibrate: self.stage.vibrate,
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
        let status = room.status(Instant::now());
        assert_eq!(status.buzz.state, BuzzState::Closed);
        assert!(status.buzz.order.is_empty() && status.buzz.excluded.is_empty(), "closing forgets the question");
        let view = room.view(Some("ta"), Instant::now());
        assert_eq!((view.buzz.state, view.buzz.position, view.buzz.excluded), (BuzzState::Closed, None, false));
        room.arm("q2");
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

    fn board() -> Board {
        Board {
            round: "1".into(),
            themes: vec![BoardTheme {
                name: "Флаги".into(),
                questions: vec![
                    BoardCell { id: "q1".into(), value: 100, played: true },
                    BoardCell { id: "q2".into(), value: 200, played: false },
                ],
            }],
        }
    }

    #[test]
    fn only_the_chooser_picks_and_only_once() {
        let (mut room, _) = room();
        assert_eq!(room.pick("ta", "q2"), Err(Reject::NotOpen), "no board up");
        room.set_stage(StageInfo { roster: roster(), board: Some(board()), chooser: Some("a".into()), ..StageInfo::default() });
        assert!(room.view(Some("ta"), Instant::now()).my_turn);
        assert!(!room.view(Some("tb"), Instant::now()).my_turn);
        assert_eq!(room.view(Some("tb"), Instant::now()).chooser.as_deref(), Some("Аня"));
        assert_eq!(room.pick("tb", "q2"), Err(Reject::NotYourTurn));
        assert_eq!(room.pick("ta", "q1"), Err(Reject::NotOpen), "already played");
        assert_eq!(room.pick("ta", "nope"), Err(Reject::NotOpen));
        assert_eq!(room.pick("ta", "q2"), Ok(Pick { player_id: "a".into(), question_id: "q2".into() }));
        assert_eq!(room.pick("ta", "q2"), Err(Reject::NotOpen), "a double tap opens nothing more");
        assert!(!room.view(Some("ta"), Instant::now()).my_turn);
        room.set_stage(StageInfo { roster: roster(), ..StageInfo::default() });
        room.set_stage(StageInfo { roster: roster(), board: Some(board()), chooser: Some("a".into()), ..StageInfo::default() });
        assert!(room.view(Some("ta"), Instant::now()).my_turn, "the next board takes a pick again");
    }

    #[test]
    fn passes_the_vibration_switch_to_phones() {
        let (mut room, now) = room();
        assert!(room.view(Some("ta"), now).vibrate, "on unless the stage says otherwise");
        let quiet: StageInfo = serde_json::from_value(serde_json::json!({ "roster": [], "vibrate": false })).unwrap();
        room.set_stage(StageInfo { roster: roster(), ..quiet });
        assert!(!room.view(Some("ta"), now).vibrate);
        let unsaid: StageInfo = serde_json::from_value(serde_json::json!({ "roster": [] })).unwrap();
        assert!(unsaid.vibrate);
    }

    #[test]
    fn remembers_who_pressed_on_a_shared_seat() {
        let (mut room, now) = room();
        room.claim("ta2".into(), "a", now).unwrap();
        room.set_person("ta2", "  Петя ");
        room.arm("q1");
        room.buzz("ta2").unwrap();
        room.buzz("tb").unwrap();
        let status = room.status(now);
        assert_eq!(status.buzz.by, [Some("Петя".to_string()), None]);
        assert_eq!(status.people.get("a").map(Vec::as_slice), Some(&["Петя".to_string()][..]));
        let view = room.view(Some("tc"), now);
        assert_eq!((view.buzz.winner.as_deref(), view.buzz.winner_by.as_deref()), (Some("Аня"), Some("Петя")));
        room.claim("ta2".into(), "b", now).unwrap();
        assert_eq!(room.view(Some("ta2"), now).me.unwrap().person.as_deref(), Some("Петя"), "switching seats keeps the name");
    }
}
