//go:build windows

package main

import (
	"context"
	"syscall"
	"unsafe"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type RECT struct {
	Left   int32
	Top    int32
	Right  int32
	Bottom int32
}

type MONITORINFO struct {
	CbSize    uint32
	RcMonitor RECT
	RcWork    RECT
	DwFlags   uint32
}

const (
	MONITOR_DEFAULTTONEAREST = 2
)

var (
	user32              = syscall.NewLazyDLL("user32.dll")
	procMonitorFromRect = user32.NewProc("MonitorFromRect")
	procGetMonitorInfoW = user32.NewProc("GetMonitorInfoW")
)

// fixBounds checks if the window would be positioned on-screen.
// It detects the nearest monitor's work area and forces the bounds to fit completely within it.
func fixBounds(ctx context.Context, bounds *Rectangle) *Rectangle {
	if bounds == nil {
		return nil
	}
	// Sanity check: width and height must be positive and reasonable
	if bounds.Width < 100 || bounds.Height < 100 {
		return nil
	}

	// 1. Prepare RECT for MonitorFromRect
	var rect RECT
	rect.Left = int32(bounds.X)
	rect.Top = int32(bounds.Y)
	rect.Right = int32(bounds.X + bounds.Width)
	rect.Bottom = int32(bounds.Y + bounds.Height)

	// 2. Query nearest monitor handle
	hMonitor, _, _ := procMonitorFromRect.Call(
		uintptr(unsafe.Pointer(&rect)),
		uintptr(MONITOR_DEFAULTTONEAREST),
	)
	if hMonitor == 0 {
		return bounds
	}

	// 3. Get monitor info containing the work area
	var info MONITORINFO
	info.CbSize = uint32(unsafe.Sizeof(info))
	ret, _, _ := procGetMonitorInfoW.Call(
		hMonitor,
		uintptr(unsafe.Pointer(&info)),
	)
	if ret == 0 {
		return bounds
	}

	workWidth := int(info.RcWork.Right - info.RcWork.Left)
	workHeight := int(info.RcWork.Bottom - info.RcWork.Top)

	// 4. Adjust width/height if they exceed the monitor's work area
	if bounds.Width > workWidth {
		bounds.Width = workWidth
	}
	if bounds.Height > workHeight {
		bounds.Height = workHeight
	}

	// 5. Ensure window is fully positioned within the monitor's work area
	if bounds.X < int(info.RcWork.Left) {
		bounds.X = int(info.RcWork.Left)
	} else if bounds.X+bounds.Width > int(info.RcWork.Right) {
		bounds.X = int(info.RcWork.Right) - bounds.Width
	}

	if bounds.Y < int(info.RcWork.Top) {
		bounds.Y = int(info.RcWork.Top)
	} else if bounds.Y+bounds.Height > int(info.RcWork.Bottom) {
		bounds.Y = int(info.RcWork.Bottom) - bounds.Height
	}

	return bounds
}

// findMainWindowHWND finds the HWND of the main window belonging to our own process.
func findMainWindowHWND() syscall.Handle {
	user32 := syscall.NewLazyDLL("user32.dll")
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	getCurrentProcessId := kernel32.NewProc("GetCurrentProcessId")
	enumWindows := user32.NewProc("EnumWindows")
	getWindowThreadProcessId := user32.NewProc("GetWindowThreadProcessId")
	getClassNameW := user32.NewProc("GetClassNameW")

	myPid, _, _ := getCurrentProcessId.Call()
	var mainHwnd syscall.Handle

	cb := syscall.NewCallback(func(hwnd syscall.Handle, _ uintptr) uintptr {
		var pid uint32
		getWindowThreadProcessId.Call(uintptr(hwnd), uintptr(unsafe.Pointer(&pid)))
		if uintptr(pid) == myPid {
			classBuf := make([]uint16, 256)
			getClassNameW.Call(uintptr(hwnd), uintptr(unsafe.Pointer(&classBuf[0])), 256)
			className := syscall.UTF16ToString(classBuf)
			if className == "wailsWindow" || className == "Chrome_WidgetWin_1" {
				mainHwnd = hwnd
				return 0 // stop enumeration
			}
		}
		return 1 // continue enumeration
	})

	enumWindows.Call(cb, 0)
	return mainHwnd
}

// restoreWindowPositionAndSize sets the window position and size using absolute Win32 coordinates.
// This completely avoids Wails v2's buggy relative-coordinate WindowSetPosition on Windows.
func restoreWindowPositionAndSize(ctx context.Context, bounds *Rectangle) {
	hwnd := findMainWindowHWND()
	if hwnd != 0 {
		const (
			SWP_NOZORDER   = 0x0004
			SWP_NOACTIVATE = 0x0010
		)
		procSetWindowPos := user32.NewProc("SetWindowPos")
		procSetWindowPos.Call(
			uintptr(hwnd),
			0,
			uintptr(bounds.X),
			uintptr(bounds.Y),
			uintptr(bounds.Width),
			uintptr(bounds.Height),
			uintptr(SWP_NOZORDER|SWP_NOACTIVATE),
		)
		// Show the window using Wails runtime so it updates internal states
		runtime.WindowShow(ctx)
	} else {
		// Fallback to Wails if HWND could not be resolved
		runtime.WindowSetPosition(ctx, bounds.X, bounds.Y)
		runtime.WindowSetSize(ctx, bounds.Width, bounds.Height)
		runtime.WindowShow(ctx)
	}
}
