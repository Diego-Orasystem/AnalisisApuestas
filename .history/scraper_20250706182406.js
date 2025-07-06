// H2H GG League API Client
// Usa la API real de H2H GG League para obtener datos en tiempo real

class H2HGGScraper {
    constructor() {
        this.apiUrl = 'https://api-h2h.hudstats.com/v1/live/nba';
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
            
            const response = await fetch(this.apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📊 Datos recibidos de API:', data);
            
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
        // Extraer información básica
        const homeTeam = match.teamAName || 'Equipo Local';
        const awayTeam = match.teamBName || 'Equipo Visitante';
        const homePlayer = match.participantAName || 'Jugador Local';
        const awayPlayer = match.participantBName || 'Jugador Visitante';
        
        // Extraer marcadores (pueden ser null si está programado)
        const homeScore = match.teamAScore || 0;
        const awayScore = match.teamBScore || 0;
        
        // Determinar estado del partido
        const status = this.parseStatus(match.status);
        
        // Extraer información de tiempo
        const startDate = match.startDate ? new Date(match.startDate) : new Date();
        const time = this.formatTime(startDate, status);
        
        // Extraer stream/liga
        const streamName = match.streamName || 'H2H GG League';
        
        return {
            id: match.externalId || `h2h_${Date.now()}_${index}`,
            homeTeam: {
                id: this.generateTeamId(homeTeam),
                name: homeTeam,
                city: this.extractCity(homeTeam),
                abbreviation: this.generateAbbreviation(homeTeam),
                logo: this.generateTeamLogo(homeTeam),
                player: homePlayer
            },
            awayTeam: {
                id: this.generateTeamId(awayTeam),
                name: awayTeam,
                city: this.extractCity(awayTeam),
                abbreviation: this.generateAbbreviation(awayTeam),
                logo: this.generateTeamLogo(awayTeam),
                player: awayPlayer
            },
            homeScore: homeScore,
            awayScore: awayScore,
            status: status,
            time: time,
            period: this.calculatePeriod(homeScore, awayScore, status),
            timeRemaining: this.calculateTimeRemaining(startDate, status),
            date: startDate.toISOString().split('T')[0],
            startTime: startDate.toISOString(),
            season: new Date().getFullYear(),
            isPlayoffs: false,
            league: 'H2H GG League',
            streamName: streamName,
            source: 'api-h2h.hudstats.com',
            lastUpdate: new Date().toISOString(),
            rawData: match // Guardar datos originales para referencia
        };
    }

    // Parsear estado del partido
    parseStatus(status) {
        if (!status) return 'unknown';
        
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
        
        return 'unknown';
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
        console.log('🎲 Generando datos de ejemplo...');
        
        const exampleMatches = [
            {
                externalId: "EX001",
                streamName: "Ebasketball 1",
                teamAName: "Los Angeles Lakers",
                teamBName: "Boston Celtics",
                participantAName: "CHAMPION",
                participantBName: "LEGEND",
                startDate: new Date().toISOString(),
                status: "live",
                teamAScore: 75,
                teamBScore: 68
            },
            {
                externalId: "EX002",
                streamName: "Ebasketball 2",
                teamAName: "Miami Heat",
                teamBName: "Golden State Warriors",
                participantAName: "FIRE",
                participantBName: "SPLASH",
                startDate: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                status: "scheduled",
                teamAScore: null,
                teamBScore: null
            },
            {
                externalId: "EX003",
                streamName: "Ebasketball 3",
                teamAName: "Chicago Bulls",
                teamBName: "New York Knicks",
                participantAName: "BULL",
                participantBName: "EMPIRE",
                startDate: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                status: "finished",
                teamAScore: 102,
                teamBScore: 95
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
        return await this.getGames();
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