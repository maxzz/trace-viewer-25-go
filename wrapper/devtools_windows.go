//go:build windows

package main

import (
	"strings"
	"syscall"
	"unsafe"
)

func (a *App) platformIsDevToolsOpen() bool {
	return len(findDevToolsWindows()) > 0
}

// platformOpenDevTools simulates Ctrl+Shift+F12 to trigger Wails' built-in DevTools window.
func (a *App) platformOpenDevTools() {
	user32 := syscall.NewLazyDLL("user32.dll")
	keybdEvent := user32.NewProc("keybd_event")

	const (
		VK_CONTROL      = 0x11
		VK_SHIFT        = 0x10
		VK_F12          = 0x7B
		KEYEVENTF_KEYUP = 0x0002
	)

	// Simulate pressing Ctrl+Shift+F12
	keybdEvent.Call(VK_CONTROL, 0, 0, 0)
	keybdEvent.Call(VK_SHIFT, 0, 0, 0)
	keybdEvent.Call(VK_F12, 0, 0, 0)

	// Simulate releasing Ctrl+Shift+F12
	keybdEvent.Call(VK_F12, 0, KEYEVENTF_KEYUP, 0)
	keybdEvent.Call(VK_SHIFT, 0, KEYEVENTF_KEYUP, 0)
	keybdEvent.Call(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0)
}

// platformCloseDevTools finds any top-level window whose class is
// Chrome_WidgetWin_1 (the class used by Chromium/WebView2 windows) and
// whose title contains "DevTools", then sends it WM_CLOSE.
func (a *App) platformCloseDevTools() {
	user32 := syscall.NewLazyDLL("user32.dll")
	postMessageW := user32.NewProc("PostMessageW")

	const WM_CLOSE = 0x0010

	for _, hwnd := range findDevToolsWindows() {
		postMessageW.Call(uintptr(hwnd), WM_CLOSE, 0, 0)
	}
}

func findDevToolsWindows() []syscall.Handle {
	user32 := syscall.NewLazyDLL("user32.dll")
	enumWindows := user32.NewProc("EnumWindows")
	getWindowTextW := user32.NewProc("GetWindowTextW")
	getClassNameW := user32.NewProc("GetClassNameW")

	var handles []syscall.Handle

	cb := syscall.NewCallback(func(hwnd syscall.Handle, _ uintptr) uintptr {
		// Filter by Chromium window class to avoid touching unrelated windows.
		classBuf := make([]uint16, 256)
		getClassNameW.Call(uintptr(hwnd), uintptr(unsafe.Pointer(&classBuf[0])), 256)
		if syscall.UTF16ToString(classBuf) != "Chrome_WidgetWin_1" {
			return 1 // continue enumeration
		}

		// Close only if the title contains "DevTools".
		titleBuf := make([]uint16, 512)
		getWindowTextW.Call(uintptr(hwnd), uintptr(unsafe.Pointer(&titleBuf[0])), 512)
		if strings.Contains(syscall.UTF16ToString(titleBuf), "DevTools") {
			handles = append(handles, hwnd)
		}
		return 1 // continue enumeration
	})

	enumWindows.Call(cb, 0)
	return handles
}
