// Configuración de la API
const API_CONFIG = {
    // API de BallDontLie para NBA - Gratuita
    BASE_URL: 'https://api.balldontlie.io/v1',
    
    // Para usar con API key (opcional - puedes obtener una gratis en balldontlie.io)
    API_KEY: '', // Deja vacío para usar el tier gratuito
    
    // Configuración de actualización
    UPDATE_INTERVAL: 30000, // 30 segundos
    MAX_RETRIES: 3,
    
    // Endpoints
    ENDPOINTS: {
        GAMES: '/games',
        TEAMS: '/teams',
        PLAYERS: '/players',
        LIVE_SCORES: '/box_scores/live'
    }
};

// Estado global de la aplicación
let appState = {
    games: [],
    filteredGames: [],
    currentFilter: 'all',
    searchTerm: '',
    isLoading: false,
    lastUpdate: null,
    updateInterval: null,
    teams: new Map() // Cache de equipos
};

// Elementos del DOM
const elements = {
    loading: document.getElementById('loading'),
    gamesList: document.getElementById('gamesList'),
    gamesCount: document.getElementById('gamesCount'),
    lastUpdateTime: document.getElementById('lastUpdateTime'),
    searchInput: document.getElementById('searchInput'),
    filterButtons: document.querySelectorAll('.filter-btn'),
    refreshBtn: document.getElementById('refreshBtn'),
    modal: document.getElementById('gameModal'),
    modalContent: document.getElementById('modalGameDetails'),
    closeModal: document.querySelector('.close-modal')
};

// Función para hacer peticiones a la API
async function fetchFromAPI(endpoint, params = {}) {
    const url = new URL(API_CONFIG.BASE_URL + endpoint);
    
    // Agregar parámetros
    Object.keys(params).forEach(key => {
        if (Array.isArray(params[key])) {
            params[key].forEach(value => url.searchParams.append(`${key}[]`, value));
        } else {
            url.searchParams.append(key, params[key]);
        }
    });
    
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    
    // Agregar API key si está disponible
    if (API_CONFIG.API_KEY) {
        headers['Authorization'] = API_CONFIG.API_KEY;
    }
    
    try {
        const response = await fetch(url.toString(), { headers });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching from API:', error);
        throw error;
    }
}

// Función para obtener equipos
async function fetchTeams() {
    try {
        const data = await fetchFromAPI(API_CONFIG.ENDPOINTS.TEAMS);
        const teams = data.data || [];
        
        // Guardar equipos en cache
        teams.forEach(team => {
            appState.teams.set(team.id, team);
        });
        
        return teams;
    } catch (error) {
        console.error('Error fetching teams:', error);
        return [];
    }
}

// Función para obtener partidos del día actual
async function fetchTodayGames() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const data = await fetchFromAPI(API_CONFIG.ENDPOINTS.GAMES, {
            dates: [today],
            per_page: 50
        });
        
        return data.data || [];
    } catch (error) {
        console.error('Error fetching today games:', error);
        return [];
    }
}

// Función para obtener partidos en vivo
async function fetchLiveGames() {
    try {
        // Intentar obtener box scores en vivo (requiere API key)
        if (API_CONFIG.API_KEY) {
            const data = await fetchFromAPI(API_CONFIG.ENDPOINTS.LIVE_SCORES);
            return data.data || [];
        } else {
            // Usar partidos del día actual como alternativa
            return await fetchTodayGames();
        }
    } catch (error) {
        console.error('Error fetching live games:', error);
        // Fallback a partidos del día
        return await fetchTodayGames();
    }
}

// Función para obtener partidos recientes
async function fetchRecentGames() {
    try {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const dates = [
            yesterday.toISOString().split('T')[0],
            today.toISOString().split('T')[0]
        ];
        
        const data = await fetchFromAPI(API_CONFIG.ENDPOINTS.GAMES, {
            dates: dates,
            per_page: 50
        });
        
        return data.data || [];
    } catch (error) {
        console.error('Error fetching recent games:', error);
        return [];
    }
}

// Función para determinar el estado del partido
function getGameStatus(game) {
    const status = game.status?.toLowerCase() || '';
    
    if (status.includes('final')) {
        return 'finished';
    } else if (status.includes('qtr') || status.includes('quarter') || status.includes('halftime')) {
        return 'live';
    } else if (game.period > 0) {
        return 'live';
    } else {
        return 'scheduled';
    }
}

// Función para formatear la hora del partido
function formatGameTime(game) {
    if (!game.datetime) return 'Hora no disponible';
    
    try {
        const date = new Date(game.datetime);
        return date.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } catch (error) {
        return 'Hora no disponible';
    }
}

// Función para obtener el logo del equipo (placeholder)
function getTeamLogo(team) {
    // Placeholder - en una implementación real, tendrías URLs de logos
    return `https://via.placeholder.com/40/000000/FFFFFF?text=${team.abbreviation}`;
}

