// Simulación de base de datos usando localStorage
class TurnoDB {
    constructor() {
        this.turnos = [];
        this.usuarios = [];
        this.servicios = [];
        this.casillas = [];
        
        // Cargar datos existentes primero
        this.cargarDatos();
        
        // Crear usuario admin por defecto si no hay usuarios
        if (this.usuarios.length === 0) {
            this.agregarUsuario('Luis Mejia', 'soportetecnico@cesun.edu.mx', 'C3sun2025*', 'admin');
        }
        
        // Debug: verificar asignaciones de usuarios a casillas
        this.debugAsignacionesUsuarios();
        
        // Verificar y limpiar horarios expirados al inicializar
        this.verificarHorariosExpirados();
    }

    cargarDatos() {
        try {
            const datos = JSON.parse(localStorage.getItem('turnoDB'));
            if (datos) {
                this.turnos = datos.turnos || [];
                this.servicios = datos.servicios || [];
                this.casillas = datos.casillas || [];
                this.usuarios = datos.usuarios || [];
                this.siguienteNumero = datos.siguienteNumero || 1;
                this.reuniones = datos.reuniones || [];
                this.horariosFijos = datos.horariosFijos || [];
                this.horariosInactividad = datos.horariosInactividad || [];
                
                // Migrar casillas existentes que no tienen el campo activa
                this.migrarCasillasExistentes();
                this.migrarTurnosExistentes(); // Migrar turnos existentes
                
                // Verificar y corregir estado de casillas
                this.verificarEstadoCasillas();
            }
        } catch (error) {
            console.error('Error al cargar datos:', error);
            this.limpiarDatos();
        }
    }

    migrarCasillasExistentes() {
        this.casillas.forEach(casilla => {
            if (casilla.activa === undefined) {
                casilla.activa = true;
            }
            // Asegurar que todas las casillas tengan el campo 'usuarios' inicializado
            if (!casilla.usuarios) {
                casilla.usuarios = [];
            }
            // Asegurar que todas las casillas tengan estado 'libre' por defecto
            if (!casilla.estado) {
                casilla.estado = 'libre';
            }
            // Asegurar que todas las casillas tengan turnoActual null por defecto
            if (!casilla.turnoActual) {
                casilla.turnoActual = null;
            }
        });
    }

    migrarTurnosExistentes() {
        // Asegurar que todos los turnos existentes tengan los campos necesarios
        this.turnos.forEach(turno => {
            // Migrar fechaHora a fechaCreacion si no existe
            if (turno.fechaHora && !turno.fechaCreacion) {
                turno.fechaCreacion = turno.fechaHora;
                delete turno.fechaHora;
            }
            
            // Asegurar que tenga fechaCreacion
            if (!turno.fechaCreacion) {
                turno.fechaCreacion = new Date().toISOString();
            }
            
            // Asegurar que tenga nombre si no lo tiene
            if (!turno.nombre) {
                turno.nombre = 'Estudiante';
            }
        });
    }

    guardarDatos() {
        try {
            const datos = {
                turnos: this.turnos,
                casillas: this.casillas,
                servicios: this.servicios,
                usuarios: this.usuarios,
                siguienteNumero: this.siguienteNumero,
                reuniones: this.reuniones || [],
                horariosFijos: this.horariosFijos || [],
                horariosInactividad: this.horariosInactividad || [],
                timestamp: Date.now()
            };
            localStorage.setItem('turnoDB', JSON.stringify(datos));
        } catch (error) {
            console.error('Error al guardar datos:', error);
        }
    }

    limpiarDatos() {
        this.turnos = [];
        this.servicios = [];
        this.casillas = [];
        this.usuarios = [];
        this.siguienteNumero = 1;
        this.reuniones = [];
        this.horariosFijos = [];
        this.guardarDatos();
    }

    // Métodos para gestionar servicios
    agregarServicio(nombre, descripcion = '') {
        const nuevoId = Math.max(...this.servicios.map(s => s.id), 0) + 1;
        const nuevoServicio = {
            id: nuevoId,
            nombre: nombre,
            activo: true,
            descripcion: descripcion
        };
        this.servicios.push(nuevoServicio);
        this.guardarDatos();
        
        // Agregar al historial
        this.agregarEntradaHistorial(
            'SERVICIO_CREADO',
            `Servicio creado: ${nombre}${descripcion ? ' - ' + descripcion : ''}`,
            null
        );
        
        return nuevoServicio;
    }

    editarServicio(id, nombre, descripcion, activo) {
        const servicio = this.servicios.find(s => s.id === id);
        if (servicio) {
            servicio.nombre = nombre;
            servicio.descripcion = descripcion;
            servicio.activo = activo;
            
            // Actualizar casilla correspondiente si existe
            const casilla = this.casillas.find(c => c.servicios.includes(id));
            if (casilla) {
                casilla.servicios = casilla.servicios.filter(s => s !== id);
                casilla.servicios.push(id);
            }
            
            this.guardarDatos();
            return true;
        }
        return false;
    }

    eliminarServicio(id) {
        // Verificar si hay turnos activos para este servicio
        const turnosActivos = this.turnos.filter(t => 
            t.servicio === this.servicios.find(s => s.id === id)?.nombre && 
            (t.estado === 'en_espera' || t.estado === 'en_atencion')
        );
        
        if (turnosActivos.length > 0) {
            throw new Error('No se puede eliminar un servicio con turnos activos');
        }
        
        // Eliminar servicio
        this.servicios = this.servicios.filter(s => s.id !== id);
        
        // Liberar casilla asociada
        const casilla = this.casillas.find(c => c.servicios.includes(id));
        if (casilla) {
            casilla.servicios = casilla.servicios.filter(s => s !== id);
        }
        
        this.guardarDatos();
        return true;
    }

    getServiciosActivos() {
        return this.servicios.filter(s => s.activo);
    }

    getServicios() {
        return this.servicios;
    }

    getServiciosNombres() {
        return this.servicios.filter(s => s.activo).map(s => s.nombre);
    }

