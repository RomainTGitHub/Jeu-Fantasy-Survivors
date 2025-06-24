// Variables globales pour l'état du jeu et les éléments de l'interface utilisateur
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');
const uiContainer = document.getElementById('ui-container');
const mainMenu = document.getElementById('main-menu'); // Référence au menu principal
const pauseModal = document.getElementById('pause-modal'); // Référence au menu de pause
const victoryModal = document.getElementById('victory-modal'); // Référence au modal de victoire
let mainMenuGoldUI; // Référence à l'affichage de l'or dans le menu principal

// Nouveaux : Éléments audio
const backgroundMusic = document.getElementById('background-music');
let toggleMusicButton; // Sera assigné dans init
let toggleSfxButton;   // Sera assigné dans init
let soundControlsUI; // Référence au conteneur des contrôles du son

// Éléments du menu des options
let optionsModal;
let musicVolumeSlider;
let sfxVolumeSlider;
let optionsBackButton;
let returnToMenuAfterOptions = ''; // Pour savoir à quel menu retourner ('main' ou 'pause')

// Éléments du menu des améliorations permanentes
let permanentUpgradesMenu;
let upgradesGrid;
let upgradesBackButton;
let upgradesMenuGoldUI;

// Variable pour suivre l'état de la musique et le volume
let isMusicOn = true; // Suppose que la musique est activée par défaut
let musicVolume = 1; // Volume de la musique par défaut (1 = 100%)
let areSoundEffectsOn = true; // Suppose que les effets sonores sont activés par défaut
let sfxVolume = 1; // Volume des effets sonores par défaut (1 = 100%)

// --- Améliorations permanentes ---
let permanentUpgrades = {
    maxHealth: { level: 0, cost: 500, maxLevel: 10 },
    speed: { level: 0, cost: 500, maxLevel: 10 },
    damage: { level: 0, cost: 500, maxLevel: 10 },
    regeneration: { level: 0, cost: 500, maxLevel: 10 }
};

const permanentUpgradeDefinitions = {
    maxHealth: {
        emoji: '❤️',
        title: 'PV Max',
        description: (level, maxLevel) => `Niveau ${level} / ${maxLevel}`
    },
    speed: {
        emoji: '👟',
        title: 'Vitesse',
        description: (level, maxLevel) => `Niveau ${level} / ${maxLevel}`
    },
    damage: {
        emoji: '⚔️',
        title: 'Dégâts',
        description: (level, maxLevel) => `Niveau ${level} / ${maxLevel}`
    },
    regeneration: {
        emoji: '✚',
        title: 'Régénération',
        description: (level, maxLevel) => `Niveau ${level} / ${maxLevel}`
    }
};


// --- Chargement des ressources ---
const assets = {};
// Sources des images du jeu
const assetSources = {
    player: 'images/player_spritesheet.png',
    goblin: 'images/goblin_spritesheet.png',
    skeleton: 'images/skeleton_spritesheet.png',
    slime: 'images/slime_spritesheet.png',
    orc: 'images/orc_spritesheet.png',
    xpGem: 'images/xpGem_spritesheet.png',
    background: 'images/background.png',
    obstacle: 'images/obstacles.png',
    gold: 'images/gold_spritesheet.png', // Nouvelle feuille de sprites pour l'or
    magicMissileSound: 'soundeffect/magicprojectile.mp3' // Ajout du chemin du son du projectile magique
};

// Charge toutes les images définies dans assetSources
function loadAssets(callback) {
    let loadedCount = 0;
    const totalAssets = Object.keys(assetSources).length;
    for (const key in assetSources) {
        // Vérifie si la ressource est une image ou un fichier audio
        if (key.includes('Sound')) {
            // Pour l'audio, pas besoin de créer un objet Image, on incrémente juste le compteur
            loadedCount++;
            if (loadedCount === totalAssets) {
                callback();
            }
        } else {
            assets[key] = new Image();
            assets[key].src = assetSources[key];
            assets[key].onload = () => {
                loadedCount++;
                if (loadedCount === totalAssets) {
                    callback();
                }
            };
            // Gère les erreurs de chargement d'image en utilisant un carré magenta
            assets[key].onerror = () => {
                console.error(`Échec du chargement de la ressource : ${key} à ${assetSources[key]}`);
                const canvas = document.createElement('canvas');
                const w = 64, h = 64;
                canvas.width = w;
                canvas.height = h;
                const assetCtx = canvas.getContext('2d');
                assetCtx.fillStyle = 'magenta';
                assetCtx.fillRect(0, 0, w, h);
                assets[key].src = canvas.toDataURL();
                loadedCount++;
                if (loadedCount === totalAssets) {
                    callback();
                }
            };
        }
    }
}

// --- État du jeu et configuration du monde ---
// Dimensions du monde du jeu
const world = { width: 3000, height: 3000 };
let obstacles = [], backgroundPattern;
// Éléments de l'interface utilisateur
let levelUI, timerUI, killCountUI, healthBarUI, xpBarUI, healthTextUI, xpTextUI, goldUI, // Ajout de goldUI
    levelUpModal, upgradeOptionsContainer, gameOverModal, finalScoreUI,
    pauseLevelUI, pauseTimerUI, pauseKillCountUI, pauseUpgradesList; // Nouveaux éléments UI pour la pause
// État du jeu
let gameState = { running: false, paused: true, gameTime: 0, killCount: 0, gameStarted: false }; // Ajout de gameStarted
// État des touches du clavier
let keys = {};
// Modes de débogage
let debugMode = false;
let debugGalleryMode = false;
// Caméra du jeu
let camera = { x: 0, y: 0 };
// Entités du jeu
let projectiles = [], enemies = [], xpGems = [], goldCoins = []; // Nouveau tableau goldCoins
let enemySpawnTimer = 0;

// Propriétés initiales du joueur à utiliser pour la réinitialisation
const initialPlayerState = {
    x: world.width / 2, y: world.height / 2, w: 70, h: 125, spriteW: 128, spriteH: 160, hitboxOffsetX: -5, hitboxOffsetY: 0,
    visualOffsetX: 0, visualOffsetY: -10,
    speed: 1, health: 120, maxHealth: 120, xp: 0, level: 1, xpToNextLevel: 8, magnetRadius: 100, gold: 0, // L'or sera chargé depuis localStorage séparément
    regenerationRate: 0,
    invincible: false,
    invincibilityEndTime: 0,
    damageMultiplier: 1,
    anim: { frame: 0, timer: 0, speed: 15, isMoving: false, facingRight: true },
    frameCount: 4, // Ajout de frameCount à initialPlayerState
    weapons: {
        magicMissile: { level: 1, cooldown: 1200, lastShot: 0, damage: 12 },
        aura: { level: 0, radius: 80, damage: 5, cooldown: 100, lastTick: 0, orbCount: 0, rotation: 0 },
        auraOfDecay: { level: 0, radius: 120, damage: 2, cooldown: 500, lastTick: 0 }
    },
};

// Propriétés du joueur (seront modifiées pendant le jeu)
let player; // Changé de const à let

// Fonction pour réinitialiser l'état du joueur aux valeurs initiales
function resetPlayerState() {
    const currentGold = player ? player.gold : 0;
    player = JSON.parse(JSON.stringify(initialPlayerState));
    player.gold = currentGold;

    // Appliquer les améliorations permanentes
    player.maxHealth += permanentUpgrades.maxHealth.level * 50;
    player.health = player.maxHealth;
    player.speed += permanentUpgrades.speed.level * 0.1;
    player.regenerationRate += permanentUpgrades.regeneration.level * 0.1;
    player.damageMultiplier = 1 + (permanentUpgrades.damage.level * 0.05);
}

