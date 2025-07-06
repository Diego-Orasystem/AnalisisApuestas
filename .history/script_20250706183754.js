// Configuración para H2H GG League API
const API_CONFIG = {
    // URL de la API real de H2H GG League
    API_URL: 'https://api-h2h.hudstats.com/v1/live/nba',
    
    // Configuración de actualización
    UPDATE_INTERVAL: 15000, // 15 segundos para apuestas
    MAX_RETRIES: 3,
    
    // Configuración de cache
    CACHE_TIMEOUT: 15000, // 15 segundos para apuestas
    
    // Configuración de apuestas
    BETTING_CONFIG: {
        MIN_PERIOD: 2, // Mínimo 2do cuarto
        MIN_SCORE_DIFF: 10, // Mínimo 10 puntos de diferencia
        HIGHLIGHT_DURATION: 3000 // Duración del resaltado cuando cambia
    }
};

// Variables globales
let games = [];
let filteredGames = [];
let currentFilter = 'all';
let searchTerm = '';
let updateInterval;
let previousBettingGames = new Set(); // Para detectar cambios

// Elementos del DOM
const gamesContainer = document.getElementById('gamesContainer');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const searchInput = document.getElementById('searchInput');
const totalGamesElement = document.getElementById('totalGames');
const liveGamesElement = document.getElementById('liveGames');
const lastUpdateTimeElement = document.getElementById('lastUpdateTime');
const noGamesElement = document.getElementById('noGames');
const gameModal = document.getElementById('gameModal');

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏀 Iniciando aplicación H2H GG League Basketball...');
    
    // Inicializar scraper/API client
    const scraper = new H2HGGScraper();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Cargar datos iniciales
    await loadGames();
    
    // Configurar actualización automática
    setupAutoUpdate();
    
    console.log('✅ Aplicación inicializada correctamente');
});

// Configurar event listeners
function setupEventListeners() {
    // Búsqueda
    searchInput.addEventListener('input', function() {
        searchTerm = this.value.toLowerCase();
        filterAndDisplayGames();
    });

    // Filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Actualizar botón activo
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            currentFilter = this.dataset.filter;
            filterAndDisplayGames();
        });
    });

    // Cerrar modal al hacer clic fuera
    gameModal.addEventListener('click', function(e) {
        if (e.target === gameModal) {
            closeModal();
        }
    });

    // Cerrar modal con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && gameModal.style.display === 'block') {
            closeModal();
        }
    });
}

async function loadGames() {
    try {
        showLoading(true);
        hideError();
        
        const gamesData = await scrapeH2HGGData();
        
        if (gamesData && gamesData.length > 0) {
            games = gamesData;
            filterAndDisplayGames();
            updateStats();
            updateLastUpdateTime();
        } else {
            showNoGames();
        }
        
    } catch (error) {
        console.error('Error al cargar los juegos:', error);
        showError('Error al cargar los datos. Reintentando...');
    } finally {
        showLoading(false);
    }
}

// Actualizar estadísticas
function updateStats() {
    const totalGames = games.length;
    const liveGames = games.filter(game => game.status === 'live').length;
    const bettingGames = games.filter(game => isBettingGame(game)).length;
    
    totalGamesElement.textContent = totalGames;
    liveGamesElement.textContent = liveGames;
    
    // Actualizar estadística de apuestas
    const bettingGamesElement = document.getElementById('bettingGames');
    if (bettingGamesElement) {
        bettingGamesElement.textContent = bettingGames;
    }
}

// Aplicar filtros y búsqueda
function filterAndDisplayGames() {
    filteredGames = games.filter(game => {
        // Filtro por búsqueda
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                game.teamAName.toLowerCase().includes(searchLower) ||
                game.teamBName.toLowerCase().includes(searchLower) ||
                (game.participantAName && game.participantAName.toLowerCase().includes(searchLower)) ||
                (game.participantBName && game.participantBName.toLowerCase().includes(searchLower)) ||
                game.streamName.toLowerCase().includes(searchLower);
            
            if (!matchesSearch) return false;
        }

        // Filtro por estado
        if (currentFilter === 'live') {
            return game.status === 'live';
        } else if (currentFilter === 'finished') {
            return game.status === 'finished';
        } else if (currentFilter === 'today') {
            const today = new Date();
            const gameDate = new Date(game.startDate);
            return gameDate.toDateString() === today.toDateString();
        } else if (currentFilter === 'betting') {
            return isBettingGame(game);
        }

        return true; // 'all'
    });

    displayGames();
}

// Renderizar partidos
function displayGames() {
    if (filteredGames.length === 0) {
        showNoGames();
        return;
    }

    hideNoGames();
    
    gamesContainer.innerHTML = filteredGames.map(game => createGameCard(game)).join('');
    
    // Agregar event listeners a las tarjetas
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', function() {
            const gameId = this.dataset.gameId;
            const game = games.find(g => g.externalId === gameId);
            if (game) {
                showGameModal(game);
            }
        });
    });
}

