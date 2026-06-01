//go:build !windows

package main

func (a *App) platformIsDevToolsOpen() bool { return false }

// platformCloseDevTools is a no-op on non-Windows platforms.
func (a *App) platformCloseDevTools() {}
