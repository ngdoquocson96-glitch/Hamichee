"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Dashboard } from "@/components/Dashboard";

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Đang đăng nhập...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : "");
  }

  if (!ready) return <main className="center">Đang tải...</main>;
  if (session) return <Dashboard session={session} />;

  return (
    <main className="loginShell">
      <section className="loginCard">
        <div className="brandBlock">
          <Image
            src="/hamichee-logo.jpg"
            alt="Hamichee"
            width={260}
            height={260}
            priority
            className="brandLogo"
          />
          <p>Hệ thống giao việc nội bộ</p>
        </div>

        <form onSubmit={signIn} className="formStack">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ten@congty.com"
            />
          </label>

          <label>
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </label>

          <button type="submit" className="primaryButton">Đăng nhập</button>
          {message && <p className="message">{message}</p>}
        </form>
      </section>
    </main>
  );
}
