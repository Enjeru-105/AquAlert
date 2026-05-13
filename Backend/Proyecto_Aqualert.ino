#include <WiFi.h>
#include <HTTPClient.h>
#include "config.h"
#include <WiFiClientSecure.h>

// --- Configuración de Tiempos para Deep Sleep ---
#define uS_TO_S_FACTOR 1000000ULL  
#define TIME_TO_SLEEP  20

// --- Señal WiFi ---
const char* ssid = WIFI_SSID; 
const char* password = WIFI_PASSWORD; 

// --- Canal "IoT Prtuebas" ---
const char * myWriteAPIKey = TS_WRITE_API_KEY;

// --- Pines ---
const int SENSOR_TRG = 16; // Pin Trigger del HC-SR04
const int SENSOR_ECH = 17; // Pin Echo del HC-SR04
const int DIP_1 = 32; // Pin 1 de minidip para comparación binaria
const int DIP_2 = 33; // Pin 2 de minidip para comparación binaria
// Pines GPIO Hold para bloquearlos en su estado y  no apagarlos al momento de hacer Deep Sleep
const int LED_VRD = 2; // Pin del LED Verde (Seguro)
const int LED_RJO = 4; // Pin del Rojo (Alerta)
const int BUZZ = 15; // Pin del Buzzer

// ======== Escala maqueta ========
// el sensor teóricamente se coloca a 4 metros del suelo
// Para el proyecto dividimos esa cifra entre 10 = 40cm
// la distancia segura real son 50cm, entonces usaremos 5cm
const float Altura_sensor = 40.0; //cm
const float Distancia_segura = 5.0; //cm

long Duracion;
float Altitud_agua;
int field_cm;
int field_st;

// Implementación de un cliente wifi seguro
WiFiClientSecure client;

void setup() {
  Serial.begin(115200);

  pinMode(LED_VRD, OUTPUT);
  pinMode(LED_RJO, OUTPUT);
  pinMode(BUZZ, OUTPUT);
  pinMode(SENSOR_TRG, OUTPUT);
  pinMode(SENSOR_ECH, INPUT);

  pinMode(DIP_1, INPUT_PULLDOWN);
  pinMode(DIP_2, INPUT_PULLDOWN);

  // Conexión WiFi con TimeOut
  Serial.print("Conectando a WiFi...");
  WiFi.begin(ssid, password);

  int intentos = 0;
  // Intenta conectar por un máximo de 10 segundos (20 intentos de 500ms)
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    intentos++;
  }

  // Verifica si logró conectarse o se agotó el tiempo
  if(WiFi.status() == WL_CONNECTED) {
    Serial.println("\n¡Conectado a WiFi!");
    // Configuramos el cliente para usar HTTPS (TLS/SSL)
    client.setInsecure(); // Para fines académicos, acepta el certificado de ThingSpeak sin validarlo localmente
  } else {
    Serial.println("\n[ADVERTENCIA] Sin internet. Ejecutando solo modo local (Edge Computing).");
  }

  // Descongelar Pines Al Despertar
  // Cuando el ESP32 despierta, los pines siguen "bloqueados" en su último estado. 
  // Hay que liberarlos para poder cambiar su valor si la inundación ya bajó.
  gpio_hold_dis((gpio_num_t)LED_VRD);
  gpio_hold_dis((gpio_num_t)LED_RJO);
  gpio_hold_dis((gpio_num_t)BUZZ);
  gpio_deep_sleep_hold_dis();
  
  esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP * uS_TO_S_FACTOR);
}

void loop() {
  // Leer el estado de los pines del DIP switch
  int estado_dip1 = digitalRead(DIP_1);
  int estado_dip2 = digitalRead(DIP_2);

  //Opciones binarias para cambiar el punto de monitorización con 2 dips
  if(estado_dip1 == LOW && estado_dip2 == LOW) { // 0 , 0
    Serial.println("Monitorizando: Plaza del Sol");
    field_cm = 1;
    field_st = 2;
  } else if(estado_dip1 == LOW && estado_dip2 == HIGH) { // 0 , 1
    Serial.println("Monitorizando: Plaza Patria");
    field_cm = 3;
    field_st = 4;
  } else if(estado_dip1 == HIGH && estado_dip2 == LOW) { // 1 , 0
    Serial.println("Monitorizando: Paso a Desnivel Washington");
    field_cm = 5;
    field_st = 6;
  } else if(estado_dip1 == HIGH && estado_dip2 == HIGH) { // 1 , 1
    Serial.println("Monitorizando: Zona Industrial / Macrobús");
    field_cm = 7;
    field_st = 8;
  }

  // Lectura del Sensor HC-SR04
  digitalWrite(SENSOR_TRG, LOW);
  delayMicroseconds(2);
  digitalWrite(SENSOR_TRG, HIGH);
  delayMicroseconds(10);
  digitalWrite(SENSOR_TRG, LOW);

  Duracion = pulseIn(SENSOR_ECH, HIGH);
  Altitud_agua = Altura_sensor - (Duracion * 0.034 / 2);

  if(Altitud_agua<0) Altitud_agua=0; // Evita lecturas negativas

  Serial.print("Nivel de agua actual: ");
  Serial.print(Altitud_agua);
  Serial.println(" cm");

  // Edge Computing (Lógica de Alerta Local) : Se ejecuta aunque no haya internet
  if(Altitud_agua>=Distancia_segura){
    digitalWrite(LED_VRD, LOW); // Apaga Seguro
    digitalWrite(LED_RJO, HIGH); // Enciende Alerta
    digitalWrite(BUZZ, HIGH); // Enciende Alarma
    Serial.println("Estado: PELIGRO");
  }else{
    digitalWrite(LED_RJO, LOW); // Apaga Alerta
    digitalWrite(BUZZ, LOW); // Apaga Alarma
    digitalWrite(LED_VRD, HIGH); // Enciende Seguro
    Serial.println("Estado: SEGURO");
  }

  // Envío a la nube condicionado al WiFi
  if(WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    // Armamos la URL estructurada inyectando las variables dinámicas
    String url = "https://api.thingspeak.com/update?api_key=" + String(myWriteAPIKey) + 
                 "&field" + String(field_cm) + "=" + String(Altitud_agua) + 
                 "&field" + String(field_st) + "=" + String(digitalRead(LED_RJO));

    Serial.println("Enviando por HTTPS...");
    http.begin(client, url); // Inicia conexión cifrada
    int codigoHTTP = http.GET(); // Dispara la petición
    
    if(codigoHTTP > 0) { // Mayor a 0 significa que hubo respuesta del servidor
      Serial.println("Datos enviados exitosamente. Código HTTP: " + String(codigoHTTP));
    } else {
      Serial.println("Error en la conexión segura. Código HTTP: " + String(codigoHTTP));
    }
    http.end(); // Libera la memoria
  } else {
    Serial.println("Sin conexión de red. Dato no enviado a la nube, priorizando seguridad local.");
  }

  // CONGELAR PINES (Flip-Flop por Software)
  // Le digo al ESP32 que mantenga estos pines en su estado actual durante el Deep Sleep
  gpio_hold_en((gpio_num_t)LED_VRD);
  gpio_hold_en((gpio_num_t)LED_RJO);
  gpio_hold_en((gpio_num_t)BUZZ);
  gpio_deep_sleep_hold_en(); // Habilita la retención global durante el sueño

  Serial.println("Durmiendo por 20 segundos hasta la siguiente lectura");
  Serial.flush(); 
  esp_deep_sleep_start();
}
