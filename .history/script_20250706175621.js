// Configuración de la API
const API_CONFIG = {
    // API gratuita de BallDontLie para NBA
    NBA_BASE_URL: 'https://api.balldontlie.io/v1',
    // Para usar con API key (descomentear cuando tengas una)
    // API_KEY: 'tu_api_key_aqui',
    
    // API alternativa para datos simulados
    MOCK_API: true, // Cambiar a false cuando tengas acceso a una API real
    
    // Configuración de actualización
    UPDATE_INTERVAL: 30000, // 30 segundos
    MAX_RETRIES: 3
};

// Estado global de la aplicación
let appState = {
    games: [],
    filteredGames: [],
    currentFilter: 'all',
    searchTerm: '',
    isLoading: false,
    lastUpdate: null,
    updateInterval: null
};

// Elementos del DOM
const elements = {
    loading: document.getElementById('loading'),
    gamesContainer: document.getElementById('gamesContainer'),
    noGames: document.getElementById('noGames'),
    lastUpdate: document.getElementById('lastUpdate'),
    searchInput: document.getElementById('searchInput'),
    refreshBtn: document.getElementById('refreshBtn'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    modal: document.getElementById('gameModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    modalClose: document.getElementById('modalClose')
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    console.log('🏀 Inicializando Basketball Live...');
    
    // Configurar event listeners
    setupEventListeners();
    
    // Cargar datos iniciales
    await loadGames();
    
    // Configurar actualización automática
    setupAutoUpdate();
    
    console.log('✅ Aplicación inicializada correctamente');
}

function setupEventListeners() {
    // Filtros
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', handleFilterChange);
    });
    
    // Búsqueda
    elements.searchInput.addEventListener('input', handleSearch);
    
    // Botón de actualización
    elements.refreshBtn.addEventListener('click', handleRefresh);
    
    // Modal
    elements.modalClose.addEventListener('click', closeModal);
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) closeModal();
    });
    
    // Tecla Escape para cerrar modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.modal.style.display === 'block') {
            closeModal();
        }
    });
}

async function loadGames() {
    if (appState.isLoading) return;
    
    appState.isLoading = true;
    showLoading(true);
    
    try {
        console.log('📡 Cargando partidos...');
        
        let games;
        if (API_CONFIG.MOCK_API) {
            games = await getMockGames();
        } else {
            games = await fetchGamesFromAPI();
        }
        
        appState.games = games;
        appState.lastUpdate = new Date();
        
        applyFilters();
        updateLastUpdateTime();
        
        console.log(`✅ ${games.length} partidos cargados`);
        
    } catch (error) {
        console.error('❌ Error al cargar partidos:', error);
        showError('Error al cargar los partidos. Intentando nuevamente...');
        
        // Reintentar después de 5 segundos
        setTimeout(() => loadGames(), 5000);
    } finally {
        appState.isLoading = false;
        showLoading(false);
    }
}

