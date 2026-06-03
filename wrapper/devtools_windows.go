//go:build windows

package main

import (
	"reflect"
	"strings"
	"syscall"
	"unsafe"
)

func (a *App) platformIsDevToolsOpen() bool {
	return len(findDevToolsWindows()) > 0
}

// platformOpenDevTools uses Go reflection and unsafe pointers to call
// OpenDevToolsWindow() on the internal Chromium instance of the Wails Frontend.
func (a *App) platformOpenDevTools() {
	if a.ctx == nil {
		return
	}
	fe := a.ctx.Value("frontend")
	if fe == nil {
		return
	}

	val := reflect.ValueOf(fe)
	if val.Kind() != reflect.Ptr || val.IsNil() {
		return
	}
	valElem := val.Elem()
	if valElem.Kind() != reflect.Struct {
		return
	}

	typ := valElem.Type()
	field, found := typ.FieldByName("chromium")
	if !found {
		return
	}

	fePtr := unsafe.Pointer(val.Pointer())
	chromiumPtr := *(*unsafe.Pointer)(unsafe.Pointer(uintptr(fePtr) + field.Offset))
	if chromiumPtr == nil {
		return
	}

	chromiumVal := reflect.NewAt(field.Type.Elem(), chromiumPtr)
	method := chromiumVal.MethodByName("OpenDevToolsWindow")
	if method.IsValid() {
		method.Call(nil)
	}
}

// platformCloseDevTools finds any top-level DevTools window belonging to our own
// process, then sends it WM_CLOSE.
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
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	enumWindows := user32.NewProc("EnumWindows")
	getWindowTextW := user32.NewProc("GetWindowTextW")
	getClassNameW := user32.NewProc("GetClassNameW")
	getWindowThreadProcessId := user32.NewProc("GetWindowThreadProcessId")
	getCurrentProcessId := kernel32.NewProc("GetCurrentProcessId")

	myPid, _, _ := getCurrentProcessId.Call()
	var handles []syscall.Handle

	cb := syscall.NewCallback(func(hwnd syscall.Handle, _ uintptr) uintptr {
		// Only touch windows belonging to our own process
		var pid uint32
		getWindowThreadProcessId.Call(uintptr(hwnd), uintptr(unsafe.Pointer(&pid)))
		if uintptr(pid) != myPid {
			return 1 // continue enumeration
		}

		// Filter by Chromium window class
		classBuf := make([]uint16, 256)
		getClassNameW.Call(uintptr(hwnd), uintptr(unsafe.Pointer(&classBuf[0])), 256)
		if syscall.UTF16ToString(classBuf) != "Chrome_WidgetWin_1" {
			return 1 // continue enumeration
		}

		// Match DevTools or Developer Tools titles
		titleBuf := make([]uint16, 512)
		getWindowTextW.Call(uintptr(hwnd), uintptr(unsafe.Pointer(&titleBuf[0])), 512)
		title := syscall.UTF16ToString(titleBuf)
		if strings.Contains(title, "DevTools") || strings.Contains(title, "Developer Tools") {
			handles = append(handles, hwnd)
		}
		return 1 // continue enumeration
	})

	enumWindows.Call(cb, 0)
	return handles
}
