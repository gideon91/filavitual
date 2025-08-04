// Sistema de Autenticación y Control de Permisos
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.loadCurrentUser();
    }

    // Cargar usuario actual desde sessionStorage
    loadCurrentUser() {
        try {
            const userData = sessionStorage.getItem('currentUser');
            if (userData) {
                this.currentUser = JSON.parse(userData);
            }
        } catch (error) {
            console.error('Error al cargar usuario:', error);
            this.currentUser = null;
        }
    }

    // Guardar usuario actual en sessionStorage
    saveCurrentUser() {
        if (this.currentUser) {
            sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        } else {
            sessionStorage.removeItem('currentUser');
        }
    }

    // Iniciar sesión
    login(correo, contrasena) {
        const usuario = db.getUsuarios().find(u => 
            u.correo.toLowerCase() === correo.toLowerCase() && 
            u.contrasena === contrasena && 
            !u.bloqueado
        );

        if (!usuario) {
            throw new Error('Credenciales incorrectas o usuario bloqueado');
        }

        this.currentUser = {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            permisos: usuario.permisos
        };

        this.saveCurrentUser();
        return this.currentUser;
    }

    // Cerrar sesión
    logout() {
        this.currentUser = null;
        this.saveCurrentUser();
        window.location.href = 'login.html';
    }

    // Verificar si el usuario está autenticado
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Verificar permisos del usuario actual
    hasPermission(permisoRequerido) {
        if (!this.isAuthenticated()) {
            return false;
        }

        const resultado = db.verificarPermisos(this.currentUser.id, permisoRequerido);
        return resultado;
    }

    // Verificar si es administrador
    isAdmin() {
        return this.hasPermission('admin');
    }

    // Obtener usuario actual
    getCurrentUser() {
        return this.currentUser;
    }

    // Verificar acceso a páginas
    checkPageAccess() {
        const currentPage = window.location.pathname;
        
        // Páginas que requieren autenticación
        const protectedPages = [
            '/pages/admin.html',
            '/pages/configuracion.html'
        ];

        // Páginas que requieren ser admin (global o normal)
        const adminPages = [
            '/pages/configuracion.html'
        ];

        // Verificar si la página actual requiere autenticación
        if (protectedPages.some(page => currentPage.includes(page))) {
            if (!this.isAuthenticated()) {
                this.redirectToLogin();
                return false;
            }

            // Verificar si la página requiere ser admin
            if (adminPages.some(page => currentPage.includes(page))) {
                if (!this.isAdmin()) {
                    this.showAccessDenied();
                    return false;
                }
            }
        }

        return true;
    }

    // Redirigir al login
    redirectToLogin() {
        alert('Debe iniciar sesión para acceder a esta página.');
        window.location.href = 'login.html';
    }

    // Mostrar error de acceso denegado
    showAccessDenied() {
        alert('Acceso denegado. Solo los administradores pueden acceder a esta página.');
        window.location.href = 'admin.html';
    }

    // Actualizar interfaz según permisos
    updateUIByPermissions() {
        if (!this.isAuthenticated()) {
            this.hideAdminElements();
            return;
        }

        // Los usuarios admin pueden ver elementos de configuración
        if (this.isAdmin()) {
            this.showAdminElements();
        } else {
            this.hideAdminElements();
        }

        this.updateUserInfo();
    }

    // Mostrar elementos de administrador
    showAdminElements() {
        const adminElements = document.querySelectorAll('[data-admin-only]');
        adminElements.forEach(element => {
            element.style.display = '';
        });
    }

    // Ocultar elementos de administrador
    hideAdminElements() {
        const adminElements = document.querySelectorAll('[data-admin-only]');
        adminElements.forEach(element => {
            element.style.display = 'none';
        });
    }

    // Actualizar información del usuario en la interfaz
    updateUserInfo() {
        const userInfoElements = document.querySelectorAll('[data-user-info]');
        
        userInfoElements.forEach(element => {
            const infoType = element.getAttribute('data-user-info');
            switch (infoType) {
                case 'nombre':
                    element.textContent = this.currentUser.nombre;
                    break;
                case 'correo':
                    element.textContent = this.currentUser.correo;
                    break;
                case 'permisos':
                    element.textContent = this.currentUser.permisos === 'admin' ? 'Administrador' : 'Usuario';
                    break;
            }
        });
    }
}

// Crear instancia global del sistema de autenticación
const auth = new AuthSystem();

// Hacer la instancia disponible globalmente
window.auth = auth;

// Verificar acceso a la página al cargar
document.addEventListener('DOMContentLoaded', function() {
    auth.checkPageAccess();
    auth.updateUIByPermissions();
});

console.log('Sistema de autenticación inicializado'); 