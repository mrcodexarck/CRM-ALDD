import { auth } from '../firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const registerForm = document.getElementById('register-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const errorDiv = document.getElementById('register-error');
const successDiv = document.getElementById('register-success');
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

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    const email = emailInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password !== confirmPassword) {
        errorDiv.textContent = "Las contraseñas no coinciden.";
        errorDiv.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        errorDiv.textContent = "La contraseña debe tener al menos 6 caracteres.";
        errorDiv.style.display = 'block';
        return;
    }

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        
        successDiv.textContent = "¡Cuenta creada con éxito! Redirigiendo...";
        successDiv.style.display = 'block';
        
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);

    } catch (error) {
        console.error("Error al registrar:", error.code);
        let mensaje = "Error al crear la cuenta.";
        if (error.code === 'auth/email-already-in-use') {
            mensaje = "Este correo ya está registrado.";
        } else if (error.code === 'auth/invalid-email') {
            mensaje = "El formato del correo no es válido.";
        }
        errorDiv.textContent = mensaje;
        errorDiv.style.display = 'block';
    }
});