// Crear tarjeta de partido
function createGameCard(game) {
    const gameDate = new Date(game.startDate);
    const timeString = gameDate.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const statusClass = game.status || 'scheduled';
    const statusText = getStatusText(game.status);
    
    // Obtener información de apuestas
    const bettingInfo = getBettingInfo(game);
    const isBetting = bettingInfo.isBetting;
    
    // Detectar si es un partido nuevo para apuestas
    const isNewBetting = isBetting && !previousBettingGames.has(game.externalId);
    if (isNewBetting) {
        previousBettingGames.add(game.externalId);
    } else if (!isBetting) {
        previousBettingGames.delete(game.externalId);
    }
    
    // Clases CSS para el resaltado
    const bettingClass = isBetting ? 'betting-game' : '';
    const newBettingClass = isNewBetting ? 'new-betting' : '';
    
    return `
        <div class="game-card ${statusClass} ${bettingClass} ${newBettingClass}" data-game-id="${game.externalId}">
            ${isBetting ? `
                <div class="betting-badge">
                    <i class="fas fa-fire"></i>
                    <span>APUESTA HOT</span>
                </div>
            ` : ''}
            
            <div class="game-header">
                <div class="game-status">
                    <div class="status-indicator ${statusClass}"></div>
                    <span class="status-text ${statusClass}">${statusText}</span>
                </div>
                <div class="game-time">${timeString}</div>
            </div>
            
            ${isBetting ? `
                <div class="betting-info">
                    <div class="betting-detail">
                        <i class="fas fa-trophy"></i>
                        <span>${bettingInfo.leadingTeam} lidera por ${bettingInfo.scoreDiff} puntos</span>
                    </div>
                    <div class="betting-detail">
                        <i class="fas fa-clock"></i>
                        <span>${bettingInfo.periodText}</span>
                    </div>
                </div>
            ` : ''}
            
            <div class="game-teams">
                <div class="team">
                    <div class="team-logo">
                        <div class="team-initial">${getTeamInitial(game.teamAName)}</div>
                    </div>
                    <div class="team-info">
                        <div class="team-name">${game.teamAName}</div>
                        ${game.participantAName ? `<div class="team-player">${game.participantAName}</div>` : ''}
                    </div>
                    <div class="team-score">${game.teamAScore || 0}</div>
                </div>
                
                <div class="game-vs">VS</div>
                
                <div class="team away-team">
                    <div class="team-score">${game.teamBScore || 0}</div>
                    <div class="team-info">
                        <div class="team-name">${game.teamBName}</div>
                        ${game.participantBName ? `<div class="team-player">${game.participantBName}</div>` : ''}
                    </div>
                    <div class="team-logo">
                        <div class="team-initial">${getTeamInitial(game.teamBName)}</div>
                    </div>
                </div>
            </div>
            
            <div class="game-footer">
                <div class="game-league">
                    <i class="fas fa-tv"></i>
                    <span>${game.streamName}</span>
                </div>
                ${bettingInfo.periodText ? `<div class="game-period ${isBetting ? 'betting-period' : ''}">${bettingInfo.periodText}</div>` : ''}
            </div>
        </div>
    `;
}

function getTeamInitial(teamName) {
    return teamName.split(' ').map(word => word.charAt(0)).join('').substring(0, 3).toUpperCase();
}

function getStatusText(status) {
    const statusMap = {
        'live': 'EN VIVO',
        'finished': 'FINALIZADO',
        'scheduled': 'PROGRAMADO'
    };
    return statusMap[status] || 'PROGRAMADO';
}

function calculatePeriod(scoreA, scoreB) {
    const totalScore = (scoreA || 0) + (scoreB || 0);
    if (totalScore === 0) return null;
    
    // Estimación basada en puntuación promedio por período
    const avgPointsPerPeriod = 25;
    const period = Math.ceil(totalScore / (avgPointsPerPeriod * 2));
    
    return period <= 4 ? `${period}° Período` : 'Tiempo Extra';
}

// Función para detectar si un partido es bueno para apuestas
function isBettingGame(game) {
    const scoreA = game.teamAScore || 0;
    const scoreB = game.teamBScore || 0;
    const scoreDiff = Math.abs(scoreA - scoreB);
    
    // Debe estar en vivo
    if (game.status !== 'live') return false;
    
    // Calcular el período actual
    const totalScore = scoreA + scoreB;
    const avgPointsPerPeriod = 25;
    const currentPeriod = Math.ceil(totalScore / (avgPointsPerPeriod * 2));
    
    // Debe estar en el 2do cuarto en adelante
    if (currentPeriod < API_CONFIG.BETTING_CONFIG.MIN_PERIOD) return false;
    
    // Debe tener una diferencia de 10 o más puntos
    if (scoreDiff < API_CONFIG.BETTING_CONFIG.MIN_SCORE_DIFF) return false;
    
    return true;
}

