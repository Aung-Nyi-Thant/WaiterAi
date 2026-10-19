# Shop AI Installation Guide

This guide explains how to set up and run Shop AI on macOS and Windows.

## 1. Requirements

Before starting, make sure you have:

* A Mac or Windows computer.
* Node.js version 22.13 or later.
* npm (included with Node.js).
* Git.
* Ollama, if you want to run the AI features locally.

## 2. Install on macOS

1. Install Git if it is not already installed.

2. Download and install Node.js 22.13 or later from the official Node.js website: https://nodejs.org/

3. Install Ollama from https://ollama.com/ if local AI features are required.

4. Open Terminal.

5. Clone the Shop AI repository using the repository URL provided by your team:

   `git clone <repository-url>`

6. Open the project folder:

   `cd WaiterAI/app`

7. Install dependencies:

   `npm install`

8. Start the development server:

   `npm run dev`

9. Follow the local URL displayed in the terminal to open the application in a browser.

## 3. Install on Windows

1. Install Git for Windows from https://git-scm.com/downloads/win

2. Download and install Node.js 22.13 or later from https://nodejs.org/

3. Install Ollama from https://ollama.com/ if local AI features are required.

4. Open PowerShell or Git Bash.

5. Clone the Shop AI repository using the repository URL provided by your team:

   `git clone <repository-url>`

6. Open the project folder:

   `cd WaiterAI/app`

7. Install dependencies:

   `npm install`

8. Start the development server:

   `npm run dev`

9. Follow the local URL displayed in the terminal to open the application in a browser.

## 4. Verify the Installation

After starting the application:

1. Check that the development server starts without errors.
2. Open the local URL shown in the terminal.
3. Check whether the application loads.
4. Test the features available in the local setup.
5. Record any errors and the steps needed to reproduce them.

## 5. Testing Status

The installation instructions have not yet been verified on a clean macOS or Windows computer. Testing results must be added after the steps are run on the relevant computers.

## 6. Troubleshooting

* If `node` or `npm` is not recognized, check that Node.js is installed and restart the terminal.
* If dependency installation fails, check the error message and your internet connection.
* If the application does not start, record the terminal output and ask the project team to help investigate.
* If local AI features do not work, check the project's Ollama setup instructions.

## 7. Test Record

Record the following information after testing:

* Operating system and version:
* Node.js version:
* Installation date:
* Commands executed:
* Result:
* Errors encountered:
* Tester:
