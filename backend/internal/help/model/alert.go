package model

import (
	"errors"
	"time"
)

// AlertType represents the type of alert
type AlertType string

const (
	// AlertTypePriceAbove - trigger when price goes above threshold
	AlertTypePriceAbove AlertType = "price_above"
	// AlertTypePriceBelow - trigger when price goes below threshold
	AlertTypePriceBelow AlertType = "price_below"
	// AlertTypePnLAbove - trigger when P&L goes above threshold
	AlertTypePnLAbove AlertType = "pnl_above"
	// AlertTypePnLBelow - trigger when P&L goes below threshold
	AlertTypePnLBelow AlertType = "pnl_below"
)

// AlertStatus represents the status of an alert
type AlertStatus string

const (
	// AlertStatusActive - alert is active and monitoring
	AlertStatusActive AlertStatus = "active"
	// AlertStatusTriggered - alert has been triggered
	AlertStatusTriggered AlertStatus = "triggered"
	// AlertStatusDisabled - alert has been disabled
	AlertStatusDisabled AlertStatus = "disabled"
)

// Alert represents a price or P&L alert
type Alert struct {
	ID        string      `json:"id"`
	UserID    string      `json:"user_id"`
	Type      AlertType   `json:"type"`
	Condition string      `json:"condition"` // symbol or position_id
	Threshold float64     `json:"threshold"`
	Status    AlertStatus `json:"status"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
	Triggered *time.Time  `json:"triggered_at,omitempty"`
}

// Validate validates the alert
func (a *Alert) Validate() error {
	if a.UserID == "" {
		return errors.New("user_id is required")
	}

	if a.Type == "" {
		return errors.New("type is required")
	}

	// Validate alert type
	switch a.Type {
	case AlertTypePriceAbove, AlertTypePriceBelow:
		if a.Condition == "" {
			return errors.New("condition (symbol) is required for price alerts")
		}
	case AlertTypePnLAbove, AlertTypePnLBelow:
		if a.Condition == "" {
			return errors.New("condition (position_id) is required for P&L alerts")
		}
	default:
		return errors.New("invalid alert type")
	}

	// Validate threshold
	if a.Threshold <= 0 {
		return errors.New("threshold must be positive")
	}

	return nil
}

// Trigger marks the alert as triggered
func (a *Alert) Trigger() {
	now := time.Now()
	a.Status = AlertStatusTriggered
	a.UpdatedAt = now
	a.Triggered = &now
}

// Disable marks the alert as disabled
func (a *Alert) Disable() {
	a.Status = AlertStatusDisabled
	a.UpdatedAt = time.Now()
}

// IsActive returns true if the alert is active
func (a *Alert) IsActive() bool {
	return a.Status == AlertStatusActive
}

// AlertCondition represents the condition to check for an alert
type AlertCondition struct {
	Type      AlertType `json:"type"`
	Current   float64   `json:"current"`
	Threshold float64   `json:"threshold"`
}

// Check evaluates if the alert condition is met
func (ac *AlertCondition) Check() bool {
	switch ac.Type {
	case AlertTypePriceAbove:
		return ac.Current >= ac.Threshold
	case AlertTypePriceBelow:
		return ac.Current <= ac.Threshold
	case AlertTypePnLAbove:
		return ac.Current >= ac.Threshold
	case AlertTypePnLBelow:
		return ac.Current <= ac.Threshold
	default:
		return false
	}
}
