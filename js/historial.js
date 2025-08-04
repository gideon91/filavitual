// ==================== HISTORIAL - JAVASCRIPT LIMPIO ====================

// Variables globales
let turnosFiltrados = [];

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    if (!auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Actualizar información del usuario
    actualizarInfoUsuario();
    
    // Cargar datos iniciales
    cargarHistorial();
    cargarFiltros();
    
    // Event listeners
    document.getElementById('exportarBtn').addEventListener('click', exportarAExcel);
    document.getElementById('limpiarBtn').addEventListener('click', limpiarHistorial);
    
    // Agregar animación de entrada
    document.body.classList.add('fade-in');
});

// ==================== FUNCIONES PRINCIPALES ====================

function actualizarInfoUsuario() {
    const usuario = auth.getCurrentUser();
    if (usuario) {
        document.getElementById('userName').textContent = usuario.nombre;
        document.getElementById('userEmail').textContent = usuario.correo;
        document.getElementById('userRole').textContent = usuario.permisos === 'admin' ? 'Administrador' : 'Usuario';
    }
}

function cargarEstadisticas() {
    const usuarioActual = auth.getCurrentUser();
    let turnos = db.turnos.filter(t => t.estado === 'atendido' || t.estado === 'cancelado');
    
    // Filtrar por usuario que atendió/canceló
    if (usuarioActual && usuarioActual.permisos !== 'admin') {
        turnos = turnos.filter(t => 
            (t.estado === 'atendido' && t.usuarioAtendio === usuarioActual.id) ||
            (t.estado === 'cancelado' && t.usuarioCancelo === usuarioActual.id)
        );
    }
    
    const totalTurnos = turnos.length;
    const turnosAtendidos = turnos.filter(t => t.estado === 'atendido').length;
    const turnosCancelados = turnos.filter(t => t.estado === 'cancelado').length;
    
    // Calcular tiempo promedio
    let tiempoTotal = 0;
    let turnosConTiempo = 0;
    
    turnos.forEach(turno => {
        if (turno.fechaCreacion && (turno.fechaAtencion || turno.fechaCancelacion)) {
            const fechaInicio = new Date(turno.fechaCreacion);
            const fechaFin = new Date(turno.fechaAtencion || turno.fechaCancelacion);
            const duracion = fechaFin - fechaInicio;
            if (duracion > 0) {
                tiempoTotal += duracion;
                turnosConTiempo++;
            }
        }
    });
    
    const tiempoPromedio = turnosConTiempo > 0 ? Math.round(tiempoTotal / turnosConTiempo / (1000 * 60)) : 0;
    
    // Actualizar elementos en el DOM
    document.getElementById('totalTurnos').textContent = totalTurnos;
    document.getElementById('turnosAtendidos').textContent = turnosAtendidos;
    document.getElementById('turnosCancelados').textContent = turnosCancelados;
    document.getElementById('promedioTiempo').textContent = `${tiempoPromedio}m`;
    
    // Actualizar títulos según el tipo de usuario
    if (usuarioActual && usuarioActual.permisos !== 'admin') {
        document.getElementById('tituloTotal').textContent = 'Servicios Realizados';
        document.getElementById('tituloAtendidos').textContent = 'Servicios Atendidos';
        document.getElementById('tituloCancelados').textContent = 'Servicios Cancelados';
        document.getElementById('tituloTiempo').textContent = 'Tiempo Promedio';
    } else {
        document.getElementById('tituloTotal').textContent = 'Total Turnos';
        document.getElementById('tituloAtendidos').textContent = 'Atendidos';
        document.getElementById('tituloCancelados').textContent = 'Cancelados';
        document.getElementById('tituloTiempo').textContent = 'Tiempo Promedio';
    }
}

function cargarHistorial() {
    const usuarioActual = auth.getCurrentUser();
    let turnos = db.turnos.filter(t => t.estado === 'atendido' || t.estado === 'cancelado');
    
    // Filtrar por usuario que atendió/canceló
    if (usuarioActual && usuarioActual.permisos !== 'admin') {
        turnos = turnos.filter(t => 
            (t.estado === 'atendido' && t.usuarioAtendio === usuarioActual.id) ||
            (t.estado === 'cancelado' && t.usuarioCancelo === usuarioActual.id)
        );
    }
    
    turnosFiltrados = turnos;
    mostrarTurnosFiltrados(turnos);
    cargarEstadisticas();
}

