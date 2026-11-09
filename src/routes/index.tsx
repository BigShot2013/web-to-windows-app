import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import txtImg from "@/assets/Text_document.png.asset.json";
import rarImg from "@/assets/pixel_winrar.png.asset.json";
import binImg from "@/assets/trash.png.asset.json";
import binGif from "@/assets/trash_recycling.gif.asset.json";
import smileImg from "@/assets/sapper_smile_transparent.png.asset.json";
import smileReadyGif from "@/assets/sapper_ready_blink_fixed.gif.asset.json";
import wallImg from "@/assets/tetris_shield.png.asset.json";
import ramImg from "@/assets/ram.png.asset.json";
import bombImg from "@/assets/bomb.png.asset.json";
import wormImg from "@/assets/worm_virus_walk.gif.asset.json";
import trojanImg from "@/assets/troyan_horse_wood.png.asset.json";
import redTrojanImg from "@/assets/red_trojan.png.asset.json";
import blissImg from "@/assets/bliss.png.asset.json";
import {
  canStartWave,
  defenderSellRefund,
  MAX_MINES,
  MINE_SELL_REFUND,
  SAPPER_CHARGE_SECONDS,
} from "@/game/rules";

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
type Lang = "ru" | "en";
type Screen = "menu" | "game" | "settings" | "help";

const UNITS: Record<UType, { cost: number; hp: number; img: string }> = {
  txt_doc: { cost: 125, hp: 2, img: txtImg.url },
  winrar_archiver: { cost: 150, hp: 4, img: rarImg.url },
  recycle_bin: { cost: 175, hp: 8, img: binImg.url },
  sapper_smiley: { cost: 100, hp: 3, img: smileImg.url },
  tetramino_wall: { cost: 50, hp: 20, img: wallImg.url },
};
const UNIT_NAMES: Record<Lang, Record<UType, string>> = {
  ru: {
    txt_doc: "Текстовый документ",
    winrar_archiver: "Архиватор",
    recycle_bin: "Корзина",
    sapper_smiley: "Сапёр",
    tetramino_wall: "O-Щит",
  },
  en: {
    txt_doc: "Text Doc",
    winrar_archiver: "Archiver",
    recycle_bin: "Recycle Bin",
    sapper_smiley: "Sapper",
    tetramino_wall: "O-Shield",
  },
};
const ENEMIES = {
  worm: { hp: 10, speed: 0.45, img: wormImg.url, reward: 15, dmg: 1, lives: 1 },
  trojan: { hp: 30, speed: 0.18, img: trojanImg.url, reward: 40, dmg: 1, lives: 1 },
  red_trojan: { hp: 40, speed: 0.22, img: redTrojanImg.url, reward: 60, dmg: 2, lives: 2 },
};
type EType = keyof typeof ENEMIES;
interface Unit { type: UType; hp: number; max: number; t: number; recycle: number }
interface Enemy { id: number; type: EType; row: number; x: number; hp: number; max: number; bite: number }
interface Shot { id: number; row: number; x: number; ch: string }
interface G {
  ram: number; units: Map<string, Unit>; mines: Set<string>; enemies: Enemy[]; shots: Shot[];
  queue: { at: number; type: EType }[]; lives: number; time: number; wave: number; over: boolean; ramT: number; id: number;
}
const key = (r: number, c: number) => `${r},${c}`;
const fresh = (): G => ({ ram: 300, units: new Map(), mines: new Set(), enemies: [], shots: [], queue: [], lives: 10, time: 0, wave: 0, over: false, ramT: 0, id: 1 });
const ASCII = "!@#$%&*{}<>/\\?01";

