export function buildMineGrid(rows, cols, mine_chance, neighborCounter, neighborDeltas) {
    for (let attempt = 0; attempt < 10; attempt++) {
        const grid = Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => ({ isMine: false, adjacentMines: 0, safeStart: false }))
        );

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                grid[row][col].isMine = Math.random() < mine_chance;
            }
        }

        const safeTiles = [];
        const dynamicNeighborDeltas = typeof neighborDeltas === 'function';

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (dynamicNeighborDeltas) {
                    grid[row][col].neighborDeltas = neighborDeltas(grid, row, col);
                }
                if (!grid[row][col].isMine) {
                    safeTiles.push({ row, col });
                }
            }
        }

        if (safeTiles.length === 0) {
            const forcedRow = Math.floor(Math.random() * rows);
            const forcedCol = Math.floor(Math.random() * cols);
            grid[forcedRow][forcedCol].isMine = false;
            safeTiles.push({ row: forcedRow, col: forcedCol });
        }

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (grid[row][col].isMine) {
                    continue;
                }

                grid[row][col].adjacentMines = neighborCounter(grid, row, col);
            }
        }

        // find zero tiles and choose a starter from the largest zero-region
        const zeroTiles = new Set();
        for (const tile of safeTiles) {
            if (grid[tile.row][tile.col].adjacentMines === 0) {
                zeroTiles.add(`${tile.row},${tile.col}`);
            }
        }

        if (zeroTiles.size > 0) {
            // compute connected components of zero tiles using neighborDeltas
            const visited = new Set();
            let bestComponent = [];
            for (const key of zeroTiles) {
                if (visited.has(key)) continue;
                const [r0, c0] = key.split(',').map(Number);
                const stack = [[r0, c0]];
                const comp = [];
                visited.add(key);
                while (stack.length) {
                    const [r, c] = stack.pop();
                    comp.push({ row: r, col: c });
                    const componentDeltas = dynamicNeighborDeltas
                        ? grid[r][c].neighborDeltas || []
                        : neighborDeltas || [
                            [-1, -1], [-1, 0], [-1, 1],
                            [0, -1], [0, 1],
                            [1, -1], [1, 0], [1, 1]
                        ];
                    for (const [dr, dc] of componentDeltas) {
                        const nr = r + dr;
                        const nc = c + dc;
                        const nkey = `${nr},${nc}`;
                        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                        if (!zeroTiles.has(nkey) || visited.has(nkey)) continue;
                        visited.add(nkey);
                        stack.push([nr, nc]);
                    }
                }
                if (comp.length > bestComponent.length) bestComponent = comp;
            }
            // pick random starter from best component
            const starter = bestComponent[Math.floor(Math.random() * bestComponent.length)];
            grid[starter.row][starter.col].safeStart = true;
            return grid;
        }

        if (attempt === 9) {
            let starter = safeTiles[0];
            let lowestAdjacent = grid[starter.row][starter.col].adjacentMines;
            for (const tile of safeTiles) {
                const value = grid[tile.row][tile.col].adjacentMines;
                if (value < lowestAdjacent) {
                    lowestAdjacent = value;
                    starter = tile;
                }
            }
            grid[starter.row][starter.col].safeStart = true;
            return grid;
        }
    }

    return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({ isMine: false, adjacentMines: 0, safeStart: false }))
    );
}
