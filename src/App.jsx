import { useState, useEffect, useCallback, useMemo } from 'react';
import { generateSudoku } from './utils/sudoku';
import confetti from 'canvas-confetti';

/* ===== SVG ICON COMPONENTS ===== */
const Icon = ({ children, size = 22, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round" {...props}>{children}</svg>
);

const UndoIcon = (p) => <Icon {...p}><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></Icon>;
const EraseIcon = (p) => <Icon {...p}><path d="M20 20H7L3 16l10-10 7 7-3 3"/><path d="m18 13-1.5-1.5"/></Icon>;
const PencilIcon = (p) => <Icon {...p}><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></Icon>;
const HintIcon = (p) => <Icon {...p}><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></Icon>;
const PauseIcon = (p) => <Icon {...p}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></Icon>;
const PlayIcon = (p) => <Icon {...p}><polygon points="5 3 19 12 5 21 5 3"/></Icon>;
const TrophyIcon = (p) => <Icon {...p} size={36}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 22V8a4 4 0 0 1 4 0v14"/><path d="M6 4h12v5a6 6 0 0 1-12 0V4Z"/></Icon>;
const SadIcon = (p) => <Icon {...p} size={36}><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></Icon>;
const SunIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></Icon>;
const MoonIcon = (p) => <Icon {...p}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></Icon>;
const StatsIcon = (p) => <Icon {...p}><path d="M3 3v18h18"/><path d="M7 16v-4"/><path d="M11 16V9"/><path d="M15 16v-7"/><path d="M19 16V5"/></Icon>;

/* ===== CONSTANTS ===== */
const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert', 'master', 'extreme'];
const MAX_MISTAKES = 3;
const SCORE_BY_DIFFICULTY = {
  easy: 80,
  medium: 120,
  hard: 170,
  expert: 230,
  master: 300,
  extreme: 380,
};
const HINT_PENALTY = 120;
const MISTAKE_PENALTY = 80;
const createEmptyNotes = () => Array.from({ length: 81 }, () => new Set());
const createDefaultStats = () => DIFFICULTIES.reduce((acc, difficulty) => {
  acc[difficulty] = { played: 0, won: 0, bestTime: null, bestScore: 0 };
  return acc;
}, {});

const normalizeStats = (stats = {}) => {
  const defaults = createDefaultStats();
  return DIFFICULTIES.reduce((acc, difficulty) => {
    acc[difficulty] = {
      ...defaults[difficulty],
      ...(stats[difficulty] || {}),
    };
    return acc;
  }, {});
};

const createGameState = (difficulty = 'easy') => {
  const { puzzle, solution } = generateSudoku(difficulty);

  return {
    board: puzzle.map(row => [...row]),
    initialBoard: puzzle.map(row => [...row]),
    solution,
    difficulty,
    notes: createEmptyNotes(),
    mistakes: 0,
    timer: 0,
    score: 0,
    streak: 0,
    history: [],
  };
};

const loadInitialGameState = () => {
  const saved = localStorage.getItem('sudoku_current_game');

  if (!saved) return createGameState('easy');

  try {
    const state = JSON.parse(saved);
    return {
      ...state,
      score: state.score || 0,
      streak: state.streak || 0,
      notes: state.notes.map(values => new Set(values)),
      history: state.history.map(item => ({
        board: item.board,
        notes: item.notes.map(values => new Set(values)),
        score: item.score || 0,
        streak: item.streak || 0,
      })),
    };
  } catch (error) {
    console.error('Failed to load saved game', error);
    localStorage.removeItem('sudoku_current_game');
    return createGameState('easy');
  }
};

/* ===== MAIN APP ===== */
export default function App() {
  const [initialGame] = useState(loadInitialGameState);

  // ---- Game State ----
  const [board, setBoard] = useState(initialGame.board);
  const [initialBoard, setInitialBoard] = useState(initialGame.initialBoard);
  const [solution, setSolution] = useState(initialGame.solution);
  const [selectedCell, setSelectedCell] = useState(null);
  const [difficulty, setDifficulty] = useState(initialGame.difficulty);
  const [notes, setNotes] = useState(initialGame.notes);
  const [isNotesMode, setIsNotesMode] = useState(false);
  const [mistakes, setMistakes] = useState(initialGame.mistakes);
  const [timer, setTimer] = useState(initialGame.timer);
  const [score, setScore] = useState(initialGame.score);
  const [streak, setStreak] = useState(initialGame.streak);
  const [isPaused, setIsPaused] = useState(false);
  const [history, setHistory] = useState(initialGame.history);
  const [gameWon, setGameWon] = useState(false);
  const [gameLost, setGameLost] = useState(false);
  
  // ---- Settings & Persistence ----
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('sudoku_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('sudoku_stats');
    if (!saved) return createDefaultStats();

    try {
      return normalizeStats(JSON.parse(saved));
    } catch (error) {
      console.error('Failed to load stats', error);
      localStorage.removeItem('sudoku_stats');
      return createDefaultStats();
    }
  });

  // ---- Derived State ----
  const isGameActive = board !== null && !gameWon && !gameLost;

  // Count remaining for each number
  const numberCounts = useMemo(() => {
    if (!board) return {};
    const counts = {};
    for (let n = 1; n <= 9; n++) counts[n] = 0;
    board.forEach(row => row.forEach(val => {
      if (val > 0) counts[val]++;
    }));
    return counts;
  }, [board]);

  const bestScore = stats[difficulty]?.bestScore || 0;
  const completionPercent = useMemo(() => {
    if (!board || !initialBoard) return 0;
    const totalOpenCells = initialBoard.flat().filter(value => value === 0).length;
    const filledOpenCells = board.flat().filter((value, index) => {
      const row = Math.floor(index / 9);
      const col = index % 9;
      return initialBoard[row][col] === 0 && value !== 0;
    }).length;
    return totalOpenCells ? Math.round((filledOpenCells / totalOpenCells) * 100) : 100;
  }, [board, initialBoard]);

  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showKillerInfo, setShowKillerInfo] = useState(false);

  // ---- Start New Game ----
  const startNewGame = useCallback((level, isDaily = false) => {
    const diff = level || difficulty;
    
    // For Daily Challenge, use a date-based seed (simple version)
    // In a real app, this would be a specific puzzle from a DB
    const { puzzle, solution: sol } = generateSudoku(diff);
    
    setBoard(puzzle.map(r => [...r]));
    setInitialBoard(puzzle.map(r => [...r]));
    setSolution(sol);
    setDifficulty(diff);
    setSelectedCell(null);
    setNotes(createEmptyNotes());
    setIsNotesMode(false);
    setMistakes(0);
    setTimer(0);
    setScore(0);
    setStreak(0);
    setIsPaused(false);
    setHistory([]);
    setGameWon(false);
    setGameLost(false);
    
    // Increment Played Stat
    setStats(prev => ({
      ...prev,
      [diff]: { ...prev[diff], played: prev[diff].played + 1 }
    }));

    if (isDaily) {
      alert("Today's Daily Challenge started!");
    }
  }, [difficulty]);

  // ---- Timer ----
  useEffect(() => {
    if (!isGameActive || isPaused) return;
    const id = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [isGameActive, isPaused]);

  // ---- Format Time ----
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ---- Check Win ----
  const checkWin = useCallback((newBoard) => {
    if (!solution) return false;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (newBoard[r][c] === 0 || newBoard[r][c] !== solution[r][c]) return false;
      }
    }
    return true;
  }, [solution]);

  // ---- Persistence Effects ----
  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('sudoku_dark_mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('sudoku_stats', JSON.stringify(stats));
  }, [stats]);

  // Auto-save game state
  useEffect(() => {
    if (board && !gameWon && !gameLost) {
      const gameState = {
        board,
        initialBoard,
        solution,
        difficulty,
        notes: notes.map(s => Array.from(s)),
        mistakes,
        timer,
        score,
        streak,
        history: history.map(h => ({
          board: h.board,
          notes: h.notes.map(s => Array.from(s)),
          score: h.score,
          streak: h.streak,
        }))
      };
      localStorage.setItem('sudoku_current_game', JSON.stringify(gameState));
    }
  }, [board, initialBoard, solution, difficulty, notes, mistakes, timer, score, streak, history, gameWon, gameLost]);

  // ---- Handle Number Input ----
  const handleNumberInput = useCallback((num) => {
    if (!selectedCell || !isGameActive || isPaused) return;
    const [r, c] = selectedCell;
    if (initialBoard[r][c] !== 0) return; // can't change given cells

    if (isNotesMode) {
      setNotes(prev => {
        const newNotes = prev.map(s => new Set(s));
        const idx = r * 9 + c;
        if (newNotes[idx].has(num)) {
          newNotes[idx].delete(num);
        } else {
          newNotes[idx].add(num);
        }
        return newNotes;
      });
      return;
    }

    // Save history for undo
    setHistory(prev => [...prev, {
      board: board.map(r => [...r]),
      notes: notes.map(s => new Set(s)),
      score,
      streak,
    }]);

    if (solution[r][c] !== num) {
      // Wrong answer - place it but mark as error
      const newBoard = board.map(row => [...row]);
      newBoard[r][c] = num;
      setBoard(newBoard);
      setScore(current => Math.max(0, current - MISTAKE_PENALTY));
      setStreak(0);

      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      if (newMistakes >= MAX_MISTAKES) {
        setGameLost(true);
      }
      return;
    }

    // Correct answer
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = num;
    const nextStreak = streak + 1;
    const streakBonus = Math.floor(nextStreak / 3) * 20;
    const pointsEarned = (SCORE_BY_DIFFICULTY[difficulty] || SCORE_BY_DIFFICULTY.easy) + streakBonus;
    const nextScore = score + pointsEarned;
    setScore(nextScore);
    setStreak(nextStreak);

    // Clear notes for this cell and related cells
    setNotes(prev => {
      const newNotes = prev.map(s => new Set(s));
      newNotes[r * 9 + c].clear();
      // Remove this number from notes in same row, col, box
      for (let i = 0; i < 9; i++) {
        newNotes[r * 9 + i].delete(num);
        newNotes[i * 9 + c].delete(num);
      }
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          newNotes[(br + dr) * 9 + (bc + dc)].delete(num);
        }
      }
      return newNotes;
    });

    setBoard(newBoard);

    if (checkWin(newBoard)) {
      setGameWon(true);
      localStorage.removeItem('sudoku_current_game');
      const timeBonus = Math.max(0, 600 - timer) * 2;
      const finalScore = nextScore + timeBonus;
      setScore(finalScore);
      
      // Update Stats
      setStats(prev => {
        const d = difficulty;
        const newBestTime = prev[d].bestTime === null || timer < prev[d].bestTime ? timer : prev[d].bestTime;
        return {
          ...prev,
          [d]: {
            played: Math.max(prev[d].played, prev[d].won + 1),
            won: prev[d].won + 1,
            bestTime: newBestTime,
            bestScore: Math.max(prev[d].bestScore || 0, finalScore)
          }
        };
      });

      setTimeout(() => {
        confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 }, colors: ['#325aaf', '#4a90d9', '#ffd700', '#2ecc71'] });
      }, 300);
    }
  }, [selectedCell, isGameActive, isPaused, initialBoard, isNotesMode, board, solution, mistakes, notes, checkWin, difficulty, timer, score, streak]);

  // ---- Undo ----
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setBoard(prev.board);
    setNotes(prev.notes);
    setScore(prev.score || 0);
    setStreak(prev.streak || 0);
    setHistory(h => h.slice(0, -1));
  }, [history]);

  // ---- Erase ----
  const handleErase = useCallback(() => {
    if (!selectedCell || !isGameActive) return;
    const [r, c] = selectedCell;
    if (initialBoard[r][c] !== 0) return;
    if (board[r][c] === 0) return;

    setHistory(prev => [...prev, {
      board: board.map(r => [...r]),
      notes: notes.map(s => new Set(s)),
      score,
      streak,
    }]);
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = 0;
    setBoard(newBoard);
  }, [selectedCell, isGameActive, initialBoard, board, notes, score, streak]);

  // ---- Hint ----
  const handleHint = useCallback(() => {
    if (!isGameActive || isPaused) return;
    // Find an empty cell to fill
    let target = selectedCell;
    if (!target || board[target[0]][target[1]] !== 0 || initialBoard[target[0]][target[1]] !== 0) {
      // Find first empty cell
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === 0) {
            target = [r, c];
            r = 9; break;
          }
        }
      }
    }
    if (!target) return;
    setSelectedCell(target);
    const [r, c] = target;
    if (board[r][c] !== 0) return;

    setHistory(prev => [...prev, {
      board: board.map(r => [...r]),
      notes: notes.map(s => new Set(s)),
      score,
      streak,
    }]);
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = solution[r][c];
    setBoard(newBoard);
    const nextScore = Math.max(0, score - HINT_PENALTY);
    setScore(nextScore);
    setStreak(0);

    if (checkWin(newBoard)) {
      setGameWon(true);
      localStorage.removeItem('sudoku_current_game');
      setStats(prev => {
        const d = difficulty;
        const newBestTime = prev[d].bestTime === null || timer < prev[d].bestTime ? timer : prev[d].bestTime;
        return {
          ...prev,
          [d]: {
            played: Math.max(prev[d].played, prev[d].won + 1),
            won: prev[d].won + 1,
            bestTime: newBestTime,
            bestScore: Math.max(prev[d].bestScore || 0, nextScore),
          }
        };
      });
      setTimeout(() => {
        confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
      }, 300);
    }
  }, [isGameActive, isPaused, selectedCell, board, initialBoard, solution, notes, checkWin, score, streak, difficulty, timer]);

  // ---- Keyboard ----
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!isGameActive || isPaused) return;

      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        handleNumberInput(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleErase();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsNotesMode(prev => !prev);
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUndo();
      } else if (e.key.startsWith('Arrow') && selectedCell) {
        e.preventDefault();
        const [r, c] = selectedCell;
        let nr = r, nc = c;
        if (e.key === 'ArrowUp') nr = Math.max(0, r - 1);
        if (e.key === 'ArrowDown') nr = Math.min(8, r + 1);
        if (e.key === 'ArrowLeft') nc = Math.max(0, c - 1);
        if (e.key === 'ArrowRight') nc = Math.min(8, c + 1);
        setSelectedCell([nr, nc]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isGameActive, isPaused, selectedCell, handleNumberInput, handleErase, handleUndo]);

  // ---- Cell Class Builder ----
  const getCellClasses = (r, c) => {
    if (!board || !initialBoard || !solution) return 'cell';
    const classes = ['cell'];

    // 3x3 box borders
    if (c === 2 || c === 5) classes.push('box-right');
    if (r === 2 || r === 5) classes.push('box-bottom');

    const val = board[r][c];
    const isGiven = initialBoard[r][c] !== 0;
    const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
    const selectedVal = selectedCell ? board[selectedCell[0]][selectedCell[1]] : 0;

    // Highlighting
    if (selectedCell) {
      const [sr, sc] = selectedCell;
      const sameRow = r === sr;
      const sameCol = c === sc;
      const sameBox = Math.floor(r / 3) === Math.floor(sr / 3) &&
                      Math.floor(c / 3) === Math.floor(sc / 3);
      if (sameRow || sameCol || sameBox) classes.push('highlighted');
      if (val !== 0 && val === selectedVal && !(r === sr && c === sc)) classes.push('same-number');
    }

    if (isSelected) classes.push('selected');
    if (!isGiven && val !== 0) {
      classes.push('user-filled');
      if (solution[r][c] !== val) classes.push('error');
    }

    return classes.join(' ');
  };

  // ---- Don't render until game is ready ----
  if (!board || !initialBoard || !solution) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo">9</div>
          <div>
            <span className="navbar-title">Sudoku Studio</span>
            <span className="navbar-subtitle">daily logic trainer</span>
          </div>
        </div>
        <div className="navbar-links">
          <button className="navbar-link" onClick={() => setShowStatsModal(true)} aria-label="Open statistics">
            <StatsIcon size={18} style={{ marginRight: '5px' }} />
            Stats
          </button>
          <button
            className="navbar-link icon-only"
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <SunIcon size={18} /> : <MoonIcon size={18} />}
          </button>
          <a href="#" className="navbar-link active">Classic</a>
          <button className="navbar-link" onClick={() => setShowKillerInfo(true)}>Killer</button>
          <button className="navbar-link" onClick={() => startNewGame(difficulty, true)}>Daily Challenge</button>
          <a href="#rules" className="navbar-link">Rules</a>
          <a href="#tips" className="navbar-link">Tips</a>
        </div>
      </nav>

      {/* DIFFICULTY TABS */}
      <div className="difficulty-bar">
        <span className="difficulty-label">Difficulty</span>
        {DIFFICULTIES.map(d => (
          <button
            key={d}
            className={`difficulty-tab ${d === difficulty ? 'active' : ''}`}
            onClick={() => startNewGame(d)}
          >
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="game-layout animate-in">
          {/* LEFT: Grid + Controls */}
          <div className="game-left">
            {/* Info Bar */}
            <div className="game-info">
              <div className="game-info-item score-card">
                <span>Score</span>
                <span className="value">{score.toLocaleString()}</span>
              </div>
              <div className="game-info-item">
                <span>Mistakes</span>
                <span className={`value ${mistakes > 0 ? 'error' : ''}`}>{mistakes}/{MAX_MISTAKES}</span>
              </div>
              <div className="game-info-item">
                <span>Streak</span>
                <span className="value">{streak}x</span>
              </div>
              <button
                className="timer-btn"
                onClick={() => setIsPaused(p => !p)}
                aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
              >
                {isPaused ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
                <span className="value">{formatTime(timer)}</span>
              </button>
            </div>

            {/* Grid */}
            <div className="grid-wrapper">
              {isPaused && (
                <div className="pause-overlay" onClick={() => setIsPaused(false)}>
                  <PlayIcon size={48} />
                  <span>Tap to resume</span>
                </div>
              )}
              <div className="sudoku-board" id="sudoku-board">
                {board.map((row, r) =>
                  row.map((cell, c) => {
                    const idx = r * 9 + c;
                    const cellNotes = notes[idx];
                    return (
                      <button
                        type="button"
                        key={idx}
                        className={getCellClasses(r, c)}
                        aria-label={`Row ${r + 1}, column ${c + 1}${cell ? `, value ${cell}` : ', empty'}`}
                        onClick={() => {
                          if (!isPaused && !gameWon && !gameLost) setSelectedCell([r, c]);
                        }}
                      >
                        {cell !== 0 ? (
                          <span className="cell-value">{cell}</span>
                        ) : cellNotes.size > 0 ? (
                          <div className="notes-grid">
                            {[1,2,3,4,5,6,7,8,9].map(n => (
                              <div key={n} className="note-digit">
                                {cellNotes.has(n) ? n : ''}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="controls-section">
              <div className="action-bar">
                <button className="action-btn" onClick={handleUndo} title="Undo (Ctrl+Z)">
                  <UndoIcon />
                  <span>Undo</span>
                </button>
                <button className="action-btn" onClick={handleErase} title="Erase">
                  <EraseIcon />
                  <span>Erase</span>
                </button>
                <button
                  className={`action-btn ${isNotesMode ? 'active' : ''}`}
                  onClick={() => setIsNotesMode(m => !m)}
                  title="Toggle Notes"
                >
                  <PencilIcon />
                  <span>Notes</span>
                </button>
                <button className="action-btn" onClick={handleHint} title="Hint">
                  <HintIcon />
                  <span>Hint</span>
                </button>
              </div>

              {/* Numpad */}
              <div className="numpad">
                {[1,2,3,4,5,6,7,8,9].map(num => (
                  <button
                    key={num}
                    className={`num-btn ${numberCounts[num] >= 9 ? 'exhausted' : ''}`}
                    onClick={() => handleNumberInput(num)}
                    aria-label={`Enter ${num}`}
                  >
                    {num}
                    <span className="num-remaining">{9 - (numberCounts[num] || 0)}</span>
                  </button>
                ))}
              </div>

              <button className="new-game-btn" onClick={() => startNewGame()}>
                New Game
              </button>
            </div>
          </div>

          {/* RIGHT: progress and scoring */}
          <aside className="game-right">
            <div className="side-panel">
              <div className="side-panel-header">
                <span className="eyebrow">Puzzle Flow</span>
                <strong>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</strong>
              </div>
              <div className="progress-ring" style={{ '--progress': `${completionPercent}%` }}>
                <span>{completionPercent}%</span>
                <small>complete</small>
              </div>
              <div className="score-list">
                <div>
                  <span>Best score</span>
                  <strong>{bestScore.toLocaleString()}</strong>
                </div>
                <div>
                  <span>Correct move</span>
                  <strong>+{SCORE_BY_DIFFICULTY[difficulty]}</strong>
                </div>
                <div>
                  <span>Hint cost</span>
                  <strong>-{HINT_PENALTY}</strong>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* SEO CONTENT */}
      <section className="seo-content" id="rules">
        <h2>About Sudoku</h2>
        <p>
          Sudoku is one of the most popular puzzle games of all time. The goal of Sudoku is to fill a 9x9 grid
          with numbers so that each row, column and 3x3 section contain all of the digits between 1 and 9.
          As a logic puzzle, Sudoku is also an excellent brain game. If you play Sudoku daily, you will soon
          start to see improvements in your concentration and overall brain power.
        </p>

        <h2 id="tips">How to Play Sudoku</h2>
        <p>
          The goal of Sudoku is to fill in a 9x9 grid with digits so that each column, row, and 3x3 section
          contain the numbers between 1 to 9. At the beginning of the game, the 9x9 grid will have some of the
          squares filled in. Your job is to use logic to fill in the missing digits and complete the grid.
        </p>
        <p>A move is incorrect if:</p>
        <ul>
          <li>Any row contains more than one of the same number from 1 to 9</li>
          <li>Any column contains more than one of the same number from 1 to 9</li>
          <li>Any 3x3 grid contains more than one of the same number from 1 to 9</li>
        </ul>

        <h2>Sudoku Tips and Strategies</h2>
        <p>
          <strong>Tip 1:</strong> Look for rows, columns or 3x3 sections that contain 5 or more numbers.
          Work through the remaining empty cells, trying the numbers that have not been used. In many cases,
          you will find numbers that can only be placed in one position.
        </p>
        <p>
          <strong>Tip 2:</strong> Break the grid up visually into 3 columns and 3 rows. Each large column will
          have 3 of the 3x3 grids and each row will have 3 of the 3x3 grids. Now, look for columns or grids that
          have 2 of the same number. Logically, there must be a 3rd copy of the same number in the only remaining
          9-cell section. Look at each of the remaining 9 positions and see if you can find the location of the
          missing number.
        </p>
        <p>
          <strong>Tip 3:</strong> Use the Notes feature to pencil in candidates for each empty cell. This
          helps you visualize possibilities and eliminate numbers systematically. When a cell has only one
          candidate remaining, that must be the answer.
        </p>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-links">
          <a href="#rules">Rules</a>
          <a href="#tips">Tips</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
        <p>&copy; {new Date().getFullYear()} Sudoku. All rights reserved.</p>
      </footer>

      {/* WIN MODAL */}
      {gameWon && (
        <div className="modal-overlay" onClick={() => startNewGame()}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-icon win">
              <TrophyIcon />
            </div>
            <h2 className="modal-title">Congratulations!</h2>
            <p className="modal-subtitle">You solved the puzzle!</p>
            <div className="modal-stats">
              <div className="modal-stat">
                <div className="modal-stat-value">{score.toLocaleString()}</div>
                <div className="modal-stat-label">Score</div>
              </div>
              <div className="modal-stat">
                <div className="modal-stat-value">{formatTime(timer)}</div>
                <div className="modal-stat-label">Time</div>
              </div>
              <div className="modal-stat">
                <div className="modal-stat-value">{difficulty}</div>
                <div className="modal-stat-label">Difficulty</div>
              </div>
              <div className="modal-stat">
                <div className="modal-stat-value">{mistakes}</div>
                <div className="modal-stat-label">Mistakes</div>
              </div>
            </div>
            <button className="new-game-btn" onClick={() => startNewGame()}>Play Again</button>
          </div>
        </div>
      )}

      {/* LOSE MODAL */}
      {gameLost && (
        <div className="modal-overlay" onClick={() => startNewGame()}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-icon lose">
              <SadIcon />
            </div>
            <h2 className="modal-title">Game Over</h2>
            <p className="modal-subtitle">You made {MAX_MISTAKES} mistakes. Better luck next time!</p>
            <button className="new-game-btn" onClick={() => startNewGame()}>Try Again</button>
          </div>
        </div>
      )}

      {/* STATS MODAL */}
      {showStatsModal && (
        <div className="modal-overlay" onClick={() => setShowStatsModal(false)}>
          <div className="modal-card" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-icon win" style={{ background: 'var(--color-primary)' }}>
              <StatsIcon color="white" />
            </div>
            <h2 className="modal-title">Your Statistics</h2>
            <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
              {DIFFICULTIES.map(d => (
                <div key={d} style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '700', textTransform: 'capitalize' }}>{d}</span>
                    <span style={{ color: 'var(--color-text-light)', fontSize: '0.85rem' }}>Played: {stats[d].played}</span>
                  </div>
                  <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.9rem' }}>
                    <span>Games Won: <span style={{ fontWeight: '600', color: 'var(--color-success)' }}>{stats[d].won}</span></span>
                    <span>Best Time: <span style={{ fontWeight: '600' }}>{stats[d].bestTime ? formatTime(stats[d].bestTime) : '--:--'}</span></span>
                    <span>Best Score: <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{(stats[d].bestScore || 0).toLocaleString()}</span></span>
                  </div>
                </div>
              ))}
            </div>
            <button className="new-game-btn" onClick={() => setShowStatsModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* KILLER INFO MODAL */}
      {showKillerInfo && (
        <div className="modal-overlay" onClick={() => setShowKillerInfo(false)}>
          <div className="modal-card" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-icon win" style={{ background: '#e55c6c' }}>
              <Icon size={36}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></Icon>
            </div>
            <h2 className="modal-title">Killer Sudoku</h2>
            <p className="modal-subtitle">
              Killer Sudoku (also known as Sum Sudoku) is a variation that includes arithmetic. 
              In addition to the standard rules, "cages" (dotted lines) are added, and the sum 
              of the numbers in a cage must match the small number shown in the corner.
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-light)', marginBottom: '1.5rem' }}>
              Killer Sudoku mode is coming soon in the next update!
            </p>
            <button className="new-game-btn" onClick={() => setShowKillerInfo(false)}>Got it</button>
          </div>
        </div>
      )}
    </>
  );
}
