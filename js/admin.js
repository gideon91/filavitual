// Funciones específicas para admin.html

// Función para cargar información del usuario
function cargarInformacionUsuario() {
    const usuario = auth.getCurrentUser();
    if (usuario) {
        const nombreElement = document.getElementById('nombreUsuarioAdmin');
        if (nombreElement) {
            nombreElement.innerHTML = `
                <i class="fas fa-user me-2"></i>
                <strong>Usuario: ${usuario.nombre}</strong> 
                <span class="badge bg-primary ms-2">${usuario.permisos === 'admin' ? 'Administrador' : 'Usuario'}</span>
                <small class="text-muted ms-2">(${usuario.correo})</small>
            `;
        }
        
        // Actualizar información en el dropdown del menú
        const nombreMenuElements = document.querySelectorAll('[data-user-info="nombre"]');
        const correoMenuElements = document.querySelectorAll('[data-user-info="correo"]');
        const permisosMenuElements = document.querySelectorAll('[data-user-info="permisos"]');
        
        nombreMenuElements.forEach(el => el.textContent = usuario.nombre);
        correoMenuElements.forEach(el => el.textContent = usuario.correo);
        permisosMenuElements.forEach(el => el.textContent = usuario.permisos === 'admin' ? 'Administrador' : 'Usuario');
    }
}

// Función para cargar casillas asignadas al usuario
function cargarCasillasUsuario() {
    const usuario = auth.getCurrentUser();
    if (!usuario) return;
    
    console.log('=== CARGAR CASILLAS USUARIO ===');
    console.log('Usuario:', usuario);
    
    const casillaSelect = document.getElementById('casillaAdmin');
    const casillas = db.getCasillas();
    
    console.log('Todas las casillas:', casillas);
    
    // Filtrar casillas según permisos del usuario
    let casillasDisponibles = [];
    
    if (db.esAdminGlobal(usuario.id)) {
        // Admin global ve todas las casillas activas
        casillasDisponibles = casillas.filter(c => c.activa !== false);
        console.log('Admin global - Casillas disponibles:', casillasDisponibles);
    } else {
        // Otros usuarios ven solo sus casillas asignadas
        const casillasUsuario = db.obtenerCasillasDeUsuario(usuario.id);
        console.log('Usuario normal - Casillas asignadas:', casillasUsuario);
        console.log('Usuario normal - ID del usuario:', usuario.id);
        console.log('Usuario normal - Casillas asignadas (IDs):', casillasUsuario.map(c => c.id));
        
        // Obtener IDs de las casillas asignadas al usuario
        const casillasIdsUsuario = casillasUsuario.map(c => c.id);
        
        // Filtrar casillas que estén asignadas al usuario y estén activas
        casillasDisponibles = casillas.filter(c => 
            casillasIdsUsuario.includes(c.id) && c.activa !== false
        );
        console.log('Usuario normal - Casillas disponibles:', casillasDisponibles);
        console.log('Usuario normal - Casillas disponibles (IDs):', casillasDisponibles.map(c => c.id));
        
        // Debug adicional para verificar la lógica de filtrado
        casillas.forEach(casilla => {
            console.log(`Casilla ${casilla.nombre} (ID: ${casilla.id}):`, {
                usuarios: casilla.usuarios || [],
                incluyeUsuario: casilla.usuarios && casilla.usuarios.includes(usuario.id),
                activa: casilla.activa,
                pasaFiltro: casillasIdsUsuario.includes(casilla.id) && casilla.activa !== false
            });
        });
    }
    
    // Actualizar selector de casillas
    if (casillaSelect) {
        casillaSelect.innerHTML = `
            <option value="">Seleccione una casilla</option>
            ${casillasDisponibles.map(casilla => `
                <option value="${casilla.id}">${casilla.nombre}</option>
            `).join('')}
        `;
        
        console.log('Casillas en el select:', casillasDisponibles.length);
        
        // Si solo hay una casilla, seleccionarla automáticamente
        if (casillasDisponibles.length === 1) {
            casillaSelect.value = casillasDisponibles[0].id;
            casillaSelect.disabled = true;
            
            // Mostrar información de casilla asignada
            const casillaInfo = document.getElementById('casillaInfo');
            const casillaInfoText = document.getElementById('casillaInfoText');
            if (casillaInfo && casillaInfoText) {
                casillaInfo.style.display = 'block';
                const casilla = casillasDisponibles[0];
                const serviciosCasilla = casilla.servicios && casilla.servicios.length > 0 ? 
                    db.getServicios().filter(s => casilla.servicios.includes(s.id)).map(s => s.nombre).join(', ') : 
                    'Todos los servicios';
                casillaInfoText.innerHTML = `
                    <strong>Casilla asignada automáticamente</strong><br>
                    <small>Servicios: ${serviciosCasilla}</small><br>
                    <small>Solo los administradores pueden cambiar casillas</small>
                `;
            }
            console.log('Casilla única seleccionada automáticamente:', casillasDisponibles[0].nombre);
        } else if (casillasDisponibles.length === 0) {
            casillaSelect.innerHTML = '<option value="">Sin casilla</option>';
            casillaSelect.disabled = false;
            
            // Mostrar mensaje de no asignación
            const casillaInfo = document.getElementById('casillaInfo');
            const casillaInfoText = document.getElementById('casillaInfoText');
            if (casillaInfo && casillaInfoText) {
                casillaInfo.style.display = 'block';
                casillaInfo.style.background = 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)';
                casillaInfo.style.border = '1px solid #ef9a9a';
                casillaInfoText.innerHTML = `
                    <i class="fas fa-exclamation-triangle text-warning me-1"></i>
                    <strong>No tienes casillas asignadas</strong><br>
                    <small>Contacta al administrador para que te asigne una casilla</small>
                `;
            }
            
            // Limpiar información de turno actual
            actualizarTurnoActual();
            actualizarBotonesControl();
            console.log('No hay casillas disponibles');
        } else {
            // Múltiples casillas disponibles - habilitar selección
            casillaSelect.disabled = false;
            console.log('Múltiples casillas disponibles, selección habilitada');
        }
        
        // Cargar información de la casilla seleccionada
        if (casillaSelect.value) {
            const casillaId = parseInt(casillaSelect.value);
            const casilla = db.getCasilla(casillaId);
            if (casilla) {
                mostrarServiciosCasilla(casilla);
                actualizarTurnoActual();
                cargarTurnosEnEspera(); // Recargar turnos filtrados por casilla
                console.log('Casilla seleccionada:', casilla.nombre);
            }
        }
    }
    
    console.log('=== FIN CARGAR CASILLAS USUARIO ===');
}