    /**
     * Genera un nuevo turno.
     * Permite múltiples turnos con el mismo nombre pero no con el mismo correo.
     * @param {string} nombre - Nombre del usuario
     * @param {string} email - Correo institucional (único por turno activo)
     * @param {string} servicio - Servicio seleccionado
     */
    generarTurno(nombre, email, servicio) {
        // Validaciones
        if (!nombre || !email) {
            throw new Error('Nombre y email son requeridos');
        }

        // Verificar si ya hay un turno activo para este email
        const turnoExistente = this.turnos.find(t => 
            t.email === email && 
            (t.estado === 'en_espera' || t.estado === 'en_atencion')
        );

        if (turnoExistente) {
            throw new Error('Ya tienes un turno activo');
        }

        // Generar número de turno con letras (formato: A001, B002, C003, etc.)
        const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const letraActual = letras[Math.floor(this.siguienteNumero / 1000) % letras.length];
        const numeroSecuencial = (this.siguienteNumero % 1000).toString().padStart(3, '0');
        const numeroTurno = `${letraActual}${numeroSecuencial}`;
        
        // Si no se especifica servicio, asignar uno al azar
        let servicioFinal = servicio;
        if (!servicio || servicio === '') {
            const serviciosActivos = this.getServiciosActivos();
            if (serviciosActivos.length > 0) {
                const servicioAleatorio = serviciosActivos[Math.floor(Math.random() * serviciosActivos.length)];
                servicioFinal = servicioAleatorio.nombre;
            } else {
                servicioFinal = 'Servicio General';
            }
        }

        // Verificar disponibilidad del servicio con nueva validación
        const servicioObj = this.getServicios().find(s => s.nombre === servicioFinal);
        if (servicioObj) {
            const validacionTurno = this.sePuedeCrearTurno(servicioObj.id);
            
            if (!validacionTurno.puede) {
                let mensajeError = validacionTurno.razon;
                if (validacionTurno.tiempoEstimado) {
                    mensajeError += `. ${validacionTurno.tiempoEstimado}`;
                }
                throw new Error(mensajeError);
            }
            
            // Verificar tiempo estimado de espera
            const tiempoEstimado = this.getTiempoEstimadoEspera(servicioObj.id);
            
            // Si hay tiempo estimado alto, mostrar advertencia
            if (tiempoEstimado.tiempoEstimado > 30) { // Más de 30 minutos
                // Emitir evento para mostrar alerta al usuario
                if (window.eventSystem) {
                    window.eventSystem.emit('tiempoEstimadoAlto', {
                        servicio: servicioFinal,
                        tiempoEstimado: tiempoEstimado.tiempoEstimado,
                        mensaje: tiempoEstimado.mensaje
                    });
                }
            }
        }

        const nuevoTurno = {
            id: Date.now(),
            numero: numeroTurno,
            nombre: nombre,
            email: email,
            servicio: servicioFinal,
            estado: 'en_espera',
            fechaCreacion: new Date().toISOString(),
            casilla: null
        };

        this.turnos.push(nuevoTurno);
        this.siguienteNumero++;
        this.guardarDatos();

        this.agregarEntradaHistorial(
            'TURNO_GENERADO',
            `Turno #${nuevoTurno.numero} generado para ${nombre} (${email}) - Servicio: ${servicioFinal}`,
            null
        );

        return nuevoTurno;
    }

    llamarSiguienteTurno(casillaId) {
        // Obtener la casilla y sus servicios
        const casilla = this.getCasilla(casillaId);
        if (!casilla) {
            console.error('Casilla no encontrada:', casillaId);
            return null;
        }
        
        // Verificar si ya hay un turno en atención en esta casilla
        const turnoActual = this.getTurnoActual(casillaId);
        if (turnoActual) {
            console.log('Ya hay un turno en atención:', turnoActual.numero);
            return null;
        }
        
        // Filtrar turnos en espera que coincidan con los servicios de la casilla
        const turnosEnEspera = this.turnos.filter(t => {
            if (t.estado !== 'en_espera') return false;
            
            // Si la casilla no tiene servicios específicos, puede atender cualquier servicio
            if (!casilla.servicios || casilla.servicios.length === 0) return true;
            
            // Buscar el servicio del turno en los servicios de la casilla
            const servicioTurno = this.getServicios().find(s => s.nombre === t.servicio);
            if (!servicioTurno) return false;
            
            return casilla.servicios.includes(servicioTurno.id);
        });
        
        if (turnosEnEspera.length === 0) {
            return null;
        }
        
        // Ordenar por fecha de creación (FIFO)
        turnosEnEspera.sort((a, b) => new Date(a.fechaCreacion) - new Date(b.fechaCreacion));
        
        const turno = turnosEnEspera[0];
        turno.estado = 'en_atencion';
        turno.casilla = casillaId;
        turno.fechaAtencion = new Date().toISOString();
        
        // Actualizar el estado de la casilla
        casilla.estado = 'ocupada';
        casilla.turnoActual = turno.id;
        
        this.guardarDatos();
        
        // Agregar al historial
        this.agregarEntradaHistorial(
            'TURNO_LLAMADO',
            `Turno #${turno.numero} llamado en casilla ${casilla?.nombre || casillaId} - ${turno.nombre} (${turno.email})`,
            null
        );
        
        return turno;
    }

    marcarTurnoAtendido(casillaId, descripcion = '', usuario = null) {
        const turno = this.turnos.find(t => t.casilla === casillaId && t.estado === 'en_atencion');
        if (!turno) {
            return false;
        }

        turno.estado = 'atendido';
        turno.descripcion = descripcion;
        turno.usuarioAtendio = usuario;
        turno.fechaAtencion = new Date().toISOString();
        
        // Liberar la casilla
        const casilla = this.getCasilla(casillaId);
        if (casilla) {
            casilla.estado = 'libre';
            casilla.turnoActual = null;
        }

        this.guardarDatos();
        
        // Agregar al historial
        this.agregarEntradaHistorial(
            'TURNO_ATENDIDO',
            `Turno #${turno.numero} atendido en casilla ${casilla?.nombre || casillaId} - ${turno.nombre} (${turno.email})${descripcion ? ' - ' + descripcion : ''}`,
            usuario
        );
        
        return true;
    }

