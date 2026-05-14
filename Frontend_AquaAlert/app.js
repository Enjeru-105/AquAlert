// Coordenadas GPS Reales de la ZMG [Latitud, Longitud]
const positions = {
    1: [20.649561, -103.400981], // Plaza del Sol
    2: [20.712735, -103.376070], // Plaza Patria
    3: [20.662155, -103.366960], // Paso Washington
    4: [20.632716, -103.350611]  // Zona Industrial
};

// Inicializar el mapa de Leaflet en Guadalajara
const map = L.map('mapa-gdl').setView([20.67, -103.37], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// Objeto para guardar los marcadores físicos del mapa
let markersLeaflet = {};

// Memoria global para guardar el último estado válido de cada sensor
// Esto evita que ThingSpeak borre alertas si envía un dato "null"
let memoriaSensores = {
    1: { nivel: 0, bandera: 0 },
    2: { nivel: 0, bandera: 0 },
    3: { nivel: 0, bandera: 0 },
    4: { nivel: 0, bandera: 0 }
};

// Función principal de consumo
async function fetchThingSpeakData() {
    try {
        // Pedimos los últimos 20 resultados en lugar de 1
        const response = await fetch('https://api.thingspeak.com/channels/3365151/feeds.json?api_key=VVEWULW97F5B6FL9&results=20');
        const json = await response.json();

        if (json.feeds && json.feeds.length > 0) {
            // Recorremos los 20 resultados, del más viejo al más nuevo.
            // Así nos aseguramos de atrapar el último dato válido de cada sensor,
            // llenando correctamente la memoria desde la primera carga.
            json.feeds.forEach(dato => {
                if (dato.field1 !== null) memoriaSensores[1].nivel = dato.field1;
                if (dato.field2 !== null) memoriaSensores[1].bandera = dato.field2;
                
                if (dato.field3 !== null) memoriaSensores[2].nivel = dato.field3;
                if (dato.field4 !== null) memoriaSensores[2].bandera = dato.field4;
                
                if (dato.field5 !== null) memoriaSensores[3].nivel = dato.field5;
                if (dato.field6 !== null) memoriaSensores[3].bandera = dato.field6;
                
                if (dato.field7 !== null) memoriaSensores[4].nivel = dato.field7;
                if (dato.field8 !== null) memoriaSensores[4].bandera = dato.field8;
            });

            // 3. MODIFICADO: Usamos los datos de la memoria en lugar de los crudos de ThingSpeak
            const sensores = [
                crearObjetoSensor(1, 'Plaza del Sol', memoriaSensores[1].nivel, memoriaSensores[1].bandera),
                crearObjetoSensor(2, 'Plaza Patria', memoriaSensores[2].nivel, memoriaSensores[2].bandera),
                crearObjetoSensor(3, 'Paso Washington', memoriaSensores[3].nivel, memoriaSensores[3].bandera),
                crearObjetoSensor(4, 'Zona Industrial', memoriaSensores[4].nivel, memoriaSensores[4].bandera)
            ];

            actualizarInterfaz(sensores);
        }
    } catch (error) {
        console.error("Error conectando a ThingSpeak:", error);
        document.getElementById('alerts-list').innerHTML = `<p class="loading-text" style="color: #ef4444;">Error de conexión.</p>`;
    }
}

function crearObjetoSensor(id, name, fieldNivel, fieldBandera) {
    // Multiplicamos por 10 para revertir la escala de tu maqueta.
    const nivel = (parseInt(fieldNivel) || 0) * 10;
    const hayAlerta = parseInt(fieldBandera) === 1;
    return {
        id: id,
        name: name,
        position: positions[id],
        level: nivel,
        alert: hayAlerta,
        status: hayAlerta ? 'INUNDADO' : 'SEGURO',
        message: hayAlerta ? 'Evite la zona' : 'Nivel normal'
    };
}

function actualizarInterfaz(sensores) {
    const alertsList = document.getElementById('alerts-list');
    alertsList.innerHTML = '';

    sensores.forEach(sensor => {
        const markerClass = sensor.alert ? 'marker-danger' : 'marker-safe';
        const cardClass = sensor.alert ? 'card-danger' : 'card-safe';
        const iconName = sensor.alert ? 'alert-triangle' : 'check-circle-2';

        // --- 1. LÓGICA DEL MAPA (LEAFLET) ---
        // Generamos el HTML de tu marcador de siempre
        const markerHTML = `
            <div class="map-marker ${markerClass}"
                 onmouseenter="mostrarTooltip('${sensor.name}', ${sensor.level}, '${sensor.status}', ${sensor.alert})"
                 onmouseleave="ocultarTooltip()">
                <i data-lucide="map-pin" class="marker-icon"></i>
                <div class="marker-dot"></div>
            </div>
        `;

        // Le decimos a Leaflet que use tu HTML personalizado como icono
        const customIcon = L.divIcon({
            html: markerHTML,
            className: '', // Quita el borde blanco por defecto de Leaflet
            iconSize: [40, 40],
            iconAnchor: [20, 40] // Ancla la "punta" del icono justo en la calle
        });

        // Si el marcador no existe en el mapa, lo creamos. Si ya existe, lo actualizamos.
        if (!markersLeaflet[sensor.id]) {
            markersLeaflet[sensor.id] = L.marker(sensor.position, {icon: customIcon}).addTo(map);
        } else {
            markersLeaflet[sensor.id].setIcon(customIcon);
        }

        // --- 2. LÓGICA DE LA LISTA LATERAL (Queda igual) ---
        const cardHTML = `
            <div class="sensor-card ${cardClass}">
                <h3>${sensor.name}</h3>
                <p>Nivel: ${sensor.level} cm</p>
                <div class="badge">
                    <i data-lucide="${iconName}" style="width: 16px; height: 16px;"></i>
                    ${sensor.status}
                </div>
                <p style="margin-top: 8px;">${sensor.message}</p>
            </div>
        `;
        alertsList.innerHTML += cardHTML;
    });

    // Renderizar los iconos SVG de Lucide
    lucide.createIcons();
}

// Control del Tooltip
function mostrarTooltip(nombre, nivel, estado, alerta) {
    const tt = document.getElementById('tooltip');
    document.getElementById('tt-name').innerText = nombre;
    document.getElementById('tt-level').innerText = `Nivel actual: ${nivel} cm`;
    
    const elStatus = document.getElementById('tt-status');
    elStatus.innerText = estado;
    elStatus.style.color = alerta ? 'var(--danger-border)' : 'var(--safe-border)';
    
    tt.classList.remove('hidden');
}

function ocultarTooltip() {
    document.getElementById('tooltip').classList.add('hidden');
}

// Inicialización
lucide.createIcons();
fetchThingSpeakData();
setInterval(fetchThingSpeakData, 15000);