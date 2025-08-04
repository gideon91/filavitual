# Instrucciones de Prueba - Sincronización en Tiempo Real

## ✅ Cambios Realizados

Se han eliminado los atributos HTMX problemáticos que estaban interfiriendo con las actualizaciones de JavaScript:

### Archivos Modificados:
- **`pages/admin.html`**: Eliminados atributos HTMX de `tablaTurnos` y `turnosPendientesCount`
- **`pages/dashboard.html`**: Eliminados atributos HTMX de `casillasContainer` y `proximosTurnosContainer`
- **`js/main.js`**: Eliminadas llamadas a `htmx.trigger()`

### Sistema de Sincronización Actual:
- **localStorage Events**: Para comunicación entre pestañas
- **Custom Events**: Para actualizaciones en la misma página
- **Direct DOM Manipulation**: Actualización directa con `innerHTML`
- **setInterval**: Actualizaciones periódicas como respaldo

## 🧪 Métodos de Prueba

### 1. Prueba Manual (Recomendada)

1. **Abrir múltiples pestañas:**
   - `index.html` (página principal)
   - `pages/admin.html` (panel de administración)
   - `pages/dashboard.html` (pantalla pública)

2. **Generar un turno:**
   - En `index.html`, llenar el formulario y hacer clic en "Generar Turno"
   - O usar el botón "Probar Sincronización" para una prueba rápida

3. **Verificar actualizaciones automáticas:**
   - En `admin.html`: El panel "Turnos en Espera" debe actualizarse automáticamente
   - En `dashboard.html`: Las casillas y próximos turnos deben actualizarse

### 2. Prueba Automatizada

Usar el nuevo archivo `test-sincronizacion.html`:

1. **Abrir `test-sincronizacion.html`** en una pestaña
2. **Abrir `admin.html`** y `dashboard.html` en otras pestañas
3. **Hacer clic en "Probar Sincronización"** o "Generar Turno de Prueba"
4. **Revisar los logs** para ver el flujo de eventos
5. **Verificar que las otras pestañas se actualicen automáticamente**

## 🔍 Verificación de Funcionamiento

### Console Logs Esperados:

Al generar un turno, deberías ver en la consola:

```
🧪 Iniciando prueba de sincronización...
✅ Funciones básicas disponibles
📝 Turno de prueba creado: TEST123
📡 Evento global emitido correctamente
🔄 Evento global recibido en main.js: {tipo: "dataChanged", data: {...}}
🔄 Procesando evento dataChanged...
✅ cargarTurnosEnEspera ejecutado
✅ actualizarDashboard ejecutado
🔄 Evento localStorage recibido en admin: {tipo: "dataChanged", data: {...}}
🔄 Actualizando admin por evento localStorage
🔄 Evento localStorage recibido en dashboard: {tipo: "dataChanged", data: {...}}
🔄 Actualizando dashboard por evento localStorage
```

### Elementos que Deben Actualizarse:

**En admin.html:**
- Contador de turnos pendientes (`#turnosPendientesCount`)
- Tabla de turnos en espera (`#tablaTurnos`)

**En dashboard.html:**
- Contenedor de casillas (`#casillasContainer`)
- Lista de próximos turnos (`#proximosTurnosContainer`)

## 🛠️ Solución de Problemas

### Si las actualizaciones no funcionan:

1. **Verificar Console:**
   - Abrir DevTools (F12)
   - Revisar si hay errores JavaScript
   - Verificar que los logs aparezcan correctamente

2. **Verificar localStorage:**
   ```javascript
   // En la consola del navegador:
   console.log(localStorage.getItem('eventoGlobal'));
   ```

3. **Verificar funciones disponibles:**
   ```javascript
   // En la consola:
   console.log(typeof emitirEventoGlobal);
   console.log(typeof cargarTurnosEnEspera);
   console.log(typeof actualizarDashboard);
   ```

4. **Forzar actualización manual:**
   ```javascript
   // En admin.html:
   cargarTurnosEnEspera();
   
   // En dashboard.html:
   actualizarDashboard();
   ```

### Si hay errores específicos:

- **"Función no definida"**: Verificar que todos los archivos JS se carguen correctamente
- **"Elemento no encontrado"**: Verificar que los IDs de los elementos existan en el HTML
- **"Error de parsing"**: Verificar que el localStorage no esté corrupto

## 📊 Monitoreo en Tiempo Real

### Usar el archivo de prueba:
- `test-sincronizacion.html` proporciona logs detallados
- Muestra el estado del sistema en tiempo real
- Permite verificar funciones disponibles
- Incluye botones para pruebas rápidas

### Verificar estado del sistema:
```javascript
// Verificar turnos en espera
console.log('Turnos en espera:', db.getTurnosEnEspera().length);

// Verificar casillas
console.log('Casillas disponibles:', db.getCasillas().length);

// Verificar último evento
console.log('Último evento:', localStorage.getItem('eventoGlobal'));
```

## ✅ Criterios de Éxito

La sincronización funciona correctamente cuando:

1. ✅ Al generar un turno en `index.html`, aparece automáticamente en `admin.html`
2. ✅ El contador de turnos pendientes se actualiza automáticamente
3. ✅ El dashboard muestra el nuevo turno en la lista de próximos
4. ✅ No se requieren recargas de página
5. ✅ Los logs muestran el flujo correcto de eventos
6. ✅ Funciona en múltiples pestañas simultáneamente

## 🔄 Flujo de Eventos

1. **Generación de turno** → `generarTurnoSeguro()`
2. **Emisión de evento global** → `emitirEventoGlobal()`
3. **Almacenamiento en localStorage** → `localStorage.setItem()`
4. **Detección en otras pestañas** → `window.addEventListener('storage')`
5. **Actualización de interfaces** → `cargarTurnosEnEspera()` / `actualizarDashboard()`
6. **Actualización de DOM** → `innerHTML` directo

## 📝 Notas Importantes

- **HTMX eliminado**: Ya no se usan atributos HTMX para evitar conflictos
- **JavaScript puro**: Todas las actualizaciones se manejan con JavaScript nativo
- **Múltiples mecanismos**: Se usan localStorage + custom events + setInterval como respaldo
- **Logs detallados**: Cada paso del proceso está registrado para debugging
- **Compatibilidad**: Funciona en todos los navegadores modernos 