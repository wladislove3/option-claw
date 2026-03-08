package bybit

import (
	"testing"
)

func TestGenerateSignature(t *testing.T) {
	// Using a mock client to ensure the hashing logic is mathematically correct.
	client := &Client{
		APIKey:     "test_api_key",
		apiSecret:  "test_api_secret",
		RecvWindow: "5000",
	}

	timestamp := "1658384431871"
	payload := "category=linear&symbol=BTCUSDT"

	// Expected HMAC-SHA256 of "1658384431871test_api_key5000category=linear&symbol=BTCUSDT"
	// with secret "test_api_secret"
	expectedSignature := "b2f7ef8a05bc232aac06ec693e53dd8c9a5023b4e1746035d2297c630da6613f"

	sig := client.GenerateSignature(timestamp, payload)

	if sig != expectedSignature {
		t.Errorf("GenerateSignature() failed.\nExpected: %s\nGot:      %s", expectedSignature, sig)
	}
}
