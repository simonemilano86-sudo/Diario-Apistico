#include "HX711.h"

// PIN AGGIORNATI per evitare conflitti su Lilygo T-A7670E
const int LOADCELL_DOUT_PIN = 32; 
const int LOADCELL_SCK_PIN = 33;

HX711 scale;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- DIAGNOSTICA BILANCIA BEEWISE (PIN 32/33) ---");
  Serial.println("Controllo connessione con HX711...");

  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  
  if (scale.wait_ready_timeout(2000)) {
    Serial.println("✅ HX711 RILEVATO CORRETTAMENTE!");
  } else {
    Serial.println("❌ HX711 NON TROVATO.");
    Serial.println("ASSICURATI CHE:");
    Serial.println("1. DOUT sia su PIN 32");
    Serial.println("2. SCK sia su PIN 33");
    Serial.println("3. VCC sia 3.3V o 5V");
    while(1); 
  }
}

void loop() {
  if (scale.is_ready()) {
    long reading = scale.read();
    Serial.print("Valore Grezzo: ");
    Serial.println(reading);
  } else {
    Serial.println("Bilancia non pronta...");
  }
  delay(500);
}
