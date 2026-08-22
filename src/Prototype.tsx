import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";
import * as Dialog from "@radix-ui/react-dialog";
import "@fontsource-variable/inter";
import "@fontsource-variable/source-serif-4";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  CalendarPlus,
  Building2,
  ClipboardCheck,
  CircleHelp,
  ChevronDown,
  Clock3,
  FileText,
  FolderKanban,
  GitBranch,
  GripVertical,
  History,
  Home,
  Link2,
  ListChecks,
  Mail,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Network,
  Pencil,
  Play,
  Pause,
  PhoneCall,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Target,
  Tag,
  Users,
  UserRoundPlus,
  XCircle,
} from "lucide-react";
import { BottomSheet, KeyboardInput, KeyboardTextarea, MobileScroll, useKeyboard, useKeyboardInsets, useMobileDevice, useScreenPortal } from "./mobile";

type Theme = "light" | "dark";
type DemoState = "default" | "loading" | "empty" | "stale" | "error";
type Sheet = "capture" | "intervention" | "item" | "defer" | "itemEdit" | "renegotiate" | "voiceReview" | "checkinVoice" | "menu" | "search" | "noteCapture" | "noteDetail" | "noteEdit" | "noteAction" | "noteExport" | "noteShare" | "familySharing" | "familyInvite" | "catchupSettings" | "goalDetail" | "goalCreate" | "topicDetail" | "alignment" | "taskNoteCapture" | "projectDetail" | "projectCreate" | "projectAssignment" | "contacts" | "personDetail" | "peoplePicker" | "askConversations" | null;
type AudioState = "idle" | "recording" | "ready" | "processing" | "created";
type AppView = "home" | "notes" | "goals" | "ask" | "checkin" | "calendar";
type TaskSortMode = "manual" | "time";
type NoteCaptureMode = "choose" | "voice" | "manual";
type GoalVoiceState = "idle" | "recording" | "ready";
type AccountMode = "business" | "individual";
type ShareStep = "recipient" | "review";
type ItemKind = "Commitment" | "Task";
type SourceName = "Calendar" | "Voice Note" | "Call" | "Manual" | "Email" | "WhatsApp" | "Connected source";
type SourceState = "available" | "not-connected" | "preview-only";
type Alignment = { kind: "goal" | "topic"; id: string };
type GoalStatus = "On track" | "Needs attention" | "Off track";
type Goal = { id: string; title: string; outcome: string; horizon: string; parentId?: string; projectId?: string; progress: number; status: GoalStatus; nextAction: string; milestones: string[]; evidence: string; originTopicId?: string };
type Topic = { id: string; title: string; detail: string; source: string; freshness: string; firstSeen: string; activity: string; projectId?: string };
type Project = { id: string; title: string; purpose: string; workspaceGrants?: WorkspaceGrant[] };
type WorkspaceGroup = { id: string; name: string; detail: string; memberIds: string[] };
type WorkspaceGrant = { id: string; recipientType: "person" | "group"; recipientId: string; recipient: string; scope: "Read only"; status: "Active" | "Revoked"; audit: string };
type ProjectTarget = { kind: "goal" | "topic"; id: string };
type PersonSource = "Phone contacts" | "Email-derived people" | "Business directory";
type Person = { id: string; name: string; initials: string; role: string; source: PersonSource; freshness: string; state: "Confirmed" | "Suggested" };
type ContactPermissions = Record<PersonSource, boolean>;
type AskMessage = { id: string; role: "user" | "assistant"; text: string; evidence?: { kind: "project" | "goal" | "topic" | "person" | "task"; id: string; label: string; detail: string }[] };
type AskConversation = { id: string; title: string; pinned?: boolean; lastActivity: string; messages: AskMessage[] };
type AlignmentTarget = { type: "item" | "note" | "action"; id: string; noteId?: string };
type PeopleTarget = { type: "item" | "note" | "action"; id: string; noteId?: string };

type TodayItem = {
  id: string;
  kind: ItemKind;
  title: string;
  window: string;
  effort: string;
  source: SourceName;
  sourceState: SourceState;
  freshness: string;
  confidence: string;
  permission: "Private" | "User confirmed" | "Awaiting confirmation";
  order: number;
  complete?: boolean;
  prioritized?: boolean;
  renegotiated?: boolean;
  alignment: Alignment;
  ownerId?: string;
  peopleIds?: string[];
};

type VoiceDraft = TodayItem & {
  calendarPreview: boolean;
};

type Note = {
  id: string;
  title: string;
  source: "Voice note" | "Manual note";
  capturedAt: string;
  processing: "Draft ready" | "Needs review";
  tags: string[];
  transcript: string;
  summary: string;
  actionItem: string;
  corrected?: boolean;
  actionAdded?: boolean;
  exported?: boolean;
  shared?: boolean;
  shares?: ShareGrant[];
  workspaceGrants?: WorkspaceGrant[];
  observations?: string[];
  actions?: NoteAction[];
  alignment: Alignment;
  peopleIds?: string[];
};

type NoteActionKind = "jira" | "meeting" | "followup";
type NoteAction = { id: string; kind: NoteActionKind; title: string; detail: string; source: string; state: "Draft" | "Ready to review" | "Created"; owner: string; alignment: Alignment; ownerId?: string; peopleIds?: string[] };
type TaskNote = { id: string; taskId: string; title: string; body: string; source: "Voice note" | "Manual note"; capturedAt: string };
type TaskNoteCaptureMode = "choose" | "voice" | "manual";

type FamilyMember = { id: string; name: string; phone: string; status: "Connected" | "Pending" | "Revoked" };
type ShareChannel = "Family" | "Email" | "WhatsApp" | "Teams" | "Slack";
type ShareGrant = { id: string; recipient: string; memberId?: string; channel: ShareChannel; status: "Active" | "Revoked"; audit: string };
type CheckinTiming = { id: string; time: string; enabled: boolean };
type CalendarEvent = { id: string; date: string; time: string; duration: string; title: string; kind: "Task" | "Commitment" | "Meeting"; source: SourceName; itemId?: string };

const calendarReferenceDate = new Date("2026-08-18T12:00:00");

function addCalendarDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function calendarDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calendarDateLabel(date: Date, compact = false) {
  return new Intl.DateTimeFormat("en-IN", compact ? { weekday: "short", day: "numeric" } : { weekday: "long", day: "numeric", month: "long" }).format(date);
}

function calendarMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(date);
}

function startOfCalendarMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildCalendarMonthDays(month: Date) {
  const first = startOfCalendarMonth(month);
  const start = addCalendarDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addCalendarDays(start, index));
}

const deferRecommendations = [
  { value: "Wednesday, 19 Aug · 10:00", label: "Tomorrow · 10:00", detail: "Clear review window · 30 min" },
  { value: "Wednesday, 19 Aug · 14:30", label: "Tomorrow · 14:30", detail: "After founder review · 45 min" },
  { value: "Thursday, 20 Aug · 09:30", label: "Day after tomorrow · 09:30", detail: "First open review window · 30 min" },
  { value: "Thursday, 20 Aug · 16:00", label: "Day after tomorrow · 16:00", detail: "Before the release checkpoint · 30 min" },
];

function formatDeferredDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Choose a later date";
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "short" }).format(date);
}

const initialGoals: Goal[] = [
  { id: "goal-capture-v1", title: "Ship Capture V1", outcome: "A trusted capture-to-action loop for founder workflows.", horizon: "Target · 30 Sep", projectId: "project-capture", progress: 62, status: "On track", nextAction: "Close Android playback and consent copy", milestones: ["21 Aug · Playback verified", "02 Sep · Consent copy approved", "30 Sep · Pilot release"], evidence: "9 aligned items" },
  { id: "goal-pilot-release", title: "Complete the pilot release", outcome: "Run the design-partner pilot with a signed release checklist.", horizon: "Target · 30 Sep", parentId: "goal-capture-v1", projectId: "project-capture", progress: 48, status: "Needs attention", nextAction: "Confirm release-readiness owners", milestones: ["29 Aug · Owners confirmed", "16 Sep · Readiness review", "30 Sep · Pilot release"], evidence: "4 tasks · 2 notes" },
  { id: "goal-contract-freeze", title: "Freeze the enterprise pilot contract", outcome: "Agree the scope, security boundary, and commercial terms for the pilot.", horizon: "Target · 12 Sep", parentId: "goal-pilot-release", projectId: "project-pilot", progress: 35, status: "Needs attention", nextAction: "Resolve data-retention decision", milestones: ["28 Aug · Retention decision", "05 Sep · Security review", "12 Sep · Contract freeze"], evidence: "3 aligned items" },
  { id: "goal-onboarding", title: "Improve onboarding activation", outcome: "Help a new founder reach their first evidence-backed delivery decision.", horizon: "Target · 20 Sep", progress: 55, status: "On track", nextAction: "Review activation friction findings", milestones: ["26 Aug · Research synthesis", "10 Sep · Design changes", "20 Sep · Activation review"], evidence: "5 aligned items" },
];

const initialTopics: Topic[] = [
  { id: "topic-founder-ops", title: "Founder operations", detail: "Updates and follow-through discussed across founder work, before an outcome has been set.", source: "Manual + voice", freshness: "Updated today", firstSeen: "First seen · 18 Aug", activity: "Latest activity · Today", projectId: "project-founder-os" },
  { id: "topic-subscription", title: "Subscription packaging", detail: "Pricing and packaging context awaiting a user-defined outcome.", source: "Design review", freshness: "Updated 3h ago", firstSeen: "First seen · 16 Aug", activity: "Latest activity · Today" },
];

const initialProjects: Project[] = [
  { id: "project-capture", title: "Capture V1", purpose: "Deliver the founder-ready capture-to-action experience.", workspaceGrants: [{ id: "project-grant-engineering", recipientType: "group", recipientId: "group-engineering", recipient: "Engineering", scope: "Read only", status: "Active", audit: "Assigned by workspace owner · desktop administration" }] },
  { id: "project-pilot", title: "Enterprise pilot", purpose: "Prepare the customer, security, and delivery path for the pilot.", workspaceGrants: [{ id: "project-grant-pilot", recipientType: "group", recipientId: "group-pilot", recipient: "Pilot team", scope: "Read only", status: "Active", audit: "Assigned by workspace owner · desktop administration" }] },
  { id: "project-founder-os", title: "Founder operating system", purpose: "Shape the daily operating loop for product, design, and engineering." },
];

const initialWorkspaceGroups: WorkspaceGroup[] = [
  { id: "group-product-design", name: "Product & Design", detail: "Founder product decisions and design review", memberIds: ["person-kavya"] },
  { id: "group-engineering", name: "Engineering", detail: "Capture, mobile, and platform delivery", memberIds: ["person-aarav"] },
  { id: "group-pilot", name: "Pilot team", detail: "Approved enterprise-pilot delivery team", memberIds: ["person-aarav", "person-kavya"] },
];

const initialPeople: Person[] = [
  { id: "person-aarav", name: "Aarav Rao", initials: "AR", role: "Engineering lead", source: "Business directory", freshness: "Updated today", state: "Confirmed" },
  { id: "person-kavya", name: "Kavya Nair", initials: "KN", role: "Product lead", source: "Business directory", freshness: "Updated today", state: "Confirmed" },
  { id: "person-mira", name: "Mira Shah", initials: "MS", role: "Product design", source: "Email-derived people", freshness: "Updated 2h ago", state: "Suggested" },
  { id: "person-arjun", name: "Arjun Mehta", initials: "AM", role: "Pilot customer sponsor", source: "Phone contacts", freshness: "Updated yesterday", state: "Confirmed" },
];

function personForWork(title: string) {
  if (/android|engineering|import/i.test(title)) return initialPeople[0];
  if (/onboarding|design/i.test(title)) return initialPeople[1];
  if (/pilot|contract|retention/i.test(title)) return initialPeople[2];
  return undefined;
}

function defaultPeopleForWork(title: string) {
  const person = personForWork(title);
  return person ? [person.id] : [];
}

const initialAskConversations: AskConversation[] = [
  { id: "ask-capture-v1", title: "Capture V1 delivery", pinned: true, lastActivity: "Today", messages: [{ id: "capture-question", role: "user", text: "What should I focus on before the release review?" }, { id: "capture-answer", role: "assistant", text: "Close Android playback verification, confirm the consent-copy owner, then review the import-retry acceptance criteria.", evidence: [{ kind: "task", id: "android-playback", label: "Verify Capture Lite playback on Android", detail: "Task · today" }, { kind: "goal", id: "goal-capture-v1", label: "Ship Capture V1", detail: "On track · 62%" }] }] },
  { id: "ask-pilot", title: "Enterprise pilot", pinned: true, lastActivity: "Yesterday", messages: [{ id: "pilot-question", role: "user", text: "What is blocking the enterprise pilot?" }, { id: "pilot-answer", role: "assistant", text: "The data-retention decision is the next dependency before the security review and contract freeze.", evidence: [{ kind: "goal", id: "goal-contract-freeze", label: "Freeze the enterprise pilot contract", detail: "Needs attention · target 12 Sep" }] }] },
  { id: "ask-founder", title: "Founder operating loop", lastActivity: "3 days ago", messages: [{ id: "founder-answer", role: "assistant", text: "Your work is grouped around the Capture V1, enterprise pilot, and onboarding outcomes. Ask about any project, person, or next action." }] },
];

const initialTodayItems: TodayItem[] = [
  {
    id: "v1-scope-decision",
    kind: "Commitment",
    title: "Share the V1 scope decision with the team",
    window: "Due today, 17:00",
    effort: "1h 30m",
    source: "Email",
    sourceState: "available",
    freshness: "Updated 2m ago",
    confidence: "82%",
    permission: "Private",
    order: 1,
    prioritized: true,
    alignment: { kind: "goal", id: "goal-pilot-release" },
  },
  {
    id: "android-playback",
    kind: "Task",
    title: "Verify Capture Lite playback on Android",
    window: "10:30",
    effort: "45m",
    source: "Calendar",
    sourceState: "available",
    freshness: "Updated 8m ago",
    confidence: "91%",
    permission: "Private",
    order: 2,
    complete: true,
    alignment: { kind: "goal", id: "goal-capture-v1" },
  },
  {
    id: "onboarding-design-review",
    kind: "Commitment",
    title: "Publish the onboarding flow for design review",
    window: "Due today, 11:30",
    effort: "50m",
    source: "Voice Note",
    sourceState: "available",
    freshness: "Captured today",
    confidence: "89%",
    permission: "User confirmed",
    order: 3,
    alignment: { kind: "goal", id: "goal-onboarding" },
  },
  {
    id: "meeting-notes-handoff",
    kind: "Task",
    title: "Prepare the meeting-notes engineering handoff",
    window: "13:30",
    effort: "40m",
    source: "Manual",
    sourceState: "available",
    freshness: "Edited 12m ago",
    confidence: "User authored",
    permission: "User confirmed",
    order: 4,
    alignment: { kind: "goal", id: "goal-capture-v1" },
  },
  {
    id: "paywall-critique",
    kind: "Task",
    title: "Review subscription paywall with design",
    window: "15:00",
    effort: "30m",
    source: "Calendar",
    sourceState: "available",
    freshness: "Starts in 3h",
    confidence: "94%",
    permission: "Private",
    order: 5,
    alignment: { kind: "topic", id: "topic-subscription" },
  },
  {
    id: "pilot-feedback-triage",
    kind: "Task",
    title: "Triage pilot feedback from onboarding sessions",
    window: "16:00",
    effort: "45m",
    source: "Voice Note",
    sourceState: "available",
    freshness: "Captured today",
    confidence: "86%",
    permission: "User confirmed",
    order: 6,
    alignment: { kind: "goal", id: "goal-onboarding" },
  },
  {
    id: "release-checklist",
    kind: "Commitment",
    title: "Confirm the pilot release checklist",
    window: "After 17:30",
    effort: "35m",
    source: "Email",
    sourceState: "available",
    freshness: "Updated 24m ago",
    confidence: "88%",
    permission: "Private",
    order: 7,
    alignment: { kind: "goal", id: "goal-pilot-release" },
  },
  {
    id: "founder-update",
    kind: "Task",
    title: "Record the founder update for tomorrow’s stand-up",
    window: "18:00",
    effort: "15m",
    source: "Manual",
    sourceState: "available",
    freshness: "Added today",
    confidence: "User authored",
    permission: "User confirmed",
    order: 8,
    alignment: { kind: "topic", id: "topic-founder-ops" },
  },
  {
    id: "security-decision",
    kind: "Commitment",
    title: "Close the data-retention decision for the pilot",
    window: "Tomorrow, 10:00",
    effort: "30m",
    source: "Voice Note",
    sourceState: "available",
    freshness: "Captured yesterday",
    confidence: "79%",
    permission: "User confirmed",
    order: 9,
    alignment: { kind: "goal", id: "goal-contract-freeze" },
  },
];

const initialNotes: Note[] = [
  {
    id: "note-v1-scope",
    title: "V1 scope and release trade-offs",
    source: "Voice note",
    capturedAt: "Today · 09:42",
    processing: "Draft ready",
    tags: ["V1", "Release", "Founder update"],
    transcript: "We can hold the pilot date if the Android playback fix and the consent copy land this week. The product walkthrough should stay focused on capture, evidence, and user approval. Design needs the final empty-state copy before Thursday, and engineering needs one owner for the import retry path.",
    summary: "Keep the pilot scope to deliberate capture, evidence-backed notes, and approval-gated actions. Resolve Android playback, consent copy, and the import retry owner before Thursday.",
    actionItem: "Publish the V1 scope decision and assign the remaining release owners",
    observations: ["Android playback and consent copy are the two launch-critical gaps.", "The product walkthrough should prove capture → evidence → approval, not every future integration.", "The import retry path needs a named engineering owner before the release checklist is final."],
    actions: [
      { id: "jira-import-retry", kind: "jira", title: "Create Jira task: own the import retry path", detail: "Platform · release blocker", source: "Founder update", state: "Draft", owner: "Mobile engineering", alignment: { kind: "goal", id: "goal-capture-v1" } },
      { id: "meeting-release-review", kind: "meeting", title: "Schedule V1 release readiness review", detail: "30 min · Thursday 16:00", source: "Delivery window", state: "Draft", owner: "Product, design & engineering", alignment: { kind: "goal", id: "goal-pilot-release" } },
      { id: "followup-consent-copy", kind: "followup", title: "Assign consent-copy sign-off", detail: "Review capture permission language", source: "Launch requirement", state: "Draft", owner: "Design", alignment: { kind: "goal", id: "goal-capture-v1" } },
    ],
    alignment: { kind: "goal", id: "goal-capture-v1" },
  },
  {
    id: "note-design-critique",
    title: "Design critique — commitment detail",
    source: "Manual note",
    capturedAt: "Yesterday · 18:10",
    processing: "Needs review",
    tags: ["Design", "Commitments", "Mobile"],
    transcript: "The commitment detail needs one clear hierarchy: promise, capacity risk, then next action. Evidence should be available without competing with the decision. Keep intervention choices short and show what will change before approval.",
    summary: "Simplify the commitment detail around one decision, with evidence on demand and explicit approval before an intervention changes the plan.",
    actionItem: "Update the commitment-detail acceptance criteria for the next design review",
    observations: ["The primary question is whether realistic capacity exists, not whether the calendar has space.", "Evidence belongs one level below the recommendation.", "Interventions need a visible before-and-after effect."],
    actions: [
      { id: "jira-commitment-detail", kind: "jira", title: "Create Jira task: refine commitment-detail hierarchy", detail: "Mobile · decision surface", source: "Design critique", state: "Ready to review", owner: "Product design", alignment: { kind: "goal", id: "goal-onboarding" } },
      { id: "meeting-design-review", kind: "meeting", title: "Schedule commitment-detail review", detail: "25 min · Wednesday 12:00", source: "Design review", state: "Draft", owner: "Founder & design", alignment: { kind: "goal", id: "goal-onboarding" } },
    ],
    alignment: { kind: "goal", id: "goal-onboarding" },
  },
  {
    id: "note-engineering-standup",
    title: "Engineering stand-up — capture pipeline",
    source: "Voice note",
    capturedAt: "Today · 08:55",
    processing: "Draft ready",
    tags: ["Engineering", "Capture", "Reliability"],
    transcript: "The capture flow is stable through local stop and review. The import queue needs a retry state that does not duplicate a note, and the team agreed to keep source provenance visible in the generated action. We can validate the device handoff next week after the Android playback fix closes.",
    summary: "The capture flow is ready for review; prioritise idempotent import retries and source provenance before validating the device handoff.",
    actionItem: "Create the import retry acceptance criteria and add it to the engineering plan",
    observations: ["Local stop and review are stable in the current flow.", "Retries must not create duplicate notes or actions.", "Every extracted action needs its source visible at review time."],
    actions: [
      { id: "jira-idempotency", kind: "jira", title: "Create Jira task: make import retries idempotent", detail: "Platform · reliability", source: "Engineering stand-up", state: "Draft", owner: "Platform engineering", alignment: { kind: "goal", id: "goal-capture-v1" } },
      { id: "followup-provenance", kind: "followup", title: "Assign provenance acceptance check", detail: "Verify source visibility in action review", source: "Engineering decision", state: "Draft", owner: "QA", alignment: { kind: "goal", id: "goal-capture-v1" } },
    ],
    alignment: { kind: "goal", id: "goal-capture-v1" },
  },
  {
    id: "note-customer-discovery",
    title: "Customer discovery — onboarding friction",
    source: "Manual note",
    capturedAt: "Monday · 16:20",
    processing: "Needs review",
    tags: ["Customer research", "Onboarding", "Activation"],
    transcript: "Founders want to understand what they promised without rebuilding their system in a new task manager. The first value moment is a calm warning with evidence, followed by a small set of realistic recovery choices. They asked for a clear way to correct the assistant when it is wrong.",
    summary: "The activation moment is an evidence-backed delivery warning with correctable recovery options, not an all-purpose workspace.",
    actionItem: "Add correction-path language to the onboarding walkthrough",
    observations: ["Users do not want another generic task list.", "Trust rises when the source and correction path are visible.", "Recovery choices should be small, feasible, and explicit about consequences."],
    actions: [
      { id: "jira-onboarding-correction", kind: "jira", title: "Create Jira task: add correction path to onboarding", detail: "Product · activation", source: "Customer discovery", state: "Draft", owner: "Product", alignment: { kind: "goal", id: "goal-onboarding" } },
      { id: "meeting-research-synthesis", kind: "meeting", title: "Schedule research synthesis", detail: "45 min · Friday 14:00", source: "Research cadence", state: "Draft", owner: "Founder & product", alignment: { kind: "goal", id: "goal-onboarding" } },
    ],
    alignment: { kind: "goal", id: "goal-onboarding" },
  },
];