// Définitions des ennemis (ajout de visualOffsetX et visualOffsetY)
const enemyDefinitions={
    goblin:{type:'goblin',w:35,h:60,spriteW:128,spriteH:160, hitboxOffsetX: 45, hitboxOffsetY: 70, visualOffsetX: 0, visualOffsetY: 0, speed:1,health:8,damage:4,xp:2, frameCount: 10, animSpeed: 10},
    skeleton:{type:'skeleton',w:40,h:70,spriteW:64,spriteH:80, hitboxOffsetX: 12, hitboxOffsetY: 5, visualOffsetX: 0, visualOffsetY: 0, speed:1,health:20,damage:10,xp:5, frameCount: 8, animSpeed: 20},
    slime:{type:'slime',w:40,h:30,spriteW:100,spriteH:80, hitboxOffsetX: 30, hitboxOffsetY: 30, visualOffsetX: 0, visualOffsetY: 0, speed:0.8,health:30,damage:8,xp:7, frameCount: 16, animSpeed: 25},
    orc:{type:'orc',w:50,h:110,spriteW:128,spriteH:160, hitboxOffsetX: 35, hitboxOffsetY: 22, visualOffsetX: 0, visualOffsetY: 0, speed:1.2,health:50,damage:15,xp:15, frameCount: 13, animSpeed: 18},
};
// Définitions des objets (ex: gemmes d'XP, or)
const itemDefinitions = {
    xpGem: { frameCount: 7, animSpeed: 10, visualOffsetX: 0, visualOffsetY: 0 },
    gold: { frameCount: 6, animSpeed: 10, visualOffsetX: 0, visualOffsetY: 0 } // Définition de la pièce d'or
};
// Définitions des projectiles (nouveau pour les projectiles animés)
const projectileDefinitions = {
    magicMissile: {
        drawW: 32, // Largeur de dessin souhaitée sur le canevas
        drawH: 32, // Hauteur de dessin souhaitée sur le canevas
        maxTrailLength: 10, // Nombre maximum de points de traînée
        trailOpacityStart: 0.8, // Opacité pour le point de traînée le plus récent
        trailOpacityEnd: 0.1, // Opacité pour le point de traînée le plus ancien
    }
};

// Améliorations disponibles lors de la montée de niveau
const availableUpgrades=[
    {
        id:'magicMissile',
        name:'Missile Magique',
        description:(l)=>l===0?'Lance un projectile magique.':`+ rapide, + dégâts.`,
        apply:()=>{
            const w=player.weapons.magicMissile;
            w.level++;
            // Diminue le temps de recharge de 5% (augmente la cadence de tir)
            w.cooldown=Math.max(500, w.cooldown * 0.95); // Réduit le temps de recharge de 5%
            w.damage+=5;
        }
    },
    {id:'aura',name:'Orbes de Feu',description:(l)=>l===0?'Un orbe de feu vous protège.':`+1 orbe, + dégâts.`,apply:()=>{const w=player.weapons.aura;w.level++;w.orbCount=w.level;w.damage+=3;if(w.level>1)w.radius+=10;}},
    {id:'auraOfDecay',name:'Aura Néfaste',description:(l)=>l===0?'Une aura qui blesse les ennemis proches.':`+ grande zone, + de dégâts.`,apply:()=>{const w=player.weapons.auraOfDecay;w.level++;w.damage+=2;w.radius+=20;}},
    {id:'maxHealth',name:'Coeur robuste',description:()=>`+20 Vie max, soigne complètement.`,apply:()=>{player.maxHealth+=20;player.health=player.maxHealth;}},
    {id:'speed',name:'Bottes de vitesse',description:()=>`Augmente la vitesse.`,apply:()=>{player.speed+=0.5;}},
    {
        id:'regeneration',
        name:'Régénération',
        description:()=>`Régénère passivement la vie. (+0.5 PV/sec)`, // Description de l'amélioration
        apply:()=>{player.regenerationRate+=1;}
    }
];

// Crée le fond et les obstacles du monde
function createBackgroundAndObstacles(){obstacles=[];obstacles.push({x:-10,y:0,w:10,h:world.height},{x:world.width,y:0,w:10,h:world.height},{x:0,y:-10,w:world.width,h:10},{x:0,y:world.height,w:world.width,h:10});const pW=120,pH=160;const pP=[{x:500,y:500},{x:2500,y:500},{x:500,y:2500},{x:2500,y:2500},{x:1500,y:1000},{x:1500,y:2000}];pP.forEach(p=>{obstacles.push({x:p.x,y:p.y,w:pW,h:pH});});}

// Ajuste la taille du canevas en fonction du conteneur de jeu
function resizeCanvas() {
    canvas.width = gameContainer.clientWidth;
    canvas.height = gameContainer.clientHeight;
    // Recalcule éventuellement la position de la caméra ou d'autres éléments qui dépendent de la taille du canevas
    if (player) {
        camera.x = player.x - canvas.width / 2;
        camera.y = player.y - canvas.height / 2;
    }
    // Redessine immédiatement après le redimensionnement pour éviter le scintillement ou un canevas vide
    if (gameState.running) {
        draw();
    }
}

// Gère les événements d'appui et de relâchement des touches
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;

    if (e.key.toLowerCase() === 'escape') { // Gère la touche Échap pour la pause
        if (gameState.running && !debugGalleryMode) { // Ne met pas en pause si le jeu est déjà terminé ou en mode galerie de débogage
            if (gameState.paused) {
                resumeGame();
            } else {
                pauseGame();
            }
        }
    }

    if (e.key.toLowerCase() === 'h') {
        debugMode = !debugMode; // Bascule le mode de débogage
    }
    if (e.key.toLowerCase() === 'g') {
        debugGalleryMode = !debugGalleryMode; // Bascule le mode galerie de débogage
        uiContainer.style.display = debugGalleryMode ? 'none' : 'block';
    }
});
document.addEventListener('keyup',(e)=>{keys[e.key.toLowerCase()]=false;});

// Calcule la hitbox de l'entité
function getHitbox(entity) {
    return {
        x: entity.x + (entity.hitboxOffsetX || 0),
        y: entity.y + (entity.hitboxOffsetY || 0),
        w: entity.w,
        h: entity.h
    };
}

// Vérifie la collision entre deux rectangles
function checkCollision(r1,r2){return r1.x<r2.x+r2.w&&r1.x+r1.w>r2.x&&r1.y<r2.y+r2.h&&r1.y+r1.h>r2.y;}
// Vérifie la collision d'un rectangle avec une liste d'objets
function checkCollisionWithObjects(rect,list){for(const o of list)if(checkCollision(rect,o))return true;return false;}