    cancelarTurno(turnoId, motivo = '', usuario = null) {
        const turno = this.turnos.find(t => t.id === turnoId);
        if (!turno) {
            return false;
        }

        // Si el turno estaba en atención, liberar la casilla
        if (turno.estado === 'en_atencion' && turno.casilla) {
            const casilla = this.getCasilla(turno.casilla);
            if (casilla) {
                casilla.estado = 'libre';
                casilla.turnoActual = null;
            }
        }

        turno.estado = 'cancelado';
        turno.motivoCancelacion = motivo;
        turno.usuarioCancelo = usuario;
        turno.fechaCancelacion = new Date().toISOString();

        this.guardarDatos();
        
        // Agregar al historial
        this.agregarEntradaHistorial(
            'TURNO_CANCELADO',
            `Turno #${turno.numero} cancelado - ${turno.nombre} (${turno.email})${motivo ? ' - Motivo: ' + motivo : ''}`,
            usuario
        );
        
        return true;
    }

    getTurnosEnEspera(casillaId = null) {
        let turnos = this.turnos.filter(t => t.estado === 'en_espera');
        
        // Si se especifica una casilla, filtrar por servicios que puede atender
        if (casillaId) {
            const casilla = this.getCasilla(casillaId);
            if (casilla && casilla.servicios && casilla.servicios.length > 0) {
                turnos = turnos.filter(t => {
                    const servicioTurno = this.getServicios().find(s => s.nombre === t.servicio);
                    return servicioTurno && casilla.servicios.includes(servicioTurno.id);
                });
            }
        }
        
        return turnos.sort((a, b) => new Date(a.fechaCreacion) - new Date(b.fechaCreacion));
    }

    getTurnosEnAtencion() {
        return this.turnos.filter(t => t.estado === 'en_atencion');
    }

    getProximosTurnos(limite = 10) {
        return this.turnos
            .filter(t => t.estado === 'en_espera')
            .sort((a, b) => new Date(a.fechaCreacion) - new Date(b.fechaCreacion))
            .slice(0, limite);
    }

    getEstadoCasillas() {
        return this.casillas.map(casilla => ({
            id: casilla.id,
            nombre: casilla.nombre,
            estado: casilla.estado,
            turnoActual: casilla.turnoActual
        }));
    }

    getTurnosPorEstado(estado) {
        return this.turnos.filter(t => t.estado === estado);
    }

    getTurnosPorServicio(servicio) {
        return this.turnos.filter(t => t.servicio === servicio);
    }

    getTurnosPorFecha(fecha) {
        const fechaInicio = new Date(fecha);
        fechaInicio.setHours(0, 0, 0, 0);
        const fechaFin = new Date(fecha);
        fechaFin.setHours(23, 59, 59, 999);

        return this.turnos.filter(t => {
            const turnoFecha = new Date(t.fechaCreacion);
            return turnoFecha >= fechaInicio && turnoFecha <= fechaFin;
        });
    }

    limpiarTurnosAntiguos() {
        const ahora = new Date();
        const unDiaAtras = new Date(ahora.getTime() - (24 * 60 * 60 * 1000));

        // Limpiar turnos completados de más de un día
        this.turnos = this.turnos.filter(t => {
            if (t.estado === 'atendido' || t.estado === 'cancelado') {
                const turnoFecha = new Date(t.fechaCreacion);
                return turnoFecha > unDiaAtras;
            }
            return true; // Mantener turnos activos
        });

        this.guardarDatos();
    }

    getEstadisticas() {
        const ahora = new Date();
        const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

        const turnosHoy = this.turnos.filter(t => {
            const turnoFecha = new Date(t.fechaCreacion);
            return turnoFecha >= hoy;
        });

        return {
            total: turnosHoy.length,
            enEspera: turnosHoy.filter(t => t.estado === 'en_espera').length,
            enAtencion: turnosHoy.filter(t => t.estado === 'en_atencion').length,
            atendidos: turnosHoy.filter(t => t.estado === 'atendido').length,
            cancelados: turnosHoy.filter(t => t.estado === 'cancelado').length,
            casillasLibres: this.casillas.filter(c => c.estado === 'libre').length,
            casillasOcupadas: this.casillas.filter(c => c.estado === 'ocupada').length
        };
    }

    // Función para reiniciar el sistema (útil para testing)
    reiniciarSistema() {
        this.limpiarDatos();
        console.log('Sistema de turnos reiniciado');
    }

    // Función para generar datos de prueba
    generarDatosPrueba() {
        const servicios = this.getServiciosNombres();
        const emails = [
            'estudiante1@cesun.edu.mx',
            'estudiante2@cesunbc.edu.mx',
            'estudiante3@cesun.edu.mx',
            'estudiante4@cesunbc.edu.mx',
            'estudiante5@cesun.edu.mx'
        ];

        // Generar algunos turnos de prueba
        for (let i = 0; i < 5; i++) {
            const email = emails[Math.floor(Math.random() * emails.length)];
            const servicio = servicios[Math.floor(Math.random() * servicios.length)];
            
            try {
                this.generarTurno(email, servicio);
            } catch (error) {
                console.log('Error generando turno de prueba:', error.message);
            }
        }

        console.log('Datos de prueba generados');
    }

    // Métodos para gestionar casillas
    agregarCasilla(nombre, serviciosIds) {
        const nuevoId = this.obtenerSiguienteIdCasilla();
        const nuevaCasilla = {
            id: nuevoId,
            nombre: nombre,
            servicios: serviciosIds,
            activa: true,
            usuarios: []
        };
        
        this.casillas.push(nuevaCasilla);
        this.guardarDatos();
        
        // Agregar al historial
        const serviciosNombres = serviciosIds.map(id => this.getServicio(id)?.nombre || id).join(', ');
        this.agregarEntradaHistorial(
            'CASILLA_CREADA',
            `Casilla creada: ${nombre} - Servicios: ${serviciosNombres}`,
            null
        );
        
        return nuevaCasilla;
    }

    editarCasilla(id, nombre, serviciosIds) {
        const casilla = this.casillas.find(c => c.id === id);
        if (!casilla) {
            throw new Error('Casilla no encontrada');
        }
            casilla.nombre = nombre;
            casilla.servicios = serviciosIds;
            this.guardarDatos();
        return casilla;
    }

    obtenerSiguienteIdCasilla() {
        return this.casillas.length > 0 ? Math.max(...this.casillas.map(c => c.id)) + 1 : 1;
        }

    activarCasilla(id) {
        const casilla = this.casillas.find(c => c.id === id);
        if (!casilla) {
            throw new Error('Casilla no encontrada');
        }
        casilla.activa = true;
        this.guardarDatos();
        return casilla;
    }

