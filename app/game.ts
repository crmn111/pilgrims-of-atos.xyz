// @ts-nocheck
// ============================================
// PILGRIM OF ATOS - 16-bit Pixel Platform Game
// ============================================

let gameInitialized = false;
let animationFrameId = null;
let gameLoopCallCount = 0;

export function initGame() {
// Force cleanup any existing instances
if (gameInitialized) {
    console.warn('Game already initialized! Forcing cleanup...');
    cleanupGame();
}

// Double check - if animation frame exists, cancel it
if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
}

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) {
    console.error('Canvas element not found!');
    return;
}
const ctx = canvas.getContext('2d')!;
if (!ctx) {
    console.error('Could not get canvas context!');
    return;
}

gameInitialized = true;
console.log('Game initialized successfully!');

// Disable image smoothing for crisp pixels
ctx.imageSmoothingEnabled = false;

// ============================================
// GAME CONSTANTS
// ============================================
const TILE_SIZE = 32;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const MOVE_SPEED = 4;
const SCALE = 2;
const TARGET_FPS = 60;

// Ranks progression
const RANKS = [
    'Wanderer',
    'Disciple', 
    'Initiate',
    'Keeper',
    'Ascendant',
    'Pilgrim of Light',
    'Guardian of Atos'
];

// Color palette (16-bit inspired)
const COLORS = {
    sky: '#4a6fa5',
    skyDark: '#2d4a6f',
    mountain: '#5c6b7a',
    mountainDark: '#3d4654',
    stone: '#8b7355',
    stoneDark: '#5c4d3d',
    gold: '#c9a227',
    goldLight: '#f4d03f',
    wood: '#6b4423',
    woodDark: '#3d2817',
    leaf: '#2d5a27',
    leafLight: '#4a8c3f',
    water: '#3498db',
    waterLight: '#5dade2',
    robe: '#2c1810',
    robeLight: '#4a3728',
    skin: '#deb887',
    beard: '#c0c0c0',
    white: '#f4e4bc',
    red: '#c0392b',
    purple: '#6c3483',
    incense: '#e8daef'
};

