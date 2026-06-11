import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  addDoc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { Project } from "@/types";

export type Role = "owner" | "editor" | "viewer";

export interface CollabMemberDoc {
  role: Role;
  displayName: string;
  email: string;
  photoURL: string;
  joinedAt: Timestamp | null;
}

export interface CollabProjectDoc {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  lastEditedBy?: string;
  lastEditedByName?: string;
  memberIds: string[];
  data: {
    abcItems: Project["abcItems"];
    dupaItems: Project["dupaItems"];
    settings: Project["settings"];
    versions: Project["versions"];
    location?: string;
    contractor?: string;
    activePriceListYearId?: string;
  };
}

export interface InviteDoc {
  role: Role;
  createdBy: string;
  expiresAt: Timestamp | null;
  used: boolean;
  projectId: string;
}

export interface PresenceDoc {
  uid: string;
  displayName: string;
  photoURL: string;
  color: string;
  lastSeen: Timestamp | null;
  currentTab?: string;
}

export interface ActivityDoc {
  uid: string;
  displayName: string;
  action: string;
  target?: string;
  at: Timestamp | null;
}

export const projectRef = (pid: string) => doc(db, "collabProjects", pid);
export const membersCol = (pid: string) => collection(db, "collabProjects", pid, "members");
export const memberRef = (pid: string, uid: string) =>
  doc(db, "collabProjects", pid, "members", uid);
export const invitesCol = (pid: string) => collection(db, "collabProjects", pid, "invites");
export const inviteRef = (pid: string, token: string) =>
  doc(db, "collabProjects", pid, "invites", token);
export const presenceCol = (pid: string) => collection(db, "collabProjects", pid, "presence");
export const presenceRef = (pid: string, uid: string) =>
  doc(db, "collabProjects", pid, "presence", uid);
export const activityCol = (pid: string) => collection(db, "collabProjects", pid, "activity");

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#a855f7",
];
export function colorForUid(uid: string) {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function defaultSettings() {
  return { ocmPercent: 8, profitPercent: 8, vatPercent: 12, dupaIndirectCostPercent: 16, dupaVatPercent: 12 };
}

export async function createCollabProject(name: string, description: string): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");
  const ref = doc(collection(db, "collabProjects"));
  const data: Omit<CollabProjectDoc, "id"> = {
    ownerId: u.uid,
    name,
    description,
    createdAt: serverTimestamp() as never,
    updatedAt: serverTimestamp() as never,
    memberIds: [u.uid],
    data: {
      abcItems: [],
      dupaItems: [],
      settings: defaultSettings(),
      versions: [],
    },
  };
  await setDoc(ref, data);
  await setDoc(memberRef(ref.id, u.uid), {
    role: "owner",
    displayName: u.displayName || u.email || "Owner",
    email: u.email || "",
    photoURL: u.photoURL || "",
    joinedAt: serverTimestamp(),
  });
  await logActivity(ref.id, "created the project");
  return ref.id;
}

export function subscribeProject(pid: string, cb: (p: CollabProjectDoc | null) => void) {
  return onSnapshot(projectRef(pid), (snap) => {
    if (!snap.exists()) return cb(null);
    cb({ id: snap.id, ...(snap.data() as Omit<CollabProjectDoc, "id">) });
  });
}

export function subscribeMyProjects(uid: string, cb: (list: CollabProjectDoc[]) => void) {
  const q = query(collection(db, "collabProjects"), where("memberIds", "array-contains", uid));
  return onSnapshot(q, (snap) => {
    const out: CollabProjectDoc[] = [];
    snap.forEach((d) => out.push({ id: d.id, ...(d.data() as Omit<CollabProjectDoc, "id">) }));
    out.sort((a, b) => {
      const at = a.updatedAt?.toMillis?.() ?? 0;
      const bt = b.updatedAt?.toMillis?.() ?? 0;
      return bt - at;
    });
    cb(out);
  });
}

const pending = new Map<string, { project: Project; timer: number }>();
const DEBOUNCE_MS = 400;
let lastSentAt = new Map<string, number>();

export function getLastSentAt(pid: string) {
  return lastSentAt.get(pid) ?? 0;
}

export function writeProjectImmediate(pid: string, project: Project) {
  const u = auth.currentUser;
  const payload: Partial<CollabProjectDoc> = {
    name: project.name,
    description: project.description,
    updatedAt: serverTimestamp() as never,
    lastEditedBy: u?.uid,
    lastEditedByName: u?.displayName || u?.email || "Someone",
    data: {
      abcItems: project.abcItems,
      dupaItems: project.dupaItems,
      settings: project.settings,
      versions: project.versions,
      location: project.location,
      contractor: project.contractor,
      activePriceListYearId: project.activePriceListYearId,
    },
  };
  lastSentAt.set(pid, Date.now());
  return setDoc(projectRef(pid), payload, { merge: true });
}

export function queueProjectWrite(pid: string, project: Project) {
  const existing = pending.get(pid);
  if (existing) window.clearTimeout(existing.timer);
  const timer = window.setTimeout(() => {
    const slot = pending.get(pid);
    pending.delete(pid);
    if (slot) {
      writeProjectImmediate(pid, slot.project).catch((e) => console.error("collab write failed", e));
    }
  }, DEBOUNCE_MS);
  pending.set(pid, { project, timer });
}

export async function flushPending(pid: string) {
  const slot = pending.get(pid);
  if (slot) {
    window.clearTimeout(slot.timer);
    pending.delete(pid);
    await writeProjectImmediate(pid, slot.project);
  }
}

