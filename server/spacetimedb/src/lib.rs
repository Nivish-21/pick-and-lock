use spacetimedb::{Identity, ReducerContext, SpacetimeType, Table, Timestamp};

#[derive(SpacetimeType, Clone, Copy, PartialEq, Eq)]
pub enum PlanStatus {
    Open,
    Locked,
    Closed,
}
#[derive(SpacetimeType, Clone, Copy, PartialEq, Eq)]
pub enum AnswerState {
    In,
    Out,
    Conditional,
}
#[derive(SpacetimeType, Clone, Copy, PartialEq, Eq)]
pub enum ProposalStatus {
    Pending,
    Locked,
    Cancelled,
    Reopened,
}

#[spacetimedb::table(accessor = plan, public)]
pub struct Plan {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[unique]
    pub share_code: String,
    pub title: String,
    pub date_label: String,
    pub created_by: Identity,
    pub created_at: Timestamp,
    pub closed_by: Option<Identity>,
    pub closed_at: Option<Timestamp>,
    pub status: PlanStatus,
    pub locked_activity_id: Option<u32>,
    pub version: u64,
}
#[spacetimedb::table(accessor = activity, public)]
pub struct Activity {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[index(btree)]
    pub plan_id: u32,
    pub name: String,
    pub price: u32,
    pub min_people: u32,
}
#[spacetimedb::table(accessor = friend, public)]
pub struct Friend {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[index(btree)]
    pub plan_id: u32,
    pub identity: Identity,
    #[unique]
    pub friend_key: String,
    pub name: String,
    pub online: bool,
    pub joined_at: Timestamp,
    pub dropped_at: Option<Timestamp>,
}
#[spacetimedb::table(accessor = answer, public)]
pub struct Answer {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[index(btree)]
    pub plan_id: u32,
    pub friend_id: u32,
    pub activity_id: u32,
    pub state: AnswerState,
    pub max_price: Option<u32>,
    #[unique]
    pub answer_key: String,
}
#[spacetimedb::table(accessor = proposal, public)]
pub struct Proposal {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    pub plan_id: u32,
    pub activity_id: u32,
    pub proposed_by: u32,
    pub status: ProposalStatus,
    pub created_at: Timestamp,
}
#[spacetimedb::table(accessor = acceptance, public)]
pub struct Acceptance {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[index(btree)]
    pub plan_id: u32,
    pub proposal_id: u32,
    pub friend_id: u32,
    pub accepted_at: Timestamp,
    #[unique]
    pub acceptance_key: String,
}
#[spacetimedb::table(accessor = event_log, public)]
pub struct EventLog {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub plan_id: u32,
    pub kind: String,
    pub friend_id: Option<u32>,
    pub activity_id: Option<u32>,
    pub message: String,
    pub at: Timestamp,
}
#[spacetimedb::table(accessor = decision, public)]
pub struct Decision {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[index(btree)]
    pub plan_id: u32,
    pub proposal_id: u32,
    pub activity_id: u32,
    pub sequence: u32,
    pub decided_at: Timestamp,
    pub decision_duration_ms: u64,
    pub eligible_count: u32,
    pub accepted_count: u32,
}
#[spacetimedb::table(accessor = room_metrics, public)]
pub struct RoomMetrics {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[unique]
    #[index(btree)]
    pub plan_id: u32,
    pub decisions_taken: u32,
    pub total_decision_time_ms: u64,
    pub last_decision_time_ms: u64,
    pub last_decided_at: Option<Timestamp>,
}
#[spacetimedb::table(accessor = chat_message, public)]
pub struct ChatMessage {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub plan_id: u32,
    pub friend_id: u32,
    pub body: String,
    pub sent_at: Timestamp,
}

