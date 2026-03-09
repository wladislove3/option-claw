package logger

import (
	"fmt"
	"os"
	"time"
)

type Level int

const (
	DEBUG Level = iota
	INFO
	WARN
	ERROR
)

type Logger struct {
	level Level
}

func New(level string) *Logger {
	l := INFO
	switch level {
	case "debug":
		l = DEBUG
	case "warn":
		l = WARN
	case "error":
		l = ERROR
	}
	return &Logger{level: l}
}

func (l *Logger) Debug(msg string, args ...interface{}) {
	if l.level <= DEBUG {
		l.log("DEBUG", msg, args...)
	}
}

func (l *Logger) Info(msg string, args ...interface{}) {
	if l.level <= INFO {
		l.log("INFO", msg, args...)
	}
}

func (l *Logger) Warn(msg string, args ...interface{}) {
	if l.level <= WARN {
		l.log("WARN", msg, args...)
	}
}

func (l *Logger) Error(msg string, args ...interface{}) {
	if l.level <= ERROR {
		l.log("ERROR", msg, args...)
	}
}

func (l *Logger) log(level, msg string, args ...interface{}) {
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	prefix := fmt.Sprintf("[%s] [%s] ", timestamp, level)
	if len(args) > 0 {
		fmt.Fprintf(os.Stdout, prefix+msg+"\n", args...)
	} else {
		fmt.Fprintln(os.Stdout, prefix+msg)
	}
}
