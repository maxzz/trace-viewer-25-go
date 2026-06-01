//go:build !windows

package main

func (a *App) platformIsDevToolsOpen() bool { return false }

// platformOpenDevTools is a no-op on non-Windows platforms.
func (a *App) platformOpenDevTools() {}

// platformCloseDevTools is a no-op on non-Windows platforms.
func (a *App) platformCloseDevTools() {}
