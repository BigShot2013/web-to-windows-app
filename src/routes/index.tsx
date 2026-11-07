import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import txtImg from "@/assets/Text_document.png.asset.json";
import rarImg from "@/assets/pixel_winrar.png.asset.json";
import binImg from "@/assets/trash.png.asset.json";
import binGif from "@/assets/trash_recycling.gif.asset.json";
import smileImg from "@/assets/smile_saper.png.asset.json";
import wallImg from "@/assets/tetris_shield.png.asset.json";
import ramImg from "@/assets/ram.png.asset.json";
import bombImg from "@/assets/bomb.png.asset.json";
import wormImg from "@/assets/worm_virus.png.asset.json";
import trojanImg from "@/assets/troyan_horse.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BSOD_defense — Retro Tower Defense" },
      { name: "description", content: "Defend your PC from worms and trojans with Windows 95-style software in this retro tower defense game." },
      { property: "og:title", content: "BSOD_defense — Retro Tower Defense" },
      { property: "og:description", content: "Place text documents, archivers and recycle bins to stop malware before the Blue Screen of Death." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

const ROWS = 6, COLS = 10;
type UType = "txt_doc" | "winrar_archiver" | "recycle_bin" | "sapper_smiley" | "tetramino_wall";
const UNITS: Record<UType, { name: string; cost: number; hp: number; img: string }> = {
  txt_doc: { name: "Text Doc", cost: 125, hp: 2, img: txtImg.url },
  winrar_archiver: { name: "Archiver", cost: 150, hp: 4, img: rarImg.url },
  recycle_bin: { name: "Recycle Bin", cost: 175, hp: 8, img: binImg.url },
  sapper_smiley: { name: "Sapper", cost: 100, hp: 3, img: smileImg.url },
  tetramino_wall: { name: "O-Shield", cost: 50, hp: 20, img: wallImg.url },
};
const ENEMIES = {
  worm: { hp: 10, speed: 0.45, img: wormImg.url, reward: 15 },
  trojan: { hp: 30, speed: 0.18, img: trojanImg.url, reward: 40 },
};
type EType = keyof typeof ENEMIES;
interface Unit { type: UType; hp: number; max: number; t: number; recycle: number }
interface Enemy { id: number; type: EType; row: number; x: number; hp: number; max: number }
interface Shot { id: number; row: number; x: number; ch: string }
interface G {
  ram: number; units: Map<string, Unit>; mines: Set<string>; enemies: Enemy[]; shots: Shot[];
  queue: { at: number; type: EType }[]; time: number; wave: number; over: boolean; ramT: number; id: number;
}
const key = (r: number, c: number) => `${r},${c}`;
const fresh = (): G => ({ ram: 300, units: new Map(), mines: new Set(), enemies: [], shots: [], queue: [], time: 0, wave: 0, over: false, ramT: 0, id: 1 });
const ASCII = "!@#$%&*{}<>/\\?01";

function tick(g: G, dt: number) {
  if (g.over) return;
  g.time += dt;
  g.ramT += dt;
  if (g.ramT >= 5) { g.ramT -= 5; g.ram += 25; }
  // spawn
  g.queue = g.queue.filter((q) => {
    if (q.at > g.time) return true;
    const d = ENEMIES[q.type];
    g.enemies.push({ id: g.id++, type: q.type, row: Math.floor(Math.random() * ROWS), x: COLS - 0.01, hp: d.hp, max: d.hp });
    return false;
  });
  // units
  for (const [k, u] of g.units) {
    const [r = 0, c = 0] = k.split(",").map(Number);
    if (u.type === "txt_doc") {
      u.t += dt;
      if (u.t >= 1) {
        u.t -= 1;
        if (g.enemies.some((e) => e.row === r && e.x >= c)) g.shots.push({ id: g.id++, row: r, x: c + 0.6, ch: ASCII[Math.floor(Math.random() * ASCII.length)] });
      }
    } else if (u.type === "winrar_archiver") {
      for (const e of g.enemies) if (Math.abs(e.row - r) <= 1 && Math.abs(Math.floor(e.x) - c) <= 1) e.hp -= 2 * dt;
    } else if (u.type === "recycle_bin") {
      if (u.recycle > 0) {
        u.recycle -= dt;
        if (u.recycle <= 0) { u.recycle = 0; g.ram += 50; }
      } else {
        const victim = g.enemies.find((e) => e.row === r && (Math.floor(e.x) === c || Math.floor(e.x) === c + 1));
        if (victim) { victim.hp = -999; (victim as Enemy & { eaten?: boolean }).eaten = true; u.recycle = 25; }
      }
    } else if (u.type === "sapper_smiley") {
      u.t += dt;
      if (u.t >= 15) {
        u.t -= 15;
        if (g.mines.size < 5) {
          const empty: string[] = [];
          for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) { const kk = key(rr, cc); if (!g.units.has(kk) && !g.mines.has(kk)) empty.push(kk); }
          const pick = empty[Math.floor(Math.random() * empty.length)];
          if (pick) g.mines.add(pick);
        }
      }
    }
  }
  // shots
  for (const s of g.shots) {
    s.x += 5 * dt;
    const hit = g.enemies.find((e) => e.row === s.row && e.hp > 0 && Math.abs(e.x + 0.5 - s.x) < 0.4);
    if (hit) { hit.hp -= 1; s.x = 999; }
  }
  g.shots = g.shots.filter((s) => s.x < COLS);
  // enemies
  for (const e of g.enemies) {
    if (e.hp <= 0) continue;
    const col = Math.floor(e.x);
    const mk = key(e.row, col);
    if (g.mines.has(mk)) { g.mines.delete(mk); e.hp -= 8; if (e.hp <= 0) continue; }
    const u = g.units.get(mk);
    if (u) {
      u.hp -= dt;
      if (u.hp <= 0) g.units.delete(mk);
    } else {
      e.x -= ENEMIES[e.type].speed * dt;
      if (e.x < 0) { g.over = true; return; }
    }
  }
  g.enemies = g.enemies.filter((e) => {
    if (e.hp > 0) return true;
    if (!(e as Enemy & { eaten?: boolean }).eaten) g.ram += ENEMIES[e.type].reward;
    return false;
  });
}