// Met à jour la position et l'animation du joueur
function updatePlayer(){if(!gameState.running||gameState.paused)return;let dx=0,dy=0;if(keys['w']||keys['z'])dy-=1;if(keys['s'])dy+=1;if(keys['a']||keys['q'])dx-=1;if(keys['d'])dx+=1;player.anim.isMoving=(dx!==0||dy!==0);if(player.anim.isMoving){if(dx!==0)player.anim.facingRight=dx>0;const m=Math.sqrt(dx*dx+dy*dy);const mx=(dx/m)*player.speed;const my=(dy/m)*player.speed;const nextPos = getHitbox(player);nextPos.x += mx;if(!checkCollisionWithObjects(nextPos,obstacles))player.x+=mx;nextPos.x-=mx;nextPos.y+=my;if(!checkCollisionWithObjects(nextPos,obstacles))player.y+=my;}player.anim.timer++;if(player.anim.timer>player.anim.speed){player.anim.timer=0;if(player.anim.isMoving)player.anim.frame=(player.anim.frame+1)%player.frameCount;else player.anim.frame=0;}}

// Fait apparaître les ennemis
function spawnEnemies(){
    if(gameState.paused)return;

    const initialSpawnDelay = 2000;
    const minSpawnDelay = 300;
    const spawnDelayReductionRate = 0.01;
    const currentSpawnDelay = Math.max(minSpawnDelay, initialSpawnDelay - gameState.gameTime * spawnDelayReductionRate);

    enemySpawnTimer -= 16;
    if(enemySpawnTimer <= 0){
        enemySpawnTimer = currentSpawnDelay;

        const initialEnemiesPerSpawn = 1;
        const enemyIncreaseRate = 1 / 90000;
        const maxEnemiesPerSpawn = 10;
        const currentEnemiesToSpawn = Math.min(maxEnemiesPerSpawn, initialEnemiesPerSpawn + Math.floor(gameState.gameTime * enemyIncreaseRate));

        for(let i=0;i<currentEnemiesToSpawn;i++){
            let x,y,sR,ok=false;
            for(let a=0;a<10;a++){
                const an=Math.random()*Math.PI*2;
                const d=Math.max(canvas.width/2,canvas.height/2)+50;
                x=player.x+Math.cos(an)*d;
                y=player.y+Math.sin(an)*d;

                const tK=getEnemyTypeByTime();
                const t=enemyDefinitions[tK];

                sR={x,y,w:t.w,h:t.h,hitboxOffsetX:t.hitboxOffsetX,hitboxOffsetY:t.hitboxOffsetY};
                if(!checkCollisionWithObjects(getHitbox(sR),obstacles)&&x>0&&x<world.width&&y>0&&y<world.height){
                    ok=true;
                    break;
                }
            }
            if(ok){
                const tK=getEnemyTypeByTime();
                const t=enemyDefinitions[tK];
                enemies.push({x,y,...t,currentHealth:t.health,anim:{frame:0,timer:0,speed:t.animSpeed}, lastDamageTime: 0});
            }
        }
    }
}
// Détermine le type d'ennemi à faire apparaître en fonction du temps de jeu
function getEnemyTypeByTime(){
    const gameTimeSeconds = gameState.gameTime / 1000;
    let availableEnemyTypes = ['goblin'];

    if (gameTimeSeconds >= 5 * 60) {
        availableEnemyTypes.push('skeleton');
    }
    if (gameTimeSeconds >= 10 * 60) {
        availableEnemyTypes.push('slime');
    }
    if (gameTimeSeconds >= 15 * 60) {
        availableEnemyTypes.push('orc');
    }

    const randomIndex = Math.floor(Math.random() * availableEnemyTypes.length);
    return availableEnemyTypes[randomIndex];
}

// Met à jour la position et l'animation des ennemis
function updateEnemies() {
    const now = Date.now();

    // 1. Déplacer tous les ennemis vers le joueur
    enemies.forEach(e => {
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) {
            const mx = (dx / d) * e.speed;
            const my = (dy / d) * e.speed;

            const nextPos = getHitbox(e);
            nextPos.x += mx;
            if (!checkCollisionWithObjects(nextPos, obstacles)) e.x += mx;
            nextPos.x -= mx;
            nextPos.y += my;
            if (!checkCollisionWithObjects(nextPos, obstacles)) e.y += my;
        }
    });

    // 2. Résoudre les collisions ennemi-ennemi (exécuter plusieurs fois pour la stabilité)
    const resolutionIterations = 3;
    for (let iter = 0; iter < resolutionIterations; iter++) {
        for (let i = 0; i < enemies.length; i++) {
            for (let j = i + 1; j < enemies.length; j++) {
                const e1 = enemies[i];
                const e2 = enemies[j];
                const hitbox1 = getHitbox(e1);
                const hitbox2 = getHitbox(e2);

                if (checkCollision(hitbox1, hitbox2)) {
                    // Logique de séparation simple
                    const dx = e1.x - e2.x;
                    const dy = e1.y - e2.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    const push = 0.5; // Force de répulsion par itération

                    let moveX = 0;
                    let moveY = 0;

                    if (d > 0) {
                        moveX = (dx / d) * push;
                        moveY = (dy / d) * push;
                    } else { // S'ils sont exactement superposés, pousser au hasard
                        moveX = (Math.random() - 0.5) * push;
                        moveY = (Math.random() - 0.5) * push;
                    }

                    // Déplacer e1
                    const nextPos1 = getHitbox(e1);
                    nextPos1.x += moveX;
                    if (!checkCollisionWithObjects(nextPos1, obstacles)) e1.x += moveX;
                    nextPos1.x -= moveX;
                    nextPos1.y += moveY;
                    if (!checkCollisionWithObjects(nextPos1, obstacles)) e1.y += moveY;

                    // Déplacer e2
                    const nextPos2 = getHitbox(e2);
                    nextPos2.x -= moveX;
                    if (!checkCollisionWithObjects(nextPos2, obstacles)) e2.x -= moveX;
                    nextPos2.x += moveX;
                    nextPos2.y -= moveY;
                    if (!checkCollisionWithObjects(nextPos2, obstacles)) e2.y -= moveY;
                }
            }
        }
    }

    // 3. Vérifier les dégâts au joueur et mettre à jour les animations pour tous les ennemis
    enemies.forEach(e => {
        if (checkCollision(getHitbox(player), getHitbox(e))) {
            const damageCooldown = 1000;
            if (now - e.lastDamageTime > damageCooldown) {
                takeDamage(e.damage);
                e.lastDamageTime = now;
            }
        }
        e.anim.timer++;
        if (e.anim.timer > e.anim.speed) {
            e.anim.timer = 0;
            e.anim.frame = (e.anim.frame + 1) % e.frameCount;
        }
    });
}


// Gère la mort d'un ennemi
function killEnemy(enemy){
    enemy.isDead=true;
    gameState.killCount++;
    if(Math.random()<0.8){
        const gemInfo = itemDefinitions.xpGem;
        xpGems.push({
            x:enemy.x+enemy.w/2,
            y:enemy.y+enemy.h/2,
            value:enemy.xp,
            anim: { frame: 0, timer: 0, speed: gemInfo.animSpeed },
            frameCount: gemInfo.frameCount,
            visualOffsetX: gemInfo.visualOffsetX,
            visualOffsetY: gemInfo.visualOffsetY,
            expirationTime: Date.now() + 30000
        });
    }

    let dropChance = 0;
    switch (enemy.type) {
        case 'goblin': dropChance = 0.10; break;
        case 'skeleton': dropChance = 0.12; break;
        case 'slime': dropChance = 0.14; break;
        case 'orc': dropChance = 0.15; break;
    }

    if (Math.random() < dropChance) {
        const goldInfo = itemDefinitions.gold;
        goldCoins.push({
            x: enemy.x + enemy.w / 2,
            y: enemy.y + enemy.h / 2,
            value: 1,
            anim: { frame: 0, timer: 0, speed: goldInfo.animSpeed },
            frameCount: goldInfo.frameCount,
            visualOffsetX: goldInfo.visualOffsetX,
            visualOffsetY: goldInfo.visualOffsetY,
            expirationTime: Date.now() + 60000
        });
    }

    enemies=enemies.filter(en=>en!==enemy);
}

