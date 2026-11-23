import { confirmarEliminacion } from '../../app.js';
import { db } from '../../firebase-config.js';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function init() {
    const tbody = document.getElementById('clientes-tbody');
    const coleccionClientes = collection(db, "CLIENTES");

    // ==========================================
    // REFERENCIAS AL DOM (MODAL CREAR / EDITAR)
    // ==========================================
    const btnCrear = document.getElementById('btn-crear');
    const modal = document.getElementById('modal-cliente');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    const btnCancelar = document.getElementById('btn-cancelar');
    const formCliente = document.getElementById('form-cliente');
    const modalTitle = document.getElementById('modal-title'); 
    const btnGuardar = document.getElementById('btn-guardar');
    
    // Inputs del formulario
    const inputNombre = document.getElementById('input-nombre');
    const inputEmail = document.getElementById('input-email');
    const inputTelefono = document.getElementById('input-telefono');
    const inputPropietario = document.getElementById('input-propietario');
    const inputEstado = document.getElementById('input-estado');
    const searchInput = document.getElementById('search-input');
    const errorMessageDiv = document.getElementById('modal-error-message');

    // ==========================================
    // REFERENCIAS AL DOM (MODAL VER DETALLES)
    // ==========================================
    const modalVer = document.getElementById('modal-ver-cliente');
    const btnCerrarVer = document.getElementById('btn-cerrar-ver');
    const btnCerrarVerFooter = document.getElementById('btn-cerrar-ver-footer');
    
    // Spans de texto del modal Ver
    const viewNombre = document.getElementById('view-nombre');
    const viewEmail = document.getElementById('view-email');
    const viewTelefono = document.getElementById('view-telefono');
    const viewPropietario = document.getElementById('view-propietario');
    const viewEstado = document.getElementById('view-estado');

    // ==========================================
    // REFERENCIAS AL DOM (MODAL ELIMINAR)
    // ==========================================
    const modalEliminar = document.getElementById('modal-eliminar-cliente');
    const btnCancelarEliminar = document.getElementById('btn-cancelar-eliminar');
    const btnConfirmarEliminar = document.getElementById('btn-confirmar-eliminar');

    // Variables de estado
    let clienteEditandoId = null; 
    let clientesMap = new Map(); // Guarda los datos en memoria
    let clienteAEliminarId = null; // Guarda el ID a eliminar

    // ==========================================
    // 1. ESCUCHAR DATOS EN TIEMPO REAL (TABLA)
    // ==========================================
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
            
            // Guardamos los datos en el mapa para acceso rápido
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

    // ==========================================
    // 2. LÓGICA DEL MENÚ DE ACCIONES (3 PUNTITOS)
    // ==========================================
    tbody.addEventListener('click', async (e) => {
        const actionBtn = e.target.closest('.btn-actions');
        
        // Abrir/Cerrar el menú
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

        // Detectar clic en una opción del menú
        const dropdownItem = e.target.closest('.dropdown-item');
        if (dropdownItem) {
            const id = dropdownItem.dataset.id;
            
            // --- ACCIÓN: VER DETALLES ---
            if (dropdownItem.classList.contains('btn-ver')) {
                const cliente = clientesMap.get(id);
                if (cliente) {
                    viewNombre.textContent = cliente.nombre || 'No registrado';
                    viewEmail.textContent = cliente.email || 'No registrado';
                    viewTelefono.textContent = cliente.telefono || 'No registrado';
                    viewPropietario.textContent = cliente.propietario || 'No registrado';
                    viewEstado.textContent = cliente.estado || 'Nuevo';
                    modalVer.classList.add('active');
                }
            } 
            // --- ACCIÓN: EDITAR ---
            else if (dropdownItem.classList.contains('btn-editar')) {
                const cliente = clientesMap.get(id);
                if (cliente) {
                    inputNombre.value = cliente.nombre || '';
                    inputEmail.value = cliente.email || '';
                    inputTelefono.value = cliente.telefono || '';
                    inputPropietario.value = cliente.propietario || '';
                    inputEstado.value = cliente.estado || 'Nuevo';

                    clienteEditandoId = id;
                    modalTitle.textContent = 'Editar Posible Cliente';
                    btnGuardar.textContent = 'Actualizar Cliente';
                    modal.classList.add('active');
                }
            } 
            // --- ACCIÓN: ELIMINAR ---
            else if (dropdownItem.classList.contains('btn-eliminar')) {
                // Guardamos el ID y abrimos el modal bonito
                clienteAEliminarId = id;
                modalEliminar.classList.add('active');
            }
            
            // Cerrar el menú después de hacer clic
            dropdownItem.closest('.dropdown-menu').classList.remove('active');
        }
    });

    // Cerrar menús al hacer clic fuera o hacer scroll
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.actions-container')) {
            document.querySelectorAll('.dropdown-menu.active').forEach(menu => menu.classList.remove('active'));
        }
    });
    window.addEventListener('scroll', () => {
        document.querySelectorAll('.dropdown-menu.active').forEach(menu => menu.classList.remove('active'));
    }, true);

    // ==========================================
    // 3. LÓGICA DE LOS MODALES
    // ==========================================
    
    // --- Modal Crear/Editar ---
    btnCrear.addEventListener('click', () => {
        clienteEditandoId = null;
        modalTitle.textContent = 'Nuevo Posible Cliente';
        btnGuardar.textContent = 'Guardar Cliente';
        formCliente.reset();
        errorMessageDiv.style.display = 'none';
        modal.classList.add('active');
    });
    
    const cerrarModal = () => {
        modal.classList.remove('active');
        formCliente.reset();
        clienteEditandoId = null;
        errorMessageDiv.style.display = 'none';
    };

    btnCerrarModal.addEventListener('click', cerrarModal);
    btnCancelar.addEventListener('click', cerrarModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });

    // --- Modal Ver Detalles ---
    const cerrarModalVer = () => modalVer.classList.remove('active');

    btnCerrarVer.addEventListener('click', cerrarModalVer);
    btnCerrarVerFooter.addEventListener('click', cerrarModalVer);
    modalVer.addEventListener('click', (e) => { if (e.target === modalVer) cerrarModalVer(); });

    // --- Modal Eliminar ---
    const cerrarModalEliminar = () => {
        modalEliminar.classList.remove('active');
        clienteAEliminarId = null;
    };

    btnCancelarEliminar.addEventListener('click', cerrarModalEliminar);
    modalEliminar.addEventListener('click', (e) => { if (e.target === modalEliminar) cerrarModalEliminar(); });

    btnConfirmarEliminar.addEventListener('click', async () => {
        if (clienteAEliminarId) {
            try {
                await deleteDoc(doc(db, "CLIENTES", clienteAEliminarId));
                cerrarModalEliminar();
            } catch (error) {
                console.error("Error al eliminar:", error);
                alert("No se pudo eliminar el cliente.");
                cerrarModalEliminar();
            }
        }
    });

    // ==========================================
    // 4. GUARDAR DATOS (CREAR O ACTUALIZAR)
    // ==========================================
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
                const docRef = doc(db, "CLIENTES", clienteEditandoId);
                await updateDoc(docRef, datosFormulario);
            } else {
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

    // ==========================================
    // 5. BUSCADOR EN VIVO
    // ==========================================
    searchInput.addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase();
        tbody.querySelectorAll('tr').forEach(fila => {
            fila.style.display = fila.textContent.toLowerCase().includes(termino) ? '' : 'none';
        });
    });
}