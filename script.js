// Fichier script.js

document.addEventListener('DOMContentLoaded', () => {

    // --- VARIABLES GLOBALES ET RÉFÉRENCES AU DOM ---
    // On récupère les éléments ici, une fois qu'on est sûr qu'ils existent.
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error("ERREUR CRITIQUE : L'élément <canvas id='game-canvas'> est introuvable !");
        return; // Arrête l'exécution du script si le canvas n'existe pas.
    }
    const ctx = canvas.getContext('2d');

    const gameContainer = document.getElementById('game-container');
    const uiContainer = document.getElementById('ui-container');
    const mainMenu = document.getElementById('main-menu');
    const pauseModal = document.getElementById('pause-modal');
    const victoryModal = document.getElementById('victory-modal');
    const backgroundMusic = document.getElementById('background-music');
    
    // Références qui seront assignées plus tard
    let mainMenuGoldUI, toggleMusicButton, toggleSfxButton, soundControlsUI, optionsModal, musicVolumeSlider, sfxVolumeSlider, optionsBackButton, permanentUpgradesMenu, upgradesGrid, upgradesBackButton, upgradesMenuGoldUI, resetUpgradesButton, resetConfirmationModal, statsMenu, statsBackButton, characterStatsGrid, globalStatsGrid, menuBackgroundCanvas, menuBgCtx, levelUI, timerUI, killCountUI, healthBarUI, xpBarUI, healthTextUI, xpTextUI, goldUI, levelUpModal, upgradeOptionsContainer, gameOverModal, finalScoreUI, pauseLevelUI, pauseTimerUI, pauseKillCountUI, pauseUpgradesList, weaponIconsUI, passiveIconsUI, tooltip;

    // --- CONFIGURATION DU JEU ---
    let menuEntities = [];
    let menuAnimationId = null;
    let isMusicOn = true;
    let musicVolume = 1;
    let areSoundEffectsOn = true;
    let sfxVolume = 1;
    let returnToMenuAfterOptions = '';

    const MAX_ENEMIES = 150;
    const CULLING_BUFFER = 200;

    let persistentStats = { totalKills: 0, totalXpGained: 0, totalGoldGained: 0, totalLevelsGained: 0, totalPlaytime: 0, totalMagnetsCollected: 0 };
    let permanentUpgrades = {
        maxHealth: { level: 0, initialCost: 50, maxLevel: 10 },
        speed: { level: 0, initialCost: 50, maxLevel: 10 },
        damage: { level: 0, initialCost: 50, maxLevel: 10 },
        regeneration: { level: 0, initialCost: 50, maxLevel: 10 },
        areaOfEffect: { level: 0, initialCost: 50, maxLevel: 10 },
        pickupRange: { level: 0, initialCost: 50, maxLevel: 10 },
        xpGain: { level: 0, initialCost: 50, maxLevel: 10 }
    };
    
    const permanentUpgradeDefinitions = {
        maxHealth: { emoji: '❤️', title: 'PV Max', description: (level, maxLevel) => `Niveau ${level} / ${maxLevel}` },
        speed: { emoji: '👟', title: 'Vitesse', description: (level, maxLevel) => `Niveau ${level} / ${maxLevel}` },
        damage: { emoji: '⚔️', title: 'Dégâts', description: (level, maxLevel) => `Niveau ${level} / ${maxLevel}` },
        regeneration: { emoji: '✚', title: 'Régénération', description: (level, maxLevel) => `Niveau ${level} / ${maxLevel}` },
        areaOfEffect: { emoji: '💥', title: 'Zone d\'Effet', description: (level, maxLevel) => `Niveau ${level} / ${maxLevel}` },
        pickupRange: { emoji: '🧲', title: 'Aimant', description: (level, maxLevel) => `Niveau ${level} / ${maxLevel}` },
        xpGain: { emoji: '⭐', title: 'Gain d\'XP', description: (level, maxLevel) => `Niveau ${level} / ${maxLevel}` }
    };

    // --- CHARGEMENT DES RESSOURCES ---
    const assets = {};
    const assetSources = {
        player: './images/player_spritesheet.png',
        goblin: './images/goblin_spritesheet.png',
        skeleton: './images/skeleton_spritesheet.png',
        slime: './images/slime_spritesheet.png',
        orc: './images/orc_spritesheet.png',
        xpGem: './images/xpGem_spritesheet.png',
        background: './images/background.png',
        obstacle: './images/obstacles.png',
        gold: './images/gold_spritesheet.png',
        magicMissileSound: './soundeffect/magicprojectile.mp3'
    };

    function loadAssets(callback) {
        let loadedCount = 0;
        const totalAssets = Object.keys(assetSources).length;
        if (totalAssets === 0) {
            callback();
            return;
        }
        for (const key in assetSources) {
            if (key.includes('Sound')) {
                loadedCount++;
                if (loadedCount === totalAssets) callback();
            } else {
                assets[key] = new Image();
                assets[key].src = assetSources[key];
                assets[key].onload = () => {
                    loadedCount++;
                    if (loadedCount === totalAssets) callback();
                };
                assets[key].onerror = () => {
                    console.error(`Échec du chargement de la ressource : ${key} à ${assetSources[key]}`);
                    const errorCanvas = document.createElement('canvas');
                    errorCanvas.width = 64; errorCanvas.height = 64;
                    const assetCtx = errorCanvas.getContext('2d');
                    assetCtx.fillStyle = 'magenta';
                    assetCtx.fillRect(0, 0, 64, 64);
                    assets[key].src = errorCanvas.toDataURL();
                    loadedCount++;
                    if (loadedCount === totalAssets) callback();
                };
            }
        }
    }

    // --- ÉTAT DU JEU ---
    const world = { width: 3000, height: 3000 };
    let obstacles = [], backgroundPattern;
    let gameState = { running: false, paused: true, gameTime: 0, killCount: 0, gameStarted: false };
    let keys = {};
    let debugMode = false;
    let debugGalleryMode = false;
    let camera = { x: 0, y: 0 };
    let projectiles = [], enemies = [], xpGems = [], goldCoins = [], specialPickups = [];
    let enemySpawnTimer = 0;
    let xpMergeTimer = 0;
    let player; // Sera initialisé par resetPlayerState

    // ... (Toutes vos autres fonctions de jeu (resetPlayerState, enemyDefinitions, etc.) vont ici)
    // ... (J'ai copié-collé l'intégralité de votre logique de jeu ci-dessous, sans la modifier,
    // ... car elle semblait correcte. Le problème était l'initialisation.)

    const initialPlayerState = {
        x: world.width / 2, y: world.height / 2, w: 70, h: 125, spriteW: 128, spriteH: 160, hitboxOffsetX: -5, hitboxOffsetY: 0,
        visualOffsetX: 0, visualOffsetY: -10,
        speed: 1.2, health: 120, maxHealth: 120, xp: 0, level: 1, xpToNextLevel: 8, magnetRadius: 100, gold: 0,
        regenerationRate: 0, invincible: false, invincibilityEndTime: 0, damageMultiplier: 1, aoeMultiplier: 1, xpMultiplier: 1,
        anim: { frame: 0, timer: 0, speed: 15, isMoving: false, facingRight: true },
        frameCount: 4,
        weapons: {
            magicMissile: { level: 1, cooldown: 1200, lastShot: 0, damage: 12 },
            aura: { level: 0, radius: 80, damage: 5, cooldown: 100, lastTick: 0, orbCount: 0, rotation: 0 },
            auraOfDecay: { level: 0, radius: 120, damage: 2, cooldown: 500, lastTick: 0 },
            boomerang: { level: 0, cooldown: 3000, lastShot: 0, damage: 15 }
        },
        passiveLevels: { maxHealth: 0, speed: 0, regeneration: 0 },
    };

    function resetPlayerState() {
        const currentGold = player ? player.gold : 0;
        player = JSON.parse(JSON.stringify(initialPlayerState));
        player.gold = currentGold;
        player.maxHealth += permanentUpgrades.maxHealth.level * 50;
        player.health = player.maxHealth;
        player.speed += permanentUpgrades.speed.level * 0.1;
        player.regenerationRate += permanentUpgrades.regeneration.level * 0.1;
        player.damageMultiplier = 1 + (permanentUpgrades.damage.level * 0.05);
        player.aoeMultiplier = 1 + (permanentUpgrades.areaOfEffect.level * 0.05);
        player.magnetRadius = initialPlayerState.magnetRadius * (1 + (permanentUpgrades.pickupRange.level * 0.10));
        player.xpMultiplier = 1 + (permanentUpgrades.xpGain.level * 0.10);
    }

    const enemyDefinitions={
        goblin:{type:'goblin',w:35,h:60,spriteW:128,spriteH:160, hitboxOffsetX: 45, hitboxOffsetY: 70, visualOffsetX: 0, visualOffsetY: 0, speed:0.6,health:8,damage:4,xp:2, frameCount: 10, animSpeed: 10},
        skeleton:{type:'skeleton',w:40,h:70,spriteW:64,spriteH:80, hitboxOffsetX: 12, hitboxOffsetY: 5, visualOffsetX: 0, visualOffsetY: 0, speed:1,health:20,damage:10,xp:15, frameCount: 8, animSpeed: 20},
        slime:{type:'slime',w:40,h:30,spriteW:100,spriteH:80, hitboxOffsetX: 30, hitboxOffsetY: 30, visualOffsetX: 0, visualOffsetY: 0, speed:0.4,health:30,damage:8,xp:50, frameCount: 16, animSpeed: 25},
        orc:{type:'orc',w:50,h:110,spriteW:128,spriteH:160, hitboxOffsetX: 35, hitboxOffsetY: 22, visualOffsetX: 0, visualOffsetY: 0, speed:0.8,health:50,damage:15,xp:150, frameCount: 13, animSpeed: 18},
    };
    const itemDefinitions = {
        xpGem: { frameCount: 7, animSpeed: 10, visualOffsetX: 0, visualOffsetY: 0 },
        gold: { frameCount: 6, animSpeed: 10, visualOffsetX: 0, visualOffsetY: 0 }
    };
    const projectileDefinitions = {
        magicMissile: { drawW: 32, drawH: 32, maxTrailLength: 10, trailOpacityStart: 0.8, trailOpacityEnd: 0.1 },
        boomerang: { drawW: 40, drawH: 20, rotationSpeed: 0.2 }
    };
    const availableUpgrades=[
        {id:'magicMissile', name:'Missile Magique', icon: '☄️', description:(l)=>l===0?'Lance un projectile magique.':`+ rapide, + dégâts.`, apply:()=>{const w=player.weapons.magicMissile; w.level++; w.cooldown=Math.max(500, w.cooldown * 0.95); w.damage+=5;}},
        {id:'aura',name:'Orbes de Feu', icon: '🔥', description:(l)=>l===0?'Un orbe de feu vous protège.':`+1 orbe, + dégâts.`,apply:()=>{const w=player.weapons.aura;w.level++;w.orbCount=w.level;w.damage+=3;if(w.level>1)w.radius+=10;}},
        {id:'auraOfDecay',name:'Aura Néfaste', icon: '☠️', description:(l)=>l===0?'Une aura qui blesse les ennemis proches.':`+ grande zone, + de dégâts.`,apply:()=>{const w=player.weapons.auraOfDecay;w.level++;w.damage+=2;w.radius+=20;}},
        {id:'boomerang', name:'Boomerang', icon: '🔄', description:(l)=>l===0?'Lance un boomerang qui traverse les ennemis.':`+1 boomerang, + dégâts.`,apply:()=>{const w=player.weapons.boomerang; w.level++; w.damage+=10; w.cooldown = Math.max(1000, w.cooldown * 0.9);}},
        {id:'maxHealth',name:'Coeur robuste', icon: '❤️', description:()=>`+20 Vie max, soigne complètement.`,apply:()=>{player.maxHealth+=20;player.health=player.maxHealth; player.passiveLevels.maxHealth++; }},
        {id:'speed',name:'Bottes de vitesse', icon: '👟', description:()=>`Augmente la vitesse.`,apply:()=>{player.speed+=0.5; player.passiveLevels.speed++; }},
        {id:'regeneration', name:'Régénération', icon: '✚', description:()=>`Régénère passivement la vie. (+0.5 PV/sec)`, apply:()=>{player.regenerationRate+=0.5; player.passiveLevels.regeneration++;}}
    ];

    function createBackgroundAndObstacles(){obstacles=[];obstacles.push({x:-10,y:0,w:10,h:world.height},{x:world.width,y:0,w:10,h:world.height},{x:0,y:-10,w:world.width,h:10},{x:0,y:world.height,w:world.width,h:10});const pW=120,pH=160;const pP=[{x:500,y:500},{x:2500,y:500},{x:500,y:2500},{x:2500,y:2500},{x:1500,y:1000},{x:1500,y:2000}];pP.forEach(p=>{obstacles.push({x:p.x,y:p.y,w:pW,h:pH});});}
    function resizeCanvas() { if (!gameContainer || !canvas) return; canvas.width = gameContainer.clientWidth; canvas.height = gameContainer.clientHeight; if (player) { camera.x = player.x - canvas.width / 2; camera.y = player.y - canvas.height / 2; } if (gameState.running) { draw(); } if (menuBackgroundCanvas) { menuBackgroundCanvas.width = mainMenu.clientWidth; } }
    document.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; if (e.key.toLowerCase() === 'escape') { if (gameState.running && !debugGalleryMode) { if (gameState.paused) { resumeGame(); } else { pauseGame(); } } } if (e.key.toLowerCase() === 'h') { debugMode = !debugMode; } if (e.key.toLowerCase() === 'g') { debugGalleryMode = !debugGalleryMode; uiContainer.style.display = debugGalleryMode ? 'none' : 'block'; } });
    document.addEventListener('keyup',(e)=>{keys[e.key.toLowerCase()]=false;});
    function getHitbox(entity) { return { x: entity.x + (entity.hitboxOffsetX || 0), y: entity.y + (entity.hitboxOffsetY || 0), w: entity.w, h: entity.h }; }
    function checkCollision(r1,r2){return r1.x<r2.x+r2.w&&r1.x+r1.w>r2.x&&r1.y<r2.y+r2.h&&r1.y+r1.h>r2.y;}
    function checkCollisionWithObjects(rect,list){for(const o of list)if(checkCollision(rect,o))return true;return false;}
    function updatePlayer(){if(!gameState.running||gameState.paused)return;let dx=0,dy=0;if(keys['w']||keys['z'])dy-=1;if(keys['s'])dy+=1;if(keys['a']||keys['q'])dx-=1;if(keys['d'])dx+=1;player.anim.isMoving=(dx!==0||dy!==0);if(player.anim.isMoving){if(dx!==0)player.anim.facingRight=dx>0;const m=Math.sqrt(dx*dx+dy*dy);const mx=(dx/m)*player.speed;const my=(dy/m)*player.speed;const nextPos = getHitbox(player);nextPos.x += mx;if(!checkCollisionWithObjects(nextPos,obstacles))player.x+=mx;nextPos.x-=mx;nextPos.y+=my;if(!checkCollisionWithObjects(nextPos,obstacles))player.y+=my;}player.anim.timer++;if(player.anim.timer>player.anim.speed){player.anim.timer=0;if(player.anim.isMoving)player.anim.frame=(player.anim.frame+1)%player.frameCount;else player.anim.frame=0;}}
    function spawnEnemies(){ if(gameState.paused)return; if (enemies.length >= MAX_ENEMIES) return; const initialSpawnDelay = 2000; const minSpawnDelay = 300; const spawnDelayReductionRate = 0.01; const currentSpawnDelay = Math.max(minSpawnDelay, initialSpawnDelay - gameState.gameTime * spawnDelayReductionRate); enemySpawnTimer -= 16; if(enemySpawnTimer <= 0){ enemySpawnTimer = currentSpawnDelay; const initialEnemiesPerSpawn = 1; const enemyIncreaseRate = 1 / 90000; const maxEnemiesPerSpawn = 10; const currentEnemiesToSpawn = Math.min(maxEnemiesPerSpawn, initialEnemiesPerSpawn + Math.floor(gameState.gameTime * enemyIncreaseRate)); for(let i=0;i<currentEnemiesToSpawn;i++){ let x,y,sR,ok=false; for(let a=0;a<10;a++){ const an=Math.random()*Math.PI*2; const d=Math.max(canvas.width/2,canvas.height/2)+50; x=player.x+Math.cos(an)*d; y=player.y+Math.sin(an)*d; const tK=getEnemyTypeByTime(); const t=enemyDefinitions[tK]; sR={x,y,w:t.w,h:t.h,hitboxOffsetX:t.hitboxOffsetX,hitboxOffsetY:t.hitboxOffsetY}; if(!checkCollisionWithObjects(getHitbox(sR),obstacles)&&x>0&&x<world.width&&y>0&&y<world.height){ ok=true; break; } } if(ok){ const tK=getEnemyTypeByTime(); const t=enemyDefinitions[tK]; enemies.push({x,y,...t,currentHealth:t.health,anim:{frame:0,timer:0,speed:t.animSpeed}, lastDamageTime: 0}); } } } }
    function getEnemyTypeByTime(){ const gameTimeSeconds = gameState.gameTime / 1000; let availableEnemyTypes = ['goblin']; if (gameTimeSeconds >= 5 * 60) { availableEnemyTypes.push('skeleton'); } if (gameTimeSeconds >= 10 * 60) { availableEnemyTypes.push('slime'); } if (gameTimeSeconds >= 15 * 60) { availableEnemyTypes.push('orc'); } const randomIndex = Math.floor(Math.random() * availableEnemyTypes.length); return availableEnemyTypes[randomIndex]; }
    function updateEnemies() { const now = Date.now(); const onScreenEnemies = enemies.filter(e => isEntityOnScreen(e)); onScreenEnemies.forEach(e => { const dx = player.x - e.x; const dy = player.y - e.y; const d = Math.sqrt(dx * dx + dy * dy); if (d > 1) { const mx = (dx / d) * e.speed; const my = (dy / d) * e.speed; const nextPos = getHitbox(e); nextPos.x += mx; if (!checkCollisionWithObjects(nextPos, obstacles)) e.x += mx; nextPos.x -= mx; nextPos.y += my; if (!checkCollisionWithObjects(nextPos, obstacles)) e.y += my; } if (checkCollision(getHitbox(player), getHitbox(e))) { const damageCooldown = 1000; if (now - e.lastDamageTime > damageCooldown) { takeDamage(e.damage); e.lastDamageTime = now; } } e.anim.timer++; if (e.anim.timer > e.anim.speed) { e.anim.timer = 0; e.anim.frame = (e.anim.frame + 1) % e.frameCount; } }); const resolutionIterations = 2; for (let iter = 0; iter < resolutionIterations; iter++) { for (let i = 0; i < onScreenEnemies.length; i++) { for (let j = i + 1; j < onScreenEnemies.length; j++) { const e1 = onScreenEnemies[i]; const e2 = onScreenEnemies[j]; const hitbox1 = getHitbox(e1); const hitbox2 = getHitbox(e2); if (checkCollision(hitbox1, hitbox2)) { const dx = e1.x - e2.x; const dy = e1.y - e2.y; const d = Math.sqrt(dx * dx + dy * dy); const push = 0.5; let moveX = 0; let moveY = 0; if (d > 0) { moveX = (dx / d) * push; moveY = (dy / d) * push; } else { moveX = (Math.random() - 0.5) * push; moveY = (Math.random() - 0.5) * push; } const nextPos1 = getHitbox(e1); nextPos1.x += moveX; if (!checkCollisionWithObjects(nextPos1, obstacles)) e1.x += moveX; nextPos1.x -= moveX; nextPos1.y += moveY; if (!checkCollisionWithObjects(nextPos1, obstacles)) e1.y += moveY; const nextPos2 = getHitbox(e2); nextPos2.x -= moveX; if (!checkCollisionWithObjects(nextPos2, obstacles)) e2.x -= moveX; nextPos2.x += moveX; nextPos2.y -= moveY; if (!checkCollisionWithObjects(nextPos2, obstacles)) e2.y -= moveY; } } } } }
    function killEnemy(enemy){ enemy.isDead=true; gameState.killCount++; persistentStats.totalKills++; if(Math.random()<0.8){ const gemInfo = itemDefinitions.xpGem; xpGems.push({ x:enemy.x+enemy.w/2, y:enemy.y+enemy.h/2, w: 32, h: 32, value:enemy.xp, scale: 1, anim: { frame: 0, timer: 0, speed: gemInfo.animSpeed }, frameCount: gemInfo.frameCount, visualOffsetX: gemInfo.visualOffsetX, visualOffsetY: gemInfo.visualOffsetY, expirationTime: Date.now() + 30000 }); } let dropChance = 0; switch (enemy.type) { case 'goblin': dropChance = 0.10; break; case 'skeleton': dropChance = 0.12; break; case 'slime': dropChance = 0.14; break; case 'orc': dropChance = 0.15; break; } if (Math.random() < dropChance) { const goldInfo = itemDefinitions.gold; goldCoins.push({ x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2, w: 32, h: 32, value: 1, anim: { frame: 0, timer: 0, speed: goldInfo.animSpeed }, frameCount: goldInfo.frameCount, visualOffsetX: goldInfo.visualOffsetX, visualOffsetY: goldInfo.visualOffsetY, expirationTime: Date.now() + 60000 }); } if (Math.random() < 0.005) { specialPickups.push({ x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2, w: 32, h: 32, type: 'magnet', expirationTime: Date.now() + 15000 }); } enemies=enemies.filter(en=>en!==enemy); }
    function updateXPGems() { const now = Date.now(); for (let i = xpGems.length - 1; i >= 0; i--) { const g = xpGems[i]; if (now >= g.expirationTime) { xpGems.splice(i, 1); continue; } g.anim.timer++; if (g.anim.timer > g.anim.speed) { g.anim.timer = 0; g.anim.frame = (g.anim.frame + 1) % g.frameCount; } const dx = (player.x + player.w / 2) - g.x; const dy = (player.y + player.h / 2) - g.y; const d = Math.sqrt(dx * dx + dy * dy); if (g.isPulledBySuperMagnet || d < player.magnetRadius) { const speed = g.isPulledBySuperMagnet ? 15 : 6; g.x += (dx / d) * speed; g.y += (dy / d) * speed; } if (d < player.w / 2) { collectXP(g.value); xpGems.splice(i, 1); } } xpMergeTimer++; if (xpMergeTimer > 30) { xpMergeTimer = 0; const mergeDistance = 35; let merged = new Array(xpGems.length).fill(false); for (let i = 0; i < xpGems.length; i++) { if (merged[i]) continue; for (let j = i + 1; j < xpGems.length; j++) { if (merged[j]) continue; const g1 = xpGems[i]; const g2 = xpGems[j]; const dx = g1.x - g2.x; const dy = g1.y - g2.y; const distance = Math.sqrt(dx * dx + dy * dy); if (distance < mergeDistance) { const totalValue = g1.value + g2.value; g1.x = (g1.x * g1.value + g2.x * g2.value) / totalValue; g1.y = (g1.y * g1.value + g2.y * g2.value) / totalValue; g1.value = totalValue; g1.scale = 1 + Math.log10(g1.value / 5 + 1); merged[j] = true; } } } if (merged.some(m => m)) { xpGems = xpGems.filter((_, index) => !merged[index]); } } }
    function updateGoldCoins() { const now = Date.now(); for (let i = goldCoins.length - 1; i >= 0; i--) { const coin = goldCoins[i]; if (now >= coin.expirationTime) { goldCoins.splice(i, 1); continue; } coin.anim.timer++; if (coin.anim.timer > coin.anim.speed) { coin.anim.timer = 0; coin.anim.frame = (coin.anim.frame + 1) % coin.frameCount; } const dx = (player.x + player.w / 2) - coin.x; const dy = (player.y + player.h / 2) - coin.y; const d = Math.sqrt(dx * dx + dy * dy); if (coin.isPulledBySuperMagnet || d < player.magnetRadius) { const speed = coin.isPulledBySuperMagnet ? 15 : 6; coin.x += (dx / d) * speed; coin.y += (dy / d) * speed; } if (d < player.w / 2) { player.gold += coin.value; persistentStats.totalGoldGained += coin.value; goldCoins.splice(i, 1); } } }
    function updateSpecialPickups() { const now = Date.now(); for (let i = specialPickups.length - 1; i >= 0; i--) { const pickup = specialPickups[i]; if (now >= pickup.expirationTime) { specialPickups.splice(i, 1); continue; } const playerHitbox = getHitbox(player); const pickupHitbox = { x: pickup.x - pickup.w / 2, y: pickup.y - pickup.h / 2, w: pickup.w, h: pickup.h }; if (checkCollision(playerHitbox, pickupHitbox)) { if (pickup.type === 'magnet') { activateSuperMagnet(); } specialPickups.splice(i, 1); } } }
    function activateSuperMagnet() { xpGems.forEach(gem => gem.isPulledBySuperMagnet = true); goldCoins.forEach(coin => coin.isPulledBySuperMagnet = true); persistentStats.totalMagnetsCollected++; }
    function collectXP(amount){ const realAmount = amount * player.xpMultiplier; player.xp += realAmount; persistentStats.totalXpGained += realAmount; if(player.xp>=player.xpToNextLevel){levelUp();} }
    function levelUp(){ gameState.paused=true; player.level++; persistentStats.totalLevelsGained++; player.xp-=player.xpToNextLevel; player.xpToNextLevel=Math.floor(player.xpToNextLevel*1.5); levelUpModal.style.display='flex'; populateUpgradeOptions(); }
    function populateUpgradeOptions(){ upgradeOptionsContainer.innerHTML=''; const c=[],a=[...availableUpgrades]; while(c.length<3&&a.length>0){ const r=Math.floor(Math.random()*a.length); const o=a[r]; const wL=(o.id==='magicMissile'||o.id==='aura'||o.id==='auraOfDecay'||o.id==='boomerang')?player.weapons[o.id]?.level||0:-1; const d=document.createElement('div'); d.className='upgrade-option'; d.innerHTML=`<div class="upgrade-icon">${o.icon}</div><div><strong>${o.name}</strong><br><small>${o.description(wL)}</small></div>`; d.onclick=()=>selectUpgrade(o); upgradeOptionsContainer.appendChild(d);c.push(o); a.splice(r,1); } }
    function selectUpgrade(upgrade){ upgrade.apply(); levelUpModal.style.display='none'; gameState.paused=false; updateStatusIcons(); }
    function takeDamage(amount){ const now = Date.now(); if (player.invincible && now < player.invincibilityEndTime) { return; } player.health-=amount; player.invincible = true; player.invincibilityEndTime = now + 1000; gameContainer.classList.add('damage-overlay'); setTimeout(() => { gameContainer.classList.remove('damage-overlay'); }, 200); if(player.health<=0){ player.health=0; gameOver(); } }
    function updatePlayerInvincibility() { const now = Date.now(); if (player.invincible && now >= player.invincibilityEndTime) { player.invincible = false; } }
    async function gameOver(){ gameState.running=false; finalScoreUI.textContent=`Survécu ${Math.floor(gameState.gameTime/1000)}s, ${gameState.killCount} kills.`; gameOverModal.style.display='flex'; saveGameData(); if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; } backgroundMusic.pause(); backgroundMusic.currentTime = 0; }
    async function gameVictory() { gameState.running = false; victoryModal.style.display = 'flex'; saveGameData(); if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; } backgroundMusic.pause(); backgroundMusic.currentTime = 0; }
    function isEntityOnScreen(entity) { const entityScreenX = entity.x - camera.x; const entityScreenY = entity.y - camera.y; const width = entity.spriteW || entity.w; const height = entity.spriteH || entity.h; return entityScreenX + width > -CULLING_BUFFER && entityScreenX < canvas.width + CULLING_BUFFER && entityScreenY + height > -CULLING_BUFFER && entityScreenY < canvas.height + CULLING_BUFFER; }
    function findNearestEnemy(){ let nearest = null; let minDistance = Infinity; const missileRange = 500; enemies.forEach(e=>{ const distanceToPlayer = Math.hypot(player.x - e.x, player.y - e.y); if (isEntityOnScreen(e) && distanceToPlayer <= missileRange) { if(distanceToPlayer < minDistance){ minDistance = distanceToPlayer; nearest = e; } } }); return nearest; }
    function formatTime(milliseconds) { const totalSeconds = Math.floor(milliseconds / 1000); const hours = Math.floor(totalSeconds / 3600); const minutes = Math.floor((totalSeconds % 3600) / 60); const seconds = totalSeconds % 60; const pad = (num) => String(num).padStart(2, '0'); return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`; }
    let lastWeaponLevels = {}; let lastPassiveLevels = {};
    function updateStatusIcons() { const currentWeaponLevels = JSON.stringify(player.weapons); const currentPassiveLevels = JSON.stringify(player.passiveLevels); if (currentWeaponLevels === lastWeaponLevels && currentPassiveLevels === lastPassiveLevels) { return; } lastWeaponLevels = currentWeaponLevels; lastPassiveLevels = currentPassiveLevels; weaponIconsUI.innerHTML = ''; passiveIconsUI.innerHTML = ''; const tooltip = document.getElementById('tooltip'); const createIcon = (listUI, upgradeDef, level, nameOverride) => { const iconDiv = document.createElement('div'); iconDiv.className = 'status-icon'; iconDiv.innerHTML = `${upgradeDef.icon} <span class="level-badge">${level}</span>`; iconDiv.addEventListener('mouseenter', (e) => { tooltip.innerHTML = `${nameOverride || upgradeDef.name}: Niv. ${level}`; const rect = iconDiv.getBoundingClientRect(); const containerRect = gameContainer.getBoundingClientRect(); tooltip.style.left = `${rect.left - containerRect.left + rect.width + 5}px`; tooltip.style.top = `${rect.top - containerRect.top}px`; tooltip.style.display = 'block'; }); iconDiv.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; }); listUI.appendChild(iconDiv); }; for (const weaponId in player.weapons) { const weapon = player.weapons[weaponId]; if (weapon.level > 0) { const upgradeDef = availableUpgrades.find(up => up.id === weaponId); if (upgradeDef && upgradeDef.icon) { createIcon(weaponIconsUI, upgradeDef, weapon.level, upgradeDef.name); } } } for (const passiveId in player.passiveLevels) { const level = player.passiveLevels[passiveId]; if (level > 0) { const upgradeDef = availableUpgrades.find(up => up.id === passiveId); if (upgradeDef && upgradeDef.icon) { createIcon(passiveIconsUI, upgradeDef, level, upgradeDef.name); } } } }
    function updateUI(){ levelUI.textContent=`Niveau: ${player.level}`; timerUI.textContent=`Temps: ${formatTime(gameState.gameTime)}`; killCountUI.textContent=`Kills: ${gameState.killCount}`; healthBarUI.style.width=`${(player.health/player.maxHealth)*100}%`; xpBarUI.style.width=`${(player.xp/player.xpToNextLevel)*100}%`; healthTextUI.textContent = `${Math.floor(player.health)}/${player.maxHealth}`; xpTextUI.textContent = `${Math.floor(player.xp)}/${player.xpToNextLevel}`; goldUI.textContent = player.gold; }
    function updateWeapons(){ const now=Date.now(); const mm=player.weapons.magicMissile; if(mm.level>0 && now-mm.lastShot > mm.cooldown){ const target=findNearestEnemy(); if(target){ mm.lastShot=now; const dx=target.x-player.x; const dy=target.y-player.y; const angle=Math.atan2(dy,dx); if (areSoundEffectsOn) { const newMagicMissileSound = new Audio(assetSources.magicMissileSound); newMagicMissileSound.volume = sfxVolume; newMagicMissileSound.play().catch(error => { console.warn("La lecture automatique du son du missile magique a été empêchée :", error); }); } const mmDef = projectileDefinitions.magicMissile; projectiles.push({ x:player.x+player.w/2, y:player.y+player.h/2, w:mmDef.drawW * player.aoeMultiplier, h:mmDef.drawH * player.aoeMultiplier, vx:Math.cos(angle)*8, vy:Math.sin(angle)*8, damage: mm.damage * player.damageMultiplier, lifespan: Math.ceil((canvas.width / 2) / 8), angle:angle, type: 'magicMissile', trail: [], maxTrailLength: mmDef.maxTrailLength, trailOpacityStart: mmDef.trailOpacityStart, trailOpacityEnd: mmDef.trailOpacityEnd, }); } } const boomerang = player.weapons.boomerang; if (boomerang.level > 0 && now - boomerang.lastShot > boomerang.cooldown) { boomerang.lastShot = now; const speed = 6; const target = findNearestEnemy(); for (let i = 0; i < boomerang.level; i++) { let angle; if (target) { const dx = target.x - player.x; const dy = target.y - player.y; angle = Math.atan2(dy, dx); } else { angle = (player.anim.facingRight ? 0 : Math.PI); } angle += (i * (Math.PI / 16) - (Math.PI / 32)); const pDef = projectileDefinitions.boomerang; projectiles.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, startX: player.x, startY: player.y, w: pDef.drawW, h: pDef.drawH, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage: boomerang.damage * player.damageMultiplier, range: 450 * player.aoeMultiplier, isReturning: false, angle: 0, rotationSpeed: pDef.rotationSpeed, type: 'boomerang', piercedEnemies: [] }); } } const aura=player.weapons.aura;if(aura.level>0){aura.rotation+=0.04;if(now-aura.lastTick>aura.cooldown){aura.lastTick=now;const orbW=24 * player.aoeMultiplier,orbH=24 * player.aoeMultiplier;const effectiveAuraRadius = aura.radius * player.aoeMultiplier;for(let i=0;i<aura.orbCount;i++){const angle=aura.rotation+(i*(Math.PI*2)/aura.orbCount);const orbHitbox={x:player.x+player.w/2+Math.cos(angle)*effectiveAuraRadius-orbW/2,y:player.y+player.h/2+Math.sin(angle)*effectiveAuraRadius-orbH/2,w:orbW,h:orbH};enemies.forEach(enemy=>{if(checkCollision(orbHitbox,getHitbox(enemy))){enemy.currentHealth-=(aura.damage * player.damageMultiplier);if(enemy.currentHealth<=0&&!enemy.isDead){killEnemy(enemy);}}});}}} const aod=player.weapons.auraOfDecay;if(aod.level>0&&now-aod.lastTick>aod.cooldown){aod.lastTick=now;const effectiveAodRadius = aod.radius * player.aoeMultiplier;enemies.forEach(enemy=>{const dx=(enemy.x+enemy.w/2)-(player.x+player.w/2);const dy=(enemy.y+enemy.h/2)-(player.y+player.h/2);const dist=Math.sqrt(dx*dx+dy*dy);if(dist<effectiveAodRadius){enemy.currentHealth-=(aod.damage * player.damageMultiplier);if(enemy.currentHealth<=0&&!enemy.isDead){killEnemy(enemy);}}});} }
    function updateProjectiles(){ for(let pI=projectiles.length-1;pI>=0;pI--){ const p=projectiles[pI]; if (p.type === 'magicMissile') { p.trail.unshift({ x: p.x, y: p.y, angle: p.angle }); if (p.trail.length > p.maxTrailLength) { p.trail.pop(); } } else if (p.type === 'boomerang') { p.angle += p.rotationSpeed; if (!p.isReturning) { const dist = Math.hypot(p.x - p.startX, p.y - p.startY); if (dist > p.range) { p.isReturning = true; } } else { const returnSpeed = 8; const dx = (player.x + player.w / 2) - p.x; const dy = (player.y + player.h / 2) - p.y; const dist = Math.hypot(dx, dy); if (dist < 20) { projectiles.splice(pI, 1); continue; } p.vx = (dx / dist) * returnSpeed; p.vy = (dy / dist) * returnSpeed; } } p.x+=p.vx; p.y+=p.vy; p.lifespan--; if(p.lifespan<=0 && p.type !== 'boomerang'){ projectiles.splice(pI,1); continue; } for(let i=enemies.length-1;i>=0;i--){ const e=enemies[i]; if(checkCollision(p,getHitbox(e))){ if (p.type !== 'boomerang') { e.currentHealth-=p.damage; projectiles.splice(pI, 1); if(e.currentHealth<=0&&!e.isDead){ killEnemy(e); } break; } else { if (!p.piercedEnemies.includes(e)) { e.currentHealth -= p.damage; p.piercedEnemies.push(e); if (e.currentHealth <= 0 && !e.isDead) { killEnemy(e); } } } } } } }
    function drawDebugGallery() { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#444'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.font = "12px 'Press Start 2P'"; ctx.fillStyle = '#fff'; let x = 50; let y = 50; const spacing = 200; ctx.fillText("Player", x, y - 10); if (assets.player && assets.player.complete) { const sprite = assets.player; const frameWidth = sprite.naturalWidth / initialPlayerState.frameCount; const frameHeight = sprite.naturalHeight; ctx.drawImage(sprite, 0, 0, frameWidth, frameHeight, x + initialPlayerState.visualOffsetX, y + initialPlayerState.visualOffsetY, initialPlayerState.spriteW, initialPlayerState.spriteH); if (debugMode) { ctx.strokeStyle = 'rgba(255,0,0,0.8)'; ctx.lineWidth = 2; ctx.strokeRect(x + initialPlayerState.hitboxOffsetX, y + initialPlayerState.hitboxOffsetY, initialPlayerState.w, initialPlayerState.h); } } x += spacing; for(const key in enemyDefinitions) { const def = enemyDefinitions[key]; ctx.fillText(key, x, y - 10); if (assets[key] && assets[key].complete) { const sprite = assets[key]; const frameWidth = sprite.naturalWidth / def.frameCount; const frameHeight = sprite.naturalHeight; ctx.drawImage(sprite, 0, 0, frameWidth, frameHeight, x + def.visualOffsetX, y + def.visualOffsetY, def.spriteW, def.spriteH); if (debugMode) { ctx.strokeStyle = 'rgba(255,0,0,0.8)'; ctx.lineWidth = 2; ctx.strokeRect(x + def.hitboxOffsetX, y + def.hitboxOffsetY, def.w, def.h); } } x += spacing; if (x + spacing > canvas.width) { x = 50; y += spacing; } } }
    function draw(){ if (debugGalleryMode) { drawDebugGallery(); return; } camera.x = player.x - canvas.width / 2; camera.y = player.y - canvas.height / 2; ctx.clearRect(0,0,canvas.width,canvas.height); ctx.save(); ctx.translate(-camera.x,-camera.y); if(backgroundPattern) { ctx.fillStyle = backgroundPattern; ctx.fillRect(camera.x, camera.y, canvas.width, canvas.height); } obstacles.forEach(o => { if(assets.obstacle && assets.obstacle.complete) { ctx.drawImage(assets.obstacle, o.x, o.y, o.w, o.h); } else { ctx.fillStyle = '#1a1a1a'; ctx.fillRect(o.x, o.y, o.w, o.h); } if(debugMode) { ctx.strokeStyle = 'rgba(0,0,255,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(o.x, o.y, o.w, o.h); } }); xpGems.forEach(gem => { if(isEntityOnScreen(gem) && assets.xpGem && assets.xpGem.complete && assets.xpGem.naturalHeight !== 0) { const sprite = assets.xpGem; const frameWidth = sprite.naturalWidth / gem.frameCount; const frameHeight = sprite.naturalHeight; const sourceX = gem.anim.frame * frameWidth; const drawScale = gem.scale || 1; const drawWidth = gem.w * drawScale; const drawHeight = gem.h * drawScale; ctx.drawImage(sprite, sourceX, 0, frameWidth, frameHeight, gem.x - drawWidth / 2 + (gem.visualOffsetX || 0), gem.y - drawHeight / 2 + (gem.visualOffsetY || 0), drawWidth, drawHeight); } }); goldCoins.forEach(coin => { if(isEntityOnScreen(coin) && assets.gold && assets.gold.complete && assets.gold.naturalHeight !== 0) { const sprite = assets.gold; const frameWidth = sprite.naturalWidth / coin.frameCount; const frameHeight = sprite.naturalHeight; const sourceX = coin.anim.frame * frameWidth; ctx.drawImage(sprite, sourceX, 0, frameWidth, frameHeight, coin.x - 16 + coin.visualOffsetX, coin.y - 16 + coin.visualOffsetY, 32, 32); } }); specialPickups.forEach(pickup => { if (isEntityOnScreen(pickup)) { if (pickup.type === 'magnet') { ctx.font = '28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const pulse = Math.sin(Date.now() / 150) * 4; ctx.shadowColor = "cyan"; ctx.shadowBlur = 15 + pulse; ctx.fillText('🧲', pickup.x, pickup.y); ctx.shadowBlur = 0; } } }); enemies.forEach(e => { if(isEntityOnScreen(e)) { if(assets[e.type]) { const sprite = assets[e.type]; if (sprite.complete && sprite.naturalHeight !== 0) { const frameWidth = sprite.naturalWidth / e.frameCount; const frameHeight = sprite.naturalHeight; const sourceX = e.anim.frame * frameWidth; ctx.drawImage(sprite, sourceX, 0, frameWidth, frameHeight, e.x + e.visualOffsetX, e.y + e.visualOffsetY, e.spriteW, e.spriteH); if(debugMode) { ctx.strokeStyle = 'rgba(255,0,0,0.5)'; ctx.lineWidth = 2; const hitbox = getHitbox(e); ctx.strokeRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h); } } } if(e.currentHealth < e.health){ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(e.x+e.hitboxOffsetX,e.y+e.hitboxOffsetY-8,e.w,4);ctx.fillStyle='#c0392b';ctx.fillRect(e.x+e.hitboxOffsetX,e.y+e.hitboxOffsetY-8,e.w*(e.currentHealth/e.health),4);} } }); ctx.save(); const spriteDrawX = player.x + (player.w / 2) - (player.spriteW / 2) + player.visualOffsetX; const spriteDrawY = player.y + (player.h / 2) - (player.spriteH / 2) + player.visualOffsetY; const flipAxisX = spriteDrawX + player.spriteW / 2; ctx.translate(flipAxisX, 0); if (!player.anim.facingRight) { ctx.scale(-1, 1); } ctx.translate(-flipAxisX, 0); if(assets.player && assets.player.complete && assets.player.naturalHeight !== 0) { const sprite = assets.player; const frameWidth = sprite.naturalWidth / player.frameCount; const frameHeight = sprite.naturalHeight; const sourceX = player.anim.frame * frameWidth; if (player.invincible && Date.now() % 200 < 100) { ctx.globalAlpha = 0.5; } ctx.drawImage(sprite, sourceX, 0, frameWidth, frameHeight, spriteDrawX, spriteDrawY, player.spriteW, player.spriteH); ctx.globalAlpha = 1.0; } ctx.restore(); if(debugMode) { ctx.strokeStyle = 'rgba(255,0,0,0.5)'; ctx.lineWidth = 2; const hitbox = getHitbox(player); ctx.strokeRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h); } const aod=player.weapons.auraOfDecay; if(aod.level>0){ ctx.beginPath(); const effectiveAodRadius = aod.radius * player.aoeMultiplier; const pulse=effectiveAodRadius+(Math.sin(Date.now()/200)*5); const centerX = player.x + player.w / 2; const centerY = player.y + player.h / 2; const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulse); gradient.addColorStop(0, 'rgba(80, 0, 80, 0.6)'); gradient.addColorStop(1,'rgba(0, 0, 0, 0.0)'); ctx.fillStyle = gradient; ctx.arc(centerX, centerY, pulse, 0, Math.PI * 2); ctx.fill(); } projectiles.forEach(p=>{ if (isEntityOnScreen(p)) { if (p.type === 'magicMissile') { p.trail.forEach((trailPoint, index) => { ctx.save(); const alpha = p.trailOpacityStart - (index / (p.maxTrailLength - 1)) * (p.trailOpacityStart - p.trailOpacityEnd); ctx.globalAlpha = Math.max(0, alpha); ctx.translate(trailPoint.x, trailPoint.y); ctx.rotate(trailPoint.angle); ctx.fillStyle = '#00FFFF'; ctx.beginPath(); ctx.moveTo(p.w / 2, 0); ctx.lineTo(-p.w / 2, -p.h / 2); ctx.lineTo(-p.w / 2, p.h / 2); ctx.closePath(); ctx.fill(); ctx.restore(); }); ctx.globalAlpha = 1.0; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle); ctx.fillStyle = '#00FFFF'; ctx.beginPath(); ctx.moveTo(p.w / 2, 0); ctx.lineTo(-p.w / 2, -p.h / 2); ctx.lineTo(-p.w / 2, p.h / 2); ctx.closePath(); ctx.fill(); ctx.restore(); } else if (p.type === 'boomerang') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle); ctx.fillStyle = '#A0522D'; ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-p.w / 2, -p.h / 2); ctx.lineTo(-p.w / 2 + 10, -p.h / 2 + 5); ctx.lineTo(0, 10); ctx.lineTo(p.w / 2 - 10, -p.h / 2 + 5); ctx.lineTo(p.w / 2, -p.h / 2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); } if(debugMode) { ctx.strokeStyle = 'rgba(255,255,0,0.8)'; ctx.lineWidth = 2; ctx.strokeRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h); } } }); const aura=player.weapons.aura;if(aura.level>0){const orbW=24 * player.aoeMultiplier,orbH=24 * player.aoeMultiplier;const effectiveAuraRadius = aura.radius * player.aoeMultiplier;for(let i=0;i<aura.orbCount;i++){const angle=aura.rotation+(i*(Math.PI*2)/aura.orbCount);const orbX=player.x+player.w/2+Math.cos(angle)*effectiveAuraRadius-orbW/2;const orbY=player.y+player.h/2+Math.sin(angle)*effectiveAuraRadius-orbH/2;const gradient=ctx.createRadialGradient(orbX+orbW/2,orbY+orbH/2,1,orbX+orbW/2,orbY+orbH/2,orbW/2);gradient.addColorStop(0,'#f1c40f');gradient.addColorStop(1,'rgba(230,126,34,0)');ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(orbX+orbW/2,orbY+orbH/2,orbW/2,0,Math.PI*2);ctx.fill();}} ctx.restore(); }
    let lastTime = 0; let animationFrameId = null;
    function updatePlayerRegeneration(deltaTime) { if (player.regenerationRate > 0) { const safeDeltaTime = Math.max(0, deltaTime); const healthToRegen = (player.regenerationRate * safeDeltaTime) / 1000; player.health = Math.min(player.maxHealth, player.health + healthToRegen); } }
    function gameLoop(timestamp){ if (!gameState.running) { if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; } return; } const deltaTime=timestamp-lastTime; lastTime=timestamp; if(!gameState.paused && !debugGalleryMode){ persistentStats.totalPlaytime += deltaTime; updatePlayer(); spawnEnemies(); updateEnemies(); updateWeapons(); updateProjectiles(); updateXPGems(); updateGoldCoins(); updateSpecialPickups(); updatePlayerRegeneration(deltaTime); updatePlayerInvincibility(); gameState.gameTime+=deltaTime; const thirtyMinutesInMs = 30 * 60 * 1000; if (gameState.gameTime >= thirtyMinutesInMs) { gameVictory(); return; } } draw(); updateUI(); animationFrameId = requestAnimationFrame(gameLoop); }
    function startGame() { mainMenu.style.display = 'none'; canvas.style.display = 'block'; uiContainer.style.display = 'block'; soundControlsUI.style.display = 'none'; if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; } if (menuAnimationId) { cancelAnimationFrame(menuAnimationId); menuAnimationId = null; } resetPlayerState(); loadGameData(); gameState.gameStarted = true; gameState.running = true; gameState.paused = false; lastTime = performance.now(); if (isMusicOn) { backgroundMusic.play().catch(error => { console.warn("La lecture automatique a été empêchée. L'utilisateur doit d'abord interagir avec le document.", error); }); toggleMusicButton.textContent = "Musique: ON"; } updateStatusIcons(); animationFrameId = requestAnimationFrame(gameLoop); }
    function pauseGame() { gameState.paused = true; pauseModal.style.display = 'flex'; populatePauseStats(); soundControlsUI.style.display = 'none'; }
    function resumeGame() { gameState.paused = false; pauseModal.style.display = 'none'; lastTime = performance.now(); }
    function quitGame() { saveGameData(); canvas.style.display = 'none'; uiContainer.style.display = 'none'; weaponIconsUI.innerHTML = ''; passiveIconsUI.innerHTML = ''; enemies = []; projectiles = []; xpGems = []; goldCoins = []; specialPickups = []; enemySpawnTimer = 0; gameState.running = false; gameState.paused = true; gameState.gameTime = 0; gameState.killCount = 0; gameState.gameStarted = false; pauseModal.style.display = 'none'; mainMenu.style.display = 'flex'; mainMenuGoldUI.style.display = 'block'; soundControlsUI.style.display = 'flex'; loadGameData(); updateMainMenuGoldDisplay(); if (!menuAnimationId) { menuAnimationLoop(); } }
    function populatePauseStats() { pauseLevelUI.textContent = `Niveau: ${player.level}`; pauseTimerUI.textContent = `Temps écoulé: ${formatTime(gameState.gameTime)}`; pauseKillCountUI.textContent = `Kills: ${gameState.killCount}`; pauseUpgradesList.innerHTML = ''; const currentUpgrades = {}; for (const weaponId in player.weapons) { if (player.weapons[weaponId].level > 0) { currentUpgrades[weaponId] = player.weapons[weaponId].level; } } const baseHealthWithUpgrades = initialPlayerState.maxHealth + (permanentUpgrades.maxHealth.level * 50); const baseSpeedWithUpgrades = initialPlayerState.speed + (permanentUpgrades.speed.level * 0.1); const baseRegenWithUpgrades = initialPlayerState.regenerationRate + (permanentUpgrades.regeneration.level * 0.1); if (player.maxHealth > baseHealthWithUpgrades) { currentUpgrades.maxHealth = (player.maxHealth - baseHealthWithUpgrades) / 20; } if (player.speed > baseSpeedWithUpgrades) { currentUpgrades.speed = Math.round((player.speed - baseSpeedWithUpgrades) / 0.5); } if (player.regenerationRate > baseRegenWithUpgrades) { currentUpgrades.regeneration = player.regenerationRate - baseRegenWithUpgrades; } const upgradeDisplayNames = { magicMissile: "Missile Magique", aura: "Orbes de Feu", auraOfDecay: "Aura Néfaste", maxHealth: "Coeur robuste", speed: "Bottes de vitesse", regeneration: "Régénération", boomerang: "Boomerang" }; for (const upgradeId in currentUpgrades) { const li = document.createElement('li'); const level = currentUpgrades[upgradeId]; const displayName = upgradeDisplayNames[upgradeId] || upgradeId; const upgradeDef = availableUpgrades.find(up => up.id === upgradeId); const icon = upgradeDef ? `<span class="pause-upgrade-icon">${upgradeDef.icon}</span>` : ''; if (upgradeId === 'regeneration') { li.innerHTML = `${icon} ${displayName}: +${level.toFixed(1)} PV/sec`; } else if (upgradeId === 'maxHealth') { li.innerHTML = `${icon} ${displayName}: +${level * 20} Vie Max`; } else if (upgradeId === 'speed') { li.innerHTML = `${icon} ${displayName}: Niveau ${level}`; } else { li.innerHTML = `${icon} ${displayName}: Niveau ${level}`; } pauseUpgradesList.appendChild(li); } }
    function loadGameData() { try { const storedUpgrades = localStorage.getItem('permanentUpgrades'); if (storedUpgrades) { const savedUpgrades = JSON.parse(storedUpgrades); for (const key in permanentUpgrades) { if (savedUpgrades[key] && savedUpgrades[key].level !== undefined) { permanentUpgrades[key].level = savedUpgrades[key].level; } } } const storedStats = localStorage.getItem('persistentStats'); if (storedStats) { persistentStats = JSON.parse(storedStats); } resetPlayerState(); const storedGold = localStorage.getItem('playerGold'); if (storedGold !== null) { player.gold = parseInt(storedGold, 10); } updateMainMenuGoldDisplay(); const savedMusicVolume = localStorage.getItem('musicVolume'); const savedSfxVolume = localStorage.getItem('sfxVolume'); const savedIsMusicOn = localStorage.getItem('isMusicOn'); const savedAreSfxOn = localStorage.getItem('areSoundEffectsOn'); if (savedMusicVolume !== null) musicVolume = parseFloat(savedMusicVolume); if (savedSfxVolume !== null) sfxVolume = parseFloat(savedSfxVolume); if (savedIsMusicOn !== null) isMusicOn = savedIsMusicOn === 'true'; if (savedAreSfxOn !== null) areSoundEffectsOn = savedAreSfxOn === 'true'; backgroundMusic.volume = isMusicOn ? musicVolume : 0; if (musicVolumeSlider) musicVolumeSlider.value = musicVolume; if (sfxVolumeSlider) sfxVolumeSlider.value = sfxVolume; if (toggleMusicButton) toggleMusicButton.textContent = `Musique: ${isMusicOn ? 'ON' : 'OFF'}`; if (toggleSfxButton) toggleSfxButton.textContent = `Effets Sonores: ${areSoundEffectsOn ? 'ON' : 'OFF'}`; if (mainMenu.style.display !== 'none') { soundControlsUI.style.display = 'flex'; } } catch (error) { console.error("Erreur lors du chargement depuis localStorage :", error); resetPlayerState(); player.gold = 0; } }
    function saveGameData() { try { localStorage.setItem('playerGold', player.gold.toString()); localStorage.setItem('permanentUpgrades', JSON.stringify(permanentUpgrades)); localStorage.setItem('persistentStats', JSON.stringify(persistentStats)); localStorage.setItem('musicVolume', musicVolume.toString()); localStorage.setItem('sfxVolume', sfxVolume.toString()); localStorage.setItem('isMusicOn', isMusicOn.toString()); localStorage.setItem('areSoundEffectsOn', areSoundEffectsOn.toString()); } catch (error) { console.error("Erreur lors de la sauvegarde dans localStorage :", error); } }
    function updateMainMenuGoldDisplay() { if (player && mainMenuGoldUI) { mainMenuGoldUI.textContent = `Or: ${player.gold}`; } if (player && upgradesMenuGoldUI) { upgradesMenuGoldUI.textContent = `Or: ${player.gold}`; } }
    function getUpgradeCost(upgrade) { if (upgrade.level >= upgrade.maxLevel) return Infinity; return Math.floor(upgrade.initialCost * Math.pow(1.2, upgrade.level)); }
    function showUpgradesMenu() { mainMenu.style.display = 'none'; if(menuAnimationId) { cancelAnimationFrame(menuAnimationId); menuAnimationId = null; } permanentUpgradesMenu.style.display = 'flex'; updateMainMenuGoldDisplay(); setupPermanentUpgrades(); }
    function hideUpgradesMenu() { mainMenu.style.display = 'flex'; permanentUpgradesMenu.style.display = 'none'; if (!menuAnimationId) { menuAnimationLoop(); } }
    function setupPermanentUpgrades() { upgradesGrid.innerHTML = ''; for (const key in permanentUpgrades) { const btn = document.createElement('button'); btn.className = 'permanent-upgrade-btn'; btn.dataset.upgradeKey = key; updateUpgradeButton(btn, key); btn.addEventListener('click', () => { buyPermanentUpgrade(key); }); upgradesGrid.appendChild(btn); } }
    function buyPermanentUpgrade(key) { const upgrade = permanentUpgrades[key]; const currentCost = getUpgradeCost(upgrade); if (player.gold >= currentCost && upgrade.level < upgrade.maxLevel) { player.gold -= currentCost; upgrade.level++; saveGameData(); updateMainMenuGoldDisplay(); const btn = upgradesGrid.querySelector(`[data-upgrade-key="${key}"]`); updateUpgradeButton(btn, key); } }
    function updateUpgradeButton(btn, key) { const upgrade = permanentUpgrades[key]; const def = permanentUpgradeDefinitions[key]; const currentCost = getUpgradeCost(upgrade); let costText = "MAX"; if (upgrade.level < upgrade.maxLevel) { costText = `Coût: ${currentCost} or`; } btn.innerHTML = ` <div> <div style="font-size: 24px;">${def.emoji}</div> <div>${def.title}</div> <div>${def.description(upgrade.level, upgrade.maxLevel)}</div> </div> <div class="upgrade-cost">${costText}</div> `; if (upgrade.level >= upgrade.maxLevel || player.gold < currentCost) { btn.disabled = true; } else { btn.disabled = false; } }
    function resetAllUpgrades() { let totalRefund = 0; for (const key in permanentUpgrades) { const upgrade = permanentUpgrades[key]; if (upgrade.level > 0) { for(let i = 0; i < upgrade.level; i++) { totalRefund += Math.floor(upgrade.initialCost * Math.pow(1.2, i)); } } upgrade.level = 0; } player.gold += totalRefund; saveGameData(); updateMainMenuGoldDisplay(); setupPermanentUpgrades(); resetConfirmationModal.style.display = 'none'; }
    function showStatsMenu() { mainMenu.style.display = 'none'; if(menuAnimationId) { cancelAnimationFrame(menuAnimationId); menuAnimationId = null; } statsMenu.style.display = 'flex'; populateStatsMenu(); }
    function hideStatsMenu() { mainMenu.style.display = 'flex'; statsMenu.style.display = 'none'; if (!menuAnimationId) { menuAnimationLoop(); } }
    function formatPlaytime(ms) { const totalSeconds = Math.floor(ms / 1000); const hours = Math.floor(totalSeconds / 3600); const minutes = Math.floor((totalSeconds % 3600) / 60); const seconds = totalSeconds % 60; const pad = (num) => String(num).padStart(2, '0'); return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`; }
    function populateStatsMenu() { characterStatsGrid.innerHTML = ''; globalStatsGrid.innerHTML = ''; const charStats = { 'PV Max': player.maxHealth, 'Vitesse': player.speed.toFixed(2), 'Régénération': `${player.regenerationRate.toFixed(2)}/s`, 'Dégâts': `+${((player.damageMultiplier - 1) * 100).toFixed(0)}%`, 'Zone d\'effet': `+${((player.aoeMultiplier - 1) * 100).toFixed(0)}%`, 'Aimant': `+${((player.magnetRadius / initialPlayerState.magnetRadius - 1) * 100).toFixed(0)}%`, 'Gain d\'XP': `+${((player.xpMultiplier - 1) * 100).toFixed(0)}%`, }; for(const [label, value] of Object.entries(charStats)) { const statEntry = document.createElement('div'); statEntry.className = 'stat-entry'; statEntry.innerHTML = `<span class="stat-label">${label}:</span> <span class="stat-value">${value}</span>`; characterStatsGrid.appendChild(statEntry); } const globalStats = { 'Ennemis tués': persistentStats.totalKills, 'Or total collecté': persistentStats.totalGoldGained, 'Niveaux gagnés': persistentStats.totalLevelsGained, 'XP totale collectée': Math.floor(persistentStats.totalXpGained), 'Aimants ramassés': persistentStats.totalMagnetsCollected, 'Temps de jeu total': formatPlaytime(persistentStats.totalPlaytime) }; for(const [label, value] of Object.entries(globalStats)) { const statEntry = document.createElement('div'); statEntry.className = 'stat-entry'; statEntry.innerHTML = `<span class="stat-label">${label}:</span> <span class="stat-value">${value}</span>`; globalStatsGrid.appendChild(statEntry); } }
    function showCustomAutoplayAlert() { const customAlert = document.createElement('div'); customAlert.style.cssText = ` position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: #2c2c2c; padding: 20px; border: 4px solid #f1c40f; border-radius: 10px; text-align: center; z-index: 9999; font-family: 'Press Start 2P', cursive; color: #fff; box-shadow: 0 0 15px rgba(0,0,0,0.5);`; customAlert.innerHTML = ` <p>Cliquez n'importe où pour activer le son.</p> <button style="background-color: #f1c40f; color: #1a1a1a; border: none; padding: 10px 20px; margin-top: 15px; border-radius: 5px; cursor: pointer; font-family: 'Press Start 2P', cursive;">OK</button>`; document.body.appendChild(customAlert); customAlert.querySelector('button').onclick = () => { document.body.removeChild(customAlert); if (isMusicOn && backgroundMusic.paused) { backgroundMusic.play().catch(err => console.warn("Échec de la lecture de la musique après l'interaction de l'utilisateur :", err)); } }; }
    function toggleMusic() { isMusicOn = !isMusicOn; if (isMusicOn) { backgroundMusic.volume = musicVolume; backgroundMusic.play().catch(error => { console.warn("La lecture automatique de la musique de fond a été empêchée.", error); showCustomAutoplayAlert(); }); } else { backgroundMusic.volume = 0; } toggleMusicButton.textContent = `Musique: ${isMusicOn ? 'ON' : 'OFF'}`; saveGameData(); }
    function toggleSoundEffects() { areSoundEffectsOn = !areSoundEffectsOn; toggleSfxButton.textContent = `Effets Sonores: ${areSoundEffectsOn ? 'ON' : 'OFF'}`; saveGameData(); }
    function showOptions(fromMenu) { returnToMenuAfterOptions = fromMenu; optionsModal.style.display = 'flex'; mainMenu.style.display = 'none'; pauseModal.style.display = 'none'; soundControlsUI.style.display = 'none'; musicVolumeSlider.value = musicVolume; sfxVolumeSlider.value = sfxVolume; }
    function showOptionsFromMain() { showOptions('main'); }
    function showOptionsFromPause() { showOptions('pause'); }
    function hideOptions() { optionsModal.style.display = 'none'; if (returnToMenuAfterOptions === 'main') { mainMenu.style.display = 'flex'; soundControlsUI.style.display = 'flex'; if (!menuAnimationId) { menuAnimationLoop(); } } else if (returnToMenuAfterOptions === 'pause') { pauseModal.style.display = 'flex'; } saveGameData(); }
    function updateMusicVolume() { musicVolume = parseFloat(musicVolumeSlider.value); backgroundMusic.volume = musicVolume; isMusicOn = musicVolume > 0; toggleMusicButton.textContent = `Musique: ${isMusicOn ? 'ON' : 'OFF'}`; saveGameData(); }
    function updateSfxVolume() { sfxVolume = parseFloat(sfxVolumeSlider.value); areSoundEffectsOn = sfxVolume > 0; toggleSfxButton.textContent = `Effets Sonores: ${areSoundEffectsOn ? 'ON' : 'OFF'}`; saveGameData(); }
    function setupMenuAnimation() { if (!menuBackgroundCanvas) return; menuBackgroundCanvas.width = mainMenu.clientWidth; menuBackgroundCanvas.height = 200; const entityTypes = ['player', 'goblin', 'skeleton', 'slime', 'orc']; menuEntities = []; entityTypes.forEach((type, index) => { const def = type === 'player' ? initialPlayerState : enemyDefinitions[type]; if (!def) return; menuEntities.push({ x: menuBackgroundCanvas.width + index * 200, y: menuBackgroundCanvas.height - 160, type: type, def: def, anim: { frame: 0, timer: 0, speed: 15 }, speed: 0.5 + Math.random() * 0.5 }); }); }
    function menuAnimationLoop() { if (mainMenu.style.display === 'none') { menuAnimationId = null; return; } menuBgCtx.clearRect(0, 0, menuBackgroundCanvas.width, menuBackgroundCanvas.height); menuEntities.forEach(entity => { entity.x -= entity.speed; entity.anim.timer++; if (entity.anim.timer > entity.anim.speed) { entity.anim.timer = 0; entity.anim.frame = (entity.anim.frame + 1) % entity.def.frameCount; } const sprite = assets[entity.type]; if (sprite && sprite.complete) { const frameWidth = sprite.naturalWidth / entity.def.frameCount; const sourceX = entity.anim.frame * frameWidth; menuBgCtx.save(); menuBgCtx.scale(-1, 1); menuBgCtx.drawImage( sprite, sourceX, 0, frameWidth, sprite.naturalHeight, -entity.x - entity.def.spriteW, entity.y, entity.def.spriteW, entity.def.spriteH ); menuBgCtx.restore(); } if (entity.x < -entity.def.spriteW) { entity.x = menuBackgroundCanvas.width + Math.random() * 200; } }); menuAnimationId = requestAnimationFrame(menuAnimationLoop); }

    function initializeGame() {
        // Assignation des références aux éléments de l'UI
        levelUI=document.getElementById('level');
        timerUI=document.getElementById('timer');
        killCountUI=document.getElementById('kill-count');
        healthBarUI=document.getElementById('health-bar');
        xpBarUI=document.getElementById('xp-bar');
        healthTextUI=document.getElementById('health-text');
        xpTextUI=document.getElementById('xp-text');
        goldUI=document.getElementById('gold-count');
        levelUpModal=document.getElementById('level-up-modal');
        upgradeOptionsContainer=document.getElementById('upgrade-options');
        gameOverModal=document.getElementById('game-over-modal');
        finalScoreUI=document.getElementById('final-score');
        mainMenuGoldUI = document.getElementById('main-menu-gold');
        pauseLevelUI = document.getElementById('pause-level');
        pauseTimerUI = document.getElementById('pause-timer');
        pauseKillCountUI = document.getElementById('pause-kill-count');
        pauseUpgradesList = document.getElementById('pause-upgrades-list');
        weaponIconsUI = document.getElementById('weapon-icons');
        passiveIconsUI = document.getElementById('passive-icons');
        tooltip = document.getElementById('tooltip');
        toggleMusicButton = document.getElementById('toggle-music-button');
        toggleSfxButton = document.getElementById('toggle-sfx-button');
        soundControlsUI = document.getElementById('sound-controls');
        optionsModal = document.getElementById('options-modal');
        musicVolumeSlider = document.getElementById('music-volume-slider');
        sfxVolumeSlider = document.getElementById('sfx-volume-slider');
        optionsBackButton = document.getElementById('optionsBackButton');
        permanentUpgradesMenu = document.getElementById('permanent-upgrades-menu');
        upgradesGrid = document.getElementById('upgrades-grid');
        upgradesBackButton = document.getElementById('upgradesBackButton');
        upgradesMenuGoldUI = document.getElementById('upgrades-menu-gold');
        resetUpgradesButton = document.getElementById('resetUpgradesButton');
        resetConfirmationModal = document.getElementById('reset-confirmation-modal');
        statsMenu = document.getElementById('stats-menu');
        statsBackButton = document.getElementById('statsBackButton');
        characterStatsGrid = document.getElementById('character-stats-grid');
        globalStatsGrid = document.getElementById('global-stats-grid');
        menuBackgroundCanvas = document.getElementById('menu-background-canvas');
        if (menuBackgroundCanvas) {
            menuBgCtx = menuBackgroundCanvas.getContext('2d');
        }
        
        // Mise en place de l'état initial
        canvas.style.display = 'none';
        uiContainer.style.display = 'none';
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        createBackgroundAndObstacles();
        
        // Chargement des ressources et démarrage du jeu
        loadAssets(() => {
            if (assets.background.complete && assets.background.naturalWidth !== 0) {
                 backgroundPattern = ctx.createPattern(assets.background, 'repeat');
            }
            loadGameData();
            if (menuBackgroundCanvas) {
                setupMenuAnimation();
                menuAnimationLoop();
            }
            draw(); 
        });

        // Animation du titre
        const title = document.querySelector('#main-menu h1');
        if (title) {
            const text = title.textContent;
            title.innerHTML = ''; 
            for (let i = 0; i < text.length; i++) {
                const span = document.createElement('span');
                span.textContent = text[i];
                span.style.setProperty('--i', i);
                if(text[i] === ' '){ span.innerHTML = '&nbsp;'; }
                title.appendChild(span);
            }
        }

        // Ajout des écouteurs d'événements aux boutons
        document.getElementById('startGameButton').addEventListener('click', startGame);
        document.getElementById('upgradesMenuButton').addEventListener('click', showUpgradesMenu);
        document.getElementById('optionsMenuButton').addEventListener('click', showOptionsFromMain);
        document.getElementById('statsMenuButton').addEventListener('click', showStatsMenu);
        upgradesBackButton.addEventListener('click', hideUpgradesMenu);
        optionsBackButton.addEventListener('click', hideOptions);
        statsBackButton.addEventListener('click', hideStatsMenu);
        resetUpgradesButton.addEventListener('click', () => { resetConfirmationModal.style.display = 'flex'; });
        document.getElementById('confirmResetButton').addEventListener('click', resetAllUpgrades);
        document.getElementById('cancelResetButton').addEventListener('click', () => { resetConfirmationModal.style.display = 'none'; });
        musicVolumeSlider.addEventListener('input', updateMusicVolume);
        sfxVolumeSlider.addEventListener('input', updateSfxVolume);
        toggleMusicButton.addEventListener('click', toggleMusic);
        toggleSfxButton.addEventListener('click', toggleSoundEffects);

        // Tentative de lecture de la musique
        if (backgroundMusic) {
            backgroundMusic.play().catch(error => {
                console.log("La lecture automatique de la musique de fond a été empêchée.");
                showCustomAutoplayAlert();
                isMusicOn = false;
                if (toggleMusicButton) toggleMusicButton.textContent = "Musique: OFF";
            });
        }

        gameContainer.addEventListener('contextmenu', (e) => { e.preventDefault(); });
    }

    // Lancement de l'initialisation
    initializeGame();
});
