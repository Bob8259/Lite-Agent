// npx vitest src/components/welcome/__tests__/WelcomeViewProvider.spec.tsx

import { render, screen, fireEvent } from "@/utils/test-utils"

import WelcomeViewProvider from "../WelcomeViewProvider"
import { vscode } from "@src/utils/vscode"

// Mock the entire ExtensionStateContext module
const mockSetApiConfiguration = vi.fn()
vi.mock("@src/context/ExtensionStateContext", () => ({
	ExtensionStateContextProvider: ({ children }: any) => <div>{children}</div>,
	useExtensionState: () => ({
		apiConfiguration: {},
		currentApiConfigName: "default",
		setApiConfiguration: mockSetApiConfiguration,
		uriScheme: "vscode",
	}),
}))

// Mock Button component
vi.mock("@src/components/ui", () => ({
	Button: ({ children, onClick, variant }: any) => (
		<button onClick={onClick} data-testid={`button-${variant}`}>
			{children}
		</button>
	),
}))

// Mock ApiOptions
vi.mock("../../settings/ApiOptions", () => ({
	default: () => <div data-testid="api-options">API Options Component</div>,
}))

// Mock Tab components
vi.mock("../../common/Tab", () => ({
	Tab: ({ children }: any) => <div data-testid="tab">{children}</div>,
	TabContent: ({ children }: any) => <div data-testid="tab-content">{children}</div>,
}))

// Mock RooHero
vi.mock("../RooHero", () => ({
	default: () => <div data-testid="roo-hero">Roo Hero</div>,
}))

// Mock vscode utility
vi.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

// Mock react-i18next
vi.mock("react-i18next", () => ({
	Trans: ({ i18nKey, children }: any) => <span data-testid={`trans-${i18nKey}`}>{children || i18nKey}</span>,
	initReactI18next: {
		type: "3rdParty",
		init: () => {},
	},
}))

// Mock the translation hook
vi.mock("@src/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

// Mock validate
const mockValidateApiConfiguration = vi.fn()
vi.mock("@src/utils/validate", () => ({
	validateApiConfiguration: (...args: any[]) => mockValidateApiConfiguration(...args),
}))

describe("WelcomeViewProvider", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders greeting and introduction", () => {
		render(<WelcomeViewProvider />)

		expect(screen.getByText(/welcome:landing.greeting/)).toBeInTheDocument()
		expect(screen.getByTestId("trans-welcome:landing.introduction")).toBeInTheDocument()
	})

	it("renders RooHero", () => {
		render(<WelcomeViewProvider />)

		expect(screen.getByTestId("roo-hero")).toBeInTheDocument()
	})

	it("renders API options directly", () => {
		render(<WelcomeViewProvider />)

		expect(screen.getByTestId("api-options")).toBeInTheDocument()
	})

	it("renders Finish button", () => {
		render(<WelcomeViewProvider />)

		expect(screen.getByTestId("button-primary")).toBeInTheDocument()
		expect(screen.getByText(/welcome:providerSignup.finish/)).toBeInTheDocument()
	})

	it("renders Import Settings button", () => {
		render(<WelcomeViewProvider />)

		expect(screen.getByText(/welcome:importSettings/)).toBeInTheDocument()
	})

	it("validates and saves configuration when Finish is clicked", () => {
		mockValidateApiConfiguration.mockReturnValue(undefined)

		render(<WelcomeViewProvider />)

		const finishButton = screen.getByTestId("button-primary")
		fireEvent.click(finishButton)

		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "upsertApiConfiguration",
			text: "default",
			apiConfiguration: {},
		})
	})

	it("does not save when validation fails", () => {
		mockValidateApiConfiguration.mockReturnValue("API key is required")

		render(<WelcomeViewProvider />)

		const finishButton = screen.getByTestId("button-primary")
		fireEvent.click(finishButton)

		expect(vscode.postMessage).not.toHaveBeenCalled()
	})

	it("sends importSettings message when Import Settings is clicked", () => {
		render(<WelcomeViewProvider />)

		const importButton = screen.getByText(/welcome:importSettings/)
		fireEvent.click(importButton)

		expect(vscode.postMessage).toHaveBeenCalledWith({ type: "importSettings" })
	})
})
