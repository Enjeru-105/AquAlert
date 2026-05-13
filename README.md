# 🌊 AquAlert GDL - Sistema de Alerta Temprana de Inundaciones

**AquAlert GDL** es una solución de Internet de las Cosas (IoT) diseñada para monitorear el nivel del agua en pasos a desnivel y zonas de riesgo de inundación en la Zona Metropolitana de Guadalajara. El sistema utiliza Edge Computing para activar alarmas físicas en tiempo real y Cloud Computing para almacenar datos históricos mediante ThingSpeak.

---

## Características Principales

* **Edge Computing (Offline-first):** Si la conexión Wi-Fi falla, el microcontrolador sigue procesando datos y activando las alarmas físicas (LEDs y Buzzer) para garantizar la seguridad local.
* **Eficiencia Energética (Deep Sleep):** El ESP32 entra en modo de suspensión profunda durante 20 segundos entre lecturas para ahorrar energía.
* **Retención de Estado (GPIO Hold):** Durante el Deep Sleep, el sistema congela el estado de los pines, manteniendo encendidos los LEDs y alarmas pertinentes sin consumir ciclos de procesamiento.
* **Transmisión Segura (HTTPS):** Los datos se envían a la nube utilizando peticiones cifradas para mayor seguridad.
* **Multizona (DIP Switch):** Mediante un switch binario, un mismo dispositivo puede reconfigurarse físicamente para monitorear 4 ubicaciones diferentes (enviando datos a canales distintos en la nube).

---

## 🛠️ Hardware y Esquema de Conexiones

El proyecto utiliza un microcontrolador ESP32 conectado a los siguientes periféricos:

| Componente | Pin ESP32 | Tipo | Descripción |
| :--- | :--- | :--- | :--- |
| **Sensor Ultrasónico (HC-SR04)** | `GPIO 16` | OUTPUT | Pin `TRIG` (Gatillo) |
| **Sensor Ultrasónico (HC-SR04)** | `GPIO 17` | INPUT | Pin `ECHO` (Recepción) |
| **LED Verde** | `GPIO 2` | OUTPUT | Indicador de estado "SEGURO" |
| **LED Rojo** | `GPIO 4` | OUTPUT | Indicador de estado "PELIGRO" |
| **Buzzer** | `GPIO 15` | OUTPUT | Alarma sonora local |
| **DIP Switch (Posición 1)** | `GPIO 32` | INPUT_PULLDOWN | Selector de ubicación bit 0 |
| **DIP Switch (Posición 2)** | `GPIO 33` | INPUT_PULLDOWN | Selector de ubicación bit 1 |

---

## ⚙️ Configuración y Despliegue

### 1. Requisitos de Software
Para compilar este código, necesitas el IDE de Arduino con la placa ESP32 instalada y las siguientes librerías estándar:
* `<WiFi.h>`
* `<HTTPClient.h>`
* `<WiFiClientSecure.h>`

### 2. Archivo de Credenciales (`config.h`)
Por motivos de seguridad, las credenciales de red y de la API no están en el código principal. Debes crear un archivo llamado `config.h` en la misma carpeta que tu archivo `.ino` con el siguiente formato:

```cpp
// Archivo: config.h
#define WIFI_SSID "NOMBRE_DE_TU_RED"
#define WIFI_PASSWORD "CONTRASEÑA_DE_TU_RED"
#define TS_WRITE_API_KEY "TU_API_KEY_DE_THINGSPEAK"

# Nombre de los integrantes:
- Cortes Quezada Julia Vanessa
- Ramirez Aguilar Brenda Sarai 
- Gómez Comparán Angel

# Carrera: 
Ingeniería Informática

# Profesor: 
Paredes Lopez Angel Igancio
