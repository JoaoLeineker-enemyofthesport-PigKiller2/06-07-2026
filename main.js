// ============================================================================
// 1. GERENCIAMENTO DO CURSOR
// ============================================================================
const cursor = document.getElementById('cursor');
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;

document.addEventListener('mousemove', (e) => {
    // Atualiza o cursor customizado
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    
    // Variáveis globais de mouse para o 3D (normalizadas)
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
});

// ============================================================================
// 2. SIMULAÇÃO 3D (THREE.JS) - ALTA CONTAGEM DE POLÍGONOS
// ============================================================================
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020202, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 40;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limita o pixel ratio para performance
document.getElementById('webgl-container').appendChild(renderer.domElement);

// Geometria Pesada: TorusKnot (Nó de Toroide) com muitos segmentos
const geometry = new THREE.TorusKnotGeometry(1.5, 0.4, 150, 32); 
const material = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.1,
    metalness: 0.9,
    wireframe: false
});

const meshes = [];
const numMeshes = 250; // Quantidade massiva de objetos complexos

for (let i = 0; i < numMeshes; i++) {
    const mesh = new THREE.Mesh(geometry, material);
    
    // Posição inicial espalhada
    const startPos = new THREE.Vector3(
        (Math.random() - 0.5) * 120,
        (Math.random() - 0.5) * 120,
        (Math.random() - 0.5) * 60 - 10
    );
    
    mesh.position.copy(startPos);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    
    // Dados físicos customizados
    mesh.userData = {
        originalPos: startPos.clone(),
        velocity: new THREE.Vector3(),
        rotSpeed: new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02
        ),
        mass: Math.random() * 0.5 + 0.5
    };
    
    scene.add(mesh);
    meshes.push(mesh);
}

// Iluminação Dinâmica
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

const cursorLight = new THREE.PointLight(0xff3366, 3, 40);
scene.add(cursorLight);

const secondaryLight = new THREE.PointLight(0x3366ff, 2, 80);
secondaryLight.position.set(20, 20, 10);
scene.add(secondaryLight);

// Interação WebGL: Repulsão ao Mouse e Explosão no Clique
const raycaster = new THREE.Raycaster();
const mouseVector = new THREE.Vector2();

document.addEventListener('click', () => {
    // Aplica uma força de explosão em todos os objetos
    meshes.forEach(mesh => {
        const explosionForce = new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5
        );
        mesh.userData.velocity.add(explosionForce);
    });
    
    // Flash de luz
    cursorLight.intensity = 10;
    setTimeout(() => { cursorLight.intensity = 3; }, 200);
});

function animate3D() {
    requestAnimationFrame(animate3D);

    // Movimento suave da câmera (Parallax)
    targetX = mouseX * 5;
    targetY = mouseY * 5;
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    // Mapeia a posição do mouse no espaço 3D para a luz e repulsão
    mouseVector.set(mouseX, mouseY);
    raycaster.setFromCamera(mouseVector, camera);
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(planeZ, intersectPoint);
    
    cursorLight.position.copy(intersectPoint);
    cursorLight.position.z = 5;

    // Física dos objetos
    meshes.forEach(mesh => {
        mesh.rotation.x += mesh.userData.rotSpeed.x;
        mesh.rotation.y += mesh.userData.rotSpeed.y;

        // Repulsão magnética do cursor
        const distToCursor = mesh.position.distanceTo(intersectPoint);
        if (distToCursor < 15) {
            const pushDir = mesh.position.clone().sub(intersectPoint).normalize();
            const pushForce = (15 - distToCursor) * 0.02;
            mesh.userData.velocity.add(pushDir.multiplyScalar(pushForce));
        }

        // Retorno elástico à posição original (Mola)
        const springForce = mesh.userData.originalPos.clone().sub(mesh.position).multiplyScalar(0.005);
        mesh.userData.velocity.add(springForce);

        // Atrito e aplicação de velocidade
        mesh.userData.velocity.multiplyScalar(0.92);
        mesh.position.add(mesh.userData.velocity);
    });

    renderer.render(scene, camera);
}
animate3D();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================================
// 3. JOGO 2D CANVAS (SOBREVIVÊNCIA)
// ============================================================================
const canvas = document.getElementById('survival-game');
const ctx = canvas.getContext('2d');

// Resolução interna fixa, css cuida do scale
canvas.width = 800;
canvas.height = 450;