    desactivarCasilla(id) {
        const casilla = this.casillas.find(c => c.id === id);
        if (!casilla) {
            throw new Error('Casilla no encontrada');
        }
        casilla.activa = false;
        // Si la casilla está ocupada, liberarla
        if (casilla.estado === 'ocupada') {
            casilla.estado = 'libre';
            casilla.turnoActual = null;
        }
        this.guardarDatos();
        return casilla;
    }

    asignarUsuariosACasilla(casillaId, usuariosIds) {
        const casilla = this.casillas.find(c => c.id === casillaId);
        if (!casilla) {
            throw new Error('Casilla no encontrada');
        }
        
        // Validar que los usuarios existan
        const usuariosExistentes = this.usuarios.filter(u => usuariosIds.includes(u.id));
        if (usuariosExistentes.length !== usuariosIds.length) {
            throw new Error('Algunos usuarios no existen');
        }
        
        casilla.usuarios = usuariosIds;
        this.guardarDatos();
        return casilla;
    }

    obtenerUsuariosCasilla(casillaId) {
        const casilla = this.casillas.find(c => c.id === casillaId);
        if (!casilla) {
            return [];
        }
        
        return this.usuarios.filter(u => casilla.usuarios && casilla.usuarios.includes(u.id));
    }

    obtenerCasillasDeUsuario(usuarioId) {
        return this.casillas.filter(c => c.usuarios && c.usuarios.includes(usuarioId));
    }

    getTurnoActual(casillaId) {
        const casilla = this.casillas.find(c => c.id === casillaId);
        if (!casilla) {
            return null;
        }
        
        // Buscar el turno que está siendo atendido en esta casilla
        return this.turnos.find(t => 
            t.casilla === casillaId && 
            (t.estado === 'en_atencion' || t.estado === 'ocupada')
        );
    }

    getTurno(turnoId) {
        return this.turnos.find(t => t.id === turnoId);
    }

    // Función eliminada porque estaba duplicada con getTurnosEnEspera(casillaId = null)
    // getTurnosEnEspera() {
    //     return this.turnos.filter(t => t.estado === 'en_espera');
    // }

    getServicio(servicioId) {
        if (typeof servicioId === 'string') {
            // Si es un string, buscar por nombre
            return this.servicios.find(s => s.nombre === servicioId);
        } else {
            // Si es un número, buscar por ID
            return this.servicios.find(s => s.id === servicioId);
        }
    }

    eliminarCasilla(id) {
        // No eliminar si está ocupada
        const casilla = this.casillas.find(c => c.id === id);
        if (casilla && casilla.estado === 'ocupada') {
            throw new Error('No se puede eliminar una casilla ocupada');
        }
        this.casillas = this.casillas.filter(c => c.id !== id);
        this.guardarDatos();
        return true;
    }

    getCasillas() {
        return this.casillas;
    }

    getCasilla(id) {
        return this.casillas.find(c => c.id === id);
    }

    getUsuarios() {
        return this.usuarios;
    }

    getUsuario(id) {
        return this.usuarios.find(u => u.id === id);
    }



    getUsuariosDeCasilla(casillaId) {
        const casilla = this.casillas.find(c => c.id === casillaId);
        if (casilla) {
            return casilla.usuarios.map(id => this.getUsuario(id)).filter(Boolean);
        }
        return [];
    }

    agregarUsuario(nombre, correo, contrasena, permisos = 'normal') {
        const nuevoId = Math.max(...this.usuarios.map(u => u.id), 0) + 1;
        const nuevoUsuario = {
            id: nuevoId,
            nombre: nombre,
            correo: correo,
            contrasena: contrasena,
            permisos: permisos,
            bloqueado: false,
            fechaCreacion: new Date().toISOString()
        };
        
        this.usuarios.push(nuevoUsuario);
        this.guardarDatos();
        
        // Agregar al historial
        this.agregarEntradaHistorial(
            'USUARIO_CREADO',
            `Usuario creado: ${nombre} (${correo}) - Permisos: ${permisos}`,
            null
        );
        
        return nuevoUsuario;
    }

    eliminarUsuario(id) {
        const index = this.usuarios.findIndex(u => u.id === id);
        if (index === -1) {
            throw new Error('Usuario no encontrado');
        }
        
        // Verificar si el usuario está asignado a alguna casilla
        const casillasConUsuario = this.casillas.filter(c => c.usuarios && c.usuarios.includes(id));
        if (casillasConUsuario.length > 0) {
            throw new Error('No se puede eliminar un usuario asignado a una casilla');
        }
        
        this.usuarios.splice(index, 1);
        this.guardarDatos();
        
        // Agregar al historial
        this.agregarEntradaHistorial(
            'USUARIO_ELIMINADO',
            `Usuario eliminado: ${this.getUsuario(id)?.nombre || 'Desconocido'} (ID: ${id})`,
            null
        );
        
        return true;
    }

    setPermisosUsuario(usuarioId, permisos) {
        const usuario = this.usuarios.find(u => u.id === usuarioId);
        if (usuario) {
            usuario.permisos = permisos;
            this.guardarDatos();
            return true;
        }
        return false;
    }

    setContrasenaUsuario(usuarioId, nuevaContrasena) {
        const usuario = this.usuarios.find(u => u.id === usuarioId);
        if (usuario) {
            usuario.contrasena = nuevaContrasena;
            this.guardarDatos();
            return true;
        }
        return false;
    }

    setBloqueoUsuario(usuarioId, bloqueado) {
        const usuario = this.usuarios.find(u => u.id === usuarioId);
        if (usuario) {
            usuario.bloqueado = bloqueado;
            this.guardarDatos();
            return true;
        }
        return false;
    }

    // Verificar si un usuario tiene permisos específicos
    verificarPermisos(usuarioId, permisoRequerido) {
        const usuario = this.getUsuario(usuarioId);
        if (!usuario || usuario.bloqueado) {
            return false;
        }
        
        if (permisoRequerido === 'admin') {
            const resultado = usuario.permisos === 'admin';
            return resultado;
        }
        
        return true;
    }

    // Verificar si un usuario es el admin global (no se puede eliminar)
    esAdminGlobal(usuarioId) {
        const usuario = this.getUsuario(usuarioId);
        return usuario && usuario.correo === 'soportetecnico@cesun.edu.mx';
    }

