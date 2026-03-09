package repository

import (
	"testing"

	"github.com/user/option-pro/backend/internal/model"
)

func TestNewAlertRepository(t *testing.T) {
	repo := NewAlertRepository()

	if repo == nil {
		t.Fatal("NewAlertRepository() returned nil")
	}

	if repo.alerts == nil {
		t.Error("alerts map should be initialized")
	}
}

func TestAlertRepositoryCreate(t *testing.T) {
	repo := NewAlertRepository()

	alert := &model.Alert{
		ID:        "alert-123",
		UserID:    "user-123",
		Type:      model.AlertTypePriceAbove,
		Condition: "BTC",
		Threshold: 100000,
	}

	err := repo.Create(alert)
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	if alert.Status != model.AlertStatusActive {
		t.Errorf("Expected status active, got %s", alert.Status)
	}

	if alert.CreatedAt.IsZero() {
		t.Error("CreatedAt should be set")
	}

	if alert.UpdatedAt.IsZero() {
		t.Error("UpdatedAt should be set")
	}
}

func TestAlertRepositoryGetByID(t *testing.T) {
	repo := NewAlertRepository()

	alert := &model.Alert{
		ID:        "alert-123",
		UserID:    "user-123",
		Type:      model.AlertTypePriceAbove,
		Condition: "BTC",
		Threshold: 100000,
	}

	repo.Create(alert)

	found, err := repo.GetByID("alert-123")
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}

	if found.ID != alert.ID {
		t.Errorf("Expected ID %s, got %s", alert.ID, found.ID)
	}

	// Test not found
	_, err = repo.GetByID("nonexistent")
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got %v", err)
	}
}

func TestAlertRepositoryGetByUserID(t *testing.T) {
	repo := NewAlertRepository()

	alerts := []*model.Alert{
		{ID: "alert-1", UserID: "user-123", Type: model.AlertTypePriceAbove, Condition: "BTC", Threshold: 100000},
		{ID: "alert-2", UserID: "user-123", Type: model.AlertTypePriceBelow, Condition: "ETH", Threshold: 5000},
		{ID: "alert-3", UserID: "user-456", Type: model.AlertTypePnLAbove, Condition: "pos-1", Threshold: 1000},
	}

	for _, alert := range alerts {
		repo.Create(alert)
	}

	userAlerts, err := repo.GetByUserID("user-123")
	if err != nil {
		t.Fatalf("GetByUserID() error = %v", err)
	}

	if len(userAlerts) != 2 {
		t.Errorf("Expected 2 alerts, got %d", len(userAlerts))
	}
}

func TestAlertRepositoryGetActiveByUserID(t *testing.T) {
	repo := NewAlertRepository()

	alerts := []*model.Alert{
		{ID: "alert-1", UserID: "user-123", Type: model.AlertTypePriceAbove, Condition: "BTC", Threshold: 100000, Status: model.AlertStatusActive},
		{ID: "alert-2", UserID: "user-123", Type: model.AlertTypePriceBelow, Condition: "ETH", Threshold: 5000, Status: model.AlertStatusTriggered},
		{ID: "alert-3", UserID: "user-123", Type: model.AlertTypePnLAbove, Condition: "pos-1", Threshold: 1000, Status: model.AlertStatusActive},
	}

	for _, alert := range alerts {
		repo.Create(alert)
	}

	// Manually trigger one
	alerts[1].Trigger()
	repo.Update(alerts[1])

	activeAlerts, err := repo.GetActiveByUserID("user-123")
	if err != nil {
		t.Fatalf("GetActiveByUserID() error = %v", err)
	}

	if len(activeAlerts) != 2 {
		t.Errorf("Expected 2 active alerts, got %d", len(activeAlerts))
	}
}

