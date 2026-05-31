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

func getOverlapArea(r1, r2 Rectangle) int {
	x1 := r1.X
	if r2.X > x1 {
		x1 = r2.X
	}
	y1 := r1.Y
	if r2.Y > y1 {
		y1 = r2.Y
	}

	x2 := r1.X + r1.Width
	r2Right := r2.X + r2.Width
	if r2Right < x2 {
		x2 = r2Right
	}

	y2 := r1.Y + r1.Height
	r2Bottom := r2.Y + r2.Height
	if r2Bottom < y2 {
		y2 = r2Bottom
	}

	if x1 < x2 && y1 < y2 {
		return (x2 - x1) * (y2 - y1)
	}
	return 0
}

// fixBounds checks if the window would be positioned on-screen in logical (DIP) space.
// It detects the best matching monitor for the logical bounds and forces the logical bounds
// to fit completely within that monitor's logical work area.
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

	var bestMonitor *Monitor
	maxOverlap := 0

	for i := range monitors {
		overlap := getOverlapArea(*bounds, monitors[i].LogicalMonitor)
		if overlap > maxOverlap {
			maxOverlap = overlap
			bestMonitor = &monitors[i]
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

	logicalWork := bestMonitor.LogicalWork

	// Adjust width/height if they exceed the monitor's logical work area
	if bounds.Width > logicalWork.Width {
		bounds.Width = logicalWork.Width
	}
	if bounds.Height > logicalWork.Height {
		bounds.Height = logicalWork.Height
	}

	// Ensure window is fully positioned within the monitor's logical work area
	if bounds.X < logicalWork.X {
		bounds.X = logicalWork.X
	} else if bounds.X+bounds.Width > logicalWork.X+logicalWork.Width {
		bounds.X = logicalWork.X + logicalWork.Width - bounds.Width
	}

	if bounds.Y < logicalWork.Y {
		bounds.Y = logicalWork.Y
	} else if bounds.Y+bounds.Height > logicalWork.Y+logicalWork.Height {
		bounds.Y = logicalWork.Y + logicalWork.Height - bounds.Height
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
// It translates the validated logical bounds to absolute physical pixels according to the best-matched monitor's DPI scaling.
func restoreWindowPositionAndSize(ctx context.Context, bounds *Rectangle) {
	hwnd := findMainWindowHWND()
	if hwnd != 0 {
		monitors := getAllMonitors()
		if len(monitors) == 0 {
			// Fallback to Wails if no monitors enumerated
			runtime.WindowSetPosition(ctx, bounds.X, bounds.Y)
			runtime.WindowSetSize(ctx, bounds.Width, bounds.Height)
			runtime.WindowShow(ctx)
			return
		}

		// Find best matching monitor for the logical bounds
		var bestMonitor *Monitor
		maxOverlap := 0
		for i := range monitors {
			overlap := getOverlapArea(*bounds, monitors[i].LogicalMonitor)
			if overlap > maxOverlap {
				maxOverlap = overlap
				bestMonitor = &monitors[i]
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

		// Convert logical bounds to physical bounds
		scale := bestMonitor.Scale
		localX := bounds.X - bestMonitor.LogicalMonitor.X
		localY := bounds.Y - bestMonitor.LogicalMonitor.Y

		physWidth := int(float64(bounds.Width) * scale)
		physHeight := int(float64(bounds.Height) * scale)
		physX := int(float64(bestMonitor.RcMonitor.Left) + float64(localX)*scale)
		physY := int(float64(bestMonitor.RcMonitor.Top) + float64(localY)*scale)

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
			SWP_NOACTIVATE = 0x0010
		)
		procSetWindowPos := user32.NewProc("SetWindowPos")
		procSetWindowPos.Call(
			uintptr(hwnd),
			0,
			uintptr(physX),
			uintptr(physY),
			uintptr(physWidth),
			uintptr(physHeight),
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