    // Verificar si un usuario se puede eliminar
    sePuedeEliminarUsuario(usuarioId) {
        const usuario = this.usuarios.find(u => u.id === usuarioId);
        if (!usuario) return false;
        
        // El usuario global no se puede eliminar
        if (usuario.correo === 'soportetecnico@cesun.edu.mx') {
            return false;
        }
        
        // Verificar si el usuario está asignado a alguna casilla
        const casillas = this.casillas.filter(c => c.usuarios && c.usuarios.includes(usuarioId));
        return casillas.length === 0;
    }

    // ==================== FUNCIONES DE HISTORIAL ====================
    
    // Agregar entrada al historial
    agregarEntradaHistorial(accion, detalles, usuarioId = null) {
        const entrada = {
            id: Date.now() + Math.random(),
            fecha: new Date().toISOString(),
            accion: accion,
            detalles: detalles,
            usuarioId: usuarioId,
            usuarioNombre: usuarioId ? this.getUsuario(usuarioId)?.nombre : 'Sistema'
        };
        
        // Obtener historial existente
        let historial = this.getHistorial();
        historial.unshift(entrada); // Agregar al inicio
        
        // Mantener solo los últimos 1000 registros
        if (historial.length > 1000) {
            historial = historial.slice(0, 1000);
        }
        
        // Guardar historial
        localStorage.setItem('historialSistema', JSON.stringify(historial));
        
        console.log('Entrada agregada al historial:', entrada);
    }
    
    // Obtener historial completo
    getHistorial() {
        try {
            const historial = localStorage.getItem('historialSistema');
            return historial ? JSON.parse(historial) : [];
        } catch (error) {
            console.error('Error al cargar historial:', error);
            return [];
        }
    }
    
    // Obtener historial filtrado por usuario
    getHistorialPorUsuario(usuarioId) {
        const historial = this.getHistorial();
        return historial.filter(entrada => entrada.usuarioId === usuarioId);
    }
    
    // Obtener historial filtrado por fecha
    getHistorialPorFecha(fechaInicio, fechaFin) {
        const historial = this.getHistorial();
        return historial.filter(entrada => {
            const fechaEntrada = new Date(entrada.fecha);
            return fechaEntrada >= fechaInicio && fechaEntrada <= fechaFin;
        });
    }
    
    // Obtener historial filtrado por acción
    getHistorialPorAccion(accion) {
        const historial = this.getHistorial();
        return historial.filter(entrada => entrada.accion === accion);
    }
    
    // Limpiar historial
    limpiarHistorial() {
        localStorage.removeItem('historialSistema');
        console.log('Historial limpiado');
    }
    
    // Obtener estadísticas del historial
    getEstadisticasHistorial() {
        const historial = this.getHistorial();
        const estadisticas = {
            total: historial.length,
            porAccion: {},
            porUsuario: {},
            porFecha: {}
        };
        
        historial.forEach(entrada => {
            // Por acción
            estadisticas.porAccion[entrada.accion] = (estadisticas.porAccion[entrada.accion] || 0) + 1;
            
            // Por usuario
            const usuarioNombre = entrada.usuarioNombre || 'Sistema';
            estadisticas.porUsuario[usuarioNombre] = (estadisticas.porUsuario[usuarioNombre] || 0) + 1;
            
            // Por fecha
            const fecha = new Date(entrada.fecha).toDateString();
            estadisticas.porFecha[fecha] = (estadisticas.porFecha[fecha] || 0) + 1;
        });
        
        return estadisticas;
    }

    // ==================== FUNCIONES PARA REUNIONES Y HORARIOS FIJOS ====================
    
    // Verificar si una casilla tiene una reunión programada en este momento
    tieneReunionActiva(casillaId) {
        if (!this.reuniones) return false;
        
        const ahora = new Date();
        return this.reuniones.some(reunion => 
            reunion.casillaId === casillaId && 
            reunion.estado === 'programada' &&
            new Date(reunion.fechaInicio) <= ahora && 
            new Date(reunion.fechaFin) >= ahora
        );
    }
    
    // Obtener reunión activa de una casilla
    getReunionActiva(casillaId) {
        if (!this.reuniones) return null;
        
        const ahora = new Date();
        return this.reuniones.find(reunion => 
            reunion.casillaId === casillaId && 
            reunion.estado === 'programada' &&
            new Date(reunion.fechaInicio) <= ahora && 
            new Date(reunion.fechaFin) >= ahora
        );
    }
    
    // Verificar si una casilla está en horario fijo
    estaEnHorarioFijo(casillaId) {
        if (!this.horariosFijos) return false;
        
        const ahora = new Date();
        const diaSemana = ahora.getDay(); // 0 = Domingo, 1 = Lunes, etc.
        const horaActual = ahora.getHours().toString().padStart(2, '0') + ':' + 
                          ahora.getMinutes().toString().padStart(2, '0');
        
        return this.horariosFijos.some(horario => 
            horario.casillaId === casillaId && 
            horario.estado === 'activo' &&
            horario.dias.includes(diaSemana) &&
            horario.horaInicio <= horaActual && 
            horario.horaFin >= horaActual
        );
    }
    
    // Obtener horario fijo activo de una casilla
    getHorarioFijoActivo(casillaId) {
        if (!this.horariosFijos) return null;
        
        const ahora = new Date();
        const diaSemana = ahora.getDay();
        const horaActual = ahora.getHours().toString().padStart(2, '0') + ':' + 
                          ahora.getMinutes().toString().padStart(2, '0');
        
        return this.horariosFijos.find(horario => 
            horario.casillaId === casillaId && 
            horario.estado === 'activo' &&
            horario.dias.includes(diaSemana) &&
            horario.horaInicio <= horaActual && 
            horario.horaFin >= horaActual
        );
    }
    
    // Verificar si un servicio está disponible (no hay reuniones activas en todas las casillas que lo ofrecen)
    servicioDisponible(servicioId) {
        const casillasConServicio = this.casillas.filter(c => 
            c.activa !== false && 
            c.servicios && 
            c.servicios.includes(servicioId)
        );
        
        // Si no hay casillas con este servicio, no está disponible
        if (casillasConServicio.length === 0) return false;
        
        // Verificar si al menos una casilla está disponible (no en reunión ni horario fijo)
        return casillasConServicio.some(casilla => 
            !this.tieneReunionActiva(casilla.id) && 
            !this.estaEnHorarioFijo(casilla.id)
        );
    }
    
