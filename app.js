import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ==========================================
// 1. VERIFICAR AUTENTICACIÓN
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = './auth/login.html';
    } else {
        console.log("Usuario autenticado:", user.email);
        iniciarCRM(); 
    }
});

// ==========================================
// 2. LÓGICA DEL MODAL DE CERRAR SESIÓN
// ==========================================
const logoutModal = document.getElementById('logout-modal');
const btnLogout = document.getElementById('btn-logout');
const btnCancelLogout = document.getElementById('btn-cancel-logout');
const btnConfirmLogout = document.getElementById('btn-confirm-logout');

btnLogout.addEventListener('click', () => logoutModal.classList.add('active'));
btnCancelLogout.addEventListener('click', () => logoutModal.classList.remove('active'));
logoutModal.addEventListener('click', (e) => { if (e.target === logoutModal) logoutModal.classList.remove('active'); });

btnConfirmLogout.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = './auth/login.html';
    } catch (error) {
        console.error("Error al cerrar sesión", error);
    }
});

// ==========================================
// 3. LÓGICA DEL CRM (Módulos y Menú)
// ==========================================
function iniciarCRM() {
    // Menú lateral (abrir/cerrar submenús)
    document.querySelectorAll('.menu-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            button.parentElement.classList.toggle('open');
        });
    });

    // Función para cargar los módulos dinámicamente
    async function cargarModulo(nombreModulo, titulo) {
        const contentArea = document.getElementById('content-area');
        document.getElementById('page-title').textContent = titulo;
        contentArea.innerHTML = '<div style="text-align:center; padding: 50px; color:#666;">Cargando módulo...</div>';

        try {
            // 1. Cargar el HTML
            const respuestaHTML = await fetch(`./modules/${nombreModulo}/vista.html`);
            if (!respuestaHTML.ok) throw new Error("No se encontró el HTML");
            const html = await respuestaHTML.text();
            contentArea.innerHTML = html;

            // 2. Cargar el CSS del módulo
            const idCSS = `css-${nombreModulo}`;
            if (!document.getElementById(idCSS)) {
                const link = document.createElement('link');
                link.id = idCSS;
                link.rel = 'stylesheet';
                link.href = `./modules/${nombreModulo}/estilos.css`;
                link.onload = () => console.log(`✅ CSS cargado correctamente: ${nombreModulo}`);
                link.onerror = () => console.error(`❌ Error al cargar el CSS: ${nombreModulo}.`);
                document.head.appendChild(link);
            }

            // 3. Cargar el JS del módulo
            const moduloJS = await import(`./modules/${nombreModulo}/logica.js`);
            if (moduloJS.init) moduloJS.init();

        } catch (error) {
            console.error(`Error al cargar el módulo ${nombreModulo}:`, error);
            contentArea.innerHTML = `<h3 style="color:red;">Error al cargar el módulo. Revisa la consola (F12).</h3>`;
        }
    }

    // Escuchar clics en el menú para cambiar de módulo
    document.querySelectorAll('.submenu-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.submenu-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const modulo = link.getAttribute('data-module');
            const titulo = link.getAttribute('data-title');
            
            if (modulo) {
                cargarModulo(modulo, titulo);
            } else {
                document.getElementById('content-area').innerHTML = `<h2>Módulo ${titulo} en construcción</h2>`;
            }
        });
    });

    // ==========================================
    // CARGAR EL MÓDULO INICIAL (DASHBOARD)
    // ==========================================
    cargarModulo('dashboard', 'Dashboard');
}