# Coatee

Visual Studio Code extension for my own use.

## Features

### when-clause context

 - `coatee.enabled`: *bool*, true if this extension is enabled.
 - `coatee.mode`: *string*, extension's current mode.

### mode

 - `code`: Visual Studio Code mode.
 - `extension`: Extension's main mode.
 - `jumpForward`: Oneshot mode. Search forward and go to the character.
 - `jumpBackward`: Oneshot mode. Search backward and go to the character.
 - `replace`: Fake overtype mode.
 - `replaceChar`: Oneshot mode. Replace single character.

### commands

#### mode

 - `coatee.codeMode`: Start code mode.
 - `coatee.extensionMode`: Start extension mode.
 - `coatee.jumpForwardMode`: Start jumpForward mode.
 - `coatee.jumpBackwardMode`: Start jumpBackward mode.
 - `coatee.replaceMode`: Start replace mode.
 - `coatee.replaceCharMode`: Start replaceChar mode.

#### edit

 - `coatee.addCursorRight`: Add a new cursor right next to the last cursor.
 - `coatee.moveLastCursorLeft`: Move the last cursor to left.
 - `coatee.moveLastCursorRight`: Move the last cursor te right.
 - `coatee.alignText`: Align text vertically by inserting some spaces.

#### others

 - `coatee.exec`: Execute commands sequentially.
 - `coatee.nop`: NOP command.