function cargarFiltros() {
    const selectServicio = document.getElementById('filtroServicio');
    selectServicio.innerHTML = '<option value="">Todos los servicios</option>';
    
    const servicios = [...new Set(db.turnos.map(t => t.servicio))];
    servicios.forEach(servicio => {
        const option = document.createElement('option');
        option.value = servicio;
        option.textContent = servicio;
        selectServicio.appendChild(option);
    });
}

function aplicarFiltros() {
    const filtroEstado = document.getElementById('filtroEstado').value;
    const filtroServicio = document.getElementById('filtroServicio').value;
    const filtroFechaInicio = document.getElementById('filtroFechaInicio').value;
    const filtroFechaFin = document.getElementById('filtroFechaFin').value;
    
    let turnos = db.turnos.filter(t => t.estado === 'atendido' || t.estado === 'cancelado');
    
    // Filtrar por usuario
    const usuarioActual = auth.getCurrentUser();
    if (usuarioActual && usuarioActual.permisos !== 'admin') {
        turnos = turnos.filter(t => 
            (t.estado === 'atendido' && t.usuarioAtendio === usuarioActual.id) ||
            (t.estado === 'cancelado' && t.usuarioCancelo === usuarioActual.id)
        );
    }
    
    // Aplicar filtros
    if (filtroEstado) {
        turnos = turnos.filter(t => t.estado === filtroEstado);
    }
    
    if (filtroServicio) {
        turnos = turnos.filter(t => t.servicio === filtroServicio);
    }
    
    if (filtroFechaInicio) {
        turnos = turnos.filter(t => t.fechaCreacion >= filtroFechaInicio);
    }
    
    if (filtroFechaFin) {
        turnos = turnos.filter(t => t.fechaCreacion <= filtroFechaFin + 'T23:59:59');
    }
    
    turnosFiltrados = turnos;
    mostrarTurnosFiltrados(turnos);
}

