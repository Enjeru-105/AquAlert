#include <WiFi.h>
#include <ThingSpeak.h>
#include "secrets.h"

// --- Tu WiFi ---
const char* ssid = "WIFI_SSID"; 
const char* password = "WIFI_PASSWORD"; 

// --- Tu Canal "IoT Prtuebas" ---
unsigned long myChannelNumber = 3365151; 
const char * myWriteAPIKey = "TS_WRITE_API_KEY";

// --- Pines ---
const int LED_VRD = 2; // Pin del LED Verde (Seguro)
const int LED_RJO = 4; // Pin del Rojo (Alerta)
const int BUZZ = 18; // Pin del Buzzer
const int SENSOR_TRG = 16; // Pin Trigger del HC-SR04
const int SENSOR_ECH = 17; // Pin Echo del HC-SR04

// el sensor teóricamente se coloca a 4 metros del suelo
// Para el proyecto dividimos esa cifra entre 10 = 40cm
// la distancia segura real son 50cm, entonces usaremos 5cm

const float Altura_sensor = 40.0; //cm
const float Distancia_segura = 5.0; //cm
long Duracion;
float Altitud_agua;

WiFiClient client;

void setup() {
  Serial.begin(115200);

  pinMode(LED_VRD, OUTPUT);
  pinMode(LED_RJO, OUTPUT);
  pinMode(BUZZ, OUTPUT);
  pinMode(SENSOR_TRG, OUTPUT);
  pinMode(SENSOR_ECH, INPUT);

  
  digitalWrite(LED_VRD, LOW);
  digitalWrite(LED_RJO, LOW);
  digitalWrite(BUZZ, LOW);

  // Conexión WiFi
  Serial.print("Conectando a WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n¡Conectado a WiFi!");
  
  // Iniciar cliente ThingSpeak
  ThingSpeak.begin(client);
}

void loop() {
  // Lectura del Sensor HC-SR04
  digitalWrite(SENSOR_TRG, LOW);
  delayMicroseconds(2);
  digitalWrite(SENSOR_TRG, HIGH);
  delayMicroseconds(10);
  digitalWrite(SENSOR_TRG, LOW);

  Duracion = pulseIn(SENSOR_ECH, HIGH);
  Altitud_agua = Altura_sensor - (Duracion * 0.034 / 2);

  Serial.print("Nivel de agua actual: ");
  Serial.print(Altitud_agua);
  Serial.println(" cm");

  // Edge Computing (Lógica de Alerta Local)
  if(Altitud_agua>=Distancia_segura){
    digitalWrite(LED_VRD, LOW); // Apaga Seguro
    digitalWrite(LED_RJO, HIGH); // Enciende Alerta
    digitalWrite(BUZZ, HIGH); // Enciende Alarma
  }else{
    digitalWrite(LED_RJO, LOW); // Apaga Alerta
    digitalWrite(BUZZ, LOW); // Apaga Alarma
    digitalWrite(LED_VRD, HIGH); // Enciende Seguro
  }

  // Preparar paquete de ThingSpeak (Nodo 1: Plaza del Sol)
  ThingSpeak.setField(1, Altitud_agua);
  ThingSpeak.setField(2, digitalRead(LED_RJO));

  // Enviar datos a la nube
  int codigoHTTP = ThingSpeak.writeFields(myChannelNumber, myWriteAPIKey);
  
  if(codigoHTTP == 200) {
    Serial.println("Datos enviados a ThingSpeak exitosamente.");
  } else {
    Serial.println("Error enviando datos. Código HTTP: " + String(codigoHTTP));
  }

  // 5. Pausa vital para no saturar ThingSpeak (20 segundos)
  delay(20000);
}