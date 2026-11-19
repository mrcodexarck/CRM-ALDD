import { auth } from '../firebase-config.js';
// Añadimos browserSessionPersistence a la importación
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('remember');
const errorDiv = document.getElementById('login-error');
const togglePasswordBtn = document.getElementById('toggle-password');

togglePasswordBtn.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePasswordBtn.textContent = 'Ocultar';
    } else {
        passwordInput.type = 'password';
        togglePasswordBtn.textContent = 'Mostrar';
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.style.display = 'none';

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        // CORRECCIÓN AQUÍ: 
        // Si marca la casilla -> LocalPersistence (se guarda en el navegador)
        // Si NO marca la casilla -> SessionPersistence (se borra al cerrar la pestaña)
        const persistenceType = rememberCheckbox.checked ? browserLocalPersistence : browserSessionPersistence;
        
        await setPersistence(auth, persistenceType);
        await signInWithEmailAndPassword(auth, email, password);
        
        // Redirigir a la raíz (index.html)
        window.location.href = '../index.html';

    } catch (error) {
        console.error("Error de login:", error.code);
        let mensaje = "Error al iniciar sesión.";
        
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            mensaje = "Correo o contraseña incorrectos.";
        } else if (error.code === 'auth/too-many-requests') {
            mensaje = "Demasiados intentos fallidos. Intenta más tarde.";
        } else if (error.code === 'auth/network-request-failed') {
            mensaje = "Error de conexión. Revisa tu internet.";
        }
        
        errorDiv.textContent = mensaje;
        errorDiv.style.display = 'block';
    }
});