function mostrarTurnosFiltrados(turnos) {
    const tabla = document.getElementById('tablaHistorial');
    const tbody = tabla.querySelector('tbody');
    const contador = document.getElementById('contadorRegistros');
    
    tbody.innerHTML = '';
    contador.textContent = `${turnos.length} registros`;
    
    if (turnos.length === 0) {
        const usuarioActual = auth.getCurrentUser();
        const mensaje = usuarioActual && usuarioActual.permisos !== 'admin' 
            ? 'No tienes registros de servicios atendidos o cancelados.'
            : 'No hay registros de turnos atendidos o cancelados.';
        
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center">
                    <div class="estado-vacio">
                        <i class="fas fa-inbox"></i>
                        <h6>Sin registros</h6>
                        <p>${mensaje}</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    turnos.forEach(turno => {
        const fechaCreacion = new Date(turno.fechaCreacion);
        const fechaFinalizacion = turno.fechaAtencion ? new Date(turno.fechaAtencion) : 
                                 turno.fechaCancelacion ? new Date(turno.fechaCancelacion) : null;
        
        const duracion = fechaFinalizacion ? calcularDuracion(fechaCreacion, fechaFinalizacion) : 'N/A';
        
        // Obtener información del usuario que atendió/canceló
        let atendidoPor = 'N/A';
        if (turno.estado === 'atendido' && turno.usuarioAtendio) {
            const usuarioAtendio = db.getUsuario(turno.usuarioAtendio);
            atendidoPor = usuarioAtendio ? usuarioAtendio.nombre : turno.usuarioAtendio;
        } else if (turno.estado === 'cancelado' && turno.usuarioCancelo) {
            const usuarioCancelo = db.getUsuario(turno.usuarioCancelo);
            atendidoPor = usuarioCancelo ? usuarioCancelo.nombre : turno.usuarioCancelo;
        }
        
        const estadoBadge = turno.estado === 'atendido' 
            ? '<span class="badge bg-success">Atendido</span>'
            : '<span class="badge bg-danger">Cancelado</span>';
        
        const observaciones = turno.descripcion || turno.motivoCancelacion || 'Sin observaciones';
        
        const row = `
            <tr>
                <td class="text-center">#${turno.numero}</td>
                <td>${turno.nombre}</td>
                <td>${turno.servicio}</td>
                <td class="text-center">${estadoBadge}</td>
                <td class="text-center">
                    <div class="fecha-info">${fechaCreacion.toLocaleDateString('es-ES')}</div>
                    <div class="hora-info">${fechaCreacion.toLocaleTimeString('es-ES')}</div>
                </td>
                <td class="text-center">
                    ${fechaFinalizacion ? `
                        <div class="fecha-info">${fechaFinalizacion.toLocaleDateString('es-ES')}</div>
                        <div class="hora-info">${fechaFinalizacion.toLocaleTimeString('es-ES')}</div>
                    ` : 'N/A'}
                </td>
                <td class="text-center">${duracion}</td>
                <td>${atendidoPor}</td>
                <td>${observaciones.length > 50 ? observaciones.substring(0, 50) + '...' : observaciones}</td>
                <td class="text-center">
                    <button class="btn btn-accion" onclick="verDetallesTurno('${turno.id}')" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
        
        tbody.innerHTML += row;
    });
}

function limpiarFiltros() {
    document.getElementById('filtroEstado').value = '';
    document.getElementById('filtroServicio').value = '';
    document.getElementById('filtroFechaInicio').value = '';
    document.getElementById('filtroFechaFin').value = '';
    
    cargarHistorial();
}

function limpiarHistorial() {
    const usuarioActual = auth.getCurrentUser();
    
    if (!usuarioActual) {
        showAlert('Error: Usuario no autenticado', 'danger');
        return;
    }
    
    const mensaje = usuarioActual.permisos === 'admin' 
        ? '¿Estás seguro de que quieres limpiar todo el historial? Esta acción no se puede deshacer.'
        : '¿Estás seguro de que quieres limpiar tu historial de servicios? Esta acción no se puede deshacer.';
    
    if (confirm(mensaje)) {
        if (usuarioActual.permisos === 'admin') {
            // Limpiar todo el historial
            db.turnos = db.turnos.filter(t => t.estado !== 'atendido' && t.estado !== 'cancelado');
        } else {
            // Limpiar solo los turnos del usuario
            db.turnos = db.turnos.filter(t => 
                !((t.estado === 'atendido' && t.usuarioAtendio === usuarioActual.id) ||
                  (t.estado === 'cancelado' && t.usuarioCancelo === usuarioActual.id))
            );
        }
        
        db.guardarDatos();
        cargarHistorial();
        showAlert('Historial limpiado correctamente', 'success');
    }
}

function exportarAExcel() {
    const usuarioActual = auth.getCurrentUser();
    
    if (!usuarioActual) {
        showAlert('Error: Usuario no autenticado', 'danger');
        return;
    }
    
    if (turnosFiltrados.length === 0) {
        showAlert('No hay datos para exportar', 'warning');
        return;
    }
    
    // Preparar datos para exportar
    const datos = turnosFiltrados.map(turno => {
        const fechaCreacion = new Date(turno.fechaCreacion);
        const fechaFinalizacion = turno.fechaAtencion ? new Date(turno.fechaAtencion) : 
                                 turno.fechaCancelacion ? new Date(turno.fechaCancelacion) : null;
        
        let atendidoPor = 'N/A';
        if (turno.estado === 'atendido' && turno.usuarioAtendio) {
            const usuarioAtendio = db.getUsuario(turno.usuarioAtendio);
            atendidoPor = usuarioAtendio ? usuarioAtendio.nombre : turno.usuarioAtendio;
        } else if (turno.estado === 'cancelado' && turno.usuarioCancelo) {
            const usuarioCancelo = db.getUsuario(turno.usuarioCancelo);
            atendidoPor = usuarioCancelo ? usuarioCancelo.nombre : turno.usuarioCancelo;
        }
        
        return {
            'Número': turno.numero,
            'Estudiante': turno.nombre,
            'Email': turno.email,
            'Servicio': turno.servicio,
            'Estado': turno.estado === 'atendido' ? 'Atendido' : 'Cancelado',
            'Fecha Creación': fechaCreacion.toLocaleString('es-ES'),
            'Fecha Finalización': fechaFinalizacion ? fechaFinalizacion.toLocaleString('es-ES') : 'N/A',
            'Atendido por': atendidoPor,
            'Observaciones': turno.descripcion || turno.motivoCancelacion || 'Sin observaciones'
        };
    });
    
    // Crear workbook y worksheet
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial');
    
    // Generar nombre del archivo
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `historial_${fecha}.xlsx`;
    
    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo);
    showAlert('Archivo exportado correctamente', 'success');
}

function verDetallesTurno(turnoId) {
    const turno = db.turnos.find(t => t.id === turnoId);
    if (!turno) {
        showAlert('Error: Turno no encontrado', 'danger');
        return;
    }
    
    const fechaCreacion = new Date(turno.fechaCreacion);
    const fechaFinalizacion = turno.fechaAtencion ? new Date(turno.fechaAtencion) : 
                             turno.fechaCancelacion ? new Date(turno.fechaCancelacion) : null;
    
    const duracion = fechaFinalizacion ? calcularDuracion(fechaCreacion, fechaFinalizacion) : 'N/A';
    
    // Obtener información del usuario que atendió/canceló
    let usuarioInfo = 'N/A';
    if (turno.estado === 'atendido' && turno.usuarioAtendio) {
        const usuarioAtendio = db.getUsuario(turno.usuarioAtendio);
        usuarioInfo = usuarioAtendio ? `${usuarioAtendio.nombre} (${usuarioAtendio.correo})` : turno.usuarioAtendio;
    } else if (turno.estado === 'cancelado' && turno.usuarioCancelo) {
        const usuarioCancelo = db.getUsuario(turno.usuarioCancelo);
        usuarioInfo = usuarioCancelo ? `${usuarioCancelo.nombre} (${usuarioCancelo.correo})` : turno.usuarioCancelo;
    }
    
    const observaciones = turno.descripcion || turno.motivoCancelacion || 'Sin observaciones';
    
    const detallesHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6><i class="fas fa-ticket-alt me-2"></i>Información del Turno</h6>
                <p><strong>Número:</strong> #${turno.numero}</p>
                <p><strong>Estado:</strong> ${turno.estado === 'atendido' ? '<span class="badge bg-success">Atendido</span>' : '<span class="badge bg-danger">Cancelado</span>'}</p>
                <p><strong>Servicio:</strong> ${turno.servicio}</p>
            </div>
            <div class="col-md-6">
                <h6><i class="fas fa-user me-2"></i>Información del Estudiante</h6>
                <p><strong>Nombre:</strong> ${turno.nombre}</p>
                <p><strong>Email:</strong> ${turno.email}</p>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-md-6">
                <h6><i class="fas fa-calendar me-2"></i>Fechas</h6>
                <p><strong>Creación:</strong> ${fechaCreacion.toLocaleString('es-ES')}</p>
                ${fechaFinalizacion ? `<p><strong>Finalización:</strong> ${fechaFinalizacion.toLocaleString('es-ES')}</p>` : ''}
                <p><strong>Duración:</strong> ${duracion}</p>
            </div>
            <div class="col-md-6">
                <h6><i class="fas fa-user-cog me-2"></i>Información de Atención</h6>
                <p><strong>${turno.estado === 'atendido' ? 'Atendido por:' : 'Cancelado por:'}</strong> ${usuarioInfo}</p>
                ${turno.casilla ? `<p><strong>Casilla:</strong> ${turno.casilla}</p>` : ''}
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-12">
                <h6><i class="fas fa-comment me-2"></i>${turno.estado === 'atendido' ? 'Observaciones de Atención' : 'Motivo de Cancelación'}</h6>
                <div class="detalles-registro">
                    ${observaciones}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('detallesModalBody').innerHTML = detallesHTML;
    
    const modal = new bootstrap.Modal(document.getElementById('detallesModal'));
    modal.show();
}

// ==================== FUNCIONES AUXILIARES ====================

function calcularDuracion(fechaInicio, fechaFin) {
    const diferencia = fechaFin - fechaInicio;
    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;
    
    if (horas > 0) {
        return `${horas}h ${minutosRestantes}m`;
    } else {
        return `${minutosRestantes}m`;
    }
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// ==================== EXPORTAR FUNCIONES ====================

window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;
window.limpiarHistorial = limpiarHistorial;
window.exportarAExcel = exportarAExcel;
window.verDetallesTurno = verDetallesTurno; 