function Bar({ hp, max }: { hp: number; max: number }) {
  if (hp >= max) return null;
  return (
    <div className="absolute -top-1 left-1 right-1 h-1.5 border border-foreground bg-[var(--bsod)]">
      <div className="h-full bg-[var(--hp)]" style={{ width: `${Math.max(0, (hp / max) * 100)}%` }} />
    </div>
  );
}

function Game() {
  const g = useRef<G>(fresh());
  const [, force] = useState(0);
  const [sel, setSel] = useState<UType | null>(null);

  useEffect(() => {
    let last = performance.now(), raf = 0;
    const loop = (now: number) => {
      tick(g.current, Math.min(0.1, (now - last) / 1000));
      last = now;
      force((n) => n + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const s = g.current;
  const nextWave = () => {
    s.wave++;
    const n = s.wave;
    const worms = 2 + n * 2, trojans = Math.floor(n / 2) + (n >= 3 ? n - 2 : 0);
    const gap = Math.max(0.8, 3 - n * 0.2);
    let t = s.time + 1;
    const list: EType[] = [...Array(worms).fill("worm"), ...Array(trojans).fill("trojan")].sort(() => Math.random() - 0.5);
    for (const type of list) { s.queue.push({ at: t, type }); t += gap * (0.6 + Math.random() * 0.8); }
  };
  const place = (r: number, c: number) => {
    if (!sel || s.over) return;
    const k = key(r, c);
    if (s.units.has(k) || s.mines.has(k)) return;
    const d = UNITS[sel];
    if (s.ram < d.cost) return;
    s.ram -= d.cost;
    s.units.set(k, { type: sel, hp: d.hp, max: d.hp, t: 0, recycle: 0 });
  };

  if (s.over) {
    return (
      <div className="flex min-h-screen flex-col items-start justify-center gap-6 bg-[var(--bsod)] p-10 font-mono text-[var(--bsod-fg)]">
        <span className="bg-[var(--bsod-fg)] px-2 text-[var(--bsod)]">Windows</span>
        <p className="max-w-2xl">A fatal exception 0E has occurred at 0028:C0011E36 in VXD MALWARE(01). Malware reached your system on wave {s.wave}. The current application will be terminated.</p>
        <p>* Press Restart to reboot your defenses.</p>
        <button className="win-btn text-foreground" onClick={() => { g.current = fresh(); force((n) => n + 1); }}>Restart</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--desktop)] p-4 font-mono">
      <div className="win-frame w-full max-w-5xl">
        <div className="flex items-center justify-between bg-[var(--title)] px-2 py-1 font-bold text-[var(--bsod-fg)]">
          <span>BSOD_defense.exe</span><span>_ □ ×</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 p-2">
          <div className="win-inset flex items-center gap-1 px-2 py-1">
            <img src={ramImg.url} alt="RAM" className="h-7 w-7 [image-rendering:pixelated]" />
            <b>{Math.floor(s.ram)} MB</b>
          </div>
          {(Object.keys(UNITS) as UType[]).map((t) => (
            <button key={t} onClick={() => setSel(sel === t ? null : t)} disabled={s.ram < UNITS[t].cost}
              className={`win-btn flex flex-col items-center px-2 py-1 text-xs disabled:opacity-40 ${sel === t ? "win-inset" : ""}`}>
              <img src={UNITS[t].img} alt={UNITS[t].name} className="h-9 w-9 object-contain [image-rendering:pixelated]" />
              {UNITS[t].name}<span>{UNITS[t].cost}</span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span>Wave {s.wave}{s.queue.length ? ` (+${s.queue.length})` : ""}</span>
            <button onClick={nextWave} className="win-btn bg-[var(--danger)] px-3 py-2 font-bold text-[var(--bsod-fg)]">Next Wave →</button>
          </div>
        </div>
        <div className="relative m-2 select-none overflow-hidden border-2 border-foreground" style={{ aspectRatio: `${COLS}/${ROWS}` }}>
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${COLS},1fr)`, gridTemplateRows: `repeat(${ROWS},1fr)` }}>
            {Array.from({ length: ROWS * COLS }, (_, i) => {
              const r = Math.floor(i / COLS), c = i % COLS, k = key(r, c), u = s.units.get(k);
              return (
                <div key={k} onClick={() => place(r, c)}
                  className={`relative flex items-center justify-center ${(r + c) % 2 ? "bg-[var(--tile-a)]" : "bg-[var(--tile-b)]"} ${sel ? "cursor-pointer hover:brightness-125" : ""}`}>
                  {s.mines.has(k) && <img src={bombImg.url} alt="mine" className="h-1/2 w-1/2 object-contain [image-rendering:pixelated]" />}
                  {u && (
                    <>
                      <img src={u.type === "recycle_bin" && u.recycle > 0 ? binGif.url : UNITS[u.type].img} alt={u.type}
                        className="h-4/5 w-4/5 object-contain [image-rendering:pixelated]" />
                      <Bar hp={u.hp} max={u.max} />
                      {u.recycle > 0 && <span className="absolute bottom-0 bg-foreground px-1 text-[10px] text-background">{Math.ceil(u.recycle)}s</span>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {s.enemies.map((e) => (
            <div key={e.id} className="pointer-events-none absolute" style={{ left: `${(e.x / COLS) * 100}%`, top: `${(e.row / ROWS) * 100}%`, width: `${100 / COLS}%`, height: `${100 / ROWS}%` }}>
              <img src={ENEMIES[e.type].img} alt={e.type} className="h-full w-full object-contain p-1 mix-blend-multiply [image-rendering:pixelated]" />
              <Bar hp={e.hp} max={e.max} />
            </div>
          ))}
          {s.shots.map((sh) => (
            <span key={sh.id} className="pointer-events-none absolute font-bold text-[var(--shot)]" style={{ left: `${(sh.x / COLS) * 100}%`, top: `${((sh.row + 0.35) / ROWS) * 100}%` }}>{sh.ch}</span>
          ))}
        </div>
        <p className="px-2 pb-2 text-xs">Pick software, click a tile to install. +25 RAM every 5s. Don't let malware reach the left edge!</p>
      </div>
    </div>
  );
}
