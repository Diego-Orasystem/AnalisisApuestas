// Configuración para H2H GG League Basketball Scraper
const SCRAPER_CONFIG = {
    // URL base de H2H GG League
    BASE_URL: 'https://h2hgg.com/en/ebasketball',
    
    // Configuración de actualización
    UPDATE_INTERVAL: 30000, // 30 segundos
    MAX_RETRIES: 3,
    
    // Configuración de cache
    CACHE_TIMEOUT: 30000, // 30 segundos
    
    // Usar scraper en lugar de API
    USE_SCRAPER: true
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
    scraper: null
};

// Elementos del DOM
const elements = {
    loading: document.getElementById('loading'),
    gamesContainer: document.getElementById('games-container'),
    filterButtons: document.querySelectorAll('.filter-btn'),
    searchInput: document.getElementById('search-input'),
    lastUpdateElement: document.getElementById('last-update'),
    gameCountElement: document.getElementById('game-count'),
    modal: document.getElementById('game-modal'),
    modalContent: document.getElementById('modal-content'),
    closeModal: document.getElementById('close-modal'),
    refreshBtn: document.getElementById('refresh-btn'),
    errorMessage: document.getElementById('error-message')
};

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Iniciando aplicación H2H GG League Basketball...');
    
    // Inicializar scraper
    appState.scraper = new H2HGGScraper();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Cargar datos iniciales
    await loadGames();
    
    // Configurar actualización automática
    setupAutoUpdate();
    
    console.log('Aplicación inicializada correctamente');
});

// Configurar event listeners
function setupEventListeners() {
    // Filtros
    elements.filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.target.dataset.filter;
            setActiveFilter(filter);
            filterGames(filter);
        });
    });
    
    // Búsqueda
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', (e) => {
            appState.searchTerm = e.target.value.toLowerCase();
            applyFilters();
        });
    }
    
    // Botón de actualización
    if (elements.refreshBtn) {
        elements.refreshBtn.addEventListener('click', async () => {
            await forceRefresh();
        });
    }
    
    // Modal
    if (elements.closeModal) {
        elements.closeModal.addEventListener('click', closeGameModal);
    }
    
    if (elements.modal) {
        elements.modal.addEventListener('click', (e) => {
            if (e.target === elements.modal) {
                closeGameModal();
            }
        });
    }
    
    // Escape key para cerrar modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.modal.style.display === 'block') {
            closeGameModal();
        }
    });
}

// Cargar datos de partidos usando scraper
async function loadGames() {
    if (appState.isLoading) return;
    
    appState.isLoading = true;
    showLoading(true);
    hideError();
    
    try {
        console.log('Obteniendo datos de H2H GG League...');
        
        // Usar scraper para obtener datos
        const games = await appState.scraper.getGames();
        
        if (games && games.length > 0) {
            appState.games = games;
            appState.lastUpdate = new Date();
            
            // Aplicar filtros actuales
            applyFilters();
            
            // Actualizar UI
            updateLastUpdateTime();
            updateGameCount();
            
            console.log(`Cargados ${games.length} partidos de H2H GG League`);
        } else {
            throw new Error('No se encontraron partidos');
        }
        
    } catch (error) {
        console.error('Error cargando partidos:', error);
        showError('Error al cargar los partidos. Reintentando...');
        
        // Mostrar datos de cache si están disponibles
        if (appState.games.length > 0) {
            console.log('Mostrando datos de cache...');
            applyFilters();
        }
    } finally {
        appState.isLoading = false;
        showLoading(false);
    }
}

// Forzar actualización
async function forceRefresh() {
    console.log('Forzando actualización de datos...');
    
    if (appState.scraper) {
        await appState.scraper.forceUpdate();
    }
    
    await loadGames();
}