// Met à jour les gemmes d'XP (animation, magnétisme, collecte, expiration)
function updateXPGems() {
    const now = Date.now();
    for (let i=xpGems.length-1;i>=0;i--){
        const g=xpGems[i];

        if (now >= g.expirationTime) {
            xpGems.splice(i, 1);
            continue;
        }

        g.anim.timer++;
        if(g.anim.timer>g.anim.speed){
            g.anim.timer=0;
            g.anim.frame=(g.anim.frame+1)%g.frameCount;
        }
        const dx=(player.x+player.w/2)-g.x;
        const dy=(player.y+player.h/2)-g.y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if(d<player.magnetRadius){
            g.x+=(dx/d)*6;
            g.y+=(dy/d)*6;
        }
        if(d<player.w/2){
            collectXP(g.value);
            xpGems.splice(i,1);
        }
    }
}

// Met à jour les pièces d'or (animation, magnétisme, collecte, expiration)
function updateGoldCoins() {
    const now = Date.now();
    for (let i = goldCoins.length - 1; i >= 0; i--) {
        const coin = goldCoins[i];

        if (now >= coin.expirationTime) {
            goldCoins.splice(i, 1);
            continue;
        }

        coin.anim.timer++;
        if (coin.anim.timer > coin.anim.speed) {
            coin.anim.timer = 0;
            coin.anim.frame = (coin.anim.frame + 1) % coin.frameCount;
        }

        const dx = (player.x + player.w / 2) - coin.x;
        const dy = (player.y + player.h / 2) - coin.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < player.magnetRadius) {
            coin.x += (dx / d) * 6;
            coin.y += (dy / d) * 6;
        }

        if (d < player.w / 2) {
            player.gold += coin.value;
            goldCoins.splice(i, 1);
        }
    }
}

// Collecte de l'XP et vérifie si le joueur monte de niveau
function collectXP(amount){player.xp+=amount;if(player.xp>=player.xpToNextLevel){levelUp();}}

// Gère la montée de niveau du joueur
function levelUp(){
    gameState.paused=true;
    player.level++;
    player.xp-=player.xpToNextLevel;
    player.xpToNextLevel=Math.floor(player.xpToNextLevel*1.5);
    // player.health=player.maxHealth; // La guérison a été supprimée comme demandé précédemment
    levelUpModal.style.display='flex';
    populateUpgradeOptions();
}

// Remplit les options d'amélioration
function populateUpgradeOptions(){upgradeOptionsContainer.innerHTML='';const c=[],a=[...availableUpgrades];while(c.length<3&&a.length>0){const r=Math.floor(Math.random()*a.length);const o=a[r];const wL=(o.id==='magicMissile'||o.id==='aura'||o.id==='auraOfDecay')?player.weapons[o.id]?.level||0:-1;const d=document.createElement('div');d.className='upgrade-option';d.innerHTML=`<strong>${o.name}</strong><br><small>${o.description(wL)}</small>`;d.onclick=()=>selectUpgrade(o);upgradeOptionsContainer.appendChild(d);c.push(o);a.splice(r,1);}}
// Sélectionne une amélioration
function selectUpgrade(upgrade){upgrade.apply();levelUpModal.style.display='none';gameState.paused=false;}

// Gère les dégâts subis par le joueur
function takeDamage(amount){
    const now = Date.now();
    if (player.invincible && now < player.invincibilityEndTime) {
        return;
    }

    player.health-=amount;

    player.invincible = true;
    player.invincibilityEndTime = now + 1000;

    gameContainer.classList.add('damage-overlay');
    setTimeout(() => {
        gameContainer.classList.remove('damage-overlay');
    }, 200);

    if(player.health<=0){
        player.health=0;
        gameOver();
    }
}

// Fonction pour mettre à jour l'état d'invincibilité du joueur
function updatePlayerInvincibility() {
    const now = Date.now();
    if (player.invincible && now >= player.invincibilityEndTime) {
        player.invincible = false;
    }
}

// Gère la fin de partie
async function gameOver(){
    gameState.running=false;
    finalScoreUI.textContent=`Survécu ${Math.floor(gameState.gameTime/1000)}s, ${gameState.killCount} kills.`;
    gameOverModal.style.display='flex';
    saveGameData();
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
}

// Fonction de victoire
async function gameVictory() {
    gameState.running = false;
    victoryModal.style.display = 'flex';
    saveGameData();
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
}

// Fonction pour vérifier si un ennemi est visible à l'écran
function isEnemyVisible(enemy) {
    const enemyScreenX = enemy.x - camera.x;
    const enemyScreenY = enemy.y - camera.y;
    return enemyScreenX < canvas.width &&
           enemyScreenX + enemy.spriteW > 0 &&
           enemyScreenY < canvas.height &&
           enemyScreenY + enemy.spriteH > 0;
}

