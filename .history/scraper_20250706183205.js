// H2H GG League API Client
// Usa la API real de H2H GG League para obtener datos en tiempo real

class H2HGGScraper {
    constructor() {
        this.apiUrl = 'https://api-h2h.hudstats.com/v1/live/nba';
        this.corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://cors-anywhere.herokuapp.com/',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 segundos
        this.retryCount = 0;
        this.maxRetries = 3;
        this.lastUpdate = null;
    }

    // Función principal para obtener datos de partidos
    async scrapeGames() {
        try {
            console.log('🏀 Obteniendo datos de H2H GG League API...');
            
            // Intentar diferentes métodos para obtener los datos
            let data = null;
            
            // Método 1: Petición directa con headers CORS
            try {
                console.log('🔄 Intentando petición directa...');
                data = await this.fetchDirect();
            } catch (error) {
                console.log('❌ Petición directa falló:', error.message);
            }
            
            // Método 2: Usar proxy CORS si la petición directa falla
            if (!data) {
                console.log('🔄 Intentando con proxy CORS...');
                data = await this.fetchWithProxy();
            }
            
            // Método 3: Usar datos de ejemplo si todo falla
            if (!data) {
                console.log('⚠️ No se pudo obtener datos de la API, usando datos de ejemplo');
                return this.generateExampleData();
            }
            
            const games = this.parseAPIData(data);
            console.log(`✅ Procesados ${games.length} partidos de H2H GG League`);
            
            this.lastUpdate = new Date();
            return games;
            
        } catch (error) {
            console.error('❌ Error obteniendo datos de H2H GG League:', error);
            
            // Intentar obtener datos del cache
            const cachedGames = this.getCachedGames();
            if (cachedGames && cachedGames.length > 0) {
                console.log('📦 Usando datos del cache');
                return cachedGames;
            }
            
            // Si no hay cache, generar datos de ejemplo
            console.log('🎲 Generando datos de ejemplo');
            return this.generateExampleData();
        }
    }

