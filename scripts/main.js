import { buildMineGrid } from './grid.js';
import { neighborCounter as classicNeighbor, neighborDeltas as classicDeltas } from './gamemodes/classic.js';
import { neighborCounter as plusNeighbor, neighborDeltas as plusDeltas } from './gamemodes/plus.js';
import { neighborCounter as crossNeighbor, neighborDeltas as crossDeltas } from './gamemodes/cross.js';

let GRID_ROWS = 10;
let GRID_COLS = 10;
let mineGrid = [];
let customWidth = 10;
let customHeight = 10;
let customDensity = 0.16;
let currentGamemode = 'classic';
const gamemodeMap = {
    classic: { neighborCounter: classicNeighbor, neighborDeltas: classicDeltas },
    plus: { neighborCounter: plusNeighbor, neighborDeltas: plusDeltas },
    cross: { neighborCounter: crossNeighbor, neighborDeltas: crossDeltas }
};
// custom gamemode uses classic adjacency but unlocks size/density options
gamemodeMap.custom = { neighborCounter: classicNeighbor, neighborDeltas: classicDeltas };
let neighborCounter = gamemodeMap[currentGamemode].neighborCounter;
let neighborDeltas = gamemodeMap[currentGamemode].neighborDeltas;
let isEasyReveal = true; // enable/disable revealing neighbors by clicking revealed tiles
let isEasyFlag = true; // enable/disable easy flagging on revealed number tiles
let isAreaHelper = false; // enable/disable area helper hover highlights
let gameActive = true;
let mineCount = 0;
let revealedCount = 0;

// Persist options to localStorage so they survive page refresh
function loadOptions() {
    try {
        const raw = localStorage.getItem('minesweeper_options');
        if (!raw) return;
        const opts = JSON.parse(raw);
        if (typeof opts.isEasyReveal === 'boolean') isEasyReveal = opts.isEasyReveal;
        if (typeof opts.isEasyFlag === 'boolean') isEasyFlag = opts.isEasyFlag;
        if (typeof opts.isAreaHelper === 'boolean') isAreaHelper = opts.isAreaHelper;
        if (typeof opts.gamemode === 'string') {
            currentGamemode = opts.gamemode;
            neighborCounter = (gamemodeMap[currentGamemode] && gamemodeMap[currentGamemode].neighborCounter) || classicNeighbor;
            neighborDeltas = (gamemodeMap[currentGamemode] && gamemodeMap[currentGamemode].neighborDeltas) || neighborDeltas;
        }
        if (typeof opts.customWidth === 'number') customWidth = opts.customWidth;
        if (typeof opts.customHeight === 'number') customHeight = opts.customHeight;
        if (typeof opts.customDensity === 'number') customDensity = opts.customDensity;
    } catch (e) {
        console.warn('Failed to load options', e);
    }
}

function saveOptions() {
    try {
        const opts = { isEasyReveal: !!isEasyReveal, isEasyFlag: !!isEasyFlag, isAreaHelper: !!isAreaHelper, gamemode: currentGamemode, customWidth: Number(customWidth), customHeight: Number(customHeight), customDensity: Number(customDensity) };
        localStorage.setItem('minesweeper_options', JSON.stringify(opts));
    } catch (e) {
        console.warn('Failed to save options', e);
    }
}

function init(mine_chance = 0.16) {
    if (mine_chance instanceof Event) {
        mine_chance = 0.16;
    }

    mine_chance = Number(mine_chance);
    if (!Number.isFinite(mine_chance) || mine_chance < 0) {
        mine_chance = 0.16;
    }
    mine_chance = Math.min(Math.max(mine_chance, 0), 1);

    // if custom mode is active, use custom size/density
    if (currentGamemode === 'custom') {
        GRID_ROWS = Number(customHeight) || GRID_ROWS;
        GRID_COLS = Number(customWidth) || GRID_COLS;
        mine_chance = Number(customDensity) || mine_chance;
    }

    // build using the active gamemode's neighbor counter and deltas
    mineGrid = buildMineGrid(GRID_ROWS, GRID_COLS, mine_chance, neighborCounter, neighborDeltas);
    // compute mineCount and reset counters
    mineCount = mineGrid.flat().filter(c => c.isMine).length;
    revealedCount = 0;
    gameActive = true;
    renderGrid();
}
// `buildMineGrid` and adjacency counting moved to `scripts/grid.js` and gamemode modules

function getCellElement(row, col) {
    return document.querySelector(`#minegrid [data-row="${row}"][data-col="${col}"]`);
}

