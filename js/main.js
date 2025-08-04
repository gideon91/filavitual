// Sistema de eventos para sincronización en tiempo real
class EventSystem {
    constructor() {
        this.events = {};
        this.interval = null;
        this.lastUpdate = Date.now();
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }

    startRealtimeUpdates() {
        if (this.interval) return;
        
        this.interval = setInterval(() => {
            const now = Date.now();
            if (now - this.lastUpdate > 1000) { // Actualizar cada segundo
                this.emit('dataChanged', { timestamp: now });
                this.lastUpdate = now;
            }
        }, 1000);
    }

    stopRealtimeUpdates() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

// Instancia global del sistema de eventos
const eventSystem = new EventSystem();

// Función para generar un código QR más realista
function generarQRSimulado(texto, elementoId) {
    const qrContainer = document.getElementById(elementoId);
    if (!qrContainer) return;
    
    const size = 150;
    const modules = 10;
    
    // Crear un patrón más realista de QR
    let qrHTML = `<div style="width: ${size}px; height: ${size}px; position: relative; margin: 0 auto;">`;
    
    // Patrón base
    for (let y = 0; y < modules; y++) {
        for (let x = 0; x < modules; x++) {
            const isActive = (x + y) % 3 === 0 || (x * y) % 5 === 0 || (x + y * 2) % 7 === 0;
            const color = isActive ? '#0056b3' : '#ffffff';
            const sizeMod = Math.random() > 0.8 ? 1.1 : 1.0;
            
            qrHTML += `<div style="position: absolute; width: ${100/modules * sizeMod}%; height: ${100/modules * sizeMod}%; 
                        background-color: ${color}; left: ${x * (100/modules)}%; top: ${y * (100/modules)}%; 
                        border-radius: ${Math.random() > 0.7 ? '3px' : '0'};"></div>`;
        }
    }
    
    // Marcadores de posición (como en QR reales)
    qrHTML += `
        <div style="position: absolute; width: 28%; height: 28%; background-color: #0056b3; left: 0; top: 0; border-radius: 8px;"></div>
        <div style="position: absolute; width: 28%; height: 28%; background-color: #0056b3; right: 0; top: 0; border-radius: 8px;"></div>
        <div style="position: absolute; width: 28%; height: 28%; background-color: #0056b3; left: 0; bottom: 0; border-radius: 8px;"></div>
    `;
    
    qrHTML += `</div><small class="d-block mt-2 text-center text-muted">${texto}</small>`;
    
    qrContainer.innerHTML = qrHTML;
}

// Función para mostrar notificaciones
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show cesun-notification`;
    notification.role = 'alert';
    
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
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 150);
    }, duration);
}

// Hacer la función disponible globalmente
window.showNotification = showNotification;

// Función para actualizar todas las pantallas
function actualizarTodasLasPantallas() {
    console.log('=== ACTUALIZAR TODAS LAS PANTALLAS ===');
    
    // Actualizar dashboard si está abierto
    if (window.dashboardWindow && !window.dashboardWindow.closed) {
        try {
            window.dashboardWindow.actualizarDashboard();
            console.log('Dashboard actualizado (ventana separada)');
        } catch (error) {
            console.log('Dashboard cerrado o no disponible');
        }
    }
    
    // Actualizar panel de administración si está en la misma ventana
    if (document.getElementById('tablaTurnos')) {
        cargarTurnosEnEspera();
        actualizarTurnoActual();
        console.log('Panel admin actualizado');
    }
    
    // Actualizar dashboard si estamos en esa página
    if (document.getElementById('casillasContainer')) {
        actualizarDashboard();
        console.log('Dashboard actualizado (página actual)');
    }
    
    // Actualización directa sin HTMX para evitar conflictos
    console.log('Actualización directa completada sin HTMX');
    
    console.log('=== FIN ACTUALIZAR TODAS LAS PANTALLAS ===');
}

// Función para actualizar el dashboard
function actualizarDashboard() {
    const turnosEnAtencion = db.getTurnosEnAtencion();
    const proximosTurnos = db.getProximosTurnos(10);
    const estadoCasillas = db.getEstadoCasillas();
    
    // Actualizar turnos en atención
    const casillasContainer = document.getElementById('casillasEnAtencion');
    if (casillasContainer) {
        casillasContainer.innerHTML = estadoCasillas.map(casilla => {
            const turno = turnosEnAtencion.find(t => t.casilla === casilla.id);
            const isBusy = casilla.estado === 'ocupada';
            
            return `
                <div class="col-md-3 col-6 mb-4 fade-in">
                    <div class="card h-100 ${isBusy ? 'border-danger' : 'border-success'}">
                        <div class="card-header ${isBusy ? 'bg-danger' : 'bg-success'} text-white text-center d-flex justify-content-between align-items-center">
                            <span><i class="fas fa-door-open me-2"></i>${casilla.nombre || `Módulo ${casilla.id}`}</span>
                            <span class="badge bg-white ${isBusy ? 'text-danger' : 'text-success'}">
                                ${isBusy ? 'Ocupada' : 'Disponible'}
                            </span>
                        </div>
                        <div class="card-body text-center d-flex flex-column justify-content-center">
                            ${turno ? `
                                <h3 class="turno-actual mb-3">${turno.numero}</h3>
                                <div class="mb-2">
                                    <span class="badge bg-primary rounded-pill">${turno.servicio}</span>
                                </div>
                                <small class="text-muted d-block">${formatTime(turno.fechaCreacion)}</small>
                                <div class="mt-2">
                                    <div class="fw-bold">${turno.nombre || 'Estudiante'}</div>
                                    <small class="text-muted">${turno.email}</small>
                                </div>
                            ` : `
                                <i class="fas fa-door-open text-${isBusy ? 'danger' : 'success'} mb-3" style="font-size: 2rem;"></i>
                                <p class="text-muted mb-0">${isBusy ? 'En atención' : 'Disponible'}</p>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Actualizar próximos turnos
    const proximosList = document.getElementById('proximosTurnos');
    if (proximosList) {
        proximosList.innerHTML = proximosTurnos.map((turno, index) => `
            <tr class="fade-in" style="animation-delay: ${index * 0.05}s">
                <td>
                    <strong>${turno.numero}</strong>
                    ${index === 0 ? '<span class="badge bg-warning text-dark ms-2">Siguiente</span>' : ''}
                </td>
                <td>${turno.servicio}</td>
                <td>
                    <span class="status-badge badge-waiting">
                        <i class="fas fa-clock me-1"></i>En espera
                    </span>
                </td>
                <td><small>${formatTime(turno.fechaCreacion)}</small></td>
            </tr>
        `).join('') || `
            <tr>
                <td colspan="4" class="text-center text-muted py-5">
                    <i class="fas fa-check-circle me-2"></i>No hay turnos en espera
                </td>
            </tr>
        `;
    }
    
    // Actualizar estado de casillas
    const estadoCasillasContainer = document.getElementById('estadoCasillas');
    if (estadoCasillasContainer) {
        estadoCasillasContainer.innerHTML = estadoCasillas.map(casilla => `
            <div class="col-6 col-md-12 mb-3 fade-in">
                <div class="d-flex align-items-center p-3 ${casilla.estado === 'libre' ? 'bg-light-success' : 'bg-light-danger'} rounded shadow-sm">
                    <div class="${casilla.estado === 'libre' ? 'casilla-free' : 'casilla-busy'}"></div>
                    <div class="ms-3">
                        <h5 class="mb-1">${casilla.nombre || `Módulo ${casilla.id}`}</h5>
                        <small class="text-muted">${casilla.estado === 'libre' ? 'Disponible' : 'Ocupada'}</small>
                    </div>
                    <div class="ms-auto">
                        ${casilla.estado === 'ocupada' ? `
                            <span class="badge bg-danger rounded-pill">
                                <i class="fas fa-user-clock me-1"></i>Atendiendo
                            </span>
                        ` : `
                            <span class="badge bg-success rounded-pill">
                                <i class="fas fa-door-open me-1"></i>Libre
                            </span>
                        `}
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Funciones para el panel de administración
function cargarTurnosEnEspera() {
    const turnosEnEspera = db.getTurnosEnEspera();
    const tabla = document.getElementById('tablaTurnos');
    const countElement = document.getElementById('turnosPendientesCount');
    
    if (countElement) {
        countElement.textContent = turnosEnEspera.length;
    }
    
    if (tabla) {
        tabla.innerHTML = turnosEnEspera.map((turno, index) => `
            <tr class="fade-in" style="animation-delay: ${index * 0.05}s">
                <td>
                    <strong>${turno.numero}</strong>
                    ${index === 0 ? '<span class="badge bg-warning text-dark ms-2">Siguiente</span>' : ''}
                </td>
                <td>${turno.servicio}</td>
                <td>
                    <div>
                        <div class="fw-bold">${turno.nombre || 'Estudiante'}</div>
                        <small class="text-muted">${turno.email}</small>
                    </div>
                </td>
                <td><small>${formatTime(turno.fechaCreacion)}</small></td>
                <td>
                    <div class="d-flex gap-2">
                        <button onclick="transferirTurno(${turno.id})" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-exchange-alt me-1"></i>Transferir
                        </button>
                        <button onclick="cancelarTurnoAdmin(${turno.id})" class="btn btn-sm btn-outline-danger">
                            <i class="fas fa-times me-1"></i>Cancelar
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') || `
            <tr>
                <td colspan="5" class="text-center text-muted py-5">
                    <div class="d-flex flex-column align-items-center">
                        <i class="fas fa-check-circle text-success mb-2" style="font-size: 2rem;"></i>
                        <span>No hay turnos en espera</span>
                    </div>
                </td>
            </tr>
        `;
    }
}

function actualizarTurnoActual() {
    const casillaId = parseInt(document.getElementById('casillaAdmin').value);
    const casilla = db.getCasilla(casillaId);
    const currentTurnNumber = document.getElementById('currentTurnNumber');
    const currentTurnService = document.getElementById('currentTurnService');
    const currentTurnInfo = document.getElementById('currentTurnInfo');
    
    if (casillaId && !isNaN(casillaId)) {
        const turno = db.getTurnoActual(casillaId);
        if (turno) {
            currentTurnNumber.textContent = turno.numero;
            currentTurnService.innerHTML = `
                <span class="badge bg-primary rounded-pill">${turno.servicio}</span>
                <div class="mt-2">
                    <div class="fw-bold">${turno.nombre || 'Estudiante'}</div>
                    <small class="text-muted">${turno.email}</small>
                </div>
                <div class="mt-2"><small>${formatTime(turno.fechaCreacion)}</small></div>
            `;
            return;
        }
    }
    
    currentTurnNumber.textContent = '---';
    currentTurnService.innerHTML = `
        <span class="badge bg-secondary">Módulo disponible</span>
        <div class="mt-3">
            <i class="fas fa-door-open text-muted" style="font-size: 2rem;"></i>
        </div>
    `;
}

function llamarSiguienteTurno() {
    const casillaId = parseInt(document.getElementById('casillaAdmin').value);
    const casilla = db.getCasilla(casillaId);
    
    if (!casilla) {
        showNotification('Error: Casilla no encontrada', 'danger');
        return;
    }
    
    // Verificar si la casilla está disponible (no en reunión ni horario fijo)
    if (db.tieneReunionActiva(casillaId)) {
        const reunion = db.getReunionActiva(casillaId);
        showNotification(`Módulo en reunión: ${reunion.motivo}`, 'warning');
        return;
    }
    
    if (db.estaEnHorarioFijo(casillaId)) {
        const horario = db.getHorarioFijoActivo(casillaId);
        showNotification(`Módulo en horario fijo: ${horario.motivo}`, 'warning');
        return;
    }
    
    // Verificar si ya hay un turno en atención en esta casilla
    const turnoActual = db.getTurnoActual(casillaId);
    if (turnoActual) {
        showNotification(`Ya hay un turno en atención: ${turnoActual.numero}`, 'warning');
        return;
    }
    
    const turnoLlamado = db.llamarSiguienteTurno(casillaId);
    
    if (turnoLlamado) {
        showNotification(`Turno ${turnoLlamado.numero} llamado - ${turnoLlamado.nombre || 'Estudiante'} (${turnoLlamado.email}) - Diríjase al ${casilla.nombre}`, 'success');
        
        // Emitir evento para notificar al usuario
        emitirEventoGlobal('turnoLlamado', { turno: turnoLlamado, casilla: casilla });
        emitirEventoGlobal('dataChanged'); // Actualizar tablas y pantallas después de notificar
        // Actualizar la pantalla de espera si está abierta
        if (window.dashboardWindow && !window.dashboardWindow.closed) {
            window.dashboardWindow.actualizarDashboard();
        }
        cargarTurnosEnEspera();
        actualizarTurnoActual();
    } else {
        showNotification('No hay turnos en espera', 'info');
    }
}

function marcarTurnoAtendido() {
    const casillaId = parseInt(document.getElementById('casillaAdmin').value);
    const usuario = auth.getCurrentUser();
    const resultado = db.marcarTurnoAtendido(casillaId, '', usuario ? usuario.id : null);
    
    if (resultado) {
        showNotification('Turno marcado como atendido', 'success');
        actualizarTurnoActual();
    } else {
        showNotification('No hay turno para marcar como atendido', 'warning');
    }
}

function cancelarTurno() {
    const casillaId = parseInt(document.getElementById('casillaAdmin').value);
    const casilla = db.casillas.find(c => c.id === casillaId);
    const usuario = auth.getCurrentUser();
    
    if (!casilla || casilla.estado !== 'ocupada') {
        showNotification('No hay turno para cancelar en esta casilla', 'warning');
        return;
    }
    
    const turno = db.turnos.find(t => t.id === casilla.turnoActual);
    if (!turno) {
        showNotification('No se encontró el turno actual', 'danger');
        return;
    }
    
    const modalContent = `
        <div class="modal-header bg-danger text-white">
            <h5 class="modal-title"><i class="fas fa-times-circle me-2"></i>Cancelar Turno en Casilla ${casillaId}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ¿Está seguro de cancelar el turno <strong>${turno.numero}</strong> (${turno.servicio}) en Casilla ${casillaId}?
            </div>
            <div class="mb-3">
                <label for="motivoCancelacionSimple" class="form-label">Motivo de la cancelación:</label>
                <textarea id="motivoCancelacionSimple" class="form-control" placeholder="Describe el motivo de la cancelación" rows="3" required></textarea>
                <div id="motivoCancelacionSimpleError" class="text-danger mt-2"></div>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="fas fa-times me-1"></i>Cancelar
            </button>
            <button type="button" class="btn btn-danger" onclick="confirmarCancelacionSimple()">
                <i class="fas fa-check me-1"></i>Confirmar Cancelación
            </button>
        </div>
    `;
    
    showModal('Cancelar Turno', modalContent);
}

window.confirmarCancelacionSimple = function() {
    const motivo = document.getElementById('motivoCancelacionSimple').value.trim();
    if (!motivo) {
        document.getElementById('motivoCancelacionSimpleError').textContent = 'Por favor, ingresa el motivo de la cancelación.';
        return;
    }
    
    const casillaId = parseInt(document.getElementById('casillaAdmin').value);
    const casilla = db.casillas.find(c => c.id === casillaId);
    const usuario = auth.getCurrentUser();
    
    if (casilla && casilla.estado === 'ocupada') {
        const resultado = db.cancelarTurno(casilla.turnoActual, motivo, usuario ? usuario.id : null);
        if (resultado) {
            showNotification('Turno cancelado correctamente', 'info');
            cargarTurnosEnEspera();
            actualizarTurnoActual();
        } else {
            showNotification('Error al cancelar el turno', 'danger');
        }
    }
    
    // Cerrar el modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('actionModal'));
    if (modal) modal.hide();
};

function formatTime(isoString) {
    if (!isoString) {
        return '--:--';
    }
    
    const date = new Date(isoString);
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
        console.warn('Fecha inválida:', isoString);
        return '--:--';
    }
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Funciones globales para botones
window.transferirTurno = function(turnoId) {
    const turno = db.turnos.find(t => t.id === turnoId);
    if (!turno) return;
    
    const modalContent = `
        <div class="modal-header bg-primary text-white">
            <h5 class="modal-title"><i class="fas fa-exchange-alt me-2"></i>Transferir Turno ${turno.numero}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <div class="mb-4">
                <p>Transferir <strong>${turno.numero}</strong> (${turno.servicio}) a:</p>
                <select class="form-select form-select-lg mb-3" id="transferCasilla">
                    <option value="1">Casilla 1 - Constancias</option>
                    <option value="2">Casilla 2 - Reinscripciones</option>
                    <option value="3">Casilla 3 - Pagos</option>
                    <option value="4">Casilla 4 - Asesorías</option>
                </select>
            </div>
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                El turno será reasignado a la nueva casilla seleccionada.
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="fas fa-times me-1"></i>Cancelar
            </button>
            <button type="button" class="btn btn-primary" onclick="confirmarTransferencia(${turnoId})">
                <i class="fas fa-check me-1"></i>Confirmar Transferencia
            </button>
        </div>
    `;
    
    showModal('Transferir Turno', modalContent);
};

window.confirmarTransferencia = function(turnoId) {
    const casillaId = parseInt(document.getElementById('transferCasilla').value);
    const turno = db.turnos.find(t => t.id === turnoId);
    
    if (turno) {
        // En una implementación real, aquí actualizaríamos la base de datos
        showNotification(`Turno ${turno.numero} transferido a Casilla ${casillaId}`, 'success');
        
        // Cerrar el modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('actionModal'));
        if (modal) modal.hide();
        
        // Actualizar la lista de turnos
        cargarTurnosEnEspera();
    }
};

window.cancelarTurnoAdmin = function(turnoId) {
    const turno = db.turnos.find(t => t.id === turnoId);
    if (!turno) {
        showNotification('Turno no encontrado', 'danger');
        return;
    }
    
    const modalContent = `
        <div class="modal-header bg-danger text-white">
            <h5 class="modal-title"><i class="fas fa-times-circle me-2"></i>Cancelar Turno ${turno.numero}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ¿Está seguro de cancelar el turno <strong>${turno.numero}</strong> (${turno.servicio})?
            </div>
            <div class="mb-3">
                <label for="motivoCancelacionGlobal" class="form-label">Motivo de la cancelación:</label>
                <textarea id="motivoCancelacionGlobal" class="form-control" placeholder="Describe el motivo de la cancelación" rows="3" required></textarea>
                <div id="motivoCancelacionGlobalError" class="text-danger mt-2"></div>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="fas fa-times me-1"></i>Cancelar
            </button>
            <button type="button" class="btn btn-danger" onclick="confirmarCancelacionGlobal(${turnoId})">
                <i class="fas fa-check me-1"></i>Confirmar Cancelación
            </button>
        </div>
    `;
    
    showModal('Cancelar Turno', modalContent);
};

window.confirmarCancelacionGlobal = function(turnoId) {
    const motivo = document.getElementById('motivoCancelacionGlobal').value.trim();
    if (!motivo) {
        document.getElementById('motivoCancelacionGlobalError').textContent = 'Por favor, ingresa el motivo de la cancelación.';
        return;
    }
    
    const usuario = auth.getCurrentUser();
    const resultado = db.cancelarTurno(turnoId, motivo, usuario ? usuario.id : null);
    if (resultado) {
        showNotification('Turno cancelado correctamente', 'success');
        cargarTurnosEnEspera();
    } else {
        showNotification('Error al cancelar el turno', 'danger');
    }
    
    // Cerrar el modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('actionModal'));
    if (modal) modal.hide();
};

// Función para abrir la pantalla de espera en una nueva ventana
function abrirPantallaEspera() {
    window.dashboardWindow = window.open('pages/dashboard.html', 'PantallaDeEspera', 'width=1200,height=800');
}

// Hacer la función disponible globalmente
window.abrirPantallaEspera = abrirPantallaEspera;

// Función para mostrar modales
function showModal(title, content) {
    let modal = document.getElementById('actionModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'actionModal';
        modal.tabIndex = '-1';
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <!-- Content will be inserted here -->
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const modalContent = modal.querySelector('.modal-content');
    modalContent.innerHTML = content;
    
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
    
    // Enfocar el primer elemento interactivo
    setTimeout(() => {
        const firstInput = modal.querySelector('input, select, button');
        if (firstInput) firstInput.focus();
    }, 500);
} 

document.addEventListener('DOMContentLoaded', function() {
    // Comentado para evitar conflicto con admin.html
    // if (document.getElementById('cancelarTurnoBtn')) {
    //     document.getElementById('cancelarTurnoBtn').addEventListener('click', cancelarTurnoPanel);
    // }
    // Comentado para evitar conflicto con admin.html
    // if (document.getElementById('reasignarTurnoBtn')) {
    //     document.getElementById('reasignarTurnoBtn').addEventListener('click', reasignarTurnoPanel);
    // }
    // Comentado para evitar conflicto con admin.html
    // if (document.getElementById('atenderTurnoBtn')) {
    //     document.getElementById('atenderTurnoBtn').addEventListener('click', atenderTurnoPanel);
    // }
    // Comentado para evitar conflicto con admin.html
    // if (document.getElementById('marcarAtendidoBtn')) {
    //     document.getElementById('marcarAtendidoBtn').addEventListener('click', marcarComoAtendidoPanel);
    // }
    if (typeof eventSystem !== 'undefined') {
        eventSystem.on('dataChanged', () => {
            cargarTurnosEnEspera && cargarTurnosEnEspera();
            actualizarTurnoActual && actualizarTurnoActual();
            actualizarDashboard && actualizarDashboard();
        });
    }
});

function cancelarTurnoPanel() {
    const casillaId = parseInt(document.getElementById('casillaAdmin').value);
    const casilla = db.casillas.find(c => c.id === casillaId);
    const usuario = auth.getCurrentUser();
    
    if (!casilla || casilla.estado !== 'ocupada') {
        showNotification('No hay turno para cancelar en esta casilla', 'warning');
        return;
    }
    
    const turno = db.turnos.find(t => t.id === casilla.turnoActual);
    if (!turno) {
        showNotification('No se encontró el turno actual', 'danger');
        return;
    }
    
    const modalContent = `
        <div class="modal-header bg-danger text-white">
            <h5 class="modal-title"><i class="fas fa-times-circle me-2"></i>Cancelar Turno ${turno.numero}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ¿Está seguro de cancelar el turno <strong>${turno.numero}</strong> (${turno.servicio})?
            </div>
            <div class="mb-3">
                <label for="motivoCancelacionPanel" class="form-label">Motivo de la cancelación:</label>
                <textarea id="motivoCancelacionPanel" class="form-control" placeholder="Describe el motivo de la cancelación" rows="3" required></textarea>
                <div id="motivoCancelacionPanelError" class="text-danger mt-2"></div>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="fas fa-times me-1"></i>Cancelar
            </button>
            <button type="button" class="btn btn-danger" onclick="confirmarCancelacionPanel()">
                <i class="fas fa-check me-1"></i>Confirmar Cancelación
            </button>
        </div>
    `;
    
    showModal('Cancelar Turno', modalContent);
}

window.confirmarCancelacionPanel = function() {
    const motivo = document.getElementById('motivoCancelacionPanel').value.trim();
    if (!motivo) {
        document.getElementById('motivoCancelacionPanelError').textContent = 'Por favor, ingresa el motivo de la cancelación.';
        return;
    }
    
    const casillaId = parseInt(document.getElementById('casillaAdmin').value);
    const casilla = db.casillas.find(c => c.id === casillaId);
    const usuario = auth.getCurrentUser();
    
    if (casilla && casilla.estado === 'ocupada') {
        const resultado = db.cancelarTurno(casilla.turnoActual, motivo, usuario ? usuario.id : null);
        if (resultado) {
            showNotification('Turno cancelado correctamente', 'success');
            cargarTurnosEnEspera();
            actualizarTurnoActual();
            actualizarBotonesControl();
        } else {
            showNotification('Error al cancelar el turno', 'danger');
        }
    }
    
    // Cerrar el modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('actionModal'));
    if (modal) modal.hide();
};

function reasignarTurnoPanel() {
    const casillaId = parseInt(document.getElementById('casillaAdmin').value);
    const casilla = db.casillas.find(c => c.id === casillaId);
    if (!casilla || casilla.estado !== 'ocupada') {
        showNotification('No hay turno para reasignar en esta casilla', 'warning');
        return;
    }
    const turno = db.turnos.find(t => t.id === casilla.turnoActual);
    if (!turno) return;
    // Mostrar prompt para seleccionar nuevo servicio
    const servicios = db.getServiciosActivos();
    let opciones = servicios.map(s => `<option value="${s.nombre}">${s.nombre}</option>`).join('');
    let modalHtml = `
        <div class="modal fade" id="reasignarModal" tabindex="-1" aria-labelledby="reasignarModalLabel" aria-hidden="true">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="reasignarModalLabel">Reasignar Turno</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <label for="nuevoServicio" class="form-label">Selecciona el nuevo servicio:</label>
                <select id="nuevoServicio" class="form-select">${opciones}</select>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" id="confirmarReasignarBtn">Reasignar</button>
              </div>
            </div>
          </div>
        </div>`;
    let modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHtml;
    document.body.appendChild(modalDiv);
    let modal = new bootstrap.Modal(modalDiv.querySelector('#reasignarModal'));
    modal.show();
    document.getElementById('confirmarReasignarBtn').onclick = function() {
        const nuevoServicio = document.getElementById('nuevoServicio').value;
        turno.servicio = nuevoServicio;
        turno.estado = 'en_espera';
        turno.prioridad = true; // Simulación de prioridad
        casilla.estado = 'libre';
        casilla.turnoActual = null;
        showNotification('Turno reasignado con prioridad', 'success');
        cargarTurnosEnEspera();
        actualizarTurnoActual();
        actualizarBotonesControl();
        modal.hide();
        setTimeout(() => modalDiv.remove(), 500);
    };
    modalDiv.querySelector('.btn-close').onclick = () => {
        modal.hide();
        setTimeout(() => modalDiv.remove(), 500);
    };
}

function atenderTurnoPanel() {
    // Al atender, solo mostrar el botón de marcar como atendido
    document.getElementById('cancelarTurnoBtn').style.display = 'none';
    document.getElementById('reasignarTurnoBtn').style.display = 'none';
    document.getElementById('atenderTurnoBtn').style.display = 'none';
    document.getElementById('marcarAtendidoBtn').style.display = 'block';
    showNotification('Turno en atención. Marque como atendido cuando finalice.', 'info');
}

function marcarComoAtendidoPanel() {
    const casillaId = parseInt(document.getElementById('casillaAdmin').value);
    const casilla = db.casillas.find(c => c.id === casillaId);
    if (!casilla || casilla.estado !== 'ocupada') {
        showNotification('No hay turno para marcar como atendido en esta casilla', 'warning');
        return;
    }
    const turno = db.turnos.find(t => t.id === casilla.turnoActual);
    if (!turno) return;
    // Mostrar prompt para descripción
    let modalHtml = `
        <div class="modal fade" id="descripcionModal" tabindex="-1" aria-labelledby="descripcionModalLabel" aria-hidden="true">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="descripcionModalLabel">Descripción/Observaciones</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <textarea id="descripcionAtencion" class="form-control" rows="3" placeholder="Describe lo realizado..."></textarea>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-success" id="confirmarDescripcionBtn">Guardar</button>
              </div>
            </div>
          </div>
        </div>`;
    let modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHtml;
    document.body.appendChild(modalDiv);
    let modal = new bootstrap.Modal(modalDiv.querySelector('#descripcionModal'));
    modal.show();
    document.getElementById('confirmarDescripcionBtn').onclick = function() {
        const descripcion = document.getElementById('descripcionAtencion').value.trim();
        if (!descripcion) {
            showNotification('Por favor, ingresa las observaciones de atención', 'warning');
            return;
        }
        
        const usuario = auth.getCurrentUser();
        turno.descripcion = descripcion;
        const resultado = db.marcarTurnoAtendido(casillaId, descripcion, usuario ? usuario.id : null);
        if (resultado) {
            showNotification('Turno marcado como atendido y descripción guardada', 'success');
            cargarTurnosEnEspera();
            actualizarTurnoActual();
            actualizarBotonesControl();
        } else {
            showNotification('Error al marcar el turno como atendido', 'danger');
        }
        modal.hide();
        setTimeout(() => modalDiv.remove(), 500);
    };
    modalDiv.querySelector('.btn-close').onclick = () => {
        modal.hide();
        setTimeout(() => modalDiv.remove(), 500);
    };
} 

// Agregar función para emitir eventos globales usando localStorage
function emitirEventoGlobal(tipo, data) {
    const evento = { 
        tipo, 
        data, 
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9) // ID único para evitar duplicados
    };
    
    console.log('Emitiendo evento global:', evento);
    localStorage.setItem('eventoGlobal', JSON.stringify(evento));
    
    // Forzar el evento inmediatamente en la página actual
    setTimeout(() => {
        if (typeof cargarTurnosEnEspera === 'function') {
            cargarTurnosEnEspera();
        }
        if (typeof actualizarTurnoActual === 'function') {
            actualizarTurnoActual();
        }
        if (typeof actualizarDashboard === 'function') {
            actualizarDashboard();
        }
    }, 100);
}

// Hacer la función disponible globalmente
window.emitirEventoGlobal = emitirEventoGlobal;

// Listener para eventos globales entre pestañas
window.addEventListener('storage', function(e) {
    if (e.key === 'eventoGlobal') {
        try {
            const evento = JSON.parse(e.newValue);
            console.log('🔄 Evento global recibido en main.js:', evento);
            
            if (evento.tipo === 'dataChanged') {
                console.log('🔄 Procesando evento dataChanged...');
                
                // Actualizar turnos en espera
                if (typeof cargarTurnosEnEspera === 'function') {
                    cargarTurnosEnEspera();
                    console.log('✅ cargarTurnosEnEspera ejecutado');
                }
                
                // Actualizar turno actual
                if (typeof actualizarTurnoActual === 'function') {
                    actualizarTurnoActual();
                    console.log('✅ actualizarTurnoActual ejecutado');
                }
                
                // Actualizar dashboard
                if (typeof actualizarDashboard === 'function') {
                    actualizarDashboard();
                    console.log('✅ actualizarDashboard ejecutado');
                }
                
                // Mostrar notificación si es un turno nuevo
                if (evento.data && evento.data.tipo === 'turnoGenerado') {
                    if (typeof showNotification === 'function') {
                        showNotification(`Nuevo turno ${evento.data.turno.numero} generado`, 'success');
                    }
                    console.log('✅ Notificación mostrada');
                }
            }
            
            if (evento.tipo === 'turnoLlamado') {
                if (typeof eventSystem !== 'undefined') {
                    eventSystem.emit('turnoLlamado', evento.data);
                }
            }
        } catch (error) {
            console.error('❌ Error al procesar evento global en main.js:', error);
        }
    }
}); 