// Trouve l'ennemi le plus proche du joueur qui est visible et à portée de missile
function findNearestEnemy(){
    let nearest = null;
    let minDistance = Infinity;
    const missileRange = 500;

    enemies.forEach(e=>{
        const distanceToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
        if (isEnemyVisible(e) && distanceToPlayer <= missileRange) {
            if(distanceToPlayer < minDistance){
                minDistance = distanceToPlayer;
                nearest = e;
            }
        }
    });
    return nearest;
}
// Formate le temps au format MM:SS:ms
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}:${pad(ms)}`;
}

// Met à jour l'interface utilisateur (UI)
function updateUI(){
    levelUI.textContent=`Niveau: ${player.level}`;
    timerUI.textContent=`Temps: ${formatTime(gameState.gameTime)}`;
    killCountUI.textContent=`Kills: ${gameState.killCount}`;
    healthBarUI.style.width=`${(player.health/player.maxHealth)*100}%`;
    xpBarUI.style.width=`${(player.xp/player.xpToNextLevel)*100}%`;
    healthTextUI.textContent = `${Math.floor(player.health)}/${player.maxHealth}`;
    xpTextUI.textContent = `${Math.floor(player.xp)}/${player.xpToNextLevel}`;
    goldUI.textContent = player.gold;
}

// Met à jour les armes du joueur
function updateWeapons(){
    const now=Date.now();
    const mm=player.weapons.magicMissile;
    if(mm.level>0 && now-mm.lastShot > mm.cooldown){
        const target=findNearestEnemy();
        if(target){
            mm.lastShot=now;
            const dx=target.x-player.x;
            const dy=target.y-player.y;
            const angle=Math.atan2(dy,dx);

            if (areSoundEffectsOn) {
                const newMagicMissileSound = new Audio(assetSources.magicMissileSound);
                newMagicMissileSound.volume = sfxVolume;
                newMagicMissileSound.play().catch(error => {
                    console.warn("La lecture automatique du son du missile magique a été empêchée :", error);
                });
            }

            const mmDef = projectileDefinitions.magicMissile;
            projectiles.push({
                x:player.x+player.w/2,
                y:player.y+player.h/2,
                w:mmDef.drawW,
                h:mmDef.drawH,
                vx:Math.cos(angle)*8,
                vy:Math.sin(angle)*8,
                damage: mm.damage * player.damageMultiplier,
                lifespan: Math.ceil((canvas.width / 2) / 8),
                angle:angle,
                type: 'magicMissile',
                trail: [],
                maxTrailLength: mmDef.maxTrailLength,
                trailOpacityStart: mmDef.trailOpacityStart,
                trailOpacityEnd: mmDef.trailOpacityEnd,
            });
        }
    }
    const aura=player.weapons.aura;if(aura.level>0){aura.rotation+=0.04;if(now-aura.lastTick>aura.cooldown){aura.lastTick=now;const orbW=16,orbH=16;for(let i=0;i<aura.orbCount;i++){const angle=aura.rotation+(i*(Math.PI*2)/aura.orbCount);const orbHitbox={x:player.x+player.w/2+Math.cos(angle)*aura.radius-orbW/2,y:player.y+player.h/2+Math.sin(angle)*aura.radius-orbH/2,w:orbW,h:orbH};enemies.forEach(enemy=>{if(checkCollision(orbHitbox,getHitbox(enemy))){enemy.currentHealth-=(aura.damage * player.damageMultiplier);if(enemy.currentHealth<=0&&!enemy.isDead){killEnemy(enemy);}}});}}}
    const aod=player.weapons.auraOfDecay;if(aod.level>0&&now-aod.lastTick>aod.cooldown){aod.lastTick=now;enemies.forEach(enemy=>{const dx=(enemy.x+enemy.w/2)-(player.x+player.w/2);const dy=(enemy.y+enemy.h/2)-(player.y+player.h/2);const dist=Math.sqrt(dx*dx+dy*dy);if(dist<aod.radius){enemy.currentHealth-=(aod.damage * player.damageMultiplier);if(enemy.currentHealth<=0&&!enemy.isDead){killEnemy(enemy);}}});}
}
// Met à jour les projectiles
function updateProjectiles(){
    for(let pI=projectiles.length-1;pI>=0;pI--){
        const p=projectiles[pI];

        if (p.type === 'magicMissile') {
            p.trail.unshift({ x: p.x, y: p.y, angle: p.angle });
            if (p.trail.length > p.maxTrailLength) {
                p.trail.pop();
            }
        }

        p.x+=p.vx;
        p.y+=p.vy;
        p.lifespan--;

        if(p.lifespan<=0){
            projectiles.splice(pI,1);
            continue;
        }
        for(let i=enemies.length-1;i>=0;i--){
            const e=enemies[i];
            if(checkCollision(p,getHitbox(e))){
                e.currentHealth-=p.damage;
                if(e.currentHealth<=0&&!e.isDead){ // CORRECTION ICI: 'enemy' remplacé par 'e'
                    killEnemy(e);
                }
                projectiles.splice(pI,1);
                break;
            }
        }
    }
}

// Dessine la galerie de débogage pour les sprites
function drawDebugGallery() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#444';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "12px 'Press Start 2P'";
    ctx.fillStyle = '#fff';

    let x = 50;
    let y = 50;
    const spacing = 200;

    ctx.fillText("Player", x, y - 10);
    if (assets.player && assets.player.complete) {
        const sprite = assets.player;
        const frameWidth = sprite.naturalWidth / initialPlayerState.frameCount;
        const frameHeight = sprite.naturalHeight;
        ctx.drawImage(sprite, 0, 0, frameWidth, frameHeight, x + initialPlayerState.visualOffsetX, y + initialPlayerState.visualOffsetY, initialPlayerState.spriteW, initialPlayerState.spriteH);
        if (debugMode) {
            ctx.strokeStyle = 'rgba(255,0,0,0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + initialPlayerState.hitboxOffsetX, y + initialPlayerState.hitboxOffsetY, initialPlayerState.w, initialPlayerState.h);
        }
    }
    x += spacing;

    for(const key in enemyDefinitions) {
        const def = enemyDefinitions[key];
        ctx.fillText(key, x, y - 10);
        if (assets[key] && assets[key].complete) {
            const sprite = assets[key];
            const frameWidth = sprite.naturalWidth / def.frameCount;
            const frameHeight = sprite.naturalHeight;
            ctx.drawImage(sprite, 0, 0, frameWidth, frameHeight, x + def.visualOffsetX, y + def.visualOffsetY, def.spriteW, def.spriteH);
            if (debugMode) {
                ctx.strokeStyle = 'rgba(255,0,0,0.8)';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + def.hitboxOffsetX, y + def.hitboxOffsetY, def.w, def.h);
            }
        }
        x += spacing;
        if (x + spacing > canvas.width) {
            x = 50;
            y += spacing;
        }
    }
}

// Fonction de dessin principale
function draw(){
    if (debugGalleryMode) {
        drawDebugGallery();
        return;
    }
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.translate(-camera.x,-camera.y);

    if(backgroundPattern) {
        ctx.fillStyle = backgroundPattern;
        ctx.fillRect(camera.x, camera.y, canvas.width, canvas.height);
    }

    obstacles.forEach(o => {
        if(assets.obstacle && assets.obstacle.complete) {
            ctx.drawImage(assets.obstacle, o.x, o.y, o.w, o.h);
        } else {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(o.x, o.y, o.w, o.h);
        }
        if(debugMode) {
            ctx.strokeStyle = 'rgba(0,0,255,0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(o.x, o.y, o.w, o.h);
        }
    });

    xpGems.forEach(gem => {
        if(assets.xpGem && assets.xpGem.complete && assets.xpGem.naturalHeight !== 0) {
            const sprite = assets.xpGem;
            const frameWidth = sprite.naturalWidth / gem.frameCount;
            const frameHeight = sprite.naturalHeight;
            const sourceX = gem.anim.frame * frameWidth;
            ctx.drawImage(sprite, sourceX, 0, frameWidth, frameHeight, gem.x - 16 + gem.visualOffsetX, gem.y - 16 + gem.visualOffsetY, 32, 32);
        }
    });

    goldCoins.forEach(coin => {
        if(assets.gold && assets.gold.complete && assets.gold.naturalHeight !== 0) {
            const sprite = assets.gold;
            const frameWidth = sprite.naturalWidth / coin.frameCount;
            const frameHeight = sprite.naturalHeight;
            const sourceX = coin.anim.frame * frameWidth;
            ctx.drawImage(sprite, sourceX, 0, frameWidth, frameHeight, coin.x - 16 + coin.visualOffsetX, coin.y - 16 + coin.visualOffsetY, 32, 32);
        }
    });

    enemies.forEach(e => {
        if(assets[e.type]) {
            const sprite = assets[e.type];
            if (sprite.complete && sprite.naturalHeight !== 0) {
                const frameWidth = sprite.naturalWidth / e.frameCount;
                const frameHeight = sprite.naturalHeight;
                const sourceX = e.anim.frame * frameWidth;
                ctx.drawImage(sprite, sourceX, 0, frameWidth, frameHeight, e.x + e.visualOffsetX, e.y + e.visualOffsetY, e.spriteW, e.spriteH);
                if(debugMode) {
                    ctx.strokeStyle = 'rgba(255,0,0,0.5)';
                    ctx.lineWidth = 2;
                    const hitbox = getHitbox(e);
                    ctx.strokeRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
                }
            }
        }
        if(e.currentHealth < e.health){ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(e.x+e.hitboxOffsetX,e.y+e.hitboxOffsetY-8,e.w,4);ctx.fillStyle='#c0392b';ctx.fillRect(e.x+e.hitboxOffsetX,e.y+e.hitboxOffsetY-8,e.w*(e.currentHealth/e.health),4);}
    });

    // Dessine le joueur avec une rotation horizontale si nécessaire
    ctx.save();
    
    // Calcule le coin supérieur gauche pour dessiner le sprite.
    // Ceci centre visuellement le sprite sur la position logique de la hitbox (player.x, player.y)
    // puis applique les décalages visuels.
    const spriteDrawX = player.x + (player.w / 2) - (player.spriteW / 2) + player.visualOffsetX;
    const spriteDrawY = player.y + (player.h / 2) - (player.spriteH / 2) + player.visualOffsetY;

    // Le point autour duquel retourner le sprite est son centre visuel.
    const flipAxisX = spriteDrawX + player.spriteW / 2;
    
    // Translater vers l'axe de retournement, mettre à l'échelle, et translater en arrière pour effectuer le retournement.
    ctx.translate(flipAxisX, 0);
    if (!player.anim.facingRight) {
        ctx.scale(-1, 1);
    }
    ctx.translate(-flipAxisX, 0);

    // Dessine le sprite si la ressource est chargée.
    if(assets.player && assets.player.complete && assets.player.naturalHeight !== 0) {
        const sprite = assets.player;
        const frameWidth = sprite.naturalWidth / player.frameCount;
        const frameHeight = sprite.naturalHeight;
        const sourceX = player.anim.frame * frameWidth;

        // Applique la transparence si le joueur est invincible.
        if (player.invincible && Date.now() % 200 < 100) {
            ctx.globalAlpha = 0.5;
        }

        // Dessine l'image du sprite en utilisant ses dimensions visuelles (spriteW, spriteH),
        // et non les dimensions de la hitbox (w, h).
        ctx.drawImage(sprite, sourceX, 0, frameWidth, frameHeight, spriteDrawX, spriteDrawY, player.spriteW, player.spriteH);
        
        // Réinitialise la transparence.
        ctx.globalAlpha = 1.0;
    }
    ctx.restore();


    if(debugMode) {
        ctx.strokeStyle = 'rgba(255,0,0,0.5)';
        ctx.lineWidth = 2;
        const hitbox = getHitbox(player);
        ctx.strokeRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
    }

    const aod=player.weapons.auraOfDecay;
    if(aod.level>0){
        ctx.beginPath();
        const pulse=aod.radius+(Math.sin(Date.now()/200)*5);
        const centerX = player.x + player.w / 2;
        const centerY = player.y + player.h / 2;
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulse);
        gradient.addColorStop(0, 'rgba(80, 0, 80, 0.6)');
        gradient.addColorStop(1,'rgba(0, 0, 0, 0.0)');
        ctx.fillStyle = gradient;
        ctx.arc(centerX, centerY, pulse, 0, Math.PI * 2);
        ctx.fill();
    }
    projectiles.forEach(p=>{
        if (p.type === 'magicMissile') {
            p.trail.forEach((trailPoint, index) => {
                ctx.save();
                const alpha = p.trailOpacityStart - (index / (p.maxTrailLength - 1)) * (p.trailOpacityStart - p.trailOpacityEnd);
                ctx.globalAlpha = Math.max(0, alpha);
                ctx.translate(trailPoint.x, trailPoint.y);
                ctx.rotate(trailPoint.angle);
                ctx.fillStyle = '#00FFFF';
                ctx.beginPath();
                ctx.moveTo(p.w / 2, 0);
                ctx.lineTo(-p.w / 2, -p.h / 2);
                ctx.lineTo(-p.w / 2, p.h / 2);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            });
            ctx.globalAlpha = 1.0;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = '#00FFFF';
            ctx.beginPath();
            ctx.moveTo(p.w / 2, 0);
            ctx.lineTo(-p.w / 2, -p.h / 2);
            ctx.lineTo(-p.w / 2, p.h / 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        if(debugMode) {
            ctx.strokeStyle = 'rgba(255,255,0,0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
        }
    });

    const aura=player.weapons.aura;if(aura.level>0){const orbW=24,orbH=24;for(let i=0;i<aura.orbCount;i++){const angle=aura.rotation+(i*(Math.PI*2)/aura.orbCount);const orbX=player.x+player.w/2+Math.cos(angle)*aura.radius-orbW/2;const orbY=player.y+player.h/2+Math.sin(angle)*aura.radius-orbH/2;const gradient=ctx.createRadialGradient(orbX+orbW/2,orbY+orbH/2,1,orbX+orbW/2,orbY+orbH/2,orbW/2);gradient.addColorStop(0,'#f1c40f');gradient.addColorStop(1,'rgba(230,126,34,0)');ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(orbX+orbW/2,orbY+orbH/2,orbW/2,0,Math.PI*2);ctx.fill();}}

    ctx.restore();
}

let lastTime = 0;
let animationFrameId = null;

// Fonction pour mettre à jour la régénération du joueur
function updatePlayerRegeneration(deltaTime) {
    if (player.regenerationRate > 0) {
        const safeDeltaTime = Math.max(0, deltaTime);
        const healthToRegen = (player.regenerationRate * safeDeltaTime) / 1000;
        player.health = Math.min(player.maxHealth, player.health + healthToRegen);
    }
}

// Boucle de jeu principale
function gameLoop(timestamp){
    if (!gameState.running) {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        return;
    }

    const deltaTime=timestamp-lastTime;
    lastTime=timestamp;

    if(!gameState.paused && !debugGalleryMode){
        updatePlayer();
        spawnEnemies();
        updateEnemies();
        updateWeapons();
        updateProjectiles();
        updateXPGems();
        updateGoldCoins();
        updatePlayerRegeneration(deltaTime);
        updatePlayerInvincibility();
        gameState.gameTime+=deltaTime;

        const thirtyMinutesInMs = 30 * 60 * 1000;
        if (gameState.gameTime >= thirtyMinutesInMs) {
            gameVictory();
            return;
        }
    }
    draw();
    updateUI();
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Fonction pour démarrer le jeu
function startGame() {
    mainMenu.style.display = 'none';
    mainMenuGoldUI.style.display = 'none';
    soundControlsUI.style.display = 'none';

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    resetPlayerState(); // Réinitialise le joueur avant de commencer
    loadGameData();     // Charge les données pour appliquer l'or etc.

    gameState.gameStarted = true;
    gameState.running = true;
    gameState.paused = false;
    lastTime = performance.now();

    if (isMusicOn) {
        backgroundMusic.play().catch(error => {
            console.warn("La lecture automatique a été empêchée. L'utilisateur doit d'abord interagir avec le document.", error);
        });
        toggleMusicButton.textContent = "Musique: ON";
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

// Fonction pour mettre le jeu en pause
function pauseGame() {
    gameState.paused = true;
    pauseModal.style.display = 'flex';
    populatePauseStats();
    soundControlsUI.style.display = 'none';
}

// Fonction pour reprendre le jeu
function resumeGame() {
    gameState.paused = false;
    pauseModal.style.display = 'none';
    lastTime = performance.now();
}

// Fonction pour quitter le jeu et retourner au menu principal
function quitGame() {
    saveGameData();

    enemies = [];
    projectiles = [];
    xpGems = [];
    goldCoins = [];
    enemySpawnTimer = 0;

    gameState.running = false;
    gameState.paused = true;
    gameState.gameTime = 0;
    gameState.killCount = 0;
    gameState.gameStarted = false;

    pauseModal.style.display = 'none';
    mainMenu.style.display = 'flex';
    mainMenuGoldUI.style.display = 'block';
    soundControlsUI.style.display = 'flex';
    
    loadGameData(); // Recharge les données pour mettre à jour l'affichage de l'or
    updateMainMenuGoldDisplay();

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// Fonction pour remplir les statistiques du menu de pause
function populatePauseStats() {
    pauseLevelUI.textContent = `Niveau: ${player.level}`;
    pauseTimerUI.textContent = `Temps écoulé: ${formatTime(gameState.gameTime)}`;
    pauseKillCountUI.textContent = `Kills: ${gameState.killCount}`;

    pauseUpgradesList.innerHTML = '';
    const currentUpgrades = {};

    for (const weaponId in player.weapons) {
        if (player.weapons[weaponId].level > 0) {
            currentUpgrades[weaponId] = player.weapons[weaponId].level;
        }
    }
    
    const baseHealthWithUpgrades = initialPlayerState.maxHealth + (permanentUpgrades.maxHealth.level * 50);
    const baseSpeedWithUpgrades = initialPlayerState.speed + (permanentUpgrades.speed.level * 0.1);
    const baseRegenWithUpgrades = initialPlayerState.regenerationRate + (permanentUpgrades.regeneration.level * 0.1);

    if (player.maxHealth > baseHealthWithUpgrades) {
        currentUpgrades.maxHealth = (player.maxHealth - baseHealthWithUpgrades) / 20;
    }

    if (player.speed > baseSpeedWithUpgrades) {
        currentUpgrades.speed = Math.round((player.speed - baseSpeedWithUpgrades) / 0.5);
    }
    
    if (player.regenerationRate > baseRegenWithUpgrades) {
        currentUpgrades.regeneration = player.regenerationRate - baseRegenWithUpgrades;
    }


    const upgradeDisplayNames = {
        magicMissile: "Missile Magique",
        aura: "Orbes de Feu",
        auraOfDecay: "Aura Néfaste",
        maxHealth: "Coeur robuste",
        speed: "Bottes de vitesse",
        regeneration: "Régénération"
    };

    for (const upgradeId in currentUpgrades) {
        const li = document.createElement('li');
        const level = currentUpgrades[upgradeId];
        const displayName = upgradeDisplayNames[upgradeId] || upgradeId;

        if (upgradeId === 'regeneration') {
            li.textContent = `${displayName}: +${level.toFixed(1)} PV/sec`;
        } else if (upgradeId === 'maxHealth') {
             li.textContent = `${displayName}: +${level * 20} Vie Max`;
        } else if (upgradeId === 'speed') {
            li.textContent = `${displayName}: Niveau ${level}`;
        } else {
            li.textContent = `${displayName}: Niveau ${level}`;
        }
        pauseUpgradesList.appendChild(li);
    }
}

// Fonction pour charger les données du joueur depuis localStorage
function loadGameData() {
    try {
        const storedUpgrades = localStorage.getItem('permanentUpgrades');
        if (storedUpgrades) {
            const savedUpgrades = JSON.parse(storedUpgrades);
            // Fusionne les améliorations sauvegardées avec celles par défaut pour éviter les erreurs si de nouvelles améliorations sont ajoutées au code
            for (const key in permanentUpgrades) {
                if (savedUpgrades[key]) {
                    permanentUpgrades[key] = savedUpgrades[key];
                }
            }
        }

        // Crée l'objet player et applique les stats de base + améliorations permanentes
        resetPlayerState();

        // Charge l'or et l'applique au joueur
        const storedGold = localStorage.getItem('playerGold');
        if (storedGold !== null) {
            player.gold = parseInt(storedGold, 10);
        }

        updateMainMenuGoldDisplay();

        const savedMusicVolume = localStorage.getItem('musicVolume');
        const savedSfxVolume = localStorage.getItem('sfxVolume');
        const savedIsMusicOn = localStorage.getItem('isMusicOn');
        const savedAreSfxOn = localStorage.getItem('areSoundEffectsOn');

        if (savedMusicVolume !== null) musicVolume = parseFloat(savedMusicVolume);
        if (savedSfxVolume !== null) sfxVolume = parseFloat(savedSfxVolume);
        if (savedIsMusicOn !== null) isMusicOn = savedIsMusicOn === 'true';
        if (savedAreSfxOn !== null) areSoundEffectsOn = savedAreSfxOn === 'true';
        
        backgroundMusic.volume = isMusicOn ? musicVolume : 0;

        if (musicVolumeSlider) musicVolumeSlider.value = musicVolume;
        if (sfxVolumeSlider) sfxVolumeSlider.value = sfxVolume;
        if (toggleMusicButton) toggleMusicButton.textContent = `Musique: ${isMusicOn ? 'ON' : 'OFF'}`;
        if (toggleSfxButton) toggleSfxButton.textContent = `Effets Sonores: ${areSoundEffectsOn ? 'ON' : 'OFF'}`;

        if (mainMenu.style.display !== 'none') {
            soundControlsUI.style.display = 'flex';
        }

    } catch (error) {
        console.error("Erreur lors du chargement depuis localStorage :", error);
        // En cas d'erreur, on s'assure que le joueur est dans un état de base fonctionnel
        resetPlayerState();
        player.gold = 0;
    }
}

// Fonction pour sauvegarder les données du joueur dans localStorage
function saveGameData() {
    try {
        localStorage.setItem('playerGold', player.gold.toString());
        localStorage.setItem('permanentUpgrades', JSON.stringify(permanentUpgrades));
        localStorage.setItem('musicVolume', musicVolume.toString());
        localStorage.setItem('sfxVolume', sfxVolume.toString());
        localStorage.setItem('isMusicOn', isMusicOn.toString());
        localStorage.setItem('areSoundEffectsOn', areSoundEffectsOn.toString());
    } catch (error) {
        console.error("Erreur lors de la sauvegarde dans localStorage :", error);
    }
}

// Fonction pour mettre à jour l'affichage de l'or
function updateMainMenuGoldDisplay() {
    if (player && mainMenuGoldUI) {
        mainMenuGoldUI.textContent = `Or: ${player.gold}`;
    }
    if (player && upgradesMenuGoldUI) {
        upgradesMenuGoldUI.textContent = `Or: ${player.gold}`;
    }
}

// Fonctions pour le menu des améliorations permanentes
function showUpgradesMenu() {
    mainMenu.style.display = 'none';
    permanentUpgradesMenu.style.display = 'flex';
    updateMainMenuGoldDisplay();
    setupPermanentUpgrades();
}

function hideUpgradesMenu() {
    mainMenu.style.display = 'flex';
    permanentUpgradesMenu.style.display = 'none';
}

function setupPermanentUpgrades() {
    upgradesGrid.innerHTML = '';
    for (const key in permanentUpgrades) {
        const btn = document.createElement('button');
        btn.className = 'permanent-upgrade-btn';
        btn.dataset.upgradeKey = key;

        updateUpgradeButton(btn, key);

        btn.addEventListener('click', () => {
            buyPermanentUpgrade(key);
        });
        upgradesGrid.appendChild(btn);
    }
}

function buyPermanentUpgrade(key) {
    const upgrade = permanentUpgrades[key];
    if (player.gold >= upgrade.cost && upgrade.level < upgrade.maxLevel) {
        player.gold -= upgrade.cost;
        upgrade.level++;
        
        saveGameData();
        updateMainMenuGoldDisplay();
        
        const btn = upgradesGrid.querySelector(`[data-upgrade-key="${key}"]`);
        updateUpgradeButton(btn, key);
    }
}

function updateUpgradeButton(btn, key) {
    const upgrade = permanentUpgrades[key];
    const def = permanentUpgradeDefinitions[key];
    
    let costText = "MAX";
    if (upgrade.level < upgrade.maxLevel) {
        costText = `Coût: ${upgrade.cost} or`;
    }

    btn.innerHTML = `
        <div>
            <div style="font-size: 24px;">${def.emoji}</div>
            <div>${def.title}</div>
            <div>${def.description(upgrade.level, upgrade.maxLevel)}</div>
        </div>
        <div class="upgrade-cost">${costText}</div>
    `;

    if (upgrade.level >= upgrade.maxLevel || player.gold < upgrade.cost) {
        btn.disabled = true;
    } else {
        btn.disabled = false;
    }
}


// Fonction pour afficher une alerte de lecture automatique personnalisée
function showCustomAutoplayAlert() {
    const customAlert = document.createElement('div');
    customAlert.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background-color: #2c2c2c; padding: 20px; border: 4px solid #f1c40f;
        border-radius: 10px; text-align: center; z-index: 9999;
        font-family: 'Press Start 2P', cursive; color: #fff; box-shadow: 0 0 15px rgba(0,0,0,0.5);`;
    customAlert.innerHTML = `
        <p>Cliquez n'importe où pour activer le son.</p>
        <button style="background-color: #f1c40f; color: #1a1a1a; border: none; padding: 10px 20px; margin-top: 15px; border-radius: 5px; cursor: pointer; font-family: 'Press Start 2P', cursive;">OK</button>`;
    document.body.appendChild(customAlert);
    customAlert.querySelector('button').onclick = () => {
        document.body.removeChild(customAlert);
        if (isMusicOn && backgroundMusic.paused) {
            backgroundMusic.play().catch(err => console.warn("Échec de la lecture de la musique après l'interaction de l'utilisateur :", err));
        }
    };
}