function revealTile(cellElement, row, col, allowMines = false) {
    const tile = mineGrid[row][col];
    if (cellElement.classList.contains("revealed") || cellElement.classList.contains("flagged")) {
        return null;
    }

    if (tile.isMine) {
        if (!allowMines) return null;
        cellElement.classList.add("revealed", "mine-revealed");
        cellElement.style.cursor = "default";
        cellElement.textContent = "💣";
        return -1; // indicate a mine was revealed
    }

    cellElement.classList.add("revealed", "safe-revealed");
    cellElement.style.cursor = "default";

    if (tile.adjacentMines > 0) {
        cellElement.textContent = String(tile.adjacentMines);
        cellElement.classList.add(`number-${tile.adjacentMines}`);
    }

    // increment revealed count for safe tiles and check win
    revealedCount++;
    const totalSafe = GRID_ROWS * GRID_COLS - mineCount;
    if (revealedCount >= totalSafe) {
        handleWin();
    }
    return tile.adjacentMines;
}

function handleLoss(triggerRow, triggerCol) {
    gameActive = false;
    const gridEl = document.getElementById("minegrid");
    gridEl.classList.add("game-over");

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const el = getCellElement(r, c);
            const tile = mineGrid[r] && mineGrid[r][c];
            if (!el) continue;
            if (tile.isMine) {
                // leave correctly flagged mines alone but mark them as correct
                if (el.classList.contains("flagged")) {
                    el.classList.add("correct-flag");
                } else if (!el.classList.contains("revealed")) {
                    // reveal unflagged mines
                    el.classList.add("revealed", "mine-revealed");
                    el.textContent = "💣";
                }
            } else {
                // mark incorrect flags on safe tiles
                if (el.classList.contains("flagged")) {
                    el.classList.add("incorrect-flag");
                }
            }
        }
    }
    // optional: focus on the trigger mine
}

function handleWin() {
    gameActive = false;
    const gridEl = document.getElementById("minegrid");
    gridEl.classList.add("game-won");
    showWinOverlay();
}

function showWinOverlay() {
    const overlay = document.getElementById("overlay");
    if (!overlay) return;
    overlay.classList.remove("hidden");
    const btn = document.getElementById("overlay-restart");
    if (btn) btn.focus();
}

function hideOverlay() {
    const overlay = document.getElementById("overlay");
    if (!overlay) return;
    overlay.classList.add("hidden");
}

function countFlaggedNeighbors(row, col) {
    let count = 0;
    for (const [dr, dc] of neighborDeltas) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) continue;
        const el = getCellElement(nr, nc);
        if (el && el.classList.contains("flagged")) count++;
    }
    return count;
}
function countHiddenNeighbors(row, col) {
    const hiddenNeighbors = [];
    for (const [dr, dc] of neighborDeltas) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) continue;
        const el = getCellElement(nr, nc);
        if (!el) continue;
        if (!el.classList.contains("revealed") && !el.classList.contains("flagged")) {
            hiddenNeighbors.push({ row: nr, col: nc, el });
        }
    }
    return hiddenNeighbors;
}
function easyFlagNeighbors(row, col) {
    const tile = mineGrid[row][col];
    if (!tile || tile.isMine || tile.adjacentMines <= 0) return;

    const flagged = countFlaggedNeighbors(row, col);
    const hiddenNeighbors = countHiddenNeighbors(row, col);
    const needed = tile.adjacentMines - flagged;
    if (needed <= 0 || needed !== hiddenNeighbors.length) return;

    hiddenNeighbors.forEach((neighbor) => {
        neighbor.el.classList.add("flagged");
    });
}
function getNeighborElements(row, col) {
    const els = [];
    for (const [dr, dc] of neighborDeltas) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) continue;
        const el = getCellElement(nr, nc);
        if (el) els.push(el);
    }
    return els;
}

function handleCellHover(cellElement, row, col) {
    if (!isAreaHelper) return;
    if (!cellElement.classList.contains('revealed')) return;
    const tile = mineGrid[row][col];
    if (!tile || tile.adjacentMines <= 0) return;

    const neighbors = getNeighborElements(row, col);
    neighbors.forEach(el => el.classList.add('area-highlight'));
}

function clearAreaHighlights() {
    document.querySelectorAll('#minegrid .area-highlight').forEach(el => el.classList.remove('area-highlight'));
}
function revealNeighborRing(startRow, startCol, allowMines = false) {
    const queue = [{ row: startRow, col: startCol }];
    const visited = new Set([`${startRow},${startCol}`]);

    while (queue.length) {
        const { row, col } = queue.shift();
        for (const [dr, dc] of neighborDeltas) {
            const nr = row + dr;
            const nc = col + dc;
            const key = `${nr},${nc}`;
            if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS || visited.has(key)) {
                continue;
            }

            visited.add(key);
            const cellElement = getCellElement(nr, nc);
            if (!cellElement || cellElement.classList.contains("revealed") || cellElement.classList.contains("flagged")) {
                continue;
            }

            const adjacentMines = revealTile(cellElement, nr, nc, allowMines);
            if (adjacentMines === -1) {
                // mine revealed during chord -> game over
                handleLoss(nr, nc);
                return;
            }
            if (adjacentMines === 0) {
                queue.push({ row: nr, col: nc });
            }
        }
    }
}

