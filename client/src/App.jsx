import React, { useMemo, useRef, useState, useEffect } from "react";
import { FaHandRock, FaHandPaper, FaHandScissors, FaShieldAlt, FaFire, FaRegSadTear } from "react-icons/fa";
import { TbConfetti } from "react-icons/tb";

const MOVES = ["rock", "paper", "scissor"]; // use "scissor" to keep classnames simple

const Difficulty = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
};

function pickCounter(move) {
  if (move === "rock") return "paper";
  if (move === "paper") return "scissor";
  return "rock";
}

function beats(a, b) {
  return (
    (a === "rock" && b === "scissor") ||
    (a === "paper" && b === "rock") ||
    (a === "scissor" && b === "paper")
  );
}

function useBiasBot(difficulty, recentUserMoves) {
  // bot biases against user's most common recent move
  const biasStrength = useMemo(() => {
    switch (difficulty) {
      case Difficulty.EASY:
        return 0.3;
      case Difficulty.MEDIUM:
        return 0.5;
      case Difficulty.HARD:
        return 0.7;
      default:
        return 0.5;
    }
  }, [difficulty]);

  const choose = (userLockFast) => {
    // base probabilities
    let probs = { rock: 1 / 3, paper: 1 / 3, scissor: 1 / 3 };

    if (recentUserMoves.length > 0) {
      const counts = { rock: 0, paper: 0, scissor: 0 };
      for (const m of recentUserMoves) counts[m]++;
      const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      const counter = pickCounter(mostCommon);
      // increase counter prob, decrease others
      probs[counter] += biasStrength * 0.5;
      const dec = (biasStrength * 0.5) / 2;
      for (const m of MOVES) if (m !== counter) probs[m] -= dec;
    }

    // slight extra edge in higher difficulties when user locks fast
    if (userLockFast) {
      if (difficulty === Difficulty.MEDIUM) probs = nudge(probs, 0.05);
      if (difficulty === Difficulty.HARD) probs = nudge(probs, 0.08);
    }

    // normalize
    const total = probs.rock + probs.paper + probs.scissor;
    probs.rock /= total; probs.paper /= total; probs.scissor /= total;

    const r = Math.random();
    if (r < probs.rock) return "rock";
    if (r < probs.rock + probs.paper) return "paper";
    return "scissor";
  };

  function nudge(p, amount) {
    // make bot slightly stronger overall by shifting mass to winning against random
    // heuristic: push towards paper (beats rock) a bit, etc.
    return {
      rock: Math.max(0.05, p.rock - amount / 3),
      paper: Math.min(0.9, p.paper + amount / 2),
      scissor: Math.max(0.05, p.scissor - amount / 6),
    };
  }

  return { choose };
}