// ============================================
// AUDIO SYSTEM (Web Audio API Chants)
// ============================================
class AudioSystem {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.muted = false;
    }
    
    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch(e) {
            console.log('Audio not available');
        }
    }
    
    playTone(freq, duration, type = 'sine', volume = 0.1) {
        if (!this.initialized || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.frequency.value = freq;
        osc.type = type;
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
    
    playJump() {
        this.playTone(200, 0.1);
        setTimeout(() => this.playTone(300, 0.1), 50);
    }
    
    playCollect() {
        this.playTone(523, 0.1);
        setTimeout(() => this.playTone(659, 0.1), 100);
        setTimeout(() => this.playTone(784, 0.15), 200);
    }
    
    playChant() {
        const notes = [196, 220, 247, 262, 294];
        notes.forEach((n, i) => {
            setTimeout(() => this.playTone(n, 0.5, 'sine', 0.05), i * 200);
        });
    }
    
    playStep() {
        this.playTone(100 + Math.random() * 50, 0.05, 'square', 0.02);
    }
    
    playAlert() {
        this.playTone(400, 0.1, 'square', 0.1);
        setTimeout(() => this.playTone(300, 0.15, 'square', 0.1), 100);
    }
    
    playSuccess() {
        const notes = [262, 330, 392, 523];
        notes.forEach((n, i) => {
            setTimeout(() => this.playTone(n, 0.3), i * 150);
        });
    }
    
    playBell() {
        this.playTone(800, 1, 'sine', 0.1);
        this.playTone(1200, 0.8, 'sine', 0.05);
    }
}

const audio = new AudioSystem();

// ============================================
// SPRITE DRAWING FUNCTIONS
// ============================================
class SpriteRenderer {
    static drawPixelRect(x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
    }
    
    static drawPilgrim(x, y, direction, frame, isJumping, hasSandals, hasBeads) {
        const offsetX = Math.floor(x);
        const offsetY = Math.floor(y);
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(offsetX + 4, offsetY + 28, 16, 4);
        
        // Robe body
        ctx.fillStyle = COLORS.robe;
        ctx.fillRect(offsetX + 6, offsetY + 10, 12, 18);
        ctx.fillStyle = COLORS.robeLight;
        ctx.fillRect(offsetX + 8, offsetY + 12, 8, 14);
        
        // Walking animation
        const legOffset = isJumping ? 0 : Math.sin(frame * 0.3) * 2;
        ctx.fillStyle = COLORS.robe;
        ctx.fillRect(offsetX + 6, offsetY + 26, 5, 4 + legOffset);
        ctx.fillRect(offsetX + 13, offsetY + 26, 5, 4 - legOffset);
        
        // Sandals (if equipped)
        if (hasSandals) {
            ctx.fillStyle = COLORS.gold;
            ctx.fillRect(offsetX + 5, offsetY + 29 + legOffset, 6, 3);
            ctx.fillRect(offsetX + 12, offsetY + 29 - legOffset, 6, 3);
        } else {
            ctx.fillStyle = COLORS.skin;
            ctx.fillRect(offsetX + 6, offsetY + 29 + legOffset, 5, 2);
            ctx.fillRect(offsetX + 13, offsetY + 29 - legOffset, 5, 2);
        }
        
        // Head
        ctx.fillStyle = COLORS.skin;
        ctx.fillRect(offsetX + 8, offsetY + 2, 8, 8);
        
        // Eyes
        ctx.fillStyle = '#000';
        const eyeX = direction > 0 ? 2 : 0;
        ctx.fillRect(offsetX + 9 + eyeX, offsetY + 4, 2, 2);
        ctx.fillRect(offsetX + 13 + eyeX, offsetY + 4, 2, 2);
        
        // Small beard (novice)
        ctx.fillStyle = COLORS.beard;
        ctx.fillRect(offsetX + 10, offsetY + 8, 4, 3);
        
        // Prayer beads (if equipped)
        if (hasBeads) {
            ctx.fillStyle = COLORS.gold;
            for (let i = 0; i < 5; i++) {
                ctx.fillRect(offsetX + 3, offsetY + 12 + i * 3, 2, 2);
            }
        }
    }
    
    static drawMonk(x, y, type = 'elder', frame = 0) {
        const offsetX = Math.floor(x);
        const offsetY = Math.floor(y);
        
        // Schema Monk BOSS - 3x larger!
        if (type === 'schema-monk') {
            const scale = 3;
            const baseY = offsetY - 32; // Adjust to ground level
            
            // Black schema robe (most ascetic form)
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(offsetX - 12, baseY + 36, 72, 72);
            ctx.fillRect(offsetX + 0, baseY + 24, 48, 16);
            
            // Dark hood
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(offsetX - 6, baseY, 60, 30);
            
            // Pale ascetic face
            ctx.fillStyle = '#e8dcc0';
            ctx.fillRect(offsetX + 6, baseY + 6, 36, 30);
            
            // Intense eyes (larger, glowing)
            ctx.fillStyle = frame % 40 < 20 ? '#ff6b6b' : '#ff4444';
            ctx.fillRect(offsetX + 12, baseY + 15, 6, 6);
            ctx.fillRect(offsetX + 30, baseY + 15, 6, 6);
            
            // Long white ascetic beard
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(offsetX + 12, baseY + 30, 24, 12);
            ctx.fillRect(offsetX + 15, baseY + 42, 18, 24);
            ctx.fillRect(offsetX + 18, baseY + 66, 12, 18);
            
            // Holy staff with cross (huge)
            ctx.fillStyle = COLORS.gold;
            ctx.fillRect(offsetX + 54, baseY - 24, 6, 132);
            // Large cross on top
            ctx.fillRect(offsetX + 42, baseY - 24, 30, 6);
            ctx.fillRect(offsetX + 54, baseY - 36, 6, 24);
            
            // Animated glow effect around boss
            const glowSize = Math.sin(frame * 0.1) * 2 + 4;
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.3 + Math.sin(frame * 0.1) * 0.2})`;
            ctx.lineWidth = glowSize;
            ctx.strokeRect(offsetX - 16, baseY - 4, 80, 112);
            
            return;
        }
        
        const robeColor = type === 'abbot' ? COLORS.purple : 
                         type === 'bishop' ? COLORS.red : COLORS.robe;
        
        // Long robe
        ctx.fillStyle = robeColor;
        ctx.fillRect(offsetX + 4, offsetY + 12, 24, 24);
        ctx.fillRect(offsetX + 8, offsetY + 8, 16, 6);
        
        // Hood/head covering
        ctx.fillStyle = type === 'bishop' ? COLORS.gold : robeColor;
        ctx.fillRect(offsetX + 6, offsetY, 20, 10);
        
        // Face
        ctx.fillStyle = COLORS.skin;
        ctx.fillRect(offsetX + 10, offsetY + 2, 12, 10);
        
        // Eyes (wise/closed sometimes)
        ctx.fillStyle = '#000';
        if (frame % 60 < 55) {
            ctx.fillRect(offsetX + 12, offsetY + 5, 2, 2);
            ctx.fillRect(offsetX + 18, offsetY + 5, 2, 2);
        } else {
            ctx.fillRect(offsetX + 12, offsetY + 6, 3, 1);
            ctx.fillRect(offsetX + 17, offsetY + 6, 3, 1);
        }
        
        // Magnificent beard
        ctx.fillStyle = COLORS.beard;
        ctx.fillRect(offsetX + 10, offsetY + 10, 12, 4);
        ctx.fillRect(offsetX + 12, offsetY + 14, 8, 8);
        ctx.fillRect(offsetX + 14, offsetY + 22, 4, 6);
        
        // Staff (for abbots and bishops)
        if (type !== 'elder') {
            ctx.fillStyle = COLORS.gold;
            ctx.fillRect(offsetX + 28, offsetY - 8, 3, 44);
            // Cross on top
            ctx.fillRect(offsetX + 24, offsetY - 8, 11, 3);
            ctx.fillRect(offsetX + 28, offsetY - 12, 3, 8);
        }
    }
    
    static drawMonastery(x, y, scale = 1) {
        const w = 160 * scale;
        const h = 120 * scale;
        
        // Main building
        ctx.fillStyle = COLORS.stone;
        ctx.fillRect(x, y + 40 * scale, w, h - 40 * scale);
        
        // Stone texture
        ctx.fillStyle = COLORS.stoneDark;
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 5; j++) {
                if ((i + j) % 2 === 0) {
                    ctx.fillRect(x + i * 20 * scale, y + 40 * scale + j * 16 * scale, 18 * scale, 14 * scale);
                }
            }
        }
        
        // Windows (Byzantine arched)
        ctx.fillStyle = COLORS.skyDark;
        for (let i = 0; i < 3; i++) {
            const wx = x + 20 * scale + i * 50 * scale;
            const wy = y + 60 * scale;
            ctx.fillRect(wx, wy, 20 * scale, 30 * scale);
            ctx.beginPath();
            ctx.arc(wx + 10 * scale, wy, 10 * scale, Math.PI, 0);
            ctx.fill();
            // Window glow
            ctx.fillStyle = '#ffdb58';
            ctx.globalAlpha = 0.3;
            ctx.fillRect(wx + 2 * scale, wy + 2 * scale, 16 * scale, 26 * scale);
            ctx.globalAlpha = 1;
            ctx.fillStyle = COLORS.skyDark;
        }
        
        // Golden dome
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        ctx.arc(x + w/2, y + 30 * scale, 30 * scale, Math.PI, 0);
        ctx.fill();
        
        // Dome highlight
        ctx.fillStyle = COLORS.goldLight;
        ctx.beginPath();
        ctx.arc(x + w/2 - 8 * scale, y + 22 * scale, 8 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Cross on top
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(x + w/2 - 3 * scale, y - 10 * scale, 6 * scale, 30 * scale);
        ctx.fillRect(x + w/2 - 12 * scale, y, 24 * scale, 6 * scale);
        
        // Door
        ctx.fillStyle = COLORS.wood;
        ctx.fillRect(x + w/2 - 15 * scale, y + 80 * scale, 30 * scale, 40 * scale);
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(x + w/2 - 2 * scale, y + 95 * scale, 4 * scale, 4 * scale);
    }
    
    static drawTree(x, y, type = 'cypress') {
        if (type === 'cypress') {
            // Tall cypress tree
            ctx.fillStyle = COLORS.wood;
            ctx.fillRect(x + 8, y + 40, 8, 24);
            
            ctx.fillStyle = COLORS.leaf;
            ctx.beginPath();
            ctx.moveTo(x + 12, y);
            ctx.lineTo(x + 24, y + 44);
            ctx.lineTo(x, y + 44);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = COLORS.leafLight;
            ctx.beginPath();
            ctx.moveTo(x + 12, y + 5);
            ctx.lineTo(x + 18, y + 30);
            ctx.lineTo(x + 6, y + 30);
            ctx.closePath();
            ctx.fill();
        } else {
            // Olive tree
            ctx.fillStyle = COLORS.wood;
            ctx.fillRect(x + 12, y + 30, 8, 20);
            
            ctx.fillStyle = COLORS.leaf;
            ctx.beginPath();
            ctx.arc(x + 16, y + 20, 20, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = COLORS.leafLight;
            ctx.beginPath();
            ctx.arc(x + 12, y + 16, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    static drawPortal(x, y, frame) {
        const offsetX = Math.floor(x);
        const offsetY = Math.floor(y);
        
        // Pulsing mystical portal
        const pulseSize = Math.sin(frame * 0.15) * 4 + 28;
        const alpha = 0.6 + Math.sin(frame * 0.1) * 0.2;
        
        // Outer glow
        ctx.fillStyle = `rgba(138, 43, 226, ${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(offsetX + 16, offsetY + 16, pulseSize + 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Middle ring
        ctx.fillStyle = `rgba(75, 0, 130, ${alpha})`;
        ctx.beginPath();
        ctx.arc(offsetX + 16, offsetY + 16, pulseSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner light
        ctx.fillStyle = `rgba(218, 112, 214, ${alpha})`;
        ctx.beginPath();
        ctx.arc(offsetX + 16, offsetY + 16, pulseSize - 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Center spark
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(offsetX + 14, offsetY + 14, 4, 4);
        
        // Rotating particles
        for (let i = 0; i < 4; i++) {
            const angle = (frame * 0.05) + (i * Math.PI / 2);
            const px = offsetX + 16 + Math.cos(angle) * 20;
            const py = offsetY + 16 + Math.sin(angle) * 20;
            ctx.fillStyle = '#9370db';
            ctx.fillRect(px, py, 3, 3);
        }
    }
    
    static drawCollectible(x, y, type, frame) {
        const bob = Math.sin(frame * 0.1) * 2;
        const glow = Math.abs(Math.sin(frame * 0.05)) * 0.3 + 0.2;
        
        // Glow effect
        ctx.fillStyle = `rgba(255, 215, 0, ${glow})`;
        ctx.beginPath();
        ctx.arc(x + 12, y + 12 + bob, 16, 0, Math.PI * 2);
        ctx.fill();
        
        switch(type) {
            case 'beads':
                // Prayer beads
                ctx.fillStyle = COLORS.gold;
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2 + frame * 0.02;
                    const bx = x + 12 + Math.cos(angle) * 8;
                    const by = y + 12 + bob + Math.sin(angle) * 8;
                    ctx.beginPath();
                    ctx.arc(bx, by, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Cross pendant
                ctx.fillRect(x + 10, y + 8 + bob, 4, 10);
                ctx.fillRect(x + 7, y + 11 + bob, 10, 3);
                break;
                
            case 'incense':
                // Incense burner
                ctx.fillStyle = COLORS.gold;
                ctx.fillRect(x + 6, y + 10 + bob, 12, 12);
                ctx.fillRect(x + 4, y + 20 + bob, 16, 4);
                // Smoke
                ctx.fillStyle = COLORS.incense;
                for (let i = 0; i < 3; i++) {
                    const sx = x + 10 + Math.sin(frame * 0.1 + i) * 4;
                    const sy = y + bob - i * 6;
                    ctx.globalAlpha = 0.5 - i * 0.15;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 4 - i, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
                break;
                
            case 'sandals':
                // Holy sandals
                ctx.fillStyle = COLORS.gold;
                ctx.fillRect(x + 4, y + 14 + bob, 8, 4);
                ctx.fillRect(x + 14, y + 14 + bob, 8, 4);
                ctx.fillRect(x + 6, y + 10 + bob, 2, 6);
                ctx.fillRect(x + 18, y + 10 + bob, 2, 6);
                // Sparkle
                ctx.fillStyle = '#fff';
                ctx.fillRect(x + 8, y + 8 + bob, 2, 2);
                break;
                
            case 'scroll':
                // Ancient scroll
                ctx.fillStyle = COLORS.white;
                ctx.fillRect(x + 4, y + 6 + bob, 16, 16);
                ctx.fillStyle = COLORS.wood;
                ctx.fillRect(x + 2, y + 4 + bob, 4, 20);
                ctx.fillRect(x + 18, y + 4 + bob, 4, 20);
                // Text lines
                ctx.fillStyle = COLORS.robe;
                for (let i = 0; i < 4; i++) {
                    ctx.fillRect(x + 8, y + 8 + bob + i * 3, 8, 1);
                }
                break;
        }
    }
    
    static drawCheckpoint(x, y, isActive, frame) {
        // Checkpoint marker - a glowing cross/flag
        const glow = Math.abs(Math.sin(frame * 0.1)) * 0.3 + 0.4;
        
        // Glow effect
        ctx.fillStyle = isActive ? `rgba(201, 162, 39, ${glow})` : 'rgba(100, 100, 100, 0.2)';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Cross/flag pole
        ctx.fillStyle = isActive ? COLORS.gold : COLORS.stoneDark;
        ctx.fillRect(x - 2, y - 20, 4, 30);
        
        // Flag/cross top
        if (isActive) {
            // Golden cross
            ctx.fillStyle = COLORS.gold;
            ctx.fillRect(x - 8, y - 20, 16, 4);
            ctx.fillRect(x - 2, y - 28, 4, 16);
            // Glow
            ctx.fillStyle = `rgba(244, 208, 63, ${glow})`;
            ctx.fillRect(x - 6, y - 18, 12, 2);
            ctx.fillRect(x - 1, y - 26, 2, 12);
        } else {
            // Inactive checkpoint - grey cross
            ctx.fillStyle = COLORS.stoneDark;
            ctx.fillRect(x - 6, y - 20, 12, 3);
            ctx.fillRect(x - 2, y - 26, 3, 12);
        }
    }
    
    static drawPlatform(x, y, width, type = 'stone') {
        const tileCount = Math.ceil(width / TILE_SIZE);
        
        for (let i = 0; i < tileCount; i++) {
            const tx = x + i * TILE_SIZE;
            
            if (type === 'stone') {
                ctx.fillStyle = COLORS.stone;
                ctx.fillRect(tx, y, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = COLORS.stoneDark;
                ctx.fillRect(tx + 2, y + 2, TILE_SIZE - 4, 4);
                ctx.fillRect(tx, y + TILE_SIZE - 4, TILE_SIZE, 4);
                // Cracks
                ctx.fillStyle = COLORS.stoneDark;
                ctx.fillRect(tx + 8, y + 8, 2, 8);
                ctx.fillRect(tx + 20, y + 12, 2, 6);
            } else if (type === 'wood') {
                ctx.fillStyle = COLORS.wood;
                ctx.fillRect(tx, y, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = COLORS.woodDark;
                for (let j = 0; j < 3; j++) {
                    ctx.fillRect(tx, y + j * 10 + 8, TILE_SIZE, 2);
                }
            } else if (type === 'cloud') {
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.beginPath();
                ctx.arc(tx + 16, y + 12, 14, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    static drawBackground(scrollX, level) {
        // Sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, COLORS.skyDark);
        gradient.addColorStop(0.5, COLORS.sky);
        gradient.addColorStop(1, '#7eb3d8');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Far mountains
        ctx.fillStyle = COLORS.mountainDark;
        for (let i = 0; i < 5; i++) {
            const mx = (i * 200 - scrollX * 0.1) % (canvas.width + 200) - 100;
            ctx.beginPath();
            ctx.moveTo(mx, canvas.height - 100);
            ctx.lineTo(mx + 100, canvas.height - 250 - (i % 3) * 50);
            ctx.lineTo(mx + 200, canvas.height - 100);
            ctx.fill();
        }
        
        // Mid mountains
        ctx.fillStyle = COLORS.mountain;
        for (let i = 0; i < 4; i++) {
            const mx = (i * 250 - scrollX * 0.2) % (canvas.width + 250) - 125;
            ctx.beginPath();
            ctx.moveTo(mx, canvas.height - 50);
            ctx.lineTo(mx + 125, canvas.height - 200 - (i % 2) * 40);
            ctx.lineTo(mx + 250, canvas.height - 50);
            ctx.fill();
        }
        
        // Holy Mountain (always visible in distance)
        ctx.fillStyle = COLORS.mountainDark;
        const holyMountainX = 600 - scrollX * 0.05;
        ctx.beginPath();
        ctx.moveTo(holyMountainX, canvas.height - 50);
        ctx.lineTo(holyMountainX + 150, canvas.height - 350);
        ctx.lineTo(holyMountainX + 300, canvas.height - 50);
        ctx.fill();
        
        // Snow cap
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(holyMountainX + 120, canvas.height - 300);
        ctx.lineTo(holyMountainX + 150, canvas.height - 350);
        ctx.lineTo(holyMountainX + 180, canvas.height - 300);
        ctx.fill();
        
        // Monastery on mountain
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(holyMountainX + 140, canvas.height - 360, 20, 15);
        ctx.fillStyle = COLORS.stone;
        ctx.fillRect(holyMountainX + 135, canvas.height - 345, 30, 20);
        
        // Mist effect
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        for (let i = 0; i < 3; i++) {
            const mistX = (Date.now() * 0.01 + i * 300) % (canvas.width + 200) - 100;
            ctx.beginPath();
            ctx.ellipse(mistX, canvas.height - 80 + i * 20, 150, 20, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    static drawWater(y, scrollX, frame) {
        // Water body
        const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);
        gradient.addColorStop(0, COLORS.water);
        gradient.addColorStop(1, COLORS.skyDark);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, y, canvas.width, canvas.height - y);
        
        // Waves
        ctx.fillStyle = COLORS.waterLight;
        for (let i = 0; i < canvas.width / 20; i++) {
            const waveX = i * 20;
            const waveY = y + Math.sin((waveX + scrollX + frame) * 0.05) * 3;
            ctx.fillRect(waveX, waveY, 15, 2);
        }
        
        // Reflections
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        for (let i = 0; i < 5; i++) {
            const rx = (i * 180 + frame * 0.5) % canvas.width;
            ctx.fillRect(rx, y + 10, 30, 2);
            ctx.fillRect(rx + 10, y + 20, 20, 2);
        }
    }
    
    static drawSilenceZone(x, y, width, height, active) {
        // Warning zone
        ctx.fillStyle = active ? 'rgba(255, 0, 0, 0.1)' : 'rgba(100, 100, 200, 0.1)';
        ctx.fillRect(x, y, width, height);
        
        // Border
        ctx.strokeStyle = active ? '#ff0000' : '#6464c8';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]);
        
        // Icon
        ctx.fillStyle = active ? '#ff0000' : '#6464c8';
        ctx.font = '16px Arial';
        ctx.fillText('🤫', x + width/2 - 8, y + 20);
    }
    
    static drawGuard(x, y, alert, direction, frame) {
        const offsetX = Math.floor(x);
        const offsetY = Math.floor(y);
        
        // Alert indicator
        if (alert) {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(offsetX + 10, offsetY - 15, 12, 12);
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.fillText('!', offsetX + 14, offsetY - 5);
        }
        
        // Guard monk with lantern
        this.drawMonk(x, y, 'elder', frame);
        
        // Lantern
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(offsetX - 5, offsetY + 15, 8, 10);
        ctx.fillStyle = '#ffdb58';
        ctx.globalAlpha = 0.5 + Math.sin(frame * 0.1) * 0.2;
        ctx.beginPath();
        ctx.arc(offsetX - 1, offsetY + 20, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Detection cone
        if (direction !== 0) {
            ctx.fillStyle = 'rgba(255, 255, 150, 0.1)';
            ctx.beginPath();
            if (direction > 0) {
                ctx.moveTo(offsetX + 20, offsetY + 15);
                ctx.lineTo(offsetX + 100, offsetY - 20);
                ctx.lineTo(offsetX + 100, offsetY + 50);
            } else {
                ctx.moveTo(offsetX, offsetY + 15);
                ctx.lineTo(offsetX - 80, offsetY - 20);
                ctx.lineTo(offsetX - 80, offsetY + 50);
            }
            ctx.closePath();
            ctx.fill();
        }
    }
    
    static drawDialogBox(text, speaker) {
        // Box background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(50, canvas.height - 150, canvas.width - 100, 120);
        
        // Border
        ctx.strokeStyle = COLORS.gold;
        ctx.lineWidth = 3;
        ctx.strokeRect(50, canvas.height - 150, canvas.width - 100, 120);
        
        // Byzantine corner decorations
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(50, canvas.height - 150, 20, 4);
        ctx.fillRect(50, canvas.height - 150, 4, 20);
        ctx.fillRect(canvas.width - 70, canvas.height - 150, 20, 4);
        ctx.fillRect(canvas.width - 54, canvas.height - 150, 4, 20);
        ctx.fillRect(50, canvas.height - 34, 20, 4);
        ctx.fillRect(50, canvas.height - 50, 4, 20);
        ctx.fillRect(canvas.width - 70, canvas.height - 34, 20, 4);
        ctx.fillRect(canvas.width - 54, canvas.height - 50, 4, 20);
        
        // Speaker name
        if (speaker) {
            ctx.fillStyle = COLORS.gold;
            ctx.font = 'bold 14px "Courier New"';
            ctx.fillText(speaker, 70, canvas.height - 125);
        }
        
        // Text
        ctx.fillStyle = COLORS.white;
        ctx.font = '14px "Courier New"';
        const words = text.split(' ');
        let line = '';
        let y = canvas.height - 105;
        const maxWidth = canvas.width - 140;
        
        for (let word of words) {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > maxWidth) {
                ctx.fillText(line, 70, y);
                line = word + ' ';
                y += 20;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, 70, y);
        
        // Continue prompt
        ctx.fillStyle = COLORS.gold;
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
        ctx.fillText('▼ Press SPACE to continue', canvas.width - 250, canvas.height - 45);
        ctx.globalAlpha = 1;
    }
    
    static drawRiddleBox(riddle, options, selectedIndex, isBoss = false, currentQuestion = 0, totalQuestions = 1) {
        // Background
        ctx.fillStyle = isBoss ? 'rgba(20, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(100, 100, canvas.width - 200, canvas.height - 200);
        
        // Ornate border
        ctx.strokeStyle = isBoss ? '#ff6b6b' : COLORS.gold;
        ctx.lineWidth = 4;
        ctx.strokeRect(100, 100, canvas.width - 200, canvas.height - 200);
        ctx.strokeRect(110, 110, canvas.width - 220, canvas.height - 220);
        
        // Title
        ctx.fillStyle = isBoss ? '#ff6b6b' : COLORS.gold;
        ctx.font = 'bold 20px "Courier New"';
        ctx.textAlign = 'center';
        const title = isBoss ? `☦ BATTLE ${currentQuestion + 1}/${totalQuestions} ☦` : '✝ TRIAL OF WISDOM ✝';
        ctx.fillText(title, canvas.width / 2, 150);
        
        // Riddle text
        ctx.fillStyle = COLORS.white;
        ctx.font = '16px "Courier New"';
        const riddleWords = riddle.split(' ');
        let line = '';
        let y = 200;
        
        for (let word of riddleWords) {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > canvas.width - 260) {
                ctx.fillText(line, canvas.width / 2, y);
                line = word + ' ';
                y += 25;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, canvas.width / 2, y);
        
        // Options
        y += 60;
        options.forEach((opt, i) => {
            if (i === selectedIndex) {
                ctx.fillStyle = COLORS.gold;
                ctx.fillText('► ' + opt + ' ◄', canvas.width / 2, y);
            } else {
                ctx.fillStyle = COLORS.white;
                ctx.fillText(opt, canvas.width / 2, y);
            }
            y += 35;
        });
        
        ctx.textAlign = 'left';
        
        // Instructions
        ctx.fillStyle = COLORS.gold;
        ctx.font = '12px "Courier New"';
        ctx.fillText('[↑↓] Select   [SPACE] Confirm', 120, canvas.height - 120);
    }
    
    static drawHUD(player, blessings, level, frame) {
        // Rank display
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(10, 10, 200, 70);
        ctx.strokeStyle = COLORS.gold;
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 200, 70);
        
        ctx.fillStyle = COLORS.gold;
        ctx.font = 'bold 14px "Courier New"';
        ctx.fillText('RANK:', 20, 30);
        ctx.fillStyle = COLORS.white;
        ctx.fillText(RANKS[player.rank], 70, 30);
        
        ctx.fillStyle = COLORS.gold;
        ctx.fillText('SCROLLS:', 20, 50);
        ctx.fillStyle = COLORS.white;
        ctx.fillText(player.scrolls + '/5', 90, 50);
        
        ctx.fillStyle = COLORS.gold;
        ctx.fillText('LEVEL:', 20, 70);
        ctx.fillStyle = COLORS.white;
        ctx.fillText(level.name, 75, 70);
        
        // Blessings/Items
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(canvas.width - 160, 10, 150, 80);
        ctx.strokeStyle = COLORS.gold;
        ctx.strokeRect(canvas.width - 160, 10, 150, 80);
        
        ctx.fillStyle = COLORS.gold;
        ctx.font = 'bold 12px "Courier New"';
        ctx.fillText('BLESSINGS:', canvas.width - 150, 28);
        
        let iconX = canvas.width - 150;
        let iconY = 40;
        
        if (blessings.beads) {
            ctx.fillStyle = COLORS.gold;
            ctx.font = '20px Arial';
            ctx.fillText('📿', iconX, iconY + 20);
            iconX += 35;
        }
        if (blessings.incense) {
            ctx.fillText('🪔', iconX, iconY + 20);
            iconX += 35;
        }
        if (blessings.sandals) {
            ctx.fillText('👡', iconX, iconY + 20);
            iconX += 35;
        }
        
        // Stealth meter (if incense active)
        if (player.stealthActive) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(canvas.width / 2 - 100, 10, 200, 20);
            ctx.strokeStyle = COLORS.incense;
            ctx.strokeRect(canvas.width / 2 - 100, 10, 200, 20);
            
            const stealthPercent = player.stealthTimer / player.stealthDuration;
            ctx.fillStyle = COLORS.incense;
            ctx.fillRect(canvas.width / 2 - 98, 12, 196 * stealthPercent, 16);
            
            ctx.fillStyle = '#000';
            ctx.font = '10px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText('INCENSE ACTIVE', canvas.width / 2, 24);
            ctx.textAlign = 'left';
        }
    }
    
    static drawAscension(tunnelBrightness, playerAlpha, frame) {
        // Draw heavenly light tunnel
        const centerX = canvas.width / 2 + 100; // Slightly right of center
        const centerY = canvas.height / 2 - 50;
        
        // Create radial gradient for light tunnel
        const maxRadius = Math.max(canvas.width, canvas.height) * 1.5;
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, maxRadius * tunnelBrightness
        );
        
        // Heavenly colors - golden white light
        gradient.addColorStop(0, `rgba(255, 255, 255, ${tunnelBrightness})`);
        gradient.addColorStop(0.2, `rgba(255, 250, 205, ${tunnelBrightness * 0.9})`);
        gradient.addColorStop(0.4, `rgba(255, 215, 0, ${tunnelBrightness * 0.7})`);
        gradient.addColorStop(0.6, `rgba(218, 165, 32, ${tunnelBrightness * 0.4})`);
        gradient.addColorStop(0.8, `rgba(184, 134, 11, ${tunnelBrightness * 0.2})`);
        gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Animated light rays
        if (tunnelBrightness > 0.3) {
            ctx.save();
            ctx.translate(centerX, centerY);
            
            const numRays = 12;
            const rayRotation = (frame * 0.5) % 360;
            
            for (let i = 0; i < numRays; i++) {
                const angle = (i / numRays) * Math.PI * 2 + rayRotation * Math.PI / 180;
                const rayLength = maxRadius * tunnelBrightness;
                
                ctx.save();
                ctx.rotate(angle);
                
                const rayGradient = ctx.createLinearGradient(0, 0, rayLength, 0);
                rayGradient.addColorStop(0, `rgba(255, 255, 255, ${tunnelBrightness * 0.5})`);
                rayGradient.addColorStop(0.5, `rgba(255, 215, 0, ${tunnelBrightness * 0.2})`);
                rayGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
                
                ctx.fillStyle = rayGradient;
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(rayLength, -3);
                ctx.lineTo(rayLength, 3);
                ctx.lineTo(0, 10);
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
            }
            
            ctx.restore();
        }
        
        // Divine sparkles
        if (tunnelBrightness > 0.5) {
            for (let i = 0; i < 30; i++) {
                const sparkleX = centerX + Math.cos(frame * 0.05 + i * 0.5) * (200 + i * 10) * tunnelBrightness;
                const sparkleY = centerY + Math.sin(frame * 0.05 + i * 0.7) * (150 + i * 8) * tunnelBrightness;
                const sparkleSize = (Math.sin(frame * 0.1 + i) + 1) * 2;
                const sparkleAlpha = (Math.sin(frame * 0.15 + i * 0.3) + 1) * 0.5 * tunnelBrightness;
                
                ctx.fillStyle = `rgba(255, 255, 255, ${sparkleAlpha})`;
                ctx.beginPath();
                ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Text messages during ascension
        if (frame > 150 && frame < 280) {
            const textAlpha = frame < 200 ? (frame - 150) / 50 : 
                            frame > 230 ? 1 - (frame - 230) / 50 : 1;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${textAlpha})`;
            ctx.font = 'bold 28px "Courier New"';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
            ctx.shadowBlur = 20;
            ctx.fillText('☦ ENTERING THE KINGDOM ☦', canvas.width / 2, canvas.height / 2 + 150);
            ctx.shadowBlur = 0;
            ctx.textAlign = 'left';
        }
    }
    
    static drawGameOver(won) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.textAlign = 'center';
        
        if (won) {
            // Heavenly victory screen
            ctx.fillStyle = COLORS.gold;
            ctx.font = 'bold 40px "Courier New"';
            ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
            ctx.shadowBlur = 15;
            ctx.fillText('☦ ASCENSION COMPLETE ☦', canvas.width / 2, canvas.height / 2 - 80);
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = COLORS.white;
            ctx.font = 'bold 24px "Courier New"';
            ctx.fillText('SERAPHIM - BEARER OF 6 WINGS', canvas.width / 2, canvas.height / 2 - 30);
            
            ctx.font = '18px "Courier New"';
            ctx.fillText('Clothed in light, you have ascended to the highest angelic order', canvas.width / 2, canvas.height / 2 + 10);
            ctx.fillText('Your soul shines with eternal wisdom and divine glory', canvas.width / 2, canvas.height / 2 + 35);
            
            ctx.fillStyle = COLORS.gold;
            ctx.font = 'italic 16px "Courier New"';
            ctx.fillText('"Blessed are the pure in heart, for they shall see God."', canvas.width / 2, canvas.height / 2 + 70);
            ctx.fillText('- Matthew 5:8', canvas.width / 2, canvas.height / 2 + 95);
        } else {
            ctx.fillStyle = '#c0392b';
            ctx.font = 'bold 36px "Courier New"';
            ctx.fillText('PILGRIMAGE ENDED', canvas.width / 2, canvas.height / 2 - 40);
            
            ctx.fillStyle = COLORS.white;
            ctx.font = '18px "Courier New"';
            ctx.fillText('The monks have escorted you from the peninsula.', canvas.width / 2, canvas.height / 2 + 10);
            ctx.fillText('Perhaps next time you will follow the sacred rules...', canvas.width / 2, canvas.height / 2 + 40);
        }
        
        ctx.fillStyle = COLORS.gold;
        ctx.font = '16px "Courier New"';
        ctx.fillText('Press SPACE to try again', canvas.width / 2, canvas.height / 2 + 100);
        
        ctx.textAlign = 'left';
    }
    
    static drawTitleScreen(frame) {
        // Background
        this.drawBackground(frame * 0.5, null);
        
        // Title card background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(canvas.width / 2 - 250, 80, 500, 200);
        ctx.strokeStyle = COLORS.gold;
        ctx.lineWidth = 4;
        ctx.strokeRect(canvas.width / 2 - 250, 80, 500, 200);
        
        // Byzantine pattern border
        ctx.strokeStyle = COLORS.gold;
        ctx.lineWidth = 2;
        for (let i = 0; i < 25; i++) {
            ctx.strokeRect(canvas.width / 2 - 245 + i * 20, 85, 15, 15);
        }
        for (let i = 0; i < 25; i++) {
            ctx.strokeRect(canvas.width / 2 - 245 + i * 20, 260, 15, 15);
        }
        
        // Title
        ctx.textAlign = 'center';
        ctx.fillStyle = COLORS.gold;
        ctx.font = 'bold 48px "Courier New"';
        ctx.fillText('PILGRIM OF ATOS', canvas.width / 2, 160);
        
        // Subtitle
        ctx.fillStyle = COLORS.white;
        ctx.font = '16px "Courier New"';
        ctx.fillText('A Journey to the Holy Mountain', canvas.width / 2, 200);
        
        // Cross decoration
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(canvas.width / 2 - 3, 220, 6, 30);
        ctx.fillRect(canvas.width / 2 - 12, 230, 24, 6);
        
        // Start prompt
        ctx.fillStyle = COLORS.gold;
        ctx.globalAlpha = 0.5 + Math.sin(frame * 0.05) * 0.5;
        ctx.font = '20px "Courier New"';
        ctx.fillText('Press SPACE to Begin Your Pilgrimage', canvas.width / 2, 350);
        ctx.globalAlpha = 1;
        
        // Controls
        ctx.fillStyle = COLORS.white;
        ctx.font = '14px "Courier New"';
        ctx.fillText('Controls:', canvas.width / 2, 420);
        ctx.fillText('[←→] Move   [SPACE] Jump   [↓] Interact   [E] Use Item', canvas.width / 2, 445);
        
        // Draw some decorative monks
        ctx.textAlign = 'left';
        this.drawMonk(100, canvas.height - 80, 'elder', frame);
        this.drawMonk(canvas.width - 140, canvas.height - 80, 'abbot', frame);
        
        // Draw pilgrim
        this.drawPilgrim(canvas.width / 2 - 12, canvas.height - 60, 1, frame, false, false, false);
        
        // Ground
        ctx.fillStyle = COLORS.stone;
        ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        
        // Attribution
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '10px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('A mystical 16-bit adventure inspired by Mount Athos', canvas.width / 2, canvas.height - 10);
        ctx.textAlign = 'left';
    }
    
    static drawPauseScreen() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.textAlign = 'center';
        ctx.fillStyle = COLORS.gold;
        ctx.font = 'bold 36px "Courier New"';
        ctx.fillText('MEDITATION PAUSE', canvas.width / 2, canvas.height / 2 - 40);
        
        ctx.fillStyle = COLORS.white;
        ctx.font = '18px "Courier New"';
        ctx.fillText('Press ESC to continue your journey', canvas.width / 2, canvas.height / 2 + 20);
        
        ctx.textAlign = 'left';
    }

    static drawLevelTransition(levelName, frame) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.textAlign = 'center';
        
        // Entering text
        ctx.fillStyle = COLORS.white;
        ctx.font = '18px "Courier New"';
        ctx.fillText('Entering...', canvas.width / 2, canvas.height / 2 - 60);
        
        // Level name
        ctx.fillStyle = COLORS.gold;
        ctx.font = 'bold 32px "Courier New"';
        ctx.fillText(levelName, canvas.width / 2, canvas.height / 2);
        
        // Loading bar
        const progress = Math.min(1, frame / 120);
        ctx.fillStyle = COLORS.stoneDark;
        ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 + 40, 200, 10);
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 + 40, 200 * progress, 10);
        
        ctx.textAlign = 'left';
        
        return progress >= 1;
    }
}

// ============================================
// LEVEL DATA
// ============================================
const LEVELS = [
    {
        name: 'The Coastal Path',
        description: 'Your pilgrimage begins at the shores of the sacred peninsula.',
        platforms: [
            { x: 0, y: 550, width: 800, type: 'stone' },
            { x: 900, y: 550, width: 300, type: 'stone' },
            { x: 1300, y: 500, width: 200, type: 'stone' },
            { x: 1600, y: 450, width: 150, type: 'stone' },
            { x: 1850, y: 400, width: 200, type: 'stone' },
            { x: 2100, y: 350, width: 150, type: 'wood' },
            { x: 2350, y: 400, width: 300, type: 'stone' },
            { x: 2750, y: 450, width: 200, type: 'stone' },
            { x: 3000, y: 500, width: 400, type: 'stone' },
            { x: 3500, y: 550, width: 600, type: 'stone' }
        ],
        collectibles: [
            { x: 500, y: 500, type: 'scroll' },
            { x: 1400, y: 440, type: 'beads' },
            { x: 2200, y: 280, type: 'scroll' }
        ],
        portal: { x: 250, y: 480, hidden: true }, // Secret portal to final level
        hazards: [],
        npcs: [
            { x: 3800, y: 510, type: 'elder', dialog: [
                'Blessings upon you, young pilgrim.',
                'You seek the High Monastery, I see it in your eyes.',
                'First, you must prove yourself worthy.',
                'Take these prayer beads if you have not already found them.',
                'They will grant you the ability to reach higher places.',
                'Continue eastward to the Forest of Silence.'
            ]}
        ],
        decorations: [
            { x: 200, y: 486, type: 'cypress' },
            { x: 400, y: 486, type: 'olive' },
            { x: 600, y: 486, type: 'cypress' },
            { x: 3200, y: 486, type: 'olive' },
            { x: 3400, y: 486, type: 'cypress' }
        ],
        waterLevel: 580,
        exitX: 4000,
        startX: 50,
        width: 4200,
        checkpoints: [
            { x: 50, y: 518 },      // Start (on platform at y:550, player y = 550-32 = 518)
            { x: 1000, y: 518 },   // After first section (on platform at y:550)
            { x: 2000, y: 318 },   // After mid-level platforms (on platform at y:350, player y = 350-32 = 318)
            { x: 3000, y: 468 }    // Near end (on platform at y:500, player y = 500-32 = 468)
        ]
    },
    {
        name: 'Forest of Silence',
        description: 'A sacred grove where monks practice vows of silence.',
        platforms: [
            { x: 0, y: 550, width: 600, type: 'stone' },
            { x: 700, y: 500, width: 200, type: 'wood' },
            { x: 1000, y: 450, width: 300, type: 'stone' },
            { x: 1400, y: 400, width: 200, type: 'wood' },
            { x: 1700, y: 450, width: 150, type: 'stone' },
            { x: 1950, y: 500, width: 200, type: 'stone' },
            { x: 2250, y: 450, width: 300, type: 'stone' },
            { x: 2650, y: 400, width: 200, type: 'wood' },
            { x: 2950, y: 450, width: 400, type: 'stone' },
            { x: 3450, y: 500, width: 300, type: 'stone' },
            { x: 3850, y: 550, width: 400, type: 'stone' }
        ],
        collectibles: [
            { x: 800, y: 440, type: 'incense' },
            { x: 1500, y: 330, type: 'scroll' },
            { x: 2700, y: 330, type: 'scroll' }
        ],
        hazards: [],
        silenceZones: [
            { x: 1000, y: 300, width: 400, height: 200 },
            { x: 2250, y: 300, width: 350, height: 200 }
        ],
        guards: [
            { x: 1200, y: 410, patrolStart: 1100, patrolEnd: 1350 },
            { x: 2400, y: 410, patrolStart: 2300, patrolEnd: 2550 }
        ],
        npcs: [
            { x: 4100, y: 510, type: 'abbot', dialog: [
                'You have passed through the Forest of Silence.',
                'Few manage this without alerting the guardians.',
                'I am Abbot Theodoros of the Lower Monastery.',
                'Before you proceed, answer me this riddle...'
            ], riddle: {
                question: 'I have no voice, yet I speak to the soul. I have no wings, yet I lift the spirit. What am I?',
                options: ['A Bell', 'A Prayer', 'An Icon', 'The Wind'],
                correct: 1
            }}
        ],
        decorations: [
            { x: 100, y: 486, type: 'cypress' },
            { x: 250, y: 486, type: 'cypress' },
            { x: 400, y: 486, type: 'cypress' },
            { x: 1100, y: 386, type: 'olive' },
            { x: 2350, y: 386, type: 'cypress' },
            { x: 3000, y: 386, type: 'olive' },
            { x: 3900, y: 486, type: 'cypress' }
        ],
        waterLevel: null,
        exitX: 4200,
        startX: 50,
        width: 4400,
        checkpoints: [
            { x: 50, y: 518 },      // Start (on first platform)
            { x: 1000, y: 418 },   // After first silence zone (on platform at y:450)
            { x: 2000, y: 418 },   // After second silence zone (on platform at y:450)
            { x: 3000, y: 418 }    // Near end (on platform at y:450)
        ]
    },
    {
        name: 'The Lower Monastery',
        description: 'An ancient monastery with strict sacred rules.',
        platforms: [
            { x: 0, y: 550, width: 400, type: 'stone' },
            { x: 500, y: 500, width: 300, type: 'stone' },
            { x: 900, y: 450, width: 250, type: 'stone' },
            { x: 1250, y: 400, width: 200, type: 'wood' },
            { x: 1550, y: 350, width: 300, type: 'stone' },
            { x: 1950, y: 300, width: 200, type: 'stone' },
            { x: 2250, y: 350, width: 250, type: 'stone' },
            { x: 2600, y: 400, width: 200, type: 'wood' },
            { x: 2900, y: 450, width: 300, type: 'stone' },
            { x: 3300, y: 500, width: 400, type: 'stone' },
            { x: 3800, y: 550, width: 500, type: 'stone' }
        ],
        collectibles: [
            { x: 600, y: 440, type: 'sandals' },
            { x: 1650, y: 280, type: 'scroll' },
            { x: 3000, y: 380, type: 'scroll' }
        ],
        hazards: [],
        silenceZones: [
            { x: 1550, y: 200, width: 450, height: 200 }
        ],
        guards: [
            { x: 1000, y: 410, patrolStart: 950, patrolEnd: 1150 },
            { x: 1750, y: 310, patrolStart: 1600, patrolEnd: 1850 }
        ],
        npcs: [
            { x: 4100, y: 510, type: 'bishop', dialog: [
                'Greetings, Initiate.',
                'You wear the Holy Sandals, I see.',
                'With them, you may walk upon the sacred waters.',
                'The path ahead leads to the Mountain Ascent.',
                'Only the pure of heart may reach the summit.',
                'Go now, and may the Light guide your steps.'
            ]}
        ],
        monastery: { x: 3850, y: 430, scale: 0.8 },
        decorations: [
            { x: 200, y: 486, type: 'cypress' },
            { x: 3400, y: 436, type: 'olive' }
        ],
        waterLevel: null,
        exitX: 4300,
        startX: 50,
        width: 4500,
        checkpoints: [
            { x: 50, y: 518 },      // Start (on first platform)
            { x: 1000, y: 418 },   // After first guard (on platform at y:450)
            { x: 2000, y: 268 },   // After second guard (on platform at y:300)
            { x: 3000, y: 418 }    // Near end (on platform at y:450)
        ]
    },
    {
        name: 'The Sacred Waters',
        description: 'Cross the holy bay to reach the mountain.',
        platforms: [
            { x: 0, y: 550, width: 300, type: 'stone' },
            { x: 400, y: 520, width: 100, type: 'wood' },
            { x: 600, y: 520, width: 100, type: 'wood' },
            { x: 800, y: 520, width: 100, type: 'wood' },
            { x: 1000, y: 520, width: 100, type: 'wood' },
            { x: 1200, y: 520, width: 100, type: 'wood' },
            { x: 1400, y: 520, width: 100, type: 'wood' },
            { x: 1600, y: 500, width: 200, type: 'stone' },
            { x: 1900, y: 520, width: 100, type: 'wood' },
            { x: 2100, y: 520, width: 100, type: 'wood' },
            { x: 2300, y: 520, width: 100, type: 'wood' },
            { x: 2500, y: 550, width: 400, type: 'stone' }
        ],
        collectibles: [
            { x: 1650, y: 430, type: 'scroll' }
        ],
        hazards: [],
        npcs: [
            { x: 2700, y: 510, type: 'elder', dialog: [
                'You have crossed the Sacred Waters!',
                'The Holy Sandals have served you well.',
                'The Mountain Ascent lies ahead.',
                'This is the final challenge before the summit.',
                'Prepare yourself, Keeper of the Path.'
            ]}
        ],
        decorations: [],
        waterLevel: 540,
        exitX: 2900,
        startX: 50,
        width: 3100,
        checkpoints: [
            { x: 50, y: 518 },      // Start (on first platform)
            { x: 800, y: 488 },     // Mid-way across water (on platform at y:520)
            { x: 1600, y: 468 },    // After mid-platform (on platform at y:500)
            { x: 2500, y: 518 }     // Near end (on platform at y:550)
        ]
    },
    {
        name: 'Mountain Ascent',
        description: 'The treacherous climb to the High Monastery.',
        platforms: [
            { x: 0, y: 550, width: 300, type: 'stone' },
            { x: 350, y: 500, width: 150, type: 'stone' },
            { x: 550, y: 440, width: 150, type: 'stone' },
            { x: 750, y: 380, width: 150, type: 'stone' },
            { x: 950, y: 320, width: 200, type: 'stone' },
            { x: 1200, y: 260, width: 150, type: 'wood' },
            { x: 1400, y: 200, width: 150, type: 'stone' },
            { x: 1600, y: 260, width: 100, type: 'cloud' },
            { x: 1750, y: 200, width: 100, type: 'cloud' },
            { x: 1900, y: 140, width: 150, type: 'stone' },
            { x: 2100, y: 100, width: 200, type: 'stone' },
            { x: 2350, y: 150, width: 100, type: 'cloud' },
            { x: 2500, y: 100, width: 200, type: 'stone' },
            { x: 2750, y: 150, width: 150, type: 'stone' },
            { x: 2950, y: 200, width: 300, type: 'stone' }
        ],
        collectibles: [],
        hazards: [],
        silenceZones: [
            { x: 1900, y: 0, width: 250, height: 200 }
        ],
        guards: [
            { x: 1000, y: 280, patrolStart: 980, patrolEnd: 1120 },
            { x: 2150, y: 60, patrolStart: 2130, patrolEnd: 2270 }
        ],
        npcs: [
            { x: 3100, y: 160, type: 'schema-monk', dialog: [
                '☦ HALT, PILGRIM! ☦',
                'I am SCHEMA MONK MAXIMOS, Guardian of the Highest Mysteries!',
                'You dare approach the Sacred Codex?!',
                'Then prove your theological wisdom in BATTLE!',
                'Answer THREE questions... or be cast down the mountain!'
            ], riddles: [
                {
                    question: 'First Trial: Which is the greatest commandment according to our Lord?',
                    options: [
                        'Thou shalt not steal',
                        'Love the Lord thy God with all thy heart, soul, and mind',
                        'Honor thy father and mother',
                        'Remember the Sabbath day'
                    ],
                    correct: 1
                },
                {
                    question: 'Second Trial: In what manner does the Holy Spirit proceed?',
                    options: [
                        'From the Father alone',
                        'From the Son alone',
                        'From the Father and the Son (Filioque)',
                        'From neither, but exists eternally'
                    ],
                    correct: 0
                },
                {
                    question: 'Third Trial: What is theosis, the ultimate goal of Orthodox spiritual life?',
                    options: [
                        'Perfect obedience to monastic rules',
                        'Union with God while maintaining human personhood',
                        'Complete annihilation of the self',
                        'Escape from the material world'
                    ],
                    correct: 1
                }
            ], currentRiddle: 0, isFinal: true, isBoss: true}
        ],
        monastery: { x: 2950, y: 80, scale: 0.7 },
        decorations: [],
        waterLevel: null,
        exitX: 3300,
        startX: 50,
        width: 3500,
        checkpoints: [
            { x: 50, y: 518 },      // Start (on first platform)
            { x: 750, y: 408 },     // After first climb (on platform at y:440)
            { x: 1400, y: 168 },    // Mid-mountain (on platform at y:200)
            { x: 2100, y: 68 },     // Near summit (on platform at y:100)
            { x: 2950, y: 168 }     // At monastery (on platform at y:200)
        ]
    }
];

// ============================================
// GAME STATE
// ============================================
const game = {
    state: 'title', // title, playing, paused, dialog, riddle, transition, gameover, ascension
    currentLevel: 0,
    frame: 0,
    transitionFrame: 0,
    
    player: {
        x: 50,
        y: 400,
        vx: 0,
        vy: 0,
        width: 24,
        height: 32,
        direction: 1,
        isGrounded: false,
        canDoubleJump: false,
        hasDoubleJumped: false,
        rank: 0,
        scrolls: 0,
        stealthActive: false,
        stealthTimer: 0,
        stealthDuration: 300,
        onWater: false,
        walkFrame: 0
    },
    
    blessings: {
        beads: false,
        incense: false,
        sandals: false
    },
    
    camera: {
        x: 0,
        y: 0
    },
    
    dialog: {
        active: false,
        lines: [],
        currentLine: 0,
        speaker: ''
    },
    
    riddle: {
        active: false,
        question: '',
        options: [],
        selectedIndex: 0,
        correct: 0,
        callback: null
    },
    
    guards: [],
    collectibles: [],
    npcs: [],
    platforms: [],
    silenceZones: [],
    checkpoints: [],
    lastCheckpoint: 0,  // Index of last checkpoint reached
    
    won: false,
    
    ascension: {
        frame: 0,
        tunnelBrightness: 0,
        playerAlpha: 1,
        walkingToLight: false,
        targetX: 0
    }
};

// ============================================
// INPUT HANDLING
// ============================================
const keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    interact: false,
    item: false,
    pause: false
};

document.addEventListener('keydown', (e) => {
    audio.init();
    
    switch(e.code) {
        case 'ArrowLeft':
        case 'KeyA':
            keys.left = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            keys.right = true;
            break;
        case 'ArrowUp':
        case 'KeyW':
            keys.up = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            keys.down = true;
            break;
        case 'Space':
            if (!keys.jump) {
                keys.jump = true;
                handleJumpPress();
            }
            break;
        case 'KeyE':
            keys.item = true;
            handleItemUse();
            break;
        case 'Escape':
            keys.pause = true;
            handlePause();
            break;
    }
    
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'ArrowLeft':
        case 'KeyA':
            keys.left = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            keys.right = false;
            break;
        case 'ArrowUp':
        case 'KeyW':
            keys.up = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            keys.down = false;
            break;
        case 'Space':
            keys.jump = false;
            break;
        case 'KeyE':
            keys.item = false;
            break;
        case 'Escape':
            keys.pause = false;
            break;
    }
});

function handleJumpPress() {
    if (game.state === 'title') {
        startGame();
        return;
    }
    
    if (game.state === 'gameover') {
        resetGame();
        return;
    }
    
    if (game.state === 'dialog') {
        advanceDialog();
        return;
    }
    
    if (game.state === 'riddle') {
        submitRiddleAnswer();
        return;
    }
    
    if (game.state === 'playing') {
        const p = game.player;
        if (p.isGrounded || p.onWater) {
            p.vy = JUMP_FORCE;
            p.isGrounded = false;
            p.onWater = false;
            p.hasDoubleJumped = false;
            audio.playJump();
        } else if (game.blessings.beads && !p.hasDoubleJumped) {
            p.vy = JUMP_FORCE * 0.85;
            p.hasDoubleJumped = true;
            audio.playJump();
        }
    }
}

function handleItemUse() {
    if (game.state !== 'playing') return;
    
    if (game.blessings.incense && !game.player.stealthActive) {
        game.player.stealthActive = true;
        game.player.stealthTimer = game.player.stealthDuration;
        audio.playChant();
    }
}

function handlePause() {
    if (game.state === 'playing') {
        game.state = 'paused';
    } else if (game.state === 'paused') {
        game.state = 'playing';
    }
}

// ============================================
// GAME LOGIC
// ============================================
function startGame() {
    game.state = 'transition';
    game.transitionFrame = 0;
    audio.playBell();
    loadLevel(0);
}

function resetGame() {
    game.currentLevel = 0;
    game.player.rank = 0;
    game.player.scrolls = 0;
    game.blessings = { beads: false, incense: false, sandals: false };
    game.won = false;
    game.state = 'transition';
    game.transitionFrame = 0;
    loadLevel(0);
}

function loadLevel(levelIndex) {
    const level = LEVELS[levelIndex];
    game.currentLevel = levelIndex;
    
    // Reset player position
    game.player.x = level.startX;
    game.player.y = 400;
    game.player.vx = 0;
    game.player.vy = 0;
    game.player.stealthActive = false;
    
    // Load level data
    game.platforms = [...level.platforms];
    game.collectibles = level.collectibles.map(c => ({...c, collected: false}));
    game.npcs = level.npcs.map(n => ({...n, interacted: false}));
    game.silenceZones = level.silenceZones ? [...level.silenceZones] : [];
    game.guards = level.guards ? level.guards.map(g => ({
        ...g,
        x: g.x,
        direction: 1,
        alert: false,
        alertTimer: 0
    })) : [];
    
    // Load checkpoints
    game.checkpoints = level.checkpoints ? [...level.checkpoints] : [];
    game.lastCheckpoint = 0; // Reset to first checkpoint when loading level
    
    // Reset camera
    game.camera.x = 0;
}

function nextLevel() {
    if (game.currentLevel < LEVELS.length - 1) {
        game.player.rank = Math.min(game.player.rank + 1, RANKS.length - 1);
        game.state = 'transition';
        game.transitionFrame = 0;
        audio.playSuccess();
        loadLevel(game.currentLevel + 1);
    } else {
        // Won the game!
        game.won = true;
        game.player.rank = RANKS.length - 1;
        game.state = 'gameover';
        audio.playSuccess();
    }
}

function gameOver() {
    game.won = false;
    game.state = 'gameover';
    audio.playAlert();
}

function advanceDialog() {
    game.dialog.currentLine++;
    if (game.dialog.currentLine >= game.dialog.lines.length) {
        game.dialog.active = false;
        
        // Check if this is the final victory dialog
        if (game.dialog.isFinalVictory) {
            // Start ascension sequence!
            game.won = true;
            game.player.rank = RANKS.length - 1;
            game.state = 'ascension';
            game.ascension.frame = 0;
            game.ascension.tunnelBrightness = 0;
            game.ascension.playerAlpha = 1;
            game.ascension.walkingToLight = false;
            game.ascension.targetX = game.player.x + 200; // Walk towards the light
            game.player.direction = 1; // Face right towards the light
            game.player.vx = 0; // Stop any movement
            game.player.vy = 0;
            game.dialog.isFinalVictory = false;
            return;
        }
        
        // Check if this NPC has riddles (boss) or riddle (regular)
        const npc = game.dialog.npc;
        if (npc && npc.isBoss && npc.riddles && !npc.riddleSolved) {
            // Boss with multiple riddles
            npc.currentRiddle = npc.currentRiddle || 0;
            showRiddle(npc.riddles[npc.currentRiddle], npc);
        } else if (npc && npc.riddle && !npc.riddleSolved) {
            // Regular NPC with single riddle
            showRiddle(npc.riddle, npc);
        } else {
            game.state = 'playing';
        }
    }
    audio.playTone(300, 0.1);
}

function showRiddle(riddle, npc) {
    game.riddle.active = true;
    game.riddle.question = riddle.question;
    game.riddle.options = riddle.options;
    game.riddle.correct = riddle.correct;
    game.riddle.selectedIndex = 0;
    game.riddle.npc = npc;
    game.state = 'riddle';
}

function submitRiddleAnswer() {
    if (game.riddle.selectedIndex === game.riddle.correct) {
        // Correct answer!
        audio.playSuccess();
        const npc = game.riddle.npc;
        
        // Check if this is a boss with multiple riddles
        if (npc.isBoss && npc.riddles) {
            npc.currentRiddle = (npc.currentRiddle || 0) + 1;
            
            if (npc.currentRiddle < npc.riddles.length) {
                // More riddles to go!
                setTimeout(() => {
                    showRiddle(npc.riddles[npc.currentRiddle], npc);
                }, 500);
            } else {
                // All riddles solved - defeat the boss! Show victory dialog
                npc.riddleSolved = true;
                game.riddle.active = false;
                setTimeout(() => {
                    game.dialog.active = true;
                    game.dialog.lines = [
                        'You have answered correctly...',
                        'Your wisdom is profound, your faith unshakeable.',
                        'You have obtained the 6 ANGELIC WINGS of the highest rank...',
                        'THE SERAPHIM!',
                        'Thou hast been clothed in light, young pilgrim.',
                        '☦ Now fly to Heaven on wings of glory! ☦'
                    ];
                    game.dialog.currentLine = 0;
                    game.dialog.speaker = 'SCHEMA MONK MAXIMOS';
                    game.dialog.npc = npc;
                    game.dialog.isFinalVictory = true;
                    game.state = 'dialog';
                }, 500);
            }
        } else if (npc.isFinal) {
            // Regular final riddle (non-boss)
            npc.riddleSolved = true;
            setTimeout(() => {
                game.won = true;
                game.player.rank = RANKS.length - 1;
                game.state = 'gameover';
            }, 1000);
        } else {
            // Regular NPC riddle
            npc.riddleSolved = true;
            game.state = 'playing';
        }
        game.riddle.active = false;
    } else {
        // Wrong answer
        audio.playAlert();
        // For boss, could add damage or retry
    }
}

function updatePlayer() {
    const p = game.player;
    const level = LEVELS[game.currentLevel];
    
    // Horizontal movement
    if (keys.left) {
        p.vx = -MOVE_SPEED;
        p.direction = -1;
        p.walkFrame++;
    } else if (keys.right) {
        p.vx = MOVE_SPEED;
        p.direction = 1;
        p.walkFrame++;
    } else {
        p.vx = 0;
    }
    
    // Apply gravity
    if (!p.onWater) {
        p.vy += GRAVITY;
    }
    
    // Apply velocity (delta-time adjusted for frame-rate independence)
    p.x += p.vx * deltaMultiplier;
    p.y += p.vy * deltaMultiplier;
    
    // Play walking sound
    if (p.isGrounded && Math.abs(p.vx) > 0 && game.frame % 15 === 0) {
        audio.playStep();
    }
    
    // Platform collision
    p.isGrounded = false;
    p.onWater = false;
    
    for (const plat of game.platforms) {
        if (p.x + p.width > plat.x && p.x < plat.x + plat.width) {
            if (p.y + p.height > plat.y && p.y + p.height < plat.y + 20 && p.vy >= 0) {
                p.y = plat.y - p.height;
                p.vy = 0;
                p.isGrounded = true;
                p.hasDoubleJumped = false;
            }
        }
    }
    
    // Water collision (with sandals)
    if (level.waterLevel) {
        if (p.y + p.height >= level.waterLevel) {
            if (game.blessings.sandals) {
                p.y = level.waterLevel - p.height;
                p.vy = 0;
                p.onWater = true;
                p.hasDoubleJumped = false;
            } else {
                // Fall in water - respawn at last checkpoint
                respawnAtCheckpoint();
                audio.playAlert();
            }
        }
    }
    
    // Screen boundaries
    if (p.x < 0) p.x = 0;
    if (p.x > level.width - p.width) p.x = level.width - p.width;
    
    // Fall off screen - respawn at last checkpoint
    // Check if player has fallen way below the screen (works for all levels)
    if (p.y > 800) {
        console.log('Player fell off at y:', p.y, 'Current checkpoint:', game.lastCheckpoint);
        respawnAtCheckpoint();
        audio.playAlert();
    }
    
    // Check if player passed a checkpoint
    checkCheckpoints();
    
    // Stealth timer
    if (p.stealthActive) {
        p.stealthTimer--;
        if (p.stealthTimer <= 0) {
            p.stealthActive = false;
        }
    }
    
    // Level exit
    if (p.x >= level.exitX - 50) {
        nextLevel();
    }
}

function updateCamera() {
    const level = LEVELS[game.currentLevel];
    const targetX = game.player.x - canvas.width / 2;
    
    // Smooth camera follow
    game.camera.x += (targetX - game.camera.x) * 0.1;
    
    // Camera bounds
    if (game.camera.x < 0) game.camera.x = 0;
    if (game.camera.x > level.width - canvas.width) {
        game.camera.x = level.width - canvas.width;
    }
}

function updateGuards() {
    for (const guard of game.guards) {
        // Patrol movement (delta-time adjusted)
        guard.x += guard.direction * 0.5 * deltaMultiplier;
        if (guard.x <= guard.patrolStart) {
            guard.direction = 1;
        } else if (guard.x >= guard.patrolEnd) {
            guard.direction = -1;
        }
        
        // Detection (if player not in stealth)
        if (!game.player.stealthActive) {
            const dx = game.player.x - guard.x;
            const dy = game.player.y - guard.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if player is in front of guard
            const inFront = (guard.direction > 0 && dx > 0) || (guard.direction < 0 && dx < 0);
            
            if (distance < 80 && inFront) {
                guard.alert = true;
                guard.alertTimer = 120;
                
                // Check if in silence zone
                for (const zone of game.silenceZones) {
                    if (game.player.x > zone.x && game.player.x < zone.x + zone.width &&
                        game.player.y > zone.y && game.player.y < zone.y + zone.height) {
                        // Caught in silence zone!
                        gameOver();
                        return;
                    }
                }
            }
        }
        
        if (guard.alertTimer > 0) {
            guard.alertTimer--;
            if (guard.alertTimer === 0) {
                guard.alert = false;
            }
        }
    }
}

function updateCollectibles() {
    for (const item of game.collectibles) {
        if (item.collected) continue;
        
        const dx = game.player.x + game.player.width/2 - (item.x + 12);
        const dy = game.player.y + game.player.height/2 - (item.y + 12);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 30) {
            item.collected = true;
            audio.playCollect();
            
            switch(item.type) {
                case 'beads':
                    game.blessings.beads = true;
                    break;
                case 'incense':
                    game.blessings.incense = true;
                    break;
                case 'sandals':
                    game.blessings.sandals = true;
                    break;
                case 'scroll':
                    game.player.scrolls++;
                    break;
            }
        }
    }
}

function checkPortalInteraction() {
    const level = LEVELS[game.currentLevel];
    if (!level.portal || !keys.down) return;
    
    const portal = level.portal;
    const dx = game.player.x - portal.x;
    const dy = game.player.y - portal.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 40) {
        // Teleport to final level!
        game.player.rank = Math.min(game.player.rank + 3, RANKS.length - 1);
        game.state = 'transition';
        game.transitionFrame = 0;
        audio.playSuccess();
        loadLevel(LEVELS.length - 1); // Jump to last level
    }
}

function checkNPCInteraction() {
    if (!keys.down) return;
    
    for (const npc of game.npcs) {
        const dx = game.player.x - npc.x;
        const dy = game.player.y - npc.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Larger interaction range for boss
        const interactionRange = npc.isBoss ? 100 : 50;
        
        if (distance < interactionRange && !npc.interacted) {
            npc.interacted = true;
            game.dialog.active = true;
            game.dialog.lines = npc.dialog;
            game.dialog.currentLine = 0;
            // Special speaker name for Schema Monk
            game.dialog.speaker = npc.type === 'schema-monk' ? 'SCHEMA MONK MAXIMOS' : 
                                 npc.type.charAt(0).toUpperCase() + npc.type.slice(1);
            game.dialog.npc = npc;
            game.state = 'dialog';
            audio.playChant();
            break;
        }
    }
}

function updateRiddleInput() {
    if (keys.up && !game.riddle.inputLock) {
        game.riddle.selectedIndex = Math.max(0, game.riddle.selectedIndex - 1);
        game.riddle.inputLock = true;
        audio.playTone(400, 0.05);
    } else if (keys.down && !game.riddle.inputLock) {
        game.riddle.selectedIndex = Math.min(game.riddle.options.length - 1, game.riddle.selectedIndex + 1);
        game.riddle.inputLock = true;
        audio.playTone(350, 0.05);
    }
    
    if (!keys.up && !keys.down) {
        game.riddle.inputLock = false;
    }
}

function updateAscension() {
    game.ascension.frame++;
    
    // Phase 1: Light tunnel appears (0-120 frames)
    if (game.ascension.frame < 120) {
        game.ascension.tunnelBrightness = Math.min(1, game.ascension.frame / 120);
    }
    
    // Phase 2: Player starts rising (after 60 frames)
    if (game.ascension.frame > 60 && !game.ascension.walkingToLight) {
        game.ascension.walkingToLight = true;
    }
    
    // Phase 3: Player rises up into the light (gentle float upward)
    if (game.ascension.walkingToLight && game.ascension.frame < 280) {
        // Rise upward with gentle acceleration (delta-time adjusted)
        const riseSpeed = (1 + (game.ascension.frame - 60) * 0.02) * deltaMultiplier;
        game.player.y -= riseSpeed;
        // Slight horizontal drift toward the light center
        game.player.x += 0.5 * deltaMultiplier;
    }
    
    // Phase 4: Player fades out as they rise (200-320 frames)
    if (game.ascension.frame > 200 && game.ascension.frame < 320) {
        game.ascension.playerAlpha = Math.max(0, 1 - (game.ascension.frame - 200) / 120);
    }
    
    // Phase 5: Complete ascension, show final screen (after 340 frames)
    if (game.ascension.frame > 340) {
        game.state = 'gameover';
    }
}

function checkCheckpoints() {
    const p = game.player;
    const checkpoints = game.checkpoints;
    
    // Check if player passed any checkpoint
    for (let i = game.lastCheckpoint + 1; i < checkpoints.length; i++) {
        const checkpoint = checkpoints[i];
        // Player passes checkpoint when they reach it (with small tolerance)
        if (p.x >= checkpoint.x - 30 && p.x <= checkpoint.x + 50) {
            game.lastCheckpoint = i;
            console.log('Checkpoint reached! Index:', i, 'Position:', checkpoint.x, checkpoint.y);
            audio.playTone(523, 0.1);
            setTimeout(() => audio.playTone(659, 0.1), 100);
            setTimeout(() => audio.playTone(784, 0.15), 200);
        }
    }
}

function respawnAtCheckpoint() {
    const checkpoints = game.checkpoints;
    const checkpointIndex = game.lastCheckpoint;
    
    console.log('Respawning at checkpoint', checkpointIndex, 'of', checkpoints.length);
    
    if (checkpoints.length > 0 && checkpointIndex >= 0 && checkpointIndex < checkpoints.length) {
        const checkpoint = checkpoints[checkpointIndex];
        game.player.x = checkpoint.x;
        game.player.y = checkpoint.y; // Checkpoint y is already the correct player position
        console.log('Respawned to position:', checkpoint.x, checkpoint.y);
    } else {
        // Fallback to start position
        const level = LEVELS[game.currentLevel];
        game.player.x = level.startX;
        game.player.y = 400;
        console.log('Respawned to start position:', level.startX, 400);
    }
    
    game.player.vx = 0;
    game.player.vy = 0;
    game.player.stealthActive = false;
    game.player.hasDoubleJumped = false;
}

// ============================================
// RENDER FUNCTIONS
// ============================================
function render() {
    const level = LEVELS[game.currentLevel];
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw based on game state
    switch(game.state) {
        case 'title':
            SpriteRenderer.drawTitleScreen(game.frame);
            break;
            
        case 'transition':
            game.transitionFrame++;
            const ready = SpriteRenderer.drawLevelTransition(
                LEVELS[game.currentLevel].name,
                game.transitionFrame
            );
            if (ready) {
                game.state = 'playing';
            }
            break;
            
        case 'playing':
        case 'dialog':
        case 'riddle':
        case 'paused':
            renderGameWorld();
            
            if (game.state === 'dialog') {
                SpriteRenderer.drawDialogBox(
                    game.dialog.lines[game.dialog.currentLine],
                    game.dialog.speaker
                );
            }
            
            if (game.state === 'riddle') {
                const npc = game.riddle.npc;
                const isBoss = npc && npc.isBoss;
                const currentQ = npc && npc.currentRiddle !== undefined ? npc.currentRiddle : 0;
                const totalQ = npc && npc.riddles ? npc.riddles.length : 1;
                
                SpriteRenderer.drawRiddleBox(
                    game.riddle.question,
                    game.riddle.options,
                    game.riddle.selectedIndex,
                    isBoss,
                    currentQ,
                    totalQ
                );
            }
            
            if (game.state === 'paused') {
                SpriteRenderer.drawPauseScreen();
            }
            break;
            
        case 'ascension':
            renderGameWorld();
            SpriteRenderer.drawAscension(
                game.ascension.tunnelBrightness,
                game.ascension.playerAlpha,
                game.ascension.frame
            );
            break;
            
        case 'gameover':
            renderGameWorld();
            SpriteRenderer.drawGameOver(game.won);
            break;
    }
}

function renderGameWorld() {
    const level = LEVELS[game.currentLevel];
    
    ctx.save();
    ctx.translate(-game.camera.x, 0);
    
    // Background
    SpriteRenderer.drawBackground(game.camera.x, level);
    
    // Water (behind everything)
    if (level.waterLevel) {
        SpriteRenderer.drawWater(level.waterLevel, game.camera.x, game.frame);
    }
    
    // Decorations (trees)
    for (const dec of level.decorations || []) {
        SpriteRenderer.drawTree(dec.x, dec.y, dec.type);
    }
    
    // Monastery
    if (level.monastery) {
        SpriteRenderer.drawMonastery(level.monastery.x, level.monastery.y, level.monastery.scale);
    }
    
    // Platforms
    for (const plat of game.platforms) {
        SpriteRenderer.drawPlatform(plat.x, plat.y, plat.width, plat.type);
    }
    
    // Checkpoints
    for (let i = 0; i < game.checkpoints.length; i++) {
        const checkpoint = game.checkpoints[i];
        const isActive = i <= game.lastCheckpoint;
        SpriteRenderer.drawCheckpoint(checkpoint.x, checkpoint.y, isActive, game.frame);
    }
    
    // Silence zones
    for (const zone of game.silenceZones) {
        const playerInZone = game.player.x > zone.x && game.player.x < zone.x + zone.width &&
                            game.player.y > zone.y && game.player.y < zone.y + zone.height;
        SpriteRenderer.drawSilenceZone(zone.x, zone.y, zone.width, zone.height, playerInZone);
    }
    
    // Collectibles
    for (const item of game.collectibles) {
        if (!item.collected) {
            SpriteRenderer.drawCollectible(item.x, item.y, item.type, game.frame);
        }
    }
    
    // Secret Portal (if exists in level)
    if (level.portal) {
        SpriteRenderer.drawPortal(level.portal.x, level.portal.y, game.frame);
        
        // Interaction prompt
        const dx = game.player.x - level.portal.x;
        const dy = game.player.y - level.portal.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 40) {
            ctx.fillStyle = 'rgba(138, 43, 226, 0.8)';
            ctx.fillRect(level.portal.x - 12, level.portal.y - 30, 56, 16);
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('↓ SECRET', level.portal.x + 16, level.portal.y - 19);
        }
    }
    
    // Guards
    for (const guard of game.guards) {
        SpriteRenderer.drawGuard(guard.x, guard.y, guard.alert, guard.direction, game.frame);
    }
    
    // NPCs
    for (const npc of game.npcs) {
        SpriteRenderer.drawMonk(npc.x, npc.y, npc.type, game.frame);
        
        // Interaction prompt
        const dx = game.player.x - npc.x;
        const dy = game.player.y - npc.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const interactionRange = npc.isBoss ? 120 : 60;
        const promptY = npc.isBoss ? npc.y - 80 : npc.y - 20;
        
        if (distance < interactionRange && !npc.interacted) {
            if (npc.isBoss) {
                // Boss battle prompt
                ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.fillRect(npc.x - 20, promptY - 10, 88, 20);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px "Courier New"';
                ctx.textAlign = 'center';
                ctx.fillText('[↓] BATTLE!', npc.x + 24, promptY + 5);
                ctx.textAlign = 'left';
            } else {
                ctx.fillStyle = COLORS.gold;
                ctx.font = '12px "Courier New"';
                ctx.textAlign = 'center';
                ctx.fillText('[↓] Speak', npc.x + 16, npc.y - 20);
                ctx.textAlign = 'left';
            }
        }
    }
    
    // Player
    const p = game.player;
    
    // Stealth effect
    if (p.stealthActive) {
        ctx.globalAlpha = 0.5;
        // Incense smoke around player
        ctx.fillStyle = COLORS.incense;
        for (let i = 0; i < 5; i++) {
            const sx = p.x + 12 + Math.sin(game.frame * 0.1 + i) * 15;
            const sy = p.y + Math.cos(game.frame * 0.15 + i) * 10;
            ctx.beginPath();
            ctx.arc(sx, sy, 5 + i, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Ascension fade effect with heavenly glow and Seraphim wings
    if (game.state === 'ascension') {
        // Draw 6 Seraphim Wings (appear after frame 80)
        if (game.ascension.frame > 80) {
            const wingGrowth = Math.min(1, (game.ascension.frame - 80) / 40);
            const wingFlap = Math.sin(game.frame * 0.15) * 5;
            const wingAlpha = game.ascension.playerAlpha * 0.9;
            const centerX = p.x + 12;
            const centerY = p.y + 16;
            
            ctx.globalAlpha = wingAlpha;
            
            // Wing colors - golden white gradient
            const wingGradient1 = ctx.createLinearGradient(centerX - 30, centerY, centerX + 30, centerY);
            wingGradient1.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            wingGradient1.addColorStop(0.5, 'rgba(255, 250, 205, 0.8)');
            wingGradient1.addColorStop(1, 'rgba(255, 215, 0, 0.7)');
            
            // Upper Wings (2) - covering the face/head
            for (let i = 0; i < 2; i++) {
                const side = i === 0 ? -1 : 1;
                const wingAngle = side * (30 + wingFlap);
                
                ctx.save();
                ctx.translate(centerX, centerY - 10);
                ctx.rotate((wingAngle * Math.PI) / 180);
                
                ctx.fillStyle = wingGradient1;
                ctx.beginPath();
                ctx.ellipse(side * 15 * wingGrowth, -10, 25 * wingGrowth, 15 * wingGrowth, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Wing outline/feathers
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                ctx.restore();
            }
            
            // Middle Wings (2) - covering the body
            for (let i = 0; i < 2; i++) {
                const side = i === 0 ? -1 : 1;
                const wingAngle = side * (20 - wingFlap * 0.5);
                
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate((wingAngle * Math.PI) / 180);
                
                ctx.fillStyle = wingGradient1;
                ctx.beginPath();
                ctx.ellipse(side * 18 * wingGrowth, 5, 28 * wingGrowth, 18 * wingGrowth, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                ctx.restore();
            }
            
            // Lower Wings (2) - for flying
            for (let i = 0; i < 2; i++) {
                const side = i === 0 ? -1 : 1;
                const wingAngle = side * (45 + wingFlap * 1.5);
                
                ctx.save();
                ctx.translate(centerX, centerY + 10);
                ctx.rotate((wingAngle * Math.PI) / 180);
                
                ctx.fillStyle = wingGradient1;
                ctx.beginPath();
                ctx.ellipse(side * 20 * wingGrowth, 10, 35 * wingGrowth, 20 * wingGrowth, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                ctx.restore();
            }
            
            ctx.globalAlpha = 1;
        }
        
        // Draw glowing aura around player
        const glowSize = 40 + Math.sin(game.frame * 0.1) * 10;
        const glowAlpha = game.ascension.playerAlpha * 0.4;
        
        // Outer glow
        ctx.fillStyle = `rgba(255, 215, 0, ${glowAlpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(p.x + 12, p.y + 16, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Middle glow
        ctx.fillStyle = `rgba(255, 255, 255, ${glowAlpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(p.x + 12, p.y + 16, glowSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Set player opacity
        ctx.globalAlpha = game.ascension.playerAlpha;
    }
    
    SpriteRenderer.drawPilgrim(
        p.x, p.y, p.direction, p.walkFrame,
        !p.isGrounded, game.blessings.sandals, game.blessings.beads
    );
    
    ctx.globalAlpha = 1;
    
    ctx.restore();
    
    // HUD (fixed position)
    SpriteRenderer.drawHUD(game.player, game.blessings, level, game.frame);
}

// ============================================
// MAIN GAME LOOP
// ============================================
let lastFrameTime = 0;
let frameCount = 0;
let fpsStartTime = performance.now();
let loopCallsThisFrame = 0;
let lastCheckTime = 0;
let deltaMultiplier = 1;

function gameLoop(currentTime) {
    // Detect multiple loops running
    if (currentTime - lastCheckTime < 5) {
        loopCallsThisFrame++;
        if (loopCallsThisFrame > 1) {
            console.error(`MULTIPLE GAME LOOPS DETECTED! Called ${loopCallsThisFrame} times this frame!`);
            return; // Exit this loop
        }
    } else {
        loopCallsThisFrame = 1;
        lastCheckTime = currentTime;
    }
    
    // Calculate delta time
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;
    
    // Calculate delta multiplier to maintain consistent speed at any FPS
    // Target is 60 FPS (16.67ms per frame)
    deltaMultiplier = deltaTime / (1000 / TARGET_FPS);
    
    // FPS monitoring (log every 60 frames)
    frameCount++;
    if (frameCount === 60) {
        const elapsed = currentTime - fpsStartTime;
        const fps = Math.round((60 / elapsed) * 1000);
        console.log(`FPS: ${fps}, Delta: ${deltaTime.toFixed(2)}ms, Multiplier: ${deltaMultiplier.toFixed(2)}x`);
        frameCount = 0;
        fpsStartTime = currentTime;
    }
    
    game.frame++;
    
    // Update
    switch(game.state) {
        case 'playing':
            updatePlayer();
            updateCamera();
            updateGuards();
            updateCollectibles();
            checkPortalInteraction();
            checkNPCInteraction();
            break;
            
        case 'riddle':
            updateRiddleInput();
            break;
            
        case 'ascension':
            updateAscension();
            break;
    }
    
    // Render
    render();
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();

console.log('🏔️ Pilgrim of Atos - A 16-bit journey to the Holy Mountain');
console.log('Press SPACE to begin your pilgrimage!');
}

// Export cleanup function
export function cleanupGame() {
    console.log('Cleaning up game...');
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        console.log('Cancelled animation frame:', animationFrameId);
        animationFrameId = null;
    }
    gameInitialized = false;
    frameCount = 0;
    loopCallsThisFrame = 0;
    console.log('Game cleaned up successfully');
}
