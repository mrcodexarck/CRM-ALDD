import { db } from '../../firebase-config.js';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function init() {
    const tbody = document.getElementById('clientes-tbody');
    const coleccionClientes = collection(db, "CLIENTES");

    // Referencias al DOM
    const btnCrear = document.getElementById('btn-crear');
    const modal = document.getElementById('modal-cliente');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    const btnCancelar = document.getElementById('btn-cancelar');
    const formCliente = document.getElementById('form-cliente');
    const modalTitle = document.getElementById('modal-title'); 
    const btnGuardar = document.getElementById('btn-guardar');
    
    // Inputs
    const inputNombre = document.getElementById('input-nombre');
    const inputEmail = document.getElementById('input-email');
    const inputTelefono = document.getElementById('input-telefono');
    const inputPropietario = document.getElementById('input-propietario');
    const inputEstado = document.getElementById('input-estado');
    const searchInput = document.getElementById('search-input');
    const errorMessageDiv = document.getElementById('modal-error-message');

    // Variables de estado
    let clienteEditandoId = null; 
    let clientesMap = new Map(); // Guarda los datos en memoria para no consultar la BD al editar

    // 1. Escuchar datos en tiempo real
    onSnapshot(coleccionClientes, (snapshot) => {
        tbody.innerHTML = ''; 
        clientesMap.clear();

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 20px;">No hay clientes. Haz clic en "Crear".</td></tr>`;
            return;
        }
        
        snapshot.forEach((docSnap) => {
            const cliente = docSnap.data();
            const idCliente = docSnap.id;
            
            // Guardamos los datos en el mapa
            clientesMap.set(idCliente, cliente);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox"></td>
                <td><strong>${cliente.nombre || 'Sin nombre'}</strong></td>
                <td><span class="badge badge-nuevo">${cliente.estado || 'Nuevo'}</span></td>
                <td class="${!cliente.propietario ? 'text-muted' : ''}">${cliente.propietario || '- Ház clic para añadir -'}</td>
                <td class="${!cliente.email ? 'text-muted' : ''}">${cliente.email || '- Ház clic para añadir -'}</td>
                <td class="${!cliente.telefono ? 'text-muted' : ''}">${cliente.telefono || '- Ház clic para añadir -'}</td>
                <td><span class="badge-etiqueta">Cliente</span></td>
                <td class="text-muted">Hoy</td>
                <td>
                    <div class="actions-container">
                        <button class="btn-actions" title="Opciones">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                        <div class="dropdown-menu">
                            <button class="dropdown-item btn-ver" data-id="${idCliente}">
                                <i class="fa-solid fa-eye"></i> Ver detalles
                            </button>
                            <button class="dropdown-item btn-editar" data-id="${idCliente}">
                                <i class="fa-solid fa-pen"></i> Editar
                            </button>
                            <button class="dropdown-item btn-eliminar" data-id="${idCliente}">
                                <i class="fa-solid fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });

    // 2. LÓGICA DEL MENÚ DE ACCIONES
    tbody.addEventListener('click', async (e) => {
        const actionBtn = e.target.closest('.btn-actions');
        
        if (actionBtn) {
            e.preventDefault();
            e.stopPropagation();
            const menu = actionBtn.nextElementSibling;
            
            document.querySelectorAll('.dropdown-menu.active').forEach(m => m.classList.remove('active'));
            if (menu.classList.contains('active')) {
                menu.classList.remove('active');
                return;
            }

            const rect = actionBtn.getBoundingClientRect();
            menu.style.top = `${rect.bottom + 5}px`;
            menu.style.left = `${rect.right - 160}px`; 
            menu.classList.add('active');
            return;
        }

        const dropdownItem = e.target.closest('.dropdown-item');
        if (dropdownItem) {
            const id = dropdownItem.dataset.id;
            
            if (dropdownItem.classList.contains('btn-ver')) {
                alert(`Ver detalles del cliente: ${id}`);
            } 
            else if (dropdownItem.classList.contains('btn-editar')) {
                // --- LÓGICA DE EDICIÓN ---
                const cliente = clientesMap.get(id);
                if (cliente) {
                    // Rellenar los inputs
                    inputNombre.value = cliente.nombre || '';
                    inputEmail.value = cliente.email || '';
                    inputTelefono.value = cliente.telefono || '';
                    inputPropietario.value = cliente.propietario || '';
                    inputEstado.value = cliente.estado || 'Nuevo';

                    // Cambiar textos del modal para avisar que estamos editando
                    clienteEditandoId = id;
                    modalTitle.textContent = 'Editar Posible Cliente';
                    btnGuardar.textContent = 'Actualizar Cliente';

                    // Mostrar el modal
                    modal.classList.add('active');
                }
            } 
            else if (dropdownItem.classList.contains('btn-eliminar')) {
                if (confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
                    try {
                        await deleteDoc(doc(db, "CLIENTES", id));
                    } catch (error) {
                        console.error("Error al eliminar:", error);
                        alert("No se pudo eliminar.");
                    }
                }
            }
            dropdownItem.closest('.dropdown-menu').classList.remove('active');
        }
    });

    // Cerrar menús
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.actions-container')) {
            document.querySelectorAll('.dropdown-menu.active').forEach(menu => menu.classList.remove('active'));
        }
    });
    window.addEventListener('scroll', () => {
        document.querySelectorAll('.dropdown-menu.active').forEach(menu => menu.classList.remove('active'));
    }, true);

    // 3. Lógica del Botón "Crear" (Para que vuelva a modo creación)
    btnCrear.addEventListener('click', () => {
        clienteEditandoId = null; // Limpiamos la variable
        modalTitle.textContent = 'Nuevo Posible Cliente'; // Título original
        btnGuardar.textContent = 'Guardar Cliente'; // Texto original
        formCliente.reset();
        errorMessageDiv.style.display = 'none';
        modal.classList.add('active');
    });
    
    // 4. Cerrar el Modal
    const cerrarModal = () => {
        modal.classList.remove('active');
        formCliente.reset();
        clienteEditandoId = null;
        errorMessageDiv.style.display = 'none';
    };

    btnCerrarModal.addEventListener('click', cerrarModal);
    btnCancelar.addEventListener('click', cerrarModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });

    // 5. GUARDAR DATOS (Detecta si es Nuevo o si es Edición)
    formCliente.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessageDiv.style.display = 'none';

        const datosFormulario = {
            nombre: inputNombre.value,
            email: inputEmail.value,
            telefono: inputTelefono.value,
            propietario: inputPropietario.value,
            estado: inputEstado.value,
        };

        try {
            if (clienteEditandoId) {
                // MODO EDICIÓN: Actualiza el documento existente
                const docRef = doc(db, "CLIENTES", clienteEditandoId);
                await updateDoc(docRef, datosFormulario);
            } else {
                // MODO CREACIÓN: Crea un documento nuevo
                await addDoc(coleccionClientes, {
                    ...datosFormulario,
                    etiquetas: ['Cliente'],
                    ultimaActividad: 'Justo ahora',
                    fechaCreacion: new Date()
                });
            }
            cerrarModal(); 
        } catch (error) {
            console.error("Error al guardar: ", error);
            errorMessageDiv.textContent = `Error al guardar: ${error.message}`;
            errorMessageDiv.style.display = 'block';
        }
    });

    // 6. Buscador
    searchInput.addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase();
        tbody.querySelectorAll('tr').forEach(fila => {
            fila.style.display = fila.textContent.toLowerCase().includes(termino) ? '' : 'none';
        });
    });
}