fn friend_for(ctx: &ReducerContext, plan_id: u32) -> Option<Friend> {
    ctx.db
        .friend()
        .iter()
        .find(|f| f.plan_id == plan_id && f.identity == ctx.sender())
}
fn plan_for(ctx: &ReducerContext, plan_id: u32) -> Result<Plan, String> {
    ctx.db
        .plan()
        .id()
        .find(plan_id)
        .ok_or_else(|| "Plan not found".into())
}
fn ensure_not_closed(plan: &Plan) -> Result<(), String> {
    if plan.status == PlanStatus::Closed {
        return Err("Room is closed".into());
    }
    Ok(())
}
fn activity_for(ctx: &ReducerContext, id: u32) -> Result<Activity, String> {
    ctx.db
        .activity()
        .id()
        .find(id)
        .ok_or_else(|| "Activity not found".into())
}
fn eligible(a: &Answer, activity: &Activity) -> bool {
    match a.state {
        AnswerState::In => true,
        AnswerState::Conditional => a.max_price.unwrap_or(0) >= activity.price,
        AnswerState::Out => false,
    }
}
fn eligible_count(ctx: &ReducerContext, plan_id: u32, activity: &Activity) -> u32 {
    ctx.db
        .answer()
        .iter()
        .filter(|a| a.plan_id == plan_id && a.activity_id == activity.id)
        .filter(|a| {
            ctx.db
                .friend()
                .id()
                .find(a.friend_id)
                .map(|f| f.dropped_at.is_none())
                .unwrap_or(false)
        })
        .filter(|a| eligible(a, activity))
        .count() as u32
}
fn active_eligible_acceptance_count(
    ctx: &ReducerContext,
    proposal_id: u32,
    activity: &Activity,
) -> u32 {
    ctx.db
        .acceptance()
        .iter()
        .filter(|acceptance| acceptance.proposal_id == proposal_id)
        .filter(|acceptance| {
            let Some(friend) = ctx.db.friend().id().find(acceptance.friend_id) else {
                return false;
            };
            if friend.dropped_at.is_some() {
                return false;
            }
            ctx.db
                .answer()
                .iter()
                .find(|answer| answer.friend_id == friend.id && answer.activity_id == activity.id)
                .is_some_and(|answer| eligible(&answer, activity))
        })
        .count() as u32
}
fn event(
    ctx: &ReducerContext,
    plan_id: u32,
    kind: &str,
    friend_id: Option<u32>,
    activity_id: Option<u32>,
    message: String,
) {
    ctx.db.event_log().insert(EventLog {
        id: 0,
        plan_id,
        kind: kind.into(),
        friend_id,
        activity_id,
        message,
        at: ctx.timestamp,
    });
}

fn decision_duration_ms(decided_at: Timestamp, proposed_at: Timestamp) -> u64 {
    decided_at
        .to_micros_since_unix_epoch()
        .saturating_sub(proposed_at.to_micros_since_unix_epoch())
        .max(0) as u64
        / 1_000
}

fn decision_for_lock(
    proposal: &Proposal,
    activity: &Activity,
    sequence: u32,
    decided_at: Timestamp,
    decision_duration_ms: u64,
    eligible_count: u32,
    accepted_count: u32,
) -> Decision {
    Decision {
        id: 0,
        plan_id: proposal.plan_id,
        proposal_id: proposal.id,
        activity_id: activity.id,
        sequence,
        decided_at,
        decision_duration_ms,
        eligible_count,
        accepted_count,
    }
}

fn next_decision_metrics(
    decisions_taken: u32,
    total_decision_time_ms: u64,
    decision_duration_ms: u64,
) -> (u32, u64) {
    (
        decisions_taken + 1,
        total_decision_time_ms + decision_duration_ms,
    )
}

fn valid_share_code(share_code: &str) -> bool {
    (6..=12).contains(&share_code.len())
        && share_code
            .bytes()
            .all(|character| character.is_ascii_uppercase() || character.is_ascii_digit())
}

fn seed_activities(ctx: &ReducerContext, plan_id: u32) {
    for (name, price, min_people) in [
        ("Bowling", 400, 4),
        ("Escape room", 600, 5),
        ("Game night", 0, 3),
    ] {
        ctx.db.activity().insert(Activity {
            id: 0,
            plan_id,
            name: name.into(),
            price,
            min_people,
        });
    }
}

fn create_room_metrics(ctx: &ReducerContext, plan_id: u32) {
    ctx.db.room_metrics().insert(RoomMetrics {
        id: 0,
        plan_id,
        decisions_taken: 0,
        total_decision_time_ms: 0,
        last_decision_time_ms: 0,
        last_decided_at: None,
    });
}

