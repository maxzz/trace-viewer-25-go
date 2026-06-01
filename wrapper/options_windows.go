//go:build windows

package main

import (
	"context"
	"syscall"
	"time"
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

type Monitor struct {
	Handle         syscall.Handle
	Scale          float64
	RcMonitor      RECT      // Physical
	RcWork         RECT      // Physical
	LogicalMonitor Rectangle // Logical (DIPs)
	LogicalWork    Rectangle // Logical (DIPs)
	IsPrimary      bool
}

const (
	MONITOR_DEFAULTTONEAREST = 2
)

var (
	user32              = syscall.NewLazyDLL("user32.dll")
	shcore              = syscall.NewLazyDLL("shcore.dll")
	procMonitorFromRect = user32.NewProc("MonitorFromRect")
	procGetMonitorInfoW = user32.NewProc("GetMonitorInfoW")
	getDpiForMonitor    = shcore.NewProc("GetDpiForMonitor")
)

func getMonitorScale(hMonitor syscall.Handle) float64 {
	if getDpiForMonitor.Find() == nil {
		var dpiX, dpiY uint32
		// MDT_EFFECTIVE_DPI = 0
		ret, _, _ := getDpiForMonitor.Call(
			uintptr(hMonitor),
			0, // MDT_EFFECTIVE_DPI
			uintptr(unsafe.Pointer(&dpiX)),
			uintptr(unsafe.Pointer(&dpiY)),
		)
		if ret == 0 && dpiX > 0 {
			return float64(dpiX) / 96.0
		}
	}
	return 1.0
}

func getAllMonitors() []Monitor {
	user32 := syscall.NewLazyDLL("user32.dll")
	procEnumDisplayMonitors := user32.NewProc("EnumDisplayMonitors")
	procGetMonitorInfoW := user32.NewProc("GetMonitorInfoW")

	var monitors []Monitor

	cb := syscall.NewCallback(func(hMonitor syscall.Handle, _ syscall.Handle, _ uintptr, _ uintptr) uintptr {
		var info MONITORINFO
		info.CbSize = uint32(unsafe.Sizeof(info))
		ret, _, _ := procGetMonitorInfoW.Call(
			uintptr(hMonitor),
			uintptr(unsafe.Pointer(&info)),
		)
		if ret != 0 {
			scale := getMonitorScale(hMonitor)

			var m Monitor
			m.Handle = hMonitor
			m.Scale = scale
			m.RcMonitor = info.RcMonitor
			m.RcWork = info.RcWork
			m.IsPrimary = (info.DwFlags & 1) != 0

			m.LogicalMonitor.X = int(float64(info.RcMonitor.Left) / scale)
			m.LogicalMonitor.Y = int(float64(info.RcMonitor.Top) / scale)
			m.LogicalMonitor.Width = int(float64(info.RcMonitor.Right-info.RcMonitor.Left) / scale)
			m.LogicalMonitor.Height = int(float64(info.RcMonitor.Bottom-info.RcMonitor.Top) / scale)

			m.LogicalWork.X = int(float64(info.RcWork.Left) / scale)
			m.LogicalWork.Y = int(float64(info.RcWork.Top) / scale)
			m.LogicalWork.Width = int(float64(info.RcWork.Right-info.RcWork.Left) / scale)
			m.LogicalWork.Height = int(float64(info.RcWork.Bottom-info.RcWork.Top) / scale)

			monitors = append(monitors, m)
		}
		return 1 // continue enumeration
	})

	procEnumDisplayMonitors.Call(0, 0, cb, 0)
	return monitors
}

func getPhysicalOverlapArea(r1 Rectangle, r2 RECT) int {
	x1 := r1.X
	r2Left := int(r2.Left)
	if r2Left > x1 {
		x1 = r2Left
	}
	y1 := r1.Y
	r2Top := int(r2.Top)
	if r2Top > y1 {
		y1 = r2Top
	}

	x2 := r1.X + r1.Width
	r2Right := int(r2.Right)
	if r2Right < x2 {
		x2 = r2Right
	}

	y2 := r1.Y + r1.Height
	r2Bottom := int(r2.Bottom)
	if r2Bottom < y2 {
		y2 = r2Bottom
	}

	if x1 < x2 && y1 < y2 {
		return (x2 - x1) * (y2 - y1)
	}
	return 0
}

// fixBounds checks if the window would be positioned on-screen in physical space.
// Since bounds are loaded as (physical X/Y, logical Width/Height), we convert Width/Height
// to physical based on the monitor containing (X,Y) and clamp to physical work area.
func fixBounds(ctx context.Context, bounds *Rectangle) *Rectangle {
	if bounds == nil {
		return nil
	}
	// Sanity check: width and height must be positive and reasonable
	if bounds.Width < 100 || bounds.Height < 100 {
		return nil
	}

	monitors := getAllMonitors()
	if len(monitors) == 0 {
		return bounds
	}

	// 1. Find which monitor contains the physical point (X, Y)
	var bestMonitor *Monitor
	for i := range monitors {
		m := &monitors[i]
		if bounds.X >= int(m.RcMonitor.Left) && bounds.X < int(m.RcMonitor.Right) &&
			bounds.Y >= int(m.RcMonitor.Top) && bounds.Y < int(m.RcMonitor.Bottom) {
			bestMonitor = m
			break
		}
	}

	// If no overlap (completely off-screen or on a closed lid monitor), fallback to primary
	if bestMonitor == nil {
		for i := range monitors {
			if monitors[i].IsPrimary {
				bestMonitor = &monitors[i]
				break
			}
		}
		if bestMonitor == nil {
			bestMonitor = &monitors[0]
		}
	}

	// 2. Convert logical width/height to physical width/height using the selected monitor's scale
	scale := bestMonitor.Scale
	physWidth := int(float64(bounds.Width) * scale)
	physHeight := int(float64(bounds.Height) * scale)

	physBounds := &Rectangle{
		X:      bounds.X,
		Y:      bounds.Y,
		Width:  physWidth,
		Height: physHeight,
	}

	// 3. Clamp physical bounds to the selected monitor's physical work area
	rcWork := bestMonitor.RcWork
	workWidth := int(rcWork.Right - rcWork.Left)
	workHeight := int(rcWork.Bottom - rcWork.Top)
	workLeft := int(rcWork.Left)
	workTop := int(rcWork.Top)

	if physBounds.Width > workWidth {
		physBounds.Width = workWidth
	}
	if physBounds.Height > workHeight {
		physBounds.Height = workHeight
	}

	if physBounds.X < workLeft {
		physBounds.X = workLeft
	} else if physBounds.X+physBounds.Width > workLeft+workWidth {
		physBounds.X = workLeft + workWidth - physBounds.Width
	}

	if physBounds.Y < workTop {
		physBounds.Y = workTop
	} else if physBounds.Y+physBounds.Height > workTop+workHeight {
		physBounds.Y = workTop + workHeight - physBounds.Height
	}

	return physBounds
}

// scalePhysicalToLogical converts the validated physical bounds (returned by fixBounds) to logical DIPs for Wails' initial window creation.
func scalePhysicalToLogical(bounds *Rectangle) (int, int) {
	if bounds == nil {
		return 1200, 800
	}
	monitors := getAllMonitors()
	if len(monitors) == 0 {
		return bounds.Width, bounds.Height
	}

	var bestMonitor *Monitor
	for i := range monitors {
		m := &monitors[i]
		if bounds.X >= int(m.RcMonitor.Left) && bounds.X < int(m.RcMonitor.Right) &&
			bounds.Y >= int(m.RcMonitor.Top) && bounds.Y < int(m.RcMonitor.Bottom) {
			bestMonitor = m
			break
		}
	}

	if bestMonitor == nil {
		for i := range monitors {
			if monitors[i].IsPrimary {
				bestMonitor = &monitors[i]
				break
			}
		}
		if bestMonitor == nil {
			bestMonitor = &monitors[0]
		}
	}

	// Scale down the physical dimensions to logical DIPs using the matched monitor's scale factor
	logicalWidth := int(float64(bounds.Width) / bestMonitor.Scale)
	logicalHeight := int(float64(bounds.Height) / bestMonitor.Scale)

	// Make sure we have a sane minimum size
	if logicalWidth < 100 {
		logicalWidth = 100
	}
	if logicalHeight < 100 {
		logicalHeight = 100
	}

	return logicalWidth, logicalHeight
}

// findMainWindowHWND finds the HWND of the main window belonging to our own process.
func findMainWindowHWND() syscall.Handle {
	user32 := syscall.NewLazyDLL("user32.dll")
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	getCurrentProcessId := kernel32.NewProc("GetCurrentProcessId")
	enumWindows := user32.NewProc("EnumWindows")
	getWindowThreadProcessId := user32.NewProc("GetWindowThreadProcessId")
	getClassNameW := user32.NewProc("GetClassNameW")
	getWindowTextW := user32.NewProc("GetWindowTextW")

	myPid, _, _ := getCurrentProcessId.Call()
	var mainHwnd syscall.Handle

	cb := syscall.NewCallback(func(hwnd syscall.Handle, _ uintptr) uintptr {
		var pid uint32
		getWindowThreadProcessId.Call(uintptr(hwnd), uintptr(unsafe.Pointer(&pid)))
		if uintptr(pid) == myPid {
			classBuf := make([]uint16, 256)
			getClassNameW.Call(uintptr(hwnd), uintptr(unsafe.Pointer(&classBuf[0])), 256)
			className := syscall.UTF16ToString(classBuf)

			textBuf := make([]uint16, 256)
			getWindowTextW.Call(uintptr(hwnd), uintptr(unsafe.Pointer(&textBuf[0])), 256)
			windowText := syscall.UTF16ToString(textBuf)

			if className == "wailsWindow" || className == "Chrome_WidgetWin_1" || windowText == "wails-events" {
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
// Since bounds are in physical pixels, we directly use them and clamp them to the target monitor's physical work area.
func restoreWindowPositionAndSize(ctx context.Context, bounds *Rectangle) {
	hwnd := findMainWindowHWND()

	if hwnd != 0 {
		monitors := getAllMonitors()

		if len(monitors) == 0 {
			runtime.WindowSetPosition(ctx, bounds.X, bounds.Y)
			runtime.WindowSetSize(ctx, bounds.Width, bounds.Height)
			runtime.WindowShow(ctx)
			return
		}

		// Find best matching monitor for the physical bounds
		var bestMonitor *Monitor
		for i := range monitors {
			m := &monitors[i]
			if bounds.X >= int(m.RcMonitor.Left) && bounds.X < int(m.RcMonitor.Right) &&
				bounds.Y >= int(m.RcMonitor.Top) && bounds.Y < int(m.RcMonitor.Bottom) {
				bestMonitor = m
				break
			}
		}
		if bestMonitor == nil {
			for i := range monitors {
				if monitors[i].IsPrimary {
					bestMonitor = &monitors[i]
					break
				}
			}
			if bestMonitor == nil {
				bestMonitor = &monitors[0]
			}
		}

		// The bounds are already physical! No scaling or logical conversions needed!
		physX := bounds.X
		physY := bounds.Y
		physWidth := bounds.Width
		physHeight := bounds.Height

		// Clamp physical bounds to matched monitor physical work area
		workLeft := int(bestMonitor.RcWork.Left)
		workRight := int(bestMonitor.RcWork.Right)
		workTop := int(bestMonitor.RcWork.Top)
		workBottom := int(bestMonitor.RcWork.Bottom)

		if physWidth > (workRight - workLeft) {
			physWidth = workRight - workLeft
		}
		if physHeight > (workBottom - workTop) {
			physHeight = workBottom - workTop
		}

		if physX < workLeft {
			physX = workLeft
		} else if physX+physWidth > workRight {
			physX = workRight - physWidth
		}

		if physY < workTop {
			physY = workTop
		} else if physY+physHeight > workBottom {
			physY = workBottom - physHeight
		}

		// Call native SetWindowPos with physical pixels
		const (
			SWP_NOZORDER   = 0x0004
			SWP_SHOWWINDOW = 0x0040
		)
		procSetWindowPos := user32.NewProc("SetWindowPos")

		// Move, size, and SHOW the window in a single atomic Win32 call!
		// This bypasses any deferred CW_USEDEFAULT centering overrides.
		procSetWindowPos.Call(
			uintptr(hwnd),
			0,
			uintptr(physX),
			uintptr(physY),
			uintptr(physWidth),
			uintptr(physHeight),
			uintptr(SWP_NOZORDER|SWP_SHOWWINDOW),
		)

		// Show the window using Wails runtime so it updates internal states and hasBeenShown flags (this becomes a no-op since it's already shown)
		runtime.WindowShow(ctx)

		// Force the exact physical coordinates and size AFTER showing the window to ensure no DPI-suggested resize wins.
		go func() {
			time.Sleep(100 * time.Millisecond)
			procSetWindowPos.Call(
				uintptr(hwnd),
				0,
				uintptr(physX),
				uintptr(physY),
				uintptr(physWidth),
				uintptr(physHeight),
				uintptr(SWP_NOZORDER),
			)
		}()
	} else {
		// Fallback to Wails if HWND could not be resolved
		runtime.WindowSetPosition(ctx, bounds.X, bounds.Y)
		runtime.WindowSetSize(ctx, bounds.Width, bounds.Height)
		runtime.WindowShow(ctx)
	}
}