const COPY = {
  ru: {
    play: "Играть",
    settings: "Настройки",
    help: "Как играть",
    back: "← Назад",
    menu: "← Главное меню",
    language: "Язык",
    languageHint: "Выберите язык меню и игры.",
    russian: "Русский",
    english: "English",
    fullscreen: "□ Полный экран",
    health: "Health",
    wave: "Волна",
    nextWave: "Следующая волна →",
    waveRunning: "Дождитесь конца текущей волны",
    hint: "Выберите программу сверху и нажмите на клетку. ПКМ по защитнику — продать за полцены, ПКМ по мине — продать за 10 MB.",
    place: "Выбрано: {name}. Нажмите на свободную клетку. После установки программу нужно выбрать снова.",
    mineTarget: "Сапёр готов! Нажмите на любую свободную клетку, чтобы поставить мину. Повторное нажатие на сапёра отменяет выбор.",
    mineLimit: "Одновременно можно держать не больше 5 мин.",
    fatal: "A fatal exception 0E has occurred at 0028:C0011E36 in VXD MALWARE(01). Malware reached your system on wave {wave}. The current application will be terminated.",
    restartHint: "* Нажмите «Перезагрузить», чтобы восстановить защиту.",
    restart: "Перезагрузить",
    menuSubtitle: "Защитите компьютер от вирусов и не допустите синий экран смерти.",
    menuNote: "Ретро tower defense в стиле Windows 95/98",
    helpTitle: "Как играть в BSOD_defense",
    helpGoalTitle: "Цель игры",
    helpGoal: "Вирусы появляются справа и идут влево. Не дайте им добраться до левого края поля. У вас 10 жизней: каждый прорвавшийся вирус отнимает одну. Когда жизни закончатся, появится синий экран смерти.",
    helpInstallTitle: "Установка и продажа программ",
    helpInstall: "Нажмите на значок программы сверху, затем на свободную клетку. После каждой установки выбор сбрасывается, поэтому для следующей копии снова нажмите её значок. Нажмите правой кнопкой мыши по защитнику, чтобы продать его за половину цены. Продажа мины правой кнопкой возвращает 10 MB RAM.",
    helpRamTitle: "RAM и волны",
    helpRam: "RAM — это валюта для установки программ. Каждые 5 секунд вы получаете 25 MB, а за уничтожение вирусов начисляется награда. Новую волну запускает красная кнопка. Пока на поле есть вирусы или они ещё ожидают появления, следующую волну запустить нельзя.",
    helpUnitsTitle: "Защитники",
    helpUnits: [
      "Текстовый документ — 125 MB, 2 HP. Раз в секунду стреляет белыми символами по вирусам в своей строке.",
      "Архиватор — 150 MB, 4 HP. Постоянно повреждает вирусов в восьми соседних клетках и своей собственной.",
      "Корзина — 175 MB, 8 HP. Мгновенно удаляет одного вируса рядом, затем перезаряжается 25 секунд и возвращает 50 MB RAM.",
      "Сапёр — 100 MB, 3 HP. Заряжается 15 секунд и начинает мигать. Нажмите на мигающего сапёра, затем на свободную клетку — там появится мина. Сапёр больше не ставит мины сам. Мина наносит 8 урона; одновременно может быть не больше 5 мин.",
      "O-Щит — 50 MB, 20 HP. Прочная стена, которая задерживает вирусов и принимает удары на себя.",
    ],
    helpEnemiesTitle: "Вирусы",
    helpEnemies: "Червь имеет 10 HP и движется быстро. Троянский конь имеет 30 HP, идёт медленно и выдерживает больше попаданий. Встретив защитника, вирус останавливается и отнимает у него 1 HP раз в секунду.",
    helpControlsTitle: "Управление",
    helpControls: "ЛКМ — выбрать программу, установить её или зарядить мину от готового сапёра. ПКМ — продать защитника или мину. Кнопка «Полный экран» вверху окна раскрывает игру на весь экран.",
  },
  en: {
    play: "Play",
    settings: "Settings",
    help: "How to Play",
    back: "← Back",
    menu: "← Main Menu",
    language: "Language",
    languageHint: "Choose the menu and game language.",
    russian: "Русский",
    english: "English",
    fullscreen: "□ Full Screen",
    health: "Health",
    wave: "Wave",
    nextWave: "Next Wave →",
    waveRunning: "Finish the current wave first",
    hint: "Choose software above, then click a tile. Right-click a defender to sell it for half price, or a mine for 10 MB.",
    place: "Selected: {name}. Click an empty tile. Select the software again after placing it.",
    mineTarget: "Sapper ready! Click any empty tile to place the mine. Click the Sapper again to cancel.",
    mineLimit: "You can have up to 5 mines at once.",
    fatal: "A fatal exception 0E has occurred at 0028:C0011E36 in VXD MALWARE(01). Malware reached your system on wave {wave}. The current application will be terminated.",
    restartHint: "* Press Restart to reboot your defenses.",
    restart: "Restart",
    menuSubtitle: "Protect your computer from viruses and stop the Blue Screen of Death.",
    menuNote: "A Windows 95/98-inspired retro tower defense game",
    helpTitle: "How to Play BSOD_defense",
    helpGoalTitle: "Your goal",
    helpGoal: "Viruses enter on the right and walk left. Stop them before they reach the left edge. You have 10 lives, and every virus that gets through takes one. When all lives are lost, the Blue Screen of Death appears.",
    helpInstallTitle: "Installing and selling software",
    helpInstall: "Click a program icon above, then click an empty tile. Selection resets after every placement, so click the icon again to install another copy. Right-click a defender to sell it for half its price. Right-click a mine to sell it for 10 MB RAM.",
    helpRamTitle: "RAM and waves",
    helpRam: "RAM is the currency used to install software. You receive 25 MB every 5 seconds and earn rewards for destroying viruses. Use the red button to start a wave. You cannot start another wave while enemies are still on the field or waiting to appear.",
    helpUnitsTitle: "Defenders",
    helpUnits: [
      "Text Doc — 125 MB, 2 HP. Fires white symbols down its row once per second.",
      "Archiver — 150 MB, 4 HP. Continuously damages viruses in its own tile and the eight neighboring tiles.",
      "Recycle Bin — 175 MB, 8 HP. Instantly deletes one nearby virus, then recharges for 25 seconds and returns 50 MB RAM.",
      "Sapper — 100 MB, 3 HP. Charges for 15 seconds, then blinks. Click the blinking Sapper and then an empty tile to place a mine there. It no longer places mines automatically. Mines deal 8 damage, with up to 5 active at once.",
      "O-Shield — 50 MB, 20 HP. A tough wall that holds viruses back and absorbs their attacks.",
    ],
    helpEnemiesTitle: "Viruses",
    helpEnemies: "The Worm has 10 HP and moves quickly. The Trojan Horse has 30 HP, moves slowly, and withstands more hits. When a virus meets a defender, it stops and deals 1 damage once per second.",
    helpControlsTitle: "Controls",
    helpControls: "Left click — choose and install software, or place a charged Sapper's mine. Right click — sell a defender or mine. The Full Screen button at the top expands the game to fill your screen.",
  },
} as const;