func TestAlertRepositoryUpdate(t *testing.T) {
	repo := NewAlertRepository()

	alert := &model.Alert{
		ID:        "alert-123",
		UserID:    "user-123",
		Type:      model.AlertTypePriceAbove,
		Condition: "BTC",
		Threshold: 100000,
	}

	repo.Create(alert)

	// Update the alert
	alert.Threshold = 110000
	err := repo.Update(alert)
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	found, _ := repo.GetByID("alert-123")
	if found.Threshold != 110000 {
		t.Errorf("Expected threshold 110000, got %f", found.Threshold)
	}

	// Test update nonexistent
	nonexistent := &model.Alert{ID: "nonexistent"}
	err = repo.Update(nonexistent)
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got %v", err)
	}
}

func TestAlertRepositoryDelete(t *testing.T) {
	repo := NewAlertRepository()

	alert := &model.Alert{
		ID:        "alert-123",
		UserID:    "user-123",
		Type:      model.AlertTypePriceAbove,
		Condition: "BTC",
		Threshold: 100000,
	}

	repo.Create(alert)

	err := repo.Delete("alert-123")
	if err != nil {
		t.Fatalf("Delete() error = %v", err)
	}

	// Verify deleted
	_, err = repo.GetByID("alert-123")
	if err != ErrNotFound {
		t.Error("Alert should be deleted")
	}

	// Test delete nonexistent
	err = repo.Delete("nonexistent")
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got %v", err)
	}
}

func TestAlertRepositoryGetAll(t *testing.T) {
	repo := NewAlertRepository()

	alerts := []*model.Alert{
		{ID: "alert-1", UserID: "user-123", Type: model.AlertTypePriceAbove, Condition: "BTC", Threshold: 100000},
		{ID: "alert-2", UserID: "user-123", Type: model.AlertTypePriceBelow, Condition: "ETH", Threshold: 5000},
		{ID: "alert-3", UserID: "user-456", Type: model.AlertTypePnLAbove, Condition: "pos-1", Threshold: 1000},
	}

	for _, alert := range alerts {
		repo.Create(alert)
	}

	all := repo.GetAll()
	if len(all) != 3 {
		t.Errorf("Expected 3 alerts, got %d", len(all))
	}
}

func TestAlertRepositoryCount(t *testing.T) {
	repo := NewAlertRepository()

	if repo.Count() != 0 {
		t.Errorf("Expected 0 alerts, got %d", repo.Count())
	}

	alerts := []*model.Alert{
		{ID: "alert-1", UserID: "user-123", Type: model.AlertTypePriceAbove, Condition: "BTC", Threshold: 100000},
		{ID: "alert-2", UserID: "user-123", Type: model.AlertTypePriceBelow, Condition: "ETH", Threshold: 5000},
	}

	for _, alert := range alerts {
		repo.Create(alert)
	}

	if repo.Count() != 2 {
		t.Errorf("Expected 2 alerts, got %d", repo.Count())
	}

	repo.Delete("alert-1")

	if repo.Count() != 1 {
		t.Errorf("Expected 1 alert after delete, got %d", repo.Count())
	}
}

func TestAlertRepositoryConcurrency(t *testing.T) {
	repo := NewAlertRepository()
	done := make(chan bool)

	// Concurrent writes
	for i := 0; i < 10; i++ {
		go func(id int) {
			alert := &model.Alert{
				ID:        "alert-" + string(rune(id)),
				UserID:    "user-123",
				Type:      model.AlertTypePriceAbove,
				Condition: "BTC",
				Threshold: 100000,
			}
			repo.Create(alert)
			done <- true
		}(i)
	}

	for i := 0; i < 10; i++ {
		<-done
	}

	if repo.Count() != 10 {
		t.Errorf("Expected 10 alerts, got %d", repo.Count())
	}
}

func TestErrNotFound(t *testing.T) {
	if ErrNotFound == nil {
		t.Error("ErrNotFound should not be nil")
	}

	if ErrNotFound.Error() != "entity not found" {
		t.Errorf("Expected 'entity not found', got %s", ErrNotFound.Error())
	}
}
