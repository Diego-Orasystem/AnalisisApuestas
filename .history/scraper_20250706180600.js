// Scraper para H2H GG League Basketball
// Este archivo maneja la extracción de datos desde la página web

class H2HGGScraper {
    constructor() {
        this.baseUrl = 'https://h2hgg.com/en/ebasketball';
        this.proxyUrl = 'https://api.allorigins.win/raw?url='; // Proxy para evitar CORS
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 segundos
    }

    // Función principal para obtener datos de partidos
    async scrapeGames() {
        try {
            console.log('Iniciando scraping de H2H GG League...');
            
            // Usar proxy para evitar problemas de CORS
            const url = this.proxyUrl + encodeURIComponent(this.baseUrl);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const html = await response.text();
            const games = this.parseHTML(html);
            
            console.log(`Scraped ${games.length} games from H2H GG League`);
            return games;
            
        } catch (error) {
            console.error('Error scraping H2H GG League:', error);
            // Retornar datos de cache si están disponibles
            return this.getCachedGames();
        }
    }

    // Parsear el HTML y extraer datos de partidos
    parseHTML(html) {
        // Crear un parser DOM temporal
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const games = [];
        
        try {
            // Buscar contenedores de partidos (ajustar selectores según la estructura real)
            const gameContainers = doc.querySelectorAll('.game-container, .match-item, .live-game, [class*="game"], [class*="match"]');
            
            gameContainers.forEach((container, index) => {
                const game = this.extractGameData(container, index);
                if (game) {
                    games.push(game);
                }
            });
            
            // Si no encuentra con los selectores principales, intentar método alternativo
            if (games.length === 0) {
                return this.fallbackParsing(doc);
            }
            
        } catch (error) {
            console.error('Error parsing HTML:', error);
        }
        
        return games;
    }

