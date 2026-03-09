package middleware

import (
	"context"
	"net/http"

	"github.com/user/option-pro/backend/internal/model"
	"github.com/user/option-pro/backend/internal/repository"
)

// contextKey is a custom type for context keys
type contextKey string

const (
	// SubscriptionKey is the context key for subscription
	SubscriptionKey contextKey = "subscription"
)

// SubscriptionMiddleware creates middleware for subscription checks
type SubscriptionMiddleware struct {
	subRepo *repository.SubscriptionRepository
}

// NewSubscriptionMiddleware creates a new subscription middleware
func NewSubscriptionMiddleware(subRepo *repository.SubscriptionRepository) *SubscriptionMiddleware {
	return &SubscriptionMiddleware{
		subRepo: subRepo,
	}
}

// RequireSubscription middleware checks if user has active subscription
func (sm *SubscriptionMiddleware) RequireSubscription(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get user ID from context (set by auth middleware)
		userID, ok := r.Context().Value("user_id").(string)
		if !ok {
			http.Error(w, `{"error": "Unauthorized"}`, http.StatusUnauthorized)
			return
		}

		// Get subscription
		sub, err := sm.subRepo.GetByUserID(userID)
		if err != nil {
			// Create free subscription if none exists
			sub, _ = sm.subRepo.CreateFreeSubscription(userID)
		}

		// Check if subscription is active
		if !sub.IsActive() {
			http.Error(w, `{"error": "Subscription required", "plan": "free"}`, http.StatusForbidden)
			return
		}

		// Add subscription to context
		ctx := context.WithValue(r.Context(), SubscriptionKey, sub)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequirePlan middleware checks if user has required plan level
func (sm *SubscriptionMiddleware) RequirePlan(requiredPlan model.SubscriptionPlan) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			sub, ok := r.Context().Value(SubscriptionKey).(*model.Subscription)
			if !ok {
				http.Error(w, `{"error": "Subscription not found"}`, http.StatusForbidden)
				return
			}

			// Check plan hierarchy: enterprise > pro > free
			planLevel := map[model.SubscriptionPlan]int{
				model.PlanFree:       0,
				model.PlanPro:        1,
				model.PlanEnterprise: 2,
			}

			if planLevel[sub.Plan] < planLevel[requiredPlan] {
				http.Error(w, `{"error": "Higher plan required", "current": "`+string(sub.Plan)+`", "required": "`+string(requiredPlan)+`"}`, http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireFeature middleware checks if subscription includes the feature
func (sm *SubscriptionMiddleware) RequireFeature(feature string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			sub, ok := r.Context().Value(SubscriptionKey).(*model.Subscription)
			if !ok {
				http.Error(w, `{"error": "Subscription not found"}`, http.StatusForbidden)
				return
			}

			if !sub.HasFeature(feature) {
				http.Error(w, `{"error": "Feature not included in plan", "feature": "`+feature+`"}`, http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// GetSubscriptionFromContext retrieves subscription from context
func GetSubscriptionFromContext(ctx context.Context) *model.Subscription {
	sub, ok := ctx.Value(SubscriptionKey).(*model.Subscription)
	if !ok {
		return nil
	}
	return sub
}

// CheckPositionLimit middleware checks if user can create more positions
func (sm *SubscriptionMiddleware) CheckPositionLimit(getCurrentCount func(userID string) int) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			sub, ok := r.Context().Value(SubscriptionKey).(*model.Subscription)
			if !ok {
				http.Error(w, `{"error": "Subscription not found"}`, http.StatusForbidden)
				return
			}

			userID, _ := r.Context().Value("user_id").(string)
			currentCount := getCurrentCount(userID)

			if !sub.CanCreatePosition(currentCount) {
				limits := sub.GetLimits()
				http.Error(w, `{"error": "Position limit reached", "limit": `+string(rune(limits.MaxPositions))+`}`, http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// CheckAlertLimit middleware checks if user can create more alerts
func (sm *SubscriptionMiddleware) CheckAlertLimit(getCurrentCount func(userID string) int) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			sub, ok := r.Context().Value(SubscriptionKey).(*model.Subscription)
			if !ok {
				http.Error(w, `{"error": "Subscription not found"}`, http.StatusForbidden)
				return
			}

			userID, _ := r.Context().Value("user_id").(string)
			currentCount := getCurrentCount(userID)

			if !sub.CanCreateAlert(currentCount) {
				limits := sub.GetLimits()
				http.Error(w, `{"error": "Alert limit reached", "limit": `+string(rune(limits.MaxAlerts))+`}`, http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