// Fonction pour basculer la musique de fond
function toggleMusic() {
    isMusicOn = !isMusicOn;
    if (isMusicOn) {
        backgroundMusic.volume = musicVolume;
        backgroundMusic.play().catch(error => {
            console.warn("La lecture automatique de la musique de fond a été empêchée.", error);
            showCustomAutoplayAlert();
        });
    } else {
        backgroundMusic.volume = 0;
    }
    toggleMusicButton.textContent = `Musique: ${isMusicOn ? 'ON' : 'OFF'}`;
    saveGameData();
}

// Fonction pour basculer les effets sonores
function toggleSoundEffects() {
    areSoundEffectsOn = !areSoundEffectsOn;
    toggleSfxButton.textContent = `Effets Sonores: ${areSoundEffectsOn ? 'ON' : 'OFF'}`;
    saveGameData();
}

// Fonctions pour afficher/cacher le modal d'options
function showOptions(fromMenu) {
    returnToMenuAfterOptions = fromMenu;
    optionsModal.style.display = 'flex';
    mainMenu.style.display = 'none';
    pauseModal.style.display = 'none';
    soundControlsUI.style.display = 'none';
    musicVolumeSlider.value = musicVolume;
    sfxVolumeSlider.value = sfxVolume;
}

function showOptionsFromMain() { showOptions('main'); }
function showOptionsFromPause() { showOptions('pause'); }

