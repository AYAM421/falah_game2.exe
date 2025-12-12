
// Simple grid based maze generation
// 1 = Wall, 0 = Empty, 2 = Player Start, 3 = Exit, 4 = Key, 5 = Weapon, 6 = Ammo

export const CELL_SIZE = 4;

export const generateMaze = (level: number) => {
  const size = 10 + (level * 2); // Map gets bigger
  const grid: number[][] = Array(size).fill(0).map(() => Array(size).fill(1));

  // Recursive Backtracker
  const carve = (x: number, y: number) => {
    grid[y][x] = 0;
    
    const directions = [
      [0, 1], [1, 0], [0, -1], [-1, 0]
    ].sort(() => Math.random() - 0.5);

    for (const [dx, dy] of directions) {
      const nx = x + (dx * 2);
      const ny = y + (dy * 2);

      if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && grid[ny][nx] === 1) {
        grid[y + dy][x + dx] = 0;
        carve(nx, ny);
      }
    }
  };

  // Start carving from 1,1
  carve(1, 1);

  // Add random loops
  for(let i=0; i<size*2; i++) {
    const rx = Math.floor(Math.random() * (size - 2)) + 1;
    const ry = Math.floor(Math.random() * (size - 2)) + 1;
    grid[ry][rx] = 0;
  }

  // Set Start
  grid[1][1] = 2;

  // Set Exit
  const exitX = size - 2;
  const exitZ = size - 2;
  grid[exitZ][exitX] = 0;     
  grid[exitZ][exitX - 1] = 0; 
  grid[exitZ - 1][exitX] = 0; 
  grid[exitZ][exitX] = 3;

  const placeItem = (type: number, count: number) => {
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < 1000) {
        const kx = Math.floor(Math.random() * (size - 2)) + 1;
        const kz = Math.floor(Math.random() * (size - 2)) + 1;

        if (grid[kz][kx] === 0 && (kx > 3 || kz > 3)) {
            grid[kz][kx] = type;
            placed++;
        }
        attempts++;
    }
  }

  // --- PLACE KEYS (4) ---
  placeItem(4, level);

  // --- PLACE WEAPON (5) ---
  // Only 1 gun per level
  placeItem(5, 1);

  // --- PLACE AMMO (6) ---
  // 1-2 ammo packs per level
  placeItem(6, Math.max(1, Math.floor(Math.random() * 3)));

  return { grid, size };
};
