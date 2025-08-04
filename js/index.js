// Función mejorada para generar turno con validaciones
function generarTurnoSeguro(nombre, email, servicio) {
    try {
        // Validaciones adicionales
        if (!nombre || !nombre.trim()) {
            throw new Error('El nombre es requerido');
        }
        
        if (!email || !email.trim()) {
            throw new Error('El email es requerido');
        }
        
        if (!email.match(/^[a-zA-Z0-9._%+-]+@(cesun|cesunbc)\.edu\.mx$/)) {
            throw new Error('El email debe ser institucional (@cesun.edu.mx o @cesunbc.edu.mx)');
        }
        
        if (!servicio || !servicio.trim()) {
            throw new Error('El servicio es requerido');
        }
        
        // Generar el turno (modificado para incluir nombre)
        const nuevoTurno = db.generarTurno(nombre.trim(), email.trim(), servicio.trim());
        
        console.log('Turno generado exitosamente:', nuevoTurno);
        
        // Emitir evento de cambio de datos para sincronizar todas las páginas
        console.log('Emitiendo evento de sincronización...');
        
        // Método 1: localStorage (para comunicación entre pestañas)
        try {
            emitirEventoGlobal('dataChanged', { 
                tipo: 'turnoGenerado', 
                turno: nuevoTurno,
                timestamp: Date.now() 
            });
            console.log('✅ Evento global emitido correctamente');
        } catch (error) {
            console.error('❌ Error al emitir evento global:', error);
        }
        
        // Método 2: Evento personalizado (para la misma página)
        try {
            window.dispatchEvent(new CustomEvent('turnoGenerado', { 
                detail: { turno: nuevoTurno } 
            }));
            console.log('✅ Evento personalizado emitido correctamente');
        } catch (error) {
            console.error('❌ Error al emitir evento personalizado:', error);
        }
        
        // Método 3: Actualización directa si estamos en admin o dashboard
        setTimeout(() => {
            if (typeof cargarTurnosEnEspera === 'function') {
                cargarTurnosEnEspera();
                console.log('✅ Turnos en espera actualizados');
            }
            if (typeof actualizarDashboard === 'function') {
                actualizarDashboard();
                console.log('✅ Dashboard actualizado');
            }
        }, 200);
        
        return nuevoTurno;
    } catch (error) {
        console.error('Error al generar turno:', error);
        showNotification(error.message, 'danger');
        return null;
    }
}

// Hacer la función disponible globalmente
window.generarTurnoSeguro = generarTurnoSeguro;

// Función para probar la sincronización
function probarSincronizacion() {
    console.log('🧪 Iniciando prueba de sincronización...');
    
    // Generar un turno de prueba
    const turnoPrueba = {
        numero: 'TEST' + Date.now().toString().slice(-3),
        nombre: 'Usuario Prueba',
        email: 'prueba@cesun.edu.mx',
        servicio: 'Servicio de Prueba',
        fechaCreacion: new Date().toISOString()
    };
    
    console.log('🧪 Turno de prueba:', turnoPrueba);
    
    // Emitir evento de prueba
    try {
        emitirEventoGlobal('dataChanged', { 
            tipo: 'turnoGenerado', 
            turno: turnoPrueba,
            timestamp: Date.now() 
        });
        console.log('✅ Evento de prueba emitido');
        
        // Mostrar notificación
        showNotification('Prueba de sincronización enviada. Revisa las otras pestañas.', 'info');
    } catch (error) {
        console.error('❌ Error en prueba de sincronización:', error);
        showNotification('Error en la prueba de sincronización', 'danger');
    }
}

// Hacer la función de prueba disponible globalmente
window.probarSincronizacion = probarSincronizacion;

// Función para verificar si hay un turno activo al cargar la página
function verificarTurnoActivo() {
    const turnoActivo = localStorage.getItem('turnoActivo');
    if (turnoActivo) {
        const turno = JSON.parse(turnoActivo);
        mostrarTurnoExistente(turno);
    }
}

// Función para mostrar un turno existente
function mostrarTurnoExistente(turno) {
    const turnoForm = document.getElementById('turnoForm');
    const turnoGenerado = document.getElementById('turnoGenerado');
    
    if (turnoForm && turnoGenerado) {
        // Actualizar la información del turno
        document.querySelector('.turno-number').textContent = turno.numero;
        document.getElementById('turnoNombre').textContent = turno.nombre || localStorage.getItem('nombre') || '';
        document.getElementById('turnoEmail').textContent = turno.email;
        document.getElementById('turnoServicio').textContent = turno.servicio;
        
        // Ocultar formulario y mostrar resultado
        turnoForm.classList.add('d-none');
        turnoGenerado.classList.remove('d-none');
    }
}

