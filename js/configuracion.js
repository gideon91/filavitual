document.addEventListener('DOMContentLoaded', function() {
    // Validar autenticación usando el nuevo sistema
    if (!auth.isAuthenticated() || !auth.isAdmin()) {
        auth.redirectToLogin();
        return;
    }
    
    console.log('Acceso permitido a configuración');

    // Inicializar
    cargarServicios();
    cargarCasillas();
    cargarUsuarios();
    cargarFondoGuardado();

    // Event listeners
    document.getElementById('agregarServicioBtn').addEventListener('click', abrirModalServicio);
    document.getElementById('limpiarServiciosBtn').addEventListener('click', limpiarServiciosExistentes);
    document.getElementById('agregarCasillaBtn').addEventListener('click', abrirModalCasilla);
    document.getElementById('limpiarCasillasBtn').addEventListener('click', limpiarCasillasExistentes);
    document.getElementById('agregarUsuarioBtn').addEventListener('click', abrirModalAgregarUsuario);
    document.getElementById('guardarServicioBtn').addEventListener('click', guardarServicio);
    document.getElementById('guardarCasillaBtn').addEventListener('click', guardarCasilla);
    document.getElementById('guardarUsuarioBtn').addEventListener('click', guardarUsuario);

    // Eventos de fondo
    document.getElementById('btnVerFondo').addEventListener('click', function() {
        new bootstrap.Modal(document.getElementById('fondoModal')).show();
    });
    document.getElementById('btnRestaurarFondo').addEventListener('click', function() {
        showConfirmation('¿Estás seguro de que quieres restaurar el fondo por defecto?', function() {
            restaurarFondoPorDefecto();
        });
    });
    document.getElementById('btnSeleccionarFondo').addEventListener('click', function() {
        document.getElementById('fondoFile').click();
    });
    document.getElementById('fondoFile').addEventListener('change', handleFondoFileSelect);

    // Drag and drop para fondo
    const uploadArea = document.getElementById('fileUploadArea');
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('click', function() {
        document.getElementById('fondoFile').click();
    });

    if (typeof eventSystem !== 'undefined') {
        eventSystem.on('dataChanged', () => {
            cargarServicios && cargarServicios();
            cargarCasillas && cargarCasillas();
            cargarUsuarios && cargarUsuarios();
        });
        
        // Escuchar cambios de fondo
        eventSystem.on('fondoCambiado', (data) => {
            console.log('Fondo cambiado en configuración:', data.fileName);
            // El fondo ya se aplicó automáticamente, solo actualizar la vista previa
            const fondoPreview = document.getElementById('fondoPreview');
            if (fondoPreview) {
                fondoPreview.style.backgroundImage = `url(${data.imageData})`;
                const fondoInfo = fondoPreview.querySelector('.fondo-info');
                if (fondoInfo) {
                    fondoInfo.innerHTML = `
                        <strong>${data.fileName}</strong><br>
                        <small>${(data.fileSize / 1024 / 1024).toFixed(2)} MB</small>
                    `;
                }
            }
        });
    }
});

