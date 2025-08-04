# Sistema de Gestión de Turnos - CESUN Universidad

Sistema web completo para la gestión digital de turnos en servicios estudiantiles de la Universidad CESUN.

## 📁 Estructura del Proyecto

```
FilaVirtual/
├── index.html              # Página principal (solicitud de turnos)
├── css/
│   ├── main.css            # Estilos base del sistema
│   ├── index.css           # Estilos específicos para index.html
│   ├── dashboard.css       # Estilos para pantalla de espera
│   └── admin.css           # Estilos para panel de administración
├── js/
│   ├── db.js               # Base de datos y gestión de datos
│   ├── main.js             # Funciones comunes del sistema
│   ├── index.js            # Funcionalidad específica de index.html
│   ├── dashboard.js        # Funcionalidad de pantalla de espera
│   └── admin.js            # Funcionalidad del panel de administración
├── pages/
│   ├── dashboard.html      # Pantalla de espera de turnos
│   └── admin.html          # Panel de administración
└── README.md               # Documentación del proyecto
```

## 🚀 Características Principales

### Para Estudiantes (index.html)
- ✅ Solicitud de turnos con correo institucional
- ✅ Validación de dominios @cesun.edu.mx y @cesunbc.edu.mx
- ✅ Selección de servicios mediante dropdown
- ✅ Generación de códigos QR simulados
- ✅ Interfaz responsive y moderna
- ✅ Validación en tiempo real

### Para Administradores (admin.html)
- ✅ Panel de control completo
- ✅ Gestión de turnos en tiempo real
- ✅ Llamado de turnos por casilla
- ✅ Estadísticas del día
- ✅ Exportación de datos
- ✅ Autenticación segura (código: Cesun2025*)
- ✅ Sesión temporal (8 horas)

### Pantalla de Espera (dashboard.html)
- ✅ Visualización en tiempo real
- ✅ Estado de casillas
- ✅ Próximos turnos
- ✅ Reloj en vivo
- ✅ Modo pantalla completa
- ✅ Actualizaciones automáticas

## 🛠️ Tecnologías Utilizadas

- **HTML5** - Estructura semántica
- **CSS3** - Estilos modernos con variables CSS
- **JavaScript ES6+** - Funcionalidad dinámica
- **Bootstrap 5** - Framework responsive
- **Font Awesome** - Iconografía
- **localStorage** - Persistencia de datos

## 📋 Servicios Disponibles

1. **Constancias** - Documentos oficiales de estudios
2. **Reinscripciones** - Proceso de reinscripción académica
3. **Pagos** - Atención de pagos y cobranza
4. **Asesorías** - Orientación y consultas académicas

## 🔧 Instalación y Uso

### Requisitos
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Servidor web local (opcional, para desarrollo)

### Instalación
1. Clonar o descargar el proyecto
2. Abrir `index.html` en el navegador
3. El sistema está listo para usar

### Uso del Sistema

#### Para Estudiantes
1. Abrir `index.html`
2. Seleccionar el servicio deseado
3. Ingresar correo institucional
4. Generar turno
5. Esperar ser llamado en la pantalla

#### Para Administradores
1. Hacer clic en "Administración" en index.html
2. Ingresar código: `Cesun2025*`
3. Gestionar turnos desde el panel
4. Usar la pantalla de espera para visualización

## 🎨 Características de Diseño

- **Responsive Design** - Adaptable a todos los dispositivos
- **Tema CESUN** - Colores institucionales
- **Animaciones suaves** - Transiciones y efectos visuales
- **Accesibilidad** - Navegación por teclado y lectores de pantalla
- **Modo oscuro** - Soporte para preferencias del sistema

## 🔐 Seguridad

- Validación de correos institucionales
- Autenticación de administradores
- Sesiones temporales
- Limpieza automática de datos antiguos
- Validación de entrada de datos

## 📊 Funcionalidades Avanzadas

### Sistema de Eventos en Tiempo Real
- Sincronización automática entre pantallas
- Actualizaciones sin recargar página
- Notificaciones push

### Gestión de Datos
- Persistencia en localStorage
- Exportación de estadísticas
- Limpieza automática de datos antiguos
- Backup de información

### Atajos de Teclado
- **F5** - Actualizar datos manualmente
- **F11** - Pantalla completa (dashboard)
- **Ctrl + L** - Limpiar datos (admin)
- **Ctrl + E** - Exportar estadísticas (admin)
- **Ctrl + P** - Abrir pantalla de espera (admin)

## 🐛 Solución de Problemas

### Problemas Comunes
1. **No se generan turnos**: Verificar correo institucional
2. **No se actualiza pantalla**: Verificar conexión a internet
3. **Error de sesión**: Reiniciar sesión de administrador
4. **Datos no persisten**: Verificar localStorage habilitado

### Logs de Desarrollo
- Abrir consola del navegador (F12)
- Revisar mensajes de error
- Verificar carga de archivos

## 📈 Estadísticas y Reportes

El sistema genera automáticamente:
- Total de turnos del día
- Turnos en espera
- Turnos en atención
- Turnos atendidos
- Turnos cancelados
- Estado de casillas

## 🔄 Actualizaciones Futuras

- [ ] Integración con base de datos real
- [ ] Sistema de notificaciones push
- [ ] App móvil
- [ ] Integración con sistemas universitarios
- [ ] Reportes avanzados
- [ ] Múltiples ubicaciones

## 📞 Soporte

Para soporte técnico o consultas:
- Revisar la documentación
- Verificar la consola del navegador
- Contactar al equipo de desarrollo

## 📄 Licencia

© 2025 CESUN Universidad - Todos los derechos reservados

---

**Desarrollado con ❤️ para CESUN Universidad** 