// Función para cargar estadísticas
function cargarEstadisticas() {
    const estadisticas = db.getEstadisticas();
    const container = document.getElementById('estadisticasContainer');
    
    if (container) {
        container.innerHTML = `
            <div class="col-md-2 col-6 mb-3">
                <div class="stats-card total slide-in-up">
                    <div class="stats-icon">
                        <i class="fas fa-ticket-alt"></i>
                    </div>
                    <div class="stats-number">${estadisticas.total}</div>
                    <div class="stats-label">Total Hoy</div>
                </div>
            </div>
            <div class="col-md-2 col-6 mb-3">
                <div class="stats-card en-espera slide-in-up">
                    <div class="stats-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stats-number">${estadisticas.enEspera}</div>
                    <div class="stats-label">En Espera</div>
                </div>
            </div>
            <div class="col-md-2 col-6 mb-3">
                <div class="stats-card en-atencion slide-in-up">
                    <div class="stats-icon">
                        <i class="fas fa-user-clock"></i>
                    </div>
                    <div class="stats-number">${estadisticas.enAtencion}</div>
                    <div class="stats-label">En Atención</div>
                </div>
            </div>
            <div class="col-md-2 col-6 mb-3">
                <div class="stats-card atendidos slide-in-up">
                    <div class="stats-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stats-number">${estadisticas.atendidos}</div>
                    <div class="stats-label">Atendidos</div>
                </div>
            </div>
            <div class="col-md-2 col-6 mb-3">
                <div class="stats-card cancelados slide-in-up">
                    <div class="stats-icon">
                        <i class="fas fa-times-circle"></i>
                    </div>
                    <div class="stats-number">${estadisticas.cancelados}</div>
                    <div class="stats-label">Cancelados</div>
                </div>
            </div>
            <div class="col-md-2 col-6 mb-3">
                <div class="stats-card slide-in-up">
                    <div class="stats-icon">
                        <i class="fas fa-door-open"></i>
                    </div>
                    <div class="stats-number">${estadisticas.casillasLibres}/${estadisticas.casillasLibres + estadisticas.casillasOcupadas}</div>
                    <div class="stats-label">Casillas Libres</div>
                </div>
            </div>
        `;
    }
}