const initialFamily: FamilyMember[] = [
  { id: "family-mira", name: "Mira", phone: "+91 98••• 1142", status: "Connected" },
  { id: "family-arjun", name: "Arjun", phone: "+91 99••• 7834", status: "Pending" },
];

const initialCheckinTimings: CheckinTiming[] = [
  { id: "morning", time: "08:30", enabled: true },
  { id: "afternoon", time: "14:00", enabled: true },
  { id: "evening", time: "18:30", enabled: true },
];

const initialCalendarEvents: CalendarEvent[] = [
  { id: "calendar-android", date: "2026-08-18", time: "10:30", duration: "45 min", title: "Verify Capture Lite playback on Android", kind: "Task", source: "Calendar", itemId: "android-playback" },
  { id: "calendar-onboarding", date: "2026-08-18", time: "11:30", duration: "50 min", title: "Publish the onboarding flow for design review", kind: "Commitment", source: "Voice Note", itemId: "onboarding-design-review" },
  { id: "calendar-handoff", date: "2026-08-18", time: "13:30", duration: "40 min", title: "Prepare the meeting-notes engineering handoff", kind: "Task", source: "Manual", itemId: "meeting-notes-handoff" },
  { id: "calendar-paywall", date: "2026-08-18", time: "15:00", duration: "30 min", title: "Review subscription paywall with design", kind: "Task", source: "Calendar", itemId: "paywall-critique" },
  { id: "calendar-scope", date: "2026-08-18", time: "17:00", duration: "30 min", title: "Share the V1 scope decision with the team", kind: "Commitment", source: "Email", itemId: "v1-scope-decision" },
  { id: "calendar-standup", date: "2026-08-19", time: "09:30", duration: "30 min", title: "Founder engineering stand-up", kind: "Meeting", source: "Calendar" },
  { id: "calendar-security", date: "2026-08-19", time: "10:00", duration: "30 min", title: "Close the data-retention decision for the pilot", kind: "Commitment", source: "Voice Note", itemId: "security-decision" },
  { id: "calendar-contract", date: "2026-08-20", time: "16:00", duration: "30 min", title: "Enterprise pilot contract review", kind: "Meeting", source: "Calendar" },
  { id: "calendar-research", date: "2026-08-21", time: "14:00", duration: "45 min", title: "Onboarding research synthesis", kind: "Meeting", source: "Calendar" },
];

const demoStates: DemoState[] = ["default", "loading", "empty", "stale", "error"];

function readTheme(): Theme {
  return new URLSearchParams(window.location.search).get("theme") === "dark" ? "dark" : "light";
}

function readDemoState(): DemoState {
  const value = new URLSearchParams(window.location.search).get("state") as DemoState | null;
  return value && demoStates.includes(value) ? value : "default";
}

function sourceDescription(source: SourceName, state: SourceState) {
  if (state === "not-connected") return `${source} not connected`;
  if (state === "preview-only") return `${source} connection required`;
  return `${source} source`;
}

function sourceIcon(source: SourceName) {
  if (source === "Calendar") return CalendarDays;
  if (source === "Voice Note") return Mic;
  if (source === "Call") return PhoneCall;
  if (source === "Email") return Mail;
  if (source === "WhatsApp") return MessageCircle;
  if (source === "Connected source") return Network;
  return FileText;
}

