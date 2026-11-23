import { confirmarEliminacion } from '../../app.js';
import { db } from '../../firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function init() {
    const coleccionClientes = collection(db, "CLIENTES");

    // Referencias al DOM (Tarjetas)
    const statTotal = document.getElementById('stat-total');
    const statNuevos = document.getElementById('stat-nuevos');
    const statContactados = document.getElementById('stat-contactados');
    const statCalificados = document.getElementById('stat-calificados');
    
    // Referencia a la tabla de recientes
    const recentTbody = document.getElementById('recent-tbody');
    const linkVerTodos = document.getElementById('link-ver-todos');

    // Evento para ir al módulo de clientes al hacer clic en "Ver todos"
    linkVerTodos.addEventListener('click', (e) => {
        e.preventDefault();
        // Simulamos el clic en el menú lateral de "Posibles clientes"
        const menuClientes = document.querySelector('a[data-module="posibles-clientes"]');
        if (menuClientes) menuClientes.click();
    });

    // ==========================================
    // ESCUCHAR DATOS EN TIEMPO REAL
    // ==========================================
    onSnapshot(coleccionClientes, (snapshot) => {
        let total = 0;
        let nuevos = 0;
        let contactados = 0;
        let calificados = 0;
        
        let clientesArray = []; // Para guardar y ordenar los últimos

        if (snapshot.empty) {
            recentTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">No hay clientes registrados.</td></tr>`;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            total++;

            // Contar por estados
            const estado = data.estado || 'Nuevo';
            if (estado === 'Nuevo') nuevos++;
            if (estado === 'Contactado') contactados++;
            if (estado === 'Calificado') calificados++;

            // Guardar para la tabla de recientes
            clientesArray.push({
                id: doc.id,
                ...data
            });
        });

        // Actualizar las tarjetas
        statTotal.textContent = total;
        statNuevos.textContent = nuevos;
        statContactados.textContent = contactados;
        statCalificados.textContent = calificados;

        // ==========================================
        // LLENAR LA TABLA DE RECIENTES
        // ==========================================
        if (clientesArray.length > 0) {
            // Ordenar por fecha de creación (si existe) o simplemente mostrar los últimos 5
            // (Firebase no ordena automáticamente si no usas query con orderBy, así que tomamos los últimos 5 del array)
            const recientes = clientesArray.slice(-5).reverse(); 
            
            recentTbody.innerHTML = '';
            recientes.forEach(cliente => {
                // Formatear estado para el badge
                let badgeClass = 'status-nuevo';
                if (cliente.estado === 'Contactado') badgeClass = 'status-contactado';
                if (cliente.estado === 'Calificado') badgeClass = 'status-calificado';

                // Formatear fecha (si existe)
                let fechaMostrar = 'Reciente';
                if (cliente.fechaCreacion) {
                    // Si es un timestamp de Firebase o un string de fecha
                    const fecha = cliente.fechaCreacion.toDate ? cliente.fechaCreacion.toDate() : new Date(cliente.fechaCreacion);
                    fechaMostrar = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${cliente.nombre || 'Sin nombre'}</strong></td>
                    <td><span class="status-badge ${badgeClass}">${cliente.estado || 'Nuevo'}</span></td>
                    <td class="${!cliente.propietario ? 'text-muted' : ''}">${cliente.propietario || 'Sin asignar'}</td>
                    <td class="text-muted">${fechaMostrar}</td>
                `;
                recentTbody.appendChild(tr);
            });
        }
    });
}