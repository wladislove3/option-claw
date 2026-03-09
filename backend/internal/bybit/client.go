package bybit

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	MainnetBaseURL    = "https://api.bybit.com"
	TestnetBaseURL    = "https://api-testnet.bybit.com"
	DefaultRecvWindow = "5000"
)

// Position represents a Bybit option position
type Position struct {
	Symbol          string `json:"symbol"`
	Side            string `json:"side"`
	Size            string `json:"size"`
	EntryPrice      string `json:"entryPrice"`
	MarkPrice       string `json:"markPrice"`
	UnrealisedPnl   string `json:"unrealisedPnl"`
	Delta           string `json:"delta"`
	Gamma           string `json:"gamma"`
	Theta           string `json:"theta"`
	Vega            string `json:"vega"`
	PositionValue   string `json:"positionValue"`
	Leverage        string `json:"leverage"`
	PositionBalance string `json:"positionBalance"`
}

// PositionResponse represents the API response for positions
type PositionResponse struct {
	RetCode    int         `json:"retCode"`
	RetMsg     string      `json:"retMsg"`
	Result     PositionResult `json:"result"`
	RetExtInfo interface{} `json:"retExtInfo"`
	Time       int64       `json:"time"`
}

type PositionResult struct {
	List []Position `json:"list"`
}

// Client represents the Bybit API v5 client.
type Client struct {
	APIKey     string
	apiSecret  string
	BaseURL    string
	RecvWindow string
	client     *http.Client
}

// NewClient initializes a new Bybit client with the provided credentials.
func NewClient(apiKey, apiSecret string) *Client {
	baseURL := os.Getenv("BYBIT_BASE_URL")
	if baseURL == "" {
		baseURL = MainnetBaseURL
	}

	return &Client{
		APIKey:     strings.TrimSpace(apiKey),
		apiSecret:  strings.TrimSpace(apiSecret),
		BaseURL:    baseURL,
		RecvWindow: DefaultRecvWindow,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// GenerateSignature generates the HMAC SHA256 signature required for Bybit API v5 requests.
func (c *Client) GenerateSignature(timestamp string, payload string) string {
	// val = {timestamp}{api_key}{recv_window}{queryString}
	val := timestamp + c.APIKey + c.RecvWindow + payload
	
	mac := hmac.New(sha256.New, []byte(c.apiSecret))
	mac.Write([]byte(val))
	return hex.EncodeToString(mac.Sum(nil))
}

// GetOptionPositions fetches all option positions from Bybit
func (c *Client) GetOptionPositions() ([]Position, error) {
	endpoint := "/v5/position/list"
	params := "settleCoin=USDC&category=option"
	url := c.BaseURL + endpoint + "?" + params

	timestamp := strconv.FormatInt(time.Now().UnixMilli(), 10)
	signature := c.GenerateSignature(timestamp, params)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("X-BAPI-API-KEY", c.APIKey)
	req.Header.Set("X-BAPI-SIGN", signature)
	req.Header.Set("X-BAPI-SIGN-TYPE", "2")
	req.Header.Set("X-BAPI-TIMESTAMP", timestamp)
	req.Header.Set("X-BAPI-RECV-WINDOW", c.RecvWindow)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("[Bybit Error] Status: %d, Body: %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("bybit API returned status %d: %s", resp.StatusCode, string(body))
	}

	var positionResp PositionResponse
	if err := json.Unmarshal(body, &positionResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if positionResp.RetCode != 0 {
		return nil, fmt.Errorf("bybit API error: code=%d, msg=%s", positionResp.RetCode, positionResp.RetMsg)
	}

	return positionResp.Result.List, nil
}