function renderGrid() {
    const gridElement = document.getElementById("minegrid");
    gridElement.innerHTML = "";
    for (let row = 0; row < GRID_ROWS; row++) {
        const rowElement = document.createElement("div");
        rowElement.classList.add("row");
        // set explicit columns to prevent wrapping when width > default
        rowElement.style.gridTemplateColumns = `repeat(${GRID_COLS}, 40px)`;

        for (let col = 0; col < GRID_COLS; col++) {
            const cellElement = document.createElement("div");
            cellElement.classList.add("cell");
            cellElement.dataset.row = String(row);
            cellElement.dataset.col = String(col);

            if (mineGrid[row] && mineGrid[row][col] && mineGrid[row][col].safeStart) {
                cellElement.classList.add("start-safe");
            }
            cellElement.addEventListener("click", () => handleTileClick(cellElement, row, col));
            cellElement.addEventListener("contextmenu", (event) => handleTileFlag(event, cellElement));
            cellElement.addEventListener("mouseenter", () => handleCellHover(cellElement, row, col));
            cellElement.addEventListener("mouseleave", () => clearAreaHighlights());
            rowElement.appendChild(cellElement);
        }

        gridElement.appendChild(rowElement);
    }
}

function handleTileClick(cellElement, row, col) {
    if (!gameActive) return;
    const tile = mineGrid[row][col];
    // If already revealed, the easy-reveal (chord) action may be triggered
    if (cellElement.classList.contains("revealed")) {
        if (isEasyReveal && !cellElement.classList.contains("flagged") && !tile.isMine) {
            const flagged = countFlaggedNeighbors(row, col);
            if (flagged === tile.adjacentMines) {
                // allow revealing mines when the chord condition is met
                revealNeighborRing(row, col, true);
            }
        }
        return;
    }

    if (cellElement.classList.contains("flagged")) {
        return;
    }

    if (tile.isMine) {
        // reveal clicked mine and end game
        cellElement.classList.add("revealed", "mine-revealed");
        cellElement.style.cursor = "default";
        cellElement.textContent = "💣";
        handleLoss(row, col);
        return;
    }

    const adjacentMines = revealTile(cellElement, row, col);
    if (adjacentMines === 0) {
        revealNeighborRing(row, col);
    }
}

function handleTileFlag(event, cellElement) {
    event.preventDefault();
    if (!gameActive) return;
    if (cellElement.classList.contains("revealed")) {
        const row = Number(cellElement.dataset.row);
        const col = Number(cellElement.dataset.col);
        if (isEasyFlag && !cellElement.classList.contains("flagged") && !mineGrid[row][col].isMine) {
            easyFlagNeighbors(row, col);
        }
        return;
    }

    cellElement.classList.toggle("flagged");
}

function resetGame() {
    hideOverlay();
    const gridEl = document.getElementById("minegrid");
    if (gridEl) {
        gridEl.classList.remove("game-won", "game-over");
    }
    init();
}

