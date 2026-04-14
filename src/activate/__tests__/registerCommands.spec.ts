import type { Mock } from "vitest"
import * as vscode from "vscode"
import { ClineProvider } from "../../core/webview/ClineProvider"

import { getVisibleProviderOrLog, registerCommands } from "../registerCommands"

vi.mock("execa", () => ({
	execa: vi.fn(),
}))

vi.mock("vscode", () => ({
	CodeActionKind: {
		QuickFix: { value: "quickfix" },
		RefactorRewrite: { value: "refactor.rewrite" },
	},
	commands: {
		registerCommand: vi.fn(),
	},
	window: {
		createTextEditorDecorationType: vi.fn().mockReturnValue({ dispose: vi.fn() }),
	},
	workspace: {
		workspaceFolders: [
			{
				uri: {
					fsPath: "/mock/workspace",
				},
			},
		],
	},
}))

vi.mock("../../core/webview/ClineProvider")

describe("getVisibleProviderOrLog", () => {
	let mockOutputChannel: vscode.OutputChannel

	beforeEach(() => {
		mockOutputChannel = {
			appendLine: vi.fn(),
			append: vi.fn(),
			clear: vi.fn(),
			hide: vi.fn(),
			name: "mock",
			replace: vi.fn(),
			show: vi.fn(),
			dispose: vi.fn(),
		}
		vi.clearAllMocks()
	})

	it("returns the visible provider if found", () => {
		const mockProvider = {} as ClineProvider
		;(ClineProvider.getVisibleInstance as Mock).mockReturnValue(mockProvider)

		const result = getVisibleProviderOrLog(mockOutputChannel)

		expect(result).toBe(mockProvider)
		expect(mockOutputChannel.appendLine).not.toHaveBeenCalled()
	})

	it("logs and returns undefined if no provider found", () => {
		;(ClineProvider.getVisibleInstance as Mock).mockReturnValue(undefined)

		const result = getVisibleProviderOrLog(mockOutputChannel)

		expect(result).toBeUndefined()
		expect(mockOutputChannel.appendLine).toHaveBeenCalledWith("Cannot find any visible Lite-Agent instances.")
	})
})

describe("switchToArchitect command", () => {
	let mockOutputChannel: vscode.OutputChannel
	let mockProvider: Partial<ClineProvider>
	let mockContext: { subscriptions: { push: Mock } }

	beforeEach(() => {
		mockOutputChannel = {
			appendLine: vi.fn(),
			append: vi.fn(),
			clear: vi.fn(),
			hide: vi.fn(),
			name: "mock",
			replace: vi.fn(),
			show: vi.fn(),
			dispose: vi.fn(),
		}
		mockProvider = {
			handleModeSwitch: vi.fn().mockResolvedValue(undefined),
		}
		mockContext = {
			subscriptions: { push: vi.fn() },
		}
		vi.clearAllMocks()
	})

	function getRegisteredCallback(commandName: string): ((...args: any[]) => any) | undefined {
		registerCommands({
			context: mockContext as any,
			outputChannel: mockOutputChannel as any,
			provider: mockProvider as any,
		})

		const calls = (vscode.commands.registerCommand as Mock).mock.calls
		const match = calls.find((call: any[]) => call[0] === commandName)
		return match?.[1]
	}

	it("calls handleModeSwitch with 'architect' when provider is visible", async () => {
		;(ClineProvider.getVisibleInstance as Mock).mockReturnValue(mockProvider)

		const callback = getRegisteredCallback("lite-agent.switchToArchitect")
		expect(callback).toBeDefined()

		await callback!()

		expect(mockProvider.handleModeSwitch).toHaveBeenCalledWith("architect")
	})

	it("does nothing when no visible provider is found", async () => {
		;(ClineProvider.getVisibleInstance as Mock).mockReturnValue(undefined)

		const callback = getRegisteredCallback("lite-agent.switchToArchitect")
		expect(callback).toBeDefined()

		await callback!()

		expect(mockProvider.handleModeSwitch).not.toHaveBeenCalled()
	})
})
