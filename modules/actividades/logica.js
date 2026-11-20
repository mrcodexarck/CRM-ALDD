import { db, auth } from '../../firebase-config.js';
import { 
    collection, onSnapshot, addDoc, query, orderBy, serverTimestamp,
    doc, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function init() {
    const coleccionActividades = collection(db, "ACTIVIDADES");
    const coleccionClientes = collection(db, "CLIENTES");
    
    const tbody = document.getElementById('tabla-actividades');
    const modalActividad = document.getElementById('modal-actividad');
    const formActividad = document.getElementById('form-actividad');
    const btnCrearAct = document.getElementById('btn-crear-actividad');
    const btnCerrarModalAct = document.getElementById('btn-cerrar-modal-act');
    const btnCancelarAct = document.getElementById('btn-cancelar-act');

    // 🔥 Filtros de la interfaz (Ahora el estado es un solo Select)
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

    // 1. CARGAR CLIENTES
    onSnapshot(coleccionClientes, (snapshot) => {
        listaClientes = [];
        snapshot.forEach(doc => {
            const cliente = doc.data();
            listaClientes.push({ id: doc.id, nombre: cliente.nombre || 'Sin nombre' });
        });
    });

    // FUNCIÓN BUSCADOR
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

    // 2. MODAL
    const abrirModal = () => {
        formActividad.reset();
        if (inputContactoSearch) inputContactoSearch.value = ''; 
        if (inputContactoId) inputContactoId.value = '';
        if (inputNegocioSearch) inputNegocioSearch.value = ''; 
        if (inputNegocioId) inputNegocioId.value = '';
        
        const hoy = new Date().toISOString().split('T')[0];
        const inputFechaInicio = document.getElementById('act-fecha-inicio');
        const inputFechaFin = document.getElementById('act-fecha-fin');
        if (inputFechaInicio) inputFechaInicio.value = hoy;
        if (inputFechaFin) inputFechaFin.value = hoy;
        
        modalActividad.classList.add('active');
    };
    
    const cerrarModal = () => modalActividad.classList.remove('active');

    if (btnCrearAct) btnCrearAct.addEventListener('click', abrirModal);
    if (btnCerrarModalAct) btnCerrarModalAct.addEventListener('click', cerrarModal);
    if (btnCancelarAct) btnCancelarAct.addEventListener('click', cerrarModal);
    modalActividad.addEventListener('click', (e) => { if (e.target === modalActividad) cerrarModal(); });

    // 3. GUARDAR ACTIVIDAD
    formActividad.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!inputContactoId || !inputContactoId.value) {
            alert("Por favor, busca y selecciona un contacto válido de la lista.");
            if (inputContactoSearch) inputContactoSearch.focus();
            return;
        }

        const uidUsuarioActual = auth.currentUser ? auth.currentUser.uid : '';

        const nuevaActividad = {
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
            propietario: uidUsuarioActual, 
            colaboradores: document.getElementById('act-colaboradores')?.value || '',
            completada: document.getElementById('act-completada')?.checked || false,
            fechaCreacion: serverTimestamp() 
        };

        try {
            await addDoc(coleccionActividades, nuevaActividad);
            cerrarModal();
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Error al crear la actividad: " + error.message);
        }
    });

    // 4. CARGAR DATOS Y APLICAR FILTROS
    const q = query(coleccionActividades, orderBy("fechaCreacion", "desc"));
    onSnapshot(q, (snapshot) => {
        todasLasActividades = []; 
        snapshot.forEach(documento => {
            todasLasActividades.push({ id: documento.id, ...documento.data() });
        });
        aplicarFiltros(); 
    });

    // 🔥 5. LÓGICA DE FILTRADO (Leyendo el nuevo Desplegable)
    function aplicarFiltros() {
        const estadoSeleccionado = selectEstado ? selectEstado.value : 'Todos';
        const tipoSeleccionado = selectTipo ? selectTipo.value : 'Todos';

        const filtradas = todasLasActividades.filter(act => {
            // Filtro por Estado (Todos / Pendientes / Terminadas)
            if (estadoSeleccionado === 'Terminadas' && !act.completada) return false;
            if (estadoSeleccionado === 'Pendientes' && act.completada) return false;

            // Filtro por Tipo (Cita, Tarea, etc.)
            if (tipoSeleccionado !== 'Todos' && act.tipo !== tipoSeleccionado) {
                return false;
            }

            return true; 
        });

        dibujarTabla(filtradas);
    }

    // 6. DIBUJAR TABLA
    function dibujarTabla(actividadesAMostrar) {
        if (actividadesAMostrar.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 40px; color:#999;">
                <i class="fa-regular fa-folder-open" style="font-size: 30px; margin-bottom:10px;"></i><br>
                No hay actividades con estos filtros.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        
        actividadesAMostrar.forEach(act => {
            const id = act.id;
            const tr = document.createElement('tr');
            
            const estadoHTML = act.completada 
                ? '<span class="status-terminada"><i class="fa-solid fa-check-circle"></i> Terminada</span>' 
                : '<span class="status-pendiente"><i class="fa-solid fa-clock"></i> Pendiente</span>';

            tr.innerHTML = `
                <td>${estadoHTML}</td>
                <td><strong>${act.titulo}</strong><br><small style="color:#888">${act.descripcion || ''}</small></td>
                <td><span class="badge-etiqueta">${act.tipo}</span></td>
                <td>${act.contactoNombre || '-'}</td>
                <td>${auth.currentUser && act.propietario === auth.currentUser.uid ? (auth.currentUser.displayName || auth.currentUser.email) : act.propietario}</td>
                <td>${act.fechaFin} - ${act.horaFin}</td>
                <td>
                    <button class="btn-icon btn-toggle" data-id="${id}" title="${act.completada ? 'Marcar Pendiente' : 'Marcar Terminada'}">
                        <i class="fa-solid ${act.completada ? 'fa-rotate-left' : 'fa-check'}"></i>
                    </button>
                    <button class="btn-icon btn-delete" data-id="${id}" title="Eliminar">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 🔥 7. ESCUCHAR CAMBIOS EN LOS FILTROS Y BOTÓN CONSULTAR
    if (selectEstado) selectEstado.addEventListener('change', aplicarFiltros);
    if (selectTipo) selectTipo.addEventListener('change', aplicarFiltros);
    if (btnConsultar) btnConsultar.addEventListener('click', (e) => { e.preventDefault(); aplicarFiltros(); });

    // 8. ESCUCHAR CLICS EN LOS BOTONES DE ACCIÓN (Tabla)
    tbody.addEventListener('click', async (e) => {
        const btnToggle = e.target.closest('.btn-toggle');
        if (btnToggle) {
            const id = btnToggle.dataset.id;
            const act = todasLasActividades.find(a => a.id === id);
            
            try {
                const docRef = doc(db, "ACTIVIDADES", id);
                await updateDoc(docRef, { completada: !act.completada });
            } catch (error) {
                console.error("Error al actualizar estado:", error);
            }
            return;
        }

        const btnDelete = e.target.closest('.btn-delete');
        if (btnDelete) {
            const id = btnDelete.dataset.id;
            const act = todasLasActividades.find(a => a.id === id);
            
            if (confirm(`¿Eliminar la actividad "${act.titulo}"?`)) {
                try {
                    const docRef = doc(db, "ACTIVIDADES", id);
                    await deleteDoc(docRef);
                } catch (error) {
                    console.error("Error al eliminar:", error);
                }
            }
        }
    });
}