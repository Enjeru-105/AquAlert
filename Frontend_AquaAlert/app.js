// Credenciales de ThingSpeak (Lectura)
const CHANNEL_ID = '3365151';
const READ_API_KEY = 'VVEWULW97F5B6FL9';
const URL_THINGSPEAK = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${READ_API_KEY}&results=1`;

// Inicializar el Mapa de Leaflet centrado en Guadalajara
const mapaGDL = L.map('mapa').setView([20.6596, -103.3496], 12);

// Agregar la capa visual del mapa (OpenStreetMap es gratis)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(mapaGDL);

// Diccionario de los 4 Nodos con sus coordenadas
const nodos = {
    plazaDelSol: { lat: 20.6489, lon: -103.4011, nombre: "Plaza del Sol" },
    plazaPatria: { lat: 20.7121, lon: -103.3776, nombre: "Plaza Patria" },
    washington: { lat: 20.6588, lon: -103.3562, nombre: "Paso Washington" },
    zonaIndustrial: { lat: 20.6385, lon: -103.3444, nombre: "Zona Industrial" }
};

// Crear los marcadores en el mapa guardándolos en un objeto
const marcadores = {
    plazaDelSol: L.marker([nodos.plazaDelSol.lat, nodos.plazaDelSol.lon]).addTo(mapaGDL),
    plazaPatria: L.marker([nodos.plazaPatria.lat, nodos.plazaPatria.lon]).addTo(mapaGDL),
    washington: L.marker([nodos.washington.lat, nodos.washington.lon]).addTo(mapaGDL),
    zonaIndustrial: L.marker([nodos.zonaIndustrial.lat, nodos.zonaIndustrial.lon]).addTo(mapaGDL)
};

// Función principal para obtener y procesar datos
async function actualizarDashboard() {
    try {
        const respuesta = await fetch(URL_THINGSPEAK);
        const datos = await respuesta.json();
        
        if (datos.feeds && datos.feeds.length > 0) {
            const feed = datos.feeds[0];
            const contenedorAlertas = document.getElementById('lista-alertas');
            contenedorAlertas.innerHTML = ''; // Limpiar lista
            
            // Actualizar la fecha
            const fechaDato = new Date(feed.created_at);
            document.getElementById('ultima-actualizacion').innerText = 
                `Última actualización: ${fechaDato.toLocaleTimeString()}`;

            // --- PROCESAR CADA NODO ---
            
            // Nodo 1: Plaza del Sol (Field 1 = cm, Field 2 = alerta)
            actualizarUI(feed.field1, feed.field2, nodos.plazaDelSol, marcadores.plazaDelSol, contenedorAlertas);
            
            // Nodo 2: Plaza Patria (Field 3 = cm, Field 4 = alerta)
            actualizarUI(feed.field3, feed.field4, nodos.plazaPatria, marcadores.plazaPatria, contenedorAlertas);
            
            // Nodo 3: Paso Washington (Field 5 = cm, Field 6 = alerta)
            actualizarUI(feed.field5, feed.field6, nodos.washington, marcadores.washington, contenedorAlertas);
            
            // Nodo 4: Zona Industrial (Field 7 = cm, Field 8 = alerta)
            actualizarUI(feed.field7, feed.field8, nodos.zonaIndustrial, marcadores.zonaIndustrial, contenedorAlertas);

        }
    } catch (error) {
        console.error("Error conectando a ThingSpeak:", error);
    }
}

// Función reutilizable para actualizar el Mapa y la Lista de cada nodo
function actualizarUI(nivel_cm, estado_alerta, infoNodo, marcadorMapa, contenedorHTML) {
    // Convertir los Strings de ThingSpeak a números enteros
    const nivel = parseInt(nivel_cm) || 0; 
    const alerta = parseInt(estado_alerta) || 0;
    
    // Crear el elemento para la lista
    const divAlerta = document.createElement('div');
    divAlerta.classList.add('alerta-item');
    
    let textoPopup = "";

    if (alerta === 1) {
        // Estado Inundado
        divAlerta.classList.add('inundado');
        divAlerta.innerHTML = `🚨 ${infoNodo.nombre}<br>Nivel: ${nivel} cm (INUNDADO)`;
        textoPopup = `🚨 <b>${infoNodo.nombre}</b><br>Nivel: ${nivel} cm<br>¡EVITE LA ZONA!`;
    } else {
        // Estado Seguro
        divAlerta.classList.add('seguro');
        divAlerta.innerHTML = `✅ ${infoNodo.nombre}<br>Nivel: ${nivel} cm (Seguro)`;
        textoPopup = `✅ <b>${infoNodo.nombre}</b><br>Nivel: ${nivel} cm<br>Tránsito libre`;
    }

    // Agregar a la lista HTML
    contenedorHTML.appendChild(divAlerta);
    
    // Actualizar el texto del marcador en el mapa
    marcadorMapa.bindPopup(textoPopup);
}

// Ejecutar la función al cargar la página
actualizarDashboard();

// Actualizar automáticamente cada 30 segundos (ThingSpeak actualiza cada 15s)
setInterval(actualizarDashboard, 30000);