async function fetchGamesFromAPI() {
    const today = new Date().toISOString().split('T')[0];
    const url = `${API_CONFIG.NBA_BASE_URL}/games?dates[]=${today}`;
    
    const headers = {};
    if (API_CONFIG.API_KEY) {
        headers['Authorization'] = API_CONFIG.API_KEY;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || [];
}

async function getMockGames() {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockGames = [
        {
            id: 1,
            date: new Date().toISOString().split('T')[0],
            status: 'Live',
            period: 3,
            time: '7:32',
            home_team: {
                id: 1,
                city: 'Los Angeles',
                name: 'Lakers',
                full_name: 'Los Angeles Lakers',
                abbreviation: 'LAL'
            },
            visitor_team: {
                id: 2,
                city: 'Golden State',
                name: 'Warriors',
                full_name: 'Golden State Warriors',
                abbreviation: 'GSW'
            },
            home_team_score: 89,
            visitor_team_score: 94,
            venue: 'Crypto.com Arena'
        },
        {
            id: 2,
            date: new Date().toISOString().split('T')[0],
            status: 'Final',
            period: 4,
            time: 'Final',
            home_team: {
                id: 3,
                city: 'Miami',
                name: 'Heat',
                full_name: 'Miami Heat',
                abbreviation: 'MIA'
            },
            visitor_team: {
                id: 4,
                city: 'Boston',
                name: 'Celtics',
                full_name: 'Boston Celtics',
                abbreviation: 'BOS'
            },
            home_team_score: 108,
            visitor_team_score: 112,
            venue: 'FTX Arena'
        },
        {
            id: 3,
            date: new Date().toISOString().split('T')[0],
            status: '8:00 PM ET',
            period: 0,
            time: '',
            home_team: {
                id: 5,
                city: 'Milwaukee',
                name: 'Bucks',
                full_name: 'Milwaukee Bucks',
                abbreviation: 'MIL'
            },
            visitor_team: {
                id: 6,
                city: 'Brooklyn',
                name: 'Nets',
                full_name: 'Brooklyn Nets',
                abbreviation: 'BKN'
            },
            home_team_score: 0,
            visitor_team_score: 0,
            venue: 'Fiserv Forum'
        },
        {
            id: 4,
            date: new Date().toISOString().split('T')[0],
            status: 'Live',
            period: 2,
            time: '3:15',
            home_team: {
                id: 7,
                city: 'Phoenix',
                name: 'Suns',
                full_name: 'Phoenix Suns',
                abbreviation: 'PHX'
            },
            visitor_team: {
                id: 8,
                city: 'Dallas',
                name: 'Mavericks',
                full_name: 'Dallas Mavericks',
                abbreviation: 'DAL'
            },
            home_team_score: 56,
            visitor_team_score: 61,
            venue: 'Footprint Center'
        },
        {
            id: 5,
            date: new Date().toISOString().split('T')[0],
            status: 'Final',
            period: 4,
            time: 'Final',
            home_team: {
                id: 9,
                city: 'Chicago',
                name: 'Bulls',
                full_name: 'Chicago Bulls',
                abbreviation: 'CHI'
            },
            visitor_team: {
                id: 10,
                city: 'Detroit',
                name: 'Pistons',
                full_name: 'Detroit Pistons',
                abbreviation: 'DET'
            },
            home_team_score: 95,
            visitor_team_score: 88,
            venue: 'United Center'
        }
    ];
    
    return mockGames;
}

function handleFilterChange(e) {
    const filter = e.target.dataset.filter;
    
    // Actualizar botones activos
    elements.filterBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    appState.currentFilter = filter;
    applyFilters();
}

function handleSearch(e) {
    appState.searchTerm = e.target.value.toLowerCase();
    applyFilters();
}

async function handleRefresh() {
    // Animar el botón
    elements.refreshBtn.querySelector('i').classList.add('fa-spin');
    
    await loadGames();
    
    // Detener animación
    setTimeout(() => {
        elements.refreshBtn.querySelector('i').classList.remove('fa-spin');
    }, 1000);
}

function applyFilters() {
    let filtered = [...appState.games];
    
    // Filtrar por estado
    if (appState.currentFilter !== 'all') {
        filtered = filtered.filter(game => {
            switch (appState.currentFilter) {
                case 'live':
                    return isGameLive(game);
                case 'today':
                    return isGameToday(game);
                case 'finished':
                    return isGameFinished(game);
                default:
                    return true;
            }
        });
    }
    
    // Filtrar por búsqueda
    if (appState.searchTerm) {
        filtered = filtered.filter(game => {
            const homeTeam = game.home_team.full_name.toLowerCase();
            const visitorTeam = game.visitor_team.full_name.toLowerCase();
            return homeTeam.includes(appState.searchTerm) || 
                   visitorTeam.includes(appState.searchTerm);
        });
    }
    
    appState.filteredGames = filtered;
    renderGames();
}

function renderGames() {
    if (appState.filteredGames.length === 0) {
        elements.gamesContainer.style.display = 'none';
        elements.noGames.style.display = 'block';
        return;
    }
    
    elements.gamesContainer.style.display = 'grid';
    elements.noGames.style.display = 'none';
    
    elements.gamesContainer.innerHTML = appState.filteredGames
        .map(game => createGameCard(game))
        .join('');
    
    // Agregar event listeners a las tarjetas
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => {
            const gameId = parseInt(card.dataset.gameId);
            showGameDetails(gameId);
        });
    });
}