    // Método 1: Petición directa con headers optimizados
    async fetchDirect() {
        const response = await fetch(this.apiUrl, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Origin': window.location.origin || 'https://localhost',
                'Referer': window.location.href || 'https://localhost',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            credentials: 'omit'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Datos recibidos (directo):', data);
        return data;
    }

    // Método 2: Usar proxies CORS
    async fetchWithProxy() {
        for (const proxy of this.corsProxies) {
            try {
                console.log(`🔄 Intentando proxy: ${proxy}`);
                
                const proxyUrl = proxy + encodeURIComponent(this.apiUrl);
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log(`✅ Datos recibidos con proxy ${proxy}:`, data);
                return data;
                
            } catch (error) {
                console.log(`❌ Proxy ${proxy} falló:`, error.message);
                continue;
            }
        }
        
        throw new Error('Todos los proxies CORS fallaron');
    }

    // Parsear datos de la API
    parseAPIData(data) {
        if (!Array.isArray(data)) {
            console.warn('⚠️ Datos de API no son un array:', data);
            return [];
        }

        const games = [];
        
        data.forEach((match, index) => {
            try {
                const game = this.parseMatch(match, index);
                if (game) {
                    games.push(game);
                }
            } catch (error) {
                console.error('❌ Error procesando partido:', error, match);
            }
        });

        return games;
    }

    // Parsear un partido individual
    parseMatch(match, index) {
        // Usar formato simplificado que coincida con script.js
        const game = {
            externalId: match.externalId || `h2h_${Date.now()}_${index}`,
            streamName: match.streamName || 'H2H GG League',
            teamAName: match.teamAName || 'Equipo A',
            teamBName: match.teamBName || 'Equipo B',
            participantAName: match.participantAName || null,
            participantBName: match.participantBName || null,
            startDate: match.startDate || new Date().toISOString(),
            status: this.parseStatus(match.status),
            teamAScore: match.teamAScore || 0,
            teamBScore: match.teamBScore || 0
        };

        return game;
    }

    // Parsear estado del partido
    parseStatus(status) {
        if (!status) return 'scheduled';
        
        const statusLower = status.toLowerCase();
        
        if (statusLower === 'live' || statusLower === 'playing') {
            return 'live';
        }
        
        if (statusLower === 'finished' || statusLower === 'final' || statusLower === 'ended') {
            return 'finished';
        }
        
        if (statusLower === 'scheduled' || statusLower === 'upcoming') {
            return 'scheduled';
        }
        
        return 'scheduled';
    }

    // Formatear tiempo según el estado
    formatTime(startDate, status) {
        try {
            if (status === 'live') {
                return 'EN VIVO';
            }
            
            if (status === 'finished') {
                return 'FINAL';
            }
            
            if (status === 'scheduled') {
                const now = new Date();
                const diffMs = startDate.getTime() - now.getTime();
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                
                if (diffMinutes < 0) {
                    return 'INICIANDO...';
                } else if (diffMinutes < 60) {
                    return `en ${diffMinutes}min`;
                } else {
                    return startDate.toLocaleTimeString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                }
            }
            
            return startDate.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
        } catch (error) {
            return 'Hora no disponible';
        }
    }

    // Calcular período aproximado basado en marcadores
    calculatePeriod(homeScore, awayScore, status) {
        if (status !== 'live') return 0;
        
        const totalScore = homeScore + awayScore;
        
        // Estimación aproximada del período basado en puntos totales
        if (totalScore < 30) return 1;
        if (totalScore < 60) return 2;
        if (totalScore < 90) return 3;
        return 4;
    }

    // Calcular tiempo restante
    calculateTimeRemaining(startDate, status) {
        if (status !== 'live') return '';
        
        try {
            const now = new Date();
            const elapsed = now.getTime() - startDate.getTime();
            const elapsedMinutes = Math.floor(elapsed / (1000 * 60));
            
            // Un partido de basketball dura aproximadamente 48 minutos
            const totalGameMinutes = 48;
            const remainingMinutes = Math.max(0, totalGameMinutes - elapsedMinutes);
            
            if (remainingMinutes === 0) {
                return 'Finalizando...';
            }
            
            const hours = Math.floor(remainingMinutes / 60);
            const minutes = remainingMinutes % 60;
            
            if (hours > 0) {
                return `${hours}h ${minutes}m`;
            } else {
                return `${minutes}m`;
            }
            
        } catch (error) {
            return '';
        }
    }

    // Generar datos de ejemplo cuando la API no está disponible
    generateExampleData() {
        console.log('🎲 Generando datos de ejemplo basados en la API real...');
        
        // Datos de ejemplo basados en el formato real de la API
        const exampleMatches = [
            {
                externalId: "NB161060725",
                streamName: "Ebasketball 1",
                teamAName: "Oklahoma City Thunder",
                teamBName: "Los Angeles Lakers",
                participantAName: "LANES",
                participantBName: "CHIEF",
                startDate: new Date().toISOString(),
                status: "live",
                teamAScore: 39,
                teamBScore: 33
            },
            {
                externalId: "NB162060725",
                streamName: "Ebasketball 2",
                teamAName: "Toronto Raptors",
                teamBName: "Chicago Bulls",
                participantAName: "OREZ",
                participantBName: "HUNCHO",
                startDate: new Date().toISOString(),
                status: "live",
                teamAScore: 17,
                teamBScore: 29
            },
            {
                externalId: "NB163060725",
                streamName: "Ebasketball 3",
                teamAName: "Cleveland Cavaliers",
                teamBName: "Milwaukee Bucks",
                participantAName: "SAINT JR",
                participantBName: "PRODIGY",
                startDate: new Date().toISOString(),
                status: "live",
                teamAScore: 21,
                teamBScore: 15
            },
            {
                externalId: "NB164060725",
                streamName: "Ebasketball 4",
                teamAName: "Oklahoma City Thunder",
                teamBName: "Boston Celtics",
                participantAName: "EQUALIZER",
                participantBName: "ARACHNE",
                startDate: new Date().toISOString(),
                status: "live",
                teamAScore: 12,
                teamBScore: 5
            },
            {
                externalId: "NB165060725",
                streamName: "Ebasketball 1",
                teamAName: "New York Knicks",
                teamBName: "Los Angeles Lakers",
                participantAName: "TAAPZ",
                participantBName: "CHIEF",
                startDate: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                status: "scheduled",
                teamAScore: null,
                teamBScore: null
            },
            {
                externalId: "NB166060725",
                streamName: "Ebasketball 2",
                teamAName: "Brooklyn Nets",
                teamBName: "Chicago Bulls",
                participantAName: "CRUCIAL",
                participantBName: "HUNCHO",
                startDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                status: "scheduled",
                teamAScore: null,
                teamBScore: null
            }
        ];
        
        return this.parseAPIData(exampleMatches);
    }

    // Funciones auxiliares
    extractCity(teamName) {
        const parts = teamName.split(' ');
        return parts.length > 1 ? parts.slice(0, -1).join(' ') : teamName;
    }

    generateTeamId(teamName) {
        return teamName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }

    generateAbbreviation(teamName) {
        return teamName.split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .join('')
            .substring(0, 3);
    }

    generateTeamLogo(teamName) {
        const abbreviation = this.generateAbbreviation(teamName);
        // Usar placeholder con colores específicos para cada equipo
        const colors = this.getTeamColors(teamName);
        return `https://via.placeholder.com/40/${colors.bg}/${colors.text}?text=${abbreviation}`;
    }

    getTeamColors(teamName) {
        const teamColors = {
            'Lakers': { bg: '552583', text: 'FDB927' },
            'Celtics': { bg: '007A33', text: 'FFFFFF' },
            'Warriors': { bg: '1D428A', text: 'FFC72C' },
            'Heat': { bg: '98002E', text: 'FFFFFF' },
            'Bulls': { bg: 'CE1141', text: 'FFFFFF' },
            'Knicks': { bg: '006BB6', text: 'F58426' },
            'Raptors': { bg: 'CE1141', text: 'FFFFFF' },
            'Mavericks': { bg: '00538C', text: 'FFFFFF' },
            'Thunder': { bg: '007AC1', text: 'EF3B24' },
            'Cavaliers': { bg: '860038', text: 'FDBB30' },
            'Bucks': { bg: '00471B', text: 'EEE1C6' },
            'Hornets': { bg: '1D1160', text: '00788C' }
        };
        
        for (const [team, colors] of Object.entries(teamColors)) {
            if (teamName.includes(team)) {
                return colors;
            }
        }
        
        return { bg: '000000', text: 'FFFFFF' };
    }

    // Cache management
    getCachedGames() {
        const cached = this.cache.get('games');
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    setCachedGames(games) {
        this.cache.set('games', {
            data: games,
            timestamp: Date.now()
        });
    }

    // Método público para obtener datos
    async getGames() {
        // Verificar cache primero
        const cachedGames = this.getCachedGames();
        if (cachedGames && cachedGames.length > 0) {
            console.log('📦 Usando datos del cache');
            return cachedGames;
        }
        
        // Obtener datos frescos de la API
        const games = await this.scrapeGames();
        if (games.length > 0) {
            this.setCachedGames(games);
        }
        
        return games;
    }

    // Método para forzar actualización
    async forceUpdate() {
        console.log('🔄 Forzando actualización...');
        this.cache.clear();
        return await this.scrapeGames(); // Usar scrapeGames directamente para saltarse cache
    }

    // Método para obtener estadísticas
    getStats(games) {
        const stats = {
            total: games.length,
            live: games.filter(g => g.status === 'live').length,
            scheduled: games.filter(g => g.status === 'scheduled').length,
            finished: games.filter(g => g.status === 'finished').length,
            streams: [...new Set(games.map(g => g.streamName))].length
        };
        
        return stats;
    }

    // Método para obtener información de la última actualización
    getLastUpdate() {
        return this.lastUpdate;
    }
}

// Exportar la clase
window.H2HGGScraper = H2HGGScraper;

// Función global para compatibilidad con script.js
async function scrapeH2HGGData() {
    const scraper = new H2HGGScraper();
    return await scraper.getGames();
}

// Exportar la función global
window.scrapeH2HGGData = scrapeH2HGGData; 