// Función para enviar formulario
function submitForm() {
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const servicio = document.getElementById('servicio').value;
    const nombreInput = document.getElementById('nombre');
    const emailInput = document.getElementById('email');
    const servicioInput = document.getElementById('servicio');
    
    console.log('Enviando formulario:', { nombre, email, servicio });
    
    // Limpiar validaciones previas
    nombreInput.classList.remove('is-invalid', 'is-valid');
    emailInput.classList.remove('is-invalid', 'is-valid');
    servicioInput.classList.remove('is-invalid');
    
    // Validaciones
    let isValid = true;
    let errorMessage = '';
    
    // Validar nombre
    if (!nombre) {
        nombreInput.classList.add('is-invalid');
        errorMessage = 'Por favor ingresa tu nombre completo';
        isValid = false;
    } else {
        nombreInput.classList.add('is-valid');
    }
    
    // Validar email
    if (!email) {
        emailInput.classList.add('is-invalid');
        if (!errorMessage) errorMessage = 'Por favor ingresa tu correo institucional';
        isValid = false;
    } else if (!email.match(/^[a-zA-Z0-9._%+-]+@(cesun|cesunbc)\.edu\.mx$/)) {
        emailInput.classList.add('is-invalid');
        errorMessage = 'Por favor ingresa un correo institucional válido (@cesun.edu.mx o @cesunbc.edu.mx)';
        isValid = false;
    } else {
        emailInput.classList.add('is-valid');
    }
    
    // Validar servicio
    if (!servicio) {
        servicioInput.classList.add('is-invalid');
        if (!errorMessage) errorMessage = 'Por favor selecciona un servicio';
        isValid = false;
    }
    
    if (!isValid) {
        console.log('Validación fallida:', errorMessage);
        showNotification(errorMessage, 'warning');
        return;
    }
    
    console.log('Validación exitosa, generando turno...');
    
    // Generar turno usando la función mejorada
    const nuevoTurno = generarTurnoSeguro(nombre, email, servicio);
    
    console.log('Resultado de generación:', nuevoTurno);
    
    if (nuevoTurno) {
        // Guardar turno en localStorage
        localStorage.setItem('turnoActivo', JSON.stringify(nuevoTurno));
        
        // Mostrar turno
        mostrarTurnoExistente(nuevoTurno);
        
        console.log('Turno generado exitosamente:', nuevoTurno.numero);
    } else {
        console.log('Error: No se pudo generar el turno');
    }
}

// Función para cancelar turno
function cancelarTurno() {
    const turnoNumberElement = document.querySelector('.turno-number');
    if (turnoNumberElement) {
        const numeroTurno = turnoNumberElement.textContent;
        
        // Eliminar de la base de datos (si existe la función)
        if (typeof db !== 'undefined' && typeof db.cancelarTurno === 'function') {
            db.cancelarTurno(numeroTurno);
        }
        
        // Eliminar de localStorage
        localStorage.removeItem('turnoActivo');
        
        // Mostrar notificación
        showNotification(`Turno ${numeroTurno} cancelado correctamente`, 'success');
        
        // Volver al formulario
        nuevoTurno();
    }
}

// Función para nuevo turno
function nuevoTurno() {
    // Limpiar formulario
    document.getElementById('nombre').value = '';
    document.getElementById('email').value = '';
    document.getElementById('servicio').value = '';
    
    // Limpiar validaciones
    document.getElementById('nombre').classList.remove('is-invalid', 'is-valid');
    document.getElementById('email').classList.remove('is-invalid', 'is-valid');
    document.getElementById('servicio').classList.remove('is-invalid');
    
    // Mostrar formulario y ocultar resultado
    document.getElementById('turnoGenerado').classList.add('d-none');
    document.getElementById('turnoForm').classList.remove('d-none');
    
    // Desplazarse al formulario
    document.getElementById('turnoForm').scrollIntoView({ behavior: 'smooth' });
}

