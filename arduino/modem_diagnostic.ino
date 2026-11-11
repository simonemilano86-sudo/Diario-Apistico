// --- MUST BE AT THE VERY TOP ---
#define TINY_GSM_MODEM_A7670

#include <TinyGsmClient.h>

// PINOUT Lilygo T-A7670E
#define UART_BAUD   115200
#define PIN_TX      27
#define PIN_RX      26
#define PWR_PIN     4

HardwareSerial modemSerial(1);
TinyGsm modem(modemSerial);

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n--- DIAGNOSTICA MODEM BEEWISE ---");

  // Accensione Modem
  pinMode(PWR_PIN, OUTPUT);
  digitalWrite(PWR_PIN, LOW);
  delay(100);
  digitalWrite(PWR_PIN, HIGH);
  delay(1000);
  digitalWrite(PWR_PIN, LOW);

  modemSerial.begin(UART_BAUD, SERIAL_8N1, PIN_RX, PIN_TX);
  
  Serial.println("Controllo risposta modem (AT)...");
  
  int retry = 0;
  while (!modem.testAT() && retry < 20) {
    Serial.print(".");
    delay(500);
    retry++;
  }

  if (modem.testAT()) {
    Serial.println("\n✅ Modem Risponde!");
    Serial.print("Modello: "); Serial.println(modem.getModemName());
    Serial.print("Segnale (RSSI): "); Serial.println(modem.getSignalQuality());
  } else {
    Serial.println("\n❌ Il modem NON risponde. Controlla i PIN e la batteria.");
  }
}

void loop() {
  // Serial bridge per inviare comandi AT manuali
  if (Serial.available()) {
    modemSerial.write(Serial.read());
  }
  if (modemSerial.available()) {
    Serial.write(modemSerial.read());
  }
}