function createGameCard(game) {
    const isLive = isGameLive(game);
    const isFinished = isGameFinished(game);
    const isScheduled = !isLive && !isFinished;
    
    const statusClass = isLive ? 'live' : (isFinished ? 'finished' : 'scheduled');
    const statusText = isLive ? 'EN VIVO' : (isFinished ? 'FINAL' : 'PROGRAMADO');
    
    const homeInitials = getTeamInitials(game.home_team.name);
    const visitorInitials = getTeamInitials(game.visitor_team.name);
    
    return `
        <div class="game-card ${isLive ? 'live' : ''}" data-game-id="${game.id}">
            <div class="game-status">
                <span class="status-badge ${statusClass}">${statusText}</span>
                <span class="game-time">${formatGameTime(game)}</span>
            </div>
            
            <div class="teams-container">
                <div class="team">
                    <div class="team-logo">${visitorInitials}</div>
                    <div class="team-name">${game.visitor_team.name}</div>
                    <div class="team-record">${game.visitor_team.city}</div>
                </div>
                
                <div class="vs-section">
                    <div class="score">
                        ${game.visitor_team_score} - ${game.home_team_score}
                    </div>
                    <div class="vs-text">${isLive ? `Q${game.period}` : 'VS'}</div>
                </div>
                
                <div class="team">
                    <div class="team-logo">${homeInitials}</div>
                    <div class="team-name">${game.home_team.name}</div>
                    <div class="team-record">${game.home_team.city}</div>
                </div>
            </div>
            
            <div class="game-details">
                <div class="period-info">
                    ${isLive ? `<i class="fas fa-clock"></i> ${game.time}` : ''}
                </div>
                <div class="venue">
                    <i class="fas fa-map-marker-alt"></i> ${game.venue || 'TBD'}
                </div>
            </div>
        </div>
    `;
}

