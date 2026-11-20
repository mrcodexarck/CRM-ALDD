import { db } from '../../firebase-config.js';
import { collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function init() {
    const coleccionClientes = collection(db, "CLIENTES");

    const columnas = {
        'Nuevo': document.getElementById('col-nuevo'),
        'Contactado': document.getElementById('col-contactado'),
        'Calificado': document.getElementById('col-calificado')
    };

    const contadores = {
        'Nuevo': document.getElementById('count-nuevo'),
        'Contactado': document.getElementById('count-contactado'),
        'Calificado': document.getElementById('count-calificado')
    };

    const panel360 = document.getElementById('panel-360');
    const panelOverlay = document.getElementById('panel-overlay');
    const panelNombre = document.getElementById('panel-nombre');
    const panelFecha = document.getElementById('panel-fecha');
    const panelPropietario = document.getElementById('panel-propietario');
    const panelSelectEtapa = document.getElementById('panel-select-etapa');
    const btnClosePanel = document.getElementById('btn-close-panel');
    const btnCerrarPanelFooter = document.getElementById('btn-cerrar-panel-footer');

    if (!columnas['Nuevo'] || !panel360) {
        console.warn("⚠️ Elementos del Pipeline no encontrados en el DOM.");
        return;
    }

    let clienteSeleccionadoId = null;
    let clientesData = {}; 

    // ==========================================
    // DRAG & DROP
    // ==========================================
    Object.values(columnas).forEach(columna => {
        if (!columna) return;
        const columnaPadre = columna.closest('.kanban-column');
        
        columnaPadre.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            columnaPadre.style.backgroundColor = 'rgba(59, 29, 112, 0.05)';
        });

        columnaPadre.addEventListener('dragleave', () => {
            columnaPadre.style.backgroundColor = ''; 
        });

        columnaPadre.addEventListener('drop', async (e) => {
            e.preventDefault();
            columnaPadre.style.backgroundColor = '';
            
            const clienteId = e.dataTransfer.getData('text/plain');
            const nuevoEstado = columnaPadre.getAttribute('data-status');

            if (!clienteId || !nuevoEstado) return;

            try {
                const clienteRef = doc(db, "CLIENTES", clienteId);
                await updateDoc(clienteRef, { estado: nuevoEstado });
            } catch (error) {
                console.error("Error al mover la tarjeta:", error);
                alert("No se pudo mover el cliente. Revisa la consola.");
            }
        });
    });

    // ==========================================
    // RENDERIZAR KANBAN (CON DEBUG)
    // ==========================================
    onSnapshot(coleccionClientes, (snapshot) => {
        console.log(`📦 Firestore dice: Encontré ${snapshot.size} clientes en total.`);

        // Limpiar columnas y contadores
        Object.values(columnas).forEach(col => { if (col) col.innerHTML = ''; });
        Object.values(contadores).forEach(cnt => { if (cnt) cnt.textContent = '0'; });

        clientesData = {}; 
        let contadorDeErrores = 0;

        snapshot.forEach(doc => {
            const cliente = doc.data();
            const id = doc.id;
            clientesData[id] = cliente;

            // Normalizar el estado para evitar fallos por mayúsculas/minúsculas
            let estadoRaw = cliente.estado || 'Nuevo';
            let estado = 'Nuevo'; // Por defecto
            
            if (estadoRaw.toLowerCase() === 'contactado') estado = 'Contactado';
            if (estadoRaw.toLowerCase() === 'calificado') estado = 'Calificado';

            const columnaDestino = columnas[estado];

            if (columnaDestino) {
                if (contadores[estado]) {
                    let count = parseInt(contadores[estado].textContent) || 0;
                    contadores[estado].textContent = count + 1;
                }

                const card = document.createElement('div');
                card.className = 'kanban-card';
                card.draggable = true;
                card.dataset.id = id;

                // Si no tiene nombre, le ponemos uno por defecto
                const nombreMostrar = cliente.nombre || 'Cliente sin nombre';

                card.innerHTML = `
                    <h4 style="margin: 0 0 5px 0; font-size: 14px;">${nombreMostrar}</h4>
                    <p style="margin: 0; font-size: 12px; color: #888;">
                        <i class="fa-solid fa-envelope"></i> ${cliente.email || 'Sin email'}
                    </p>
                `;

                card.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', id);
                    card.style.opacity = '0.5';
                });

                card.addEventListener('dragend', () => {
                    card.style.opacity = '1';
                });

                card.addEventListener('click', () => {
                    abrirPanel360(id);
                });

                columnaDestino.appendChild(card);
            } else {
                contadorDeErrores++;
                console.warn(`⚠️ El cliente "${cliente.nombre}" tiene un estado desconocido: "${cliente.estado}". No se pudo dibujar.`);
            }
        });

        if (contadorDeErrores > 0) {
            console.warn(`Hubo ${contadorDeErrores} clientes que no se dibujaron por tener un estado inválido.`);
        }
    }, (error) => {
        console.error("❌ ERROR DE PERMISOS EN FIRESTORE:", error);
    });

    // ==========================================
    // PANEL LATERAL 360
    // ==========================================
    function abrirPanel360(id) {
        const cliente = clientesData[id];
        if (!cliente) return;

        clienteSeleccionadoId = id;

        panelNombre.textContent = cliente.nombre || 'Sin nombre';
        
        if (cliente.fechaCreacion) {
            const fecha = cliente.fechaCreacion.toDate ? cliente.fechaCreacion.toDate() : new Date(cliente.fechaCreacion);
            panelFecha.textContent = `Creado el: ${fecha.toLocaleDateString()}`;
        } else {
            panelFecha.textContent = 'Creado recientemente';
        }

        panelPropietario.textContent = cliente.propietario || 'No asignado';
        
        if (panelSelectEtapa) {
            // Normalizar el select
            let estadoPanel = 'Nuevo';
            if (cliente.estado && cliente.estado.toLowerCase() === 'contactado') estadoPanel = 'Contactado';
            if (cliente.estado && cliente.estado.toLowerCase() === 'calificado') estadoPanel = 'Calificado';
            panelSelectEtapa.value = estadoPanel;
        }

        panel360.classList.add('active');
        panelOverlay.classList.add('active');
    }

    function cerrarPanel360() {
        panel360.classList.remove('active');
        panelOverlay.classList.remove('active');
        clienteSeleccionadoId = null;
    }

    if (btnClosePanel) btnClosePanel.addEventListener('click', cerrarPanel360);
    if (btnCerrarPanelFooter) btnCerrarPanelFooter.addEventListener('click', cerrarPanel360);
    if (panelOverlay) panelOverlay.addEventListener('click', cerrarPanel360);

    if (panelSelectEtapa) {
        panelSelectEtapa.addEventListener('change', async (e) => {
            if (!clienteSeleccionadoId) return;
            const nuevoEstado = e.target.value;
            try {
                const clienteRef = doc(db, "CLIENTES", clienteSeleccionadoId);
                await updateDoc(clienteRef, { estado: nuevoEstado });
            } catch (error) {
                console.error("Error al actualizar estado:", error);
            }
        });
    }
}