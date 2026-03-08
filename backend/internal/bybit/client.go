package bybit

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"os"
)

const (
	MainnetBaseURL    = "https://api.bybit.com"
	TestnetBaseURL    = "https://api-testnet.bybit.com"
	DefaultRecvWindow = "5000"
)

// Client represents the Bybit API v5 client.
// We keep apiSecret unexported so it's impossible to accidentally log it via fmt.Printf("%+v")
type Client struct {
	APIKey     string
	apiSecret  string
	BaseURL    string
	RecvWindow string
}

// NewClient initializes a new Bybit client pulling credentials from environment variables.
// It enforces security by not requiring keys to be passed as function arguments or hardcoded.
func NewClient() *Client {
	apiKey := os.Getenv("BYBIT_API_KEY")
	apiSecret := os.Getenv("BYBIT_API_SECRET")
	baseURL := os.Getenv("BYBIT_BASE_URL")

	if baseURL == "" {
		baseURL = MainnetBaseURL
	}

	return &Client{
		APIKey:     apiKey,
		apiSecret:  apiSecret,
		BaseURL:    baseURL,
		RecvWindow: DefaultRecvWindow,
	}
}

// GenerateSignature generates the HMAC SHA256 signature required for Bybit API v5 requests.
// rule: HMAC_SHA256(secret, timestamp + api_key + recv_window + payload)
// payload is query string for GET, or JSON string for POST.
func (c *Client) GenerateSignature(timestamp string, payload string) string {
	// Bybit v5 specific string generation
	val := timestamp + c.APIKey + c.RecvWindow + payload

	mac := hmac.New(sha256.New, []byte(c.apiSecret))
	mac.Write([]byte(val))
	return hex.EncodeToString(mac.Sum(nil))
}