#[spacetimedb::reducer(init)]
pub fn init(ctx: &ReducerContext) {
    if ctx.db.plan().iter().next().is_some() {
        return;
    }
    let p = ctx.db.plan().insert(Plan {
        id: 0,
        share_code: "SATURDAY".into(),
        title: "Saturday plans".into(),
        date_label: "Saturday".into(),
        created_by: ctx.sender(),
        created_at: ctx.timestamp,
        closed_by: None,
        closed_at: None,
        status: PlanStatus::Open,
        locked_activity_id: None,
        version: 0,
    });
    seed_activities(ctx, p.id);
    create_room_metrics(ctx, p.id);
}

#[spacetimedb::reducer]
pub fn create_room(
    ctx: &ReducerContext,
    share_code: String,
    title: String,
    date_label: String,
) -> Result<(), String> {
    let share_code = share_code.trim().to_ascii_uppercase();
    let title = title.trim().to_string();
    let date_label = date_label.trim().to_string();
    if !valid_share_code(&share_code) {
        return Err("Room code must use 6-12 uppercase letters or numbers".into());
    }
    if title.is_empty() || title.len() > 60 || date_label.is_empty() || date_label.len() > 40 {
        return Err("Room title or date is invalid".into());
    }
    if ctx
        .db
        .plan()
        .iter()
        .any(|plan| plan.share_code == share_code)
    {
        return Err("That room code is already in use".into());
    }
    let plan = ctx.db.plan().insert(Plan {
        id: 0,
        share_code,
        title,
        date_label,
        created_by: ctx.sender(),
        created_at: ctx.timestamp,
        closed_by: None,
        closed_at: None,
        status: PlanStatus::Open,
        locked_activity_id: None,
        version: 0,
    });
    seed_activities(ctx, plan.id);
    create_room_metrics(ctx, plan.id);
    event(ctx, plan.id, "created", None, None, "Room created".into());
    Ok(())
}

#[spacetimedb::reducer(client_connected)]
pub fn client_connected(ctx: &ReducerContext) {
    for mut f in ctx
        .db
        .friend()
        .iter()
        .filter(|f| f.identity == ctx.sender() && f.dropped_at.is_none())
    {
        f.online = true;
        ctx.db.friend().id().update(f);
    }
}
#[spacetimedb::reducer(client_disconnected)]
pub fn client_disconnected(ctx: &ReducerContext) {
    for mut f in ctx
        .db
        .friend()
        .iter()
        .filter(|f| f.identity == ctx.sender())
    {
        f.online = false;
        ctx.db.friend().id().update(f);
    }
}

#[spacetimedb::reducer]
pub fn join(ctx: &ReducerContext, plan_id: u32, name: String) -> Result<(), String> {
    let plan = plan_for(ctx, plan_id)?;
    ensure_not_closed(&plan)?;
    let name = name.trim().to_string();
    if name.is_empty() || name.len() > 40 {
        return Err("Name must be 1-40 characters".into());
    }
    if let Some(mut f) = friend_for(ctx, plan_id) {
        if f.dropped_at.is_some() {
            return Err("You are marked out for this plan".into());
        }
        f.name = name;
        f.online = true;
        ctx.db.friend().id().update(f);
        return Ok(());
    }
    if ctx
        .db
        .friend()
        .iter()
        .any(|f| f.plan_id == plan_id && f.name == name && f.dropped_at.is_none())
    {
        return Err("That name is already in use".into());
    }
    let f = ctx.db.friend().insert(Friend {
        id: 0,
        plan_id,
        identity: ctx.sender(),
        friend_key: format!("{}:{}", plan_id, ctx.sender()),
        name: name.clone(),
        online: true,
        joined_at: ctx.timestamp,
        dropped_at: None,
    });
    event(
        ctx,
        plan_id,
        "joined",
        Some(f.id),
        None,
        format!("{} joined", name),
    );
    Ok(())
}

