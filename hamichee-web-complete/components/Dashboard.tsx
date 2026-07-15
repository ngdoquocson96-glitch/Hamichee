"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { LogOut, Plus, RefreshCw, ClipboardList, Users, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Profile, Task, TaskPriority, TaskStatus } from "@/lib/types";

const statusLabel: Record<TaskStatus, string> = {
  todo: "Chưa làm",
  in_progress: "Đang làm",
  waiting: "Đang chờ",
  blocked: "Bị vướng",
  pending_review: "Chờ duyệt",
  completed: "Hoàn thành",
  rework: "Làm lại",
};

const priorityLabel: Record<TaskPriority, string> = {
  low: "Thấp",
  normal: "Bình thường",
  high: "Cao",
  urgent: "Khẩn cấp",
};

export function Dashboard({ session }: { session: any }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<"tasks" | "plan" | "people">("tasks");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const canManage = profile?.role === "admin" || profile?.role === "manager";

  async function loadAll() {
    setLoading(true);
    const [{ data: me }, { data: people }, { data: taskRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).single(),
      supabase.from("profiles").select("*").order("full_name"),
      supabase
        .from("tasks")
        .select("*, assignee:profiles!tasks_assignee_id_fkey(*)")
        .order("created_at", { ascending: false }),
    ]);

    setProfile(me as Profile);
    setProfiles((people || []) as Profile[]);
    setTasks((taskRows || []) as Task[]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const stats = useMemo(() => ({
    all: tasks.length,
    active: tasks.filter((t) => ["todo", "in_progress", "waiting", "blocked", "rework"].includes(t.status)).length,
    review: tasks.filter((t) => t.status === "pending_review").length,
    done: tasks.filter((t) => t.status === "completed").length,
  }), [tasks]);

  async function createTask(formData: FormData) {
    setNotice("");
    const payload = {
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || "") || null,
      assignee_id: String(formData.get("assignee_id") || ""),
      created_by: session.user.id,
      priority: String(formData.get("priority") || "normal"),
      due_at: String(formData.get("due_at") || "") || null,
    };

    const { error } = await supabase.from("tasks").insert(payload);
    setNotice(error ? error.message : "Đã giao việc.");
    if (!error) await loadAll();
  }

  async function updateTask(task: Task, status: TaskStatus, note?: string) {
    const patch: any = { status };
    if (status === "blocked") patch.blocker_reason = note || "";
    if (status === "pending_review") patch.completion_report = note || "";
    if (status === "rework") patch.review_note = note || "";

    const { error } = await supabase.from("tasks").update(patch).eq("id", task.id);
    setNotice(error ? error.message : "Đã cập nhật.");
    if (!error) await loadAll();
  }

  async function savePlan(formData: FormData) {
    const priorities = [
      String(formData.get("p1") || ""),
      String(formData.get("p2") || ""),
      String(formData.get("p3") || ""),
    ].filter(Boolean);

    const payload = {
      user_id: session.user.id,
      plan_date: new Date().toISOString().slice(0, 10),
      top_priorities: priorities,
      expected_blockers: String(formData.get("expected_blockers") || ""),
      support_needed: String(formData.get("support_needed") || ""),
    };

    const { error } = await supabase.from("daily_plans").upsert(payload, {
      onConflict: "user_id,plan_date",
    });

    setNotice(error ? error.message : "Đã lưu kế hoạch hôm nay.");
  }

  return (
    <div className="appShell">
      <header className="topbar">
        <div className="brandMini">
          <Image src="/hamichee-logo.jpg" alt="Hamichee" width={58} height={58} />
          <div>
            <strong>HAMICHEE</strong>
            <span>Hệ thống nội bộ</span>
          </div>
        </div>
        <div className="headerActions">
          <span className="userChip">{profile?.full_name || session.user.email}</span>
          <button className="iconButton" onClick={loadAll} title="Tải lại"><RefreshCw size={18} /></button>
          <button className="iconButton" onClick={() => supabase.auth.signOut()} title="Đăng xuất"><LogOut size={18} /></button>
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === "tasks" ? "active" : ""} onClick={() => setTab("tasks")}>
          <ClipboardList size={18} /> Công việc
        </button>
        <button className={tab === "plan" ? "active" : ""} onClick={() => setTab("plan")}>
          <CalendarDays size={18} /> Kế hoạch 5 phút
        </button>
        {canManage && (
          <button className={tab === "people" ? "active" : ""} onClick={() => setTab("people")}>
            <Users size={18} /> Nhân sự
          </button>
        )}
      </nav>

      <main className="content">
        {notice && <div className="notice">{notice}</div>}

        {tab === "tasks" && (
          <>
            <section className="statsGrid">
              <Stat title="Tổng việc" value={stats.all} />
              <Stat title="Đang xử lý" value={stats.active} />
              <Stat title="Chờ duyệt" value={stats.review} />
              <Stat title="Hoàn thành" value={stats.done} />
            </section>

            {canManage && (
              <section className="panel">
                <h2><Plus size={20} /> Giao việc mới</h2>
                <form action={createTask} className="taskForm">
                  <input name="title" required placeholder="Tên công việc" />
                  <select name="assignee_id" required defaultValue="">
                    <option value="" disabled>Chọn người thực hiện</option>
                    {profiles.filter((p) => p.is_active !== false).map((p) => (
                      <option value={p.id} key={p.id}>{p.full_name} — {p.role}</option>
                    ))}
                  </select>
                  <select name="priority" defaultValue="normal">
                    <option value="low">Thấp</option>
                    <option value="normal">Bình thường</option>
                    <option value="high">Cao</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                  <input name="due_at" type="datetime-local" />
                  <textarea name="description" placeholder="Mô tả công việc" />
                  <button className="primaryButton" type="submit">Giao việc</button>
                </form>
              </section>
            )}

            <section className="panel">
              <h2>Danh sách công việc</h2>
              {loading ? <p>Đang tải...</p> : tasks.length === 0 ? <p>Chưa có công việc.</p> : (
                <div className="taskList">
                  {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} canManage={!!canManage} currentUserId={session.user.id} onUpdate={updateTask} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {tab === "plan" && (
          <section className="panel narrow">
            <h2>Kế hoạch 5 phút hôm nay</h2>
            <form action={savePlan} className="formStack">
              <input name="p1" required placeholder="Ưu tiên số 1" />
              <input name="p2" placeholder="Ưu tiên số 2" />
              <input name="p3" placeholder="Ưu tiên số 3" />
              <textarea name="expected_blockers" placeholder="Khó khăn dự kiến" />
              <textarea name="support_needed" placeholder="Cần quản lý hỗ trợ gì?" />
              <button className="primaryButton" type="submit">Lưu kế hoạch</button>
            </form>
          </section>
        )}

        {tab === "people" && canManage && (
          <section className="panel">
            <h2>Danh sách nhân sự</h2>
            <div className="peopleTable">
              {profiles.map((p) => (
                <div className="personRow" key={p.id}>
                  <strong>{p.full_name}</strong>
                  <span>{p.email}</span>
                  <span className="roleBadge">{p.role}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return <div className="statCard"><span>{title}</span><strong>{value}</strong></div>;
}

function TaskCard({
  task,
  canManage,
  currentUserId,
  onUpdate,
}: {
  task: Task;
  canManage: boolean;
  currentUserId: string;
  onUpdate: (task: Task, status: TaskStatus, note?: string) => void;
}) {
  const isAssignee = task.assignee_id === currentUserId;

  function askAndUpdate(status: TaskStatus, promptText: string) {
    const note = window.prompt(promptText);
    if (note === null) return;
    onUpdate(task, status, note);
  }

  return (
    <article className="taskCard">
      <div className="taskTop">
        <div>
          <h3>{task.title}</h3>
          <p>{task.description || "Không có mô tả."}</p>
        </div>
        <span className={`status ${task.status}`}>{statusLabel[task.status]}</span>
      </div>

      <div className="taskMeta">
        <span>Người làm: {task.assignee?.full_name || "—"}</span>
        <span>Ưu tiên: {priorityLabel[task.priority]}</span>
        <span>Hạn: {task.due_at ? new Date(task.due_at).toLocaleString("vi-VN") : "Không đặt"}</span>
      </div>

      {task.completion_report && <div className="reportBox"><strong>Báo cáo:</strong> {task.completion_report}</div>}
      {task.blocker_reason && <div className="reportBox"><strong>Vướng mắc:</strong> {task.blocker_reason}</div>}
      {task.review_note && <div className="reportBox"><strong>Phản hồi:</strong> {task.review_note}</div>}

      <div className="taskActions">
        {isAssignee && task.status !== "completed" && (
          <>
            <button onClick={() => onUpdate(task, "in_progress")}>Bắt đầu</button>
            <button onClick={() => onUpdate(task, "waiting")}>Đang chờ</button>
            <button onClick={() => askAndUpdate("blocked", "Nhập lý do bị vướng:")}>Bị vướng</button>
            <button onClick={() => askAndUpdate("pending_review", "Nhập báo cáo kết quả hoàn thành:")}>Gửi hoàn thành</button>
          </>
        )}

        {canManage && task.status === "pending_review" && (
          <>
            <button className="approve" onClick={() => onUpdate(task, "completed")}>Duyệt</button>
            <button className="reject" onClick={() => askAndUpdate("rework", "Nhập nội dung cần làm lại:")}>Trả lại</button>
          </>
        )}
      </div>
    </article>
  );
}
