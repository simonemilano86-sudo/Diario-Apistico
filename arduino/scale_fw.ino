// 1. QUESTE RIGHE DEVONO ESSERE ASSOLUTAMENTE LE PRIME DEL FILE
#define TINY_GSM_MODEM_A7670
#define TINY_GSM_RX_BUFFER 1024
#define TINY_GSM_FORK_LIBRARY

#include <TinyGsmClient.h>
#include "HX711.h"

// --- CONFIGURAZIONE ---
const char apn[]      = "internet.it"; // APN WIND TRE
const char server[]   = "uqvovgxdfleosaodpyyb.supabase.co";
const char supabaseKey[] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdm92Z3hkZmxlb3Nhb2RweXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyOTAyMzcsImV4cCI6MjA3OTg2NjIzN30.g6RNcnpTM8_yuJqbbKYawalVxckvCtySRF6oVTqNLNs";
const char apiPath[]  = "/rest/v1/scale_data"; 

// --- IDENTIFICATIVI ---
const char apiaryId[] = "Poggio";
const char scaleId[]  = "Bil_001"; 

// --- PINOUT LILYGO T-A7670E ---
#define UART_BAUD   115200
#define PWR_PIN     4
#define MODEM_EN    12

// --- PIN BILANCIA ---
#define HX711_DOUT  32 
#define HX711_SCK   33
HX711 scale;

float calibration_factor = 23447.0; 
long KNOWN_ZERO_OFFSET = 106439; 

HardwareSerial modemSerial(1);
TinyGsm modem(modemSerial);

void accendiModem() {
  Serial.println(">>> [POWER] Avvio modem...");
  pinMode(MODEM_EN, OUTPUT);
  digitalWrite(MODEM_EN, HIGH);
  delay(100);
  
  pinMode(PWR_PIN, OUTPUT);
  digitalWrite(PWR_PIN, LOW);
  delay(100);
  digitalWrite(PWR_PIN, HIGH);
  delay(1500); 
  digitalWrite(PWR_PIN, LOW);
  delay(10000); 
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- BEEWISE SMART SCALE START ---");

  scale.begin(HX711_DOUT, HX711_SCK);
  if (scale.wait_ready_timeout(2000)) {
    Serial.println("✅ Bilancia pronta.");
    scale.set_scale(calibration_factor);
    scale.set_offset(KNOWN_ZERO_OFFSET); 
  }

  accendiModem();
  modemSerial.begin(UART_BAUD, SERIAL_8N1, 27, 26);
}

bool inviaDatiHTTPS(float weight) {
  String fullUrl = "https://" + String(server) + String(apiPath);
  String jsonData = "{\"apiaryId\":\"" + String(apiaryId) + "\",\"scaleId\":\"" + String(scaleId) + "\",\"weight\":" + String(weight, 2) + ",\"battery\":100}";

  Serial.print(">>> [HTTPS] Invio: "); Serial.println(jsonData);

  // --- FIX ERRORE 713: RESET HARD STACK ---
  modem.https_end();
  modem.sendAT("+CHTTPSSTOP"); modem.waitResponse(1000);
  modem.sendAT("+CHTTPSSTART"); modem.waitResponse(1000);
  
  // Ignora verifica certificato (Fondamentale)
  modem.sendAT("+CHTTPSOTI=0"); modem.waitResponse(500);

  if (!modem.https_begin()) {
    Serial.println("❌ [HTTPS] begin fallito");
    return false;
  }

  modem.https_set_url(fullUrl);
  modem.https_set_content_type("application/json");

  modem.https_add_header("Authorization", "Bearer " + String(supabaseKey));
  modem.https_add_header("apikey", String(supabaseKey));
  modem.https_add_header("Host", String(server));
  modem.https_add_header("Connection", "close");

  int httpCode = modem.https_post(jsonData);

  Serial.print(">>> [HTTPS] Risultato: "); Serial.println(httpCode);

  if (httpCode != 200 && httpCode != 201) {
    Serial.print(">>> [HTTPS] Body: ");
    Serial.println(modem.https_body());
  }

  modem.https_end();
  return (httpCode == 200 || httpCode == 201);
}

void loop() {
  float weight = scale.get_units(10);
  if (abs(weight) < 0.05) weight = 0;

  Serial.print(">>> Peso: "); Serial.print(weight, 2); Serial.println(" kg");

  if (modem.testAT()) {
    if (modem.gprsConnect(apn)) {
      if (inviaDatiHTTPS(weight)) {
        Serial.println("✅ DATI INVIATI!");
      } else {
        Serial.println("❌ INVIO FALLITO");
      }
      modem.gprsDisconnect();
    } else {
      Serial.println("❌ GPRS FALLITO");
    }
  } else {
    accendiModem();
  }

  Serial.println("Attesa 60 secondi...");
  delay(60000);
}