const keys = { w: false, a: false, s: false, d: false, e: false };
window.addEventListener('keydown', e => { 
    if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; 
});
window.addEventListener('keyup', e => { 
    if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; 
});

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 12,
    speed: 3.5,
    sanity: 100,
    pages: 0,
    wood: 0
};

let resources = [];
let enemies = [];
let lastTime = performance.now();
let canUseWood = true;

function spawnEntities() {
    // Spawna Recursos
    if (Math.random() < 0.03) {
        const isWood = Math.random() < 0.3;
        resources.push({
            x: Math.random() * (canvas.width - 40) + 20,
            y: Math.random() * (canvas.height - 40) + 20,
            size: isWood ? 8 : 6,
            type: isWood ? 'wood' : 'page',
            color: isWood ? '#a0522d' : '#ffd700'
        });
    }

    // Spawna Inimigos (Aumenta a chance se sanidade baixa)
    const enemyChance = player.sanity < 40 ? 0.04 : 0.01;
    if (Math.random() < enemyChance) {
        enemies.push({
            x: Math.random() < 0.5 ? -20 : canvas.width + 20,
            y: Math.random() * canvas.height,
            size: 14,
            speed: Math.random() * 1.5 + 0.5,
            color: 'rgba(70, 10, 20, 0.8)'
        });
    }
}

function updateGame(deltaTime) {
    if (player.sanity <= 0) return;

    // Movimentação do Jogador
    if (keys.w && player.y > player.size) player.y -= player.speed;
    if (keys.s && player.y < canvas.height - player.size) player.y += player.speed;
    if (keys.a && player.x > player.size) player.x -= player.speed;
    if (keys.d && player.x < canvas.width - player.size) player.x += player.speed;

    // Mecânica de Uso de Lenha
    if (keys.e && player.wood > 0 && canUseWood) {
        player.wood--;
        player.sanity = Math.min(100, player.sanity + 25);
        document.getElementById('inv-slots').innerText = `${player.wood} Lenhas`;
        canUseWood = false;
        setTimeout(() => canUseWood = true, 500);
    }

    // Decaimento de Sanidade
    player.sanity -= 0.03;
    document.getElementById('sanity-score').innerText = Math.max(0, Math.floor(player.sanity));

    // Coleta de Recursos
    for (let i = resources.length - 1; i >= 0; i--) {
        const r = resources[i];
        const dist = Math.hypot(player.x - r.x, player.y - r.y);
        if (dist < player.size + r.size + 5) {
            if (r.type === 'page') {
                player.sanity = Math.min(100, player.sanity + 5);
                player.pages++;
                document.getElementById('pages-score').innerText = player.pages;
            } else {
                player.wood++;
                document.getElementById('inv-slots').innerText = `${player.wood} Lenhas`;
            }
            resources.splice(i, 1);
        }
    }

    // Movimento e Colisão de Inimigos
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const angle = Math.atan2(dy, dx);
        
        e.x += Math.cos(angle) * e.speed;
        e.y += Math.sin(angle) * e.speed;

        if (Math.hypot(dx, dy) < player.size + e.size) {
            player.sanity -= 10; // Dano massivo
            enemies.splice(i, 1);
        }
    }
}

function drawGame() {
    // Fundo
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grade de chão sutil
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke(); }
    for(let i=0; i<canvas.height; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke(); }

    if (player.sanity > 0) {
        // Recursos
        resources.forEach(r => {
            ctx.fillStyle = r.color;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Inimigos
        enemies.forEach(e => {
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Jogador (Ponto de Luz)
        ctx.fillStyle = '#ff3366';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Máscara de Iluminação Baseada na Sanidade
    const lightRadius = Math.max(15, player.sanity * 2.5);
    const gradient = ctx.createRadialGradient(player.x, player.y, lightRadius * 0.1, player.x, player.y, lightRadius);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.98)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Game Over Text
    if (player.sanity <= 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px "Space Grotesk"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('A CHAMA SE APAGOU', canvas.width/2, canvas.height/2 - 20);
        ctx.font = '20px "Space Grotesk"';
        ctx.fillStyle = '#888888';
        ctx.fillText(`Registros recuperados: ${player.pages}`, canvas.width/2, canvas.height/2 + 20);
    }
}

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    spawnEntities();
    updateGame(deltaTime);
    drawGame();

    requestAnimationFrame(gameLoop);
}

// Inicia o jogo
requestAnimationFrame(gameLoop);