export default function App() {
  const [difficulty, setDifficulty] = useState(Difficulty.MEDIUM);
  const [userHP, setUserHP] = useState(100);
  const [botHP, setBotHP] = useState(100);
  const [userWins, setUserWins] = useState(0); // kept for potential future stats, not displayed
  const [botWins, setBotWins] = useState(0);
  const [round, setRound] = useState(1);
  const [streak, setStreak] = useState(0);
  const [hasShield, setHasShield] = useState(false);
  const [shieldArmed, setShieldArmed] = useState(false);
  const [recentMoves, setRecentMoves] = useState([]); // last 10 user moves
  const [userChoice, setUserChoice] = useState(null);
  const [botChoice, setBotChoice] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [shakeWho, setShakeWho] = useState(null); // 'user' | 'bot' | null
  const [floatDmg, setFloatDmg] = useState(null); // { who: 'user'|'bot', amount: number, key: number } | null
  const [message, setMessage] = useState("Pick a card");
  const [score, setScore] = useState(0);
  const [lockStart, setLockStart] = useState(null);
  const [lockedWithin5s, setLockedWithin5s] = useState(false);
  const [winBanner, setWinBanner] = useState(null); // 'win' | 'lose' | null
  const [lastBotMove, setLastBotMove] = useState(null);
  const [lastUserMove, setLastUserMove] = useState(null);
  const [timeLeftMs, setTimeLeftMs] = useState(5000);
  const [bestScore, setBestScore] = useState(() => {
    const v = localStorage.getItem("rps_best_score");
    return v ? Number(v) : 0;
  });
  const [bestRounds, setBestRounds] = useState(() => {
    const v = localStorage.getItem("rps_best_rounds");
    return v ? Number(v) : 0;
  });

  const lockTimerRef = useRef(null);
  const { choose } = useBiasBot(difficulty, recentMoves);

  useEffect(() => {
    // reset lock window each round
    setLockStart(Date.now());
  }, [round]);

  useEffect(() => {
    if (!lockStart) return;
    setTimeLeftMs(5000);
    const id = setInterval(() => {
      const elapsed = Date.now() - lockStart;
      const rem = Math.max(0, 5000 - elapsed);
      setTimeLeftMs(rem);
      if (rem === 0) {
        clearInterval(id);
      }
    }, 100);
    return () => clearInterval(id);
  }, [lockStart]);

  // Win condition now based solely on HP reaching 0

  function damagePerWin() {
    switch (difficulty) {
      case Difficulty.EASY:
        return 12;
      case Difficulty.MEDIUM:
        return 15;
      case Difficulty.HARD:
        return 18;
      default:
        return 15;
    }
  }

  function handlePick(move) {
    if (isRevealed) return;
    const fast = lockStart && Date.now() - lockStart <= 5000;
    setLockedWithin5s(fast);
    setUserChoice(move);
    // pick bot move with bias
    const bot = choose(fast);
    setBotChoice(bot);
    setIsRevealed(true);
    setRecentMoves((prev) => {
      const next = [...prev, move].slice(-10);
      return next;
    });

    // resolve after short delay to allow swipe animation
    clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => resolveRound(move, bot, fast), 600);
  }

  function resolveRound(user, bot, fast) {
    const dmg = damagePerWin();
    setLastBotMove(bot);
    setLastUserMove(user);
    if (user === bot) {
      setMessage("Draw. No damage.");
      setStreak(0);
      nextRound();
      return;
    }
    if (beats(user, bot)) {
      const newBotHP = Math.max(0, botHP - dmg);
      setMessage(`You win the round! ${dmg} dmg`);
      setBotHP(newBotHP);
      setShakeWho("bot");
      setFloatDmg({ who: "bot", amount: dmg, key: Date.now() });
      setUserWins((w) => w + 1);
      setStreak((s) => {
        const ns = s + 1;
        if (ns >= 2) setHasShield(true);
        return ns;
      });
      const base = 100;
      const bonus = fast ? base * 0.1 : 0;
      setScore((sc) => sc + base + bonus);
      if (newBotHP <= 0) {
        // player wins match
        setWinBanner("win");
        // update best score
        if (score > bestScore) {
          setBestScore(score);
          setBestRounds(round);
          localStorage.setItem("rps_best_score", String(score));
          localStorage.setItem("rps_best_rounds", String(round));
        }
        setTimeout(() => {
          resetGame();
          setWinBanner(null);
        }, 1500);
      }
    } else {
      // bot wins
      let applied = dmg;
      if (hasShield && shieldArmed) {
        applied = Math.floor(dmg * 0.5);
        setHasShield(false);
        setShieldArmed(false);
      }
      const newUserHP = Math.max(0, userHP - applied);
      setMessage(`Bot wins the round! ${applied} dmg to you`);
      setUserHP(newUserHP);
      setShakeWho("user");
      setFloatDmg({ who: "user", amount: applied, key: Date.now() });
      setBotWins((w) => w + 1);
      setStreak(0);
      if (newUserHP <= 0) {
        // bot wins match
        setWinBanner("lose");
        // update best score as well on loss
        if (score > bestScore) {
          setBestScore(score);
          setBestRounds(round);
          localStorage.setItem("rps_best_score", String(score));
          localStorage.setItem("rps_best_rounds", String(round));
        }
        setTimeout(() => {
          resetGame();
          setWinBanner(null);
        }, 1500);
      }
    }

    // check game over (10 round wins by either side)
    setTimeout(() => {
      setIsRevealed(false);
      setShakeWho(null);
      setFloatDmg(null);
      // only advance if no one has won by HP
      if (userHP > 0 && botHP > 0) {
        nextRound();
      }
    }, 400);
  }

  function nextRound() {
    setRound((r) => r + 1);
    setUserChoice(null);
    setBotChoice(null);
    setIsRevealed(false);
  }

  function resetGame() {
    setUserHP(100);
    setBotHP(100);
    setUserWins(0);
    setBotWins(0);
    setRound(1);
    setStreak(0);
    setHasShield(false);
    setShieldArmed(false);
    setRecentMoves([]);
    setUserChoice(null);
    setBotChoice(null);
    setIsRevealed(false);
    setMessage("Pick a card");
    setScore(0);
    setLockedWithin5s(false);
    setLockStart(Date.now());
  }

  function armShield() {
    if (hasShield) setShieldArmed((v) => !v);
  }

  const cardBase = "w-36 h-52 rounded-2xl flex items-center justify-center select-none cursor-pointer transition-transform duration-300";
  const faceDown = "bg-secondary/30 border border-border/60 backdrop-blur-sm";
  const faceUp = "bg-card/70 border border-border/60 backdrop-blur-sm";

  return (
    <div className="min-h-full aurora-bg flex flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-4xl font-semibold">RPS Twist</h1>

      <div className="flex items-center gap-3">
        <label className="text-sm opacity-80">Difficulty</label>
        <select
          className="bg-card border border-border px-3 py-2 rounded-md"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value={Difficulty.EASY}>Easy</option>
          <option value={Difficulty.MEDIUM}>Medium</option>
          <option value={Difficulty.HARD}>Hard</option>
        </select>
        <button className="ml-2 px-3 py-2 rounded-md bg-destructive text-white" onClick={resetGame}>Replay</button>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-3 items-center text-xl">
        <div className="opacity-80">High Score: {Math.round(bestScore)} pts · {bestRounds || 0} rounds</div>
        <div className="opacity-90 text-center flex items-center justify-center gap-2">
          <FaFire className="text-orange-400" />
          <span>Streak: {streak}</span>
          {hasShield && <span className="flex items-center gap-1 text-accent"><FaShieldAlt /> Shield ready</span>}
          {shieldArmed && <span className="opacity-80">(armed)</span>}
        </div>
        <div className="opacity-80 text-right">Score {Math.round(score)} · Round {round}</div>
      </div>

      <div className="w-full max-w-6xl flex items-center justify-center gap-3 text-sm opacity-85">
        <div className="min-w-[110px]">Time bonus:</div>
        <div className="w-1/2 h-2 bg-border rounded">
          <div className="h-full bg-accent rounded" style={{ width: `${(timeLeftMs / 5000) * 100}%` }} />
        </div>
        <div className="w-14 text-right tabular-nums">{(timeLeftMs / 1000).toFixed(1)}s</div>
      </div>
      {hasShield && (
        <button
          className={`px-4 py-2 rounded-md border ${shieldArmed ? "bg-accent/30 border-accent" : "bg-card border-border"}`}
          onClick={armShield}
        >
          {shieldArmed ? "Unarm Shield (halves next damage)" : "Arm Shield (after 2-win streak)"}
        </button>
      )}

      <div className="w-full max-w-6xl grid grid-cols-2 gap-12 items-center">
        {/* Opponent side */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-80">
            <div className="text-sm text-right mb-1">AI HP: {botHP}</div>
            <div className="h-3 w-full bg-border rounded">
              <div className="h-full bg-destructive rounded" style={{ width: `${botHP}%` }} />
            </div>
          </div>
          <div className="h-10" />
          <div className={`relative ${cardBase} card-3d ${isRevealed ? "flip-in swipe-in-left" : ""} ${shakeWho === "bot" ? "shake-small" : ""} ${isRevealed ? faceUp : faceDown}` }>
            {isRevealed && (
              <span className="capitalize text-2xl flex items-center gap-2">
                {botChoice === "rock" && <FaHandRock />}
                {botChoice === "paper" && <FaHandPaper />}
                {botChoice === "scissor" && <FaHandScissors />}
                {botChoice}
              </span>
            )}
            {floatDmg && floatDmg.who === "bot" && (
              <div key={floatDmg.key} className="absolute -top-4 right-1/2 translate-x-1/2 text-destructive font-bold float-up">-{floatDmg.amount}</div>
            )}
          </div>
          <div className="text-sm opacity-80 h-5">{lastBotMove ? `Last move: ${lastBotMove}` : ""}</div>
        </div>

        {/* Your side */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-80">
            <div className="text-sm mb-1">Your HP: {userHP}</div>
            <div className="h-3 w-full bg-border rounded">
              <div className="h-full bg-accent rounded" style={{ width: `${userHP}%` }} />
            </div>
          </div>
          {message && message.toLowerCase().startsWith("pick a card") && (
            <div className="text-2xl font-semibold text-accent/90 mb-1">Pick a Card</div>
          )}
          <div className="relative flex justify-center items-center gap-6 min-h-[13rem]">
            {MOVES.map((m) => (
              <div
                key={m}
                className={`${cardBase} card-3d ${faceUp} ${userChoice === m ? "-translate-y-2 ring-2 ring-accent" : "hover:-translate-y-1"} ${isRevealed && userChoice === m ? "flip-in swipe-in-right" : ""} ${shakeWho === "user" && userChoice === m ? "shake-small" : ""}`}
                onClick={() => handlePick(m)}
              >
                <span className="capitalize text-2xl flex items-center gap-2">
                  {m === "rock" && <FaHandRock />}
                  {m === "paper" && <FaHandPaper />}
                  {m === "scissor" && <FaHandScissors />}
                  {m}
                </span>
              </div>
            ))}
            {floatDmg && floatDmg.who === "user" && (
              <div key={floatDmg.key} className="absolute -top-4 left-1/2 -translate-x-1/2 text-destructive font-bold float-up">-{floatDmg.amount}</div>
            )}
          </div>
          <div className="text-sm opacity-80 h-5">{lastUserMove ? `Your last move: ${lastUserMove}` : ""}</div>
        </div>
      </div>

      {(!message || !message.toLowerCase().startsWith("pick a card")) && (
        <div className="text-base opacity-90">
          {message} {lockedWithin5s ? "(+10% score)" : ""}
        </div>
      )}

      <div className="text-sm opacity-70">Draws deal no damage. Shield unlocks after 2-win streak and halves next damage when armed.</div>

      {winBanner && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          <div className={`px-10 py-8 rounded-2xl ${winBanner === "win" ? "bg-accent/20" : "bg-destructive/20"} border border-border backdrop-blur-sm scale-100 opacity-100 transition-all duration-300 animate-pulse flex flex-col items-center gap-2`}>
            <div className={`text-5xl font-extrabold ${winBanner === "win" ? "text-accent" : "text-destructive"} flex items-center gap-3`}>
              {winBanner === "win" ? <TbConfetti /> : <FaRegSadTear />}
              {winBanner === "win" ? "You Win!" : "You Lose"}
            </div>
            <div className="text-base opacity-80 mt-1 text-center">Restarting…</div>
          </div>
        </div>
      )}
    </div>
  );
}
