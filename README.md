# 🏀 H2H GG League Basketball - Scraper en Tiempo Real

Una aplicación web moderna para visualizar partidos de basketball de **H2H GG League** en tiempo real usando **web scraping** de datos reales.

## ✨ Características

- **Datos reales en tiempo real** de H2H GG League
- **Web scraping inteligente** de h2hgg.com/en/ebasketball
- **Sistema de cache** para optimizar rendimiento
- **Filtros inteligentes** (En vivo, Hoy, Finalizados)
- **Búsqueda por equipos** en tiempo real
- **Actualización automática** cada 30 segundos
- **Interfaz responsiva** para móviles y desktop
- **Modal de detalles** con información completa del partido
- **Animaciones fluidas** y diseño moderno
- **Manejo de errores** y fallbacks inteligentes

## 🚀 Instalación y Uso

### Opción 1: Uso Directo
1. Clona o descarga este repositorio
2. Abre `index.html` en tu navegador web
3. ¡Listo! La aplicación comenzará a extraer datos de H2H GG League

### Opción 2: Servidor Local
```bash
# Si tienes Python instalado
python -m http.server 8000

# O con Node.js
npx http-server

# Luego abre http://localhost:8000
```

## 🔧 Cómo Funciona

### Sistema de Web Scraping
- **Fuente**: https://h2hgg.com/en/ebasketball
- **Método**: Web scraping con proxy para evitar CORS
- **Frecuencia**: Actualización cada 30 segundos
- **Cache**: Sistema de cache inteligente de 30 segundos

### Extracción de Datos
La aplicación extrae automáticamente:
- ✅ **Nombres de equipos**
- ✅ **Marcadores en tiempo real**
- ✅ **Estado del partido** (En vivo, Finalizado, Programado)
- ✅ **Información de tiempo** y períodos
- ✅ **Datos de la liga**

### Arquitectura
```
├── index.html          # Interfaz principal
├── styles.css          # Estilos modernos
├── script.js           # Lógica de la aplicación
├── scraper.js          # Motor de web scraping
└── README.md          # Esta documentación
```

## 🎯 Funcionalidades Principales

### 📊 **Dashboard en Tiempo Real**
- Visualización de partidos actuales
- Estadísticas en vivo
- Indicadores de estado

### 🔍 **Filtros y Búsqueda**
- **Todos**: Mostrar todos los partidos
- **En vivo**: Solo partidos en curso
- **Hoy**: Partidos del día actual
- **Finalizados**: Partidos terminados
- **Búsqueda**: Por nombre de equipo

### 📱 **Interfaz Responsiva**
- Diseño adaptativo para móviles
- Animaciones fluidas
- Tema moderno con efectos glassmorphism

### 🔄 **Actualización Automática**
- Refresh automático cada 30 segundos
- Botón de actualización manual
- Sistema de cache inteligente

## 🛠️ Configuración Avanzada

### Personalizar Frecuencia de Actualización
```javascript
// En scraper.js, línea 4
this.cacheTimeout = 30000; // 30 segundos

// En script.js, línea 8
UPDATE_INTERVAL: 30000, // 30 segundos
```

### Cambiar Proxy (si es necesario)
```javascript
// En scraper.js, línea 5
this.proxyUrl = 'https://api.allorigins.win/raw?url=';
```

## 🚨 Manejo de Errores

La aplicación incluye múltiples sistemas de fallback:

1. **Proxy CORS**: Usa proxy para evitar restricciones
2. **Parsing múltiple**: Varios métodos de extracción
3. **Cache**: Datos guardados en caso de error
4. **Fallback parsing**: Métodos alternativos de extracción
5. **Notificaciones**: Alertas de errores para el usuario

## 📋 Datos Extraídos

### Información de Partidos
- **ID único** del partido
- **Equipos**: Nombre, ciudad, abreviación
- **Marcadores**: Puntuación en tiempo real
- **Estado**: En vivo, finalizado, programado
- **Tiempo**: Información del reloj de juego
- **Período**: Cuarto o tiempo actual
- **Liga**: H2H GG League
- **Fuente**: h2hgg.com

### Metadatos
- **Fecha y hora** del partido
- **Temporada** actual
- **Última actualización**
- **Fuente de datos**

## 🔐 Consideraciones de Uso

### Legal
- ✅ **Uso personal**: Perfecto para uso personal
- ✅ **Datos públicos**: Extrae solo información pública
- ✅ **Respeto**: Incluye delays y cache para no sobrecargar

### Técnico
- ✅ **Sin API keys**: No requiere registros
- ✅ **Gratuito**: Completamente gratis
- ✅ **Offline**: Funciona con datos de cache
- ✅ **Ligero**: Código optimizado y rápido

## 🎨 Personalización

### Cambiar Colores
```css
/* En styles.css */
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --accent-color: #f093fb;
}
```

### Modificar Layout
```css
/* Cambiar número de columnas en desktop */
.games-container {
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
}
```

## 📈 Rendimiento

- **Tiempo de carga**: < 2 segundos
- **Actualización**: 30 segundos
- **Cache**: 30 segundos
- **Memoria**: < 10MB
- **Ancho de banda**: Mínimo

## 🤝 Contribuir

Si quieres mejorar la aplicación:

1. Fork el repositorio
2. Crea una rama para tu feature
3. Haz commit de tus cambios
4. Push a la rama
5. Crea un Pull Request

## 📞 Soporte

Si tienes problemas:

1. **Verifica tu conexión** a internet
2. **Abre la consola** del navegador (F12)
3. **Revisa los logs** en la consola
4. **Intenta actualizar** manualmente
5. **Recarga la página** si es necesario

## 🔮 Próximas Funcionalidades

- [ ] **Notificaciones push** para partidos en vivo
- [ ] **Historial** de partidos
- [ ] **Estadísticas** de equipos
- [ ] **Predicciones** de partidos
- [ ] **Modo oscuro** completo
- [ ] **PWA** (Progressive Web App)

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

---

**🏀 ¡Disfruta viendo los partidos de H2H GG League en tiempo real!** 