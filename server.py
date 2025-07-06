#!/usr/bin/env python3
"""
Servidor HTTP simple para servir la aplicación H2H GG League Basketball
Esto evita los problemas de CORS que ocurren al abrir archivos HTML directamente
"""

import http.server
import socketserver
import webbrowser
import os
import sys
from pathlib import Path

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Agregar headers CORS para permitir peticiones desde cualquier origen
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

def main():
    # Configuración del servidor
    PORT = 8000
    HOST = 'localhost'
    
    # Cambiar al directorio del script
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print(f"🏀 Servidor H2H GG League Basketball")
    print(f"📁 Directorio: {script_dir}")
    print(f"🌐 Iniciando servidor en http://{HOST}:{PORT}")
    
    try:
        # Crear el servidor
        with socketserver.TCPServer((HOST, PORT), CORSHTTPRequestHandler) as httpd:
            print(f"✅ Servidor ejecutándose en http://{HOST}:{PORT}")
            print(f"📖 Abre tu navegador en: http://{HOST}:{PORT}")
            print(f"🔄 Presiona Ctrl+C para detener el servidor")
            
            # Abrir automáticamente el navegador
            try:
                webbrowser.open(f'http://{HOST}:{PORT}')
                print(f"🚀 Abriendo navegador automáticamente...")
            except Exception as e:
                print(f"⚠️ No se pudo abrir el navegador automáticamente: {e}")
            
            # Ejecutar el servidor
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print(f"\n🛑 Servidor detenido por el usuario")
        sys.exit(0)
    except OSError as e:
        if e.errno == 48:  # Puerto en uso
            print(f"❌ Error: El puerto {PORT} ya está en uso")
            print(f"💡 Intenta cerrar otras aplicaciones que usen el puerto {PORT}")
            print(f"💡 O cambia el puerto en el archivo server.py")
        else:
            print(f"❌ Error al iniciar el servidor: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main() 