    // Extraer datos de un contenedor de partido individual
    extractGameData(container, index) {
        try {
            // Buscar equipos
            const teamElements = container.querySelectorAll('[class*="team"], .player-name, .team-name');
            const scoreElements = container.querySelectorAll('[class*="score"], .score, .points');
            const statusElements = container.querySelectorAll('[class*="status"], .live, .finished, [class*="time"]');
            
            // Extraer nombres de equipos
            let homeTeam = 'Equipo Local';
            let awayTeam = 'Equipo Visitante';
            
            if (teamElements.length >= 2) {
                homeTeam = this.cleanText(teamElements[0].textContent);
                awayTeam = this.cleanText(teamElements[1].textContent);
            }
            
            // Extraer marcadores
            let homeScore = 0;
            let awayScore = 0;
            
            if (scoreElements.length >= 2) {
                homeScore = this.extractNumber(scoreElements[0].textContent);
                awayScore = this.extractNumber(scoreElements[1].textContent);
            }
            
            // Determinar estado del partido
            const status = this.determineGameStatus(container, statusElements);
            
            // Extraer tiempo/período si está disponible
            const timeInfo = this.extractTimeInfo(container);
            
            return {
                id: `h2h_${Date.now()}_${index}`,
                homeTeam: {
                    id: this.generateTeamId(homeTeam),
                    name: homeTeam,
                    city: this.extractCity(homeTeam),
                    abbreviation: this.generateAbbreviation(homeTeam),
                    logo: this.generateTeamLogo(homeTeam)
                },
                awayTeam: {
                    id: this.generateTeamId(awayTeam),
                    name: awayTeam,
                    city: this.extractCity(awayTeam),
                    abbreviation: this.generateAbbreviation(awayTeam),
                    logo: this.generateTeamLogo(awayTeam)
                },
                homeScore: homeScore,
                awayScore: awayScore,
                status: status,
                time: timeInfo.time,
                period: timeInfo.period,
                timeRemaining: timeInfo.remaining,
                date: new Date().toISOString().split('T')[0],
                season: new Date().getFullYear(),
                isPlayoffs: false,
                league: 'H2H GG League',
                source: 'h2hgg.com',
                lastUpdate: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Error extracting game data:', error);
            return null;
        }
    }

    // Método de parsing alternativo si el principal falla
    fallbackParsing(doc) {
        const games = [];
        
        try {
            // Buscar texto que contenga nombres de equipos conocidos
            const textContent = doc.body.textContent || '';
            const lines = textContent.split('\n').filter(line => line.trim());
            
            // Buscar patrones que parezcan partidos
            const gamePattern = /(\w+)\s+(\d+)\s*-\s*(\d+)\s+(\w+)/g;
            let match;
            let index = 0;
            
            while ((match = gamePattern.exec(textContent)) !== null && index < 10) {
                const [, team1, score1, score2, team2] = match;
                
                games.push({
                    id: `h2h_fallback_${Date.now()}_${index}`,
                    homeTeam: {
                        id: this.generateTeamId(team1),
                        name: team1,
                        city: team1,
                        abbreviation: this.generateAbbreviation(team1),
                        logo: this.generateTeamLogo(team1)
                    },
                    awayTeam: {
                        id: this.generateTeamId(team2),
                        name: team2,
                        city: team2,
                        abbreviation: this.generateAbbreviation(team2),
                        logo: this.generateTeamLogo(team2)
                    },
                    homeScore: parseInt(score1),
                    awayScore: parseInt(score2),
                    status: 'live',
                    time: 'En vivo',
                    period: 1,
                    timeRemaining: '',
                    date: new Date().toISOString().split('T')[0],
                    season: new Date().getFullYear(),
                    isPlayoffs: false,
                    league: 'H2H GG League',
                    source: 'h2hgg.com',
                    lastUpdate: new Date().toISOString()
                });
                
                index++;
            }
            
        } catch (error) {
            console.error('Error in fallback parsing:', error);
        }
        
        return games;
    }

    // Determinar el estado del partido
    determineGameStatus(container, statusElements) {
        const containerText = container.textContent.toLowerCase();
        
        if (containerText.includes('live') || containerText.includes('en vivo') || 
            containerText.includes('playing') || containerText.includes('jugando')) {
            return 'live';
        }
        
        if (containerText.includes('finished') || containerText.includes('final') || 
            containerText.includes('terminado') || containerText.includes('finalizado')) {
            return 'finished';
        }
        
        if (containerText.includes('scheduled') || containerText.includes('programado') || 
            containerText.includes('upcoming') || containerText.includes('próximo')) {
            return 'scheduled';
        }
        
        // Por defecto, asumir que está en vivo si hay marcadores
        return 'live';
    }

    // Extraer información de tiempo/período
    extractTimeInfo(container) {
        const timeInfo = {
            time: 'En vivo',
            period: 1,
            remaining: ''
        };
        
        try {
            const timeText = container.textContent;
            
            // Buscar patrones de tiempo
            const timePattern = /(\d{1,2}:\d{2})/;
            const periodPattern = /(\d+)(?:st|nd|rd|th|°)?\s*(?:quarter|period|cuarto|período)/i;
            
            const timeMatch = timeText.match(timePattern);
            if (timeMatch) {
                timeInfo.time = timeMatch[1];
                timeInfo.remaining = timeMatch[1];
            }
            
            const periodMatch = timeText.match(periodPattern);
            if (periodMatch) {
                timeInfo.period = parseInt(periodMatch[1]);
            }
            
        } catch (error) {
            console.error('Error extracting time info:', error);
        }
        
        return timeInfo;
    }

    // Funciones auxiliares
    cleanText(text) {
        return text ? text.trim().replace(/\s+/g, ' ') : '';
    }

    extractNumber(text) {
        const match = text.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    }

    extractCity(teamName) {
        // Intentar extraer ciudad del nombre del equipo
        const parts = teamName.split(' ');
        return parts.length > 1 ? parts[0] : teamName;
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
        return `https://via.placeholder.com/40/000000/FFFFFF?text=${abbreviation}`;
    }

    // Cache management
    getCachedGames() {
        const cached = this.cache.get('games');
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        return [];
    }

    setCachedGames(games) {
        this.cache.set('games', {
            data: games,
            timestamp: Date.now()
        });
    }

    // Método público para obtener datos con cache
    async getGames() {
        // Verificar cache primero
        const cachedGames = this.getCachedGames();
        if (cachedGames.length > 0) {
            return cachedGames;
        }
        
        // Si no hay cache, hacer scraping
        const games = await this.scrapeGames();
        if (games.length > 0) {
            this.setCachedGames(games);
        }
        
        return games;
    }

    // Método para forzar actualización
    async forceUpdate() {
        this.cache.clear();
        return await this.getGames();
    }
}

// Exportar la clase para uso en otros archivos
window.H2HGGScraper = H2HGGScraper; 