// Función para mostrar notificaciones específicas del admin
function showAdminNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show admin-notification`;
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
    
    // Auto-remover después de 4 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 150);
    }, 4000);
}

// Función para mostrar modal de confirmación
function showConfirmModal(title, message, onConfirm) {
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalBody').innerHTML = message;
    
    const confirmBtn = document.getElementById('confirmModalBtn');
    confirmBtn.onclick = () => {
        modal.hide();
        onConfirm();
    };
    
    modal.show();
}

// Función para limpiar datos antiguos
function limpiarDatos() {
    showConfirmModal(
        'Limpiar Datos Antiguos',
        '<p>¿Está seguro de que desea limpiar todos los turnos completados de más de un día?</p><p class="text-warning"><i class="fas fa-exclamation-triangle me-2"></i>Esta acción no se puede deshacer.</p>',
        () => {
            const turnosAntes = db.turnos.length;
            db.limpiarTurnosAntiguos();
            const turnosDespues = db.turnos.length;
            const eliminados = turnosAntes - turnosDespues;
            
            showAdminNotification(`Se eliminaron ${eliminados} turnos antiguos`, 'success');
            cargarTurnosEnEspera();
            cargarEstadisticas();
            actualizarTurnoActual();
        }
    );
}

// Función para exportar estadísticas
function exportarEstadisticas() {
    const estadisticas = db.getEstadisticas();
    const turnosHoy = db.getTurnosPorFecha(new Date().toISOString().split('T')[0]);
    
    const datos = {
        fecha: new Date().toISOString(),
        estadisticas: estadisticas,
        turnos: turnosHoy,
        servicios: db.getServicios(),
        exportadoPor: 'Administrador',
        timestamp: Date.now()
    };
    
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estadisticas-turnos-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showAdminNotification('Estadísticas exportadas correctamente', 'success');
}

// Función para abrir pantalla de espera
function abrirPantallaEspera() {
    const ventana = window.open('../pages/dashboard.html', 'PantallaDeEspera', 'width=1200,height=800,scrollbars=no,resizable=yes');
    
    if (ventana) {
        showAdminNotification('Pantalla de espera abierta', 'info');
    } else {
        showAdminNotification('Error al abrir la pantalla de espera', 'danger');
    }
}

// Función para actualizar automáticamente
function iniciarActualizacionesAutomaticas() {
    // Actualizar cada 2 segundos para mejor respuesta en tiempo real
    setInterval(() => {
        if (auth.isAuthenticated()) {
            cargarTurnosEnEspera();
            cargarEstadisticas();
            actualizarTurnoActual();
            cargarServicios();
        }
    }, 2000);
    
    // Actualización inmediata al cargar la página
    setTimeout(() => {
        if (auth.isAuthenticated()) {
            cargarTurnosEnEspera();
            actualizarTurnoActual();
            cargarServicios();
        }
    }, 1000);
}

// Configurar eventos de teclado para el admin
function configurarEventosTeclado() {
    document.addEventListener('keydown', function(event) {
        // F5 para actualizar manualmente
        if (event.key === 'F5') {
            event.preventDefault();
            cargarTurnosEnEspera();
            cargarEstadisticas();
            actualizarTurnoActual();
            cargarServicios();
            showAdminNotification('Datos actualizados manualmente', 'info');
        }
        
        // Ctrl + L para limpiar datos
        if (event.ctrlKey && event.key === 'l') {
            event.preventDefault();
            limpiarDatos();
        }
        
        // Ctrl + E para exportar estadísticas
        if (event.ctrlKey && event.key === 'e') {
            event.preventDefault();
            exportarEstadisticas();
        }
        
        // Ctrl + P para abrir pantalla de espera
        if (event.ctrlKey && event.key === 'p') {
            event.preventDefault();
            abrirPantallaEspera();
        }
        
        // Ctrl + C para configuración
        if (event.ctrlKey && event.key === 'c') {
            event.preventDefault();
            const configBtn = document.getElementById('configuracionBtn');
            if (configBtn) {
                configBtn.click();
            }
        }
    });
}

// Inicialización del panel de administración
document.addEventListener('DOMContentLoaded', function() {
    console.log('Panel de administración cargado');
    
    // Verificar autenticación
    if (!auth.isAuthenticated()) {
        return;
    }
    
    // Verificar permisos y actualizar interfaz
    if (auth.isAuthenticated()) {
        if (auth.isAdmin()) {
            document.getElementById('configuracionBtn').style.display = 'inline-block';
        } else {
            document.getElementById('configuracionBtn').style.display = 'none';
        }
    }
    
    // Cargar datos iniciales
    cargarServicios();
    cargarTurnosEnEspera();
    actualizarTurnoActual();
    
    // Iniciar actualizaciones automáticas
    iniciarActualizacionesAutomaticas();
    
    // Configurar eventos de teclado
    configurarEventosTeclado();
    
    // Configurar sistema de eventos en tiempo real
    if (typeof eventSystem !== 'undefined') {
        eventSystem.on('dataChanged', () => {
            cargarTurnosEnEspera && cargarTurnosEnEspera();
            cargarEstadisticas && cargarEstadisticas();
            actualizarTurnoActual && actualizarTurnoActual();
            cargarServicios && cargarServicios();
        });
        
        eventSystem.on('turnoGenerado', function(turno) {
            showAdminNotification(`Nuevo turno ${turno.numero} generado`, 'success');
        });
        
        eventSystem.on('turnoLlamado', function(data) {
            showAdminNotification(`Turno ${data.numero} llamado a Casilla ${data.casilla}`, 'info');
        });
        
        eventSystem.on('turnoAtendido', function(data) {
            showAdminNotification(`Turno ${data.numero} marcado como atendido`, 'success');
        });
        
        eventSystem.on('servicioModificado', function(data) {
            showAdminNotification(`Servicio ${data.nombre} modificado`, 'info');
        });
    }
    
    // Configurar listener para evento personalizado de turno generado
    window.addEventListener('turnoGenerado', function(event) {
        console.log('🎯 Evento turnoGenerado recibido en admin:', event.detail);
        cargarTurnosEnEspera();
        actualizarTurnoActual();
        showAdminNotification(`Nuevo turno ${event.detail.turno.numero} generado`, 'success');
    });
    
    // Configurar listener para eventos de localStorage
    window.addEventListener('storage', function(e) {
        if (e.key === 'eventoGlobal') {
            try {
                const evento = JSON.parse(e.newValue);
                console.log('🔄 Evento localStorage recibido en admin:', evento);
                
                if (evento.tipo === 'dataChanged' && evento.data && evento.data.tipo === 'turnoGenerado') {
                    console.log('🔄 Actualizando admin por evento localStorage');
                    console.log('🔄 Datos del evento:', evento.data);
                    
                    // Mostrar todos los turnos en espera
                    mostrarTodosLosTurnosEnEspera();
                    actualizarTurnoActual();
                    showAdminNotification(`Nuevo turno ${evento.data.turno.numero} generado`, 'success');
                    
                    // Verificación después de actualizar
                    setTimeout(() => {
                        console.log('🔄 Verificación después de actualizar:');
                        mostrarTodosLosTurnosEnEspera();
                    }, 1000);
                }
            } catch (error) {
                console.error('❌ Error al procesar evento localStorage en admin:', error);
            }
        }
    });
    
    // Verificar autenticación periódicamente
    setInterval(() => {
        if (!auth.isAuthenticated()) {
            auth.redirectToLogin();
        }
    }, 60000); // Verificar cada minuto
    
    const admin = JSON.parse(localStorage.getItem('admin'));
    const configBtn = document.getElementById('configuracionBtn');
    if (admin && admin.permisos === 'admin' && configBtn) {
        configBtn.style.display = 'inline-block';
    } else if (configBtn) {
        configBtn.style.display = 'none';
    }
    
    console.log('Panel de administración inicializado correctamente');
});

// Configurar eventos de la interfaz
document.addEventListener('DOMContentLoaded', function() {
    // Evento para cambio de casilla
    const casillaSelect = document.getElementById('casillaAdmin');
    if (casillaSelect) {
        casillaSelect.addEventListener('change', function() {
            const casillaId = this.value;
            if (casillaId) {
                const casilla = db.getCasillas().find(c => c.id === parseInt(casillaId));
                if (casilla) {
                    mostrarServiciosCasilla(casilla);
                    const turno = db.getTurnoActual(casilla.id);
                    actualizarInterfazTurnoActual(turno, casilla);
                }
            } else {
                actualizarInterfazTurnoActual(null, null);
            }
        });
    }
    
    // Evento para llamar siguiente turno
    const siguienteBtn = document.getElementById('siguienteTurnoBtn');
    if (siguienteBtn) {
        siguienteBtn.addEventListener('click', function() {
            const casillaId = casillaSelect ? casillaSelect.value : null;
            if (casillaId) {
                llamarSiguienteTurno(parseInt(casillaId));
            } else {
                showAdminNotification('Seleccione una casilla primero', 'warning');
            }
        });
    }
    
    // Evento para cancelar turno actual - REMOVIDO para evitar conflicto con admin.html
    // El event listener se maneja en admin.html para mostrar el modal de confirmación
    
    // Evento para marcar como atendido - REMOVIDO para evitar conflicto con admin.html
    // El event listener se maneja en admin.html para mostrar el modal de observaciones
    
    // Evento para reasignar turno
    const reasignarBtn = document.getElementById('reasignarTurnoBtn');
    if (reasignarBtn) {
        reasignarBtn.addEventListener('click', function() {
            const casillaId = casillaSelect ? casillaSelect.value : null;
            if (casillaId) {
                const casilla = db.getCasillas().find(c => c.id === parseInt(casillaId));
                const turno = casilla ? db.getTurnoActual(casilla.id) : null;
                if (turno) {
                    mostrarModalReasignarServicio(casilla.id);
                }
            }
        });
    }
});

// Función para llamar siguiente turno
function llamarSiguienteTurno(casillaId) {
    try {
        const turno = db.llamarSiguienteTurno(casillaId);
        if (turno) {
            showAdminNotification(`Turno ${turno.numero} llamado a la casilla`, 'success');
            cargarTurnosEnEspera();
            actualizarTurnoActual();
        } else {
            showAdminNotification('No hay turnos en espera para esta casilla', 'warning');
        }
    } catch (error) {
        showAdminNotification('Error al llamar turno: ' + error.message, 'danger');
    }
}

// Función marcarTurnoAtendido removida - se maneja en admin.html con modal de observaciones

// Función para mostrar modal de reasignación de servicio
function mostrarModalReasignarServicio(casillaId) {
    const casilla = db.getCasillas().find(c => c.id === casillaId);
    const turno = casilla ? db.getTurnoActual(casilla.id) : null;
    
    if (!turno) {
        showAdminNotification('No hay turno activo en esta casilla', 'warning');
        return;
    }
    
    // Cargar servicios activos
    const serviciosActivos = db.getServicios().filter(s => s.activo !== false);
    let opcionesServicios = '<option value="">-- Selecciona un servicio --</option>' + 
        serviciosActivos.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('reasignarModal'));
    document.getElementById('reasignarModalBody').innerHTML = `
        <p>Selecciona el nuevo servicio para el turno <strong>${turno.numero}</strong> (actual: ${db.getServicio(turno.servicio)?.nombre || turno.servicio}):</p>
        <select class="form-select" id="nuevoServicioSelect">
            ${opcionesServicios}
        </select>
    `;
    
    // Configurar botón de confirmación
    const confirmBtn = document.getElementById('reasignarConfirmBtn');
    confirmBtn.onclick = () => {
        const nuevoServicioId = document.getElementById('nuevoServicioSelect').value;
        if (!nuevoServicioId) {
            showAdminNotification('Selecciona un servicio', 'warning');
            return;
        }
        
        try {
            const nuevoServicio = db.getServicio(parseInt(nuevoServicioId));
            db.reasignarTurno(turno.id, nuevoServicioId);
            showAdminNotification(`Turno ${turno.numero} reasignado a ${nuevoServicio.nombre}`, 'success');
            modal.hide();
            actualizarTurnoActual();
        } catch (error) {
            showAdminNotification('Error al reasignar turno: ' + error.message, 'danger');
        }
    };
    
    modal.show();
}

// Hacer funciones disponibles globalmente
window.limpiarDatos = limpiarDatos;
window.exportarEstadisticas = exportarEstadisticas;
window.abrirPantallaEspera = abrirPantallaEspera;
window.showAdminNotification = showAdminNotification;

// Función para cargar turnos en espera
function cargarTurnosEnEspera() {
    console.log('=== CARGAR TURNOS EN ESPERA ===');
    
    const casillaId = parseInt(document.getElementById('casillaAdmin').value);
    const usuario = auth.getCurrentUser();
    
    console.log('Casilla ID:', casillaId);
    console.log('Usuario:', usuario);
    
    // Obtener turnos en espera que puede atender el usuario en la casilla específica
    let turnosEnEspera = [];
    if (casillaId && !isNaN(casillaId) && usuario) {
        turnosEnEspera = db.getTurnosDisponiblesUsuario(usuario.id, casillaId);
        console.log('Turnos disponibles para usuario en casilla:', turnosEnEspera);
    } else {
        turnosEnEspera = db.getTurnosEnEspera();
        console.log('Todos los turnos en espera:', turnosEnEspera);
    }
    
    // También obtener todos los turnos en espera para el contador total
    const todosLosTurnosEnEspera = db.getTurnosEnEspera();
    
    const tablaTurnos = document.getElementById('tablaTurnos');
    const contadorTurnos = document.getElementById('turnosPendientesCount');
    
    console.log('Elementos del DOM:');
    console.log('- tablaTurnos existe:', !!tablaTurnos);
    console.log('- contadorTurnos existe:', !!contadorTurnos);
    
    if (contadorTurnos) {
        contadorTurnos.textContent = todosLosTurnosEnEspera.length;
        console.log('Contador actualizado:', todosLosTurnosEnEspera.length);
    }
    
    if (tablaTurnos) {
        if (turnosEnEspera.length === 0) {
            const mensaje = (casillaId && !isNaN(casillaId)) ? 
                'No hay turnos en espera que puedas atender en esta casilla' : 
                'No hay turnos en espera';
            tablaTurnos.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        <i class="fas fa-inbox me-2"></i>${mensaje}
                    </td>
                </tr>
            `;
            console.log('Tabla actualizada: Sin turnos');
        } else {
            tablaTurnos.innerHTML = turnosEnEspera.map(turno => {
                const fechaCreacion = new Date(turno.fechaCreacion);
                const horaCreacion = fechaCreacion.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                return `
                    <tr class="fade-in">
                        <td>
                            <span class="badge bg-primary fs-6">${turno.numero}</span>
                        </td>
                        <td>
                            <span class="badge bg-info">${turno.servicio}</span>
                        </td>
                        <td>
                            <div>
                                <div class="fw-bold">${turno.nombre || 'Estudiante'}</div>
                                <small class="text-muted">${turno.email}</small>
                            </div>
                        </td>
                        <td>
                            <small class="text-muted">${horaCreacion}</small>
                        </td>
                    </tr>
                `;
            }).join('');
            console.log('Tabla actualizada con', turnosEnEspera.length, 'turnos');
        }
    }
    
    console.log('=== FIN CARGAR TURNOS EN ESPERA ===');
}

