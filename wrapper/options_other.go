//go:build !windows

package main

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// fixBounds checks if the window would be positioned on-screen on non-Windows systems.
// It gathers connected screen dimensions from Wails runtime and clamps the window bounds within them.
func fixBounds(ctx context.Context, bounds *Rectangle) *Rectangle {
	if bounds == nil {
		return nil
	}
	// Sanity check: width and height must be positive and reasonable
	if bounds.Width < 100 || bounds.Height < 100 {
		return nil
	}

	// Retrieve display configuration via Wails runtime
	screens := runtime.ScreenGetAll(ctx)

	var targetScreen *runtime.Screen
	for _, screen := range screens {
		if screen.IsCurrent {
			targetScreen = &screen
			break
		}
	}
	if targetScreen == nil {
		for _, screen := range screens {
			if screen.IsPrimary {
				targetScreen = &screen
				break
			}
		}
	}

	// Fallback monitor dimensions if none detected
	screenWidth := 1280
	screenHeight := 720
	if targetScreen != nil {
		screenWidth = targetScreen.Width
		screenHeight = targetScreen.Height
	}

	// Enforce width and height constraints
	if bounds.Width > screenWidth {
		bounds.Width = screenWidth
	}
	if bounds.Height > screenHeight {
		bounds.Height = screenHeight
	}

	// Force coordinates to reside fully within the screen limits
	if bounds.X < 0 {
		bounds.X = 0
	} else if bounds.X+bounds.Width > screenWidth {
		bounds.X = screenWidth - bounds.Width
	}

	if bounds.Y < 0 {
		bounds.Y = 0
	} else if bounds.Y+bounds.Height > screenHeight {
		bounds.Y = screenHeight - bounds.Height
	}

	return bounds
}

// restoreWindowPositionAndSize sets the window position and size on non-Windows platforms.
func restoreWindowPositionAndSize(ctx context.Context, bounds *Rectangle) {
	runtime.WindowSetPosition(ctx, bounds.X, bounds.Y)
	runtime.WindowSetSize(ctx, bounds.Width, bounds.Height)
	runtime.WindowShow(ctx)
}
