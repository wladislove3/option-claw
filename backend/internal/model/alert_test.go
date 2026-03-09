package model

import (
	"testing"
	"time"
)

func TestAlertValidate(t *testing.T) {
	tests := []struct {
		name    string
		alert   *Alert
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid price above alert",
			alert: &Alert{
				UserID:    "user-123",
				Type:      AlertTypePriceAbove,
				Condition: "BTC",
				Threshold: 100000,
			},
			wantErr: false,
		},
		{
			name: "valid price below alert",
			alert: &Alert{
				UserID:    "user-123",
				Type:      AlertTypePriceBelow,
				Condition: "ETH",
				Threshold: 5000,
			},
			wantErr: false,
		},
		{
			name: "valid pnl above alert",
			alert: &Alert{
				UserID:    "user-123",
				Type:      AlertTypePnLAbove,
				Condition: "position-123",
				Threshold: 1000,
			},
			wantErr: false,
		},
		{
			name: "valid pnl below alert",
			alert: &Alert{
				UserID:    "user-123",
				Type:      AlertTypePnLBelow,
				Condition: "position-456",
				Threshold: 500,
			},
			wantErr: false,
		},
		{
			name: "missing user_id",
			alert: &Alert{
				Type:      AlertTypePriceAbove,
				Condition: "BTC",
				Threshold: 100000,
			},
			wantErr: true,
			errMsg:  "user_id is required",
		},
		{
			name: "missing type",
			alert: &Alert{
				UserID:    "user-123",
				Condition: "BTC",
				Threshold: 100000,
			},
			wantErr: true,
			errMsg:  "type is required",
		},
		{
			name: "invalid type",
			alert: &Alert{
				UserID:    "user-123",
				Type:      "invalid_type",
				Condition: "BTC",
				Threshold: 100000,
			},
			wantErr: true,
			errMsg:  "invalid alert type",
		},
		{
			name: "missing condition for price alert",
			alert: &Alert{
				UserID:    "user-123",
				Type:      AlertTypePriceAbove,
				Threshold: 100000,
			},
			wantErr: true,
			errMsg:  "condition (symbol) is required for price alerts",
		},
		{
			name: "missing condition for pnl alert",
			alert: &Alert{
				UserID:    "user-123",
				Type:      AlertTypePnLAbove,
				Threshold: 1000,
			},
			wantErr: true,
			errMsg:  "condition (position_id) is required for P&L alerts",
		},
		{
			name: "zero threshold",
			alert: &Alert{
				UserID:    "user-123",
				Type:      AlertTypePriceAbove,
				Condition: "BTC",
				Threshold: 0,
			},
			wantErr: true,
			errMsg:  "threshold must be positive",
		},
		{
			name: "negative threshold",
			alert: &Alert{
				UserID:    "user-123",
				Type:      AlertTypePriceAbove,
				Condition: "BTC",
				Threshold: -100,
			},
			wantErr: true,
			errMsg:  "threshold must be positive",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.alert.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Alert.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && tt.errMsg != "" && err.Error() != tt.errMsg {
				t.Errorf("Alert.Validate() error message = %v, want %v", err.Error(), tt.errMsg)
			}
		})
	}
}

func TestAlertTrigger(t *testing.T) {
	alert := &Alert{
		ID:        "alert-123",
		UserID:    "user-123",
		Type:      AlertTypePriceAbove,
		Condition: "BTC",
		Threshold: 100000,
		Status:    AlertStatusActive,
	}

	alert.Trigger()

	if alert.Status != AlertStatusTriggered {
		t.Errorf("Expected status triggered, got %s", alert.Status)
	}

	if alert.Triggered == nil {
		t.Error("Expected triggered_at to be set")
	}

	if alert.UpdatedAt.IsZero() {
		t.Error("Expected updated_at to be set")
	}
}

func TestAlertDisable(t *testing.T) {
	alert := &Alert{
		ID:        "alert-123",
		UserID:    "user-123",
		Type:      AlertTypePriceAbove,
		Condition: "BTC",
		Threshold: 100000,
		Status:    AlertStatusActive,
	}

	alert.Disable()

	if alert.Status != AlertStatusDisabled {
		t.Errorf("Expected status disabled, got %s", alert.Status)
	}

	if alert.UpdatedAt.IsZero() {
		t.Error("Expected updated_at to be set")
	}
}

