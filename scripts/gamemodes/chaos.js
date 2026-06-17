export function getNeighborDeltas(grid, row, col) {
    const rows = grid.length;
    const cols = grid[0].length;
    const totalTiles = rows * cols;
    const picks = Math.max(0, Math.floor(Math.sqrt(totalTiles)));
    const excludeIndex = row * cols + col;
    const selected = new Set();
    const rng = mulberry32((row + 1) * 0x9e3779b1 ^ (col + 1));

    while (selected.size < Math.min(picks, totalTiles - 1)) {
        const index = Math.floor(rng() * totalTiles);
        if (index === excludeIndex) continue;
        selected.add(index);
    }

    return [...selected].map((index) => {
        const r = Math.floor(index / cols);
        const c = index % cols;
        return [r - row, c - col];
    });
}

export const neighborDeltas = getNeighborDeltas;

export function neighborCounter(grid, row, col) {
    let count = 0;
    for (const [dr, dc] of getNeighborDeltas(grid, row, col)) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
            if (grid[nr][nc].isMine) count++;
        }
    }
    return count;
}

function mulberry32(seed) {
    let value = seed >>> 0;
    return function () {
        value |= 0;
        value = (value + 0x6D2B79F5) | 0;
        let t = Math.imul(value ^ (value >>> 15), 1 | value);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
