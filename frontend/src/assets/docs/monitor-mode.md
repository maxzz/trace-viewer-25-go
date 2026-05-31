## 03.24.26
### * ` draft
	Implement "watch mode". 
	The watch mode is available only when open a folder, i.e. not zip file. 
	In the watch mode  the application should watch any changed .trc3 files in the open folder. 
	The .trc3 files can only grow and never shrink since they contain trace lines. 

	So, upon detected changes the changed part should be appended to the changed file and if the changed file is selected in the files list then the right panel should show changes. The new changed lines should show small green bar on the left side for 1 second. 
	This is bar should be similar to the bar in the VSCode for new/changed lines.
	If the selected file is scrolled to the end the auto scroll should happen when new lines are added to the end.

	Ask me if you have questions to me.

	Can it be implemented as web page or as altenative it will be better convert the project to electron project or simply have a sepparate application that will send data over web socket?
	`
	* `
	Implement a "watch mode."
	Watch mode is available only when opening a folder (i.e., not a ZIP file).
	In watch mode, the application must monitor for any changes to files with the `.trc3` extension located within the opened folder.
	The size of `.trc3` files can only increase and never decrease, as they contain trace lines.

	Consequently, when changes are detected, the updated data segment must be appended to the corresponding file; furthermore, if that file is currently selected in the file list panel, the changes made should be displayed in the right-hand panel. 

	New or modified lines should be highlighted for 1 second by a small green bar on the left-hand side. This bar should be similar to the new/modified line indicator used in VS Code. If the currently viewed file is scrolled to the very end, the view should automatically scroll down whenever new lines are appended to the end of the file.

	Is it feasible to implement this as a web page? Alternatively, would it be better to convert the project into an Electron-based application, or perhaps create a separate application that transmits data via WebSockets?

	If you have any questions, please feel free to ask me.
	`//35.5 auto:plan
	`Do it`//36.5 auto:plan//36.7

	`How to fix this error?` //cursor:composer2

	` draft //36.7
        Let's try non aggressive approach: read after certain amount in file size changed. 
        This should be an option with reasonalble default. 
        Also there should be option interval for pooling. 
        These options should be exposed in options dialog and saved in local storage.
        The file can be locked for reading because application is adding trace.
        Let try to copy file into some temp folder under opened folder for monitoring and copy that file, read it and remove copy after.
        BTW, the watch mode should not watch any files in subfolders of the root watched folder.
        `
		`
		Let's try a less aggressive approach: read the file only after its size has changed by a specific amount.
		This should be a configurable option with a reasonable default value.
		Additionally, an option should be provided to specify the polling interval.
		These settings should be moved to a existing Options dialog and saved in local storage.
		The file may be locked for reading if the application is currently writing trace data to it.
		Let's try the following method: copy the file to a temporary subdirectory within the monitored directory, read that copy, and then delete it.
		Incidentally, in monitoring mode, files located in subdirectories of the root monitored directory should not be monitored.
		Furthermore, to provide a clear visual indication of the status, add a monitoring indicator to the top toolbar—something like a countdown timer showing the time remaining until the next update—along with a button that toggles between "Start" and "Stop" states.
		Also, include a button for manual refreshing.
		When the monitor is inactive, no monitoring controls should be displayed.
		Add a "Start Monitoring..." item to the "File" menu, positioned after the file-opening menu items.
		`//37.0 gpt54
	`There are some errors. Is that possible to fix them?`//37.4 gpt54
	`The problem persists; moreover, nothing at all is now displayed in the file list.
	 Incidentally, the copying method should be used only if standard file reading fails.`//37.7 gpt54
	`Move loading operations to a worker so that the UI remains responsive.`//38.0 gpt54
    * total rollback

###  Traces can be redirected: (to C:\Users\makzak\Desktop\DpTracing)
		original default
		`
		Windows Registry Editor Version 5.00

		[HKEY_LOCAL_MACHINE\SOFTWARE\DigitalPersona\Tracing]
		"TracePath"="C:\\ProgramData\\DigitalPersona\\Tracing"
		"DoTrace"=dword:00000001
		"OtsTrace"=dword:00000001
		"ots_dpofeedb"=dword:000003ff
		"ots_dpfbview"=dword:1fff003f
		"ots_dpfillin"=dword:003f003f
		"ots_dpocache"=dword:000001ff
		"ots_dpffcli"=dword:000007ff
		"TraceToFile"=dword:00000001
		"NewFileAlways"=dword:00000000
		"Verbosity"=dword:00000004
		"DeleteAtEnd"=dword:00000001
		`

###  Watch monitor per file instead of folder
###  Filter file names before loading them
        * trace only from DpOFeedb.dll on my working machine in a couple of hours may easily get ~3831 files and size 493MB
            * don't trace WM_NOTIFY, WM_MOUSEMOVE, WM_NCMOUSEMOVE, WM_NCMOUSELEAVE, WM_TIMER, WM_IME_SYSTEM, WM_IME_SETCONTEXT, WM_IME_NOTIFY
### add block list before loading file
### create help file
