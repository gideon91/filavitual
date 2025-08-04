// js/login.js

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';

    const correo = loginForm.correo.value.trim();
    const contrasena = loginForm.contrasena.value;

    // Validar correo institucional CESUN
    if (!correo.endsWith('@cesun.edu.mx')) {
      loginError.textContent = 'Solo se permite el acceso con correos institucionales @cesun.edu.mx';
      return;
    }

    // Autenticación real contra la base de datos JS
    const usuario = db.getUsuarios().find(u => u.correo === correo && u.contrasena === contrasena);
    if (!usuario) {
      loginError.textContent = 'Correo o contraseña incorrectos';
      return;
    }
    // Validar si el usuario está bloqueado
    if (usuario.bloqueado) {
      loginError.textContent = 'El usuario está bloqueado. Contacta al administrador.';
      return;
    }
    // Si la contraseña es la de defecto, forzar cambio
    if (contrasena === 'CESUN2025' && usuario.contrasena === 'CESUN2025') {
      // Guardar usuario temporalmente en sesión para cambio de contraseña
      sessionStorage.setItem('usuarioCambio', JSON.stringify(usuario));
      const modal = new bootstrap.Modal(document.getElementById('modalCambioContrasena'));
      modal.show();
      return;
    }
    // Buscar la casilla asignada al usuario
    const casilla = db.getCasillas().find(c => c.usuarios && c.usuarios[0] === usuario.id);
    if (casilla) {
      usuario.casilla_id = casilla.id;
      usuario.casilla_nombre = casilla.nombre;
    }
    // Guardar sesión
    localStorage.setItem('admin', JSON.stringify(usuario));
    window.location.href = 'admin.html';
  });
});

document.getElementById('formCambioContrasena').addEventListener('submit', function(e) {
  e.preventDefault();
  const nueva = document.getElementById('nuevaContrasena').value;
  const confirmar = document.getElementById('confirmarContrasena').value;
  const errorDiv = document.getElementById('errorCambioContrasena');
  errorDiv.textContent = '';
  if (nueva.length < 8) {
    errorDiv.textContent = 'La contraseña debe tener al menos 8 caracteres.';
    return;
  }
  if (nueva !== confirmar) {
    errorDiv.textContent = 'Las contraseñas no coinciden.';
    return;
  }
  // Obtener usuario de sesión
  const usuario = JSON.parse(sessionStorage.getItem('usuarioCambio'));
  if (!usuario) {
    errorDiv.textContent = 'Error interno. Intenta de nuevo.';
    return;
  }
  // Actualizar contraseña
  if (db.setContrasenaUsuario(usuario.id, nueva)) {
    sessionStorage.removeItem('usuarioCambio');
    // Mostrar mensaje y redirigir al login
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalCambioContrasena'));
    modal.hide();
    alert('Contraseña actualizada correctamente. Inicia sesión con tu nueva contraseña.');
    window.location.reload();
  } else {
    errorDiv.textContent = 'No se pudo actualizar la contraseña.';
  }
}); 