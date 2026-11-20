export interface SchellingCell {
  row: number;
  col: number;
  group: 0 | 1 | 2; // 0 = empty, 1 = Group A (Sky), 2 = Group B (Amber)
  happy: boolean;
  lastMovedFrom?: { row: number; col: number };
}

export interface SchellingParams {
  gridSize: number;
  tolerance: number; // minimum fraction of same-group neighbors required (0.1 to 0.75)
  density: number; // occupancy ratio (0.5 to 0.92)
  groupRatio: number; // proportion of Group A among occupied (0.3 to 0.7)
}

export interface SchellingMetrics {
  step: number;
  segregationIndex: number; // average fraction of same-group neighbors across occupied cells
  unhappyPct: number;
  movesThisStep: number;
}

export const DEFAULT_SCHELLING_PARAMS: SchellingParams = {
  gridSize: 22,
  tolerance: 0.35,
  density: 0.84,
  groupRatio: 0.5,
};

export function createSchellingGrid(params: SchellingParams): SchellingCell[][] {
  const { gridSize, density, groupRatio } = params;
  const cells: (0 | 1 | 2)[] = [];
  const total = gridSize * gridSize;
  const occupiedCount = Math.round(total * density);
  const groupACount = Math.round(occupiedCount * groupRatio);
  const groupBCount = occupiedCount - groupACount;

  for (let i = 0; i < groupACount; i++) cells.push(1);
  for (let i = 0; i < groupBCount; i++) cells.push(2);
  while (cells.length < total) cells.push(0);

  // Fisher-Yates shuffle
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  const grid: SchellingCell[][] = [];
  for (let r = 0; r < gridSize; r++) {
    const row: SchellingCell[] = [];
    for (let c = 0; c < gridSize; c++) {
      row.push({
        row: r,
        col: c,
        group: cells[r * gridSize + c],
        happy: true,
      });
    }
    grid.push(row);
  }
  return evaluateHappiness(grid, params.tolerance);
}

function getNeighborStats(
  grid: SchellingCell[][],
  row: number,
  col: number,
  group: 1 | 2
): { same: number; totalNeighbors: number } {
  const size = grid.length;
  let same = 0;
  let totalNeighbors = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        const g = grid[nr][nc].group;
        if (g !== 0) {
          totalNeighbors++;
          if (g === group) same++;
        }
      }
    }
  }
  return { same, totalNeighbors };
}

export function evaluateHappiness(
  grid: SchellingCell[][],
  tolerance: number
): SchellingCell[][] {
  return grid.map((row) =>
    row.map((cell) => {
      if (cell.group === 0) return { ...cell, happy: true };
      const { same, totalNeighbors } = getNeighborStats(
        grid,
        cell.row,
        cell.col,
        cell.group
      );
      const frac = totalNeighbors === 0 ? 1 : same / totalNeighbors;
      return { ...cell, happy: frac >= tolerance - 1e-6 };
    })
  );
}

export function computeSchellingMetrics(
  grid: SchellingCell[][],
  step: number,
  movesThisStep: number
): SchellingMetrics {
  let occupied = 0;
  let unhappy = 0;
  let sumSameFrac = 0;

  for (const row of grid) {
    for (const cell of row) {
      if (cell.group !== 0) {
        occupied++;
        if (!cell.happy) unhappy++;
        const { same, totalNeighbors } = getNeighborStats(
          grid,
          cell.row,
          cell.col,
          cell.group
        );
        sumSameFrac += totalNeighbors === 0 ? 1 : same / totalNeighbors;
      }
    }
  }

  return {
    step,
    segregationIndex: occupied > 0 ? sumSameFrac / occupied : 0,
    unhappyPct: occupied > 0 ? unhappy / occupied : 0,
    movesThisStep,
  };
}

export function stepSchellingGrid(
  currentGrid: SchellingCell[][],
  tolerance: number
): { nextGrid: SchellingCell[][]; moves: number } {
  const size = currentGrid.length;
  const working: SchellingCell[][] = currentGrid.map((row) =>
    row.map((cell) => ({ ...cell, lastMovedFrom: undefined }))
  );

  const unhappyAgents: { row: number; col: number; group: 1 | 2 }[] = [];
  const emptySpots: { row: number; col: number }[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = working[r][c];
      if (cell.group === 0) {
        emptySpots.push({ row: r, col: c });
      } else if (!cell.happy) {
        unhappyAgents.push({ row: r, col: c, group: cell.group });
      }
    }
  }

  // Shuffle unhappy agents and empty spots
  for (let i = unhappyAgents.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unhappyAgents[i], unhappyAgents[j]] = [unhappyAgents[j], unhappyAgents[i]];
  }
  for (let i = emptySpots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [emptySpots[i], emptySpots[j]] = [emptySpots[j], emptySpots[i]];
  }

  let moves = 0;
  const maxMoves = Math.min(unhappyAgents.length, emptySpots.length);
  for (let i = 0; i < maxMoves; i++) {
    const agent = unhappyAgents[i];
    // Prefer a spot where agent would be happy if available
    let chosenIdx = i;
    for (let k = i; k < Math.min(i + 12, emptySpots.length); k++) {
      const cand = emptySpots[k];
      const { same, totalNeighbors } = getNeighborStats(
        working,
        cand.row,
        cand.col,
        agent.group
      );
      if (totalNeighbors === 0 || same / totalNeighbors >= tolerance - 1e-6) {
        chosenIdx = k;
        break;
      }
    }
    const target = emptySpots[chosenIdx];
    emptySpots[chosenIdx] = emptySpots[i];

    working[agent.row][agent.col].group = 0;
    working[target.row][target.col].group = agent.group;
    working[target.row][target.col].lastMovedFrom = {
      row: agent.row,
      col: agent.col,
    };
    moves++;
  }

  return {
    nextGrid: evaluateHappiness(working, tolerance),
    moves,
  };
}