// Aplicar filtros y búsqueda
function applyFilters() {
    let filtered = [...appState.games];
    
    // Aplicar filtro de estado
    if (appState.currentFilter !== 'all') {
        filtered = filtered.filter(game => {
            switch (appState.currentFilter) {
                case 'live':
                    return game.status === 'live';
                case 'today':
                    return game.date === new Date().toISOString().split('T')[0];
                case 'finished':
                    return game.status === 'finished';
                default:
                    return true;
            }
        });
    }
    
    // Aplicar búsqueda
    if (appState.searchTerm) {
        filtered = filtered.filter(game => 
            game.homeTeam.name.toLowerCase().includes(appState.searchTerm) ||
            game.awayTeam.name.toLowerCase().includes(appState.searchTerm) ||
            game.homeTeam.city.toLowerCase().includes(appState.searchTerm) ||
            game.awayTeam.city.toLowerCase().includes(appState.searchTerm)
        );
    }
    
    appState.filteredGames = filtered;
    renderGames();
}

// Renderizar partidos
function renderGames() {
    if (!elements.gamesContainer) return;
    
    if (appState.filteredGames.length === 0) {
        elements.gamesContainer.innerHTML = `
            <div class="no-games">
                <i class="fas fa-basketball-ball"></i>
                <h3>No hay partidos disponibles</h3>
                <p>No se encontraron partidos que coincidan con los filtros actuales.</p>
                <button onclick="forceRefresh()" class="refresh-btn">
                    <i class="fas fa-sync-alt"></i> Actualizar
                </button>
            </div>
        `;
        return;
    }
    
    const gamesHTML = appState.filteredGames.map(game => createGameCard(game)).join('');
    elements.gamesContainer.innerHTML = gamesHTML;
}

// Crear tarjeta de partido
function createGameCard(game) {
    const statusClass = getStatusClass(game.status);
    const statusText = getStatusText(game.status);
    
    return `
        <div class="game-card ${statusClass}" onclick="showGameDetails('${game.id}')">
            <div class="game-header">
                <div class="game-status">
                    <span class="status-indicator ${statusClass}"></span>
                    <span class="status-text">${statusText}</span>
                </div>
                <div class="game-time">
                    ${game.time || 'H2H GG League'}
                </div>
            </div>
            
            <div class="game-teams">
                <div class="team home-team">
                    <div class="team-logo">
                        <img src="${game.homeTeam.logo}" alt="${game.homeTeam.name}" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="team-initial" style="display: none;">
                            ${game.homeTeam.abbreviation}
                        </div>
                    </div>
                    <div class="team-info">
                        <div class="team-name">${game.homeTeam.name}</div>
                        <div class="team-city">${game.homeTeam.city}</div>
                    </div>
                    <div class="team-score">${game.homeScore}</div>
                </div>
                
                <div class="game-vs">
                    <span>VS</span>
                </div>
                
                <div class="team away-team">
                    <div class="team-score">${game.awayScore}</div>
                    <div class="team-info">
                        <div class="team-name">${game.awayTeam.name}</div>
                        <div class="team-city">${game.awayTeam.city}</div>
                    </div>
                    <div class="team-logo">
                        <img src="${game.awayTeam.logo}" alt="${game.awayTeam.name}"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="team-initial" style="display: none;">
                            ${game.awayTeam.abbreviation}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="game-footer">
                <div class="game-league">
                    <i class="fas fa-basketball-ball"></i>
                    ${game.league}
                </div>
                <div class="game-period">
                    ${game.period ? `Período ${game.period}` : ''}
                </div>
            </div>
        </div>
    `;
}