function tick(g: G, dt: number) {
  if (g.over) return;
  g.time += dt;
  g.ramT += dt;
  if (g.ramT >= 5) { g.ramT -= 5; g.ram += 25; }
  g.queue = g.queue.filter((q) => {
    if (q.at > g.time) return true;
    const d = ENEMIES[q.type];
    g.enemies.push({ id: g.id++, type: q.type, row: Math.floor(Math.random() * ROWS), x: COLS - 0.01, hp: d.hp, max: d.hp, bite: 0 });
    return false;
  });
  for (const [k, u] of g.units) {
    const [r = 0, c = 0] = k.split(",").map(Number);
    if (u.type === "txt_doc") {
      u.t += dt;
      if (u.t >= 1) {
        u.t -= 1;
        if (g.enemies.some((e) => e.row === r && e.x >= c)) g.shots.push({ id: g.id++, row: r, x: c + 0.6, ch: ASCII.charAt(Math.floor(Math.random() * ASCII.length)) });
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
      u.t = Math.min(SAPPER_CHARGE_SECONDS, u.t + dt);
    }
  }
  for (const s of g.shots) {
    s.x += 5 * dt;
    const hit = g.enemies.find((e) => e.row === s.row && e.hp > 0 && Math.abs(e.x + 0.5 - s.x) < 0.4);
    if (hit) { hit.hp -= 1; s.x = 999; }
  }
  g.shots = g.shots.filter((s) => s.x < COLS);
  for (const e of g.enemies) {
    if (e.hp <= 0) continue;
    const col = Math.floor(e.x);
    const mk = key(e.row, col);
    if (g.mines.has(mk)) { g.mines.delete(mk); e.hp -= 8; if (e.hp <= 0) continue; }
    const u = g.units.get(mk);
    if (u) {
      e.bite += dt;
      if (e.bite >= 1) { e.bite -= 1; u.hp -= ENEMIES[e.type].dmg; if (u.hp <= 0) g.units.delete(mk); }
    } else {
      e.bite = 0;
      e.x -= ENEMIES[e.type].speed * dt;
      if (e.x < 0) { e.hp = -999; (e as Enemy & { eaten?: boolean }).eaten = true; g.lives = Math.max(0, g.lives - ENEMIES[e.type].lives); if (g.lives <= 0) { g.over = true; return; } }
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
    <div className="absolute -top-1 left-1 right-1 z-30 h-1.5 border border-foreground bg-[var(--bsod)]">
      <div className="h-full bg-[var(--hp)]" style={{ width: `${Math.max(0, (hp / max) * 100)}%` }} />
    </div>
  );
}

function MenuButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="win-btn w-full px-6 py-3 text-left text-lg font-bold transition-transform hover:-translate-y-0.5 active:translate-y-0">{children}</button>;
}

function Game() {
  const g = useRef<G>(fresh());
  const [, force] = useState(0);
  const [sel, setSel] = useState<UType | null>(null);
  const [mineSource, setMineSource] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  const [lang, setLang] = useState<Lang>("ru");
  const t = COPY[lang];

  useEffect(() => {
    if (screen !== "game") return;
    let last = performance.now(), raf = 0;
    const loop = (now: number) => {
      tick(g.current, Math.min(0.1, (now - last) / 1000));
      last = now;
      force((n) => n + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [screen]);

  const s = g.current;
  const waveAvailable = canStartWave(s.queue.length, s.enemies.length);
  const nextWave = () => {
    if (!canStartWave(s.queue.length, s.enemies.length) || s.over) return;
    s.wave++;
    const n = s.wave;
    const worms = 2 + n * 2, trojans = Math.floor(n / 2) + (n >= 3 ? n - 2 : 0), reds = n >= 3 ? Math.floor((n - 1) / 2) : 0;
    const gap = Math.max(0.8, 3 - n * 0.2);
    let time = s.time + 1;
    const list: EType[] = [...Array(worms).fill("worm"), ...Array(trojans).fill("trojan"), ...Array(reds).fill("red_trojan")].sort(() => Math.random() - 0.5);
    for (const type of list) { s.queue.push({ at: time, type }); time += gap * (0.6 + Math.random() * 0.8); }
  };
  const place = (r: number, c: number) => {
    if (s.over) return;
    const k = key(r, c);
    const existing = s.units.get(k);
    if (mineSource === k) { setMineSource(null); return; }
    if (existing?.type === "sapper_smiley" && existing.t >= SAPPER_CHARGE_SECONDS) {
      setMineSource(k);
      setSel(null);
      return;
    }
    if (mineSource) {
      const source = s.units.get(mineSource);
      if (!source || source.type !== "sapper_smiley" || source.t < SAPPER_CHARGE_SECONDS) { setMineSource(null); return; }
      if (existing || s.mines.has(k) || s.mines.size >= MAX_MINES) return;
      s.mines.add(k);
      source.t = 0;
      setMineSource(null);
      return;
    }
    if (!sel || existing || s.mines.has(k)) return;
    const d = UNITS[sel];
    if (s.ram < d.cost) return;
    s.ram -= d.cost;
    s.units.set(k, { type: sel, hp: d.hp, max: d.hp, t: 0, recycle: 0 });
    setSel(null);
  };
  const sell = (r: number, c: number) => {
    if (s.over) return;
    const k = key(r, c);
    const unit = s.units.get(k);
    if (unit) {
      s.ram += defenderSellRefund(UNITS[unit.type].cost);
      s.units.delete(k);
      if (mineSource === k) setMineSource(null);
    } else if (s.mines.has(k)) {
      s.mines.delete(k);
      s.ram += MINE_SELL_REFUND;
    }
  };
  const goMenu = () => {
    setSel(null);
    setMineSource(null);
    setScreen("menu");
  };

  if (screen === "menu") {
    return (
      <main className="fixed inset-0 flex items-center justify-center overflow-hidden bg-cover bg-center p-4 [image-rendering:pixelated]" style={{ backgroundImage: `url(${blissImg.url})` }}>
        <section className="win-frame w-full max-w-md p-1 shadow-[8px_8px_0_var(--outline)]">
          <div className="flex items-center justify-between bg-gradient-to-r from-[var(--title)] to-[var(--title-2)] px-3 py-2 font-bold text-[var(--bsod-fg)]">
            <span>💾 BSOD_defense.exe</span><span>×</span>
          </div>
          <div className="flex flex-col items-center gap-5 p-6 text-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">BSOD_defense</h1>
              <p className="mt-2 text-sm">{t.menuSubtitle}</p>
            </div>
            <div className="flex w-full max-w-xs flex-col gap-3">
              <MenuButton onClick={() => setScreen("game")}>▶ {t.play}</MenuButton>
              <MenuButton onClick={() => setScreen("settings")}>⚙ {t.settings}</MenuButton>
              <MenuButton onClick={() => setScreen("help")}>? {t.help}</MenuButton>
            </div>
            <p className="text-xs">{t.menuNote}</p>
          </div>
        </section>
      </main>
    );
  }

  if (screen === "settings") {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[var(--desktop)] p-4 font-mono">
        <section className="win-frame w-full max-w-md p-1">
          <div className="bg-gradient-to-r from-[var(--title)] to-[var(--title-2)] px-3 py-2 font-bold text-[var(--bsod-fg)]">⚙ {t.settings}</div>
          <div className="flex flex-col gap-5 p-6">
            <div><h1 className="text-xl font-bold">{t.language}</h1><p className="mt-1 text-sm">{t.languageHint}</p></div>
            <div className="grid grid-cols-2 gap-3">
              <button aria-pressed={lang === "ru"} onClick={() => setLang("ru")} className={`win-btn px-4 py-3 font-bold ${lang === "ru" ? "win-inset bg-[var(--sel)]" : ""}`}>{t.russian}</button>
              <button aria-pressed={lang === "en"} onClick={() => setLang("en")} className={`win-btn px-4 py-3 font-bold ${lang === "en" ? "win-inset bg-[var(--sel)]" : ""}`}>{t.english}</button>
            </div>
            <MenuButton onClick={() => setScreen("menu")}>{t.back}</MenuButton>
          </div>
        </section>
      </main>
    );
  }

  if (screen === "help") {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[var(--desktop)] p-3 font-mono">
        <section className="win-frame flex max-h-full w-full max-w-3xl flex-col p-1">
          <div className="bg-gradient-to-r from-[var(--title)] to-[var(--title-2)] px-3 py-2 font-bold text-[var(--bsod-fg)]">? {t.helpTitle}</div>
          <div className="win-inset m-2 space-y-4 overflow-y-auto bg-[var(--win)] p-4 text-sm leading-relaxed">
            <section><h2 className="mb-1 font-bold">{t.helpGoalTitle}</h2><p>{t.helpGoal}</p></section>
            <section><h2 className="mb-1 font-bold">{t.helpInstallTitle}</h2><p>{t.helpInstall}</p></section>
            <section><h2 className="mb-1 font-bold">{t.helpRamTitle}</h2><p>{t.helpRam}</p></section>
            <section><h2 className="mb-1 font-bold">{t.helpUnitsTitle}</h2><ul className="list-disc space-y-2 pl-5">{t.helpUnits.map((item) => <li key={item}>{item}</li>)}</ul></section>
            <section><h2 className="mb-1 font-bold">{t.helpEnemiesTitle}</h2><p>{t.helpEnemies}</p></section>
            <section><h2 className="mb-1 font-bold">{t.helpControlsTitle}</h2><p>{t.helpControls}</p></section>
          </div>
          <div className="px-2 pb-2"><MenuButton onClick={() => setScreen("menu")}>{t.back}</MenuButton></div>
        </section>
      </main>
    );
  }

  if (s.over) {
    return (
      <div className="fixed inset-0 flex flex-col items-start justify-center gap-6 overflow-hidden bg-[var(--bsod)] p-10 font-mono text-[var(--bsod-fg)]">
        <span className="bg-[var(--bsod-fg)] px-2 text-[var(--bsod)]">Windows</span>
        <p className="max-w-2xl">{t.fatal.replace("{wave}", String(s.wave))}</p>
        <p>{t.restartHint}</p>
        <div className="flex gap-3">
          <button className="win-btn px-4 py-2 text-foreground" onClick={() => { g.current = fresh(); setSel(null); setMineSource(null); force((n) => n + 1); }}>{t.restart}</button>
          <button className="win-btn px-4 py-2 text-foreground" onClick={goMenu}>{t.menu}</button>
        </div>
      </div>
    );
  }

  const fullscreen = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); };
  const status = mineSource
    ? `${t.mineTarget}${s.mines.size >= MAX_MINES ? ` ${t.mineLimit}` : ""}`
    : sel
      ? t.place.replace("{name}", UNIT_NAMES[lang][sel])
      : t.hint;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--desktop)] font-mono">
      <div className="win-frame m-1 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-[var(--title)] to-[var(--title-2)] px-2 py-1 font-bold text-[var(--bsod-fg)]">
          <span className="truncate">💾 BSOD_defense.exe</span>
          <div className="flex shrink-0 gap-1">
            <button onClick={goMenu} className="win-btn px-2 text-xs text-foreground">{t.menu}</button>
            <button onClick={fullscreen} className="win-btn px-2 text-xs text-foreground">{t.fullscreen}</button>
          </div>
        </div>
        <div className="flex flex-wrap items-stretch gap-2 border-b-2 border-[var(--win-dark)] p-2">
          <div className="win-inset flex flex-col justify-center gap-1 bg-[var(--panel)] px-3 py-1 text-[var(--shot)]">
            <div className="flex items-center gap-1"><img src={ramImg.url} alt="RAM" className="h-6 w-6 [image-rendering:pixelated]" /><b>{Math.floor(s.ram)} MB</b></div>
            <div className="font-bold text-[var(--bsod-fg)]">{t.health} {s.lives}</div>
          </div>
          {(Object.keys(UNITS) as UType[]).map((type) => (
            <button key={type} onClick={() => { setSel(sel === type ? null : type); setMineSource(null); }} disabled={s.ram < UNITS[type].cost}
              className={`win-btn flex w-20 flex-col items-center px-1 py-1 text-xs transition-transform hover:-translate-y-0.5 disabled:opacity-40 ${sel === type ? "win-inset bg-[var(--sel)]" : ""}`}>
              <img src={UNITS[type].img} alt={UNIT_NAMES[lang][type]} className="h-9 w-9 object-contain [image-rendering:pixelated]" />
              <span className="max-w-full truncate font-bold" title={UNIT_NAMES[lang][type]}>{UNIT_NAMES[lang][type]}</span>
              <span className="win-inset mt-0.5 bg-[var(--panel)] px-1 text-[var(--shot)]">{UNITS[type].cost} MB</span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="win-inset bg-[var(--panel)] px-3 py-2 text-[var(--shot)]">{t.wave} {s.wave}{s.queue.length ? ` (+${s.queue.length})` : ""}</div>
            <button onClick={nextWave} disabled={!waveAvailable} title={!waveAvailable ? t.waveRunning : undefined} className="win-btn bg-[var(--danger)] px-4 py-3 font-bold text-[var(--bsod-fg)] disabled:cursor-not-allowed disabled:opacity-40">{t.nextWave}</button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center p-2">
          <div className="relative max-h-full max-w-full select-none overflow-hidden border-2 border-foreground" style={{ aspectRatio: `${COLS}/${ROWS}`, height: "100%" }} onContextMenu={(e) => e.preventDefault()}>
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${COLS},1fr)`, gridTemplateRows: `repeat(${ROWS},1fr)` }}>
              {Array.from({ length: ROWS * COLS }, (_, i) => {
                const r = Math.floor(i / COLS), c = i % COLS, k = key(r, c), u = s.units.get(k);
                const sapperReady = u?.type === "sapper_smiley" && u.t >= SAPPER_CHARGE_SECONDS;
                return (
                  <div key={k} onClick={() => place(r, c)} onContextMenu={(e) => { e.preventDefault(); sell(r, c); }}
                    data-cell={k}
                    className={`relative flex items-center justify-center ${(r + c) % 2 ? "bg-[var(--tile-a)]" : "bg-[var(--tile-b)]"} ${sel || mineSource || sapperReady ? "cursor-pointer hover:brightness-125" : ""} ${mineSource === k ? "z-10 ring-4 ring-inset ring-[var(--shot)]" : ""}`}>
                    {s.mines.has(k) && <img src={bombImg.url} alt="mine" className="h-1/2 w-1/2 object-contain [image-rendering:pixelated] drop-shadow-[0_0_2px_var(--outline)]" />}
                    {u && (
                      <>
                        <img src={u.type === "recycle_bin" && u.recycle > 0 ? binGif.url : sapperReady ? smileReadyGif.url : UNITS[u.type].img} alt={UNIT_NAMES[lang][u.type]}
                          className={`relative z-10 object-contain [image-rendering:pixelated] drop-shadow-[0_0_2px_var(--outline)] ${u.type === "tetramino_wall" ? "h-full w-full" : "h-4/5 w-4/5"}`} />
                        <Bar hp={u.hp} max={u.max} />
                        {u.recycle > 0 && <span className="absolute bottom-0 z-20 bg-foreground px-1 text-[10px] text-background">{Math.ceil(u.recycle)}s</span>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {s.enemies.map((e) => (
              <div key={e.id} className="pointer-events-none absolute z-20" style={{ left: `${(e.x / COLS) * 100}%`, top: `${(e.row / ROWS) * 100}%`, width: `${100 / COLS}%`, height: `${100 / ROWS}%` }}>
                <img src={ENEMIES[e.type].img} alt={e.type} className="h-full w-full object-contain p-1 [image-rendering:pixelated] drop-shadow-[0_0_2px_var(--outline)]" />
                <Bar hp={e.hp} max={e.max} />
              </div>
            ))}
            {s.shots.map((sh) => (
              <span key={sh.id} className="pointer-events-none absolute z-30 font-bold text-[var(--ascii)] drop-shadow-[0_0_2px_var(--outline)]" style={{ left: `${(sh.x / COLS) * 100}%`, top: `${((sh.row + 0.35) / ROWS) * 100}%` }}>{sh.ch}</span>
            ))}
          </div>
        </div>
        <p className="px-2 pb-1 text-xs">{status}</p>
      </div>
    </div>
  );
}
