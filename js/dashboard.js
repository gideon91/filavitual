// Funciones específicas para dashboard.html
let updateInterval;

// Función para actualizar el reloj
function actualizarReloj() {
    const ahora = new Date();
    const horaFormateada = ahora.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const horaElement = document.getElementById('horaActual');
    if (horaElement) {
        horaElement.textContent = horaFormateada;
    }
}

// Función para actualizar el dashboard completo
// Función para verificar estado completo del dashboard
function verificarEstadoDashboard() {
    console.log('=== VERIFICACIÓN COMPLETA DEL DASHBOARD ===');
    
    // 1. Verificar base de datos
    console.log('1. Base de datos:');
    console.log('- db existe:', typeof db !== 'undefined');
    if (typeof db !== 'undefined') {
        console.log('- Total turnos:', db.turnos.length);
        console.log('- Turnos en espera:', db.getTurnosEnEspera().length);
        console.log('- Casillas:', db.getCasillas().length);
    }
    
    // 2. Verificar elementos DOM
    console.log('2. Elementos DOM:');
    const elementos = [
        'casillasContainer',
        'proximosTurnosContainer',
        'serviciosStatusContainer'
    ];
    
    elementos.forEach(id => {
        const elemento = document.getElementById(id);
        console.log(`- ${id}:`, elemento ? 'EXISTE' : 'NO EXISTE');
        if (elemento) {
            console.log(`  - Tipo:`, elemento.tagName);
            console.log(`  - Contenido:`, elemento.innerHTML.substring(0, 100) + '...');
        }
    });
    
    // 3. Verificar funciones
    console.log('3. Funciones disponibles:');
    const funciones = [
        'actualizarDashboard',
        'actualizarEstadoServicios',
        'formatTime',
        'calcularTiempoEspera'
    ];
    
    funciones.forEach(func => {
        const disponible = typeof window[func] === 'function';
        console.log(`- ${func}:`, disponible ? 'DISPONIBLE' : 'NO DISPONIBLE');
    });
    
    // 4. Verificar localStorage
    console.log('4. localStorage:');
    const eventoGlobal = localStorage.getItem('eventoGlobal');
    console.log('- eventoGlobal:', eventoGlobal ? 'PRESENTE' : 'VACÍO');
    if (eventoGlobal) {
        try {
            const evento = JSON.parse(eventoGlobal);
            console.log('- Último evento:', evento);
        } catch (e) {
            console.log('- Error al parsear evento:', e);
        }
    }
    
    console.log('=== FIN VERIFICACIÓN COMPLETA DEL DASHBOARD ===');
}