// Función para mostrar todos los turnos en espera (sin filtros)
function mostrarTodosLosTurnosEnEspera() {
    console.log('=== MOSTRAR TODOS LOS TURNOS EN ESPERA ===');
    
    // Obtener TODOS los turnos en espera sin filtrar
    const todosLosTurnosEnEspera = db.getTurnosEnEspera();
    console.log('Todos los turnos en espera:', todosLosTurnosEnEspera);
    
    const tablaTurnos = document.getElementById('tablaTurnos');
    const contadorTurnos = document.getElementById('turnosPendientesCount');
    
    console.log('Elementos del DOM:');
    console.log('- tablaTurnos existe:', !!tablaTurnos);
    console.log('- contadorTurnos existe:', !!contadorTurnos);
    
    // Actualizar contador
    if (contadorTurnos) {
        contadorTurnos.textContent = todosLosTurnosEnEspera.length;
        console.log('Contador actualizado:', todosLosTurnosEnEspera.length);
    }
    
    // Actualizar tabla
    if (tablaTurnos) {
        if (todosLosTurnosEnEspera.length === 0) {
            tablaTurnos.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        <i class="fas fa-inbox me-2"></i>No hay turnos en espera
                    </td>
                </tr>
            `;
            console.log('Tabla actualizada: Sin turnos');
        } else {
            tablaTurnos.innerHTML = todosLosTurnosEnEspera.map(turno => {
                const fechaCreacion = new Date(turno.fechaCreacion);
                const horaCreacion = fechaCreacion.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                return `
                    <tr class="fade-in">
                        <td>
                            <span class="badge bg-primary fs-6">${turno.numero}</span>
                        </td>
                        <td>
                            <span class="badge bg-info">${turno.servicio}</span>
                        </td>
                        <td>
                            <div>
                                <div class="fw-bold">${turno.nombre || 'Estudiante'}</div>
                                <small class="text-muted">${turno.email}</small>
                            </div>
                        </td>
                        <td>
                            <small class="text-muted">${horaCreacion}</small>
                        </td>
                    </tr>
                `;
            }).join('');
            console.log('Tabla actualizada con', todosLosTurnosEnEspera.length, 'turnos (todos)');
        }
    }
    
    console.log('=== FIN MOSTRAR TODOS LOS TURNOS EN ESPERA ===');
}

// Función para forzar actualización de turnos en espera (sin filtros)
function forzarActualizacionTurnosEnEspera() {
    console.log('=== FORZAR ACTUALIZACIÓN TURNOS EN ESPERA ===');
    
    // Obtener TODOS los turnos en espera sin filtrar
    const todosLosTurnosEnEspera = db.getTurnosEnEspera();
    console.log('Todos los turnos en espera (sin filtros):', todosLosTurnosEnEspera);
    
    const tablaTurnos = document.getElementById('tablaTurnos');
    const contadorTurnos = document.getElementById('turnosPendientesCount');
    
    console.log('Elementos del DOM:');
    console.log('- tablaTurnos existe:', !!tablaTurnos);
    console.log('- contadorTurnos existe:', !!contadorTurnos);
    
    // Actualizar contador
    if (contadorTurnos) {
        contadorTurnos.textContent = todosLosTurnosEnEspera.length;
        console.log('Contador actualizado:', todosLosTurnosEnEspera.length);
    }
    
    // Actualizar tabla
    if (tablaTurnos) {
        if (todosLosTurnosEnEspera.length === 0) {
            tablaTurnos.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        <i class="fas fa-inbox me-2"></i>No hay turnos en espera
                    </td>
                </tr>
            `;
            console.log('Tabla actualizada: Sin turnos');
        } else {
            tablaTurnos.innerHTML = todosLosTurnosEnEspera.map(turno => {
                const fechaCreacion = new Date(turno.fechaCreacion);
                const horaCreacion = fechaCreacion.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                return `
                    <tr class="fade-in">
                        <td>
                            <span class="badge bg-primary fs-6">${turno.numero}</span>
                        </td>
                        <td>
                            <span class="badge bg-info">${turno.servicio}</span>
                        </td>
                        <td>
                            <div>
                                <div class="fw-bold">${turno.nombre || 'Estudiante'}</div>
                                <small class="text-muted">${turno.email}</small>
                            </div>
                        </td>
                        <td>
                            <small class="text-muted">${horaCreacion}</small>
                        </td>
                    </tr>
                `;
            }).join('');
            console.log('Tabla actualizada con', todosLosTurnosEnEspera.length, 'turnos (forzado)');
        }
    }
    
    console.log('=== FIN FORZAR ACTUALIZACIÓN TURNOS EN ESPERA ===');
}

