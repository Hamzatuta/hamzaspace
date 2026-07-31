"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Swords,
  CircleHelp,
  Target,
  Trophy,
  Plus,
  Trash2,
  Shield,
  Skull,
  Check,
  X,
  Volume2,
  VolumeX,
  RotateCcw,
  Music,
  Wifi,
  WifiOff,
  Settings,
  Play,
  Square,
  ChevronRight,
} from "lucide-react";

// ─── Sound ───────────────────────────────────────────────────────────────────
const SOUNDS = {
  tick: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
  win: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3",
  lose: "https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3",
  spin: "https://assets.mixkit.co/active_storage/sfx/146/146-preview.mp3",
  click: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
  duel: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
  music: "https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3",
};
type SoundKey = keyof typeof SOUNDS;

function useSound(enabled: boolean) {
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const play = useCallback(
    (sound: SoundKey) => {
      if (!enabled) return;
      if (!audioRefs.current[sound]) {
        audioRefs.current[sound] = new Audio(SOUNDS[sound]);
        audioRefs.current[sound].volume = 0.5;
      }
      const audio = audioRefs.current[sound];
      audio.currentTime = 0;
      audio.play().catch(() => {});
    },
    [enabled]
  );
  const stop = useCallback((sound: SoundKey) => {
    if (audioRefs.current[sound]) {
      audioRefs.current[sound].pause();
      audioRefs.current[sound].currentTime = 0;
    }
  }, []);
  return { play, stop };
}

// ─── Types ────────────────────────────────────────────────────────────────────
type LeaderboardEntry = { wins: number; losses: number; shields: number };
type GameMode = "menu" | "duel" | "chairs";
type TikTokStatus = "disconnected" | "connecting" | "connected" | "simulated";

interface ChatMessage {
  username: string;
  comment: string;
  timestamp: number;
}

// ─── TikTok Chat Hook ─────────────────────────────────────────────────────────
function useTikTokChat(
  status: TikTokStatus,
  setStatus: (s: TikTokStatus) => void,
  onMessage: (msg: ChatMessage) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(
    (username: string, serverUrl: string) => {
      setStatus("connecting");
      try {
        const ws = new WebSocket(`${serverUrl}?username=${username}`);
        wsRef.current = ws;

        ws.onopen = () => setStatus("connected");
        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === "chat") {
              onMessageRef.current({
                username: data.username,
                comment: data.comment,
                timestamp: Date.now(),
              });
            }
          } catch {}
        };
        ws.onerror = () => setStatus("disconnected");
        ws.onclose = () => setStatus("disconnected");
      } catch {
        setStatus("disconnected");
      }
    },
    [setStatus]
  );

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    setStatus("disconnected");
  }, [setStatus]);

  return { connect, disconnect };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_PLAYERS = ["حمزة", "ناصر", "مودي", "لولوه", "تركي"];
const JOIN_KEYWORD = "!انضم";

