// Coordenadas aproximadas para los pines en el iframe
const positions = {
    1: { x: 38, y: 65 }, // Plaza del Sol
    2: { x: 30, y: 35 }, // Plaza Patria
    3: { x: 60, y: 55 }, // Paso Washington
    4: { x: 65, y: 75 }  // Zona Industrial
};

// Función principal de consumo
async function fetchThingSpeakData() {
    try {
        const response = await fetch('https://api.thingspeak.com/channels/3365151/feeds.json?results=1');
        const json = await response.json();

        if (json.feeds && json.feeds.length > 0) {
            const ultimoDato = json.feeds[0];

            const sensores = [
                crearObjetoSensor(1, 'Plaza del Sol', ultimoDato.field1, ultimoDato.field2),
                crearObjetoSensor(2, 'Plaza Patria', ultimoDato.field3, ultimoDato.field4),
                crearObjetoSensor(3, 'Paso Washington', ultimoDato.field5, ultimoDato.field6),
                crearObjetoSensor(4, 'Zona Industrial', ultimoDato.field7, ultimoDato.field8)
            ];

            actualizarInterfaz(sensores);
        }
    } catch (error) {
        console.error("Error conectando a ThingSpeak:", error);
        document.getElementById('alerts-list').innerHTML = `<p class="loading-text" style="color: #ef4444;">Error de conexión.</p>`;
    }
}

function crearObjetoSensor(id, name, fieldNivel, fieldBandera) {
    const nivel = parseInt(fieldNivel) || 0;
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
    const markersContainer = document.getElementById('map-markers');
    const alertsList = document.getElementById('alerts-list');
    
    markersContainer.innerHTML = '';
    alertsList.innerHTML = '';

    sensores.forEach(sensor => {
        // Asignar clases puras dependiendo del estado
        const markerClass = sensor.alert ? 'marker-danger' : 'marker-safe';
        const cardClass = sensor.alert ? 'card-danger' : 'card-safe';
        const iconName = sensor.alert ? 'alert-triangle' : 'check-circle-2';

        // 1. Inyectar Marcador
        const markerHTML = `
            <div class="map-marker ${markerClass}"
                 style="left: ${sensor.position.x}%; top: ${sensor.position.y}%;"
                 onmouseenter="mostrarTooltip('${sensor.name}', ${sensor.level}, '${sensor.status}', ${sensor.alert})"
                 onmouseleave="ocultarTooltip()">
                <i data-lucide="map-pin" class="marker-icon"></i>
                <div class="marker-dot"></div>
            </div>
        `;
        markersContainer.innerHTML += markerHTML;

        // 2. Inyectar Tarjeta
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