// Función para debug de turnos en espera
function debugTurnosEnEspera() {
    console.log('=== DEBUG TURNOS EN ESPERA ===');
    
    // Verificar estado de la base de datos
    const todosLosTurnos = db.turnos;
    console.log('Todos los turnos en la BD:', todosLosTurnos);
    
    const turnosEnEspera = db.getTurnosEnEspera();
    console.log('Turnos en espera (sin filtros):', turnosEnEspera);
    
    // Verificar elementos del DOM
    const tablaTurnos = document.getElementById('tablaTurnos');
    const contadorTurnos = document.getElementById('turnosPendientesCount');
    
    console.log('Elementos DOM:');
    console.log('- tablaTurnos:', tablaTurnos);
    console.log('- contadorTurnos:', contadorTurnos);
    
    if (tablaTurnos) {
        console.log('- Contenido actual de tablaTurnos:', tablaTurnos.innerHTML);
    }
    
    if (contadorTurnos) {
        console.log('- Contenido actual de contadorTurnos:', contadorTurnos.textContent);
    }
    
    // Verificar casilla seleccionada
    const casillaSelect = document.getElementById('casillaAdmin');
    const casillaId = casillaSelect ? parseInt(casillaSelect.value) : null;
    console.log('Casilla seleccionada:', casillaId);
    
    // Verificar usuario actual
    const usuario = auth.getCurrentUser();
    console.log('Usuario actual:', usuario);
    
    console.log('=== FIN DEBUG TURNOS EN ESPERA ===');
}

// Función para verificar estado completo del sistema
function verificarEstadoCompleto() {
    console.log('=== VERIFICACIÓN COMPLETA DEL SISTEMA ===');
    
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
        'tablaTurnos',
        'turnosPendientesCount',
        'casillaAdmin'
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
        'forzarActualizacionTurnosEnEspera',
        'cargarTurnosEnEspera',
        'debugTurnosEnEspera',
        'actualizarTurnoActual'
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
    
    // 5. Verificar autenticación
    console.log('5. Autenticación:');
    if (typeof auth !== 'undefined') {
        const usuario = auth.getCurrentUser();
        console.log('- Usuario actual:', usuario);
    } else {
        console.log('- auth no disponible');
    }
    
    console.log('=== FIN VERIFICACIÓN COMPLETA ===');
}