function actualizarDashboard() {
    console.log('=== ACTUALIZAR DASHBOARD ===');
    
    const casillas = db.getCasillas();
    // Filtrar solo casillas activas
    const casillasActivas = casillas.filter(casilla => casilla.activa !== false);
    const turnosEnEspera = db.getTurnosEnEspera();
    
    console.log('Casillas activas:', casillasActivas.length);
    console.log('Turnos en espera:', turnosEnEspera.length);
    
    // Actualizar casillas en atención
    const containerCasillas = document.getElementById('casillasContainer');
    let casillasHTML = '';
    
    if (casillasActivas.length === 0) {
        casillasHTML = `
            <div class="text-center text-muted py-5">
                <div class="d-flex flex-column align-items-center">
                    <i class="fas fa-door-open fa-3x mb-3 text-muted"></i>
                    <h4 class="text-muted">No hay casillas activas</h4>
                    <p class="text-muted mb-0">Las casillas aparecerán aquí cuando estén configuradas y activas</p>
                    <div class="mt-3">
                        <small class="text-muted">
                            Total de casillas en BD: ${casillas.length} | 
                            Casillas activas: ${casillasActivas.length}
                        </small>
                    </div>
                </div>
                </div>
                `;
    } else {
        casillasActivas.forEach((casilla, i) => {
            const turno = db.getTurnoActual(casilla.id);
            const isBusy = casilla.estado === 'ocupada';
            const servicioNombre = turno ? db.getServicio(turno.servicio)?.nombre : null;
            
            let icono = '<i class="fas fa-user-circle icon" style="font-size:2.2rem;color:#1976d2;"></i>';
            if (casilla.nombre.toLowerCase().includes('casilla')) {
                icono = '<i class="fas fa-door-open icon" style="font-size:2.2rem;color:#1976d2;"></i>';
            }
            
            let moduloHTML = `
            <div class="module ${i < 4 ? 'module-left-height' : 'module-right-height'}${isBusy ? ' active' : ''}">
                <div style="display:flex;align-items:center;gap:12px;justify-content:center;width:100%;margin-bottom:0.5em;">
                    ${icono}
                    <h3 style="margin-bottom:0;">${casilla.nombre}</h3>
                </div>
                <div class="status">${isBusy ? 'Ocupada' : 'Disponible'}</div>
                <div class='datos-casilla'>
                    <span><span class='dato-label'>Turno:</span> ${turno ? turno.numero : '-'}</span>
                    <span><span class='dato-label'>Nombre:</span> ${turno ? (turno.nombre || '-') : '-'}</span>
                    <span><span class='dato-label'>Correo:</span> ${turno ? turno.email : '-'}</span>
                    <span><span class='dato-label'>Servicio:</span> ${servicioNombre || '-'}</span>
            </div>
            </div>
        `;
            
            casillasHTML += moduloHTML;
        });
    }
    
    if (containerCasillas) {
        containerCasillas.innerHTML = casillasHTML;
        console.log('Casillas actualizadas');
    }

    // Actualizar estado de servicios
    actualizarEstadoServicios();

    // Actualizar próximos turnos
    const containerTurnos = document.getElementById('proximosTurnosContainer');
    let turnosHTML = '';
    
    if (turnosEnEspera.length === 0) {
        turnosHTML = `
            <div class="text-center text-muted py-4">
                <div class="d-flex flex-column align-items-center">
                    <i class="fas fa-check-circle fa-2x mb-3 text-muted"></i>
                    <h6 class="text-muted">No hay turnos en espera</h6>
                    <p class="text-muted mb-0">Todos los turnos han sido atendidos</p>
                </div>
                </div>
        `;
    } else {
        turnosEnEspera.slice(0, 10).forEach(turno => {
            const servicio = db.getServicio(turno.servicio);
            const horaCreacion = turno.fechaCreacion ? formatTime(turno.fechaCreacion) : '--:--';
            const tiempoEspera = turno.fechaCreacion ? calcularTiempoEspera(turno.fechaCreacion) : '';
            
            turnosHTML += `
            <div class="ticket fade-in">
                <div class="ticket-number">${turno.numero}</div>
                <div class="ticket-info">
                    <div class="ticket-name">${turno.nombre || 'Sin nombre'}</div>
                    <div class="ticket-service">${servicio ? servicio.nombre : 'Servicio no disponible'}</div>
                <div class="ticket-time">
                        <small class="text-muted">
                            <i class="fas fa-clock me-1"></i>${horaCreacion}
                            ${tiempoEspera ? `<span class="ms-2 badge bg-warning">${tiempoEspera}</span>` : ''}
                        </small>
                    </div>
                </div>
                <div class="ticket-priority">
                    ${turnosEnEspera.indexOf(turno) === 0 ? 
                        '<span class="badge bg-success"><i class="fas fa-star"></i> Siguiente</span>' : 
                        '<span class="badge bg-secondary">En espera</span>'
                    }
                </div>
            </div>
        `;
        });
    }
    
    if (containerTurnos) {
        containerTurnos.innerHTML = turnosHTML;
        console.log('Próximos turnos actualizados');
    }
    
    // Actualizar contador de turnos en espera
    const headerTurnos = document.querySelector('.ticket-list-header');
    if (headerTurnos) {
        const contadorSpan = headerTurnos.querySelector('.contador-turnos');
        if (contadorSpan) {
            contadorSpan.textContent = `(${turnosEnEspera.length})`;
        } else {
            // Agregar contador si no existe
            const span = document.createElement('span');
            span.className = 'contador-turnos';
            span.textContent = `(${turnosEnEspera.length})`;
            span.style.cssText = 'color: var(--cesun-blue); font-weight: 600; margin-left: 8px;';
            headerTurnos.appendChild(span);
        }
    }
    
    console.log('=== FIN ACTUALIZAR DASHBOARD ===');
}

// Función para formatear tiempo
function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Función para calcular tiempo de espera
function calcularTiempoEspera(fechaHora) {
    const ahora = new Date();
    const fechaTurno = new Date(fechaHora);
    const diferencia = ahora - fechaTurno;
    
    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(minutos / 60);
    
    if (horas > 0) {
        return `${horas}h ${minutos % 60}m`;
    } else if (minutos > 0) {
        return `${minutos}m`;
    } else {
        return 'Ahora';
    }
}

// Función para hacer la actualización disponible globalmente
window.actualizarDashboard = actualizarDashboard;

