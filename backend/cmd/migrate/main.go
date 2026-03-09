package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
	action := flag.String("action", "up", "Migration action: up, down, force, version")
	version := flag.Int("version", 0, "Force version (used with action=force)")
	flag.Parse()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		host := os.Getenv("DB_HOST")
		if host == "" { host = "localhost" }
		port := os.Getenv("DB_PORT")
		if port == "" { port = "5432" }
		user := os.Getenv("DB_USER")
		if user == "" { user = "postgres" }
		pass := os.Getenv("DB_PASSWORD")
		if pass == "" { pass = "postgres" }
		dbname := os.Getenv("DB_NAME")
		if dbname == "" { dbname = "optionstrategist" }
		dbURL = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, port, dbname)
	}

	migrationsPath := os.Getenv("MIGRATIONS_PATH")
	if migrationsPath == "" {
		migrationsPath = "file://internal/repository/migrations"
	}

	m, err := migrate.New(migrationsPath, dbURL)
	if err != nil {
		log.Fatalf("Failed to create migrate instance: %v", err)
	}
	defer m.Close()

	switch *action {
	case "up":
		if err := m.Up(); err != nil && err != migrate.ErrNoChange {
			log.Fatalf("Migration up failed: %v", err)
		}
		fmt.Println("Migrations applied successfully")
	case "down":
		if err := m.Down(); err != nil && err != migrate.ErrNoChange {
			log.Fatalf("Migration down failed: %v", err)
		}
		fmt.Println("Migrations reverted successfully")
	case "force":
		if err := m.Force(*version); err != nil {
			log.Fatalf("Force failed: %v", err)
		}
		fmt.Printf("Forced version to %d\n", *version)
	case "version":
		v, dirty, err := m.Version()
		if err != nil {
			log.Fatalf("Failed to get version: %v", err)
		}
		fmt.Printf("Version: %d, Dirty: %v\n", v, dirty)
	default:
		log.Fatalf("Unknown action: %s", *action)
	}
}