// Función para obtener información de apuestas del partido
function getBettingInfo(game) {
    const scoreA = game.teamAScore || 0;
    const scoreB = game.teamBScore || 0;
    const scoreDiff = Math.abs(scoreA - scoreB);
    const totalScore = scoreA + scoreB;
    const avgPointsPerPeriod = 25;
    const currentPeriod = Math.ceil(totalScore / (avgPointsPerPeriod * 2));
    
    const leadingTeam = scoreA > scoreB ? game.teamAName : game.teamBName;
    const leadingScore = Math.max(scoreA, scoreB);
    const trailingScore = Math.min(scoreA, scoreB);
    
    return {
        isBetting: isBettingGame(game),
        period: currentPeriod,
        scoreDiff: scoreDiff,
        leadingTeam: leadingTeam,
        leadingScore: leadingScore,
        trailingScore: trailingScore,
        periodText: currentPeriod <= 4 ? `${currentPeriod}° Período` : 'Tiempo Extra'
    };
}

// Mostrar detalles del partido
function showGameModal(game) {
    const modalTeams = document.getElementById('modalTeams');
    const modalGameDetails = document.getElementById('modalGameDetails');
    
    const gameDate = new Date(game.startDate);
    const dateString = gameDate.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const timeString = gameDate.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const statusText = getStatusText(game.status);
    const period = calculatePeriod(game.teamAScore, game.teamBScore);
    
    // Equipos
    modalTeams.innerHTML = `
        <div class="modal-team">
            <div class="modal-team-logo">
                <div class="team-initial" style="width: 60px; height: 60px; background: linear-gradient(45deg, #667eea, #764ba2); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; border-radius: 15px;">
                    ${getTeamInitial(game.teamAName)}
                </div>
            </div>
            <div class="modal-team-info">
                <h3>${game.teamAName}</h3>
                ${game.participantAName ? `<p><strong>Jugador:</strong> ${game.participantAName}</p>` : ''}
            </div>
            <div class="modal-team-score">${game.teamAScore || 0}</div>
        </div>
        
        <div class="modal-vs">VS</div>
        
        <div class="modal-team">
            <div class="modal-team-score">${game.teamBScore || 0}</div>
            <div class="modal-team-info">
                <h3>${game.teamBName}</h3>
                ${game.participantBName ? `<p><strong>Jugador:</strong> ${game.participantBName}</p>` : ''}
            </div>
            <div class="modal-team-logo">
                <div class="team-initial" style="width: 60px; height: 60px; background: linear-gradient(45deg, #667eea, #764ba2); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; border-radius: 15px;">
                    ${getTeamInitial(game.teamBName)}
                </div>
            </div>
        </div>
    `;
    
    // Detalles del juego
    modalGameDetails.innerHTML = `
        <div class="detail-item">
            <span class="detail-label">Estado</span>
            <span class="detail-value ${game.status}">${statusText}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Fecha</span>
            <span class="detail-value">${dateString}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Hora</span>
            <span class="detail-value">${timeString}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Stream</span>
            <span class="detail-value">${game.streamName}</span>
        </div>
        ${period ? `
        <div class="detail-item">
            <span class="detail-label">Período</span>
            <span class="detail-value">${period}</span>
        </div>
        ` : ''}
        <div class="detail-item">
            <span class="detail-label">ID del Juego</span>
            <span class="detail-value">${game.externalId}</span>
        </div>
    `;
    
    gameModal.style.display = 'block';
}

// Cerrar modal
function closeModal() {
    gameModal.style.display = 'none';
}

// Configurar actualización automática
function setupAutoUpdate() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    updateInterval = setInterval(async () => {
        console.log('🔄 Actualización automática para apuestas...');
        await loadGames();
        
        // Mostrar notificación si hay nuevos partidos de apuestas
        const currentBettingGames = games.filter(game => isBettingGame(game));
        if (currentBettingGames.length > 0) {
            console.log(`🔥 ${currentBettingGames.length} partidos hot para apuestas detectados`);
        }
    }, API_CONFIG.UPDATE_INTERVAL);
}

function showLoading(show) {
    loading.style.display = show ? 'flex' : 'none';
}

function showError(message) {
    errorMessage.querySelector('span').textContent = message;
    errorMessage.style.display = 'flex';
    setTimeout(() => {
        hideError();
    }, 5000);
}

function hideError() {
    errorMessage.style.display = 'none';
}

function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    lastUpdateTimeElement.textContent = timeString;
}

function showNoGames() {
    noGamesElement.style.display = 'block';
    gamesContainer.style.display = 'none';
}

function hideNoGames() {
    noGamesElement.style.display = 'none';
    gamesContainer.style.display = 'grid';
}

function refreshGames() {
    loadGames();
}

// Limpiar interval al cerrar la página
window.addEventListener('beforeunload', function() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
}); 