function hideOptions() {
    optionsModal.style.display = 'none';
    if (returnToMenuAfterOptions === 'main') {
        mainMenu.style.display = 'flex';
        soundControlsUI.style.display = 'flex';
    } else if (returnToMenuAfterOptions === 'pause') {
        pauseModal.style.display = 'flex';
    }
    saveGameData();
}

// Fonctions pour mettre à jour le volume à partir des curseurs
function updateMusicVolume() {
    musicVolume = parseFloat(musicVolumeSlider.value);
    backgroundMusic.volume = musicVolume;
    isMusicOn = musicVolume > 0;
    toggleMusicButton.textContent = `Musique: ${isMusicOn ? 'ON' : 'OFF'}`;
    saveGameData();
}

function updateSfxVolume() {
    sfxVolume = parseFloat(sfxVolumeSlider.value);
    areSoundEffectsOn = sfxVolume > 0;
    toggleSfxButton.textContent = `Effets Sonores: ${areSoundEffectsOn ? 'ON' : 'OFF'}`;
    saveGameData();
}

// Fonction d'initialisation du jeu
function init(){
    document.getElementById('ui-container').innerHTML=`
        <div id="stats">
            <div id="level">Niveau: 1</div>
            <div id="timer">Temps: 0s</div>
            <div id="kill-count">Kills: 0</div>
        </div>
        <div id="xp-bar-container">
            <div id="xp-bar" style="width: 0%;"></div>
            <span id="xp-text" class="bar-text">0/8</span>
        </div>
        <div id="health-bar-container">
            <div id="health-bar" style="width: 100%;"></div>
            <span id="health-text" class="bar-text">120/120</span>
        </div>
        <div id="gold-display">
            Or: <span id="gold-count">0</span>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend',`<div id="level-up-modal" class="modal"><div class="modal-content"><h2>NIVEAU SUPÉRIEUR !</h2><p>Choisissez une amélioration :</p><div id="upgrade-options"></div></div></div><div id="game-over-modal" class="modal"><div class="modal-content"><h2>GAME OVER</h2><p id="final-score"></p><button onclick="window.location.reload()">Recommencer</button></div></div>`);

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
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    createBackgroundAndObstacles();
    
    loadAssets(() => {
        if (assets.background.complete && assets.background.naturalWidth !== 0) {
             backgroundPattern = ctx.createPattern(assets.background, 'repeat');
        }
        loadGameData();
        draw(); // Dessine l'état initial
    });
}

// Attendre que le DOM soit chargé pour ajouter les écouteurs d'événements
document.addEventListener('DOMContentLoaded', () => {
    // Appelle la fonction d'initialisation pour démarrer le jeu
    init();

    document.getElementById('startGameButton').addEventListener('click', startGame);
    document.getElementById('upgradesMenuButton').addEventListener('click', showUpgradesMenu);
    document.getElementById('optionsMenuButton').addEventListener('click', showOptionsFromMain);
    
    upgradesBackButton.addEventListener('click', hideUpgradesMenu);
    optionsBackButton.addEventListener('click', hideOptions);

    musicVolumeSlider.addEventListener('input', updateMusicVolume);
    sfxVolumeSlider.addEventListener('input', updateSfxVolume);

    toggleMusicButton.addEventListener('click', toggleMusic);
    toggleSfxButton.addEventListener('click', toggleSoundEffects);

    backgroundMusic.play().catch(error => {
        console.log("La lecture automatique de la musique de fond a été empêchée.");
        showCustomAutoplayAlert();
        isMusicOn = false;
        toggleMusicButton.textContent = "Musique: OFF";
    });

    gameContainer.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
});
