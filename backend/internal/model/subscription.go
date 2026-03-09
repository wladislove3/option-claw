package model

import "time"

// SubscriptionPlan represents the subscription tier
type SubscriptionPlan string

const (
	// PlanFree - free tier with limited positions
	PlanFree SubscriptionPlan = "free"
	// PlanPro - pro tier with unlimited positions
	PlanPro SubscriptionPlan = "pro"
	// PlanEnterprise - enterprise tier with all features
	PlanEnterprise SubscriptionPlan = "enterprise"
)

// SubscriptionStatus represents the subscription state
type SubscriptionStatus string

const (
	// StatusActive - subscription is active
	StatusActive SubscriptionStatus = "active"
	// StatusExpired - subscription has expired
	StatusExpired SubscriptionStatus = "expired"
	// StatusCancelled - subscription was cancelled
	StatusCancelled SubscriptionStatus = "cancelled"
	// StatusTrial - trial subscription
	StatusTrial SubscriptionStatus = "trial"
)

// Subscription limits by plan
var PlanLimits = map[SubscriptionPlan]SubscriptionLimits{
	PlanFree: {
		MaxPositions:     10,
		MaxAlerts:        5,
		RealTimeData:     false,
		AdvancedGreeks:   false,
		SupportLevel:     "community",
	},
	PlanPro: {
		MaxPositions:     -1, // unlimited
		MaxAlerts:        100,
		RealTimeData:     true,
		AdvancedGreeks:   true,
		SupportLevel:     "priority",
	},
	PlanEnterprise: {
		MaxPositions:     -1, // unlimited
		MaxAlerts:        -1, // unlimited
		RealTimeData:     true,
		AdvancedGreeks:   true,
		SupportLevel:     "dedicated",
	},
}

// SubscriptionLimits defines limits for a subscription plan
type SubscriptionLimits struct {
	MaxPositions   int    // -1 for unlimited
	MaxAlerts      int    // -1 for unlimited
	RealTimeData   bool   // WebSocket updates
	AdvancedGreeks bool   // Advanced Greeks calculations
	SupportLevel   string // community, priority, dedicated
}

// Subscription represents a user subscription
type Subscription struct {
	ID        string             `json:"id"`
	UserID    string             `json:"user_id"`
	Plan      SubscriptionPlan   `json:"plan"`
	Status    SubscriptionStatus `json:"status"`
	StartedAt time.Time          `json:"started_at"`
	ExpiresAt *time.Time         `json:"expires_at,omitempty"`
	CreatedAt time.Time          `json:"created_at"`
	UpdatedAt time.Time          `json:"updated_at"`
}

// IsActive returns true if subscription is active
func (s *Subscription) IsActive() bool {
	if s.Status != StatusActive && s.Status != StatusTrial {
		return false
	}

	if s.ExpiresAt != nil && time.Now().After(*s.ExpiresAt) {
		return false
	}

	return true
}

// GetLimits returns the limits for the subscription plan
func (s *Subscription) GetLimits() SubscriptionLimits {
	limits, ok := PlanLimits[s.Plan]
	if !ok {
		return PlanLimits[PlanFree]
	}
	return limits
}

// CanCreatePosition returns true if user can create more positions
func (s *Subscription) CanCreatePosition(currentCount int) bool {
	limits := s.GetLimits()
	if limits.MaxPositions < 0 {
		return true // unlimited
	}
	return currentCount < limits.MaxPositions
}

// CanCreateAlert returns true if user can create more alerts
func (s *Subscription) CanCreateAlert(currentCount int) bool {
	limits := s.GetLimits()
	if limits.MaxAlerts < 0 {
		return true // unlimited
	}
	return currentCount < limits.MaxAlerts
}

// HasFeature returns true if the subscription includes the feature
func (s *Subscription) HasFeature(feature string) bool {
	limits := s.GetLimits()

	switch feature {
	case "realtime_data":
		return limits.RealTimeData
	case "advanced_greeks":
		return limits.AdvancedGreeks
	default:
		return true
	}
}

// DaysUntilExpiry returns the number of days until subscription expires
func (s *Subscription) DaysUntilExpiry() int {
	if s.ExpiresAt == nil {
		return -1 // no expiry
	}

	hours := s.ExpiresAt.Sub(time.Now()).Hours()
	if hours < 0 {
		return 0
	}
	return int(hours / 24)
}