// Función para cargar todos los partidos
async function loadGames() {
    if (appState.isLoading) return;
    
    setLoadingState(true);
    
    try {
        // Cargar equipos primero si no están en cache
        if (appState.teams.size === 0) {
            await fetchTeams();
        }
        
        // Obtener partidos recientes y del día actual
        const games = await fetchRecentGames();
        
        // Procesar y formatear los partidos
        const processedGames = games.map(game => ({
            id: game.id,
            homeTeam: {
                id: game.home_team.id,
                name: game.home_team.name,
                city: game.home_team.city,
                abbreviation: game.home_team.abbreviation,
                logo: getTeamLogo(game.home_team)
            },
            awayTeam: {
                id: game.visitor_team.id,
                name: game.visitor_team.name,
                city: game.visitor_team.city,
                abbreviation: game.visitor_team.abbreviation,
                logo: getTeamLogo(game.visitor_team)
            },
            homeScore: game.home_team_score || 0,
            awayScore: game.visitor_team_score || 0,
            status: getGameStatus(game),
            time: formatGameTime(game),
            period: game.period || 0,
            timeRemaining: game.time || '',
            date: game.date,
            season: game.season,
            isPlayoffs: game.postseason || false,
            rawData: game // Guardar datos originales para el modal
        }));
        
        appState.games = processedGames;
        appState.lastUpdate = new Date();
        
        // Aplicar filtros actuales
        applyFilters();
        
        // Actualizar UI
        renderGames();
        updateLastUpdateTime();
        
    } catch (error) {
        console.error('Error loading games:', error);
        showError('Error al cargar los partidos. Por favor, intenta de nuevo.');
    } finally {
        setLoadingState(false);
    }
}

// Función para aplicar filtros
function applyFilters() {
    let filtered = [...appState.games];
    
    // Filtrar por estado
    if (appState.currentFilter !== 'all') {
        filtered = filtered.filter(game => {
            switch (appState.currentFilter) {
                case 'live':
                    return game.status === 'live';
                case 'today':
                    const today = new Date().toISOString().split('T')[0];
                    return game.date === today;
                case 'finished':
                    return game.status === 'finished';
                default:
                    return true;
            }
        });
    }
    
    // Filtrar por búsqueda
    if (appState.searchTerm) {
        const searchLower = appState.searchTerm.toLowerCase();
        filtered = filtered.filter(game => 
            game.homeTeam.name.toLowerCase().includes(searchLower) ||
            game.homeTeam.city.toLowerCase().includes(searchLower) ||
            game.awayTeam.name.toLowerCase().includes(searchLower) ||
            game.awayTeam.city.toLowerCase().includes(searchLower)
        );
    }
    
    appState.filteredGames = filtered;
}