// Función para mostrar notificaciones en el dashboard
function showDashboardNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1100;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    let icon;
    switch(type) {
        case 'success': icon = 'check-circle'; break;
        case 'danger': icon = 'exclamation-circle'; break;
        case 'warning': icon = 'exclamation-triangle'; break;
        default: icon = 'info-circle';
    }
    
    notification.innerHTML = `
        <i class="fas fa-${icon} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remover después de 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 150);
    }, 3000);
}

// Configurar eventos de teclado para el dashboard
function configurarEventosTeclado() {
    document.addEventListener('keydown', function(event) {
        // F5 para actualizar manualmente
        if (event.key === 'F5') {
            event.preventDefault();
            actualizarDashboard();
            showDashboardNotification('Dashboard actualizado manualmente', 'info');
        }
        
        // F11 para pantalla completa
        if (event.key === 'F11') {
            event.preventDefault();
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }
        
        // ESC para salir de pantalla completa
        if (event.key === 'Escape' && document.fullscreenElement) {
            document.exitFullscreen();
        }
    });
}

// Función para configurar el modo pantalla completa automático
function configurarPantallaCompleta() {
    // Intentar entrar en pantalla completa automáticamente
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('No se pudo entrar en pantalla completa automáticamente:', err);
        });
    }
}

// Inicialización del dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard cargado - Iniciando sistema de actualizaciones');
    console.log('DB disponible:', typeof db !== 'undefined');
    console.log('EventSystem disponible:', typeof eventSystem !== 'undefined');
    
    // Actualizar reloj inmediatamente
    actualizarReloj();
    
    // Actualizar dashboard inmediatamente
    console.log('Llamando a actualizarDashboard...');
    actualizarDashboard();
    
    // Verificar estado de la base de datos
    setTimeout(() => {
        verificarEstadoBD();
    }, 1000);
    
    // Iniciar actualizaciones automáticas más frecuentes
    setInterval(() => {
        actualizarReloj();
    }, 1000);
    
    // Actualizar dashboard cada 2 segundos para mejor respuesta
    setInterval(() => {
        actualizarDashboard();
    }, 2000);
    
    // Configurar listener para evento personalizado de turno generado
    window.addEventListener('turnoGenerado', function(event) {
        console.log('🎯 Evento turnoGenerado recibido en dashboard:', event.detail);
        actualizarDashboard();
        showDashboardNotification(`Nuevo turno ${event.detail.turno.numero} generado`, 'success');
    });
    
    // Configurar listener para eventos de localStorage
    window.addEventListener('storage', function(e) {
        if (e.key === 'eventoGlobal') {
            try {
                const evento = JSON.parse(e.newValue);
                console.log('🔄 Evento localStorage recibido en dashboard:', evento);
                
                if (evento.tipo === 'dataChanged' && evento.data && evento.data.tipo === 'turnoGenerado') {
                    console.log('🔄 Actualizando dashboard por evento localStorage');
                    console.log('🔄 Datos del evento:', evento.data);
                    
                    // Verificación completa antes de actualizar
                    verificarEstadoDashboard();
                    
                    // Actualizar dashboard
                    actualizarDashboard();
                    showDashboardNotification(`Nuevo turno ${evento.data.turno.numero} generado`, 'success');
                    
                    // Verificación completa después de actualizar
                    setTimeout(() => {
                        console.log('🔄 Verificación después de actualizar dashboard:');
                        verificarEstadoDashboard();
                    }, 500);
                }
            } catch (error) {
                console.error('❌ Error al procesar evento localStorage en dashboard:', error);
            }
        }
    });
    
    // Actualizar dashboard cada 5 segundos para asegurar que se muestren las casillas
    setInterval(() => {
        actualizarDashboard();
    }, 5000);
    
    // Actualizar tiempo de espera cada minuto
    setInterval(() => {
        const containerTurnos = document.getElementById('proximosTurnosContainer');
        if (containerTurnos) {
            const turnosEnEspera = db.getTurnosEnEspera();
            if (turnosEnEspera.length > 0) {
                // Solo actualizar los badges de tiempo de espera
                const tickets = containerTurnos.querySelectorAll('.ticket');
                tickets.forEach((ticket, index) => {
                    if (index < turnosEnEspera.length) {
                        const turno = turnosEnEspera[index];
                        const tiempoEspera = turno.fechaHora ? calcularTiempoEspera(turno.fechaHora) : '';
                        const tiempoBadge = ticket.querySelector('.badge.bg-warning');
                        if (tiempoBadge && tiempoEspera) {
                            tiempoBadge.textContent = tiempoEspera;
                        }
                    }
                });
            }
        }
    }, 60000); // Actualizar cada minuto
    
    // Configurar eventos de teclado
    configurarEventosTeclado();
    
    // Configurar pantalla completa (opcional)
    // configurarPantallaCompleta();
    
    // Configurar sistema de eventos en tiempo real
    if (typeof eventSystem !== 'undefined') {
        eventSystem.on('dataChanged', function(data) {
            // Actualizar dashboard cuando hay cambios en los datos
            actualizarDashboard();
        });
        
        eventSystem.on('turnoGenerado', function(turno) {
            showDashboardNotification(`Nuevo turno ${turno.numero} generado`, 'success');
        });
        
        eventSystem.on('turnoLlamado', function(data) {
            showDashboardNotification(`Turno ${data.numero} llamado a Casilla ${data.casilla}`, 'info');
        });
        
        eventSystem.on('turnoAtendido', function(data) {
            showDashboardNotification(`Turno ${data.numero} marcado como atendido`, 'success');
        });
        
        eventSystem.on('casillaModificada', function(data) {
            actualizarDashboard();
            if (data.accion === 'activada') {
                showDashboardNotification(`Casilla "${data.nombre}" activada`, 'success');
            } else if (data.accion === 'desactivada') {
                showDashboardNotification(`Casilla "${data.nombre}" desactivada`, 'warning');
            }
        });
    }
    
    // Limpiar al cerrar la ventana
    window.addEventListener('beforeunload', function() {
        // No hay intervalos que limpiar
    });
    
    // Manejar cambios de visibilidad de la página
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            actualizarDashboard();
        }
    });
    
    console.log('Dashboard inicializado correctamente');
});

// Función para exportar estadísticas (útil para administradores)
function exportarEstadisticas() {
    const estadisticas = db.getEstadisticas();
    const turnosHoy = db.getTurnosPorFecha(new Date().toISOString().split('T')[0]);
    
    const datos = {
        fecha: new Date().toISOString(),
        estadisticas: estadisticas,
        turnos: turnosHoy
    };
    
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estadisticas-turnos-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Hacer funciones disponibles globalmente
window.exportarEstadisticas = exportarEstadisticas;
window.showDashboardNotification = showDashboardNotification; 
window.forzarActualizacionDashboard = actualizarDashboard;
window.calcularTiempoEspera = calcularTiempoEspera;
window.formatTime = formatTime;

// Función para verificar el estado de la base de datos
function verificarEstadoBD() {
    console.log('=== VERIFICACIÓN DE BASE DE DATOS ===');
    console.log('DB disponible:', typeof db !== 'undefined');
    if (typeof db !== 'undefined') {
        console.log('Casillas totales:', db.getCasillas());
        console.log('Servicios totales:', db.getServicios());
        console.log('Turnos totales:', db.turnos);
        console.log('Usuarios totales:', db.getUsuarios());
    }
    console.log('EventSystem disponible:', typeof eventSystem !== 'undefined');
    console.log('=====================================');
}

// Hacer la función disponible globalmente
window.verificarEstadoBD = verificarEstadoBD;

// Función para actualizar el estado de los servicios
function actualizarEstadoServicios() {
    const container = document.getElementById('serviciosStatusContainer');
    if (!container) return;

    const servicios = db.getServicios();
    let serviciosHTML = '';

    if (servicios.length === 0) {
        serviciosHTML = `
            <div class="text-center text-muted py-3">
                <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                <p class="mb-0">No hay servicios configurados</p>
            </div>
        `;
    } else {
        servicios.forEach(servicio => {
            const validacion = db.sePuedeCrearTurno(servicio.id);
            const isDisponible = validacion.puede;
            const razon = validacion.razon;
            const tiempoEstimado = validacion.tiempoEstimado || '';

            const statusClass = isDisponible ? 'status-available' : 'status-unavailable';
            const statusIcon = isDisponible ? 'fa-check-circle' : 'fa-exclamation-triangle';
            const statusText = isDisponible ? 'Disponible' : 'No Disponible';

            serviciosHTML += `
                <div class="service-status-item ${statusClass}">
                    <div class="service-info">
                        <div class="service-name">
                            <i class="fas fa-cog me-2"></i>
                            ${servicio.nombre}
                        </div>
                        <div class="service-status">
                            <i class="fas ${statusIcon} me-1"></i>
                            ${statusText}
                        </div>
                    </div>
                    ${!isDisponible ? `
                        <div class="service-reason">
                            <small class="text-muted">
                                <i class="fas fa-info-circle me-1"></i>
                                ${razon}
                            </small>
                        </div>
                        ${tiempoEstimado ? `
                            <div class="service-time">
                                <small class="text-info">
                                    <i class="fas fa-clock me-1"></i>
                                    ${tiempoEstimado}
                                </small>
                            </div>
                        ` : ''}
                    ` : ''}
                </div>
            `;
        });
    }

    container.innerHTML = serviciosHTML;
} 