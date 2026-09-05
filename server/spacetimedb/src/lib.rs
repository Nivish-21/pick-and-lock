use sha2::{Digest, Sha256};
use spacetimedb::{Identity, ReducerContext, SpacetimeType, Table, Timestamp, ViewContext};
use std::time::Duration;

#[derive(SpacetimeType, Clone, Copy, PartialEq, Eq)]
pub enum PlanStatus {
    Open,
    Locked,
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
    pub status: PlanStatus,
    pub locked_activity_id: Option<u32>,
    pub version: u64,
    #[default(None)]
    pub scheduled_at: Option<Timestamp>,
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
    #[default(None)]
    pub distance_km: Option<u32>,
    #[default(None)]
    pub time_minutes: Option<u32>,
}
#[spacetimedb::table(accessor = friend, public)]
pub struct Friend {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[index(btree)]
    pub plan_id: u32,
    #[index(btree)]
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

#[spacetimedb::table(accessor = chat_message, private)]
pub struct ChatMessage {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub room_id: u32,
    pub sender_identity: Identity,
    pub sender_name: String,
    pub is_bot: bool,
    pub body: String,
    pub kind: String,
    pub payload_json: String,
    pub sent_at: Timestamp,
}

#[spacetimedb::table(accessor = member_preference, private)]
pub struct MemberPreference {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub room_id: u32,
    pub friend_id: u32,
    pub friend_name: String,
    pub statement: String,
    pub category: String,
    pub source_message_id: u64,
    pub recorded_at: Timestamp,
}

#[spacetimedb::table(accessor = bot_room_state, private)]
pub struct BotRoomState {
    #[primary_key]
    pub room_id: u32,
    pub last_bot_message_at: Option<Timestamp>,
    pub bot_messages_in_current_minute: u32,
    pub minute_window_started_at: Timestamp,
    pub last_processed_message_id: u64,
}

#[spacetimedb::table(accessor = location_submission, private)]
pub struct LocationSubmission {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub room_id: u32,
    pub friend_id: u32,
    pub lat: f64,
    pub lng: f64,
    pub submitted_at: Timestamp,
}

#[derive(SpacetimeType, Clone, Copy, PartialEq, Eq)]
pub enum PrivateRoomStatus {
    Open,
    Locked,
}

#[derive(SpacetimeType, Clone, Copy, PartialEq, Eq)]
pub enum RoomMembershipRole {
    Creator,
    Member,
}

#[derive(SpacetimeType)]
pub struct PrivateRoomChoiceInput {
    pub label: String,
    pub price: Option<u32>,
    pub min_people: u32,
}

#[spacetimedb::table(accessor = private_room, private)]
pub struct PrivateRoom {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[unique]
    pub public_room_id: String,
    #[index(btree)]
    pub creator_identity: Identity,
    pub title: String,
    pub created_at: Timestamp,
    pub status: PrivateRoomStatus,
    #[default(None)]
    pub locked_choice_id: Option<u32>,
}

#[spacetimedb::table(accessor = room_schedule, private)]
pub struct RoomSchedule {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[unique]
    pub room_id: u32,
    pub starts_at: Timestamp,
    pub ends_at: Timestamp,
    pub timezone: String,
}

#[spacetimedb::table(accessor = room_choice, private)]
pub struct RoomChoice {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[index(btree)]
    pub room_id: u32,
    pub label: String,
    pub price: Option<u32>,
    pub min_people: u32,
    pub sort_order: u32,
}

#[spacetimedb::table(accessor = room_public_share, private)]
pub struct RoomPublicShare {
    #[primary_key]
    pub room_id: u32,
    pub show_schedule: bool,
}

#[spacetimedb::table(accessor = shared_room_story, public)]
pub struct SharedRoomStory {
    #[primary_key]
    pub id: String,
    pub title: String,
    pub status: PrivateRoomStatus,
    pub choice_labels: Vec<String>,
    pub selected_choice_label: Option<String>,
    pub decision_count: u32,
    pub published_at: Timestamp,
    pub updated_at: Timestamp,
    pub starts_at: Option<Timestamp>,
    pub timezone: Option<String>,
}

#[spacetimedb::table(accessor = room_membership, private)]
pub struct RoomMembership {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[index(btree)]
    pub room_id: u32,
    #[index(btree)]
    pub identity: Identity,
    #[unique]
    pub membership_key: String,
    pub display_name: String,
    pub joined_at: Timestamp,
    pub role: RoomMembershipRole,
    pub left_at: Option<Timestamp>,
}

#[spacetimedb::table(accessor = room_invite, private)]
pub struct RoomInvite {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[index(btree)]
    pub room_id: u32,
    #[unique]
    pub token_hash: String,
    pub expires_at: Option<Timestamp>,
    pub max_uses: Option<u32>,
    pub uses: u32,
    pub revoked_at: Option<Timestamp>,
}

#[spacetimedb::table(accessor = room_vote, private)]
pub struct RoomVote {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[index(btree)]
    pub room_id: u32,
    #[index(btree)]
    pub choice_id: u32,
    #[index(btree)]
    pub member_identity: Identity,
    pub state: AnswerState,
    pub max_price: Option<u32>,
    #[unique]
    pub vote_key: String,
}

#[derive(Clone)]
#[spacetimedb::table(accessor = room_proposal, private)]
pub struct RoomProposal {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[index(btree)]
    pub room_id: u32,
    pub choice_id: u32,
    pub proposer_identity: Identity,
    pub status: ProposalStatus,
    pub created_at: Timestamp,
}

#[spacetimedb::table(accessor = room_acceptance, private)]
pub struct RoomAcceptance {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[index(btree)]
    pub room_id: u32,
    #[index(btree)]
    pub proposal_id: u32,
    pub member_identity: Identity,
    pub accepted_at: Timestamp,
    #[unique]
    pub acceptance_key: String,
}

#[spacetimedb::table(accessor = room_decision, private)]
pub struct RoomDecision {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[index(btree)]
    pub room_id: u32,
    pub choice_id: u32,
    pub locked_at: Timestamp,
    pub decision_duration_seconds: u64,
    pub eligible_acceptance_count: u32,
}

#[spacetimedb::table(accessor = room_metrics, private)]
pub struct RoomMetrics {
    #[primary_key]
    pub room_id: u32,
    pub decision_count: u32,
    pub total_decision_seconds: u64,
    pub latest_locked_at: Option<Timestamp>,
}

#[derive(SpacetimeType)]
pub struct MyRoom {
    pub room_id: u32,
    pub public_room_id: String,
    pub title: String,
    pub created_at: Timestamp,
    pub status: PrivateRoomStatus,
}

#[derive(SpacetimeType)]
pub struct MyRoomSchedule {
    pub room_id: u32,
    pub starts_at: Timestamp,
    pub ends_at: Timestamp,
    pub timezone: String,
}

#[derive(SpacetimeType)]
pub struct MyRoomChoice {
    pub choice_id: u32,
    pub room_id: u32,
    pub label: String,
    pub price: Option<u32>,
    pub min_people: u32,
    pub sort_order: u32,
}

#[derive(SpacetimeType)]
pub struct MyRoomMember {
    pub membership_id: u32,
    pub room_id: u32,
    pub display_name: String,
    pub joined_at: Timestamp,
    pub role: RoomMembershipRole,
}

#[derive(SpacetimeType)]
pub struct MyRoomVote {
    pub vote_id: u32,
    pub room_id: u32,
    pub choice_id: u32,
    pub member_name: String,
    pub state: AnswerState,
    pub max_price: Option<u32>,
}

#[derive(SpacetimeType)]
pub struct MyRoomProposal {
    pub proposal_id: u32,
    pub room_id: u32,
    pub choice_id: u32,
    pub proposer_name: String,
    pub status: ProposalStatus,
    pub created_at: Timestamp,
}

#[derive(SpacetimeType)]
pub struct MyRoomAcceptance {
    pub acceptance_id: u32,
    pub room_id: u32,
    pub proposal_id: u32,
    pub member_name: String,
    pub accepted_at: Timestamp,
}

#[derive(SpacetimeType)]
pub struct MyRoomDecision {
    pub decision_id: u32,
    pub room_id: u32,
    pub choice_id: u32,
    pub locked_at: Timestamp,
    pub decision_duration_seconds: u64,
    pub eligible_acceptance_count: u32,
}

#[derive(SpacetimeType)]
pub struct MyRoomMetrics {
    pub room_id: u32,
    pub decision_count: u32,
    pub total_decision_seconds: u64,
    pub latest_locked_at: Option<Timestamp>,
}

#[derive(SpacetimeType)]
pub struct MyRoomChat {
    pub id: u64,
    pub room_id: u32,
    pub sender_identity: Identity,
    pub sender_name: String,
    pub is_bot: bool,
    pub body: String,
    pub kind: String,
    pub payload_json: String,
    pub sent_at: Timestamp,
}

#[derive(SpacetimeType)]
pub struct MyRoomPreference {
    pub id: u64,
    pub room_id: u32,
    pub friend_id: u32,
    pub friend_name: String,
    pub statement: String,
    pub category: String,
    pub source_message_id: u64,
    pub recorded_at: Timestamp,
}

#[derive(SpacetimeType)]
pub struct MyRoomLocation {
    pub id: u64,
    pub room_id: u32,
    pub friend_id: u32,
    pub lat: f64,
    pub lng: f64,
    pub submitted_at: Timestamp,
}

#[derive(SpacetimeType)]
pub struct MyBotRoomState {
    pub room_id: u32,
    pub last_bot_message_at: Option<Timestamp>,
    pub bot_messages_in_current_minute: u32,
    pub minute_window_started_at: Timestamp,
    pub last_processed_message_id: u64,
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

fn valid_share_code(share_code: &str) -> bool {
    (6..=12).contains(&share_code.len())
        && share_code
            .bytes()
            .all(|character| character.is_ascii_uppercase() || character.is_ascii_digit())
}

fn valid_private_room_id(public_room_id: &str) -> bool {
    (6..=64).contains(&public_room_id.len())
        && public_room_id.bytes().all(|character| {
            character.is_ascii_alphanumeric() || character == b'-' || character == b'_'
        })
}

fn valid_timezone(timezone: &str) -> bool {
    !timezone.is_empty()
        && timezone.len() <= 64
        && timezone.bytes().all(|character| {
            character.is_ascii_alphanumeric()
                || matches!(character, b'/' | b'_' | b'+' | b'-' | b'.')
        })
}

fn valid_invite_token(token: &str) -> bool {
    (22..=128).contains(&token.len())
        && token.bytes().all(|character| {
            character.is_ascii_alphanumeric() || character == b'-' || character == b'_'
        })
}

fn invite_token_hash(token: &str) -> String {
    format!("{:x}", Sha256::digest(token.as_bytes()))
}

fn membership_key(room_id: u32, identity: Identity) -> String {
    format!("{room_id}:{identity}")
}

fn invite_is_active(invite: &RoomInvite, now: Timestamp) -> bool {
    invite.revoked_at.is_none() && invite.expires_at.is_none_or(|expires_at| expires_at > now)
}

fn invite_has_capacity(invite: &RoomInvite) -> bool {
    invite
        .max_uses
        .is_none_or(|max_uses| invite.uses < max_uses)
}

fn active_room_ids<I>(memberships: I, identity: Identity) -> Vec<u32>
where
    I: Iterator<Item = RoomMembership>,
{
    memberships
        .filter(|membership| membership.identity == identity && membership.left_at.is_none())
        .map(|membership| membership.room_id)
        .collect()
}

fn view_active_room_ids(ctx: &ViewContext) -> Vec<u32> {
    active_room_ids(
        ctx.db.room_membership().identity().filter(ctx.sender()),
        ctx.sender(),
    )
}

fn room_member_name(ctx: &ViewContext, room_id: u32, identity: Identity) -> Option<String> {
    ctx.db
        .room_membership()
        .room_id()
        .filter(room_id)
        .find(|membership| {
            membership.room_id == room_id
                && membership.identity == identity
                && membership.left_at.is_none()
        })
        .map(|membership| membership.display_name)
}

fn private_vote_key(room_id: u32, choice_id: u32, identity: Identity) -> String {
    format!("{room_id}:{choice_id}:{identity}")
}

fn private_acceptance_key(proposal_id: u32, identity: Identity) -> String {
    format!("{proposal_id}:{identity}")
}

fn private_vote_is_eligible(
    state: AnswerState,
    max_price: Option<u32>,
    choice_price: Option<u32>,
) -> bool {
    match state {
        AnswerState::In => true,
        AnswerState::Conditional => max_price.unwrap_or(0) >= choice_price.unwrap_or(0),
        AnswerState::Out => false,
    }
}

fn has_pending_private_proposal<I>(mut proposals: I, room_id: u32) -> bool
where
    I: Iterator<Item = RoomProposal>,
{
    proposals
        .any(|proposal| proposal.room_id == room_id && proposal.status == ProposalStatus::Pending)
}

fn private_acceptance_locks(eligible_acceptance_count: u32, min_people: u32) -> bool {
    eligible_acceptance_count >= min_people
}

fn private_decision_duration_seconds(locked_at: Timestamp, proposed_at: Timestamp) -> u64 {
    locked_at
        .to_micros_since_unix_epoch()
        .saturating_sub(proposed_at.to_micros_since_unix_epoch())
        .max(0) as u64
        / 1_000_000
}

fn next_private_metrics(
    decision_count: u32,
    total_decision_seconds: u64,
    decision_duration_seconds: u64,
) -> (u32, u64) {
    (
        decision_count + 1,
        total_decision_seconds + decision_duration_seconds,
    )
}

fn should_reopen_private_room(status: PrivateRoomStatus, accepted_locked_proposal: bool) -> bool {
    status == PrivateRoomStatus::Locked && accepted_locked_proposal
}

fn reopened_private_room_status(
    status: PrivateRoomStatus,
    accepted_locked_proposal: bool,
) -> PrivateRoomStatus {
    if should_reopen_private_room(status, accepted_locked_proposal) {
        PrivateRoomStatus::Open
    } else {
        status
    }
}

fn view_plan_ids(ctx: &ViewContext) -> Vec<u32> {
    ctx.db
        .friend()
        .identity()
        .filter(ctx.sender())
        .filter(|friend| friend.dropped_at.is_none())
        .map(|friend| friend.plan_id)
        .collect()
}

fn private_room_by_public_id(
    ctx: &ReducerContext,
    public_room_id: &str,
) -> Result<PrivateRoom, String> {
    ctx.db
        .private_room()
        .iter()
        .find(|room| room.public_room_id == public_room_id)
        .ok_or_else(|| "Room not found".into())
}

fn membership_for(ctx: &ReducerContext, room_id: u32) -> Option<RoomMembership> {
    ctx.db
        .room_membership()
        .iter()
        .find(|membership| membership.room_id == room_id && membership.identity == ctx.sender())
}

fn active_membership_for(ctx: &ReducerContext, room_id: u32) -> Result<RoomMembership, String> {
    membership_for(ctx, room_id)
        .filter(|membership| membership.left_at.is_none())
        .ok_or_else(|| "Join the room first".into())
}

fn private_room_for(ctx: &ReducerContext, room_id: u32) -> Result<PrivateRoom, String> {
    ctx.db
        .private_room()
        .id()
        .find(room_id)
        .ok_or_else(|| "Room not found".into())
}

fn private_choice_for(ctx: &ReducerContext, choice_id: u32) -> Result<RoomChoice, String> {
    ctx.db
        .room_choice()
        .id()
        .find(choice_id)
        .ok_or_else(|| "Choice not found".into())
}

fn require_story_creator(sender: Identity, creator: Identity) -> Result<(), String> {
    if sender == creator {
        Ok(())
    } else {
        Err("Only the room creator can publish a story".into())
    }
}

fn creator_private_room_for_id(ctx: &ReducerContext, room_id: u32) -> Result<PrivateRoom, String> {
    let room = private_room_for(ctx, room_id)?;
    require_story_creator(ctx.sender(), room.creator_identity)?;
    Ok(room)
}

fn shared_story_from_parts(
    id: String,
    title: String,
    status: PrivateRoomStatus,
    choice_labels: Vec<String>,
    selected_choice_label: Option<String>,
    decision_count: u32,
    published_at: Timestamp,
    updated_at: Timestamp,
    schedule: Option<(Timestamp, String)>,
) -> SharedRoomStory {
    let (starts_at, timezone) = schedule
        .map(|(starts_at, timezone)| (Some(starts_at), Some(timezone)))
        .unwrap_or((None, None));
    SharedRoomStory {
        id,
        title,
        status,
        choice_labels,
        selected_choice_label,
        decision_count,
        published_at,
        updated_at,
        starts_at,
        timezone,
    }
}

fn refreshed_shared_story(
    published: SharedRoomStory,
    mut current: SharedRoomStory,
) -> SharedRoomStory {
    current.published_at = published.published_at;
    current
}

fn story_id_to_unpublish(story_id: &str, room_id: &str) -> Option<String> {
    (story_id == room_id).then(|| story_id.to_string())
}

fn shared_story_for(
    ctx: &ReducerContext,
    room: &PrivateRoom,
    show_schedule: bool,
    published_at: Timestamp,
) -> SharedRoomStory {
    let mut choices: Vec<RoomChoice> = ctx.db.room_choice().room_id().filter(room.id).collect();
    choices.sort_by_key(|choice| choice.sort_order);
    let selected_choice_label = room.locked_choice_id.and_then(|choice_id| {
        choices
            .iter()
            .find(|choice| choice.id == choice_id)
            .map(|choice| choice.label.clone())
    });
    let decision_count = ctx
        .db
        .room_metrics()
        .room_id()
        .find(room.id)
        .map(|metrics| metrics.decision_count)
        .unwrap_or(0);
    let schedule = if show_schedule {
        ctx.db
            .room_schedule()
            .room_id()
            .find(room.id)
            .map(|schedule| (schedule.starts_at, schedule.timezone))
    } else {
        None
    };
    shared_story_from_parts(
        room.public_room_id.clone(),
        room.title.clone(),
        room.status,
        choices.into_iter().map(|choice| choice.label).collect(),
        selected_choice_label,
        decision_count,
        published_at,
        ctx.timestamp,
        schedule,
    )
}

fn save_shared_story(ctx: &ReducerContext, story: SharedRoomStory) {
    if ctx
        .db
        .shared_room_story()
        .id()
        .find(story.id.clone())
        .is_some()
    {
        ctx.db.shared_room_story().id().update(story);
    } else {
        ctx.db.shared_room_story().insert(story);
    }
}

fn save_public_share_settings(ctx: &ReducerContext, room_id: u32, show_schedule: bool) {
    if let Some(mut settings) = ctx.db.room_public_share().room_id().find(room_id) {
        settings.show_schedule = show_schedule;
        ctx.db.room_public_share().room_id().update(settings);
    } else {
        ctx.db.room_public_share().insert(RoomPublicShare {
            room_id,
            show_schedule,
        });
    }
}

fn refresh_published_story(ctx: &ReducerContext, room_id: u32) -> Result<(), String> {
    let room = private_room_for(ctx, room_id)?;
    let Some(published) = ctx
        .db
        .shared_room_story()
        .id()
        .find(room.public_room_id.clone())
    else {
        return Ok(());
    };
    let show_schedule = ctx
        .db
        .room_public_share()
        .room_id()
        .find(room_id)
        .is_some_and(|settings| settings.show_schedule);
    let published_at = published.published_at;
    save_shared_story(
        ctx,
        refreshed_shared_story(
            published,
            shared_story_for(ctx, &room, show_schedule, published_at),
        ),
    );
    Ok(())
}

fn private_eligible_vote_count(ctx: &ReducerContext, choice: &RoomChoice) -> u32 {
    ctx.db
        .room_vote()
        .choice_id()
        .filter(choice.id)
        .filter(|vote| {
            vote.room_id == choice.room_id
                && private_vote_is_eligible(vote.state, vote.max_price, choice.price)
                && ctx.db.room_membership().iter().any(|membership| {
                    membership.room_id == choice.room_id
                        && membership.identity == vote.member_identity
                        && membership.left_at.is_none()
                })
        })
        .count() as u32
}

fn private_eligible_acceptance_count(
    ctx: &ReducerContext,
    proposal_id: u32,
    choice: &RoomChoice,
) -> u32 {
    ctx.db
        .room_acceptance()
        .proposal_id()
        .filter(proposal_id)
        .filter(|acceptance| {
            ctx.db.room_membership().iter().any(|membership| {
                membership.room_id == choice.room_id
                    && membership.identity == acceptance.member_identity
                    && membership.left_at.is_none()
            }) && ctx.db.room_vote().iter().any(|vote| {
                vote.room_id == choice.room_id
                    && vote.choice_id == choice.id
                    && vote.member_identity == acceptance.member_identity
                    && private_vote_is_eligible(vote.state, vote.max_price, choice.price)
            })
        })
        .count() as u32
}

fn configured_bot_identity() -> Option<Identity> {
    option_env!("BOT_IDENTITY").and_then(|value| Identity::from_hex(value).ok())
}

fn require_bot(ctx: &ReducerContext) -> Result<(), String> {
    match configured_bot_identity() {
        Some(identity) if identity == ctx.sender() => Ok(()),
        _ => Err("Bot identity is not authorized".into()),
    }
}

fn valid_chat_kind(kind: &str) -> bool {
    matches!(
        kind,
        "text" | "location_request" | "place_suggestions" | "recap"
    )
}

fn bot_state_for(ctx: &ReducerContext, room_id: u32) -> BotRoomState {
    ctx.db
        .bot_room_state()
        .room_id()
        .find(room_id)
        .unwrap_or(BotRoomState {
            room_id,
            last_bot_message_at: None,
            bot_messages_in_current_minute: 0,
            minute_window_started_at: ctx.timestamp,
            last_processed_message_id: 0,
        })
}

fn save_bot_state(ctx: &ReducerContext, state: BotRoomState) {
    if ctx
        .db
        .bot_room_state()
        .room_id()
        .find(state.room_id)
        .is_some()
    {
        ctx.db.bot_room_state().room_id().update(state);
    } else {
        ctx.db.bot_room_state().insert(state);
    }
}

fn creator_private_room(ctx: &ReducerContext, public_room_id: &str) -> Result<PrivateRoom, String> {
    let room = private_room_by_public_id(ctx, public_room_id)?;
    if room.creator_identity != ctx.sender() {
        return Err("Only the room creator can do that".into());
    }
    Ok(room)
}

fn insert_invite(
    ctx: &ReducerContext,
    room_id: u32,
    token: String,
    expires_at: Option<Timestamp>,
    max_uses: Option<u32>,
) -> Result<(), String> {
    if !valid_invite_token(&token) {
        return Err("Invite token is invalid".into());
    }
    if expires_at.is_some_and(|expires_at| expires_at <= ctx.timestamp) {
        return Err("Invite expiry must be in the future".into());
    }
    if max_uses == Some(0) {
        return Err("Invite uses must be at least one".into());
    }
    let token_hash = invite_token_hash(&token);
    if ctx
        .db
        .room_invite()
        .iter()
        .any(|invite| invite.token_hash == token_hash)
    {
        return Err("Invite token is already in use".into());
    }
    ctx.db.room_invite().insert(RoomInvite {
        id: 0,
        room_id,
        token_hash,
        expires_at,
        max_uses,
        uses: 0,
        revoked_at: None,
    });
    Ok(())
}

fn revoke_active_invites(ctx: &ReducerContext, room_id: u32) -> bool {
    let mut revoked_any = false;
    for mut invite in ctx
        .db
        .room_invite()
        .iter()
        .filter(|invite| invite.room_id == room_id && invite.revoked_at.is_none())
    {
        invite.revoked_at = Some(ctx.timestamp);
        ctx.db.room_invite().id().update(invite);
        revoked_any = true;
    }
    revoked_any
}

#[spacetimedb::view(accessor = my_rooms, public, primary_key = room_id)]
pub fn my_rooms(ctx: &ViewContext) -> Vec<MyRoom> {
    view_active_room_ids(ctx)
        .into_iter()
        .filter_map(|room_id| ctx.db.private_room().id().find(room_id))
        .map(|room| MyRoom {
            room_id: room.id,
            public_room_id: room.public_room_id,
            title: room.title,
            created_at: room.created_at,
            status: room.status,
        })
        .collect()
}

#[spacetimedb::view(accessor = my_room_schedule, public, primary_key = room_id)]
pub fn my_room_schedule(ctx: &ViewContext) -> Vec<MyRoomSchedule> {
    view_active_room_ids(ctx)
        .into_iter()
        .filter_map(|room_id| ctx.db.room_schedule().room_id().find(room_id))
        .map(|schedule| MyRoomSchedule {
            room_id: schedule.room_id,
            starts_at: schedule.starts_at,
            ends_at: schedule.ends_at,
            timezone: schedule.timezone,
        })
        .collect()
}

#[spacetimedb::view(accessor = my_room_choices, public, primary_key = choice_id)]
pub fn my_room_choices(ctx: &ViewContext) -> Vec<MyRoomChoice> {
    view_active_room_ids(ctx)
        .into_iter()
        .flat_map(|room_id| ctx.db.room_choice().room_id().filter(room_id))
        .map(|choice| MyRoomChoice {
            choice_id: choice.id,
            room_id: choice.room_id,
            label: choice.label,
            price: choice.price,
            min_people: choice.min_people,
            sort_order: choice.sort_order,
        })
        .collect()
}

#[spacetimedb::view(accessor = my_room_members, public, primary_key = membership_id)]
pub fn my_room_members(ctx: &ViewContext) -> Vec<MyRoomMember> {
    view_active_room_ids(ctx)
        .into_iter()
        .flat_map(|room_id| ctx.db.room_membership().room_id().filter(room_id))
        .filter(|membership| membership.left_at.is_none())
        .map(|membership| MyRoomMember {
            membership_id: membership.id,
            room_id: membership.room_id,
            display_name: membership.display_name,
            joined_at: membership.joined_at,
            role: membership.role,
        })
        .collect()
}

#[spacetimedb::view(accessor = my_room_votes, public, primary_key = vote_id)]
pub fn my_room_votes(ctx: &ViewContext) -> Vec<MyRoomVote> {
    view_active_room_ids(ctx)
        .into_iter()
        .flat_map(|room_id| ctx.db.room_vote().room_id().filter(room_id))
        .filter_map(|vote| {
            room_member_name(ctx, vote.room_id, vote.member_identity).map(|member_name| {
                MyRoomVote {
                    vote_id: vote.id,
                    room_id: vote.room_id,
                    choice_id: vote.choice_id,
                    member_name,
                    state: vote.state,
                    max_price: vote.max_price,
                }
            })
        })
        .collect()
}

#[spacetimedb::view(accessor = my_room_proposals, public, primary_key = proposal_id)]
pub fn my_room_proposals(ctx: &ViewContext) -> Vec<MyRoomProposal> {
    view_active_room_ids(ctx)
        .into_iter()
        .flat_map(|room_id| ctx.db.room_proposal().room_id().filter(room_id))
        .filter_map(|proposal| {
            room_member_name(ctx, proposal.room_id, proposal.proposer_identity).map(
                |proposer_name| MyRoomProposal {
                    proposal_id: proposal.id,
                    room_id: proposal.room_id,
                    choice_id: proposal.choice_id,
                    proposer_name,
                    status: proposal.status,
                    created_at: proposal.created_at,
                },
            )
        })
        .collect()
}

#[spacetimedb::view(accessor = my_room_acceptances, public, primary_key = acceptance_id)]
pub fn my_room_acceptances(ctx: &ViewContext) -> Vec<MyRoomAcceptance> {
    view_active_room_ids(ctx)
        .into_iter()
        .flat_map(|room_id| ctx.db.room_acceptance().room_id().filter(room_id))
        .filter_map(|acceptance| {
            room_member_name(ctx, acceptance.room_id, acceptance.member_identity).map(
                |member_name| MyRoomAcceptance {
                    acceptance_id: acceptance.id,
                    room_id: acceptance.room_id,
                    proposal_id: acceptance.proposal_id,
                    member_name,
                    accepted_at: acceptance.accepted_at,
                },
            )
        })
        .collect()
}

#[spacetimedb::view(accessor = my_room_decisions, public, primary_key = decision_id)]
pub fn my_room_decisions(ctx: &ViewContext) -> Vec<MyRoomDecision> {
    view_active_room_ids(ctx)
        .into_iter()
        .flat_map(|room_id| ctx.db.room_decision().room_id().filter(room_id))
        .map(|decision| MyRoomDecision {
            decision_id: decision.id,
            room_id: decision.room_id,
            choice_id: decision.choice_id,
            locked_at: decision.locked_at,
            decision_duration_seconds: decision.decision_duration_seconds,
            eligible_acceptance_count: decision.eligible_acceptance_count,
        })
        .collect()
}

#[spacetimedb::view(accessor = my_room_metrics, public, primary_key = room_id)]
pub fn my_room_metrics(ctx: &ViewContext) -> Vec<MyRoomMetrics> {
    view_active_room_ids(ctx)
        .into_iter()
        .filter_map(|room_id| ctx.db.room_metrics().room_id().find(room_id))
        .map(|metrics| MyRoomMetrics {
            room_id: metrics.room_id,
            decision_count: metrics.decision_count,
            total_decision_seconds: metrics.total_decision_seconds,
            latest_locked_at: metrics.latest_locked_at,
        })
        .collect()
}

#[spacetimedb::view(accessor = my_room_chat, public, primary_key = id)]
pub fn my_room_chat(ctx: &ViewContext) -> Vec<MyRoomChat> {
    let room_ids = view_plan_ids(ctx);
    room_ids
        .into_iter()
        .flat_map(|room_id| ctx.db.chat_message().room_id().filter(room_id))
        .map(|message| MyRoomChat {
            id: message.id,
            room_id: message.room_id,
            sender_identity: message.sender_identity,
            sender_name: message.sender_name,
            is_bot: message.is_bot,
            body: message.body,
            kind: message.kind,
            payload_json: message.payload_json,
            sent_at: message.sent_at,
        })
        .collect()
}

#[spacetimedb::view(accessor = my_room_preferences, public, primary_key = id)]
pub fn my_room_preferences(ctx: &ViewContext) -> Vec<MyRoomPreference> {
    let room_ids = view_plan_ids(ctx);
    room_ids
        .into_iter()
        .flat_map(|room_id| ctx.db.member_preference().room_id().filter(room_id))
        .map(|preference| MyRoomPreference {
            id: preference.id,
            room_id: preference.room_id,
            friend_id: preference.friend_id,
            friend_name: preference.friend_name,
            statement: preference.statement,
            category: preference.category,
            source_message_id: preference.source_message_id,
            recorded_at: preference.recorded_at,
        })
        .collect()
}

#[spacetimedb::view(accessor = my_room_locations, public, primary_key = id)]
pub fn my_room_locations(ctx: &ViewContext) -> Vec<MyRoomLocation> {
    let room_ids = view_plan_ids(ctx);
    room_ids
        .into_iter()
        .flat_map(|room_id| ctx.db.location_submission().room_id().filter(room_id))
        .map(|location| MyRoomLocation {
            id: location.id,
            room_id: location.room_id,
            friend_id: location.friend_id,
            lat: location.lat,
            lng: location.lng,
            submitted_at: location.submitted_at,
        })
        .collect()
}

#[spacetimedb::view(accessor = my_bot_room_state, public, primary_key = room_id)]
pub fn my_bot_room_state(ctx: &ViewContext) -> Vec<MyBotRoomState> {
    let room_ids = view_plan_ids(ctx);
    room_ids
        .into_iter()
        .filter_map(|room_id| ctx.db.bot_room_state().room_id().find(room_id))
        .map(|state| MyBotRoomState {
            room_id: state.room_id,
            last_bot_message_at: state.last_bot_message_at,
            bot_messages_in_current_minute: state.bot_messages_in_current_minute,
            minute_window_started_at: state.minute_window_started_at,
            last_processed_message_id: state.last_processed_message_id,
        })
        .collect()
}

#[spacetimedb::reducer]
pub fn send_chat_message(ctx: &ReducerContext, room_id: u32, body: String) -> Result<(), String> {
    let friend = friend_for(ctx, room_id).ok_or("Join the plan first")?;
    plan_for(ctx, room_id)?;
    let body = body.trim().to_string();
    if body.is_empty() || body.len() > 500 {
        return Err("Message must be 1-500 characters".into());
    }
    ctx.db.chat_message().insert(ChatMessage {
        id: 0,
        room_id,
        sender_identity: ctx.sender(),
        sender_name: friend.name,
        is_bot: false,
        body,
        kind: "text".into(),
        payload_json: "{}".into(),
        sent_at: ctx.timestamp,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn send_bot_message(
    ctx: &ReducerContext,
    room_id: u32,
    body: String,
    kind: String,
    payload_json: String,
) -> Result<(), String> {
    require_bot(ctx)?;
    plan_for(ctx, room_id)?;
    let body = body.trim().to_string();
    if body.is_empty() || body.len() > 500 || !valid_chat_kind(&kind) {
        return Err("Bot message is invalid".into());
    }
    if payload_json.len() > 4_000 {
        return Err("Bot payload is too large".into());
    }

    let mut state = bot_state_for(ctx, room_id);
    let in_minute = ctx
        .timestamp
        .duration_since(state.minute_window_started_at)
        .is_some_and(|duration| duration < Duration::from_secs(60));
    if !in_minute {
        state.minute_window_started_at = ctx.timestamp;
        state.bot_messages_in_current_minute = 0;
    }
    if state
        .last_bot_message_at
        .and_then(|last| ctx.timestamp.duration_since(last))
        .is_some_and(|duration| duration < Duration::from_secs(25))
    {
        return Err("Bot cooldown is active".into());
    }
    if state.bot_messages_in_current_minute >= 3 {
        return Err("Bot message limit reached".into());
    }

    ctx.db.chat_message().insert(ChatMessage {
        id: 0,
        room_id,
        sender_identity: ctx.sender(),
        sender_name: "AI Concierge".into(),
        is_bot: true,
        body,
        kind,
        payload_json,
        sent_at: ctx.timestamp,
    });
    state.last_bot_message_at = Some(ctx.timestamp);
    state.bot_messages_in_current_minute += 1;
    save_bot_state(ctx, state);
    Ok(())
}

#[spacetimedb::reducer]
pub fn bot_add_activity(
    ctx: &ReducerContext,
    room_id: u32,
    name: String,
    price: u32,
    min_people: u32,
    distance_km: Option<u32>,
    time_minutes: Option<u32>,
) -> Result<(), String> {
    require_bot(ctx)?;
    let plan = plan_for(ctx, room_id)?;
    if plan.status != PlanStatus::Open {
        return Err("Plan is locked".into());
    }
    let name = name.trim().to_string();
    if name.is_empty() || name.len() > 60 {
        return Err("Activity name must be 1-60 characters".into());
    }
    if min_people == 0 || min_people > 50 {
        return Err("Minimum people must be between 1 and 50".into());
    }
    if price > 1_000_000 {
        return Err("Price is too high".into());
    }
    if let Some(distance) = distance_km {
        if distance > 1000 {
            return Err("Distance must be 1000 km or less".into());
        }
    }
    if let Some(minutes) = time_minutes {
        if minutes > 1440 {
            return Err("Time budget must be 1440 minutes or less".into());
        }
    }
    if ctx
        .db
        .activity()
        .iter()
        .any(|activity| activity.plan_id == room_id && activity.name.eq_ignore_ascii_case(&name))
    {
        return Err("That option already exists".into());
    }
    let activity = ctx.db.activity().insert(Activity {
        id: 0,
        plan_id: room_id,
        name: name.clone(),
        price,
        min_people,
        distance_km,
        time_minutes,
    });
    event(
        ctx,
        room_id,
        "activity_added",
        None,
        Some(activity.id),
        format!("New option added: {}", name),
    );
    Ok(())
}

#[spacetimedb::reducer]
pub fn ensure_bot_friend(ctx: &ReducerContext, plan_id: u32) -> Result<(), String> {
    require_bot(ctx)?;
    plan_for(ctx, plan_id)?;
    if friend_for(ctx, plan_id).is_none() {
        ctx.db.friend().insert(Friend {
            id: 0,
            plan_id,
            identity: ctx.sender(),
            friend_key: format!("{}:{}", plan_id, ctx.sender()),
            name: "AI Concierge".into(),
            online: true,
            joined_at: ctx.timestamp,
            dropped_at: None,
        });
    }
    Ok(())
}

#[spacetimedb::reducer]
pub fn record_preference(
    ctx: &ReducerContext,
    room_id: u32,
    friend_id: u32,
    statement: String,
    category: String,
    source_message_id: u64,
) -> Result<(), String> {
    require_bot(ctx)?;
    plan_for(ctx, room_id)?;
    let member = ctx
        .db
        .friend()
        .id()
        .find(friend_id)
        .filter(|friend| friend.plan_id == room_id && friend.dropped_at.is_none())
        .ok_or("Member not found")?;
    let statement = statement.trim().to_string();
    if statement.is_empty() || statement.len() > 240 {
        return Err("Preference statement must be 1-240 characters".into());
    }
    if !matches!(
        category.as_str(),
        "dietary" | "budget" | "timing" | "access" | "other"
    ) {
        return Err("Preference category is invalid".into());
    }
    if ctx
        .db
        .chat_message()
        .id()
        .find(source_message_id)
        .is_none_or(|message| message.room_id != room_id)
    {
        return Err("Source message not found".into());
    }
    ctx.db.member_preference().insert(MemberPreference {
        id: 0,
        room_id,
        friend_id,
        friend_name: member.name,
        statement,
        category,
        source_message_id,
        recorded_at: ctx.timestamp,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn submit_location(
    ctx: &ReducerContext,
    room_id: u32,
    lat: f64,
    lng: f64,
) -> Result<(), String> {
    let member = friend_for(ctx, room_id).ok_or("Join the plan first")?;
    plan_for(ctx, room_id)?;
    if !lat.is_finite()
        || !lng.is_finite()
        || !(-90.0..=90.0).contains(&lat)
        || !(-180.0..=180.0).contains(&lng)
    {
        return Err("Location is invalid".into());
    }
    ctx.db.location_submission().insert(LocationSubmission {
        id: 0,
        room_id,
        friend_id: member.id,
        lat,
        lng,
        submitted_at: ctx.timestamp,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn advance_bot_watermark(
    ctx: &ReducerContext,
    room_id: u32,
    last_processed_message_id: u64,
) -> Result<(), String> {
    require_bot(ctx)?;
    plan_for(ctx, room_id)?;
    let mut state = bot_state_for(ctx, room_id);
    if last_processed_message_id > state.last_processed_message_id {
        state.last_processed_message_id = last_processed_message_id;
        save_bot_state(ctx, state);
    }
    Ok(())
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
            distance_km: None,
            time_minutes: None,
        });
    }
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
        status: PlanStatus::Open,
        locked_activity_id: None,
        version: 0,
        scheduled_at: None,
    });
    seed_activities(ctx, p.id);
}

#[spacetimedb::reducer]
pub fn create_private_room(
    ctx: &ReducerContext,
    public_room_id: String,
    title: String,
    creator_display_name: String,
    starts_at: Timestamp,
    ends_at: Timestamp,
    timezone: String,
    choices: Vec<PrivateRoomChoiceInput>,
    invite_token: String,
    invite_expires_at: Option<Timestamp>,
    invite_max_uses: Option<u32>,
) -> Result<(), String> {
    let public_room_id = public_room_id.trim().to_string();
    let title = title.trim().to_string();
    let creator_display_name = creator_display_name.trim().to_string();
    let timezone = timezone.trim().to_string();
    if !valid_private_room_id(&public_room_id) {
        return Err("Room ID is invalid".into());
    }
    if title.is_empty() || title.len() > 60 {
        return Err("Room title must be 1-60 characters".into());
    }
    if creator_display_name.is_empty() || creator_display_name.len() > 40 {
        return Err("Display name must be 1-40 characters".into());
    }
    if ends_at <= starts_at || !valid_timezone(&timezone) {
        return Err("Schedule is invalid".into());
    }
    if !(2..=6).contains(&choices.len())
        || choices.iter().any(|choice| {
            let label = choice.label.trim();
            label.is_empty() || label.len() > 60 || choice.min_people == 0
        })
        || choices.iter().enumerate().any(|(index, choice)| {
            choices[..index]
                .iter()
                .any(|other| other.label.trim().eq_ignore_ascii_case(choice.label.trim()))
        })
    {
        return Err("Choices are invalid".into());
    }
    if ctx
        .db
        .private_room()
        .iter()
        .any(|room| room.public_room_id == public_room_id)
    {
        return Err("That room ID is already in use".into());
    }
    let room = ctx.db.private_room().insert(PrivateRoom {
        id: 0,
        public_room_id,
        creator_identity: ctx.sender(),
        title,
        created_at: ctx.timestamp,
        status: PrivateRoomStatus::Open,
        locked_choice_id: None,
    });
    ctx.db.room_schedule().insert(RoomSchedule {
        id: 0,
        room_id: room.id,
        starts_at,
        ends_at,
        timezone,
    });
    for (sort_order, choice) in choices.into_iter().enumerate() {
        ctx.db.room_choice().insert(RoomChoice {
            id: 0,
            room_id: room.id,
            label: choice.label.trim().to_string(),
            price: choice.price,
            min_people: choice.min_people,
            sort_order: sort_order as u32,
        });
    }
    ctx.db.room_membership().insert(RoomMembership {
        id: 0,
        room_id: room.id,
        identity: ctx.sender(),
        membership_key: membership_key(room.id, ctx.sender()),
        display_name: creator_display_name,
        joined_at: ctx.timestamp,
        role: RoomMembershipRole::Creator,
        left_at: None,
    });
    ctx.db.room_metrics().insert(RoomMetrics {
        room_id: room.id,
        decision_count: 0,
        total_decision_seconds: 0,
        latest_locked_at: None,
    });
    insert_invite(
        ctx,
        room.id,
        invite_token,
        invite_expires_at,
        invite_max_uses,
    )
}

#[spacetimedb::reducer]
pub fn join_with_invite(
    ctx: &ReducerContext,
    token: String,
    display_name: String,
) -> Result<(), String> {
    let display_name = display_name.trim().to_string();
    if display_name.is_empty() || display_name.len() > 40 || !valid_invite_token(&token) {
        return Err("Invite is invalid".into());
    }
    let token_hash = invite_token_hash(&token);
    let mut invite = ctx
        .db
        .room_invite()
        .iter()
        .find(|invite| invite.token_hash == token_hash)
        .ok_or("Invite is invalid")?;
    if !invite_is_active(&invite, ctx.timestamp) {
        return Err("Invite is invalid".into());
    }
    if let Some(mut membership) = membership_for(ctx, invite.room_id) {
        if membership.left_at.is_none() {
            membership.display_name = display_name;
            ctx.db.room_membership().id().update(membership);
            return Ok(());
        }
        if !invite_has_capacity(&invite) {
            return Err("Invite is invalid".into());
        }
        membership.display_name = display_name;
        membership.joined_at = ctx.timestamp;
        membership.left_at = None;
        ctx.db.room_membership().id().update(membership);
    } else {
        if !invite_has_capacity(&invite) {
            return Err("Invite is invalid".into());
        }
        ctx.db.room_membership().insert(RoomMembership {
            id: 0,
            room_id: invite.room_id,
            identity: ctx.sender(),
            membership_key: membership_key(invite.room_id, ctx.sender()),
            display_name,
            joined_at: ctx.timestamp,
            role: RoomMembershipRole::Member,
            left_at: None,
        });
    }
    invite.uses += 1;
    ctx.db.room_invite().id().update(invite);
    Ok(())
}

#[spacetimedb::reducer]
pub fn revoke_invite(ctx: &ReducerContext, public_room_id: String) -> Result<(), String> {
    let room = creator_private_room(ctx, public_room_id.trim())?;
    if !revoke_active_invites(ctx, room.id) {
        return Err("No active invite".into());
    }
    Ok(())
}

#[spacetimedb::reducer]
pub fn regenerate_invite(
    ctx: &ReducerContext,
    public_room_id: String,
    token: String,
    expires_at: Option<Timestamp>,
    max_uses: Option<u32>,
) -> Result<(), String> {
    let room = creator_private_room(ctx, public_room_id.trim())?;
    revoke_active_invites(ctx, room.id);
    insert_invite(ctx, room.id, token, expires_at, max_uses)
}

#[spacetimedb::reducer]
pub fn set_private_vote(
    ctx: &ReducerContext,
    choice_id: u32,
    state: AnswerState,
    max_price: Option<u32>,
) -> Result<(), String> {
    let choice = private_choice_for(ctx, choice_id)?;
    let room = private_room_for(ctx, choice.room_id)?;
    active_membership_for(ctx, choice.room_id)?;
    if room.status != PrivateRoomStatus::Open {
        return Err("Room is locked".into());
    }
    if state == AnswerState::Conditional && max_price.is_none() {
        return Err("Conditional votes need a maximum price".into());
    }
    if state != AnswerState::Conditional && max_price.is_some() {
        return Err("Only conditional votes can set a maximum price".into());
    }
    let vote_key = private_vote_key(choice.room_id, choice.id, ctx.sender());
    if let Some(mut vote) = ctx.db.room_vote().vote_key().find(vote_key.clone()) {
        vote.state = state;
        vote.max_price = max_price;
        ctx.db.room_vote().id().update(vote);
    } else {
        ctx.db.room_vote().insert(RoomVote {
            id: 0,
            room_id: choice.room_id,
            choice_id: choice.id,
            member_identity: ctx.sender(),
            state,
            max_price,
            vote_key,
        });
    }
    Ok(())
}

#[spacetimedb::reducer]
pub fn propose_private_choice(ctx: &ReducerContext, choice_id: u32) -> Result<(), String> {
    let choice = private_choice_for(ctx, choice_id)?;
    let room = private_room_for(ctx, choice.room_id)?;
    active_membership_for(ctx, choice.room_id)?;
    if room.status != PrivateRoomStatus::Open {
        return Err("Room is locked".into());
    }
    if has_pending_private_proposal(ctx.db.room_proposal().iter(), choice.room_id) {
        return Err("A proposal is already pending".into());
    }
    let vote = ctx
        .db
        .room_vote()
        .vote_key()
        .find(private_vote_key(choice.room_id, choice.id, ctx.sender()))
        .ok_or("Vote before proposing")?;
    if !private_vote_is_eligible(vote.state, vote.max_price, choice.price) {
        return Err("You are not eligible for this choice".into());
    }
    if private_eligible_vote_count(ctx, &choice) < choice.min_people {
        return Err("This choice is not possible yet".into());
    }
    ctx.db.room_proposal().insert(RoomProposal {
        id: 0,
        room_id: choice.room_id,
        choice_id: choice.id,
        proposer_identity: ctx.sender(),
        status: ProposalStatus::Pending,
        created_at: ctx.timestamp,
    });
    Ok(())
}

#[spacetimedb::reducer]
pub fn accept_private_proposal(ctx: &ReducerContext, proposal_id: u32) -> Result<(), String> {
    let mut proposal = ctx
        .db
        .room_proposal()
        .id()
        .find(proposal_id)
        .ok_or("Proposal not found")?;
    if proposal.status != ProposalStatus::Pending {
        return Err("Proposal is no longer pending".into());
    }
    let choice = private_choice_for(ctx, proposal.choice_id)?;
    let mut room = private_room_for(ctx, proposal.room_id)?;
    active_membership_for(ctx, proposal.room_id)?;
    if room.status != PrivateRoomStatus::Open {
        return Err("Room is locked".into());
    }
    let vote = ctx
        .db
        .room_vote()
        .vote_key()
        .find(private_vote_key(choice.room_id, choice.id, ctx.sender()))
        .ok_or("Vote before accepting")?;
    if !private_vote_is_eligible(vote.state, vote.max_price, choice.price) {
        return Err("You are not eligible to accept".into());
    }
    let acceptance_key = private_acceptance_key(proposal.id, ctx.sender());
    if ctx
        .db
        .room_acceptance()
        .acceptance_key()
        .find(acceptance_key.clone())
        .is_some()
    {
        return Err("You already accepted".into());
    }
    ctx.db.room_acceptance().insert(RoomAcceptance {
        id: 0,
        room_id: proposal.room_id,
        proposal_id: proposal.id,
        member_identity: ctx.sender(),
        accepted_at: ctx.timestamp,
        acceptance_key,
    });
    let eligible_acceptance_count = private_eligible_acceptance_count(ctx, proposal.id, &choice);
    if private_acceptance_locks(eligible_acceptance_count, choice.min_people) {
        let mut metrics = ctx
            .db
            .room_metrics()
            .room_id()
            .find(proposal.room_id)
            .ok_or("Room metrics not found")?;
        let decision_duration_seconds =
            private_decision_duration_seconds(ctx.timestamp, proposal.created_at);
        (metrics.decision_count, metrics.total_decision_seconds) = next_private_metrics(
            metrics.decision_count,
            metrics.total_decision_seconds,
            decision_duration_seconds,
        );
        metrics.latest_locked_at = Some(ctx.timestamp);
        proposal.status = ProposalStatus::Locked;
        room.status = PrivateRoomStatus::Locked;
        room.locked_choice_id = Some(choice.id);
        ctx.db.room_decision().insert(RoomDecision {
            id: 0,
            room_id: proposal.room_id,
            choice_id: choice.id,
            locked_at: ctx.timestamp,
            decision_duration_seconds,
            eligible_acceptance_count,
        });
        ctx.db.room_proposal().id().update(proposal);
        ctx.db.private_room().id().update(room);
        ctx.db.room_metrics().room_id().update(metrics);
        refresh_published_story(ctx, choice.room_id)?;
    }
    Ok(())
}

#[spacetimedb::reducer]
pub fn cancel_private_proposal(ctx: &ReducerContext, proposal_id: u32) -> Result<(), String> {
    let mut proposal = ctx
        .db
        .room_proposal()
        .id()
        .find(proposal_id)
        .ok_or("Proposal not found")?;
    active_membership_for(ctx, proposal.room_id)?;
    if proposal.status != ProposalStatus::Pending {
        return Err("Proposal is no longer pending".into());
    }
    if proposal.proposer_identity != ctx.sender() {
        return Err("Only the proposer can cancel".into());
    }
    proposal.status = ProposalStatus::Cancelled;
    ctx.db.room_proposal().id().update(proposal);
    Ok(())
}

#[spacetimedb::reducer]
pub fn leave_private_room(ctx: &ReducerContext, room_id: u32) -> Result<(), String> {
    let mut membership = active_membership_for(ctx, room_id)?;
    let mut room = private_room_for(ctx, room_id)?;
    let accepted_locked_proposal = room.locked_choice_id.is_some_and(|choice_id| {
        ctx.db.room_proposal().iter().any(|proposal| {
            proposal.room_id == room_id
                && proposal.choice_id == choice_id
                && proposal.status == ProposalStatus::Locked
                && ctx.db.room_acceptance().iter().any(|acceptance| {
                    acceptance.proposal_id == proposal.id
                        && acceptance.member_identity == ctx.sender()
                })
        })
    });
    membership.left_at = Some(ctx.timestamp);
    ctx.db.room_membership().id().update(membership);
    if should_reopen_private_room(room.status, accepted_locked_proposal) {
        if let Some(mut proposal) = ctx.db.room_proposal().iter().find(|proposal| {
            proposal.room_id == room_id && proposal.status == ProposalStatus::Locked
        }) {
            proposal.status = ProposalStatus::Reopened;
            ctx.db.room_proposal().id().update(proposal);
        }
        room.status = reopened_private_room_status(room.status, accepted_locked_proposal);
        room.locked_choice_id = None;
        ctx.db.private_room().id().update(room);
        refresh_published_story(ctx, room_id)?;
    }
    Ok(())
}

#[spacetimedb::reducer]
pub fn publish_room(ctx: &ReducerContext, room_id: u32, show_schedule: bool) -> Result<(), String> {
    let room = creator_private_room_for_id(ctx, room_id)?;
    save_public_share_settings(ctx, room_id, show_schedule);
    let published_at = ctx
        .db
        .shared_room_story()
        .id()
        .find(room.public_room_id.clone())
        .map(|story| story.published_at)
        .unwrap_or(ctx.timestamp);
    save_shared_story(
        ctx,
        shared_story_for(ctx, &room, show_schedule, published_at),
    );
    Ok(())
}

#[spacetimedb::reducer]
pub fn set_public_share_settings(
    ctx: &ReducerContext,
    room_id: u32,
    show_schedule: bool,
) -> Result<(), String> {
    let room = creator_private_room_for_id(ctx, room_id)?;
    save_public_share_settings(ctx, room_id, show_schedule);
    if let Some(story) = ctx
        .db
        .shared_room_story()
        .id()
        .find(room.public_room_id.clone())
    {
        save_shared_story(
            ctx,
            shared_story_for(ctx, &room, show_schedule, story.published_at),
        );
    }
    Ok(())
}

#[spacetimedb::reducer]
pub fn unpublish_room(ctx: &ReducerContext, room_id: u32) -> Result<(), String> {
    let room = creator_private_room_for_id(ctx, room_id)?;
    if let Some(story_id) = story_id_to_unpublish(&room.public_room_id, &room.public_room_id) {
        ctx.db.shared_room_story().id().delete(story_id);
    }
    Ok(())
}

#[spacetimedb::reducer]
pub fn create_room(
    ctx: &ReducerContext,
    share_code: String,
    title: String,
    date_label: String,
    scheduled_at: Timestamp,
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
        status: PlanStatus::Open,
        locked_activity_id: None,
        version: 0,
        scheduled_at: Some(scheduled_at),
    });
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
    plan_for(ctx, plan_id)?;
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
pub fn add_activity(
    ctx: &ReducerContext,
    plan_id: u32,
    name: String,
    price: u32,
    min_people: u32,
    distance_km: Option<u32>,
    time_minutes: Option<u32>,
) -> Result<(), String> {
    let p = plan_for(ctx, plan_id)?;
    if p.status != PlanStatus::Open {
        return Err("Plan is locked".into());
    }
    friend_for(ctx, plan_id).ok_or("Join the plan first")?;
    let name = name.trim().to_string();
    if name.is_empty() || name.len() > 60 {
        return Err("Activity name must be 1-60 characters".into());
    }
    if min_people == 0 || min_people > 50 {
        return Err("Minimum people must be between 1 and 50".into());
    }
    if price > 1_000_000 {
        return Err("Price is too high".into());
    }
    if let Some(distance) = distance_km {
        if distance > 1000 {
            return Err("Distance must be 1000 km or less".into());
        }
    }
    if let Some(minutes) = time_minutes {
        if minutes > 1440 {
            return Err("Time budget must be 1440 minutes or less".into());
        }
    }
    if ctx
        .db
        .activity()
        .iter()
        .any(|a| a.plan_id == plan_id && a.name.eq_ignore_ascii_case(&name))
    {
        return Err("That option already exists".into());
    }
    let a = ctx.db.activity().insert(Activity {
        id: 0,
        plan_id,
        name: name.clone(),
        price,
        min_people,
        distance_km,
        time_minutes,
    });
    event(
        ctx,
        plan_id,
        "activity_added",
        None,
        Some(a.id),
        format!("New option added: {}", name),
    );
    Ok(())
}

#[spacetimedb::reducer]
pub fn propose(ctx: &ReducerContext, activity_id: u32) -> Result<(), String> {
    let a = activity_for(ctx, activity_id)?;
    let p = plan_for(ctx, a.plan_id)?;
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
    if prop.status != ProposalStatus::Pending {
        return Err("Proposal is no longer pending".into());
    }
    let a = activity_for(ctx, prop.activity_id)?;
    let mut p = plan_for(ctx, prop.plan_id)?;
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
        prop.status = ProposalStatus::Locked;
        p.status = PlanStatus::Locked;
        p.locked_activity_id = Some(a.id);
        p.version += 1;
        ctx.db.proposal().id().update(prop);
        ctx.db.plan().id().update(p);
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
    let mut f = friend_for(ctx, plan_id).ok_or("Join the plan first")?;
    if f.dropped_at.is_some() {
        return Err("You are already out".into());
    }
    let mut p = plan_for(ctx, plan_id)?;
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
    let mut f = friend_for(ctx, plan_id).ok_or("Join the plan first")?;
    f.online = false;
    ctx.db.friend().id().update(f);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn identity(value: u8) -> Identity {
        Identity::from_byte_array([value; 32])
    }

    fn membership(room_id: u32, identity: Identity, left_at: Option<Timestamp>) -> RoomMembership {
        RoomMembership {
            id: room_id,
            room_id,
            identity,
            membership_key: membership_key(room_id, identity),
            display_name: "Member".into(),
            joined_at: Timestamp::UNIX_EPOCH,
            role: RoomMembershipRole::Member,
            left_at,
        }
    }

    #[test]
    fn outsider_has_no_visible_private_room_ids() {
        let member = identity(1);
        let outsider = identity(2);
        let visible = active_room_ids(
            vec![
                membership(7, member, None),
                membership(8, outsider, Some(Timestamp::UNIX_EPOCH)),
            ]
            .into_iter(),
            outsider,
        );

        assert!(visible.is_empty());
        assert_eq!(
            active_room_ids(vec![membership(7, member, None)].into_iter(), member),
            [7]
        );
    }

    #[test]
    fn invite_storage_uses_only_a_sha256_hash() {
        let token = "aGVsbG8tdGhpcy1pcy1hLXNlY3JldA";
        let token_hash = invite_token_hash(token);

        assert!(valid_invite_token(token));
        assert_ne!(token_hash, token);
        assert_eq!(token_hash.len(), 64);
        assert!(
            token_hash
                .bytes()
                .all(|character| character.is_ascii_hexdigit())
        );
    }

    #[test]
    fn invite_acceptance_binds_membership_to_the_sender_identity() {
        let sender = identity(3);
        let other_sender = identity(4);
        let invite = RoomInvite {
            id: 1,
            room_id: 9,
            token_hash: invite_token_hash("aGVsbG8tdGhpcy1pcy1hLXNlY3JldA"),
            expires_at: None,
            max_uses: Some(1),
            uses: 0,
            revoked_at: None,
        };

        assert!(invite_is_active(&invite, Timestamp::UNIX_EPOCH));
        assert!(invite_has_capacity(&invite));
        assert_ne!(
            membership_key(invite.room_id, sender),
            membership_key(invite.room_id, other_sender)
        );
        assert_eq!(membership(9, sender, None).identity, sender);
    }

    #[test]
    fn only_one_private_proposal_can_be_pending_per_room() {
        let proposal = RoomProposal {
            id: 1,
            room_id: 7,
            choice_id: 3,
            proposer_identity: identity(1),
            status: ProposalStatus::Pending,
            created_at: Timestamp::UNIX_EPOCH,
        };

        assert!(has_pending_private_proposal(
            [proposal.clone()].into_iter(),
            7
        ));
        assert!(!has_pending_private_proposal([proposal].into_iter(), 8));
    }

    #[test]
    fn final_private_acceptance_locks_once_and_updates_metrics_once() {
        let proposed_at = Timestamp::from_micros_since_unix_epoch(1_000_000);
        let locked_at = Timestamp::from_micros_since_unix_epoch(3_500_000);
        let (decision_count, total_decision_seconds) = next_private_metrics(
            0,
            0,
            private_decision_duration_seconds(locked_at, proposed_at),
        );

        assert!(private_acceptance_locks(2, 2));
        assert_eq!(decision_count, 1);
        assert_eq!(total_decision_seconds, 2);
    }

    #[test]
    fn non_eligible_private_votes_cannot_propose_or_accept() {
        assert!(!private_vote_is_eligible(
            AnswerState::Conditional,
            Some(399),
            Some(400)
        ));
        assert!(!private_vote_is_eligible(AnswerState::Out, None, Some(0)));
        assert!(private_vote_is_eligible(
            AnswerState::Conditional,
            Some(400),
            Some(400)
        ));
    }

    #[test]
    fn accepting_member_leave_reopens_a_locked_private_room() {
        assert!(should_reopen_private_room(PrivateRoomStatus::Locked, true));
        assert!(!should_reopen_private_room(
            PrivateRoomStatus::Locked,
            false
        ));
    }

    #[test]
    fn reopening_preserves_private_decision_and_metrics_history() {
        let metrics = RoomMetrics {
            room_id: 7,
            decision_count: 1,
            total_decision_seconds: 2,
            latest_locked_at: Some(Timestamp::from_micros_since_unix_epoch(3_500_000)),
        };

        assert_eq!(metrics.decision_count, 1);
        assert_eq!(metrics.total_decision_seconds, 2);
        assert!(
            reopened_private_room_status(PrivateRoomStatus::Locked, true)
                == PrivateRoomStatus::Open
        );
    }

    #[test]
    fn non_creator_publish_returns_an_explicit_error() {
        let error = require_story_creator(identity(2), identity(1)).unwrap_err();

        assert_eq!(error, "Only the room creator can publish a story");
    }

    #[test]
    fn published_locked_story_contains_only_safe_projection_fields() {
        let locked_at = Timestamp::from_micros_since_unix_epoch(3_500_000);
        let story = shared_story_from_parts(
            "DINNER1".into(),
            "Dinner plan".into(),
            PrivateRoomStatus::Locked,
            vec!["Bowling".into(), "Museum".into()],
            Some("Bowling".into()),
            1,
            locked_at,
            locked_at,
            None,
        );

        assert_eq!(story.id, "DINNER1");
        assert_eq!(story.title, "Dinner plan");
        assert!(matches!(story.status, PrivateRoomStatus::Locked));
        assert_eq!(story.choice_labels, ["Bowling", "Museum"]);
        assert_eq!(story.selected_choice_label.as_deref(), Some("Bowling"));
        assert_eq!(story.decision_count, 1);
        assert_eq!(story.starts_at, None);
        assert_eq!(story.timezone, None);
    }

    #[test]
    fn refreshing_a_published_story_exposes_the_new_lock_without_republishing() {
        let published_at = Timestamp::from_micros_since_unix_epoch(1_000_000);
        let locked_at = Timestamp::from_micros_since_unix_epoch(2_000_000);
        let published = shared_story_from_parts(
            "DINNER1".into(),
            "Dinner plan".into(),
            PrivateRoomStatus::Open,
            vec!["Bowling".into()],
            None,
            0,
            published_at,
            published_at,
            None,
        );

        let refreshed = refreshed_shared_story(
            published,
            shared_story_from_parts(
                "DINNER1".into(),
                "Dinner plan".into(),
                PrivateRoomStatus::Locked,
                vec!["Bowling".into()],
                Some("Bowling".into()),
                1,
                locked_at,
                locked_at,
                None,
            ),
        );

        assert_eq!(refreshed.published_at, published_at);
        assert_eq!(refreshed.updated_at, locked_at);
        assert!(matches!(refreshed.status, PrivateRoomStatus::Locked));
        assert_eq!(refreshed.selected_choice_label.as_deref(), Some("Bowling"));
        assert_eq!(refreshed.decision_count, 1);
    }

    #[test]
    fn refreshing_a_published_story_exposes_reopen_without_erasing_history() {
        let published_at = Timestamp::from_micros_since_unix_epoch(1_000_000);
        let reopened_at = Timestamp::from_micros_since_unix_epoch(3_000_000);
        let refreshed = refreshed_shared_story(
            shared_story_from_parts(
                "DINNER1".into(),
                "Dinner plan".into(),
                PrivateRoomStatus::Locked,
                vec!["Bowling".into()],
                Some("Bowling".into()),
                1,
                published_at,
                published_at,
                None,
            ),
            shared_story_from_parts(
                "DINNER1".into(),
                "Dinner plan".into(),
                PrivateRoomStatus::Open,
                vec!["Bowling".into()],
                None,
                1,
                reopened_at,
                reopened_at,
                None,
            ),
        );

        assert_eq!(refreshed.published_at, published_at);
        assert_eq!(refreshed.updated_at, reopened_at);
        assert!(matches!(refreshed.status, PrivateRoomStatus::Open));
        assert_eq!(refreshed.selected_choice_label, None);
        assert_eq!(refreshed.decision_count, 1);
    }

    #[test]
    fn unpublishing_removes_the_story_row_for_its_room() {
        assert_eq!(
            story_id_to_unpublish("DINNER1", "DINNER1"),
            Some("DINNER1".to_string())
        );
        assert_eq!(story_id_to_unpublish("DINNER1", "OTHER1"), None);
    }
}