// Funciones para autenticación de administrador
function abrirModalAdmin() {
    const modal = new bootstrap.Modal(document.getElementById('modalAdmin'));
    modal.show();
    
    // Limpiar formulario
    document.getElementById('codigoAdmin').value = '';
    document.getElementById('codigoAdmin').focus();
}

function verificarAdmin(event) {
    event.preventDefault();
    
    const codigo = document.getElementById('codigoAdmin').value;
    const codigoCorrecto = 'Cesun2025*';
    
    if (codigo === codigoCorrecto) {
        // Guardar sesión de administrador
        sessionStorage.setItem('adminAutenticado', 'true');
        sessionStorage.setItem('adminTimestamp', Date.now().toString());
        
        showNotification('Acceso autorizado', 'success');
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalAdmin'));
        modal.hide();
        
        // Redirigir al panel de administración
        setTimeout(() => {
            window.location.href = 'pages/admin.html';
        }, 1000);
    } else {
        showNotification('Código incorrecto. Intente nuevamente.', 'danger');
        document.getElementById('codigoAdmin').value = '';
        document.getElementById('codigoAdmin').focus();
    }
}

function togglePassword() {
    const input = document.getElementById('codigoAdmin');
    const icon = document.getElementById('toggleIcon');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Función para consultar turno activo por correo
function consultarTurnoPorCorreo() {
    const correo = document.getElementById('consultarCorreo').value.trim();
    const resultadoDiv = document.getElementById('resultadoConsultaTurno');
    resultadoDiv.innerHTML = '';
    if (!correo) {
        resultadoDiv.innerHTML = '<div class="alert alert-warning">Por favor ingresa un correo institucional.</div>';
        return;
    }
    // Buscar turno activo en la base de datos
    let turno = null;
    if (typeof db !== 'undefined' && typeof db.turnos !== 'undefined') {
        turno = db.turnos.find(t => t.email === correo && (t.estado === 'en_espera' || t.estado === 'en_atencion'));
    }
    if (turno) {
        resultadoDiv.innerHTML = `
            <div class="alert alert-success">
                <strong>Turno Activo Encontrado:</strong><br>
                <b>Número:</b> ${turno.numero}<br>
                <b>Nombre:</b> ${turno.nombre}<br>
                <b>Correo:</b> ${turno.email}<br>
                <b>Servicio:</b> ${turno.servicio}<br>
                <b>Estado:</b> ${turno.estado === 'en_espera' ? 'En espera' : 'En atención'}
            </div>
        `;
    } else {
        resultadoDiv.innerHTML = '<div class="alert alert-info">No hay turnos activos para este correo.</div>';
    }
}

// Inicialización específica para index.html
document.addEventListener('DOMContentLoaded', function() {
    // Cargar servicios dinámicamente
    cargarServiciosDisponibles();
    
    // Configurar validación en tiempo real del nombre
    const nombreInput = document.getElementById('nombre');
    if (nombreInput) {
        nombreInput.addEventListener('input', function() {
            const nombre = this.value.trim();
            this.classList.remove('is-invalid', 'is-valid');
            if (nombre) {
                this.classList.add('is-valid');
            }
        });
    }
    
    // Configurar validación en tiempo real del email
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('input', function() {
            const email = this.value.trim();
            
            // Limpiar clases previas
            this.classList.remove('is-invalid', 'is-valid');
            
            if (email) {
                if (email.match(/^[a-zA-Z0-9._%+-]+@(cesun|cesunbc)\.edu\.mx$/)) {
                    this.classList.add('is-valid');
                } else {
                    this.classList.add('is-invalid');
                }
            }
        });
    }
    
    // Configurar validación en tiempo real del servicio
    const servicioInput = document.getElementById('servicio');
    if (servicioInput) {
        servicioInput.addEventListener('change', function() {
            const servicio = this.value;
            
            // Limpiar clases previas
            this.classList.remove('is-invalid');
            
            if (!servicio) {
                this.classList.add('is-invalid');
            }
        });
    }
    
    // Configurar eventos del modal de administrador
    const modalAdmin = document.getElementById('modalAdmin');
    if (modalAdmin) {
        modalAdmin.addEventListener('shown.bs.modal', function() {
            document.getElementById('codigoAdmin').focus();
        });
        
        modalAdmin.addEventListener('hidden.bs.modal', function() {
            document.getElementById('codigoAdmin').value = '';
        });
    }
    
    // Configurar sistema de eventos en tiempo real
    if (typeof eventSystem !== 'undefined') {
        eventSystem.on('turnoGenerado', function(turno) {
            console.log('Nuevo turno generado:', turno.numero);
            showNotification(`Turno ${turno.numero} generado exitosamente`, 'success');
        });
        
        eventSystem.on('dataChanged', function(data) {
            // Actualizar automáticamente todas las pantallas
            actualizarTodasLasPantallas();
        });
        
        // Iniciar actualizaciones en tiempo real
        eventSystem.startRealtimeUpdates();
        
        // Limpiar turnos antiguos al iniciar
        if (typeof db !== 'undefined') {
            db.limpiarTurnosAntiguos();
        }
    }
    
    console.log('Página principal cargada - Sistema de turnos listo');
    
    // Limpiar al cerrar la página
    window.addEventListener('beforeunload', function() {
        if (typeof eventSystem !== 'undefined') {
            eventSystem.stopRealtimeUpdates();
        }
    });

    if (typeof eventSystem !== 'undefined') {
        eventSystem.on('turnoLlamado', function(data) {
            // Si el turno llamado es el del usuario actual, mostrar la casilla asignada
            const turnoGenerado = document.getElementById('turnoGenerado');
            const turnoNumberElement = turnoGenerado?.querySelector('.turno-number');
            if (turnoNumberElement && turnoNumberElement.textContent == data.turno.numero) {
                let casillaMsg = turnoGenerado.querySelector('.msg-casilla');
                if (!casillaMsg) {
                    casillaMsg = document.createElement('div');
                    casillaMsg.className = 'alert alert-success msg-casilla mt-3';
                    turnoGenerado.querySelector('.white-card').appendChild(casillaMsg);
                }
                casillaMsg.innerHTML = `<i class='fas fa-bell me-2'></i><b>¡Es tu turno!</b> Dirígete a la <b>Casilla ${data.casilla.id} - ${data.casilla.nombre || ''}</b>`;
            }
        });
    }

    // Event listeners
    document.getElementById('turnoForm').addEventListener('submit', solicitarTurno);
    document.getElementById('consultarTurnoBtn').addEventListener('click', consultarTurnoPorCorreo);
    
    // Escuchar evento de tiempo estimado alto
    if (window.eventSystem) {
        window.eventSystem.on('tiempoEstimadoAlto', function(data) {
            const mensaje = `⚠️ Tiempo estimado de espera alto para el servicio "${data.servicio}": ${data.tiempoEstimado} minutos.\n\n¿Deseas continuar con la solicitud del turno?`;
            
            if (confirm(mensaje)) {
                // Continuar con la solicitud del turno
                return true;
            } else {
                // Cancelar la solicitud
                return false;
            }
        });
    }
    
    // Actualizar hora cada segundo
    setInterval(actualizarHora, 1000);
    actualizarHora(); // Llamar inmediatamente
});