#[spacetimedb::reducer]
pub fn set_answer(
    ctx: &ReducerContext,
    activity_id: u32,
    state: AnswerState,
    max_price: Option<u32>,
) -> Result<(), String> {
    let a = activity_for(ctx, activity_id)?;
    let p = plan_for(ctx, a.plan_id)?;
    ensure_not_closed(&p)?;
    if p.status != PlanStatus::Open {
        return Err("Plan is locked".into());
    }
    let f = friend_for(ctx, a.plan_id).ok_or("Join the plan first")?;
    if f.dropped_at.is_some() {
        return Err("You are marked out for this plan".into());
    }
    if state == AnswerState::Conditional && max_price.is_none() {
        return Err("Conditional answers need a maximum price".into());
    }
    let key = format!("{}:{}", f.id, activity_id);
    if let Some(mut old) = ctx.db.answer().iter().find(|x| x.answer_key == key) {
        old.state = state;
        old.max_price = max_price;
        ctx.db.answer().id().update(old);
    } else {
        ctx.db.answer().insert(Answer {
            id: 0,
            plan_id: a.plan_id,
            friend_id: f.id,
            activity_id,
            state,
            max_price,
            answer_key: key,
        });
    }
    event(
        ctx,
        a.plan_id,
        "answered",
        Some(f.id),
        Some(activity_id),
        format!("{} answered", f.name),
    );
    Ok(())
}

#[spacetimedb::reducer]
pub fn propose(ctx: &ReducerContext, activity_id: u32) -> Result<(), String> {
    let a = activity_for(ctx, activity_id)?;
    let p = plan_for(ctx, a.plan_id)?;
    ensure_not_closed(&p)?;
    if p.status != PlanStatus::Open {
        return Err("Plan is locked".into());
    }
    if ctx
        .db
        .proposal()
        .iter()
        .any(|x| x.plan_id == p.id && x.status == ProposalStatus::Pending)
    {
        return Err("A proposal is already pending".into());
    }
    let f = friend_for(ctx, p.id).ok_or("Join the plan first")?;
    let answer = ctx
        .db
        .answer()
        .iter()
        .find(|x| x.friend_id == f.id && x.activity_id == activity_id)
        .ok_or("Answer before proposing")?;
    if !eligible(&answer, &a) {
        return Err("You are not eligible for this activity".into());
    }
    if eligible_count(ctx, p.id, &a) < a.min_people {
        return Err("This activity is not possible yet".into());
    }
    ctx.db.proposal().insert(Proposal {
        id: 0,
        plan_id: p.id,
        activity_id,
        proposed_by: f.id,
        status: ProposalStatus::Pending,
        created_at: ctx.timestamp,
    });
    event(
        ctx,
        p.id,
        "proposed",
        Some(f.id),
        Some(activity_id),
        format!("{} proposed {}", f.name, a.name),
    );
    Ok(())
}

#[spacetimedb::reducer]
pub fn accept(ctx: &ReducerContext, proposal_id: u32) -> Result<(), String> {
    let mut prop = ctx
        .db
        .proposal()
        .id()
        .find(proposal_id)
        .ok_or("Proposal not found")?;
    let a = activity_for(ctx, prop.activity_id)?;
    let mut p = plan_for(ctx, prop.plan_id)?;
    ensure_not_closed(&p)?;
    if prop.status != ProposalStatus::Pending {
        return Err("Proposal is no longer pending".into());
    }
    let f = friend_for(ctx, prop.plan_id).ok_or("Join the plan first")?;
    let ans = ctx
        .db
        .answer()
        .iter()
        .find(|x| x.friend_id == f.id && x.activity_id == a.id)
        .ok_or("Answer before accepting")?;
    if !eligible(&ans, &a) {
        return Err("You are not eligible to accept".into());
    }
    let key = format!("{}:{}", proposal_id, f.id);
    if ctx.db.acceptance().iter().any(|x| x.acceptance_key == key) {
        return Err("You already accepted".into());
    }
    ctx.db.acceptance().insert(Acceptance {
        id: 0,
        plan_id: p.id,
        proposal_id,
        friend_id: f.id,
        accepted_at: ctx.timestamp,
        acceptance_key: key,
    });
    event(
        ctx,
        p.id,
        "accepted",
        Some(f.id),
        Some(a.id),
        format!("{} agreed", f.name),
    );
    let n = active_eligible_acceptance_count(ctx, proposal_id, &a);
    if n >= a.min_people {
        let mut metrics = ctx
            .db
            .room_metrics()
            .iter()
            .find(|metrics| metrics.plan_id == p.id)
            .ok_or("Room metrics not found")?;
        let duration = decision_duration_ms(ctx.timestamp, prop.created_at);
        let (decisions_taken, total_decision_time_ms) = next_decision_metrics(
            metrics.decisions_taken,
            metrics.total_decision_time_ms,
            duration,
        );
        prop.status = ProposalStatus::Locked;
        p.status = PlanStatus::Locked;
        p.locked_activity_id = Some(a.id);
        p.version += 1;
        metrics.decisions_taken = decisions_taken;
        metrics.total_decision_time_ms = total_decision_time_ms;
        metrics.last_decision_time_ms = duration;
        metrics.last_decided_at = Some(ctx.timestamp);
        ctx.db.decision().insert(decision_for_lock(
            &prop,
            &a,
            decisions_taken,
            ctx.timestamp,
            duration,
            eligible_count(ctx, p.id, &a),
            n,
        ));
        ctx.db.proposal().id().update(prop);
        ctx.db.plan().id().update(p);
        ctx.db.room_metrics().id().update(metrics);
        event(
            ctx,
            a.plan_id,
            "locked",
            None,
            Some(a.id),
            format!("{} is locked", a.name),
        );
    }
    Ok(())
}