    // Obtener tiempo estimado de espera para un servicio
    getTiempoEstimadoEspera(servicioId) {
        const casillasDisponibles = this.casillas.filter(c => 
            c.activa !== false && 
            c.servicios && 
            c.servicios.includes(servicioId) &&
            !this.tieneReunionActiva(c.id) && 
            !this.estaEnHorarioFijo(c.id)
        );
        
        if (casillasDisponibles.length === 0) {
            return {
                disponible: false,
                mensaje: 'Servicio temporalmente no disponible',
                tiempoEstimado: null
            };
        }
        
        // Calcular tiempo estimado basado en turnos en espera
        const turnosEnEspera = this.turnos.filter(t => {
            if (t.estado !== 'en_espera') return false;
            
            const servicioTurno = this.getServicios().find(s => s.nombre === t.servicio);
            if (!servicioTurno || servicioTurno.id !== servicioId) return false;
            
            // Verificar que el turno pueda ser atendido por alguna casilla disponible
            return casillasDisponibles.some(casilla => 
                casilla.servicios.includes(servicioId)
            );
        });
        
        const tiempoPorTurno = 15; // minutos promedio por turno
        const tiempoEstimado = turnosEnEspera.length * tiempoPorTurno;
        
        return {
            disponible: true,
            mensaje: `Tiempo estimado de espera: ${tiempoEstimado} minutos`,
            tiempoEstimado: tiempoEstimado
        };
    }
    
    // Obtener todas las reuniones
    getReuniones() {
        return this.reuniones || [];
    }
    
    // Obtener todos los horarios fijos
    getHorariosFijos() {
        return this.horariosFijos || [];
    }
    
    // Cancelar una reunión
    cancelarReunion(reunionId) {
        if (!this.reuniones) return false;
        
        const reunion = this.reuniones.find(r => r.id === reunionId);
        if (reunion) {
            reunion.estado = 'cancelada';
            this.guardarDatos();
            return true;
        }
        return false;
    }
    
    // Desactivar un horario fijo
    desactivarHorarioFijo(horarioId) {
        if (!this.horariosFijos) return false;
        
        const horario = this.horariosFijos.find(h => h.id === horarioId);
        if (horario) {
            horario.estado = 'inactivo';
            this.guardarDatos();
            return true;
        }
        return false;
    }

    // Verificar si un usuario puede atender un servicio en una casilla específica
    puedeAtenderServicio(usuarioId, casillaId, servicioId) {
        // Verificar si el usuario está asignado a la casilla
        const casillasUsuario = this.obtenerCasillasDeUsuario(usuarioId);
        if (!casillasUsuario.includes(casillaId)) {
            return false;
        }
        
        // Verificar si la casilla está activa
        const casilla = this.getCasilla(casillaId);
        if (!casilla || casilla.activa === false) {
            return false;
        }
        
        // Verificar si la casilla puede atender el servicio
        if (!casilla.servicios || casilla.servicios.length === 0) {
            return true; // Si no tiene servicios específicos, puede atender cualquier servicio
        }
        
        return casilla.servicios.includes(servicioId);
    }
    
    // Obtener servicios que puede atender un usuario en una casilla específica
    getServiciosDisponiblesUsuario(usuarioId, casillaId) {
        const casilla = this.getCasilla(casillaId);
        if (!casilla || casilla.activa === false) {
            return [];
        }
        
        // Verificar si el usuario está asignado a la casilla
        const casillasUsuario = this.obtenerCasillasDeUsuario(usuarioId);
        if (!casillasUsuario.includes(casillaId)) {
            return [];
        }
        
        // Si la casilla no tiene servicios específicos, devolver todos los servicios activos
        if (!casilla.servicios || casilla.servicios.length === 0) {
            return this.getServiciosActivos();
        }
        
        // Devolver solo los servicios asignados a la casilla
        return this.getServicios().filter(s => 
            casilla.servicios.includes(s.id) && s.activo !== false
        );
    }
    
    // Obtener turnos en espera que puede atender un usuario en una casilla específica
    getTurnosDisponiblesUsuario(usuarioId, casillaId) {
        const casilla = this.getCasilla(casillaId);
        if (!casilla) return [];
        
        // Verificar que el usuario pueda atender en esta casilla
        if (!casilla.usuarios || !casilla.usuarios.includes(usuarioId)) {
            return [];
        }
        
        // Obtener servicios que puede atender el usuario en esta casilla
        const serviciosDisponibles = this.getServiciosDisponiblesUsuario(usuarioId, casillaId);
        const serviciosIds = serviciosDisponibles.map(s => s.id);
        
        // Filtrar turnos en espera que correspondan a estos servicios
        return this.turnos.filter(t => {
            if (t.estado !== 'en_espera') return false;
            
            const servicioTurno = this.getServicios().find(s => s.nombre === t.servicio);
            if (!servicioTurno) return false;
            
            return serviciosIds.includes(servicioTurno.id);
        }).sort((a, b) => new Date(a.fechaCreacion) - new Date(b.fechaCreacion));
    }
    
    // Función de debug para verificar asignaciones de usuarios a casillas
    debugAsignacionesUsuarios() {
        console.log('=== DEBUG ASIGNACIONES USUARIOS ===');
        console.log('Usuarios en el sistema:', this.usuarios.map(u => ({ id: u.id, nombre: u.nombre, correo: u.correo })));
        console.log('Casillas en el sistema:', this.casillas.map(c => ({ 
            id: c.id, 
            nombre: c.nombre, 
            usuarios: c.usuarios || [],
            activa: c.activa 
        })));
        
        // Verificar asignaciones para cada usuario
        this.usuarios.forEach(usuario => {
            const casillasAsignadas = this.obtenerCasillasDeUsuario(usuario.id);
            console.log(`Usuario ${usuario.nombre} (ID: ${usuario.id}):`, {
                casillasAsignadas: casillasAsignadas.map(c => c.nombre),
                totalCasillas: casillasAsignadas.length
            });
        });
        
        console.log('=== FIN DEBUG ===');
    }