// Función para cargar servicios disponibles dinámicamente
function cargarServiciosDisponibles() {
    const servicios = db.getServiciosActivos();
    const select = document.getElementById('servicio');
    
    if (select && servicios.length > 0) {
        // Mantener la opción por defecto
        select.innerHTML = '<option value="">-- Selecciona un servicio --</option>';
        
        // Agregar servicios activos
        servicios.forEach(servicio => {
            const option = document.createElement('option');
            option.value = servicio.nombre;
            option.textContent = `${getServicioIcon(servicio.nombre)} ${servicio.nombre}`;
            select.appendChild(option);
        });
    }
}

// Función para obtener el ícono del servicio
function getServicioIcon(nombre) {
    const iconos = {
        'Constancias': '📄',
        'Reinscripciones': '📝',
        'Pagos': '💳',
        'Asesorías': '👨‍🏫',
        'default': '📋'
    };
    
    return iconos[nombre] || iconos.default;
}

// Hacer funciones disponibles globalmente
window.verificarTurnoActivo = verificarTurnoActivo;
window.mostrarTurnoExistente = mostrarTurnoExistente;
window.submitForm = submitForm;
window.cancelarTurno = cancelarTurno;
window.nuevoTurno = nuevoTurno;
window.abrirModalAdmin = abrirModalAdmin;
window.verificarAdmin = verificarAdmin;
window.togglePassword = togglePassword;
window.consultarTurnoPorCorreo = consultarTurnoPorCorreo;