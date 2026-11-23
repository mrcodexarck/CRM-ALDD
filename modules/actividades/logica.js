import { db, auth } from '../../firebase-config.js';
import { 
    collection, onSnapshot, addDoc, query, orderBy, serverTimestamp,
    doc, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔥 Importamos la función del modal global
import { confirmarEliminacion } from '../../app.js';

export function init() {
    const coleccionActividades = collection(db, "ACTIVIDADES");
    const coleccionClientes = collection(db, "CLIENTES");
    
    const tbody = document.getElementById('tabla-actividades');
    
    const modalActividad = document.getElementById('modal-actividad');
    const modalTitulo = document.getElementById('modal-titulo');
    const inputActId = document.getElementById('act-id'); // Input oculto para editar
    
    const formActividad = document.getElementById('form-actividad');
    const btnCrearAct = document.getElementById('btn-crear-actividad');
    const btnCerrarModalAct = document.getElementById('btn-cerrar-modal-act');
    const btnCancelarAct = document.getElementById('btn-cancelar-act');

    const selectEstado = document.getElementById('filtro-estado');
    const selectTipo = document.getElementById('filtro-tipo'); 
    const btnConsultar = document.getElementById('btn-consultar');

    const inputContactoSearch = document.getElementById('act-contacto-search');
    const inputContactoId = document.getElementById('act-contacto');
    const dropdownContacto = document.getElementById('dropdown-contacto');

    const inputNegocioSearch = document.getElementById('act-negocio-search');
    const inputNegocioId = document.getElementById('act-negocio');
    const dropdownNegocio = document.getElementById('dropdown-negocio');

    let listaClientes = []; 
    let todasLasActividades = []; 

    onSnapshot(coleccionClientes, (snapshot) => {
        listaClientes = [];
        snapshot.forEach(doc => {
            listaClientes.push({ id: doc.id, nombre: doc.data().nombre || 'Sin nombre' });
        });
    });

    function renderizarOpciones(datos, dropdown, inputSearch, inputId, filtro = '') {
        if (!dropdown) return;
        dropdown.innerHTML = '';
        const filtrados = datos.filter(c => c.nombre.toLowerCase().includes(filtro.toLowerCase()));

        if (filtrados.length === 0) {
            dropdown.innerHTML = '<div class="custom-option no-results">No se encontraron resultados</div>';
            return;
        }

        filtrados.forEach(cliente => {
            const div = document.createElement('div');
            div.className = 'custom-option';
            div.textContent = cliente.nombre;
            div.dataset.id = cliente.id;
            
            div.addEventListener('click', () => {
                if (inputSearch) inputSearch.value = cliente.nombre; 
                if (inputId) inputId.value = cliente.id;         
                dropdown.classList.remove('active'); 
            });
            
            dropdown.appendChild(div);
        });
    }

    function configurarBuscador(inputSearch, inputId, dropdown) {
        if (!inputSearch || !inputId || !dropdown) return;

        inputSearch.addEventListener('input', (e) => {
            const valor = e.target.value.trim();
            if (valor === '') {
                inputId.value = '';
                dropdown.classList.remove('active');
                return;
            }
            renderizarOpciones(listaClientes, dropdown, inputSearch, inputId, valor);
            dropdown.classList.add('active');
        });

        document.addEventListener('click', (e) => {
            if (!inputSearch.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }

    configurarBuscador(inputContactoSearch, inputContactoId, dropdownContacto);
    configurarBuscador(inputNegocioSearch, inputNegocioId, dropdownNegocio);

    // MANEJO DEL MODAL DE CREAR/EDITAR
    const abrirModal = (editando = false) => {
        if (!editando) {
            formActividad.reset();
            inputActId.value = ''; // Limpiar ID
            modalTitulo.textContent = 'Crear actividad';
            if (inputContactoSearch) inputContactoSearch.value = ''; 
            if (inputContactoId) inputContactoId.value = '';
            if (inputNegocioSearch) inputNegocioSearch.value = ''; 
            if (inputNegocioId) inputNegocioId.value = '';
            
            const hoy = new Date().toISOString().split('T')[0];
            document.getElementById('act-fecha-inicio').value = hoy;
            document.getElementById('act-fecha-fin').value = hoy;
        }
        modalActividad.classList.add('active');
    };
    
    const cerrarModal = () => modalActividad.classList.remove('active');

    if (btnCrearAct) btnCrearAct.addEventListener('click', () => abrirModal(false));
    if (btnCerrarModalAct) btnCerrarModalAct.addEventListener('click', cerrarModal);
    if (btnCancelarAct) btnCancelarAct.addEventListener('click', cerrarModal);
    modalActividad.addEventListener('click', (e) => { if (e.target === modalActividad) cerrarModal(); });

    // GUARDAR O EDITAR ACTIVIDAD
    formActividad.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!inputContactoId || !inputContactoId.value) {
            alert("Por favor, busca y selecciona un contacto válido de la lista.");
            if (inputContactoSearch) inputContactoSearch.focus();
            return;
        }

        const uidUsuarioActual = auth.currentUser ? auth.currentUser.uid : '';
        const esEdicion = inputActId.value !== '';

        const datosActividad = {
            contactoId: inputContactoId.value,
            contactoNombre: inputContactoSearch ? inputContactoSearch.value : '', 
            negocioId: inputNegocioId ? inputNegocioId.value : '',
            negocioNombre: inputNegocioSearch ? inputNegocioSearch.value : '',
            tipo: document.getElementById('act-tipo')?.value || 'Tarea',
            titulo: document.getElementById('act-titulo')?.value || 'Sin título',
            descripcion: document.getElementById('act-descripcion')?.value || '',
            fechaInicio: document.getElementById('act-fecha-inicio')?.value || '',
            horaInicio: document.getElementById('act-hora-inicio')?.value || '',
            fechaFin: document.getElementById('act-fecha-fin')?.value || '',
            horaFin: document.getElementById('act-hora-fin')?.value || '',
            colaboradores: document.getElementById('act-colaboradores')?.value || '',
            completada: document.getElementById('act-completada')?.checked || false
        };

        try {
            if (esEdicion) {
                // Si estamos editando, solo actualizamos los campos
                const docRef = doc(db, "ACTIVIDADES", inputActId.value);
                await updateDoc(docRef, datosActividad);
            } else {
                // Si es nueva, añadimos propietario y fecha
                datosActividad.propietario = uidUsuarioActual;
                datosActividad.fechaCreacion = serverTimestamp();
                await addDoc(coleccionActividades, datosActividad);
            }
            cerrarModal();
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Error al guardar la actividad: " + error.message);
        }
    });

    // CARGAR DATOS
    const q = query(coleccionActividades, orderBy("fechaCreacion", "desc"));
    onSnapshot(q, (snapshot) => {
        todasLasActividades = []; 
        snapshot.forEach(documento => {
            todasLasActividades.push({ id: documento.id, ...documento.data() });
        });
        aplicarFiltros(); 
    });

    function aplicarFiltros() {
        const estadoSeleccionado = selectEstado ? selectEstado.value : 'Todos';
        const tipoSeleccionado = selectTipo ? selectTipo.value : 'Todos';

        const filtradas = todasLasActividades.filter(act => {
            if (estadoSeleccionado === 'Terminadas' && !act.completada) return false;
            if (estadoSeleccionado === 'Pendientes' && act.completada) return false;
            if (tipoSeleccionado !== 'Todos' && act.tipo !== tipoSeleccionado) return false;
            return true; 
        });

        dibujarTabla(filtradas);
    }

    // DIBUJAR TABLA
    function dibujarTabla(actividadesAMostrar) {
        if (actividadesAMostrar.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px; color:#999;">
                <i class="fa-regular fa-folder-open" style="font-size: 30px; margin-bottom:10px;"></i><br>
                No hay actividades con estos filtros.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        
        actividadesAMostrar.forEach(act => {
            const id = act.id;
            
            // Fila Principal
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="expand-btn" data-id="${id}" style="cursor:pointer; text-align:center; color: #3b1d70;">
                    <i class="fa-solid fa-chevron-right" id="icon-${id}" style="transition: transform 0.2s;"></i>
                </td>
                <td>
                    <select class="status-select ${act.completada ? 'status-terminada' : 'status-pendiente'}" data-id="${id}">
                        <option value="Pendiente" ${!act.completada ? 'selected' : ''}>Pendiente</option>
                        <option value="Terminada" ${act.completada ? 'selected' : ''}>Terminada</option>
                    </select>
                </td>
                <td><strong>${act.titulo}</strong><br><small style="color:#888">${act.descripcion || ''}</small></td>
                <td><span class="badge-etiqueta">${act.tipo}</span></td>
                <td>${act.contactoNombre || '-'}</td>
                <td>${auth.currentUser && act.propietario === auth.currentUser.uid ? (auth.currentUser.displayName || auth.currentUser.email) : act.propietario}</td>
                <td>${act.fechaFin} - ${act.horaFin}</td>
                <td>
                    <button class="btn-icon btn-edit" data-id="${id}" title="Editar">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon btn-delete" data-id="${id}" title="Eliminar" style="color: #e74c3c;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);

            // 🔥 Fila de Detalles (Trazabilidad) - Oculta por defecto
            const trDetails = document.createElement('tr');
            trDetails.id = `details-${id}`;
            trDetails.style.display = 'none';
            
            // Formatear fecha de creación
            let fechaTexto = 'Desconocida';
            if (act.fechaCreacion && act.fechaCreacion.toDate) {
                fechaTexto = act.fechaCreacion.toDate().toLocaleString();
            }

            trDetails.innerHTML = `
                <td colspan="8" style="background-color: #f9f9f9; padding: 15px; border-left: 3px solid #3b1d70;">
                    <div style="font-size: 13px; color: #555; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div><strong>Detalles de Trazabilidad:</strong>
                            <ul style="margin-top: 5px; padding-left: 20px;">
                                <li><strong>Creado el:</strong> ${fechaTexto}</li>
                                <li><strong>Contacto ID:</strong> ${act.contactoId}</li>
                                <li><strong>Negocio Asociado:</strong> ${act.negocioNombre || 'Ninguno'}</li>
                                <li><strong>Colaboradores:</strong> ${act.colaboradores || 'Ninguno'}</li>
                            </ul>
                        </div>
                        <div>
                            <strong>Historial de Movimientos (Simulado):</strong>
                            <p style="margin-top: 5px; font-style: italic; color: #888;">Aquí se mostrará la línea de tiempo de cambios de esta actividad.</p>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(trDetails);
        });
    }

    if (selectEstado) selectEstado.addEventListener('change', aplicarFiltros);
    if (selectTipo) selectTipo.addEventListener('change', aplicarFiltros);
    if (btnConsultar) btnConsultar.addEventListener('click', (e) => { e.preventDefault(); aplicarFiltros(); });

    // EVENTOS DE LA TABLA
    tbody.addEventListener('click', async (e) => {
        
        // 1. EXPANDIR DETALLES
        const btnExpand = e.target.closest('.expand-btn');
        if (btnExpand) {
            const id = btnExpand.dataset.id;
            const detailsRow = document.getElementById(`details-${id}`);
            const icon = document.getElementById(`icon-${id}`);
            
            if (detailsRow.style.display === 'none') {
                detailsRow.style.display = 'table-row';
                icon.style.transform = 'rotate(90deg)';
            } else {
                detailsRow.style.display = 'none';
                icon.style.transform = 'rotate(0deg)';
            }
            return;
        }

        // 2. EDITAR ACTIVIDAD
        const btnEdit = e.target.closest('.btn-edit');
        if (btnEdit) {
            const id = btnEdit.dataset.id;
            const act = todasLasActividades.find(a => a.id === id);
            
            if (act) {
                // Rellenar el formulario
                inputActId.value = act.id;
                document.getElementById('act-titulo').value = act.titulo || '';
                document.getElementById('act-descripcion').value = act.descripcion || '';
                document.getElementById('act-tipo').value = act.tipo || 'Cita';
                document.getElementById('act-fecha-inicio').value = act.fechaInicio || '';
                document.getElementById('act-hora-inicio').value = act.horaInicio || '';
                document.getElementById('act-fecha-fin').value = act.fechaFin || '';
                document.getElementById('act-hora-fin').value = act.horaFin || '';
                document.getElementById('act-colaboradores').value = act.colaboradores || '';
                document.getElementById('act-completada').checked = act.completada || false;
                
                // Buscadores
                inputContactoId.value = act.contactoId;
                inputContactoSearch.value = act.contactoNombre || '';
                inputNegocioId.value = act.negocioId || '';
                inputNegocioSearch.value = act.negocioNombre || '';

                modalTitulo.textContent = 'Editar actividad';
                modalActividad.classList.add('active');
            }
            return;
        }

        // 3. ELIMINAR (Usando el modal global)
        const btnDelete = e.target.closest('.btn-delete');
        if (btnDelete) {
            const id = btnDelete.dataset.id;
            const act = todasLasActividades.find(a => a.id === id);
            
            // Llamamos a la función global que creamos en app.js
            const confirmado = await confirmarEliminacion(
                `¿Estás seguro de que deseas eliminar la actividad <strong>"${act.titulo}"</strong>?`,
                "Eliminar Actividad"
            );
            
            if (confirmado) {
                try {
                    await deleteDoc(doc(db, "ACTIVIDADES", id));
                } catch (error) {
                    console.error("Error al eliminar:", error);
                    alert("Hubo un error al eliminar la actividad.");
                }
            }
        }
    });

    // 4. CAMBIAR ESTADO DESDE EL SELECT DE LA TABLA
    tbody.addEventListener('change', async (e) => {
        if (e.target.classList.contains('status-select')) {
            const id = e.target.dataset.id;
            const nuevoEstado = e.target.value === 'Terminada';
            
            // Actualizamos la clase para que cambie de color inmediatamente
            if (nuevoEstado) {
                e.target.classList.remove('status-pendiente');
                e.target.classList.add('status-terminada');
            } else {
                e.target.classList.remove('status-terminada');
                e.target.classList.add('status-pendiente');
            }

            try {
                const docRef = doc(db, "ACTIVIDADES", id);
                await updateDoc(docRef, { completada: nuevoEstado });
            } catch (error) {
                console.error("Error al actualizar estado:", error);
                alert("No se pudo cambiar el estado.");
            }
        }
    });
}