"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Database,
  Download,
  MessageSquare,
  MousePointerClick,
  Rocket,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const FEATURES = [
  {
    icon: MousePointerClick,
    title: "طراحی با کشیدن و رها کردن",
    text: "۱۹ نوع فیلد حرفه‌ای — از متن و شماره موبایل تا امتیازدهی و آپلود فایل — بدون یک خط کد.",
  },
  {
    icon: Database,
    title: "ذخیره مستقیم در MySQL",
    text: "با انتشار فرم، جدول پاسخ‌ها با ستون‌های هم‌نام فیلدها در دیتابیس شما ساخته می‌شود.",
  },
  {
    icon: SlidersHorizontal,
    title: "منطق شرطی",
    text: "فیلدها را بر اساس پاسخ کاربران نمایش یا مخفی کنید؛ هم در پیش‌نمایش و هم در خروجی نهایی.",
  },
  {
    icon: MessageSquare,
    title: "پیامک خوش‌آمد",
    text: "پس از ثبت فرم، از طریق پیامک‌ایر با الگوی آماده یا متن آزاد به کاربر پیامک ارسال می‌شود.",
  },
  {
    icon: Download,
    title: "خروجی PHP خودکفا",
    text: "یک فایل index.php بگیرید، روی سرور آپلود کنید و فرم با آدرس اختصاصی بالا بیاید.",
  },
  {
    icon: ShieldCheck,
    title: "امن و معتبر",
    text: "اعتبارسنجی دوطرفه کلاینت و سرور، PDO با Prepared Statement و ضداسپم Honeypot.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

export default function Home() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[560px]" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 right-1/2 h-[480px] w-[720px] translate-x-1/2 rounded-full bg-primary/12 blur-[140px]"
        aria-hidden
      />

      <header className="relative z-10">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <span className="text-base font-extrabold">V</span>
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">Vira Forms</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="تغییر تم"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              داشبورد
            </Button>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:pt-24">
          <motion.div {...fadeUp}>
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              مبتنی بر MySQL — بدون وابستگی به سرویس بیرونی
            </span>
          </motion.div>

          <motion.h1
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.08 }}
            className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-extrabold leading-[1.25] tracking-tight text-foreground sm:text-6xl sm:leading-[1.2]"
          >
            فرم بساز، <span className="text-gradient">منتشر کن</span>، پاسخ‌ها را
            <span className="text-gradient"> در دیتابیس</span> بگیر
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.16 }}
            className="mx-auto mt-6 max-w-2xl text-balance text-base leading-8 text-muted-foreground sm:text-lg"
          >
            از طراحی بصری فرم تا ساخت خودکار جدول در MySQL و تولید خروجی PHP آماده‌ی آپلود —
            همه‌چیز در یک ابزار فارسی و راست‌چین.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.24 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button size="lg" onClick={() => router.push("/dashboard")} className="w-full gap-2 sm:w-auto">
              شروع کنید
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => router.push("/dashboard")} className="w-full sm:w-auto">
              مشاهده داشبورد
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
            className="glass-strong mx-auto mt-16 max-w-4xl rounded-2xl p-2 shadow-2xl shadow-black/30"
          >
            <div className="rounded-xl border border-border bg-card-solid/80 p-6 text-right">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                </div>
                <span dir="ltr" className="font-mono text-[11px] text-muted-foreground">vira98.ir/signupform</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {["نام و نام خانوادگی", "شماره موبایل", "ایمیل", "تاریخ تولد"].map((ph, i) => (
                  <div key={ph} className={i === 0 ? "sm:col-span-2" : ""}>
                    <div className="mb-1.5 h-3 w-20 rounded bg-white/10" />
                    <div className="h-10 rounded-lg border border-border bg-white/[0.03] px-3 leading-10 text-xs text-muted-foreground/50">
                      {ph}
                    </div>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <div className="h-11 rounded-xl bg-primary/85 shadow-lg shadow-primary/25" />
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">هر چیزی که یک فرمساز نیاز دارد</h2>
            <p className="mt-3 text-muted-foreground">از ساخت تا انتشار و مدیریت پاسخ‌ها</p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.article
                key={f.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.06 }}
                className="group glass rounded-2xl p-6 transition-all duration-300 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/5"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary transition-transform duration-300 group-hover:scale-105">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold tracking-tight text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{f.text}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <motion.div
            {...fadeUp}
            className="glass-strong relative overflow-hidden rounded-3xl px-8 py-14 text-center"
          >
            <div
              className="pointer-events-none absolute -top-24 right-1/2 h-64 w-[480px] translate-x-1/2 rounded-full bg-primary/15 blur-[100px]"
              aria-hidden
            />
            <Rocket className="mx-auto mb-5 h-9 w-9 text-primary" />
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">اولین فرم را همین حالا بسازید</h2>
            <p className="mx-auto mt-3 max-w-xl text-balance leading-7 text-muted-foreground">
              کمتر از یک دقیقه تا یک فرم زنده روی دامنه خودتان فاصله است.
            </p>
            <Button size="lg" onClick={() => router.push("/dashboard")} className="mt-8 gap-2">
              ورود به داشبورد
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:flex-row">
          <p>Vira Forms — فرمساز فارسی مبتنی بر MySQL</p>
          <p>ساخته‌شده با Next.js و Tailwind</p>
        </div>
      </footer>
    </div>
  );
}
