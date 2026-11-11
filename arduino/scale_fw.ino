// --- MUST BE AT THE VERY TOP ---
#define TINY_GSM_MODEM_A7670
#define TINY_GSM_RX_BUFFER 1024

#include <TinyGsmClient.h>
#include <ArduinoHttpClient.h>
#include "HX711.h"

// --- CONFIGURATION ---
const char apn[]      = "mobile.vodafone.it"; // Vodafone Italia APN
const char server[]   = "ais-dev-lwjiqupwj4fdipdis6qauj-48399298589.europe-west2.run.app";
const int  port       = 443;
const char apiPath[]  = "/api/scale/update";

// FORMATO API_KEY: "ID_APIARIO:SECRET"
const char apiKey[]   = "apiario_test:beewise_2024";

// PINOUT Lilygo T-A7670E
#define UART_BAUD   115200
#define PIN_DTR     25
#define PIN_TX      27
#define PIN_RX      26
#define PWR_PIN     4
#define PIN_ADC     35 

// HX711 Pins
#define HX711_DOUT  21 
#define HX711_SCK   22
HX711 scale;

// Calibration Factor calcolato dai tuoi dati:
// (152700 - 107000) / 2kg = 22850
float calibration_factor = 22850.0; 

HardwareSerial modemSerial(1);
TinyGsm modem(modemSerial);

// Gestione SSL: se la libreria non supporta TinyGsmClientSecure per questo modem,
// proviamo a usare TinyGsmClient normale (ma potrebbe fallire su HTTPS)
#if defined(TINY_GSM_MODEM_A7670) || defined(TINY_GSM_MODEM_A7672X)
  // Per A767x spesso TinyGSM usa TinyGsmClient e gestisce SSL internamente 
  // o richiede TinyGsmClientSecure se la versione è molto recente.
  // Se ti dà errore qui, cambia 'TinyGsmClientSecure' in 'TinyGsmClient'
  TinyGsmClientSecure client(modem);
#else
  TinyGsmClient client(modem);
#endif

HttpClient http(client, server, port);

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n--- BEEWISE SCALE STARTUP ---");

  // Power on modem
  pinMode(PWR_PIN, OUTPUT);
  digitalWrite(PWR_PIN, LOW);
  delay(100);
  digitalWrite(PWR_PIN, HIGH);
  delay(1000);
  digitalWrite(PWR_PIN, LOW);

  modemSerial.begin(UART_BAUD, SERIAL_8N1, PIN_RX, PIN_TX);
  
  Serial.println("Inizializzazione Bilancia...");
  scale.begin(HX711_DOUT, HX711_SCK);
  
  if (scale.wait_ready_timeout(2000)) {
    Serial.println("✅ HX711 rilevato!");
  } else {
    Serial.println("❌ HX711 NON rilevato. Controlla i cavi!");
  }

  scale.set_scale(calibration_factor);
  // scale.tare(); // Commentato per ora per evitare 0 fissi se c'è peso sopra al boot
}

void loop() {
  // 1. Wake up modem and connect
  Serial.println("Connessione GPRS...");
  if (!modem.restart()) {
    Serial.println("Failed to restart modem");
  }

  if (!modem.gprsConnect(apn)) {
    Serial.println("GPRS Connect failed");
  }

  // 2. Measure weight
  long raw = 0;
  if (scale.is_ready()) {
    raw = scale.read();
  }
  float weight = scale.get_units(10); 
  
  Serial.print("Grezzo: "); Serial.print(raw);
  Serial.print(" | Peso: "); Serial.print(weight); Serial.println(" kg");

  // 3. Measure battery
  uint16_t v = analogRead(PIN_ADC);
  float battery_v = ((float)v / 4095.0) * 2.0 * 3.3 * 1.1; 
  int battery_pc = map(battery_v * 100, 310, 420, 0, 100); 
  battery_pc = constrain(battery_pc, 0, 100);

  // 4. Send data
  if (modem.isGprsConnected()) {
    String payload = "{\"weight\":" + String(weight, 2) + 
                     ",\"battery\":" + String(battery_pc) + 
                     ",\"api_key\":\"" + String(apiKey) + "\"}";

    Serial.println("Invio: " + payload);
    http.post(apiPath, "application/json", payload);

    int statusCode = http.responseStatusCode();
    String response = http.responseBody();
    Serial.print("Status: "); Serial.println(statusCode);
    Serial.print("Risposta: "); Serial.println(response);
  }

  // 5. Deep Sleep
  Serial.println("Entro in Deep Sleep...");
  modem.poweroff();
  esp_sleep_enable_timer_wakeup(3600ULL * 1000000ULL); // 1 ora di test
  esp_deep_sleep_start();
}
