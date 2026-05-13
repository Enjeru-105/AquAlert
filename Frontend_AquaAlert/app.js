// Coordenadas aproximadas para los pines en el iframe
const positions = {
    1: { x: 38, y: 65 }, // Plaza del Sol
    2: { x: 30, y: 35 }, // Plaza Patria
    3: { x: 60, y: 55 }, // Paso Washington
    4: { x: 65, y: 75 }  // Zona Industrial
};

// 1. AÑADIDO: Memoria global para guardar el último estado válido de cada sensor
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
        const response = await fetch('https://api.thingspeak.com/channels/3365151/feeds.json?api_key=VVEWULW97F5B6FL9&results=1');
        const json = await response.json();

        if (json.feeds && json.feeds.length > 0) {
            const ultimoDato = json.feeds[0];

            // 2. AÑADIDO: Actualizamos la memoria SOLO si el dato nuevo no es nulo
            if (ultimoDato.field1 !== null) memoriaSensores[1].nivel = ultimoDato.field1;
            if (ultimoDato.field2 !== null) memoriaSensores[1].bandera = ultimoDato.field2;
            
            if (ultimoDato.field3 !== null) memoriaSensores[2].nivel = ultimoDato.field3;
            if (ultimoDato.field4 !== null) memoriaSensores[2].bandera = ultimoDato.field4;
            
            if (ultimoDato.field5 !== null) memoriaSensores[3].nivel = ultimoDato.field5;
            if (ultimoDato.field6 !== null) memoriaSensores[3].bandera = ultimoDato.field6;
            
            if (ultimoDato.field7 !== null) memoriaSensores[4].nivel = ultimoDato.field7;
            if (ultimoDato.field8 !== null) memoriaSensores[4].bandera = ultimoDato.field8;

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