package main

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type Rectangle struct {
	X      int `json:"x"`
	Y      int `json:"y"`
	Width  int `json:"width"`
	Height int `json:"height"`
}

type IniOptions struct {
	Bounds   *Rectangle `json:"bounds,omitempty"`
	DevTools bool       `json:"devTools"`
	ShowMenu bool       `json:"showMenu"`
}

func getIniFilePath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	appDir := filepath.Join(configDir, "to-diag-trace-go")
	// Make sure the directory exists
	if err := os.MkdirAll(appDir, 0755); err != nil {
		return "", err
	}
	return filepath.Join(appDir, "init.json"), nil
}

func loadIniFileOptions() (*IniOptions, error) {
	filePath, err := getIniFilePath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	var opts IniOptions
	if err := json.Unmarshal(data, &opts); err != nil {
		return nil, err
	}
	return &opts, nil
}

func saveIniFileOptions(opts *IniOptions) error {
	filePath, err := getIniFilePath()
	if err != nil {
		return err
	}
	data, err := json.MarshalIndent(opts, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filePath, data, 0644)
}

func fixBounds(bounds *Rectangle) *Rectangle {
	if bounds == nil {
		return nil
	}
	// Sanity check: width and height must be positive and reasonable
	if bounds.Width < 100 || bounds.Height < 100 {
		return nil
	}
	// Virtual screen coords on modern multi-monitor setups rarely exceed +/- 16000.
	if bounds.X < -16000 || bounds.X > 16000 || bounds.Y < -16000 || bounds.Y > 16000 {
		return nil
	}
	return bounds
}

func saveWindowOptions(ctx context.Context) {
	// 1. Get current window state
	isMaximized := runtime.WindowIsMaximised(ctx)

	var bounds *Rectangle
	if !isMaximized {
		x, y := runtime.WindowGetPosition(ctx)
		w, h := runtime.WindowGetSize(ctx)
		bounds = &Rectangle{
			X:      x,
			Y:      y,
			Width:  w,
			Height: h,
		}
	} else {
		// If maximized, try to load existing bounds from file so we don't lose normal bounds
		existing, err := loadIniFileOptions()
		if err == nil && existing != nil && existing.Bounds != nil {
			bounds = existing.Bounds
		}
	}

	// 2. DevTools & ShowMenu state
	var devTools bool
	var showMenu bool

	existing, err := loadIniFileOptions()
	if err == nil && existing != nil {
		devTools = existing.DevTools
		showMenu = existing.ShowMenu
	}

	opts := &IniOptions{
		Bounds:   bounds,
		DevTools: devTools,
		ShowMenu: showMenu,
	}

	saveIniFileOptions(opts)
}

func restoreWindowOptions(ctx context.Context) {
	opts, err := loadIniFileOptions()
	if err == nil && opts != nil {
		if opts.Bounds != nil {
			bounds := fixBounds(opts.Bounds)
			if bounds != nil {
				runtime.WindowSetPosition(ctx, bounds.X, bounds.Y)
				runtime.WindowSetSize(ctx, bounds.Width, bounds.Height)
			}
		}
		// Show window after positioning (if started hidden)
		runtime.WindowShow(ctx)
	} else {
		// Default: just show the window
		runtime.WindowShow(ctx)
	}
}