export function docToProject(d: CollabProjectDoc): Project {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    createdAt: d.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
    updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
    abcItems: d.data?.abcItems || [],
    dupaItems: d.data?.dupaItems || [],
    settings: d.data?.settings || defaultSettings(),
    versions: d.data?.versions || [],
    location: d.data?.location,
    contractor: d.data?.contractor,
    activePriceListYearId: d.data?.activePriceListYearId,
  };
}

export function subscribeMembers(pid: string, cb: (m: (CollabMemberDoc & { uid: string })[]) => void) {
  return onSnapshot(membersCol(pid), (snap) => {
    const out: (CollabMemberDoc & { uid: string })[] = [];
    snap.forEach((d) => out.push({ uid: d.id, ...(d.data() as CollabMemberDoc) }));
    cb(out);
  });
}

export async function changeRole(pid: string, uid: string, role: Role) {
  await updateDoc(memberRef(pid, uid), { role });
  await logActivity(pid, `changed a member role to ${role}`);
}

export async function removeMember(pid: string, uid: string) {
  await deleteDoc(memberRef(pid, uid));
  await updateDoc(projectRef(pid), { memberIds: arrayRemove(uid) });
  await deleteDoc(presenceRef(pid, uid)).catch(() => {});
  await logActivity(pid, "removed a member");
}

export async function transferOwnership(pid: string, newOwnerUid: string) {
  await updateDoc(projectRef(pid), { ownerId: newOwnerUid });
  await updateDoc(memberRef(pid, newOwnerUid), { role: "owner" });
  const me = auth.currentUser;
  if (me && me.uid !== newOwnerUid) {
    await updateDoc(memberRef(pid, me.uid), { role: "editor" });
  }
  await logActivity(pid, "transferred ownership");
}

export async function leaveProject(pid: string) {
  const u = auth.currentUser;
  if (!u) return;
  await deleteDoc(memberRef(pid, u.uid));
  await updateDoc(projectRef(pid), { memberIds: arrayRemove(u.uid) });
  await deleteDoc(presenceRef(pid, u.uid)).catch(() => {});
}

export async function deleteCollabProject(pid: string) {
  
  for (const sub of ["members", "invites", "presence", "activity"]) {
    const s = await getDocs(collection(db, "collabProjects", pid, sub));
    await Promise.all(s.docs.map((d) => deleteDoc(d.ref)));
  }
  await deleteDoc(projectRef(pid));
}

export async function createInvite(pid: string, role: Role, expiresInMs: number | null): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");
  const token = crypto.randomUUID();
  const data: InviteDoc = {
    role,
    createdBy: u.uid,
    expiresAt: expiresInMs ? Timestamp.fromMillis(Date.now() + expiresInMs) : null,
    used: false,
    projectId: pid,
  };
  await setDoc(inviteRef(pid, token), data);
  return token;
}

export async function findInviteByToken(token: string): Promise<{ pid: string; invite: InviteDoc } | null> {
  
  
  
  const [pid, tok] = token.split(":");
  if (!pid || !tok) return null;
  const snap = await getDoc(inviteRef(pid, tok));
  if (!snap.exists()) return null;
  return { pid, invite: snap.data() as InviteDoc };
}

export async function acceptInvite(pid: string, token: string): Promise<boolean> {
  const u = auth.currentUser;
  if (!u) throw new Error("Sign in required");
  const snap = await getDoc(inviteRef(pid, token));
  if (!snap.exists()) throw new Error("Invite not found");
  const inv = snap.data() as InviteDoc;
  if (inv.used) throw new Error("Invite already used");
  if (inv.expiresAt && inv.expiresAt.toMillis() < Date.now()) throw new Error("Invite expired");

  await setDoc(memberRef(pid, u.uid), {
    role: inv.role,
    displayName: u.displayName || u.email || "Member",
    email: u.email || "",
    photoURL: u.photoURL || "",
    joinedAt: serverTimestamp(),
  });
  await updateDoc(projectRef(pid), { memberIds: arrayUnion(u.uid) });
  await logActivity(pid, "joined the project");
  return true;
}

export async function logActivity(pid: string, action: string, target?: string) {
  const u = auth.currentUser;
  if (!u) return;
  try {
    await addDoc(activityCol(pid), {
      uid: u.uid,
      displayName: u.displayName || u.email || "Someone",
      action,
      target: target || "",
      at: serverTimestamp(),
    });
  } catch (e) {
    console.warn("activity log failed", e);
  }
}

export function subscribeActivity(pid: string, cb: (list: (ActivityDoc & { id: string })[]) => void) {
  return onSnapshot(activityCol(pid), (snap) => {
    const out: (ActivityDoc & { id: string })[] = [];
    snap.forEach((d) => out.push({ id: d.id, ...(d.data() as ActivityDoc) }));
    out.sort((a, b) => (b.at?.toMillis?.() ?? 0) - (a.at?.toMillis?.() ?? 0));
    cb(out.slice(0, 100));
  });
}

export function subscribePresence(pid: string, cb: (list: PresenceDoc[]) => void) {
  return onSnapshot(presenceCol(pid), (snap) => {
    const out: PresenceDoc[] = [];
    snap.forEach((d) => out.push(d.data() as PresenceDoc));
    cb(out);
  });
}

export async function setPresence(pid: string, currentTab?: string) {
  const u = auth.currentUser;
  if (!u) return;
  await setDoc(
    presenceRef(pid, u.uid),
    {
      uid: u.uid,
      displayName: u.displayName || u.email || "Someone",
      photoURL: u.photoURL || "",
      color: colorForUid(u.uid),
      lastSeen: serverTimestamp(),
      currentTab: currentTab || "",
    },
    { merge: true }
  );
}

export async function clearPresence(pid: string) {
  const u = auth.currentUser;
  if (!u) return;
  await deleteDoc(presenceRef(pid, u.uid)).catch(() => {});
}