// Función de prueba simple para actualizar tabla
function probarActualizacionTabla() {
    console.log('=== PRUEBA ACTUALIZACIÓN TABLA ===');
    
    try {
        // 1. Verificar que db existe
        if (typeof db === 'undefined') {
            console.error('❌ db no está disponible');
            return;
        }
        
        // 2. Obtener turnos
        const turnos = db.getTurnosEnEspera();
        console.log('📊 Turnos en espera:', turnos);
        
        // 3. Verificar elementos DOM
        const tabla = document.getElementById('tablaTurnos');
        const contador = document.getElementById('turnosPendientesCount');
        
        console.log('🔍 Elementos DOM:');
        console.log('- tablaTurnos:', tabla ? 'EXISTE' : 'NO EXISTE');
        console.log('- turnosPendientesCount:', contador ? 'EXISTE' : 'NO EXISTE');
        
        if (!tabla) {
            console.error('❌ tablaTurnos no existe en el DOM');
            return;
        }
        
        if (!contador) {
            console.error('❌ turnosPendientesCount no existe en el DOM');
            return;
        }
        
        // 4. Actualizar contador
        contador.textContent = turnos.length;
        console.log('✅ Contador actualizado:', turnos.length);
        
        // 5. Actualizar tabla
        if (turnos.length === 0) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        <i class="fas fa-inbox me-2"></i>No hay turnos en espera
                    </td>
                </tr>
            `;
            console.log('✅ Tabla actualizada: Sin turnos');
        } else {
            const htmlTurnos = turnos.map(turno => {
                const fechaCreacion = new Date(turno.fechaCreacion);
                const horaCreacion = fechaCreacion.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                return `
                    <tr class="fade-in">
                        <td>
                            <span class="badge bg-primary fs-6">${turno.numero}</span>
                        </td>
                        <td>
                            <span class="badge bg-info">${turno.servicio}</span>
                        </td>
                        <td>
                            <div>
                                <div class="fw-bold">${turno.nombre || 'Estudiante'}</div>
                                <small class="text-muted">${turno.email}</small>
                            </div>
                        </td>
                        <td>
                            <small class="text-muted">${horaCreacion}</small>
                        </td>
                    </tr>
                `;
            }).join('');
            
            tabla.innerHTML = htmlTurnos;
            console.log('✅ Tabla actualizada con', turnos.length, 'turnos');
            console.log('📝 HTML generado:', htmlTurnos.substring(0, 200) + '...');
        }
        
        // 6. Verificar que se actualizó
        console.log('🔍 Verificación final:');
        console.log('- Contador actual:', contador.textContent);
        console.log('- Tabla tiene contenido:', tabla.innerHTML.length > 0);
        
    } catch (error) {
        console.error('❌ Error en probarActualizacionTabla:', error);
    }
    
    console.log('=== FIN PRUEBA ACTUALIZACIÓN TABLA ===');
}

// Función para actualizar el turno actual
function actualizarTurnoActual() {
    const casillaId = parseInt(document.getElementById('casillaAdmin').value);
    if (!casillaId || isNaN(casillaId)) {
        actualizarInterfazTurnoActual(null, null);
        // Mostrar mensaje específico para "Sin casilla"
        const turnoService = document.getElementById('currentTurnService');
        if (turnoService) {
            turnoService.innerHTML = '<div class="text-muted"><i class="fas fa-exclamation-triangle me-1"></i>Sin casilla asignada</div>';
        }
        return;
    }
    
    const turno = db.getTurnoActual(casillaId);
    const casilla = db.getCasilla(casillaId);
    
    actualizarInterfazTurnoActual(turno, casilla);
    actualizarBotonesControl();
}

// Función para actualizar la interfaz del turno actual
function actualizarInterfazTurnoActual(turno, casilla) {
    // Debug: verificar datos del turno
    console.log('=== DEBUG ACTUALIZAR INTERFAZ TURNO ===');
    console.log('Turno recibido:', turno);
    console.log('Casilla recibida:', casilla);
    
    const turnoNumber = document.getElementById('currentTurnNumber');
    const turnoService = document.getElementById('currentTurnService'); // Now holds student info
    const turnoEmail = document.getElementById('currentTurnEmail');     // Now holds service info
    
    // Debug: verificar elementos del DOM
    console.log('Elementos del DOM:');
    console.log('- turnoNumber existe:', !!turnoNumber);
    console.log('- turnoService existe:', !!turnoService);
    console.log('- turnoEmail existe:', !!turnoEmail);
    
    const siguienteBtn = document.getElementById('siguienteTurnoBtn');
    const cancelarBtn = document.getElementById('cancelarTurnoBtn');
    const reasignarBtn = document.getElementById('reasignarTurnoBtn');
    const marcarBtn = document.getElementById('marcarAtendidoBtn');
    
    if (turno) {
        console.log('Turno nombre:', turno.nombre);
        console.log('Turno email:', turno.email);
        console.log('Turno servicio:', turno.servicio);
        console.log('Turno numero:', turno.numero);
        console.log('¿Turno tiene nombre?:', !!turno.nombre);
        console.log('¿Turno tiene email?:', !!turno.email);
        
        turnoNumber.textContent = `#${turno.numero}`;
        turnoService.innerHTML = `
            <div class="student-info">
                <div class="student-name"><strong>${turno.nombre || 'Estudiante'}</strong></div>
                <div class="student-email text-muted">${turno.email}</div>
            </div>
        `;
        turnoEmail.innerHTML = `
            <div class="service-info">
                <i class="fas fa-cog me-1"></i>
                <span>${turno.servicio}</span>
            </div>
        `;
        
        console.log('HTML generado para turnoService:', turnoService.innerHTML);
        console.log('HTML generado para turnoEmail:', turnoEmail.innerHTML);
        
        // Verificar que el HTML se haya aplicado
        setTimeout(() => {
            console.log('HTML aplicado en turnoService:', turnoService.innerHTML);
            console.log('HTML aplicado en turnoEmail:', turnoEmail.innerHTML);
        }, 100);
        
        if (siguienteBtn) siguienteBtn.style.display = 'none';
        if (cancelarBtn) cancelarBtn.style.display = 'block';
        if (reasignarBtn) reasignarBtn.style.display = 'block';
        if (marcarBtn) marcarBtn.style.display = 'block';
    } else {
        console.log('No hay turno actual');
        turnoNumber.textContent = '---';
        turnoService.innerHTML = casilla ? 
            '<div class="text-muted"><i class="fas fa-door-open me-1"></i>Casilla libre</div>' : 
            '<div class="text-muted"><i class="fas fa-hand-point-up me-1"></i>Seleccione una casilla</div>';
        turnoEmail.innerHTML = '';
        
        if (siguienteBtn) siguienteBtn.style.display = 'block';
        if (cancelarBtn) cancelarBtn.style.display = 'none';
        if (reasignarBtn) reasignarBtn.style.display = 'none';
        if (marcarBtn) marcarBtn.style.display = 'none';
    }
    
    console.log('=== FIN DEBUG ===');
}

// Función para actualizar la visibilidad de los botones de control
function actualizarBotonesControl() {
    console.log('=== DEBUG ACTUALIZAR BOTONES CONTROL ===');
    const casillaId = parseInt(document.getElementById('casillaAdmin').value);
    if (!casillaId) return;
    
    const turnoActual = db.getTurnoActual(casillaId);
    const casilla = db.getCasilla(casillaId);
    
    console.log('Casilla ID:', casillaId);
    console.log('¿Hay turno actual?:', !!turnoActual);
    console.log('Turno actual:', turnoActual);
    
    // Verificar si la casilla está en reunión o horario fijo
    const enReunion = db.tieneReunionActiva(casillaId);
    const enHorarioFijo = db.estaEnHorarioFijo(casillaId);
    
    console.log('¿En reunión?:', enReunion);
    console.log('¿En horario fijo?:', enHorarioFijo);
    
    const siguienteBtn = document.getElementById('siguienteTurnoBtn');
    const cancelarBtn = document.getElementById('cancelarTurnoBtn');
    const reasignarBtn = document.getElementById('reasignarTurnoBtn');
    const marcarBtn = document.getElementById('marcarAtendidoBtn');
    
    if (enReunion || enHorarioFijo) {
        console.log('Casilla no disponible - configurando botones');
        // Casilla no disponible
        if (siguienteBtn) {
            siguienteBtn.style.display = 'none';
            siguienteBtn.disabled = true;
        }
        if (cancelarBtn) cancelarBtn.style.display = 'none';
        if (reasignarBtn) reasignarBtn.style.display = 'none';
        if (marcarBtn) marcarBtn.style.display = 'none';
        
        // Mostrar mensaje de estado SOLO si no hay turno en atención
        if (!turnoActual) {
            console.log('No hay turno actual - mostrando mensaje de estado');
            const turnoService = document.getElementById('currentTurnService');
            if (enReunion) {
                const reunion = db.getReunionActiva(casillaId);
                turnoService.innerHTML = `<div class="text-warning"><i class="fas fa-users me-1"></i>En reunión: ${reunion.motivo}</div>`;
            } else if (enHorarioFijo) {
                const horario = db.getHorarioFijoActivo(casillaId);
                turnoService.innerHTML = `<div class="text-info"><i class="fas fa-clock me-1"></i>Horario fijo: ${horario.motivo}</div>`;
            }
        } else {
            console.log('Hay turno actual - NO sobrescribiendo información del estudiante');
        }
    } else if (turnoActual) {
        console.log('Hay turno en atención - configurando botones');
        // Hay turno en atención
        if (siguienteBtn) {
            siguienteBtn.style.display = 'none';
            siguienteBtn.disabled = false;
        }
        if (cancelarBtn) cancelarBtn.style.display = 'block';
        if (reasignarBtn) reasignarBtn.style.display = 'block';
        if (marcarBtn) marcarBtn.style.display = 'block';
    } else {
        console.log('Casilla libre - configurando botones');
        // Casilla libre
        if (siguienteBtn) {
            siguienteBtn.style.display = 'block';
            siguienteBtn.disabled = false;
        }
        if (cancelarBtn) cancelarBtn.style.display = 'none';
        if (reasignarBtn) reasignarBtn.style.display = 'none';
        if (marcarBtn) marcarBtn.style.display = 'none';
    }
    console.log('=== FIN DEBUG ACTUALIZAR BOTONES CONTROL ===');
}

