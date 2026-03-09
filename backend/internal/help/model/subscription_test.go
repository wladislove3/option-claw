package model

import (
	"testing"
	"time"
)

func TestSubscriptionIsActive(t *testing.T) {
	now := time.Now()
	future := now.Add(24 * time.Hour)
	past := now.Add(-24 * time.Hour)

	tests := []struct {
		name     string
		sub      *Subscription
		expected bool
	}{
		{
			name: "active subscription",
			sub: &Subscription{
				Status: StatusActive,
			},
			expected: true,
		},
		{
			name: "trial subscription",
			sub: &Subscription{
				Status: StatusTrial,
			},
			expected: true,
		},
		{
			name: "expired status",
			sub: &Subscription{
				Status: StatusExpired,
			},
			expected: false,
		},
		{
			name: "cancelled status",
			sub: &Subscription{
				Status: StatusCancelled,
			},
			expected: false,
		},
		{
			name: "expires in future",
			sub: &Subscription{
				Status:    StatusActive,
				ExpiresAt: &future,
			},
			expected: true,
		},
		{
			name: "expires in past",
			sub: &Subscription{
				Status:    StatusActive,
				ExpiresAt: &past,
			},
			expected: false,
		},
		{
			name: "no expiry",
			sub: &Subscription{
				Status:    StatusActive,
				ExpiresAt: nil,
			},
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.sub.IsActive()
			if result != tt.expected {
				t.Errorf("IsActive() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestSubscriptionGetLimits(t *testing.T) {
	tests := []struct {
		name     string
		plan     SubscriptionPlan
		expected SubscriptionLimits
	}{
		{
			name: "free plan",
			plan: PlanFree,
			expected: SubscriptionLimits{
				MaxPositions:   10,
				MaxAlerts:      5,
				RealTimeData:   false,
				AdvancedGreeks: false,
				SupportLevel:   "community",
			},
		},
		{
			name: "pro plan",
			plan: PlanPro,
			expected: SubscriptionLimits{
				MaxPositions:   -1,
				MaxAlerts:      100,
				RealTimeData:   true,
				AdvancedGreeks: true,
				SupportLevel:   "priority",
			},
		},
		{
			name: "enterprise plan",
			plan: PlanEnterprise,
			expected: SubscriptionLimits{
				MaxPositions:   -1,
				MaxAlerts:      -1,
				RealTimeData:   true,
				AdvancedGreeks: true,
				SupportLevel:   "dedicated",
			},
		},
		{
			name: "unknown plan defaults to free",
			plan: "unknown",
			expected: SubscriptionLimits{
				MaxPositions:   10,
				MaxAlerts:      5,
				RealTimeData:   false,
				AdvancedGreeks: false,
				SupportLevel:   "community",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sub := &Subscription{Plan: tt.plan}
			limits := sub.GetLimits()

			if limits.MaxPositions != tt.expected.MaxPositions {
				t.Errorf("MaxPositions = %d, want %d", limits.MaxPositions, tt.expected.MaxPositions)
			}
			if limits.MaxAlerts != tt.expected.MaxAlerts {
				t.Errorf("MaxAlerts = %d, want %d", limits.MaxAlerts, tt.expected.MaxAlerts)
			}
			if limits.RealTimeData != tt.expected.RealTimeData {
				t.Errorf("RealTimeData = %v, want %v", limits.RealTimeData, tt.expected.RealTimeData)
			}
			if limits.AdvancedGreeks != tt.expected.AdvancedGreeks {
				t.Errorf("AdvancedGreeks = %v, want %v", limits.AdvancedGreeks, tt.expected.AdvancedGreeks)
			}
		})
	}
}

func TestSubscriptionCanCreatePosition(t *testing.T) {
	freeSub := &Subscription{Plan: PlanFree}
	proSub := &Subscription{Plan: PlanPro}

	tests := []struct {
		name        string
		sub         *Subscription
		currentCount int
		expected    bool
	}{
		{
			name:        "free plan under limit",
			sub:         freeSub,
			currentCount: 5,
			expected:    true,
		},
		{
			name:        "free plan at limit",
			sub:         freeSub,
			currentCount: 10,
			expected:    false,
		},
		{
			name:        "free plan over limit",
			sub:         freeSub,
			currentCount: 15,
			expected:    false,
		},
		{
			name:        "pro plan unlimited",
			sub:         proSub,
			currentCount: 1000,
			expected:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.sub.CanCreatePosition(tt.currentCount)
			if result != tt.expected {
				t.Errorf("CanCreatePosition() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestSubscriptionCanCreateAlert(t *testing.T) {
	freeSub := &Subscription{Plan: PlanFree}
	proSub := &Subscription{Plan: PlanPro}

	tests := []struct {
		name        string
		sub         *Subscription
		currentCount int
		expected    bool
	}{
		{
			name:        "free plan under limit",
			sub:         freeSub,
			currentCount: 3,
			expected:    true,
		},
		{
			name:        "free plan at limit",
			sub:         freeSub,
			currentCount: 5,
			expected:    false,
		},
		{
			name:        "pro plan under limit",
			sub:         proSub,
			currentCount: 50,
			expected:    true,
		},
		{
			name:        "pro plan at limit",
			sub:         proSub,
			currentCount: 100,
			expected:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.sub.CanCreateAlert(tt.currentCount)
			if result != tt.expected {
				t.Errorf("CanCreateAlert() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestSubscriptionHasFeature(t *testing.T) {
	freeSub := &Subscription{Plan: PlanFree}
	proSub := &Subscription{Plan: PlanPro}

	tests := []struct {
		name     string
		sub      *Subscription
		feature  string
		expected bool
	}{
		{
			name:     "free has no realtime",
			sub:      freeSub,
			feature:  "realtime_data",
			expected: false,
		},
		{
			name:     "pro has realtime",
			sub:      proSub,
			feature:  "realtime_data",
			expected: true,
		},
		{
			name:     "free has no advanced greeks",
			sub:      freeSub,
			feature:  "advanced_greeks",
			expected: false,
		},
		{
			name:     "pro has advanced greeks",
			sub:      proSub,
			feature:  "advanced_greeks",
			expected: true,
		},
		{
			name:     "unknown feature returns true",
			sub:      freeSub,
			feature:  "unknown",
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.sub.HasFeature(tt.feature)
			if result != tt.expected {
				t.Errorf("HasFeature(%s) = %v, want %v", tt.feature, result, tt.expected)
			}
		})
	}
}

func TestSubscriptionDaysUntilExpiry(t *testing.T) {
	now := time.Now()
	tomorrow := now.Add(24 * time.Hour)
	nextWeek := now.Add(7 * 24 * time.Hour)
	yesterday := now.Add(-24 * time.Hour)

	tests := []struct {
		name     string
		sub      *Subscription
		expected int
	}{
		{
			name: "no expiry",
			sub: &Subscription{
				ExpiresAt: nil,
			},
			expected: -1,
		},
		{
			name: "expires tomorrow",
			sub: &Subscription{
				ExpiresAt: &tomorrow,
			},
			expected: 1,
		},
		{
			name: "expires next week",
			sub: &Subscription{
				ExpiresAt: &nextWeek,
			},
			expected: 7,
		},
		{
			name: "expired yesterday",
			sub: &Subscription{
				ExpiresAt: &yesterday,
			},
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.sub.DaysUntilExpiry()
			if result != tt.expected {
				t.Errorf("DaysUntilExpiry() = %d, want %d", result, tt.expected)
			}
		})
	}
}

func TestPlanConstants(t *testing.T) {
	if PlanFree != "free" {
		t.Errorf("PlanFree = %s, want free", PlanFree)
	}
	if PlanPro != "pro" {
		t.Errorf("PlanPro = %s, want pro", PlanPro)
	}
	if PlanEnterprise != "enterprise" {
		t.Errorf("PlanEnterprise = %s, want enterprise", PlanEnterprise)
	}
}

func TestStatusConstants(t *testing.T) {
	if StatusActive != "active" {
		t.Errorf("StatusActive = %s, want active", StatusActive)
	}
	if StatusExpired != "expired" {
		t.Errorf("StatusExpired = %s, want expired", StatusExpired)
	}
	if StatusCancelled != "cancelled" {
		t.Errorf("StatusCancelled = %s, want cancelled", StatusCancelled)
	}
	if StatusTrial != "trial" {
		t.Errorf("StatusTrial = %s, want trial", StatusTrial)
	}
}