    // Función para verificar y corregir el estado de las casillas
    verificarEstadoCasillas() {
        console.log('=== VERIFICACIÓN ESTADO CASILLAS ===');
        
        this.casillas.forEach(casilla => {
            console.log(`Casilla ${casilla.nombre} (ID: ${casilla.id}):`, {
                estado: casilla.estado,
                turnoActual: casilla.turnoActual,
                activa: casilla.activa
            });
            
            // Verificar si hay inconsistencias
            if (casilla.estado === 'ocupada' && !casilla.turnoActual) {
                console.warn(`⚠️ Casilla ${casilla.nombre} marcada como ocupada pero sin turno actual`);
                // Corregir: si no hay turno actual, debe estar libre
                casilla.estado = 'libre';
            }
            
            if (casilla.turnoActual) {
                const turno = this.turnos.find(t => t.id === casilla.turnoActual);
                if (!turno || turno.estado !== 'en_atencion') {
                    console.warn(`⚠️ Casilla ${casilla.nombre} tiene turno actual pero el turno no está en atención`);
                    // Corregir: limpiar turno actual
                    casilla.turnoActual = null;
                    casilla.estado = 'libre';
                }
            }
        });
        
        // Guardar cambios si se hicieron correcciones
        this.guardarDatos();
        console.log('=== FIN VERIFICACIÓN ===');
    }

    // ==================== FUNCIONES DE HORARIOS DE INACTIVIDAD ====================

    // Verificar si una casilla está inactiva por horarios
    estaCasillaInactiva(casillaId) {
        const casilla = this.getCasilla(casillaId);
        if (!casilla) return false;

        const ahora = new Date();
        const diaSemana = ahora.getDay(); // 0 = domingo, 1 = lunes, etc.
        const horaActual = ahora.toTimeString().slice(0, 5);

        // Verificar horarios de atención configurados
        if (casilla.horarios) {
            let horarioAplicable = null;

            if (diaSemana >= 1 && diaSemana <= 5) { // Lunes a viernes
                horarioAplicable = casilla.horarios.lunesViernes;
            } else { // Fin de semana
                horarioAplicable = casilla.horarios.finSemana;
            }

            if (horarioAplicable && (horaActual < horarioAplicable.inicio || horaActual > horarioAplicable.fin)) {
                return true;
            }

            // Verificar horario de comida
            if (casilla.horarios.comida && 
                horaActual >= casilla.horarios.comida.inicio && 
                horaActual <= casilla.horarios.comida.fin) {
                return true;
            }
        }

        // Verificar reuniones programadas
        const reunionesActivas = this.horariosInactividad?.filter(h => 
            h.casillaId === casillaId && 
            h.tipo === 'reunion' && 
            h.activo &&
            h.fecha === ahora.toISOString().split('T')[0]
        ) || [];

        for (const reunion of reunionesActivas) {
            const horaReunion = reunion.horaInicio;
            const finReunion = new Date(reunion.fecha + 'T' + horaReunion);
            finReunion.setHours(finReunion.getHours() + reunion.duracion);

            if (ahora >= new Date(reunion.fecha + 'T' + horaReunion) && ahora <= finReunion) {
                return true;
            }
        }

        return false;
    }

    // Obtener razón de inactividad de una casilla
    getRazonInactividad(casillaId) {
        const casilla = this.getCasilla(casillaId);
        if (!casilla) return '';

        const ahora = new Date();
        const diaSemana = ahora.getDay();
        const horaActual = ahora.toTimeString().slice(0, 5);

        // Verificar horarios de atención
        if (casilla.horarios) {
            let horarioAplicable = null;

            if (diaSemana >= 1 && diaSemana <= 5) {
                horarioAplicable = casilla.horarios.lunesViernes;
            } else {
                horarioAplicable = casilla.horarios.finSemana;
            }

            if (horarioAplicable && (horaActual < horarioAplicable.inicio || horaActual > horarioAplicable.fin)) {
                return `Fuera del horario de atención (${horarioAplicable.inicio} - ${horarioAplicable.fin})`;
            }

            if (casilla.horarios.comida && 
                horaActual >= casilla.horarios.comida.inicio && 
                horaActual <= casilla.horarios.comida.fin) {
                return `Horario de comida (${casilla.horarios.comida.inicio} - ${casilla.horarios.comida.fin})`;
            }
        }

        // Verificar reuniones programadas
        const reunionesActivas = this.horariosInactividad?.filter(h => 
            h.casillaId === casillaId && 
            h.tipo === 'reunion' && 
            h.activo &&
            h.fecha === ahora.toISOString().split('T')[0]
        ) || [];

        for (const reunion of reunionesActivas) {
            const horaReunion = reunion.horaInicio;
            const finReunion = new Date(reunion.fecha + 'T' + horaReunion);
            finReunion.setHours(finReunion.getHours() + reunion.duracion);

            if (ahora >= new Date(reunion.fecha + 'T' + horaReunion) && ahora <= finReunion) {
                return `Reunión programada: ${reunion.motivo}`;
            }
        }

        return '';
    }

    // Verificar si un servicio está disponible considerando horarios
    servicioDisponibleConHorarios(servicioId) {
        // Obtener todas las casillas que ofrecen este servicio
        const casillasConServicio = this.casillas.filter(c => 
            c.servicios.includes(servicioId) && c.activa
        );

        // Si no hay casillas con este servicio, el servicio no está disponible
        if (casillasConServicio.length === 0) {
            return false;
        }

        // Verificar si al menos una casilla está activa (no inactiva por horarios)
        for (const casilla of casillasConServicio) {
            if (!this.estaCasillaInactiva(casilla.id)) {
                return true;
            }
        }

        return false;
    }

    // Verificar si se puede crear un turno para un servicio específico
    sePuedeCrearTurno(servicioId) {
        // Obtener todas las casillas que ofrecen este servicio
        const casillasConServicio = this.casillas.filter(c => 
            c.servicios.includes(servicioId) && c.activa
        );

        // Si no hay casillas con este servicio, no se puede crear turno
        if (casillasConServicio.length === 0) {
            return {
                puede: false,
                razon: 'No hay casillas disponibles para este servicio'
            };
        }

        // Verificar si al menos una casilla está activa
        const casillasActivas = casillasConServicio.filter(casilla => !this.estaCasillaInactiva(casilla.id));
        
        if (casillasActivas.length === 0) {
            // Todas las casillas están inactivas, obtener razón
            const razones = casillasConServicio.map(casilla => this.getRazonInactividad(casilla.id));
            const razonUnica = [...new Set(razones)].join('; ');
            
            return {
                puede: false,
                razon: `Servicio temporalmente inactivo: ${razonUnica}`,
                tiempoEstimado: this.getTiempoEstimadoReanudacion(servicioId)
            };
        }

        return {
            puede: true,
            razon: 'Servicio disponible'
        };
    }

