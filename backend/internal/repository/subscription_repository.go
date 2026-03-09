package repository

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/user/option-pro/backend/internal/model"
)

// generateID generates a unique ID
func generateID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return hex.EncodeToString([]byte(time.Now().String()))[:12]
	}
	return hex.EncodeToString(b)[:12]
}

// SubscriptionRepository handles subscription storage
type SubscriptionRepository struct {
	subscriptions map[string]*model.Subscription
	userIndex     map[string]string // userID -> subscriptionID
}

// NewSubscriptionRepository creates a new subscription repository
func NewSubscriptionRepository() *SubscriptionRepository {
	return &SubscriptionRepository{
		subscriptions: make(map[string]*model.Subscription),
		userIndex:     make(map[string]string),
	}
}

// Create creates a new subscription
func (r *SubscriptionRepository) Create(sub *model.Subscription) error {
	r.subscriptions[sub.ID] = sub
	r.userIndex[sub.UserID] = sub.ID
	return nil
}

// GetByUserID gets subscription by user ID
func (r *SubscriptionRepository) GetByUserID(userID string) (*model.Subscription, error) {
	subID, ok := r.userIndex[userID]
	if !ok {
		return nil, ErrNotFound
	}

	sub, ok := r.subscriptions[subID]
	if !ok {
		return nil, ErrNotFound
	}

	return sub, nil
}

// Update updates an existing subscription
func (r *SubscriptionRepository) Update(sub *model.Subscription) error {
	if _, ok := r.subscriptions[sub.ID]; !ok {
		return ErrNotFound
	}

	sub.UpdatedAt = time.Now()
	r.subscriptions[sub.ID] = sub
	return nil
}

// Delete deletes a subscription
func (r *SubscriptionRepository) Delete(id string) error {
	sub, ok := r.subscriptions[id]
	if !ok {
		return ErrNotFound
	}

	delete(r.userIndex, sub.UserID)
	delete(r.subscriptions, id)
	return nil
}

// CreateFreeSubscription creates a free subscription for a user
func (r *SubscriptionRepository) CreateFreeSubscription(userID string) (*model.Subscription, error) {
	sub := &model.Subscription{
		ID:        generateID(),
		UserID:    userID,
		Plan:      model.PlanFree,
		Status:    model.StatusActive,
		StartedAt: time.Now(),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := r.Create(sub); err != nil {
		return nil, err
	}

	return sub, nil
}

// UpgradePlan upgrades a user's subscription plan
func (r *SubscriptionRepository) UpgradePlan(userID string, plan model.SubscriptionPlan, expiresAt time.Time) (*model.Subscription, error) {
	sub, err := r.GetByUserID(userID)
	if err != nil {
		// Create new subscription if none exists
		sub = &model.Subscription{
			ID:        generateID(),
			UserID:    userID,
			Plan:      plan,
			Status:    model.StatusActive,
			StartedAt: time.Now(),
			CreatedAt: time.Now(),
		}
		if err := r.Create(sub); err != nil {
			return nil, err
		}
	} else {
		sub.Plan = plan
		sub.Status = model.StatusActive
		sub.UpdatedAt = time.Now()
	}

	sub.ExpiresAt = &expiresAt
	if err := r.Update(sub); err != nil {
		return nil, err
	}

	return sub, nil
}

// CheckStatus checks and updates subscription status based on expiry
func (r *SubscriptionRepository) CheckStatus(subID string) (*model.Subscription, error) {
	sub, ok := r.subscriptions[subID]
	if !ok {
		return nil, ErrNotFound
	}

	if sub.ExpiresAt != nil && time.Now().After(*sub.ExpiresAt) {
		sub.Status = model.StatusExpired
		sub.UpdatedAt = time.Now()
	}

	return sub, nil
}

// GetAll returns all subscriptions
func (r *SubscriptionRepository) GetAll() []*model.Subscription {
	subs := make([]*model.Subscription, 0, len(r.subscriptions))
	for _, sub := range r.subscriptions {
		subs = append(subs, sub)
	}
	return subs
}

// GetActiveCount returns count of active subscriptions
func (r *SubscriptionRepository) GetActiveCount() int {
	count := 0
	for _, sub := range r.subscriptions {
		if sub.IsActive() {
			count++
		}
	}
	return count
}
