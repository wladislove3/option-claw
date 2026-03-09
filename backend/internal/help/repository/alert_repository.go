package repository

import (
	"sync"
	"time"

	"github.com/user/option-pro/backend/internal/model"
)

// AlertRepository handles alert storage and retrieval
type AlertRepository struct {
	alerts map[string]*model.Alert
	mu     sync.RWMutex
}

// NewAlertRepository creates a new alert repository
func NewAlertRepository() *AlertRepository {
	return &AlertRepository{
		alerts: make(map[string]*model.Alert),
	}
}

// Create stores a new alert
func (r *AlertRepository) Create(alert *model.Alert) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	alert.CreatedAt = time.Now()
	alert.UpdatedAt = time.Now()
	alert.Status = model.AlertStatusActive

	r.alerts[alert.ID] = alert
	return nil
}

// GetByID retrieves an alert by ID
func (r *AlertRepository) GetByID(id string) (*model.Alert, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	alert, ok := r.alerts[id]
	if !ok {
		return nil, ErrNotFound
	}

	return alert, nil
}

// GetByUserID retrieves all alerts for a user
func (r *AlertRepository) GetByUserID(userID string) ([]*model.Alert, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var alerts []*model.Alert
	for _, alert := range r.alerts {
		if alert.UserID == userID {
			alerts = append(alerts, alert)
		}
	}

	return alerts, nil
}

// GetActiveByUserID retrieves all active alerts for a user
func (r *AlertRepository) GetActiveByUserID(userID string) ([]*model.Alert, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var alerts []*model.Alert
	for _, alert := range r.alerts {
		if alert.UserID == userID && alert.IsActive() {
			alerts = append(alerts, alert)
		}
	}

	return alerts, nil
}

// Update updates an existing alert
func (r *AlertRepository) Update(alert *model.Alert) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.alerts[alert.ID]; !ok {
		return ErrNotFound
	}

	alert.UpdatedAt = time.Now()
	r.alerts[alert.ID] = alert
	return nil
}

// Delete removes an alert
func (r *AlertRepository) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.alerts[id]; !ok {
		return ErrNotFound
	}

	delete(r.alerts, id)
	return nil
}

// GetAll retrieves all alerts
func (r *AlertRepository) GetAll() []*model.Alert {
	r.mu.RLock()
	defer r.mu.RUnlock()

	alerts := make([]*model.Alert, 0, len(r.alerts))
	for _, alert := range r.alerts {
		alerts = append(alerts, alert)
	}

	return alerts
}

// Count returns the number of alerts
func (r *AlertRepository) Count() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.alerts)
}