    // Obtener tiempo estimado de reanudación para un servicio
    getTiempoEstimadoReanudacion(servicioId) {
        const casillasConServicio = this.casillas.filter(c => 
            c.servicios.includes(servicioId) && c.activa
        );

        if (casillasConServicio.length === 0) {
            return 'Servicio no disponible';
        }

        const ahora = new Date();
        let tiempoMasCercano = null;

        for (const casilla of casillasConServicio) {
            if (this.estaCasillaInactiva(casilla.id)) {
                const tiempoReanudacion = this.calcularTiempoReanudacionCasilla(casilla.id);
                if (tiempoReanudacion && (!tiempoMasCercano || tiempoReanudacion < tiempoMasCercano)) {
                    tiempoMasCercano = tiempoReanudacion;
                }
            }
        }

        if (tiempoMasCercano) {
            const minutos = Math.ceil((tiempoMasCercano - ahora) / (1000 * 60));
            return `Reanudación en aproximadamente ${minutos} minutos`;
        }

        return 'Servicio disponible';
    }

    // Calcular tiempo de reanudación para una casilla específica
    calcularTiempoReanudacionCasilla(casillaId) {
        const casilla = this.getCasilla(casillaId);
        if (!casilla) return null;

        const ahora = new Date();
        const diaSemana = ahora.getDay();
        const horaActual = ahora.toTimeString().slice(0, 5);

        // Verificar horarios de atención
        if (casilla.horarios) {
            let horarioAplicable = null;

            if (diaSemana >= 1 && diaSemana <= 5) {
                horarioAplicable = casilla.horarios.lunesViernes;
            } else {
                horarioAplicable = casilla.horarios.finSemana;
            }

            if (horarioAplicable && horaActual < horarioAplicable.inicio) {
                // Casilla abrirá hoy
                const horaApertura = new Date();
                const [horas, minutos] = horarioAplicable.inicio.split(':');
                horaApertura.setHours(parseInt(horas), parseInt(minutos), 0, 0);
                return horaApertura;
            } else if (horarioAplicable && horaActual > horarioAplicable.fin) {
                // Casilla abrirá mañana
                const horaApertura = new Date();
                horaApertura.setDate(horaApertura.getDate() + 1);
                const [horas, minutos] = horarioAplicable.inicio.split(':');
                horaApertura.setHours(parseInt(horas), parseInt(minutos), 0, 0);
                return horaApertura;
            }

            // Verificar horario de comida
            if (casilla.horarios.comida && 
                horaActual >= casilla.horarios.comida.inicio && 
                horaActual <= casilla.horarios.comida.fin) {
                const finComida = new Date();
                const [horas, minutos] = casilla.horarios.comida.fin.split(':');
                finComida.setHours(parseInt(horas), parseInt(minutos), 0, 0);
                return finComida;
            }
        }

        // Verificar reuniones programadas
        const reunionesActivas = this.horariosInactividad?.filter(h => 
            h.casillaId === casillaId && 
            h.tipo === 'reunion' && 
            h.activo &&
            h.fecha === ahora.toISOString().split('T')[0]
        ) || [];

        for (const reunion of reunionesActivas) {
            const horaReunion = reunion.horaInicio;
            const finReunion = new Date(reunion.fecha + 'T' + horaReunion);
            finReunion.setHours(finReunion.getHours() + reunion.duracion);

            if (ahora >= new Date(reunion.fecha + 'T' + horaReunion) && ahora <= finReunion) {
                return finReunion;
            }
        }

        return null;
    }

    // Obtener horarios de inactividad de una casilla
    getHorariosInactividad(casillaId) {
        return this.horariosInactividad?.filter(h => h.casillaId === casillaId) || [];
    }

    // Cancelar un horario de inactividad
    cancelarHorarioInactividad(horarioId) {
        const horario = this.horariosInactividad?.find(h => h.id === horarioId);
        if (horario) {
            horario.activo = false;
            this.guardarDatos();
            return true;
        }
        return false;
    }

    // Limpiar horarios de reunión expirados
    limpiarHorariosExpirados() {
        if (!this.horariosInactividad) return;

        const ahora = new Date();
        let horariosEliminados = 0;

        // Filtrar horarios de reunión que han expirado
        this.horariosInactividad = this.horariosInactividad.filter(horario => {
            if (horario.tipo === 'reunion' && horario.activo) {
                const fechaReunion = new Date(horario.fecha + 'T' + horario.horaInicio);
                const finReunion = new Date(fechaReunion.getTime() + (horario.duracion * 60 * 60 * 1000));
                
                // Si la reunión ya terminó, marcarla como inactiva
                if (ahora > finReunion) {
                    horario.activo = false;
                    horariosEliminados++;
                    return false; // Eliminar del array
                }
            }
            return true;
        });

        if (horariosEliminados > 0) {
            this.guardarDatos();
            console.log(`Se limpiaron ${horariosEliminados} horarios de reunión expirados`);
        }

        return horariosEliminados;
    }

    // Verificar y limpiar horarios expirados (llamar periódicamente)
    verificarHorariosExpirados() {
        const horariosEliminados = this.limpiarHorariosExpirados();
        
        if (horariosEliminados > 0) {
            // Notificar a turnos en espera que el servicio está disponible nuevamente
            this.notificarReanudacionServicios();
        }
    }

    // Notificar reanudación de servicios
    notificarReanudacionServicios() {
        const turnosEnEspera = this.turnos.filter(t => t.estado === 'en_espera');
        
        turnosEnEspera.forEach(turno => {
            const servicio = this.getServicios().find(s => s.nombre === turno.servicio);
            if (servicio && this.servicioDisponibleConHorarios(servicio.id)) {
                // Limpiar notificación de inactividad si existe
                if (turno.notificacionInactividad) {
                    delete turno.notificacionInactividad;
                }
            }
        });

        this.guardarDatos();
    }
}

// Crear instancia global de la base de datos
const db = new TurnoDB();

// Hacer la instancia disponible globalmente
window.db = db;

// Función para limpiar datos antiguos al cargar
db.limpiarTurnosAntiguos();

console.log('Base de datos de turnos inicializada'); 