export default function Prototype() {
  const { setDeviceId } = useMobileDevice();
  const keyboard = useKeyboard();
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [demoState, setDemoState] = useState<DemoState>(readDemoState);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [accountMode, setAccountMode] = useState<AccountMode>("business");
  const [tenantMenuOpen, setTenantMenuOpen] = useState(false);
  const [view, setView] = useState<AppView>("home");
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState<TodayItem[]>(initialTodayItems);
  const [selectedItemId, setSelectedItemId] = useState<string>(initialTodayItems[0].id);
  const [manualTitle, setManualTitle] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editWindow, setEditWindow] = useState("");
  const [editEffort, setEditEffort] = useState("");
  const [deferSlot, setDeferSlot] = useState(deferRecommendations[0].value);
  const [deferLater, setDeferLater] = useState(false);
  const [deferLaterDate, setDeferLaterDate] = useState("2026-08-21");
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const [audioSeconds, setAudioSeconds] = useState(0);
  const [voiceDrafts, setVoiceDrafts] = useState<VoiceDraft[]>([]);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [selectedNoteId, setSelectedNoteId] = useState(initialNotes[0].id);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [selectedNoteActionId, setSelectedNoteActionId] = useState("");
  const [noteCaptureMode, setNoteCaptureMode] = useState<NoteCaptureMode>("choose");
  const [shareRecipient, setShareRecipient] = useState("");
  const [shareRecipientConfirmed, setShareRecipientConfirmed] = useState(false);
  const [shareApproved, setShareApproved] = useState(false);
  const [shareChannel, setShareChannel] = useState<ShareChannel>("Family");
  const [shareFamilyId, setShareFamilyId] = useState(initialFamily[0].id);
  const [shareStep, setShareStep] = useState<ShareStep>("recipient");
  const [workspaceRecipientType, setWorkspaceRecipientType] = useState<"person" | "group">("person");
  const [workspaceRecipientId, setWorkspaceRecipientId] = useState("person-aarav");
  const [family, setFamily] = useState<FamilyMember[]>(initialFamily);
  const [familyTab, setFamilyTab] = useState<"family" | "shared">("family");
  const [invitePhone, setInvitePhone] = useState("");
  const [checkinTimings, setCheckinTimings] = useState<CheckinTiming[]>(initialCheckinTimings);
  const [activeCheckinTime, setActiveCheckinTime] = useState("14:00");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(calendarDateKey(calendarReferenceDate));
  const [calendarWeekOffset, setCalendarWeekOffset] = useState(0);
  const [calendarMonth, setCalendarMonth] = useState(startOfCalendarMonth(calendarReferenceDate));
  const [taskSortMode, setTaskSortMode] = useState<TaskSortMode>("manual");
  const [hideCompletedTasks, setHideCompletedTasks] = useState(false);
  const [taskNotes, setTaskNotes] = useState<TaskNote[]>([]);
  const [taskNoteMode, setTaskNoteMode] = useState<TaskNoteCaptureMode>("choose");
  const [taskNoteTitle, setTaskNoteTitle] = useState("");
  const [taskNoteBody, setTaskNoteBody] = useState("");
  const [taskNoteRecording, setTaskNoteRecording] = useState(false);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [goalsTab, setGoalsTab] = useState<"goals" | "topics" | "projects">("goals");
  const [selectedGoalId, setSelectedGoalId] = useState(initialGoals[0].id);
  const [selectedTopicId, setSelectedTopicId] = useState(initialTopics[0].id);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjects[0].id);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectPurpose, setProjectPurpose] = useState("");
  const [projectTarget, setProjectTarget] = useState<ProjectTarget | null>(null);
  const [goalProjectId, setGoalProjectId] = useState("");
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [selectedPersonId, setSelectedPersonId] = useState(initialPeople[0].id);
  const [contactPermissions, setContactPermissions] = useState<ContactPermissions>({ "Phone contacts": false, "Email-derived people": false, "Business directory": true });
  const [askInput, setAskInput] = useState("");
  const [askConversations, setAskConversations] = useState<AskConversation[]>(initialAskConversations);
  const [activeAskConversationId, setActiveAskConversationId] = useState(initialAskConversations[0].id);
  const [peopleTarget, setPeopleTarget] = useState<PeopleTarget | null>(null);
  const [peopleDraftIds, setPeopleDraftIds] = useState<string[]>([]);
  const [ownerDraftId, setOwnerDraftId] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalOutcome, setGoalOutcome] = useState("");
  const [goalHorizon, setGoalHorizon] = useState("");
  const [goalVoiceState, setGoalVoiceState] = useState<GoalVoiceState>("idle");
  const [goalParentId, setGoalParentId] = useState("");
  const [topicToConvertId, setTopicToConvertId] = useState("");
  const [alignmentTarget, setAlignmentTarget] = useState<AlignmentTarget | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const noteTitleRef = useRef<HTMLInputElement>(null);
  const dragTaskRef = useRef<string | null>(null);
  const dragOverTaskRef = useRef<string | null>(null);
  const capturePressTimerRef = useRef<number | null>(null);
  const captureHeldRef = useRef(false);
  const ignoreCaptureClickRef = useRef(false);

  const orderedItems = useMemo(
    () => [...items].sort((a, b) => a.order - b.order),
    [items],
  );
  const scheduledTimeForItem = (item: TodayItem) => initialCalendarEvents.find((event) => event.itemId === item.id)?.time ?? "99:99";
  const sortItemsForDisplay = (candidates: TodayItem[]) => [...candidates].sort((a, b) => {
    if (taskSortMode === "time") return scheduledTimeForItem(a).localeCompare(scheduledTimeForItem(b)) || a.order - b.order;
    return a.order - b.order;
  });
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? orderedItems[0];
  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? notes[0];
  const selectedNoteAction = selectedNote?.actions?.find((action) => action.id === selectedNoteActionId);
  const openItems = items.filter((item) => !item.complete).length;
  const commitmentCount = items.filter((item) => item.kind === "Commitment").length;
  const checkinTasks = orderedItems.filter((item) => item.kind === "Task");
  const calendarWeek = useMemo(() => Array.from({ length: 7 }, (_, index) => addCalendarDays(addCalendarDays(calendarReferenceDate, -2), calendarWeekOffset * 7 + index)), [calendarWeekOffset]);
  const selectedCalendarEvents = initialCalendarEvents.filter((event) => event.date === selectedCalendarDate).sort((a, b) => a.time.localeCompare(b.time));
  const selectedDayItemIds = new Set(selectedCalendarEvents.flatMap((event) => event.itemId ? [event.itemId] : []));
  const selectedDayItems = sortItemsForDisplay(selectedCalendarDate === calendarDateKey(calendarReferenceDate) ? orderedItems : orderedItems.filter((item) => selectedDayItemIds.has(item.id)));
  const selectedCalendarTasks = sortItemsForDisplay(orderedItems.filter((item) => selectedDayItemIds.has(item.id) && item.kind === "Task"));
  const selectedCalendarSchedule = selectedCalendarEvents.filter((event) => event.kind !== "Task");
  const visibleSelectedDayItems = selectedDayItems.filter((item) => !hideCompletedTasks || item.kind !== "Task" || !item.complete);
  const visibleSelectedCalendarTasks = selectedCalendarTasks.filter((item) => !hideCompletedTasks || !item.complete);
  const selectedTaskNotes = taskNotes.filter((note) => note.taskId === selectedItem?.id);
  const selectedCalendarDay = new Date(`${selectedCalendarDate}T12:00:00`);
  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) ?? goals[0];
  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) ?? topics[0];
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const selectedPerson = people.find((person) => person.id === selectedPersonId) ?? people[0];
  const activeAskConversation = askConversations.find((conversation) => conversation.id === activeAskConversationId) ?? askConversations[0];
  const askMessages = activeAskConversation?.messages ?? [];
  const availablePeople = people.filter((person) => accountMode === "business" ? person.source === "Business directory" : contactPermissions[person.source]);
  const goalName = (alignment: Alignment) => alignment.kind === "goal" ? goals.find((goal) => goal.id === alignment.id)?.title ?? "Goal" : topics.find((topic) => topic.id === alignment.id)?.title ?? "Topic";

  useEffect(() => {
    setDeviceId("pixel-10");
  }, [setDeviceId]);

  useEffect(() => {
    document.documentElement.dataset.fcTheme = theme;
    if (Capacitor.isNativePlatform()) {
      void SystemBars.setStyle({ style: theme === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light });
    }
    return () => {
      delete document.documentElement.dataset.fcTheme;
    };
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("theme", theme);
    params.set("state", demoState);
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [demoState, theme]);

  useEffect(() => {
    if (audioState !== "recording") return undefined;

    const timer = window.setInterval(() => {
      setAudioSeconds((seconds) => Math.min(seconds + 1, 99));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [audioState]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  const openGoal = (goalId: string) => {
    setSelectedGoalId(goalId);
    setSheet("goalDetail");
  };

  const openTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    setSheet("topicDetail");
  };

  const openProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSheet("projectDetail");
  };

  const openProjectCreate = () => {
    setProjectTitle("");
    setProjectPurpose("");
    setSheet("projectCreate");
  };

  const createProject = () => {
    if (!projectTitle.trim() || !projectPurpose.trim()) {
      showNotice("Add a project name and purpose.");
      return;
    }
    const project = { id: `project-${Date.now()}`, title: projectTitle.trim(), purpose: projectPurpose.trim() };
    setProjects((current) => [...current, project]);
    setSelectedProjectId(project.id);
    setGoalsTab("projects");
    setSheet("projectDetail");
    showNotice("Project created.");
  };

  const openProjectAssignment = (target: ProjectTarget) => {
    setProjectTarget(target);
    setSheet("projectAssignment");
  };

  const assignProject = (projectId?: string) => {
    if (!projectTarget) return;
    if (projectTarget.kind === "goal") setGoals((current) => current.map((goal) => goal.id === projectTarget.id ? { ...goal, projectId } : goal));
    else setTopics((current) => current.map((topic) => topic.id === projectTarget.id ? { ...topic, projectId } : topic));
    setSheet(projectTarget.kind === "goal" ? "goalDetail" : "topicDetail");
    showNotice(projectId ? "Project saved." : "Project removed.");
  };

  const openPerson = (personId: string) => {
    setSelectedPersonId(personId);
    setSheet("personDetail");
  };

  const toggleContactPermission = (source: PersonSource) => {
    if (accountMode === "business" && source !== "Business directory") return;
    setContactPermissions((current) => ({ ...current, [source]: !current[source] }));
    showNotice(contactPermissions[source] ? `${source} access removed.` : `${source} access enabled.`);
  };

  const confirmPerson = (personId: string) => {
    setPeople((current) => current.map((person) => person.id === personId ? { ...person, state: "Confirmed" } : person));
    showNotice("Person link confirmed.");
  };

  const peopleForItem = (item: TodayItem) => item.peopleIds ?? defaultPeopleForWork(item.title);
  const peopleForNote = (note: Note) => note.peopleIds ?? defaultPeopleForWork(note.title);
  const personName = (personId?: string) => people.find((person) => person.id === personId)?.name ?? "Unassigned";

  const openPeoplePicker = (target: PeopleTarget) => {
    setPeopleTarget(target);
    if (target.type === "item") {
      const item = items.find((candidate) => candidate.id === target.id);
      setOwnerDraftId(item?.ownerId ?? "");
      setPeopleDraftIds(item ? peopleForItem(item) : []);
    } else if (target.type === "note") {
      const note = notes.find((candidate) => candidate.id === target.id);
      setOwnerDraftId("");
      setPeopleDraftIds(note ? peopleForNote(note) : []);
    } else {
      const action = notes.find((note) => note.id === target.noteId)?.actions?.find((candidate) => candidate.id === target.id);
      setOwnerDraftId(action?.ownerId ?? "");
      setPeopleDraftIds(action?.peopleIds ?? []);
    }
    setSheet("peoplePicker");
  };

  const toggleDraftPerson = (personId: string) => setPeopleDraftIds((current) => current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId]);

  const savePeople = () => {
    if (!peopleTarget) return;
    const confirmedIds = peopleDraftIds.filter((id) => availablePeople.some((person) => person.id === id));
    const ownerId = ownerDraftId && availablePeople.some((person) => person.id === ownerDraftId) ? ownerDraftId : undefined;
    setPeople((current) => current.map((person) => confirmedIds.includes(person.id) || person.id === ownerId ? { ...person, state: "Confirmed" } : person));
    if (peopleTarget.type === "item") setItems((current) => current.map((item) => item.id === peopleTarget.id ? { ...item, ownerId, peopleIds: confirmedIds } : item));
    if (peopleTarget.type === "note") setNotes((current) => current.map((note) => note.id === peopleTarget.id ? { ...note, peopleIds: confirmedIds } : note));
    if (peopleTarget.type === "action" && peopleTarget.noteId) setNotes((current) => current.map((note) => note.id === peopleTarget.noteId ? { ...note, actions: note.actions?.map((action) => action.id === peopleTarget.id ? { ...action, ownerId, peopleIds: confirmedIds, owner: personName(ownerId) } : action) } : note));
    setSheet(peopleTarget.type === "item" ? "item" : peopleTarget.type === "note" ? "noteDetail" : "noteAction");
    showNotice("People association saved.");
  };

  const createAskConversation = () => {
    const conversation = { id: `ask-${Date.now()}`, title: "New workspace chat", lastActivity: "Just now", messages: [] };
    setAskConversations((current) => [conversation, ...current]);
    setActiveAskConversationId(conversation.id);
    setAskInput("");
    setSheet(null);
  };

  const toggleAskPin = (conversationId: string) => setAskConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, pinned: !conversation.pinned } : conversation));

  const sendAsk = (question = askInput) => {
    const text = question.trim();
    if (!text) return;
    const lower = text.toLowerCase();
    const project = lower.includes("pilot") ? initialProjects[1] : initialProjects[0];
    const answer = lower.includes("who") || lower.includes("people")
      ? { text: "Aarav Rao is the confirmed engineering lead on the Capture V1 work. Mira’s product-design involvement is ready for your confirmation.", evidence: [{ kind: "person" as const, id: "person-aarav", label: "Aarav Rao", detail: "Engineering lead · confirmed" }, { kind: "person" as const, id: "person-mira", label: "Mira Shah", detail: "Product design · suggested" }] }
      : lower.includes("risk")
        ? { text: "The enterprise pilot contract needs attention: its next action is resolving the data-retention decision before the security review.", evidence: [{ kind: "goal" as const, id: "goal-contract-freeze", label: "Freeze the enterprise pilot contract", detail: "Needs attention · target 12 Sep" }] }
        : { text: `${project.title} is organised around its assigned outcomes. The next delivery signal is to close Android playback and consent copy before the pilot release.`, evidence: [{ kind: "project" as const, id: project.id, label: project.title, detail: project.purpose }, { kind: "goal" as const, id: "goal-capture-v1", label: "Ship Capture V1", detail: "On track · 62%" }] };
    setAskConversations((current) => current.map((conversation) => conversation.id === activeAskConversationId ? { ...conversation, title: conversation.messages.length ? conversation.title : text.slice(0, 36), lastActivity: "Just now", messages: [...conversation.messages, { id: `ask-user-${Date.now()}`, role: "user", text }, { id: `ask-answer-${Date.now()}`, role: "assistant", ...answer }] } : conversation));
    setAskInput("");
  };

  const openGoalCreate = (parentId = "", topicId = "") => {
    const topic = topics.find((candidate) => candidate.id === topicId);
    setGoalTitle(topic?.title ?? "");
    setGoalOutcome(topic ? `Turn ${topic.title} into a clear outcome.` : "");
    setGoalHorizon("");
    setGoalVoiceState("idle");
    setGoalParentId(parentId);
    setGoalProjectId(topic?.projectId ?? "");
    setTopicToConvertId(topicId);
    setSheet("goalCreate");
  };

  const createGoal = () => {
    if (!goalTitle.trim() || !goalOutcome.trim()) {
      showNotice("Add a goal title and outcome.");
      return;
    }
    const id = `goal-${Date.now()}`;
    const goal: Goal = { id, title: goalTitle.trim(), outcome: goalOutcome.trim(), horizon: formatGoalTarget(goalHorizon), parentId: goalParentId || undefined, projectId: goalProjectId || undefined, progress: 0, status: "On track", nextAction: "Add the first aligned item", milestones: ["First delivery check · Not scheduled"], evidence: topicToConvertId ? "Converted from topic" : "User defined", originTopicId: topicToConvertId || undefined };
    setGoals((current) => [...current, goal]);
    if (topicToConvertId) {
      setItems((current) => current.map((item) => item.alignment.kind === "topic" && item.alignment.id === topicToConvertId ? { ...item, alignment: { kind: "goal", id } } : item));
      setNotes((current) => current.map((note) => ({ ...note, alignment: note.alignment.kind === "topic" && note.alignment.id === topicToConvertId ? { kind: "goal", id } : note.alignment, actions: note.actions?.map((action) => action.alignment.kind === "topic" && action.alignment.id === topicToConvertId ? { ...action, alignment: { kind: "goal", id } } : action) })));
    }
    if (alignmentTarget && !topicToConvertId) {
      if (alignmentTarget.type === "item") setItems((current) => current.map((item) => item.id === alignmentTarget.id ? { ...item, alignment: { kind: "goal", id } } : item));
      if (alignmentTarget.type === "note") setNotes((current) => current.map((note) => note.id === alignmentTarget.id ? { ...note, alignment: { kind: "goal", id } } : note));
      if (alignmentTarget.type === "action" && alignmentTarget.noteId) setNotes((current) => current.map((note) => note.id === alignmentTarget.noteId ? { ...note, actions: note.actions?.map((action) => action.id === alignmentTarget.id ? { ...action, alignment: { kind: "goal", id } } : action) } : note));
      setAlignmentTarget(null);
    }
    setSelectedGoalId(id);
    setGoalsTab("goals");
    setSheet("goalDetail");
    showNotice(topicToConvertId ? "Topic converted to a goal." : "Goal created.");
  };

  const openAlignment = (target: AlignmentTarget) => {
    setAlignmentTarget(target);
    setSheet("alignment");
  };

  const applyAlignment = (alignment: Alignment) => {
    if (!alignmentTarget) return;
    if (alignmentTarget.type === "item") setItems((current) => current.map((item) => item.id === alignmentTarget.id ? { ...item, alignment } : item));
    if (alignmentTarget.type === "note") setNotes((current) => current.map((note) => note.id === alignmentTarget.id ? { ...note, alignment } : note));
    if (alignmentTarget.type === "action" && alignmentTarget.noteId) setNotes((current) => current.map((note) => note.id === alignmentTarget.noteId ? { ...note, actions: note.actions?.map((action) => action.id === alignmentTarget.id ? { ...action, alignment } : action) } : note));
    setSheet(null);
    showNotice("Alignment saved.");
  };

  const openItemSheet = (itemId: string) => {
    keyboard.hide();
    setSelectedItemId(itemId);
    setSheet("item");
  };

  const openTaskNoteCapture = () => {
    keyboard.hide();
    setTaskNoteMode("choose");
    setTaskNoteTitle("");
    setTaskNoteBody("");
    setTaskNoteRecording(false);
    setSheet("taskNoteCapture");
  };

  const saveTaskNote = (source: TaskNote["source"], title: string, body: string) => {
    if (!selectedItem) return;
    const cleanTitle = title.trim() || (source === "Voice note" ? "Voice update" : "Task note");
    const cleanBody = body.trim();
    if (!cleanBody) {
      showNotice("Add a short note before saving.");
      return;
    }
    setTaskNotes((current) => [{ id: `task-note-${Date.now()}`, taskId: selectedItem.id, title: cleanTitle, body: cleanBody, source, capturedAt: "Just now" }, ...current]);
    setTaskNoteRecording(false);
    setSheet("item");
    showNotice("Note added to this task.");
  };

  const stopTaskNoteVoice = () => {
    setTaskNoteRecording(false);
    saveTaskNote("Voice note", "Voice update", "Capture playback needs one final verification after the import-retry fix. Keep the release note linked to the Android acceptance criteria.");
  };

  const toggleItemCompleteById = (itemId: string) => {
    updateItem(itemId, (item) => ({ ...item, complete: !item.complete, freshness: item.complete ? item.freshness : "Completed now", confidence: item.complete ? item.confidence : "User confirmed" }));
    const item = items.find((candidate) => candidate.id === itemId);
    showNotice(item?.complete ? "Marked not done for this morning." : "Marked done for this morning.");
  };

  const moveItemById = (itemId: string, direction: "up" | "down") => {
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const visible = orderedItems.filter((candidate) => !candidate.complete);
    const index = visible.findIndex((candidate) => candidate.id === itemId);
    const target = visible[index + (direction === "up" ? -1 : 1)];
    if (!target) {
      showNotice(direction === "up" ? "Already at the top of this morning." : "Already at the end of this morning.");
      return;
    }
    setItems((current) => current.map((candidate) => {
      if (candidate.id === itemId) return { ...candidate, order: target.order, prioritized: direction === "up" };
      if (candidate.id === target.id) return { ...candidate, order: item.order };
      return candidate;
    }));
    showNotice(direction === "up" ? "Moved up in your morning plan." : "Moved down in your morning plan.");
  };

  const openItemEdit = (itemId: string) => {
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    keyboard.hide();
    setSelectedItemId(itemId);
    setEditTitle(item.title);
    setEditWindow(item.window);
    setEditEffort(item.effort);
    setSheet("itemEdit");
  };

  const saveItemEdit = () => {
    if (!selectedItem || !editTitle.trim()) {
      showNotice("Keep a task title so it remains clear.");
      return;
    }
    updateItem(selectedItem.id, (item) => ({ ...item, title: editTitle.trim(), window: editWindow.trim() || item.window, effort: editEffort.trim() || item.effort, freshness: "Edited manually" }));
    keyboard.hide();
    setSheet(null);
    showNotice("Manual change saved to this morning’s plan.");
  };

  const updateItem = (itemId: string, updater: (item: TodayItem, index: number) => TodayItem) => {
    setItems((current) => current.map((item, index) => (item.id === itemId ? updater(item, index) : item)));
  };

  const completeItem = () => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, (item) => ({
      ...item,
      complete: !item.complete,
      freshness: item.complete ? item.freshness : "Completed now",
      confidence: item.complete ? item.confidence : "User confirmed",
    }));
    setSheet(null);
    showNotice(selectedItem.complete ? "Completion was undone." : "Marked complete with user confirmation.");
  };

  const openDefer = () => {
    if (!selectedItem) return;
    keyboard.hide();
    setDeferSlot(deferRecommendations[0].value);
    setDeferLater(false);
    setDeferLaterDate("2026-08-21");
    setSheet("defer");
  };

  const confirmDefer = () => {
    if (!selectedItem) return;
    const scheduledFor = deferLater ? formatDeferredDate(deferLaterDate) : deferSlot;
    if (scheduledFor === "Choose a later date") {
      showNotice("Choose a later date before deferring this task.");
      return;
    }
    updateItem(selectedItem.id, (item) => ({ ...item, window: scheduledFor, prioritized: false }));
    setSheet(null);
    showNotice(`Deferred to ${scheduledFor}. No calendar event was changed.`);
  };

  const approveRenegotiation = () => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, (item) => ({ ...item, renegotiated: true, window: "Renegotiation drafted" }));
    setSheet(null);
    showNotice("Renegotiation saved for confirmation. No message was sent.");
  };

  const createManualTask = () => {
    const title = (manualInputRef.current?.value ?? manualTitle).trim();
    if (!title) {
      showNotice("Add a task title first.");
      return;
    }

    const nextOrder = Math.max(...items.map((item) => item.order)) + 1;
    const nextItem: TodayItem = {
      id: `manual-${Date.now()}`,
      kind: "Task",
      title,
      window: "Today",
      effort: "15m",
      source: "Manual",
      sourceState: "available",
      freshness: "Added now",
      confidence: "User authored",
      permission: "User confirmed",
      order: nextOrder,
      alignment: { kind: "topic", id: "topic-founder-ops" },
    };

    setItems((current) => [...current, nextItem]);
    setManualTitle("");
    if (manualInputRef.current) manualInputRef.current.value = "";
    keyboard.hide();
    setSheet(null);
    showNotice("Manual task added to Today.");
  };

  const startAudioCapture = () => {
    setAudioSeconds(0);
    setAudioState("recording");
    showNotice("Voice capture started.");
  };

  const openNoteCapture = () => {
    setNoteCaptureMode("choose");
    setSheet("noteCapture");
  };

  const beginCenterCapture = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    captureHeldRef.current = false;
    capturePressTimerRef.current = window.setTimeout(() => {
      capturePressTimerRef.current = null;
      captureHeldRef.current = true;
      startAudioCapture();
    }, 350);
  };

  const finishCenterCapture = (event: ReactPointerEvent<HTMLButtonElement>) => {
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Pointer capture may already be released. */ }
    if (capturePressTimerRef.current !== null) {
      window.clearTimeout(capturePressTimerRef.current);
      capturePressTimerRef.current = null;
      ignoreCaptureClickRef.current = true;
      openNoteCapture();
      return;
    }
    if (captureHeldRef.current) {
      captureHeldRef.current = false;
      ignoreCaptureClickRef.current = true;
      stopAudioCapture();
      createVoiceNote();
    }
  };

  const openCenterCaptureFromKeyboard = () => {
    if (ignoreCaptureClickRef.current) {
      ignoreCaptureClickRef.current = false;
      return;
    }
    openNoteCapture();
  };

  const beginGoalVoice = () => setGoalVoiceState("recording");
  const stopGoalVoice = () => setGoalVoiceState("ready");
  const useGoalVoiceDetails = () => {
    setGoalTitle("Ship the founder workspace pilot");
    setGoalOutcome("Give pilot founders a dependable capture-to-review workflow for daily product decisions.");
    setGoalHorizon("2026-10-15T17:00");
    setGoalVoiceState("idle");
    showNotice("Voice details are ready to edit.");
  };

  const stopAudioCapture = () => {
    setAudioState("ready");
    showNotice("Voice note ready for task extraction.");
  };

  const createVoiceTasks = () => {
    setAudioState("processing");
    window.setTimeout(() => {
      const batchId = Date.now();
      const firstOrder = Math.min(...items.map((item) => item.order));
      const drafts: VoiceDraft[] = [
        {
          id: `voice-${batchId}-brief`,
          kind: "Task",
          title: "Create the import-retry acceptance criteria",
          window: "Today, 12:30",
          effort: "25m",
          source: "Voice Note",
          sourceState: "available",
          freshness: "Captured now",
          confidence: "Ready to review",
          permission: "User confirmed",
          order: firstOrder + 0.2,
          prioritized: true,
          calendarPreview: true,
          alignment: { kind: "goal", id: "goal-capture-v1" },
        },
        {
          id: `voice-${batchId}-calendar`,
          kind: "Task",
          title: "Protect focus time for the V1 scope decision",
          window: "Today, 14:30",
          effort: "1h",
          source: "Voice Note",
          sourceState: "available",
          freshness: "Captured now",
          confidence: "Ready to review",
          permission: "User confirmed",
          order: firstOrder + 0.4,
          calendarPreview: true,
          alignment: { kind: "goal", id: "goal-pilot-release" },
        },
        {
          id: `voice-${batchId}-followup`,
          kind: "Commitment",
          title: "Confirm the owner for consent-copy sign-off",
          window: "Tomorrow morning",
          effort: "20m",
          source: "Voice Note",
          sourceState: "available",
          freshness: "Captured now",
          confidence: "Needs confirmation",
          permission: "Awaiting confirmation",
          order: firstOrder + 0.6,
          calendarPreview: false,
          alignment: { kind: "goal", id: "goal-capture-v1" },
        },
      ];

      setVoiceDrafts(drafts);
      setAudioState("ready");
      setSheet("voiceReview");
      showNotice("Review extracted tasks before saving.");
    }, 850);
  };

  const resetAudioCapture = () => {
    setAudioSeconds(0);
    setAudioState("idle");
    setVoiceDrafts([]);
    setSheet(null);
  };

  const openNote = (noteId: string) => {
    keyboard.hide();
    setSelectedNoteId(noteId);
    setAudioPlaying(false);
    setSheet("noteDetail");
  };

  const createManualNote = () => {
    const title = (noteTitleRef.current?.value ?? noteTitle).trim();
    const body = noteBody.trim();
    if (!title || !body) {
      showNotice("Add a title and note context first.");
      return;
    }
    const note: Note = {
      id: `manual-note-${Date.now()}`,
      title,
      source: "Manual note",
      capturedAt: "Just now",
      processing: "Needs review",
      tags: ["Unfiled"],
      transcript: `Manual source — ${body}`,
      summary: "Draft summary is ready for your review.",
      actionItem: "Review this manual note and decide what belongs in Today",
      alignment: { kind: "topic", id: "topic-founder-ops" },
    };
    setNotes((current) => [note, ...current]);
    setSelectedNoteId(note.id);
    setNoteTitle("");
    setNoteBody("");
    keyboard.hide();
    setSheet("noteDetail");
    showNotice("Note ready for review.");
  };

  const createVoiceNote = () => {
    setAudioState("processing");
    window.setTimeout(() => {
      const note: Note = {
        id: `voice-note-${Date.now()}`,
        title: "Untitled voice note",
        source: "Voice note",
        capturedAt: "Just now",
        processing: "Draft ready",
        tags: ["Voice capture"],
        transcript: "Voice note captured with visible controls and ready for your review.",
        summary: "Your voice note is ready to inspect and correct.",
        actionItem: "Review this voice note before adding any action to Today",
        alignment: { kind: "topic", id: "topic-founder-ops" },
      };
      setNotes((current) => [note, ...current]);
      setSelectedNoteId(note.id);
      setAudioState("ready");
      setSheet("noteDetail");
      showNotice("Voice note ready for review.");
    }, 700);
  };

  const updateSelectedNote = (updater: (note: Note) => Note) => {
    if (!selectedNote) return;
    setNotes((current) => current.map((note) => note.id === selectedNote.id ? updater(note) : note));
  };

  const correctNote = (field: "transcript" | "summary" | "actionItem") => {
    updateSelectedNote((note) => ({ ...note, [field]: `${note[field]} (corrected by you)`, corrected: true, processing: "Draft ready" }));
    showNotice(`${field[0].toUpperCase() + field.slice(1)} correction saved.`);
  };

  const openNoteDraft = () => {
    if (!selectedNote) return;
    setNoteDraft(selectedNote.summary);
    setSheet("noteEdit");
  };

  const saveNoteDraft = () => {
    if (!noteDraft.trim()) return;
    updateSelectedNote((note) => ({ ...note, summary: noteDraft.trim(), corrected: true, processing: "Draft ready" }));
    keyboard.hide();
    setSheet("noteDetail");
    showNotice("Brief updated.");
  };

  const openNoteAction = (actionId: string) => {
    setSelectedNoteActionId(actionId);
    setSheet("noteAction");
  };

  const openAlignedNoteAction = (noteId: string, actionId: string) => {
    setSelectedNoteId(noteId);
    setSelectedNoteActionId(actionId);
    setSheet("noteAction");
  };

  const advanceNoteAction = () => {
    if (!selectedNoteAction) return;
    updateSelectedNote((note) => ({ ...note, actions: note.actions?.map((action) => action.id === selectedNoteAction.id ? { ...action, state: action.state === "Draft" ? "Ready to review" : "Created" } : action) }));
    setSheet("noteDetail");
    showNotice(selectedNoteAction.state === "Draft" ? "Action ready to review." : "Action created.");
  };

  const addNoteActionToToday = () => {
    if (!selectedNote || selectedNote.actionAdded) return;
    const nextOrder = Math.max(...items.map((item) => item.order)) + 1;
    setItems((current) => [...current, {
      id: `note-action-${selectedNote.id}`,
      kind: "Task",
      title: selectedNote.actionItem,
      window: "Today",
      effort: "20m",
      source: selectedNote.source === "Voice note" ? "Voice Note" : "Manual",
      sourceState: "preview-only",
      freshness: "From reviewed note",
      confidence: "User confirmed",
      permission: "User confirmed",
      order: nextOrder,
      alignment: selectedNote.alignment,
      peopleIds: peopleForNote(selectedNote),
    }]);
    updateSelectedNote((note) => ({ ...note, actionAdded: true }));
    showNotice("Reviewed action added to Today. No calendar was changed.");
  };

  const addTag = () => {
    updateSelectedNote((note) => note.tags.includes("Follow-up") ? note : { ...note, tags: [...note.tags, "Follow-up"] });
    showNotice("Tag added.");
  };

  const resetShareApproval = () => {
    setShareRecipientConfirmed(false);
    setShareApproved(false);
    setShareStep("recipient");
  };

  const connectedFamily = family.filter((member) => member.status === "Connected");
  const selectedShareMember = family.find((member) => member.id === shareFamilyId);

  const inviteFamilyMember = () => {
    const phone = invitePhone.trim();
    if (phone.replace(/\D/g, "").length < 10) {
      showNotice("Enter a valid phone number to prepare an invite.");
      return;
    }
    const member: FamilyMember = { id: `family-${Date.now()}`, name: "Family member", phone, status: "Pending" };
    setFamily((current) => [...current, member]);
    setInvitePhone("");
    setSheet("familySharing");
    showNotice("Invite ready for confirmation.");
  };

  const revokeFamilyMember = (member: FamilyMember) => {
    setFamily((current) => current.map((candidate) => candidate.id === member.id ? { ...candidate, status: "Revoked" } : candidate));
    setNotes((current) => current.map((note) => ({ ...note, shares: note.shares?.map((share) => share.memberId === member.id ? { ...share, status: "Revoked" } : share) })));
    showNotice(`${member.name}'s access was revoked.`);
  };

  const revokeNoteShare = (shareId: string) => {
    updateSelectedNote((note) => ({ ...note, shares: note.shares?.map((share) => share.id === shareId ? { ...share, status: "Revoked" } : share) }));
    showNotice("Note access revoked. The link no longer grants access.");
  };

  const confirmShareRecipient = () => {
    const recipient = shareChannel === "Family" ? selectedShareMember?.name : shareRecipient.trim();
    if (!recipient || (shareChannel !== "Family" && !recipient.includes("@") && shareChannel === "Email")) {
      showNotice("Confirm an authorized recipient first.");
      return;
    }
    setShareRecipientConfirmed(true);
    setShareStep("review");
    showNotice("Recipient confirmed for this controlled link.");
  };

  const approveNoteShare = () => {
    if (!selectedNote || !shareRecipientConfirmed) return;
    const recipient = shareChannel === "Family" ? selectedShareMember?.name : shareRecipient.trim();
    if (!recipient) return;
    const share: ShareGrant = { id: `share-${Date.now()}`, recipient, memberId: shareChannel === "Family" ? selectedShareMember?.id : undefined, channel: shareChannel, status: "Active", audit: "Approved by note owner · controlled viewer link" };
    updateSelectedNote((note) => ({ ...note, shared: true, shares: [...(note.shares ?? []), share] }));
    setShareApproved(true);
    setSheet("noteDetail");
    showNotice(`Controlled ${shareChannel} viewer link approved. Ready to share.`);
  };

  const workspaceRecipient = workspaceRecipientType === "person"
    ? people.find((person) => person.id === workspaceRecipientId)
    : initialWorkspaceGroups.find((group) => group.id === workspaceRecipientId);

  const grantWorkspaceNoteAccess = () => {
    if (!selectedNote || !workspaceRecipient) return;
    const grant: WorkspaceGrant = { id: `workspace-note-${Date.now()}`, recipientType: workspaceRecipientType, recipientId: workspaceRecipient.id, recipient: workspaceRecipient.name, scope: "Read only", status: "Active", audit: "Granted by workspace owner · directory access" };
    updateSelectedNote((note) => ({ ...note, workspaceGrants: [...(note.workspaceGrants ?? []), grant] }));
    setSheet("noteDetail");
    showNotice(`${workspaceRecipient.name} now has read-only access.`);
  };

  const revokeWorkspaceNoteAccess = (grantId: string) => {
    updateSelectedNote((note) => ({ ...note, workspaceGrants: note.workspaceGrants?.map((grant) => grant.id === grantId ? { ...grant, status: "Revoked" } : grant) }));
    showNotice("Workspace access revoked.");
  };

  const openCheckin = (value?: string | React.MouseEvent<HTMLButtonElement>) => {
    const time = typeof value === "string" ? value : checkinTimings.filter((timing) => timing.enabled).sort((a, b) => a.time.localeCompare(b.time))[0]?.time ?? "08:30";
    (document.activeElement as HTMLElement | null)?.blur();
    keyboard.hide();
    setSheet(null);
    setActiveCheckinTime(time);
    setView("checkin");
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>(".floydee-scroll")?.scrollTo({ top: 0 }));
    showNotice(`${time} check-in opened.`);
  };

  const updateCheckinTiming = (timingId: string, time: string) => {
    setCheckinTimings((current) => current.map((timing) => timing.id === timingId ? { ...timing, time } : timing));
  };

  const toggleCheckinTiming = (timingId: string) => {
    setCheckinTimings((current) => current.map((timing) => timing.id === timingId ? { ...timing, enabled: !timing.enabled } : timing));
  };

  const addCheckinTiming = () => {
    setCheckinTimings((current) => [...current, { id: `checkin-${Date.now()}`, time: "20:00", enabled: true }]);
  };

  const removeCheckinTiming = (timingId: string) => {
    if (checkinTimings.length === 1) {
      showNotice("Keep one timing so you have a check-in moment.");
      return;
    }
    setCheckinTimings((current) => current.filter((timing) => timing.id !== timingId));
  };

  const selectCalendarDate = (date: string) => {
    const next = new Date(`${date}T12:00:00`);
    if (Number.isNaN(next.getTime())) return;
    setSelectedCalendarDate(date);
    setCalendarMonth(startOfCalendarMonth(next));
    const daysFromReference = Math.round((next.getTime() - calendarReferenceDate.getTime()) / 86_400_000);
    setCalendarWeekOffset(Math.floor((daysFromReference + 2) / 7));
  };

  const beginSharedTaskDrag = (event: ReactPointerEvent<HTMLButtonElement>, taskId: string) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragTaskRef.current = taskId;
    dragOverTaskRef.current = taskId;
    setDraggedTaskId(taskId);
    setDragOverTaskId(taskId);
  };

  const moveSharedTaskDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragTaskRef.current) return;
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-task-id]");
    if (row?.dataset.taskId) {
      dragOverTaskRef.current = row.dataset.taskId;
      setDragOverTaskId(row.dataset.taskId);
    }
  };

  const finishTaskDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const draggedId = dragTaskRef.current;
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-task-id], [data-checkin-task-id]");
    const targetId = row?.dataset.taskId ?? row?.dataset.checkinTaskId ?? dragOverTaskRef.current;
    if (!draggedId || !targetId || draggedId === targetId) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }
    const orderedTaskIds = checkinTasks.map((task) => task.id);
    const from = orderedTaskIds.indexOf(draggedId);
    const to = orderedTaskIds.indexOf(targetId);
    if (from >= 0 && to >= 0) {
      const nextTaskIds = [...orderedTaskIds];
      nextTaskIds.splice(from, 1);
      nextTaskIds.splice(to, 0, draggedId);
      const firstOrder = Math.min(...checkinTasks.map((task) => task.order));
      setItems((current) => current.map((item) => {
        const position = nextTaskIds.indexOf(item.id);
        return position >= 0 ? { ...item, order: firstOrder + position } : item;
      }));
      showNotice("Manual task order saved.");
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragTaskRef.current = null;
    dragOverTaskRef.current = null;
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const updateVoiceDraft = (draftId: string, updater: (draft: VoiceDraft, index: number) => VoiceDraft) => {
    setVoiceDrafts((current) => current.map((draft, index) => (draft.id === draftId ? updater(draft, index) : draft)));
  };

  const deleteVoiceDraft = (draftId: string) => {
    setVoiceDrafts((current) => current.filter((draft) => draft.id !== draftId));
  };

  const toggleVoiceDraftPriority = (draftId: string) => {
    updateVoiceDraft(draftId, (draft) => ({ ...draft, prioritized: !draft.prioritized }));
  };

  const cycleVoiceDraftSchedule = (draftId: string) => {
    const scheduleOptions = ["Today, 12:30", "Today, 14:30", "Today, 16:30", "Tomorrow morning"];
    updateVoiceDraft(draftId, (draft) => {
      const currentIndex = scheduleOptions.indexOf(draft.window);
      const nextWindow = scheduleOptions[(currentIndex + 1) % scheduleOptions.length];
      return { ...draft, window: nextWindow, calendarPreview: nextWindow.startsWith("Today") };
    });
  };

  const confirmVoiceDrafts = () => {
    if (voiceDrafts.length === 0) {
      showNotice("No voice tasks selected to save.");
      return;
    }

    setItems((current) => [...current, ...voiceDrafts]);
    setVoiceDrafts([]);
    setAudioState("created");
    setSheet(null);
    showNotice("Voice updates saved. Calendar connection required.");
  };

  const chooseCapture = (label: string) => {
    setSheet(null);
    showNotice(`${label} is ready.`);
  };

  const chooseIntervention = (label: string) => {
    setSheet(null);
    showNotice(`${label} is selected.`);
  };

  return (
    <div className="prototype-shell" data-fc-theme={theme} data-demo-state={demoState}>
      <header className="home-header" aria-label="Floydee Connect header">
        <button className="profile-trigger" type="button" aria-label="Open profile and app menu" onClick={() => { setTenantMenuOpen(false); setSheet("menu"); }}>
          <span aria-hidden="true">SC</span>
        </button>
        <div className="header-context"><button className="tenant-trigger" type="button" aria-expanded={tenantMenuOpen} aria-controls="tenant-menu" onClick={() => setTenantMenuOpen((open) => !open)}><Building2 aria-hidden="true" size={17} /><span>{accountMode === "business" ? "Floydee Innovations" : "Personal Space"}</span><ChevronDown aria-hidden="true" size={16} /></button>{tenantMenuOpen ? <div className="tenant-menu" id="tenant-menu" role="menu" aria-label="Workspace selector"><button type="button" role="menuitem" className={accountMode === "business" ? "is-selected" : ""} onClick={() => { setAccountMode("business"); setTenantMenuOpen(false); }}><span>Floydee Innovations</span><small>Business workspace</small></button><button type="button" role="menuitem" className={accountMode === "individual" ? "is-selected" : ""} onClick={() => { setAccountMode("individual"); setTenantMenuOpen(false); }}><span>Personal Space</span><small>Private context</small></button></div> : null}</div>
        <button className="icon-button" type="button" aria-label="Search workspace" onClick={() => { setTenantMenuOpen(false); setSheet("search"); }}><Search aria-hidden="true" size={22} strokeWidth={2} /></button>
      </header>

      <MobileScroll className="app-screen floydee-scroll">
        <main className="home-content" data-testid="floydee-home">
          <div hidden={view !== "home"}>
          {demoState === "loading" ? <LoadingView /> : null}
          {demoState === "empty" ? <EmptyView onCapture={() => setSheet("capture")} /> : null}
          {demoState === "error" ? <ErrorView onRetry={() => setDemoState("default")} /> : null}
          {demoState !== "loading" && demoState !== "empty" && demoState !== "error" ? (
            <>
              {demoState === "stale" ? (
                <div className="state-banner warning-banner" role="status">
                  <AlertTriangle aria-hidden="true" size={18} />
                  <span>Calendar evidence is 3 hours old. Risk and order may have changed.</span>
                </div>
              ) : null}

              <CalendarStrip days={calendarWeek} selectedDate={selectedCalendarDate} eventCount={selectedCalendarEvents.length} onSelect={selectCalendarDate} onPrevious={() => setCalendarWeekOffset((current) => current - 1)} onNext={() => setCalendarWeekOffset((current) => current + 1)} onOpen={() => setView("calendar")} />

              <section className="section-block today-section" aria-labelledby="today-heading">
                <TaskListToolbar id="today-heading" mode={taskSortMode} hideCompleted={hideCompletedTasks} onToggle={() => setTaskSortMode((mode) => mode === "manual" ? "time" : "manual")} onToggleCompleted={() => setHideCompletedTasks((hidden) => !hidden)} />
                <div className="today-list">
                  {visibleSelectedDayItems.length ? visibleSelectedDayItems.map((item) => <TodayRow key={item.id} item={item} atRisk={item.title === "Share the V1 scope decision with the team"} draggable={item.kind === "Task" && taskSortMode === "manual"} dragged={draggedTaskId === item.id} dropTarget={dragOverTaskId === item.id && draggedTaskId !== item.id} onDragStart={beginSharedTaskDrag} onDragMove={moveSharedTaskDrag} onDragEnd={finishTaskDrag} onToggle={() => toggleItemCompleteById(item.id)} onOpen={() => openItemSheet(item.id)} />) : <div className="calendar-empty">No open tasks for this day.</div>}
                </div>
              </section>

              <p className="learning-note">
                Floydee will explain the source and ask before renegotiating anything.
              </p>
            </>
          ) : null}
          </div>
          {view === "notes" ? <NotesView notes={notes} onOpen={openNote} onCapture={openNoteCapture} /> : null}
          {view === "goals" ? <GoalsView goals={goals} topics={topics} projects={projects} items={items} notes={notes} tab={goalsTab} onTabChange={setGoalsTab} onOpenGoal={openGoal} onOpenTopic={openTopic} onOpenProject={openProject} onCreateGoal={() => openGoalCreate()} onCreateProject={openProjectCreate} /> : null}
          {view === "ask" && activeAskConversation ? <AskView conversation={activeAskConversation} messages={askMessages} onSend={sendAsk} onOpenConversations={() => setSheet("askConversations")} onNewConversation={createAskConversation} onOpenEvidence={(evidence) => { if (evidence.kind === "project") openProject(evidence.id); else if (evidence.kind === "goal") openGoal(evidence.id); else if (evidence.kind === "topic") openTopic(evidence.id); else if (evidence.kind === "person") openPerson(evidence.id); else openItemSheet(evidence.id); }} /> : null}
          {view === "calendar" ? <CalendarView month={calendarMonth} selectedDate={selectedCalendarDate} events={initialCalendarEvents} tasks={visibleSelectedCalendarTasks} schedule={selectedCalendarSchedule} sortMode={taskSortMode} hideCompleted={hideCompletedTasks} draggedTaskId={draggedTaskId} dragOverTaskId={dragOverTaskId} onBack={() => setView("home")} onMonthChange={setCalendarMonth} onSelect={selectCalendarDate} onToggleSort={() => setTaskSortMode((mode) => mode === "manual" ? "time" : "manual")} onToggleCompleted={() => setHideCompletedTasks((hidden) => !hidden)} onOpenItem={openItemSheet} onToggleItem={toggleItemCompleteById} onDragStart={beginSharedTaskDrag} onDragMove={moveSharedTaskDrag} onDragEnd={finishTaskDrag} /> : null}
          {view === "checkin" ? <CheckinView time={activeCheckinTime} tasks={checkinTasks} timings={checkinTimings} draggedTaskId={draggedTaskId} dragOverTaskId={dragOverTaskId} onBack={() => setView("home")} onOpen={openItemSheet} onToggle={toggleItemCompleteById} onDragStart={(event, taskId) => { event.currentTarget.setPointerCapture(event.pointerId); dragTaskRef.current = taskId; dragOverTaskRef.current = taskId; setDraggedTaskId(taskId); setDragOverTaskId(taskId); }} onDragMove={(event) => { if (!dragTaskRef.current) return; const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-checkin-task-id]"); if (row?.dataset.checkinTaskId) { dragOverTaskRef.current = row.dataset.checkinTaskId; setDragOverTaskId(row.dataset.checkinTaskId); } }} onDragEnd={finishTaskDrag} onAdd={() => setSheet("capture")} onVoice={() => setSheet("checkinVoice")} /> : null}
        </main>
      </MobileScroll>

      {view === "ask" ? <AskComposer input={askInput} onInput={setAskInput} onSend={() => sendAsk()} onVoice={() => showNotice("Voice questions are ready when you choose to record.")} /> : null}

      {view !== "checkin" ? <nav className="bottom-nav" aria-label="Primary navigation">
        <NavItem icon={Home} label="Home" active={view === "home"} onClick={() => setView("home")} />
        <NavItem icon={ListChecks} label="Goals" active={view === "goals"} onClick={() => setView("goals")} />
        <button className={`nav-item nav-capture ${audioState === "recording" ? "is-recording" : ""}`} type="button" aria-label={audioState === "recording" ? "Release to stop and review voice note" : "Capture a note. Tap for options or press and hold to record."} onPointerDown={beginCenterCapture} onPointerUp={finishCenterCapture} onPointerCancel={finishCenterCapture} onClick={openCenterCaptureFromKeyboard}><span className="nav-icon"><Mic aria-hidden="true" size={21} /></span><span>Capture</span></button>
        <NavItem icon={FileText} label="Notes" active={view === "notes"} onClick={() => setView("notes")} />
        <NavItem icon={CircleHelp} label="Ask" active={view === "ask"} onClick={() => setView("ask")} />
      </nav> : null}

      <div className="toast" role="status" aria-live="polite" data-visible={notice ? "true" : "false"}>
        {notice}
      </div>

      <BottomSheet
        open={sheet === "capture"}
        onOpenChange={(open) => setSheet(open ? "capture" : null)}
        title="Add to today"
        description="Create a task or capture context for today."
        snap={0.62}
      >
        <div className="manual-task-form">
          <label className="manual-task-field" htmlFor="manual-task-title">
            <span className="field-label">Manual task</span>
            <KeyboardInput
              id="manual-task-title"
              ref={manualInputRef}
              value={manualTitle}
              placeholder="What needs to happen today?"
              onChange={(event) => setManualTitle(event.currentTarget.value)}
              onInput={(event) => setManualTitle(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") createManualTask();
              }}
              onBlur={() => keyboard.hide()}
            />
          </label>
          <button
            className="primary-button"
            type="button"
            onPointerDown={(event) => {
              event.preventDefault();
              createManualTask();
            }}
          >
            Add to Today <Plus aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="sheet-action-list">
          <SheetAction icon={CheckCircle2} label="New commitment" detail="Something you promised to deliver" onClick={() => chooseCapture("New commitment")} />
          <SheetAction icon={Mic} label="Voice note" detail="Capture a thought without sending it" onClick={() => chooseCapture("Voice note")} />
          <SheetAction icon={FileText} label="Quick note" detail="Add context for later review" onClick={() => chooseCapture("Quick note")} />
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === "item"}
        onOpenChange={(open) => setSheet(open ? "item" : null)}
        title={selectedItem?.title ?? "Today item"}
        description={selectedItem ? `${selectedItem.kind} · ${selectedItem.window} · ${sourceDescription(selectedItem.source, selectedItem.sourceState)}` : undefined}
        snap={0.68}
      >
        {selectedItem ? (
          <div className="item-action-panel">
            <SourcePill item={selectedItem} />
            <button className="alignment-row" type="button" onClick={() => openAlignment({ type: "item", id: selectedItem.id })}><span><Tag aria-hidden="true" size={16} /> {selectedItem.alignment.kind === "goal" ? "Goal" : "Topic"}</span><strong>{goalName(selectedItem.alignment)}</strong><ArrowRight aria-hidden="true" size={17} /></button>
            <button className="people-row" type="button" data-testid="edit-task-people" onClick={() => openPeoplePicker({ type: "item", id: selectedItem.id })}><span className="sheet-action-icon"><Users aria-hidden="true" size={18} /></span><span><strong>{selectedItem.ownerId ? `Owner · ${personName(selectedItem.ownerId)}` : "Owner · Unassigned"}</strong><small>{peopleForItem(selectedItem).length ? `${peopleForItem(selectedItem).map(personName).join(", ")} · involved` : "Add people involved"}</small></span><ArrowRight aria-hidden="true" size={17} /></button>
            <section className="task-notes-section" aria-labelledby="task-notes-heading">
              <div className="note-section-heading"><h3 id="task-notes-heading">Task notes</h3><button type="button" onClick={openTaskNoteCapture}>Add note</button></div>
              {selectedTaskNotes.length ? <div className="task-note-list">{selectedTaskNotes.map((note) => <article key={note.id} className="task-note-row"><span className="sheet-action-icon">{note.source === "Voice note" ? <Mic aria-hidden="true" size={16} /> : <FileText aria-hidden="true" size={16} />}</span><span><strong>{note.title}</strong><small>{note.body}</small><em>{note.source} · {note.capturedAt}</em></span></article>)}</div> : <p className="task-notes-empty">Keep short decisions, updates, and follow-through context with this task.</p>}
            </section>
            <div className="action-grid" role="group" aria-label="Today item actions">
              <ActionButton icon={RotateCcw} label="Defer" detail="Choose a recommended time" onClick={openDefer} />
              <ActionButton icon={CheckCircle2} label={selectedItem.complete ? "Mark not done" : "Complete"} detail={selectedItem.complete ? "Returns to your plan" : "Mark complete now"} onClick={completeItem} />
            </div>
            <p className="sheet-footnote"><CircleHelp aria-hidden="true" size={15} /> Reorder tasks from Check in. Choose a recommended time before deferring.</p>
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={sheet === "taskNoteCapture"}
        onOpenChange={(open) => setSheet(open ? "taskNoteCapture" : "item")}
        title="Add task note"
        description="Capture an update that stays with this task."
        snap={0.62}
      >
        <div className="manual-task-form task-note-capture">
          {taskNoteMode === "choose" ? <div className="sheet-action-list"><SheetAction icon={Mic} label="Record a voice note" detail="Start and stop a deliberate task update" onClick={() => setTaskNoteMode("voice")} /><SheetAction icon={Pencil} label="Write a note" detail="Add a clear update manually" onClick={() => setTaskNoteMode("manual")} /></div> : null}
          {taskNoteMode === "voice" ? <div className="task-note-voice"><button className={`goal-voice-button ${taskNoteRecording ? "is-recording" : ""}`} type="button" aria-label={taskNoteRecording ? "Stop task note recording" : "Start task note recording"} onClick={() => taskNoteRecording ? stopTaskNoteVoice() : setTaskNoteRecording(true)}>{taskNoteRecording ? <Check aria-hidden="true" size={19} /> : <Mic aria-hidden="true" size={19} />}</button><div><strong>{taskNoteRecording ? "Recording task update" : "Ready to record"}</strong><small>{taskNoteRecording ? "Tap stop when you are done." : "Start when you are ready."}</small></div><button className="back-text-button" type="button" onClick={() => setTaskNoteMode("choose")}>Choose another method</button></div> : null}
          {taskNoteMode === "manual" ? <><button className="back-text-button" type="button" onClick={() => setTaskNoteMode("choose")}>Choose another method</button><label className="manual-task-field" htmlFor="task-note-title"><span className="field-label">Title</span><KeyboardInput id="task-note-title" value={taskNoteTitle} placeholder="What changed?" onChange={(event) => setTaskNoteTitle(event.currentTarget.value)} onBlur={() => keyboard.hide()} /></label><label className="manual-task-field" htmlFor="task-note-body"><span className="field-label">Update</span><KeyboardTextarea id="task-note-body" value={taskNoteBody} placeholder="Add the relevant decision, progress, or follow-up." onChange={(event) => setTaskNoteBody(event.currentTarget.value)} onBlur={() => keyboard.hide()} /></label><button className="primary-button" type="button" onPointerDown={(event) => { event.preventDefault(); saveTaskNote("Manual note", taskNoteTitle, taskNoteBody); }}>Save task note <Check aria-hidden="true" size={18} /></button></> : null}
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === "defer"}
        onOpenChange={(open) => setSheet(open ? "defer" : "item")}
        title="Defer task"
        description="Choose a recommended time for this task to return to your plan."
        snap={0.58}
      >
        <div className="manual-task-form defer-recommendations">
          <span className="field-label">Recommended times</span>
          {!deferLater ? <><div className="defer-slot-list" role="radiogroup" aria-label="Recommended defer times">
            {deferRecommendations.map((slot) => (
              <button key={slot.value} className={`defer-slot action-card ${deferSlot === slot.value ? "is-selected" : ""}`} type="button" role="radio" aria-checked={deferSlot === slot.value} onClick={() => setDeferSlot(slot.value)}>
                <span className="sheet-action-icon"><Clock3 aria-hidden="true" size={18} /></span>
                <span><strong>{slot.label}</strong><small>{slot.detail}</small></span>
                {deferSlot === slot.value ? <Check aria-hidden="true" size={18} /> : null}
              </button>
            ))}
          </div><button className="text-button defer-later-button" type="button" onClick={() => setDeferLater(true)}><CalendarDays aria-hidden="true" size={16} /> Choose a later date</button></> : <><label className="manual-task-field" htmlFor="defer-later-date"><span className="field-label">Later date</span><KeyboardInput id="defer-later-date" type="date" value={deferLaterDate} onChange={(event) => setDeferLaterDate(event.currentTarget.value)} onBlur={() => keyboard.hide()} /></label><button className="back-text-button" type="button" onClick={() => setDeferLater(false)}>Back to recommended times</button></>}
          <button className="primary-button" type="button" onPointerDown={(event) => { event.preventDefault(); confirmDefer(); }}>
            Defer to {deferLater ? formatDeferredDate(deferLaterDate) : deferRecommendations.find((slot) => slot.value === deferSlot)?.label} <RotateCcw aria-hidden="true" size={18} />
          </button>
          <p className="sheet-footnote"><CircleHelp aria-hidden="true" size={15} /> These are schedule suggestions, not a capacity promise. This updates your plan only.</p>
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === "itemEdit"}
        onOpenChange={(open) => setSheet(open ? "itemEdit" : null)}
        title="Edit morning item"
        description="Manual changes update Today immediately."
        snap={0.7}
      >
        <div className="manual-task-form">
          <label className="manual-task-field" htmlFor="edit-item-title"><span className="field-label">Title</span><KeyboardInput id="edit-item-title" value={editTitle} onChange={(event) => setEditTitle(event.currentTarget.value)} onInput={(event) => setEditTitle(event.currentTarget.value)} onBlur={() => keyboard.hide()} /></label>
          <label className="manual-task-field" htmlFor="edit-item-window"><span className="field-label">Due window</span><KeyboardInput id="edit-item-window" value={editWindow} onChange={(event) => setEditWindow(event.currentTarget.value)} onInput={(event) => setEditWindow(event.currentTarget.value)} onBlur={() => keyboard.hide()} /></label>
          <label className="manual-task-field" htmlFor="edit-item-effort"><span className="field-label">Effort</span><KeyboardInput id="edit-item-effort" value={editEffort} onChange={(event) => setEditEffort(event.currentTarget.value)} onInput={(event) => setEditEffort(event.currentTarget.value)} onBlur={() => keyboard.hide()} /></label>
          <button className="primary-button" type="button" data-testid="save-item-edit" onPointerDown={(event) => { event.preventDefault(); saveItemEdit(); }}>Save manual changes <Check aria-hidden="true" size={18} /></button>
          <p className="sheet-footnote"><Pencil aria-hidden="true" size={15} /> Change title, timing, or effort here. Status stays a direct control on the morning list.</p>
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === "renegotiate"}
        onOpenChange={(open) => setSheet(open ? "renegotiate" : null)}
        title="Approve renegotiation"
        description="Floydee separates recommendation from execution. Nothing is sent without your confirmation."
        snap={0.58}
      >
        {selectedItem ? (
          <div className="renegotiate-panel">
            <div className="draft-message">
              <span>Draft</span>
              <p>“I’m protecting delivery quality today. Can I send this by tomorrow morning instead?”</p>
            </div>
            <dl className="evidence-grid">
              <div><dt>Item</dt><dd>{selectedItem.kind}</dd></div>
              <div><dt>Source</dt><dd>{selectedItem.source}</dd></div>
              <div><dt>Undo</dt><dd>Not sent</dd></div>
            </dl>
            <button className="primary-button" type="button" onClick={approveRenegotiation}>
              Save for confirmation <ArrowRight aria-hidden="true" size={18} />
            </button>
            <button className="secondary-button" type="button" onClick={() => setSheet("item")}>
              Cancel
            </button>
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={sheet === "voiceReview"}
        onOpenChange={(open) => setSheet(open ? "voiceReview" : null)}
        title="Review voice tasks"
        description="Review each action before it is added to Today."
        snap={0.78}
      >
        <div className="voice-review-panel">
          {voiceDrafts.length > 0 ? (
            <div className="voice-draft-list">
              {voiceDrafts.map((draft) => (
                <article className="voice-draft-card" key={draft.id}>
                  <div className="voice-draft-heading">
                    <span>{draft.kind}</span>
                    <button className="draft-delete-button" type="button" onClick={() => deleteVoiceDraft(draft.id)}>
                      Delete
                    </button>
                  </div>
                  <h3>{draft.title}</h3>
                  <div className="draft-meta-row">
                    <span>{draft.window}</span>
                    <span>{draft.effort}</span>
                    <span>{draft.calendarPreview ? "Calendar connection required" : "No calendar slot"}</span>
                  </div>
                  <SourcePill item={draft} />
                  <div className="draft-actions">
                    <button className="draft-action-button" type="button" aria-pressed={draft.prioritized ? "true" : "false"} onClick={() => toggleVoiceDraftPriority(draft.id)}>
                      {draft.prioritized ? "Important" : "Mark important"}
                    </button>
                    <button className="draft-action-button" type="button" onClick={() => cycleVoiceDraftSchedule(draft.id)}>
                      Change schedule
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="draft-empty-state">
              <p>All extracted tasks were removed.</p>
            </div>
          )}
          <button className="primary-button" type="button" onClick={confirmVoiceDrafts}>
            Confirm selected tasks <ArrowRight aria-hidden="true" size={18} />
          </button>
          <button className="secondary-button" type="button" onClick={resetAudioCapture}>
            Discard and record again
          </button>
          <p className="sheet-footnote"><CircleHelp aria-hidden="true" size={15} /> Confirmed tasks are added to Today. Calendar actions require your approval.</p>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "checkinVoice"} onOpenChange={(open) => setSheet(open ? "checkinVoice" : null)} title="Record task update" description="Visible capture creates reviewable proposals before tasks change." snap={0.62}>
        <div className="checkin-voice-sheet"><AudioCaptureControl state={audioState} seconds={audioSeconds} onStart={startAudioCapture} onStop={stopAudioCapture} onCreate={createVoiceTasks} onReset={resetAudioCapture} onManualTask={() => setSheet("capture")} /><p className="sheet-footnote"><ShieldCheck aria-hidden="true" size={15} /> Stop is always available. Review every proposed change.</p></div>
      </BottomSheet>

      <BottomSheet
        open={sheet === "intervention"}
        onOpenChange={(open) => setSheet(open ? "intervention" : null)}
        title="Protect the V1 scope decision"
        description="Two feasible choices based on current calendar and commitment evidence."
        snap={0.58}
      >
        <div className="option-list">
          <button className="option-card recommended" type="button" onClick={() => chooseIntervention("Protect 90 minutes")}>
            <span className="option-badge">Least disruption</span>
            <strong>Protect 90 minutes at 14:30</strong>
            <span>Move the flexible paywall critique. No external communication.</span>
          </button>
          <button className="option-card" type="button" onClick={() => chooseIntervention("Keep the current plan")}>
            <strong>Keep the current plan</strong>
            <span>Accept a higher delivery risk and review again at 15:30.</span>
          </button>
          <p className="sheet-footnote"><CircleHelp aria-hidden="true" size={15} /> Calendar changes always require your confirmation.</p>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "goalDetail"} onOpenChange={(open) => setSheet(open ? "goalDetail" : null)} title={selectedGoal?.title ?? "Goal"} description={selectedGoal?.outcome} snap={0.82}>
        {selectedGoal ? <div className="goal-detail-panel"><div className="goal-status-summary"><div className="goal-progress"><span>{selectedGoal.progress}%</span><div><i style={{ width: `${selectedGoal.progress}%` }} /><small>{selectedGoal.horizon}</small></div></div><span className="action-state" data-goal-status={selectedGoal.status}>{selectedGoal.status}</span></div><button className="alignment-row" type="button" onClick={() => openProjectAssignment({ kind: "goal", id: selectedGoal.id })}><span><FolderKanban aria-hidden="true" size={16} /> Project</span><strong>{selectedGoal.projectId ? projects.find((project) => project.id === selectedGoal.projectId)?.title : "Not assigned"}</strong><ArrowRight aria-hidden="true" size={17} /></button><div className="goal-signal"><Target aria-hidden="true" size={17} /><span><strong>Next action</strong><small>{selectedGoal.nextAction}</small></span></div><section className="note-section"><div className="note-section-heading"><h3>Timeline</h3></div><ol className="goal-timeline">{selectedGoal.milestones.map((milestone, index) => <li key={milestone} data-current={index === 1 ? "true" : undefined}>{milestone}</li>)}</ol></section><section className="note-section"><div className="note-section-heading"><h3>Aligned work</h3><span className="share-count">{alignedWorkCount(items, notes, { kind: "goal", id: selectedGoal.id })}</span></div><p>Tasks, notes, and meeting actions are the visible evidence behind this status.</p><AlignedWorkList items={items} notes={notes} alignment={{ kind: "goal", id: selectedGoal.id }} onOpenItem={openItemSheet} onOpenNote={openNote} onOpenAction={openAlignedNoteAction} /></section>{goals.filter((goal) => goal.parentId === selectedGoal.id).length ? <section className="note-section"><div className="note-section-heading"><h3>Child goals</h3><GitBranch aria-hidden="true" size={17} /></div><div className="note-action-list">{goals.filter((goal) => goal.parentId === selectedGoal.id).map((goal) => <ActionCard key={goal.id} icon={Target} title={goal.title} detail={`${goal.status} · ${goal.horizon}`} state={`${goal.progress}%`} onClick={() => openGoal(goal.id)} />)}</div></section> : null}<button className="text-button" type="button" onClick={() => openGoalCreate(selectedGoal.id)}><Plus aria-hidden="true" size={16} /> Create child goal</button></div> : null}
      </BottomSheet>

      <BottomSheet open={sheet === "topicDetail"} onOpenChange={(open) => setSheet(open ? "topicDetail" : null)} title={selectedTopic?.title ?? "Topic"} description={selectedTopic?.detail} snap={0.78}>
        {selectedTopic ? <div className="goal-detail-panel"><div className="goal-signal"><Tag aria-hidden="true" size={17} /><span><strong>Grouped context</strong><small>{selectedTopic.source} · {selectedTopic.freshness}</small></span></div><button className="alignment-row" type="button" onClick={() => openProjectAssignment({ kind: "topic", id: selectedTopic.id })}><span><FolderKanban aria-hidden="true" size={16} /> Project</span><strong>{selectedTopic.projectId ? projects.find((project) => project.id === selectedTopic.projectId)?.title : "Not assigned"}</strong><ArrowRight aria-hidden="true" size={17} /></button><section className="note-section"><div className="note-section-heading"><h3>Activity timeline</h3><span className="share-count">Topic</span></div><ol className="goal-timeline"><li>{selectedTopic.firstSeen}</li><li data-current="true">{selectedTopic.activity}</li></ol></section><section className="note-section"><div className="note-section-heading"><h3>Aligned work</h3><span className="share-count">{alignedWorkCount(items, notes, { kind: "topic", id: selectedTopic.id })}</span></div><p>This context is grouped together until you decide it should become an outcome.</p><AlignedWorkList items={items} notes={notes} alignment={{ kind: "topic", id: selectedTopic.id }} onOpenItem={openItemSheet} onOpenNote={openNote} onOpenAction={openAlignedNoteAction} /></section><button className="primary-button" type="button" data-testid="convert-topic-goal" onClick={() => openGoalCreate("", selectedTopic.id)}>Turn into a goal <ArrowRight aria-hidden="true" size={18} /></button></div> : null}
      </BottomSheet>

      <BottomSheet open={sheet === "projectDetail"} onOpenChange={(open) => setSheet(open ? "projectDetail" : null)} title={selectedProject?.title ?? "Project"} description={selectedProject?.purpose} snap={0.8}>
        {selectedProject ? <div className="goal-detail-panel"><div className="goal-signal"><FolderKanban aria-hidden="true" size={17} /><span><strong>Project overview</strong><small>{goals.filter((goal) => goal.projectId === selectedProject.id).length} goals · {topics.filter((topic) => topic.projectId === selectedProject.id).length} topics</small></span></div><section className="note-section"><div className="note-section-heading"><h3>Access & allocation</h3><span className="share-count">{selectedProject.workspaceGrants?.filter((grant) => grant.status === "Active").length ?? 0}</span></div><div className="note-action-list">{selectedProject.workspaceGrants?.map((grant) => <ActionCard key={grant.id} icon={Users} title={grant.recipient} detail={`${grant.recipientType === "group" ? "Group" : "Directory person"} · ${grant.scope} · desktop-managed`} state={grant.status} />)}</div><p className="project-admin-note">Groups, membership, project creation, and allocation are managed in the desktop application. Tasks inherit Project context only through their Goal or Topic.</p></section><section className="note-section"><div className="note-section-heading"><h3>Goals</h3></div><div className="note-action-list">{goals.filter((goal) => goal.projectId === selectedProject.id).map((goal) => <ActionCard key={goal.id} icon={Target} title={goal.title} detail={`${goal.status} · ${goal.nextAction}`} state={`${goal.progress}%`} onClick={() => openGoal(goal.id)} />)}</div></section><section className="note-section"><div className="note-section-heading"><h3>Topics</h3></div><div className="note-action-list">{topics.filter((topic) => topic.projectId === selectedProject.id).map((topic) => <ActionCard key={topic.id} icon={Tag} title={topic.title} detail={topic.activity} state="Topic" onClick={() => openTopic(topic.id)} />)}</div></section></div> : null}
      </BottomSheet>

      <BottomSheet open={sheet === "projectCreate"} onOpenChange={(open) => setSheet(open ? "projectCreate" : null)} title="Create project" description="Group the outcomes and context that belong to this body of work." snap={0.62}>
        <div className="manual-task-form"><label className="manual-task-field"><span className="field-label">Project name</span><KeyboardInput value={projectTitle} placeholder="e.g. Enterprise pilot" onChange={(event) => setProjectTitle(event.currentTarget.value)} onBlur={() => keyboard.hide()} /></label><label className="manual-task-field"><span className="field-label">Purpose</span><KeyboardTextarea value={projectPurpose} placeholder="What is this project intended to achieve?" onChange={(event) => setProjectPurpose(event.currentTarget.value)} onBlur={() => keyboard.hide()} /></label><button className="primary-button" type="button" onClick={createProject}><Plus aria-hidden="true" size={18} /> Create project</button></div>
      </BottomSheet>

      <BottomSheet open={sheet === "projectAssignment"} onOpenChange={(open) => setSheet(open ? "projectAssignment" : null)} title="Project" description="This assignment is optional. Tasks inherit project context through their goal or topic." snap={0.72}>
        <div className="alignment-list"><div className="note-action-list">{projects.map((project) => <ActionCard key={project.id} icon={FolderKanban} title={project.title} detail={project.purpose} onClick={() => assignProject(project.id)} />)}</div><button className="text-button" type="button" onClick={() => assignProject()}><XCircle aria-hidden="true" size={16} /> Remove project</button></div>
      </BottomSheet>

      <BottomSheet open={sheet === "peoplePicker"} onOpenChange={(open) => setSheet(open ? "peoplePicker" : peopleTarget?.type === "item" ? "item" : peopleTarget?.type === "note" ? "noteDetail" : "noteAction")} title={peopleTarget?.type === "note" ? "People in this note" : "People on this work"} description={peopleTarget?.type === "note" ? "Choose the meeting participants and contacts relevant to this note." : "Set one accountable owner and the people involved."} snap={0.8}>
        <div className="people-picker-panel">
          {peopleTarget?.type !== "note" ? <section className="note-section"><div className="note-section-heading"><h3>Owner</h3><button type="button" onClick={() => setOwnerDraftId("")}>Clear</button></div><div className="people-choice-list">{availablePeople.map((person) => <button type="button" key={person.id} className={ownerDraftId === person.id ? "is-selected" : ""} aria-pressed={ownerDraftId === person.id} onClick={() => setOwnerDraftId(person.id)}><span className="person-avatar">{person.initials}</span><span><strong>{person.name}</strong><small>{person.role} · {person.state}</small></span>{ownerDraftId === person.id ? <Check aria-hidden="true" size={18} /> : null}</button>)}{!availablePeople.length ? <p className="task-notes-empty">Connect an approved people source before assigning work.</p> : null}</div></section> : null}
          <section className="note-section"><div className="note-section-heading"><h3>{peopleTarget?.type === "note" ? "Participants" : "People involved"}</h3><span className="share-count">{peopleDraftIds.length}</span></div><div className="people-choice-list">{availablePeople.map((person) => <button type="button" key={person.id} className={peopleDraftIds.includes(person.id) ? "is-selected" : ""} aria-pressed={peopleDraftIds.includes(person.id)} onClick={() => toggleDraftPerson(person.id)}><span className="person-avatar">{person.initials}</span><span><strong>{person.name}</strong><small>{person.role} · {person.source} · {person.state}</small></span>{peopleDraftIds.includes(person.id) ? <Check aria-hidden="true" size={18} /> : null}</button>)}</div></section>
          <p className="sheet-footnote"><ShieldCheck aria-hidden="true" size={15} /> Suggested people stay editable. Only people available in this workspace are shown.</p>
          <button className="primary-button" type="button" data-testid="save-people-association" onClick={savePeople}>Save people <Check aria-hidden="true" size={18} /></button>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "contacts"} onOpenChange={(open) => setSheet(open ? "contacts" : null)} title="Contacts & people" description={accountMode === "business" ? "Approved work sources only in this workspace." : "Choose the people sources you want to use."} snap={0.86}>
        <div className="contacts-panel"><section className="note-section"><div className="note-section-heading"><h3>Connections</h3></div><div className="note-action-list">{(["Phone contacts", "Email-derived people", "Business directory"] as PersonSource[]).map((source) => { const available = accountMode === "individual" || source === "Business directory"; return <button className="contact-source-row" key={source} type="button" disabled={!available} onClick={() => toggleContactPermission(source)}><span><strong>{source}</strong><small>{available ? "Permissioned source" : "Available in Personal Space"}</small></span><span className="action-state">{contactPermissions[source] ? "Connected" : "Not connected"}</span></button>; })}</div></section><section className="note-section"><div className="note-section-heading"><h3>People</h3><span className="share-count">{people.filter((person) => accountMode === "business" ? person.source === "Business directory" : contactPermissions[person.source]).length}</span></div><div className="note-action-list">{people.filter((person) => accountMode === "business" ? person.source === "Business directory" : contactPermissions[person.source]).map((person) => <ActionCard key={person.id} icon={Users} title={person.name} detail={`${person.role} · ${person.source}`} state={person.state} onClick={() => openPerson(person.id)} />)}</div></section></div>
      </BottomSheet>

      <BottomSheet open={sheet === "personDetail"} onOpenChange={(open) => setSheet(open ? "personDetail" : null)} title={selectedPerson?.name ?? "Person"} description={selectedPerson ? `${selectedPerson.role} · ${selectedPerson.source}` : undefined} snap={0.7}>
        {selectedPerson ? <div className="goal-detail-panel"><div className="goal-signal"><Users aria-hidden="true" size={17} /><span><strong>{selectedPerson.state}</strong><small>{selectedPerson.freshness} · source can be corrected or revoked</small></span></div><section className="note-section"><div className="note-section-heading"><h3>Involved in</h3></div><div className="note-action-list"><ActionCard icon={CalendarPlus} title="Founder engineering stand-up" detail="Meeting · Capture V1" /><ActionCard icon={CheckCircle2} title="Verify Capture Lite playback on Android" detail="Task · Capture V1" /></div></section>{selectedPerson.state === "Suggested" ? <button className="primary-button" type="button" onClick={() => confirmPerson(selectedPerson.id)}><Check aria-hidden="true" size={17} /> Confirm person link</button> : <button className="secondary-button" type="button" onClick={() => showNotice("Person link removed from this workspace.")}>Remove person link</button>}</div> : null}
      </BottomSheet>

      <BottomSheet open={sheet === "goalCreate"} onOpenChange={(open) => setSheet(open ? "goalCreate" : null)} title={topicToConvertId ? "Turn topic into a goal" : "Create goal"} description="Define an outcome you want to achieve, then connect the work that supports it." snap={0.84}>
        <div className="manual-task-form"><div className="goal-voice-capture"><span className="field-label">Describe with voice</span><div><button className={`goal-voice-button ${goalVoiceState === "recording" ? "is-recording" : ""}`} type="button" aria-label={goalVoiceState === "recording" ? "Stop describing goal" : "Describe goal with voice"} onClick={goalVoiceState === "recording" ? stopGoalVoice : beginGoalVoice}>{goalVoiceState === "recording" ? <Check aria-hidden="true" size={19} /> : <Mic aria-hidden="true" size={19} />}</button><span><strong>{goalVoiceState === "recording" ? "Listening" : goalVoiceState === "ready" ? "Details ready to review" : "Describe your goal"}</strong><small>{goalVoiceState === "recording" ? "Tap stop when you are done." : "Speak the outcome and target date."}</small></span>{goalVoiceState === "ready" ? <button className="text-button" type="button" onClick={useGoalVoiceDetails}>Use details</button> : null}</div></div><label className="manual-task-field"><span className="field-label">Goal</span><KeyboardInput value={goalTitle} placeholder="What outcome do you want?" onChange={(event) => setGoalTitle(event.currentTarget.value)} onBlur={() => keyboard.hide()} /></label><label className="manual-task-field"><span className="field-label">Desired outcome</span><KeyboardTextarea value={goalOutcome} placeholder="What does complete look like?" onChange={(event) => setGoalOutcome(event.currentTarget.value)} onBlur={() => keyboard.hide()} /></label><label className="manual-task-field"><span className="field-label">Target date and time</span><KeyboardInput type="datetime-local" value={goalHorizon} onChange={(event) => setGoalHorizon(event.currentTarget.value)} onBlur={() => keyboard.hide()} /></label><label className="manual-task-field"><span className="field-label">Project (optional)</span><select aria-label="Goal project" value={goalProjectId} onChange={(event) => setGoalProjectId(event.currentTarget.value)}><option value="">Not assigned</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><div className="parent-goal-picker"><span className="field-label">Goal level</span><button type="button" className={!goalParentId ? "is-selected top-level-goal-choice" : "top-level-goal-choice"} onClick={() => setGoalParentId("")}><Target aria-hidden="true" size={17} /> Top-level goal</button><span className="field-label">Or add beneath a top-level goal</span>{goals.filter((goal) => !goal.parentId).map((goal) => <button type="button" key={goal.id} className={goalParentId === goal.id ? "is-selected" : ""} onClick={() => setGoalParentId(goal.id)}>{goal.title}</button>)}</div><button className="primary-button" type="button" data-testid="create-goal" onPointerDown={(event) => { event.preventDefault(); createGoal(); }}>Save goal <Check aria-hidden="true" size={18} /></button></div>
      </BottomSheet>

      <BottomSheet open={sheet === "alignment"} onOpenChange={(open) => setSheet(open ? "alignment" : null)} title="Align work" description="Choose the outcome this supports, or keep it grouped as a topic until one is clear." snap={0.8}>
        <div className="alignment-list"><span className="field-label">Goals</span>{goals.map((goal) => <ActionCard key={goal.id} icon={Target} title={goal.title} detail={goal.parentId ? `Child goal · ${goal.horizon}` : goal.outcome} onClick={() => applyAlignment({ kind: "goal", id: goal.id })} />)}<span className="field-label">Topics</span>{topics.map((topic) => <ActionCard key={topic.id} icon={Tag} title={topic.title} detail={topic.detail} onClick={() => applyAlignment({ kind: "topic", id: topic.id })} />)}<button className="text-button" type="button" onClick={() => openGoalCreate()}><Plus aria-hidden="true" size={16} /> Create a goal</button></div>
      </BottomSheet>

      <BottomSheet
        open={sheet === "noteCapture"}
        onOpenChange={(open) => { if (!open) setNoteCaptureMode("choose"); setSheet(open ? "noteCapture" : null); }}
        title="Capture a note"
        description="Choose one deliberate way to create a draft."
        snap={0.68}
      >
        <div className="note-capture-panel" data-mode={noteCaptureMode}>
          {noteCaptureMode === "choose" ? <div className="capture-mode-list"><button className="capture-mode-button" type="button" onClick={() => setNoteCaptureMode("voice")}><span className="sheet-action-icon"><Mic aria-hidden="true" size={20} /></span><span><strong>Record a voice note</strong><small>Visible, local capture with a clear stop control</small></span><ArrowRight aria-hidden="true" size={18} /></button><button className="capture-mode-button" type="button" onClick={() => setNoteCaptureMode("manual")}><span className="sheet-action-icon"><Pencil aria-hidden="true" size={20} /></span><span><strong>Write a note</strong><small>Add context manually for later review</small></span><ArrowRight aria-hidden="true" size={18} /></button></div> : null}
          {noteCaptureMode === "voice" ? <><button className="back-text-button" type="button" onClick={() => setNoteCaptureMode("choose")}>Choose another method</button><AudioCaptureControl state={audioState} seconds={audioSeconds} onStart={startAudioCapture} onStop={stopAudioCapture} onCreate={createVoiceNote} onReset={() => { setAudioSeconds(0); setAudioState("idle"); }} onManualTask={() => undefined} noteMode /><p className="sheet-footnote"><ShieldCheck aria-hidden="true" size={15} /> Audio stays local until you choose to share it.</p></> : null}
          {noteCaptureMode === "manual" ? <><button className="back-text-button" type="button" onClick={() => setNoteCaptureMode("choose")}>Choose another method</button><label className="manual-task-field" htmlFor="note-title"><span className="field-label">Note title</span><KeyboardInput id="note-title" ref={noteTitleRef} value={noteTitle} placeholder="Give this note a clear name" onChange={(event) => setNoteTitle(event.currentTarget.value)} onBlur={() => keyboard.hide()} /></label><label className="manual-task-field" htmlFor="note-body"><span className="field-label">Context</span><KeyboardTextarea id="note-body" value={noteBody} placeholder="What should you remember or decide later?" onChange={(event) => setNoteBody(event.currentTarget.value)} onBlur={() => keyboard.hide()} /></label><button className="primary-button" type="button" data-testid="create-manual-note" onPointerDown={(event) => { event.preventDefault(); createManualNote(); }}>Create note <FileText aria-hidden="true" size={18} /></button></> : null}
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === "noteDetail"}
        onOpenChange={(open) => setSheet(open ? "noteDetail" : null)}
        title={selectedNote?.title ?? "Note"}
        description={selectedNote ? `${selectedNote.source} · ${selectedNote.capturedAt} · Personal` : undefined}
        snap={0.84}
      >
        {selectedNote ? <div className="note-detail-panel" data-testid="note-detail">
          <div className="note-status-row"><span>{selectedNote.processing}</span><span>{selectedNote.source === "Voice note" ? "Local only" : "Manual source"}</span></div>
          <button className="alignment-row" type="button" onClick={() => openAlignment({ type: "note", id: selectedNote.id })}><span><Tag aria-hidden="true" size={16} /> {selectedNote.alignment.kind === "goal" ? "Goal" : "Topic"}</span><strong>{goalName(selectedNote.alignment)}</strong><ArrowRight aria-hidden="true" size={17} /></button>
          <button className="people-row" type="button" data-testid="edit-note-people" onClick={() => openPeoplePicker({ type: "note", id: selectedNote.id })}><span className="sheet-action-icon"><Users aria-hidden="true" size={18} /></span><span><strong>People involved</strong><small>{peopleForNote(selectedNote).length ? peopleForNote(selectedNote).map(personName).join(", ") : "Add meeting participants or contacts"}</small></span><ArrowRight aria-hidden="true" size={17} /></button>
          {selectedNote.source === "Voice note" ? <button className="audio-player" type="button" aria-pressed={audioPlaying} onClick={() => setAudioPlaying((playing) => !playing)}><span className="audio-player-control">{audioPlaying ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}</span><span className="audio-wave" aria-hidden="true">▂▅▃▇▂▆▃▅▂▇▃</span><span>01:42</span><small>{audioPlaying ? "Playing" : "Play audio"}</small></button> : null}
          {selectedNote.observations?.length ? <section className="note-section engineering-brief"><div className="note-section-heading"><h3>Observed</h3><button type="button" onClick={openNoteDraft}>Edit brief</button></div><ul>{selectedNote.observations.map((observation) => <li key={observation}>{observation}</li>)}</ul></section> : null}
          <section className="note-section"><div className="note-section-heading"><h3>Drafted</h3><button type="button" onClick={openNoteDraft}>Edit</button></div><p>{selectedNote.summary}</p></section>
          {selectedNote.actions?.length ? <section className="note-section"><div className="note-section-heading"><h3>Proposed actions</h3><span className="share-count">{selectedNote.actions.length}</span></div><div className="note-action-list">{selectedNote.actions.map((action) => <ActionCard key={action.id} icon={action.kind === "jira" ? ClipboardCheck : action.kind === "meeting" ? CalendarPlus : UserRoundPlus} title={action.title} detail={`${action.source} · ${action.detail}`} state={action.state} onClick={() => openNoteAction(action.id)} />)}</div></section> : <section className="note-section"><div className="note-section-heading"><h3>Action item</h3><button type="button" onClick={() => correctNote("actionItem")}>Edit</button></div><p>{selectedNote.actionItem}</p><button className="secondary-button note-action-button" type="button" data-testid="add-note-action" disabled={selectedNote.actionAdded} onClick={addNoteActionToToday}>{selectedNote.actionAdded ? "Added to Today" : "Add reviewed action to Today"}</button></section>}
          <details className="note-disclosure"><summary>Transcript and source</summary><section className="note-section"><div className="note-section-heading"><h3>Transcript</h3><button type="button" onClick={() => correctNote("transcript")}>{selectedNote.corrected ? "Correct again" : "Correct"}</button></div><p>{selectedNote.transcript}</p></section><div className="note-provenance"><ShieldCheck aria-hidden="true" size={17} /><span>Source: {selectedNote.source} · user controlled · available now</span></div></details>
          <details className="note-disclosure"><summary>Tags and sharing</summary><section className="note-section"><div className="note-section-heading"><h3>Tags</h3><button type="button" onClick={addTag}>Add tag</button></div><div className="tag-list">{selectedNote.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></section>
          <section className="note-section"><div className="note-section-heading"><h3>{accountMode === "business" ? "Workspace access" : "Shared with"}</h3><span className="share-count">{accountMode === "business" ? selectedNote.workspaceGrants?.filter((grant) => grant.status === "Active").length ?? 0 : selectedNote.shares?.filter((share) => share.status === "Active").length ?? 0}</span></div>{accountMode === "business" ? selectedNote.workspaceGrants?.length ? <div className="note-share-list">{selectedNote.workspaceGrants.map((grant) => <div key={grant.id}><span><strong>{grant.recipient}</strong><small>{grant.recipientType === "group" ? "Group" : "Directory person"} · {grant.scope} · {grant.status}</small></span>{grant.status === "Active" ? <button type="button" onClick={() => revokeWorkspaceNoteAccess(grant.id)}>Revoke</button> : <small>Revoked</small>}</div>)}</div> : <p className="note-empty-share">Grant access to an approved directory person or workspace group.</p> : selectedNote.shares?.length ? <div className="note-share-list">{selectedNote.shares.map((share) => <div key={share.id}><span><strong>{share.recipient}</strong><small>{share.channel} · {share.status}</small></span>{share.status === "Active" ? <button type="button" onClick={() => revokeNoteShare(share.id)}>Revoke</button> : <small>Revoked</small>}</div>)}</div> : <p className="note-empty-share">Only people you explicitly choose can view this note.</p>}</section>
          </details>
          <div className="note-detail-actions"><button className="secondary-button" type="button" data-testid="open-note-export" onClick={() => setSheet("noteExport")}>Export</button><button className="primary-button" type="button" data-testid="open-note-share" onClick={() => { resetShareApproval(); setShareChannel("Family"); setShareRecipient(""); setWorkspaceRecipientType("person"); setWorkspaceRecipientId("person-aarav"); setSheet("noteShare"); }}>{accountMode === "business" ? "Manage access" : "Share note"} <Send aria-hidden="true" size={17} /></button></div>
        </div> : null}
      </BottomSheet>

      <BottomSheet open={sheet === "noteEdit"} onOpenChange={(open) => setSheet(open ? "noteEdit" : "noteDetail")} title="Edit brief" description="Refine the draft before reviewing its actions." snap={0.64}>
        <div className="manual-task-form"><label className="manual-task-field" htmlFor="note-draft"><span className="field-label">Draft summary</span><KeyboardTextarea id="note-draft" value={noteDraft} onChange={(event) => setNoteDraft(event.currentTarget.value)} onBlur={() => keyboard.hide()} /></label><button className="primary-button" type="button" onClick={saveNoteDraft}>Save brief <Check aria-hidden="true" size={18} /></button></div>
      </BottomSheet>

      <BottomSheet open={sheet === "noteAction"} onOpenChange={(open) => setSheet(open ? "noteAction" : "noteDetail")} title={selectedNoteAction?.title ?? "Review action"} description={selectedNoteAction ? `${selectedNoteAction.source} · ${selectedNoteAction.detail}` : undefined} snap={0.64}>
          {selectedNoteAction ? <div className="action-review-panel"><ActionCard icon={selectedNoteAction.kind === "jira" ? ClipboardCheck : selectedNoteAction.kind === "meeting" ? CalendarPlus : UserRoundPlus} title={selectedNoteAction.title} detail={`Assigned to ${selectedNoteAction.owner}`} state={selectedNoteAction.state} /><button className="alignment-row" type="button" onClick={() => openAlignment({ type: "action", id: selectedNoteAction.id, noteId: selectedNote?.id })}><span><Tag aria-hidden="true" size={16} /> {selectedNoteAction.alignment.kind === "goal" ? "Goal" : "Topic"}</span><strong>{goalName(selectedNoteAction.alignment)}</strong><ArrowRight aria-hidden="true" size={17} /></button><button className="people-row" type="button" data-testid="edit-action-people" onClick={() => openPeoplePicker({ type: "action", id: selectedNoteAction.id, noteId: selectedNote?.id })}><span className="sheet-action-icon"><Users aria-hidden="true" size={18} /></span><span><strong>{selectedNoteAction.ownerId ? `Owner · ${personName(selectedNoteAction.ownerId)}` : `Owner · ${selectedNoteAction.owner}`}</strong><small>{selectedNoteAction.peopleIds?.length ? selectedNoteAction.peopleIds.map(personName).join(", ") : "Review people involved"}</small></span><ArrowRight aria-hidden="true" size={17} /></button><button className="primary-button" type="button" data-testid="advance-note-action" onPointerDown={(event) => { event.preventDefault(); advanceNoteAction(); }}>{selectedNoteAction.state === "Draft" ? "Mark ready to review" : "Create action"} <ArrowRight aria-hidden="true" size={18} /></button></div> : null}
      </BottomSheet>

      <BottomSheet open={sheet === "noteExport"} onOpenChange={(open) => setSheet(open ? "noteExport" : null)} title="Export note" description="Review the package before it is exported locally." snap={0.54}>
        {selectedNote ? <div className="note-export-panel"><FileText aria-hidden="true" size={26} /><p>The export includes the reviewed transcript, summary, action item, source, tags, and correction history for “{selectedNote.title}”.</p><button className="primary-button" type="button" onClick={() => { updateSelectedNote((note) => ({ ...note, exported: true })); setSheet("noteDetail"); showNotice("Export ready."); }}>Prepare export</button></div> : null}
      </BottomSheet>

      <BottomSheet open={sheet === "noteShare"} onOpenChange={(open) => setSheet(open ? "noteShare" : null)} title={accountMode === "business" ? "Workspace access" : shareStep === "recipient" ? "Choose recipient" : "Review shared note"} description={accountMode === "business" ? "Grant read-only access to an approved directory person or workspace group." : shareStep === "recipient" ? "Choose who may receive a controlled, read-only viewer link." : "Confirm the reviewed package before you grant access."} snap={0.72}>
        {accountMode === "business" ? <div className="note-share-panel"><div className="share-steps" aria-label="Workspace access steps"><span className="is-complete">1. Choose access</span><span>2. Grant read-only access</span></div><div className="share-channel-options" role="group" aria-label="Workspace recipient type"><button type="button" className={workspaceRecipientType === "person" ? "is-selected" : ""} onClick={() => { setWorkspaceRecipientType("person"); setWorkspaceRecipientId("person-aarav"); }}>Directory people</button><button type="button" className={workspaceRecipientType === "group" ? "is-selected" : ""} onClick={() => { setWorkspaceRecipientType("group"); setWorkspaceRecipientId("group-product-design"); }}>Groups</button></div><div className="family-recipient-list">{workspaceRecipientType === "person" ? people.filter((person) => person.source === "Business directory").map((person) => <button className="action-card" type="button" key={person.id} onClick={() => setWorkspaceRecipientId(person.id)}><span className="sheet-action-icon"><Users aria-hidden="true" size={17} /></span><span><strong>{person.name}</strong><small>{person.role} · directory</small></span>{workspaceRecipientId === person.id ? <Check aria-hidden="true" size={17} /> : <ArrowRight aria-hidden="true" size={18} />}</button>) : initialWorkspaceGroups.map((group) => <button className="action-card" type="button" key={group.id} onClick={() => setWorkspaceRecipientId(group.id)}><span className="sheet-action-icon"><Users aria-hidden="true" size={17} /></span><span><strong>{group.name}</strong><small>{group.detail} · desktop-managed</small></span>{workspaceRecipientId === group.id ? <Check aria-hidden="true" size={17} /> : <ArrowRight aria-hidden="true" size={18} />}</button>)}</div><div className="share-package"><ShieldCheck aria-hidden="true" size={17} /><span>{workspaceRecipient?.name ?? "Selected recipient"} receives read-only access to this note. Group membership is managed in the desktop application.</span></div><button className="primary-button" type="button" data-testid="grant-workspace-note-access" onClick={grantWorkspaceNoteAccess}>Grant read-only access <Check aria-hidden="true" size={17} /></button><p className="sheet-footnote"><CircleHelp aria-hidden="true" size={15} /> Access is scoped to this note and can be revoked at any time.</p></div> : <div className="note-share-panel"><div className="share-steps" aria-label="Sharing steps"><span className="is-complete">1. Choose recipient</span><span className={shareStep === "review" ? "is-complete" : ""}>2. Review package</span><span>3. Approve link</span></div>{shareStep === "recipient" ? <><div className="share-channel-options" role="group" aria-label="Share channel">{(["Family", "Email", "WhatsApp", "Teams", "Slack"] as ShareChannel[]).map((channel) => <button type="button" key={channel} className={shareChannel === channel ? "is-selected" : ""} onClick={() => { setShareChannel(channel); resetShareApproval(); }}>{channel}</button>)}</div>{shareChannel === "Family" ? <div className="family-recipient-list">{connectedFamily.map((member) => <button className="action-card" type="button" key={member.id} onClick={() => { setShareFamilyId(member.id); resetShareApproval(); }}><span className="sheet-action-icon"><Users aria-hidden="true" size={17} /></span><span><strong>{member.name}</strong><small>{member.phone} · connected</small></span><ArrowRight aria-hidden="true" size={18} /></button>)}{connectedFamily.length === 0 ? <p className="note-empty-share">Connect a family member in Profile before sharing a note.</p> : null}</div> : <label className="manual-task-field" htmlFor="note-share-recipient"><span className="field-label">Authorized {shareChannel === "Email" ? "email recipient" : `${shareChannel} group or recipient`}</span><KeyboardInput id="note-share-recipient" value={shareRecipient} placeholder={shareChannel === "Email" ? "name@company.in" : "Authorized group name"} onChange={(event) => { setShareRecipient(event.currentTarget.value); resetShareApproval(); }} onBlur={() => keyboard.hide()} /></label>}<button className="primary-button" type="button" onPointerDown={(event) => { event.preventDefault(); confirmShareRecipient(); }}>Confirm recipient <ArrowRight aria-hidden="true" size={17} /></button></> : <><div className="share-package"><ShieldCheck aria-hidden="true" size={17} /><span>Complete reviewed package: audio, transcript, summary, action items, tags, and correction history.</span></div><p className="share-recipient-summary">Recipient: <strong>{shareChannel === "Family" ? selectedShareMember?.name : shareRecipient}</strong> · {shareChannel} controlled viewer link</p><button className="back-text-button" type="button" onClick={resetShareApproval}>Change recipient</button><button className="primary-button" type="button" data-testid="approve-note-share" disabled={!shareRecipientConfirmed || shareApproved} onPointerDown={(event) => { event.preventDefault(); approveNoteShare(); }}>Approve controlled link <Link2 aria-hidden="true" size={17} /></button></>}<p className="sheet-footnote"><CircleHelp aria-hidden="true" size={15} /> You can revoke access at any time.</p></div>}
      </BottomSheet>

      <BottomSheet open={sheet === "catchupSettings"} onOpenChange={(open) => setSheet(open ? "catchupSettings" : null)} title="Check-in timings" description="Choose the moments when you want to review your tasks." snap={0.8}>
        <div className="checkin-settings-panel"><div className="settings-page-heading"><span>Check-in timing</span><h3>Return to the work that matters, at the moments you choose.</h3><p>A scheduled reminder opens the same task-only check-in screen. Home stays your calm overview.</p></div><div className="timing-list">{checkinTimings.map((timing) => <div className="timing-row" key={timing.id}><button type="button" className={timing.enabled ? "timing-status is-on" : "timing-status"} aria-label={`${timing.enabled ? "Disable" : "Enable"} ${timing.time} check-in`} aria-pressed={timing.enabled} onClick={() => toggleCheckinTiming(timing.id)}><span /></button><KeyboardInput aria-label="Check-in time" value={timing.time} onChange={(event) => updateCheckinTiming(timing.id, event.currentTarget.value)} onBlur={() => keyboard.hide()} /><button type="button" className="timing-remove" aria-label={`Remove ${timing.time} check-in`} onClick={() => removeCheckinTiming(timing.id)}><Trash2 aria-hidden="true" size={17} /></button></div>)}</div><button className="text-button" type="button" data-testid="add-checkin-time" onClick={addCheckinTiming}><Plus aria-hidden="true" size={16} /> Add a time</button><button className="primary-button" type="button" data-testid="preview-checkin" onClick={openCheckin}>Open check-in <ArrowRight aria-hidden="true" size={17} /></button><p className="sheet-footnote"><Bell aria-hidden="true" size={15} /> Every reminder is an invitation to review tasks. It never starts recording or changes a task by itself.</p></div>
      </BottomSheet>

      <BottomSheet open={sheet === "familySharing"} onOpenChange={(open) => setSheet(open ? "familySharing" : null)} title="Family & sharing" description="Invite a family member by phone, then share only the notes you explicitly choose." snap={0.82}>
        <div className="family-sharing-panel"><div className="family-tabs" role="group" aria-label="Family sharing views"><button type="button" className={familyTab === "family" ? "is-selected" : ""} onClick={() => setFamilyTab("family")}>Family</button><button type="button" className={familyTab === "shared" ? "is-selected" : ""} onClick={() => setFamilyTab("shared")}>Shared with me</button></div>{familyTab === "family" ? <><div className="family-page-heading"><span>Read-only note access</span><h3>Family sees only notes you share.</h3><p>Members must accept an invitation before a note can be shared.</p></div><div className="family-member-list">{family.map((member) => <div className="family-member-card action-card" key={member.id}><span className="family-avatar">{member.name[0]}</span><div><strong>{member.name}</strong><small>{member.phone} · {member.status}</small></div>{member.status === "Connected" ? <button type="button" onClick={() => revokeFamilyMember(member)}>Revoke</button> : member.status === "Pending" ? <button type="button" onClick={() => revokeFamilyMember(member)}>Cancel invite</button> : <small>Revoked</small>}</div>)}</div><button className="primary-button" type="button" data-testid="open-family-invite" onClick={() => setSheet("familyInvite")}><Users aria-hidden="true" size={17} /> Invite family member</button></> : <SharedWithMeView notes={notes} family={family} onOpen={(noteId) => { openNote(noteId); }} />}</div>
      </BottomSheet>

      <BottomSheet open={sheet === "familyInvite"} onOpenChange={(open) => setSheet(open ? "familyInvite" : "familySharing")} title="Invite family member" description="Enter a phone number and confirm the invitation." snap={0.58}>
        <div className="family-invite-panel"><label className="manual-task-field" htmlFor="family-phone"><span className="field-label">Phone number</span><KeyboardInput id="family-phone" value={invitePhone} placeholder="+91 98••• 0000" onChange={(event) => setInvitePhone(event.currentTarget.value)} onBlur={() => keyboard.hide()} /></label><div className="share-package"><ShieldCheck aria-hidden="true" size={17} /><span>Pending members cannot view notes. Acceptance/verification is required before a note can be shared.</span></div><button className="primary-button" type="button" data-testid="send-family-invite" onPointerDown={(event) => { event.preventDefault(); inviteFamilyMember(); }}>Prepare invite confirmation <Send aria-hidden="true" size={17} /></button></div>
      </BottomSheet>

      <BottomSheet open={sheet === "search"} onOpenChange={(open) => setSheet(open ? "search" : null)} title="Search" description="Find approved work, notes, and goals in this workspace." snap={0.56}>
        <div className="search-panel"><label className="manual-task-field" htmlFor="workspace-search"><span className="field-label">Search this workspace</span><KeyboardInput id="workspace-search" placeholder="Tasks, notes, goals, or topics" onBlur={() => keyboard.hide()} /></label><div className="search-suggestions"><ActionCard icon={Target} title="Ship Capture V1" detail="Goal · 8 aligned items" onClick={() => { setView("goals"); setSheet(null); }} /><ActionCard icon={FileText} title="V1 scope and release trade-offs" detail="Note · Updated today" onClick={() => { openNote(initialNotes[0].id); }} /></div></div>
      </BottomSheet>

      <BottomSheet open={sheet === "askConversations"} onOpenChange={(open) => setSheet(open ? "askConversations" : null)} title="Conversations" description="Pinned and recent workspace chats." snap={0.72}>
        <div className="ask-conversation-list">{[true, false].map((pinned) => { const conversations = askConversations.filter((conversation) => Boolean(conversation.pinned) === pinned); return conversations.length ? <section key={String(pinned)}><h3>{pinned ? "Pinned" : "Recent"}</h3><div className="note-action-list">{conversations.map((conversation) => <div className="ask-conversation-row" key={conversation.id}><button type="button" onClick={() => { setActiveAskConversationId(conversation.id); setSheet(null); }}><span><strong>{conversation.title}</strong><small>{conversation.lastActivity}</small></span><ArrowRight aria-hidden="true" size={17} /></button><button type="button" aria-label={`${conversation.pinned ? "Unpin" : "Pin"} ${conversation.title}`} onClick={() => toggleAskPin(conversation.id)}><History aria-hidden="true" size={16} /></button></div>)}</div></section> : null; })}<button className="primary-button" type="button" onClick={createAskConversation}><Plus aria-hidden="true" size={18} /> New chat</button></div>
      </BottomSheet>

      <AppDrawer
        open={sheet === "menu"}
        onOpenChange={(open) => setSheet(open ? "menu" : null)}
      >
        <div className="drawer-account-summary"><span className="drawer-avatar" aria-hidden="true">SC</span><div><strong>Subhodyuti Chakraborty</strong><small>{accountMode === "business" ? "Floydee Innovations" : "Personal space"}</small></div></div>
        <button className="drawer-context-button" type="button" onClick={() => { setAccountMode((mode) => mode === "business" ? "individual" : "business"); setSheet(null); }}>{accountMode === "business" ? "Use personal space" : "Switch to Floydee Innovations"}<ArrowRight aria-hidden="true" size={16} /></button>
        <div className="profile-groups"><section><h3>Account</h3><div className="sheet-action-list"><SheetAction icon={Home} label="Account" detail="Identity and plan ownership" onClick={() => chooseCapture("Account")} /></div></section><section><h3>Capture & connections</h3><div className="sheet-action-list"><SheetAction icon={PhoneCall} label="Device" detail="Capture Lite and app device state" onClick={() => chooseCapture("Device")} /><SheetAction icon={Bell} label="Check-in timings" detail="Task-review moments" onClick={() => setSheet("catchupSettings")} /><SheetAction icon={Users} label="Contacts & people" detail="Permissioned people and source matching" onClick={() => setSheet("contacts")} /><SheetAction icon={Network} label="Integrations" detail="Calendar, email, and connected sources" onClick={() => chooseCapture("Integrations")} /></div></section><section><h3>Sharing</h3><div className="sheet-action-list"><SheetAction icon={Users} label="Family & sharing" detail="Invite by phone and manage note access" onClick={() => { setFamilyTab("family"); setSheet("familySharing"); }} /></div></section><section><h3>Privacy</h3><div className="sheet-action-list"><SheetAction icon={ShieldCheck} label="Privacy controls" detail="Permissions, export, delete, and audit" onClick={() => chooseCapture("Privacy")} /></div></section><section><h3>Plan</h3><div className="sheet-action-list"><SheetAction icon={FileText} label="Subscription" detail="Billing and product access" onClick={() => chooseCapture("Subscription")} /></div></section></div>
        <div className="control-group">
          <span className="control-label">Appearance</span>
          <div className="segmented-control" role="group" aria-label="Appearance">
            {(["light", "dark"] as Theme[]).map((option) => (
              <button
                type="button"
                key={option}
                aria-pressed={theme === option}
                className={theme === option ? "is-selected" : ""}
                onClick={() => setTheme(option)}
              >
                {option[0].toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="control-group">
          <span className="control-label">View state</span>
          <div className="state-control" role="group" aria-label="View state">
            {demoStates.map((option) => (
              <button
                type="button"
                key={option}
                aria-pressed={demoState === option}
                className={demoState === option ? "is-selected" : ""}
                onClick={() => setDemoState(option)}
              >
                {option[0].toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </AppDrawer>
    </div>
  );
}

function AppDrawer({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  const { screenRef } = useScreenPortal();
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal container={screenRef.current ?? undefined}><Dialog.Overlay className="drawer-overlay" data-testid="drawer-overlay" /><Dialog.Content className="app-drawer" aria-label="Profile and app menu" data-testid="app-drawer"><div className="drawer-topline"><Dialog.Title>Profile</Dialog.Title><Dialog.Close className="icon-button" aria-label="Close profile and app menu"><XCircle aria-hidden="true" size={20} /></Dialog.Close></div><div className="drawer-content">{children}</div></Dialog.Content></Dialog.Portal></Dialog.Root>;
}

function AudioCaptureControl({
  state,
  seconds,
  onStart,
  onStop,
  onCreate,
  onReset,
  onManualTask,
  noteMode = false,
}: {
  state: AudioState;
  seconds: number;
  onStart: () => void;
  onStop: () => void;
  onCreate: () => void;
  onReset: () => void;
  onManualTask: () => void;
  noteMode?: boolean;
}) {
  const label = state === "recording" ? `Listening · 0:${String(seconds).padStart(2, "0")}` : state === "ready" ? "Voice note ready" : state === "processing" ? "Creating tasks" : state === "created" ? "Tasks created" : "Speak to add tasks";

  return (
    <div className="audio-capture" data-audio-state={state}>
      <button
        className="audio-button"
        type="button"
        aria-label={state === "recording" ? "Stop voice capture" : "Start voice capture"}
        onClick={state === "recording" ? onStop : onStart}
        disabled={state === "processing"}
      >
        {state === "recording" ? <Check aria-hidden="true" size={24} strokeWidth={2.4} /> : <Mic aria-hidden="true" size={24} strokeWidth={2.3} />}
      </button>
      <div className="audio-copy">
        <strong>{label}</strong>
        <span>{noteMode ? "Explicit capture only. Stop stays local and visible." : "Optional voice update. Review proposals before anything changes."}</span>
      </div>
      {state === "ready" ? (
        <button className="audio-create-button" type="button" onClick={onCreate}>
          {noteMode ? "Review voice note" : "Review proposed changes"}
        </button>
      ) : null}
      {state === "created" ? (
        <button className="audio-create-button" type="button" onClick={onReset}>
          {noteMode ? "Record another note" : "Record again"}
        </button>
      ) : null}
      {state === "idle" && !noteMode ? (
        <button className="audio-secondary-button" type="button" onClick={onManualTask}>
          Add manually
        </button>
      ) : null}
    </div>
  );
}

function NotesView({ notes, onOpen, onCapture }: { notes: Note[]; onOpen: (noteId: string) => void; onCapture: () => void }) {
  return (
    <section className="notes-view" aria-labelledby="notes-heading">
      <div className="page-intro notes-hero"><span>Personal Private Graph</span><h1 id="notes-heading">Notes</h1><p>Capture context, inspect what was derived, and decide what should happen next.</p><button className="primary-button" type="button" data-testid="open-note-capture" onClick={onCapture}><Mic aria-hidden="true" size={18} /> Capture a note</button></div>
      <div className="notes-list-heading"><h2>Recent notes</h2><span>{notes.length} notes</span></div>
      <div className="notes-list">{notes.map((note) => <button className="note-row" type="button" key={note.id} onClick={() => onOpen(note.id)}><span className="note-source-icon">{note.source === "Voice note" ? <Mic aria-hidden="true" size={18} /> : <FileText aria-hidden="true" size={18} />}</span><span className="note-row-copy"><strong>{note.title}</strong><span>{note.source} · {note.capturedAt}</span><span className="tag-list">{note.tags.slice(0, 2).map((tag) => <i key={tag}>{tag}</i>)}</span></span><span className="note-processing">{note.processing}</span></button>)}</div>
      <p className="learning-note">Your notes stay private until you choose to share them.</p>
    </section>
  );
}

function SharedWithMeView({ notes, family, onOpen }: { notes: Note[]; family: FamilyMember[]; onOpen: (noteId: string) => void }) {
  const connectedIds = new Set(family.filter((member) => member.status === "Connected").map((member) => member.id));
  const sharedNotes = notes.filter((note) => note.shares?.some((share) => share.status === "Active" && share.memberId && connectedIds.has(share.memberId)));
  return <div className="shared-with-me"><div className="family-page-heading"><span>Family member concept view</span><h3>Only explicitly shared notes appear here.</h3><p>Read-only access includes the complete reviewed note package, not the rest of your private context.</p></div>{sharedNotes.length ? <div className="notes-list">{sharedNotes.map((note) => <button className="note-row" type="button" key={note.id} onClick={() => onOpen(note.id)}><span className="note-source-icon"><Link2 aria-hidden="true" size={18} /></span><span className="note-row-copy"><strong>{note.title}</strong><span>Shared note · transcript, summary, actions, tags</span></span><span className="note-processing">Read only</span></button>)}</div> : <div className="shared-empty"><Link2 aria-hidden="true" size={21} /><p>No notes have been shared with a connected family member.</p></div>}</div>;
}

function CalendarDayPicker({ days, selectedDate, onSelect, onPrevious, onNext }: { days: Date[]; selectedDate: string; onSelect: (date: string) => void; onPrevious: () => void; onNext: () => void }) {
  const selectedIndex = days.findIndex((day) => calendarDateKey(day) === selectedDate);
  const start = Math.max(0, Math.min(selectedIndex - 2, days.length - 5));
  const visibleDays = days.slice(start, start + 5);
  return <div className="calendar-day-picker" aria-label="Select a date"><button type="button" aria-label="Previous week" onClick={onPrevious}><ArrowLeft aria-hidden="true" size={17} /></button><div className="calendar-date-row">{visibleDays.map((day) => { const key = calendarDateKey(day); const selected = key === selectedDate; const today = key === calendarDateKey(calendarReferenceDate); return <button key={key} type="button" aria-label={calendarDateLabel(day)} aria-pressed={selected} data-today={today || undefined} className={selected ? "is-selected" : ""} onClick={() => onSelect(key)}><span>{new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(day)}</span><strong>{day.getDate()}</strong></button>; })}</div><button type="button" aria-label="Next week" onClick={onNext}><ArrowRight aria-hidden="true" size={17} /></button></div>;
}

function CalendarStrip({ days, selectedDate, eventCount, onSelect, onPrevious, onNext, onOpen }: { days: Date[]; selectedDate: string; eventCount: number; onSelect: (date: string) => void; onPrevious: () => void; onNext: () => void; onOpen: () => void }) {
  const label = selectedDate === calendarDateKey(calendarReferenceDate) ? "Today" : calendarDateLabel(new Date(`${selectedDate}T12:00:00`));
  return <section className="calendar-strip" aria-label="Schedule"><div className="calendar-strip-heading"><div><span>Schedule</span><strong>{label}</strong><small>{eventCount ? `${eventCount} scheduled ${eventCount === 1 ? "item" : "items"}` : "No scheduled items"}</small></div><button className="calendar-open-button" type="button" aria-label="Open calendar" onClick={onOpen}><CalendarDays aria-hidden="true" size={19} /><span>Calendar</span></button></div><CalendarDayPicker days={days} selectedDate={selectedDate} onSelect={onSelect} onPrevious={onPrevious} onNext={onNext} /></section>;
}

function formatGoalTarget(value: string) {
  if (!value) return "Target date not set";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "Target date not set";
  return `Target · ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(target)}`;
}

function CalendarAgendaRow({ event, onOpenItem }: { event: CalendarEvent; onOpenItem: (id: string) => void }) {
  const content = <><time>{event.time}</time><span><strong>{event.title}</strong><small>{event.kind} · {event.duration} · {event.source}</small></span>{event.itemId ? <ArrowRight aria-hidden="true" size={18} /> : <CalendarDays aria-hidden="true" size={18} />}</>;
  return event.itemId ? <button type="button" className="calendar-agenda-row" onClick={() => onOpenItem(event.itemId!)}>{content}</button> : <div className="calendar-agenda-row calendar-agenda-block">{content}</div>;
}

function TaskListToolbar({ id, mode, hideCompleted, onToggle, onToggleCompleted }: { id: string; mode: TaskSortMode; hideCompleted: boolean; onToggle: () => void; onToggleCompleted: () => void }) {
  return <div className="task-list-toolbar"><h2 id={id}>Tasks</h2><div><button type="button" className="task-filter-button" aria-label={hideCompleted ? "Show completed tasks" : "Hide completed tasks"} aria-pressed={hideCompleted} onClick={onToggleCompleted}><CheckCircle2 aria-hidden="true" size={19} /></button><button type="button" className="task-sort-button" aria-pressed={mode === "time"} onClick={onToggle}><ArrowUpDown aria-hidden="true" size={16} /> {mode === "manual" ? "Manual order" : "Time order"}</button></div></div>;
}

function CalendarMonthGrid({ month, selectedDate, events, onSelect }: { month: Date; selectedDate: string; events: CalendarEvent[]; onSelect: (date: string) => void }) {
  const days = buildCalendarMonthDays(month);
  const monthIndex = month.getMonth();
  return <section className="calendar-month-grid" aria-label={`${calendarMonthLabel(month)} dates`}><div className="calendar-weekdays" aria-hidden="true">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-month-days">{days.map((day) => { const key = calendarDateKey(day); const entries = events.filter((event) => event.date === key); const selected = selectedDate === key; const isToday = key === calendarDateKey(calendarReferenceDate); const isOutsideMonth = day.getMonth() !== monthIndex; return <button key={key} className={`calendar-month-day ${selected ? "is-selected" : ""}`} type="button" aria-label={`${calendarDateLabel(day)}${entries.length ? `, ${entries.length} scheduled` : ", no scheduled items"}`} aria-pressed={selected} data-today={isToday || undefined} data-outside-month={isOutsideMonth || undefined} onClick={() => onSelect(key)}><span className="calendar-day-number">{day.getDate()}</span><span className="calendar-day-entries">{entries.slice(0, 2).map((event) => <i key={event.id}>{event.title}</i>)}{entries.length > 2 ? <em>+{entries.length - 2} more</em> : null}</span></button>; })}</div></section>;
}

function CalendarView({ month, selectedDate, events, tasks, schedule, sortMode, hideCompleted, draggedTaskId, dragOverTaskId, onBack, onMonthChange, onSelect, onToggleSort, onToggleCompleted, onOpenItem, onToggleItem, onDragStart, onDragMove, onDragEnd }: { month: Date; selectedDate: string; events: CalendarEvent[]; tasks: TodayItem[]; schedule: CalendarEvent[]; sortMode: TaskSortMode; hideCompleted: boolean; draggedTaskId: string | null; dragOverTaskId: string | null; onBack: () => void; onMonthChange: (month: Date) => void; onSelect: (date: string) => void; onToggleSort: () => void; onToggleCompleted: () => void; onOpenItem: (id: string) => void; onToggleItem: (id: string) => void; onDragStart: (event: ReactPointerEvent<HTMLButtonElement>, taskId: string) => void; onDragMove: (event: ReactPointerEvent<HTMLButtonElement>) => void; onDragEnd: (event: ReactPointerEvent<HTMLElement>) => void }) {
  const selectedDay = new Date(`${selectedDate}T12:00:00`);
  const label = selectedDate === calendarDateKey(calendarReferenceDate) ? "Today" : calendarDateLabel(selectedDay);
  const years = [month.getFullYear() - 1, month.getFullYear(), month.getFullYear() + 1];
  const months = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat("en-IN", { month: "long" }).format(new Date(2026, index, 1)));
  const changeMonth = (amount: number) => onMonthChange(new Date(month.getFullYear(), month.getMonth() + amount, 1));
  return <section className="calendar-view" aria-labelledby="calendar-heading" data-testid="calendar-view"><header className="calendar-view-header"><div><span className="calendar-eyebrow">Schedule</span><h1 id="calendar-heading">Calendar</h1></div><button className="calendar-back-button" type="button" aria-label="Back to Home" onClick={onBack}><ArrowLeft aria-hidden="true" size={17} /></button></header><section className="calendar-month-controls" aria-label="Calendar month"><button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}><ArrowLeft aria-hidden="true" size={18} /></button><div><label><span className="sr-only">Month</span><select aria-label="Month" value={month.getMonth()} onChange={(event) => onMonthChange(new Date(month.getFullYear(), Number(event.currentTarget.value), 1))}>{months.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label><label><span className="sr-only">Year</span><select aria-label="Year" value={month.getFullYear()} onChange={(event) => onMonthChange(new Date(Number(event.currentTarget.value), month.getMonth(), 1))}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div><button type="button" aria-label="Next month" onClick={() => changeMonth(1)}><ArrowRight aria-hidden="true" size={18} /></button></section><CalendarMonthGrid month={month} selectedDate={selectedDate} events={events} onSelect={onSelect} /><section className="calendar-agenda" aria-labelledby="agenda-heading"><div className="calendar-agenda-heading"><div><h2 id="agenda-heading">{label}</h2><span>{tasks.length + schedule.length} scheduled</span></div></div>{tasks.length ? <><TaskListToolbar id="calendar-tasks-heading" mode={sortMode} hideCompleted={hideCompleted} onToggle={onToggleSort} onToggleCompleted={onToggleCompleted} /><div className="today-list calendar-task-list" aria-labelledby="calendar-tasks-heading">{tasks.map((item) => <TodayRow key={item.id} item={item} draggable={sortMode === "manual"} dragged={draggedTaskId === item.id} dropTarget={dragOverTaskId === item.id && draggedTaskId !== item.id} onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd} onToggle={() => onToggleItem(item.id)} onOpen={() => onOpenItem(item.id)} />)}</div></> : null}{schedule.length ? <><div className="calendar-schedule-heading"><h3>Schedule</h3><span>Meetings & commitments</span></div><div className="calendar-agenda-list">{schedule.map((event) => <CalendarAgendaRow key={event.id} event={event} onOpenItem={onOpenItem} />)}</div></> : null}{!tasks.length && !schedule.length ? <div className="calendar-empty">No scheduled items for this day.</div> : null}<p className="calendar-capacity-note">Schedule is shown here; delivery capacity is assessed separately.</p></section></section>;
}

function CheckinView({ time, tasks, timings, draggedTaskId, dragOverTaskId, onBack, onOpen, onToggle, onDragStart, onDragMove, onDragEnd, onAdd, onVoice }: { time: string; tasks: TodayItem[]; timings: CheckinTiming[]; draggedTaskId: string | null; dragOverTaskId: string | null; onBack: () => void; onOpen: (taskId: string) => void; onToggle: (taskId: string) => void; onDragStart: (event: ReactPointerEvent<HTMLButtonElement>, taskId: string) => void; onDragMove: (event: ReactPointerEvent<HTMLButtonElement>) => void; onDragEnd: (event: ReactPointerEvent<HTMLButtonElement>) => void; onAdd: () => void; onVoice: () => void }) {
  const isMorning = time === timings.filter((timing) => timing.enabled).sort((a, b) => a.time.localeCompare(b.time))[0]?.time;
  const nextTiming = timings.find((timing) => timing.enabled && timing.time > time)?.time ?? "—";
  return <section className="checkin-view" aria-labelledby="checkin-heading" data-testid="checkin-view"><header className="checkin-header"><button className="checkin-back" type="button" aria-label="Back to Home" onClick={onBack}><ArrowLeft aria-hidden="true" size={20} /></button><div><span>{time} check-in</span><h1 id="checkin-heading">{isMorning ? "Good morning" : "Review what changed since morning."}</h1></div></header><p className="checkin-next">{isMorning ? "Here’s your plan for today." : `Next check-in ${nextTiming}`}</p><div className="checkin-list" aria-label="Check-in tasks">{tasks.map((task) => <article key={task.id} className="checkin-task-row" data-checkin-task-id={task.id} data-dragging={draggedTaskId === task.id ? "true" : "false"} data-drop-target={dragOverTaskId === task.id && draggedTaskId !== task.id ? "true" : "false"}><button className="task-drag-handle" type="button" aria-label={`Drag ${task.title}`} data-scroll-drag="ignore" onPointerDown={(event) => onDragStart(event, task.id)} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}><span /><span /><span /><span /><span /><span /></button><button className={`checkin-completion ${task.complete ? "is-complete" : ""}`} type="button" aria-label={task.complete ? `Mark ${task.title} not done` : `Mark ${task.title} done`} onClick={() => onToggle(task.id)}>{task.complete ? <Check aria-hidden="true" size={18} strokeWidth={2.3} /> : null}</button><button className="checkin-task-copy" type="button" onClick={() => onOpen(task.id)}><strong>{task.title}</strong><span>{task.complete ? "Completed this check-in" : task.window}</span></button></article>)}</div><div className="checkin-actions"><button type="button" data-testid="checkin-add-task" onClick={onAdd}><Plus aria-hidden="true" size={21} /> Add task</button><button type="button" data-testid="checkin-record-update" onClick={onVoice}><Mic aria-hidden="true" size={21} /><span>Record update<small>Review first</small></span></button></div></section>;
}

function TodayRow({ item, atRisk = false, draggable = false, dragged = false, dropTarget = false, onDragStart, onDragMove, onDragEnd, onToggle, onOpen }: { item: TodayItem; atRisk?: boolean; draggable?: boolean; dragged?: boolean; dropTarget?: boolean; onDragStart?: (event: ReactPointerEvent<HTMLButtonElement>, taskId: string) => void; onDragMove?: (event: ReactPointerEvent<HTMLButtonElement>) => void; onDragEnd?: (event: ReactPointerEvent<HTMLElement>) => void; onToggle: () => void; onOpen: () => void }) {
  const person = personForWork(item.title);
  return (
    <article className="today-row" data-task-id={draggable ? item.id : undefined} data-draggable={draggable || undefined} data-dragging={dragged || undefined} data-drop-target={dropTarget || undefined} data-complete={item.complete ? "true" : "false"}>
      <button className={`item-status today-completion ${item.complete ? "is-complete" : ""}`} type="button" aria-label={item.complete ? `Mark ${item.title} not done` : `Mark ${item.title} done`} onClick={onToggle}>
        {item.complete ? <Check size={15} strokeWidth={2.5} /> : null}
      </button>
      <button className="today-row-main" type="button" onClick={onOpen} aria-label={`Open ${item.title}`}>
        <span className="item-copy">
        <span className="item-topline">
          <strong>{item.title}</strong>
          {item.prioritized ? <span className="priority-mark">Priority</span> : null}
          {item.renegotiated ? <span className="priority-mark">Drafted</span> : null}
        </span>
        <span className="item-meta">{item.kind} · {item.window} · {item.effort}{person ? <span className="person-chip" title={`${person.name} · ${person.role}`}><i>{person.initials}</i>{person.name}</span> : null}</span>
        {atRisk ? <span className="inline-risk"><AlertTriangle aria-hidden="true" size={14} /> At risk · review delivery options</span> : null}
        <span className="today-source-meta"><SourcePill item={item} /></span>
        </span>
        {!draggable ? <MoreHorizontal className="row-arrow" aria-hidden="true" size={19} /> : null}
      </button>
      {draggable ? <button className="today-drag-handle" type="button" aria-label={`Drag ${item.title}`} data-scroll-drag="ignore" onPointerDown={(event) => onDragStart?.(event, item.id)} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}><GripVertical aria-hidden="true" size={19} /></button> : null}
    </article>
  );
}

function GoalsView({ goals, topics, projects, items, notes, tab, onTabChange, onOpenGoal, onOpenTopic, onOpenProject, onCreateGoal, onCreateProject }: { goals: Goal[]; topics: Topic[]; projects: Project[]; items: TodayItem[]; notes: Note[]; tab: "goals" | "topics" | "projects"; onTabChange: (tab: "goals" | "topics" | "projects") => void; onOpenGoal: (id: string) => void; onOpenTopic: (id: string) => void; onOpenProject: (id: string) => void; onCreateGoal: () => void; onCreateProject: () => void }) {
  const topLevelGoals = goals.filter((goal) => !goal.parentId);
  const card = (icon: typeof Target, title: string, detail: string, meta: string, state: string | undefined, onClick: () => void) => <button key={title} className="goal-card action-card" type="button" onClick={onClick}><span className="sheet-action-icon">{icon === Target ? <Target aria-hidden="true" size={19} /> : icon === Tag ? <Tag aria-hidden="true" size={19} /> : <FolderKanban aria-hidden="true" size={19} />}</span><span className="goal-card-copy"><strong>{title}</strong><small>{detail}</small><em>{meta}</em></span>{state ? <span className="action-state">{state}</span> : null}<ArrowRight aria-hidden="true" size={18} /></button>;
  return <section className="goals-view" aria-labelledby="goals-heading"><header className="page-intro goals-header"><span>Founder outcomes</span><h1 id="goals-heading">Goals</h1><p>Organise outcomes and context around the work that matters.</p></header><div className="goals-tabs goals-tabs-three" role="tablist" aria-label="Goals content"><button type="button" role="tab" aria-selected={tab === "topics"} className={tab === "topics" ? "is-active" : ""} onClick={() => onTabChange("topics")}><span>Topics</span><small>{topics.length}</small></button><button type="button" role="tab" aria-selected={tab === "goals"} className={tab === "goals" ? "is-active" : ""} onClick={() => onTabChange("goals")}><span>Goals</span><small>{topLevelGoals.length}</small></button><button type="button" role="tab" aria-selected={tab === "projects"} className={tab === "projects" ? "is-active" : ""} onClick={() => onTabChange("projects")}><span>Projects</span><small>{projects.length}</small></button></div><button className="primary-button goals-create-button" type="button" data-testid={tab === "projects" ? "open-project-create" : "open-goal-create"} onClick={tab === "projects" ? onCreateProject : onCreateGoal}><Plus aria-hidden="true" size={18} /> {tab === "projects" ? "Create project" : "Create goal"}</button>{tab === "goals" ? <div className="goal-card-list note-action-list">{topLevelGoals.map((goal) => { const children = goals.filter((child) => child.parentId === goal.id); const aligned = alignedWorkCount(items, notes, { kind: "goal", id: goal.id }) + children.reduce((count, child) => count + alignedWorkCount(items, notes, { kind: "goal", id: child.id }), 0); return card(Target, goal.title, goal.outcome, `${goal.horizon} · ${goal.status} · ${aligned} aligned`, `${goal.progress}%`, () => onOpenGoal(goal.id)); })}</div> : tab === "topics" ? <div className="goal-card-list note-action-list">{topics.map((topic) => card(Tag, topic.title, topic.detail, `${topic.activity} · ${alignedWorkCount(items, notes, { kind: "topic", id: topic.id })} aligned`, "Topic", () => onOpenTopic(topic.id)))}<p className="goals-footnote"><FolderKanban aria-hidden="true" size={15} /> Topics group related context until you decide it should become an outcome.</p></div> : <div className="goal-card-list note-action-list">{projects.map((project) => { const projectGoals = goals.filter((goal) => goal.projectId === project.id); const projectTopics = topics.filter((topic) => topic.projectId === project.id); return card(FolderKanban, project.title, project.purpose, `${projectGoals.length} goals · ${projectTopics.length} topics`, undefined, () => onOpenProject(project.id)); })}</div>}</section>;
}

function alignedWorkCount(items: TodayItem[], notes: Note[], alignment: Alignment) {
  const same = (candidate: Alignment) => candidate.kind === alignment.kind && candidate.id === alignment.id;
  return items.filter((item) => same(item.alignment)).length + notes.filter((note) => same(note.alignment)).length + notes.flatMap((note) => note.actions ?? []).filter((action) => same(action.alignment)).length;
}

function AlignedWorkList({ items, notes, people = initialPeople, alignment, onOpenItem, onOpenNote, onOpenAction }: { items: TodayItem[]; notes: Note[]; people?: Person[]; alignment: Alignment; onOpenItem: (id: string) => void; onOpenNote: (id: string) => void; onOpenAction: (noteId: string, actionId: string) => void }) {
  const same = (candidate: Alignment) => candidate.kind === alignment.kind && candidate.id === alignment.id;
  const actions = notes.flatMap((note) => (note.actions ?? []).filter((action) => same(action.alignment)).map((action) => ({ noteId: note.id, action })));
  const names = (ids?: string[]) => ids?.map((id) => people.find((person) => person.id === id)?.name).filter(Boolean).join(", ");
  return <div className="note-action-list aligned-work-list">{items.filter((item) => same(item.alignment)).map((item) => <ActionCard key={item.id} icon={CheckCircle2} title={item.title} detail={`${item.kind} · ${names(item.peopleIds) || "No people linked"}`} onClick={() => onOpenItem(item.id)} />)}{notes.filter((note) => same(note.alignment)).map((note) => <ActionCard key={note.id} icon={FileText} title={note.title} detail={`${note.source} · ${names(note.peopleIds) || "No participants linked"}`} onClick={() => onOpenNote(note.id)} />)}{actions.map(({ noteId, action }) => <ActionCard key={action.id} icon={action.kind === "meeting" ? CalendarPlus : action.kind === "jira" ? ClipboardCheck : UserRoundPlus} title={action.title} detail={`${action.source} · ${names(action.peopleIds) || action.owner}`} state={action.state} onClick={() => onOpenAction(noteId, action.id)} />)}</div>;
}

function AskView({ conversation, messages, onSend, onOpenEvidence, onOpenConversations, onNewConversation }: { conversation: AskConversation; messages: AskMessage[]; onSend: (value?: string) => void; onOpenEvidence: (evidence: NonNullable<AskMessage["evidence"]>[number]) => void; onOpenConversations: () => void; onNewConversation: () => void }) {
  const prompts = ["What needs attention today?", "Who is involved in Capture V1?", "How is the enterprise pilot progressing?"];
  return <section className="ask-view" aria-labelledby="ask-heading"><h1 id="ask-heading" className="sr-only">Ask</h1><header className="ask-header"><button type="button" className="ask-conversation-trigger" onClick={onOpenConversations}><span><small>Ask</small><strong>{conversation.title}</strong></span><ChevronDown aria-hidden="true" size={18} /></button><button className="icon-button" type="button" aria-label="New workspace chat" onClick={onNewConversation}><Plus aria-hidden="true" size={21} /></button></header><div className="ask-thread" aria-live="polite">{messages.length ? messages.map((message) => <article key={message.id} className={`ask-message is-${message.role}`}><p>{message.text}</p>{message.evidence?.map((evidence) => <button className="ask-evidence" key={`${message.id}-${evidence.id}`} type="button" onClick={() => onOpenEvidence(evidence)}><span>{evidence.kind === "person" ? <Users aria-hidden="true" size={16} /> : evidence.kind === "project" ? <FolderKanban aria-hidden="true" size={16} /> : <Target aria-hidden="true" size={16} />}</span><strong>{evidence.label}</strong><small>{evidence.detail}</small><ArrowRight aria-hidden="true" size={16} /></button>)}</article>) : <div className="ask-empty"><MessageCircle aria-hidden="true" size={24} /><strong>What would you like to understand?</strong><p>Ask about delivery, people, projects, goals, topics, or upcoming work.</p></div>}</div>{!messages.length ? <div className="ask-prompts">{prompts.map((prompt) => <button key={prompt} type="button" onClick={() => onSend(prompt)}>{prompt}<ArrowRight aria-hidden="true" size={16} /></button>)}</div> : null}</section>;
}

function AskComposer({ input, onInput, onSend, onVoice }: { input: string; onInput: (value: string) => void; onSend: () => void; onVoice: () => void }) {
  const { bottomInset } = useKeyboardInsets();
  return <form className="ask-composer" style={{ "--ask-composer-keyboard-inset": `${bottomInset}px` } as CSSProperties} onSubmit={(event) => { event.preventDefault(); onSend(); }}><button className="ask-mic-button" type="button" aria-label="Start voice question" onClick={onVoice}><Mic aria-hidden="true" size={20} /></button><KeyboardInput aria-label="Ask your workspace" value={input} placeholder="Ask Floydee Connect" onChange={(event) => onInput(event.currentTarget.value)} /><button type="submit" aria-label="Send question" disabled={!input.trim()}><Send aria-hidden="true" size={18} /></button></form>;
}

function SourcePill({ item }: { item: TodayItem }) {
  const Icon = sourceIcon(item.source);

  return (
    <span className="source-row">
      <span className="source-pill" data-source-state={item.sourceState}>
        <Icon aria-hidden="true" size={13} />
        {sourceDescription(item.source, item.sourceState)}
      </span>
      <span>{item.freshness}</span>
      <span>{item.confidence}</span>
      <span>{item.permission}</span>
    </span>
  );
}

function ActionButton({ icon: Icon, label, detail, onClick }: { icon: typeof Home; label: string; detail: string; onClick: () => void }) {
  return (
    <button className="action-button action-card" type="button" onClick={onClick}>
      <span className="sheet-action-icon"><Icon aria-hidden="true" size={19} /></span>
      <span><strong>{label}</strong><small>{detail}</small></span>
    </button>
  );
}

function ActionCard({ icon: Icon, title, detail, state, onClick }: { icon: typeof Home; title: string; detail: string; state?: string; onClick?: () => void }) {
  const content = <><span className="sheet-action-icon"><Icon aria-hidden="true" size={19} /></span><span><strong>{title}</strong><small>{detail}</small></span>{state ? <span className="action-state">{state}</span> : null}<ArrowRight aria-hidden="true" size={18} /></>;
  return onClick ? <button className="action-card" type="button" onClick={onClick}>{content}</button> : <div className="action-card">{content}</div>;
}

function NavItem({ icon: Icon, label, active = false, onClick }: { icon: typeof Home; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button className="nav-item" type="button" aria-current={active ? "page" : undefined} onClick={onClick}>
      <span className="nav-icon"><Icon aria-hidden="true" size={21} strokeWidth={active ? 2.3 : 1.9} /></span>
      <span>{label}</span>
    </button>
  );
}

function SheetAction({ icon: Icon, label, detail, onClick }: { icon: typeof Home; label: string; detail: string; onClick: () => void }) {
  return (
    <button className="sheet-action action-card" type="button" onClick={onClick}>
      <span className="sheet-action-icon"><Icon aria-hidden="true" size={20} /></span>
      <span><strong>{label}</strong><small>{detail}</small></span>
      <ArrowRight aria-hidden="true" size={18} />
    </button>
  );
}

function LoadingView() {
  return (
    <div className="loading-view" role="status" aria-label="Loading daily brief">
      <div className="skeleton skeleton-hero" />
      <div className="skeleton skeleton-heading" />
      <div className="skeleton skeleton-card" />
      <span className="sr-only">Loading daily brief</span>
    </div>
  );
}

function EmptyView({ onCapture }: { onCapture: () => void }) {
  return (
    <section className="centered-state" aria-labelledby="empty-heading">
      <span className="state-icon"><CalendarDays aria-hidden="true" size={25} /></span>
      <h1 id="empty-heading">Your day is ready for context</h1>
      <p>Connect a source or capture a commitment to create your first capacity brief.</p>
      <button className="primary-button" type="button" onClick={onCapture}>Capture a commitment</button>
    </section>
  );
}

function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="centered-state error-state" aria-labelledby="error-heading">
      <span className="state-icon error-icon"><XCircle aria-hidden="true" size={25} /></span>
      <h1 id="error-heading">Today’s brief could not refresh</h1>
      <p>Your last confirmed commitments are unchanged. No actions were taken.</p>
      <button className="primary-button" type="button" onClick={onRetry}>Try again</button>
    </section>
  );
}
