#include "HX711.h"

// PIN SUGGERITI per Lilygo T-A7670E
// Se 21/22 danno sempre 0, sposta i cavi su 32 e 33 e cambia qui
const int LOADCELL_DOUT_PIN = 21; 
const int LOADCELL_SCK_PIN = 22;

HX711 scale;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- DIAGNOSTICA BILANCIA BEEWISE ---");
  Serial.println("Controllo connessione con HX711...");

  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  
  // Test se il chip risponde
  if (scale.wait_ready_timeout(2000)) {
    Serial.println("✅ HX711 RILEVATO CORRETTAMENTE!");
  } else {
    Serial.println("❌ HX711 NON TROVATO.");
    Serial.println("Controlla:");
    Serial.println("1. VCC sia collegato a 3.3V o 5V");
    Serial.println("2. GND sia collegato");
    Serial.println("3. I pin DOUT (" + String(LOADCELL_DOUT_PIN) + ") e SCK (" + String(LOADCELL_SCK_PIN) + ") siano quelli giusti");
    Serial.println("4. Prova a scollegare e ricollegare l'USB");
    while(1); // Si ferma qui se non lo trova
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

/*
 * ISTRUZIONI PER TARATURA:
 * 1. Prendi il valore 'Grezzo' SENZA PESO (es: 107000)
 * 2. Metti un peso noto, es: 2kg. Leggi il nuovo valore (es: 152700)
 * 3. Calcola: (152700 - 107000) / 2 = 22850
 * 4. Usa 22850 come 'calibration_factor' nel firmware finale.
 */
