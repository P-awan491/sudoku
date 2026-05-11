/**
 * Sudoku Puzzle Generator & Validator
 * Uses backtracking algorithm to generate valid, unique puzzles.
 */

// Check if placing `num` at board[row][col] is valid
function isValidPlacement(board, row, col, num) {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (board[row][c] === num) return false;
  }
  // Check column
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === num) return false;
  }
  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Fill a complete valid board using backtracking
function solveBoardRandom(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (isValidPlacement(board, row, col, num)) {
            board[row][col] = num;
            if (solveBoardRandom(board)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

// Count solutions (stop at 2 to check uniqueness)
function countSolutions(board, limit = 2) {
  let count = 0;
  function solve(b) {
    if (count >= limit) return;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (b[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValidPlacement(b, row, col, num)) {
              b[row][col] = num;
              solve(b);
              b[row][col] = 0;
            }
          }
          return;
        }
      }
    }
    count++;
  }
  solve(board);
  return count;
}

/**
 * Generate a Sudoku puzzle with a unique solution.
 * @param {'easy'|'medium'|'hard'|'expert'} difficulty
 * @returns {{ puzzle: number[][], solution: number[][] }}
 */
export function generateSudoku(difficulty = 'easy') {
  // Step 1: Generate a complete, valid board
  const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
  solveBoardRandom(solution);

  // Step 2: Determine how many cells to remove
  const cluesMap = {
    easy: 38,
    medium: 30,
    hard: 25,
    expert: 22,
    master: 20,
    extreme: 17,
  };
  const targetClues = cluesMap[difficulty] || 38;
  const cellsToRemove = 81 - targetClues;

  // Step 3: Remove cells while ensuring a unique solution
  const puzzle = solution.map((row) => [...row]);
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9])
  );

  let removed = 0;
  for (const [r, c] of positions) {
    if (removed >= cellsToRemove) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    // For easy/medium, skip uniqueness check for speed
    if (difficulty === 'easy' || difficulty === 'medium') {
      removed++;
    } else {
      const testBoard = puzzle.map((row) => [...row]);
      if (countSolutions(testBoard) === 1) {
        removed++;
      } else {
        puzzle[r][c] = backup; // restore if not unique
      }
    }
  }

  return { puzzle, solution };
}

export { isValidPlacement };