func TestAlertIsActive(t *testing.T) {
	tests := []struct {
		name   string
		status AlertStatus
		want   bool
	}{
		{"active", AlertStatusActive, true},
		{"triggered", AlertStatusTriggered, false},
		{"disabled", AlertStatusDisabled, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			alert := &Alert{
				ID:     "alert-123",
				UserID: "user-123",
				Status: tt.status,
			}

			if got := alert.IsActive(); got != tt.want {
				t.Errorf("Alert.IsActive() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestAlertConditionCheck(t *testing.T) {
	tests := []struct {
		name      string
		condition *AlertCondition
		want      bool
	}{
		{
			name: "price_above triggered",
			condition: &AlertCondition{
				Type:      AlertTypePriceAbove,
				Current:   105000,
				Threshold: 100000,
			},
			want: true,
		},
		{
			name: "price_above not triggered",
			condition: &AlertCondition{
				Type:      AlertTypePriceAbove,
				Current:   95000,
				Threshold: 100000,
			},
			want: false,
		},
		{
			name: "price_below triggered",
			condition: &AlertCondition{
				Type:      AlertTypePriceBelow,
				Current:   95000,
				Threshold: 100000,
			},
			want: true,
		},
		{
			name: "price_below not triggered",
			condition: &AlertCondition{
				Type:      AlertTypePriceBelow,
				Current:   105000,
				Threshold: 100000,
			},
			want: false,
		},
		{
			name: "pnl_above triggered",
			condition: &AlertCondition{
				Type:      AlertTypePnLAbove,
				Current:   1500,
				Threshold: 1000,
			},
			want: true,
		},
		{
			name: "pnl_above not triggered",
			condition: &AlertCondition{
				Type:      AlertTypePnLAbove,
				Current:   500,
				Threshold: 1000,
			},
			want: false,
		},
		{
			name: "pnl_below triggered",
			condition: &AlertCondition{
				Type:      AlertTypePnLBelow,
				Current:   -500,
				Threshold: 0,
			},
			want: true,
		},
		{
			name: "pnl_below not triggered",
			condition: &AlertCondition{
				Type:      AlertTypePnLBelow,
				Current:   500,
				Threshold: 0,
			},
			want: false,
		},
		{
			name: "invalid type",
			condition: &AlertCondition{
				Type:      "invalid",
				Current:   100,
				Threshold: 50,
			},
			want: false,
		},
		{
			name: "price exactly at threshold (above)",
			condition: &AlertCondition{
				Type:      AlertTypePriceAbove,
				Current:   100000,
				Threshold: 100000,
			},
			want: true,
		},
		{
			name: "price exactly at threshold (below)",
			condition: &AlertCondition{
				Type:      AlertTypePriceBelow,
				Current:   100000,
				Threshold: 100000,
			},
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.condition.Check(); got != tt.want {
				t.Errorf("AlertCondition.Check() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestAlertTypeConstants(t *testing.T) {
	if AlertTypePriceAbove != "price_above" {
		t.Errorf("AlertTypePriceAbove = %s, want price_above", AlertTypePriceAbove)
	}
	if AlertTypePriceBelow != "price_below" {
		t.Errorf("AlertTypePriceBelow = %s, want price_below", AlertTypePriceBelow)
	}
	if AlertTypePnLAbove != "pnl_above" {
		t.Errorf("AlertTypePnLAbove = %s, want pnl_above", AlertTypePnLAbove)
	}
	if AlertTypePnLBelow != "pnl_below" {
		t.Errorf("AlertTypePnLBelow = %s, want pnl_below", AlertTypePnLBelow)
	}
}

func TestAlertStatusConstants(t *testing.T) {
	if AlertStatusActive != "active" {
		t.Errorf("AlertStatusActive = %s, want active", AlertStatusActive)
	}
	if AlertStatusTriggered != "triggered" {
		t.Errorf("AlertStatusTriggered = %s, want triggered", AlertStatusTriggered)
	}
	if AlertStatusDisabled != "disabled" {
		t.Errorf("AlertStatusDisabled = %s, want disabled", AlertStatusDisabled)
	}
}

func TestAlertTimestamps(t *testing.T) {
	alert := &Alert{
		ID:        "alert-123",
		UserID:    "user-123",
		Type:      AlertTypePriceAbove,
		Condition: "BTC",
		Threshold: 100000,
	}

	before := time.Now()
	alert.Validate()
	after := time.Now()

	// Validate shouldn't set timestamps
	if !alert.CreatedAt.IsZero() {
		t.Error("CreatedAt should be zero before Create")
	}

	// Trigger should set timestamps
	alert.Trigger()
	if alert.UpdatedAt.Before(before) || alert.UpdatedAt.After(after.Add(time.Second)) {
		t.Error("UpdatedAt should be set to current time")
	}
}