#[spacetimedb::reducer]
pub fn cancel_proposal(ctx: &ReducerContext, proposal_id: u32) -> Result<(), String> {
    let mut p = ctx
        .db
        .proposal()
        .id()
        .find(proposal_id)
        .ok_or("Proposal not found")?;
    ensure_not_closed(&plan_for(ctx, p.plan_id)?)?;
    if p.status != ProposalStatus::Pending {
        return Err("Proposal is no longer pending".into());
    }
    let f = friend_for(ctx, p.plan_id).ok_or("Join the plan first")?;
    if f.id != p.proposed_by {
        return Err("Only the proposer can cancel".into());
    }
    p.status = ProposalStatus::Cancelled;
    let activity_id = p.activity_id;
    ctx.db.proposal().id().update(p);
    event(
        ctx,
        f.plan_id,
        "cancelled",
        Some(f.id),
        Some(activity_id),
        "Proposal cancelled".into(),
    );
    Ok(())
}

#[spacetimedb::reducer]
pub fn drop_out(ctx: &ReducerContext, plan_id: u32) -> Result<(), String> {
    let mut p = plan_for(ctx, plan_id)?;
    ensure_not_closed(&p)?;
    let mut f = friend_for(ctx, plan_id).ok_or("Join the plan first")?;
    if f.dropped_at.is_some() {
        return Err("You are already out".into());
    }
    f.dropped_at = Some(ctx.timestamp);
    f.online = false;
    let friend_id = f.id;
    let friend_name = f.name.clone();
    ctx.db.friend().id().update(f);
    for mut a in ctx.db.answer().iter().filter(|x| x.friend_id == friend_id) {
        a.state = AnswerState::Out;
        a.max_price = None;
        ctx.db.answer().id().update(a);
    }
    let locked_id = p.locked_activity_id;
    let locked_activity = locked_id.and_then(|activity_id| activity_for(ctx, activity_id).ok());
    let accepted = locked_id
        .and_then(|aid| {
            ctx.db.proposal().iter().find(|x| {
                x.plan_id == plan_id && x.status == ProposalStatus::Locked && x.activity_id == aid
            })
        })
        .map(|prop| {
            ctx.db
                .acceptance()
                .iter()
                .any(|x| x.proposal_id == prop.id && x.friend_id == friend_id)
        })
        .unwrap_or(false);
    if accepted {
        if let Some(mut prop) = ctx
            .db
            .proposal()
            .iter()
            .find(|x| x.plan_id == plan_id && x.status == ProposalStatus::Locked)
        {
            prop.status = ProposalStatus::Reopened;
            ctx.db.proposal().id().update(prop);
        }
        p.status = PlanStatus::Open;
        p.locked_activity_id = None;
        p.version += 1;
        ctx.db.plan().id().update(p);
        let remaining = locked_activity
            .as_ref()
            .map(|activity| eligible_count(ctx, plan_id, activity))
            .unwrap_or(0);
        let required = locked_activity
            .as_ref()
            .map(|activity| activity.min_people)
            .unwrap_or(0);
        event(
            ctx,
            plan_id,
            "reopened",
            Some(friend_id),
            locked_id,
            format!(
                "needs a new decision - only {} of {} remain",
                remaining, required
            ),
        );
    } else {
        event(
            ctx,
            plan_id,
            "dropped",
            Some(friend_id),
            None,
            format!("{} dropped out", friend_name),
        );
    }
    Ok(())
}