// ═══════════════════════════════════════════════════════════════════════════════
export default function StreamGamesHome() {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [gameMode, setGameMode] = useState<GameMode>("menu");
  const [players, setPlayers] = useState([...DEFAULT_PLAYERS]);
  const [newPlayer, setNewPlayer] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { play, stop } = useSound(soundEnabled);

  // ── TikTok ──────────────────────────────────────────────────────────────────
  const [tikTokStatus, setTikTokStatus] = useState<TikTokStatus>("disconnected");
  const [tikTokUsername, setTikTokUsername] = useState("");
  const [serverUrl, setServerUrl] = useState("ws://localhost:3001");
  const [joinKeyword, setJoinKeyword] = useState(JOIN_KEYWORD);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [showTikTokSettings, setShowTikTokSettings] = useState(false);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const chatLogRef = useRef<HTMLDivElement>(null);

  const handleChatMessage = useCallback(
    (msg: ChatMessage) => {
      setChatLog((prev) => [msg, ...prev].slice(0, 50));

      // Join keyword → add player
      if (
        msg.comment.trim().toLowerCase() === joinKeyword.trim().toLowerCase() &&
        tikTokStatus !== "disconnected"
      ) {
        setPlayers((prev) => {
          if (prev.includes(msg.username) || prev.length >= maxPlayers) return prev;
          play("click");
          return [...prev, msg.username];
        });
        setLeaderboard((prev) => ({
          ...prev,
          [msg.username]: prev[msg.username] || { wins: 0, losses: 0, shields: 0 },
        }));
      }
    },
    [joinKeyword, maxPlayers, tikTokStatus, play]
  );

  const { connect, disconnect } = useTikTokChat(
    tikTokStatus,
    setTikTokStatus,
    handleChatMessage
  );

  // Simulate chat for demo
  const simulateChat = useCallback(() => {
    setTikTokStatus("simulated");
    const names = ["فيصل", "سارة", "خالد", "نورا", "عمر", "ريم", "أحمد", "هند", "ماجد", "لين"];
    let i = 0;
    const interval = setInterval(() => {
      const name = names[i % names.length];
      handleChatMessage({ username: name, comment: joinKeyword, timestamp: Date.now() });
      i++;
      if (i >= names.length) clearInterval(interval);
    }, 800);
  }, [joinKeyword, handleChatMessage]);

  // ── Leaderboard ──────────────────────────────────────────────────────────────
  const [leaderboard, setLeaderboard] = useState<Record<string, LeaderboardEntry>>(() => {
    const init: Record<string, LeaderboardEntry> = {};
    DEFAULT_PLAYERS.forEach((p) => (init[p] = { wins: 0, losses: 0, shields: 0 }));
    return init;
  });
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    DEFAULT_PLAYERS.forEach((p) => (init[p] = 0));
    return init;
  });

  // ── Duel state ───────────────────────────────────────────────────────────────
  const [questioner, setQuestioner] = useState("");
  const [answerer, setAnswerer] = useState("");
  const [timer, setTimer] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(false);
  const [canChooseReward, setCanChooseReward] = useState(false);
  const [shields, setShields] = useState<Record<string, number>>({});
  const [duelPair, setDuelPair] = useState<string[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [rouletteResult, setRouletteResult] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [rouletteAngle, setRouletteAngle] = useState(0);
  const [resultType, setResultType] = useState<"win" | "lose" | "shield" | null>(null);
  const [winner, setWinner] = useState<string | null>(null);

  // ── Chairs state ─────────────────────────────────────────────────────────────
  const [chairsPlayers, setChairsPlayers] = useState<string[]>([]);
  const [chairsActive, setChairsActive] = useState(false);
  const [chairsPhase, setChairsPhase] = useState<"idle" | "music" | "voting" | "result">("idle");
  const [chairsVotes, setChairsVotes] = useState<Record<string, number>>({});
  const [chairsEliminated, setChairsEliminated] = useState<string | null>(null);
  const [chairsRound, setChairsRound] = useState(1);
  const [chairsWinner, setChairsWinner] = useState<string | null>(null);
  const [voteTimer, setVoteTimer] = useState(0);
  const chairsMusicRef = useRef<NodeJS.Timeout | null>(null);

  // ── Confetti ─────────────────────────────────────────────────────────────────
  const triggerConfetti = useCallback(() => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#ff6b9d", "#c44569", "#40e0d0", "#ffd700"] });
  }, []);
  const triggerDeathEffect = useCallback(() => {
    confetti({ particleCount: 50, spread: 100, origin: { y: 0.6 }, colors: ["#ff0000", "#8b0000", "#000000"], shapes: ["circle"], gravity: 1.5 });
  }, []);

  // ══════════════════════════════════════════════════════════════════════════════
  // DUEL LOGIC
  // ══════════════════════════════════════════════════════════════════════════════
  const drawPlayers = useCallback(() => {
    if (players.length < 2) return;
    setIsDrawing(true);
    play("duel");
    let iterations = 0;
    const interval = setInterval(() => {
      const p1 = players[Math.floor(Math.random() * players.length)];
      let p2 = players[Math.floor(Math.random() * players.length)];
      while (p2 === p1) p2 = players[Math.floor(Math.random() * players.length)];
      setDuelPair([p1, p2]);
      iterations++;
      if (iterations >= 15) {
        clearInterval(interval);
        setIsDrawing(false);
        play("click");
      }
    }, 100);
    setQuestioner("");
    setAnswerer("");
    setRouletteResult("");
  }, [players, play]);

  const spinRoulette = useCallback(() => {
    if (duelPair.length !== 2 || isSpinning) return;
    setIsSpinning(true);
    play("spin");
    const target = duelPair[Math.floor(Math.random() * 2)];
    const outcomes = ["death", "continue", "shield"] as const;
    const result = outcomes[Math.floor(Math.random() * outcomes.length)];
    const finalAngle = (5 + Math.random() * 3) * 360 + Math.random() * 360;
    setRouletteAngle(finalAngle);
    setTimeout(() => {
      setIsSpinning(false);
      if (result === "death") {
        if (shields[target] > 0) {
          setShields((p) => ({ ...p, [target]: p[target] - 1 }));
          setRouletteResult(`🛡️ ${target} استخدم الدرع!`);
          setResultType("shield");
          play("win");
        } else {
          setRouletteResult(`💀 ${target} مات!`);
          setResultType("lose");
          play("lose");
          triggerDeathEffect();
          setLeaderboard((p) => ({ ...p, [target]: { ...p[target], losses: (p[target]?.losses || 0) + 1 } }));
          setTimeout(() => setPlayers((p) => p.filter((x) => x !== target)), 1500);
        }
      } else if (result === "continue") {
        setRouletteResult(`✅ ${target} يكمل!`);
        setResultType("win");
        play("win");
        triggerConfetti();
      } else {
        setShields((p) => ({ ...p, [target]: (p[target] || 0) + 1 }));
        setLeaderboard((p) => ({ ...p, [target]: { ...p[target], shields: (p[target]?.shields || 0) + 1 } }));
        setRouletteResult(`🛡️ ${target} حصل على درع!`);
        setResultType("shield");
        play("win");
        triggerConfetti();
      }
      setTimeout(() => setResultType(null), 2000);
    }, 3000);
  }, [duelPair, isSpinning, shields, play, triggerConfetti, triggerDeathEffect]);

  const previewRoles = useCallback(() => {
    if (duelPair.length !== 2) return;
    play("click");
    setQuestioner(duelPair[0]);
    setAnswerer(duelPair[1]);
  }, [duelPair, play]);

  const startQuestion = useCallback(() => {
    if (duelPair.length !== 2) return;
    setQuestioner(questioner || duelPair[0]);
    setAnswerer(answerer || duelPair[1]);
    setTimer(15);
    setActiveQuestion(true);
    setCanChooseReward(false);
    play("click");
  }, [duelPair, questioner, answerer, play]);

  const resetQuestion = () => {
    setQuestioner(""); setAnswerer(""); setTimer(0);
    setActiveQuestion(false); setCanChooseReward(false);
  };

  const answerYes = useCallback(() => {
    setActiveQuestion(false); setCanChooseReward(true);
    play("win"); triggerConfetti();
    setLeaderboard((p) => ({ ...p, [answerer]: { ...p[answerer], wins: (p[answerer]?.wins || 0) + 1 } }));
  }, [play, triggerConfetti, answerer]);

  const answerNo = useCallback(() => {
    play("lose"); triggerDeathEffect();
    setLeaderboard((p) => ({ ...p, [answerer]: { ...p[answerer], losses: (p[answerer]?.losses || 0) + 1 } }));
    setPlayers((p) => p.filter((x) => x !== answerer));
    resetQuestion();
  }, [play, triggerDeathEffect, answerer]);

  const giveReward = useCallback(
    (type: "shield" | "eliminate") => {
      if (!questioner) return;
      if (type === "shield") {
        setShields((p) => ({ ...p, [answerer]: (p[answerer] || 0) + 1 }));
        setLeaderboard((p) => ({ ...p, [answerer]: { ...p[answerer], shields: (p[answerer]?.shields || 0) + 1 } }));
        play("win"); triggerConfetti();
      } else {
        const others = players.filter((p) => p !== answerer && p !== questioner);
        if (others.length > 0) {
          const victim = others[Math.floor(Math.random() * others.length)];
          play("lose"); triggerDeathEffect();
          setLeaderboard((p) => ({ ...p, [victim]: { ...p[victim], losses: (p[victim]?.losses || 0) + 1 } }));
          setPlayers((p) => p.filter((x) => x !== victim));
        }
      }
      resetQuestion();
    },
    [questioner, answerer, players, play, triggerConfetti, triggerDeathEffect]
  );

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeQuestion && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) { clearInterval(interval); answerNo(); return 0; }
          if (t <= 5) play("tick");
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeQuestion, timer, play, answerNo]);

  useEffect(() => {
    if (players.length === 1 && !winner && gameMode === "duel") {
      const last = players[0];
      setWinner(last); play("win"); triggerConfetti();
      setLeaderboard((p) => ({ ...p, [last]: { ...p[last], wins: (p[last]?.wins || 0) + 1 } }));
      setAllTimeLeaderboard((p) => ({ ...p, [last]: (p[last] || 0) + 1 }));
    } else if (players.length > 1) setWinner(null);
  }, [players, winner, gameMode, play, triggerConfetti]);

  // ══════════════════════════════════════════════════════════════════════════════
  // MUSICAL CHAIRS LOGIC
  // ══════════════════════════════════════════════════════════════════════════════

  // Handle votes from TikTok chat during chairs voting phase
  useEffect(() => {
    if (chairsPhase !== "voting" || tikTokStatus === "disconnected") return;
    const handler = (msg: ChatMessage) => {
      const name = msg.comment.trim();
      if (chairsPlayers.includes(name)) {
        setChairsVotes((p) => ({ ...p, [name]: (p[name] || 0) + 1 }));
      }
    };
    // Subscribe via chatLog — we already have handleChatMessage wired up
  }, [chairsPhase, chairsPlayers, tikTokStatus]);

  // Also allow votes from chat messages in real time
  useEffect(() => {
    if (chairsPhase !== "voting") return;
    const latest = chatLog[0];
    if (!latest) return;
    const name = latest.comment.trim();
    if (chairsPlayers.includes(name)) {
      setChairsVotes((p) => ({ ...p, [name]: (p[name] || 0) + 1 }));
    }
  }, [chatLog, chairsPhase, chairsPlayers]);

  const startChairs = useCallback(() => {
    if (players.length < 2) return;
    setChairsPlayers([...players]);
    setChairsRound(1);
    setChairsWinner(null);
    setChairsEliminated(null);
    setChairsVotes({});
    setChairsActive(true);
    setChairsPhase("idle");
  }, [players]);

  const startChairsRound = useCallback(() => {
    setChairsVotes({});
    setChairsEliminated(null);
    setChairsPhase("music");
    play("music");

    // Music phase: 5–10 seconds random
    const musicDuration = 5000 + Math.random() * 5000;
    chairsMusicRef.current = setTimeout(() => {
      stop("music");
      // Voting phase: 15 seconds
      setChairsPhase("voting");
      setVoteTimer(15);
    }, musicDuration);
  }, [play, stop]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (chairsPhase === "voting" && voteTimer > 0) {
      interval = setInterval(() => {
        setVoteTimer((t) => {
          if (t <= 1) {
            clearInterval(interval);
            // Resolve votes
            setChairsPhase("result");
            setChairsVotes((currentVotes) => {
              // Find player with most votes; random if tie
              const sorted = chairsPlayers
                .map((p) => ({ name: p, votes: currentVotes[p] || 0 }))
                .sort((a, b) => b.votes - a.votes || Math.random() - 0.5);

              const eliminated = sorted[0].name;
              setChairsEliminated(eliminated);
              play("lose");
              triggerDeathEffect();

              setTimeout(() => {
                const remaining = chairsPlayers.filter((p) => p !== eliminated);
                setChairsPlayers(remaining);
                if (remaining.length === 1) {
                  setChairsWinner(remaining[0]);
                  setChairsPhase("idle");
                  setChairsActive(false);
                  play("win");
                  triggerConfetti();
                  setAllTimeLeaderboard((p) => ({ ...p, [remaining[0]]: (p[remaining[0]] || 0) + 1 }));
                } else {
                  setChairsRound((r) => r + 1);
                  setChairsPhase("idle");
                }
              }, 3000);

              return currentVotes;
            });
            return 0;
          }
          if (t <= 5) play("tick");
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [chairsPhase, voteTimer, play, chairsPlayers, triggerDeathEffect, triggerConfetti]);

  // ── Shared helpers ────────────────────────────────────────────────────────────
  const addPlayer = useCallback(() => {
    if (!newPlayer.trim()) return;
    const name = newPlayer.trim();
    setPlayers((p) => [...p, name]);
    setLeaderboard((p) => ({ ...p, [name]: p[name] || { wins: 0, losses: 0, shields: 0 } }));
    setAllTimeLeaderboard((p) => ({ ...p, [name]: p[name] || 0 }));
    setNewPlayer("");
    play("click");
  }, [newPlayer, play]);

  const removePlayer = useCallback((player: string) => {
    setPlayers((p) => p.filter((x) => x !== player));
    play("click");
  }, [play]);

  const restartGame = useCallback(() => {
    setPlayers([...DEFAULT_PLAYERS]);
    setShields({});
    setDuelPair([]);
    setRouletteResult("");
    setWinner(null);
    resetQuestion();
    const init: Record<string, LeaderboardEntry> = {};
    DEFAULT_PLAYERS.forEach((p) => (init[p] = { wins: 0, losses: 0, shields: 0 }));
    setLeaderboard(init);
    setChairsPlayers([]);
    setChairsActive(false);
    setChairsPhase("idle");
    setChairsWinner(null);
    play("click");
  }, [play]);

  const sortedLeaderboard = Object.entries(leaderboard)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses);

  const sortedAllTime = Object.entries(allTimeLeaderboard)
    .map(([name, wins]) => ({ name, wins }))
    .sort((a, b) => b.wins - a.wins);

  const totalVotes = Object.values(chairsVotes).reduce((a, b) => a + b, 0);

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {gameMode !== "menu" && (
            <Button variant="ghost" size="icon" onClick={() => setGameMode("menu")} className="text-muted-foreground">
              <ChevronRight className="h-5 w-5 rotate-180" />
            </Button>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-primary">hamzaspace</h1>
          {gameMode !== "menu" && (
            <Badge className="bg-primary/20 text-primary text-sm">
              {gameMode === "duel" ? "⚔️ مواجهة" : "🪑 كراسي موسيقية"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={restartGame} className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            <RotateCcw className="h-4 w-4 ml-2" />
            إعادة
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="text-muted-foreground">
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* ── TikTok Bar ── */}
      <div className="mb-6 p-4 rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            {tikTokStatus === "connected" ? (
              <Wifi className="h-4 w-4 text-accent" />
            ) : tikTokStatus === "simulated" ? (
              <Wifi className="h-4 w-4 text-chart-3" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {tikTokStatus === "connected"
                ? "متصل بـ TikTok Live"
                : tikTokStatus === "simulated"
                ? "وضع المحاكاة"
                : tikTokStatus === "connecting"
                ? "جاري الاتصال..."
                : "غير متصل"}
            </span>
          </div>

          {tikTokStatus === "disconnected" && (
            <>
              <Input
                className="w-40 h-8 text-sm bg-input border-border"
                placeholder="@اسم المستخدم"
                value={tikTokUsername}
                onChange={(e) => setTikTokUsername(e.target.value)}
              />
              <Button
                size="sm"
                onClick={() => connect(tikTokUsername, serverUrl)}
                disabled={!tikTokUsername}
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-8"
              >
                اتصال
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={simulateChat}
                className="h-8 text-xs"
              >
                تجربة بدون TikTok
              </Button>
            </>
          )}

          {(tikTokStatus === "connected" || tikTokStatus === "simulated") && (
            <Button size="sm" variant="destructive" onClick={disconnect} className="h-8">
              قطع الاتصال
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-auto"
            onClick={() => setShowTikTokSettings(!showTikTokSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {showTikTokSettings && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">كلمة الانضمام</label>
              <Input className="h-8 text-sm bg-input" value={joinKeyword} onChange={(e) => setJoinKeyword(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">حد اللاعبين</label>
              <Input className="h-8 text-sm bg-input" type="number" value={maxPlayers} onChange={(e) => setMaxPlayers(+e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">WebSocket Server URL</label>
              <Input className="h-8 text-sm bg-input" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
            </div>
          </div>
        )}

        {/* Chat log */}
        {tikTokStatus !== "disconnected" && (
          <div ref={chatLogRef} className="mt-3 max-h-24 overflow-y-auto space-y-1">
            {chatLog.slice(0, 10).map((msg, i) => (
              <div key={i} className="text-xs flex gap-2">
                <span className="text-primary font-medium">{msg.username}</span>
                <span className="text-muted-foreground">{msg.comment}</span>
              </div>
            ))}
            {chatLog.length === 0 && (
              <p className="text-xs text-muted-foreground">في انتظار رسائل الشات... اكتب <strong>{joinKeyword}</strong> للانضمام</p>
            )}
          </div>
        )}
      </div>

      {/* ── Menu ── */}
      {gameMode === "menu" && (
        <div className="space-y-6">
          {/* Players */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                اللاعبين ({players.length})
                {tikTokStatus !== "disconnected" && (
                  <Badge className="bg-accent/20 text-accent text-xs">يتم الإضافة تلقائياً من الشات</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input className="flex-1 bg-input border-border" placeholder="أضف لاعب يدوياً..." value={newPlayer} onChange={(e) => setNewPlayer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPlayer()} />
                <Button onClick={addPlayer} className="bg-accent hover:bg-accent/90 text-accent-foreground"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {players.map((p) => (
                  <div key={p} className="group flex items-center justify-between bg-secondary p-3 rounded-lg hover:bg-secondary/80 transition-all">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{p}</span>
                      {shields[p] > 0 && (
                        <Badge className="bg-primary/20 text-primary text-xs"><Shield className="h-3 w-3 mr-1" />{shields[p]}</Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removePlayer(p)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Game selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className="border-primary/50 bg-card cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
              onClick={() => { if (players.length >= 2) setGameMode("duel"); }}
            >
              <CardContent className="p-6 text-center">
                <Swords className="h-12 w-12 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <h2 className="text-xl font-bold mb-2">المواجهة</h2>
                <p className="text-sm text-muted-foreground">سؤال، روليت، ودراما — لاعبان يواجه بعض كل جولة</p>
                {players.length < 2 && <Badge className="mt-3 bg-destructive/20 text-destructive">يحتاج لاعبَين على الأقل</Badge>}
              </CardContent>
            </Card>

            <Card
              className="border-accent/50 bg-card cursor-pointer hover:border-accent hover:bg-accent/5 transition-all group"
              onClick={() => { if (players.length >= 3) { setGameMode("chairs"); startChairs(); } }}
            >
              <CardContent className="p-6 text-center">
                <Music className="h-12 w-12 text-accent mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <h2 className="text-xl font-bold mb-2">الكراسي الموسيقية</h2>
                <p className="text-sm text-muted-foreground">الموسيقى تقف، الشات يصوّت، واحد يطير كل جولة</p>
                {players.length < 3 && <Badge className="mt-3 bg-destructive/20 text-destructive">يحتاج 3 لاعبين على الأقل</Badge>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* DUEL MODE */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {gameMode === "duel" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Players */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />اللاعبين ({players.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input className="flex-1 bg-input" placeholder="اسم اللاعب..." value={newPlayer} onChange={(e) => setNewPlayer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPlayer()} />
                  <Button onClick={addPlayer} className="bg-accent hover:bg-accent/90"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {players.map((p) => (
                    <div key={p} className="group flex items-center justify-between bg-secondary p-3 rounded-lg hover:bg-secondary/80 transition-all">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p}</span>
                        {shields[p] > 0 && <Badge className="bg-primary/20 text-primary text-xs"><Shield className="h-3 w-3 mr-1" />{shields[p]}</Badge>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => removePlayer(p)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Duel */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2"><Swords className="h-5 w-5 text-primary" />المواجهة</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={drawPlayers} disabled={players.length < 2 || isDrawing} className="w-full bg-primary hover:bg-primary/90 mb-4">
                  {isDrawing ? "جاري الاختيار..." : "اختيار مواجهة 🎲"}
                </Button>
                {duelPair.length === 2 && (
                  <div className={isDrawing ? "animate-pulse" : ""}>
                    <div className="flex items-center justify-center gap-4 p-6 bg-secondary rounded-lg mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{duelPair[0]}</div>
                        {questioner === duelPair[0] && <Badge className="mt-2 bg-chart-3 text-foreground">السائل</Badge>}
                      </div>
                      <div className="text-3xl font-bold text-muted-foreground">VS</div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-accent">{duelPair[1]}</div>
                        {answerer === duelPair[1] && <Badge className="mt-2 bg-chart-4 text-foreground">المجيب</Badge>}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button onClick={previewRoles} variant="secondary" className="bg-chart-3/20 text-chart-3">تحديد الأدوار</Button>
                      <Button onClick={startQuestion} className="bg-accent hover:bg-accent/90"><CircleHelp className="h-4 w-4 mr-2" />سؤال</Button>
                      <Button onClick={spinRoulette} disabled={isSpinning} className="bg-primary hover:bg-primary/90"><Target className="h-4 w-4 mr-2" />{isSpinning ? "..." : "روليت"}</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Question */}
            {activeQuestion && (
              <Card className="border-primary bg-card animate-in fade-in slide-in-from-bottom-4 duration-300">
                <CardContent className="pt-6">
                  <div className="text-center mb-6">
                    <div className="flex justify-center gap-8 mb-4">
                      <div><div className="text-sm text-muted-foreground mb-1">السائل</div><div className="text-xl font-bold text-chart-3">{questioner}</div></div>
                      <div><div className="text-sm text-muted-foreground mb-1">المجيب</div><div className="text-xl font-bold text-chart-4">{answerer}</div></div>
                    </div>
                    <div className="relative w-32 h-32 mx-auto mb-4">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" className="text-secondary" />
                        <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(timer / 15) * 352} 352`} className={`transition-all duration-1000 ${timer <= 5 ? "text-destructive" : "text-primary"}`} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-4xl font-bold ${timer <= 5 ? "text-destructive animate-pulse" : ""}`}>{timer}</span>
                      </div>
                    </div>
                    <Progress value={(timer / 15) * 100} className={`h-2 ${timer <= 5 ? "[&>div]:bg-destructive" : ""}`} />
                  </div>
                  <div className="flex gap-4">
                    <Button onClick={answerYes} className="flex-1 bg-accent hover:bg-accent/90"><Check className="h-5 w-5 mr-2" />جاوب صح</Button>
                    <Button onClick={answerNo} variant="destructive" className="flex-1"><X className="h-5 w-5 mr-2" />ما جاوب</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reward */}
            {canChooseReward && (
              <Card className="border-accent bg-card animate-in fade-in slide-in-from-bottom-4 duration-300">
                <CardContent className="pt-6 text-center">
                  <h3 className="text-xl font-bold text-accent mb-1">اختر المكافأة!</h3>
                  <p className="text-muted-foreground mb-4">{answerer} فاز!</p>
                  <div className="flex gap-4">
                    <Button onClick={() => giveReward("shield")} className="flex-1 bg-primary hover:bg-primary/90"><Shield className="h-5 w-5 mr-2" />درع</Button>
                    <Button onClick={() => giveReward("eliminate")} variant="destructive" className="flex-1"><Skull className="h-5 w-5 mr-2" />إقصاء لاعب</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Winner */}
            {winner && (
              <Card className="border-chart-3 bg-chart-3/10 animate-in zoom-in duration-500">
                <CardContent className="pt-6 text-center">
                  <Trophy className="h-16 w-16 text-chart-3 mx-auto mb-4 animate-bounce" />
                  <h2 className="text-3xl font-bold text-chart-3 mb-2">الفائز!</h2>
                  <div className="text-4xl font-bold">{winner}</div>
                </CardContent>
              </Card>
            )}

            {/* Roulette result */}
            {rouletteResult && (
              <div className={`text-center p-6 rounded-lg animate-in zoom-in duration-300 ${resultType === "win" ? "bg-accent/20 text-accent" : resultType === "lose" ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"}`}>
                <div className="text-3xl font-bold">{rouletteResult}</div>
              </div>
            )}

            {isSpinning && (
              <div className="flex justify-center">
                <div className="w-48 h-48 rounded-full border-8 border-primary relative transition-transform duration-[3000ms] ease-out" style={{ transform: `rotate(${rouletteAngle}deg)` }}>
                  <div className="absolute inset-0 flex items-center justify-center"><Target className="w-12 h-12 text-primary" /></div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-4 h-4 bg-destructive rotate-45" />
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-border bg-card sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-chart-3" />لوحة الجولة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedLeaderboard.map((e, i) => (
                    <div key={e.name} className={`flex items-center justify-between p-3 rounded-lg ${i === 0 ? "bg-chart-3/20 border border-chart-3/30" : i === 1 ? "bg-muted/50" : "bg-secondary/50"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold ${i === 0 ? "text-chart-3" : "text-muted-foreground"}`}>#{i + 1}</span>
                        <span className="font-medium">{e.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-accent flex items-center gap-1"><Check className="h-3 w-3" />{e.wins}</span>
                        <span className="text-destructive flex items-center gap-1"><X className="h-3 w-3" />{e.losses}</span>
                        <span className="text-primary flex items-center gap-1"><Shield className="h-3 w-3" />{e.shields}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="border-chart-3/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-chart-3"><Trophy className="h-5 w-5" />الكل الوقت</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sortedAllTime.map((e, i) => (
                    <div key={e.name} className={`flex items-center justify-between p-3 rounded-lg ${i === 0 ? "bg-gradient-to-r from-chart-3/30 to-chart-3/10 border border-chart-3/50" : "bg-secondary/50"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${i === 0 ? "text-chart-3" : "text-muted-foreground"}`}>{i === 0 ? "🏆" : `#${i + 1}`}</span>
                        <span className="font-medium">{e.name}</span>
                      </div>
                      <span className="text-xl font-bold text-chart-3">{e.wins}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MUSICAL CHAIRS MODE */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {gameMode === "chairs" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Status */}
            <Card className={`border-2 ${chairsPhase === "music" ? "border-accent animate-pulse" : chairsPhase === "voting" ? "border-destructive" : "border-border"} bg-card`}>
              <CardContent className="pt-6 text-center">
                <div className="mb-4">
                  {chairsPhase === "idle" && !chairsWinner && (
                    <>
                      <Music className="h-16 w-16 text-accent mx-auto mb-3" />
                      <h2 className="text-2xl font-bold mb-2">الجولة {chairsRound}</h2>
                      <p className="text-muted-foreground mb-4">{chairsPlayers.length} لاعب متبقي</p>
                      <Button onClick={startChairsRound} className="bg-accent hover:bg-accent/90 text-accent-foreground px-8">
                        <Play className="h-5 w-5 mr-2" />
                        ابدأ الجولة
                      </Button>
                    </>
                  )}

                  {chairsPhase === "music" && (
                    <>
                      <div className="text-6xl mb-4 animate-bounce">🎵</div>
                      <h2 className="text-2xl font-bold text-accent">الموسيقى شغّالة...</h2>
                      <p className="text-muted-foreground">العب واستمتع — ما تعرف متى تقف!</p>
                    </>
                  )}

                  {chairsPhase === "voting" && (
                    <>
                      <Square className="h-12 w-12 text-destructive mx-auto mb-3" />
                      <h2 className="text-2xl font-bold text-destructive mb-1">الموسيقى وقفت! 🛑</h2>
                      <p className="text-muted-foreground mb-4">
                        الشات يصوّت — اكتب اسم اللاعب اللي تبيه يطير!
                      </p>
                      <div className="text-5xl font-bold text-destructive mb-4">{voteTimer}</div>
                      <Progress value={(voteTimer / 15) * 100} className="h-3 [&>div]:bg-destructive" />
                    </>
                  )}

                  {chairsPhase === "result" && chairsEliminated && (
                    <>
                      <div className="text-6xl mb-4">💀</div>
                      <h2 className="text-3xl font-bold text-destructive">{chairsEliminated} طار!</h2>
                      <p className="text-muted-foreground">أعلى الأصوات: {chairsVotes[chairsEliminated] || 0} صوت</p>
                    </>
                  )}

                  {chairsWinner && (
                    <>
                      <Trophy className="h-20 w-20 text-chart-3 mx-auto mb-4 animate-bounce" />
                      <h2 className="text-4xl font-bold text-chart-3 mb-2">🎉 الفائز!</h2>
                      <div className="text-5xl font-bold">{chairsWinner}</div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Players grid */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  اللاعبين المتبقين ({chairsPlayers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {chairsPlayers.map((p) => {
                    const votes = chairsVotes[p] || 0;
                    const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                    return (
                      <div key={p} className={`p-3 rounded-lg border transition-all ${chairsEliminated === p ? "border-destructive bg-destructive/20" : chairsPhase === "voting" && votes > 0 ? "border-destructive/50 bg-destructive/10" : "border-border bg-secondary"}`}>
                        <div className="font-medium text-sm mb-1">{p}</div>
                        {chairsPhase === "voting" && (
                          <>
                            <div className="text-xs text-muted-foreground mb-1">{votes} صوت</div>
                            <Progress value={pct} className="h-1.5 [&>div]:bg-destructive" />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Simulate votes (for demo without TikTok) */}
            {chairsPhase === "voting" && tikTokStatus === "disconnected" && (
              <Card className="border-dashed border-muted-foreground bg-card">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground mb-3">اختبار: اضغط على لاعب لإضافة صوت يدوي</p>
                  <div className="flex flex-wrap gap-2">
                    {chairsPlayers.map((p) => (
                      <Button key={p} variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => setChairsVotes((prev) => ({ ...prev, [p]: (prev[p] || 0) + 1 }))}>
                        +1 لـ {p}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Round info */}
            <Card className="border-accent/50 bg-card sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-accent"><Music className="h-5 w-5" />معلومات اللعبة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between p-3 bg-secondary rounded-lg">
                  <span className="text-muted-foreground text-sm">الجولة</span>
                  <span className="font-bold">{chairsRound}</span>
                </div>
                <div className="flex justify-between p-3 bg-secondary rounded-lg">
                  <span className="text-muted-foreground text-sm">متبقي</span>
                  <span className="font-bold">{chairsPlayers.length} لاعب</span>
                </div>
                <div className="flex justify-between p-3 bg-secondary rounded-lg">
                  <span className="text-muted-foreground text-sm">خرجوا</span>
                  <span className="font-bold text-destructive">{players.length - chairsPlayers.length}</span>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">كيف يصوّت الشات: اكتبوا اسم اللاعب بالضبط في الشات خلال وقت التصويت</p>
                </div>
              </CardContent>
            </Card>

            {/* All-time */}
            <Card className="border-chart-3/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-chart-3"><Trophy className="h-5 w-5" />الكل الوقت</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sortedAllTime.filter(e => e.wins > 0).map((e, i) => (
                    <div key={e.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2">
                        <span className="text-chart-3 font-bold">{i === 0 ? "🏆" : `#${i + 1}`}</span>
                        <span className="font-medium text-sm">{e.name}</span>
                      </div>
                      <span className="font-bold text-chart-3">{e.wins}</span>
                    </div>
                  ))}
                  {sortedAllTime.filter(e => e.wins > 0).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">لا يوجد فائزين بعد</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