// ==================== FUNCIONES DE SERVICIOS ====================
function cargarServicios() {
    const servicios = db.getServicios();
    const tabla = document.getElementById('tablaServicios');
    tabla.innerHTML = servicios.map(servicio => `
        <tr>
            <td>${servicio.id}</td>
            <td>${servicio.nombre}</td>
            <td><small class="text-muted">${servicio.descripcion || 'Sin descripción'}</small></td>
            <td><span class="badge ${servicio.activo ? 'bg-success' : 'bg-secondary'}">${servicio.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td>
                <div class="d-flex gap-2">
                    <button onclick="editarServicio(${servicio.id})" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="eliminarServicio(${servicio.id})" class="btn btn-sm btn-outline-danger">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('') || `
        <tr>
            <td colspan="5" class="text-center text-muted py-4">
                <i class="fas fa-cogs me-2"></i> No hay servicios configurados
            </td>
        </tr>
    `;
}

function abrirModalServicio(servicioId = null) {
    const modal = new bootstrap.Modal(document.getElementById('servicioModal'));
    const form = document.getElementById('servicioForm');
    form.reset();
    
    if (servicioId) {
        const servicio = db.getServicios().find(s => s.id === servicioId);
        if (servicio) {
            document.getElementById('servicioModalLabel').textContent = 'Editar Servicio';
            document.getElementById('servicioId').value = servicio.id;
            document.getElementById('servicioNombre').value = servicio.nombre;
            document.getElementById('servicioDescripcion').value = servicio.descripcion || '';
            document.getElementById('servicioActivo').checked = servicio.activo;
        }
    } else {
        document.getElementById('servicioModalLabel').textContent = 'Agregar Servicio';
    }
    modal.show();
}

function guardarServicio() {
    const id = parseInt(document.getElementById('servicioId').value) || null;
    const nombre = document.getElementById('servicioNombre').value.trim();
    const descripcion = document.getElementById('servicioDescripcion').value.trim();
    const activo = document.getElementById('servicioActivo').checked;

    if (!nombre) {
        showAlert('El nombre del servicio es obligatorio', 'warning');
        return;
    }

    // Validar que no exista un servicio con el mismo nombre (excepto si es el mismo que se está editando)
    const serviciosExistentes = db.getServicios();
    const servicioDuplicado = serviciosExistentes.find(s => 
        s.nombre.toLowerCase() === nombre.toLowerCase() && s.id !== id
    );
    
    if (servicioDuplicado) {
        showAlert('Ya existe un servicio con ese nombre', 'warning');
        return;
    }

    try {
        if (id) {
            db.editarServicio(id, nombre, descripcion, activo);
            showAlert('Servicio actualizado correctamente', 'success');
        } else {
            db.agregarServicio(nombre, descripcion);
            showAlert('Servicio agregado correctamente', 'success');
        }
        
        bootstrap.Modal.getInstance(document.getElementById('servicioModal')).hide();
        cargarServicios();
        // Emitir evento para actualizar otras páginas
        if (typeof eventSystem !== 'undefined') {
            eventSystem.emit('servicioModificado', { nombre, accion: id ? 'editado' : 'agregado' });
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
    }
}

function limpiarServiciosExistentes() {
    showConfirmation(
        '¿Estás seguro de que quieres eliminar todos los servicios existentes? Esta acción no se puede deshacer.',
        () => {
            try {
                // Obtener todos los servicios
                const servicios = db.getServicios();
                
                // Eliminar cada servicio
                servicios.forEach(servicio => {
                    db.eliminarServicio(servicio.id);
                });
                
                showAlert('Todos los servicios han sido eliminados', 'success');
                cargarServicios();
                
                // Emitir evento para actualizar otras páginas
                if (typeof eventSystem !== 'undefined') {
                    eventSystem.emit('servicioModificado', { accion: 'limpiado' });
                }
            } catch (error) {
                showAlert('Error al limpiar servicios: ' + error.message, 'danger');
            }
        }
    );
}

function editarServicio(servicioId) {
    abrirModalServicio(servicioId);
}

function eliminarServicio(servicioId) {
    const servicio = db.getServicios().find(s => s.id === servicioId);
    if (!servicio) return;

    showConfirmation(
        `¿Eliminar el servicio "${servicio.nombre}"?`,
        () => {
            try {
                db.eliminarServicio(servicioId);
                showAlert('Servicio eliminado correctamente', 'success');
                cargarServicios();
            } catch (error) {
                showAlert('Error al eliminar: ' + error.message, 'danger');
            }
        }
    );
}

// ==================== FUNCIONES DE CASILLAS ====================
function cargarCasillas() {
    const casillas = db.getCasillas();
    const tabla = document.getElementById('tablaCasillas');
    tabla.innerHTML = casillas.map(casilla => {
        const servicios = db.getServicios().filter(s => casilla.servicios.includes(s.id));
        const usuarios = db.getUsuarios().filter(u => casilla.usuarios && casilla.usuarios.includes(u.id));

        return `
            <tr>
                <td>${casilla.id}</td>
                <td><strong>${casilla.nombre}</strong></td>
                <td>
                    ${servicios.length > 0 
                        ? servicios.map(s => `<span class="badge bg-primary me-1">${s.nombre}</span>`).join('')
                        : '<span class="text-muted">Sin servicios</span>'
                    }
                </td>
                <td>
                    <span class="badge ${casilla.estado === 'libre' ? 'bg-success' : 'bg-danger'}">
                        ${casilla.estado === 'libre' ? 'Libre' : 'Ocupada'}
                    </span>
                </td>
                <td>
                    <div class="d-flex flex-column gap-1">
                        <div class="d-flex align-items-center">
                            <span class="badge bg-info me-2">${usuarios.length} usuario${usuarios.length !== 1 ? 's' : ''}</span>
                            ${usuarios.length > 0 ? '<button class="btn btn-sm btn-outline-info" onclick="verUsuariosCasilla(' + casilla.id + ')" title="Ver usuarios"><i class="fas fa-eye"></i></button>' : ''}
                        </div>
                        ${usuarios.length > 0 
                            ? '<small class="text-muted">' + usuarios.slice(0, 2).map(u => u.nombre).join(', ') + (usuarios.length > 2 ? ' y ' + (usuarios.length - 2) + ' más' : '') + '</small>'
                            : '<small class="text-muted">Sin usuarios asignados</small>'
                        }
                    </div>
                </td>
                <td>
                    <span class="badge ${casilla.activa ? 'bg-success' : 'bg-secondary'}">
                        ${casilla.activa ? 'Activa' : 'Inactiva'}
                    </span>
                </td>
                <td>
                    <div class="d-flex gap-2">
                        <button onclick="${casilla.activa ? 'desactivarCasilla' : 'activarCasilla'}(${casilla.id})" 
                                class="btn btn-sm ${casilla.activa ? 'btn-outline-warning' : 'btn-outline-success'}" 
                                title="${casilla.activa ? 'Desactivar' : 'Activar'}">
                            <i class="fas ${casilla.activa ? 'fa-pause' : 'fa-play'}"></i>
                        </button>
                        <button onclick="editarCasilla(${casilla.id})" class="btn btn-sm btn-outline-primary" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="abrirModalUsuariosCasilla(${casilla.id})" class="btn btn-sm btn-outline-info" title="Asignar Usuarios">
                            <i class="fas fa-users"></i>
                        </button>
                        <button onclick="eliminarCasilla(${casilla.id})" class="btn btn-sm btn-outline-danger" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('') || `
        <tr>
            <td colspan="7" class="text-center text-muted py-5">
                <div class="d-flex flex-column align-items-center">
                    <i class="fas fa-door-open fa-2x mb-3 text-muted"></i>
                    <h6 class="text-muted">No hay casillas configuradas</h6>
                    <p class="text-muted mb-0">Haz clic en "Agregar Casilla" para crear la primera casilla</p>
                </div>
            </td>
        </tr>
    `;
}

function abrirModalCasilla(casillaId = null) {
    const modal = new bootstrap.Modal(document.getElementById('casillaModal'));
    const form = document.getElementById('casillaForm');
    form.reset();
    
    // Cargar checkboxes de servicios
    const serviciosContainer = document.getElementById('casillaServiciosCheckboxes');
    serviciosContainer.innerHTML = db.getServicios().map(servicio => `
        <div class="form-check">
            <input class="form-check-input" type="checkbox" 
                   id="servicio-${servicio.id}" 
                   value="${servicio.id}"
                   ${servicio.activo ? '' : 'disabled'}>
            <label class="form-check-label" for="servicio-${servicio.id}">
                ${servicio.nombre}
                ${servicio.activo ? '' : '<span class="badge bg-secondary ms-2">Inactivo</span>'}
            </label>
        </div>
    `).join('');

    if (casillaId) {
        const casilla = db.getCasillas().find(c => c.id === casillaId);
        if (casilla) {
            document.getElementById('casillaModalLabel').textContent = 'Editar Casilla';
            document.getElementById('casillaId').value = casilla.id;
            document.getElementById('casillaNombre').value = casilla.nombre;
            
            // Marcar servicios asignados
            casilla.servicios.forEach(servicioId => {
                const checkbox = document.getElementById(`servicio-${servicioId}`);
                if (checkbox) checkbox.checked = true;
            });
        }
    } else {
        document.getElementById('casillaModalLabel').textContent = 'Agregar Casilla';
    }
    modal.show();
}

function guardarCasilla() {
    const id = parseInt(document.getElementById('casillaId').value) || null;
    const nombre = document.getElementById('casillaNombre').value.trim();
    const serviciosSeleccionados = Array.from(document.querySelectorAll('#casillaServiciosCheckboxes input:checked')).map(cb => parseInt(cb.value));

    if (!nombre) {
        showAlert('El nombre de la casilla es obligatorio', 'warning');
        return;
    }

    // Validar que no exista una casilla con el mismo nombre (excepto si es la misma que se está editando)
    const casillasExistentes = db.getCasillas();
    const casillaDuplicada = casillasExistentes.find(c => 
        c.nombre.toLowerCase() === nombre.toLowerCase() && c.id !== id
    );
    
    if (casillaDuplicada) {
        showAlert('Ya existe una casilla con ese nombre', 'warning');
        return;
    }

    if (serviciosSeleccionados.length === 0) {
        showAlert('Debe seleccionar al menos un servicio', 'warning');
        return;
    }

    try {
        if (id) {
            db.editarCasilla(id, nombre, serviciosSeleccionados);
            showAlert('Casilla actualizada correctamente', 'success');
        } else {
            db.agregarCasilla(nombre, serviciosSeleccionados);
            showAlert('Casilla agregada correctamente', 'success');
        }
        
        bootstrap.Modal.getInstance(document.getElementById('casillaModal')).hide();
        cargarCasillas();
        // Emitir evento para actualizar otras páginas
        if (typeof eventSystem !== 'undefined') {
            eventSystem.emit('casillaModificada', { nombre, accion: id ? 'editada' : 'agregada' });
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
    }
}

function limpiarCasillasExistentes() {
    showConfirmation(
        '¿Estás seguro de que quieres eliminar todas las casillas existentes? Esta acción no se puede deshacer.',
        () => {
            try {
                // Obtener todas las casillas
                const casillas = db.getCasillas();
                
                // Eliminar cada casilla
                casillas.forEach(casilla => {
                    db.eliminarCasilla(casilla.id);
                });
                
                showAlert('Todas las casillas han sido eliminadas', 'success');
                cargarCasillas();
                
                // Emitir evento para actualizar otras páginas
                if (typeof eventSystem !== 'undefined') {
                    eventSystem.emit('casillaModificada', { accion: 'limpiada' });
                }
            } catch (error) {
                showAlert('Error al limpiar casillas: ' + error.message, 'danger');
            }
        }
    );
}

function activarCasilla(casillaId) {
    try {
        db.activarCasilla(casillaId);
        showAlert('Casilla activada correctamente', 'success');
        cargarCasillas();
        
        // Emitir evento para actualizar otras páginas
        if (typeof eventSystem !== 'undefined') {
            eventSystem.emit('casillaModificada', { accion: 'activada' });
        }
    } catch (error) {
        showAlert('Error al activar casilla: ' + error.message, 'danger');
    }
}

function desactivarCasilla(casillaId) {
    const casilla = db.getCasillas().find(c => c.id === casillaId);
    if (!casilla) return;

    showConfirmation(
        `¿Desactivar la casilla "${casilla.nombre}"? Las casillas inactivas no aparecerán en el dashboard ni podrán recibir turnos.`,
        () => {
            try {
                db.desactivarCasilla(casillaId);
                showAlert('Casilla desactivada correctamente', 'success');
                cargarCasillas();
                
                // Emitir evento para actualizar otras páginas
                if (typeof eventSystem !== 'undefined') {
                    eventSystem.emit('casillaModificada', { nombre: casilla.nombre, accion: 'desactivada' });
                }
            } catch (error) {
                showAlert('Error al desactivar casilla: ' + error.message, 'danger');
            }
        }
    );
}

function editarCasilla(casillaId) {
    abrirModalCasilla(casillaId);
}

function eliminarCasilla(casillaId) {
    const casilla = db.getCasillas().find(c => c.id === casillaId);
    if (!casilla) return;

    showConfirmation(
        `¿Eliminar la casilla "${casilla.nombre}"?`,
        () => {
            try {
                db.eliminarCasilla(casillaId);
                showAlert('Casilla eliminada correctamente', 'success');
                cargarCasillas();
                
                // Emitir evento para actualizar otras páginas
                if (typeof eventSystem !== 'undefined') {
                    eventSystem.emit('casillaModificada', { nombre: casilla.nombre, accion: 'eliminada' });
                }
            } catch (error) {
                showAlert('Error al eliminar: ' + error.message, 'danger');
            }
        }
    );
}

function abrirModalUsuariosCasilla(casillaId) {
    const casilla = db.getCasillas().find(c => c.id === casillaId);
    if (!casilla) {
        showAlert('Casilla no encontrada', 'danger');
        return;
    }

    // Actualizar título del modal
    document.getElementById('casillaUsuariosTitulo').textContent = `Asignar Usuarios a: ${casilla.nombre}`;
    
    // Cargar usuarios disponibles
    const usuarios = db.getUsuarios();
    const usuariosAsignados = casilla.usuarios || [];
    
    const container = document.getElementById('usuariosCasilla');
    container.innerHTML = usuarios.map(usuario => {
        const estaAsignado = usuariosAsignados.includes(usuario.id);
        return `
            <div class="list-group-item d-flex align-items-center">
                <div class="form-check me-3">
                    <input class="form-check-input" type="checkbox" 
                           id="usuario_${usuario.id}" 
                   value="${usuario.id}" 
                           ${estaAsignado ? 'checked' : ''}>
                    <label class="form-check-label" for="usuario_${usuario.id}"></label>
        </div>
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${usuario.nombre}</strong>
                            <br>
                            <small class="text-muted">${usuario.correo}</small>
                        </div>
                        <div>
                            <span class="badge ${usuario.permisos === 'admin' ? 'bg-danger' : 'bg-primary'}">
                                ${usuario.permisos === 'admin' ? 'Administrador' : 'Usuario'}
                            </span>
                            ${estaAsignado ? '<span class="badge bg-success ms-1">Asignado</span>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('') || `
        <div class="list-group-item text-center text-muted py-4">
            <i class="fas fa-users fa-2x mb-3"></i>
            <h6>No hay usuarios disponibles</h6>
            <p class="mb-0">Primero debes crear usuarios en la sección de Administración de Usuarios</p>
        </div>
    `;
    
    // Configurar evento para guardar
    const guardarBtn = document.getElementById('guardarUsuariosCasillaBtn');
    guardarBtn.onclick = () => guardarUsuariosCasilla(casillaId);
    
    const modal = new bootstrap.Modal(document.getElementById('usuariosCasillaModal'));
    modal.show();
}

function seleccionarTodosUsuarios() {
    const checkboxes = document.querySelectorAll('#usuariosCasilla input[type="checkbox"]');
    const todosSeleccionados = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = !todosSeleccionados;
    });
    
    const btn = document.querySelector('button[onclick="seleccionarTodosUsuarios()"]');
    if (btn) {
        btn.innerHTML = todosSeleccionados 
            ? '<i class="fas fa-check-square me-1"></i>Seleccionar Todos'
            : '<i class="fas fa-square me-1"></i>Deseleccionar Todos';
    }
}

function guardarUsuariosCasilla(casillaId) {
    const casilla = db.getCasillas().find(c => c.id === casillaId);
    if (!casilla) {
        showAlert('Casilla no encontrada', 'danger');
        return;
    }
    
    // Obtener usuarios seleccionados
    const checkboxes = document.querySelectorAll('#usuariosCasilla input[type="checkbox"]:checked');
    const usuariosSeleccionados = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    try {
        // Actualizar usuarios de la casilla
        casilla.usuarios = usuariosSeleccionados;
        db.guardarDatos();
        
        showAlert(`Se asignaron ${usuariosSeleccionados.length} usuarios a la casilla "${casilla.nombre}"`, 'success');
            cargarCasillas();
        
        // Emitir evento para actualizar otras páginas
        if (typeof eventSystem !== 'undefined') {
            eventSystem.emit('casillaModificada', { 
                nombre: casilla.nombre, 
                accion: 'usuarios_asignados',
                usuarios: usuariosSeleccionados.length 
            });
        }
        
        // Cerrar modal
        bootstrap.Modal.getInstance(document.getElementById('usuariosCasillaModal')).hide();
        } catch (error) {
        showAlert('Error al asignar usuarios: ' + error.message, 'danger');
        }
}

function verUsuariosCasilla(casillaId) {
    const casilla = db.getCasillas().find(c => c.id === casillaId);
    if (!casilla) {
        showAlert('Casilla no encontrada', 'danger');
        return;
    }
    
    const usuarios = db.getUsuarios().filter(u => casilla.usuarios && casilla.usuarios.includes(u.id));
    
    let contenido = '';
    if (usuarios.length > 0) {
        contenido = usuarios.map(usuario => `
            <div class="list-group-item d-flex align-items-center">
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${usuario.nombre}</strong>
                            <br>
                            <small class="text-muted">${usuario.correo}</small>
                        </div>
                        <div>
                            <span class="badge ${usuario.permisos === 'admin' ? 'bg-danger' : 'bg-primary'}">
                                ${usuario.permisos === 'admin' ? 'Administrador' : 'Usuario'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        contenido = `
            <div class="list-group-item text-center text-muted py-4">
                <i class="fas fa-users fa-2x mb-3"></i>
                <h6>No hay usuarios asignados</h6>
                <p class="mb-0">Esta casilla no tiene usuarios asignados</p>
            </div>
        `;
    }
    
    // Mostrar modal con información
    const modal = new bootstrap.Modal(document.getElementById('usuariosCasillaModal'));
    document.getElementById('casillaUsuariosTitulo').textContent = `Usuarios Asignados a: ${casilla.nombre}`;
    document.getElementById('usuariosCasilla').innerHTML = contenido;
    
    // Ocultar botones de selección y guardar
    const seleccionarBtn = document.querySelector('button[onclick="seleccionarTodosUsuarios()"]');
    const guardarBtn = document.getElementById('guardarUsuariosCasillaBtn');
    if (seleccionarBtn) seleccionarBtn.style.display = 'none';
    if (guardarBtn) guardarBtn.style.display = 'none';
    
    // Cambiar texto del botón cancelar
    const cancelarBtn = document.querySelector('#usuariosCasillaModal .btn-secondary');
    if (cancelarBtn) cancelarBtn.textContent = 'Cerrar';
    
    modal.show();
}

function verCasillasUsuario(usuarioId) {
    const usuario = db.getUsuarios().find(u => u.id === usuarioId);
    if (!usuario) {
        showAlert('Usuario no encontrado', 'danger');
        return;
    }

    const casillasAsignadas = db.obtenerCasillasDeUsuario(usuarioId);
    const casillasActivas = casillasAsignadas.filter(c => c.activa !== false);
    
    let contenido = '';
    if (casillasAsignadas.length > 0) {
        contenido = casillasAsignadas.map(casilla => `
            <div class="list-group-item d-flex align-items-center">
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${casilla.nombre}</strong>
                            <br>
                            <small class="text-muted">ID: ${casilla.id}</small>
                        </div>
                        <div>
                            <span class="badge ${casilla.activa ? 'bg-success' : 'bg-secondary'} me-2">
                                ${casilla.activa ? 'Activa' : 'Inactiva'}
                            </span>
                            <span class="badge ${casilla.estado === 'libre' ? 'bg-success' : 'bg-danger'}">
                                ${casilla.estado === 'libre' ? 'Libre' : 'Ocupada'}
                            </span>
                        </div>
                    </div>
                    <div class="mt-2">
                        <small class="text-muted">
                            Servicios: ${db.getServicios().filter(s => casilla.servicios.includes(s.id)).map(s => s.nombre).join(', ') || 'Sin servicios'}
                        </small>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        contenido = `
            <div class="list-group-item text-center text-muted py-4">
                <i class="fas fa-door-open fa-2x mb-3"></i>
                <h6>No hay casillas asignadas</h6>
                <p class="mb-0">Este usuario no está asignado a ninguna casilla</p>
            </div>
        `;
    }
    
    // Mostrar modal con información
    const modal = new bootstrap.Modal(document.getElementById('usuariosCasillaModal'));
    document.getElementById('casillaUsuariosTitulo').textContent = `Casillas Asignadas a: ${usuario.nombre}`;
    document.getElementById('usuariosCasilla').innerHTML = contenido;
    
    // Ocultar botones de selección y guardar
    const seleccionarBtn = document.querySelector('button[onclick="seleccionarTodosUsuarios()"]');
    const guardarBtn = document.getElementById('guardarUsuariosCasillaBtn');
    if (seleccionarBtn) seleccionarBtn.style.display = 'none';
    if (guardarBtn) guardarBtn.style.display = 'none';
    
    // Cambiar texto del botón cancelar
    const cancelarBtn = document.querySelector('#usuariosCasillaModal .btn-secondary');
    if (cancelarBtn) cancelarBtn.textContent = 'Cerrar';
    
    modal.show();
}

// ==================== FUNCIONES DE USUARIOS ====================

function cargarUsuarios() {
    const usuarios = db.getUsuarios();
    const tabla = document.getElementById('tablaUsuarios');
    const usuarioActual = auth.getCurrentUser();
    const esUsuarioGlobal = usuarioActual && usuarioActual.correo === 'soportetecnico@cesun.edu.mx';
    
    tabla.innerHTML = usuarios.map(usuario => {
        const esAdminGlobal = db.esAdminGlobal(usuario.id);
        const sePuedeEliminar = db.sePuedeEliminarUsuario(usuario.id);
        // Solo el usuario global puede eliminar al usuario global
        const puedeEliminar = sePuedeEliminar && (esUsuarioGlobal || !esAdminGlobal);
        
        return `
            <tr>
                <td><strong>${usuario.nombre}</strong></td>
                <td>${usuario.correo}</td>
                <td>
                    <span class="badge ${usuario.permisos === 'admin' ? 'bg-danger' : 'bg-primary'}">
                        ${usuario.permisos === 'admin' ? 'Administrador' : 'Usuario'}
                    </span>
                    ${esAdminGlobal ? '<br><small class="text-warning"><i class="fas fa-shield-alt"></i> Admin Global</small>' : ''}
                </td>
                <td>
                    <span class="badge ${usuario.bloqueado ? 'bg-danger' : 'bg-success'}">
                        ${usuario.bloqueado ? 'Bloqueado' : 'Activo'}
                    </span>
                </td>
                <td>
                    <div class="d-flex gap-2">
                        <button onclick="verCasillasUsuario(${usuario.id})" class="btn btn-sm btn-outline-info" title="Ver casillas asignadas">
                            <i class="fas fa-door-open"></i>
                        </button>
                        <button onclick="editarUsuario(${usuario.id})" class="btn btn-sm btn-outline-primary" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="toggleBloqueoUsuario(${usuario.id})" class="btn btn-sm ${usuario.bloqueado ? 'btn-outline-success' : 'btn-outline-warning'}" title="${usuario.bloqueado ? 'Desbloquear' : 'Bloquear'}">
                            <i class="fas ${usuario.bloqueado ? 'fa-unlock' : 'fa-lock'}"></i>
                        </button>
                        <button onclick="restablecerContrasenaUsuario(${usuario.id})" class="btn btn-sm btn-outline-warning" title="Restablecer contraseña">
                            <i class="fas fa-key"></i>
                        </button>
                        <button onclick="eliminarUsuario(${usuario.id})" class="btn btn-sm btn-outline-danger" title="Eliminar" ${!puedeEliminar ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('') || `
        <tr>
            <td colspan="5" class="text-center text-muted py-5">
                <div class="d-flex flex-column align-items-center">
                    <i class="fas fa-users fa-2x mb-3 text-muted"></i>
                    <h6 class="text-muted">No hay usuarios configurados</h6>
                    <p class="text-muted mb-0">Haz clic en "Agregar Usuario" para crear el primer usuario</p>
                </div>
            </td>
        </tr>
    `;
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('usuarioContrasena');
    const confirmInput = document.getElementById('usuarioConfirmarContrasena');
    const icon = document.getElementById('passwordIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        if (confirmInput) confirmInput.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        if (confirmInput) confirmInput.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

function abrirModalAgregarUsuario() {
    document.getElementById('usuarioId').value = '';
    document.getElementById('usuarioNombre').value = '';
    document.getElementById('usuarioCorreo').value = '';
    document.getElementById('usuarioContrasena').value = '';
    document.getElementById('usuarioConfirmarContrasena').value = '';
    document.getElementById('usuarioRol').value = 'normal';
    document.getElementById('usuarioActivo').checked = true;
    
    document.getElementById('usuarioModalLabel').textContent = 'Agregar Usuario';
    document.getElementById('guardarUsuarioBtn').textContent = 'Guardar';
    
    const modal = new bootstrap.Modal(document.getElementById('usuarioModal'));
    modal.show();
}

function editarUsuario(usuarioId) {
    const usuario = db.getUsuarios().find(u => u.id === usuarioId);
    if (!usuario) {
        showAlert('Usuario no encontrado', 'danger');
        return;
    }
    
    document.getElementById('usuarioId').value = usuario.id;
    document.getElementById('usuarioNombre').value = usuario.nombre;
    document.getElementById('usuarioCorreo').value = usuario.correo;
    document.getElementById('usuarioContrasena').value = '';
    document.getElementById('usuarioConfirmarContrasena').value = '';
    document.getElementById('usuarioRol').value = usuario.permisos;
    document.getElementById('usuarioActivo').checked = !usuario.bloqueado;
    
    document.getElementById('usuarioModalLabel').textContent = 'Editar Usuario';
    document.getElementById('guardarUsuarioBtn').textContent = 'Actualizar';
    
    const modal = new bootstrap.Modal(document.getElementById('usuarioModal'));
    modal.show();
}

function guardarUsuario() {
    const id = document.getElementById('usuarioId').value;
    const nombre = document.getElementById('usuarioNombre').value.trim();
    const correo = document.getElementById('usuarioCorreo').value.trim();
    const contrasena = document.getElementById('usuarioContrasena').value;
    const confirmarContrasena = document.getElementById('usuarioConfirmarContrasena').value;
    const rol = document.getElementById('usuarioRol').value;
    const activo = document.getElementById('usuarioActivo').checked;
    
    // Validaciones
    if (!nombre || !correo) {
        showAlert('Por favor complete todos los campos obligatorios', 'warning');
        return;
    }
    
    if (!id && (!contrasena || contrasena.length < 8)) {
        showAlert('La contraseña debe tener al menos 8 caracteres', 'warning');
        return;
    }
    
    if (contrasena && contrasena !== confirmarContrasena) {
        showAlert('Las contraseñas no coinciden', 'warning');
        return;
    }
    
    try {
        if (id) {
            // Actualizar usuario existente
            const usuario = db.getUsuarios().find(u => u.id === parseInt(id));
            if (!usuario) {
                showAlert('Usuario no encontrado', 'danger');
                return;
            }
            
            // Verificar si el correo ya existe en otro usuario
            const usuarioConMismoCorreo = db.getUsuarios().find(u => u.correo === correo && u.id !== parseInt(id));
            if (usuarioConMismoCorreo) {
                showAlert('Ya existe un usuario con ese correo electrónico', 'warning');
                return;
            }
            
            // Actualizar datos básicos
            usuario.nombre = nombre;
            usuario.correo = correo;
            usuario.permisos = rol;
            usuario.bloqueado = !activo;
            
            // Actualizar contraseña solo si se proporcionó una nueva
            if (contrasena) {
                usuario.contrasena = contrasena;
            }
            
            db.actualizarUsuario(usuario);
            showAlert('Usuario actualizado correctamente', 'success');
        } else {
            // Crear nuevo usuario
            // Verificar si el correo ya existe
            const usuarioExistente = db.getUsuarios().find(u => u.correo === correo);
            if (usuarioExistente) {
                showAlert('Ya existe un usuario con ese correo electrónico', 'warning');
                return;
            }
            
            db.agregarUsuario(nombre, correo, contrasena, rol);
            showAlert('Usuario creado correctamente', 'success');
        }
        
        // Cerrar modal y recargar tabla
        bootstrap.Modal.getInstance(document.getElementById('usuarioModal')).hide();
        cargarUsuarios();
        
    } catch (error) {
        showAlert('Error al guardar usuario: ' + error.message, 'danger');
    }
}

function restablecerContrasenaUsuario(usuarioId) {
    const usuario = db.getUsuarios().find(u => u.id === usuarioId);
    if (!usuario) {
        showAlert('Usuario no encontrado', 'danger');
        return;
    }
    
    showConfirmation(`¿Estás seguro de que quieres restablecer la contraseña de "${usuario.nombre}"?`, function() {
        const nuevaContrasena = generarContrasenaTemporal();
        
        // Actualizar la contraseña en la base de datos
        usuario.contrasena = nuevaContrasena;
        db.setContrasenaUsuario(usuarioId, nuevaContrasena);
        
        // Agregar al historial
        db.agregarEntradaHistorial(
            'CONTRASENA_RESTABLECIDA',
            `Contraseña restablecida para usuario: ${usuario.nombre} (${usuario.correo})`,
            auth.getCurrentUser()?.id
        );
        
        showAlert(`Contraseña restablecida correctamente. Nueva contraseña: ${nuevaContrasena}`, 'success');
        
        // Recargar la tabla de usuarios
        cargarUsuarios();
    });
}

function generarContrasenaTemporal() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let contrasena = '';
    for (let i = 0; i < 8; i++) {
        contrasena += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return contrasena;
}

function toggleBloqueoUsuario(usuarioId) {
    try {
        db.setBloqueoUsuario(usuarioId, !db.getUsuarios().find(u => u.id === usuarioId).bloqueado);
        showAlert('Estado del usuario actualizado correctamente', 'success');
        cargarUsuarios();
    } catch (error) {
        showAlert('Error al cambiar el estado del usuario: ' + error.message, 'danger');
    }
}

function eliminarUsuario(usuarioId) {
    const usuario = db.getUsuarios().find(u => u.id === usuarioId);
    if (!usuario) {
        showAlert('Usuario no encontrado', 'danger');
        return;
    }
    
    // Verificar si el usuario está asignado a alguna casilla
    const casillas = db.getCasillas();
    const casillasAsignadas = casillas.filter(c => c.usuarios && c.usuarios.includes(usuarioId));
    
    if (casillasAsignadas.length > 0) {
        showAlert(`No se puede eliminar el usuario porque está asignado a las siguientes casillas: ${casillasAsignadas.map(c => c.nombre).join(', ')}`, 'warning');
        return;
    }
    
    showConfirmation(`¿Estás seguro de que quieres eliminar al usuario "${usuario.nombre}"?`, function() {
        try {
            db.eliminarUsuario(usuarioId);
            showAlert('Usuario eliminado correctamente', 'success');
            cargarUsuarios();
        } catch (error) {
            showAlert('Error al eliminar usuario: ' + error.message, 'danger');
        }
    });
}

// ==================== FUNCIONES DE FONDO ====================
// Función para guardar el fondo en la base de datos
function guardarFondoEnBD(imageData, fileName, fileSize) {
    console.log('Guardando fondo en BD:', fileName);
    
    const fondoData = {
        imageData: imageData,
        fileName: fileName,
        fileSize: fileSize,
        fechaCambio: new Date().toISOString()
    };
    
    // Guardar en localStorage
    localStorage.setItem('fondoSistema', JSON.stringify(fondoData));
    console.log('✅ Fondo guardado en localStorage');
    
    // Aplicar el fondo a todas las páginas
    aplicarFondoATodasLasPaginas(imageData);
    
    // Emitir evento para sincronizar con otras páginas
    if (typeof eventSystem !== 'undefined') {
        eventSystem.emit('fondoCambiado', {
            imageData: imageData,
            fileName: fileName,
            fileSize: fileSize
        });
        console.log('✅ Evento fondoCambiado emitido');
    }
    
    // Notificar a otras pestañas
    localStorage.setItem('eventoGlobal', JSON.stringify({
        tipo: 'fondoCambiado',
        data: {
            imageData: imageData,
            fileName: fileName,
            fileSize: fileSize
        }
    }));
    console.log('✅ Evento global enviado a otras pestañas');
}

// Función para cargar el fondo guardado
function cargarFondoGuardado() {
    const fondoData = localStorage.getItem('fondoSistema');
    if (fondoData) {
        try {
            const fondo = JSON.parse(fondoData);
            console.log('Cargando fondo guardado:', fondo.fileName);
            
            // Aplicar el fondo inmediatamente
            aplicarFondoATodasLasPaginas(fondo.imageData);
            
            // Actualizar vista previa en configuración si existe
            const fondoPreview = document.getElementById('fondoPreview');
            if (fondoPreview) {
                fondoPreview.style.backgroundImage = `url(${fondo.imageData})`;
                const fondoInfo = fondoPreview.querySelector('.fondo-info');
                if (fondoInfo) {
                    fondoInfo.innerHTML = `
                        <strong>${fondo.fileName}</strong><br>
                        <small>${(fondo.fileSize / 1024 / 1024).toFixed(2)} MB</small>
                    `;
                }
                console.log('Vista previa actualizada con fondo guardado');
            }
            
            return fondo;
        } catch (error) {
            console.error('Error al cargar el fondo:', error);
        }
    }
    console.log('No hay fondo guardado, usando fondo por defecto');
    return null;
}

// Función para aplicar el fondo a todas las páginas
function aplicarFondoATodasLasPaginas(imageData) {
    console.log('Aplicando fondo:', imageData.substring(0, 50) + '...');
    
    // Aplicar inmediatamente al fondo de la página actual
    const bgFondo = document.querySelector('.bg-fondo-cesun');
    if (bgFondo) {
        bgFondo.style.backgroundImage = `url(${imageData})`;
        console.log('✅ Fondo aplicado inmediatamente en la página actual');
    } else {
        console.log('⚠️ Elemento .bg-fondo-cesun no encontrado en esta página');
    }
    
    // El fondo se aplicará automáticamente en otras páginas a través del script fondo.js
    // que escucha los cambios en localStorage
}

// Función para restaurar el fondo por defecto
function restaurarFondoPorDefecto() {
    const fondoPorDefecto = '../images/Fondo de pantalla 2024.png';
    
    // Eliminar el fondo personalizado
    localStorage.removeItem('fondoSistema');
    
    // Aplicar el fondo por defecto
    aplicarFondoATodasLasPaginas(fondoPorDefecto);
    
    // Actualizar vista previa en configuración si existe
    const fondoPreview = document.getElementById('fondoPreview');
    if (fondoPreview) {
        fondoPreview.style.backgroundImage = `url(${fondoPorDefecto})`;
        const fondoInfo = fondoPreview.querySelector('.fondo-info');
        if (fondoInfo) {
            fondoInfo.innerHTML = `
                <strong>Fondo de pantalla 2024.png</strong><br>
                <small>Fondo por defecto</small>
            `;
        }
    }
    
    showAlert('Fondo restaurado al predeterminado', 'info');
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('fileUploadArea').classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('fileUploadArea').classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('fileUploadArea').classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file) handleFondoFile(file);
}

function handleFondoFileSelect(e) {
    const file = e.target.files[0];
    if (file) handleFondoFile(file);
}

function handleFondoFile(file) {
    // Validar tipo de archivo
    if (!file.type.match('image.*')) {
        showAlert('Solo se permiten archivos de imagen (JPG, PNG, GIF)', 'warning');
        return;
    }

    // Validar tamaño (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showAlert('El archivo no debe exceder los 10MB', 'warning');
        return;
    }

    console.log('Procesando archivo de fondo:', file.name, file.size, 'bytes');

    // Mostrar progreso
    document.getElementById('uploadProgress').style.display = 'block';
    const progressBar = document.querySelector('#uploadProgress .progress-bar');
    progressBar.style.width = '0%';

    // Simular upload (en producción usarías una API real)
    setTimeout(() => {
        progressBar.style.width = '25%';
        setTimeout(() => {
            progressBar.style.width = '50%';
            setTimeout(() => {
                progressBar.style.width = '75%';
                setTimeout(() => {
                    progressBar.style.width = '100%';
                    
                    // Crear URL local para la vista previa
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const imageData = e.target.result;
                        console.log('Archivo leído correctamente, tamaño base64:', imageData.length);
                        
                        // Guardar la imagen en localStorage
                        guardarFondoEnBD(imageData, file.name, file.size);
                        
                        // Actualizar vista previa
                        const fondoPreview = document.getElementById('fondoPreview');
                        if (fondoPreview) {
                            fondoPreview.style.backgroundImage = `url(${imageData})`;
                            console.log('Vista previa actualizada');
                        }
                        
                        // Actualizar información
                        const fondoInfo = fondoPreview.querySelector('.fondo-info');
                        if (fondoInfo) {
                            fondoInfo.innerHTML = `
                                <strong>${file.name}</strong><br>
                                <small>${(file.size / 1024 / 1024).toFixed(2)} MB</small>
                            `;
                        }
                        
                        document.getElementById('uploadProgress').style.display = 'none';
                        showAlert('Fondo actualizado correctamente en todas las páginas', 'success');
                        
                        // Actualizar el modal de vista completa
                        const fondoModalImg = document.querySelector('#fondoModal img');
                        if (fondoModalImg) {
                            fondoModalImg.src = imageData;
                        }
                    };
                    
                    reader.onerror = function() {
                        console.error('Error al leer el archivo');
                        showAlert('Error al procesar el archivo de imagen', 'danger');
                        document.getElementById('uploadProgress').style.display = 'none';
                    };
                    
                    reader.readAsDataURL(file);
                }, 200);
            }, 200);
        }, 200);
    }, 200);
}

// ==================== FUNCIONES UTILITARIAS ====================
function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.style.cssText = `
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
    
    alert.innerHTML = `
        <i class="fas fa-${icon} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(alert);
    
    // Auto-remover después de 3 segundos
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
    }, 3000);
}

function showConfirmation(message, onConfirm) {
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    document.getElementById('confirmModalLabel').textContent = 'Confirmación';
    document.getElementById('confirmModalBody').innerHTML = `
        <div class="text-center">
            <i class="fas fa-exclamation-triangle text-warning fa-2x mb-3"></i>
        <p>${message}</p>
        </div>
    `;
    
    document.getElementById('confirmModalBtn').onclick = function() {
        modal.hide();
        if (onConfirm) onConfirm();
    };
    
    modal.show();
}

function showConfirmModal(title, message, onConfirm) {
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    document.getElementById('confirmModalLabel').textContent = title;
    document.getElementById('confirmModalBody').innerHTML = `
        <div class="text-center">
            <i class="fas fa-exclamation-triangle text-warning fa-2x mb-3"></i>
            <p>${message}</p>
        </div>
    `;
    
    document.getElementById('confirmModalBtn').onclick = function() {
        modal.hide();
        if (onConfirm) onConfirm();
    };
    
    modal.show();
}

// Hacer funciones disponibles globalmente
window.limpiarServiciosExistentes = limpiarServiciosExistentes;
window.limpiarCasillasExistentes = limpiarCasillasExistentes;
window.seleccionarTodosUsuarios = seleccionarTodosUsuarios;
window.guardarUsuariosCasilla = guardarUsuariosCasilla;
window.verUsuariosCasilla = verUsuariosCasilla;
window.verCasillasUsuario = verCasillasUsuario;