window.addEventListener("DOMContentLoaded", () => {
    // load persisted options before wiring UI so initial state matches
    loadOptions();
    const resetButton = document.getElementById("reset-button");
    if (resetButton) {
        resetButton.addEventListener("click", resetGame);
    }
    const overlayBtn = document.getElementById("overlay-restart");
    if (overlayBtn) overlayBtn.addEventListener("click", resetGame);
    const easyChk = document.getElementById("opt-easy-reveal");
    const easyFlagChk = document.getElementById("opt-easy-flag");
    const gridEl = document.getElementById("minegrid");
    
    // Disable right-click context menu on the grid
    if (gridEl) {
        gridEl.addEventListener("contextmenu", (event) => event.preventDefault());
    }
    
    if (easyChk) {
        easyChk.checked = isEasyReveal;
        easyChk.addEventListener("change", (e) => {
            isEasyReveal = !!e.target.checked;
            if (gridEl) {
                gridEl.classList.toggle("easy-reveal-enabled", isEasyReveal);
            }
            saveOptions();
        });
    }
    if (easyFlagChk) {
        easyFlagChk.checked = isEasyFlag;
        easyFlagChk.addEventListener("change", (e) => {
            isEasyFlag = !!e.target.checked;
            if (gridEl) {
                gridEl.classList.toggle("easy-flag-enabled", isEasyFlag);
            }
            saveOptions();
        });
    }
    const areaHelperChk = document.getElementById("opt-area-helper");
    if (areaHelperChk) {
        areaHelperChk.checked = isAreaHelper;
        areaHelperChk.addEventListener('change', (e) => {
            isAreaHelper = !!e.target.checked;
            if (gridEl) gridEl.classList.toggle('area-helper-enabled', isAreaHelper);
            if (!isAreaHelper) clearAreaHighlights();
            saveOptions();
        });
    }
        const gmSelectLeft = document.getElementById('opt-gamemode');
        const gmSelectRight = document.getElementById('opt-gamemode-right');
        if (gmSelectLeft) gmSelectLeft.value = currentGamemode;
        if (gmSelectRight) gmSelectRight.value = currentGamemode;

        function onGamemodeChange(value, source) {
            currentGamemode = value;
            neighborCounter = (gamemodeMap[currentGamemode] && gamemodeMap[currentGamemode].neighborCounter) || classicNeighbor;
            neighborDeltas = (gamemodeMap[currentGamemode] && gamemodeMap[currentGamemode].neighborDeltas) || neighborDeltas;
            if (gmSelectLeft && source !== 'left') gmSelectLeft.value = value;
            if (gmSelectRight && source !== 'right') gmSelectRight.value = value;
            saveOptions();
            // show/hide custom controls
            if (customControls) {
                const show = currentGamemode === 'custom';
                customControls.style.display = show ? '' : 'none';
                // enable/disable inputs when not custom
                if (widthInput) widthInput.disabled = !show;
                if (heightInput) heightInput.disabled = !show;
                if (densityRange) densityRange.disabled = !show;
                if (densityNum) densityNum.disabled = !show;
            }
            resetGame();
        }

        if (gmSelectLeft) gmSelectLeft.addEventListener('change', (e) => onGamemodeChange(e.target.value, 'left'));
        if (gmSelectRight) gmSelectRight.addEventListener('change', (e) => onGamemodeChange(e.target.value, 'right'));
    if (gridEl) {
        gridEl.classList.toggle("easy-reveal-enabled", isEasyReveal);
        gridEl.classList.toggle("easy-flag-enabled", isEasyFlag);
        gridEl.classList.toggle('area-helper-enabled', isAreaHelper);
    }

    // wire custom controls
    const customControls = document.getElementById('custom-controls');
    const widthInput = document.getElementById('opt-custom-width');
    const heightInput = document.getElementById('opt-custom-height');
    const densityRange = document.getElementById('opt-custom-density');
    const densityNum = document.getElementById('opt-custom-density-num');

    if (widthInput) {
        widthInput.value = customWidth;
        widthInput.disabled = currentGamemode !== 'custom';
        widthInput.addEventListener('change', (e) => {
            const v = Number(e.target.value);
            if (!Number.isFinite(v) || v < 5) {
                e.target.value = customWidth;
                return;
            }
            customWidth = Math.min(60, Math.floor(v));
            e.target.value = customWidth;
            saveOptions();
            resetGame();
        });
    }
    if (heightInput) {
        heightInput.value = customHeight;
        heightInput.disabled = currentGamemode !== 'custom';
        heightInput.addEventListener('change', (e) => {
            const v = Number(e.target.value);
            if (!Number.isFinite(v) || v < 5) {
                e.target.value = customHeight;
                return;
            }
            customHeight = Math.min(60, Math.floor(v));
            e.target.value = customHeight;
            saveOptions();
            resetGame();
        });
    }
    if (densityRange && densityNum) {
        densityRange.value = customDensity;
        densityNum.value = customDensity;
        densityRange.disabled = currentGamemode !== 'custom';
        densityNum.disabled = currentGamemode !== 'custom';
        densityRange.addEventListener('input', (e) => {
            const v = Number(e.target.value);
            customDensity = Math.min(0.99, Math.max(0, v));
            densityNum.value = customDensity;
        });
        densityRange.addEventListener('change', (e) => {
            const v = Number(e.target.value);
            customDensity = Math.min(0.99, Math.max(0, v));
            densityNum.value = customDensity;
            saveOptions();
            resetGame();
        });
        densityNum.addEventListener('change', (e) => {
            let v = Number(e.target.value);
            if (!Number.isFinite(v)) { densityNum.value = customDensity; return; }
            v = Math.min(0.99, Math.max(0, v));
            customDensity = v;
            densityRange.value = customDensity;
            saveOptions();
            resetGame();
        });
    }

    // ensure custom controls visibility reflects current gamemode
    if (customControls) {
        customControls.style.display = currentGamemode === 'custom' ? '' : 'none';
    }

    init();
});