use spacetimedb::{Identity, ReducerContext, SpacetimeType, Table, Timestamp};

#[derive(SpacetimeType, Clone, Copy, PartialEq, Eq)]
pub enum PlanStatus { Open, Locked }
#[derive(SpacetimeType, Clone, Copy, PartialEq, Eq)]
pub enum AnswerState { In, Out, Conditional }
#[derive(SpacetimeType, Clone, Copy, PartialEq, Eq)]
pub enum ProposalStatus { Pending, Locked, Cancelled, Reopened }

#[spacetimedb::table(accessor = plan, public)]
pub struct Plan { #[primary_key] #[auto_inc] pub id: u32, #[unique] pub share_code: String, pub title: String, pub date_label: String, pub status: PlanStatus, pub locked_activity_id: Option<u32>, pub version: u64 }
#[spacetimedb::table(accessor = activity, public)]
pub struct Activity { #[primary_key] #[auto_inc] pub id: u32, #[index(btree)] pub plan_id: u32, pub name: String, pub price: u32, pub min_people: u32 }
#[spacetimedb::table(accessor = friend, public)]
pub struct Friend { #[primary_key] #[auto_inc] pub id: u32, #[index(btree)] pub plan_id: u32, #[unique] pub identity: Identity, pub name: String, pub online: bool, pub joined_at: Timestamp, pub dropped_at: Option<Timestamp> }
#[spacetimedb::table(accessor = answer, public)]
pub struct Answer { #[primary_key] #[auto_inc] pub id: u32, #[index(btree)] pub plan_id: u32, pub friend_id: u32, pub activity_id: u32, pub state: AnswerState, pub max_price: Option<u32>, #[unique] pub answer_key: String }
#[spacetimedb::table(accessor = proposal, public)]
pub struct Proposal { #[primary_key] #[auto_inc] pub id: u32, pub plan_id: u32, pub activity_id: u32, pub proposed_by: u32, pub status: ProposalStatus, pub created_at: Timestamp }
#[spacetimedb::table(accessor = acceptance, public)]
pub struct Acceptance { #[primary_key] #[auto_inc] pub id: u32, pub proposal_id: u32, pub friend_id: u32, pub accepted_at: Timestamp, #[unique] pub acceptance_key: String }
#[spacetimedb::table(accessor = event_log, public)]
pub struct EventLog { #[primary_key] #[auto_inc] pub id: u64, #[index(btree)] pub plan_id: u32, pub kind: String, pub friend_id: Option<u32>, pub activity_id: Option<u32>, pub message: String, pub at: Timestamp }

fn friend_for(ctx: &ReducerContext, plan_id: u32) -> Option<Friend> { ctx.db.friend().iter().find(|f| f.plan_id == plan_id && f.identity == ctx.sender()) }
fn plan_for(ctx: &ReducerContext, plan_id: u32) -> Result<Plan, String> { ctx.db.plan().id().find(plan_id).ok_or_else(|| "Plan not found".into()) }
fn activity_for(ctx: &ReducerContext, id: u32) -> Result<Activity, String> { ctx.db.activity().id().find(id).ok_or_else(|| "Activity not found".into()) }
fn eligible(a: &Answer, activity: &Activity) -> bool { match a.state { AnswerState::In => true, AnswerState::Conditional => a.max_price.unwrap_or(0) >= activity.price, AnswerState::Out => false } }
fn eligible_count(ctx: &ReducerContext, plan_id: u32, activity: &Activity) -> u32 { ctx.db.answer().iter().filter(|a| a.plan_id == plan_id && a.activity_id == activity.id).filter(|a| ctx.db.friend().id().find(a.friend_id).map(|f| f.dropped_at.is_none()).unwrap_or(false)).filter(|a| eligible(a, activity)).count() as u32 }
fn event(ctx: &ReducerContext, plan_id: u32, kind: &str, friend_id: Option<u32>, activity_id: Option<u32>, message: String) { ctx.db.event_log().insert(EventLog { id: 0, plan_id, kind: kind.into(), friend_id, activity_id, message, at: ctx.timestamp }); }

#[spacetimedb::reducer(init)]
pub fn init(ctx: &ReducerContext) { if ctx.db.plan().iter().next().is_some() { return; } let p = ctx.db.plan().insert(Plan { id: 0, share_code: "SATURDAY".into(), title: "Saturday plans".into(), date_label: "Saturday".into(), status: PlanStatus::Open, locked_activity_id: None, version: 0 }); for (name, price, min_people) in [("Bowling", 400, 4), ("Escape room", 600, 5), ("Game night", 0, 3)] { ctx.db.activity().insert(Activity { id: 0, plan_id: p.id, name: name.into(), price, min_people }); } }

#[spacetimedb::reducer(client_connected)]
pub fn client_connected(ctx: &ReducerContext) { for mut f in ctx.db.friend().iter().filter(|f| f.identity == ctx.sender() && f.dropped_at.is_none()) { f.online = true; ctx.db.friend().id().update(f); } }
#[spacetimedb::reducer(client_disconnected)]
pub fn client_disconnected(ctx: &ReducerContext) { for mut f in ctx.db.friend().iter().filter(|f| f.identity == ctx.sender()) { f.online = false; ctx.db.friend().id().update(f); } }

#[spacetimedb::reducer]
pub fn join(ctx: &ReducerContext, plan_id: u32, name: String) -> Result<(), String> { plan_for(ctx, plan_id)?; let name = name.trim().to_string(); if name.is_empty() || name.len() > 40 { return Err("Name must be 1-40 characters".into()); } if let Some(mut f) = friend_for(ctx, plan_id) { if f.dropped_at.is_some() { return Err("You are marked out for this plan".into()); } f.name = name; f.online = true; ctx.db.friend().id().update(f); return Ok(()); } if ctx.db.friend().iter().any(|f| f.plan_id == plan_id && f.name == name && f.dropped_at.is_none()) { return Err("That name is already in use".into()); } let f = ctx.db.friend().insert(Friend { id: 0, plan_id, identity: ctx.sender(), name: name.clone(), online: true, joined_at: ctx.timestamp, dropped_at: None }); event(ctx, plan_id, "joined", Some(f.id), None, format!("{} joined", name)); Ok(()) }

#[spacetimedb::reducer]
pub fn set_answer(ctx: &ReducerContext, activity_id: u32, state: AnswerState, max_price: Option<u32>) -> Result<(), String> { let a = activity_for(ctx, activity_id)?; let p = plan_for(ctx, a.plan_id)?; if p.status != PlanStatus::Open { return Err("Plan is locked".into()); } let f = friend_for(ctx, a.plan_id).ok_or("Join the plan first")?; if f.dropped_at.is_some() { return Err("You are marked out for this plan".into()); } if state == AnswerState::Conditional && max_price.is_none() { return Err("Conditional answers need a maximum price".into()); } let key = format!("{}:{}", f.id, activity_id); if let Some(mut old) = ctx.db.answer().iter().find(|x| x.answer_key == key) { old.state = state; old.max_price = max_price; ctx.db.answer().id().update(old); } else { ctx.db.answer().insert(Answer { id: 0, plan_id: a.plan_id, friend_id: f.id, activity_id, state, max_price, answer_key: key }); } event(ctx, a.plan_id, "answered", Some(f.id), Some(activity_id), format!("{} answered", f.name)); Ok(()) }

#[spacetimedb::reducer]
pub fn propose(ctx: &ReducerContext, activity_id: u32) -> Result<(), String> { let a = activity_for(ctx, activity_id)?; let p = plan_for(ctx, a.plan_id)?; if p.status != PlanStatus::Open { return Err("Plan is locked".into()); } if ctx.db.proposal().iter().any(|x| x.plan_id == p.id && x.status == ProposalStatus::Pending) { return Err("A proposal is already pending".into()); } let f = friend_for(ctx, p.id).ok_or("Join the plan first")?; let answer = ctx.db.answer().iter().find(|x| x.friend_id == f.id && x.activity_id == activity_id).ok_or("Answer before proposing")?; if !eligible(&answer, &a) { return Err("You are not eligible for this activity".into()); } if eligible_count(ctx, p.id, &a) < a.min_people { return Err("This activity is not possible yet".into()); } ctx.db.proposal().insert(Proposal { id: 0, plan_id: p.id, activity_id, proposed_by: f.id, status: ProposalStatus::Pending, created_at: ctx.timestamp }); event(ctx, p.id, "proposed", Some(f.id), Some(activity_id), format!("{} proposed {}", f.name, a.name)); Ok(()) }

#[spacetimedb::reducer]
pub fn accept(ctx: &ReducerContext, proposal_id: u32) -> Result<(), String> { let mut prop = ctx.db.proposal().id().find(proposal_id).ok_or("Proposal not found")?; if prop.status != ProposalStatus::Pending { return Err("Proposal is no longer pending".into()); } let a = activity_for(ctx, prop.activity_id)?; let mut p = plan_for(ctx, prop.plan_id)?; let f = friend_for(ctx, prop.plan_id).ok_or("Join the plan first")?; let ans = ctx.db.answer().iter().find(|x| x.friend_id == f.id && x.activity_id == a.id).ok_or("Answer before accepting")?; if !eligible(&ans, &a) { return Err("You are not eligible to accept".into()); } let key = format!("{}:{}", proposal_id, f.id); if ctx.db.acceptance().iter().any(|x| x.acceptance_key == key) { return Err("You already accepted".into()); } ctx.db.acceptance().insert(Acceptance { id: 0, proposal_id, friend_id: f.id, accepted_at: ctx.timestamp, acceptance_key: key }); event(ctx, p.id, "accepted", Some(f.id), Some(a.id), format!("{} agreed", f.name)); let n = ctx.db.acceptance().iter().filter(|x| x.proposal_id == proposal_id).filter(|x| ctx.db.friend().id().find(x.friend_id).map(|z| z.dropped_at.is_none()).unwrap_or(false)).count() as u32; if n >= a.min_people { prop.status = ProposalStatus::Locked; p.status = PlanStatus::Locked; p.locked_activity_id = Some(a.id); p.version += 1; ctx.db.proposal().id().update(prop); ctx.db.plan().id().update(p); event(ctx, a.plan_id, "locked", None, Some(a.id), format!("{} is locked", a.name)); } Ok(()) }

#[spacetimedb::reducer]
pub fn cancel_proposal(ctx: &ReducerContext, proposal_id: u32) -> Result<(), String> { let mut p = ctx.db.proposal().id().find(proposal_id).ok_or("Proposal not found")?; if p.status != ProposalStatus::Pending { return Err("Proposal is no longer pending".into()); } let f = friend_for(ctx, p.plan_id).ok_or("Join the plan first")?; if f.id != p.proposed_by { return Err("Only the proposer can cancel".into()); } p.status = ProposalStatus::Cancelled; let activity_id = p.activity_id; ctx.db.proposal().id().update(p); event(ctx, f.plan_id, "cancelled", Some(f.id), Some(activity_id), "Proposal cancelled".into()); Ok(()) }

#[spacetimedb::reducer]
pub fn drop_out(ctx: &ReducerContext) -> Result<(), String> { let mut f = ctx.db.friend().iter().find(|x| x.identity == ctx.sender()).ok_or("Join the plan first")?; if f.dropped_at.is_some() { return Err("You are already out".into()); } let plan_id = f.plan_id; let mut p = plan_for(ctx, plan_id)?; f.dropped_at = Some(ctx.timestamp); f.online = false; let friend_id = f.id; let friend_name = f.name.clone(); ctx.db.friend().id().update(f); for mut a in ctx.db.answer().iter().filter(|x| x.friend_id == friend_id) { a.state = AnswerState::Out; a.max_price = None; ctx.db.answer().id().update(a); } let locked_id = p.locked_activity_id; let accepted = locked_id.and_then(|aid| ctx.db.proposal().iter().find(|x| x.plan_id == plan_id && x.status == ProposalStatus::Locked && x.activity_id == aid)).map(|prop| ctx.db.acceptance().iter().any(|x| x.proposal_id == prop.id && x.friend_id == friend_id)).unwrap_or(false); if accepted { if let Some(mut prop) = ctx.db.proposal().iter().find(|x| x.plan_id == plan_id && x.status == ProposalStatus::Locked) { prop.status = ProposalStatus::Reopened; ctx.db.proposal().id().update(prop); } p.status = PlanStatus::Open; p.locked_activity_id = None; p.version += 1; ctx.db.plan().id().update(p); event(ctx, plan_id, "reopened", Some(friend_id), locked_id, "needs a new decision".into()); } else { event(ctx, plan_id, "dropped", Some(friend_id), None, format!("{} dropped out", friend_name)); } Ok(()) }

#[spacetimedb::reducer]
pub fn leave(ctx: &ReducerContext) -> Result<(), String> { let mut f = ctx.db.friend().iter().find(|x| x.identity == ctx.sender()).ok_or("Join the plan first")?; f.online = false; ctx.db.friend().id().update(f); Ok(()) }