// Función para cargar servicios
function cargarServicios() {
    const servicios = db.getServicios();
    // Filtrar solo servicios activos
    const serviciosActivos = servicios.filter(servicio => servicio.activo !== false);
    
    // Actualizar servicios en la casilla seleccionada
    const casillaSelect = document.getElementById('casillaAdmin');
    if (casillaSelect && casillaSelect.value) {
        const casilla = db.getCasillas().find(c => c.id === parseInt(casillaSelect.value));
        if (casilla) {
            mostrarServiciosCasilla(casilla);
        }
    }
}

// Función para mostrar servicios de una casilla
function mostrarServiciosCasilla(casilla) {
    const serviciosContainer = document.getElementById('serviciosCasilla');
    if (!serviciosContainer) return;
    
    if (!casilla.servicios || casilla.servicios.length === 0) {
        serviciosContainer.innerHTML = `
            <div class="badge bg-secondary">
                <i class="fas fa-cog me-1"></i>Todos los servicios
            </div>
        `;
        return;
    }
    
    const servicios = db.getServicios().filter(s => casilla.servicios.includes(s.id));
    
    serviciosContainer.innerHTML = servicios.map(servicio => `
        <div class="badge bg-info">
            <i class="fas fa-cog me-1"></i>${servicio.nombre}
        </div>
    `).join('');
}

// Función para llamar turno
function llamarTurno(turnoId) {
    try {
        const casillaId = parseInt(document.getElementById('casillaAdmin').value);
        if (!casillaId) {
            showAdminNotification('Por favor, selecciona una casilla primero', 'warning');
            return;
        }
        
        // Verificar si la casilla está disponible (no en reunión ni horario fijo)
        if (db.tieneReunionActiva(casillaId)) {
            const reunion = db.getReunionActiva(casillaId);
            showAdminNotification(`Casilla en reunión: ${reunion.motivo}`, 'warning');
            return;
        }
        
        if (db.estaEnHorarioFijo(casillaId)) {
            const horario = db.getHorarioFijoActivo(casillaId);
            showAdminNotification(`Casilla en horario fijo: ${horario.motivo}`, 'warning');
            return;
        }
        
        // Verificar si ya hay un turno en atención en esta casilla
        const turnoActual = db.getTurnoActual(casillaId);
        if (turnoActual) {
            showAdminNotification(`Ya hay un turno en atención: ${turnoActual.numero}`, 'warning');
            return;
        }
        
        // Llamar el siguiente turno para esta casilla
        const turno = db.llamarSiguienteTurno(casillaId);
        if (turno) {
            showAdminNotification(`Turno ${turno.numero} llamado en casilla ${db.getCasilla(casillaId).nombre} - ${turno.nombre || 'Estudiante'} (${turno.email})`, 'success');
            cargarTurnosEnEspera();
            actualizarTurnoActual();
            actualizarBotonesControl();
        } else {
            showAdminNotification('No hay turnos en espera', 'info');
        }
    } catch (error) {
        showAdminNotification('Error al llamar turno: ' + error.message, 'danger');
    }
}

// Función para cancelar turno
// Función cancelarTurno removida - se maneja en admin.html con modal de confirmación

// Hacer funciones disponibles globalmente
window.cargarTurnosEnEspera = cargarTurnosEnEspera;
window.actualizarTurnoActual = actualizarTurnoActual;
window.cargarServicios = cargarServicios;
window.llamarTurno = llamarTurno;
// window.cancelarTurno removido - se maneja en admin.html
window.llamarSiguienteTurno = llamarSiguienteTurno;
// window.marcarTurnoAtendido removido - se maneja en admin.html
window.mostrarModalReasignarServicio = mostrarModalReasignarServicio;
window.actualizarBotonesControl = actualizarBotonesControl;
window.cargarInformacionUsuario = cargarInformacionUsuario;
window.cargarCasillasUsuario = cargarCasillasUsuario;

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    if (!auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Cargar información del usuario
    cargarInformacionUsuario();
    cargarCasillasUsuario();
    
    // Cargar datos iniciales
    cargarTurnosEnEspera();
    cargarEstadisticas();
    actualizarTurnoActual();
    
    // Configurar eventos
    configurarEventosTeclado();
    
    // Iniciar actualizaciones automáticas
    iniciarActualizacionesAutomaticas();
    
    // Configurar event listeners para cambios de casilla
    const casillaSelect = document.getElementById('casillaAdmin');
    if (casillaSelect) {
        casillaSelect.addEventListener('change', function() {
            const casillaId = parseInt(this.value);
            if (casillaId) {
                const casilla = db.getCasilla(casillaId);
                if (casilla) {
                    mostrarServiciosCasilla(casilla);
                    actualizarTurnoActual();
                    actualizarBotonesControl();
                }
            } else {
                actualizarTurnoActual();
                actualizarBotonesControl();
            }
        });
    }
});

// Función para mostrar errores en los modales
function mostrarError(elementId, mensaje) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = mensaje;
        errorElement.style.display = 'block';
    }
}

// Función para verificar el estado de la base de datos
function verificarEstadoBD() {
    console.log('=== VERIFICACIÓN ESTADO BD ===');
    const usuario = auth.getCurrentUser();
    console.log('Usuario actual:', usuario);
    
    if (usuario) {
        console.log('¿Es admin global?', db.esAdminGlobal(usuario.id));
        console.log('Casillas asignadas al usuario:', db.obtenerCasillasDeUsuario(usuario.id));
        console.log('Todas las casillas:', db.getCasillas());
        console.log('Todas las casillas activas:', db.getCasillas().filter(c => c.activa !== false));
        
        // Verificar elementos del DOM
        const casillaSelect = document.getElementById('casillaAdmin');
        const casillaInfo = document.getElementById('casillaInfo');
        const casillaInfoText = document.getElementById('casillaInfoText');
        
        console.log('Elementos del DOM:');
        console.log('- casillaSelect existe:', !!casillaSelect);
        console.log('- casillaInfo existe:', !!casillaInfo);
        console.log('- casillaInfoText existe:', !!casillaInfoText);
        
        if (casillaSelect) {
            console.log('- Opciones en el select:', casillaSelect.options.length);
            console.log('- Valor seleccionado:', casillaSelect.value);
            console.log('- Select deshabilitado:', casillaSelect.disabled);
        }
        
        if (casillaInfo) {
            console.log('- casillaInfo visible:', casillaInfo.style.display !== 'none');
        }
        
        if (casillaInfoText) {
            console.log('- Texto de casillaInfo:', casillaInfoText.innerHTML);
        }
    }
    
    // Ejecutar debug de asignaciones
    db.debugAsignacionesUsuarios();
    
    showAdminNotification('Verificación completada. Revisa la consola para más detalles.', 'info');
}

