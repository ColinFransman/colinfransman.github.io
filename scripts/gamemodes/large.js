export const neighborDeltas = [
    [-2, -2], [-2, -1], [-2, 0], [-2, 1], [-2, 2],
    [-1, -2], [-1, -1], [-1, 0], [-1, 1], [-1, 2],
    [0, -2], [0, -1], /*self*/ [0, 1], [0, 2],
    [1, -2], [1, -1], [1, 0], [1, 1], [1, 2],
    [2, -2], [2, -1], [2, 0], [2, 1], [2, 2]
];

export function neighborCounter(grid, row, col) {
    let count = 0;
    for (const [dr, dc] of neighborDeltas) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
            if (grid[nr][nc].isMine) count++;
        }
    }
    return count;
}