// Función para renderizar los partidos
function renderGames() {
    const gamesList = elements.gamesList;
    const gamesCount = elements.gamesCount;
    
    // Actualizar contador
    gamesCount.textContent = appState.filteredGames.length;
    
    if (appState.filteredGames.length === 0) {
        gamesList.innerHTML = `
            <div class="no-games">
                <i class="fas fa-basketball-ball"></i>
                <p>No se encontraron partidos</p>
                <small>Intenta cambiar los filtros o buscar otros equipos</small>
            </div>
        `;
        return;
    }
    
    gamesList.innerHTML = appState.filteredGames.map(game => `
        <div class="game-card ${game.status}" onclick="showGameDetails(${game.id})">
            <div class="game-header">
                <div class="game-status">
                    <span class="status-indicator ${game.status}"></span>
                    <span class="status-text">${getStatusText(game.status)}</span>
                </div>
                <div class="game-time">
                    ${game.status === 'live' ? (game.timeRemaining || `Q${game.period}`) : game.time}
                </div>
            </div>
            
            <div class="teams-container">
                <div class="team away-team">
                    <div class="team-logo">
                        <img src="${game.awayTeam.logo}" alt="${game.awayTeam.name}" loading="lazy">
                    </div>
                    <div class="team-info">
                        <div class="team-name">${game.awayTeam.city}</div>
                        <div class="team-record">${game.awayTeam.name}</div>
                    </div>
                    <div class="team-score ${game.awayScore > game.homeScore ? 'winning' : ''}">${game.awayScore}</div>
                </div>
                
                <div class="vs-divider">
                    <span>VS</span>
                </div>
                
                <div class="team home-team">
                    <div class="team-score ${game.homeScore > game.awayScore ? 'winning' : ''}">${game.homeScore}</div>
                    <div class="team-info">
                        <div class="team-name">${game.homeTeam.city}</div>
                        <div class="team-record">${game.homeTeam.name}</div>
                    </div>
                    <div class="team-logo">
                        <img src="${game.homeTeam.logo}" alt="${game.homeTeam.name}" loading="lazy">
                    </div>
                </div>
            </div>
            
            <div class="game-footer">
                <div class="game-info">
                    <span class="game-date">${formatDate(game.date)}</span>
                    ${game.isPlayoffs ? '<span class="playoffs-badge">Playoffs</span>' : ''}
                </div>
                <div class="game-actions">
                    <button class="action-btn" onclick="event.stopPropagation(); showGameDetails(${game.id})">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Función para obtener el texto del estado
function getStatusText(status) {
    const statusMap = {
        'live': 'EN VIVO',
        'finished': 'FINAL',
        'scheduled': 'PROGRAMADO'
    };
    return statusMap[status] || 'DESCONOCIDO';
}

// Función para formatear fecha
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit' 
        });
    } catch (error) {
        return dateString;
    }
}

// Función para mostrar detalles del partido
function showGameDetails(gameId) {
    const game = appState.games.find(g => g.id === gameId);
    if (!game) return;
    
    const modal = elements.modal;
    const modalContent = elements.modalContent;
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3>${game.awayTeam.city} ${game.awayTeam.name} vs ${game.homeTeam.city} ${game.homeTeam.name}</h3>
            <div class="modal-status ${game.status}">
                <span class="status-indicator ${game.status}"></span>
                ${getStatusText(game.status)}
            </div>
        </div>
        
        <div class="modal-score">
            <div class="team-score-large">
                <div class="team-info-large">
                    <img src="${game.awayTeam.logo}" alt="${game.awayTeam.name}">
                    <div>
                        <div class="team-name-large">${game.awayTeam.city}</div>
                        <div class="team-record-large">${game.awayTeam.name}</div>
                    </div>
                </div>
                <div class="score-large ${game.awayScore > game.homeScore ? 'winning' : ''}">${game.awayScore}</div>
            </div>
            
            <div class="score-divider">-</div>
            
            <div class="team-score-large">
                <div class="score-large ${game.homeScore > game.awayScore ? 'winning' : ''}">${game.homeScore}</div>
                <div class="team-info-large">
                    <img src="${game.homeTeam.logo}" alt="${game.homeTeam.name}">
                    <div>
                        <div class="team-name-large">${game.homeTeam.city}</div>
                        <div class="team-record-large">${game.homeTeam.name}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="modal-details">
            <div class="detail-row">
                <span class="detail-label">Fecha:</span>
                <span class="detail-value">${formatDate(game.date)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Hora:</span>
                <span class="detail-value">${game.time}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Temporada:</span>
                <span class="detail-value">${game.season}-${game.season + 1}</span>
            </div>
            ${game.period > 0 ? `
                <div class="detail-row">
                    <span class="detail-label">Período:</span>
                    <span class="detail-value">${game.period}° Cuarto</span>
                </div>
            ` : ''}
            ${game.timeRemaining ? `
                <div class="detail-row">
                    <span class="detail-label">Tiempo:</span>
                    <span class="detail-value">${game.timeRemaining}</span>
                </div>
            ` : ''}
            ${game.isPlayoffs ? `
                <div class="detail-row">
                    <span class="detail-label">Tipo:</span>
                    <span class="detail-value playoffs-badge">Playoffs</span>
                </div>
            ` : ''}
        </div>
        
        <div class="modal-note">
            <p><strong>Datos proporcionados por:</strong> BallDontLie API</p>
            <p><small>Los datos se actualizan cada 30 segundos</small></p>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Función para establecer el estado de carga
function setLoadingState(isLoading) {
    appState.isLoading = isLoading;
    elements.loading.style.display = isLoading ? 'flex' : 'none';
    elements.refreshBtn.disabled = isLoading;
}

// Función para actualizar el tiempo de última actualización
function updateLastUpdateTime() {
    if (appState.lastUpdate) {
        elements.lastUpdateTime.textContent = appState.lastUpdate.toLocaleTimeString('es-ES');
    }
}

// Función para mostrar errores
function showError(message) {
    // Crear notificación de error
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 5000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Cargar partidos al iniciar
    loadGames();
    
    // Configurar actualización automática
    appState.updateInterval = setInterval(loadGames, API_CONFIG.UPDATE_INTERVAL);
    
    // Botón de actualizar
    elements.refreshBtn.addEventListener('click', loadGames);
    
    // Filtros
    elements.filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remover clase activa de todos los botones
            elements.filterButtons.forEach(b => b.classList.remove('active'));
            
            // Agregar clase activa al botón clickeado
            this.classList.add('active');
            
            // Actualizar filtro
            appState.currentFilter = this.dataset.filter;
            applyFilters();
            renderGames();
        });
    });
    
    // Búsqueda
    elements.searchInput.addEventListener('input', function() {
        appState.searchTerm = this.value.trim();
        applyFilters();
        renderGames();
    });
    
    // Modal
    elements.closeModal.addEventListener('click', function() {
        elements.modal.style.display = 'none';
    });
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(event) {
        if (event.target === elements.modal) {
            elements.modal.style.display = 'none';
        }
    });
});

// Limpiar interval al cerrar la página
window.addEventListener('beforeunload', function() {
    if (appState.updateInterval) {
        clearInterval(appState.updateInterval);
    }
}); 