// Mostrar detalles del partido
function showGameDetails(gameId) {
    const game = appState.games.find(g => g.id === gameId);
    if (!game || !elements.modal) return;
    
    const modalHTML = `
        <div class="modal-header">
            <h2>Detalles del Partido</h2>
            <button id="close-modal" class="close-btn">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="modal-game-info">
            <div class="modal-teams">
                <div class="modal-team">
                    <img src="${game.homeTeam.logo}" alt="${game.homeTeam.name}" class="modal-team-logo">
                    <div class="modal-team-info">
                        <h3>${game.homeTeam.name}</h3>
                        <p>${game.homeTeam.city}</p>
                    </div>
                    <div class="modal-team-score">${game.homeScore}</div>
                </div>
                
                <div class="modal-vs">VS</div>
                
                <div class="modal-team">
                    <div class="modal-team-score">${game.awayScore}</div>
                    <div class="modal-team-info">
                        <h3>${game.awayTeam.name}</h3>
                        <p>${game.awayTeam.city}</p>
                    </div>
                    <img src="${game.awayTeam.logo}" alt="${game.awayTeam.name}" class="modal-team-logo">
                </div>
            </div>
            
            <div class="modal-game-details">
                <div class="detail-item">
                    <span class="detail-label">Estado:</span>
                    <span class="detail-value ${getStatusClass(game.status)}">${getStatusText(game.status)}</span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">Liga:</span>
                    <span class="detail-value">${game.league}</span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">Fecha:</span>
                    <span class="detail-value">${formatDate(game.date)}</span>
                </div>
                
                ${game.period ? `
                <div class="detail-item">
                    <span class="detail-label">Período:</span>
                    <span class="detail-value">${game.period}</span>
                </div>
                ` : ''}
                
                ${game.timeRemaining ? `
                <div class="detail-item">
                    <span class="detail-label">Tiempo:</span>
                    <span class="detail-value">${game.timeRemaining}</span>
                </div>
                ` : ''}
                
                <div class="detail-item">
                    <span class="detail-label">Fuente:</span>
                    <span class="detail-value">${game.source}</span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">Última actualización:</span>
                    <span class="detail-value">${formatTime(game.lastUpdate)}</span>
                </div>
            </div>
        </div>
    `;
    
    elements.modalContent.innerHTML = modalHTML;
    elements.modal.style.display = 'block';
    
    // Reconfigurar el botón de cerrar
    const closeBtn = document.getElementById('close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeGameModal);
    }
}

// Cerrar modal
function closeGameModal() {
    if (elements.modal) {
        elements.modal.style.display = 'none';
    }
}

// Configurar actualización automática
function setupAutoUpdate() {
    if (appState.updateInterval) {
        clearInterval(appState.updateInterval);
    }
    
    appState.updateInterval = setInterval(async () => {
        if (!appState.isLoading) {
            console.log('Actualización automática...');
            await loadGames();
        }
    }, SCRAPER_CONFIG.UPDATE_INTERVAL);
}

// Funciones auxiliares
function setActiveFilter(filter) {
    appState.currentFilter = filter;
    elements.filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
}

function filterGames(filter) {
    setActiveFilter(filter);
    applyFilters();
}

function getStatusClass(status) {
    switch (status) {
        case 'live': return 'live';
        case 'finished': return 'finished';
        case 'scheduled': return 'scheduled';
        default: return 'unknown';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'live': return 'En vivo';
        case 'finished': return 'Finalizado';
        case 'scheduled': return 'Programado';
        default: return 'Desconocido';
    }
}

function showLoading(show) {
    if (elements.loading) {
        elements.loading.style.display = show ? 'flex' : 'none';
    }
}

function showError(message) {
    if (elements.errorMessage) {
        elements.errorMessage.textContent = message;
        elements.errorMessage.style.display = 'block';
        
        // Ocultar error después de 5 segundos
        setTimeout(() => {
            hideError();
        }, 5000);
    }
}

function hideError() {
    if (elements.errorMessage) {
        elements.errorMessage.style.display = 'none';
    }
}

function updateLastUpdateTime() {
    if (elements.lastUpdateElement && appState.lastUpdate) {
        elements.lastUpdateElement.textContent = formatTime(appState.lastUpdate);
    }
}

function updateGameCount() {
    if (elements.gameCountElement) {
        elements.gameCountElement.textContent = appState.filteredGames.length;
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

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Exponer funciones globales para uso en HTML
window.showGameDetails = showGameDetails;
window.closeGameModal = closeGameModal;
window.forceRefresh = forceRefresh;
window.filterGames = filterGames;

// Limpiar intervalos al cerrar la página
window.addEventListener('beforeunload', () => {
    if (appState.updateInterval) {
        clearInterval(appState.updateInterval);
    }
}); 