#[spacetimedb::reducer]
pub fn leave(ctx: &ReducerContext, plan_id: u32) -> Result<(), String> {
    let plan = plan_for(ctx, plan_id)?;
    ensure_not_closed(&plan)?;
    let mut f = friend_for(ctx, plan_id).ok_or("Join the plan first")?;
    f.online = false;
    ctx.db.friend().id().update(f);
    Ok(())
}

#[spacetimedb::reducer]
pub fn close_room(ctx: &ReducerContext, plan_id: u32) -> Result<(), String> {
    let mut plan = plan_for(ctx, plan_id)?;
    ensure_not_closed(&plan)?;
    if plan.created_by != ctx.sender() {
        return Err("Only the room creator can close".into());
    }
    if plan.status != PlanStatus::Locked {
        return Err("Room must be locked before closing".into());
    }
    plan.status = PlanStatus::Closed;
    plan.closed_by = Some(ctx.sender());
    plan.closed_at = Some(ctx.timestamp);
    plan.version += 1;
    ctx.db.plan().id().update(plan);
    event(
        ctx,
        plan_id,
        "closed",
        friend_for(ctx, plan_id).map(|friend| friend.id),
        None,
        "Room closed".into(),
    );
    Ok(())
}

#[spacetimedb::reducer]
pub fn send_message(ctx: &ReducerContext, plan_id: u32, body: String) -> Result<(), String> {
    let plan = plan_for(ctx, plan_id)?;
    ensure_not_closed(&plan)?;
    let body = body.trim().to_string();
    if !(1..=500).contains(&body.len()) {
        return Err("Message must be 1-500 bytes".into());
    }
    let friend = friend_for(ctx, plan_id).ok_or("Join the plan first")?;
    if friend.dropped_at.is_some() {
        return Err("You are marked out for this plan".into());
    }
    ctx.db.chat_message().insert(ChatMessage {
        id: 0,
        plan_id,
        friend_id: friend.id,
        body,
        sent_at: ctx.timestamp,
    });
    event(
        ctx,
        plan_id,
        "message_sent",
        Some(friend.id),
        None,
        format!("{} sent a message", friend.name),
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn threshold_lock_adds_one_decision_and_a_non_negative_duration() {
        let proposed_at = Timestamp::from_micros_since_unix_epoch(1_000_000);
        let decided_at = Timestamp::from_micros_since_unix_epoch(1_200_000);
        let proposal = Proposal {
            id: 3,
            plan_id: 1,
            activity_id: 2,
            proposed_by: 4,
            status: ProposalStatus::Pending,
            created_at: proposed_at,
        };
        let activity = Activity {
            id: 2,
            plan_id: 1,
            name: "Bowling".into(),
            price: 400,
            min_people: 4,
        };
        let duration = decision_duration_ms(decided_at, proposed_at);
        let (decisions_taken, total_decision_time_ms) = next_decision_metrics(0, 0, duration);
        let decision = decision_for_lock(
            &proposal,
            &activity,
            decisions_taken,
            decided_at,
            duration,
            4,
            4,
        );

        assert_eq!(duration, 200);
        assert_eq!(decisions_taken, 1);
        assert_eq!(total_decision_time_ms, 200);
        assert_eq!(decision.sequence, 1);
        assert_eq!(decision.decision_duration_ms, 200);
        assert_eq!(decision.eligible_count, 4);
        assert_eq!(decision.accepted_count, 4);
    }
}