function showGameDetails(gameId) {
    const game = appState.games.find(g => g.id === gameId);
    if (!game) return;
    
    elements.modalTitle.textContent = `${game.visitor_team.full_name} vs ${game.home_team.full_name}`;
    
    const isLive = isGameLive(game);
    const isFinished = isGameFinished(game);
    
    elements.modalBody.innerHTML = `
        <div class="modal-game-info">
            <div class="modal-teams">
                <div class="modal-team">
                    <div class="team-logo">${getTeamInitials(game.visitor_team.name)}</div>
                    <h3>${game.visitor_team.full_name}</h3>
                    <div class="team-score">${game.visitor_team_score}</div>
                </div>
                
                <div class="modal-vs">
                    <div class="vs-text">VS</div>
                    <div class="game-status-modal">
                        <span class="status-badge ${isLive ? 'live' : (isFinished ? 'finished' : 'scheduled')}">
                            ${isLive ? 'EN VIVO' : (isFinished ? 'FINAL' : 'PROGRAMADO')}
                        </span>
                        ${isLive ? `<div class="quarter-info">Q${game.period} - ${game.time}</div>` : ''}
                    </div>
                </div>
                
                <div class="modal-team">
                    <div class="team-logo">${getTeamInitials(game.home_team.name)}</div>
                    <h3>${game.home_team.full_name}</h3>
                    <div class="team-score">${game.home_team_score}</div>
                </div>
            </div>
            
            <div class="modal-details">
                <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <span>Fecha: ${formatDate(game.date)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>Venue: ${game.venue || 'TBD'}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>Estado: ${formatGameTime(game)}</span>
                </div>
            </div>
            
            ${isLive ? `
                <div class="live-stats">
                    <h4><i class="fas fa-chart-line"></i> Estadísticas en Vivo</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">Cuarto</span>
                            <span class="stat-value">${game.period}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Tiempo</span>
                            <span class="stat-value">${game.time}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Diferencia</span>
                            <span class="stat-value">${Math.abs(game.home_team_score - game.visitor_team_score)}</span>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    // Agregar estilos específicos del modal
    const modalStyles = `
        <style>
            .modal-game-info { text-align: center; }
            .modal-teams { display: flex; justify-content: space-around; align-items: center; margin-bottom: 30px; }
            .modal-team { text-align: center; }
            .modal-team .team-logo { width: 80px; height: 80px; font-size: 2rem; margin: 0 auto 15px; }
            .modal-team h3 { margin-bottom: 10px; color: #333; }
            .team-score { font-size: 2.5rem; font-weight: 700; color: #ff6b35; }
            .modal-vs { text-align: center; }
            .vs-text { font-size: 1.5rem; font-weight: 600; color: #666; margin-bottom: 10px; }
            .quarter-info { font-size: 0.9rem; color: #666; margin-top: 5px; }
            .modal-details { margin: 30px 0; }
            .detail-item { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; color: #666; }
            .live-stats { margin-top: 30px; padding-top: 20px; border-top: 1px solid #f0f0f0; }
            .live-stats h4 { margin-bottom: 15px; color: #333; display: flex; align-items: center; gap: 8px; }
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
            .stat-item { text-align: center; }
            .stat-label { display: block; font-size: 0.8rem; color: #666; margin-bottom: 5px; }
            .stat-value { display: block; font-size: 1.2rem; font-weight: 600; color: #333; }
        </style>
    `;
    
    elements.modalBody.insertAdjacentHTML('beforeend', modalStyles);
    
    elements.modal.style.display = 'block';
}

function closeModal() {
    elements.modal.style.display = 'none';
}

function setupAutoUpdate() {
    // Limpiar intervalo existente
    if (appState.updateInterval) {
        clearInterval(appState.updateInterval);
    }
    
    // Configurar nuevo intervalo
    appState.updateInterval = setInterval(() => {
        if (!appState.isLoading) {
            loadGames();
        }
    }, API_CONFIG.UPDATE_INTERVAL);
}

function updateLastUpdateTime() {
    if (appState.lastUpdate) {
        elements.lastUpdate.textContent = `Última actualización: ${formatTime(appState.lastUpdate)}`;
    }
}

function showLoading(show) {
    elements.loading.style.display = show ? 'block' : 'none';
}

function showError(message) {
    // Crear notificación de error
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Agregar estilos
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4757;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(255, 71, 87, 0.3);
        z-index: 1001;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(errorDiv);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Funciones utilitarias
function isGameLive(game) {
    return game.status === 'Live' || 
           (game.status !== 'Final' && game.period > 0 && game.period <= 4);
}

function isGameFinished(game) {
    return game.status === 'Final' || game.status.includes('Final');
}

function isGameToday(game) {
    const today = new Date().toISOString().split('T')[0];
    return game.date === today;
}

function getTeamInitials(teamName) {
    return teamName.split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 3);
}

function formatGameTime(game) {
    if (isGameLive(game)) {
        return `Q${game.period} - ${game.time}`;
    } else if (isGameFinished(game)) {
        return 'Final';
    } else {
        return game.status;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(date) {
    return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Actualizar tiempo cada minuto
setInterval(updateLastUpdateTime, 60000);

// Agregar estilos CSS adicionales para animaciones
const additionalStyles = `
    <style>
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .error-notification .error-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .fa-spin {
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    </style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles); 