// Función para forzar la recarga completa de casillas
function forzarRecargaCasillas() {
    console.log('=== FORZAR RECARGA CASILLAS ===');
    const usuario = auth.getCurrentUser();
    console.log('Usuario actual:', usuario);
    
    if (!usuario) {
        console.log('No hay usuario autenticado');
        return;
    }
    
    // Verificar si es admin global
    const esAdminGlobal = db.esAdminGlobal(usuario.id);
    console.log('¿Es admin global?', esAdminGlobal);
    
    // Obtener casillas según el tipo de usuario
    let casillasDisponibles = [];
    
    if (esAdminGlobal) {
        casillasDisponibles = db.getCasillas().filter(c => c.activa !== false);
        console.log('Admin global - Todas las casillas activas:', casillasDisponibles);
    } else {
        const casillasUsuario = db.obtenerCasillasDeUsuario(usuario.id);
        console.log('Usuario normal - Casillas asignadas:', casillasUsuario);
        
        // Obtener IDs de las casillas asignadas al usuario
        const casillasIdsUsuario = casillasUsuario.map(c => c.id);
        
        // Filtrar casillas que estén asignadas al usuario y estén activas
        casillasDisponibles = db.getCasillas().filter(c => 
            casillasIdsUsuario.includes(c.id) && c.activa !== false
        );
        console.log('Usuario normal - Casillas disponibles después del filtro:', casillasDisponibles);
    }
    
    // Actualizar el select manualmente
    const casillaSelect = document.getElementById('casillaAdmin');
    if (casillaSelect) {
        console.log('Actualizando select de casillas...');
        
        // Limpiar opciones existentes
        casillaSelect.innerHTML = '<option value="">Seleccione una casilla</option>';
        
        // Agregar nuevas opciones
        casillasDisponibles.forEach(casilla => {
            const option = document.createElement('option');
            option.value = casilla.id;
            option.textContent = casilla.nombre;
            casillaSelect.appendChild(option);
        });
        
        console.log('Select actualizado con', casillasDisponibles.length, 'opciones');
        
        // Si solo hay una casilla, seleccionarla automáticamente
        if (casillasDisponibles.length === 1) {
            casillaSelect.value = casillasDisponibles[0].id;
            casillaSelect.disabled = true;
            console.log('Casilla única seleccionada:', casillasDisponibles[0].nombre);
            
            // Actualizar información de la casilla
            const casilla = casillasDisponibles[0];
            mostrarServiciosCasilla(casilla);
            actualizarTurnoActual();
            cargarTurnosEnEspera();
        } else if (casillasDisponibles.length === 0) {
            casillaSelect.innerHTML = '<option value="">Sin casilla</option>';
            console.log('No hay casillas disponibles');
        } else {
            casillaSelect.disabled = false;
            console.log('Múltiples casillas disponibles');
        }
    }
    
    console.log('=== FIN FORZAR RECARGA CASILLAS ===');
    showAdminNotification('Recarga de casillas completada', 'success');
}

// Función de debug para probar la actualización del turno actual
function debugTurnoActual() {
    console.log('=== DEBUG TURNO ACTUAL ===');
    const casillaId = parseInt(document.getElementById('casillaAdmin').value);
    console.log('Casilla ID seleccionada:', casillaId);
    
    if (casillaId) {
        const turno = db.getTurnoActual(casillaId);
        const casilla = db.getCasilla(casillaId);
        
        console.log('Turno actual:', turno);
        console.log('Casilla:', casilla);
        
        if (turno) {
            console.log('Datos del turno:');
            console.log('- Número:', turno.numero);
            console.log('- Nombre:', turno.nombre);
            console.log('- Email:', turno.email);
            console.log('- Servicio:', turno.servicio);
            console.log('- Estado:', turno.estado);
            console.log('- Casilla:', turno.casilla);
            console.log('- Fecha creación:', turno.fechaCreacion);
            
            // Verificar si el turno tiene todos los campos necesarios
            console.log('Verificación de campos:');
            console.log('- ¿Tiene nombre?:', !!turno.nombre);
            console.log('- ¿Tiene email?:', !!turno.email);
            console.log('- ¿Tiene servicio?:', !!turno.servicio);
            console.log('- ¿Tiene numero?:', !!turno.numero);
        }
        
        // Forzar actualización de la interfaz
        actualizarInterfazTurnoActual(turno, casilla);
        
        // Verificar elementos del DOM después de la actualización
        setTimeout(() => {
            const turnoNumber = document.getElementById('currentTurnNumber');
            const turnoService = document.getElementById('currentTurnService');
            const turnoEmail = document.getElementById('currentTurnEmail');
            
            console.log('Estado del DOM después de actualización:');
            console.log('- turnoNumber.textContent:', turnoNumber?.textContent);
            console.log('- turnoService.innerHTML:', turnoService?.innerHTML);
            console.log('- turnoEmail.innerHTML:', turnoEmail?.innerHTML);
        }, 200);
    } else {
        console.log('No hay casilla seleccionada');
    }
    
    console.log('=== FIN DEBUG ===');
}

// Hacer la función disponible globalmente
window.debugTurnoActual = debugTurnoActual;

// Función de debug para verificar el historial
function debugHistorial() {
    console.log('=== DEBUG HISTORIAL ===');
    const usuario = auth.getCurrentUser();
    console.log('Usuario actual:', usuario);
    
    const historial = db.getHistorial();
    console.log('Historial completo:', historial);
    
    if (usuario) {
        const historialUsuario = db.getHistorialPorUsuario(usuario.id);
        console.log(`Historial del usuario ${usuario.nombre}:`, historialUsuario);
        
        const historialTurnos = historial.filter(h => 
            h.accion === 'TURNO_ATENDIDO' || 
            h.accion === 'TURNO_CANCELADO' || 
            h.accion === 'TURNO_LLAMADO'
        );
        console.log('Historial de turnos:', historialTurnos);
        
        const estadisticas = db.getEstadisticasHistorial();
        console.log('Estadísticas del historial:', estadisticas);
    }
    
    console.log('=== FIN DEBUG HISTORIAL ===');
}

// Hacer la función disponible globalmente
window.debugHistorial = debugHistorial;