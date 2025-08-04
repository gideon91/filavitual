// ==================== SISTEMA DE FONDO DE PANTALLA ====================
// Este archivo se encarga de aplicar el fondo de pantalla guardado en todas las páginas

// Función para aplicar el fondo guardado
function aplicarFondoGuardado() {
    const fondoData = localStorage.getItem('fondoSistema');
    if (fondoData) {
        try {
            const fondo = JSON.parse(fondoData);
            const bgFondo = document.querySelector('.bg-fondo-cesun');
            if (bgFondo) {
                bgFondo.style.backgroundImage = `url(${fondo.imageData})`;
                console.log('Fondo aplicado:', fondo.fileName);
                return true;
            } else {
                console.log('Elemento .bg-fondo-cesun no encontrado en esta página');
            }
        } catch (error) {
            console.error('Error al aplicar el fondo:', error);
        }
    } else {
        console.log('No hay fondo guardado en localStorage');
    }
    return false;
}

// Función para escuchar cambios en el fondo
function escucharCambiosFondo() {
    // Escuchar cambios en localStorage
    window.addEventListener('storage', function(e) {
        if (e.key === 'fondoSistema') {
            console.log('Fondo cambiado, aplicando nuevo fondo...');
            setTimeout(aplicarFondoGuardado, 100);
        }
        
        // Escuchar eventos globales
        if (e.key === 'eventoGlobal') {
            try {
                const evento = JSON.parse(e.newValue);
                if (evento.tipo === 'fondoCambiado') {
                    console.log('Evento de cambio de fondo recibido');
                    setTimeout(aplicarFondoGuardado, 100);
                }
            } catch (error) {
                console.error('Error al procesar evento global:', error);
            }
        }
    });
}

// Función para escuchar eventos del sistema de eventos
function escucharEventosFondo() {
    if (typeof eventSystem !== 'undefined') {
        eventSystem.on('fondoCambiado', function(data) {
            console.log('Evento de cambio de fondo recibido:', data.fileName);
            setTimeout(aplicarFondoGuardado, 100);
        });
    }
}

// Aplicar fondo al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('Aplicando fondo de pantalla...');
    // Intentar aplicar el fondo inmediatamente
    let aplicado = aplicarFondoGuardado();
    
    // Si no se aplicó, intentar de nuevo después de un breve delay
    if (!aplicado) {
        setTimeout(() => {
            console.log('Reintentando aplicar fondo...');
            aplicarFondoGuardado();
        }, 500);
    }
    
    escucharCambiosFondo();
    escucharEventosFondo();
});

// También aplicar inmediatamente si el DOM ya está cargado
if (document.readyState === 'loading') {
    // El DOM aún se está cargando
} else {
    // El DOM ya está cargado
    console.log('DOM ya cargado, aplicando fondo inmediatamente');
    aplicarFondoGuardado();
    escucharCambiosFondo();
    escucharEventosFondo();
}

// Exportar funciones para uso global
window.aplicarFondoGuardado = aplicarFondoGuardado;
window.escucharCambiosFondo = escucharCambiosFondo;
window.escucharEventosFondo = escucharEventosFondo; 